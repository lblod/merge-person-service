import {
  addIsConflictingFlagToPersons,
  updateConflictUsageToPersonAsObject,
  updateConflictUsageToPersonAsSubject,
} from '../services/merge';
import {
  getPersonAndConflictWithIsInConflictFlag,
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
    const personsWithConflictAndFlag =
      await getPersonAndConflictWithIsInConflictFlag(batch);

    const withFlag = personsWithConflictAndFlag
      .filter((p: Conflict) => p.hasConflictingData)
      .map((p: Conflict) => p.conflictUri);
    await addIsConflictingFlagToPersons(withFlag);

    const withoutFlag = personsWithConflictAndFlag.filter(
      (p: Conflict) => !p.hasConflictingData,
    );
    await updateConflictUsageToPersonAsSubject(withoutFlag);
    await updateConflictUsageToPersonAsObject(withoutFlag);
    await setupTombstoneForConflicts(withoutFlag);
  }
}

function createBatchesForConflicts(items: Array<Conflict>, batchSize: number) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
