import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HTTP_STATUS_CODE, HttpError } from '../utils/http-error';
import { createPerson, getPersonByIdentifier } from '../services/person';
import { findPersonByIdentifierInOtherGraphs } from '../services/sudo';

export const mergePersonRouter = Router();

mergePersonRouter.post('/create', async (req: Request, res: Response) => {
  const { firstName, lastName, alternativeName, identifier, birthDate } =
    createPersonRequest(req);
  const person = await findPerson(identifier);
  let personUri = person?.uri;

  if (person) {
    throw new HttpError(
      'Merge the person data',
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
    );
  } else {
    personUri = createPerson({
      firstName,
      lastName,
      alternativeName,
      identifier,
      birthDate,
    });
  }

  res.status(HTTP_STATUS_CODE.CREATED).send({ personUri });
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
      ...personInOtherGraph,
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
      throw new HttpError(
        `Property "${property}" is required when creating a new person`,
        HTTP_STATUS_CODE.BAD_REQUEST,
      );
    }
  }

  const birthDate = new Date(req.body.birthDate);
  if (isNaN(birthDate.getTime())) {
    throw new HttpError(
      'Please provide a valid date for "birthDate".',
      HTTP_STATUS_CODE.BAD_REQUEST,
    );
  }

  return {
    // eslint-disable-next-line no-useless-escape
    identifier: req.body.identifier.replace(/[\.-]/g, ''),
    firstName: req.body.firstName?.trim(),
    lastName: req.body.lastName?.trim(),
    alternativeName: req.body.alternativeName?.trim(),
    birthDate,
  };
}
