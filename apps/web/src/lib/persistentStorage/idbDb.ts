import { openDB, type IDBPDatabase } from 'idb';
import { IDB_DB_NAME, IDB_STORE } from './constants';

const DB_VERSION = 1;

type BellahKVSchema = {
  [IDB_STORE]: {
    key: string;
    value: unknown;
  };
};

let dbPromise: Promise<IDBPDatabase<BellahKVSchema>> | null = null;

export type BellahIdb = IDBPDatabase<BellahKVSchema>;

export function getBellahIdb(): Promise<BellahIdb> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB<BellahKVSchema>(IDB_DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      },
    });
  }
  return dbPromise;
}
