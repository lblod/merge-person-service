import {
  query,
  update,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
} from 'mu';
import { v4 as uuid } from 'uuid';

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
      graph: null,
    };
  } catch (error) {
    const message = `Something went wrong while getting person with identifier: ${rrn}.`;
    throw {
      message: error.message ?? message,
      status: 500,
    };
  }
}

export async function createPerson(values) {
  const { firstName, lastName, identifier, birthDate } = values;
  const modifiedNow = sparqlEscapeDateTime(new Date());
  const idForCreateS = (uuid: string, baseUri: string) => {
    return {
      id: uuid,
      uri: baseUri + uuid,
    };
  };
  const personS = idForCreateS(uuid(), 'http://data.lblod.info/id/personen/');
  const identifierS = idForCreateS(
    uuid(),
    'http://data.lblod.info/id/identificatoren/',
  );
  const geboorteS = idForCreateS(
    uuid(),
    'http://data.lblod.info/id/geboortes/',
  );
  try {
    await update(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      PREFIX dct: <http://purl.org/dc/terms/>
  
      INSERT DATA {
        ${sparqlEscapeUri(personS.uri)} a person:Person .
        ${sparqlEscapeUri(personS.uri)} mu:uuid ${sparqlEscapeString(personS.id)}.
        ${sparqlEscapeUri(personS.uri)} persoon:gebruikteVoornaam ${sparqlEscapeString(firstName)} .
        ${sparqlEscapeUri(personS.uri)} foaf:familyName ${sparqlEscapeString(lastName)} .
        ${sparqlEscapeUri(personS.uri)} dct:modified ${modifiedNow} .

        ${sparqlEscapeUri(personS.uri)} adms:identifier ${sparqlEscapeUri(identifierS.uri)} .
        ${sparqlEscapeUri(personS.uri)} persoon:heeftGeboorte ${sparqlEscapeUri(geboorteS.uri)} .

        ${sparqlEscapeUri(identifierS.uri)} a adms:Identifier .
        ${sparqlEscapeUri(identifierS.uri)} mu:uuid ${sparqlEscapeString(geboorteS.id)} .
        ${sparqlEscapeUri(identifierS.uri)} skos:notation ${sparqlEscapeString(identifier)} .
        ${sparqlEscapeUri(identifierS.uri)} dct:modified ${modifiedNow} .

        ${sparqlEscapeUri(geboorteS.uri)} a persoon:Geboorte .
        ${sparqlEscapeUri(geboorteS.uri)} mu:uuid ${sparqlEscapeString(geboorteS.id)} .
        ${sparqlEscapeUri(geboorteS.uri)} persoon:datum ${sparqlEscapeDateTime(birthDate)} .
        ${sparqlEscapeUri(geboorteS.uri)} dct:modified ${modifiedNow} .
      }
    `);

    return personS.uri;
  } catch (error) {
    console.log(error);
    throw {
      message: 'Something went wrong while creating the person.',
      status: 500,
    };
  }
}
