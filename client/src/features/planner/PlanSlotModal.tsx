import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { WorkSlot, Assignment } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { sound } from '../../utils/sound.ts';
import { getTodayString, formatTime, addMinutes } from '../../utils/dates.ts';
import { validateFirstPhysicalAction, validateConcreteOutput } from './vagueTaskValidator.ts';
import { sessionStorageManager } from '../sessions/sessionStorage.ts';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Zap,
  Target,
  ShieldAlert,
  FolderGit2,
  ListTodo,
  BookOpen,
  PhoneOff,
  Play,
  Calendar,
} from 'lucide-react';

export interface PlanSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newSlot: WorkSlot) => void;
  initialAssignmentId?: string;
  initialMilestoneId?: string;
}

type SlotTypeOption = 'assignment' | 'project' | 'study_topic' | 'custom_task';

const DURATION_PRESETS = [15, 25, 40, 60];

const CONCRETE_OUTPUT_PRESETS = [
  'Complete 5 practice problems',
  'Write 400 words of introduction',
  'Implement the API endpoint',
  'Create slides 1 to 4 in presentation',
  'Outline 3 sections with bullet points',
];

const PHYSICAL_ACTION_PRESETS = [
  'Open VS Code, create new file, and write function signature',
  'Open Google Doc and type the 3 main section headings',
  'Open tutorial PDF and solve Question 1',
  'Open notebook to blank page and write problem 1 formula',
  'Open terminal and run test suite',
];

export const PlanSlotModal: React.FC<PlanSlotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAssignmentId,
  initialMilestoneId,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  // Form State
  const [slotType, setSlotType] = useState<SlotTypeOption>('study_topic');
  const [taskTitle, setTaskTitle] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || '');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(initialMilestoneId || '');

  const [desiredOutput, setDesiredOutput] = useState('');
  const [firstPhysicalAction, setFirstPhysicalAction] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [phoneConfirmed, setPhoneConfirmed] = useState<boolean>(false);

  // Day slots & overlap tracking
  const [existingDaySlots, setExistingDaySlots] = useState<WorkSlot[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuggestion, setValidationSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setValidationError(null);
      setValidationSuggestion(null);
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

  // Capacity & Overlap calculations
  const isAtCapacity = existingDaySlots.filter((s) => s.status !== 'completed').length >= 5;

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

  const validateStep = (currentStep: number): boolean => {
    setValidationError(null);
    setValidationSuggestion(null);

    if (currentStep === 1) {
      if (!taskTitle.trim()) {
        setValidationError('Task title cannot be blank.');
        return false;
      }
      const outputRes = validateConcreteOutput(desiredOutput);
      if (!outputRes.isValid) {
        setValidationError(outputRes.reason || 'Please define a tangible physical output.');
        setValidationSuggestion(outputRes.suggestion || null);
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      const actionRes = validateFirstPhysicalAction(firstPhysicalAction);
      if (!actionRes.isValid) {
        setValidationError(actionRes.reason || 'First physical action cannot be vague.');
        setValidationSuggestion(actionRes.suggestion || null);
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (!durationMinutes || durationMinutes < 5) {
        setValidationError('Select a valid duration.');
        return false;
      }
      if (isAtCapacity) {
        setValidationError('Daily limit reached (5 slots max). Complete an existing slot before adding another.');
        return false;
      }
      if (overlappingSlot) {
        setValidationError(`Time window conflicts with "${overlappingSlot.taskTitle}" (${overlappingSlot.startTime}–${overlappingSlot.endTime}).`);
        return false;
      }
      if (!phoneConfirmed) {
        setValidationError('You must place your phone physically out of reach before locking in this focus window.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setValidationSuggestion(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveAndExecute = async (startNow: boolean) => {
    if (!validateStep(3)) return;

    const nowTime = new Date();
    const today = getTodayString();
    const startTime = formatTime(nowTime);
    const endTime = formatTime(addMinutes(nowTime, durationMinutes));

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
      status: startNow ? 'in_progress' : 'planned',
      slotType,
      preparedData: {
        workingOn: taskTitle.trim(),
        desiredOutput: desiredOutput.trim(),
        firstPhysicalAction: firstPhysicalAction.trim(),
        durationMinutes,
        likelyObstacle: 'Distraction resistance',
        ifThenPlan: 'When urge arises, write it down and continue single-task focus',
        phoneLocation: 'out of reach',
        plannedReward: 'Restorative stretch & water',
      },
      isTopPriority: existingDaySlots.length === 0 ? 1 : undefined,
    };

    await dataService.saveSlot(newSlot);
    sound.playStartChime(true);

    if (onSuccess) {
      onSuccess(newSlot);
    }
    onClose();

    if (startNow) {
      sessionStorageManager.startSession(newSlot);
      navigate('/session');
    }
  };

  const stepTitles = [
    'Task & Tangible Deliverable',
    '15-Second Starting Trigger',
    'Duration & Friction Lockdown',
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2 text-white">
          <Compass className="w-5 h-5 text-emerald-400" />
          <span>Plan Work Window</span>
        </div>
      }
      description={
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold uppercase tracking-wider">
              Step {step} of {totalSteps} • {stepTitles[step - 1]}
            </span>
            <span className="text-slate-500 font-mono">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-left pt-2">
        {/* Validation Warning */}
        {validationError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
            {validationSuggestion && (
              <p className="text-slate-300 text-xs pl-6 italic">
                {validationSuggestion}
              </p>
            )}
          </div>
        )}

        {/* STEP 1: TASK & TANGIBLE DELIVERABLE */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-slate-400">
                Work Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'study_topic', label: 'Study Topic', icon: BookOpen },
                  { id: 'assignment', label: 'Assignment', icon: FolderGit2 },
                  { id: 'project', label: 'Project', icon: Target },
                  { id: 'custom_task', label: 'Task', icon: ListTodo },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSlotType(item.id as SlotTypeOption)}
                      className={`p-2.5 rounded-lg text-center border transition-all cursor-pointer space-y-1 ${
                        slotType === item.id
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : 'bg-[#111318] text-slate-400 border-white/[0.06] hover:border-white/[0.15]'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto text-emerald-400" />
                      <div className="text-xs font-medium truncate">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignment picker if assignment */}
            {slotType === 'assignment' && assignments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#111318] border border-white/[0.06] space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-slate-400">
                    Active Assignment
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => handleAssignmentSelect(e.target.value)}
                    className="w-full bg-[#161922] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose an assignment --</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.milestones.filter((m) => m.status === 'completed').length}/{a.milestones.length} milestones)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAssignmentId && (
                  <div className="space-y-1">
                    <label className="block text-xs font-mono uppercase text-slate-400">
                      Target Milestone
                    </label>
                    <select
                      value={selectedMilestoneId}
                      onChange={(e) => handleMilestoneSelect(e.target.value)}
                      className="w-full bg-[#161922] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
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

            {/* Task Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-slate-300">
                What are you working on?
              </label>
              <Input
                placeholder="e.g. Distributed Systems Lab 2"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Desired Tangible Output */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase text-slate-300">
                  Visible Proof of Completion (Tangible Deliverable)
                </label>
                <span className="text-[11px] font-mono text-emerald-400">Rule 02: No vague tasks</span>
              </div>
              <Input
                placeholder="e.g. Complete 5 practice problems, write 400 words, commit endpoint"
                value={desiredOutput}
                onChange={(e) => setDesiredOutput(e.target.value)}
              />

              {/* Quick concrete presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CONCRETE_OUTPUT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDesiredOutput(preset)}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: 15-SECOND PHYSICAL STARTING TRIGGER */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <Zap className="w-4 h-4" />
                <span>Rule 01: Activation Energy Reduction</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                The brain flees uncertainty. Define a 15-second physical bodily movement involving a specific tool or file to eliminate startup friction.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-slate-300">
                First 15-second physical action:
              </label>
              <Input
                placeholder="e.g. Open VS Code, create server/index.ts, and write router skeleton"
                value={firstPhysicalAction}
                onChange={(e) => setFirstPhysicalAction(e.target.value)}
                autoFocus
              />
            </div>

            {/* Quick 1-click action presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">
                Instant Concrete Presets:
              </span>
              <div className="space-y-1.5">
                {PHYSICAL_ACTION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFirstPhysicalAction(preset)}
                    className="w-full text-left text-xs font-mono p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 transition-colors flex items-center gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DURATION & FRICTION LOCKDOWN */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Duration Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-300">
                Focus Duration
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-3 rounded-xl text-center border font-mono transition-all cursor-pointer ${
                      durationMinutes === mins
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30 font-bold'
                        : 'bg-[#111318] text-slate-400 border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="text-lg">{mins}m</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {mins === 15 ? 'Micro' : mins === 25 ? 'Standard' : mins === 40 ? 'Sprint' : 'Deep'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Overlap & Capacity warnings */}
            {overlappingSlot && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold font-mono">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>SCHEDULE OVERLAP BLOCKED</span>
                </div>
                <p className="text-slate-300 text-xs">
                  This window conflicts with &ldquo;{overlappingSlot.taskTitle}&rdquo; ({overlappingSlot.startTime}–{overlappingSlot.endTime}). You cannot schedule overlapping tasks.
                </p>
              </div>
            )}

            {isAtCapacity && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>DAILY LIMIT REACHED (5 SLOTS MAX)</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Chronic overplanning causes cognitive fatigue and failure loops. Complete your active slots before adding more.
                </p>
              </div>
            )}

            {/* Environmental Check: Phone out of reach */}
            <div className="p-4 rounded-xl bg-[#111318] border border-white/[0.07] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <PhoneOff className="w-4 h-4 text-amber-400" />
                <span>Environmental Distraction Protection</span>
              </div>
              <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={phoneConfirmed}
                  onChange={(e) => setPhoneConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-[#161922] border border-white/[0.15] text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="leading-relaxed">
                  I confirm that my phone is physically in another room, inside a drawer, or outside reach before entering this focus window.
                </span>
              </label>
            </div>

            {/* Plan Summary */}
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">Deliverable:</span>
                <span className="text-slate-200 font-medium">{desiredOutput}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">First Action:</span>
                <span className="text-emerald-400 font-mono truncate max-w-xs">{firstPhysicalAction}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          {step > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
              Cancel
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: {step === 1 ? '15s Action' : 'Duration'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveAndExecute(false)}
                disabled={Boolean(overlappingSlot) || isAtCapacity || !phoneConfirmed}
                leftIcon={<Calendar className="w-3.5 h-3.5" />}
              >
                Schedule Slot
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveAndExecute(true)}
                disabled={Boolean(overlappingSlot) || isAtCapacity || !phoneConfirmed}
                leftIcon={<Play className="w-3.5 h-3.5 fill-slate-950" />}
                className="font-semibold"
              >
                ⚡ Start Focus Now
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
