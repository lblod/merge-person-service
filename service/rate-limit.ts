import { Request } from 'express';
import moment from 'moment';

import { HttpError } from '../utils/http-error';
import { HTTP_STATUS_CODE } from '../utils/constant';

export class RateLimitService {
  private rateLimit: number = 0;
  private timeSpan: number = 0;

  private sessionMapping = {};

  setRateLimit(limit: number | undefined) {
    if (!limit) {
      return;
    }
    this.rateLimit = limit;
  }
  setRateLimitTimeSpan(time: number | undefined) {
    if (!time) {
      return;
    }

    this.timeSpan = time;
  }

  applyOnRequest(request: Request) {
    const sessionId = request.get('mu-session-id');

    if (!sessionId) {
      throw new HttpError('No session id fount', HTTP_STATUS_CODE.UNAUTHORIZED);
    }

    if (this.isTimeSpanExceeded(sessionId)) {
      delete this.sessionMapping[sessionId];
    }

    if (this.isRateLimitExceeded(sessionId)) {
      throw new HttpError(
        'Rate limit exceeded',
        HTTP_STATUS_CODE.TOO_MANY_REQUESTS,
      );
    }

    if (!this.sessionMapping[sessionId]) {
      this.sessionMapping[sessionId] = {
        attempts: 1,
        stop: moment(new Date())
          .add(this.timeSpan, 'milliseconds')
          .toDate()
          .getTime(),
      };
    } else {
      this.sessionMapping[sessionId].attempts++;
    }
    console.log(this.sessionMapping);
  }
  private isTimeSpanExceeded(sessionId: string) {
    if (!this.sessionMapping[sessionId]) {
      return true;
    }

    return (
      moment(new Date()).toDate().getTime() >=
      this.sessionMapping[sessionId].stop
    );
  }
  private isRateLimitExceeded(sessionId: string) {
    if (!this.sessionMapping[sessionId]) {
      return false;
    }

    return this.sessionMapping[sessionId].attempts >= this.rateLimit;
  }
}
