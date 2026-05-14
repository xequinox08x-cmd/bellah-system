import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { defenseQueryClient } from '../lib/queryClient';
import { setupCachePersistence } from '../lib/cachePersistence';
import { DefenseModeProvider } from '../lib/defenseMode';
import { PreloadProgressOverlay } from '../hooks/useDataPreload';

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
      <DefenseModeProvider>
        <PreloadProgressOverlay />
        {children}
      </DefenseModeProvider>
    </QueryClientProvider>
  );
}
