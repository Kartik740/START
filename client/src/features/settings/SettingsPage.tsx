import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { useTheme } from '../../components/layout/ThemeContext.tsx';
import { storage } from '../../lib/storage.ts';
import { isSupabaseConfigured } from '../../lib/supabase.ts';
import { sound } from '../../utils/sound.ts';
import { Link } from 'react-router-dom';
import { usePwaInstall } from '../../hooks/usePwaInstall.ts';
import {
  notificationService,
  NotificationPermissionState,
} from '../../services/notificationService.ts';
import {
  getTimezoneInfo,
  COMMON_TIMEZONES,
  getDetectedTimezone,
} from '../../utils/timezone.ts';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Database,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  BrainCircuit,
  RotateCcw,
  Bell,
  BellOff,
  Globe,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Send,
  Wifi,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(() => storage.getSettings());
  const [profile, setProfile] = useState(() => storage.getOnboardingProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  // PWA & Notification State
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => notificationService.getPermissionStatus()
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Timezone Info
  const activeTimezone = settings.userTimezone || getDetectedTimezone();
  const timezoneInfo = getTimezoneInfo(activeTimezone);

  useEffect(() => {
    setSettings(storage.getSettings());
    setProfile(storage.getOnboardingProfile());
    setNotificationPermission(notificationService.getPermissionStatus());
  }, []);

  const handleSoundToggle = () => {
    const next = !settings.soundEnabled;
    const updated = storage.saveSettings({ soundEnabled: next });
    setSettings(updated);
    if (next) sound.playCaptureClick(true);
  };

  const handleToggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      // Trying to enable: check or request permission
      if (notificationPermission === 'default') {
        const res = await notificationService.requestPermission();
        setNotificationPermission(res);
        if (res !== 'granted') return;
      } else if (notificationPermission === 'denied') {
        // Cannot prompt, user must unblock in browser settings
        return;
      }
      const updated = storage.saveSettings({ notificationsEnabled: true });
      setSettings(updated);
    } else {
      const updated = storage.saveSettings({ notificationsEnabled: false });
      setSettings(updated);
    }
  };

  const handleRequestPermissionDirect = async () => {
    const res = await notificationService.requestPermission();
    setNotificationPermission(res);
  };

  const handleToggleNotificationCategory = (
    catKey: keyof typeof settings.notificationCategories
  ) => {
    const currentVal = settings.notificationCategories[catKey];
    const updated = storage.saveSettings({
      notificationCategories: {
        ...settings.notificationCategories,
        [catKey]: !currentVal,
      },
    });
    setSettings(updated);
  };

  const handleNightReviewTimeChange = (time: string) => {
    const updated = storage.saveSettings({
      notificationCategories: {
        ...settings.notificationCategories,
        nightReviewTime: time,
      },
    });
    setSettings(updated);
  };

  const handleTimezoneChange = (tz: string) => {
    const updated = storage.saveSettings({
      userTimezone: tz === 'auto' ? undefined : tz,
    });
    setSettings(updated);
  };

  const handleTestNotification = async () => {
    setTestNotificationSent(true);
    await notificationService.sendTestNotification();
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const handleInstallApp = async () => {
    await promptInstall();
  };

  const handleSaveEnv = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveSettings({
      supabaseUrl: settings.supabaseUrl,
      supabaseAnonKey: settings.supabaseAnonKey,
      geminiApiKey: settings.geminiApiKey,
      workDayStart: settings.workDayStart,
      workDayEnd: settings.workDayEnd,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const payload = {
      profile: storage.getOnboardingProfile(),
      slots: storage.getSlots(),
      assignments: storage.getAssignments(),
      reviews: storage.getReviews(),
      sessions: storage.getSessions(),
      distractions: storage.getDistractions(),
      patterns: storage.getPatterns(),
      settings: storage.getSettings(),
      exportedAt: new Date().toISOString(),
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute(
      'download',
      `start_os_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    dlAnchor.click();
  };

  const handleResetConfirm = () => {
    storage.clearAllData();
    setIsResetOpen(false);
    window.location.reload();
  };

  return (
    <PageContainer
      title="System Settings"
      subtitle="Environment configuration, PWA installation, timezone handling, and anti-spam notifications."
      ruleHint="Configuration"
    >
      <div className="space-y-6 max-w-3xl text-left">
        {/* 1. Progressive Web App (PWA) & Offline Application */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-stone-100">
                  Progressive Web App (PWA) & Offline Shell
                </CardTitle>
              </div>
              <Badge variant={isInstalled ? 'success' : isInstallable ? 'action' : 'neutral'}>
                {isInstalled
                  ? 'Installed (Standalone)'
                  : isInstallable
                  ? 'Installable'
                  : 'Browser Shell'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl surface-2 border border-stone-800/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-200">Offline Application Shell</span>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                    <Wifi className="w-3 h-3" /> Cache Ready
                  </span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  START caches core UI routes, timers, and stylesheets. All focus sessions, rules, and local storage data remain 100% operational offline without internet.
                </p>
              </div>

              {isInstallable && !isInstalled && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleInstallApp}
                  className="shrink-0"
                >
                  Install App
                </Button>
              )}

              {isInstalled && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Standalone Mode Active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Behavioral Notifications (Anti-Spam & Minimal) */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-stone-100">
                  Behavioral Notifications (Anti-Spam)
                </CardTitle>
              </div>
              <Badge
                variant={
                  notificationPermission === 'granted'
                    ? 'success'
                    : notificationPermission === 'denied'
                    ? 'danger'
                    : 'warning'
                }
              >
                {notificationPermission === 'granted'
                  ? 'Permitted'
                  : notificationPermission === 'denied'
                  ? 'Blocked by Browser'
                  : 'Prompt Required'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Permission Denied Warning */}
            {notificationPermission === 'denied' && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Notifications Blocked in Browser Settings</span>
                  <p className="text-rose-300/90 leading-relaxed">
                    To receive upcoming slot reminders, click the site settings or tune icon in your address bar, set Notifications to &ldquo;Allow&rdquo;, and refresh the page.
                  </p>
                </div>
              </div>
            )}

            {/* Master Toggle & Permission Request */}
            <div className="flex items-center justify-between py-2 border-b border-stone-800/40">
              <div>
                <h4 className="text-sm font-medium text-stone-200">Master Notification Switch</h4>
                <p className="text-xs text-stone-400">
                  Zero motivational quotes or nagging. Dispatches strictly operational cues.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {notificationPermission === 'default' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestPermissionDirect}
                  >
                    Enable in Browser
                  </Button>
                )}

                <Button
                  variant={settings.notificationsEnabled ? 'secondary' : 'outline'}
                  size="sm"
                  leftIcon={
                    settings.notificationsEnabled ? (
                      <Bell className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-stone-500" />
                    )
                  }
                  onClick={handleToggleNotifications}
                >
                  {settings.notificationsEnabled ? 'Enabled' : 'Muted'}
                </Button>
              </div>
            </div>

            {/* Individual Notification Categories */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider block">
                Notification Categories
              </span>

              {/* Category 1: Upcoming Work Slot */}
              <label className="flex items-start justify-between gap-3 p-3 rounded-xl surface-2 border border-stone-800/30 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-stone-200 block">
                    Upcoming Work Slot Reminder
                  </span>
                  <span className="text-xs text-stone-400 block">
                    Alerts 10 minutes before planned slot: &ldquo;Your 9:00 AM work slot starts in 10 minutes.&rdquo;
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationCategories.upcomingSlot}
                  onChange={() => handleToggleNotificationCategory('upcomingSlot')}
                  className="mt-1 h-4 w-4 rounded border-stone-700 bg-stone-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              {/* Category 2: Next Action Ready */}
              <label className="flex items-start justify-between gap-3 p-3 rounded-xl surface-2 border border-stone-800/30 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-stone-200 block">
                    Next Action Ready
                  </span>
                  <span className="text-xs text-stone-400 block">
                    Prompts immediate bodily action at slot start: &ldquo;Your next action is ready: Open Tutorial 3.&rdquo;
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationCategories.nextActionReady}
                  onChange={() => handleToggleNotificationCategory('nextActionReady')}
                  className="mt-1 h-4 w-4 rounded border-stone-700 bg-stone-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              {/* Category 3: Missed Slot 10-Minute Recovery */}
              <label className="flex items-start justify-between gap-3 p-3 rounded-xl surface-2 border border-stone-800/30 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-stone-200 block">
                    Missed Slot Recovery Prompt
                  </span>
                  <span className="text-xs text-stone-400 block">
                    Preserves momentum without guilt: &ldquo;You missed your planned slot. Start a 10-minute recovery?&rdquo;
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationCategories.missedSlotRecovery}
                  onChange={() => handleToggleNotificationCategory('missedSlotRecovery')}
                  className="mt-1 h-4 w-4 rounded border-stone-700 bg-stone-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              {/* Category 4: Daily Night Review */}
              <div className="p-3 rounded-xl surface-2 border border-stone-800/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-stone-200 block">
                      Daily Night Review Reminder
                    </span>
                    <span className="text-xs text-stone-400 block">
                      Prompts evening reflection and tomorrow&apos;s plan lock-in: &ldquo;Night review is ready.&rdquo;
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationCategories.nightReview}
                    onChange={() => handleToggleNotificationCategory('nightReview')}
                    className="mt-1 h-4 w-4 rounded border-stone-700 bg-stone-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {settings.notificationCategories.nightReview && (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-800/40">
                    <span className="text-xs text-stone-400">Evening Reminder Time:</span>
                    <input
                      type="time"
                      value={settings.notificationCategories.nightReviewTime || '21:00'}
                      onChange={(e) => handleNightReviewTimeChange(e.target.value)}
                      className="px-2.5 py-1 rounded-lg surface-1 border border-stone-700/60 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Test Notification Button */}
            {notificationPermission === 'granted' && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-stone-500 font-mono">
                  {testNotificationSent ? 'Dispatched test notification' : 'Verify delivery & audio chime'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  onClick={handleTestNotification}
                >
                  Send Test Notification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Timezone & Daylight Saving (DST) */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-stone-100">
                  Timezone & Daylight Saving Time
                </CardTitle>
              </div>
              <Badge variant={timezoneInfo.isDstActive ? 'warning' : 'neutral'}>
                {timezoneInfo.isDstActive ? 'DST Active' : 'Standard Time'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-200">Active Schedule Timezone</span>
                <span className="text-xs font-mono text-emerald-400">
                  {timezoneInfo.offsetString}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Work slots and reminder countdowns synchronize to your local wall-clock time, correctly accounting for Daylight Saving transitions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={settings.userTimezone || 'auto'}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl surface-2 border border-stone-700/60 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="auto">Auto-detect ({getDetectedTimezone()})</option>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 4. START Operating Profile Card */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold text-stone-100">
                  START Operating Profile
                </CardTitle>
              </div>
              <Badge variant={profile ? 'success' : 'warning'}>
                {profile ? 'Configured' : 'Incomplete'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-100">{profile.name}</span>
                  <Badge variant="neutral">{profile.primaryRole}</Badge>
                  <span className="text-xs text-stone-400">• Peak window: {profile.bestWorkingTime}</span>
                </div>
                {profile.generatedOperatingProfile && (
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-950 p-3 rounded-lg border border-stone-800">
                    &ldquo;{profile.generatedOperatingProfile.summaryStatement}&rdquo;
                  </p>
                )}
                <div className="pt-1">
                  <Link to="/onboarding">
                    <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                      Reconfigure Operating Profile
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-stone-400">
                  Onboarding has not been completed. Configure START to target your specific procrastination pattern.
                </p>
                <Link to="/onboarding">
                  <Button variant="primary" size="sm">
                    Complete Onboarding Flow
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Theme & Audio Preferences */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-stone-100">
              Display & Audio Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-stone-800/40">
              <div>
                <h4 className="text-sm font-medium text-stone-200">Color Palette Theme</h4>
                <p className="text-xs text-stone-400">
                  Calm, distraction-free dark mode is default.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant={theme === 'dark' ? 'primary' : 'outline'}
                  size="sm"
                  leftIcon={<Moon className="w-3.5 h-3.5" />}
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'light' ? 'primary' : 'outline'}
                  size="sm"
                  leftIcon={<Sun className="w-3.5 h-3.5" />}
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'system' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  System
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="text-sm font-medium text-stone-200">Audio Cues (Web Audio)</h4>
                <p className="text-xs text-stone-400">
                  Subtle start chime, session gong, and distraction click.
                </p>
              </div>
              <Button
                variant={settings.soundEnabled ? 'secondary' : 'outline'}
                size="sm"
                leftIcon={
                  settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-stone-500" />
                  )
                }
                onClick={handleSoundToggle}
              >
                {settings.soundEnabled ? 'Enabled' : 'Muted'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 6. Supabase & External Sync */}
        <form onSubmit={handleSaveEnv}>
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <CardTitle className="text-sm font-semibold text-stone-100">
                    Database & Cloud Synchronization
                  </CardTitle>
                </div>
                <Badge variant={isSupabaseConfigured ? 'success' : 'neutral'}>
                  {isSupabaseConfigured ? 'Supabase Connected' : 'Local Storage Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                START operates out-of-the-box using fast, private reactive local storage. You can optionally connect your Supabase PostgreSQL project for multi-device sync.
              </p>

              <Input
                label="Supabase URL"
                placeholder="https://your-project.supabase.co"
                value={settings.supabaseUrl || ''}
                onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
              />

              <Input
                label="Supabase Anon Key"
                type="password"
                placeholder="eyJhbGciOi..."
                value={settings.supabaseAnonKey || ''}
                onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
              />

              <Input
                label="Gemini API Key (Optional AI Coach Assistant)"
                type="password"
                placeholder="AIzaSy..."
                hint="Used for task decomposition and obstacle if-then reasoning."
                value={settings.geminiApiKey || ''}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              />

              <div className="flex items-center justify-between pt-2">
                {savedSuccess ? (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Settings Saved
                  </span>
                ) : (
                  <span />
                )}
                <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* 7. Data Management & Reset */}
        <Card variant="subtle" className="border-stone-800">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-stone-100">
              Data Management & Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-stone-400">
              Export your anti-procrastination logs, work sessions, and reviews to JSON or perform a clean slate reset.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportData}
              >
                Export Backup (JSON)
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsResetOpen(true)}
              >
                Reset All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetConfirm}
        isDestructive
        title="Reset All Data?"
        description="This will clear all local work slots, assignments, sessions, and daily reviews. This cannot be undone."
        confirmLabel="Reset Everything"
      />
    </PageContainer>
  );
};
