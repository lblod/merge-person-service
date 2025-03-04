import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { createPersonRequest } from '../request/person';
import { createPerson, getPersonByIdentifier } from '../controller/person';
import {
  copyPersonFromGraph,
  findPersonByIdentifierInOtherGraphs,
} from '../controller/sudo-person';
import { createUserGraphFromSession } from '../controller/session';
import { stripIdentifierString } from '../utils/identifier';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const userGraph = await createUserGraphFromSession(req);
  let copyPersonFromOtherGraph = false;

  const { firstName, lastName, alternativeName, identifier, birthDate } =
    createPersonRequest(req);

  const personInUserGraph = await getPersonByIdentifier(identifier);
  let personInOtherGraph = null;

  if (!personInUserGraph) {
    personInOtherGraph = await findPersonByIdentifierInOtherGraphs(identifier);
    copyPersonFromOtherGraph = !!personInOtherGraph;
  }

  if (!personInUserGraph && !personInOtherGraph) {
    const newPerson = await createPerson({
      firstName,
      lastName,
      alternativeName,
      identifier,
      birthDate,
    });

    res.status(201).send({ uri: newPerson });
  }

  const person = copyPersonFromOtherGraph
    ? personInOtherGraph
    : personInUserGraph;

  const isCompleteMatch = [
    firstName === person.firstName,
    lastName === person.lastName,
    birthDate.toJSON() === person.birthdate.toJSON(),
  ].every((condition) => condition === true);

  if (isCompleteMatch) {
    if (!copyPersonFromOtherGraph) {
      throw {
        message: 'The person you are trying to create already exists.',
        status: 409, // Statuscode: Conflict
      };
    }

    await copyPersonFromGraph(person.uri, userGraph, person.graph);
    res.status(201).send({ uri: person.uri });
  } else {
    throw {
      message:
        'We found a person for the identifier but the given values do not match.',
      status: 406, // Statuscode: Not acceptable
    };
  }
});

personRouter.get('/:rrn/identifier', async (req: Request, res: Response) => {
  if (!req.get('mu-session-id')) {
    throw {
      message: 'No session found.',
      status: 401, // Statuscode: Unauthorized
    };
  }

  const person = await getPersonByIdentifier(
    stripIdentifierString(req.params.rrn),
  );
  if (!person) {
    throw {
      message: `No person found for identifier ${req.params.rrn}`,
      status: 204, // Statuscode: No Content
    };
  }

  res.status(200).send({ uri: person.uri });
});
