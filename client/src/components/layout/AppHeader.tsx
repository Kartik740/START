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
    <header className="sticky top-0 z-30 h-16 surface-1 border-b border-stone-800/40 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl bg-[var(--surface-1)]/80">
      {/* Left: brand (visible on mobile/tablet where sidebar is hidden) */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
          <span className="text-white font-bold text-xs">S</span>
        </div>
        <span className="font-['Outfit'] font-bold text-[15px] text-stone-100 tracking-tight">
          START
        </span>
      </div>

      {/* Left: empty spacer for desktop (sidebar has the brand) */}
      <div className="hidden lg:block" />

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Overwhelm Rescue */}
        <button
          type="button"
          onClick={() => setIsOverwhelmOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-medium transition-colors cursor-pointer"
          title="Feeling overwhelmed? Click for rapid 3-step reduction"
        >
          <LifeBuoy className="w-4 h-4" />
          <span className="hidden sm:inline">Overwhelmed?</span>
        </button>

        {/* AI Coach */}
        <button
          type="button"
          onClick={() => setIsAiCoachOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/8 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
          title="Open AI Executive Reasoning Assistant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI Coach</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-stone-800/60 mx-1 hidden sm:block" />

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={handleSoundToggle}
          title={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          aria-label={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-800/50 transition-colors cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
          className="p-2 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-800/50 transition-colors cursor-pointer"
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile & Sign Out (when authenticated) */}
        {user && (
          <>
            <div className="w-px h-6 bg-stone-800/60 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-medium text-stone-200 font-mono leading-tight truncate max-w-[140px]">
                  {user.user_metadata?.display_name || user.email?.split('@')[0]}
                </span>
                <span className="text-xs text-stone-500 font-mono truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-teal-500/20 shrink-0">
                {(user.user_metadata?.display_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out of account"
                aria-label="Sign out"
                className="p-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
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
