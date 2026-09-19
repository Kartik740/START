import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  Assignment,
  DailyReview,
  TomorrowPriorityAction,
} from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { getTodayString } from '../../utils/dates.ts';
import {
  calculateDailyFactualSummary,
  detectFrictionEvents,
  generateDataBasedReflection,
  generateTomorrowTimeline,
} from './reviewAnalytics.ts';
import {
  validateFirstPhysicalAction,
  validateConcreteOutput,
} from '../planner/vagueTaskValidator.ts';
import {
  MoonStar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Lightbulb,
  Check,
  Loader2,
} from 'lucide-react';
import { aiGenerateNightReviewSummary } from '../ai/aiWorkflows.ts';

export interface NightReviewWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSaved: (review: DailyReview) => void;
}

const PROCRASTINATION_REASONS = [
  'Task too vague',
  'Task too large',
  'Difficult',
  'Boring',
  'Phone',
  'Uncertainty',
  'Fear of poor quality',
  'Tired',
  'Unexpected interruption',
  'Other',
];

const WHAT_HELPED_OPTIONS = [
  'Small first action',
  'Phone away',
  'Clear output',
  'Timer',
  'Deadline pressure',
  'Accountability',
  'Already knowing what to do next',
  'Other',
];

const SUGGESTED_EXPERIMENTS = [
  'I will keep my phone in another room.',
  'I will define the first action before studying.',
  'I will start difficult work in the morning.',
  'I will use the 10-minute rescue instead of abandoning the day.',
];

export const NightReviewWizard: React.FC<NightReviewWizardProps> = ({
  isOpen,
  onClose,
  onReviewSaved,
}) => {
  const today = getTodayString();
  const [step, setStep] = useState<number>(1);

  // Raw telemetry data
  const [slots, setSlots] = useState<WorkSlot[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [distractions, setDistractions] = useState<DistractionUrge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // STEP 1: Output
  const [producedOutput, setProducedOutput] = useState('');

  // STEP 2: Procrastination
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [procrastinationNote, setProcrastinationNote] = useState('');

  // STEP 3: What helped
  const [selectedWhatHelped, setSelectedWhatHelped] = useState<string[]>([]);
  const [whatHelpedNote, setWhatHelpedNote] = useState('');

  // STEP 4: Reflection
  const [reflection, setReflection] = useState('');

  // STEP 5 & 6: Tomorrow's Top 3
  const [top1, setTop1] = useState<TomorrowPriorityAction>({
    title: '',
    desiredOutput: '',
    firstPhysicalAction: '',
    estimatedDurationMinutes: 25,
    startTime: '09:00',
    endTime: '09:25',
    likelyObstacle: '',
    ifThenPlan: '',
  });

  const [top2, setTop2] = useState<TomorrowPriorityAction>({
    title: '',
    desiredOutput: '',
    firstPhysicalAction: '',
    estimatedDurationMinutes: 25,
    startTime: '10:30',
    endTime: '10:55',
    likelyObstacle: '',
    ifThenPlan: '',
  });

  const [top3, setTop3] = useState<TomorrowPriorityAction>({
    title: '',
    desiredOutput: '',
    firstPhysicalAction: '',
    estimatedDurationMinutes: 25,
    startTime: '14:00',
    endTime: '14:25',
    likelyObstacle: '',
    ifThenPlan: '',
  });

  const [includeTop2, setIncludeTop2] = useState(true);
  const [includeTop3, setIncludeTop3] = useState(false);

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);

  // STEP 7: One Experiment
  const [selectedExperiment, setSelectedExperiment] = useState(SUGGESTED_EXPERIMENTS[0]);
  const [customExperiment, setCustomExperiment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynthesizingAiReflection, setIsSynthesizingAiReflection] = useState(false);

  const handleAiSynthesizeReflection = async () => {
    setIsSynthesizingAiReflection(true);
    try {
      const summary = calculateDailyFactualSummary(slots, sessions, distractions, today);
      const result = await aiGenerateNightReviewSummary(summary, slots, sessions);
      setReflection(result);
    } catch (err) {
      console.error('Failed to generate AI night review summary:', err);
    } finally {
      setIsSynthesizingAiReflection(false);
    }
  };

  // Load telemetry when wizard opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [loadedSlots, loadedSessions, loadedDistractions, loadedAssignments] =
          await Promise.all([
            dataService.getSlots(today),
            dataService.getSessions(),
            dataService.getDistractions(),
            dataService.getAssignments(),
          ]);

        setSlots(loadedSlots);
        setSessions(loadedSessions);
        setDistractions(loadedDistractions);
        setAssignments(loadedAssignments);

        // Pre-fill Step 1 with actual outputs from today's sessions
        const outputs = loadedSessions
          .filter((s) => s.producedOutput && s.producedOutput.trim() && s.producedOutput !== 'Session ended early.')
          .map((s) => `• [${s.taskTitle}]: ${s.producedOutput}`);

        if (outputs.length > 0) {
          setProducedOutput(outputs.join('\n'));
        }

        // Generate factual reflection
        const summary = calculateDailyFactualSummary(loadedSlots, loadedSessions, loadedDistractions, today);
        const friction = detectFrictionEvents(loadedSlots, loadedSessions, loadedDistractions, today);
        const genReflection = generateDataBasedReflection(summary, friction, loadedSlots, loadedSessions);
        setReflection(genReflection);

        // Pre-populate Top 1 with incomplete slots or pending assignments
        const incompleteToday = loadedSlots.find((s) => s.status !== 'completed');
        if (incompleteToday) {
          setTop1((prev) => ({
            ...prev,
            title: incompleteToday.taskTitle,
            desiredOutput: incompleteToday.desiredOutput,
            firstPhysicalAction: incompleteToday.firstPhysicalAction,
          }));
        } else if (loadedAssignments.length > 0) {
          const activeAss = loadedAssignments[0];
          const nextMilestone = activeAss.milestones?.find((m) => m.status !== 'completed');
          setTop1((prev) => ({
            ...prev,
            title: nextMilestone ? `${activeAss.title} — ${nextMilestone.title}` : activeAss.title,
            desiredOutput: nextMilestone?.intendedOutput || 'Complete next deliverable',
            firstPhysicalAction: nextMilestone?.nextAction || 'Open project file',
          }));
        }
      } catch (err) {
        console.error('Failed to load review data:', err);
      }
    };

    loadData();
  }, [isOpen, today]);

  // Derived metrics
  const factualSummary = calculateDailyFactualSummary(slots, sessions, distractions, today);
  const frictionEvents = detectFrictionEvents(slots, sessions, distractions, today);

  // Time calculations
  const calculateEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(':').map(Number);
    const total = (h || 9) * 60 + (m || 0) + duration;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  // Toggle reason
  const toggleReason = (r: string) => {
    if (selectedReasons.includes(r)) {
      setSelectedReasons(selectedReasons.filter((item) => item !== r));
    } else {
      setSelectedReasons([...selectedReasons, r]);
    }
  };

  // Toggle what helped
  const toggleWhatHelped = (opt: string) => {
    if (selectedWhatHelped.includes(opt)) {
      setSelectedWhatHelped(selectedWhatHelped.filter((item) => item !== opt));
    } else {
      setSelectedWhatHelped([...selectedWhatHelped, opt]);
    }
  };

  // Next step handler with validation
  const handleNext = () => {
    setValidationError(null);

    // Step 1 Validation
    if (step === 1) {
      if (!producedOutput.trim()) {
        setValidationError('Please record what you actually produced or completed today.');
        return;
      }
    }

    // Step 5 & 6 Validation (Tomorrow's Actions)
    if (step === 6) {
      // Validate Top 1
      if (!top1.title.trim()) {
        setValidationError('Top 1 Anchor title is required.');
        return;
      }
      const out1Val = validateConcreteOutput(top1.desiredOutput);
      if (!out1Val.isValid) {
        setValidationError(`Top 1 Output: ${out1Val.reason}`);
        return;
      }
      const act1Val = validateFirstPhysicalAction(top1.firstPhysicalAction);
      if (!act1Val.isValid) {
        setValidationError(`Top 1 First Action: ${act1Val.reason} (${act1Val.suggestion})`);
        return;
      }

      // Validate Top 2 if included
      if (includeTop2) {
        if (!top2.title.trim()) {
          setValidationError('Top 2 Title cannot be empty if included.');
          return;
        }
        const out2Val = validateConcreteOutput(top2.desiredOutput);
        if (!out2Val.isValid) {
          setValidationError(`Top 2 Output: ${out2Val.reason}`);
          return;
        }
        const act2Val = validateFirstPhysicalAction(top2.firstPhysicalAction);
        if (!act2Val.isValid) {
          setValidationError(`Top 2 First Action: ${act2Val.reason}`);
          return;
        }
      }

      // Validate Top 3 if included
      if (includeTop3) {
        if (!top3.title.trim()) {
          setValidationError('Top 3 Title cannot be empty if included.');
          return;
        }
        const out3Val = validateConcreteOutput(top3.desiredOutput);
        if (!out3Val.isValid) {
          setValidationError(`Top 3 Output: ${out3Val.reason}`);
          return;
        }
        const act3Val = validateFirstPhysicalAction(top3.firstPhysicalAction);
        if (!act3Val.isValid) {
          setValidationError(`Top 3 First Action: ${act3Val.reason}`);
          return;
        }
      }
    }

    setStep((prev) => Math.min(8, prev + 1));
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Final Submit Handler
  const handleFinishReview = async () => {
    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Calculate tomorrow's date
      const tomorrowObj = new Date();
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowDate = tomorrowObj.toISOString().split('T')[0];

      // Final chosen experiment
      const finalExperiment =
        selectedExperiment === 'Other' && customExperiment.trim()
          ? customExperiment.trim()
          : selectedExperiment;

      // Generate tomorrow's timeline
      const activeTop2 = includeTop2 ? top2 : undefined;
      const activeTop3 = includeTop3 ? top3 : undefined;
      const timeline = generateTomorrowTimeline(top1, activeTop2, activeTop3);

      const tomorrowStartsWith = `${top1.startTime} — ${top1.firstPhysicalAction}`;

      // 1. Create and save tomorrow's WorkSlot records in dataService
      const slot1: WorkSlot = {
        id: crypto.randomUUID(),
        date: tomorrowDate,
        startTime: top1.startTime,
        endTime: top1.endTime,
        taskTitle: top1.title,
        desiredOutput: top1.desiredOutput,
        firstPhysicalAction: top1.firstPhysicalAction,
        estimatedDurationMinutes: top1.estimatedDurationMinutes,
        status: 'planned',
        isTopPriority: 1,
        preparedData: {
          workingOn: top1.title,
          desiredOutput: top1.desiredOutput,
          firstPhysicalAction: top1.firstPhysicalAction,
          durationMinutes: top1.estimatedDurationMinutes,
          likelyObstacle: top1.likelyObstacle || 'Resistance to start',
          ifThenPlan: top1.ifThenPlan || 'Take 1 small step',
          phoneLocation: 'Outside reach',
        },
      };
      await dataService.saveSlot(slot1);

      if (includeTop2 && top2.title.trim()) {
        const slot2: WorkSlot = {
          id: crypto.randomUUID(),
          date: tomorrowDate,
          startTime: top2.startTime,
          endTime: top2.endTime,
          taskTitle: top2.title,
          desiredOutput: top2.desiredOutput,
          firstPhysicalAction: top2.firstPhysicalAction,
          estimatedDurationMinutes: top2.estimatedDurationMinutes,
          status: 'planned',
          isTopPriority: 2,
          preparedData: {
            workingOn: top2.title,
            desiredOutput: top2.desiredOutput,
            firstPhysicalAction: top2.firstPhysicalAction,
            durationMinutes: top2.estimatedDurationMinutes,
            likelyObstacle: top2.likelyObstacle || 'Fatigue',
            ifThenPlan: top2.ifThenPlan || 'Focus on concrete output',
            phoneLocation: 'Outside reach',
          },
        };
        await dataService.saveSlot(slot2);
      }

      if (includeTop3 && top3.title.trim()) {
        const slot3: WorkSlot = {
          id: crypto.randomUUID(),
          date: tomorrowDate,
          startTime: top3.startTime,
          endTime: top3.endTime,
          taskTitle: top3.title,
          desiredOutput: top3.desiredOutput,
          firstPhysicalAction: top3.firstPhysicalAction,
          estimatedDurationMinutes: top3.estimatedDurationMinutes,
          status: 'planned',
          isTopPriority: 3,
          preparedData: {
            workingOn: top3.title,
            desiredOutput: top3.desiredOutput,
            firstPhysicalAction: top3.firstPhysicalAction,
            durationMinutes: top3.estimatedDurationMinutes,
            likelyObstacle: top3.likelyObstacle || 'Distraction',
            ifThenPlan: top3.ifThenPlan || 'Return to task',
            phoneLocation: 'Outside reach',
          },
        };
        await dataService.saveSlot(slot3);
      }

      // 2. Save the DailyReview object
      const reviewObj: DailyReview = {
        id: crypto.randomUUID(),
        date: today,
        factualSummary,
        accomplishedSummary: producedOutput.trim(),
        procrastinationEvents: frictionEvents,
        procrastinationReasons: selectedReasons,
        whatHelpedStart: selectedWhatHelped,
        dataBasedReflection: reflection,
        tomorrowTop1: top1,
        tomorrowTop2: activeTop2,
        tomorrowTop3: activeTop3,
        tomorrowBehavioralExperiment: finalExperiment,
        tomorrowInitialTimeline: timeline,
        tomorrowStartsWith,
        submittedAt: new Date().toISOString(),
        // Legacy backward compatibility
        plannedSlotsCount: factualSummary.plannedSessions,
        completedSlotsCount: factualSummary.completedSessions,
        missedSlotsCount: frictionEvents.filter((e) => e.eventType === 'missed').length,
        distractionsCount: factualSummary.distractionEvents,
      };

      await dataService.saveDailyReview(reviewObj);
      onReviewSaved(reviewObj);
      onClose();
    } catch (err) {
      console.error('Failed to submit Night Review:', err);
      setValidationError('Failed to save review. Please check all entries.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <MoonStar className="w-5 h-5 text-teal-400" />
          <span>Night Review & Tomorrow Setup</span>
        </div>
      }
      description="Turn today's empirical behavioral data into an actionable, low-friction plan for tomorrow."
    >
      <div className="space-y-5 text-left max-h-[78vh] overflow-y-auto pr-1">
        {/* FACTUAL SUMMARY HEADER STRIP (No single productivity score) */}
        <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              TODAY'S FACTUAL TALLY
            </span>
            <span className="text-xs font-mono text-stone-500">
              Date: {today} · Phase 5
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Planned</span>
              <span className="font-mono font-bold text-stone-200 text-sm">
                {factualSummary.plannedSessions}
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Started</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {factualSummary.startedSessions}
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Completed</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {factualSummary.completedSessions}
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Focus Time</span>
              <span className="font-mono font-bold text-teal-300 text-sm">
                {factualSummary.focusTimeMinutes}m
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Delayed Starts</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {factualSummary.delayedStarts}
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Distractions</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {factualSummary.distractionEvents}
              </span>
            </div>
            <div className="p-2 rounded-xl surface-1 border border-stone-800/70">
              <span className="text-xs font-mono uppercase text-stone-500 block">Tasks Done</span>
              <span className="font-mono font-bold text-emerald-300 text-sm">
                {factualSummary.tasksCompleted}
              </span>
            </div>
          </div>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="flex items-center justify-between border-b border-stone-800/40 pb-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold">
            <span>STEP {step} OF 8:</span>
            <span className="text-stone-200">
              {step === 1 && 'ACTUAL OUTPUT PRODUCED'}
              {step === 2 && 'PROCRASTINATION & FRICTION MOMENTS'}
              {step === 3 && 'WHAT HELPED START'}
              {step === 4 && 'EMPIRICAL PATTERN REFLECTION'}
              {step === 5 && "TOMORROW'S TOP 3 PRIORITIES"}
              {step === 6 && 'CONVERT PRIORITIES INTO CONCRETE ACTIONS'}
              {step === 7 && "TOMORROW'S ONE BEHAVIORAL EXPERIMENT"}
              {step === 8 && 'FINAL TOMORROW TIMELINE & STARTING ACTION'}
            </span>
          </div>
          <span className="text-stone-500 text-xs">
            {Math.round((step / 8) * 100)}% Complete
          </span>
        </div>

        {/* VALIDATION ERROR BANNER */}
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 1 — ACTUAL OUTPUT */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “What did you actually produce today?”
              </label>
              <p className="text-xs text-stone-400">
                List the visible, tangible artifacts created. Ignore vague intentions; name real files, solved questions, or draft sections.
              </p>
            </div>

            {/* Suggestions from today's completed sessions */}
            {sessions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase text-stone-500 block">
                  Click to add from today's logged outputs:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sessions
                    .filter((s) => s.producedOutput && s.producedOutput.trim() && s.producedOutput !== 'Session ended early.')
                    .map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const addition = `• ${s.producedOutput}`;
                          if (!producedOutput.includes(addition)) {
                            setProducedOutput((prev) =>
                              prev ? `${prev}\n${addition}` : addition
                            );
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-800/40 text-stone-300 cursor-pointer text-left truncate max-w-xs"
                      >
                        + {s.producedOutput}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <textarea
              className="w-full bg-stone-950 border border-stone-800/40 rounded-lg p-3 text-sm text-stone-200 focus:outline-none focus:border-teal-500/60 min-h-[120px]"
              placeholder="e.g.&#10;• Solved Questions 1–4 in Computer Vision homework&#10;• Wrote 350 words of research intro&#10;• Tested login route auth tokens"
              value={producedOutput}
              onChange={(e) => setProducedOutput(e.target.value)}
              required
            />
          </div>
        )}

        {/* STEP 2 — PROCRASTINATION EVENTS */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “What was happening when you delayed?”
              </label>
              <p className="text-xs text-stone-400">
                Friction diagnosis without moral judgment. Identify the obstacle that triggered avoidance.
              </p>
            </div>

            {/* Surfaced friction events */}
            {frictionEvents.length > 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <span className="text-xs font-medium text-amber-300 font-bold block">
                  Detected Friction Moments Today:
                </span>
                <div className="space-y-1.5">
                  {frictionEvents.map((fe, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl surface-0/80 border border-stone-800/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-stone-200">{fe.slotTitle}</span>
                        <span className="text-stone-400 text-xs ml-2 font-mono">
                          ({fe.eventType.replace('_', ' ')})
                        </span>
                      </div>
                      <span className="text-xs text-amber-300/80 shrink-0 font-mono">
                        {fe.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zero missed slots or early abandonments recorded today. Clean follow-through!</span>
              </div>
            )}

            {/* Multi-select reasons */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-stone-400 block">
                Select Delay Triggers (Choose all that apply):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROCRASTINATION_REASONS.map((r) => {
                  const isSelected = selectedReasons.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleReason(r)}
                      className={`p-2.5 rounded-lg border text-xs text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span>{r}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Input
                label="Optional Details / Context"
                placeholder="e.g. Sat down to start but wasn't sure which textbook chapter had the formula"
                value={procrastinationNote}
                onChange={(e) => setProcrastinationNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3 — WHAT HELPED? */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “What helped you start or continue today?”
              </label>
              <p className="text-xs text-stone-400">
                What conditions reduced activation energy and allowed you to overcome inertia?
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WHAT_HELPED_OPTIONS.map((opt) => {
                const isSelected = selectedWhatHelped.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleWhatHelped(opt)}
                    className={`p-3 rounded-lg border text-xs text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <Input
                label="Short Observation"
                placeholder="e.g. Setting phone in living room meant I didn't reach for it automatically"
                value={whatHelpedNote}
                onChange={(e) => setWhatHelpedNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 4 — PATTERN REFLECTION */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-stone-200">
                  Data-Based Reflection
                </label>
                <p className="text-xs text-stone-400">
                  Factual correlation between your planning specifications and execution outcomes today.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAiSynthesizeReflection}
                disabled={isSynthesizingAiReflection}
                className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
              >
                {isSynthesizingAiReflection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>AI Synthesize Summary</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-bold uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Empirical Behavioral Synthesis</span>
              </div>
              <p className="text-sm text-stone-200 font-medium leading-relaxed font-sans">
                &ldquo;{reflection}&rdquo;
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase text-stone-400">
                Edit or Refine Reflection (Keep it factual):
              </label>
              <textarea
                className="w-full bg-stone-950 border border-stone-800/40 rounded-lg p-3 text-xs text-stone-300 focus:outline-none focus:border-teal-500/60 min-h-[70px]"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 5 — TOMORROW'S TOP 3 */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “Select Tomorrow's Top 3 Priorities”
              </label>
              <p className="text-xs text-stone-400">
                START strictly enforces a maximum of 3 priorities. When everything is a priority, nothing gets started.
              </p>
            </div>

            {/* Quick Suggestions from Assignments / Incomplete Slots */}
            {assignments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase text-stone-500 block">
                  Quick-Add from Active Project Milestones:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assignments.map((ass) => (
                    <button
                      key={ass.id}
                      type="button"
                      onClick={() => {
                        const nextM = ass.milestones?.find((m) => m.status !== 'completed');
                        setTop1((prev) => ({
                          ...prev,
                          title: nextM ? `${ass.title}: ${nextM.title}` : ass.title,
                          desiredOutput: nextM?.intendedOutput || 'Complete next milestone deliverable',
                          firstPhysicalAction: nextM?.nextAction || 'Open assignment doc',
                        }));
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-800/40 text-stone-300 cursor-pointer truncate max-w-xs"
                    >
                      Top 1: {ass.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Priority 1 (Anchor) */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-teal-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-teal-400 uppercase">
                  <Target className="w-3.5 h-3.5" />
                  <span>TOP 1 — THE ANCHOR (Mandatory)</span>
                </div>
                <span className="text-xs font-mono text-stone-500">Most Essential</span>
              </div>
              <Input
                placeholder="e.g. Computer Vision 3D Reconstruction Milestone 1"
                value={top1.title}
                onChange={(e) => setTop1({ ...top1, title: e.target.value })}
                required
              />
            </div>

            {/* Priority 2 (Secondary) */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTop2}
                    onChange={(e) => setIncludeTop2(e.target.checked)}
                    className="rounded border-stone-700 text-teal-500"
                  />
                  <span className="text-xs font-mono font-bold text-stone-300 uppercase">
                    TOP 2 — SECONDARY PROGRESS
                  </span>
                </label>
                <span className="text-xs font-mono text-stone-500">Optional</span>
              </div>
              {includeTop2 && (
                <Input
                  placeholder="e.g. Operating Systems Process Scheduling Lab"
                  value={top2.title}
                  onChange={(e) => setTop2({ ...top2, title: e.target.value })}
                />
              )}
            </div>

            {/* Priority 3 (Buffer) */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTop3}
                    onChange={(e) => setIncludeTop3(e.target.checked)}
                    className="rounded border-stone-700 text-teal-500"
                  />
                  <span className="text-xs font-mono font-bold text-stone-300 uppercase">
                    TOP 3 — TERTIARY BUFFER
                  </span>
                </label>
                <span className="text-xs font-mono text-stone-500">Optional</span>
              </div>
              {includeTop3 && (
                <Input
                  placeholder="e.g. Review DSA graph algorithms notes"
                  value={top3.title}
                  onChange={(e) => setTop3({ ...top3, title: e.target.value })}
                />
              )}
            </div>
          </div>
        )}

        {/* STEP 6 — CONVERT INTO ACTIONS */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “Convert Each Priority Into Concrete Actions”
              </label>
              <p className="text-xs text-stone-400">
                Every priority requires an exact output, 15-second physical entry motion, start time, and If-Then defense plan.
              </p>
            </div>

            {/* Priority 1 Config */}
            <div className="p-4 rounded-xl bg-stone-950 border border-teal-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                <span className="text-xs font-mono font-bold text-teal-400 uppercase">
                  TOP 1: {top1.title || 'Anchor Priority'}
                </span>
                <span className="text-xs font-mono text-stone-400">Mandatory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Exact Tangible Output"
                  placeholder="e.g. Solve 5 questions with proofs"
                  value={top1.desiredOutput}
                  onChange={(e) => setTop1({ ...top1, desiredOutput: e.target.value })}
                  required
                />
                <Input
                  label="First Physical Action (15s Motion)"
                  placeholder="e.g. Open Tutorial 3 and read Question 1"
                  value={top1.firstPhysicalAction}
                  onChange={(e) => setTop1({ ...top1, firstPhysicalAction: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  label="Planned Start Time"
                  value={top1.startTime}
                  onChange={(e) => {
                    const s = e.target.value;
                    setTop1({
                      ...top1,
                      startTime: s,
                      endTime: calculateEndTime(s, top1.estimatedDurationMinutes),
                    });
                  }}
                />
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <div className="flex gap-1">
                    {[15, 25, 40, 50, 60].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() =>
                          setTop1({
                            ...top1,
                            estimatedDurationMinutes: dur,
                            endTime: calculateEndTime(top1.startTime, dur),
                          })
                        }
                        className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                          top1.estimatedDurationMinutes === dur
                            ? 'bg-teal-500 text-stone-950'
                            : 'bg-stone-900 border border-stone-800/40 text-stone-400'
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Input
                  label="Likely Obstacle"
                  placeholder="e.g. Phone notifications or boredom"
                  value={top1.likelyObstacle}
                  onChange={(e) => setTop1({ ...top1, likelyObstacle: e.target.value })}
                />
                <Input
                  label="If-Then Plan"
                  placeholder="e.g. If I want to check phone, Then put it in drawer and write 1 line"
                  value={top1.ifThenPlan}
                  onChange={(e) => setTop1({ ...top1, ifThenPlan: e.target.value })}
                />
              </div>
            </div>

            {/* Priority 2 Config (if included) */}
            {includeTop2 && (
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/40 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                  <span className="text-xs font-mono font-bold text-stone-300 uppercase">
                    TOP 2: {top2.title || 'Secondary Priority'}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Secondary</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Exact Tangible Output"
                    placeholder="e.g. Implement scheduler function"
                    value={top2.desiredOutput}
                    onChange={(e) => setTop2({ ...top2, desiredOutput: e.target.value })}
                  />
                  <Input
                    label="First Physical Action"
                    placeholder="e.g. Open scheduler.c and write signature"
                    value={top2.firstPhysicalAction}
                    onChange={(e) => setTop2({ ...top2, firstPhysicalAction: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Planned Start Time"
                    value={top2.startTime}
                    onChange={(e) => {
                      const s = e.target.value;
                      setTop2({
                        ...top2,
                        startTime: s,
                        endTime: calculateEndTime(s, top2.estimatedDurationMinutes),
                      });
                    }}
                  />
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-1.5">
                      Duration
                    </label>
                    <div className="flex gap-1">
                      {[15, 25, 40, 50, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() =>
                            setTop2({
                              ...top2,
                              estimatedDurationMinutes: dur,
                              endTime: calculateEndTime(top2.startTime, dur),
                            })
                          }
                          className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                            top2.estimatedDurationMinutes === dur
                              ? 'bg-stone-200 text-stone-950'
                              : 'bg-stone-900 border border-stone-800/40 text-stone-400'
                          }`}
                        >
                          {dur}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Priority 3 Config (if included) */}
            {includeTop3 && (
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/40 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                  <span className="text-xs font-mono font-bold text-stone-300 uppercase">
                    TOP 3: {top3.title || 'Tertiary Buffer'}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Buffer</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Exact Tangible Output"
                    placeholder="e.g. 1 page summary notes"
                    value={top3.desiredOutput}
                    onChange={(e) => setTop3({ ...top3, desiredOutput: e.target.value })}
                  />
                  <Input
                    label="First Physical Action"
                    placeholder="e.g. Open notebook to page 12"
                    value={top3.firstPhysicalAction}
                    onChange={(e) => setTop3({ ...top3, firstPhysicalAction: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Planned Start Time"
                    value={top3.startTime}
                    onChange={(e) => {
                      const s = e.target.value;
                      setTop3({
                        ...top3,
                        startTime: s,
                        endTime: calculateEndTime(s, top3.estimatedDurationMinutes),
                      });
                    }}
                  />
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-1.5">
                      Duration
                    </label>
                    <div className="flex gap-1">
                      {[15, 25, 40, 50, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() =>
                            setTop3({
                              ...top3,
                              estimatedDurationMinutes: dur,
                              endTime: calculateEndTime(top3.startTime, dur),
                            })
                          }
                          className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                            top3.estimatedDurationMinutes === dur
                              ? 'bg-stone-200 text-stone-950'
                              : 'bg-stone-900 border border-stone-800/40 text-stone-400'
                          }`}
                        >
                          {dur}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 7 — TOMORROW'S ONE EXPERIMENT */}
        {step === 7 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “What is ONE thing you will change tomorrow?”
              </label>
              <p className="text-xs text-stone-400">
                Only one experiment. Behavior change fails when you attempt 5 alterations simultaneously.
              </p>
            </div>

            <div className="space-y-2">
              {SUGGESTED_EXPERIMENTS.map((exp) => {
                const isSelected = selectedExperiment === exp;
                return (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => {
                      setSelectedExperiment(exp);
                      setCustomExperiment('');
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/50 text-indigo-200 ring-1 ring-teal-500/30'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span>&ldquo;{exp}&rdquo;</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
                  </button>
                );
              })}

              <div className="pt-2">
                <Input
                  label="Or write your own single experiment"
                  placeholder="e.g. I will start the timer before opening browser tabs"
                  value={customExperiment}
                  onChange={(e) => {
                    setCustomExperiment(e.target.value);
                    setSelectedExperiment('Other');
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 8 — FINAL TOMORROW PLAN */}
        {step === 8 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-stone-200">
                “Final Tomorrow Plan”
              </label>
              <p className="text-xs text-stone-400">
                Tomorrow's plan is locked in tonight. In the morning, you execute without decision fatigue.
              </p>
            </div>

            {/* Chronological Timeline */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/40 space-y-3">
              <span className="text-xs font-medium text-stone-400 font-bold block">
                Tomorrow's Timeline
              </span>
              <div className="space-y-2 text-xs font-mono">
                {generateTomorrowTimeline(
                  top1,
                  includeTop2 ? top2 : undefined,
                  includeTop3 ? top3 : undefined
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                      item.isBreak
                        ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-500'
                        : 'bg-stone-900 border-stone-800/40 text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-400">{item.time}</span>
                      <span className="text-stone-600">—</span>
                      <span className={item.isBreak ? 'italic text-stone-500' : 'font-semibold'}>
                        {item.title}
                      </span>
                    </div>
                    {item.output && (
                      <span className="text-emerald-400/90 text-xs truncate max-w-xs">
                        Output: {item.output}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Experiment Reminder */}
            <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                Tomorrow's Experiment: &ldquo;
                {selectedExperiment === 'Other' && customExperiment.trim()
                  ? customExperiment.trim()
                  : selectedExperiment}
                &rdquo;
              </span>
            </div>

            {/* FINAL FOCAL POINT: TOMORROW STARTS WITH */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-teal-950/60 to-stone-950 border-2 border-teal-500 text-left space-y-2 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-teal-400 font-extrabold">
                <Zap className="w-4 h-4 text-teal-400" />
                <span>TOMORROW STARTS WITH</span>
              </div>
              <p className="text-lg sm:text-xl font-mono font-black text-stone-100 leading-snug">
                &ldquo;{top1.startTime} — {top1.firstPhysicalAction}&rdquo;
              </p>
              <p className="text-xs text-stone-400 pt-1">
                Output when slot closes:{' '}
                <span className="text-emerald-400 font-semibold">{top1.desiredOutput}</span>
              </p>
            </div>
          </div>
        )}

        {/* CONTROLS FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-800/40">
          {step > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isSubmitting}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}

          {step < 8 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-500 text-stone-100 font-bold px-5"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Continue to Step {step + 1}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleFinishReview}
              isLoading={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold px-6"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Lock in Tomorrow's Plan & Finish Review
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
