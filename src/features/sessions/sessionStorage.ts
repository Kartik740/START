import { WorkSlot, DistractionUrge } from '../../types/models.ts';

export interface PausedInterval {
  pausedAt: string; // ISO
  resumedAt?: string; // ISO
}

export interface ActiveSessionState {
  slot: WorkSlot;
  startedAt: string; // ISO timestamp
  targetDurationMinutes: number;
  pausedIntervals: PausedInterval[];
  isPaused: boolean;
  distractions: DistractionUrge[];
  wasRecoverySession: boolean;
}

const STORAGE_KEY = 'start_active_session';

export const sessionStorageManager = {
  getActiveSession(): ActiveSessionState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveActiveSession(state: ActiveSessionState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('storage'));
  },

  clearActiveSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  },

  startSession(
    slot: WorkSlot,
    durationOverride?: number,
    wasRecovery: boolean = false
  ): ActiveSessionState {
    const state: ActiveSessionState = {
      slot,
      startedAt: new Date().toISOString(),
      targetDurationMinutes: durationOverride || slot.estimatedDurationMinutes || 25,
      pausedIntervals: [],
      isPaused: false,
      distractions: [],
      wasRecoverySession: wasRecovery,
    };
    this.saveActiveSession(state);
    return state;
  },

  pauseSession(): ActiveSessionState | null {
    const current = this.getActiveSession();
    if (!current || current.isPaused) return current;

    const updated: ActiveSessionState = {
      ...current,
      isPaused: true,
      pausedIntervals: [
        ...current.pausedIntervals,
        { pausedAt: new Date().toISOString() },
      ],
    };
    this.saveActiveSession(updated);
    return updated;
  },

  resumeSession(): ActiveSessionState | null {
    const current = this.getActiveSession();
    if (!current || !current.isPaused) return current;

    const intervals = [...current.pausedIntervals];
    const lastIdx = intervals.length - 1;
    if (lastIdx >= 0 && !intervals[lastIdx].resumedAt) {
      intervals[lastIdx] = {
        ...intervals[lastIdx],
        resumedAt: new Date().toISOString(),
      };
    }

    const updated: ActiveSessionState = {
      ...current,
      isPaused: false,
      pausedIntervals: intervals,
    };
    this.saveActiveSession(updated);
    return updated;
  },

  addDistraction(urge: DistractionUrge): ActiveSessionState | null {
    const current = this.getActiveSession();
    if (!current) return null;

    const updated: ActiveSessionState = {
      ...current,
      distractions: [urge, ...current.distractions],
    };
    this.saveActiveSession(updated);
    return updated;
  },

  switchToRecovery(slot: WorkSlot, rescueAction: string): ActiveSessionState {
    const updatedSlot: WorkSlot = {
      ...slot,
      firstPhysicalAction: rescueAction,
      estimatedDurationMinutes: 10,
    };
    return this.startSession(updatedSlot, 10, true);
  },
};

/**
 * Calculates wall-clock elapsed duration in seconds.
 * Robust against browser refresh, tab switching, and OS sleep.
 */
export function calculateElapsedSeconds(
  state: ActiveSessionState,
  nowMs: number = Date.now()
): number {
  const startMs = new Date(state.startedAt).getTime();
  let pausedMs = 0;

  for (const interval of state.pausedIntervals) {
    const pStart = new Date(interval.pausedAt).getTime();
    const pEnd = interval.resumedAt ? new Date(interval.resumedAt).getTime() : nowMs;
    pausedMs += Math.max(0, pEnd - pStart);
  }

  const effectiveElapsedMs = Math.max(0, nowMs - startMs - pausedMs);
  return Math.floor(effectiveElapsedMs / 1000);
}

/**
 * Calculates remaining seconds in the session countdown.
 */
export function calculateRemainingSeconds(
  state: ActiveSessionState,
  nowMs: number = Date.now()
): number {
  const targetSeconds = state.targetDurationMinutes * 60;
  const elapsed = calculateElapsedSeconds(state, nowMs);
  return Math.max(0, targetSeconds - elapsed);
}
