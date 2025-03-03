import { query, sparqlEscapeString } from 'mu';

export async function getPersonById(id: string) {
  try {
    const queryResult = await query(`
      PREFIX person: <http://www.w3.org/ns/person#>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  
      SELECT ?person
      WHERE {
        ?person a person:Person .
        ?person mu:uuid ${sparqlEscapeString(id)} .
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
