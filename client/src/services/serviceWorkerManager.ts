/**
 * Service Worker Manager for START PWA
 * Handles registration, update monitoring, and offline status
 */

export interface SwStatus {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<SwStatus> {
  if (!('serviceWorker' in navigator)) {
    return { isSupported: false, isRegistered: false, registration: null };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[START PWA] New update available.');
          }
        });
      }
    });

    return {
      isSupported: true,
      isRegistered: true,
      registration,
    };
  } catch (error) {
    console.warn('[START PWA] Service worker registration failed:', error);
    return {
      isSupported: true,
      isRegistered: false,
      registration: null,
    };
  }
}

export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}
