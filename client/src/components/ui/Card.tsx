import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'active' | 'subtle' | 'recovery' | 'glass';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-[#12151c] border border-white/[0.065] shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
      elevated: 'bg-[#181d26] border border-white/[0.08] shadow-[0_4px_18px_-2px_rgba(0,0,0,0.5)]',
      active: 'bg-[#12151c] border border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.08)]',
      subtle: 'bg-white/[0.02] border border-white/[0.04]',
      recovery: 'bg-amber-950/15 border border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.06)]',
      glass: 'glass-panel',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl text-slate-100 transition-all duration-200 relative overflow-hidden',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pb-3 flex flex-col space-y-1.5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-['Plus_Jakarta_Sans',sans-serif] text-base font-semibold text-slate-100 leading-snug tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-stone-400 leading-relaxed', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-2', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 sm:p-6 pt-0 flex items-center justify-between border-t border-stone-800/40 mt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
