import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { WorkSlot, WorkSession } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { sessionStorageManager, ActiveSessionState } from './sessionStorage.ts';
import {
  validateFirstPhysicalAction,
  validateConcreteOutput,
} from '../planner/vagueTaskValidator.ts';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  BatteryCharging,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { getContextualRuleReminder } from '../rules/ruleEngine.ts';
import { ContextualRuleBanner } from '../../components/ui/ContextualRuleBanner.tsx';

export interface CloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: ActiveSessionState;
  actualElapsedSeconds: number;
  onCompleted: (session: WorkSession, nextSlot?: WorkSlot) => void;
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  actualElapsedSeconds,
  onCompleted,
}) => {
  // Session Review State
  const [producedOutput, setProducedOutput] = useState('');
  const [completeness, setCompleteness] = useState<'complete' | 'partial' | 'not_yet'>('partial');
  const [remainingWork, setRemainingWork] = useState('');
  const [resistance, setResistance] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [phoneStayedAway, setPhoneStayedAway] = useState(
    activeSession.slot.preparedData?.phoneLocation
      ? activeSession.slot.preparedData.phoneLocation !== 'On desk'
      : true
  );

  // Mandatory Next Action State
  const [nextAction, setNextAction] = useState('');
  const [nextOutput, setNextOutput] = useState('');
  const [nextWhen, setNextWhen] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [customTime, setCustomTime] = useState('10:00');
  const [nextDuration, setNextDuration] = useState<number>(25);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuggestion, setActionSuggestion] = useState<string | null>(null);
  const [outputError, setOutputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actualMinutes = Math.max(1, Math.round(actualElapsedSeconds / 60));
  const pausesCount = activeSession.pausedIntervals.length;
  const distractionsCount = activeSession.distractions.length;

  const handleNextActionChange = (val: string) => {
    setNextAction(val);
    if (actionError) {
      const res = validateFirstPhysicalAction(val);
      if (res.isValid) {
        setActionError(null);
        setActionSuggestion(null);
      }
    }
  };

  const handleNextOutputChange = (val: string) => {
    setNextOutput(val);
    if (outputError) {
      const res = validateConcreteOutput(val);
      if (res.isValid) {
        setOutputError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if next action definition is required
    const requiresNextSlot = completeness !== 'complete' || nextAction.trim().length > 0;

    let scheduledSlot: WorkSlot | undefined;

    if (requiresNextSlot) {
      const actionValidation = validateFirstPhysicalAction(nextAction);
      if (!actionValidation.isValid) {
        setActionError(actionValidation.reason || 'Please define a valid concrete action.');
        setActionSuggestion(actionValidation.suggestion || null);
        return;
      }

      const outputValidation = validateConcreteOutput(
        nextOutput || `Continue ${activeSession.slot.taskTitle}`
      );
      if (!outputValidation.isValid) {
        setOutputError(outputValidation.reason || 'Please define a valid concrete output.');
        return;
      }

      // Calculate next slot date and times
      let targetDate: string;
      let startTimeStr = '10:00';

      const now = new Date();
      if (nextWhen === 'today') {
        targetDate = now.toISOString().split('T')[0];
        // Schedule next slot 1 hour from now or next clean hour
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        startTimeStr = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
      } else if (nextWhen === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = tomorrow.toISOString().split('T')[0];
        startTimeStr = '10:00';
      } else {
        targetDate = customDate;
        startTimeStr = customTime;
      }

      const [sH, sM] = startTimeStr.split(':').map(Number);
      const endTotalM = (sH || 10) * 60 + (sM || 0) + nextDuration;
      const endH = Math.floor(endTotalM / 60) % 24;
      const endM = endTotalM % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      scheduledSlot = {
        id: crypto.randomUUID(),
        date: targetDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        assignmentId: activeSession.slot.assignmentId,
        milestoneId: activeSession.slot.milestoneId,
        taskTitle: activeSession.slot.taskTitle,
        desiredOutput: nextOutput.trim() || `Continue ${activeSession.slot.taskTitle}`,
        firstPhysicalAction: nextAction.trim(),
        estimatedDurationMinutes: nextDuration,
        status: 'planned',
        slotType: activeSession.slot.slotType,
      };

      await dataService.saveSlot(scheduledSlot);
    }

    setIsSubmitting(true);

    try {
      // 1. Mark active slot as completed
      const updatedOriginalSlot: WorkSlot = {
        ...activeSession.slot,
        status: 'completed',
      };
      await dataService.saveSlot(updatedOriginalSlot);

      // 2. Create and log the completed WorkSession
      const sessionLog: WorkSession = {
        id: crypto.randomUUID(),
        workSlotId: activeSession.slot.id,
        assignmentId: activeSession.slot.assignmentId,
        milestoneId: activeSession.slot.milestoneId,
        taskTitle: activeSession.slot.taskTitle,
        actualDurationMinutes: actualMinutes,
        targetDurationMinutes: activeSession.targetDurationMinutes,
        resistanceLevel: resistance,
        energyLevel: energy,
        phoneOutsideReach: phoneStayedAway,
        producedOutput: producedOutput.trim() || 'Work session completed.',
        distractionsCapturedCount: distractionsCount,
        startedAt: activeSession.startedAt,
        endedAt: new Date().toISOString(),
        wasRecoverySession: activeSession.wasRecoverySession,
        isOutputComplete: completeness,
        remainingWork: remainingWork.trim() || undefined,
        pausesCount,
        nextActionScheduledSlotId: scheduledSlot?.id,
      };

      await dataService.logSession(sessionLog);

      // 3. Clear active session state from localStorage
      sessionStorageManager.clearActiveSession();

      // 4. Notify parent
      onCompleted(sessionLog, scheduledSlot);
    } catch (err) {
      console.error('Failed to complete session:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Session Review & Next Point of Entry</span>
        </div>
      }
      description="Record tangible output, evaluate resistance, and seal the next entry point before your working memory fades."
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Top Session Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800/40 text-xs">
          <div>
            <span className="text-stone-500 block uppercase font-mono text-xs">Work Target</span>
            <span className="font-semibold text-stone-200 truncate block">
              {activeSession.slot.taskTitle}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block uppercase font-mono text-xs">
              Actual vs Target
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {actualMinutes}m / {activeSession.targetDurationMinutes}m
            </span>
          </div>
          <div>
            <span className="text-stone-500 block uppercase font-mono text-xs">
              Resisted Impulses
            </span>
            <span className="font-mono font-bold text-amber-400">
              {distractionsCount} captured
            </span>
          </div>
          <div>
            <span className="text-stone-500 block uppercase font-mono text-xs">Pauses</span>
            <span className="font-mono text-stone-300">{pausesCount} times</span>
          </div>
        </div>

        {/* SECTION 1: What was produced */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            1. What Tangible Output Was Produced?
          </h4>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">
              What did you actually produce during this session?
            </label>
            <textarea
              className="w-full bg-stone-950 border border-stone-800/40 rounded-lg p-3 text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 min-h-[70px] resize-none"
              placeholder="e.g. Completed problems 1–4, wrote 350 words of introduction, tested API auth route..."
              value={producedOutput}
              onChange={(e) => setProducedOutput(e.target.value)}
              required
            />
          </div>

          {/* Completeness selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">
              Is the intended output complete?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'complete', label: 'Yes, fully complete', badge: 'Done' },
                { id: 'partial', label: 'Partially complete', badge: 'In Progress' },
                { id: 'not_yet', label: 'Not yet / friction hit', badge: 'Needs Followup' },
              ].map((c) => {
                const isSelected = completeness === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCompleteness(c.id as any)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{c.label}</div>
                    <div className="text-xs text-stone-500 font-mono mt-0.5">{c.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remaining work if partial or not yet */}
          {completeness !== 'complete' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-amber-300/90">
                What remains to be finished?
              </label>
              <Input
                placeholder="e.g. Problems 5 and 6, plus proof check..."
                value={remainingWork}
                onChange={(e) => setRemainingWork(e.target.value)}
              />
            </div>
          )}

          {/* Resistance & Energy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5 bg-stone-950/60 p-3 rounded-xl border border-stone-800/40">
              <label className="flex items-center gap-1.5 text-xs text-stone-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Internal Resistance Experienced (1 = Flow, 5 = High)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setResistance(lvl as any)}
                    className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      resistance === lvl
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 bg-stone-950/60 p-3 rounded-xl border border-stone-800/40">
              <label className="flex items-center gap-1.5 text-xs text-stone-300">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span>Energy Level (1 = Exhausted, 5 = High Energy)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergy(lvl as any)}
                    className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      energy === lvl
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phone Friction Check */}
          <label className="flex items-center gap-2.5 p-3.5 rounded-xl surface-0 border border-stone-800/40 text-xs text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={phoneStayedAway}
              onChange={(e) => setPhoneStayedAway(e.target.checked)}
              className="rounded border-stone-700 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-stone-900"
            />
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-stone-400" />
              <span>Phone was kept out of physical reach during this session</span>
            </div>
          </label>
        </div>

        {/* SECTION 2: MANDATORY Next Action Protocol */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-teal-950/30 to-stone-950/80 border border-teal-500/30 space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-teal-300 font-bold">
                2. Mandatory: Define the Next Point of Entry
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                {completeness === 'complete'
                  ? 'Great finish! Define what step comes next in this project to keep momentum.'
                  : 'Avoidance occurs when you do not know where to start next. Define the concrete next step right now.'}
              </p>
            </div>
          </div>

          <ContextualRuleBanner reminder={getContextualRuleReminder('finish_session')} />

          {/* Next Physical Action */}
          <div className="space-y-1">
            <Input
              label="Next First Physical Action (15-second concrete motion)"
              placeholder="e.g. Open problem 5 on page 42 and write equation (1)"
              value={nextAction}
              onChange={(e) => handleNextActionChange(e.target.value)}
              required={completeness !== 'complete'}
            />
            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{actionError}</span>
                </div>
                {actionSuggestion && (
                  <p className="text-xs text-rose-200/80 pl-5">{actionSuggestion}</p>
                )}
              </div>
            )}
          </div>

          {/* Next Concrete Output */}
          <div className="space-y-1">
            <Input
              label="Next Concrete Output (What artifact will exist?)"
              placeholder="e.g. Solution to problem 5 & 6 documented in notebook"
              value={nextOutput}
              onChange={(e) => handleNextOutputChange(e.target.value)}
              required={completeness !== 'complete'}
            />
            {outputError && (
              <p className="text-xs text-rose-400 font-mono pl-1">{outputError}</p>
            )}
          </div>

          {/* Next When */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase text-stone-400">
              When should this happen next?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'today', label: 'Today', sub: 'Later session' },
                { id: 'tomorrow', label: 'Tomorrow', sub: 'Next morning' },
                { id: 'custom', label: 'Specific Time', sub: 'Custom date/time' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNextWhen(opt.id as any)}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    nextWhen === opt.id
                      ? 'bg-teal-500/20 border-teal-500/50 text-indigo-200'
                      : 'surface-1 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-xs text-stone-500">{opt.sub}</div>
                </button>
              ))}
            </div>

            {nextWhen === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <Input
                  type="date"
                  label="Target Date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                <Input
                  type="time"
                  label="Target Time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Next Duration */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase text-stone-400">
              Session Duration
            </label>
            <div className="flex gap-2">
              {[10, 20, 25, 40, 50, 60].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setNextDuration(dur)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    nextDuration === dur
                      ? 'bg-teal-500 text-stone-950'
                      : 'bg-stone-900 border border-stone-800/40 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800/40">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Back to Active Workspace
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold px-5"
          >
            Save Review & Schedule Next Slot
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
