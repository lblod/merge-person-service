import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { getPersonById, getPersonByIdentifier } from '../controller/person';

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

personRouter.get('/:rrn/identifier', async (req: Request, res: Response) => {
  // eslint-disable-next-line no-useless-escape
  const strippedRrn = req.params.rrn.replace(/[\.-]/g, '');
  console.log({ rrn: req.params.rrn });
  console.log({ strippedRrn });
  const personUri = await getPersonByIdentifier(strippedRrn);

  res.status(200).send({
    rrn: strippedRrn,
    uri: personUri,
  });
});
