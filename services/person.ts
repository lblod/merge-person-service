import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
} from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';
import { v4 as uuid } from 'uuid';

import { HttpError } from '../utils/http-error';
import { Person, PersonCreate } from '../types';

export async function getPersonUris(): Promise<Array<string>> {
  try {
    const queryResult = await querySudo(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT DISTINCT ?person
      WHERE {
        GRAPH ?g {
          ?person a person:Person .
        }
        ?g ext:ownedBy ?organization .
      }  
    `);
    const results = queryResult.results?.bindings;

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((b) => b.person.value);
  } catch (error) {
    throw new HttpError(
      'Something went wrong while fetching all unique persons in the database.',
    );
  }
}

export async function getLastModifiedVersion(personUri: string) {
  try {
    const queryResult = await querySudo(`
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  
      SELECT ?person ?g
      WHERE {
        GRAPH ?g {
          VALUES ?person { ${sparqlEscapeUri(personUri)} }
          ?person dct:modified ?modified .
        }  
        ?g ext:ownedBy ?organization .
      }
      ORDER By DESC(?modified)
      LIMIT 1
    `);

    const results = queryResult.results?.bindings;

    if (!results) {
      console.log(`No baseline found for ${personUri}`);
    }

    return {
      uri: personUri,
      graph: results[0].g.value,
    };
  } catch (error) {
    throw new HttpError(
      'Something went wrong while fetching the baseline person before merging the persons',
    );
  }
}

export async function createPerson(person: PersonCreate): Promise<string> {
  const { firstName, lastName, alternativeName, identifier, birthdate } =
    person;
  const modifiedNow = sparqlEscapeDateTime(new Date());
  const personId = uuid();
  const personUri = `http://data.lblod.info/id/personen/${personId}`;
  const identifierId = uuid();
  const identifierUri = `http://data.lblod.info/id/identificatoren/${identifierId}`;
  const geboorteId = uuid();
  const geboorteUri = `http://data.lblod.info/id/geboortes/${geboorteId}`;

  const alternativeNameTriple = () => {
    if (alternativeName) {
      return `${sparqlEscapeUri(personUri)} foaf:name ${sparqlEscapeString(alternativeName)} .`;
    }

    return '';
  };

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
        ${sparqlEscapeUri(personUri)} a person:Person ;
          mu:uuid ${sparqlEscapeString(personUri)};
          persoon:gebruikteVoornaam ${sparqlEscapeString(firstName)} ;
          foaf:familyName ${sparqlEscapeString(lastName)} ;
          dct:modified ${modifiedNow} ;
          adms:identifier ${sparqlEscapeUri(identifierUri)} ;
          persoon:heeftGeboorte ${sparqlEscapeUri(geboorteUri)} .
        ${alternativeNameTriple()}
        ${sparqlEscapeUri(identifierUri)} a adms:Identifier ;
          mu:uuid ${sparqlEscapeString(geboorteUri)} ;
          skos:notation ${sparqlEscapeString(identifier)} ;
          dct:modified ${modifiedNow} .
        ${sparqlEscapeUri(geboorteUri)} a persoon:Geboorte ;
          mu:uuid ${sparqlEscapeString(geboorteUri)} ;
          persoon:datum ${sparqlEscapeDateTime(birthdate)} ;
          dct:modified ${modifiedNow} .
      }
    `);

    return personUri;
  } catch (error) {
    throw new HttpError(
      `Something went wrong while creating the person with identifier: ${identifier}.`,
    );
  }
}

export async function getPersonByIdentifier(
  identifier: string,
): Promise<null | Person> {
  try {
    const queryResult = await query(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  
      SELECT ?person ?firstName ?alternativeName ?lastName ?birthdate
      WHERE {
        ?person a person:Person .
        ?person adms:identifier ?identifier .
        ?identifier skos:notation ${sparqlEscapeString(identifier)} .
        OPTIONAL {
          ?person persoon:gebruikteVoornaam ?firstName .
        }
        OPTIONAL {
          ?person foaf:name ?alternativeName .
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
      throw new HttpError(
        `Found more than one person for identifier: ${identifier} in organization graph.`,
      );
    }

    if (results.length === 0) {
      return null;
    }

    const result = queryResult.results.bindings[0];

    return {
      uri: result.person?.value,
      identifier,
      firstName: result.firstName?.value.trim(),
      alternativeName: result.alternativeName?.value.trim(),
      lastName: result.lastName?.value.trim(),
      birthdate: result.birthdate
        ? new Date(result.birthdate?.value)
        : undefined,
      graph: undefined,
    };
  } catch (error) {
    throw new HttpError(
      `Something went wrong while getting person with identifier: ${identifier}.`,
    );
  }
}
