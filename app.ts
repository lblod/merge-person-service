import { CronJob } from 'cron';

import { processConflictingPersons } from './services/merge';
import { getConflictingPersons } from './services/person';
import { log, LOG_LEVEL } from './utils/logger';

const CRON_TIME = process.env.CRON_TIME || '0 8 * * 1-5'; // Every weekday at 8am
const PROCESS_BATCH_SIZE = process.env.PROCESS_BATCH_SIZE || 1; // Using 1 here will give you the most feedback on whats going on

log(
  `CONFIG: ${JSON.stringify({ CRON_TIME, PROCESS_BATCH_SIZE })}`,
  LOG_LEVEL.INFO,
);

let isRunning = false;
CronJob.from({
  cronTime: CRON_TIME,
  onTick: async () => {
    log(
      '############################### Merge Person CRON ###############################',
      LOG_LEVEL.INFO,
    );
    if (isRunning) {
      log('Previous cycle is still running...');
      return;
    }
    isRunning = true;
    const conflictingPersons = await getConflictingPersons();
    if (!conflictingPersons) {
      log('All conflicts are resolved', LOG_LEVEL.INFO);
    } else {
      log(
        `Found ${conflictingPersons.length} conflicting persons`,
        LOG_LEVEL.INFO,
      );
      await processConflictingPersons(conflictingPersons, PROCESS_BATCH_SIZE);
      log(`Resolved ${conflictingPersons.length} conflicts`, LOG_LEVEL.INFO);
    }
    isRunning = false;
  },
  start: true,
});
