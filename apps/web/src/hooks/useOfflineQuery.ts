import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getFallbackData, shouldUseFallback } from '@/data/fallbackData';
import { axiosInstance } from '@/lib/api';

/**
 * DEFENSE MODE: Offline Query Hook
 * 
 * Enhanced useQuery that gracefully falls back to:
 * 1. React Query cache
 * 2. localStorage
 * 3. Fallback mock data
 */

interface UseOfflineQueryOptions<TData> extends UseQueryOptions<TData> {
  fallbackEndpoint?: string; // Endpoint to get fallback data
  enableOffline?: boolean;   // Enable fallback mode
}

export function useOfflineQuery<TData = any>(
  key: any,
  endpoint: string,
  options: UseOfflineQueryOptions<TData> = {}
) {
  const { fallbackEndpoint, enableOffline = true, ...queryOptions } = options;
  const [isOffline, setIsOffline] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // Monitor network status
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Main query
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(endpoint);
        return response.data;
      } catch (error) {
        // Check if we should use fallback
        if (enableOffline && shouldUseFallback(error)) {
          console.warn(`[OfflineQuery] Using fallback data for ${endpoint}`);
          setIsFallback(true);
          const fallback = getFallbackData(fallbackEndpoint || endpoint);
          if (fallback.data) return fallback;
          throw error;
        }
        throw error;
      }
    },
    ...queryOptions,
  } as UseQueryOptions<TData>);

  // Return enhanced result
  return {
    ...query,
    isOffline,
    isFallback,
    isUsingFallback: isFallback,
  };
}

/**
 * Hook to manually trigger fallback
 */
export function useFallbackData(endpoint: string) {
  return getFallbackData(endpoint);
}

/**
 * Hook to check network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

/**
 * Simulate network conditions for testing (debug mode)
 */
export function useNetworkSimulation() {
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Expose for debugging
      (window as any).__networkDebug = {
        goOffline: () => setSimulatedOffline(true),
        goOnline: () => setSimulatedOffline(false),
        isOffline: simulatedOffline,
      };
    }
  }, [simulatedOffline]);

  return simulatedOffline;
}