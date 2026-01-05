import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getUnsyncedCount, getPendingSync, clearPendingSync } from '@/lib/offlineDb';

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
      const pendingItems = await getPendingSync();
      
      for (const item of pendingItems) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 
            (import.meta.env.DEV ? 'http://localhost:8000' : 'https://distrohub-backend.onrender.com');
          let endpoint = '';
          let method = 'POST';

          switch (item.entity) {
            case 'products':
              endpoint = '/api/products';
              break;
            case 'retailers':
              endpoint = '/api/retailers';
              break;
            case 'sales':
              endpoint = '/api/sales';
              break;
          }

          if (item.type === 'update') {
            method = 'PUT';
            endpoint += `/${(item.data as { id: string }).id}`;
          } else if (item.type === 'delete') {
            method = 'DELETE';
            endpoint += `/${(item.data as { id: string }).id}`;
          }

          const response = await fetch(`${baseUrl}${endpoint}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined,
          });

          if (response.ok) {
            await clearPendingSync(item.id);
          }
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
        }
      }

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
