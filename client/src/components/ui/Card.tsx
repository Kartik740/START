import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'active' | 'subtle' | 'recovery' | 'glass';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'surface-1 border-stone-800/50 shadow-surface',
      elevated: 'surface-2 border-stone-700/50 shadow-elevated',
      active: 'surface-1 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/10',
      subtle: 'bg-stone-900/40 border-stone-800/30',
      recovery: 'bg-amber-950/15 border-amber-500/25 shadow-sm shadow-amber-500/5',
      glass: 'bg-stone-900/40 backdrop-blur-xl border-stone-700/30 shadow-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border text-stone-100 transition-all duration-200',
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
    className={cn("font-['Outfit'] text-base font-semibold text-stone-100 leading-snug tracking-tight", className)}
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
