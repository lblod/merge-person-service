import {
  addIsConflictingFlagToPersons,
  updateConflictUsageToPersonAsObject,
  updateConflictUsageToPersonAsSubject,
} from '../services/merge';
import {
  getConflictingPersonUris,
  setupTombstoneForConflicts,
} from '../services/person';
import { Conflict } from '../types';
import { CustomError } from '../utils/custom-error';
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
    const personsWithConflictAndFlag = await getConflictingPersonUris(batch);

    if (personsWithConflictAndFlag.length !== batch.length) {
      throw new CustomError(
        'More conflict results where found than there are persons in this batch. This means an optional value in the query is not returning a value. Please lower the batch size to one to find out what person is causing this issue.',
      );
    }
    console.log({ personsWithConflictAndFlag });
    const withFlag = personsWithConflictAndFlag.filter(
      (p: Conflict) => p.hasConflictingData,
    );
    await addIsConflictingFlagToPersons(withFlag);

    const withoutFlag = personsWithConflictAndFlag.filter(
      (p: Conflict) => !p.hasConflictingData,
    );
    if (withoutFlag.length >= 1) {
      await updateConflictUsageToPersonAsSubject(withoutFlag);
      await updateConflictUsageToPersonAsObject(withoutFlag);
      await setupTombstoneForConflicts(withoutFlag);
    }
  }
}

function createBatchesForConflicts(
  items: Array<Conflict>,
  batchSize: number,
): Array<Array<Conflict>> {
  const batches = [];
  for (let i = 0;i < items.length;i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
