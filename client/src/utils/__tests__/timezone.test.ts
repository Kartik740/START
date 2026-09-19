import { describe, it, expect } from 'vitest';
import {
  getDetectedTimezone,
  formatOffsetString,
  getTimezoneInfo,
  parseSlotTimeInTimezone,
  getMinutesUntilSlot,
  COMMON_TIMEZONES,
} from '../timezone.ts';

describe('Timezone & Scheduling Utilities', () => {
  it('detects a valid IANA timezone name', () => {
    const tz = getDetectedTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(1);
    expect(tz).toContain('/');
  });

  it('formats timezone offset string correctly (e.g. UTC+05:30 or UTC-04:00)', () => {
    expect(formatOffsetString(330)).toBe('UTC+05:30');
    expect(formatOffsetString(-240)).toBe('UTC-04:00');
    expect(formatOffsetString(0)).toBe('UTC+00:00');
  });

  it('inspects timezone info including offset, label, and DST detection', () => {
    const info = getTimezoneInfo('Asia/Kolkata');
    expect(info.timeZone).toBe('Asia/Kolkata');
    expect(info.offsetMinutes).toBe(330);
    expect(info.offsetString).toBe('UTC+05:30');
    expect(info.isDstActive).toBe(false);
    expect(info.formattedLabel).toContain('Asia/Kolkata');
  });

  it('correctly handles UTC timezone info', () => {
    const utc = getTimezoneInfo('UTC');
    expect(utc.timeZone).toBe('UTC');
    expect(utc.offsetMinutes).toBe(0);
    expect(utc.offsetString).toBe('UTC+00:00');
  });

  it('parses slot date and time into a Date object', () => {
    const parsed = parseSlotTimeInTimezone('2026-09-19', '14:30');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // 0-indexed September
    expect(parsed.getDate()).toBe(19);
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('calculates minutes until an upcoming work slot accurately', () => {
    const referenceNow = new Date('2026-09-19T10:00:00');
    // Slot at 10:15 is 15 minutes away
    const mins = getMinutesUntilSlot('2026-09-19', '10:15', referenceNow);
    expect(mins).toBe(15);

    // Slot at 09:30 is 30 minutes in the past
    const pastMins = getMinutesUntilSlot('2026-09-19', '09:30', referenceNow);
    expect(pastMins).toBe(-30);
  });

  it('includes common global and local timezones with labels', () => {
    expect(COMMON_TIMEZONES.length).toBeGreaterThan(5);
    const kolkata = COMMON_TIMEZONES.find((t) => t.value === 'Asia/Kolkata');
    expect(kolkata).toBeDefined();
    expect(kolkata?.region).toBe('Asia');
  });
});
