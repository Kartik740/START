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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-bold tracking-tight text-stone-50">
                {title}
              </h1>
              {ruleHint && (
                <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-300">
                  {ruleHint}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-stone-400 max-w-2xl leading-relaxed">
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
