import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys, CACHE_CONFIG } from '@/lib/queryClient';
import { useOfflineQuery } from './useOfflineQuery';

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => api.getDashboardSummary(),
    staleTime: CACHE_CONFIG.DASHBOARD.staleTime,
    gcTime: CACHE_CONFIG.DASHBOARD.gcTime,
    retry: 2,
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.analytics.summary(),
    queryFn: () => api.getAnalyticsSummary(),
    staleTime: CACHE_CONFIG.ANALYTICS.staleTime,
    gcTime: CACHE_CONFIG.ANALYTICS.gcTime,
    retry: 2,
  });
}

export function useAnalyticsTrend() {
  return useQuery({
    queryKey: queryKeys.analytics.trend(),
    queryFn: () => api.getAnalyticsTrend(),
    staleTime: CACHE_CONFIG.ANALYTICS.staleTime,
    gcTime: CACHE_CONFIG.ANALYTICS.gcTime,
    retry: 2,
  });
}

export function useProductsList() {
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => api.getProducts(),
    staleTime: CACHE_CONFIG.INVENTORY.staleTime,
    gcTime: CACHE_CONFIG.INVENTORY.gcTime,
    retry: 2,
  });
}

export function useSalesSummary() {
  return useQuery({
    queryKey: queryKeys.sales.list(),
    queryFn: () => api.getSales(),
    staleTime: CACHE_CONFIG.SALES.staleTime,
    gcTime: CACHE_CONFIG.SALES.gcTime,
    retry: 2,
  });
}

export function useAiContent(status?: string) {
  return useQuery({
    queryKey: queryKeys.aiContent.list(status),
    queryFn: () => api.getContent(status, 1),
    staleTime: CACHE_CONFIG.AI_CONTENT.staleTime,
    gcTime: CACHE_CONFIG.AI_CONTENT.gcTime,
    retry: 2,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: async () => {
      const res = await api.getCampaigns();
      if (res.error) throw new Error(String(res.error));
      return res.data;
    },
    staleTime: CACHE_CONFIG.CAMPAIGNS.staleTime,
    gcTime: CACHE_CONFIG.CAMPAIGNS.gcTime,
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
