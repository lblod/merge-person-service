import { PROCESS_PERSONS_GRAPH } from '../app';
import {
  countOfEntriesInGraph,
  getFirstSubjectUriInGraph,
  movePersonUrisToGraph,
} from '../services/merge';
import { getLastModifiedVersion, getPersonUris } from '../services/person';

export async function preparePersonProcessing() {
  const personProcessCount = await countOfEntriesInGraph(PROCESS_PERSONS_GRAPH);
  if (personProcessCount === 0) {
    const personUris = await getPersonUris();
    const personUriBatches = createBatchesForItems(personUris);

    for (const uriBatch of personUriBatches) {
      await movePersonUrisToGraph(uriBatch, PROCESS_PERSONS_GRAPH);
    }
    console.log(`# Moved ${personUris.length} person uris to process graph`);
  } else {
    console.log(`# Still processing ${personProcessCount} persons`);
  }
}

export async function processPersonInProcessGraph() {
  const personUri = await getFirstSubjectUriInGraph(PROCESS_PERSONS_GRAPH);
  const baseLinePerson = await getLastModifiedVersion(personUri);
}

function createBatchesForItems(items: Array<string>, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
