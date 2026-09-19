import { storage } from '../../lib/storage.ts';

export interface PlannerPreferences {
  preferredDuration: number;
  recentObstacles: string[];
  recentRewards: string[];
  preferredPhoneLocation: string;
}

const STORAGE_KEY = 'start_planner_preferences';

const DEFAULT_PREFERENCES: PlannerPreferences = {
  preferredDuration: 40,
  recentObstacles: [
    'I want to check my phone or messages',
    'I feel overwhelmed by the size of this task',
    'I don’t know where to begin',
    'The task feels boring or dry',
    'I tell myself I have plenty of time',
    'I worry the work won’t be good enough',
  ],
  recentRewards: [
    'Drink a glass of cold water and stretch',
    '5-minute walk outside in fresh air',
    'Rest eyes away from screens for 3 minutes',
    'Brew a warm cup of herbal tea or coffee',
    'Listen to 1 favorite instrumental track',
  ],
  preferredPhoneLocation: 'outside reach',
};

export const IF_THEN_MAPPINGS: Record<string, string> = {
  'phone': 'then I will log the urge in Distraction Capture, keep my hands on keyboard, and wait 60 seconds.',
  'messages': 'then I will remind myself that messages can wait until this slot timer concludes.',
  'overwhelmed': 'then I will ignore the whole project and focus exclusively on the single desired output.',
  'begin': 'then I will open the file and write an imperfect, ugly sentence for just 3 minutes.',
  'boring': 'then I will challenge myself to finish the first 10 minutes before deciding whether to stop.',
  'time': 'then I will remember that starting now eliminates tonight’s panic and protects my rest.',
  'good enough': 'then I will give myself permission to make an ugly first draft that nobody else will see.',
  'distracted': 'then I will write the intrusive thought on paper and return to my one action.',
};

export const plannerMemory = {
  getPreferences(): PlannerPreferences {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with user's onboarding delay triggers if available
      const profile = storage.getOnboardingProfile();
      if (profile?.delayTriggers && profile.delayTriggers.length > 0) {
        return {
          ...DEFAULT_PREFERENCES,
          recentObstacles: Array.from(new Set([...profile.delayTriggers, ...DEFAULT_PREFERENCES.recentObstacles])),
        };
      }
      return DEFAULT_PREFERENCES;
    }
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  savePreferences(prefs: Partial<PlannerPreferences>): PlannerPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  rememberDuration(duration: number): void {
    this.savePreferences({ preferredDuration: duration });
  },

  rememberObstacle(obstacle: string): void {
    const current = this.getPreferences();
    const updatedList = [obstacle, ...current.recentObstacles.filter((o) => o !== obstacle)].slice(0, 8);
    this.savePreferences({ recentObstacles: updatedList });
  },

  rememberReward(reward: string): void {
    const current = this.getPreferences();
    const updatedList = [reward, ...current.recentRewards.filter((r) => r !== reward)].slice(0, 8);
    this.savePreferences({ recentRewards: updatedList });
  },

  rememberPhoneLocation(location: string): void {
    this.savePreferences({ preferredPhoneLocation: location });
  },

  generateIfThenPlan(obstacle: string): string {
    const lower = obstacle.toLowerCase();
    for (const [keyword, response] of Object.entries(IF_THEN_MAPPINGS)) {
      if (lower.includes(keyword)) {
        return `If ${obstacle}, ${response}`;
      }
    }
    return `If ${obstacle}, then I will take 3 deep breaths, remind myself why this matters, and execute the 15-second physical action.`;
  },
};
