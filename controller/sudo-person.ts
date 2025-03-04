import { sparqlEscapeString } from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';

export async function findIdentifierInOtherGraphs(rrn: string) {
  try {
    const queryResult = await querySudo(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  
      SELECT ?person ?firstName ?altName ?lastName ?birthdate ?g
      WHERE {
        GRAPH ?g {
          ?person a person:Person .

          ?person adms:identifier ?identifier .
          ?identifier skos:notation ${sparqlEscapeString(rrn)} .

          OPTIONAL {
          ?person persoon:gebruikteVoornaam ?firstName .
          }
          OPTIONAL {
            ?person foaf:name ?altName .
          } 
          OPTIONAL {
            ?person foaf:familyName ?lastName .
          }
          OPTIONAL {
            ?person persoon:heeftGeboorte ?geboorte .
            ?geboorte persoon:datum ?birthdate .
          }
        }
        ?g ext:ownedBy ?someone .
      } LIMIT 1
    `);

    const results = queryResult.results.bindings;

    if (results.length === 0) {
      return null;
    }
    const result = results[0];
    return {
      uri: result.person?.value,
      firstName: result.firstName?.value.trim(),
      altName: result.altName?.value.trim(),
      lastName: result.lastName?.value.trim(),
      birthdate: result.birthdate ? new Date(result.birthdate?.value) : null,
    };
  } catch (error) {
    throw {
      message: `Something went wrong while searching for persons with identifier: ${rrn} in all graphs.`,
      status: 500,
    };
  }
}
