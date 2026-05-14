import { WifiOff, Wifi, Gauge } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getLastBackgroundSyncAt } from '@/lib/persistentStorage/cacheMeta';

/**
 * Compact status strip for offline / slow network / cached-data context.
 */
export function OfflineCachedIndicator() {
  const { offline, slow, online } = useConnectionStatus();
  const lastSync = getLastBackgroundSyncAt();

  if (!offline && !slow) return null;

  const Icon = offline ? WifiOff : Gauge;
  const title = offline
    ? 'You are offline. Showing cached data from this device.'
    : 'Slow connection. Data may be from cache while updates load in the background.';

  return (
    <div
      role="status"
      title={title}
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex justify-center px-2 pt-2"
    >
      <div
        className={
          'mt-2 flex max-w-lg items-center gap-2 rounded-md border px-3 py-1.5 text-xs shadow-sm ' +
          (offline
            ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'
            : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100')
        }
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-medium">
          {offline ? 'Offline — cached data' : 'Slow network — cached first'}
        </span>
        {online && lastSync ? (
          <span className="hidden text-[10px] opacity-80 sm:inline">Last sync {lastSync.slice(0, 16)}</span>
        ) : null}
        {!offline ? <Wifi className="h-3 w-3 shrink-0 opacity-60" aria-hidden /> : null}
      </div>
    </div>
  );
}
