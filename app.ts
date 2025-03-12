import { CronJob } from 'cron';

import { processConflictingPersons } from './controllers/merge';
import { getConflictingPersons } from './services/person';
import { log } from './utils/logger';

export const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS || true;
const CONFLICT_BATCH_SIZE = process.env.CONFLICT_BATCH_SIZE || 1;
const PROCESS_BATCH_SIZE = process.env.PROCESS_BATCH_SIZE || 100;
const CRON_TIME = process.env.CRON_TIME || '0 8 * * 1-5'; // Every weekday at 8am

log(
  `Cron config: ${JSON.stringify({ SHOW_DEBUG_LOGS, CRON_TIME, CONFLICT_BATCH_SIZE, PROCESS_BATCH_SIZE })}`,
);

let isRunning = false;

CronJob.from({
  cronTime: CRON_TIME,
  onTick: async () => {
    log(
      '############################### Merge Person CRON ###############################',
    );
    if (isRunning) {
      log('Previous cycle is still running...');
      return;
    }
    isRunning = true;
    const conflictingPersons = await getConflictingPersons(CONFLICT_BATCH_SIZE);
    if (!conflictingPersons) {
      log('All conflicts are resolved');
    } else {
      log(`Found ${conflictingPersons.length} conflicting persons`);
      await processConflictingPersons(conflictingPersons, PROCESS_BATCH_SIZE);
      log(`Resolved conflicts for ${conflictingPersons.length}`);
    }
    isRunning = false;
  },
  start: true,
});
