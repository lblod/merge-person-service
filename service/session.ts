import { Request } from 'express';
import { query, sparqlEscapeUri } from 'mu';
import { HTTP_STATUS_CODE } from '../utils/constant';
import { HttpError } from '../utils/http-error';

export async function getAccountUri(req: Request) {
  const sessionUri = req.get('mu-session-id');

  if (!sessionUri) {
    throw new HttpError(
      'No session id was found.',
      HTTP_STATUS_CODE.UNAUTHORIZED,
    );
  }

  const queryResult = await query(`
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>

    SELECT ?account
    WHERE {
      ${sparqlEscapeUri(sessionUri)} session:account ?account .
    } LIMIT 1
  `);

  const results = queryResult.results.bindings;
  const result = results[0];

  return result?.account?.value;
}
