import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getUnsyncedCount } from '@/lib/offlineDb';
import { runOfflineSync } from '@/lib/offlineSync';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  syncData: () => Promise<void>;
  isSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updatePendingCount = useCallback(async () => {
    const count = await getUnsyncedCount();
    setPendingSyncCount(count);
  }, []);

  const syncData = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      await runOfflineSync();
      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();
    const interval = window.setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, [syncData, updatePendingCount]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSyncCount, syncData, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
