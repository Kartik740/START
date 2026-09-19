import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Target,
  ListOrdered,
  FolderGit2,
  MoonStar,
  LineChart,
  BookOpen,
  Settings,
  Zap,
  Sparkles,
  LifeBuoy,
  Download,
} from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import { usePwaInstall } from '../../hooks/usePwaInstall.ts';

export interface NavItem {
  to: string;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/today',
    label: 'Today',
    icon: Target,
    description: 'Current state & next single action',
  },
  {
    to: '/planner',
    label: 'Planner',
    icon: ListOrdered,
    description: 'Top 1-2-3 & work window slots',
  },
  {
    to: '/assignments',
    label: 'Assignments',
    icon: FolderGit2,
    description: 'Milestones & deadline buffers',
  },
  {
    to: '/review',
    label: 'Night Review',
    icon: MoonStar,
    description: 'Reflect today & lock in tomorrow',
  },
  {
    to: '/analytics',
    label: 'Patterns',
    icon: LineChart,
    description: 'Delay triggers & starting trends',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Preferences & Supabase sync',
  },
];

export const AppSidebar: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] border-r border-white/[0.06] bg-[#0c0e14] p-3.5 pt-5 shrink-0 min-h-[calc(100vh-3.5rem)] select-none">
      {/* Brand Identity */}
      <div className="px-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[14px] text-white tracking-tight leading-none">
              START
            </h1>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Personal Focus OS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 flex-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-white/[0.06] text-white border border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.25)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03] border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Triage Tools */}
      <div className="pt-3 pb-2 space-y-1 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach'))}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/[0.06] border border-transparent hover:border-emerald-500/20 transition-all duration-150 group cursor-pointer text-left"
          title="Open AI Executive Reasoning Assistant"
        >
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-400/80 group-hover:text-emerald-400" />
          <span className="truncate">AI Task Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-overwhelm-rescue'))}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-amber-300 hover:bg-amber-500/[0.06] border border-transparent hover:border-amber-500/20 transition-all duration-150 group cursor-pointer text-left"
          title="Feeling overwhelmed? Click for rapid 3-step reduction"
        >
          <LifeBuoy className="w-4 h-4 shrink-0 text-amber-400/80 group-hover:text-amber-400" />
          <span className="truncate">Overwhelm Rescue</span>
        </button>

        <NavLink
          to="/rules"
          className={({ isActive }) =>
            cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group text-left',
              isActive
                ? 'bg-white/[0.06] text-white border border-white/[0.08]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
            )
          }
          title="Read the 10 Anti-procrastination Rules"
        >
          {({ isActive }) => (
            <>
              <BookOpen
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span className="truncate">Rules OS</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </>
          )}
        </NavLink>

        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={promptInstall}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent transition-all duration-150 group cursor-pointer text-left"
            title="Install START on your device"
          >
            <Download className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-white" />
            <span className="truncate">Install Web App</span>
          </button>
        )}
      </div>
    </aside>
  );
};
