import React from 'react';
import { cn } from '../../utils/cn.ts';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'recovery';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg font-medium tracking-tight',
      md: 'h-9 px-4 text-xs sm:text-[13px] gap-2 rounded-lg font-medium tracking-tight',
      lg: 'h-11 px-6 text-sm gap-2.5 rounded-xl font-semibold tracking-tight',
    };

    const variantClasses = {
      primary:
        'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.3),0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.35),0_6px_20px_rgba(16,185,129,0.32)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-emerald-400/40 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0',
      secondary:
        'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] hover:border-white/[0.14] shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:translate-y-0',
      outline:
        'bg-transparent hover:bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] disabled:opacity-40',
      ghost:
        'bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-slate-100 disabled:opacity-40',
      danger:
        'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40',
      recovery:
        'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 ease-out cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]',
          'disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
