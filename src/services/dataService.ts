import { storage } from '../lib/storage.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  WorkSlot,
  Assignment,
  Milestone,
  DailyReview,
  WorkSession,
  DistractionUrge,
  ObservedPattern,
  SystemSettings,
  UserOnboardingProfile,
  OnboardingDraft,
} from '../types/models.ts';
import { getTodayString, addDays } from '../utils/dates.ts';

// -------------------------------------------------------------
// ID & Validation Helpers
// -------------------------------------------------------------
function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function ensureUuid(id: string | undefined): string {
  if (id && isValidUuid(id)) return id;
  return crypto.randomUUID();
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Bidirectional Mappers (camelCase <-> Postgres snake_case)
// -------------------------------------------------------------

function slotToDb(slot: WorkSlot, userId: string) {
  return {
    id: ensureUuid(slot.id),
    user_id: userId,
    assignment_id: slot.assignmentId && isValidUuid(slot.assignmentId) ? slot.assignmentId : null,
    milestone_id: slot.milestoneId && isValidUuid(slot.milestoneId) ? slot.milestoneId : null,
    task_id: slot.taskId && isValidUuid(slot.taskId) ? slot.taskId : null,
    date: slot.date,
    start_time: slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime,
    end_time: slot.endTime.length === 5 ? `${slot.endTime}:00` : slot.endTime,
    task_title: slot.taskTitle,
    desired_output: slot.desiredOutput,
    first_physical_action: slot.firstPhysicalAction,
    estimated_duration_minutes: slot.estimatedDurationMinutes,
    status: slot.status,
    slot_type: slot.slotType || 'study_topic',
    phone_location: slot.preparedData?.phoneLocation || 'outside reach',
    if_then_plan: slot.preparedData?.ifThenPlan || null,
    likely_obstacle: slot.preparedData?.likelyObstacle || null,
    planned_reward: slot.preparedData?.plannedReward || null,
    prepared_data: slot.preparedData || null,
    delay_reason: slot.delayReason || null,
    is_top_priority: slot.isTopPriority || null,
  };
}

function dbToSlot(row: any): WorkSlot {
  return {
    id: row.id,
    date: row.date,
    startTime: typeof row.start_time === 'string' ? row.start_time.slice(0, 5) : '09:00',
    endTime: typeof row.end_time === 'string' ? row.end_time.slice(0, 5) : '09:45',
    assignmentId: row.assignment_id || undefined,
    milestoneId: row.milestone_id || undefined,
    taskId: row.task_id || undefined,
    taskTitle: row.task_title || '',
    desiredOutput: row.desired_output || '',
    firstPhysicalAction: row.first_physical_action || '',
    estimatedDurationMinutes: Number(row.estimated_duration_minutes) || 30,
    status: row.status || 'planned',
    slotType: row.slot_type || 'study_topic',
    preparedData: row.prepared_data || undefined,
    delayReason: row.delay_reason || undefined,
    isTopPriority: row.is_top_priority || undefined,
  };
}

function assignmentToDb(assignment: Assignment, userId: string) {
  return {
    id: ensureUuid(assignment.id),
    user_id: userId,
    title: assignment.title,
    category: assignment.category || 'General',
    description: assignment.description || '',
    deadline: assignment.deadline,
    estimated_total_hours: assignment.estimatedTotalHours || 1,
    importance: assignment.importance || 'medium',
    status: assignment.status || 'in_progress',
    next_action: assignment.nextAction || 'Define first action',
    progress_percent: Math.min(100, Math.max(0, assignment.progressPercent || 0)),
    created_at: assignment.createdAt || new Date().toISOString(),
    updated_at: assignment.updatedAt || new Date().toISOString(),
  };
}

function milestoneToDb(m: Milestone, assignmentId: string) {
  return {
    id: ensureUuid(m.id),
    assignment_id: assignmentId,
    title: m.title,
    intended_output: m.intendedOutput,
    sequence: m.sequence ?? 0,
    estimated_hours: m.estimatedHours || 1,
    status: m.status || 'not_started',
    next_action: m.nextAction || 'Begin work',
    target_date: m.targetDate || null,
    completed_at: m.completedAt || null,
  };
}

function dbToMilestone(row: any): Milestone {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    title: row.title,
    intendedOutput: row.intended_output,
    sequence: Number(row.sequence) || 0,
    estimatedHours: Number(row.estimated_hours) || 1,
    status: row.status || 'not_started',
    nextAction: row.next_action || '',
    targetDate: row.target_date || undefined,
    completedAt: row.completed_at || undefined,
  };
}

function dbToAssignment(row: any, milestones: Milestone[] = []): Assignment {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description || '',
    deadline: row.deadline,
    estimatedTotalHours: Number(row.estimated_total_hours) || 1,
    importance: row.importance || 'medium',
    status: row.status || 'in_progress',
    milestones: milestones.sort((a, b) => a.sequence - b.sequence),
    nextAction: row.next_action || '',
    progressPercent: Number(row.progress_percent) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sessionToDb(s: WorkSession, userId: string) {
  return {
    id: ensureUuid(s.id),
    user_id: userId,
    work_slot_id: s.workSlotId && isValidUuid(s.workSlotId) ? s.workSlotId : null,
    assignment_id: s.assignmentId && isValidUuid(s.assignmentId) ? s.assignmentId : null,
    milestone_id: s.milestoneId && isValidUuid(s.milestoneId) ? s.milestoneId : null,
    task_title: s.taskTitle,
    actual_duration_minutes: s.actualDurationMinutes || 0,
    target_duration_minutes: s.targetDurationMinutes || 30,
    resistance_level: s.resistanceLevel || 3,
    energy_level: s.energyLevel || 3,
    phone_outside_reach: Boolean(s.phoneOutsideReach),
    produced_output: s.producedOutput || null,
    distractions_captured_count: s.distractionsCapturedCount || 0,
    delay_reason: s.delayReason || null,
    was_recovery_session: Boolean(s.wasRecoverySession),
    started_at: s.startedAt,
    ended_at: s.endedAt || null,
  };
}

function dbToSession(row: any): WorkSession {
  return {
    id: row.id,
    workSlotId: row.work_slot_id || '',
    assignmentId: row.assignment_id || undefined,
    milestoneId: row.milestone_id || undefined,
    taskTitle: row.task_title || '',
    actualDurationMinutes: Number(row.actual_duration_minutes) || 0,
    targetDurationMinutes: Number(row.target_duration_minutes) || 30,
    resistanceLevel: (row.resistance_level as any) || 3,
    energyLevel: (row.energy_level as any) || 3,
    phoneOutsideReach: Boolean(row.phone_outside_reach),
    producedOutput: row.produced_output || undefined,
    distractionsCapturedCount: Number(row.distractions_captured_count) || 0,
    delayReason: row.delay_reason || undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at || undefined,
    wasRecoverySession: Boolean(row.was_recovery_session),
  };
}

function distractionToDb(d: DistractionUrge, userId: string) {
  return {
    id: ensureUuid(d.id),
    user_id: userId,
    session_id: d.sessionId && isValidUuid(d.sessionId) ? d.sessionId : null,
    urge_text: d.urgeText,
    timestamp: d.timestamp || new Date().toISOString(),
    returned_to_work: Boolean(d.returnedToWork),
  };
}

function dbToDistraction(row: any): DistractionUrge {
  return {
    id: row.id,
    sessionId: row.session_id || undefined,
    urgeText: row.urge_text,
    timestamp: row.timestamp,
    returnedToWork: Boolean(row.returned_to_work),
  };
}

function reviewToDb(review: DailyReview, userId: string) {
  return {
    id: ensureUuid(review.id),
    user_id: userId,
    date: review.date,
    accomplished_summary: review.accomplishedSummary || '',
    planned_slots_count: review.factualSummary?.plannedSessions ?? review.plannedSlotsCount ?? 0,
    completed_slots_count: review.factualSummary?.completedSessions ?? review.completedSlotsCount ?? 0,
    missed_slots_count: (review.procrastinationEvents?.filter((e) => e.eventType === 'missed').length) ?? review.missedSlotsCount ?? 0,
    procrastinated_areas: review.procrastinatedAreas ?? [],
    delay_triggers: review.delayTriggers ?? review.procrastinationReasons ?? [],
    what_helped_start: Array.isArray(review.whatHelpedStart) ? review.whatHelpedStart.join(', ') : (review.whatHelpedStart || ''),
    distractions_count: review.factualSummary?.distractionEvents ?? review.distractionsCount ?? 0,
    key_learning: review.keyLearning || review.dataBasedReflection || '',
    tomorrow_top1: review.tomorrowTop1,
    tomorrow_top2: typeof review.tomorrowTop2 === 'string' ? review.tomorrowTop2 : (review.tomorrowTop2?.title || ''),
    tomorrow_top3: typeof review.tomorrowTop3 === 'string' ? review.tomorrowTop3 : (review.tomorrowTop3?.title || ''),
    tomorrow_behavioral_experiment: review.tomorrowBehavioralExperiment || '',
    submitted_at: review.submittedAt || new Date().toISOString(),
  };
}

function dbToReview(row: any): DailyReview {
  return {
    id: row.id,
    date: row.date,
    accomplishedSummary: row.accomplished_summary || '',
    factualSummary: {
      plannedSessions: row.planned_slots_count || 0,
      startedSessions: row.completed_slots_count || 0,
      completedSessions: row.completed_slots_count || 0,
      focusTimeMinutes: (row.completed_slots_count || 0) * 35,
      delayedStarts: 0,
      distractionEvents: row.distractions_count || 0,
      tasksCompleted: row.completed_slots_count || 0,
    },
    procrastinationEvents: [],
    procrastinationReasons: Array.isArray(row.delay_triggers) ? row.delay_triggers : [],
    whatHelpedStart: row.what_helped_start ? row.what_helped_start.split(', ') : [],
    dataBasedReflection: row.key_learning || '',
    tomorrowTop1: row.tomorrow_top1 || {
      title: 'Top 1 Priority',
      desiredOutput: 'Complete core action',
      firstPhysicalAction: 'Open laptop and start file',
      estimatedDurationMinutes: 30,
      startTime: '09:00',
      endTime: '09:30',
      likelyObstacle: '',
      ifThenPlan: '',
    },
    tomorrowTop2: row.tomorrow_top2 ? {
      title: row.tomorrow_top2,
      desiredOutput: '',
      firstPhysicalAction: '',
      estimatedDurationMinutes: 30,
      startTime: '10:00',
      endTime: '10:30',
      likelyObstacle: '',
      ifThenPlan: '',
    } : undefined,
    tomorrowTop3: row.tomorrow_top3 ? {
      title: row.tomorrow_top3,
      desiredOutput: '',
      firstPhysicalAction: '',
      estimatedDurationMinutes: 30,
      startTime: '11:00',
      endTime: '11:30',
      likelyObstacle: '',
      ifThenPlan: '',
    } : undefined,
    tomorrowBehavioralExperiment: row.tomorrow_behavioral_experiment || '',
    tomorrowInitialTimeline: [],
    tomorrowStartsWith: row.tomorrow_top1?.startTime ? `${row.tomorrow_top1.startTime} — ${row.tomorrow_top1.title}` : '09:00 — First action',
    submittedAt: row.submitted_at || new Date().toISOString(),
    plannedSlotsCount: row.planned_slots_count,
    completedSlotsCount: row.completed_slots_count,
    missedSlotsCount: row.missed_slots_count,
    procrastinatedAreas: row.procrastinated_areas,
    delayTriggers: row.delay_triggers,
    distractionsCount: row.distractions_count,
    keyLearning: row.key_learning,
  };
}

function patternToDb(p: ObservedPattern, userId: string) {
  return {
    id: ensureUuid(p.id),
    user_id: userId,
    title: p.title,
    evidence: p.evidence,
    interpretation: p.interpretation,
    suggested_experiment: p.suggestedExperiment,
    category: p.category,
    detected_date: p.detectedDate,
  };
}

function dbToPattern(row: any): ObservedPattern {
  return {
    id: row.id,
    title: row.title,
    evidence: row.evidence,
    interpretation: row.interpretation,
    suggestedExperiment: row.suggested_experiment,
    category: row.category,
    detectedDate: row.detected_date,
  };
}

function onboardingProfileToDb(profile: UserOnboardingProfile, userId: string) {
  return {
    id: userId,
    name: profile.name,
    primary_role: profile.primaryRole,
    custom_role: profile.customRole || null,
    typical_categories: profile.typicalCategories || [],
    normal_working_days: profile.normalWorkingDays || [],
    approx_available_hours: profile.approxAvailableHoursPerDay || 4.0,
    primary_goals: profile.primaryGoals || [],
    responsibilities: profile.responsibilities || '',
    upcoming_deadlines: profile.upcomingDeadlines || [],
    delay_triggers: profile.delayTriggers || [],
    common_distractions: profile.commonDistractions || [],
    best_working_time: profile.bestWorkingTime || 'morning',
    enabled_rule_codes: profile.enabledRuleCodes || [],
    first_commitment: profile.firstCommitment,
    generated_operating_profile: profile.generatedOperatingProfile,
    completed_at: profile.completedAt || new Date().toISOString(),
  };
}

function dbToOnboardingProfile(row: any): UserOnboardingProfile {
  return {
    name: row.name,
    primaryRole: row.primary_role,
    customRole: row.custom_role || undefined,
    typicalCategories: row.typical_categories || [],
    normalWorkingDays: row.normal_working_days || [],
    approxAvailableHoursPerDay: Number(row.approx_available_hours) || 4,
    primaryGoals: row.primary_goals || [],
    responsibilities: row.responsibilities || '',
    upcomingDeadlines: row.upcoming_deadlines || [],
    delayTriggers: row.delay_triggers || [],
    commonDistractions: row.common_distractions || [],
    bestWorkingTime: row.best_working_time || 'morning',
    enabledRuleCodes: row.enabled_rule_codes || [],
    firstCommitment: row.first_commitment,
    generatedOperatingProfile: row.generated_operating_profile,
    completedAt: row.completed_at,
  };
}

// -------------------------------------------------------------
// START Data Service Layer
// -------------------------------------------------------------
export const dataService = {
  // --- Remote Synchronization ---
  async syncWithRemote(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      // 1. Fetch profile & onboarding
      const [profileRes, onboardingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('onboarding_profiles').select('*').eq('id', userId).maybeSingle(),
      ]);

      if (profileRes.data) {
        storage.saveSettings({
          theme: profileRes.data.theme || 'dark',
          soundEnabled: profileRes.data.sound_enabled ?? true,
          workDayStart: profileRes.data.work_day_start ? profileRes.data.work_day_start.slice(0, 5) : '09:00',
          workDayEnd: profileRes.data.work_day_end ? profileRes.data.work_day_end.slice(0, 5) : '18:00',
          isOnboardingCompleted: Boolean(profileRes.data.is_onboarding_completed || onboardingRes.data),
        });
      }

      if (onboardingRes.data) {
        const parsedOnboarding = dbToOnboardingProfile(onboardingRes.data);
        storage.saveOnboardingProfile(parsedOnboarding);
      }

      // 2. Fetch work slots
      const slotsRes = await supabase
        .from('work_slots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (slotsRes.data) {
        const remoteSlots = slotsRes.data.map(dbToSlot);
        storage.saveSlots(remoteSlots);
      }

      // 3. Fetch assignments and milestones
      const assignmentsRes = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (assignmentsRes.data) {
        const assignmentIds = assignmentsRes.data.map((a: any) => a.id);
        let milestonesByAssignment: Record<string, Milestone[]> = {};

        if (assignmentIds.length > 0) {
          const milestonesRes = await supabase
            .from('milestones')
            .select('*')
            .in('assignment_id', assignmentIds)
            .order('sequence', { ascending: true });

          if (milestonesRes.data) {
            milestonesByAssignment = milestonesRes.data.reduce((acc: Record<string, Milestone[]>, row: any) => {
              const m = dbToMilestone(row);
              if (!acc[m.assignmentId]) acc[m.assignmentId] = [];
              acc[m.assignmentId].push(m);
              return acc;
            }, {} as Record<string, Milestone[]>);
          }
        }

        const remoteAssignments = assignmentsRes.data.map((row: any) =>
          dbToAssignment(row, milestonesByAssignment[row.id] || [])
        );
        storage.saveAssignments(remoteAssignments);
      }

      // 4. Fetch work sessions
      const sessionsRes = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (sessionsRes.data) {
        storage.saveSessions(sessionsRes.data.map(dbToSession));
      }

      // 5. Fetch distractions
      const distractionsRes = await supabase
        .from('distractions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (distractionsRes.data) {
        storage.saveDistractions(distractionsRes.data.map(dbToDistraction));
      }

      // 6. Fetch daily reviews
      const reviewsRes = await supabase
        .from('daily_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (reviewsRes.data) {
        storage.saveReviews(reviewsRes.data.map(dbToReview));
      }

      // 7. Fetch observed patterns
      const patternsRes = await supabase
        .from('observed_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('detected_date', { ascending: false });

      if (patternsRes.data) {
        storage.savePatterns(patternsRes.data.map(dbToPattern));
      }
    } catch (err) {
      console.warn('Sync with remote Supabase failed (offline fallback):', err);
    }
  },

  // --- Settings ---
  async getSettings(): Promise<SystemSettings> {
    return storage.getSettings();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const updated = storage.saveSettings(settings);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const profileUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
          if (settings.theme) profileUpdate.theme = settings.theme;
          if (settings.soundEnabled !== undefined) profileUpdate.sound_enabled = settings.soundEnabled;
          if (settings.workDayStart) profileUpdate.work_day_start = settings.workDayStart;
          if (settings.workDayEnd) profileUpdate.work_day_end = settings.workDayEnd;
          if (settings.isOnboardingCompleted !== undefined) profileUpdate.is_onboarding_completed = settings.isOnboardingCompleted;
          await supabase.from('profiles').update(profileUpdate).eq('id', userId);
        }
      } catch (err) {
        console.warn('Supabase settings update error:', err);
      }
    }

    return updated;
  },

  // --- Onboarding ---
  async getOnboardingProfile(): Promise<UserOnboardingProfile | null> {
    return storage.getOnboardingProfile();
  },

  async saveOnboardingProfile(profile: UserOnboardingProfile): Promise<void> {
    storage.saveOnboardingProfile(profile);

    // 1. Create initial work slot from their first commitment
    const today = getTodayString();
    const existingSlots = storage.getSlots();
    if (existingSlots.length === 0 && profile.firstCommitment?.goal) {
      const initialSlot: WorkSlot = {
        id: crypto.randomUUID(),
        date: today,
        startTime: '09:30',
        endTime: '10:15',
        taskTitle: profile.firstCommitment.goal,
        desiredOutput: `Complete draft / baseline for: ${profile.firstCommitment.goal}`,
        firstPhysicalAction: profile.firstCommitment.firstPhysicalAction || 'Open notes and write the first paragraph',
        estimatedDurationMinutes: profile.firstCommitment.targetDurationMinutes || 40,
        status: 'planned',
        isTopPriority: 1,
      };
      await this.saveSlot(initialSlot);
    }

    // 2. Create assignments from their upcoming deadlines if provided
    if (profile.upcomingDeadlines && profile.upcomingDeadlines.length > 0) {
      const existingAssignments = storage.getAssignments();
      if (existingAssignments.length === 0) {
        for (const item of profile.upcomingDeadlines) {
          if (!item.title.trim()) continue;
          const newAssignment: Assignment = {
            id: crypto.randomUUID(),
            title: item.title,
            category: profile.primaryRole || 'General',
            description: `Auto-initialized from onboarding for ${item.title}`,
            deadline: item.deadlineDate || addDays(new Date(), 7).toISOString(),
            estimatedTotalHours: 8,
            importance: 'high',
            status: 'in_progress',
            milestones: [
              { id: crypto.randomUUID(), assignmentId: '', title: '1. Understand Requirements', intendedOutput: 'Written 1-page requirements spec', sequence: 0, estimatedHours: 1.5, status: 'in_progress', nextAction: `Read syllabus & prompt for ${item.title}` },
              { id: crypto.randomUUID(), assignmentId: '', title: '2. Rough Draft / Outline', intendedOutput: 'Initial working outline draft', sequence: 1, estimatedHours: 2, status: 'not_started', nextAction: 'Write section headings in doc' },
              { id: crypto.randomUUID(), assignmentId: '', title: '3. Complete Core Content', intendedOutput: 'Core implementation or draft sections complete', sequence: 2, estimatedHours: 3, status: 'not_started', nextAction: 'Work on section 1' },
              { id: crypto.randomUUID(), assignmentId: '', title: '4. Final Review & Polish', intendedOutput: 'Checked against grading rubric', sequence: 3, estimatedHours: 1, status: 'not_started', nextAction: 'Run spellcheck and formatting pass' },
              { id: crypto.randomUUID(), assignmentId: '', title: '5. Submission', intendedOutput: 'Uploaded to submission portal', sequence: 4, estimatedHours: 0.5, status: 'not_started', nextAction: 'Upload file and download confirmation' },
            ],
            nextAction: `Read syllabus & prompt for ${item.title}`,
            progressPercent: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          // link milestones
          newAssignment.milestones.forEach((m) => { m.assignmentId = newAssignment.id; });
          await this.saveAssignment(newAssignment);
        }
      }
    }

    // 3. Create baseline observed pattern reflection from self-reported data
    if (profile.generatedOperatingProfile?.summaryStatement) {
      const initialPattern: ObservedPattern = {
        id: crypto.randomUUID(),
        title: 'Initial Operating Profile Baseline',
        evidence: `Identified top blockers: ${profile.generatedOperatingProfile.primaryBlockers.join(', ')}`,
        interpretation: profile.generatedOperatingProfile.summaryStatement,
        suggestedExperiment: profile.generatedOperatingProfile.defenseProtocols[0] || 'Define the first physical action before every technical session.',
        category: 'resistance',
        detectedDate: today,
      };
      await this.savePatterns([initialPattern]);
    }

    // 4. Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbProfile = onboardingProfileToDb(profile, userId);
          const { error } = await supabase.from('onboarding_profiles').upsert(dbProfile);
          if (error) console.warn('Supabase onboarding profile upsert error:', error);

          await supabase.from('profiles').update({
            is_onboarding_completed: true,
            updated_at: new Date().toISOString(),
          }).eq('id', userId);
        }
      } catch (err) {
        console.warn('Supabase sync error (onboarding_profiles):', err);
      }
    }
  },

  async getOnboardingDraft(): Promise<OnboardingDraft | null> {
    return storage.getOnboardingDraft();
  },

  async saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
    storage.saveOnboardingDraft(draft);
  },

  async clearOnboardingDraft(): Promise<void> {
    storage.clearOnboardingDraft();
  },

  async isOnboardingCompleted(): Promise<boolean> {
    return storage.isOnboardingCompleted();
  },

  // --- Work Slots ---
  async getSlots(date: string = getTodayString()): Promise<WorkSlot[]> {
    const allSlots = storage.getSlots();
    return allSlots.filter((slot) => slot.date === date);
  },

  async getAllSlots(): Promise<WorkSlot[]> {
    return storage.getSlots();
  },

  async saveSlot(slot: WorkSlot): Promise<WorkSlot> {
    const slots = storage.getSlots();
    const existingIndex = slots.findIndex((s) => s.id === slot.id);
    let updatedSlots: WorkSlot[];

    if (existingIndex >= 0) {
      updatedSlots = [...slots];
      updatedSlots[existingIndex] = slot;
    } else {
      updatedSlots = [slot, ...slots];
    }

    storage.saveSlots(updatedSlots);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbSlot = slotToDb(slot, userId);
          const { error } = await supabase.from('work_slots').upsert(dbSlot);
          if (error) console.warn('Supabase sync error (work_slots):', error);
        }
      } catch (err) {
        console.warn('Supabase sync error (work_slots):', err);
      }
    }

    return slot;
  },

  async deleteSlot(slotId: string): Promise<void> {
    const slots = storage.getSlots().filter((s) => s.id !== slotId);
    storage.saveSlots(slots);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const { error } = await supabase.from('work_slots').delete().eq('id', slotId).eq('user_id', userId);
          if (error) console.warn('Supabase delete error (work_slots):', error);
        }
      } catch (err) {
        console.warn('Supabase delete error (work_slots):', err);
      }
    }
  },

  // --- Assignments ---
  async getAssignments(): Promise<Assignment[]> {
    return storage.getAssignments();
  },

  async saveAssignment(assignment: Assignment): Promise<Assignment> {
    const assignments = storage.getAssignments();
    const existingIndex = assignments.findIndex((a) => a.id === assignment.id);
    let updated: Assignment[];

    if (existingIndex >= 0) {
      updated = [...assignments];
      updated[existingIndex] = assignment;
    } else {
      updated = [assignment, ...assignments];
    }

    storage.saveAssignments(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbAssignment = assignmentToDb(assignment, userId);
          const { error: assignErr } = await supabase.from('assignments').upsert(dbAssignment);
          if (assignErr) {
            console.warn('Supabase sync error (assignments):', assignErr);
          }

          if (assignment.milestones && assignment.milestones.length > 0) {
            const dbMilestones = assignment.milestones.map((m) => milestoneToDb(m, dbAssignment.id));
            const { error: msErr } = await supabase.from('milestones').upsert(dbMilestones);
            if (msErr) {
              console.warn('Supabase sync error (milestones):', msErr);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase sync error (assignments):', err);
      }
    }

    return assignment;
  },

  async deleteAssignment(id: string): Promise<void> {
    const assignments = storage.getAssignments().filter((a) => a.id !== id);
    storage.saveAssignments(assignments);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const { error } = await supabase.from('assignments').delete().eq('id', id).eq('user_id', userId);
          if (error) console.warn('Supabase delete error (assignments):', error);
        }
      } catch (err) {
        console.warn('Supabase delete error (assignments):', err);
      }
    }
  },

  // --- Daily Reviews ---
  async getDailyReviews(): Promise<DailyReview[]> {
    return storage.getReviews();
  },

  async getTodayReview(): Promise<DailyReview | null> {
    const today = getTodayString();
    const reviews = storage.getReviews();
    return reviews.find((r) => r.date === today) || null;
  },

  async getDailyReview(date: string = getTodayString()): Promise<DailyReview | null> {
    const reviews = storage.getReviews();
    return reviews.find((r) => r.date === date) || null;
  },

  async saveDailyReview(review: DailyReview): Promise<DailyReview> {
    const reviews = storage.getReviews();
    const filtered = reviews.filter((r) => r.date !== review.date);
    storage.saveReviews([review, ...filtered]);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbRev = reviewToDb(review, userId);
          const { error } = await supabase.from('daily_reviews').upsert(dbRev, { onConflict: 'date' });
          if (error) console.warn('Supabase sync error (daily_reviews):', error);
        }
      } catch (err) {
        console.warn('Supabase sync error (daily_reviews):', err);
      }
    }

    return review;
  },

  // --- Work Sessions ---
  async getSessions(): Promise<WorkSession[]> {
    return storage.getSessions();
  },

  async logSession(session: WorkSession): Promise<WorkSession> {
    const sessions = storage.getSessions();
    storage.saveSessions([session, ...sessions]);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbSess = sessionToDb(session, userId);
          const { error } = await supabase.from('work_sessions').upsert(dbSess);
          if (error) console.warn('Supabase sync error (work_sessions):', error);
        }
      } catch (err) {
        console.warn('Supabase sync error (work_sessions):', err);
      }
    }

    return session;
  },

  // --- Distraction Urges ---
  async getDistractions(): Promise<DistractionUrge[]> {
    return storage.getDistractions();
  },

  async captureDistraction(urgeText: string, sessionId?: string): Promise<DistractionUrge> {
    const urge: DistractionUrge = {
      id: crypto.randomUUID(),
      sessionId,
      urgeText: urgeText.trim(),
      timestamp: new Date().toISOString(),
      returnedToWork: true,
    };
    const distractions = storage.getDistractions();
    storage.saveDistractions([urge, ...distractions]);

    if (isSupabaseConfigured && supabase) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbDistraction = distractionToDb(urge, userId);
          const { error } = await supabase.from('distractions').upsert(dbDistraction);
          if (error) console.warn('Supabase sync error (distractions):', error);
        }
      } catch (err) {
        console.warn('Supabase sync error (distractions):', err);
      }
    }

    return urge;
  },

  // --- Observed Patterns ---
  async getPatterns(): Promise<ObservedPattern[]> {
    return storage.getPatterns();
  },

  async savePatterns(patterns: ObservedPattern[]): Promise<void> {
    storage.savePatterns(patterns);

    if (isSupabaseConfigured && supabase && patterns.length > 0) {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const dbPatterns = patterns.map((p) => patternToDb(p, userId));
          const { error } = await supabase.from('observed_patterns').upsert(dbPatterns);
          if (error) console.warn('Supabase sync error (observed_patterns):', error);
        }
      } catch (err) {
        console.warn('Supabase sync error (observed_patterns):', err);
      }
    }
  },

  // --- Diagnostic / Reset ---
  async resetAll(): Promise<void> {
    storage.clearAllData();
  },
};
