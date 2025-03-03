import { sparqlEscapeString } from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';

export async function getPersonById(id: string) {
  try {
    const queryResult = await querySudo(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  
      SELECT ?person
      WHERE {
        GRAPH ?g {
          ?person a person:Person .
          ?person mu:uuid ${sparqlEscapeString(id)} .
        }
      ?g ext:ownedBy ?someone .
      } LIMIT 1
    `);

    return queryResult.results.bindings[0].person?.value;
  } catch (error) {
    throw {
      message: `Something went wrong while getting person with id: ${id}.`,
      status: 500,
    };
  }
}

export async function getPersonByIdentifier(rrn: string) {
  try {
    const queryResult = await querySudo(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  
      SELECT ?person
      WHERE {
        GRAPH ?g {
          ?person a person:Person .
          ?person adms:identifier ?identifier .
          ?identifier skos:notation ${sparqlEscapeString(rrn)} .
        }
      ?g ext:ownedBy ?someone .
      } LIMIT 1
    `);

    return queryResult.results.bindings[0].person?.value;
  } catch (error) {
    throw {
      message: `Something went wrong while getting person with identifier: ${rrn}.`,
      status: 500,
    };
  }
}
