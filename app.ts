import { CronJob } from 'cron';

import {
  preparePersonProcessing,
  processPersonInProcessGraph,
} from './controllers/merge';

export const PROCESS_PERSONS_GRAPH =
  'http://mu.semte.ch/vocabularies/ext/persons-to-process';

const CRON_TIME = process.env.CRON_TIME || '0 8 * * 1-5'; // Every weekday at 8am
CronJob.from({
  cronTime: CRON_TIME,
  onTick: async () => {
    console.log(
      '\n############################### Merge Person CRON  ###############################',
    );
    console.log(`# Time: ${new Date().toJSON()}`);

    await preparePersonProcessing();
    await processPersonInProcessGraph();
  },
  onComplete: () => {
    console.log('# Merge person cron completed successfully');
  },
  start: true,
});
