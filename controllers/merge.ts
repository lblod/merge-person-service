import { getPersonAndConflictWithIsConflictingFlag } from '../services/person';
import { Conflict } from '../types';

export async function processConflictingPersons(
  conflicts: Array<Conflict>,
  batchSize: number,
) {
  const batches = createBatchesForConflicts(conflicts, batchSize);

  // for (const batch of batches) {
    const withIsConflictingFlag =
      await getPersonAndConflictWithIsConflictingFlag(batches[0]);
    console.log({ withIsConflictingFlag });
  // }
}

function createBatchesForConflicts(items: Array<Conflict>, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
