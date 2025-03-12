import {
  addIsConflictingFlagToPersons,
  updateConflictUsageToPersonAsObject,
  updateConflictUsageToPersonAsSubject,
} from '../services/merge';
import {
  getPersonUrisWithDataMismatch,
  setupTombstoneForConflicts,
} from '../services/person';
import { Conflict } from '../types';
import { log } from '../utils/logger';

export async function processConflictingPersons(
  conflicts: Array<Conflict>,
  batchSize: number,
) {
  if (conflicts.length === 0) {
    log('No conflicts found nothing process');
    return;
  }

  const batches = createBatchesForConflicts(conflicts, batchSize);
  for (const batch of batches) {
    log(`Starting on batch ${batches.indexOf(batch) + 1}/${batches.length}`);
    const dataMisMatchPersonUris = await getPersonUrisWithDataMismatch(batch);
    await addIsConflictingFlagToPersons(dataMisMatchPersonUris);

    await updateConflictUsageToPersonAsSubject(conflicts);
    await updateConflictUsageToPersonAsObject(conflicts);
    await setupTombstoneForConflicts(conflicts);
  }
}

function createBatchesForConflicts(items: Array<Conflict>, batchSize: number) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
