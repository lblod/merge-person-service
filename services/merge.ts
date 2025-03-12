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
    // await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      `Something went wrong while adding ext:isInConflict flag to ${personUris.length} persons.`,
    );
  }
}

export async function updateConflictUsageToPersonAsSubject(conflicts: Array<Conflict>): Promise<void> { }
export async function updateConflictUsageToPersonAsObject(conflicts: Array<Conflict>): Promise<void> { }
