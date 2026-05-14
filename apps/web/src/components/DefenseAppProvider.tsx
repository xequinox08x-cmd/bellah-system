import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { defenseQueryClient } from './lib/queryClient';
import { setupCachePersistence } from './lib/cachePersistence';
import { PreloadProgressOverlay } from './hooks/useDataPreload';

/**
 * DEFENSE MODE: App Initialization
 * 
 * Sets up all caching, persistence, and defense features
 * This replaces the standard QueryClientProvider setup
 */

interface DefenseAppProviderProps {
  children: React.ReactNode;
}

// Initialize persistence on module load
setupCachePersistence(defenseQueryClient).catch(err => {
  console.error('[Defense] Failed to setup cache persistence:', err);
});

/**
 * Wrapper component that provides React Query with defense mode optimizations
 */
export function DefenseAppProvider({ children }: DefenseAppProviderProps) {
  return (
    <QueryClientProvider client={defenseQueryClient}>
      {/* Show preload progress */}
      <PreloadProgressOverlay />

      {/* Main app content */}
      {children}

      {/* Optional: Add DevTools in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtoolsProduction />}
    </QueryClientProvider>
  );
}

/**
 * React Query Devtools (optional, for debugging cache issues)
 */
function ReactQueryDevtoolsProduction() {
  const [showDevtools, setShowDevtools] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'R' && e.ctrlKey) {
        setShowDevtools(prev => !prev);
      }
    });
  }, []);

  if (!showDevtools) return null;

  return (
    <React.Suspense fallback={null}>
      <React.lazy(() =>
        import('@tanstack/react-query-devtools/build/modern/production.js').then(
          d => ({
            default: d.ReactQueryDevtools,
          })
        )
      }
      />
    </React.Suspense>
  );
}