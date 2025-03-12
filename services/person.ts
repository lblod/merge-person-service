import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';

import { Conflict } from '../types';
import { CustomError } from '../utils/custom-error';

export async function getConflictingPersons(): Promise<Array<Conflict>> {
  const queryString = `
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>

    SELECT DISTINCT ?person ?conflict
    WHERE {
      GRAPH ?g {
        ?person a person:Person .
        ?person adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?person ext:isInConflict ?isInConflict .
        }
        FILTER(!BOUND(?isInConflict) || ?isInConflict = false)
      } 
      ?g ext:ownedBy ?organization .

      GRAPH ?g2 {
        ?conflict a person:Person .
        ?conflict adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?conflict ext:isInConflict ?isInConflict .
        }
        FILTER(!BOUND(?isInConflict) || ?isInConflict = false)
      } 
      ?g2 ext:ownedBy ?organization2 .

      FILTER(?person < ?conflict)
    } 
  `;
  try {
    const queryResult = await querySudo(queryString);
    const bindings = queryResult.results?.bindings;

    if (!bindings || bindings.length === 0) {
      return null;
    }

    return bindings.map((b) => {
      return {
        personUri: b.person.value,
        conflictUri: b.conflict.value,
      };
    });
  } catch (error) {
    throw new CustomError(
      'Something went wrong while querying the person conflicts',
    );
  }
}

export async function getPersonUrisWithDataMismatch(
  batch: Array<Conflict>,
): Promise<Array<string>> {
  const values = batch.map(
    (b) =>
      `( ${sparqlEscapeUri(b.conflictUri)} ${sparqlEscapeUri(b.personUri)} )`,
  );
  const queryString = `
    PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?person ?conflict ?isConflicting
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      }
      GRAPH ?g {
        ?conflict a person:Person.
        OPTIONAL {
          ?conflict persoon:gebruikteVoornaam ?conflictFirstName .
        }
        OPTIONAL {
          ?conflict foaf:familyName ?conflictLastName .
        }
        OPTIONAL {
          ?conflict adms:identifier / skos:notation ?conflictRrn .
        }
        OPTIONAL {
          ?conflict persoon:heeftGeboorte / persoon:datum ?conflictBirthdate .
        }
      }
      GRAPH ?g2 {
        ?person a person:Person .
        OPTIONAL {
          ?person persoon:gebruikteVoornaam ?firstName .
        }
        OPTIONAL {
          ?person foaf:familyName ?lastName .
        }
        OPTIONAL {
          ?person adms:identifier / skos:notation ?rrn .
        }
        OPTIONAL {
          ?person persoon:heeftGeboorte / persoon:datum ?birthdate .
        }
      } 
      ?g ext:ownedBy ?organization .
      ?g2 ext:ownedBy ?organization2 .
      BIND(NOW() AS ?now)
      BIND(
        IF(?conflictFirstName = ?firstName && ?conflictLastName = ?lastName && ?conflictRrn = ?rrn && ?conflictBirthdate = ?birthdate,
            """false"""^^xsd:Boolean,
            """true"""^^xsd:Boolean
          )
      AS ?isConflicting)
    }
  `;

  try {
    const queryResult = await querySudo(queryString);

    const bindings = queryResult.results?.bindings;

    return bindings
      .map((b) => {
        return {
          personUri: b.person?.value,
          conflictUri: b.person?.value,
          hasConflictingData: b.isConflicting?.value == 'true' ? true : false,
        };
      })
      .filter((p: Conflict) => p.hasConflictingData)
      .map((p: Conflict) => p.conflictUri);
  } catch (error) {
    throw new CustomError(
      'Something went wrong while querying for data missmatches for the person with conflicts.',
    );
  }
}

export async function setupTombstoneForConflicts(
  conflicts: Array<Conflict>,
): Promise<void> {
  const values = conflicts.map(
    (c) =>
      `( ${sparqlEscapeUri(c.personUri)} ${sparqlEscapeUri(c.conflictUri)} )`,
  );
  const queryString = `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX astreams: <http://www.w3.org/ns/activitystreams#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>

    INSERT{
      GRAPH ?g {
        ?person dct:modified ?now .
        
        ?conflict a astreams:Tombstone.
        ?conflict dct:modified ?now .
        ?conflict astreams:deleted ?now .
        ?conflict astreams:formerType person:Person .
        ?conflict owl:sameAs ?person .
      }
    }
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      } 
      GRAPH ?g {
        ?conflict a person:Person .
      } 
      ?g ext:ownedBy ?organization .
      BIND(NOW() AS ?now)
    }
  `;

  try {
    await updateSudo(queryString);
  } catch (error) {
    throw new CustomError(
      'Something went wrong while creating tombstones for the conflicting persons.',
    );
  }
}
