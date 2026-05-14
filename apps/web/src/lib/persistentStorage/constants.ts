/** IndexedDB database name — survives refresh, browser restart, logout */
export const IDB_DB_NAME = 'bellah-system-cache';

/** Object store for key/value entries */
export const IDB_STORE = 'kv';

/** Key for TanStack Query dehydrated client blob */
export const IDB_RQ_CLIENT_KEY = 'tanstack_query_persisted_client';

/** Legacy localStorage key (one-time migration into IndexedDB) */
export const LEGACY_LS_RQ_KEY = 'REACT_QUERY_OFFLINE_CACHE';

/** localStorage: lightweight metadata only */
export const LS_CACHE_BUSTER = 'bb_rq_cache_buster';

export const LS_LAST_SYNC_AT = 'bb_last_background_sync_at';

/** Bump via env or LS to invalidate incompatible persisted shape */
export const DEFAULT_CACHE_BUSTER = 'v2-idb';
