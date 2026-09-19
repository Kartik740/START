import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Progress } from '../../components/ui/Progress.tsx';
import { useAssignments } from '../../hooks/useAssignments.ts';
import { storage } from '../../lib/storage.ts';
import { Assignment, WorkSlot } from '../../types/models.ts';
import { calculateAssignmentBuffer } from './bufferEngine.ts';
import { CreateAssignmentModal } from './CreateAssignmentModal.tsx';
import { AssignmentDetailModal } from './AssignmentDetailModal.tsx';
import { ScheduleSlotModal } from './ScheduleSlotModal.tsx';
import { format } from '../../utils/dates.ts';
import {
  FolderGit2,
  Plus,
  CalendarClock,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Milestone as MilestoneIcon,
} from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const { assignments, isLoading } = useAssignments();
  const [allSlots, setAllSlots] = useState<WorkSlot[]>(() => storage.getSlots());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [slotToSchedule, setSlotToSchedule] = useState<Assignment | null>(null);

  useEffect(() => {
    const updateSlots = () => {
      setAllSlots(storage.getSlots());
    };
    return storage.subscribe(updateSlots);
  }, []);

  const activeAssignments = assignments.filter(
    (a) => a.status !== 'archived' && a.status !== 'completed'
  );
  const completedAssignments = assignments.filter((a) => a.status === 'completed');

  // Urgent deadlines (< 3 days)
  const urgentCount = activeAssignments.filter((a) => {
    const buffer = calculateAssignmentBuffer(a, allSlots);
    return buffer.isUrgent || buffer.isPastDue;
  }).length;

  // Total remaining milestones
  const totalRemainingMilestones = activeAssignments.reduce((sum, a) => {
    return sum + a.milestones.filter((m) => m.status !== 'completed').length;
  }, 0);

  const importanceBadgeVariants: Record<string, 'neutral' | 'action' | 'warning' | 'danger'> = {
    low: 'neutral',
    medium: 'action',
    high: 'warning',
    critical: 'danger',
  };

  return (
    <PageContainer
      title="Assignments & Milestones"
      subtitle="Break distant deadlines into staged milestones and concrete daily actions."
      ruleHint="Rule 03: Distant deadlines ≠ start signals"
      actions={
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          New Assignment
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Top Metrics */}
        {assignments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-mono text-slate-400 block">Active projects</span>
                <span className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white">
                  {activeAssignments.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400">
                <FolderGit2 className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-mono text-slate-400 block">High pressure</span>
                <span className={`text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] ${urgentCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {urgentCount}
                </span>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                urgentCount > 0
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-mono text-slate-400 block">Pending milestones</span>
                <span className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white">
                  {totalRemainingMilestones}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400">
                <MilestoneIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Assignments List */}
        {assignments.length === 0 && !isLoading ? (
          <div className="p-6 rounded-xl bg-[#12151c] border border-white/[0.065]">
            <EmptyState
              icon={<FolderGit2 className="w-6 h-6 text-emerald-400" />}
              title="No assignments yet. Add your first assignment."
              description="Distant deadlines create the illusion of safety. Break your assignments into sequential milestones with measurable deadline buffers."
              action={
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  Add Your First Assignment
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Assignments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeAssignments.map((assignment) => {
                const bufferInfo = calculateAssignmentBuffer(assignment, allSlots);
                return (
                  <div
                    key={assignment.id}
                    className="p-5 rounded-xl bg-[#12151c] border border-white/[0.065] hover:border-white/[0.12] transition-all space-y-4 text-left shadow-sm card-hover"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="action">{assignment.category}</Badge>
                          <Badge variant={importanceBadgeVariants[assignment.importance]}>
                            {assignment.importance}
                          </Badge>
                        </div>
                        <h3
                          onClick={() => setSelectedAssignment(assignment)}
                          className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-semibold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          {assignment.title}
                        </h3>
                      </div>

                      {/* Deadline Status */}
                      <span
                        className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                          bufferInfo.isPastDue
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : bufferInfo.isUrgent
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                        }`}
                      >
                        {bufferInfo.isPastDue
                          ? `${Math.abs(bufferInfo.daysRemaining)}d overdue`
                          : `${bufferInfo.daysRemaining}d buffer`}
                      </span>
                    </div>

                    {/* Behavioral Warning */}
                    {bufferInfo.behavioralWarning && (
                      <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{bufferInfo.behavioralWarning}</span>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-400 font-mono">
                        <span>
                          {assignment.milestones.filter((m) => m.status === 'completed').length} of{' '}
                          {assignment.milestones.length} milestones
                        </span>
                        <span className="font-medium text-slate-200">{assignment.progressPercent}%</span>
                      </div>
                      <Progress value={assignment.progressPercent} max={100} variant="emerald" height="sm" />
                    </div>

                    {/* Next Action */}
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Next physical action</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 truncate">
                        &ldquo;{assignment.nextAction}&rdquo;
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <span className="text-xs font-mono text-slate-500">
                        Due {format(new Date(assignment.deadline), 'MMM d, yyyy')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSlotToSchedule(assignment)}
                          leftIcon={<CalendarClock className="w-3.5 h-3.5" />}
                        >
                          Schedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssignment(assignment)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completed */}
            {completedAssignments.length > 0 && (
              <div className="pt-4 border-t border-white/[0.06] space-y-3 text-left">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Completed ({completedAssignments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {completedAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between cursor-pointer hover:border-white/[0.1] transition-colors"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <h4 className="text-sm font-medium text-slate-300 truncate">
                          {assignment.title}
                        </h4>
                        <span className="text-xs text-slate-500 font-mono">
                          {assignment.milestones.length} milestones complete
                        </span>
                      </div>
                      <Badge variant="success">Done</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          // React Query invalidation
        }}
      />

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        allSlots={allSlots}
        onAssignmentUpdated={(updated) => {
          setSelectedAssignment(updated);
        }}
        onAssignmentDeleted={() => {
          setSelectedAssignment(null);
        }}
      />

      {/* Quick Schedule Work Slot Modal */}
      {slotToSchedule && (
        <ScheduleSlotModal
          isOpen={Boolean(slotToSchedule)}
          onClose={() => setSlotToSchedule(null)}
          assignment={slotToSchedule}
          milestone={slotToSchedule.milestones.find((m) => m.status !== 'completed')}
          onSuccess={() => {
            setAllSlots(storage.getSlots());
          }}
        />
      )}
    </PageContainer>
  );
};
