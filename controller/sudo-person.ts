import { sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';

export async function findPersonByIdentifierInOtherGraphs(identifier: string) {
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
          ?identifier skos:notation ${sparqlEscapeString(identifier)} .

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
      graph: result.g?.value,
    };
  } catch (error) {
    throw {
      message: `Something went wrong while searching for persons with identifier: ${identifier} in all graphs.`,
    };
  }
}

export async function copyPersonFromGraph(
  personUri: string,
  userGraph: string,
  graph: string,
) {
  try {
    await updateSudo(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX dct: <http://purl.org/dc/terms/>

      INSERT {
        GRAPH ${sparqlEscapeUri(userGraph)} {
          ?person a person:Person .
          ?person mu:uuid ?personId .
          ?person persoon:gebruikteVoornaam ?firstName .
          ?person foaf:name ?altName .
          ?person foaf:familyName ?lastName .
          ?person adms:identifier ?identifier .
          ?person persoon:heeftGeboorte ?geboorte .
          ?person dct:modified ?now .

          ?identifier a adms:Identifier .
          ?identifier mu:uuid ?identifierId .
          ?identifier skos:notation ?rrn .
          ?identifier dct:modified ?now .

          ?geboorte a persoon:Geboorte .
          ?geboorte mu:uuid ?geboorteId .
          ?geboorte persoon:datum ?birthdate .
          ?geboorte dct:modified ?now .
        }
      }
      WHERE {
        VALUES ?person { ${sparqlEscapeUri(personUri)} }
        GRAPH ${sparqlEscapeUri(graph)} {
          ?person a person:Person .
          ?person mu:uuid ?personId .
          ?person persoon:gebruikteVoornaam ?firstName .
          ?person foaf:familyName ?lastName .

          ?person adms:identifier ?identifier .
          ?identifier mu:uuid ?identifierId .
          ?identifier skos:notation ?rrn .

          ?person persoon:heeftGeboorte ?geboorte .
          ?geboorte mu:uuid ?geboorteId .
          ?geboorte persoon:datum ?birthdate .

          OPTIONAL {
            ?person foaf:name ?altName .
          }           
        }
        BIND(NOW() AS ?now)
      }
    `);
  } catch (error) {
    throw {
      message:
        'Something went wrong while trying to copy the person from graph.',
    };
  }
}
