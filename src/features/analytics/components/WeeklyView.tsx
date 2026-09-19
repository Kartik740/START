import React, { useState } from 'react';
import {
  WeeklyMetrics,
  BehavioralPattern,
  WeeklyReflectionData,
} from '../analyticsEngine.ts';
import { PatternCard } from './PatternCard.tsx';
import { WeeklyReflectionCard } from './WeeklyReflectionCard.tsx';
import { InsufficientDataCard } from './InsufficientDataCard.tsx';
import { Card } from '../../../components/ui/Card.tsx';
import {
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Timer,
  CheckSquare,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Hourglass,
  FolderGit2,
  BrainCircuit,
  Sparkles,
  Loader2,
  FlaskConical,
  HelpCircle,
} from 'lucide-react';
import {
  aiSynthesizeWeeklyPatterns,
  AiPatternSynthesisResult,
} from '../../ai/aiWorkflows.ts';
import { WorkSession } from '../../../types/models.ts';

interface WeeklyViewProps {
  metrics: WeeklyMetrics;
  patterns: BehavioralPattern[];
  reflection: WeeklyReflectionData;
  hasEnoughData: boolean;
  totalSessionCount: number;
  sessionsNeeded: number;
  onLoadSampleData?: () => void;
  isSampleActive?: boolean;
  sessions?: WorkSession[];
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  metrics,
  patterns,
  reflection,
  hasEnoughData,
  totalSessionCount,
  sessionsNeeded,
  onLoadSampleData,
  isSampleActive,
  sessions,
}) => {
  const [isSynthesizingPattern, setIsSynthesizingPattern] = useState(false);
  const [aiPatternResult, setAiPatternResult] = useState<AiPatternSynthesisResult | null>(null);

  const handleSynthesizeAiPattern = async () => {
    setIsSynthesizingPattern(true);
    try {
      const result = await aiSynthesizeWeeklyPatterns(
        metrics,
        sessions || [],
        []
      );
      setAiPatternResult(result);
    } catch (err) {
      console.error('Failed to synthesize AI weekly pattern:', err);
    } finally {
      setIsSynthesizingPattern(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 11 WEEKLY METRICS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-stone-400 font-semibold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Weekly Behavioral Telemetry (11 Metrics)</span>
          </h3>
          <span className="text-xs font-mono text-stone-500">
            Factual & Empirical
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 1. Planned sessions */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Planned Sessions</span>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">
              {metrics.plannedSessions}
            </div>
            <span className="text-xs text-stone-500 font-mono">Scheduled slots</span>
          </Card>

          {/* 2. Started sessions */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Started Sessions</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {metrics.startedSessions}
            </div>
            <span className="text-xs text-stone-500 font-mono">
              {metrics.plannedSessions > 0
                ? `${Math.round((metrics.startedSessions / metrics.plannedSessions) * 100)}% reliability`
                : 'Initiated work'}
            </span>
          </Card>

          {/* 3. Completed sessions */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed Sessions</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {metrics.completedSessions}
            </div>
            <span className="text-xs text-stone-500 font-mono">Full duration</span>
          </Card>

          {/* 4. Average start delay */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Avg Start Delay</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {metrics.averageStartDelayMinutes}m
            </div>
            <span className="text-xs text-stone-500 font-mono">Scheduled vs actual</span>
          </Card>

          {/* 5. Average focused duration */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Timer className="w-3.5 h-3.5 text-purple-400" />
              <span>Avg Focused Duration</span>
            </div>
            <div className="text-xl font-bold font-mono text-purple-400">
              {metrics.averageFocusedDurationMinutes}m
            </div>
            <span className="text-xs text-stone-500 font-mono">Per session depth</span>
          </Card>

          {/* 6. Concrete outputs completed */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Outputs Completed</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {metrics.concreteOutputsCompleted}
            </div>
            <span className="text-xs text-stone-500 font-mono">Tangible deliverables</span>
          </Card>

          {/* 7. Missed sessions */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Missed Sessions</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {metrics.missedSessions}
            </div>
            <span className="text-xs text-stone-500 font-mono">Unstarted elapsed slots</span>
          </Card>

          {/* 8. Recovery sessions */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recovery Sessions</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {metrics.recoverySessions}
            </div>
            <span className="text-xs text-stone-500 font-mono">10m micro-rescues</span>
          </Card>

          {/* 9. Distraction incidents */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Distraction Incidents</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {metrics.distractionIncidents}
            </div>
            <span className="text-xs text-stone-500 font-mono">Captured impulses</span>
          </Card>

          {/* 10. Deadline buffer */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <Hourglass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deadline Buffer</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 truncate">
              {metrics.deadlineBufferDays}d
            </div>
            <span className="text-xs text-stone-500 font-mono truncate block" title={metrics.deadlineBufferLabel}>
              {metrics.deadlineBufferLabel}
            </span>
          </Card>

          {/* 11. Assignments progressed */}
          <Card className="p-3.5 border-stone-800 bg-stone-900/40 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-medium mb-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assignments Progressed</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {metrics.assignmentsProgressed}
            </div>
            <span className="text-xs text-stone-500 font-mono">Active projects advanced</span>
          </Card>
        </div>
      </div>

      {/* PATTERN ANALYSIS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-medium text-stone-400 font-semibold">
              Pattern Analysis (Evidence-Based Observations)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-stone-500 hidden sm:inline">
              Non-Diagnostic Friction Engine
            </span>
            <button
              type="button"
              onClick={handleSynthesizeAiPattern}
              disabled={isSynthesizingPattern}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSynthesizingPattern ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Synthesize Pattern</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Synthesized Pattern Card */}
        {aiPatternResult && (
          <Card className="border border-emerald-500/40 surface-1 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase text-emerald-300 font-bold">
                  AI Empirical Behavioral Synthesis
                </span>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Grounded in Telemetry
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase text-stone-400 tracking-wider block">
                Observed Pattern
              </span>
              <p className="text-sm font-semibold text-stone-100">
                {aiPatternResult.observedPattern}
              </p>
            </div>

            <div className="p-3 rounded-xl surface-0 border border-stone-800/40 text-xs space-y-1">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold block">
                Evidence
              </span>
              <p className="text-stone-300 text-xs font-mono">
                {aiPatternResult.evidence}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl surface-0 border border-stone-800/40 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-amber-300 text-xs uppercase font-bold">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Possible Explanation</span>
                </div>
                <p className="text-stone-300 text-xs">
                  {aiPatternResult.possibleExplanation}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-emerald-300 text-xs uppercase font-bold">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Small Experiment</span>
                </div>
                <p className="text-stone-200 text-xs font-medium">
                  {aiPatternResult.smallExperiment}
                </p>
              </div>
            </div>
          </Card>
        )}

        {!hasEnoughData ? (
          <InsufficientDataCard
            totalCount={totalSessionCount}
            neededCount={sessionsNeeded}
            onLoadSampleData={onLoadSampleData}
            isSampleActive={isSampleActive}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        )}
      </div>

      {/* WEEKLY REFLECTION SECTION */}
      <div className="space-y-4">
        <WeeklyReflectionCard reflection={reflection} />
      </div>
    </div>
  );
};
