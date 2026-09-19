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
      sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-xl font-medium',
      md: 'h-10 px-5 text-sm gap-2 rounded-xl font-medium',
      lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl font-semibold',
    };

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none',
      secondary:
        'bg-stone-800/80 hover:bg-stone-700/80 text-stone-200 border border-stone-700/60 hover:border-stone-600 shadow-sm disabled:opacity-50',
      outline:
        'bg-transparent hover:bg-stone-800/40 text-stone-300 hover:text-stone-100 border border-stone-700/60 hover:border-stone-600 disabled:opacity-50',
      ghost:
        'bg-transparent hover:bg-stone-800/40 text-stone-400 hover:text-stone-200 disabled:opacity-50',
      danger:
        'bg-red-600/90 hover:bg-red-500 text-white font-medium shadow-sm disabled:opacity-50',
      recovery:
        'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-semibold shadow-md shadow-amber-500/20 disabled:opacity-50',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]',
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
