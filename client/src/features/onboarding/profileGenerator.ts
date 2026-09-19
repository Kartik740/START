import { UserOnboardingProfile } from '../../types/models.ts';

export function generateOperatingProfileSummary(
  draft: Partial<UserOnboardingProfile>
): UserOnboardingProfile['generatedOperatingProfile'] {
  const triggers = draft.delayTriggers || [];
  const distractions = draft.commonDistractions || [];

  const primaryBlockers: string[] = [];
  const defenseProtocols: string[] = [];

  // Identify primary blockers
  if (triggers.includes('overwhelmed') || triggers.includes('dont_know_where_to_begin')) {
    primaryBlockers.push('Task ambiguity & cognitive overload');
    defenseProtocols.push('Enforced 4-field task concreteness (output + first physical action)');
  }
  if (triggers.includes('want_to_use_phone') || distractions.includes('social_media') || distractions.includes('messaging')) {
    primaryBlockers.push('Environmental phone / communication urgency');
    defenseProtocols.push('Physical phone separation check ("Outside reach") before each slot');
  }
  if (triggers.includes('task_feels_boring')) {
    primaryBlockers.push('Low initial dopamine & task friction');
    defenseProtocols.push('Micro-start threshold (10-minute start sessions to break inertia)');
  }
  if (triggers.includes('worry_not_good_enough')) {
    primaryBlockers.push('Perfectionism & fear of substandard initial output');
    defenseProtocols.push('Rule 09 active: Separate creation from polishing (first draft allowed to be flawed)');
  }
  if (triggers.includes('tell_myself_plenty_of_time')) {
    primaryBlockers.push('Distant deadline misinterpretation (permission to postpone)');
    defenseProtocols.push('Internal milestone staging with deadline buffer calculations');
  }
  if (distractions.includes('unnecessary_research') || triggers.includes('distracted_by_other_work')) {
    primaryBlockers.push('Productive procrastination (escape via low-priority chores)');
    defenseProtocols.push('Strict Top 1 daily anchor prioritization');
  }

  // Fallback defaults if few selected
  if (primaryBlockers.length === 0) {
    primaryBlockers.push('General starting friction & distraction impulses');
    defenseProtocols.push('Pre-flight preparation & distraction urge capture');
  }

  const blockerText = primaryBlockers.slice(0, 2).join(' and ');
  const summaryStatement = `START will pay particular attention to ${blockerText.toLowerCase()} because you identified them as frequent friction points.`;

  const bestTime = draft.bestWorkingTime || 'morning';
  const timeMap: Record<string, string> = {
    morning: '09:00',
    afternoon: '14:00',
    evening: '18:00',
    night: '21:30',
    variable: '10:00',
  };

  return {
    primaryBlockers,
    defenseProtocols,
    summaryStatement,
    recommendedFirstSlotTime: timeMap[bestTime] || '09:30',
  };
}
