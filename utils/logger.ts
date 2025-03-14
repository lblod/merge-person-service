export const LOG_LEVEL = {
  INFO: 'info',
  DEBUG: 'debug',
};

const CRON_LOG_LEVEL = process.env.CRON_LOG_LEVEL || LOG_LEVEL.DEBUG;

export function log(content: string, level = LOG_LEVEL.DEBUG) {
  if (level === LOG_LEVEL.INFO) {
    console.log('\n|> INFO: ' + content);
  }
  if (level === LOG_LEVEL.DEBUG && CRON_LOG_LEVEL === LOG_LEVEL.DEBUG) {
    console.log('\n|> DEBUG: ' + content);
  }
}
