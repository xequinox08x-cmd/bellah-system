import NodeCache from 'node-cache';

// Simple in-memory cache for API responses
// For production, consider Redis or similar
export const apiCache = new NodeCache({
  stdTTL: 300,        // 5 minutes default TTL
  checkperiod: 60,    // Check for expired keys every 60 seconds
  maxKeys: 1000,      // Maximum 1000 cached items
});

// Cache keys
export const CACHE_KEYS = {
  ANALYTICS_SUMMARY: 'analytics:summary',
  ANALYTICS_TREND: (days: number) => `analytics:trend:${days}`,
  ANALYTICS_POSTS: 'analytics:posts',
  PRODUCTS_LIST: 'products:list',
  AI_CONTENT_LIST: (status?: string, page?: number) => `ai_content:list:${status || 'all'}:${page || 1}`,
  DASHBOARD_STATS: 'dashboard:stats',
} as const;

// Cache TTL configurations
export const CACHE_TTL = {
  ANALYTICS: 30,      // 30 seconds - analytics can be manually refreshed live
  PRODUCTS: 600,      // 10 minutes - product data changes less frequently
  DASHBOARD: 180,     // 3 minutes - dashboard data
  AI_CONTENT: 120,    // 2 minutes - content changes often
} as const;

// Cache helper functions
export function getCachedData<T>(key: string): T | undefined {
  return apiCache.get<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttl: number = 300): boolean {
  return apiCache.set(key, data, ttl);
}

export function invalidateCache(pattern: string): void {
  // Simple pattern matching - for production use Redis SCAN
  const keys = apiCache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));

  if (matchingKeys.length > 0) {
    apiCache.del(matchingKeys);
    console.info(`[cache] invalidated ${matchingKeys.length} keys matching "${pattern}"`);
  }
}

export function clearAllCache(): void {
  apiCache.flushAll();
  console.info('[cache] all cache cleared');
}

// Cache statistics
export function getCacheStats() {
  return {
    keys: apiCache.getStats().keys,
    hits: apiCache.getStats().hits,
    misses: apiCache.getStats().misses,
    hitRate: apiCache.getStats().hits / (apiCache.getStats().hits + apiCache.getStats().misses) || 0,
  };
}
