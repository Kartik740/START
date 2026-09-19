import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sessionStorageManager,
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  ActiveSessionState,
} from '../sessionStorage.ts';
import { WorkSlot } from '../../../types/models.ts';

// Setup mock localStorage and window dispatch
const mockStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => {
    mockStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    for (const key in mockStore) delete mockStore[key];
  },
  length: 0,
  key: () => null,
};

if (typeof window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    dispatchEvent: vi.fn(),
  };
} else {
  vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
}

const mockSlot: WorkSlot = {
  id: 'slot-123',
  date: '2026-09-19',
  startTime: '09:00',
  endTime: '09:25',
  taskTitle: 'Write unit tests',
  desiredOutput: '3 passing test suites',
  firstPhysicalAction: 'Open terminal and run vitest',
  estimatedDurationMinutes: 25,
  status: 'planned',
};

describe('Session Storage Manager & Timer Math', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts a new focus session and writes to storage', () => {
    const session = sessionStorageManager.startSession(mockSlot, 25);
    expect(session.slot.id).toBe('slot-123');
    expect(session.targetDurationMinutes).toBe(25);
    expect(session.isPaused).toBe(false);
    expect(session.pausedIntervals).toHaveLength(0);

    const retrieved = sessionStorageManager.getActiveSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.slot.taskTitle).toBe('Write unit tests');
  });

  it('correctly records paused and resumed intervals', () => {
    sessionStorageManager.startSession(mockSlot, 25);

    const paused = sessionStorageManager.pauseSession();
    expect(paused?.isPaused).toBe(true);
    expect(paused?.pausedIntervals).toHaveLength(1);
    expect(paused?.pausedIntervals[0].pausedAt).toBeDefined();
    expect(paused?.pausedIntervals[0].resumedAt).toBeUndefined();

    const resumed = sessionStorageManager.resumeSession();
    expect(resumed?.isPaused).toBe(false);
    expect(resumed?.pausedIntervals[0].resumedAt).toBeDefined();
  });

  it('computes elapsed and remaining seconds accurately with pauses', () => {
    const startTime = new Date('2026-09-19T10:00:00Z');
    const pauseTime = new Date('2026-09-19T10:05:00Z');
    const resumeTime = new Date('2026-09-19T10:07:00Z');
    const checkTime = new Date('2026-09-19T10:15:00Z');

    const state: ActiveSessionState = {
      slot: mockSlot,
      startedAt: startTime.toISOString(),
      targetDurationMinutes: 25,
      isPaused: false,
      pausedIntervals: [
        {
          pausedAt: pauseTime.toISOString(),
          resumedAt: resumeTime.toISOString(),
        },
      ],
      distractions: [],
      wasRecoverySession: false,
    };

    // Total elapsed wall time: 15 minutes = 900 seconds.
    // Paused duration: 2 minutes = 120 seconds.
    // Active elapsed seconds: 900 - 120 = 780 seconds (13 minutes).
    const elapsed = calculateElapsedSeconds(state, checkTime.getTime());
    expect(elapsed).toBe(780);

    // Remaining seconds: 25 minutes (1500s) - 780s = 720s (12 minutes).
    const remaining = calculateRemainingSeconds(state, checkTime.getTime());
    expect(remaining).toBe(720);
  });

  it('clears active session upon termination', () => {
    sessionStorageManager.startSession(mockSlot, 25);
    expect(sessionStorageManager.getActiveSession()).not.toBeNull();

    sessionStorageManager.clearActiveSession();
    expect(sessionStorageManager.getActiveSession()).toBeNull();
  });

  it('switches to recovery mode with 10 minute allocation', () => {
    const recovery = sessionStorageManager.switchToRecovery(
      mockSlot,
      'Read problem statement for 2 minutes'
    );
    expect(recovery.wasRecoverySession).toBe(true);
    expect(recovery.targetDurationMinutes).toBe(10);
    expect(recovery.slot.firstPhysicalAction).toBe('Read problem statement for 2 minutes');
  });
});
