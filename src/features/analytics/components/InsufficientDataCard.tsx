import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { BrainCircuit, Sparkles, ShieldAlert } from 'lucide-react';

interface InsufficientDataCardProps {
  totalCount: number;
  neededCount: number;
  onLoadSampleData?: () => void;
  isSampleActive?: boolean;
}

export const InsufficientDataCard: React.FC<InsufficientDataCardProps> = ({
  totalCount,
  neededCount,
  onLoadSampleData,
  isSampleActive,
}) => {
  const current = Math.max(0, totalCount);
  const target = 5;
  const progressPct = Math.min(100, Math.round((current / target) * 100));

  return (
    <Card className="border border-stone-800/40 bg-stone-900/30 overflow-hidden">
      <CardContent className="p-6 md:p-8 text-center max-w-xl mx-auto space-y-5">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <BrainCircuit className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-stone-100">
            START needs another {neededCount} work {neededCount === 1 ? 'session' : 'sessions'} before it can meaningfully identify your most common delay patterns.
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed max-w-md mx-auto">
            Procrastination is an empirical behavioral system. START strictly avoids premature pseudo-diagnoses or meaningless scores. Patterns are only generated when there is statistically observable telemetry across session initiation, clarity, and resistance.
          </p>
        </div>

        {/* Progress Bar towards sufficient data threshold */}
        <div className="space-y-1.5 max-w-xs mx-auto pt-1">
          <div className="flex justify-between text-xs font-mono text-stone-400">
            <span>Sample size: {current} / {target} sessions</span>
            <span className="text-emerald-400 font-semibold">{progressPct}%</span>
          </div>
          <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-700/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Sample Data Toggle for inspection */}
        {onLoadSampleData && !isSampleActive && (
          <div className="pt-3 border-t border-stone-800/40 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadSampleData}
              className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Preview with Sample 4-Week Telemetry
            </Button>
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-stone-500" />
              Non-destructive sandbox preview
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
