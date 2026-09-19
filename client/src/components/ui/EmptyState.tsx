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
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl bg-white/[0.015] border border-white/[0.06] max-w-lg mx-auto my-6',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400 mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
        {description}
      </p>
      {secondaryNote && (
        <p className="text-[11px] text-slate-500 mt-3 max-w-sm font-mono">
          {secondaryNote}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
