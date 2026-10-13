/** Agrupa ráfagas y permite una sola actualización en vuelo. */
export function createRefreshScheduler(refresh: () => Promise<void> | void, delay = 150) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false, pending = false, disposed = false;
  const run = async () => {
    timer = undefined;
    if (disposed || running) return;
    running = true; pending = false;
    try { await refresh(); } finally {
      running = false;
      if (pending && !disposed) timer = setTimeout(() => { void run(); }, delay);
    }
  };
  return {
    request() {
      if (disposed) return;
      pending = true;
      if (!running && timer === undefined) timer = setTimeout(() => { void run(); }, delay);
    },
    dispose() { disposed = true; pending = false; clearTimeout(timer); },
  };
}
