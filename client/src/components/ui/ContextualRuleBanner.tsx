import React from 'react';
import { ContextualReminder } from '../../features/rules/ruleEngine.ts';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContextualRuleBannerProps {
  reminder: ContextualReminder | null;
  onDismiss?: () => void;
  className?: string;
}

export const ContextualRuleBanner: React.FC<ContextualRuleBannerProps> = ({
  reminder,
  onDismiss,
  className = '',
}) => {
  if (!reminder || !reminder.isEnabled) return null;

  return (
    <div
      className={`rounded-xl p-3.5 text-sm border transition-all duration-200 ${
        reminder.isTodayRule
          ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
          : 'bg-stone-900/60 border-stone-800/50 text-stone-300'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {reminder.isTodayRule ? (
              <Sparkles className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  reminder.isTodayRule
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15'
                }`}
              >
                {reminder.ruleCode}
              </span>
              {reminder.isTodayRule && (
                <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                  ★ Today&apos;s focus
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed pt-0.5">
              {reminder.reminderText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/rules"
            className="text-xs text-stone-400 hover:text-emerald-300 transition-colors"
          >
            View rules →
          </Link>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-stone-500 hover:text-stone-300 p-1 rounded-lg hover:bg-stone-800/50 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
