import React from 'react';
import { MonthlyTrendPoint, CategoryDelayStat } from '../analyticsEngine.ts';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card.tsx';
import { TrendingDown, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TrendChartsProps {
  trendPoints: MonthlyTrendPoint[];
  delayedCategories: CategoryDelayStat[];
  startDelayChangeMinutes: number;
  startingReliabilityChange: number;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  trendPoints,
  delayedCategories,
  startDelayChangeMinutes,
  startingReliabilityChange,
}) => {
  // Compute chart heights & scalings
  const maxDelay = Math.max(15, ...trendPoints.map((p) => p.averageStartDelayMinutes));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. STARTING RELIABILITY & RECOVERY RATE TREND */}
      <Card className="border border-stone-800/40 bg-stone-900/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-stone-100 font-medium">
                Starting Reliability & Recovery Rate
              </h4>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono">
              {startingReliabilityChange >= 0 ? (
                <span className="text-emerald-400 flex items-center font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />+{startingReliabilityChange}%
                </span>
              ) : (
                <span className="text-amber-400 flex items-center font-bold">
                  <ArrowDownRight className="w-3.5 h-3.5" />{startingReliabilityChange}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-400">
            Percentage of planned slots initiated on-time vs percentage of missed slots rescued.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-end gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Starting Reliability %
            </span>
            <span className="flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Recovery Rate %
            </span>
          </div>

          {/* SVG Multi-Week Bar Grouping */}
          <div className="space-y-4 pt-2">
            {trendPoints.map((tp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-stone-300 font-semibold">{tp.periodLabel}</span>
                  <span className="text-stone-500 text-xs">{tp.dateRangeLabel}</span>
                </div>

                {/* Starting Reliability Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">Starting Reliability</span>
                    <span className="text-emerald-300 font-bold">{tp.startingReliabilityPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-stone-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, tp.startingReliabilityPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Recovery Rate Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">Recovery Rate (Micro-Starts)</span>
                    <span className="text-emerald-300 font-bold">{tp.recoveryRatePercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-stone-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, tp.recoveryRatePercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. AVERAGE START DELAY REDUCTION */}
      <Card className="border border-stone-800/40 bg-stone-900/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-stone-100 font-medium">
                Average Start Delay Reduction
              </h4>
            </div>
            <div className="text-xs font-mono">
              {startDelayChangeMinutes <= 0 ? (
                <span className="text-emerald-400 flex items-center font-bold">
                  <ArrowDownRight className="w-3.5 h-3.5" />{Math.abs(startDelayChangeMinutes)}m faster
                </span>
              ) : (
                <span className="text-amber-400 flex items-center font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />+{startDelayChangeMinutes}m delay
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-400">
            Average delay in minutes between scheduled slot start and actual first physical action.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sparkline track representation */}
          <div className="grid grid-cols-4 gap-2 pt-3">
            {trendPoints.map((tp, idx) => {
              const heightPct = Math.max(15, Math.round((tp.averageStartDelayMinutes / maxDelay) * 100));
              const isLatest = idx === trendPoints.length - 1;

              return (
                <div key={idx} className="flex flex-col items-center justify-end h-40 space-y-2">
                  <span className={`text-xs font-mono font-bold ${isLatest ? 'text-emerald-400' : 'text-stone-300'}`}>
                    {tp.averageStartDelayMinutes}m
                  </span>
                  <div className="w-full h-24 bg-stone-800/50 rounded flex items-end p-1">
                    <div
                      className={`w-full rounded transition-all duration-500 ${
                        isLatest
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-t from-stone-700 to-emerald-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-mono font-semibold text-stone-300">
                      {tp.periodLabel}
                    </span>
                    <span className="block text-xs text-stone-500 font-mono">
                      {tp.dateRangeLabel.split(' - ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-stone-950/60 rounded-md border border-stone-800/40 text-xs text-stone-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Delay reduction demonstrates increasing mastery over activation resistance. Shorter startup friction indicates clear first physical actions and minimal task vagueness.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. COMMONLY DELAYED WORK CATEGORIES */}
      <Card className="lg:col-span-2 border border-stone-800/40 bg-stone-900/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-100 font-medium">
              Commonly Delayed Work Categories
            </h4>
            <span className="text-xs font-mono text-stone-500">
              Friction Propensity by Task Type
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Identifies which domains trigger protective avoidance due to ambiguity or cognitive difficulty.
          </p>
        </CardHeader>
        <CardContent>
          {delayedCategories.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              No category friction data recorded yet.
            </p>
          ) : (
            <div className="space-y-3.5">
              {delayedCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-stone-200 font-medium capitalize">
                      {cat.category}
                    </span>
                    <span className="text-stone-400">
                      {cat.delayedSlots} of {cat.totalSlots} delayed ({cat.delayRatePercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.delayRatePercent > 50
                          ? 'bg-rose-500'
                          : cat.delayRatePercent > 25
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(4, cat.delayRatePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
