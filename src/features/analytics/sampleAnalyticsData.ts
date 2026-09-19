import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  Assignment,
  DailyReview,
} from '../../types/models.ts';
import { subDays, format } from 'date-fns';

/**
 * Generates realistic anti-procrastination behavioral data across 4 weeks.
 * Designed to demonstrate the exact patterns:
 * 1. Vague outputs causing delay triggers.
 * 2. Higher morning completion than afternoon.
 * 3. Phone distractions captured during active focus.
 * 4. Micro-start recovery from missed slots.
 */
export function generateSampleAnalyticsData(): {
  slots: WorkSlot[];
  sessions: WorkSession[];
  distractions: DistractionUrge[];
  assignments: Assignment[];
  reviews: DailyReview[];
} {
  const now = new Date();
  const slots: WorkSlot[] = [];
  const sessions: WorkSession[] = [];
  const distractions: DistractionUrge[] = [];
  const assignments: Assignment[] = [];
  const reviews: DailyReview[] = [];

  // 1. Assignments
  const cvProject: Assignment = {
    id: 'asg-sample-1',
    title: 'Computer Vision 3D Reconstruction',
    category: 'Technical / Coding',
    description: 'Structure from Motion and Epipolar Geometry pipeline in Python.',
    deadline: format(subDays(now, -12), 'yyyy-MM-dd'),
    estimatedTotalHours: 24,
    importance: 'critical',
    status: 'in_progress',
    progressPercent: 65,
    createdAt: format(subDays(now, 26), 'yyyy-MM-dd'),
    updatedAt: format(subDays(now, 1), 'yyyy-MM-dd'),
    nextAction: 'Write epipolar constraint test for matched keypoints',
    milestones: [
      { id: 'm1', assignmentId: 'asg-sample-1', title: '1. Feature Extraction', intendedOutput: 'SIFT keypoints visualizer', sequence: 1, estimatedHours: 4, status: 'completed', nextAction: 'Done' },
      { id: 'm2', assignmentId: 'asg-sample-1', title: '2. Epipolar Geometry', intendedOutput: 'Fundamental matrix computed', sequence: 2, estimatedHours: 6, status: 'in_progress', nextAction: 'Write unit test' },
      { id: 'm3', assignmentId: 'asg-sample-1', title: '3. Triangulation & Cloud', intendedOutput: 'PLY point cloud mesh', sequence: 3, estimatedHours: 8, status: 'not_started', nextAction: 'Setup 3D viewport' },
    ],
  };

  const researchPaper: Assignment = {
    id: 'asg-sample-2',
    title: 'Ethics of Autonomous Systems Paper',
    category: 'Writing / Academic',
    description: 'Literature review and policy paper for cognitive safety.',
    deadline: format(subDays(now, 4), 'yyyy-MM-dd'),
    estimatedTotalHours: 14,
    importance: 'high',
    status: 'completed',
    progressPercent: 100,
    createdAt: format(subDays(now, 28), 'yyyy-MM-dd'),
    updatedAt: format(subDays(now, 5), 'yyyy-MM-dd'),
    nextAction: 'Completed and submitted',
    milestones: [
      { id: 'm4', assignmentId: 'asg-sample-2', title: '1. Annotated Bibliography', intendedOutput: '10 paper summaries', sequence: 1, estimatedHours: 4, status: 'completed', nextAction: 'Done' },
      { id: 'm5', assignmentId: 'asg-sample-2', title: '2. Section 3 Draft', intendedOutput: '1500 words draft', sequence: 2, estimatedHours: 6, status: 'completed', nextAction: 'Done' },
      { id: 'm6', assignmentId: 'asg-sample-2', title: '3. Final Proofread & Turnitin', intendedOutput: 'PDF submission receipt', sequence: 3, estimatedHours: 2, status: 'completed', nextAction: 'Done' },
    ],
  };

  assignments.push(cvProject, researchPaper);

  // Generate 28 days of behavioral slots and sessions
  // Simulating clear improvement:
  // Week 1 (28-22 days ago): high start delay (~22 min), lower reliability (55%), lower recovery (40%)
  // Week 2 (21-15 days ago): moderate start delay (~14 min), reliability (68%), recovery (60%)
  // Week 3 (14-8 days ago): improving delay (~8 min), reliability (78%), recovery (75%)
  // Week 4 (7-0 days ago): tight start delay (~4 min), reliability (86%), recovery (85%)

  for (let daysAgo = 27; daysAgo >= 0; daysAgo--) {
    const slotDate = subDays(now, daysAgo);
    const dateStr = format(slotDate, 'yyyy-MM-dd');
    const weekIndex = Math.floor((27 - daysAgo) / 7); // 0, 1, 2, 3

    // Determine day properties
    const isWeekend = slotDate.getDay() === 0 || slotDate.getDay() === 6;
    const slotsCount = isWeekend ? 1 : 2;

    for (let slotIdx = 0; slotIdx < slotsCount; slotIdx++) {
      const isMorning = slotIdx === 0;
      const startTime = isMorning ? '09:30' : '15:00';
      const endTime = isMorning ? '10:15' : '15:45';
      const duration = 45;

      // In earlier weeks or afternoon slots, intentionally generate vague vs concrete tasks
      const isVague = (weekIndex < 2 && slotIdx === 1) || (slotIdx === 1 && daysAgo % 4 === 0);
      const taskTitle = isMorning
        ? `Computer Vision: Module ${weekIndex + 1}`
        : isVague
        ? 'Work on project'
        : 'Draft Section 2 Analysis';

      const desiredOutput = isVague
        ? 'Review notes'
        : isMorning
        ? `Implement and verify Matrix equation ${slotIdx + 1}`
        : 'Write 400 words on algorithmic alignment';

      const firstPhysicalAction = isVague
        ? 'Think about the topic'
        : 'Open terminal and run pytest test_matrix.py';

      // Status determination reflecting anti-procrastination trend
      let status: 'completed' | 'missed' | 'recovered' | 'in_progress' = 'completed';
      let delayReason: string | undefined = undefined;
      let delayMinutes = 0;

      if (isVague) {
        // Vague outputs frequently trigger delay
        if (daysAgo % 2 === 0) {
          status = 'recovered';
          delayReason = 'Task definition felt too broad; delayed 20 min before 10-min micro-start rescue.';
          delayMinutes = 20;
        } else {
          status = 'missed';
          delayReason = 'Ambiguity in target artifact caused postponement.';
        }
      } else if (!isMorning && weekIndex < 2) {
        // Afternoon slots in earlier weeks were more prone to delays
        status = daysAgo % 3 === 0 ? 'recovered' : 'completed';
        delayMinutes = 12;
      } else {
        // Morning concrete slots start on time
        status = 'completed';
        delayMinutes = Math.max(0, 8 - weekIndex * 2);
      }

      const slotId = `slot-${daysAgo}-${slotIdx}`;
      const slot: WorkSlot = {
        id: slotId,
        date: dateStr,
        startTime,
        endTime,
        taskTitle,
        desiredOutput,
        firstPhysicalAction,
        estimatedDurationMinutes: duration,
        status,
        delayReason,
        assignmentId: isMorning ? cvProject.id : researchPaper.id,
      };
      slots.push(slot);

      // Create session if started
      if (status === 'completed' || status === 'recovered') {
        const sessionId = `sess-${daysAgo}-${slotIdx}`;
        const startedIso = `${dateStr}T${startTime}:00`;
        const actualMinutes = status === 'recovered' ? 15 : duration - (delayMinutes > 5 ? 5 : 0);

        const session: WorkSession = {
          id: sessionId,
          workSlotId: slotId,
          assignmentId: slot.assignmentId,
          taskTitle,
          actualDurationMinutes: Math.max(10, actualMinutes),
          targetDurationMinutes: duration,
          resistanceLevel: isVague ? 4 : isMorning ? 2 : 3,
          energyLevel: isMorning ? 4 : 3,
          phoneOutsideReach: weekIndex >= 2,
          producedOutput: status === 'completed' ? desiredOutput : '10-minute micro-start rescue outline completed',
          distractionsCapturedCount: isVague || weekIndex < 2 ? 2 : 0,
          delayReason,
          startedAt: startedIso,
          wasRecoverySession: status === 'recovered',
          isOutputComplete: status === 'completed' ? 'complete' : 'partial',
        };
        sessions.push(session);

        // Record phone distraction events in week 4 and earlier to demonstrate pattern
        if (weekIndex === 3 && (daysAgo === 1 || daysAgo === 3 || daysAgo === 5 || daysAgo === 6)) {
          distractions.push({
            id: `dist-${daysAgo}-${slotIdx}-phone`,
            sessionId,
            urgeText: 'Phone check (WhatsApp / notification impulse)',
            timestamp: `${dateStr}T${startTime}:12`,
            returnedToWork: true,
          });
        }
      }
    }
  }

  return { slots, sessions, distractions, assignments, reviews };
}
