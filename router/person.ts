import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { createPersonRequest } from '../request/person';
import { getPersonByIdentifier } from '../controller/person';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const { firstName, lastName, identifier, birthDate } =
    createPersonRequest(req);

  const person = await getPersonByIdentifier(identifier);
  const isCompleetMatch = [
    firstName === person.firstName,
    lastName === person.lastName,
    birthDate.toJSON() === person.birthdate.toJSON(),
  ].every((condition) => condition === true);

  if (person.uri && !isCompleetMatch) {
    throw {
      message: 'We found a person for the identifier but the given values do not match.',
      status: 404, // Statuscode: Not found
    };
  }

  if (isCompleetMatch) {
    throw {
      message: 'The person you are trying to create already exists.',
      status: 409, // Statuscode: Conflict
    };
  }

  // BNo person found TODO:


  res.status(200).send(person);
});
