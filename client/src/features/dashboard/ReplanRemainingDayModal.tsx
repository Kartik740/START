import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { WorkSlot } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import {
  ShieldCheck,
  Clock,
  Trash2,
  CalendarCheck,
  Zap,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  aiSuggestFeasibleReplan,
  ReplanSuggestion,
} from '../ai/aiWorkflows.ts';

export interface ReplanRemainingDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: WorkSlot[];
  onReplanned: () => void;
}

export const ReplanRemainingDayModal: React.FC<ReplanRemainingDayModalProps> = ({
  isOpen,
  onClose,
  slots,
  onReplanned,
}) => {
  const [strategy, setStrategy] = useState<'shift_all' | 'focus_top1_only' | 'drop_buffer'>('shift_all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAiReplan, setIsGeneratingAiReplan] = useState(false);
  const [aiReplanSuggestion, setAiReplanSuggestion] = useState<ReplanSuggestion | null>(null);

  // Filter uncompleted slots
  const pendingSlots = slots.filter((s) => s.status === 'planned' || s.status === 'in_progress');
  const top1Slot = pendingSlots.find((s) => s.isTopPriority === 1) || pendingSlots[0];
  const otherPendingSlots = pendingSlots.filter((s) => s.id !== top1Slot?.id);

  // Calculate current rounded start time (next 5-minute block)
  const getNextCleanStartTime = (date: Date = new Date()): string => {
    const m = date.getMinutes();
    const nextM = Math.ceil(m / 5) * 5;
    date.setMinutes(nextM);
    const h = date.getHours() % 24;
    const finalM = date.getMinutes() % 60;
    return `${String(h).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  };

  const handleGenerateAiReplan = async () => {
    setIsGeneratingAiReplan(true);
    try {
      const now = new Date();
      const currentTimeCursor = getNextCleanStartTime(now);
      const suggestion = await aiSuggestFeasibleReplan(
        pendingSlots,
        currentTimeCursor,
        top1Slot?.id
      );
      setAiReplanSuggestion(suggestion);
    } catch (err) {
      console.error('Failed to generate AI replan:', err);
    } finally {
      setIsGeneratingAiReplan(false);
    }
  };

  const handleApplyAiReplan = async () => {
    if (!aiReplanSuggestion) return;
    setIsSubmitting(true);
    try {
      for (const adj of aiReplanSuggestion.proposedAdjustments) {
        const slot = pendingSlots.find((s) => s.id === adj.slotId);
        if (slot) {
          if (adj.action === 'keep' || adj.action === 'reschedule_today') {
            const updatedSlot: WorkSlot = {
              ...slot,
              startTime: adj.newStartTime || slot.startTime,
              endTime: adj.newEndTime || slot.endTime,
              estimatedDurationMinutes: adj.newDurationMinutes || slot.estimatedDurationMinutes,
              status: 'planned',
              delayReason: undefined,
            };
            await dataService.saveSlot(updatedSlot);
          } else if (adj.action === 'drop' || adj.action === 'defer_tomorrow') {
            await dataService.deleteSlot(slot.id);
          }
        }
      }
      window.dispatchEvent(new Event('storage'));
      onReplanned();
      onClose();
    } catch (err) {
      console.error('Failed to apply AI replan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = (h || 0) * 60 + (m || 0) + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleExecuteReplan = async () => {
    if (!top1Slot) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      let currentTimeCursor = getNextCleanStartTime(now);

      if (strategy === 'focus_top1_only') {
        // 1. Update Top 1 to start right now
        const updatedTop1: WorkSlot = {
          ...top1Slot,
          startTime: currentTimeCursor,
          endTime: calculateEndTime(currentTimeCursor, top1Slot.estimatedDurationMinutes),
          status: 'planned',
          delayReason: undefined,
        };
        await dataService.saveSlot(updatedTop1);

        // 2. Remove / defer all lower priority slots for today
        for (const slot of otherPendingSlots) {
          await dataService.deleteSlot(slot.id);
        }
      } else if (strategy === 'drop_buffer') {
        // Keep Top 1 and Top 2, remove Top 3
        const updatedTop1: WorkSlot = {
          ...top1Slot,
          startTime: currentTimeCursor,
          endTime: calculateEndTime(currentTimeCursor, top1Slot.estimatedDurationMinutes),
          status: 'planned',
          delayReason: undefined,
        };
        await dataService.saveSlot(updatedTop1);

        const top2 = otherPendingSlots.find((s) => s.isTopPriority === 2);
        if (top2) {
          // Add 10-minute break
          const [h1, m1] = updatedTop1.endTime.split(':').map(Number);
          const t2StartTotal = h1 * 60 + m1 + 10;
          const t2H = Math.floor(t2StartTotal / 60) % 24;
          const t2M = t2StartTotal % 60;
          const t2StartTime = `${String(t2H).padStart(2, '0')}:${String(t2M).padStart(2, '0')}`;

          const updatedTop2: WorkSlot = {
            ...top2,
            startTime: t2StartTime,
            endTime: calculateEndTime(t2StartTime, top2.estimatedDurationMinutes),
            status: 'planned',
            delayReason: undefined,
          };
          await dataService.saveSlot(updatedTop2);
        }

        // Delete any remaining lower-priority slots
        const slotsToDrop = otherPendingSlots.filter((s) => s.isTopPriority !== 2);
        for (const s of slotsToDrop) {
          await dataService.deleteSlot(s.id);
        }
      } else {
        // Shift all pending slots sequentially starting now
        for (const slot of pendingSlots) {
          const updatedSlot: WorkSlot = {
            ...slot,
            startTime: currentTimeCursor,
            endTime: calculateEndTime(currentTimeCursor, slot.estimatedDurationMinutes),
            status: 'planned',
            delayReason: undefined,
          };
          await dataService.saveSlot(updatedSlot);

          // Advance cursor + 10 min break
          const [eH, eM] = updatedSlot.endTime.split(':').map(Number);
          const nextTotal = eH * 60 + eM + 10;
          const nextH = Math.floor(nextTotal / 60) % 24;
          const nextM = nextTotal % 60;
          currentTimeCursor = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
        }
      }

      window.dispatchEvent(new Event('storage'));
      onReplanned();
      onClose();
    } catch (err) {
      console.error('Failed to replan day:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>Replan Remaining Day</span>
        </div>
      }
      description="Time passed without starting. Re-anchoring your timeline protects your Top 1 priority and prevents spiral."
    >
      <div className="space-y-4 text-left">
        {/* Anti-Guilt Anchor Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Top 1 Protection Guaranteed</span>
          </div>
          <p className="text-stone-300 text-xs leading-relaxed">
            The anti-procrastination rule: Never sacrifice your Anchor priority to salvage a packed schedule. Lower-priority tasks are discarded or delayed; the Top 1 survives.
          </p>
        </div>

        {/* Current Top 1 Highlight */}
        {top1Slot && (
          <div className="p-3 rounded-xl surface-0 border border-stone-800/40 text-xs space-y-1">
            <span className="text-xs font-mono uppercase text-teal-400 font-bold block">
              Protected Anchor Priority
            </span>
            <div className="text-sm font-semibold text-stone-100">{top1Slot.taskTitle}</div>
            <div className="text-stone-400 text-xs">
              Output: {top1Slot.desiredOutput} ({top1Slot.estimatedDurationMinutes}m)
            </div>
          </div>
        )}

        {/* Strategy Selector */}
        {/* AI Feasible Replan Engine */}
        <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono uppercase text-amber-300 font-bold">
                AI Feasible Reduction
              </span>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiReplan}
              disabled={isGeneratingAiReplan}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAiReplan ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Analyzing Feasibility...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>AI Suggest Feasible Plan</span>
                </>
              )}
            </button>
          </div>

          {aiReplanSuggestion ? (
            <div className="space-y-3 p-3 rounded-xl surface-1 border border-amber-500/40">
              <div className="space-y-1">
                <div className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{aiReplanSuggestion.headline}</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed font-mono">
                  {aiReplanSuggestion.reasoning}
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-mono uppercase text-stone-400 tracking-wider block">
                  Proposed Adjustments:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {aiReplanSuggestion.proposedAdjustments.map((adj, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl surface-0 border border-stone-800/40 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-stone-200 block">
                          {adj.taskTitle}
                        </span>
                        <span className="text-xs text-stone-400 font-mono">
                          {adj.reason}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {adj.action === 'keep' || adj.action === 'reschedule_today' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            KEEP {adj.newStartTime ? `(${adj.newStartTime})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            DEFER TO TOMORROW
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-800">
                <span className="text-xs text-stone-400 font-mono">
                  Explicit confirmation required to apply.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyAiReplan}
                  isLoading={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono text-xs"
                >
                  Apply AI Feasible Replan
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 leading-relaxed">
              Behind schedule? Have the AI evaluate remaining time, lock your Top 1 priority, and defer secondary buffer work into tomorrow.
            </p>
          )}
        </div>

        {/* Manual Strategy Selector */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase text-stone-400 block">
            Or Choose Manual Replan Strategy:
          </span>

          <div className="space-y-2">
            {/* Option 1: Shift all */}
            <button
              type="button"
              onClick={() => setStrategy('shift_all')}
              className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                strategy === 'shift_all'
                  ? 'bg-teal-500/20 border-teal-500/60 text-stone-100 ring-1 ring-teal-500/30'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-stone-200">
                  Shift All Pending Slots Forward
                </div>
                <div className="text-xs text-stone-400">
                  Start Top 1 now, sequence remaining slots with 10-minute rest buffers.
                </div>
              </div>
            </button>

            {/* Option 2: Focus Top 1 Only */}
            <button
              type="button"
              onClick={() => setStrategy('focus_top1_only')}
              className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                strategy === 'focus_top1_only'
                  ? 'bg-amber-500/20 border-amber-500/60 text-stone-100 ring-1 ring-amber-500/30'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-stone-200">
                  Defend Top 1 Anchor Only (Recommended if High Resistance)
                </div>
                <div className="text-xs text-stone-400">
                  Clear lower-priority slots for today. Deliver your single essential task with zero pressure.
                </div>
              </div>
            </button>

            {/* Option 3: Drop Top 3 */}
            {otherPendingSlots.length > 1 && (
              <button
                type="button"
                onClick={() => setStrategy('drop_buffer')}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                  strategy === 'drop_buffer'
                    ? 'bg-teal-500/20 border-teal-500/60 text-stone-100 ring-1 ring-teal-500/30'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Trash2 className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-stone-200">
                    Keep Top 1 & Top 2, Drop Tertiary Buffer
                  </div>
                  <div className="text-xs text-stone-400">
                    Discard cleanup tasks to create realistic breathing room.
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleExecuteReplan}
            isLoading={isSubmitting}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4"
          >
            Apply Replan
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
