import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Progress } from '../../components/ui/Progress.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { ScheduleSlotModal } from './ScheduleSlotModal.tsx';
import { Assignment, Milestone, AssignmentStatus, WorkSlot } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { calculateAssignmentBuffer } from './bufferEngine.ts';
import { sound } from '../../utils/sound.ts';
import { format } from '../../utils/dates.ts';
import {
  FolderGit2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  Sparkles,
  History,
} from 'lucide-react';

import { validateConcreteOutput, validateFirstPhysicalAction } from '../planner/vagueTaskValidator.ts';

export interface AssignmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  allSlots: WorkSlot[];
  onAssignmentUpdated: (updated: Assignment) => void;
  onAssignmentDeleted: (id: string) => void;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  isOpen,
  onClose,
  assignment,
  allSlots,
  onAssignmentUpdated,
  onAssignmentDeleted,
}) => {
  const [selectedMilestoneToSchedule, setSelectedMilestoneToSchedule] = useState<Milestone | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // New milestone draft
  const [newTitle, setNewTitle] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newHours, setNewHours] = useState(2);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  if (!assignment) return null;

  const bufferInfo = calculateAssignmentBuffer(assignment, allSlots);

  // Filter linked work slots
  const linkedSlots = allSlots.filter(
    (s) => s.assignmentId === assignment.id || s.taskTitle.toLowerCase().includes(assignment.title.toLowerCase())
  );

  const handleStatusChange = async (newStatus: AssignmentStatus) => {
    const updated: Assignment = {
      ...assignment,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await dataService.saveAssignment(updated);
    onAssignmentUpdated(updated);
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    const updatedMilestones = assignment.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextStatus = m.status === 'completed' ? 'not_started' : 'completed';
        return {
          ...m,
          status: nextStatus as Milestone['status'],
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.status === 'completed').length;
    const progressPercent = Math.round((completedCount / updatedMilestones.length) * 100);

    // Pick next action from the next incomplete milestone
    const nextIncomplete = updatedMilestones.find((m) => m.status !== 'completed');
    const nextAction = nextIncomplete?.nextAction || assignment.nextAction;

    const updatedAssignment: Assignment = {
      ...assignment,
      milestones: updatedMilestones,
      progressPercent,
      nextAction,
      status: progressPercent === 100 ? 'completed' : assignment.status === 'not_started' ? 'in_progress' : assignment.status,
      updatedAt: new Date().toISOString(),
    };

    if (completedCount > assignment.milestones.filter((m) => m.status === 'completed').length) {
      sound.playFinishBell(true);
    }

    await dataService.saveAssignment(updatedAssignment);
    onAssignmentUpdated(updatedAssignment);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setMilestoneError('Milestone title cannot be empty.');
      return;
    }

    const outputValidation = validateConcreteOutput(newOutput);
    if (!outputValidation.isValid) {
      setMilestoneError(outputValidation.reason || 'Please define a concrete visible output.');
      return;
    }

    const actionValidation = validateFirstPhysicalAction(newAction);
    if (!actionValidation.isValid) {
      setMilestoneError(actionValidation.reason || 'First physical action cannot be vague.');
      return;
    }

    setMilestoneError(null);

    const newM: Milestone = {
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      title: newTitle.trim(),
      intendedOutput: newOutput.trim(),
      nextAction: newAction.trim(),
      sequence: assignment.milestones.length,
      estimatedHours: newHours || 2,
      status: 'not_started',
    };

    const updatedMilestones = [...assignment.milestones, newM];
    const completedCount = updatedMilestones.filter((m) => m.status === 'completed').length;
    const progressPercent = Math.round((completedCount / updatedMilestones.length) * 100);

    const updated: Assignment = {
      ...assignment,
      milestones: updatedMilestones,
      progressPercent,
      updatedAt: new Date().toISOString(),
    };

    await dataService.saveAssignment(updated);
    onAssignmentUpdated(updated);

    setNewTitle('');
    setNewOutput('');
    setNewAction('');
    setIsAddingMilestone(false);
  };

  const handleDeleteAssignment = async () => {
    await dataService.deleteAssignment(assignment.id);
    onAssignmentDeleted(assignment.id);
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  const importanceBadgeVariants: Record<string, 'neutral' | 'action' | 'warning' | 'danger'> = {
    low: 'neutral',
    medium: 'action',
    high: 'warning',
    critical: 'danger',
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2 text-stone-100">
            <FolderGit2 className="w-5 h-5 text-emerald-400" />
            <span className="truncate">{assignment.title}</span>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="action">{assignment.category}</Badge>
            <Badge variant={importanceBadgeVariants[assignment.importance]}>
              {assignment.importance} priority
            </Badge>
            <span className="text-stone-500 font-mono text-xs">
              Due {format(new Date(assignment.deadline), 'EEE, MMM d, yyyy')}
            </span>
          </div>
        }
      >
        <div className="space-y-6 text-left max-h-[75vh] overflow-y-auto pr-1">
          {/* Status Switcher & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 font-mono mr-1">Status:</span>
              {(['not_started', 'in_progress', 'paused', 'completed', 'archived'] as AssignmentStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase transition-all cursor-pointer ${
                      assignment.status === st
                        ? 'bg-emerald-500 text-stone-950 font-bold'
                        : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                )
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="text-stone-500 hover:text-rose-400"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>

          {/* DEADLINE BUFFER VISUALIZATION */}
          <div className="p-4 rounded-xl surface-1 border border-stone-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-200">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
                <span>DEADLINE BUFFER & WORK SESSIONS</span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  bufferInfo.isPastDue
                    ? 'bg-rose-500/20 text-rose-400'
                    : bufferInfo.isUrgent
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {bufferInfo.isPastDue
                  ? `${Math.abs(bufferInfo.daysRemaining)}d OVERDUE`
                  : `${bufferInfo.daysRemaining}d REMAINING`}
              </span>
            </div>

            {/* Behavioral Warning Banner */}
            {bufferInfo.behavioralWarning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-0.5 leading-snug">
                  <span className="font-semibold block font-mono">BEHAVIORAL GAP DETECTED</span>
                  <span>{bufferInfo.behavioralWarning}</span>
                </div>
              </div>
            )}

            {/* Buffer Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl surface-0 border border-stone-850 space-y-1">
                <span className="text-xs font-mono text-stone-400 block">Milestones Remaining</span>
                <span className="text-sm font-semibold font-mono text-stone-200">
                  {bufferInfo.milestonesRemaining} of {bufferInfo.milestonesTotal}
                </span>
              </div>

              <div className="p-3 rounded-xl surface-0 border border-stone-850 space-y-1">
                <span className="text-xs font-mono text-stone-400 block">Last Planned Session</span>
                <span className="text-xs font-mono text-stone-300 truncate block">
                  {bufferInfo.lastPlannedSessionDate || 'None recorded'}
                </span>
              </div>

              <div className="p-3 rounded-xl surface-0 border border-stone-850 space-y-1">
                <span className="text-xs font-mono text-stone-400 block">Next Planned Session</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold truncate block">
                  {bufferInfo.nextPlannedSessionDate || 'No sessions scheduled'}
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="pt-2">
              <Progress
                value={assignment.progressPercent}
                max={100}
                variant="violet"
                height="md"
                showLabel
              />
            </div>
          </div>

          {/* CONCRETE NEXT ACTION CARD */}
          <div className="p-4 rounded-xl bg-stone-950 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold">
                <Zap className="w-4 h-4" />
                <span>CONCRETE NEXT ACTION</span>
              </div>
              <span className="text-xs font-mono text-stone-400">Rule 01 • Immediate execution</span>
            </div>

            <p className="text-sm sm:text-base font-mono font-medium text-stone-100">
              &ldquo;{assignment.nextAction}&rdquo;
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedMilestoneToSchedule(null);
                  setIsScheduleOpen(true);
                }}
                leftIcon={<CalendarClock className="w-4 h-4" />}
              >
                Schedule Work Slot
              </Button>
            </div>
          </div>

          {/* MILESTONES BREAKDOWN LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-stone-400">
                Staged Milestones ({assignment.milestones.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                {isAddingMilestone ? 'Cancel' : 'Add Milestone'}
              </Button>
            </div>

            {/* Inline Add Milestone Form with Decomposition Assistant */}
            {isAddingMilestone && (
              <form
                onSubmit={handleCreateMilestone}
                className="p-4 rounded-xl bg-stone-900 border border-emerald-500/30 space-y-3 text-xs"
              >
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>TASK DECOMPOSITION ASSISTANT</span>
                </div>
                <p className="text-stone-300">
                  What would count as visible evidence that this step is complete?
                </p>

                {milestoneError && (
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-850 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{milestoneError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Milestone title (e.g. Implement edge detection kernels)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800/40 rounded-lg px-3 py-2 text-stone-100 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Intended Visible Output (e.g. Test script outputs 5 filtered images)"
                    value={newOutput}
                    onChange={(e) => setNewOutput(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800/40 rounded-lg px-3 py-2 text-stone-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="First Physical Action (e.g. Open convolution.py and define Sobel matrix)"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800/40 rounded-lg px-3 py-2 text-stone-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Estimated Effort:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="40"
                      step="0.5"
                      value={newHours}
                      onChange={(e) => setNewHours(parseFloat(e.target.value) || 2)}
                      className="w-16 bg-stone-950 border border-stone-800/40 rounded px-2 py-1 text-stone-100 text-center font-mono"
                    />
                    <span className="text-stone-400">hours</span>
                    <div className="ml-auto">
                      <Button variant="primary" size="sm" type="submit">
                        Save Milestone
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Milestones Timeline */}
            <div className="space-y-2.5">
              {assignment.milestones.map((m, idx) => {
                const isCompleted = m.status === 'completed';
                return (
                  <div
                    key={m.id || idx}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 text-left ${
                      isCompleted
                        ? 'bg-stone-950/40 border-stone-850 opacity-70'
                        : 'surface-1 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m.id)}
                          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                          className="mt-0.5 text-stone-500 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-600" />
                          )}
                        </button>
                        <div className="space-y-1">
                          <h5
                            className={`text-sm font-semibold tracking-tight ${
                              isCompleted
                                ? 'text-stone-400 line-through'
                                : 'text-stone-100'
                            }`}
                          >
                            {m.title}
                          </h5>

                          {/* Intended Visible Output */}
                          {m.intendedOutput && (
                            <div className="text-xs text-stone-300 flex items-start gap-1.5">
                              <span className="text-emerald-400 font-mono font-medium shrink-0">
                                Visible Evidence:
                              </span>
                              <span>{m.intendedOutput}</span>
                            </div>
                          )}

                          {/* Milestone First Action */}
                          {m.nextAction && !isCompleted && (
                            <div className="text-xs text-stone-400 flex items-start gap-1.5 font-mono">
                              <span className="text-stone-500 shrink-0">1st Action:</span>
                              <span className="text-stone-300">&ldquo;{m.nextAction}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {m.estimatedHours}h
                        </span>
                        {!isCompleted && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedMilestoneToSchedule(m);
                              setIsScheduleOpen(true);
                            }}
                            className="text-xs"
                          >
                            Schedule Slot
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. PLANNED WORK SESSIONS */}
          <div className="space-y-3 pt-3 border-t border-stone-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Planned Work Sessions ({linkedSlots.filter((s) => s.status === 'planned' || s.status === 'in_progress').length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedMilestoneToSchedule(null);
                  setIsScheduleOpen(true);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Schedule Session
              </Button>
            </div>

            {linkedSlots.filter((s) => s.status === 'planned' || s.status === 'in_progress').length === 0 ? (
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/40 text-xs text-stone-400 italic">
                No future work sessions planned. Behavioral rule: distant deadlines require scheduled calendar slots now.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedSlots
                  .filter((s) => s.status === 'planned' || s.status === 'in_progress')
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800/40 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold">{slot.date}</span>
                          <span className="text-stone-400">at {slot.startTime}</span>
                          <span className="text-stone-500">({slot.estimatedDurationMinutes}m)</span>
                        </div>
                        <Badge variant={slot.status === 'in_progress' ? 'action' : 'neutral'}>
                          {slot.status}
                        </Badge>
                      </div>
                      <div className="text-stone-200 font-medium truncate">{slot.taskTitle}</div>
                      {slot.firstPhysicalAction && (
                        <div className="text-xs font-mono text-stone-400">
                          1st action: &ldquo;{slot.firstPhysicalAction}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 7. PROGRESS HISTORY */}
          <div className="space-y-3 pt-3 border-t border-stone-800/40">
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Progress History ({assignment.milestones.filter((m) => m.status === 'completed').length} completed milestones)
              </span>
            </div>

            {assignment.milestones.filter((m) => m.status === 'completed').length === 0 &&
            linkedSlots.filter((s) => s.status === 'completed' || s.status === 'recovered').length === 0 ? (
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/40 text-xs text-stone-500 italic">
                No progress logged yet. Completing your first milestone or finishing a focus slot will record verifiable history here.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Completed Milestones */}
                {assignment.milestones
                  .filter((m) => m.status === 'completed')
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-stone-950/80 border border-emerald-900/40 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {m.title}
                        </span>
                        <span className="text-xs font-mono text-stone-500">
                          {m.completedAt ? format(new Date(m.completedAt), 'MMM d, yyyy') : 'Completed'}
                        </span>
                      </div>
                      {m.intendedOutput && (
                        <div className="text-xs text-stone-300">
                          <span className="text-stone-500 font-mono">Produced evidence: </span>
                          {m.intendedOutput}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Completed Sessions */}
                {linkedSlots
                  .filter((s) => s.status === 'completed' || s.status === 'recovered')
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3.5 rounded-xl surface-0 border border-stone-850 flex items-center justify-between text-xs font-mono text-stone-400"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-emerald-400">✓ Finished slot:</span>
                        <span className="text-stone-200 truncate">{slot.taskTitle}</span>
                        <span className="text-stone-500">({slot.estimatedDurationMinutes}m on {slot.date})</span>
                      </div>
                      <Badge variant="success">Completed</Badge>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Schedule Slot Modal */}
      <ScheduleSlotModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        assignment={assignment}
        milestone={selectedMilestoneToSchedule || undefined}
        onSuccess={() => {
          // Re-fetch slots or trigger state
          window.dispatchEvent(new Event('storage'));
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteAssignment}
        isDestructive
        title="Delete Assignment?"
        description={`Are you sure you want to delete "${assignment.title}" and its ${assignment.milestones.length} milestones? This action cannot be undone.`}
        confirmLabel="Delete Assignment"
      />
    </>
  );
};
