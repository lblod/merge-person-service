import { sparqlEscapeUri } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';

import { CustomError } from '../utils/custom-error';
import { Conflict } from '../types';

export async function addIsConflictingFlagToPersons(
  conflicts: Array<Conflict>,
): Promise<void> {
  if (conflicts.length === 0) {
    return;
  }

  const values = conflicts.map(
    (conflict) =>
      `( ${sparqlEscapeUri(conflict.conflictUri)} ${sparqlEscapeUri(conflict.personUri)})`,
  );
  const queryString = `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX dct: <http://purl.org/dc/terms/>

    INSERT {
      GRAPH ?g {
        ?conflict ext:conflictsWith ?person  .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person) { ${values.join('\n')} }
      GRAPH ?g {
        ?conflict a person:Person .
      }
      ?g ext:ownedBy ?organization .
    }
  `;

  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      `Something went wrong while adding ext:conflictsWith flag to ${conflicts.length} persons.`,
    );
  }
}

export async function updateConflictUsageToPersonAsSubject(
  conflicts: Array<Conflict>,
): Promise<void> {
  if (conflicts.length === 0) {
    return;
  }

  const values = conflicts.map(
    (c) =>
      `( ${sparqlEscapeUri(c.conflictUri)} ${sparqlEscapeUri(c.personUri)} )`,
  );
  const queryString = `
    PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>

    DELETE{
      GRAPH ?conflictG {
        ?conflict dct:modified ?modified .
      }
    }
    INSERT{
      GRAPH ?conflictG {
        ?person ?p ?o .
        ?person mu:uuid ?id .
        ?person dct:modified ?now .
        ?person adms:identifier ?identifierP .
        ?identifierP ?ip ?io .
        ?person persoon:heeftGeboorte ?geboorteP .
        ?geboorteP ?gp ?go .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      } 
      GRAPH ?g {
        ?person a person:Person .
        ?person mu:uuid ?id .
        
        OPTIONAL {
          ?person adms:identifier ?identifierP .
          ?identifierP ?ip ?io .
        }
        OPTIONAL {
          ?person persoon:heeftGeboorte ?geboorteP .
          ?geboorteP ?gp ?go .
        }
      }
      ?g ext:ownedBy ?organization .
      GRAPH ?conflictG {
        ?conflict ?p ?o .
        
        OPTIONAL {
          ?conflict dct:modified ?modified .
        }
        FILTER (?p NOT IN (adms:identifier, persoon:heeftGeboorte, mu:uuid))
      }
      ?conflictG ext:ownedBy ?organization2 .
      BIND(NOW() AS ?now)
    }`;
  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      'Something went wrong while updating usage of conflict to person when used as subject in triple.',
    );
  }
}
export async function updateConflictUsageToPersonAsObject(
  conflicts: Array<Conflict>,
): Promise<void> {
  if (conflicts.length === 0) {
    return;
  }

  const values = conflicts.map(
    (c) =>
      `( ${sparqlEscapeUri(c.conflictUri)} ${sparqlEscapeUri(c.personUri)} )`,
  );
  const queryString = `
    PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>

    DELETE{
      GRAPH ?g {
        ?s dct:modified ?modified .
      }
    }
    INSERT{
      GRAPH ?g {
        ?s ?p ?person .
        ?s dct:modified ?now .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      }
      GRAPH ?g {
        ?s ?p ?conflict.

        OPTIONAL {
          ?s dct:modified ?modified .
        }
      } 
      ?g ext:ownedBy ?organization .
      BIND(NOW() AS ?now)
    }`;
  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      'Something went wrong while updating usage of conflict to person when used as object in triple.',
    );
  }
}
