import { CronJob } from 'cron';

import { processConflictingPersons } from './controllers/merge';
import { getConflictingPersons } from './services/person';

const BATCH_SIZE = process.env.BATCH_SIZE || 100;
const CRON_TIME = process.env.CRON_TIME || '0 8 * * 1-5'; // Every weekday at 8am

CronJob.from({
  cronTime: CRON_TIME,
  onTick: async () => {
    console.log(
      '\n############################### Merge Person CRON  ###############################',
    );
    const conflictingPersons = await getConflictingPersons();
    console.log(`\n# Found ${conflictingPersons?.length} conflicting persons`);
    await processConflictingPersons(conflictingPersons, BATCH_SIZE);
  },
  onComplete: () => {
    console.log('\n# Merge person cron completed successfully');
  },
  start: true,
});
