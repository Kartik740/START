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
    to: '/rules',
    label: 'Rules OS',
    icon: BookOpen,
    description: '10 Anti-procrastination laws',
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
    <aside className="hidden lg:flex flex-col w-[260px] border-r border-stone-800/60 surface-1 p-4 pt-6 shrink-0 min-h-[calc(100vh-4rem)] select-none">
      {/* Brand Identity */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-['Outfit'] font-bold text-[15px] text-stone-100 tracking-tight">
              START
            </h1>
            <p className="text-xs text-stone-500 leading-tight">
              Anti-Procrastination OS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
                  )}
                  <Icon
                    className={cn(
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      isActive ? 'text-emerald-400' : 'text-stone-500 group-hover:text-stone-300'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Executive AI Assistance */}
      <div className="pt-4 pb-2 space-y-1.5 border-t border-stone-800/50">
        <div className="px-3 pb-1 text-xs font-medium text-stone-500 uppercase tracking-wider">
          Executive Tools
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach'))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-stone-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-150 group cursor-pointer text-left"
          title="Open AI Executive Reasoning Assistant"
        >
          <Sparkles className="w-[18px] h-[18px] shrink-0 text-emerald-400/70 group-hover:text-emerald-400" />
          <span className="truncate">AI Coach</span>
          <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Assistant
          </span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-overwhelm-rescue'))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-stone-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-150 group cursor-pointer text-left"
          title="Feeling overwhelmed? Click for rapid 3-step reduction"
        >
          <LifeBuoy className="w-[18px] h-[18px] shrink-0 text-amber-400/70 group-hover:text-amber-400" />
          <span className="truncate">Overwhelmed?</span>
          <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Rescue
          </span>
        </button>

        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={promptInstall}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-150 group cursor-pointer text-left"
            title="Install START on your device"
          >
            <Download className="w-[18px] h-[18px] shrink-0 text-emerald-400/80 group-hover:text-emerald-400" />
            <span className="truncate">Install App</span>
            <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              PWA
            </span>
          </button>
        )}
      </div>

      {/* Bottom motivational strip */}
      <div className="mt-auto pt-4 border-t border-stone-800/50">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10">
          <p className="text-[12px] text-stone-400 leading-relaxed italic">
            "Motivation follows physical action. Do not wait to feel ready."
          </p>
          <p className="text-xs text-stone-600 mt-1.5 font-medium">— Rule 01</p>
        </div>
      </div>
    </aside>
  );
};
