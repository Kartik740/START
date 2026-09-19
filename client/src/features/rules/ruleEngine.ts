import { ANTI_PROCRASTINATION_RULES } from '../../lib/constants.ts';
import { storage } from '../../lib/storage.ts';
import {
  BehavioralRule,
  WorkSlot,
  WorkSession,
  DistractionUrge,
  DailyReview,
} from '../../types/models.ts';
import { getTodayString } from '../../utils/dates.ts';

export interface AugmentedRule extends BehavioralRule {
  isEnabled: boolean;
  isTodayRule: boolean;
  adherenceStatus?: {
    label: string;
    details: string;
    opportunitiesCount: number;
    alignedCount: number;
  };
}

export type RuleContextTrigger =
  | 'vague_output'
  | 'vague_action'
  | 'phone_nearby'
  | 'missed_slot'
  | 'distraction_surge'
  | 'finish_session'
  | 'night_review';

export interface ContextualReminder {
  ruleNumber: number;
  ruleCode: string;
  ruleName: string;
  reminderText: string;
  isTodayRule: boolean;
  isEnabled: boolean;
}

/**
 * Calculates factual, objective adherence for a specific rule today.
 * Strictly non-guilt-based. Factual behavioral records only.
 */
export function calculateRuleAdherence(
  ruleNumber: number,
  todaySlots: WorkSlot[],
  todaySessions: WorkSession[],
  todayDistractions: DistractionUrge[],
  todayReview: DailyReview | null
): { label: string; details: string; opportunitiesCount: number; alignedCount: number } {
  switch (ruleNumber) {
    case 1: { // Start before motivation
      const started = todaySlots.filter((s) => s.status === 'in_progress' || s.status === 'completed');
      const onTime = started.filter((s) => !s.delayReason);
      return {
        label: `${started.length} sessions initiated`,
        details: started.length > 0
          ? `${onTime.length} started without delay; motivation followed initial motion.`
          : 'Awaiting first physical initiation today.',
        opportunitiesCount: todaySlots.length,
        alignedCount: started.length,
      };
    }
    case 2: { // Define a concrete output
      const vagueWords = ['study', 'work', 'read', 'code', 'review', 'do'];
      const concreteSlots = todaySlots.filter((s) => {
        const text = (s.desiredOutput || '').trim().toLowerCase();
        return text.length >= 15 && !vagueWords.some((w) => text === w);
      });
      return {
        label: `${concreteSlots.length} of ${todaySlots.length} slots have concrete outputs`,
        details: todaySlots.length === 0
          ? 'No slots scheduled yet today.'
          : `${concreteSlots.length} scheduled slots have tangible, verifiable deliverables.`,
        opportunitiesCount: todaySlots.length,
        alignedCount: concreteSlots.length,
      };
    }
    case 3: { // Define the first physical action
      const withAction = todaySlots.filter((s) => (s.firstPhysicalAction || '').trim().length >= 8);
      return {
        label: `${withAction.length} of ${todaySlots.length} slots have physical first actions`,
        details: todaySlots.length === 0
          ? 'No slots scheduled yet today.'
          : `${withAction.length} slots converted conceptual work into a <10 second bodily motion.`,
        opportunitiesCount: todaySlots.length,
        alignedCount: withAction.length,
      };
    }
    case 4: { // Define next slot before leaving current slot
      const nextQueued = todaySessions.filter((s) => Boolean(s.nextActionScheduledSlotId));
      return {
        label: `${nextQueued.length} next sessions pre-queued`,
        details: todaySessions.length === 0
          ? 'No focus sessions completed yet today.'
          : `${nextQueued.length} of ${todaySessions.length} sessions scheduled their follow-up slot before leaving.`,
        opportunitiesCount: todaySessions.length,
        alignedCount: nextQueued.length,
      };
    }
    case 5: { // Keep phone physically away
      const phoneSeparated = todaySessions.filter((s) => s.phoneOutsideReach);
      return {
        label: `Phone outside reach in ${phoneSeparated.length} of ${todaySessions.length} sessions`,
        details: todaySessions.length === 0
          ? 'Active session protocol will prompt phone separation at start.'
          : `${phoneSeparated.length} focus windows executed with phone physically out of reach.`,
        opportunitiesCount: todaySessions.length,
        alignedCount: phoneSeparated.length,
      };
    }
    case 6: { // Capture distractions instead of following them
      const totalUrges = todayDistractions.length;
      return {
        label: `${totalUrges} distraction impulses captured`,
        details: totalUrges > 0
          ? `${totalUrges} urges parked into the capture feed and returned to single-task focus.`
          : 'Zero unmanaged distraction impulses logged today.',
        opportunitiesCount: Math.max(1, totalUrges),
        alignedCount: totalUrges,
      };
    }
    case 7: { // 10-minute recovery after a missed slot
      const missed = todaySlots.filter((s) => s.status === 'missed').length;
      const recovered = todaySlots.filter((s) => s.status === 'recovered').length +
        todaySessions.filter((s) => s.wasRecoverySession).length;
      return {
        label: `${recovered} micro-start recoveries executed`,
        details: missed > 0
          ? `${recovered} of ${missed + recovered} disrupted slots rescued with a 10-minute micro-start.`
          : 'No missed slots experienced today.',
        opportunitiesCount: missed + recovered,
        alignedCount: recovered,
      };
    }
    case 8: { // Measure outputs and behavior
      const recordedOutputs = todaySessions.filter((s) => Boolean(s.producedOutput && s.producedOutput.trim()));
      return {
        label: `${recordedOutputs.length} tangible artifacts verified`,
        details: todaySessions.length === 0
          ? 'Outputs are logged upon focus session completion.'
          : `${recordedOutputs.length} concrete artifacts recorded upon session close.`,
        opportunitiesCount: todaySessions.length,
        alignedCount: recordedOutputs.length,
      };
    }
    case 9: { // Separate drafting from polishing
      return {
        label: 'Active Drafting Protocol',
        details: 'Drafting sessions protect generative momentum before engaging editing.',
        opportunitiesCount: 1,
        alignedCount: 1,
      };
    }
    case 10: { // Plan tomorrow at night
      const hasReview = Boolean(todayReview);
      return {
        label: hasReview ? 'Night review completed' : 'Night review scheduled for tonight',
        details: hasReview
          ? 'Tomorrow’s Top 1 action and timeline locked in before sleep.'
          : 'Complete the 3-minute Night Review tonight to prevent morning negotiation.',
        opportunitiesCount: 1,
        alignedCount: hasReview ? 1 : 0,
      };
    }
    default:
      return { label: 'Active', details: 'Rule is active in operating system.', opportunitiesCount: 1, alignedCount: 1 };
  }
}

/**
 * Returns augmented list of all 10 rules with enabled state, Today's Rule indicator,
 * and current factual adherence tally.
 */
export function getAugmentedRules(
  slots: WorkSlot[] = [],
  sessions: WorkSession[] = [],
  distractions: DistractionUrge[] = [],
  todayReview: DailyReview | null = null
): { rules: AugmentedRule[]; todaysRule: AugmentedRule | null } {
  const rulesState = storage.getRulesState();
  const todaysRuleNumber = storage.getTodaysRule();
  const today = getTodayString();

  const todaySlots = slots.filter((s) => s.date === today);
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt ? s.startedAt.split('T')[0] : '';
    return d === today;
  });
  const todayDistractions = distractions.filter((d) => {
    const dDate = d.timestamp ? d.timestamp.split('T')[0] : '';
    return dDate === today;
  });

  const augmented: AugmentedRule[] = ANTI_PROCRASTINATION_RULES.map((rule) => {
    const isEnabled = rulesState.enabledRuleNumbers.includes(rule.ruleNumber);
    const isTodayRule = todaysRuleNumber === rule.ruleNumber;
    const adherenceStatus = calculateRuleAdherence(
      rule.ruleNumber,
      todaySlots,
      todaySessions,
      todayDistractions,
      todayReview
    );

    return {
      ...rule,
      isEnabled,
      isTodayRule,
      adherenceStatus,
    };
  });

  const todaysRule = augmented.find((r) => r.isTodayRule) || null;

  return { rules: augmented, todaysRule };
}

/**
 * Evaluates whether a contextual rule reminder should be surfaced.
 * Only returns a reminder if the corresponding rule is enabled by the user.
 */
export function getContextualRuleReminder(
  trigger: RuleContextTrigger
): ContextualReminder | null {
  const rulesState = storage.getRulesState();
  const todaysRuleNumber = storage.getTodaysRule();

  let targetRuleNumber = 1;
  let reminderText = '';

  switch (trigger) {
    case 'vague_output':
      targetRuleNumber = 2;
      reminderText =
        'Rule 02 — Define a concrete output: The brain retreats from ambiguity. Specify the exact page count, file, or tangible artifact.';
      break;
    case 'vague_action':
      targetRuleNumber = 3;
      reminderText =
        'Rule 03 — Define the first physical action: Executive function requires a concrete bodily command (<10s). State the exact first physical gesture.';
      break;
    case 'phone_nearby':
      targetRuleNumber = 5;
      reminderText =
        'Rule 05 — Keep the phone physically away during focused work: Environmental friction beats willpower. Place the phone outside physical reach.';
      break;
    case 'missed_slot':
      targetRuleNumber = 7;
      reminderText =
        'Rule 07 — Use 10-minute recovery after a missed slot: Recover now rather than postponing the entire day. A 10-minute micro-start breaks the shame loop.';
      break;
    case 'distraction_surge':
      targetRuleNumber = 6;
      reminderText =
        'Rule 06 — Capture distractions instead of following them: Park the impulse in the capture feed to discharge cognitive tension.';
      break;
    case 'finish_session':
      targetRuleNumber = 4;
      reminderText =
        'Rule 04 — Define the next slot before leaving the current slot: Lock in your next physical action while your mental cache is still warm.';
      break;
    case 'night_review':
      targetRuleNumber = 10;
      reminderText =
        'Rule 10 — Plan tomorrow at night: Tomorrow is planned at night, not negotiated in the morning.';
      break;
  }

  const isEnabled = rulesState.enabledRuleNumbers.includes(targetRuleNumber);
  if (!isEnabled) {
    return null;
  }

  const matchingRule = ANTI_PROCRASTINATION_RULES.find((r) => r.ruleNumber === targetRuleNumber);
  if (!matchingRule) return null;

  return {
    ruleNumber: targetRuleNumber,
    ruleCode: matchingRule.code,
    ruleName: matchingRule.name,
    reminderText,
    isTodayRule: todaysRuleNumber === targetRuleNumber,
    isEnabled: true,
  };
}
