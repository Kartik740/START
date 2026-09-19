import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'action' | 'success' | 'warning' | 'danger' | 'recovery';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'sm', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-[11px] font-medium rounded-md gap-1 tracking-tight',
      md: 'px-2.5 py-1 text-xs font-medium rounded-md gap-1.5 tracking-tight',
    };

    const variantClasses = {
      neutral: 'bg-white/[0.04] text-slate-300 border border-white/[0.08]',
      action: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-medium',
      success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
      warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/25',
      danger: 'bg-red-500/10 text-red-400 border border-red-500/25',
      recovery: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold',
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
