import { HTTP_STATUS_CODE } from './constant';

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
  }
}
