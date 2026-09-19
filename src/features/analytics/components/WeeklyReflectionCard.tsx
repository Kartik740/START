import React from 'react';
import { WeeklyReflectionData } from '../analyticsEngine.ts';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card.tsx';
import { BookOpen, Compass, Sparkles, Activity } from 'lucide-react';

interface WeeklyReflectionCardProps {
  reflection: WeeklyReflectionData;
}

export const WeeklyReflectionCard: React.FC<WeeklyReflectionCardProps> = ({ reflection }) => {
  return (
    <Card className="border border-stone-800/40 bg-stone-900/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-stone-100 uppercase tracking-wider font-mono">
              Weekly Behavioral Reflection
            </span>
          </div>
          <span className="text-xs font-mono text-stone-500">
            Mechanistic Analysis
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {/* 1. WHAT HAPPENED */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-800/40">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
              WHAT HAPPENED
            </h4>
          </div>
          <ul className="space-y-2 pl-1">
            {reflection.whatHappened.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-300 leading-relaxed">
                <span className="text-emerald-500 font-mono mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. WHAT SEEMS TO BE HAPPENING */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-800/40">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-xs font-mono font-bold text-amber-400 tracking-wider">
              WHAT SEEMS TO BE HAPPENING
            </h4>
          </div>
          <ul className="space-y-2 pl-1">
            {reflection.whatSeemsToBeHappening.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-300 leading-relaxed">
                <span className="text-amber-500 font-mono mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. WHAT TO TEST NEXT WEEK */}
        <div className="space-y-2.5 bg-emerald-950/20 border border-sky-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-1 border-b border-sky-800/40">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
              WHAT TO TEST NEXT WEEK
            </h4>
          </div>
          <ul className="space-y-2 pl-1 pt-1">
            {reflection.whatToTestNextWeek.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-emerald-200 leading-relaxed">
                <span className="text-emerald-400 font-mono font-bold mt-0.5">#{idx + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
