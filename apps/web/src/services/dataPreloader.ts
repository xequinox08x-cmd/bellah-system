import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

type ApiClient = {
  post: (endpoint: string, body?: unknown, options?: { timeout?: number }) => Promise<{ data: unknown }>;
};

export interface PreloadConfig {
  queryClient: QueryClient;
  onProgress?: (loaded: number, total: number) => void;
}

type PreloadTask = { name: string; key: readonly unknown[]; run: () => Promise<unknown> };

const PRELOAD_TASKS: PreloadTask[] = [
  {
    name: 'Dashboard summary',
    key: queryKeys.dashboard.summary(),
    run: () => api.getDashboardSummary(),
  },
  {
    name: 'Analytics summary',
    key: queryKeys.analytics.summary(),
    run: () => api.getAnalyticsSummary(),
  },
  {
    name: 'Analytics trend',
    key: queryKeys.analytics.trend(),
    run: () => api.getAnalyticsTrend(),
  },
  {
    name: 'Products',
    key: queryKeys.products.list(),
    run: () => api.getProducts(),
  },
  {
    name: 'Sales',
    key: queryKeys.sales.list(),
    run: () => api.getSales(),
  },
  {
    name: 'AI content (all)',
    key: queryKeys.aiContent.list(),
    run: () => api.getContent(undefined, 1),
  },
  {
    name: 'AI content (approved)',
    key: queryKeys.aiContent.list('approved'),
    run: () => api.getContent('approved', 1),
  },
  {
    name: 'Campaigns',
    key: queryKeys.campaigns.list(),
    run: async () => {
      const res = await api.getCampaigns();
      if (res.error) throw new Error(String(res.error));
      return res.data;
    },
  },
  {
    name: 'Scheduled posts',
    key: queryKeys.scheduledPosts.list(),
    run: () => api.getScheduledPosts(),
  },
];

/**
 * Parallel preload into the React Query cache (works with IndexedDB persist).
 */
export async function preloadAllData(config: PreloadConfig): Promise<PreloadResult> {
  const { queryClient, onProgress } = config;
  const startTime = Date.now();
  const total = PRELOAD_TASKS.length;
  const result: PreloadResult = {
    loaded: 0,
    total,
    failed: [],
    errors: [],
    duration: 0,
  };

  let completed = 0;
  const bump = () => {
    completed += 1;
    onProgress?.(completed, total);
  };

  await Promise.allSettled(
    PRELOAD_TASKS.map(async (task) => {
      try {
        const data = await task.run();
        queryClient.setQueryData(task.key, data);
        result.loaded += 1;
        bump();
      } catch (error) {
        console.warn(`[Preloader] ${task.name} failed:`, error);
        result.failed.push(task.name);
        result.errors.push({
          query: task.name,
          error: error instanceof Error ? error.message : String(error),
        });
        bump();
      }
    })
  );

  result.duration = Date.now() - startTime;
  return result;
}

export async function warmBackendCache(apiClient: ApiClient): Promise<void> {
  try {
    await apiClient.post('/api/cache/warm');
  } catch (error) {
    console.warn('[Preloader] Backend cache warm skipped:', error);
  }
}

export interface PreloadResult {
  loaded: number;
  total: number;
  failed: string[];
  errors: Array<{ query: string; error: string }>;
  duration: number;
}
