import { callGemini, isGeminiConfigured } from './geminiService.ts';
import {
  WorkSlot,
  WorkSession,
  ReviewFactualSummary,
} from '../../types/models.ts';
import { WeeklyMetrics } from '../analytics/analyticsEngine.ts';

// -------------------------------------------------------------
// WORKFLOW 1: TASK DECOMPOSITION
// -------------------------------------------------------------

export interface DecomposedMilestone {
  title: string;
  intendedOutput: string;
  sequence: number;
  estimatedHours: number;
  nextAction: string;
}

export async function aiDecomposeAssignment(input: {
  title: string;
  category?: string;
  description?: string;
}): Promise<DecomposedMilestone[]> {
  const prompt = `
Task to decompose into concrete chronological milestones:
Title: "${input.title}"
Category: "${input.category || 'General'}"
Description: "${input.description || 'None provided'}"

Break this assignment down into 4 to 6 sequential milestones.
Each milestone MUST define:
- title: concise milestone heading
- intendedOutput: what visible, tangible physical artifact will exist (e.g. "5-page outline", "10 annotated papers", "working login endpoint")
- estimatedHours: realistic decimal hours (e.g. 1.5, 2.0)
- nextAction: the smallest physical action to start this milestone (<15 seconds bodily movement)

Return ONLY a JSON array of objects with keys: title, intendedOutput, sequence (0-indexed integer), estimatedHours (number), nextAction.
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.2,
        systemPrompt: 'Return only valid JSON array of milestones. Each milestone must have visible proof of completion and a <15s physical next action.',
      });
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m, idx) => ({
          title: String(m.title || `Milestone ${idx + 1}`),
          intendedOutput: String(m.intendedOutput || 'Concrete draft artifact'),
          sequence: idx,
          estimatedHours: Number(m.estimatedHours) || 2,
          nextAction: String(m.nextAction || 'Open working document'),
        }));
      }
    } catch (err) {
      console.warn('Gemini decomposition failed, falling back to local reasoning:', err);
    }
  }

  // Deterministic Local Fallback
  const titleLower = input.title.toLowerCase();
  const isCoding = titleLower.includes('code') || titleLower.includes('project') || titleLower.includes('app') || titleLower.includes('pipeline');
  const isWriting = titleLower.includes('paper') || titleLower.includes('essay') || titleLower.includes('thesis') || titleLower.includes('report');

  if (isWriting) {
    return [
      { sequence: 0, title: '1. Literature Discovery & Outline', intendedOutput: '1-page bulleted structural outline with 5 core citations', estimatedHours: 2.5, nextAction: 'Open Zotero and download Paper #1' },
      { sequence: 1, title: '2. Methodology & Argument Structure', intendedOutput: 'Drafted Section 2 (700 words)', estimatedHours: 3.0, nextAction: 'Create paper_draft.docx and type section headings' },
      { sequence: 2, title: '3. Core Findings / Body Sections', intendedOutput: '1500 words of substantive text across body chapters', estimatedHours: 4.0, nextAction: 'Open page 4 and write the topic sentence of paragraph 1' },
      { sequence: 3, title: '4. Critical Editing & Citations', intendedOutput: 'Formatted bibliography and checked grading rubric', estimatedHours: 2.0, nextAction: 'Run spellcheck and check margin guidelines' },
      { sequence: 4, title: '5. Submission Confirmation', intendedOutput: 'Exported PDF and saved upload receipt screenshot', estimatedHours: 0.5, nextAction: 'Open submission portal in browser' },
    ];
  }

  if (isCoding) {
    return [
      { sequence: 0, title: '1. Architecture & Spec', intendedOutput: 'Written 1-page requirements doc and data schema', estimatedHours: 1.5, nextAction: 'Open editor and create README.md' },
      { sequence: 1, title: '2. Environment & Boilerplate', intendedOutput: 'Passing smoke test on blank project repository', estimatedHours: 2.0, nextAction: 'Run git init in terminal' },
      { sequence: 2, title: '3. Core Implementation', intendedOutput: 'Core module implemented with 3 working unit tests', estimatedHours: 4.5, nextAction: 'Write the first function signature in main file' },
      { sequence: 3, title: '4. Integration & Edge Cases', intendedOutput: 'Integration test suite passing green', estimatedHours: 2.5, nextAction: 'Run test command in terminal' },
      { sequence: 4, title: '5. Documentation & Packaging', intendedOutput: 'Clean README with setup instructions and demo screenshot', estimatedHours: 1.0, nextAction: 'Write usage command block in docs' },
    ];
  }

  return [
    { sequence: 0, title: '1. Understand Requirements', intendedOutput: 'Written 1-page list of deliverables and constraints', estimatedHours: 1.0, nextAction: 'Open syllabus/prompt and highlight mandatory requirements' },
    { sequence: 1, title: '2. Rough Draft / Baseline', intendedOutput: 'Initial working draft created with zero self-censoring', estimatedHours: 2.5, nextAction: 'Create project folder and write the title line' },
    { sequence: 2, title: '3. Deep Execution', intendedOutput: 'Main content sections completed with verifiable evidence', estimatedHours: 4.0, nextAction: 'Begin executing step 1 of the checklist' },
    { sequence: 3, title: '4. Quality Polish', intendedOutput: 'Passes all criteria of evaluation checklist', estimatedHours: 1.5, nextAction: 'Open verification rubric and verify item 1' },
    { sequence: 4, title: '5. Final Delivery', intendedOutput: 'Submitted file and downloaded receipt', estimatedHours: 0.5, nextAction: 'Open upload portal' },
  ];
}

// -------------------------------------------------------------
// WORKFLOW 2: FIRST ACTION GENERATION
// -------------------------------------------------------------

export async function aiGenerateFirstPhysicalActions(
  taskTitle: string,
  desiredOutput?: string
): Promise<string[]> {
  const prompt = `
Task: "${taskTitle}"
Intended Output: "${desiredOutput || 'Not specified'}"

Generate exactly three distinct first physical actions for this task.
Rules for each action:
- Must be a concrete bodily movement taking less than 15 seconds.
- Must name a specific application, file, physical object, or line.
- Cannot be vague (e.g. reject "think", "study", "work on it", "organize").
- Format as direct command verbs: "Open...", "Create...", "Write...", "Pick up...".

Return ONLY a JSON array containing three strings.
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.2,
      });
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3).map(String);
      }
    } catch (err) {
      console.warn('Gemini first action generation failed, using local fallback:', err);
    }
  }

  // Deterministic Local Fallback
  const lower = taskTitle.toLowerCase();
  if (lower.includes('code') || lower.includes('program') || lower.includes('bug') || lower.includes('api')) {
    return [
      `Open terminal and run tests for "${taskTitle}".`,
      `Open VS Code and write the first function signature.`,
      `Create file main.ts and write a single console log.`,
    ];
  }
  if (lower.includes('write') || lower.includes('paper') || lower.includes('essay') || lower.includes('doc')) {
    return [
      `Open document, type the title heading, and press Enter.`,
      `Open notes and copy the first prompt question onto line 1.`,
      `Open outline and write 3 bullet points for paragraph 1.`,
    ];
  }
  if (lower.includes('read') || lower.includes('study') || lower.includes('chapter')) {
    return [
      `Open PDF to page 1 and highlight the first section heading.`,
      `Open notebook, pick up blue pen, and write today's topic on line 1.`,
      `Place book beside keyboard and open to Chapter 1 summary.`,
    ];
  }

  return [
    `Open the primary application and create a new blank file.`,
    `Open notebook, pick up pen, and write down the single most urgent question.`,
    `Open assignment instructions and read the first paragraph.`,
  ];
}

// -------------------------------------------------------------
// WORKFLOW 3: OBSTACLE PLANNING (IF-THEN CONTINGENCY)
// -------------------------------------------------------------

export interface IfThenPlanResult {
  ifCondition: string;
  thenAction: string;
  fullStatement: string;
  explanation: string;
}

export async function aiGenerateObstaclePlan(
  taskTitle: string,
  obstacle: string
): Promise<IfThenPlanResult> {
  const prompt = `
Task: "${taskTitle}"
Identified Procrastination Obstacle: "${obstacle}"

Formulate an Implementation Intention (Peter Gollwitzer If-Then plan) to neutralize this obstacle.
Requirements:
- IF: The exact trigger moment or bodily sensation of friction (e.g. "If I feel the urge to check notifications", "If I get stuck on equation 2").
- THEN: An immediate, low-effort behavioral command taking <30 seconds (e.g. "Then I will take three deep breaths and write a crude placeholder sentence", "Then I will stand up, drink water, and write one test").
- Explanation: One concise sentence explaining why this interrupts avoidance.

Return ONLY a JSON object with keys: ifCondition, thenAction, explanation.
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.2,
      });
      const parsed = JSON.parse(responseText);
      if (parsed.ifCondition && parsed.thenAction) {
        return {
          ifCondition: parsed.ifCondition,
          thenAction: parsed.thenAction,
          fullStatement: `If ${parsed.ifCondition}, then I will ${parsed.thenAction}.`,
          explanation: parsed.explanation || 'Pre-committing an automatic reaction bypasses decision fatigue during resistance.',
        };
      }
    } catch (err) {
      console.warn('Gemini obstacle planning failed, using local fallback:', err);
    }
  }

  // Deterministic Local Fallback
  const obsLower = obstacle.toLowerCase();
  let ifCondition = 'I feel internal resistance or the impulse to postpone';
  let thenAction = 'commit to working on just one physical sentence for 10 minutes';

  if (obsLower.includes('phone') || obsLower.includes('social') || obsLower.includes('notification')) {
    ifCondition = 'my hand automatically reaches for my phone';
    thenAction = 'place it face-down in another room and write 1 line';
  } else if (obsLower.includes('difficult') || obsLower.includes('stuck') || obsLower.includes('hard')) {
    ifCondition = 'I get stuck on a difficult section';
    thenAction = 'write a crude placeholder draft without stopping to edit';
  } else if (obsLower.includes('tired') || obsLower.includes('energy') || obsLower.includes('bored')) {
    ifCondition = 'I feel mental fatigue or boredom';
    thenAction = 'stand up, drink a glass of water, and return to complete 1 micro-step';
  } else if (obsLower.includes('vague') || obsLower.includes('uncertain') || obsLower.includes('don\'t know')) {
    ifCondition = 'I feel uncertain where to begin';
    thenAction = 'write down the single simplest question and answer it in 1 sentence';
  }

  return {
    ifCondition,
    thenAction,
    fullStatement: `If ${ifCondition}, then I will ${thenAction}.`,
    explanation: 'Pre-committing an automatic reaction bypasses decision fatigue during resistance.',
  };
}

// -------------------------------------------------------------
// WORKFLOW 4: NIGHT REVIEW SUMMARY
// -------------------------------------------------------------

export async function aiGenerateNightReviewSummary(
  summary: ReviewFactualSummary,
  slots: WorkSlot[],
  sessions: WorkSession[]
): Promise<string> {
  const slotTitles = slots.map((s) => s.taskTitle).filter(Boolean).slice(0, 5).join(', ');
  const prompt = `
Daily Execution Telemetry:
- Planned sessions: ${summary.plannedSessions} (slots: ${slotTitles || 'none'})
- Started sessions: ${summary.startedSessions} (actual logged session entries: ${sessions.length})
- Completed sessions: ${summary.completedSessions}
- Focus time: ${summary.focusTimeMinutes} minutes
- Delayed starts: ${summary.delayedStarts}
- Distraction impulses recorded: ${summary.distractionEvents}
- Concrete tasks completed: ${summary.tasksCompleted}

Generate a 2-3 sentence factual reflection for the daily review.
CRITICAL RULES:
- Factual and mechanistic only.
- No judgment, no praising, no lecturing, no moralizing.
- State what was produced, where friction happened, and how recovery functioned.
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        temperature: 0.1,
        systemPrompt: 'Factual review reflection only. No cheerleading, no scolding, strictly empirical numbers.',
      });
      if (responseText && responseText.length > 20) {
        return responseText.replace(/^"|"$/g, '').trim();
      }
    } catch (err) {
      console.warn('Gemini night review failed, using local generator:', err);
    }
  }

  // Deterministic Local Fallback
  if (summary.plannedSessions === 0 && summary.focusTimeMinutes === 0) {
    return 'Zero planned slots were scheduled today. Tomorrow benefits from pre-committing the opening Top 1 slot tonight.';
  }
  const startRate = summary.plannedSessions > 0
    ? Math.round((summary.startedSessions / summary.plannedSessions) * 100)
    : 100;

  return `You logged ${summary.focusTimeMinutes} minutes of focused execution across ${summary.completedSessions} completed sessions (${startRate}% start rate). ${summary.distractionEvents} distraction urges were intercepted and captured without derailing the primary anchor.`;
}

// -------------------------------------------------------------
// WORKFLOW 5: WEEKLY PATTERN ANALYSIS
// -------------------------------------------------------------

export interface AiPatternSynthesisResult {
  observedPattern: string;
  evidence: string;
  possibleExplanation: string;
  smallExperiment: string;
}

export async function aiSynthesizeWeeklyPatterns(
  weeklyMetrics: WeeklyMetrics,
  sessions: WorkSession[],
  categoryStats: { category: string; delayed: number; total: number }[]
): Promise<AiPatternSynthesisResult> {
  const prompt = `
Weekly Anti-Procrastination Telemetry:
- Planned: ${weeklyMetrics.plannedSessions}, Started: ${weeklyMetrics.startedSessions}, Completed: ${weeklyMetrics.completedSessions}
- Total Work Sessions Tracked: ${sessions.length}
- Average Start Delay: ${weeklyMetrics.averageStartDelayMinutes} minutes
- Average Focus Duration: ${weeklyMetrics.averageFocusedDurationMinutes} minutes
- Concrete Outputs Delivered: ${weeklyMetrics.concreteOutputsCompleted}
- Missed Sessions: ${weeklyMetrics.missedSessions}, Recoveries: ${weeklyMetrics.recoverySessions}
- Distraction Incidents: ${weeklyMetrics.distractionIncidents}
- Category delays: ${JSON.stringify(categoryStats)}

Synthesize the single most important empirical behavioral pattern for this week.
Structure strictly as JSON:
{
  "observedPattern": "e.g. You tend to delay afternoon writing sessions while morning technical tasks start promptly.",
  "evidence": "e.g. 4 of 5 delayed slots occurred after 14:00 in writing tasks, with an average delay of 18 minutes.",
  "possibleExplanation": "e.g. Higher cognitive ambiguity in open-ended writing combined with afternoon decision fatigue elevates activation resistance.",
  "smallExperiment": "e.g. Schedule your writing slot as the first morning action at 09:30 for the next 3 days."
}
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.2,
      });
      const parsed = JSON.parse(responseText);
      if (parsed.observedPattern && parsed.evidence) {
        return {
          observedPattern: parsed.observedPattern,
          evidence: parsed.evidence,
          possibleExplanation: parsed.possibleExplanation,
          smallExperiment: parsed.smallExperiment,
        };
      }
    } catch (err) {
      console.warn('Gemini weekly pattern synthesis failed, using local fallback:', err);
    }
  }

  // Deterministic Fallback
  return {
    observedPattern: weeklyMetrics.recoverySessions > 0
      ? `You recovered from ${weeklyMetrics.recoverySessions} disrupted slots using micro-starts instead of abandoning the day.`
      : 'Session execution displays high consistency once the first physical motion is cleared.',
    evidence: `${weeklyMetrics.startedSessions} of ${weeklyMetrics.plannedSessions} sessions initiated on-time with an average focused depth of ${weeklyMetrics.averageFocusedDurationMinutes} minutes.`,
    possibleExplanation: 'Committing to immediate micro-starts disrupts the perfectionistic all-or-nothing trap.',
    smallExperiment: 'For all slots next week, write the physical file name and 1st question before initiating the timer.',
  };
}

// -------------------------------------------------------------
// WORKFLOW 6: REPLANNING (WHEN BEHIND SCHEDULE)
// -------------------------------------------------------------

export interface ReplanSuggestion {
  headline: string;
  reasoning: string;
  protectedSlot: WorkSlot | null;
  proposedAdjustments: {
    slotId: string;
    taskTitle: string;
    action: 'keep' | 'reschedule_today' | 'defer_tomorrow' | 'drop';
    newStartTime?: string;
    newEndTime?: string;
    newDurationMinutes?: number;
    reason: string;
  }[];
}

export async function aiSuggestFeasibleReplan(
  remainingSlots: WorkSlot[],
  currentTime: string,
  top1SlotId?: string
): Promise<ReplanSuggestion> {
  const prompt = `
The user is behind schedule today. Current time is ${currentTime}.
Remaining planned slots:
${JSON.stringify(
  remainingSlots.map((s) => ({
    id: s.id,
    title: s.taskTitle,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.estimatedDurationMinutes,
    isTopPriority: s.isTopPriority,
  }))
)}

Top Priority Slot ID: "${top1SlotId || 'none'}"

REQUIREMENTS:
1. Protect the Top 1 priority at all costs. Do not cancel the Top 1.
2. Downscale or defer lower-priority work so the day is FEASIBLE, not stressful.
3. Propose realistic, non-punitive adjustments.
4. The user MUST approve these changes.

Return ONLY a JSON object with:
- headline: concise 1-line verdict (e.g. "Protecting Top 1 with a compact 2-session afternoon")
- reasoning: 1-2 sentence explanation of why this reduction restores feasible momentum
- proposedAdjustments: array of objects { slotId, action: ("keep" | "reschedule_today" | "defer_tomorrow" | "drop"), newStartTime, newEndTime, newDurationMinutes, reason }
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.2,
      });
      const parsed = JSON.parse(responseText);
      if (parsed.proposedAdjustments && Array.isArray(parsed.proposedAdjustments)) {
        const top1 = remainingSlots.find((s) => s.id === top1SlotId || s.isTopPriority === 1) || remainingSlots[0] || null;
        return {
          headline: parsed.headline || 'Feasible afternoon plan protecting your Top 1 priority',
          reasoning: parsed.reasoning || 'Reducing cognitive overload by dropping low-priority slots and locking in your primary deliverable.',
          protectedSlot: top1,
          proposedAdjustments: parsed.proposedAdjustments.map((adj: any) => {
            const slot = remainingSlots.find((s) => s.id === adj.slotId);
            return {
              slotId: adj.slotId,
              taskTitle: slot ? slot.taskTitle : 'Scheduled Slot',
              action: adj.action,
              newStartTime: adj.newStartTime,
              newEndTime: adj.newEndTime,
              newDurationMinutes: adj.newDurationMinutes,
              reason: adj.reason,
            };
          }),
        };
      }
    } catch (err) {
      console.warn('Gemini replanning failed, using deterministic fallback:', err);
    }
  }

  // Deterministic Local Fallback
  const top1 = remainingSlots.find((s) => s.id === top1SlotId || s.isTopPriority === 1) || remainingSlots[0] || null;
  const adjustments = remainingSlots.map((s, idx) => {
    const isProtected = s.id === top1?.id;
    if (isProtected) {
      return {
        slotId: s.id,
        taskTitle: s.taskTitle,
        action: 'keep' as const,
        reason: 'Protected Top 1 priority anchor.',
      };
    }
    if (idx === 1) {
      return {
        slotId: s.id,
        taskTitle: s.taskTitle,
        action: 'reschedule_today' as const,
        newDurationMinutes: Math.min(25, s.estimatedDurationMinutes),
        reason: 'Compressed to 25 minutes to preserve focus bandwidth.',
      };
    }
    return {
      slotId: s.id,
      taskTitle: s.taskTitle,
      action: 'defer_tomorrow' as const,
      reason: 'Deferred to protect against evening cognitive overload.',
    };
  });

  return {
    headline: 'Protect Top 1 and compress lower-priority work',
    reasoning: 'When running behind schedule, attempting to compress 4 hours into 2 hours causes panic and avoidance. We protect your primary anchor and defer non-essential work.',
    protectedSlot: top1,
    proposedAdjustments: adjustments,
  };
}

// -------------------------------------------------------------
// WORKFLOW 7: OVERWHELM MODE ("I have too much work")
// -------------------------------------------------------------

export interface OverwhelmTriageResult {
  mostImportantOutcome: string;
  smallestUsefulAction: string;
  whenWillYouStart: string;
  suggestedDurationMinutes: number;
  calmingInsight: string;
}

export async function aiResolveOverwhelm(input: {
  userInput: string;
  activeAssignments: { title: string; deadline?: string }[];
  currentSlots: { title: string }[];
}): Promise<OverwhelmTriageResult> {
  const prompt = `
User distress statement: "${input.userInput || 'I have too much work and I feel overwhelmed.'}"

Current user context:
- Active assignments: ${JSON.stringify(input.activeAssignments)}
- Today's slots: ${JSON.stringify(input.currentSlots)}

CRITICAL OVERWHELM DIRECTIVES:
1. DO NOT give a long motivational lecture or cheerleading speech.
2. DO NOT make psychological diagnoses.
3. Systematically collapse the overwhelming cloud into exactly THREE concrete questions:
   - "What is the most important outcome?" (Singular, bounded)
   - "What is the smallest useful action?" (<15 second bodily motion)
   - "When will you start?" (e.g. "Right now with a 10-minute micro-timer")

Return ONLY a JSON object with keys:
{
  "mostImportantOutcome": "concise, single deliverable",
  "smallestUsefulAction": "concrete <15s bodily command",
  "whenWillYouStart": "immediate micro-commitment",
  "suggestedDurationMinutes": 10 or 15 or 20,
  "calmingInsight": "1 short factual sentence grounding reality"
}
`;

  if (isGeminiConfigured()) {
    try {
      const responseText = await callGemini(prompt, {
        responseJson: true,
        temperature: 0.1,
      });
      const parsed = JSON.parse(responseText);
      if (parsed.mostImportantOutcome && parsed.smallestUsefulAction) {
        return {
          mostImportantOutcome: parsed.mostImportantOutcome,
          smallestUsefulAction: parsed.smallestUsefulAction,
          whenWillYouStart: parsed.whenWillYouStart || 'Right now for 10 minutes',
          suggestedDurationMinutes: parsed.suggestedDurationMinutes || 10,
          calmingInsight: parsed.calmingInsight || 'Overwhelm is an illusion created by attempting to execute five tasks simultaneously in working memory.',
        };
      }
    } catch (err) {
      console.warn('Gemini overwhelm triage failed, using local fallback:', err);
    }
  }

  // Deterministic Local Fallback
  const primary = input.activeAssignments[0]?.title || input.currentSlots[0]?.title || 'Your primary priority task';

  return {
    mostImportantOutcome: `Complete one concrete component of: "${primary}".`,
    smallestUsefulAction: `Open the file for "${primary}" and write down the very first equation or sentence.`,
    whenWillYouStart: 'Right now for 10 minutes (micro-start protocol)',
    suggestedDurationMinutes: 10,
    calmingInsight: 'You cannot do five projects at once. Pick one physical object, commit to 10 minutes, and leave the rest paused.',
  };
}
