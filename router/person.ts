import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { getPersonById } from '../controller/person';

export const personRouter = Router();

personRouter.get('/:id', async (req: Request, res: Response) => {
  const personUri = await getPersonById(req.params.id);
  if (!personUri) {
    throw {
      message: `Invalid person id. Could not find person with id: ${req.params.id}`,
      status: 400,
    };
  }

  res.status(200).send({
    id: req.params.id,
    uri: personUri,
  });
});
