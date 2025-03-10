export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public description?: string[],
  ) {
    super(message);

    if (!this.status) {
      this.status = HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR;
    }
    if (!this.description) {
      this.description = null;
    }
    console.log('\n Http error: ', this.message);
  }
}

export const HTTP_STATUS_CODE = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
