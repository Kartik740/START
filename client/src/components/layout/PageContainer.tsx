import React from 'react';
import { cn } from '../../utils/cn.ts';

export interface PageContainerProps {
  title: string;
  subtitle?: string;
  ruleHint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  ruleHint,
  actions,
  children,
  className,
  maxWidth = '4xl',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    '4xl': 'max-w-5xl',
    full: 'max-w-full',
  };

  return (
    <main className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-10 py-8 pb-28 lg:pb-12 text-left">
      <div className={cn('mx-auto w-full space-y-8 animate-fade-in-up', maxWidthClasses[maxWidth], className)}>
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="space-y-1">
            {ruleHint && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-400/80 tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                <span>{ruleHint}</span>
              </div>
            )}
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed pt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Content Body */}
        {children}
      </div>
    </main>
  );
};
