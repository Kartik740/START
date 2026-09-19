/**
 * START — Personal Anti-Procrastination Operating System
 * Domain Models & Type Definitions
 */

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';

export type AssignmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'archived';

export interface Milestone {
  id: string;
  assignmentId: string;
  title: string;
  intendedOutput: string; // "What would count as visible evidence that this step is complete?"
  sequence: number; // sequence/order index
  estimatedHours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  nextAction: string; // concrete first physical action
  targetDate?: string;
  completedAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  category: string;
  description: string;
  deadline: string; // ISO date string
  estimatedTotalHours: number;
  importance: ImportanceLevel;
  status: AssignmentStatus;
  milestones: Milestone[];
  nextAction: string;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentBufferInfo {
  assignmentId: string;
  daysRemaining: number;
  isPastDue: boolean;
  isUrgent: boolean;
  milestonesRemaining: number;
  milestonesTotal: number;
  lastPlannedSessionDate?: string;
  nextPlannedSessionDate?: string;
  hasUpcomingSession: boolean;
  behavioralWarning?: string;
}

export interface Task {
  id: string;
  title: string;
  desiredOutput: string;
  firstPhysicalAction: string;
  estimatedMinutes: number;
  assignmentId?: string;
  milestoneId?: string;
  category: 'technical' | 'writing' | 'administrative' | 'reading' | 'planning';
  isCompleted: boolean;
  createdAt: string;
}

export type SlotStatus = 'planned' | 'in_progress' | 'completed' | 'missed' | 'recovered';

export interface PreparedSlotData {
  workingOn: string;
  desiredOutput: string;
  firstPhysicalAction: string;
  durationMinutes: number;
  likelyObstacle: string;
  ifThenPlan: string;
  phoneLocation: string; // e.g., 'Outside reach', 'Another room'
  plannedReward?: string;
}

export interface WorkSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  assignmentId?: string;
  milestoneId?: string;
  taskId?: string;
  taskTitle: string;
  desiredOutput: string;
  firstPhysicalAction: string;
  estimatedDurationMinutes: number;
  status: SlotStatus;
  slotType?: 'assignment' | 'project' | 'study_topic' | 'personal_goal' | 'custom_task';
  preparedData?: PreparedSlotData;
  delayReason?: string;
  isTopPriority?: 1 | 2 | 3;
}

export interface WorkSession {
  id: string;
  workSlotId: string;
  assignmentId?: string;
  milestoneId?: string;
  taskTitle: string;
  actualDurationMinutes: number;
  targetDurationMinutes: number;
  resistanceLevel: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  phoneOutsideReach: boolean;
  producedOutput?: string;
  distractionsCapturedCount: number;
  delayReason?: string;
  startedAt: string;
  endedAt?: string;
  wasRecoverySession?: boolean;
  isOutputComplete?: 'complete' | 'partial' | 'not_yet';
  remainingWork?: string;
  pausesCount?: number;
  earlyTermination?: boolean;
  nextActionScheduledSlotId?: string;
}

export interface DistractionUrge {
  id: string;
  sessionId?: string;
  urgeText: string;
  timestamp: string;
  returnedToWork: boolean;
}

export interface ReviewFactualSummary {
  plannedSessions: number;
  startedSessions: number;
  completedSessions: number;
  focusTimeMinutes: number;
  delayedStarts: number;
  distractionEvents: number;
  tasksCompleted: number;
}

export interface TomorrowPriorityAction {
  title: string;
  desiredOutput: string;
  firstPhysicalAction: string;
  estimatedDurationMinutes: number;
  startTime: string;
  endTime: string;
  likelyObstacle: string;
  ifThenPlan: string;
}

export interface TimelineItem {
  time: string;
  title: string;
  output?: string;
  isBreak?: boolean;
}

export interface ProcrastinationEventRecord {
  slotTitle: string;
  eventType: 'missed' | 'delayed_start' | 'early_exit' | 'distraction_surge';
  reason?: string;
  note?: string;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  factualSummary: ReviewFactualSummary;
  accomplishedSummary: string; // What was actually produced
  procrastinationEvents: ProcrastinationEventRecord[];
  procrastinationReasons: string[];
  whatHelpedStart: string[];
  dataBasedReflection: string;
  tomorrowTop1: TomorrowPriorityAction;
  tomorrowTop2?: TomorrowPriorityAction;
  tomorrowTop3?: TomorrowPriorityAction;
  tomorrowBehavioralExperiment: string;
  tomorrowInitialTimeline: TimelineItem[];
  tomorrowStartsWith: string; // e.g. "09:00 — Open Tutorial 3 and solve Question 1."
  submittedAt: string;
  // Backward compatibility legacy fields:
  plannedSlotsCount?: number;
  completedSlotsCount?: number;
  missedSlotsCount?: number;
  procrastinatedAreas?: string[];
  delayTriggers?: string[];
  distractionsCount?: number;
  keyLearning?: string;
}

export interface BehavioralRule {
  ruleNumber: number;
  code: string;
  name: string;
  title: string;
  principle: string;
  explanation: string;
  whyStartUsesIt: string;
  practicalExample: string;
  contextTag: 'starting' | 'planning' | 'execution' | 'environment' | 'recovery' | 'night';
}

export interface RulesState {
  enabledRuleNumbers: number[];
  todaysRuleNumber?: number | null;
  todaysRuleDate?: string;
}

export interface ObservedPattern {
  id: string;
  title: string;
  evidence: string;
  interpretation: string;
  suggestedExperiment: string;
  category: 'resistance' | 'timing' | 'environment' | 'clarity' | 'recovery';
  detectedDate: string;
}

export interface NotificationCategorySettings {
  upcomingSlot: boolean; // 10 minutes before planned slot
  nextActionReady: boolean; // Next physical action ready
  missedSlotRecovery: boolean; // 10-minute recovery offer after a missed slot
  nightReview: boolean; // Evening reflection reminder
  nightReviewTime: string; // e.g. "21:00"
}

export interface SystemSettings {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  phoneCheckStrict: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  geminiApiKey?: string;
  workDayStart: string; // HH:mm
  workDayEnd: string; // HH:mm
  isOnboardingCompleted?: boolean;
  // PWA, Timezone & Notification preferences
  userTimezone?: string; // IANA string (e.g. "Asia/Kolkata", "America/New_York")
  notificationsEnabled: boolean;
  notificationCategories: NotificationCategorySettings;
}

// -------------------------------------------------------------
// ONBOARDING TYPES
// -------------------------------------------------------------

export interface UpcomingDeadlineItem {
  id: string;
  title: string;
  deadlineDate: string;
}

export interface UserOnboardingProfile {
  // Step 1: Basic Profile
  name: string;
  primaryRole: string;
  customRole?: string;
  typicalCategories: string[];
  normalWorkingDays: string[];
  approxAvailableHoursPerDay: number;

  // Step 2: Current Goals
  primaryGoals: string[];
  responsibilities: string;
  upcomingDeadlines: UpcomingDeadlineItem[];

  // Step 3: Procrastination Patterns
  delayTriggers: string[];
  customDelayTrigger?: string;

  // Step 4: Common Distractions
  commonDistractions: string[];
  customDistraction?: string;

  // Step 5: Working Pattern
  bestWorkingTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'variable';

  // Step 6: Personal Rules
  enabledRuleCodes: string[];

  // Step 7: First Commitment
  firstCommitment: {
    goal: string;
    firstPhysicalAction: string;
    deadline?: string;
    targetDurationMinutes: number;
  };

  // Generated Operating Profile
  generatedOperatingProfile: {
    primaryBlockers: string[];
    defenseProtocols: string[];
    summaryStatement: string;
    recommendedFirstSlotTime: string;
  };

  completedAt: string;
}

export type OnboardingDraft = Partial<UserOnboardingProfile> & {
  currentStep: number;
};
