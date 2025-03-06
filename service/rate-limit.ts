import { Request } from 'express';
import moment from 'moment';

import { HttpError } from '../utils/http-error';
import { HTTP_STATUS_CODE } from '../utils/constant';
import { getAccountUri } from './session';

export class RateLimitService {
  private rateLimit: number = 0;
  private timeSpan: number = 0;

  private accountMapping = {};

  setRateLimit(limit: number | undefined) {
    if (!limit) {
      return;
    }
    this.rateLimit = 1;
  }
  setRateLimitTimeSpan(time: number | undefined) {
    if (!time) {
      return;
    }

    this.timeSpan = time;
  }

  async applyOnRequest(request: Request) {
    const sessionId = request.get('mu-session-id');

    if (!sessionId) {
      throw new HttpError('No session id found', HTTP_STATUS_CODE.UNAUTHORIZED);
    }

    const accountUri = await getAccountUri(request);

    if (!accountUri) {
      throw new HttpError(
        'No account found for session id',
        HTTP_STATUS_CODE.UNAUTHORIZED,
      );
    }

    if (this.isTimeSpanExceeded(accountUri)) {
      delete this.accountMapping[accountUri];
    }

    if (this.isRateLimitExceeded(accountUri)) {
      throw new HttpError(
        'Rate limit exceeded',
        HTTP_STATUS_CODE.TOO_MANY_REQUESTS,
      );
    }

    if (!this.accountMapping[accountUri]) {
      this.accountMapping[accountUri] = {
        attempts: 1,
        stop: moment(new Date())
          .add(this.timeSpan, 'milliseconds')
          .toDate()
          .getTime(),
      };
    } else {
      this.accountMapping[accountUri].attempts++;
    }
    console.log(this.accountMapping);
  }
  private isTimeSpanExceeded(accountUri: string) {
    if (!this.accountMapping[accountUri]) {
      return true;
    }

    return (
      moment(new Date()).toDate().getTime() >=
      this.accountMapping[accountUri].stop
    );
  }
  private isRateLimitExceeded(accountUri: string) {
    if (!this.accountMapping[accountUri]) {
      return false;
    }

    return this.accountMapping[accountUri].attempts >= this.rateLimit;
  }
}
