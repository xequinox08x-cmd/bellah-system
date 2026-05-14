import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { preloadAllData, warmBackendCache } from '@/services/dataPreloader';
import { axiosInstance } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import { useDefenseMode } from '@/lib/defenseMode';

/**
 * DEFENSE MODE: Data Preload Hook
 * 
 * Manages data preloading on app startup
 * Shows loading progress to user
 */

interface UseDataPreloadOptions {
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export interface PreloadState {
  isLoading: boolean;
  progress: number;
  totalItems: number;
  currentItem: string;
  error: any;
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
  const [state, setState] = useState<PreloadState>(initialState);

  useEffect(() => {
    if (!enabled || state.isComplete) return;

    let cancelled = false;

    async function runPreload() {
      setState(prev => ({ ...prev, isLoading: true, progress: 0 }));

      try {
        // Warm backend cache first
        await warmBackendCache(axiosInstance);

        // Preload all data
        const result = await preloadAllData({
          queryClient,
          api: axiosInstance,
          onProgress: (loaded, total) => {
            if (!cancelled) {
              setState(prev => ({
                ...prev,
                progress: (loaded / total) * 100,
                totalItems: total,
                currentItem: `Loaded ${loaded}/${total}`,
              }));
            }
          },
        });

        if (!cancelled) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            progress: 100,
            isComplete: true,
            error: result.failed.length > 0 ? result.errors : null,
          }));

          console.info('[Preload] ✅ Data preload complete:', result);
          onComplete?.();
        }
      } catch (error) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error,
            isComplete: true,
          }));

          console.error('[Preload] ❌ Preload error:', error);
          onError?.(error);
        }
      }
    }

    runPreload();

    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient, onComplete, onError, state.isComplete]);

  return state;
}

/**
 * Component that shows preload progress
 */
export function PreloadProgressOverlay() {
  const { user } = useAuth();
  const { defenseMode } = useDefenseMode();
  const preloadState = useDataPreload({ enabled: Boolean(user && defenseMode) });

  if (!preloadState.isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Loading Application Data...</h2>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${preloadState.progress}%` }}
            />
          </div>

          {/* Progress text */}
          <p className="text-sm text-gray-600 text-center">
            {preloadState.currentItem}
          </p>

          {/* Percentage */}
          <p className="text-center text-lg font-semibold">
            {Math.round(preloadState.progress)}%
          </p>
        </div>

        {/* Error state */}
        {preloadState.error && (
          <div className="mt-4 p-3 bg-red-50 text-red-800 rounded text-sm">
            Some data failed to load, but the app will use cached data.
          </div>
        )}
      </div>
    </div>
  );
}
