import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { createPersonRequest } from '../request/person';
import { createPerson, getPersonByIdentifier } from '../controller/person';
import {
  copyPersonFromGraph,
  findIdentifierInOtherGraphs,
} from '../controller/sudo-person';
import { createUserGraphFromSession } from '../controller/session';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const userGraph = await createUserGraphFromSession(req);
  const { firstName, lastName, identifier, birthDate } =
    createPersonRequest(req);

  let person = await getPersonByIdentifier(identifier);
  let shouldBeCopiedFromOtherGraph = false;

  if (!person) {
    person = await findIdentifierInOtherGraphs(identifier);
    shouldBeCopiedFromOtherGraph = !!person;
  }

  if (person) {
    const isCompleteMatch = [
      firstName === person.firstName,
      lastName === person.lastName,
      birthDate.toJSON() === person.birthdate.toJSON(),
    ].every((condition) => condition === true);

    if (isCompleteMatch) {
      if (shouldBeCopiedFromOtherGraph) {
        await copyPersonFromGraph(person.uri, userGraph, person.graph);
        res.status(201).send({ uri: person.uri });
        return;
      } else {
        throw {
          message: 'The person you are trying to create already exists.',
          status: 409, // Statuscode: Conflict
        };
      }
    } else {
      throw {
        message:
          'We found a person for the identifier but the given values do not match.',
        status: 406, // Statuscode: Not acceptable
      };
    }
  }

  const newPerson = await createPerson({
    firstName,
    lastName,
    identifier,
    birthDate,
  });

  res.status(201).send({ uri: newPerson });
});
