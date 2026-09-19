/**
 * Notification Service for START PWA
 * Provides minimal, anti-spam behavioral alerts with permission lifecycle management
 * and service worker delivery.
 */

import { storage } from '../lib/storage.ts';
import { getServiceWorkerRegistration } from './serviceWorkerManager.ts';
import { sound } from '../utils/sound.ts';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface DispatchNotificationOptions {
  title: string;
  body: string;
  tag: string;
  url?: string;
  category?: 'upcomingSlot' | 'nextActionReady' | 'missedSlotRecovery' | 'nightReview' | 'sessionComplete';
}

const NOTIFIED_CACHE_KEY = 'start_dispatched_notification_tags';

function getDispatchedTags(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function recordDispatchedTag(tag: string): void {
  try {
    const tags = getDispatchedTags();
    tags.add(tag);
    // Keep set bounded to last 100 tags
    const arr = Array.from(tags).slice(-100);
    sessionStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage issues
  }
}

export const notificationService = {
  /**
   * Checks current permission status without prompting.
   */
  getPermissionStatus(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Requests permission explicitly through user gesture.
   */
  async requestPermission(): Promise<NotificationPermissionState> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      // Sync with settings if granted
      if (result === 'granted') {
        storage.saveSettings({ notificationsEnabled: true });
      }
      return result;
    } catch (err) {
      console.warn('[START Notifications] Error requesting permission:', err);
      return Notification.permission;
    }
  },

  /**
   * Dispatches a minimal behavioral notification if permitted and category enabled.
   */
  async notify(options: DispatchNotificationOptions): Promise<boolean> {
    const perm = this.getPermissionStatus();
    if (perm !== 'granted') {
      return false;
    }

    const settings = storage.getSettings();
    if (!settings.notificationsEnabled) {
      return false;
    }

    // Check individual category setting if specified
    if (options.category && options.category !== 'sessionComplete') {
      const categoryAllowed = settings.notificationCategories[options.category];
      if (categoryAllowed === false) {
        return false;
      }
    }

    // Deduplication check: prevent spamming the same event twice
    const dispatched = getDispatchedTags();
    if (dispatched.has(options.tag)) {
      return false;
    }

    recordDispatchedTag(options.tag);

    // Optional audio feedback
    if (settings.soundEnabled) {
      sound.playStartChime(true);
    }

    const notificationPayload: NotificationOptions = {
      body: options.body,
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      tag: options.tag,
      data: { url: options.url || '/today' },
      // vibrate pattern: short subtle buzz
      // @ts-expect-error standard NotificationOptions on mobile
      vibrate: [100, 50, 100],
    };

    try {
      // 1. Try Service Worker delivery (preferred for PWAs)
      const sw = getServiceWorkerRegistration();
      if (sw && 'showNotification' in sw) {
        await sw.showNotification(options.title, notificationPayload);
        return true;
      }

      // 2. Fallback to standard window Notification
      if ('Notification' in window) {
        const instance = new Notification(options.title, notificationPayload);
        instance.onclick = () => {
          instance.close();
          window.focus();
          if (options.url) {
            window.location.href = options.url;
          }
        };
        return true;
      }
    } catch (err) {
      console.warn('[START Notifications] Failed to dispatch notification:', err);
    }

    return false;
  },

  /**
   * Helper to send an instant test notification for settings verification
   */
  async sendTestNotification(): Promise<boolean> {
    return this.notify({
      title: 'START Notification System',
      body: 'Operational test passed: Alerts are active and configured without motivational spam.',
      tag: `test_notification_${Date.now()}`,
      url: '/today',
      category: 'sessionComplete',
    });
  },
};
