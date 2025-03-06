import {
  query,
  update,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  sparqlEscape,
} from 'mu';
import { v4 as uuid } from 'uuid';

export async function getPersonByIdentifier(identifier: string) {
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
    `);

    const results = queryResult.results.bindings;
    if (results.length > 1) {
      throw {
        message: `Found more than one person for identifier: ${identifier}.`,
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
    throw {
      message: `Something went wrong while getting person with identifier: ${identifier}.`,
    };
  }
}

export async function createPerson(values) {
  const { firstName, lastName, alternativeName, identifier, birthDate } =
    values;
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
          persoon:datum ${sparqlEscapeDateTime(birthDate)} ;
          dct:modified ${modifiedNow} .
      }
    `);

    return personUri;
  } catch (error) {
    console.log(error);
    throw {
      message: 'Something went wrong while creating the person.',
    };
  }
}

function sparqlEscapeQueryBinding(binding: {
  type: string;
  value: string;
  datatype: string;
}) {
  const datatypeNames = {
    'http://www.w3.org/2001/XMLSchema#dateTime': 'dateTime',
    'http://www.w3.org/2001/XMLSchema#datetime': 'dateTime',
    'http://www.w3.org/2001/XMLSchema#date': 'date',
    'http://www.w3.org/2001/XMLSchema#decimal': 'decimal',
    'http://www.w3.org/2001/XMLSchema#integer': 'int',
    'http://www.w3.org/2001/XMLSchema#float': 'float',
    'http://www.w3.org/2001/XMLSchema#boolean': 'bool',
  };
  const escapeType = datatypeNames[binding.datatype] || 'string';
  return binding.type === 'uri'
    ? sparqlEscapeUri(binding.value)
    : sparqlEscape(binding.value, escapeType);
}

export async function insertPersonBindings(bindings) {
  const values = bindings.map((spo) => {
    const subject = sparqlEscapeUri(spo.s.value);
    const predicate = sparqlEscapeUri(spo.p.value);
    const objectWithDatatype = sparqlEscapeQueryBinding(spo.o);

    return `${subject} ${predicate} ${objectWithDatatype}`;
  });

  try {
    await update(`INSERT DATA { ${values.join(' . \n')} }`);
  } catch (error) {
    throw {
      message: 'Something went wrong while inserting bindings for person.',
    };
  }
}
