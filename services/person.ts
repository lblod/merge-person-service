import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';

import { Conflict } from '../types';
import { log } from '../utils/logger';

export async function getConflictingPersons(): Promise<Array<Conflict>> {
  const queryString = `
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    SELECT DISTINCT ?person ?conflict
    WHERE {
      GRAPH ?g {
        ?person a person:Person .
        ?person adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?person ext:conflictsWith ?conflictsWith .
        }
        FILTER(!BOUND(?conflictsWith) || ?conflictsWith = false)
      } 
      ?g ext:ownedBy ?organization .

      GRAPH ?conflictG {
        ?conflict a person:Person .
        ?conflict adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?conflict ext:conflictsWith ?conflictsWith .
        }
        FILTER(!BOUND(?conflictsWith) || ?conflictsWith = false)
      } 
      ?conflictG ext:ownedBy ?organization2 .

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
    throw new Error('Something went wrong while querying the person conflicts');
  }
}

export async function getConflictingPersonUris(
  conflicts: Array<Conflict>,
): Promise<Array<Conflict>> {
  if (conflicts.length === 0) {
    return;
  }

  const values = conflicts.map(
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

    SELECT DISTINCT ?person ?conflict ?isUnresolvable
    WHERE {
      VALUES ( ?conflict ?person ) {
        ${values.join('\n')}
      }
      GRAPH ?g {
        ?person a person:Person .
        ?person adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?person persoon:gebruikteVoornaam ?firstName .
          ?person foaf:familyName ?lastName .
          ?person persoon:heeftGeboorte / persoon:datum ?birthdate .
          ?person persoon:geslacht ?geslacht .
        }
      }
      GRAPH ?conflictG {
        ?conflict a person:Person .
        ?conflict adms:identifier / skos:notation ?rrn .

        OPTIONAL {
          ?conflict persoon:gebruikteVoornaam ?conflictFirstName .
        }
        OPTIONAL {
          ?conflict foaf:familyName ?conflictLastName .
        }
        OPTIONAL {
          ?conflict persoon:heeftGeboorte / persoon:datum ?conflictBirthdate .
        }
        OPTIONAL {
          ?conflict persoon:geslacht ?conflictGeslacht .
        }
      } 
      ?g ext:ownedBy ?organization .
      ?conflictG ext:ownedBy ?organization2 .
      BIND(NOW() AS ?now)
      BIND(
        IF( #FirstName is added to this unresolvable so when the person does not have complete data we also add the flag
          BOUND(?firstName) && ?conflictFirstName = ?firstName && ?conflictLastName = ?lastName && ?conflictBirthdate = ?birthdate && ?conflictGeslacht = ?geslacht,
            """false"""^^xsd:Boolean,
            """true"""^^xsd:Boolean
          )
      AS ?isUnresolvable)
    }
  `;

  try {
    const queryResult = await querySudo(queryString);
    const bindings = queryResult.results?.bindings;

    return bindings.map((b) => {
      return {
        personUri: b.person?.value,
        conflictUri: b.conflict?.value,
        isUnresolvable: b.isUnresolvable?.value == 'true' ? true : false,
      };
    });
  } catch (error) {
    log(`Error was thrown on conflicts: ${JSON.stringify(conflicts)}`);
    throw new Error('Something went wrong while querying for conflicts');
  }
}

export async function setupTombstoneForConflicts(
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
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>
    PREFIX astreams: <http://www.w3.org/ns/activitystreams#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>

    DELETE {
      GRAPH ?g {
        ?conflict ?p ?o .
      }
    }
    INSERT{
      GRAPH ?g {    
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
        ?conflict ?p ?o .
      } 
      ?g ext:ownedBy ?organization .
      BIND(NOW() AS ?now)
    }
  `;

  try {
    await updateSudo(queryString);
  } catch (error) {
    log(`Error was thrown on conflicts: ${JSON.stringify(conflicts)}`);
    throw new Error(
      'Something went wrong while creating tombstones for the conflicting persons.',
    );
  }
}
