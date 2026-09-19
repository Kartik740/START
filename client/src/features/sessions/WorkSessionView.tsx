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
      <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-emerald-500/20">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#12151c] border border-white/[0.07] text-center space-y-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] text-emerald-400 flex items-center justify-center border border-white/[0.08] shadow-inner">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white tracking-tight">
              Focus Cockpit Standby
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              No active focus timer engaged. Select your scheduled anchor slot or launch an immediate micro-start.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/today')}
              className="w-full"
            >
              Today Dashboard
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

  // Global keyboard shortcuts for focus workspace: Space to Pause/Resume, U to capture distraction, Enter to finish
  useEffect(() => {
    if (!activeSession) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea or if a modal is open
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (isDistractionModalOpen || isCloseModalOpen || isRecoveryModalOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        setIsDistractionModalOpen(true);
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCloseModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession, isDistractionModalOpen, isCloseModalOpen, isRecoveryModalOpen]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 font-sans">
      {/* Top Bar: Minimal Focus Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-[#08090c]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono tracking-wider uppercase font-semibold text-slate-300">
            {activeSession.wasRecoverySession ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                10-Minute Rescue Session Active
              </span>
            ) : (
              'Deep Focus Workspace'
            )}
          </span>
          {activeSession.isPaused && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25 uppercase font-medium">
              Paused
            </span>
          )}
        </div>

        {/* Exit Button with Confirm */}
        <div className="relative">
          {showExitConfirm ? (
            <div className="flex items-center gap-2 bg-[#12151c] border border-white/[0.08] p-1.5 rounded-lg shadow-xl animate-scale-in">
              <span className="text-xs text-slate-300 font-mono pl-1">End early?</span>
              <button
                onClick={handleEarlyExit}
                className="text-xs font-mono bg-red-500/15 hover:bg-red-500/25 text-red-300 px-2 py-1 rounded border border-red-500/30 cursor-pointer font-medium"
              >
                Yes, Exit
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 px-1.5 py-1 cursor-pointer"
              >
                Stay
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded hover:bg-white/[0.04]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Focus Core */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto px-4 py-8 text-center space-y-8">
        {/* Task Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400/90 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Active Focus Deliverable</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-['Plus_Jakarta_Sans',sans-serif] text-white tracking-tight leading-snug">
            {activeSession.slot.taskTitle}
          </h1>
        </div>

        {/* Big Monospace Countdown Display */}
        <div className="space-y-3">
          <div
            className={`font-mono text-6xl sm:text-8xl font-bold tracking-tight select-none transition-all ${
              activeSession.isPaused
                ? 'text-slate-600'
                : remainingSeconds === 0
                ? 'text-emerald-400 animate-pulse drop-shadow-[0_0_24px_rgba(16,185,129,0.5)]'
                : 'text-white drop-shadow-[0_0_24px_rgba(16,185,129,0.15)]'
            }`}
          >
            {formatTime(remainingSeconds > 0 ? remainingSeconds : elapsedSeconds)}
          </div>

          <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
            <span>
              {remainingSeconds > 0 ? 'REMAINING' : 'OVERTIME FLOW'} · TARGET:{' '}
              {activeSession.targetDurationMinutes}m
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">ELAPSED: {formatTime(elapsedSeconds)}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-64 sm:w-80 h-1 bg-white/[0.08] rounded-full mx-auto overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                activeSession.wasRecoverySession ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Concrete Deliverable & First Physical Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
          {/* Concrete Output */}
          <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 font-medium uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Output</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-snug font-medium">
              {activeSession.slot.desiredOutput || 'Specific tangible output to be created.'}
            </p>
          </div>

          {/* First Physical Action */}
          <div
            onClick={() => setIsFirstActionDone(!isFirstActionDone)}
            className={`p-4 rounded-xl border space-y-1.5 cursor-pointer transition-all ${
              isFirstActionDone
                ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                : 'bg-[#12151c] border-white/[0.065] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>First Physical Step</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border text-xs transition-colors ${
                  isFirstActionDone
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                    : 'border-white/[0.2] text-transparent'
                }`}
              >
                ✓
              </div>
            </div>
            <p
              className={`text-xs sm:text-sm font-medium leading-snug ${
                isFirstActionDone ? 'line-through text-slate-500' : 'text-slate-200'
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
              <div className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span>DEFENSE: {activeSession.slot.preparedData.ifThenPlan}</span>
              </div>
            )}
            {activeSession.slot.preparedData.phoneLocation && (
              <div className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>PHONE: {activeSession.slot.preparedData.phoneLocation}</span>
              </div>
            )}
          </div>
        )}

        {/* Resisted Distractions Pill Ticker */}
        {activeSession.distractions.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeSession.distractions.length} urge(s) captured & resisted</span>
          </div>
        )}
      </main>

      {/* Primary Action Controls Bar */}
      <footer className="p-4 sm:p-5 border-t border-white/[0.06] bg-[#08090c]/80 backdrop-blur-xl">
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
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume</span>
                  <span className="kbd-chip text-[10px] ml-1">Space</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                  <span className="kbd-chip text-[10px] ml-1">Space</span>
                </>
              )}
            </Button>

            {/* Emergency Recovery Downshift */}
            {!activeSession.wasRecoverySession && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsRecoveryModalOpen(true)}
                className="text-slate-400 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5"
                title="Downshift to a 10-minute micro-start if feeling friction"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">10m Rescue</span>
              </Button>
            )}
          </div>

          {/* Central Distraction Capture & Finish Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsDistractionModalOpen(true)}
              className="flex-1 sm:flex-none border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Capture Urge</span>
              <span className="kbd-chip text-[10px] ml-1 text-amber-300 border-amber-500/30 bg-amber-500/10">U</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCloseModalOpen(true)}
              className="flex-1 sm:flex-none px-6 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finish Session</span>
              <span className="kbd-chip text-[10px] ml-1 text-slate-950 bg-emerald-400/80 border-emerald-400/40">⌘↵</span>
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
