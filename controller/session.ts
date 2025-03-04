import { Request } from 'express';
import { querySudo } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri, query } from 'mu';
import { HTTP_STATUS_CODE } from '../utils/constant';

async function getSession(req: Request) {
  const sessionUri = req.get('mu-session-id');

  if (!sessionUri) {
    throw {
      message: 'No session id was found.',
      status: HTTP_STATUS_CODE.UNAUTHORIZED,
    };
  }

  const queryResult = await querySudo(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    SELECT ?role  ?group
    WHERE {
      ${sparqlEscapeUri(sessionUri)} ext:sessionRole ?role .
      ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?group .
    }
  `);

  const results = queryResult.results.bindings;
  const result = results[0];

  return {
    role: result.role?.value,
    group: result.group?.value,
  };
}

export async function createUserGraphFromSession(req: Request) {
  const { group, role } = await getSession(req);
  try {
    const queryResult = await query(`
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

      SELECT ?id
      WHERE {
        ${sparqlEscapeUri(group)} mu:uuid ?id .
      }  
    `);

    const bestuurseenheidId = queryResult.results.bindings[0].id.value;

    return `http://mu.semte.ch/graphs/organizations/${bestuurseenheidId}/${role}`; // ASK: is this for every application? => remove when question is answered
  } catch (error) {
    throw {
      message: 'Could not create user graph from session.',
    };
  }
}
