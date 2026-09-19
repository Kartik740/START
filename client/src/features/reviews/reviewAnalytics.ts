import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  ReviewFactualSummary,
  ProcrastinationEventRecord,
  TomorrowPriorityAction,
  TimelineItem,
} from '../../types/models.ts';
import { getTodayString } from '../../utils/dates.ts';

/**
 * Computes factual performance summary for today.
 * Strictly empirical tallies. No gamified productivity scores.
 */
export function calculateDailyFactualSummary(
  slots: WorkSlot[],
  sessions: WorkSession[],
  distractions: DistractionUrge[],
  todayDate: string = getTodayString()
): ReviewFactualSummary {
  const todaySlots = slots.filter((s) => s.date === todayDate);
  const todaySessions = sessions.filter((s) => {
    const sDate = s.startedAt ? s.startedAt.split('T')[0] : '';
    return sDate === todayDate;
  });

  const plannedSessions = todaySlots.length;
  
  // Slots that had actual work started or completed
  const startedSlotIds = new Set<string>();
  todaySlots.forEach((s) => {
    if (s.status === 'in_progress' || s.status === 'completed') {
      startedSlotIds.add(s.id);
    }
  });
  todaySessions.forEach((sess) => {
    if (sess.workSlotId) startedSlotIds.add(sess.workSlotId);
  });
  const startedSessions = startedSlotIds.size;

  const completedSessions = todaySlots.filter((s) => s.status === 'completed').length;

  const focusTimeMinutes = todaySessions.reduce(
    (acc, s) => acc + (s.actualDurationMinutes || 0),
    0
  );

  // Delayed starts check
  let delayedStarts = 0;
  todaySlots.forEach((s) => {
    if (s.delayReason) {
      delayedStarts++;
    }
  });

  // Distractions recorded today
  const todayDistractions = distractions.filter((d) => {
    const dDate = d.timestamp ? d.timestamp.split('T')[0] : '';
    return dDate === todayDate;
  });
  const distractionEvents = Math.max(
    todayDistractions.length,
    todaySessions.reduce((acc, s) => acc + (s.distractionsCapturedCount || 0), 0)
  );

  const tasksCompleted = todaySessions.filter(
    (s) => s.isOutputComplete === 'complete'
  ).length || completedSessions;

  return {
    plannedSessions,
    startedSessions,
    completedSessions,
    focusTimeMinutes,
    delayedStarts,
    distractionEvents,
    tasksCompleted,
  };
}

/**
 * Detects observable friction events from today's execution.
 */
export function detectFrictionEvents(
  slots: WorkSlot[],
  sessions: WorkSession[],
  _distractions: DistractionUrge[],
  todayDate: string = getTodayString()
): ProcrastinationEventRecord[] {
  const events: ProcrastinationEventRecord[] = [];
  const todaySlots = slots.filter((s) => s.date === todayDate);
  const todaySessions = sessions.filter((s) => {
    const sDate = s.startedAt ? s.startedAt.split('T')[0] : '';
    return sDate === todayDate;
  });

  // 1. Missed slots
  todaySlots.forEach((slot) => {
    if (slot.status === 'missed') {
      events.push({
        slotTitle: slot.taskTitle,
        eventType: 'missed',
        reason: slot.delayReason || 'Scheduled window elapsed without starting',
      });
    } else if (slot.status === 'planned') {
      const now = new Date();
      const [endH, endM] = (slot.endTime || '23:59').split(':').map(Number);
      if (
        endH !== undefined &&
        (now.getHours() > endH || (now.getHours() === endH && now.getMinutes() > endM))
      ) {
        events.push({
          slotTitle: slot.taskTitle,
          eventType: 'missed',
          reason: 'Time window elapsed without starting',
        });
      }
    }
  });

  // 2. Delayed starts
  todaySlots.forEach((slot) => {
    if (slot.delayReason) {
      events.push({
        slotTitle: slot.taskTitle,
        eventType: 'delayed_start',
        reason: slot.delayReason,
      });
    }
  });

  // 3. Early exits
  todaySessions.forEach((sess) => {
    if (sess.earlyTermination) {
      events.push({
        slotTitle: sess.taskTitle,
        eventType: 'early_exit',
        reason: `Terminated early after ${sess.actualDurationMinutes}m (Resistance level: ${sess.resistanceLevel}/5)`,
      });
    }
  });

  // 4. Repeated distraction events
  todaySessions.forEach((sess) => {
    if (sess.distractionsCapturedCount >= 2) {
      events.push({
        slotTitle: sess.taskTitle,
        eventType: 'distraction_surge',
        reason: `${sess.distractionsCapturedCount} impulses resisted during this single work window`,
      });
    }
  });

  return events;
}

/**
 * Generates an empirical, data-based reflection.
 * Strictly factual observations based on recorded numbers.
 */
export function generateDataBasedReflection(
  summary: ReviewFactualSummary,
  frictionEvents: ProcrastinationEventRecord[],
  _slots: WorkSlot[],
  sessions: WorkSession[]
): string {
  if (summary.plannedSessions === 0 && summary.focusTimeMinutes === 0) {
    return 'No planned work slots or focus sessions were recorded today. Preparing tomorrow at night creates the initial momentum.';
  }

  const missedCount = frictionEvents.filter((e) => e.eventType === 'missed').length;
  const earlyExitCount = frictionEvents.filter((e) => e.eventType === 'early_exit').length;
  const highResistanceSessions = sessions.filter((s) => s.resistanceLevel >= 4).length;

  if (summary.plannedSessions > 0 && summary.completedSessions === summary.plannedSessions) {
    return `You completed all ${summary.plannedSessions} planned sessions today, accumulating ${summary.focusTimeMinutes} minutes of focused execution with concrete outputs.`;
  }

  if (missedCount > 0) {
    return `You completed ${summary.completedSessions} of ${summary.plannedSessions} planned sessions. The ${missedCount} missed slot(s) occurred when execution met friction before the first physical action was taken.`;
  }

  if (earlyExitCount > 0) {
    return `You completed ${summary.completedSessions} sessions with ${summary.focusTimeMinutes}m focus time. ${earlyExitCount} session was exited early during high internal resistance (${highResistanceSessions} session(s) rated 4+ resistance).`;
  }

  if (summary.distractionEvents > 0) {
    return `You logged ${summary.distractionEvents} distraction impulse(s) across ${summary.startedSessions} session(s), successfully capturing each urge and preserving ${summary.focusTimeMinutes} minutes of focus time.`;
  }

  return `You logged ${summary.focusTimeMinutes} minutes of total work across ${summary.completedSessions} completed sessions with zero uncaptured distractions.`;
}

/**
 * Generates a clean chronological timeline for tomorrow from the Top 3 priorities.
 */
export function generateTomorrowTimeline(
  top1: TomorrowPriorityAction,
  top2?: TomorrowPriorityAction,
  top3?: TomorrowPriorityAction
): TimelineItem[] {
  const items: TomorrowPriorityAction[] = [top1];
  if (top2 && top2.title.trim()) items.push(top2);
  if (top3 && top3.title.trim()) items.push(top3);

  // Sort by startTime
  items.sort((a, b) => (a.startTime || '10:00').localeCompare(b.startTime || '10:00'));

  const timeline: TimelineItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Check if there's a gap before this item (or between items)
    if (i > 0) {
      const prev = items[i - 1];
      const prevEnd = prev.endTime || '10:00';
      const currStart = item.startTime || '11:00';

      const [pEH, pEM] = prevEnd.split(':').map(Number);
      const [cSH, cSM] = currStart.split(':').map(Number);
      const gapMinutes = (cSH * 60 + cSM) - (pEH * 60 + pEM);

      if (gapMinutes >= 15) {
        timeline.push({
          time: prevEnd,
          title: 'Rest & Cognitive Recovery Buffer',
          isBreak: true,
        });
      }
    }

    timeline.push({
      time: item.startTime,
      title: item.title,
      output: item.desiredOutput,
      isBreak: false,
    });
  }

  return timeline;
}
