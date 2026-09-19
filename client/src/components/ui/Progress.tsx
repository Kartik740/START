import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: 'violet' | 'emerald' | 'amber' | 'neutral';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant = 'violet', height = 'sm', showLabel = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const heightClasses = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    };

    const variantFillClasses = {
      violet: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
      neutral: 'bg-stone-400',
    };

    return (
      <div className="w-full space-y-1.5">
        {showLabel && (
          <div className="flex justify-between text-xs text-stone-400">
            <span>Progress</span>
            <span className="font-medium text-stone-300">{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn(
            'w-full bg-stone-800/60 rounded-full overflow-hidden',
            heightClasses[height],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out animate-progress-fill',
              variantFillClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';
