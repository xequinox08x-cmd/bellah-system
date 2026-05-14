import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

/**
 * DEFENSE MODE: localStorage Persistence Layer
 * 
 * Automatically persists React Query cache to localStorage:
 * - Survives page reloads
 * - Works offline after initial load
 * - Gracefully handles storage errors
 * - Size-optimized storage
 */

// Maximum cache size before cleanup (10MB)
const MAX_CACHE_SIZE = 10 * 1024 * 1024;

// Storage key for persistence
const STORAGE_KEY = 'demo_query_cache';
const METADATA_KEY = 'demo_cache_metadata';

/**
 * Create a safe storage persister with error handling
 */
function createSafeStoragePersister() {
  return createSyncStoragePersister({
    storage: typeof window !== 'undefined' ? window.localStorage : null as any,
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn('[Cache] Failed to deserialize cache, starting fresh');
        return undefined;
      }
    },
  });
}

/**
 * Setup cache persistence for query client
 */
export async function setupCachePersistence(queryClient: QueryClient): Promise<void> {
  if (typeof window === 'undefined') return; // Skip on server-side

  try {
    // Initialize persister
    const persister = createSafeStoragePersister();

    // Restore cache from localStorage
    await persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries
          return query.state.status === 'success';
        },
      },
      hydrateOptions: {},
    });

    console.info('[Cache] ✅ Cache persistence initialized');

    // Setup periodic cache cleanup
    setupCacheCleanup();

    // Monitor storage quota
    setupStorageMonitoring();
  } catch (error) {
    console.error('[Cache] Failed to setup persistence:', error);
  }
}

/**
 * Periodically cleanup old cache entries
 */
function setupCacheCleanup(): void {
  setInterval(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) return;

      const sizeBytes = new Blob([storedData]).size;

      // Clean up if cache exceeds size limit
      if (sizeBytes > MAX_CACHE_SIZE) {
        console.warn(`[Cache] Cache size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds limit, cleaning up...`);
        
        // Remove oldest entries
        // In production, you'd implement intelligent cleanup
        localStorage.removeItem(STORAGE_KEY);
        console.info('[Cache] Cache cleared to reclaim storage');
      }
    } catch (error) {
      console.warn('[Cache] Cleanup error:', error);
    }
  }, 1000 * 60 * 5); // Every 5 minutes
}

/**
 * Monitor and report storage usage
 */
function setupStorageMonitoring(): void {
  if (!navigator.storage?.estimate) return;

  navigator.storage.estimate().then(({ usage, quota }) => {
    const percentUsed = (usage / quota) * 100;
    console.info(`[Storage] Using ${(usage / 1024 / 1024).toFixed(2)}MB of ${(quota / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(1)}%)`);

    // Warn if running low on storage
    if (percentUsed > 80) {
      console.warn(`[Storage] ⚠️ Storage quota nearing limit (${percentUsed.toFixed(1)}%)`);
    }
  }).catch(error => {
    console.debug('[Storage] Storage estimate not available:', error);
  });
}

/**
 * Manually persist cache (useful for emergency situations)
 */
export function manualPersistCache(data: any): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(METADATA_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }));
    console.info('[Cache] ✅ Manual cache persistence completed');
  } catch (error) {
    console.error('[Cache] Failed to manually persist cache:', error);
  }
}

/**
 * Retrieve cache metadata
 */
export function getCacheMetadata(): any {
  try {
    const metadata = localStorage.getItem(METADATA_KEY);
    return metadata ? JSON.parse(metadata) : null;
  } catch {
    return null;
  }
}

/**
 * Clear all persisted cache (for debugging)
 */
export function clearPersistedCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(METADATA_KEY);
    console.info('[Cache] ✅ Persisted cache cleared');
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
  }
}

/**
 * Get cache size info
 */
export function getCacheSize(): { sizeBytes: number; sizeMB: number } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { sizeBytes: 0, sizeMB: 0 };

    const sizeBytes = new Blob([data]).size;
    return {
      sizeBytes,
      sizeMB: sizeBytes / 1024 / 1024,
    };
  } catch {
    return { sizeBytes: 0, sizeMB: 0 };
  }
}