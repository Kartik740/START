import { format, parseISO, differenceInCalendarDays, isPast, isToday, addDays, addMinutes } from 'date-fns';

/**
 * Formats an ISO date string or Date object into human-readable date.
 * e.g., "Mon, Sep 21"
 */
export function formatDisplayDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return format(date, 'EEE, MMM d');
}

/**
 * Formats time string or Date into 12-hour format "h:mm a"
 */
export function formatDisplayTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return format(date, 'h:mm a');
}

/**
 * Returns today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Calculates deadline buffer in whole days.
 * Positive number = days remaining before deadline.
 * Negative number = past deadline.
 */
export function calculateDeadlineBuffer(deadlineIso: string): {
  daysRemaining: number;
  label: string;
  isUrgent: boolean;
  isPastDue: boolean;
} {
  const deadline = parseISO(deadlineIso);
  const now = new Date();
  const days = differenceInCalendarDays(deadline, now);

  const isPastDue = isPast(deadline) && !isToday(deadline);
  const isUrgent = days <= 3 && days >= 0;

  let label: string;
  if (isPastDue) {
    label = `${Math.abs(days)}d overdue`;
  } else if (days === 0) {
    label = 'Due today';
  } else if (days === 1) {
    label = 'Due tomorrow';
  } else {
    label = `${days} days buffer`;
  }

  return {
    daysRemaining: days,
    label,
    isUrgent,
    isPastDue,
  };
}

/**
 * Formats seconds into MM:SS format for focus timers
 */
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export { format, parseISO, isToday, addDays, addMinutes };
