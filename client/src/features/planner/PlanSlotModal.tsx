import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input, Textarea } from '../../components/ui/Input.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { WorkSlot, Assignment } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { sound } from '../../utils/sound.ts';
import { getTodayString, formatTime, addMinutes } from '../../utils/dates.ts';
import { validateFirstPhysicalAction, validateConcreteOutput } from './vagueTaskValidator.ts';
import { plannerMemory } from './plannerMemory.ts';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  Zap,
  Target,
  ShieldAlert,
  Coffee,
  Sparkles,
  BookOpen,
  FolderGit2,
  ListTodo,
  Loader2,
} from 'lucide-react';
import { getContextualRuleReminder } from '../rules/ruleEngine.ts';
import { ContextualRuleBanner } from '../../components/ui/ContextualRuleBanner.tsx';
import {
  aiGenerateFirstPhysicalActions,
  aiGenerateObstaclePlan,
} from '../ai/aiWorkflows.ts';

export interface PlanSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newSlot: WorkSlot) => void;
  initialAssignmentId?: string;
  initialMilestoneId?: string;
}

type SlotTypeOption = 'assignment' | 'project' | 'study_topic' | 'personal_goal' | 'custom_task';

const DURATION_PRESETS = [10, 20, 25, 40, 50, 60, 90];

const PHONE_LOCATION_OPTIONS = [
  { id: 'another room', label: 'Another Room', desc: 'Maximum friction against distraction' },
  { id: 'bag/drawer', label: 'In Bag / Drawer', desc: 'Out of direct field of vision' },
  { id: 'outside reach', label: 'Outside Reach', desc: 'Requires standing up to grab' },
  { id: 'beside me', label: 'Beside Me', desc: 'Visible on desk (high temptation)' },
  { id: 'other', label: 'Other Location', desc: 'Custom environment setup' },
];

const HEALTHY_BREAK_PRESETS = [
  'Drink cold water and do a full body stretch',
  '5-minute walk outside in fresh air',
  'Rest eyes in darkness away from screens',
  'Brew a warm cup of herbal tea or coffee',
  'Listen to 1 favorite focus song',
];

const CONCRETE_OUTPUT_EXAMPLES = [
  'Complete 5 problems.',
  'Write 400 words.',
  'Implement the API endpoint.',
  'Create slides 1–5.',
];

const FIRST_ACTION_EXAMPLES = [
  'Open Tutorial 3.',
  'Create the file.',
  'Write the heading.',
  'Open the dataset.',
];

export const PlanSlotModal: React.FC<PlanSlotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAssignmentId,
  initialMilestoneId,
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 9;

  // Preferences from memory
  const memoryPrefs = plannerMemory.getPreferences();

  // State: Step 1 - What?
  const [slotType, setSlotType] = useState<SlotTypeOption>('study_topic');
  const [taskTitle, setTaskTitle] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || '');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(initialMilestoneId || '');

  // State: Step 2 - Desired Output
  const [desiredOutput, setDesiredOutput] = useState('');

  // State: Step 3 - First Physical Action
  const [firstPhysicalAction, setFirstPhysicalAction] = useState('');

  // State: Step 4 - Duration
  const [durationMinutes, setDurationMinutes] = useState<number>(memoryPrefs.preferredDuration);
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  // State: Step 5 - Likely Obstacle
  const [likelyObstacle, setLikelyObstacle] = useState(memoryPrefs.recentObstacles[0] || 'I want to check my phone');
  const [customObstacle, setCustomObstacle] = useState('');

  // State: Step 6 - If-Then Plan
  const [ifThenPlan, setIfThenPlan] = useState(() =>
    plannerMemory.generateIfThenPlan(memoryPrefs.recentObstacles[0] || 'I want to check my phone')
  );
  const [existingDaySlots, setExistingDaySlots] = useState<WorkSlot[]>([]);

  // State: Step 7 - Phone Check
  const [phoneLocation, setPhoneLocation] = useState(memoryPrefs.preferredPhoneLocation || 'outside reach');
  const [customPhoneLocation, setCustomPhoneLocation] = useState('');

  // State: Step 8 - Break / Reward
  const [plannedReward, setPlannedReward] = useState(HEALTHY_BREAK_PRESETS[0]);
  const [customReward, setCustomReward] = useState('');

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuggestion, setValidationSuggestion] = useState<string | null>(null);

  // AI Assistant states
  const [isGeneratingAiActions, setIsGeneratingAiActions] = useState(false);
  const [aiActionSuggestions, setAiActionSuggestions] = useState<string[]>([]);
  const [isGeneratingAiIfThen, setIsGeneratingAiIfThen] = useState(false);

  const handleGenerateAiActions = async () => {
    setIsGeneratingAiActions(true);
    try {
      const actions = await aiGenerateFirstPhysicalActions(
        taskTitle || 'Focused Task',
        desiredOutput || 'Visible deliverable'
      );
      setAiActionSuggestions(actions);
    } catch (err) {
      console.error('Failed to generate AI physical actions:', err);
    } finally {
      setIsGeneratingAiActions(false);
    }
  };

  const handleGenerateAiIfThen = async () => {
    setIsGeneratingAiIfThen(true);
    try {
      const activeObstacle = customObstacle.trim() || likelyObstacle;
      const plan = await aiGenerateObstaclePlan(
        taskTitle || 'Focused Task',
        activeObstacle
      );
      setIfThenPlan(plan.fullStatement);
    } catch (err) {
      console.error('Failed to generate AI If-Then plan:', err);
    } finally {
      setIsGeneratingAiIfThen(false);
    }
  };

  // Load assignments and existing day slots when modal opens
  useEffect(() => {
    if (isOpen) {
      dataService.getSlots(getTodayString()).then(setExistingDaySlots);
      dataService.getAssignments().then((list) => {
        setAssignments(list);
        if (initialAssignmentId) {
          const match = list.find((a) => a.id === initialAssignmentId);
          if (match) {
            setSlotType('assignment');
            setSelectedAssignmentId(match.id);
            if (initialMilestoneId) {
              const mMatch = match.milestones.find((m) => m.id === initialMilestoneId);
              if (mMatch) {
                setSelectedMilestoneId(mMatch.id);
                setTaskTitle(`${match.title}: ${mMatch.title}`);
                setDesiredOutput(mMatch.intendedOutput);
                setFirstPhysicalAction(mMatch.nextAction);
              }
            } else {
              setTaskTitle(match.title);
              setFirstPhysicalAction(match.nextAction);
            }
          }
        }
      });
    }
  }, [isOpen, initialAssignmentId, initialMilestoneId]);

  // Capacity and Schedule Overlap Analytics
  const totalPlannedMinutes = existingDaySlots.reduce(
    (acc, s) => acc + (s.estimatedDurationMinutes || 0),
    0
  );
  const projectedTotalMinutes = totalPlannedMinutes + durationMinutes;
  const isOverCapacity = projectedTotalMinutes > 360;

  const now = new Date();
  const currentSlotStartMins = now.getHours() * 60 + now.getMinutes();
  const currentSlotEndMins = currentSlotStartMins + durationMinutes;

  const overlappingSlot = existingDaySlots.find((s) => {
    if (s.status === 'completed') return false;
    if (!s.startTime || !s.endTime) return false;
    const [sH, sM] = s.startTime.split(':').map(Number);
    const [eH, eM] = s.endTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return false;
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    return Math.max(currentSlotStartMins, startMins) < Math.min(currentSlotEndMins, endMins);
  });

  // Handle Assignment/Milestone Selection in Step 1
  const handleAssignmentSelect = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    const match = assignments.find((a) => a.id === assignmentId);
    if (match) {
      const firstIncomplete = match.milestones.find((m) => m.status !== 'completed');
      if (firstIncomplete) {
        setSelectedMilestoneId(firstIncomplete.id);
        setTaskTitle(`${match.title}: ${firstIncomplete.title}`);
        setDesiredOutput(firstIncomplete.intendedOutput);
        setFirstPhysicalAction(firstIncomplete.nextAction);
      } else {
        setSelectedMilestoneId('');
        setTaskTitle(match.title);
        setFirstPhysicalAction(match.nextAction);
      }
    }
  };

  const handleMilestoneSelect = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    const match = assignments.find((a) => a.id === selectedAssignmentId);
    const m = match?.milestones.find((item) => item.id === milestoneId);
    if (match && m) {
      setTaskTitle(`${match.title}: ${m.title}`);
      setDesiredOutput(m.intendedOutput);
      setFirstPhysicalAction(m.nextAction);
    }
  };

  // Step Validation before advancing
  const validateCurrentStep = (): boolean => {
    setValidationError(null);
    setValidationSuggestion(null);

    if (step === 1) {
      if (!taskTitle.trim()) {
        setValidationError('Please choose or enter what you will work on.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const result = validateConcreteOutput(desiredOutput);
      if (!result.isValid) {
        setValidationError(result.reason || 'Please define a concrete visible output.');
        setValidationSuggestion(result.suggestion || null);
        return false;
      }
      return true;
    }

    if (step === 3) {
      const result = validateFirstPhysicalAction(firstPhysicalAction);
      if (!result.isValid) {
        setValidationError(result.reason || 'First physical action cannot be vague.');
        setValidationSuggestion(result.suggestion || null);
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!durationMinutes || durationMinutes < 5 || durationMinutes > 180) {
        setValidationError('Duration must be between 5 and 180 minutes.');
        return false;
      }
      return true;
    }

    if (step === 5) {
      const activeObstacle = customObstacle.trim() || likelyObstacle;
      if (!activeObstacle) {
        setValidationError('Please identify the most likely obstacle to starting.');
        return false;
      }
      return true;
    }

    if (step === 6) {
      if (!ifThenPlan.trim()) {
        setValidationError('Please provide your If-Then implementation response.');
        return false;
      }
      return true;
    }

    if (step === 7) {
      const activePhone = phoneLocation === 'other' ? customPhoneLocation.trim() : phoneLocation;
      if (!activePhone) {
        setValidationError('Please specify where your phone will be.');
        return false;
      }
      return true;
    }

    if (step === 8) {
      const activeReward = customReward.trim() || plannedReward;
      if (!activeReward) {
        setValidationError('Please select or specify a healthy restorative break.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setValidationSuggestion(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Keyboard Navigation: Enter advances step
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      if (step < totalSteps) {
        handleNext();
      }
    }
  };

  // Final Submit
  const handleStartSession = async () => {
    const finalPhone = phoneLocation === 'other' ? customPhoneLocation.trim() || 'other' : phoneLocation;
    const finalObstacle = customObstacle.trim() || likelyObstacle;
    const finalReward = customReward.trim() || plannedReward;

    // Save preferences to memory
    plannerMemory.rememberDuration(durationMinutes);
    plannerMemory.rememberObstacle(finalObstacle);
    plannerMemory.rememberReward(finalReward);
    plannerMemory.rememberPhoneLocation(finalPhone);

    const now = new Date();
    const today = getTodayString();
    const startTime = formatTime(now);
    const endTime = formatTime(addMinutes(now, durationMinutes));

    const newSlot: WorkSlot = {
      id: crypto.randomUUID(),
      date: today,
      startTime,
      endTime,
      assignmentId: selectedAssignmentId || undefined,
      milestoneId: selectedMilestoneId || undefined,
      taskTitle: taskTitle.trim(),
      desiredOutput: desiredOutput.trim(),
      firstPhysicalAction: firstPhysicalAction.trim(),
      estimatedDurationMinutes: durationMinutes,
      status: 'planned',
      slotType,
      preparedData: {
        workingOn: taskTitle.trim(),
        desiredOutput: desiredOutput.trim(),
        firstPhysicalAction: firstPhysicalAction.trim(),
        durationMinutes,
        likelyObstacle: finalObstacle,
        ifThenPlan: ifThenPlan.trim(),
        phoneLocation: finalPhone,
        plannedReward: finalReward,
      },
      isTopPriority: 1,
    };

    await dataService.saveSlot(newSlot);
    sound.playStartChime(true);

    if (onSuccess) {
      onSuccess(newSlot);
    }
    onClose();
  };

  const stepTitles = [
    'What are you working on?',
    'What concrete output will exist?',
    'What is your first physical action?',
    'Select focus duration',
    'What is your most likely obstacle?',
    'Define your If-Then plan',
    'Where will your phone be?',
    'What will you do during the break?',
    'Review and start session',
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <Compass className="w-5 h-5 text-emerald-400" />
          <span>Plan Next Slot</span>
        </div>
      }
      description={
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold uppercase">
              Step {step} of {totalSteps} • {stepTitles[step - 1]}
            </span>
            <span className="text-stone-500">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-stone-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      }
    >
      <div onKeyDown={handleKeyDown} className="space-y-5 text-left max-h-[72vh] overflow-y-auto pr-1">
        {/* Validation Warning Box */}
        {validationError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
            {validationSuggestion && (
              <p className="text-stone-300 text-xs pl-6 italic">
                {validationSuggestion}
              </p>
            )}
          </div>
        )}

        {/* STEP 1: WHAT? */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">
                Category / Source of Work
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'assignment', label: 'Assignment', icon: FolderGit2 },
                  { id: 'project', label: 'Project', icon: Target },
                  { id: 'study_topic', label: 'Study Topic', icon: BookOpen },
                  { id: 'personal_goal', label: 'Personal Goal', icon: Sparkles },
                  { id: 'custom_task', label: 'Custom Task', icon: ListTodo },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSlotType(item.id as SlotTypeOption)}
                      className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer space-y-1 ${
                        slotType === item.id
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-stone-950 text-stone-400 border-stone-850 hover:border-stone-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto text-emerald-400" />
                      <div className="text-xs font-medium truncate">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Assignment: Pick Assignment & Milestone */}
            {slotType === 'assignment' && assignments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-stone-400">
                    Select Active Assignment
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => handleAssignmentSelect(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800/40 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose an Assignment --</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAssignmentId && (
                  <div className="space-y-1">
                    <label className="block text-xs font-mono uppercase text-stone-400">
                      Select Milestone
                    </label>
                    <select
                      value={selectedMilestoneId}
                      onChange={(e) => handleMilestoneSelect(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800/40 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Overarching Assignment --</option>
                      {assignments
                        .find((a) => a.id === selectedAssignmentId)
                        ?.milestones.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} {m.status === 'completed' ? '✓' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Task Name Input */}
            <div className="space-y-1">
              <Input
                label="Task / Topic Title"
                placeholder={
                  slotType === 'study_topic'
                    ? 'e.g. Computer Vision: Epipolar Geometry'
                    : slotType === 'personal_goal'
                    ? 'e.g. Outline technical portfolio case study'
                    : 'e.g. Complete 3D reconstruction pipeline'
                }
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
              <span className="text-xs font-mono text-stone-500">
                START recommends choosing one bounded chunk of work rather than an entire multi-day project.
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: WHAT WILL EXIST AFTER THIS SESSION? */}
        {step === 2 && (
          <div className="space-y-4">
            <ContextualRuleBanner reminder={getContextualRuleReminder('vague_output')} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                What concrete output should exist when this session ends?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Require visible proof of completion. The brain avoids work when the finish line is ambiguous.
              </p>
              <Input
                placeholder="e.g. Complete 5 problems, Write 400 words, Implement API endpoint..."
                value={desiredOutput}
                onChange={(e) => setDesiredOutput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                Quick Concrete Examples:
              </span>
              <div className="flex flex-wrap gap-2">
                {CONCRETE_OUTPUT_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setDesiredOutput(ex)}
                    className="px-2.5 py-1 rounded-xl surface-0 border border-stone-800/40 text-stone-300 text-xs hover:border-emerald-500/50 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    + {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FIRST PHYSICAL ACTION */}
        {step === 3 && (
          <div className="space-y-4">
            <ContextualRuleBanner reminder={getContextualRuleReminder('vague_action')} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                What is the smallest physical action that starts this work?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Name the physical motion you will perform in the first 15 seconds. Vague actions like &ldquo;Study&rdquo; or &ldquo;Work on it&rdquo; will be rejected.
              </p>
              <Input
                placeholder="e.g. Open Tutorial 3, Create the file, Write the heading..."
                value={firstPhysicalAction}
                onChange={(e) => setFirstPhysicalAction(e.target.value)}
                autoFocus
              />
            </div>

            {/* AI First Action Generator */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Action Simplifier</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiActions}
                  disabled={isGeneratingAiActions}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isGeneratingAiActions ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Generating 15s Actions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Suggest 3 Physical Actions</span>
                    </>
                  )}
                </button>
              </div>

              {aiActionSuggestions.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                    Choose one &lt;15-second physical movement to start:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {aiActionSuggestions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFirstPhysicalAction(act)}
                        className={`p-2.5 rounded-lg text-left text-xs border transition-all cursor-pointer flex items-center justify-between ${
                          firstPhysicalAction === act
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/40'
                            : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                        }`}
                      >
                        <span className="font-mono text-xs">{act}</span>
                        {firstPhysicalAction === act && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400 leading-relaxed">
                  Break task resistance by isolating the exact physical motion (mouse click, opening a book, typing a title) to execute within the first 15 seconds.
                </p>
              )}
            </div>

            {/* Educational Vague Action Notice */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/40 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-amber-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>ANTI-AVOIDANCE RULE 01</span>
              </div>
              <p className="text-stone-300 text-xs">
                ✕ Vague: &ldquo;Study math&rdquo; or &ldquo;Work on project&rdquo;<br />
                ✓ Concrete: &ldquo;Open textbook to page 120 and solve Problem 1 on paper&rdquo;
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                Quick Concrete Starters:
              </span>
              <div className="flex flex-wrap gap-2">
                {FIRST_ACTION_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setFirstPhysicalAction(ex)}
                    className="px-2.5 py-1 rounded-xl surface-0 border border-stone-800/40 text-stone-300 text-xs hover:border-emerald-500/50 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    + {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DURATION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                How long will this focus slot last?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Choose a duration that creates urgency without triggering overwhelming exhaustion.
              </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(d);
                    setIsCustomDuration(false);
                  }}
                  className={`py-3 rounded-xl text-center border font-mono font-bold transition-all cursor-pointer ${
                    durationMinutes === d && !isCustomDuration
                      ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-stone-950 text-stone-300 border-stone-850 hover:border-stone-700'
                  }`}
                >
                  <div className="text-base">{d}</div>
                  <div className="text-xs font-normal uppercase opacity-75">min</div>
                </button>
              ))}
            </div>

            {/* Custom Duration Option */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCustomDuration(!isCustomDuration)}
                className="text-xs text-emerald-400 hover:underline font-mono cursor-pointer"
              >
                {isCustomDuration ? '← Back to Presets' : '+ Enter Custom Duration'}
              </button>

              {isCustomDuration && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 25)}
                    className="w-24 font-mono text-center"
                    autoFocus
                  />
                  <span className="text-xs font-mono text-stone-400">minutes</span>
                </div>
              )}
            </div>

            {/* Capacity Protection Advisory */}
            {isOverCapacity && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold font-mono">CAPACITY PROTECTION ADVISORY</span>
                  <p className="text-stone-300 text-xs leading-relaxed">
                    You have planned {Math.round((projectedTotalMinutes / 60) * 10) / 10}h of focused work today. Deep cognitive endurance drops sharply beyond 5–6 hours. Guard focus quality over excessive volume.
                  </p>
                </div>
              </div>
            )}

            {/* Schedule Overlap Warning */}
            {overlappingSlot && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold font-mono">SCHEDULE OVERLAP WARNING</span>
                  <p className="text-stone-300 text-xs leading-relaxed">
                    This slot time conflicts with existing planned slot &ldquo;{overlappingSlot.taskTitle}&rdquo; ({overlappingSlot.startTime}–{overlappingSlot.endTime}).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: LIKELY OBSTACLE */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                What is most likely to make you postpone this?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Anticipating resistance before sitting down neutralizes its power to derail you.
              </p>
            </div>

            <div className="space-y-2">
              {memoryPrefs.recentObstacles.map((obs) => (
                <button
                  key={obs}
                  type="button"
                  onClick={() => {
                    setLikelyObstacle(obs);
                    setCustomObstacle('');
                    setIfThenPlan(plannerMemory.generateIfThenPlan(obs));
                  }}
                  className={`w-full p-3 rounded-xl text-left border text-xs transition-all cursor-pointer flex items-center justify-between ${
                    likelyObstacle === obs && !customObstacle
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-stone-950 text-stone-300 border-stone-850 hover:border-stone-700'
                  }`}
                >
                  <span>{obs}</span>
                  {likelyObstacle === obs && !customObstacle && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <Input
                label="Or describe your exact obstacle:"
                placeholder="e.g. I might get stuck on the first math equation and give up"
                value={customObstacle}
                onChange={(e) => {
                  setCustomObstacle(e.target.value);
                  setIfThenPlan(plannerMemory.generateIfThenPlan(e.target.value || likelyObstacle));
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 6: IF-THEN PLAN */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-200">
                  Your Pre-Committed If-Then Defense
                </label>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Implementation intentions automate your behavioral reaction when discomfort strikes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiIfThen}
                disabled={isGeneratingAiIfThen}
                className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              >
                {isGeneratingAiIfThen ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    <span>Formulating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>AI Formulate Defense</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <Textarea
                rows={3}
                value={ifThenPlan}
                onChange={(e) => setIfThenPlan(e.target.value)}
                autoFocus
              />
              <span className="text-xs font-mono text-stone-500">
                You can edit this response to match your exact coping strategy.
              </span>
            </div>
          </div>
        )}

        {/* STEP 7: PHONE CHECK */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                Where will your phone be?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Physical friction defeats dopamine urges. Willpower alone fails when temptation is within reach.
              </p>
            </div>

            <div className="space-y-2">
              {PHONE_LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPhoneLocation(opt.id)}
                  className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    phoneLocation === opt.id
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-stone-950 text-stone-300 border-stone-850 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-xs text-stone-400">{opt.desc}</div>
                  </div>
                  {phoneLocation === opt.id && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Non-blocking Gentle Warning for "Beside Me" */}
            {phoneLocation === 'beside me' && (
              <div className="space-y-2">
                <ContextualRuleBanner reminder={getContextualRuleReminder('phone_nearby')} />
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1 leading-snug">
                    <span className="font-semibold block font-mono">BEHAVIORAL FRICTION NOTICE</span>
                    <p className="text-stone-200 text-xs">
                      START recommends physical separation because the purpose of this session is to reduce avoidable distraction. Having your phone on the desk requires continuous inhibitory control, which quickly depletes starting energy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {phoneLocation === 'other' && (
              <Input
                label="Custom phone location:"
                placeholder="e.g. Charging in hallway"
                value={customPhoneLocation}
                onChange={(e) => setCustomPhoneLocation(e.target.value)}
                autoFocus
              />
            )}
          </div>
        )}

        {/* STEP 8: BREAK / REWARD */}
        {step === 8 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-200">
                What will you do during the break?
              </label>
              <p className="text-xs text-stone-400 leading-relaxed">
                Choose a restorative, physical recovery. Avoid high-dopamine digital feeds that make resuming work painful.
              </p>
            </div>

            <div className="space-y-2">
              {HEALTHY_BREAK_PRESETS.map((rw) => (
                <button
                  key={rw}
                  type="button"
                  onClick={() => {
                    setPlannedReward(rw);
                    setCustomReward('');
                  }}
                  className={`w-full p-3 rounded-xl text-left border text-xs transition-all cursor-pointer flex items-center justify-between ${
                    plannedReward === rw && !customReward
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-stone-950 text-stone-300 border-stone-850 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{rw}</span>
                  </div>
                  {plannedReward === rw && !customReward && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <Input
                label="Or custom healthy break:"
                placeholder="e.g. 5 minutes foam rolling"
                value={customReward}
                onChange={(e) => setCustomReward(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 9: CONFIRMATION & START */}
        {step === 9 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/40 pb-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Session Confirmation Spec
                </span>
                <Badge variant="action">{durationMinutes} MIN FOCUS</Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-stone-500 font-mono text-xs block uppercase">Task</span>
                  <span className="text-stone-100 font-semibold text-sm">{taskTitle}</span>
                </div>

                <div>
                  <span className="text-stone-500 font-mono text-xs block uppercase">Output</span>
                  <span className="text-stone-200">{desiredOutput}</span>
                </div>

                <div>
                  <span className="text-stone-500 font-mono text-xs block uppercase">First Action</span>
                  <span className="text-emerald-300 font-mono font-medium">&ldquo;{firstPhysicalAction}&rdquo;</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-stone-500 font-mono text-xs block uppercase">Phone</span>
                    <span className="text-stone-300 font-mono capitalize">
                      {phoneLocation === 'other' ? customPhoneLocation || 'other' : phoneLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-mono text-xs block uppercase">Planned Break</span>
                    <span className="text-stone-300 font-mono truncate block">
                      {customReward.trim() || plannedReward}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-stone-500 font-mono text-xs block uppercase">If-Then Defense</span>
                  <p className="text-xs text-stone-300 font-mono italic leading-tight">
                    {ifThenPlan}
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity Protection Advisory */}
            {isOverCapacity && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold font-mono">CAPACITY PROTECTION ADVISORY</span>
                  <p className="text-stone-300 text-xs leading-relaxed">
                    You have planned {Math.round((projectedTotalMinutes / 60) * 10) / 10}h of focused work today. Deep cognitive endurance drops sharply beyond 5–6 hours.
                  </p>
                </div>
              </div>
            )}

            {/* Schedule Overlap Warning */}
            {overlappingSlot && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold font-mono">SCHEDULE OVERLAP WARNING</span>
                  <p className="text-stone-300 text-xs leading-relaxed">
                    This slot overlaps with existing planned slot &ldquo;{overlappingSlot.taskTitle}&rdquo; ({overlappingSlot.startTime}–{overlappingSlot.endTime}).
                  </p>
                </div>
              </div>
            )}

            {/* Giant Action Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartSession}
              className="w-full py-4 text-base font-bold tracking-wide shadow-xl shadow-emerald-500/20"
              leftIcon={<Play className="w-5 h-5 fill-current" />}
            >
              START SESSION NOW
            </Button>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-800/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 1}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {step < totalSteps && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
