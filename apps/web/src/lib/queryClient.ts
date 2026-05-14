import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/** Default React Query options: stale-while-revalidate, offline-first reads, long gc for persistence. */
const queryConfig: DefaultOptions = {
  queries: {
    /** Stale-while-revalidate: show IndexedDB/restored cache immediately, refresh after this window */
    staleTime: 1000 * 60, // 1 minute — then background refetch when queries become active
    gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days in memory layer; IndexedDB persists longer via persist client

    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    placeholderData: (previousData) => previousData,

    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    /** Prefer cached data when offline; still try fetch when online (handled per queryFn) */
    networkMode: 'offlineFirst',
  },
  mutations: {
    retry: 1,
    gcTime: 1000 * 60 * 60, // 1 hour
  },
};

// Create the query client with optimized settings
export const defenseQueryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Export individual configurations for flexibility
export const CACHE_CONFIG = {
  DASHBOARD: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 14,
  },
  ANALYTICS: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 14,
  },
  INVENTORY: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  },
  SALES: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  },
  AI_CONTENT: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  },
  CAMPAIGNS: {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  },
};

// Query key factory - organized by feature
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: () => [...queryKeys.analytics.all, 'summary'] as const,
    trend: () => [...queryKeys.analytics.all, 'trend'] as const,
  },
  products: {
    all: ['products'] as const,
    list: () => [...queryKeys.products.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.products.all, 'detail', id] as const,
  },
  sales: {
    all: ['sales'] as const,
    list: () => [...queryKeys.sales.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.sales.all, 'detail', id] as const,
  },
  aiContent: {
    all: ['aiContent'] as const,
    list: (status?: string) => [...queryKeys.aiContent.all, 'list', status ?? 'all'] as const,
    detail: (id: number) => [...queryKeys.aiContent.all, 'detail', id] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    list: () => [...queryKeys.campaigns.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.campaigns.all, 'detail', id] as const,
  },
  scheduledPosts: {
    all: ['scheduledPosts'] as const,
    list: () => [...queryKeys.scheduledPosts.all, 'list'] as const,
  },
  settings: {
    all: ['settings'] as const,
    meta: () => [...queryKeys.settings.all, 'meta'] as const,
  },
} as const;
