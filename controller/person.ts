import { query, sparqlEscapeString } from 'mu';

export async function getPersonByIdentifier(rrn: string) {
  try {
    const queryResult = await query(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  
      SELECT ?person ?firstName ?altName ?lastName ?birthdate
      WHERE {
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
    `);

    const results = queryResult.results.bindings;
    if (results.length > 1) {
      throw {
        message: `Found more than one person for identifier: ${rrn}.`,
        status: 500,
      };
    }

    if (results.length === 0) {
      return null;
    }

    const result = queryResult.results.bindings[0];

    return {
      uri: result.person?.value,
      firstName: result.firstName?.value.trim(),
      altName: result.altName?.value.trim(),
      lastName: result.lastName?.value.trim(),
      birthdate: result.birthdate ? new Date(result.birthdate?.value) : null,
    };
  } catch (error) {
    throw {
      message: `Something went wrong while getting person with identifier: ${rrn}.`,
      status: 500,
    };
  }
}
