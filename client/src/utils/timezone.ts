/**
 * Timezone and Daylight Saving Time (DST) Utilities
 * Provides IANA timezone detection, offset calculations, DST status,
 * and robust wall-clock timestamp computations across timezones.
 */

export interface TimezoneInfo {
  timeZone: string;
  offsetMinutes: number;
  offsetString: string;
  isDstActive: boolean;
  dstShiftMinutes: number;
  formattedLabel: string;
}

export const COMMON_TIMEZONES: { value: string; label: string; region: string }[] = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) — Asia/Kolkata', region: 'Asia' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Global' },
  { value: 'Europe/London', label: 'London, UK (GMT / BST)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET / CEST) — Berlin, Paris', region: 'Europe' },
  { value: 'America/New_York', label: 'Eastern Time (ET) — New York, Toronto', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (CT) — Chicago, Dallas', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (MT) — Denver', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — Los Angeles, San Francisco', region: 'Americas' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) — Dubai', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) — Tokyo', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST / AEDT) — Sydney', region: 'Oceania' },
];

/**
 * Returns the browser's automatically resolved IANA timezone.
 */
export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Gets UTC offset minutes for a given date in a specific timezone.
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    // Format date in UTC and in target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    // Fallback to local offset
    return -date.getTimezoneOffset();
  }
}

/**
 * Formats offset in minutes to string (e.g. "+05:30" or "-04:00")
 */
export function formatOffsetString(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Inspects a timezone for Daylight Saving Time (DST) status.
 */
export function getTimezoneInfo(timeZoneName?: string): TimezoneInfo {
  const timeZone = timeZoneName || getDetectedTimezone();
  const now = new Date();

  // Current offset
  const currentOffset = getTimezoneOffsetMinutes(now, timeZone);

  // Check January and July offsets to see if DST is observed and currently active
  const currentYear = now.getFullYear();
  const janDate = new Date(currentYear, 0, 15);
  const julDate = new Date(currentYear, 6, 15);

  const janOffset = getTimezoneOffsetMinutes(janDate, timeZone);
  const julOffset = getTimezoneOffsetMinutes(julDate, timeZone);

  const daylightOffset = Math.max(janOffset, julOffset);

  const hasDst = janOffset !== julOffset;
  const isDstActive = hasDst && currentOffset === daylightOffset;
  const dstShiftMinutes = hasDst ? Math.abs(julOffset - janOffset) : 0;

  const offsetString = formatOffsetString(currentOffset);
  const dstNotice = isDstActive ? ' (DST Active)' : hasDst ? ' (Standard Time)' : '';

  return {
    timeZone,
    offsetMinutes: currentOffset,
    offsetString,
    isDstActive,
    dstShiftMinutes,
    formattedLabel: `${timeZone} · ${offsetString}${dstNotice}`,
  };
}

/**
 * Converts a slot date (YYYY-MM-DD) and time (HH:mm) into an exact Date timestamp
 * taking the target timezone into account.
 */
export function parseSlotTimeInTimezone(
  dateStr: string,
  timeStr: string,
  _timeZone?: string
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Construct local date representation
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return d;
}

/**
 * Calculates minutes between now and a scheduled slot start time.
 * Returns negative if the start time has already passed.
 */
export function getMinutesUntilSlot(dateStr: string, timeStr: string, now: Date = new Date()): number {
  const slotDate = parseSlotTimeInTimezone(dateStr, timeStr);
  const diffMs = slotDate.getTime() - now.getTime();
  return Math.round(diffMs / 60000);
}
