import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HTTP_STATUS_CODE } from '../utils/constant';
import { stripIdentifierString } from '../utils/identifier';
import { createUserGraphFromSession } from '../service/session';
import { createPerson, getPersonByIdentifier } from '../service/person';
import {
  copyPersonFromGraph,
  findPersonByIdentifierInOtherGraphs,
} from '../service/sudo-person';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const userGraph = await createUserGraphFromSession(req);
  const { firstName, lastName, alternativeName, identifier, birthDate } =
    createPersonRequest(req);
  const person = await findPerson(identifier);

  if (!person) {
    const newPerson = await createPerson({
      firstName,
      lastName,
      alternativeName,
      identifier,
      birthDate,
    });

    res.status(HTTP_STATUS_CODE.CREATED).send({ uri: newPerson });
  }

  const isCompleteMatch = [
    firstName === person.firstName,
    lastName === person.lastName,
    birthDate.toJSON() === person.birthdate.toJSON(),
  ].every((condition) => condition === true);

  if (isCompleteMatch) {
    if (person.shouldCopyFromOtherGraph) {
      await copyPersonFromGraph(person.uri, userGraph, person.graph);
      res.status(HTTP_STATUS_CODE.CREATED).send({ uri: person.uri });
    }
    throw {
      message: 'The person you are trying to create already exists.',
      status: HTTP_STATUS_CODE.CONFLICT,
    };
  } else {
    throw {
      message:
        'We found a person for the identifier but the given values do not match.',
      status: HTTP_STATUS_CODE.NOT_ACCEPTABLE,
    };
  }
});

async function findPerson(identifier: string) {
  const personInUserGraph = await getPersonByIdentifier(identifier);
  if (personInUserGraph) {
    return {
      ...personInUserGraph,
      shouldCopyFromOtherGraph: false,
    };
  }

  const personInOtherGraph =
    await findPersonByIdentifierInOtherGraphs(identifier);
  if (personInOtherGraph) {
    return {
      ...personInUserGraph,
      shouldCopyFromOtherGraph: true,
    };
  }

  return null;
}

function createPersonRequest(req: Request) {
  const requiredProperties = [
    'firstName',
    'lastName',
    'identifier',
    'birthDate',
  ];
  for (const property of requiredProperties) {
    if (!req.body[property]) {
      throw {
        message: `Property "${property}" is required when creating a new person`,
        status: HTTP_STATUS_CODE.BAD_REQUEST,
      };
    }
  }

  const birthDate = new Date(req.body.birthDate);
  if (isNaN(birthDate.getTime())) {
    throw {
      message: 'Please provide a valid date for "birthDate".',
      status: HTTP_STATUS_CODE.BAD_REQUEST,
    };
  }

  return {
    // eslint-disable-next-line no-useless-escape
    identifier: stripIdentifierString(req.body.identifier),
    firstName: req.body.firstName?.trim(),
    lastName: req.body.lastName?.trim(),
    alternativeName: req.body.alternativeName?.trim(),
    birthDate,
  };
}
