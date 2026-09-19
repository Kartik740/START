/**
 * Behavioral Notification Scheduler for START
 * Periodically monitors scheduled work slots, missed sessions, and night review
 * to trigger minimal, actionable notifications strictly when conditions are met.
 */

import { storage } from '../lib/storage.ts';
import { getTodayString } from '../utils/dates.ts';
import { getMinutesUntilSlot } from '../utils/timezone.ts';
import { notificationService } from './notificationService.ts';

let schedulerTimer: number | null = null;

export async function checkAndDispatchScheduledNotifications(): Promise<void> {
  const perm = notificationService.getPermissionStatus();
  if (perm !== 'granted') return;

  const settings = storage.getSettings();
  if (!settings.notificationsEnabled) return;

  const today = getTodayString();
  const now = new Date();
  const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();

  const slots = storage.getSlots().filter((s) => s.date === today);
  const reviews = storage.getReviews();
  const todayReviewDone = reviews.some((r) => r.date === today);

  for (const slot of slots) {
    if (!slot.startTime || !slot.endTime) continue;

    // 1. UPCOMING WORK-SLOT REMINDER (approx 10 minutes before start)
    if (slot.status === 'planned' && settings.notificationCategories.upcomingSlot) {
      const minutesUntil = getMinutesUntilSlot(slot.date, slot.startTime, now);
      // Window between 7 and 12 minutes before
      if (minutesUntil >= 8 && minutesUntil <= 12) {
        await notificationService.notify({
          title: 'Upcoming Work Slot',
          body: `Your ${slot.startTime} work slot starts in 10 minutes: "${slot.taskTitle}".`,
          tag: `upcoming_slot_${slot.id}`,
          url: '/today',
          category: 'upcomingSlot',
        });
      }
    }

    // 2. NEXT ACTION READY (0 to 3 minutes before slot starts or at start time)
    if (slot.status === 'planned' && settings.notificationCategories.nextActionReady) {
      const minutesUntil = getMinutesUntilSlot(slot.date, slot.startTime, now);
      if (minutesUntil >= -2 && minutesUntil <= 2 && slot.firstPhysicalAction) {
        await notificationService.notify({
          title: 'Next Action Ready',
          body: `Your next action is ready: "${slot.firstPhysicalAction}".`,
          tag: `next_action_ready_${slot.id}`,
          url: '/today',
          category: 'nextActionReady',
        });
      }
    }

    // 3. RECOVERY REMINDER AFTER A MISSED SLOT
    if (settings.notificationCategories.missedSlotRecovery) {
      const [endH, endM] = slot.endTime.split(':').map(Number);
      const slotEndTotal = endH * 60 + endM;
      // If slot ended within the last 30 minutes and was never completed
      if (
        slot.status !== 'completed' &&
        currentMinutesTotal >= slotEndTotal &&
        currentMinutesTotal <= slotEndTotal + 30
      ) {
        await notificationService.notify({
          title: 'Slot Recovery Available',
          body: 'You missed your planned slot. Start a 10-minute recovery?',
          tag: `missed_recovery_${slot.id}`,
          url: '/today',
          category: 'missedSlotRecovery',
        });
      }
    }
  }

  // 4. NIGHT REVIEW REMINDER
  if (settings.notificationCategories.nightReview && !todayReviewDone) {
    const reviewTime = settings.notificationCategories.nightReviewTime || '21:00';
    const [revH, revM] = reviewTime.split(':').map(Number);
    const targetRevTotal = revH * 60 + revM;

    // Window within 30 minutes after target time
    if (currentMinutesTotal >= targetRevTotal && currentMinutesTotal <= targetRevTotal + 30) {
      await notificationService.notify({
        title: 'Night Review is Ready',
        body: 'Night review is ready. Reflect on today and lock in tomorrow.',
        tag: `night_review_${today}`,
        url: '/review',
        category: 'nightReview',
      });
    }
  }
}

/**
 * Starts the global scheduler background heartbeat (ticks every 25 seconds).
 */
export function startNotificationScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  // Run initial check after 2 seconds
  setTimeout(() => {
    checkAndDispatchScheduledNotifications();
  }, 2000);

  // Periodic interval
  schedulerTimer = window.setInterval(() => {
    checkAndDispatchScheduledNotifications();
  }, 25000);

  return () => {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };
}
