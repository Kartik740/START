import { parseISO, differenceInCalendarDays, isToday, isTomorrow, format, isPast } from 'date-fns';
import { Assignment, WorkSlot, AssignmentBufferInfo } from '../../types/models.ts';
import { getTodayString } from '../../utils/dates.ts';

export function calculateAssignmentBuffer(
  assignment: Assignment,
  allSlots: WorkSlot[]
): AssignmentBufferInfo {
  const deadline = parseISO(assignment.deadline);
  const now = new Date();
  const todayStr = getTodayString();
  const daysRemaining = differenceInCalendarDays(deadline, now);
  const isPastDue = isPast(deadline) && !isToday(deadline);
  const isUrgent = daysRemaining <= 3 && !isPastDue;

  const incompleteMilestones = assignment.milestones.filter((m) => m.status !== 'completed');
  const milestonesRemaining = incompleteMilestones.length;
  const milestonesTotal = assignment.milestones.length;

  // Find linked slots
  const linkedSlots = allSlots.filter(
    (s) => s.assignmentId === assignment.id || s.taskTitle.toLowerCase().includes(assignment.title.toLowerCase())
  );

  // Split into past/today and upcoming
  const pastSlots = linkedSlots
    .filter((s) => s.date < todayStr || (s.date === todayStr && s.status === 'completed'))
    .sort((a, b) => (a.date + a.startTime > b.date + b.startTime ? -1 : 1));

  const upcomingSlots = linkedSlots
    .filter((s) => s.date > todayStr || (s.date === todayStr && s.status !== 'completed'))
    .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1));

  let lastPlannedSessionDate: string | undefined;
  if (pastSlots.length > 0) {
    const last = pastSlots[0];
    lastPlannedSessionDate = isToday(parseISO(last.date))
      ? `Today at ${last.startTime}`
      : `${format(parseISO(last.date), 'EEE, MMM d')} at ${last.startTime}`;
  }

  let nextPlannedSessionDate: string | undefined;
  if (upcomingSlots.length > 0) {
    const next = upcomingSlots[0];
    if (isToday(parseISO(next.date))) {
      nextPlannedSessionDate = `Today at ${next.startTime}`;
    } else if (isTomorrow(parseISO(next.date))) {
      nextPlannedSessionDate = `Tomorrow at ${next.startTime}`;
    } else {
      nextPlannedSessionDate = `${format(parseISO(next.date), 'EEE, MMM d')} at ${next.startTime}`;
    }
  }

  const hasUpcomingSession = Boolean(upcomingSlots.length > 0);

  // Behavioral warning formulation
  let behavioralWarning: string | undefined;
  if (assignment.status !== 'completed' && assignment.status !== 'archived') {
    if (isPastDue) {
      behavioralWarning = `Deadline passed ${Math.abs(daysRemaining)} days ago. Start a 10-minute recovery session to assess remaining scope.`;
    } else if (!hasUpcomingSession && milestonesRemaining > 0) {
      const deadlineDayName = format(deadline, 'EEEE, MMM d');
      behavioralWarning = `You have a deadline on ${deadlineDayName}, but no upcoming work sessions are scheduled.`;
    } else if (upcomingSlots.length > 0) {
      const nextDate = parseISO(upcomingSlots[0].date);
      const daysUntilNextSession = differenceInCalendarDays(nextDate, now);
      if (daysRemaining <= 4 && daysUntilNextSession >= 2) {
        const deadlineDayName = format(deadline, 'EEEE');
        const nextSessionDayName = format(nextDate, 'EEEE');
        behavioralWarning = `You have a deadline on ${deadlineDayName}, but no work is scheduled before ${nextSessionDayName}.`;
      }
    }
  }

  return {
    assignmentId: assignment.id,
    daysRemaining,
    isPastDue,
    isUrgent,
    milestonesRemaining,
    milestonesTotal,
    lastPlannedSessionDate,
    nextPlannedSessionDate,
    hasUpcomingSession,
    behavioralWarning,
  };
}
