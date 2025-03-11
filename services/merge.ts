import { sparqlEscapeDateTime, sparqlEscapeUri } from 'mu';

import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import moment from 'moment';
import { HttpError } from '../utils/http-error';

export async function countOfEntriesInGraph(graph: string): Promise<number> {
  try {
    const queryResult = await querySudo(`
      SELECT (COUNT( DISTINCT ?s) AS ?count)
      WHERE {
        GRAPH ${sparqlEscapeUri(graph)} {
          ?s ?p ?o .
        }
      }
    `);

    return parseInt(queryResult.results?.bindings[0].count?.value) || 0;
  } catch (error) {
    throw new HttpError(
      'Something went wrong while checking count of persons that are being processed',
    );
  }
}

export async function movePersonUrisToGraph(
  uris: Array<string>,
  graph: string,
) {
  try {
    const values = uris.map((uri) => sparqlEscapeUri(uri));
    const escapedGraph = sparqlEscapeUri(graph);
    const escapedNow = sparqlEscapeDateTime(moment(new Date()));
    await updateSudo(`
      PREFIX dct: <http://purl.org/dc/terms/>

      INSERT {
        GRAPH ${escapedGraph} {
          ?person  dct:issued ${escapedNow} .
        }
      }
      WHERE {
        VALUES ?person { ${values.join('\n')} }
      }
  `);
  } catch (error) {
    throw new HttpError(
      `Something went wrong while moving ${uris.length} to graph ${graph}`,
    );
  }
}

export async function getFirstSubjectUriInGraph(
  graph: string,
): Promise<string | null> {
  const queryResult = await querySudo(`
    SELECT ?s
    WHERE {
      GRAPH ${sparqlEscapeUri(graph)} {
        ?s ?p ?o .
      }
    } LIMIT 1
  `);

  return queryResult.results?.bindings[0].s.value || null;
}
