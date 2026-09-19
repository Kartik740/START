import React from 'react';
import { MonthlyMetrics } from '../analyticsEngine.ts';
import { TrendCharts } from './TrendCharts.tsx';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card.tsx';
import { Badge } from '../../../components/ui/Badge.tsx';
import {
  Compass,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PackageCheck,
  FolderCheck,
  Sparkles,
} from 'lucide-react';

interface MonthlyViewProps {
  monthly: MonthlyMetrics;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({ monthly }) => {
  const {
    trendPoints,
    startingReliabilityChange,
    startDelayChangeMinutes,
    focusDurationChangeMinutes,
    recoveryBehaviorSummary,
    commonlyDelayedCategories,
    totalOutputsCompleted,
    recentCompletedOutputs,
    majorAssignmentsCompleted,
    centralQuestionAnswer,
  } = monthly;

  return (
    <div className="space-y-8">
      {/* 1. CENTRAL QUESTION ANSWER (HERO BANNER) */}
      <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-stone-900/60 to-stone-950 p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300 font-bold">
                CORE BEHAVIORAL QUESTION
              </span>
            </div>
            <Badge
              variant={
                centralQuestionAnswer.verdict === 'significantly_improving' ||
                centralQuestionAnswer.verdict === 'moderately_improving'
                  ? 'success'
                  : 'neutral'
              }
            >
              {centralQuestionAnswer.verdict === 'significantly_improving'
                ? 'Strong Positive Trajectory'
                : centralQuestionAnswer.verdict === 'moderately_improving'
                ? 'Steady Improvement'
                : 'Friction Equilibrium'}
            </Badge>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold text-stone-100 font-sans tracking-tight">
              &ldquo;{centralQuestionAnswer.headline}&rdquo;
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              Empirical answer to: &ldquo;Am I getting better at starting earlier and recovering faster?&rdquo; (Not a vanity productivity score).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800/40 space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>STARTING DELAY REDUCTION</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                {centralQuestionAnswer.delayInsight}
              </p>
            </div>

            <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800/40 space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RECOVERY BEHAVIOR</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                {centralQuestionAnswer.recoveryInsight}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. 4-WEEK TREND METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-stone-800 bg-stone-900/40">
          <div className="text-xs font-mono text-stone-400 mb-1">Starting Reliability</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {trendPoints[trendPoints.length - 1]?.startingReliabilityPercent || 0}%
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {startingReliabilityChange >= 0 ? `+${startingReliabilityChange}%` : `${startingReliabilityChange}%`} over 4w
          </span>
        </Card>

        <Card className="p-4 border-stone-800 bg-stone-900/40">
          <div className="text-xs font-mono text-stone-400 mb-1">Avg Start Delay</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {trendPoints[trendPoints.length - 1]?.averageStartDelayMinutes || 0}m
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {startDelayChangeMinutes <= 0
              ? `${Math.abs(startDelayChangeMinutes)}m faster`
              : `+${startDelayChangeMinutes}m delay`}
          </span>
        </Card>

        <Card className="p-4 border-stone-800 bg-stone-900/40">
          <div className="text-xs font-mono text-stone-400 mb-1">Avg Deadline Buffer</div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {trendPoints[trendPoints.length - 1]?.averageDeadlineBufferDays || 0}d
          </div>
          <span className="text-xs font-mono text-stone-500">
            Projected runway
          </span>
        </Card>

        <Card className="p-4 border-stone-800 bg-stone-900/40">
          <div className="text-xs font-mono text-stone-400 mb-1">Focus Session Depth</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {trendPoints[trendPoints.length - 1]?.averageFocusDurationMinutes || 0}m
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {focusDurationChangeMinutes >= 0 ? `+${focusDurationChangeMinutes}m` : `${focusDurationChangeMinutes}m`} depth
          </span>
        </Card>
      </div>

      {/* 3. VISUALIZATIONS: TRENDS OVER TIME */}
      <div className="space-y-4">
        <TrendCharts
          trendPoints={trendPoints}
          delayedCategories={commonlyDelayedCategories}
          startDelayChangeMinutes={startDelayChangeMinutes}
          startingReliabilityChange={startingReliabilityChange}
        />
      </div>

      {/* 4. RECOVERY BEHAVIOR & OUTPUTS / PROJECTS COMPLETED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECOVERY BEHAVIOR DEEP-DIVE */}
        <Card className="border border-stone-800/40 bg-stone-900/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-stone-100 font-medium">
                  Recovery Behavior Over Time
                </h4>
              </div>
              <Badge variant="success" size="sm">
                {recoveryBehaviorSummary.recoveryRatePercent}% rescued
              </Badge>
            </div>
            <p className="text-xs text-stone-400">
              Response when a planned work slot is missed or delayed.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {recoveryBehaviorSummary.summaryText}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-stone-950/60 rounded-md border border-stone-800">
                <span className="text-xs text-stone-500 font-mono block">Total Missed Slots</span>
                <span className="text-lg font-bold font-mono text-rose-400">
                  {recoveryBehaviorSummary.totalMissed}
                </span>
              </div>
              <div className="p-3 bg-stone-950/60 rounded-md border border-stone-800">
                <span className="text-xs text-stone-500 font-mono block">Rescued via Micro-Starts</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {recoveryBehaviorSummary.totalRecovered}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-sky-800/30 rounded-md text-xs text-emerald-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                Standard productivity apps punish missed slots with broken streaks. START prioritizes <strong>Recovery Velocity</strong>: the faster you activate a 10-minute micro-start, the less guilt or shame stalls momentum.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* OUTPUTS & MAJOR ASSIGNMENTS COMPLETED */}
        <Card className="border border-stone-800/40 bg-stone-900/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-stone-100 font-medium">
                  Outputs & Projects Completed
                </h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {totalOutputsCompleted} outputs delivered
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Tangible evidence produced over the 30-day window.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Major assignments completed */}
            {majorAssignmentsCompleted.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block font-semibold">
                  Major Assignments Completed
                </span>
                <div className="space-y-2">
                  {majorAssignmentsCompleted.map((asg) => (
                    <div
                      key={asg.id}
                      className="p-3 bg-stone-950/60 rounded-md border border-stone-800/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="text-xs font-semibold text-stone-200 block">
                            {asg.title}
                          </span>
                          <span className="text-xs font-mono text-stone-500">
                            {asg.category} • {asg.milestonesTotal} milestones completed
                          </span>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">Completed</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent tangible outputs */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block font-semibold">
                Recent Concrete Artifacts
              </span>
              {recentCompletedOutputs.length === 0 ? (
                <p className="text-xs text-stone-500 py-2">No completed outputs logged yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentCompletedOutputs.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-stone-300 flex items-start justify-between gap-2 p-2 bg-stone-950/40 rounded border border-stone-800/60"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="font-mono text-stone-200">{item.output}</span>
                      </div>
                      <span className="text-xs font-mono text-stone-500 shrink-0">
                        {item.date}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
