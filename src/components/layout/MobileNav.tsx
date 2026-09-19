import React from 'react';
import { NavLink } from 'react-router-dom';
import { Target, ListOrdered, FolderGit2, MoonStar, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

const MOBILE_ITEMS = [
  { to: '/today', label: 'Today', icon: Target },
  { to: '/planner', label: 'Plan', icon: ListOrdered },
  { to: '/assignments', label: 'Work', icon: FolderGit2 },
  { to: '/review', label: 'Review', icon: MoonStar },
  { to: '/rules', label: 'More', icon: MoreHorizontal },
];

export const MobileNav: React.FC = () => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 surface-1 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-stone-800/40 px-2 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-around"
      aria-label="Mobile Navigation"
    >
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center min-w-14 py-2.5 px-2 rounded-xl text-xs font-medium transition-all relative',
                isActive
                  ? 'text-emerald-400'
                  : 'text-stone-500 hover:text-stone-300'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active dot indicator */}
                {isActive && (
                  <div className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400" />
                )}
                <Icon className={cn('w-5 h-5 mb-1', isActive && 'text-emerald-400')} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
