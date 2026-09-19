import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
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
  ShieldAlert,
  CalendarClock,
  Compass,
  Zap,
  Trash2,
  PhoneOff,
  Play,
  LifeBuoy,
  Sparkles,
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
    <Card
      variant="default"
      className={`transition-all ${slot ? accentClass : 'border-stone-800/30'}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${rank === 1 ? 'text-emerald-400' : 'text-stone-400'}`}>
            {label}
          </span>
          {slot && (
            <Badge variant={rank === 1 ? 'action' : 'neutral'}>
              {slot.estimatedDurationMinutes}m
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm text-stone-100 truncate">
          {slot ? slot.taskTitle : emptyHint}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slot ? (
          <div className="space-y-3">
            <div className="text-sm text-stone-300">
              <span className="text-stone-500">1st action: </span>
              &ldquo;{slot.firstPhysicalAction}&rdquo;
            </div>
            <div className="text-sm text-stone-400 truncate">
              Output: {slot.desiredOutput}
            </div>
            {slot.status !== 'completed' && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant={rank === 1 ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleStartSlot(slot)}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Start Focus
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecoverySlot(slot)}
                  className="text-amber-400 hover:text-amber-300 p-1.5"
                  title="10m Recovery"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-stone-500 italic">{emptyHint}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-emerald-400 hover:text-emerald-300 w-full justify-start p-0"
              onClick={() => setIsPlanModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Plan slot
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PageContainer
      title="Daily Work Windows"
      subtitle="Convert priorities into discrete, concrete work slots with defined physical outputs."
      ruleHint="Rule 02: Never schedule a vague task"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="border-amber-500/25 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
            leftIcon={<LifeBuoy className="w-3.5 h-3.5 text-amber-400" />}
            onClick={() => window.dispatchEvent(new CustomEvent('open-overwhelm-rescue'))}
          >
            Overwhelmed?
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach'))}
          >
            AI Coach
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Compass className="w-4 h-4" />}
            onClick={() => setIsPlanModalOpen(true)}
          >
            Plan Next Slot
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
                    className="p-4 rounded-xl surface-2 border border-stone-800/30 hover:border-stone-700/50 transition-all space-y-3"
                  >
                    {/* Slot header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/30 pb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-400 font-semibold">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span className="text-stone-700">·</span>
                        <Badge variant="action">{slot.estimatedDurationMinutes} min</Badge>
                        {slot.isTopPriority && (
                          <Badge variant="warning">Top {slot.isTopPriority}</Badge>
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
                          className="text-stone-500 hover:text-red-400 p-1.5"
                          aria-label="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Slot body */}
                    <div className="space-y-3">
                      <h4 className="font-['Outfit'] text-base font-semibold text-stone-100">
                        {slot.taskTitle}
                      </h4>

                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <Zap className="w-3.5 h-3.5" />
                          <span>First physical action</span>
                        </div>
                        <p className="text-sm text-stone-200">
                          &ldquo;{slot.firstPhysicalAction}&rdquo;
                        </p>
                      </div>

                      <div className="text-sm text-stone-300 flex items-start gap-2">
                        <span className="text-stone-500 shrink-0">Output:</span>
                        <span>{slot.desiredOutput}</span>
                      </div>

                      {slot.preparedData && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-400">
                          <span className="flex items-center gap-1 text-amber-300/80">
                            <PhoneOff className="w-3 h-3" />
                            Phone: {slot.preparedData.phoneLocation}
                          </span>
                          {slot.preparedData.ifThenPlan && (
                            <span className="text-stone-500 truncate max-w-xs">
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

        {/* Vague Task Notice */}
        <Card variant="subtle" className="p-5 border-amber-500/10 bg-amber-500/3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="space-y-1.5 text-left">
              <h4 className="text-sm font-semibold text-amber-300">
                Concrete action validator active
              </h4>
              <p className="text-sm text-stone-400 leading-relaxed">
                When scheduling a slot, START enforces 4 mandatory elements:{' '}
                <strong className="text-stone-200">Task</strong>,{' '}
                <strong className="text-stone-200">Desired Output</strong>,{' '}
                <strong className="text-stone-200">First Physical Action</strong>, and{' '}
                <strong className="text-stone-200">Duration</strong>.
                Ambiguous intentions like &ldquo;Study&rdquo; or &ldquo;Work on it&rdquo; are rejected.
              </p>
            </div>
          </div>
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
