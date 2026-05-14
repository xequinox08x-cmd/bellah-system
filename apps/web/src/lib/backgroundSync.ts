import type { QueryClient } from '@tanstack/react-query';
import { setLastBackgroundSyncAt } from './persistentStorage/cacheMeta';

/**
 * On reconnect: refetch active queries in the background (stale-while-revalidate).
 * Does not clear IndexedDB or logout-related state.
 */
export function registerBackgroundQuerySync(queryClient: QueryClient): () => void {
  const onOnline = () => {
    setLastBackgroundSyncAt(new Date().toISOString());
    void queryClient.invalidateQueries({ refetchType: 'active' });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
    }
  };
}
