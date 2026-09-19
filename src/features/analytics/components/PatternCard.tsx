import React from 'react';
import { BehavioralPattern } from '../analyticsEngine.ts';
import { Card } from '../../../components/ui/Card.tsx';
import { Badge } from '../../../components/ui/Badge.tsx';
import {
  FileCode2,
  Clock,
  Smartphone,
  ShieldCheck,
  Zap,
  HelpCircle,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';

interface PatternCardProps {
  pattern: BehavioralPattern;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeVariant: 'action' | 'warning' | 'success' | 'danger' | 'neutral' }
> = {
  clarity: {
    label: 'TASK CLARITY',
    icon: <FileCode2 className="w-4 h-4 text-amber-400" />,
    color: 'border-amber-500/20 bg-amber-500/5',
    badgeVariant: 'warning',
  },
  timing: {
    label: 'CIRCADIAN TIMING',
    icon: <Clock className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/20 bg-emerald-500/5',
    badgeVariant: 'action',
  },
  environment: {
    label: 'ENVIRONMENT',
    icon: <Smartphone className="w-4 h-4 text-rose-400" />,
    color: 'border-rose-500/20 bg-rose-500/5',
    badgeVariant: 'danger',
  },
  recovery: {
    label: 'RECOVERY VELOCITY',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/20 bg-emerald-500/5',
    badgeVariant: 'success',
  },
  resistance: {
    label: 'ACTIVATION FRICTION',
    icon: <Zap className="w-4 h-4 text-purple-400" />,
    color: 'border-purple-500/20 bg-purple-500/5',
    badgeVariant: 'neutral',
  },
};

export const PatternCard: React.FC<PatternCardProps> = ({ pattern }) => {
  const config = CATEGORY_CONFIG[pattern.category] || CATEGORY_CONFIG.resistance;

  return (
    <Card className={`border ${config.color} overflow-hidden transition-all duration-200 hover:border-stone-700`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-800/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-stone-900 border border-stone-800">
            {config.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-100">{pattern.title}</h4>
            <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">
              {config.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.badgeVariant} size="sm">
            {pattern.confidence === 'high' ? 'High Confidence' : 'Moderate Evidence'}
          </Badge>
        </div>
      </div>

      {/* Structured Content: Strictly 4 Non-Diagnostic Elements */}
      <div className="p-5 space-y-4">
        {/* 1. Observed Pattern */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-stone-400 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Observed pattern</span>
          </div>
          <p className="text-sm font-medium text-stone-200 pl-5 leading-relaxed">
            &ldquo;{pattern.observedPattern}&rdquo;
          </p>
        </div>

        {/* 2. Possible Explanation */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-stone-400 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
            <span>Possible explanation</span>
          </div>
          <p className="text-xs text-stone-300 pl-5 leading-relaxed">
            {pattern.possibleExplanation}
          </p>
        </div>

        {/* 3. Evidence */}
        <div className="space-y-1 bg-stone-900/60 rounded-md p-3 border border-stone-800/60">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-stone-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>Evidence</span>
          </div>
          <p className="text-xs text-stone-300 font-mono pl-3 pt-0.5 leading-relaxed">
            {pattern.evidence}
          </p>
        </div>

        {/* 4. Experiment to test */}
        <div className="space-y-1 bg-emerald-950/20 border border-sky-800/30 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span>Experiment to test</span>
          </div>
          <p className="text-xs text-emerald-200 pl-5 leading-relaxed">
            {pattern.experimentToTest}
          </p>
        </div>
      </div>
    </Card>
  );
};
