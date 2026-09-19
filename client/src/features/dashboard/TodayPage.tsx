import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
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

  const handleOpenAiCoach = () => {
    window.dispatchEvent(new CustomEvent('open-ai-coach'));
  };

  const handleOpenOverwhelm = () => {
    window.dispatchEvent(new CustomEvent('open-overwhelm-rescue'));
  };

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
  const concreteOutputsCount = todaySessions.filter(
    (s) => s.isOutputComplete === 'complete' && s.producedOutput
  ).length || completedSlots.length;

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="border-amber-500/25 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
            leftIcon={<LifeBuoy className="w-3.5 h-3.5 text-amber-400" />}
            onClick={handleOpenOverwhelm}
          >
            Overwhelmed?
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={handleOpenAiCoach}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl surface-1 border border-stone-800/40">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-100">
                  {formattedLiveTime}
                </span>
                <span className="text-stone-600">·</span>
                <span className="text-sm text-stone-400">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {top1Slot && (
              <Badge variant={
                top1Slot.status === 'completed' ? 'success' :
                (top1Slot.status === 'in_progress' || activeSession?.slot.id === top1Slot.id) ? 'action' :
                isSlotMissed(top1Slot, currentTime) ? 'warning' : 'action'
              }>
                {top1Slot.status === 'completed' ? 'Top 1 done' :
                 (top1Slot.status === 'in_progress' || activeSession?.slot.id === top1Slot.id) ? 'Top 1 active' :
                 isSlotMissed(top1Slot, currentTime) ? 'Top 1 needs recovery' : 'Top 1 ready'}
              </Badge>
            )}
            {activeSession && (
              <Badge variant="action" className="animate-pulse-soft">Active session</Badge>
            )}
            {behindSlot && !activeSession && (
              <Badge variant="warning">Behind schedule</Badge>
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
          <Card variant="active" className="border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-transparent overflow-hidden">
            <CardHeader className="pb-4 border-b border-stone-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Active focus session</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <span>Target: {activeSession.targetDurationMinutes}m</span>
                  {activeSession.isPaused && (
                    <Badge variant="warning">Paused</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-stone-50 mt-3 font-bold">
                {activeSession.slot.taskTitle}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl surface-2 border border-stone-800/30 space-y-1.5">
                  <span className="text-xs font-medium text-emerald-400 block">
                    Concrete target output
                  </span>
                  <p className="text-sm text-stone-200">
                    {activeSession.slot.desiredOutput}
                  </p>
                </div>

                <div className="p-4 rounded-xl surface-2 border border-stone-800/30 space-y-1.5">
                  <span className="text-xs font-medium text-amber-400 block">
                    First physical action
                  </span>
                  <p className="text-sm text-stone-200">
                    &ldquo;{activeSession.slot.firstPhysicalAction}&rdquo;
                  </p>
                </div>
              </div>

              {/* Countdown Snapshot */}
              <div className="p-3.5 rounded-xl surface-2 border border-stone-800/30 flex items-center justify-between text-sm">
                <span className="text-stone-400">
                  Elapsed:{' '}
                  <strong className="text-stone-200">
                    {Math.floor(calculateElapsedSeconds(activeSession) / 60)}m
                  </strong>
                </span>
                <span className="text-stone-400">
                  Remaining:{' '}
                  <strong className="text-emerald-400">
                    {Math.floor(calculateRemainingSeconds(activeSession) / 60)}m
                  </strong>
                </span>
                <span className="text-amber-300 text-xs">
                  {activeSession.distractions.length} urge(s) resisted
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/session')}
                  leftIcon={<Play className="w-4 h-4" />}
                  className="shadow-xl"
                >
                  Resume Workspace
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
                      <span className="text-sm font-semibold">You are behind the plan.</span>
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
                  <h3 className="font-['Outfit'] text-lg font-bold text-stone-100">
                    Missed Slot: &ldquo;{missedSlot.taskTitle}&rdquo;
                  </h3>
                  <p className="text-sm text-stone-400">
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
              <h2 className="font-['Outfit'] text-2xl font-bold text-stone-100">
                All priorities completed
              </h2>
              <p className="text-sm text-stone-400 max-w-md mx-auto">
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
          /* STATE 5: NEW DAY / NO TASKS SCHEDULED */
          <Card variant="active" className="border-emerald-500/15">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-sm text-emerald-400">
                <span>Today initialization</span>
                <span className="text-stone-500">Rule 02 · Clarity</span>
              </div>
              <CardTitle className="text-xl text-stone-100 mt-1">
                No work slots scheduled yet today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<Compass className="w-6 h-6 text-emerald-400" />}
                title="Your next concrete action will appear here."
                description="START rejects ambiguous to-do lists. Plan your Top 1 anchor deliverable or launch an immediate 10-minute micro-start to build momentum."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
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
                }
                secondaryNote="Rule 01: Motivation follows physical action. Do not wait to feel ready."
              />
            </CardContent>
          </Card>
        ) : (
          /* STATE 6: NEXT ACTION READY — The hero card */
          nextReadySlot && (
            <Card variant="active" className="border-emerald-500/25 overflow-hidden">
              <CardHeader className="pb-4 border-b border-stone-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                    <Target className="w-4 h-4" />
                    <span>Next action</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-400">
                      {nextReadySlot.startTime}
                    </span>
                    <Badge variant="action">{nextReadySlot.estimatedDurationMinutes} min</Badge>
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl text-stone-50 mt-3 font-bold">
                  {nextReadySlot.taskTitle}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* First Physical Action — Hero element */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Do this in 15 seconds</span>
                  </div>
                  <p className="text-lg sm:text-xl font-medium text-stone-100 leading-relaxed">
                    &ldquo;{nextReadySlot.firstPhysicalAction}&rdquo;
                  </p>
                </div>

                {/* Desired Output */}
                <div className="space-y-1.5">
                  <span className="text-xs text-stone-500 font-medium block">
                    What will exist when this slot closes
                  </span>
                  <p className="text-sm text-stone-300">
                    {nextReadySlot.desiredOutput}
                  </p>
                </div>

                {/* Phone Rule - subtle */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-800/30 border border-stone-800/30 text-sm text-amber-300/80">
                  <PhoneOff className="w-4 h-4 shrink-0" />
                  <span>Put your phone out of reach before clicking Start.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Play className="w-5 h-5" />}
                    onClick={() => handleStartSlot(nextReadySlot)}
                    className="shadow-xl shadow-emerald-500/15 cursor-pointer px-8"
                  >
                    START
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<Compass className="w-4 h-4" />}
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
                    10-min Recovery
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* ─── Executive Assistance & Overwhelm Rescue Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: AI Coach */}
          <div className="p-5 rounded-2xl surface-1 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-stone-900/40 to-transparent flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">AI Executive Coach</h3>
                  <Badge variant="action">Reasoning</Badge>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Break cognitive friction: generate 15-second physical bodily actions, decompose complex assignments into milestones, or formulate Peter Gollwitzer if-then obstacle plans.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-stone-800/40">
              <span className="text-xs text-stone-500 font-mono">Zero chat · Pure friction reduction</span>
              <Button
                variant="secondary"
                size="sm"
                className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15 cursor-pointer"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleOpenAiCoach}
              >
                Open Coach
              </Button>
            </div>
          </div>

          {/* Card 2: Overwhelm Rescue */}
          <div className="p-5 rounded-2xl surface-1 border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-stone-900/40 to-transparent flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">Overwhelm Rescue</h3>
                  <Badge variant="warning">Emergency</Badge>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Feeling overwhelmed by too much work? Instantly collapse your day down into 3 essential triage questions and launch an immediate 10-minute micro-start.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-stone-800/40">
              <span className="text-xs text-stone-500 font-mono">Stop paralysis · 10m micro-start</span>
              <Button
                variant="secondary"
                size="sm"
                className="border-amber-500/30 text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                leftIcon={<LifeBuoy className="w-3.5 h-3.5" />}
                onClick={handleOpenOverwhelm}
              >
                I'm Overwhelmed
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Today Summary ─── */}
        <div className="p-5 rounded-2xl surface-1 border border-stone-800/40 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-400 font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Today's summary
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Planned', value: todaySlots.length, color: 'text-stone-200' },
              { label: 'Completed', value: completedSlots.length, color: 'text-emerald-400' },
              { label: 'Remaining', value: Math.max(0, todaySlots.length - completedSlots.length), color: 'text-amber-300' },
              { label: 'Outputs', value: concreteOutputsCount, color: 'text-emerald-400' },
              { label: 'Focus time', value: `${totalFocusMinutes}m`, color: 'text-teal-300' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl surface-2 border border-stone-800/30">
                <span className="text-xs text-stone-500 block mb-1">{stat.label}</span>
                <span className={`font-semibold text-base font-mono ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Assignment Pressure ─── */}
        {urgentAssignments.length > 0 && (
          <div className="p-5 rounded-2xl surface-1 border border-stone-800/40 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400 font-medium flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-400" />
                Active deadlines
              </span>
              <Link to="/assignments" className="text-emerald-400 hover:text-emerald-300 text-sm">
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
                    className="p-3.5 rounded-xl surface-2 border border-stone-800/30 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-stone-200">
                        {assignment.title}
                        <span className="text-stone-500 font-normal ml-2">
                          — {buffer.label}
                        </span>
                        <span className="text-stone-500 font-normal ml-2">
                          — {remainingMilestones} milestone(s) left
                        </span>
                      </div>
                      <div className={`text-xs ${sessionToday ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sessionNotice}
                      </div>
                    </div>

                    <Link to={`/assignments`}>
                      <Button variant="ghost" size="sm" className="text-sm text-stone-400 hover:text-stone-200">
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
        <div className="p-5 rounded-2xl surface-1 border border-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              todayReview
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
            }`}>
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-stone-200 block">Night Review</span>
              <span className="text-sm text-stone-400">
                {todayReview
                  ? `Completed · Tomorrow starts: "${todayReview.tomorrowStartsWith}"`
                  : 'Pending for tonight · Reflect on today and plan tomorrow'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {todayReview ? (
              <Link to="/review">
                <Button variant="outline" size="sm">
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
