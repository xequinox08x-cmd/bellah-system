import React, { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { defenseQueryClient } from '../lib/queryClient';
import { indexedDbQueryPersister, exposeCacheDebug } from '../lib/cachePersistence';
import { getPersistCacheBuster } from '../lib/persistentStorage/cacheMeta';
import { registerBackgroundQuerySync } from '../lib/backgroundSync';
import { DefenseModeProvider } from '../lib/defenseMode';
import { PreloadProgressOverlay } from '../hooks/useDataPreload';
import { OfflineCachedIndicator } from './OfflineCachedIndicator';

const RQ_PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

interface DefenseAppProviderProps {
  children: React.ReactNode;
}

export function DefenseAppProvider({ children }: DefenseAppProviderProps) {
  useEffect(() => {
    exposeCacheDebug(defenseQueryClient);
    return registerBackgroundQuerySync(defenseQueryClient);
  }, []);

  return (
    <PersistQueryClientProvider
      client={defenseQueryClient}
      persistOptions={{
        persister: indexedDbQueryPersister,
        buster: getPersistCacheBuster(),
        maxAge: RQ_PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' &&
            (query.meta as { persist?: boolean } | undefined)?.persist !== false,
        },
      }}
    >
      <DefenseModeProvider>
        <OfflineCachedIndicator />
        <PreloadProgressOverlay />
        {children}
      </DefenseModeProvider>
    </PersistQueryClientProvider>
  );
}
