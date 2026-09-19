import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs py-1.5 px-4 flex items-center justify-center gap-2 animate-in fade-in select-none">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Connection restored · Synchronized with local state</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/25 text-amber-300 text-xs py-1.5 px-4 flex items-center justify-center gap-2 animate-in fade-in select-none">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline Mode · Local focus timers, rules, and work sessions remain fully functional.</span>
    </div>
  );
};
