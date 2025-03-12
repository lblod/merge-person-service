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

export async function processConflictingPersons(
  conflicts: Array<Conflict>,
  batchSize: number,
) {
  const batches = createBatchesForConflicts(conflicts, batchSize);

  // for (const batch of batches) {
  const dataMisMatchPersonUris = await getPersonUrisWithDataMismatch(
    batches[0],
  );
  await addIsConflictingFlagToPersons(dataMisMatchPersonUris);

  await mergeConflictsWithPerson(conflicts);
  // }
}

function createBatchesForConflicts(items: Array<Conflict>, batchSize: number) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

async function mergeConflictsWithPerson(conflicts: Array<Conflict>) {
  await updateConflictUsageToPersonAsSubject(conflicts);
  await updateConflictUsageToPersonAsObject(conflicts);
  await setupTombstoneForConflicts(conflicts);
}
