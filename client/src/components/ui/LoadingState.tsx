import React from 'react';
import { cn } from '../../utils/cn.ts';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading...',
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center p-10 sm:p-14 space-y-4 text-stone-400',
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
      </div>
      <span className="text-sm font-medium text-stone-500">{label}</span>
    </div>
  );
};

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-stone-800/40', className)}
      {...props}
    />
  );
};
