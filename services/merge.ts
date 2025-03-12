import { sparqlEscapeUri } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';

import { CustomError } from '../utils/custom-error';
import { Conflict } from '../types';

export async function addIsConflictingFlagToPersons(
  personUris: Array<string>,
): Promise<void> {
  const values = personUris.map((uri) => sparqlEscapeUri(uri));
  const queryString = `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    INSERT {
      GRAPH ?g {
        ?person ext:isInConflict """true"""^^xsd:Boolean .
      }
    }
    WHERE {
      VALUES ?person { ${values.join('\n')} }
      GRAPH ?g {
        ?person a person:Person .
      }
      ?g ext:ownedBy ?organization .
    }
  `;

  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      `Something went wrong while adding ext:isInConflict flag to ${personUris.length} persons.`,
    );
  }
}

export async function updateConflictUsageToPersonAsSubject(
  conflicts: Array<Conflict>,
): Promise<void> {
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
        ?conflict dct:modified ?modified .
      }
    }
    INSERT{
      GRAPH ?g {
        ?person ?p ?o .
        ?person dct:modified ?now .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      } 
      GRAPH ?g {
        ?conflict ?p ?o .
        ?conflict dct:modified ?modified .
      }
      ?g ext:ownedBy ?organization .
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
        ?s dct:modified ?modified .
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
