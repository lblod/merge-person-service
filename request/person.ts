import { Request } from 'express';
import { stripIdentifierString } from '../utils/identifier';
import { HTTP_STATUS_CODE } from '../utils/constant';

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
