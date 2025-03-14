import { sparqlEscapeUri } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';

import { getConflictingPersonUris, setupTombstoneForConflicts } from './person';
import { Conflict } from '../types';
import { log } from '../utils/logger';

export async function processConflictingPersons(
  conflicts: Array<Conflict>,
  batchSize: number,
) {
  if (conflicts.length === 0) {
    log('No conflicts found nothing process');
    return;
  }

  const batches = createBatchesForConflicts(conflicts, batchSize);
  for (const batch of batches) {
    log(`Starting on batch ${batches.indexOf(batch) + 1}/${batches.length}`);
    const personsWithConflictAndFlag = await getConflictingPersonUris(batch);

    const withFlag = personsWithConflictAndFlag.filter(
      (p: Conflict) => p.hasConflictingData,
    );
    log('Add flags to persons in conflict with data mismatch');
    await addIsConflictingFlagToPersons(withFlag);

    const withoutFlag = personsWithConflictAndFlag.filter(
      (p: Conflict) => !p.hasConflictingData,
    );
    if (withoutFlag.length >= 1) {
      log('Update usage as subject');
      await updateConflictUsageToPersonAsSubject(withoutFlag);
      log('Update usage as object');
      await updateConflictUsageToPersonAsObject(withoutFlag);
      log('Setup tombstones');
      await setupTombstoneForConflicts(withoutFlag);
    }
  }
}

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
    throw new Error(
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
        ?person adms:identifier ?identifier .
        ?identifier ?ip ?io .
        ?person persoon:heeftGeboorte ?geboorte .
        ?geboorte ?gp ?go .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      } 
      GRAPH ?g {
        ?person a person:Person .
        ?person mu:uuid ?id .
        
        ?person adms:identifier ?identifier .
        ?identifier ?ip ?io .

        ?person persoon:heeftGeboorte ?geboorte .
        ?geboorte ?gp ?go .

        ?person persoon:geslacht ?geslacht .
      }
      ?g ext:ownedBy ?organization .
      GRAPH ?conflictG {
        ?conflict ?p ?o .
        
        OPTIONAL {
          ?conflict dct:modified ?modified .
        }
        FILTER (?p NOT IN (adms:identifier, persoon:heeftGeboorte, mu:uuid, persoon:geslacht))
      }
      ?conflictG ext:ownedBy ?organization2 .
      BIND(NOW() AS ?now)
    }`;
  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new Error(
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
    throw new Error(
      'Something went wrong while updating usage of conflict to person when used as object in triple.',
    );
  }
}

function createBatchesForConflicts(
  items: Array<Conflict>,
  batchSize: number,
): Array<Array<Conflict>> {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
