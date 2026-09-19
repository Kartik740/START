import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { useSlots } from '../../hooks/useSlots.ts';
import { PlanSlotModal } from './PlanSlotModal.tsx';
import { ClarifySlotModal } from './ClarifySlotModal.tsx';
import {
  validateConcreteOutput,
  validateFirstPhysicalAction,
} from './vagueTaskValidator.ts';
import { RecoveryModal } from '../sessions/RecoveryModal.tsx';
import { sessionStorageManager, ActiveSessionState } from '../sessions/sessionStorage.ts';
import { dataService } from '../../services/dataService.ts';
import { WorkSlot } from '../../types/models.ts';
import {
  ListOrdered,
  Plus,
  CalendarClock,
  Compass,
  Zap,
  Trash2,
  PhoneOff,
  Play,
  LifeBuoy,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const PlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { slots, deleteSlot } = useSlots();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<WorkSlot | null>(null);
  const [recoverySlot, setRecoverySlot] = useState<WorkSlot | null>(null);
  const [slotToClarify, setSlotToClarify] = useState<WorkSlot | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(() =>
    sessionStorageManager.getActiveSession()
  );

  useEffect(() => {
    const handleStorage = () => {
      setActiveSession(sessionStorageManager.getActiveSession());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Top 1, 2, 3 priorities derived from slots
  const top1Slot = slots.find((s) => s.isTopPriority === 1) || slots[0];
  const top2Slot = slots.find((s) => s.isTopPriority === 2) || (slots[0] !== top1Slot ? slots[1] : slots[1]);
  const top3Slot = slots.find((s) => s.isTopPriority === 3) || slots[2];

  const handleDeleteSlot = async () => {
    if (slotToDelete) {
      await deleteSlot(slotToDelete.id);
      setSlotToDelete(null);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleStartSlot = async (slot: WorkSlot) => {
    const outputValidation = validateConcreteOutput(slot.desiredOutput || '');
    const actionValidation = validateFirstPhysicalAction(slot.firstPhysicalAction || '');

    if (!outputValidation.isValid || !actionValidation.isValid) {
      setSlotToClarify(slot);
      return;
    }

    if (slot.status !== 'in_progress') {
      await dataService.saveSlot({
        ...slot,
        status: 'in_progress',
      });
    }
    sessionStorageManager.startSession(slot);
    navigate('/session');
  };

  const handleLaunchRecovery = (slot: WorkSlot, rescueAction: string) => {
    sessionStorageManager.switchToRecovery(slot, rescueAction);
    navigate('/session');
  };

  // Priority card renderer
  const renderPriorityCard = (
    slot: WorkSlot | undefined,
    rank: number,
    label: string,
    emptyHint: string,
    accentClass: string
  ) => (
    <div
      className={`p-4 rounded-xl transition-all duration-150 flex flex-col justify-between ${
        slot
          ? `bg-[#12151c] border border-white/[0.07] ${accentClass} shadow-sm`
          : 'bg-white/[0.015] border border-white/[0.05]'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                rank === 1 ? 'bg-emerald-400' : rank === 2 ? 'bg-teal-400' : 'bg-slate-500'
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                rank === 1 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
          {slot && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
              {slot.estimatedDurationMinutes}m
            </span>
          )}
        </div>

        <div>
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-sm font-semibold text-white truncate">
            {slot ? slot.taskTitle : emptyHint}
          </h3>
        </div>

        {slot && (
          <div className="space-y-2 pt-1 text-xs">
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] text-slate-300">
              <span className="text-emerald-400 font-medium">1st action: </span>
              <span className="text-slate-300">&ldquo;{slot.firstPhysicalAction}&rdquo;</span>
            </div>
            <div className="text-slate-400 truncate">
              <span className="text-slate-500">Output: </span>
              {slot.desiredOutput}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-white/[0.05]">
        {slot ? (
          slot.status !== 'completed' && (
            <div className="flex items-center gap-2">
              <Button
                variant={rank === 1 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStartSlot(slot)}
                leftIcon={<Play className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Start Focus
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecoverySlot(slot)}
                className="text-amber-400 hover:text-amber-300 p-1.5 shrink-0"
                title="10m Recovery"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-400 hover:text-emerald-300 w-full justify-center p-1"
            onClick={() => setIsPlanModalOpen(true)}
            leftIcon={<Plus className="w-3 h-3" />}
          >
            Plan {label}
          </Button>
        )}
      </div>
    </div>
  );

  const activeSlotsCount = slots.filter((s) => s.status !== 'completed').length;
  const isAtCapacity = activeSlotsCount >= 5;

  return (
    <PageContainer
      title="Daily Work Windows"
      subtitle="Convert priorities into discrete, concrete work slots with defined physical outputs."
      ruleHint="Rule 02: Never schedule a vague task"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Compass className="w-4 h-4" />}
            onClick={() => setIsPlanModalOpen(true)}
            disabled={isAtCapacity}
            className={isAtCapacity ? 'opacity-60 cursor-not-allowed' : ''}
          >
            {isAtCapacity ? 'Daily Limit (5/5)' : 'Plan Next Slot'}
          </Button>
          <Link to="/today">
            <Button variant="secondary" size="sm">
              Today View
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 text-left">
        {/* Daily Capacity Cap Banner */}
        {isAtCapacity && (
          <div className="p-3.5 rounded-xl bg-[#12151c] border border-amber-500/25 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Daily focus bandwidth capped at 5 slots to prevent overplanning paralysis.</span>
            </div>
            <span className="font-mono text-amber-400 font-semibold">5 / 5 Slots</span>
          </div>
        )}
        {/* Active Focus Session Banner */}
        {activeSession && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-medium text-emerald-400 block">
                  Focus workspace running
                </span>
                <span className="text-sm font-semibold text-stone-100">
                  {activeSession.slot.taskTitle}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/session')}
            >
              Resume →
            </Button>
          </div>
        )}

        {/* Top 1-2-3 Priorities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderPriorityCard(
            top1Slot,
            1,
            'Top 1 · Anchor',
            'Primary essential deliverable',
            'border-emerald-500/25 bg-emerald-500/3'
          )}
          {renderPriorityCard(
            top2Slot,
            2,
            'Top 2',
            'Secondary progress task',
            'border-stone-700/50'
          )}
          {renderPriorityCard(
            top3Slot,
            3,
            'Top 3',
            'Tertiary buffer task',
            'border-stone-700/50'
          )}
        </div>

        {/* Scheduled Work Windows */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
                <span>Scheduled Work Windows</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-500">
                  {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsPlanModalOpen(true)}
                >
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <EmptyState
                icon={<ListOrdered className="w-6 h-6 text-stone-400" />}
                title="Today's plan is not set yet."
                description="Choose your Top 1 priority and schedule realistic work windows. START requires defining a concrete output and first physical action."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Compass className="w-4 h-4" />}
                    onClick={() => setIsPlanModalOpen(true)}
                  >
                    Plan Next Slot
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] hover:border-white/[0.12] transition-all space-y-3 shadow-sm"
                  >
                    {/* Slot header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] pb-3">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{slot.estimatedDurationMinutes}m</span>
                        {slot.isTopPriority && (
                          <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                            Top {slot.isTopPriority}
                          </span>
                        )}
                        <Badge
                          variant={
                            slot.status === 'completed'
                              ? 'success'
                              : slot.status === 'in_progress'
                              ? 'action'
                              : 'neutral'
                          }
                        >
                          {slot.status === 'in_progress' ? 'In progress' : slot.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {slot.status !== 'completed' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleStartSlot(slot)}
                              leftIcon={<Play className="w-3.5 h-3.5" />}
                            >
                              Start
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRecoverySlot(slot)}
                              className="text-amber-400 hover:text-amber-300 p-1.5"
                              title="10m Recovery"
                            >
                              <LifeBuoy className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSlotToDelete(slot)}
                          className="text-slate-500 hover:text-red-400 p-1.5"
                          aria-label="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Slot body */}
                    <div className="space-y-2.5">
                      <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-semibold text-white">
                        {slot.taskTitle}
                      </h4>

                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <Zap className="w-3.5 h-3.5" />
                          <span>First physical action</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200">
                          &ldquo;{slot.firstPhysicalAction}&rdquo;
                        </p>
                      </div>

                      <div className="text-xs sm:text-sm text-slate-400 flex items-start gap-2">
                        <span className="text-slate-500 shrink-0 font-medium">Deliverable:</span>
                        <span className="text-slate-300">{slot.desiredOutput}</span>
                      </div>

                      {slot.preparedData && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-amber-300/80 font-mono text-[11px]">
                            <PhoneOff className="w-3 h-3" />
                            Phone: {slot.preparedData.phoneLocation}
                          </span>
                          {slot.preparedData.ifThenPlan && (
                            <span className="text-slate-500 truncate max-w-xs text-[11px] font-mono">
                              · Defense: {slot.preparedData.ifThenPlan}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Slot Modal */}
        <PlanSlotModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event('storage'));
          }}
        />

        {/* 10-Minute Recovery Modal */}
        {recoverySlot && (
          <RecoveryModal
            isOpen={Boolean(recoverySlot)}
            onClose={() => setRecoverySlot(null)}
            slot={recoverySlot}
            onStartRecovery={handleLaunchRecovery}
          />
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={Boolean(slotToDelete)}
          onClose={() => setSlotToDelete(null)}
          onConfirm={handleDeleteSlot}
          isDestructive
          title="Remove Work Slot?"
          description={`Remove "${slotToDelete?.taskTitle}" from today's plan?`}
          confirmLabel="Remove Slot"
        />

        {/* Clarify Slot Modal (Enforces Rules 2 & 3 before starting) */}
        {slotToClarify && (
          <ClarifySlotModal
            key={slotToClarify.id}
            isOpen={Boolean(slotToClarify)}
            onClose={() => setSlotToClarify(null)}
            slot={slotToClarify}
            onStartReadySlot={(readySlot) => {
              setSlotToClarify(null);
              sessionStorageManager.startSession(readySlot);
              navigate('/session');
            }}
          />
        )}
      </div>
    </PageContainer>
  );
};
