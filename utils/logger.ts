import { SHOW_DEBUG_LOGS } from '../app';

export function log(content: string) {
  if (SHOW_DEBUG_LOGS == true) {
    console.log('\n|> ' + content);
  }
}
