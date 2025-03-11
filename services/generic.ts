import { sparqlEscape, sparqlEscapeUri, update } from 'mu';

import { HttpError } from '../utils/http-error';

export async function insertBindings(bindings) {
  const values = bindings.map((spo) => {
    const subject = sparqlEscapeUri(spo.s.value);
    const predicate = sparqlEscapeUri(spo.p.value);
    const objectWithDatatype = sparqlEscapeQueryBinding(spo.o);

    return `${subject} ${predicate} ${objectWithDatatype}`;
  });

  try {
    await update(`INSERT DATA { ${values.join(' . \n')} }`);
  } catch (error) {
    throw new HttpError(
      'Something went wrong while inserting bindings in user graph.',
    );
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
