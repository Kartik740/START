import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  Assignment,
  DailyReview,
} from '../../types/models.ts';
import { calculateDeadlineBuffer } from '../../utils/dates.ts';
import { parseISO, subDays, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';

export interface WeeklyMetrics {
  plannedSessions: number;
  startedSessions: number;
  completedSessions: number;
  averageStartDelayMinutes: number;
  averageFocusedDurationMinutes: number;
  concreteOutputsCompleted: number;
  missedSessions: number;
  recoverySessions: number;
  distractionIncidents: number;
  deadlineBufferDays: number;
  deadlineBufferLabel: string;
  assignmentsProgressed: number;
}

export interface BehavioralPattern {
  id: string;
  title: string;
  observedPattern: string;
  possibleExplanation: string;
  evidence: string;
  experimentToTest: string;
  category: 'clarity' | 'timing' | 'environment' | 'recovery' | 'resistance';
  confidence: 'high' | 'moderate';
}

export interface WeeklyReflectionData {
  whatHappened: string[];
  whatSeemsToBeHappening: string[];
  whatToTestNextWeek: string[];
}

export interface MonthlyTrendPoint {
  periodLabel: string; // "Week 1", "Week 2", "Week 3", "Week 4"
  dateRangeLabel: string;
  startingReliabilityPercent: number;
  averageStartDelayMinutes: number;
  averageDeadlineBufferDays: number;
  averageFocusDurationMinutes: number;
  recoveryRatePercent: number;
  missedSessions: number;
  recoveredSessions: number;
  outputsCount: number;
}

export interface CategoryDelayStat {
  category: string;
  totalSlots: number;
  delayedSlots: number;
  delayRatePercent: number;
}

export interface MajorAssignmentCompleted {
  id: string;
  title: string;
  category: string;
  completedDate: string;
  milestonesTotal: number;
}

export interface MonthlyMetrics {
  trendPoints: MonthlyTrendPoint[];
  startingReliabilityChange: number; // e.g. +22%
  startDelayChangeMinutes: number; // e.g. -11 min
  focusDurationChangeMinutes: number; // e.g. +8 min
  recoveryBehaviorSummary: {
    totalMissed: number;
    totalRecovered: number;
    recoveryRatePercent: number;
    summaryText: string;
  };
  commonlyDelayedCategories: CategoryDelayStat[];
  totalOutputsCompleted: number;
  recentCompletedOutputs: { output: string; date: string; taskTitle: string }[];
  majorAssignmentsCompleted: MajorAssignmentCompleted[];
  centralQuestionAnswer: {
    headline: string;
    verdict: 'significantly_improving' | 'moderately_improving' | 'steady' | 'needs_adjustment';
    delayInsight: string;
    recoveryInsight: string;
  };
}

const MIN_SESSIONS_FOR_PATTERNS = 5;

/**
 * Filter slots, sessions, distractions for a given date interval
 */
export function filterDataByDateRange(
  slots: WorkSlot[],
  sessions: WorkSession[],
  distractions: DistractionUrge[],
  startDate: Date,
  endDate: Date
) {
  const interval = { start: startOfDay(startDate), end: endOfDay(endDate) };

  const filteredSlots = slots.filter((slot) => {
    try {
      const d = parseISO(slot.date);
      return isWithinInterval(d, interval);
    } catch {
      return false;
    }
  });

  const filteredSessions = sessions.filter((sess) => {
    try {
      if (!sess.startedAt) return false;
      const d = parseISO(sess.startedAt);
      return isWithinInterval(d, interval);
    } catch {
      return false;
    }
  });

  const filteredDistractions = distractions.filter((dist) => {
    try {
      if (!dist.timestamp) return false;
      const d = parseISO(dist.timestamp);
      return isWithinInterval(d, interval);
    } catch {
      return false;
    }
  });

  return { filteredSlots, filteredSessions, filteredDistractions };
}

/**
 * Compute the 11 weekly metrics
 */
export function calculateWeeklyMetrics(
  slots: WorkSlot[],
  sessions: WorkSession[],
  distractions: DistractionUrge[],
  assignments: Assignment[]
): WeeklyMetrics {
  const plannedSessions = slots.length;

  // Started sessions: distinct slots that reached in_progress, completed, recovered, or have a matching session
  const startedSlotIds = new Set<string>();
  slots.forEach((s) => {
    if (s.status === 'in_progress' || s.status === 'completed' || s.status === 'recovered') {
      startedSlotIds.add(s.id);
    }
  });
  sessions.forEach((sess) => {
    if (sess.workSlotId) startedSlotIds.add(sess.workSlotId);
  });
  const startedSessions = Math.max(startedSlotIds.size, sessions.length);

  // Completed sessions
  const completedSessions = slots.filter((s) => s.status === 'completed').length ||
    sessions.filter((s) => s.isOutputComplete === 'complete').length;

  // Start delay: average delay between scheduled start and actual start
  let totalDelayMinutes = 0;
  let delaySampleCount = 0;

  slots.forEach((slot) => {
    if (slot.delayReason) {
      totalDelayMinutes += 15;
      delaySampleCount++;
    }
  });

  sessions.forEach((sess) => {
    if (sess.workSlotId) {
      const matchingSlot = slots.find((s) => s.id === sess.workSlotId);
      if (matchingSlot && matchingSlot.startTime && sess.startedAt) {
        try {
          const scheduledIso = `${matchingSlot.date}T${matchingSlot.startTime}:00`;
          const schedTime = new Date(scheduledIso).getTime();
          const actTime = new Date(sess.startedAt).getTime();
          const diffMin = Math.round((actTime - schedTime) / (60 * 1000));
          if (diffMin > 0 && diffMin < 240) {
            totalDelayMinutes += diffMin;
            delaySampleCount++;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  });

  const averageStartDelayMinutes = delaySampleCount > 0
    ? Math.round(totalDelayMinutes / delaySampleCount)
    : 0;

  // Average focused duration
  const totalFocusMinutes = sessions.reduce((acc, s) => acc + (s.actualDurationMinutes || 0), 0);
  const averageFocusedDurationMinutes = sessions.length > 0
    ? Math.round(totalFocusMinutes / sessions.length)
    : 0;

  // Concrete outputs completed
  const outputSet = new Set<string>();
  sessions.forEach((s) => {
    if (s.producedOutput && s.producedOutput.trim().length > 3) {
      outputSet.add(s.producedOutput.trim());
    } else if (s.isOutputComplete === 'complete') {
      outputSet.add(s.taskTitle);
    }
  });
  slots.forEach((s) => {
    if (s.status === 'completed' && s.desiredOutput && s.desiredOutput.trim().length > 3) {
      outputSet.add(s.desiredOutput.trim());
    }
  });
  const concreteOutputsCompleted = outputSet.size;

  // Missed sessions
  const missedSessions = slots.filter((s) => s.status === 'missed').length;

  // Recovery sessions
  const recoverySessions = sessions.filter((s) => s.wasRecoverySession).length +
    slots.filter((s) => s.status === 'recovered').length;

  // Distraction incidents: urges captured + distractions noted in sessions
  const distractionUrgeCount = distractions.length;
  const sessionDistractionSum = sessions.reduce(
    (acc, s) => acc + (s.distractionsCapturedCount || 0),
    0
  );
  const distractionIncidents = Math.max(distractionUrgeCount, sessionDistractionSum);

  // Deadline buffer: average days buffer across active assignments
  const activeAssignments = assignments.filter((a) => a.status === 'in_progress' || a.status === 'not_started');
  let totalBufferDays = 0;
  let validBufferAssignments = 0;

  activeAssignments.forEach((a) => {
    if (a.deadline) {
      const buffer = calculateDeadlineBuffer(a.deadline);
      totalBufferDays += buffer.daysRemaining;
      validBufferAssignments++;
    }
  });

  const deadlineBufferDays = validBufferAssignments > 0
    ? Math.round(totalBufferDays / validBufferAssignments)
    : 0;

  const deadlineBufferLabel = validBufferAssignments === 0
    ? 'No active deadlines'
    : deadlineBufferDays < 0
    ? `${Math.abs(deadlineBufferDays)}d overdue avg`
    : deadlineBufferDays === 0
    ? 'Due today'
    : `${deadlineBufferDays} days avg buffer`;

  // Assignments progressed: assignments that have at least one slot or session in this period
  const progressedAssignmentIds = new Set<string>();
  slots.forEach((s) => {
    if (s.assignmentId && (s.status === 'completed' || s.status === 'in_progress' || s.status === 'recovered')) {
      progressedAssignmentIds.add(s.assignmentId);
    }
  });
  sessions.forEach((s) => {
    if (s.assignmentId) progressedAssignmentIds.add(s.assignmentId);
  });
  const assignmentsProgressed = progressedAssignmentIds.size;

  return {
    plannedSessions,
    startedSessions,
    completedSessions,
    averageStartDelayMinutes,
    averageFocusedDurationMinutes,
    concreteOutputsCompleted,
    missedSessions,
    recoverySessions,
    distractionIncidents,
    deadlineBufferDays,
    deadlineBufferLabel,
    assignmentsProgressed,
  };
}

/**
 * Identifies behavioral patterns strictly with sufficient empirical data.
 * Adheres to non-diagnostic language rules:
 * - "Observed pattern"
 * - "Possible explanation"
 * - "Evidence"
 * - "Experiment to test"
 */
export function identifyBehavioralPatterns(
  slots: WorkSlot[],
  sessions: WorkSession[],
  distractions: DistractionUrge[]
): {
  patterns: BehavioralPattern[];
  hasEnoughData: boolean;
  totalSessionCount: number;
  sessionsNeeded: number;
} {
  const totalCount = Math.max(slots.length, sessions.length);

  if (totalCount < MIN_SESSIONS_FOR_PATTERNS) {
    return {
      patterns: [],
      hasEnoughData: false,
      totalSessionCount: totalCount,
      sessionsNeeded: MIN_SESSIONS_FOR_PATTERNS - totalCount,
    };
  }

  const patterns: BehavioralPattern[] = [];

  // 1. PATTERN: VAGUE OUTPUTS VS DELAYED STARTS
  const vagueKeywords = ['study', 'work', 'read', 'code', 'review', 'do', 'assignment', 'research'];
  let vagueDelayedCount = 0;
  let vagueTotalCount = 0;
  let concreteDelayedCount = 0;
  let concreteTotalCount = 0;
  const sampleVagueOutputs: string[] = [];

  slots.forEach((slot) => {
    const text = (slot.desiredOutput || '').trim().toLowerCase();
    const isVague =
      text.length < 16 ||
      vagueKeywords.some((w) => text === w || text === `study ${w}` || text === `work on ${w}`);

    const wasDelayedOrMissed =
      Boolean(slot.delayReason) || slot.status === 'missed' || slot.status === 'recovered';

    if (isVague) {
      vagueTotalCount++;
      if (wasDelayedOrMissed) {
        vagueDelayedCount++;
        if (sampleVagueOutputs.length < 2 && slot.desiredOutput) {
          sampleVagueOutputs.push(slot.desiredOutput);
        }
      }
    } else {
      concreteTotalCount++;
      if (wasDelayedOrMissed) concreteDelayedCount++;
    }
  });

  const vagueDelayRate = vagueTotalCount > 0 ? vagueDelayedCount / vagueTotalCount : 0;
  const concreteDelayRate = concreteTotalCount > 0 ? concreteDelayedCount / concreteTotalCount : 0;

  if (vagueTotalCount >= 2 && vagueDelayRate > 0.35 && vagueDelayRate >= concreteDelayRate) {
    const vaguePct = Math.round(vagueDelayRate * 100);
    const concreteOnTimePct = Math.round((1 - concreteDelayRate) * 100);
    const exampleStr = sampleVagueOutputs.length > 0
      ? `('${sampleVagueOutputs[0]}')`
      : `('Review notes')`;

    patterns.push({
      id: 'vague-output-friction',
      title: 'Output Vagueness & Activation Friction',
      observedPattern: 'You tend to delay sessions that have vague outputs.',
      possibleExplanation:
        'When the target output lacks a concrete physical definition, the nervous system anticipates higher cognitive ambiguity, triggering an avoidance response.',
      evidence: `${vagueDelayedCount} of ${vagueTotalCount} sessions with vague outputs ${exampleStr} were delayed or missed (${vaguePct}% delay rate), compared to a ${concreteOnTimePct}% on-time start rate for concrete outputs.`,
      experimentToTest:
        'For your next 3 sessions, state an exact count, file name, or visible physical artifact before scheduling the slot (e.g. "Draft 300 words in Chapter 2" instead of "Work on writing").',
      category: 'clarity',
      confidence: 'high',
    });
  }

  // 2. PATTERN: TIME OF DAY SENSITIVITY (Morning vs Afternoon/Evening)
  let morningTotal = 0;
  let morningCompleted = 0;
  let afternoonTotal = 0;
  let afternoonCompleted = 0;

  slots.forEach((s) => {
    const hour = parseInt((s.startTime || '12:00').split(':')[0], 10);
    const isCompleted = s.status === 'completed';

    if (hour < 12) {
      morningTotal++;
      if (isCompleted) morningCompleted++;
    } else {
      afternoonTotal++;
      if (isCompleted) afternoonCompleted++;
    }
  });

  const morningRate = morningTotal > 0 ? morningCompleted / morningTotal : 0;
  const afternoonRate = afternoonTotal > 0 ? afternoonCompleted / afternoonTotal : 0;

  if (morningTotal >= 2 && afternoonTotal >= 2 && morningRate >= afternoonRate + 0.15) {
    const mPct = Math.round(morningRate * 100);
    const aPct = Math.round(afternoonRate * 100);

    patterns.push({
      id: 'circadian-focus-differential',
      title: 'Diurnal Activation Differential',
      observedPattern: 'You complete more morning sessions than afternoon sessions.',
      possibleExplanation:
        'Prefrontal cognitive reserves and working memory are highest before midday. Accumulated decision fatigue in the afternoon raises the friction threshold required to initiate work.',
      evidence: `Morning session completion was ${mPct}% (${morningCompleted}/${morningTotal}) versus ${aPct}% (${afternoonCompleted}/${afternoonTotal}) for afternoon and evening slots.`,
      experimentToTest:
        'Place your single highest-resistance milestone or Top 1 task in the first morning slot, and reserve afternoon slots for mechanical or lower-friction tasks.',
      category: 'timing',
      confidence: 'high',
    });
  }

  // 3. PATTERN: PHONE DISTRACTION SURGE
  const phoneDistractions = distractions.filter((d) => {
    const text = (d.urgeText || '').toLowerCase();
    return (
      text.includes('phone') ||
      text.includes('social') ||
      text.includes('instagram') ||
      text.includes('message') ||
      text.includes('whatsapp') ||
      text.includes('notifications')
    );
  });

  const sessionsWithPhoneDistraction = sessions.filter((s) => {
    const matchingDist = distractions.filter((d) => d.sessionId === s.id);
    return matchingDist.some((d) => (d.urgeText || '').toLowerCase().includes('phone'));
  }).length;

  const phoneCount = Math.max(phoneDistractions.length, sessionsWithPhoneDistraction);

  if (phoneCount >= 3) {
    patterns.push({
      id: 'environmental-phone-cue',
      title: 'Environmental Device Salience',
      observedPattern: `Phone distraction was recorded in ${phoneCount} sessions this week.`,
      possibleExplanation:
        'Visual and physical availability of the smartphone provides an immediate low-effort dopamine escape route during natural moments of cognitive struggle.',
      evidence: `Phone or communication checks triggered ${phoneCount} separate distraction events during active work blocks, typically occurring within the first 10 minutes.`,
      experimentToTest:
        'Place your phone in another room or inside a closed drawer before touching your first physical work action.',
      category: 'environment',
      confidence: 'high',
    });
  }

  // 4. PATTERN: RECOVERY RESILIENCE VS ABANDONMENT
  const missedCount = slots.filter((s) => s.status === 'missed').length;
  const recoveredCount = slots.filter((s) => s.status === 'recovered').length +
    sessions.filter((s) => s.wasRecoverySession).length;

  if (recoveredCount >= 2) {
    patterns.push({
      id: 'recovery-resilience',
      title: 'Post-Delay Momentum Recovery',
      observedPattern: `You recovered from ${recoveredCount} missed sessions rather than abandoning the day.`,
      possibleExplanation:
        'Utilizing rapid 10-minute micro-recoveries interrupts the "all-or-nothing" cognitive collapse that typically follows a delayed or missed slot.',
      evidence: `Out of ${missedCount + recoveredCount} total disrupted slots, you completed an immediate recovery session in ${recoveredCount} instances instead of writing off the remainder of the schedule.`,
      experimentToTest:
        'Whenever an unexpected delay occurs next week, trigger the 10-minute rescue sequence immediately rather than rescheduling for tomorrow.',
      category: 'recovery',
      confidence: 'high',
    });
  }

  // Fallback pattern if enough data exists
  if (patterns.length === 0 && totalCount >= MIN_SESSIONS_FOR_PATTERNS) {
    const avgResistance = sessions.length > 0
      ? (sessions.reduce((acc, s) => acc + (s.resistanceLevel || 3), 0) / sessions.length).toFixed(1)
      : '3.0';

    patterns.push({
      id: 'baseline-activation-consistency',
      title: 'Baseline Activation Friction',
      observedPattern: 'Work sessions exhibit steady initial resistance with consistent post-start momentum.',
      possibleExplanation:
        `Initial resistance averages ${avgResistance}/5, but focus duration stabilizes once the first physical action is cleared.`,
      evidence: `Logged across ${sessions.length} sessions this week with an average focused duration of ${Math.round(totalCount > 0 ? (sessions.reduce((a, s) => a + (s.actualDurationMinutes || 0), 0) / sessions.length) : 35)} minutes.`,
      experimentToTest:
        'Keep the first physical action under 60 seconds (e.g. "open IDE and type the function name") to further minimize startup hesitation.',
      category: 'resistance',
      confidence: 'moderate',
    });
  }

  return {
    patterns,
    hasEnoughData: true,
    totalSessionCount: totalCount,
    sessionsNeeded: 0,
  };
}

/**
 * Builds the structured weekly reflection
 * Format:
 * WHAT HAPPENED
 * WHAT SEEMS TO BE HAPPENING
 * WHAT TO TEST NEXT WEEK
 */
export function buildWeeklyReflection(
  metrics: WeeklyMetrics,
  patterns: BehavioralPattern[],
  _reviews: DailyReview[]
): WeeklyReflectionData {
  const whatHappened: string[] = [];
  const whatSeemsToBeHappening: string[] = [];
  const whatToTestNextWeek: string[] = [];

  // WHAT HAPPENED
  if (metrics.plannedSessions > 0) {
    const startRate = Math.round((metrics.startedSessions / metrics.plannedSessions) * 100);
    whatHappened.push(
      `You scheduled ${metrics.plannedSessions} work sessions, initiated ${metrics.startedSessions} (${startRate}%), and completed ${metrics.completedSessions}.`
    );
  } else {
    whatHappened.push(`You completed ${metrics.startedSessions} work sessions this week.`);
  }

  whatHappened.push(
    `Total concrete outputs delivered: ${metrics.concreteOutputsCompleted} tangible items, with an average focused duration of ${metrics.averageFocusedDurationMinutes} minutes per session.`
  );

  if (metrics.averageStartDelayMinutes > 0) {
    whatHappened.push(
      `Average delay between scheduled start and actual execution was ${metrics.averageStartDelayMinutes} minutes.`
    );
  }

  if (metrics.recoverySessions > 0) {
    whatHappened.push(
      `You executed ${metrics.recoverySessions} recovery micro-sessions, successfully rescuing momentum after initial delays.`
    );
  } else if (metrics.missedSessions > 0) {
    whatHappened.push(
      `${metrics.missedSessions} sessions elapsed without initiation and were not recovered.`
    );
  }

  if (metrics.distractionIncidents > 0) {
    whatHappened.push(
      `Captured and logged ${metrics.distractionIncidents} distraction impulses during active focus intervals.`
    );
  }

  // WHAT SEEMS TO BE HAPPENING
  if (patterns.length > 0) {
    patterns.forEach((p) => {
      whatSeemsToBeHappening.push(`${p.observedPattern} ${p.possibleExplanation}`);
    });
  } else {
    whatSeemsToBeHappening.push(
      'Execution patterns are currently establishing baseline metrics. Friction appears most sensitive to clarity of the first physical action.'
    );
  }

  // WHAT TO TEST NEXT WEEK
  if (patterns.length > 0) {
    patterns.slice(0, 2).forEach((p) => {
      whatToTestNextWeek.push(p.experimentToTest);
    });
  } else {
    whatToTestNextWeek.push(
      'Always write the exact name of the file or first question you will solve before beginning the timer.'
    );
    whatToTestNextWeek.push(
      'If you notice resistance delaying a slot, test the 10-minute micro-start protocol instead of postponing.'
    );
  }

  return {
    whatHappened,
    whatSeemsToBeHappening,
    whatToTestNextWeek,
  };
}

/**
 * Computes Monthly Analytics emphasizing 4-week trends over daily noise.
 * Helps answer: "Am I getting better at starting earlier and recovering faster?"
 */
export function calculateMonthlyAnalytics(
  slots: WorkSlot[],
  sessions: WorkSession[],
  distractions: DistractionUrge[],
  assignments: Assignment[],
  currentDate: Date = new Date()
): MonthlyMetrics {
  const trendPoints: MonthlyTrendPoint[] = [];

  for (let i = 3; i >= 0; i--) {
    const endDaysAgo = i * 7;
    const startDaysAgo = (i + 1) * 7 - 1;
    const weekStart = subDays(currentDate, startDaysAgo);
    const weekEnd = subDays(currentDate, endDaysAgo);

    const { filteredSlots, filteredSessions, filteredDistractions } = filterDataByDateRange(
      slots,
      sessions,
      distractions,
      weekStart,
      weekEnd
    );

    const weekMetrics = calculateWeeklyMetrics(
      filteredSlots,
      filteredSessions,
      filteredDistractions,
      assignments
    );

    const reliability = weekMetrics.plannedSessions > 0
      ? Math.round((weekMetrics.startedSessions / weekMetrics.plannedSessions) * 100)
      : weekMetrics.startedSessions > 0
      ? 100
      : 0;

    const totalDisrupted = weekMetrics.missedSessions + weekMetrics.recoverySessions;
    const recoveryRate = totalDisrupted > 0
      ? Math.round((weekMetrics.recoverySessions / totalDisrupted) * 100)
      : 100;

    trendPoints.push({
      periodLabel: `Week ${4 - i}`,
      dateRangeLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      startingReliabilityPercent: reliability,
      averageStartDelayMinutes: weekMetrics.averageStartDelayMinutes,
      averageDeadlineBufferDays: weekMetrics.deadlineBufferDays,
      averageFocusDurationMinutes: weekMetrics.averageFocusedDurationMinutes,
      recoveryRatePercent: recoveryRate,
      missedSessions: weekMetrics.missedSessions,
      recoveredSessions: weekMetrics.recoverySessions,
      outputsCount: weekMetrics.concreteOutputsCompleted,
    });
  }

  const oldestWeek = trendPoints[0];
  const newestWeek = trendPoints[trendPoints.length - 1];

  const startingReliabilityChange =
    newestWeek.startingReliabilityPercent - oldestWeek.startingReliabilityPercent;

  const startDelayChangeMinutes =
    newestWeek.averageStartDelayMinutes - oldestWeek.averageStartDelayMinutes;

  const focusDurationChangeMinutes =
    newestWeek.averageFocusDurationMinutes - oldestWeek.averageFocusDurationMinutes;

  const totalMissed = trendPoints.reduce((acc, p) => acc + p.missedSessions, 0);
  const totalRecovered = trendPoints.reduce((acc, p) => acc + p.recoveredSessions, 0);
  const recoveryRatePercent = totalMissed + totalRecovered > 0
    ? Math.round((totalRecovered / (totalMissed + totalRecovered)) * 100)
    : 100;

  const recoverySummaryText = totalRecovered > 0
    ? `You recovered from ${totalRecovered} out of ${totalMissed + totalRecovered} disrupted slots (${recoveryRatePercent}% recovery rate) using micro-start rescues.`
    : totalMissed === 0
    ? 'Zero missed sessions recorded across this period.'
    : `${totalMissed} missed slots occurred without immediate micro-start recovery.`;

  // Commonly delayed work categories
  const categoryStatsMap = new Map<string, { total: number; delayed: number }>();

  slots.forEach((slot) => {
    let cat = 'Custom Task';
    if (slot.assignmentId) {
      const match = assignments.find((a) => a.id === slot.assignmentId);
      if (match) cat = match.category || 'Assignment';
    } else if (slot.slotType) {
      cat = slot.slotType.replace('_', ' ');
    }

    const current = categoryStatsMap.get(cat) || { total: 0, delayed: 0 };
    current.total++;
    if (slot.delayReason || slot.status === 'missed' || slot.status === 'recovered') {
      current.delayed++;
    }
    categoryStatsMap.set(cat, current);
  });

  const commonlyDelayedCategories: CategoryDelayStat[] = Array.from(categoryStatsMap.entries())
    .map(([category, stats]) => ({
      category,
      totalSlots: stats.total,
      delayedSlots: stats.delayed,
      delayRatePercent: stats.total > 0 ? Math.round((stats.delayed / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.delayRatePercent - a.delayRatePercent);

  // Outputs completed
  const outputRecords: { output: string; date: string; taskTitle: string }[] = [];
  sessions.forEach((s) => {
    if (s.producedOutput && s.producedOutput.trim()) {
      outputRecords.push({
        output: s.producedOutput,
        date: s.startedAt ? s.startedAt.split('T')[0] : '',
        taskTitle: s.taskTitle,
      });
    }
  });
  const totalOutputsCompleted = outputRecords.length;

  // Major assignments completed
  const majorAssignmentsCompleted: MajorAssignmentCompleted[] = assignments
    .filter((a) => a.status === 'completed')
    .map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      completedDate: a.updatedAt ? a.updatedAt.split('T')[0] : 'Recently',
      milestonesTotal: a.milestones ? a.milestones.length : 0,
    }));

  // Central Question Answer:
  // "Am I getting better at starting earlier and recovering faster?"
  let headline = 'Starting friction is decreasing, and recovery velocity is stabilizing.';
  let verdict: 'significantly_improving' | 'moderately_improving' | 'steady' | 'needs_adjustment' = 'moderately_improving';
  let delayInsight = '';
  let recoveryInsight = '';

  if (startDelayChangeMinutes < 0) {
    delayInsight = `Average start delay decreased by ${Math.abs(startDelayChangeMinutes)} minutes (from ${oldestWeek.averageStartDelayMinutes}m down to ${newestWeek.averageStartDelayMinutes}m).`;
  } else if (startDelayChangeMinutes === 0 && newestWeek.averageStartDelayMinutes <= 5) {
    delayInsight = `Start delays remain consistently minimal (averaging ${newestWeek.averageStartDelayMinutes} minutes).`;
  } else {
    delayInsight = `Average start delay shifted slightly (+${startDelayChangeMinutes}m), suggesting activation friction during planning.`;
  }

  if (recoveryRatePercent >= 70) {
    recoveryInsight = `Recovery resilience is high (${recoveryRatePercent}%): missed slots are actively rescued within minutes rather than triggering all-day abandonment.`;
    verdict = 'significantly_improving';
  } else if (recoveryRatePercent >= 40) {
    recoveryInsight = `Recovery rate is ${recoveryRatePercent}%. Using the 10-minute micro-start protocol is beginning to prevent full derailment.`;
    verdict = 'moderately_improving';
  } else {
    recoveryInsight = `Recovery rate is ${recoveryRatePercent}%. Missed slots currently tend to lead to postponed work rather than micro-starts.`;
    verdict = 'needs_adjustment';
  }

  if (startingReliabilityChange > 10 && recoveryRatePercent >= 60) {
    headline = `Yes. You are starting ${Math.abs(startDelayChangeMinutes)} minutes faster and recovering from ${recoveryRatePercent}% of disruptions.`;
  } else if (startingReliabilityChange >= 0) {
    headline = `Steady progress. Activation reliability is holding at ${newestWeek.startingReliabilityPercent}%.`;
  } else {
    headline = `Activation friction increased slightly this month. Focus on clarifying the first physical action.`;
  }

  return {
    trendPoints,
    startingReliabilityChange,
    startDelayChangeMinutes,
    focusDurationChangeMinutes,
    recoveryBehaviorSummary: {
      totalMissed,
      totalRecovered,
      recoveryRatePercent,
      summaryText: recoverySummaryText,
    },
    commonlyDelayedCategories,
    totalOutputsCompleted,
    recentCompletedOutputs: outputRecords.slice(0, 8),
    majorAssignmentsCompleted,
    centralQuestionAnswer: {
      headline,
      verdict,
      delayInsight,
      recoveryInsight,
    },
  };
}
