import { config } from './config.js';
import { molizhishu } from './client.js';
import { saveRemoteResult, unfinishedTaskIds } from './repository.js';
import { hasCompletedItems, terminalStatus } from './utils.js';

/**
 * Synchronizes one local task with Molizhishu remote status/result APIs.
 *
 * Result fetching is triggered when the master task is terminal or when any
 * subtask has already reached a terminal state, so partial results are stored
 * before the entire master task completes.
 *
 * @param {string} taskId Molizhishu task id.
 * @param {string} source log source, e.g. manual compensation or scheduler.
 * @returns {Promise<object>} freshest payload persisted locally.
 */
export async function syncOne(taskId, source) {
  const started = Date.now();
  const status = await molizhishu('GET', `/task/status/${encodeURIComponent(taskId)}`, null, `${source}:status`);
  await saveRemoteResult(status);
  const fetchResult = terminalStatus(status.status) || hasCompletedItems(status);
  const data = fetchResult
    ? await molizhishu('GET', `/task/result/${encodeURIComponent(taskId)}`, null, `${source}:result`)
    : status;
  if (fetchResult) await saveRemoteResult(data);
  console.log(`[sync] source=${source} task_id=${taskId} status=${status.status || 'unknown'} fetch_result=${fetchResult} duration=${Date.now() - started}ms`);
  return data;
}

/**
 * Synchronizes a bounded batch of unfinished or incomplete local tasks.
 *
 * @param {string} source log source used for observability.
 * @returns {Promise<void>}
 */
export async function syncUnfinished(source) {
  const taskIds = await unfinishedTaskIds(config.syncLimit);
  let synced = 0;
  let failed = 0;
  for (const taskId of taskIds) {
    try {
      await syncOne(taskId, source);
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error(`[sync] source=${source} task_id=${taskId} failed=true error="${error.message}"`);
    }
  }
  console.log(`[sync] source=${source} total=${taskIds.length} synced=${synced} failed=${failed}`);
}
