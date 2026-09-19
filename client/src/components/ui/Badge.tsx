import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'action' | 'success' | 'warning' | 'danger' | 'recovery';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'sm', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs font-medium rounded-full gap-1',
      md: 'px-3 py-1 text-xs font-medium rounded-full gap-1.5',
    };

    const variantClasses = {
      neutral: 'bg-stone-800/80 text-stone-300 border border-stone-700/50',
      action: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
      success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
      danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
      recovery: 'bg-amber-500/12 text-amber-300 border border-amber-500/25 font-semibold',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center select-none tracking-wide',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
