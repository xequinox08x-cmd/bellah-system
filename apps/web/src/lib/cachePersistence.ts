import type { QueryClient } from '@tanstack/react-query';
import { getBellahIdb } from './persistentStorage/idbDb';
import { IDB_RQ_CLIENT_KEY, IDB_STORE, LEGACY_LS_RQ_KEY } from './persistentStorage/constants';
import { createIndexedDbQueryPersister } from './persistentStorage/createIndexedDbQueryPersister';

export { createIndexedDbQueryPersister };

/** Persister for PersistQueryClientProvider — IndexedDB only (no localStorage for RQ blob). */
export const indexedDbQueryPersister = createIndexedDbQueryPersister();

/**
 * Clear persisted React Query client in IndexedDB only.
 * NOT called on logout — for debugging / “reset app data” only.
 */
export async function clearIndexedDbQueryCache(): Promise<void> {
  try {
    const db = await getBellahIdb();
    await db.delete(IDB_STORE, IDB_RQ_CLIENT_KEY);
    try {
      localStorage.removeItem(LEGACY_LS_RQ_KEY);
    } catch {
      /* ignore */
    }
    console.info('[Cache] IndexedDB React Query cache cleared');
  } catch (e) {
    console.warn('[Cache] Failed to clear IndexedDB cache:', e);
  }
}

/** Approximate byte size of persisted RQ client in IndexedDB (best-effort). */
export async function getIndexedDbQueryCacheSize(): Promise<{ sizeBytes: number; sizeMB: number }> {
  try {
    const db = await getBellahIdb();
    const raw = await db.get(IDB_STORE, IDB_RQ_CLIENT_KEY);
    if (raw == null) return { sizeBytes: 0, sizeMB: 0 };
    const json = JSON.stringify(raw);
    const sizeBytes = new Blob([json]).size;
    return { sizeBytes, sizeMB: sizeBytes / (1024 * 1024) };
  } catch {
    return { sizeBytes: 0, sizeMB: 0 };
  }
}

/** @deprecated Use clearIndexedDbQueryCache — kept for devtools search */
export async function clearPersistedCache(): Promise<void> {
  return clearIndexedDbQueryCache();
}

/** Dev-only: expose on window */
export function exposeCacheDebug(queryClient: QueryClient): void {
  if (typeof window === 'undefined' || import.meta.env.PROD) return;
  (window as unknown as { __bellahCacheDebug?: unknown }).__bellahCacheDebug = {
    clearIndexedDbQueryCache,
    getIndexedDbQueryCacheSize,
    queryClient,
  };
}
