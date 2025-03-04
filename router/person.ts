import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { createPersonRequest } from '../request/person';
import { createPerson, getPersonByIdentifier } from '../controller/person';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const { firstName, lastName, identifier, birthDate } =
    createPersonRequest(req);

  const person = await getPersonByIdentifier(identifier);

  if (person) {
    const isCompleteMatch = [
      firstName === person.firstName,
      lastName === person.lastName,
      birthDate.toJSON() === person.birthdate.toJSON(),
    ].every((condition) => condition === true);

    if (isCompleteMatch) {
      throw {
        message: 'The person you are trying to create already exists.',
        status: 409, // Statuscode: Conflict
      };
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

  res.status(200).send({ uri: newPerson });
});
