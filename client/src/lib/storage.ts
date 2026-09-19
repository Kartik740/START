import {
  WorkSlot,
  Assignment,
  DailyReview,
  WorkSession,
  DistractionUrge,
  ObservedPattern,
  SystemSettings,
  UserOnboardingProfile,
  OnboardingDraft,
  RulesState,
} from '../types/models.ts';
import { DEFAULT_SETTINGS } from './constants.ts';

const STORAGE_KEYS = {
  SLOTS: 'start_work_slots',
  ASSIGNMENTS: 'start_assignments',
  REVIEWS: 'start_daily_reviews',
  SESSIONS: 'start_work_sessions',
  DISTRACTIONS: 'start_distractions',
  PATTERNS: 'start_patterns',
  SETTINGS: 'start_system_settings',
  ONBOARDING: 'start_onboarding_profile',
  ONBOARDING_DRAFT: 'start_onboarding_draft',
  RULES_STATE: 'start_rules_state',
  PLANNER_PREFS: 'start_planner_preferences',
} as const;

type StorageListener = () => void;
const listeners = new Set<StorageListener>();

function notify() {
  listeners.forEach((l) => l());
}

export const storage = {
  subscribe(listener: StorageListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    notify();
    return updated;
  },

  // Onboarding
  getOnboardingProfile(): UserOnboardingProfile | null {
    const raw = localStorage.getItem(STORAGE_KEYS.ONBOARDING);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveOnboardingProfile(profile: UserOnboardingProfile): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(profile));
    this.saveSettings({ isOnboardingCompleted: true });
    this.clearOnboardingDraft();
    notify();
  },

  getOnboardingDraft(): OnboardingDraft | null {
    const raw = localStorage.getItem(STORAGE_KEYS.ONBOARDING_DRAFT);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveOnboardingDraft(draft: OnboardingDraft): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_DRAFT, JSON.stringify(draft));
  },

  clearOnboardingDraft(): void {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DRAFT);
  },

  isOnboardingCompleted(): boolean {
    const settings = this.getSettings();
    if (settings.isOnboardingCompleted) return true;
    return Boolean(this.getOnboardingProfile());
  },

  getSlots(): WorkSlot[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSlots(slots: WorkSlot[]) {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    notify();
  },

  getAssignments(): Assignment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveAssignments(assignments: Assignment[]) {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    notify();
  },

  getReviews(): DailyReview[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveReviews(reviews: DailyReview[]) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    notify();
  },

  getSessions(): WorkSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSessions(sessions: WorkSession[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    notify();
  },

  getDistractions(): DistractionUrge[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DISTRACTIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveDistractions(distractions: DistractionUrge[]) {
    localStorage.setItem(STORAGE_KEYS.DISTRACTIONS, JSON.stringify(distractions));
    notify();
  },

  getPatterns(): ObservedPattern[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PATTERNS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  savePatterns(patterns: ObservedPattern[]) {
    localStorage.setItem(STORAGE_KEYS.PATTERNS, JSON.stringify(patterns));
    notify();
  },

  getRulesState(): RulesState {
    const defaultState: RulesState = {
      enabledRuleNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      todaysRuleNumber: null,
      todaysRuleDate: new Date().toISOString().split('T')[0],
    };
    const raw = localStorage.getItem(STORAGE_KEYS.RULES_STATE);
    if (!raw) return defaultState;
    try {
      const parsed = JSON.parse(raw);
      return {
        enabledRuleNumbers: Array.isArray(parsed.enabledRuleNumbers)
          ? parsed.enabledRuleNumbers
          : defaultState.enabledRuleNumbers,
        todaysRuleNumber: parsed.todaysRuleNumber !== undefined ? parsed.todaysRuleNumber : null,
        todaysRuleDate: parsed.todaysRuleDate,
      };
    } catch {
      return defaultState;
    }
  },

  saveRulesState(partial: Partial<RulesState>): RulesState {
    const current = this.getRulesState();
    const updated: RulesState = {
      ...current,
      ...partial,
    };
    localStorage.setItem(STORAGE_KEYS.RULES_STATE, JSON.stringify(updated));
    notify();
    return updated;
  },

  setRuleEnabled(ruleNumber: number, enabled: boolean): void {
    const current = this.getRulesState();
    let updatedNumbers: number[];
    if (enabled) {
      updatedNumbers = Array.from(new Set([...current.enabledRuleNumbers, ruleNumber])).sort((a, b) => a - b);
    } else {
      updatedNumbers = current.enabledRuleNumbers.filter((n) => n !== ruleNumber);
    }
    this.saveRulesState({ enabledRuleNumbers: updatedNumbers });
  },

  getTodaysRule(): number | null {
    const state = this.getRulesState();
    const today = new Date().toISOString().split('T')[0];
    if (state.todaysRuleDate === today && state.todaysRuleNumber) {
      return state.todaysRuleNumber;
    }
    return null;
  },

  setTodaysRule(ruleNumber: number | null): void {
    const today = new Date().toISOString().split('T')[0];
    this.saveRulesState({
      todaysRuleNumber: ruleNumber,
      todaysRuleDate: today,
    });
  },

  clearAllData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    notify();
  },
};
