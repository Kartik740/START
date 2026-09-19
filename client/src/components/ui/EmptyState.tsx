import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  secondaryNote?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryNote,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-10 sm:p-14 rounded-2xl border border-dashed border-stone-800/60 bg-stone-900/20 max-w-lg mx-auto my-8',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-5 shadow-sm">
          {icon}
        </div>
      )}
      <h4 className="font-['Outfit'] text-lg font-semibold text-stone-200 tracking-tight">{title}</h4>
      <p className="text-sm text-stone-400 mt-2 max-w-sm leading-relaxed">{description}</p>
      {secondaryNote && (
        <p className="text-xs text-stone-500 mt-3 max-w-sm">{secondaryNote}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
