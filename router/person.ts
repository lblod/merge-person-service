import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { createPersonRequest } from '../request/person';
import { getPersonByIdentifier } from '../controller/person';

export const personRouter = Router();

personRouter.post('/', async (req: Request, res: Response) => {
  const { firstName, lastName, identifier, birthDate } =
    createPersonRequest(req);

  const person = await getPersonByIdentifier(identifier);

  res.status(200).send(person);
});
