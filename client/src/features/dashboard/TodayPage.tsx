import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { useSlots } from '../../hooks/useSlots.ts';
import { dataService } from '../../services/dataService.ts';
import { PlanSlotModal } from '../planner/PlanSlotModal.tsx';
import { ClarifySlotModal } from '../planner/ClarifySlotModal.tsx';
import {
  validateConcreteOutput,
  validateFirstPhysicalAction,
} from '../planner/vagueTaskValidator.ts';
import { RecoveryModal } from '../sessions/RecoveryModal.tsx';
import { ReplanRemainingDayModal } from './ReplanRemainingDayModal.tsx';
import { NightReviewWizard } from '../reviews/NightReviewWizard.tsx';
import {
  sessionStorageManager,
  ActiveSessionState,
  calculateRemainingSeconds,
  calculateElapsedSeconds,
} from '../sessions/sessionStorage.ts';
import {
  WorkSlot,
  WorkSession,
  Assignment,
  DailyReview,
  DistractionUrge,
} from '../../types/models.ts';
import { getTodayString, calculateDeadlineBuffer } from '../../utils/dates.ts';
import { getContextualRuleReminder, getAugmentedRules } from '../rules/ruleEngine.ts';
import { ContextualRuleBanner } from '../../components/ui/ContextualRuleBanner.tsx';
import {
  Target,
  Compass,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  PhoneOff,
  LifeBuoy,
  Clock,
  RotateCcw,
  Activity,
  CalendarCheck,
  MoonStar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Checks if a slot was missed (current time is past the slot's scheduled endTime without completion).
 */
function isSlotMissed(slot: WorkSlot, now: Date): boolean {
  if (slot.status === 'missed') return true;
  if (slot.status === 'planned') {
    const today = getTodayString();
    if (slot.date < today) return true;
    if (slot.date === today && slot.endTime) {
      const [endH, endM] = slot.endTime.split(':').map(Number);
      if (endH !== undefined) {
        if (now.getHours() > endH || (now.getHours() === endH && now.getMinutes() > endM)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Checks if the user is behind schedule for a planned slot
 * (current time is past slot.startTime by >= 10 minutes, but slot.endTime has not yet passed).
 */
function isSlotBehindSchedule(slot: WorkSlot, now: Date): boolean {
  if (slot.status !== 'planned') return false;
  const today = getTodayString();
  if (slot.date !== today || !slot.startTime || !slot.endTime) return false;

  const [startH, startM] = slot.startTime.split(':').map(Number);
  const [endH, endM] = slot.endTime.split(':').map(Number);
  if (startH === undefined || endH === undefined) return false;

  const nowTotal = now.getHours() * 60 + now.getMinutes();
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  // Past start time by >= 10 min and not yet past end time
  return nowTotal >= startTotal + 10 && nowTotal < endTotal;
}

export const TodayPage: React.FC = () => {
  const navigate = useNavigate();
  const today = getTodayString();
  const { slots } = useSlots();

  // Current time state (ticking every 10 seconds)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Active Focus Session state
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(() =>
    sessionStorageManager.getActiveSession()
  );

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryTargetSlot, setRecoveryTargetSlot] = useState<WorkSlot | null>(null);
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [isNightReviewWizardOpen, setIsNightReviewWizardOpen] = useState(false);
  const [slotToClarify, setSlotToClarify] = useState<WorkSlot | null>(null);

  // Data state
  const [todaySessions, setTodaySessions] = useState<WorkSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayReview, setTodayReview] = useState<DailyReview | null>(null);
  const [distractions, setDistractions] = useState<DistractionUrge[]>([]);

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch telemetry and active review
  const loadData = useCallback(async () => {
    try {
      const [sessions, loadedAssignments, review, allDistractions] = await Promise.all([
        dataService.getSessions(),
        dataService.getAssignments(),
        dataService.getDailyReview(today),
        dataService.getDistractions(),
      ]);
      setTodaySessions(sessions.filter((s) => s.startedAt?.startsWith(today)));
      setAssignments(loadedAssignments);
      setTodayReview(review);
      setDistractions(allDistractions);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [today]);

  useEffect(() => {
    loadData();
    const handleStorage = () => {
      setActiveSession(sessionStorageManager.getActiveSession());
      loadData();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);

  // Derived slot groups
  const todaySlots = slots.filter((s) => s.date === today);
  const top1Slot = todaySlots.find((s) => s.isTopPriority === 1) || todaySlots[0];
  const completedSlots = todaySlots.filter((s) => s.status === 'completed');
  const missedSlots = todaySlots.filter((s) => isSlotMissed(s, currentTime));
  const behindSlots = todaySlots.filter((s) => isSlotBehindSchedule(s, currentTime) && !isSlotMissed(s, currentTime));
  const plannedSlots = todaySlots.filter(
    (s) => s.status === 'planned' && !isSlotMissed(s, currentTime) && !isSlotBehindSchedule(s, currentTime)
  );

  const behindSlot = behindSlots[0] || null;
  const missedSlot = missedSlots[0] || null;
  const nextReadySlot = plannedSlots[0] || null;

  // Determine Primary State
  const isAllPrioritiesCompleted =
    todaySlots.length > 0 &&
    todaySlots.every((s) => s.status === 'completed');
  const hasNoTasks = todaySlots.length === 0;

  // Focus time calculation
  const totalFocusMinutes = todaySessions.reduce(
    (acc, s) => acc + (s.actualDurationMinutes || 0),
    0
  );

  // Start Slot Handler (transitions directly to focused workspace)
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

  // Launch Recovery Handler
  const handleStartRecovery = (slot: WorkSlot, rescueAction: string) => {
    sessionStorageManager.switchToRecovery(slot, rescueAction);
    navigate('/session');
  };

  // Format time display (e.g. "10:45 AM")
  const formattedLiveTime = currentTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Format date display (e.g. "Saturday, Sep 19")
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Filter urgent/active assignments for Assignment Pressure
  const urgentAssignments = assignments
    .filter((a) => a.status !== 'completed' && a.status !== 'archived' && a.deadline)
    .map((a) => {
      const buffer = calculateDeadlineBuffer(a.deadline);
      const remainingMilestones = a.milestones
        ? a.milestones.filter((m) => m.status !== 'completed').length
        : 0;

      const sessionToday = todaySlots.find(
        (s) => s.assignmentId === a.id && s.status !== 'completed'
      );

      return {
        assignment: a,
        buffer,
        remainingMilestones,
        sessionToday,
      };
    })
    .filter(
      (item) =>
        item.buffer.daysRemaining <= 7 ||
        item.buffer.isUrgent ||
        item.buffer.isPastDue ||
        item.sessionToday
    );

  const { todaysRule } = getAugmentedRules(todaySlots, todaySessions, distractions, todayReview);

  return (
    <PageContainer
      title="What should I do now?"
      subtitle="All attention directed to a single concrete action."
      ruleHint={todaysRule ? `${todaysRule.code}: ${todaysRule.name}` : "Rule 01: Start Before Motivation"}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Compass className="w-4 h-4" />}
            onClick={() => setIsPlanModalOpen(true)}
          >
            Plan Next Slot
          </Button>
          <Link to="/planner">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Planner
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 text-left">

        {/* ─── Compact Status Bar ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 rounded-xl bg-[#111318] border border-white/[0.07] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white font-mono tracking-tight">
                {formattedLiveTime}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {top1Slot && (
              <Badge variant={
                top1Slot.status === 'completed' ? 'success' :
                (top1Slot.status === 'in_progress' || activeSession?.slot.id === top1Slot.id) ? 'action' :
                isSlotMissed(top1Slot, currentTime) ? 'warning' : 'action'
              }>
                {top1Slot.status === 'completed' ? 'Top 1 Done' :
                 (top1Slot.status === 'in_progress' || activeSession?.slot.id === top1Slot.id) ? 'Top 1 Active' :
                 isSlotMissed(top1Slot, currentTime) ? 'Top 1 Needs Recovery' : 'Top 1 Ready'}
              </Badge>
            )}
            {activeSession && (
              <Badge variant="action" className="animate-pulse-soft">Active Session</Badge>
            )}
            {behindSlot && !activeSession && (
              <Badge variant="warning">Ready to Re-anchor</Badge>
            )}
          </div>
        </div>

        {/* ─── Today's Rule (compact, collapsible) ─── */}
        {todaysRule && (
          <ContextualRuleBanner reminder={{
            ruleNumber: todaysRule.ruleNumber,
            ruleCode: todaysRule.code,
            ruleName: todaysRule.name,
            reminderText: todaysRule.adherenceStatus?.label || todaysRule.principle,
            isEnabled: true,
            isTodayRule: true,
          }} />
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* PRIMARY FOCUS AREA                          */}
        {/* ═══════════════════════════════════════════ */}

        {/* STATE 1: ACTIVE FOCUS SESSION RUNNING */}
        {activeSession ? (
          <Card variant="active" className="hairline-card rounded-xl border border-emerald-500/35 bg-[#111318] overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6),0_0_24px_rgba(16,185,129,0.14)]">
            <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  <span>Active Focus Session Engaged</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    Target: {activeSession.targetDurationMinutes}m
                  </span>
                  {activeSession.isPaused && (
                    <Badge variant="warning">Paused</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl text-white mt-2 font-bold tracking-tight">
                {activeSession.slot.taskTitle}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">
                    Target Output
                  </span>
                  <p className="text-sm text-slate-200">
                    {activeSession.slot.desiredOutput}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                    Physical Starter Motion
                  </span>
                  <p className="text-sm text-slate-200">
                    &ldquo;{activeSession.slot.firstPhysicalAction}&rdquo;
                  </p>
                </div>
              </div>

              {/* Countdown Snapshot */}
              <div className="p-3 px-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Elapsed: <strong className="text-white ml-1">{Math.floor(calculateElapsedSeconds(activeSession) / 60)}m</strong>
                </span>
                <span className="text-slate-400">
                  Remaining: <strong className="text-emerald-400 ml-1">{Math.floor(calculateRemainingSeconds(activeSession) / 60)}m</strong>
                </span>
                <span className="text-amber-300">
                  {activeSession.distractions.length} urge(s) captured
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/session')}
                  leftIcon={<Play className="w-4 h-4 fill-stone-950" />}
                  className="px-6"
                >
                  <span>Resume Workspace</span>
                  <span className="kbd-chip text-[10px] ml-2 text-stone-950 bg-emerald-400/80 border-emerald-400/40">↵</span>
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/session')}
                >
                  Open Controls
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : behindSlot ? (
          /* STATE 2: BEHIND SCHEDULE */
          <div className="space-y-4">
            <Card variant="recovery" className="border-amber-500/25 overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold">Ready to re-anchor your day.</span>
                    </div>
                    <p className="text-base font-semibold text-stone-100">
                      Scheduled start for &ldquo;{behindSlot.taskTitle}&rdquo; ({behindSlot.startTime}) has passed.
                    </p>
                    <p className="text-sm text-stone-400">
                      Zero shame. Friction is normal. Protect your Top 1 anchor and adjust your afternoon.
                    </p>
                  </div>
                </div>

                <ContextualRuleBanner reminder={getContextualRuleReminder('missed_slot')} />

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    variant="recovery"
                    size="md"
                    onClick={() => handleStartSlot(behindSlot)}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Continue Original Plan
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsReplanModalOpen(true)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Replan Remaining Day
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-sm text-stone-400">
                  <span>Pending deliverable</span>
                  <Badge variant="action">{behindSlot.estimatedDurationMinutes} min</Badge>
                </div>
                <CardTitle className="text-xl text-stone-100 mt-1 font-bold">
                  {behindSlot.taskTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl surface-2 border border-stone-800/30 space-y-1.5">
                  <span className="text-xs font-medium text-emerald-400 block">
                    First physical action
                  </span>
                  <p className="text-sm text-stone-200">
                    &ldquo;{behindSlot.firstPhysicalAction}&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : missedSlot ? (
          /* STATE 3: MISSED SLOT */
          <Card variant="recovery" className="overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-300">
                    <LifeBuoy className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">Recover in 10 minutes</span>
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-white">
                    Missed Slot: &ldquo;{missedSlot.taskTitle}&rdquo;
                  </h3>
                  <p className="text-sm text-slate-400">
                    Don't postpone until tomorrow. Lower activation energy to 10 minutes and break inertia right now.
                  </p>
                </div>

                <Button
                  variant="recovery"
                  size="lg"
                  onClick={() => {
                    setRecoveryTargetSlot(missedSlot);
                    setIsRecoveryModalOpen(true);
                  }}
                  className="shrink-0"
                >
                  Start 10-min recovery
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isAllPrioritiesCompleted ? (
          /* STATE 4: ALL PRIORITIES COMPLETED */
          <Card variant="active" className="border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-transparent p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/15">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-white tracking-tight">
                All priorities completed
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Today's essential work windows have been executed. Protect your cognitive energy this evening and lock in tomorrow's plan during Night Review.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to="/review">
                <Button variant="primary" size="md">
                  Go to Night Review →
                </Button>
              </Link>
              <Link to="/planner">
                <Button variant="secondary" size="md">
                  View Tomorrow's Plan
                </Button>
              </Link>
            </div>
          </Card>
        ) : hasNoTasks ? (
          /* STATE 5: NEW DAY / NO TASKS SCHEDULED — Unified Focus Launchpad */
          <div className="rounded-xl border border-white/[0.07] bg-[#12151c] p-8 sm:p-12 text-center space-y-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <Compass className="w-6 h-6" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl font-bold text-white tracking-tight">
                Ready for your first focus window
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                START operates on physical momentum. Schedule your Top 1 anchor deliverable or launch an immediate 10-minute micro-start to break inertia.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Compass className="w-4 h-4" />}
                onClick={() => setIsPlanModalOpen(true)}
              >
                Plan Top 1 Slot
              </Button>
              <Button
                variant="recovery"
                size="md"
                onClick={() => {
                  const emergencySlot: WorkSlot = {
                    id: crypto.randomUUID(),
                    date: today,
                    startTime: '10:00',
                    endTime: '10:10',
                    taskTitle: '10-Minute Momentum Rescue',
                    desiredOutput: '1 micro-step completed',
                    firstPhysicalAction: 'Open project and write 1 paragraph',
                    estimatedDurationMinutes: 10,
                    status: 'in_progress',
                  };
                  setRecoveryTargetSlot(emergencySlot);
                  setIsRecoveryModalOpen(true);
                }}
              >
                10-min Micro-Start
              </Button>
            </div>

            <p className="text-[11px] font-mono text-slate-500 pt-2">
              Rule 01: Motivation follows physical action. Do not wait to feel ready.
            </p>
          </div>
        ) : (
          /* STATE 6: NEXT ACTION READY — The hero card */
          nextReadySlot && (
            <Card variant="active" className="rounded-xl border border-white/[0.08] bg-[#12151c] overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),0_0_24px_rgba(16,185,129,0.06)]">
              <div className="p-6 sm:p-7 space-y-6">
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-slate-300">
                      {nextReadySlot.isTopPriority === 1 ? "Today's Top Priority" : "Scheduled Focus Slot"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                      {nextReadySlot.startTime} – {nextReadySlot.endTime}
                    </span>
                    <span>·</span>
                    <span>{nextReadySlot.estimatedDurationMinutes} min</span>
                  </div>
                </div>

                {/* Primary Task Title */}
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl text-white font-semibold tracking-tight leading-tight">
                    {nextReadySlot.taskTitle}
                  </h2>
                </div>

                {/* 2-Column Clarity Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>First physical step</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      &ldquo;{nextReadySlot.firstPhysicalAction}&rdquo;
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      <span>Intended deliverable</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {nextReadySlot.desiredOutput}
                    </p>
                  </div>
                </div>

                {/* Phone Check Notice */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.015] border border-white/[0.05] text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <PhoneOff className="w-3.5 h-3.5 text-amber-400/80" />
                    <span>Environmental rule: Place phone physically out of reach before starting.</span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Play className="w-4 h-4 fill-slate-950" />}
                    onClick={() => handleStartSlot(nextReadySlot)}
                    className="px-8"
                  >
                    <span>Start Session</span>
                    <span className="kbd-chip text-[10px] ml-2 text-slate-950 bg-emerald-400/80 border-emerald-400/40 font-mono">Space</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<Compass className="w-3.5 h-3.5" />}
                    onClick={() => setIsPlanModalOpen(true)}
                  >
                    Plan Next Slot
                  </Button>

                  <Button
                    variant="recovery"
                    size="md"
                    onClick={() => {
                      setRecoveryTargetSlot(nextReadySlot);
                      setIsRecoveryModalOpen(true);
                    }}
                  >
                    10-min Micro-Start
                  </Button>
                </div>
              </div>
            </Card>
          )
        )}

        {/* ─── Today Velocity Metric Strip ─── */}
        <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today&apos;s Velocity</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 mr-1.5">Executed:</span>
              <span className="text-emerald-400 font-semibold">{completedSlots.length} of {todaySlots.length} slots</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Focus Time:</span>
              <span className="text-emerald-300 font-semibold">{totalFocusMinutes}m</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Urges Resisted:</span>
              <span className="text-amber-300 font-semibold">{distractions.length}</span>
            </div>
          </div>
        </div>

        {/* ─── Assignment Pressure ─── */}
        {urgentAssignments.length > 0 && (
          <div className="p-5 rounded-xl bg-[#12151c] border border-white/[0.065] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-400" />
                Active deadlines
              </span>
              <Link to="/assignments" className="text-emerald-400 hover:text-emerald-300 text-xs font-mono">
                View all →
              </Link>
            </div>

            <div className="space-y-2">
              {urgentAssignments.map(({ assignment, buffer, remainingMilestones, sessionToday }) => {
                const sessionNotice = sessionToday
                  ? `Next session today at ${sessionToday.startTime}`
                  : 'No session scheduled today';

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-slate-200">
                        {assignment.title}
                        <span className="text-slate-500 font-normal ml-2">
                          — {buffer.label}
                        </span>
                        <span className="text-slate-500 font-normal ml-2">
                          — {remainingMilestones} milestone(s) left
                        </span>
                      </div>
                      <div className={`text-xs ${sessionToday ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sessionNotice}
                      </div>
                    </div>

                    <Link to={`/assignments`}>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                        Details
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Night Review Status ─── */}
        <div className="p-5 rounded-xl bg-[#12151c] border border-white/[0.065] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-emerald-500/10 text-emerald-400 border-emerald-500/15">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-200 block">Night Review</span>
              <span className="text-xs sm:text-sm text-slate-400">
                {todayReview
                  ? `Completed · Tomorrow starts: "${todayReview.tomorrowStartsWith}"`
                  : 'Pending for tonight · Reflect on today and plan tomorrow'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {todayReview ? (
              <Link to="/review">
                <Button variant="secondary" size="sm">
                  View Blueprint
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNightReviewWizardOpen(true)}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Begin Night Review
              </Button>
            )}
          </div>
        </div>

        {/* MODALS */}
        {/* 1. Plan Next Slot Modal */}
        <PlanSlotModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event('storage'));
            loadData();
          }}
        />

        {/* 2. 10-Minute Recovery Modal */}
        {recoveryTargetSlot && (
          <RecoveryModal
            isOpen={isRecoveryModalOpen}
            onClose={() => {
              setIsRecoveryModalOpen(false);
              setRecoveryTargetSlot(null);
            }}
            slot={recoveryTargetSlot}
            onStartRecovery={handleStartRecovery}
          />
        )}

        {/* 3. Replan Remaining Day Modal */}
        <ReplanRemainingDayModal
          isOpen={isReplanModalOpen}
          onClose={() => setIsReplanModalOpen(false)}
          slots={todaySlots}
          onReplanned={() => {
            loadData();
          }}
        />

        {/* 4. Night Review Wizard Modal */}
        <NightReviewWizard
          isOpen={isNightReviewWizardOpen}
          onClose={() => setIsNightReviewWizardOpen(false)}
          onReviewSaved={(saved) => {
            setTodayReview(saved);
            loadData();
          }}
        />

        {/* 5. Clarify Slot Modal (Enforces Rules 2 & 3 before starting) */}
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
