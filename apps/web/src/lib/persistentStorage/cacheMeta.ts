import { DEFAULT_CACHE_BUSTER, LS_CACHE_BUSTER, LS_LAST_SYNC_AT } from './constants';

export function getPersistCacheBuster(): string {
  if (typeof window === 'undefined') return DEFAULT_CACHE_BUSTER;
  try {
    const fromLs = window.localStorage.getItem(LS_CACHE_BUSTER);
    const fromEnv = import.meta.env.VITE_CACHE_BUSTER as string | undefined;
    return (fromEnv && String(fromEnv)) || fromLs || DEFAULT_CACHE_BUSTER;
  } catch {
    return DEFAULT_CACHE_BUSTER;
  }
}

/** Dev / deploy: bump to drop incompatible IndexedDB React Query blob */
export function bumpPersistCacheBuster(): void {
  try {
    window.localStorage.setItem(LS_CACHE_BUSTER, `b-${Date.now()}`);
  } catch {
    /* ignore */
  }
}

export function setLastBackgroundSyncAt(iso: string): void {
  try {
    window.localStorage.setItem(LS_LAST_SYNC_AT, iso);
  } catch {
    /* ignore */
  }
}

export function getLastBackgroundSyncAt(): string | null {
  try {
    return window.localStorage.getItem(LS_LAST_SYNC_AT);
  } catch {
    return null;
  }
}
