export type PendingOperation<T> = { key: string; request: T };
// Persist before sending. An ambiguous result must reuse the original request, even after reload.
export function beginOperation<T>(storage: Pick<Storage, 'getItem' | 'setItem'>, scope: string, request: T): PendingOperation<T> {
  const saved = storage.getItem(scope);
  if (saved) {
    const pending = JSON.parse(saved) as PendingOperation<T>;
    if (!pending.key || !pending.request) throw new Error('Operación pendiente inválida. Revisa el pedido antes de continuar.');
    return pending;
  }
  const pending = { key: crypto.randomUUID(), request };
  storage.setItem(scope, JSON.stringify(pending));
  return pending;
}
export function finishOperation(storage: Pick<Storage, 'getItem' | 'removeItem'>, scope: string, key: string) {
  const saved = storage.getItem(scope);
  if (saved && (JSON.parse(saved) as { key: string }).key === key) storage.removeItem(scope);
}
