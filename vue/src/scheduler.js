/**
 * Starts the Node.js backend compensation poller.
 *
 * The Vue demo is a server-side Node.js API service, not browser code. This
 * scheduler therefore runs in the Node process and may safely use the server
 * API key. Keep scheduling here and keep synchronization/persistence rules in
 * the caller.
 *
 * @param {object} options
 * @param {boolean} options.enabled whether background polling is enabled.
 * @param {number} options.intervalMs polling interval in milliseconds.
 * @param {number} options.limit maximum tasks processed per pass.
 * @param {string} options.source log source for scheduled synchronization.
 * @param {(source: string) => Promise<void>} options.syncUnfinished sync handler.
 * @returns {NodeJS.Timeout | null} interval timer, or null when disabled.
 */
export function startBackgroundSync({ enabled, intervalMs, limit, source, syncUnfinished }) {
  if (!enabled) {
    console.log('[sync] background sync disabled');
    return null;
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncUnfinished(source);
    } catch (error) {
      console.error(`[sync] source=${source} failed=true error="${error.message}"`);
    } finally {
      running = false;
    }
  };

  console.log(`[sync] background sync started interval=${intervalMs}ms limit=${limit}`);
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
