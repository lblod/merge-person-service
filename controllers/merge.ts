import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HTTP_STATUS_CODE, HttpError } from '../utils/http-error';
import { PersonCreate, Person } from '../types';

import {
  createPerson,
  getPersonByIdentifier,
  updatePersonData,
} from '../services/person';
import { findPersonByIdentifierInOtherGraphs } from '../services/sudo';

export const mergePersonRouter = Router();

mergePersonRouter.post('/create', async (req: Request, res: Response) => {
  const personCreateData = createPersonRequest(req);
  const person = await findPerson(personCreateData.identifier);
  let personUri = person?.uri;

  if (person) {
    await mergePersonData(personUri, personCreateData, person);
  } else {
    personUri = await createPerson(personCreateData);
  }

  res.status(HTTP_STATUS_CODE.CREATED).send({ personUri });
});

async function findPerson(identifier: string): Promise<null | Person> {
  const personInUserGraph = await getPersonByIdentifier(identifier);
  if (personInUserGraph) {
    return personInUserGraph;
  }

  const personInOtherGraph =
    await findPersonByIdentifierInOtherGraphs(identifier);
  if (personInOtherGraph) {
    return personInOtherGraph;
  }

  return null;
}

async function mergePersonData(
  personUri: string,
  personCreate: PersonCreate,
  person: Person,
): Promise<void> {
  if (person.graph) {
    // TODO: copy over the person and merge the data
  }

  await updatePersonData(personUri, personCreate);
}

function createPersonRequest(req: Request): PersonCreate {
  const requiredProperties = [
    'firstName',
    'lastName',
    'identifier',
    'birthdate',
  ];
  for (const property of requiredProperties) {
    if (!req.body[property]) {
      throw new HttpError(
        `Property "${property}" is required when creating a new person`,
        HTTP_STATUS_CODE.BAD_REQUEST,
      );
    }
  }

  const birthdate = new Date(req.body.birthdate);
  if (isNaN(birthdate.getTime())) {
    throw new HttpError(
      'Please provide a valid date for "birthdate".',
      HTTP_STATUS_CODE.BAD_REQUEST,
    );
  }

  return {
    // eslint-disable-next-line no-useless-escape
    identifier: req.body.identifier.replace(/[\.-]/g, ''),
    firstName: req.body.firstName?.trim(),
    lastName: req.body.lastName?.trim(),
    alternativeName: req.body.alternativeName?.trim(),
    birthdate,
  };
}
