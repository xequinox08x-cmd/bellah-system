import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import {
  IDB_RQ_CLIENT_KEY,
  IDB_STORE,
  LEGACY_LS_RQ_KEY,
} from './constants';
import { getBellahIdb } from './idbDb';

let migrationFromLegacyDone = false;

/**
 * TanStack Query persister backed by IndexedDB (not localStorage).
 * Survives refresh, browser restart, deployment, weak network sessions, logout.
 */
export function createIndexedDbQueryPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getBellahIdb();
      await db.put(IDB_STORE, client, IDB_RQ_CLIENT_KEY);
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      const db = await getBellahIdb();
      let data = (await db.get(IDB_STORE, IDB_RQ_CLIENT_KEY)) as PersistedClient | undefined;

      if (!data && typeof localStorage !== 'undefined' && !migrationFromLegacyDone) {
        migrationFromLegacyDone = true;
        try {
          const legacy = localStorage.getItem(LEGACY_LS_RQ_KEY);
          if (legacy) {
            data = JSON.parse(legacy) as PersistedClient;
            await db.put(IDB_STORE, data, IDB_RQ_CLIENT_KEY);
            localStorage.removeItem(LEGACY_LS_RQ_KEY);
          }
        } catch {
          /* ignore corrupt legacy */
        }
      }

      return data ?? undefined;
    },

    removeClient: async () => {
      const db = await getBellahIdb();
      await db.delete(IDB_STORE, IDB_RQ_CLIENT_KEY);
    },
  };
}
