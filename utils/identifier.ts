export function stripIdentifierString(identifier: string | undefined) {
  if (!identifier) {
    throw {
      message: 'Cannot strip identifier value of undefined.',
      status: 500,
    };
  }

  // eslint-disable-next-line no-useless-escape
  return identifier.replace(/[\.-]/g, '');
}
