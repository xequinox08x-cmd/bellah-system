import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// DEFENSE MODE: Optimized cache configuration for maximum reliability during demos
// Prioritizes offline availability and fast perceived performance over fresh data

const queryConfig: DefaultOptions = {
  queries: {
    // CRITICAL: Keep cached data indefinitely during demo
    // Only refetch if explicitly triggered
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - assume data is always fresh
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - never garbage collect during event
    
    // CRITICAL: Disable automatic refetching
    refetchOnMount: false,           // Don't refetch when component mounts
    refetchOnWindowFocus: false,     // Don't refetch on window focus
    refetchOnReconnect: false,       // Don't refetch on network reconnection
    refetchInterval: false,          // Never auto-refetch
    refetchIntervalInBackground: false,
    placeholderData: (previousData) => previousData,
    
    // Error handling with retries
    retry: 2,                        // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Network timeout
    networkMode: 'always',           // Never cancel requests due to network mode
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
  // Cache times for different data types
  DASHBOARD: {
    staleTime: 1000 * 60 * 60 * 24,    // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
  },
  ANALYTICS: {
    staleTime: 1000 * 60 * 60 * 24,    // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
  },
  INVENTORY: {
    staleTime: 1000 * 60 * 60,         // 1 hour
    gcTime: 1000 * 60 * 60 * 24,       // 24 hours
  },
  SALES: {
    staleTime: 1000 * 60 * 60,         // 1 hour
    gcTime: 1000 * 60 * 60 * 24,       // 24 hours
  },
  AI_CONTENT: {
    staleTime: 1000 * 60 * 60 * 24,    // 24 hours - never change during demo
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
  },
  CAMPAIGNS: {
    staleTime: 1000 * 60 * 60 * 24,    // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 days
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
    list: () => [...queryKeys.aiContent.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.aiContent.all, 'detail', id] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    list: () => [...queryKeys.campaigns.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.campaigns.all, 'detail', id] as const,
  },
} as const;
