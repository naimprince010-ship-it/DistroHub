import { useOffline } from '@/contexts/OfflineContext';
import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingSyncCount, syncData, isSyncing } = useOffline();

  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 mb-2">
          <WifiOff className="w-5 h-5" />
          <span className="font-medium">Offline Mode</span>
        </div>
      )}
      
      {pendingSyncCount > 0 && (
        <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          <span className="font-medium">{pendingSyncCount} pending sync</span>
          {isOnline && (
            <button
              onClick={syncData}
              disabled={isSyncing}
              className="ml-2 p-1 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function OnlineStatusBadge() {
  const { isOnline } = useOffline();

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isOnline 
        ? 'bg-green-100 text-green-700' 
        : 'bg-amber-100 text-amber-700'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
