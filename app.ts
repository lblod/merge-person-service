import { CronJob } from 'cron';

const CRON_TIME = process.env.CRON_TIME || '0 8 * * 1-5'; // Every weekday at 8am
CronJob.from({
  cronTime: CRON_TIME,
  onTick: async () => {
    console.log(
      '\n############################### Merge Person CRON  ###############################',
    );
  },
  onComplete: () => {
    console.log('# Merge person cron completed successfully');
  },
  start: true,
});