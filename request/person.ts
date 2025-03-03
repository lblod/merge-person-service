import { Request } from 'express';

export function createPersonRequest(req: Request) {
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
        status: 400,
      };
    }
  }

  const birthDate = new Date(req.body.birthDate);
  if (isNaN(birthDate.getTime())) {
    throw {
      message: 'Please provide a valid date for "birthDate".',
      status: 400,
    };
  }

  return {
    // eslint-disable-next-line no-useless-escape
    identifier: req.body.identifier.replace(/[\.-]/g, ''),
    firstName: req.body.firstName?.trim(),
    lastName: req.body.lastName?.trim(),
    birthDate,
  };
}
