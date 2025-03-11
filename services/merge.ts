import { sparqlEscapeDateTime, sparqlEscapeUri } from 'mu';

import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import moment from 'moment';

import { HttpError } from '../utils/http-error';
import { PROCESS_PERSONS_GRAPH } from '../app';

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

export async function updatePersonsFromPersonInGraph(
  personUri: string,
  graph: string,
): Promise<void> {
  try {
    await updateSudo(`
     PREFIX persoon: <http://data.vlaanderen.be/ns/persoon#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      GRAPH ?g {
        ?person ?op ?oo .
        ?oldIdentifier ?oip ?oio .
        ?oldGeboorte ?ogp ?ogo .
      }
    }
    INSERT {
      GRAPH ?g {
        ?person ?p ?o .
        ?person dct:modified ?now .

        ?identifier ?ip ?io .
        ?identifier dct:modified ?now .

        ?geboorte ?gp ?go .
        ?geboorte dct:modified ?now .
      }
    }
    WHERE {
      VALUES ?person { ${sparqlEscapeUri(personUri)} }

      GRAPH ${sparqlEscapeUri(graph)} {
        ?person ?p ?o ;
          adms:identifier ?identifier ;
          persoon:heeftGeboorte ?geboorte .
        
        ?identifier ?ip ?io .
        ?geboorte ?gp ?go .
      }  
      GRAPH ?g {
        ?person ?op ?oo ;
          adms:identifier ?oldIdentifier ;
          persoon:heeftGeboorte ?oldGeboorte .
        
        ?oldIdentifier ?oip ?oio .
        ?oldGeboorte ?ogp ?ogo .
      }  
      ?g ext:ownedBy ?organization .
      FILTER( ?g != ${sparqlEscapeUri(graph)})
      BIND(NOW() AS ?now)
    }
    `);
    console.log(`Update person ${personUri} successfully`);
  } catch (error) {
    throw new HttpError(
      `Something went wrong while updating person ${personUri} over all graphs`,
    );
  }
}

export async function removePersonFromProcessGraph(
  personUri: string,
): Promise<void> {
  try {
    await updateSudo(`
      DELETE {
        GRAPH ${sparqlEscapeUri(PROCESS_PERSONS_GRAPH)} {
          ?person ?p ?o .
        }
      }
      WHERE {
      VALUES ?person { ${sparqlEscapeUri(personUri)} }
        GRAPH ${sparqlEscapeUri(PROCESS_PERSONS_GRAPH)} {
          ?person ?p ?o .
        }
      }
    `);
  } catch (error) {
    throw new HttpError(
      `Something went wrong while removing person ${personUri} from process person graph`,
    );
  }
}
