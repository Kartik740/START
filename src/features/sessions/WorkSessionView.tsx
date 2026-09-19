import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.tsx';
import {
  sessionStorageManager,
  calculateRemainingSeconds,
  calculateElapsedSeconds,
  ActiveSessionState,
} from './sessionStorage.ts';
import { DistractionCaptureModal } from './DistractionCaptureModal.tsx';
import { CloseSessionModal } from './CloseSessionModal.tsx';
import { RecoveryModal } from './RecoveryModal.tsx';
import { WorkSlot, WorkSession } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { notificationService } from '../../services/notificationService.ts';
import { sound } from '../../utils/sound.ts';
import {
  Play,
  Pause,
  ShieldAlert,
  CheckCircle2,
  LifeBuoy,
  LogOut,
  Target,
  Sparkles,
  Zap,
  Smartphone,
} from 'lucide-react';

export const WorkSessionView: React.FC = () => {
  const navigate = useNavigate();

  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(() =>
    sessionStorageManager.getActiveSession()
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isDistractionModalOpen, setIsDistractionModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isFirstActionDone, setIsFirstActionDone] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const hasFiredCompletionRef = useRef(false);

  // Sync session state from localStorage
  const refreshSession = useCallback(() => {
    const current = sessionStorageManager.getActiveSession();
    setActiveSession(current);
  }, []);

  // Update timer every second
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    const handleStorage = () => {
      refreshSession();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(timerInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshSession]);

  // Tab visibility and focus sync to eliminate background timer lag
  useEffect(() => {
    const handleSync = () => {
      setNowMs(Date.now());
      refreshSession();
    };
    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [refreshSession]);

  // Timer computations (computed unconditionally)
  const remainingSeconds = activeSession ? calculateRemainingSeconds(activeSession, nowMs) : 0;
  const elapsedSeconds = activeSession ? calculateElapsedSeconds(activeSession, nowMs) : 0;
  const targetTotalSeconds = activeSession ? activeSession.targetDurationMinutes * 60 : 1;
  const progressPercent = Math.min(100, Math.floor((elapsedSeconds / targetTotalSeconds) * 100));

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Dynamic document.title ticker: e.g. "⏱ (14:32) Write Chapter 1 • START"
  useEffect(() => {
    if (!activeSession) {
      document.title = 'START — Anti-Procrastination Operating System';
      return;
    }

    const timeStr = formatTime(remainingSeconds);
    const prefix = activeSession.isPaused ? '⏸ [Paused]' : `⏱ (${timeStr})`;
    document.title = `${prefix} ${activeSession.slot.taskTitle} • START`;

    return () => {
      document.title = 'START — Anti-Procrastination Operating System';
    };
  }, [activeSession, remainingSeconds]);

  // Handle countdown expiration (00:00)
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) return;

    if (remainingSeconds === 0 && !hasFiredCompletionRef.current) {
      hasFiredCompletionRef.current = true;
      sound.playFinishBell(true);
      notificationService.notify({
        title: 'Focus Session Complete',
        body: `Target duration reached for "${activeSession.slot.taskTitle}". What did you produce?`,
        tag: `session_complete_${activeSession.startedAt}`,
        url: '/session',
        category: 'sessionComplete',
      });
      setIsCloseModalOpen(true);
    }
  }, [activeSession, remainingSeconds]);

  // If no active session is running
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-stone-900 border border-stone-800/40 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
            <Target className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-mono">No Active Focus Session</h2>
          <p className="text-sm text-stone-400 leading-relaxed">
            There is currently no running work slot. Choose a scheduled slot or plan your next point of entry to begin.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/today')}
              className="bg-teal-600 hover:bg-teal-500 w-full font-bold"
            >
              Go to Today Dashboard
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/planner')}
              className="w-full"
            >
              Open Daily Planner
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pause / Resume Handlers
  const handleTogglePause = () => {
    if (activeSession.isPaused) {
      const updated = sessionStorageManager.resumeSession();
      setActiveSession(updated);
    } else {
      const updated = sessionStorageManager.pauseSession();
      setActiveSession(updated);
    }
  };

  // Early Exit Handler
  const handleEarlyExit = async () => {
    if (!activeSession) return;

    // Log partial session with early termination
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const sessionLog: WorkSession = {
      id: crypto.randomUUID(),
      workSlotId: activeSession.slot.id,
      assignmentId: activeSession.slot.assignmentId,
      milestoneId: activeSession.slot.milestoneId,
      taskTitle: activeSession.slot.taskTitle,
      actualDurationMinutes: actualMinutes,
      targetDurationMinutes: activeSession.targetDurationMinutes,
      resistanceLevel: 4,
      energyLevel: 2,
      phoneOutsideReach: true,
      producedOutput: 'Session ended early.',
      distractionsCapturedCount: activeSession.distractions.length,
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      wasRecoverySession: activeSession.wasRecoverySession,
      isOutputComplete: 'not_yet',
      pausesCount: activeSession.pausedIntervals.length,
      earlyTermination: true,
    };

    await dataService.logSession(sessionLog);
    sessionStorageManager.clearActiveSession();
    navigate('/today');
  };

  // Recovery Switch Handler
  const handleStartRecovery = (slot: WorkSlot, rescueAction: string) => {
    const newSession = sessionStorageManager.switchToRecovery(slot, rescueAction);
    setActiveSession(newSession);
    setIsRecoveryModalOpen(false);
  };

  // Session Completed Handler from Modal
  const handleSessionCompleted = (_completedLog: WorkSession, nextSlot?: WorkSlot) => {
    setIsCloseModalOpen(false);
    navigate('/today', {
      state: {
        sessionFinished: true,
        nextSlotScheduled: !!nextSlot,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-stone-100 flex flex-col justify-between selection:bg-teal-500/30 font-sans">
      {/* Top Bar: Minimal Focus Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-stone-900/80 bg-stone-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono tracking-widest uppercase font-bold text-stone-300">
            {activeSession.wasRecoverySession ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                10-Minute Rescue Session Active
              </span>
            ) : (
              'Focus Workspace Active'
            )}
          </span>
          {activeSession.isPaused && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
              Timer Paused
            </span>
          )}
        </div>

        {/* Exit Button with Confirm */}
        <div className="relative">
          {showExitConfirm ? (
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800/40 p-1.5 rounded-lg shadow-xl animate-in fade-in">
              <span className="text-xs text-stone-300 font-mono pl-1">Abandon session?</span>
              <button
                onClick={handleEarlyExit}
                className="text-xs font-mono uppercase bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-1 rounded border border-rose-500/40 cursor-pointer font-bold"
              >
                Yes, Exit
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="text-xs font-mono text-stone-400 hover:text-stone-200 px-1.5 py-1 cursor-pointer"
              >
                Stay
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs font-mono text-stone-500 hover:text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded hover:bg-stone-900"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Focus Core */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto px-4 py-8 text-center space-y-8">
        {/* Task Title */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-teal-400 font-semibold flex items-center justify-center gap-1.5">
            <Target className="w-4 h-4" />
            Current Focus Target
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-100 tracking-tight leading-snug">
            {activeSession.slot.taskTitle}
          </h1>
        </div>

        {/* Big Monospace Countdown Display */}
        <div className="space-y-3">
          <div
            className={`font-mono text-6xl sm:text-8xl font-black tracking-tight select-none transition-colors ${
              activeSession.isPaused
                ? 'text-stone-600'
                : remainingSeconds === 0
                ? 'text-emerald-400 animate-pulse'
                : 'text-stone-100'
            }`}
          >
            {formatTime(remainingSeconds > 0 ? remainingSeconds : elapsedSeconds)}
          </div>

          <div className="flex items-center justify-center gap-3 text-xs font-mono text-stone-400">
            <span>
              {remainingSeconds > 0 ? 'REMAINING' : 'OVERTIME FLOW'} · TARGET:{' '}
              {activeSession.targetDurationMinutes}m
            </span>
            <span>·</span>
            <span className="text-stone-500">ELAPSED: {formatTime(elapsedSeconds)}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-64 sm:w-80 h-1.5 bg-stone-900 rounded-full mx-auto overflow-hidden border border-stone-800">
            <div
              className={`h-full transition-all duration-1000 ${
                activeSession.wasRecoverySession ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Concrete Deliverable & First Physical Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {/* Concrete Output */}
          <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/40 backdrop-blur space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 uppercase font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Target Output</span>
            </div>
            <p className="text-sm font-medium text-stone-200 leading-snug">
              {activeSession.slot.desiredOutput || 'Specific tangible output to be created.'}
            </p>
          </div>

          {/* First Physical Action */}
          <div
            onClick={() => setIsFirstActionDone(!isFirstActionDone)}
            className={`p-4 rounded-xl border backdrop-blur space-y-1.5 cursor-pointer transition-all ${
              isFirstActionDone
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-stone-900/60 border-stone-800/40 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 uppercase font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>First Physical Action</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border text-xs ${
                  isFirstActionDone
                    ? 'bg-emerald-500 border-emerald-400 text-stone-950'
                    : 'border-stone-700 text-transparent'
                }`}
              >
                ✓
              </div>
            </div>
            <p
              className={`text-sm font-medium leading-snug ${
                isFirstActionDone ? 'line-through text-stone-400' : 'text-stone-200'
              }`}
            >
              {activeSession.slot.firstPhysicalAction || 'Take the smallest 15-second physical action.'}
            </p>
          </div>
        </div>

        {/* Contextual Reinforcements (If-Then Plan & Phone Rule) */}
        {activeSession.slot.preparedData && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            {activeSession.slot.preparedData.ifThenPlan && (
              <div className="px-3 py-1.5 rounded-lg bg-teal-950/40 border border-teal-500/30 text-teal-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
                <span>PLAN: {activeSession.slot.preparedData.ifThenPlan}</span>
              </div>
            )}
            {activeSession.slot.preparedData.phoneLocation && (
              <div className="px-3 py-1.5 rounded-xl surface-1 border border-stone-800/40 text-stone-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>PHONE: {activeSession.slot.preparedData.phoneLocation}</span>
              </div>
            )}
          </div>
        )}

        {/* Resisted Distractions Pill Ticker */}
        {activeSession.distractions.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeSession.distractions.length} distraction impulse(s) captured & resisted</span>
          </div>
        )}
      </main>

      {/* Primary Action Controls Bar */}
      <footer className="p-6 border-t border-stone-900/80 bg-stone-950/60 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Pause / Resume Control */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              onClick={handleTogglePause}
              className="flex-1 sm:flex-none font-mono text-xs flex items-center gap-2 cursor-pointer"
            >
              {activeSession.isPaused ? (
                <>
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Resume Timer</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>Pause Timer</span>
                </>
              )}
            </Button>

            {/* Emergency Recovery Downshift */}
            {!activeSession.wasRecoverySession && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsRecoveryModalOpen(true)}
                className="text-stone-400 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5"
                title="Downshift to a 10-minute micro-start if feeling friction"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">10m Rescue</span>
              </Button>
            )}
          </div>

          {/* Central Distraction Capture & Finish Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsDistractionModalOpen(true)}
              className="flex-1 sm:flex-none border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/60 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/20"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>I'm Distracted</span>
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsCloseModalOpen(true)}
              className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold px-6 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Session</span>
            </Button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Distraction Capture Modal */}
      <DistractionCaptureModal
        isOpen={isDistractionModalOpen}
        onClose={() => {
          setIsDistractionModalOpen(false);
          refreshSession();
        }}
        sessionId={activeSession.slot.id}
        onCaptured={() => refreshSession()}
      />

      {/* 2. Session Close & Next Action Scheduler Modal */}
      <CloseSessionModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        activeSession={activeSession}
        actualElapsedSeconds={elapsedSeconds}
        onCompleted={handleSessionCompleted}
      />

      {/* 3. 10-Minute Rescue Modal */}
      <RecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        slot={activeSession.slot}
        onStartRecovery={handleStartRecovery}
      />
    </div>
  );
};
