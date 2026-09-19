import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader.tsx';
import { AppSidebar } from './AppSidebar.tsx';
import { MobileNav } from './MobileNav.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { OfflineBanner } from '../ui/OfflineBanner.tsx';
import { registerServiceWorker } from '../../services/serviceWorkerManager.ts';
import { startNotificationScheduler } from '../../services/notificationScheduler.ts';

export const AppShell: React.FC = () => {
  useEffect(() => {
    // Register PWA Service Worker
    registerServiceWorker();

    // Start background notification scheduler
    const cleanupScheduler = startNotificationScheduler();
    return () => {
      cleanupScheduler();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col surface-0 text-primary font-sans">
      <OfflineBanner />
      <AppHeader />
      <div className="flex-1 flex overflow-hidden">
        <AppSidebar />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <MobileNav />
    </div>
  );
};
