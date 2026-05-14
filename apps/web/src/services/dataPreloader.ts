import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

type ApiClient = {
  get: (endpoint: string, options?: { timeout?: number; cacheTtlMs?: number }) => Promise<{ data: unknown }>;
  post: (endpoint: string, body?: unknown, options?: { timeout?: number }) => Promise<{ data: unknown }>;
};

/**
 * DEFENSE MODE: Data Preloader Service
 * 
 * Preloads all critical data on app startup
 * Ensures dashboard appears instant during demo
 */

interface PreloadConfig {
  queryClient: QueryClient;
  api: ApiClient;
  onProgress?: (loaded: number, total: number) => void;
}

// Define which queries to preload and in what order
const PRELOAD_QUERIES = [
  {
    name: 'Dashboard Stats',
    key: queryKeys.dashboard.summary(),
    endpoint: '/api/dashboard/summary',
    priority: 1,
  },
  {
    name: 'Analytics Summary',
    key: queryKeys.analytics.summary(),
    endpoint: '/api/analytics/summary',
    priority: 1,
  },
  {
    name: 'Products List',
    key: queryKeys.products.list(),
    endpoint: '/api/products',
    priority: 2,
  },
  {
    name: 'Sales Summary',
    key: queryKeys.sales.list(),
    endpoint: '/api/sales',
    priority: 2,
  },
  {
    name: 'AI Content',
    key: queryKeys.aiContent.list(),
    endpoint: '/api/ai/contents?page=1&limit=20',
    priority: 2,
  },
  {
    name: 'Campaigns',
    key: queryKeys.campaigns.list(),
    endpoint: '/api/campaigns',
    priority: 3,
  },
  {
    name: 'Analytics Trend',
    key: queryKeys.analytics.trend(),
    endpoint: '/api/analytics/trend',
    priority: 3,
  },
] as const;

/**
 * Main preload function
 */
export async function preloadAllData(config: PreloadConfig): Promise<PreloadResult> {
  const { queryClient, api, onProgress } = config;
  const startTime = Date.now();
  const results: PreloadResult = {
    loaded: 0,
    total: PRELOAD_QUERIES.length,
    failed: [],
    errors: [],
    duration: 0,
  };

  console.info('[Preloader] 🚀 Starting data preload...');

  try {
    // Sort by priority
    const sortedQueries = [...PRELOAD_QUERIES].sort((a, b) => a.priority - b.priority);

    // Preload high priority queries first (in parallel)
    const highPriorityQueries = sortedQueries.filter(q => q.priority === 1);
    const mediumPriorityQueries = sortedQueries.filter(q => q.priority === 2);
    const lowPriorityQueries = sortedQueries.filter(q => q.priority === 3);

    // Load in waves for progressive rendering
    await loadQueriesInWave(queryClient, api, highPriorityQueries, results, onProgress);
    await loadQueriesInWave(queryClient, api, mediumPriorityQueries, results, onProgress);
    await loadQueriesInWave(queryClient, api, lowPriorityQueries, results, onProgress, true);

    results.duration = Date.now() - startTime;

    console.info('[Preloader] ✅ Preload completed', {
      loaded: results.loaded,
      failed: results.failed.length,
      duration: `${results.duration}ms`,
    });

    return results;
  } catch (error) {
    results.duration = Date.now() - startTime;
    console.error('[Preloader] ❌ Preload failed:', error);
    throw error;
  }
}

/**
 * Load a wave of queries in parallel
 */
async function loadQueriesInWave(
  queryClient: QueryClient,
  api: ApiClient,
  queries: typeof PRELOAD_QUERIES,
  results: PreloadResult,
  onProgress?: (loaded: number, total: number) => void,
  isLowPriority = false
): Promise<void> {
  if (!queries.length) return;

  // For low priority, add delay to not block UI
  if (isLowPriority) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const promises = queries.map(async (query) => {
    try {
      const response = await api.get(query.endpoint, { timeout: 5000, cacheTtlMs: 60_000 });

      // Store in query cache
      queryClient.setQueryData(query.key, response.data);

      console.debug(`[Preloader] ✅ ${query.name} loaded`);
      results.loaded++;
      onProgress?.(results.loaded, results.total);
    } catch (error) {
      console.warn(`[Preloader] ⚠️ ${query.name} failed:`, error);
      results.failed.push(query.name);
      results.errors.push({
        query: query.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // For high priority, wait for all; for others, just wait briefly
  if (isLowPriority) {
    // Fire and forget for low priority
    Promise.allSettled(promises).catch(console.error);
  } else {
    await Promise.allSettled(promises);
  }
}

/**
 * Preload individual query with retry logic
 */
export async function preloadQuery(
  queryClient: QueryClient,
  api: ApiClient,
  key: any,
  endpoint: string,
  retries = 2
): Promise<any> {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await api.get(endpoint);
      queryClient.setQueryData(key, data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Warm backend cache
 */
export async function warmBackendCache(api: ApiClient): Promise<void> {
  try {
    console.info('[Preloader] 🔥 Warming backend cache...');
    await api.post('/api/cache/warm');
    console.info('[Preloader] ✅ Backend cache warmed');
  } catch (error) {
    console.warn('[Preloader] ⚠️ Failed to warm backend cache:', error);
    // Non-critical failure
  }
}

export interface PreloadResult {
  loaded: number;
  total: number;
  failed: string[];
  errors: Array<{ query: string; error: string }>;
  duration: number;
}
