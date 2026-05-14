import { useEffect, useState } from 'react';

type NetworkInformation = EventTarget & {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
};

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/**
 * Browser online/offline plus coarse "slow" hint from Network Information API when available.
 */
export function useConnectionStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [effectiveType, setEffectiveType] = useState<string | undefined>(() =>
    getConnection()?.effectiveType
  );

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setEffectiveType(getConnection()?.effectiveType);
    };

    const onConnChange = () => sync();

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    getConnection()?.addEventListener('change', onConnChange);
    sync();

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      getConnection()?.removeEventListener('change', onConnChange);
    };
  }, []);

  const conn = getConnection();
  const slow =
    online &&
    (effectiveType === 'slow-2g' ||
      effectiveType === '2g' ||
      (typeof conn?.downlink === 'number' && conn.downlink < 0.5));

  return {
    online,
    offline: !online,
    slow,
    effectiveType,
  };
}
