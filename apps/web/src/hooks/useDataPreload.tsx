import { useEffect, useState } from 'react';
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { preloadAllData, warmBackendCache } from '@/services/dataPreloader';
import { axiosInstance } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { useDefenseMode } from '@/lib/defenseMode';

interface UseDataPreloadOptions {
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}

export interface PreloadState {
  isLoading: boolean;
  progress: number;
  totalItems: number;
  currentItem: string;
  error: unknown;
  isComplete: boolean;
}

const initialState: PreloadState = {
  isLoading: false,
  progress: 0,
  totalItems: 0,
  currentItem: '',
  error: null,
  isComplete: false,
};

export function useDataPreload(options: UseDataPreloadOptions = {}) {
  const { enabled = true, onComplete, onError } = options;
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const [state, setState] = useState<PreloadState>(initialState);

  useEffect(() => {
    if (!enabled || isRestoring || state.isComplete) return;

    let cancelled = false;

    async function runPreload() {
      setState((prev) => ({ ...prev, isLoading: true, progress: 0, error: null }));

      try {
        await warmBackendCache(axiosInstance);

        const result = await preloadAllData({
          queryClient,
          onProgress: (loaded, total) => {
            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                progress: total > 0 ? (loaded / total) * 100 : 0,
                totalItems: total,
                currentItem: `Loaded ${loaded}/${total}`,
              }));
            }
          },
        });

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            progress: 100,
            isComplete: true,
            error: result.failed.length > 0 ? result.errors : null,
          }));

          console.info('[Preload] Data preload complete:', result);
          onComplete?.();
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isComplete: true,
            error,
          }));

          console.error('[Preload] Preload error:', error);
          onError?.(error);
        }
      }
    }

    void runPreload();

    return () => {
      cancelled = true;
    };
  }, [enabled, isRestoring, queryClient, onComplete, onError, state.isComplete]);

  useEffect(() => {
    if (!enabled) {
      setState(initialState);
    }
  }, [enabled]);

  return state;
}

export function PreloadProgressOverlay() {
  const { user } = useAuth();
  const { defenseMode } = useDefenseMode();
  const preloadState = useDataPreload({ enabled: Boolean(user && defenseMode) });

  if (!preloadState.isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-8">
        <h2 className="mb-4 text-xl font-semibold">Loading application data…</h2>

        <div className="space-y-4">
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${preloadState.progress}%` }}
            />
          </div>

          <p className="text-center text-sm text-gray-600">{preloadState.currentItem}</p>

          <p className="text-center text-lg font-semibold">{Math.round(preloadState.progress)}%</p>
        </div>

        {preloadState.error ? (
          <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">
            Some data failed to load; the app will use cached data where available.
          </div>
        ) : null}
      </div>
    </div>
  );
}
