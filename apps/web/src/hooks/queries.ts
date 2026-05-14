import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/api';
import { queryKeys, CACHE_CONFIG } from '@/lib/queryClient';
import { useOfflineQuery } from './useOfflineQuery';

/**
 * DEFENSE MODE: Dashboard Query Hooks
 * 
 * Production-ready hooks with:
 * - Optimized caching
 * - Offline support
 * - Error handling
 * - Fallback data
 */

// Dashboard Summary Query
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/dashboard');
      return response.data;
    },
    staleTime: CACHE_CONFIG.DASHBOARD.staleTime,
    gcTime: CACHE_CONFIG.DASHBOARD.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Analytics Summary Query
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.analytics.summary(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/analytics/summary');
      return response.data;
    },
    staleTime: CACHE_CONFIG.ANALYTICS.staleTime,
    gcTime: CACHE_CONFIG.ANALYTICS.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Analytics Trend Query
export function useAnalyticsTrend() {
  return useQuery({
    queryKey: queryKeys.analytics.trend(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/analytics/trend');
      return response.data;
    },
    staleTime: CACHE_CONFIG.ANALYTICS.staleTime,
    gcTime: CACHE_CONFIG.ANALYTICS.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Products List Query
export function useProductsList() {
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/products');
      return response.data;
    },
    staleTime: CACHE_CONFIG.INVENTORY.staleTime,
    gcTime: CACHE_CONFIG.INVENTORY.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Sales Summary Query
export function useSalesSummary() {
  return useQuery({
    queryKey: queryKeys.sales.list(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/sales');
      return response.data;
    },
    staleTime: CACHE_CONFIG.SALES.staleTime,
    gcTime: CACHE_CONFIG.SALES.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// AI Content Query
export function useAiContent(status?: string) {
  return useQuery({
    queryKey: ['aiContent', status],
    queryFn: async () => {
      const params = status ? { status } : {};
      const response = await axiosInstance.get('/api/ai-content', { params });
      return response.data;
    },
    staleTime: CACHE_CONFIG.AI_CONTENT.staleTime,
    gcTime: CACHE_CONFIG.AI_CONTENT.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Campaigns Query
export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: async () => {
      const response = await axiosInstance.get('/api/campaigns');
      return response.data;
    },
    staleTime: CACHE_CONFIG.CAMPAIGNS.staleTime,
    gcTime: CACHE_CONFIG.CAMPAIGNS.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Offline-enabled hooks with fallback data
 */

export function useDashboardSummaryOffline() {
  return useOfflineQuery(
    queryKeys.dashboard.summary(),
    '/api/dashboard',
    {
      fallbackEndpoint: '/dashboard',
      staleTime: CACHE_CONFIG.DASHBOARD.staleTime,
      gcTime: CACHE_CONFIG.DASHBOARD.gcTime,
    }
  );
}

export function useAnalyticsSummaryOffline() {
  return useOfflineQuery(
    queryKeys.analytics.summary(),
    '/api/analytics/summary',
    {
      fallbackEndpoint: '/analytics/summary',
      staleTime: CACHE_CONFIG.ANALYTICS.staleTime,
      gcTime: CACHE_CONFIG.ANALYTICS.gcTime,
    }
  );
}

export function useProductsListOffline() {
  return useOfflineQuery(
    queryKeys.products.list(),
    '/api/products',
    {
      fallbackEndpoint: '/products',
      staleTime: CACHE_CONFIG.INVENTORY.staleTime,
      gcTime: CACHE_CONFIG.INVENTORY.gcTime,
    }
  );
}