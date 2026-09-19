import React from 'react';
import { useTheme } from './ThemeContext.tsx';
import { sound } from '../../utils/sound.ts';
import { storage } from '../../lib/storage.ts';
import { Sun, Moon, Volume2, VolumeX, Sparkles, LifeBuoy, LogOut } from 'lucide-react';
import { AiCoachDrawer } from '../../features/ai/components/AiCoachDrawer.tsx';
import { OverwhelmRescueModal } from '../../features/ai/components/OverwhelmRescueModal.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';

export const AppHeader: React.FC = () => {
  const { effectiveTheme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isAiCoachOpen, setIsAiCoachOpen] = React.useState(false);
  const [isOverwhelmOpen, setIsOverwhelmOpen] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    return storage.getSettings().soundEnabled;
  });

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    storage.saveSettings({ soundEnabled: next });
    if (next) sound.playCaptureClick(true);
  };

  React.useEffect(() => {
    const handleOpenAi = () => setIsAiCoachOpen(true);
    const handleOpenOverwhelm = () => setIsOverwhelmOpen(true);
    window.addEventListener('open-ai-coach', handleOpenAi);
    window.addEventListener('open-overwhelm-rescue', handleOpenOverwhelm);
    return () => {
      window.removeEventListener('open-ai-coach', handleOpenAi);
      window.removeEventListener('open-overwhelm-rescue', handleOpenOverwhelm);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl bg-[#08090c]/80">
      {/* Left: brand (visible on mobile/tablet where sidebar is hidden) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-emerald-400 font-bold text-xs">S</span>
        </div>
        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[14px] text-white tracking-tight">
          START
        </span>
      </div>

      {/* Left desktop: Quick search / command hint */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-coach'))}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer group"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Search actions or ask AI coach...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.08] ml-2 group-hover:text-slate-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Overwhelm Rescue */}
        <button
          type="button"
          onClick={() => setIsOverwhelmOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
          title="Feeling overwhelmed? Click for rapid 3-step reduction"
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overwhelmed?</span>
        </button>

        {/* AI Coach */}
        <button
          type="button"
          onClick={() => setIsAiCoachOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
          title="Open AI Executive Reasoning Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Coach</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={handleSoundToggle}
          title={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          aria-label={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-colors cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-colors cursor-pointer"
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile & Sign Out (when authenticated) */}
        {user && (
          <>
            <div className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-medium text-slate-200 font-mono leading-tight truncate max-w-[130px]">
                  {user.user_metadata?.display_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono shadow-sm shrink-0">
                {(user.user_metadata?.display_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out of account"
                aria-label="Sign out"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* AI Coach Modal */}
      <AiCoachDrawer
        isOpen={isAiCoachOpen}
        onClose={() => setIsAiCoachOpen(false)}
        onOpenOverwhelm={() => {
          setIsAiCoachOpen(false);
          setIsOverwhelmOpen(true);
        }}
      />

      {/* Overwhelm Rescue Modal */}
      <OverwhelmRescueModal
        isOpen={isOverwhelmOpen}
        onClose={() => setIsOverwhelmOpen(false)}
      />
    </header>
  );
};
