import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input, Textarea } from '../../components/ui/Input.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Progress } from '../../components/ui/Progress.tsx';
import { storage } from '../../lib/storage.ts';
import { dataService } from '../../services/dataService.ts';
import { sound } from '../../utils/sound.ts';
import { UserOnboardingProfile, OnboardingDraft } from '../../types/models.ts';
import { generateOperatingProfileSummary } from './profileGenerator.ts';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  AlertCircle,
  BrainCircuit,
  Calendar,
} from 'lucide-react';

const TOTAL_STEPS = 7;

const ROLE_OPTIONS = [
  'Student',
  'Researcher',
  'Software Engineer',
  'Writer / Creator',
  'Founder / Entrepreneur',
  'Academic / Professional',
  'Other',
];

const CATEGORY_OPTIONS = [
  'Technical / Coding',
  'Writing / Papers',
  'Problem Sets / Math',
  'Reading / Literature',
  'Planning / Strategy',
  'Administrative / Logistics',
];

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TRIGGER_OPTIONS = [
  { id: 'overwhelmed', label: 'I feel overwhelmed', desc: 'The task feels too large or complex to grasp' },
  { id: 'dont_know_where_to_begin', label: "I don't know where to begin", desc: 'Instructions or starting actions are ambiguous' },
  { id: 'task_feels_boring', label: 'The task feels boring or dry', desc: 'Low immediate dopamine triggers restless avoidance' },
  { id: 'want_to_use_phone', label: 'I reach for my phone', desc: 'Device proximity creates compulsive reflex checking' },
  { id: 'worry_not_good_enough', label: "I worry the work won't be good enough", desc: 'Perfectionism prevents drafting the raw first version' },
  { id: 'tell_myself_plenty_of_time', label: 'I tell myself I have plenty of time', desc: 'Distant deadline is misread as permission to postpone' },
  { id: 'distracted_by_other_work', label: 'I get distracted by other work', desc: 'Doing easy chores to avoid the high-friction task' },
  { id: 'lose_track_of_time', label: 'I lose track of time', desc: '“Just 10 minutes” casually turns into hours' },
];

const DISTRACTION_OPTIONS = [
  { id: 'social_media', label: 'Social Media', desc: 'Instagram, X / Twitter, Reddit, TikTok' },
  { id: 'youtube', label: 'YouTube / Video Streaming', desc: 'Watch feeds, tutorials, entertainment' },
  { id: 'messaging', label: 'Messaging / Chats', desc: 'WhatsApp, Telegram, Discord, Slack' },
  { id: 'gaming', label: 'Gaming', desc: 'PC, console, or casual phone games' },
  { id: 'browsing', label: 'Aimless Web Browsing & News', desc: 'Checking news sites, forums, blogs' },
  { id: 'unnecessary_research', label: 'Unnecessary Research', desc: 'Infinite rabbit holes disguised as preparation' },
];

const WORKING_TIME_OPTIONS = [
  { id: 'morning', label: 'Morning (08:00 – 12:00)', desc: 'Early focus before inbound interruptions' },
  { id: 'afternoon', label: 'Afternoon (13:00 – 17:00)', desc: 'Midday rhythm post-lunch' },
  { id: 'evening', label: 'Evening (17:00 – 21:00)', desc: 'Post-work / quiet dusk focus' },
  { id: 'night', label: 'Late Night (21:00 – 02:00)', desc: 'Deep silence with zero external pings' },
  { id: 'variable', label: 'Variable / Irregular', desc: 'Shifts unpredictably from day to day' },
];

const RECOMMENDED_RULES = [
  {
    code: 'RULE 01',
    title: 'Start before motivation',
    desc: 'Motivation follows physical motion. Reduce starting requirement to a single 10-second action.',
  },
  {
    code: 'RULE 02',
    title: 'Every session needs a concrete output',
    desc: 'Define what tangible artifact will physically exist when the work slot ends.',
  },
  {
    code: 'RULE 04',
    title: 'Define the next action before ending a session',
    desc: 'Eliminate restart friction for tomorrow by writing the first physical step today.',
  },
  {
    code: 'RULE 05',
    title: 'Keep phone physically away during deep work',
    desc: 'Physical separation beats willpower. Place device outside reach or in another room.',
  },
  {
    code: 'RULE 06',
    title: 'Capture distractions instead of following them',
    desc: 'Park urges in the capture log without acting on them, then immediately return to work.',
  },
  {
    code: 'RULE 07',
    title: 'Use a 10-minute recovery when a slot is missed',
    desc: 'Zero guilt. Downscale to a micro-session immediately instead of abandoning the day.',
  },
  {
    code: 'RULE 10',
    title: 'Plan tomorrow at night',
    desc: 'Tomorrow is planned at night, not negotiated in the morning.',
  },
];

export const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();

  // Load in-flight draft from localStorage to handle refresh recovery
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const draft = storage.getOnboardingDraft();
    return draft?.currentStep && draft.currentStep >= 1 && draft.currentStep <= TOTAL_STEPS
      ? draft.currentStep
      : 1;
  });

  const [formData, setFormData] = useState<Partial<UserOnboardingProfile>>(() => {
    const draft = storage.getOnboardingDraft();
    return (
      draft || {
        name: '',
        primaryRole: 'Student',
        customRole: '',
        typicalCategories: ['Technical / Coding', 'Writing / Papers'],
        normalWorkingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        approxAvailableHoursPerDay: 4,
        primaryGoals: [''],
        responsibilities: '',
        upcomingDeadlines: [{ id: '1', title: '', deadlineDate: '' }],
        delayTriggers: ['overwhelmed', 'want_to_use_phone', 'tell_myself_plenty_of_time'],
        customDelayTrigger: '',
        commonDistractions: ['social_media', 'youtube', 'messaging'],
        customDistraction: '',
        bestWorkingTime: 'morning',
        enabledRuleCodes: RECOMMENDED_RULES.map((r) => r.code),
        firstCommitment: {
          goal: '',
          firstPhysicalAction: '',
          deadline: '',
          targetDurationMinutes: 40,
        },
      }
    );
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save draft on every change
  useEffect(() => {
    const draft: OnboardingDraft = {
      ...formData,
      currentStep,
    };
    storage.saveOnboardingDraft(draft);
  }, [formData, currentStep]);

  const updateForm = (fields: Partial<UserOnboardingProfile>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    setErrorMsg(null);
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.name?.trim()) {
        setErrorMsg('Please enter your name.');
        return false;
      }
      if (formData.primaryRole === 'Other' && !formData.customRole?.trim()) {
        setErrorMsg('Please specify your primary role.');
        return false;
      }
      if (!formData.typicalCategories?.length) {
        setErrorMsg('Select at least one work category.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const validGoals = formData.primaryGoals?.filter((g) => g.trim().length > 0) || [];
      if (validGoals.length === 0) {
        setErrorMsg('Please enter at least one current major goal or responsibility.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!formData.delayTriggers?.length && !formData.customDelayTrigger?.trim()) {
        setErrorMsg('Please select at least one trigger that causes you to postpone work.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!formData.commonDistractions?.length && !formData.customDistraction?.trim()) {
        setErrorMsg('Please select at least one frequent distraction.');
        return false;
      }
      return true;
    }

    if (step === 5) {
      if (!formData.bestWorkingTime) {
        setErrorMsg('Please select when you work best.');
        return false;
      }
      return true;
    }

    if (step === 6) {
      if (!formData.enabledRuleCodes?.length) {
        setErrorMsg('Please keep at least one operating rule enabled to guide your system.');
        return false;
      }
      return true;
    }

    if (step === 7) {
      if (!formData.firstCommitment?.goal?.trim()) {
        setErrorMsg('Please define what you need to move forward this week.');
        return false;
      }
      if (!formData.firstCommitment?.firstPhysicalAction?.trim()) {
        setErrorMsg('Please specify the exact first physical action to start.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep((s) => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = async () => {
    if (!validateStep(7)) return;

    setIsSubmitting(true);
    try {
      const generatedProfile = generateOperatingProfileSummary(formData);

      const completeProfile: UserOnboardingProfile = {
        name: formData.name || 'User',
        primaryRole: formData.primaryRole || 'Student',
        customRole: formData.customRole,
        typicalCategories: formData.typicalCategories || ['Technical / Coding'],
        normalWorkingDays: formData.normalWorkingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        approxAvailableHoursPerDay: formData.approxAvailableHoursPerDay || 4,
        primaryGoals: formData.primaryGoals?.filter((g) => g.trim().length > 0) || ['Project Milestone'],
        responsibilities: formData.responsibilities || '',
        upcomingDeadlines: formData.upcomingDeadlines?.filter((d) => d.title.trim().length > 0) || [],
        delayTriggers: formData.delayTriggers || [],
        customDelayTrigger: formData.customDelayTrigger,
        commonDistractions: formData.commonDistractions || [],
        customDistraction: formData.customDistraction,
        bestWorkingTime: formData.bestWorkingTime || 'morning',
        enabledRuleCodes: formData.enabledRuleCodes || RECOMMENDED_RULES.map((r) => r.code),
        firstCommitment: {
          goal: formData.firstCommitment!.goal,
          firstPhysicalAction: formData.firstCommitment!.firstPhysicalAction,
          deadline: formData.firstCommitment!.deadline,
          targetDurationMinutes: formData.firstCommitment!.targetDurationMinutes || 40,
        },
        generatedOperatingProfile: generatedProfile,
        completedAt: new Date().toISOString(),
      };

      await dataService.saveOnboardingProfile(completeProfile);

      // Play start sound
      sound.playStartChime(true);

      // Redirect directly to /today
      navigate('/today', { replace: true });
    } catch (err) {
      console.error('Failed to save onboarding:', err);
      setErrorMsg('An error occurred while saving your operating profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header & Step Progress */}
      <div className="max-w-2xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-stone-100">
                START OS
              </span>
              <span className="text-xs font-mono text-stone-500 ml-2">SYSTEM CONFIGURATION</span>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
        </div>

        <Progress value={currentStep} max={TOTAL_STEPS} variant="violet" height="sm" />
      </div>

      {/* Main Step Content Area */}
      <div className="max-w-2xl w-full mx-auto my-6 flex-1">
        {/* STEP 1 — BASIC PROFILE */}
        {currentStep === 1 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 1 • Profile Baseline</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                Who are you and what do you work on?
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                START uses this baseline to calibrate realistic daily work windows and detect domain-specific resistance.
              </p>
            </div>

            <div className="space-y-4 text-left">
              <Input
                label="Preferred Name"
                placeholder="e.g. Alex"
                value={formData.name || ''}
                onChange={(e) => updateForm({ name: e.target.value })}
                autoFocus
              />

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-300">Primary Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updateForm({ primaryRole: role })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        formData.primaryRole === role
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                {formData.primaryRole === 'Other' && (
                  <Input
                    placeholder="Specify your role..."
                    value={formData.customRole || ''}
                    onChange={(e) => updateForm({ customRole: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Work Categories */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-300">
                  Typical Work / Study Categories (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = formData.typicalCategories?.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const list = formData.typicalCategories || [];
                          const next = isSelected
                            ? list.filter((c) => c !== cat)
                            : [...list, cat];
                          updateForm({ typicalCategories: next });
                        }}
                        className={`p-2 rounded-lg text-xs text-left border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40 font-medium'
                            : 'bg-stone-900/60 text-stone-400 border-stone-800/40 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-300">
                  Normal Working Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((day) => {
                    const isSelected = formData.normalWorkingDays?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const list = formData.normalWorkingDays || [];
                          const next = isSelected
                            ? list.filter((d) => d !== day)
                            : [...list, day];
                          updateForm({ normalWorkingDays: next });
                        }}
                        className={`w-11 h-9 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-stone-950 font-bold'
                            : 'bg-stone-900 text-stone-400 border border-stone-800'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available Hours */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-stone-300">
                  <span>Approx. Available Deep Work Hours / Day</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {formData.approxAvailableHoursPerDay} hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={formData.approxAvailableHoursPerDay || 4}
                  onChange={(e) =>
                    updateForm({ approxAvailableHoursPerDay: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-400 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2 — CURRENT GOALS */}
        {currentStep === 2 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 2 • Active Scope</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                What important work is currently in progress?
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                START needs actual deliverables so it can break them into earlier milestones instead of letting distant deadlines create false safety.
              </p>
            </div>

            <div className="space-y-4 text-left">
              {/* Primary Goals */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-300">
                  Primary Goals or Major Deliverables (1–3 items)
                </label>
                {(formData.primaryGoals || ['']).map((goal, idx) => (
                  <Input
                    key={idx}
                    placeholder={`Goal ${idx + 1} (e.g. Complete Computer Vision research paper)`}
                    value={goal}
                    onChange={(e) => {
                      const list = [...(formData.primaryGoals || [''])];
                      list[idx] = e.target.value;
                      updateForm({ primaryGoals: list });
                    }}
                  />
                ))}
                {(formData.primaryGoals?.length || 0) < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateForm({
                        primaryGoals: [...(formData.primaryGoals || []), ''],
                      })
                    }
                  >
                    + Add Another Goal
                  </Button>
                )}
              </div>

              {/* Responsibilities */}
              <Textarea
                label="Key Academic or Professional Responsibilities (Optional)"
                placeholder="e.g. CS6320 Coursework, Weekly lab meetings, Client code reviews"
                value={formData.responsibilities || ''}
                onChange={(e) => updateForm({ responsibilities: e.target.value })}
              />

              {/* Upcoming Deadline */}
              <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                  <Calendar className="w-4 h-4" />
                  <span>UPCOMING CRITICAL DEADLINE</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Deadline name (e.g. Project Midterm)"
                    value={formData.upcomingDeadlines?.[0]?.title || ''}
                    onChange={(e) => {
                      const deadlines = [...(formData.upcomingDeadlines || [{ id: '1', title: '', deadlineDate: '' }])];
                      deadlines[0] = { ...deadlines[0], title: e.target.value };
                      updateForm({ upcomingDeadlines: deadlines });
                    }}
                  />
                  <Input
                    type="date"
                    value={formData.upcomingDeadlines?.[0]?.deadlineDate || ''}
                    onChange={(e) => {
                      const deadlines = [...(formData.upcomingDeadlines || [{ id: '1', title: '', deadlineDate: '' }])];
                      deadlines[0] = { ...deadlines[0], deadlineDate: e.target.value };
                      updateForm({ upcomingDeadlines: deadlines });
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 3 — PROCRASTINATION PATTERN */}
        {currentStep === 3 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 3 • Procrastination Reflex</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                When you delay important work, what usually happens first?
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Identify your primary avoidance triggers. START activates targeted anti-procrastination counter-measures based on your selection.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {TRIGGER_OPTIONS.map((item) => {
                const isChecked = formData.delayTriggers?.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      const list = formData.delayTriggers || [];
                      const next = isChecked
                        ? list.filter((id) => id !== item.id)
                        : [...list, item.id];
                      updateForm({ delayTriggers: next });
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-1 ${
                      isChecked
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-950/20'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-200">{item.label}</span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-stone-950'
                            : 'border-stone-700 bg-stone-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 leading-tight">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <Input
              label="Other Delay Triggers (Optional)"
              placeholder="Describe any other reflex..."
              value={formData.customDelayTrigger || ''}
              onChange={(e) => updateForm({ customDelayTrigger: e.target.value })}
              className="text-left"
            />
          </Card>
        )}

        {/* STEP 4 — COMMON DISTRACTIONS */}
        {currentStep === 4 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 4 • High-Reward Escapes</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                Where does your attention flee when work gets uncomfortable?
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                When a task is boring, vague, or difficult, the brain seeks instant dopamine. START equips you with a distraction capture feed to interrupt these routes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {DISTRACTION_OPTIONS.map((item) => {
                const isChecked = formData.commonDistractions?.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      const list = formData.commonDistractions || [];
                      const next = isChecked
                        ? list.filter((id) => id !== item.id)
                        : [...list, item.id];
                      updateForm({ commonDistractions: next });
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-1 ${
                      isChecked
                        ? 'bg-rose-500/15 border-rose-500/40 shadow-sm shadow-rose-950/20'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-200">{item.label}</span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-stone-700 bg-stone-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 leading-tight">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <Input
              label="Other High-Reward Distraction (Optional)"
              placeholder="e.g. Cleaning my desk, organizing tabs..."
              value={formData.customDistraction || ''}
              onChange={(e) => updateForm({ customDistraction: e.target.value })}
              className="text-left"
            />
          </Card>
        )}

        {/* STEP 5 — WORKING PATTERN */}
        {currentStep === 5 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 5 • Energy Alignment</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                When do you experience your lowest starting resistance?
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                START schedules heavy technical tasks during your natural window of highest starting momentum.
              </p>
            </div>

            <div className="space-y-3 text-left">
              {WORKING_TIME_OPTIONS.map((time) => {
                const isSelected = formData.bestWorkingTime === time.id;
                return (
                  <div
                    key={time.id}
                    onClick={() =>
                      updateForm({
                        bestWorkingTime: time.id as UserOnboardingProfile['bestWorkingTime'],
                      })
                    }
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-stone-200">{time.label}</div>
                      <div className="text-xs text-stone-400">{time.desc}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-400'
                          : 'border-stone-700 bg-stone-900'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 6 — PERSONAL RULES */}
        {currentStep === 6 && (
          <Card variant="default" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-left">
              <Badge variant="action">Step 6 • Behavioral Constraints</Badge>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                Commit to your initial Operating Rules
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Rules eliminate daily decision-making fatigue. Recommended defaults are enabled. You can toggle them to suit your needs.
              </p>
            </div>

            <div className="space-y-2.5 text-left">
              {RECOMMENDED_RULES.map((rule) => {
                const isEnabled = formData.enabledRuleCodes?.includes(rule.code);
                return (
                  <div
                    key={rule.code}
                    onClick={() => {
                      const list = formData.enabledRuleCodes || [];
                      const next = isEnabled
                        ? list.filter((c) => c !== rule.code)
                        : [...list, rule.code];
                      updateForm({ enabledRuleCodes: next });
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isEnabled
                        ? 'bg-stone-900/80 border-stone-700'
                        : 'bg-stone-950/40 border-stone-850 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {rule.code}
                        </span>
                        <span className="text-xs font-semibold text-stone-200">{rule.title}</span>
                      </div>
                      <p className="text-xs text-stone-400 leading-snug">{rule.desc}</p>
                    </div>

                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-1 ${
                        isEnabled ? 'bg-emerald-500' : 'bg-stone-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 7 — FIRST COMMITMENT & OPERATING PROFILE GENERATION */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <Card variant="default" className="p-6 sm:p-8 space-y-6">
              <div className="space-y-1 text-left">
                <Badge variant="action">Step 7 • First Concrete Commitment</Badge>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
                  What is the most important thing you need to move forward this week?
                </h2>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Avoid vague tasks like &ldquo;Study Computer Vision&rdquo;. We will immediately translate this into your first live work slot.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <Input
                  label="The Core Task / Goal"
                  placeholder="e.g. Computer Vision Assignment 2"
                  value={formData.firstCommitment?.goal || ''}
                  onChange={(e) =>
                    updateForm({
                      firstCommitment: {
                        ...formData.firstCommitment!,
                        goal: e.target.value,
                      },
                    })
                  }
                />

                <Input
                  label="The Exact First Physical Action"
                  placeholder="e.g. Open Tutorial 2 PDF and solve Question 1"
                  hint="Rule 01: The first action must be so concrete you can execute it in 15 seconds."
                  value={formData.firstCommitment?.firstPhysicalAction || ''}
                  onChange={(e) =>
                    updateForm({
                      firstCommitment: {
                        ...formData.firstCommitment!,
                        firstPhysicalAction: e.target.value,
                      },
                    })
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-300">Session Duration</label>
                    <div className="flex items-center gap-2">
                      {[25, 40, 50].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() =>
                            updateForm({
                              firstCommitment: {
                                ...formData.firstCommitment!,
                                targetDurationMinutes: dur,
                              },
                            })
                          }
                          className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                            formData.firstCommitment?.targetDurationMinutes === dur
                              ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                              : 'bg-stone-900 text-stone-400 border-stone-800'
                          }`}
                        >
                          {dur} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Deadline (Optional)"
                    type="date"
                    value={formData.firstCommitment?.deadline || ''}
                    onChange={(e) =>
                      updateForm({
                        firstCommitment: {
                          ...formData.firstCommitment!,
                          deadline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Generated START Operating Profile Preview */}
            <Card variant="elevated" className="p-6 border-emerald-500/40 surface-1 text-left space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                <BrainCircuit className="w-4 h-4" />
                <span>GENERATED START OPERATING PROFILE</span>
              </div>

              <div className="p-3.5 rounded-xl surface-0 border border-stone-800/40 space-y-2">
                <p className="text-xs text-stone-200 font-medium leading-relaxed">
                  &ldquo;{generateOperatingProfileSummary(formData).summaryStatement}&rdquo;
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {generateOperatingProfileSummary(formData).primaryBlockers.map((b, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-stone-400 block">
                  Active Defense Protocols
                </span>
                <ul className="space-y-1 text-xs text-stone-300">
                  {generateOperatingProfileSummary(formData).defenseProtocols.map((protocol, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{protocol}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-stone-500 font-mono">
                Note: This is not a psychological diagnosis. This is your baseline operational configuration.
              </p>
            </Card>
          </div>
        )}

        {/* Inline Error Message */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between pt-4 border-t border-stone-800/40">
        <Button
          variant="ghost"
          size="md"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleFinish}
            isLoading={isSubmitting}
            rightIcon={<Sparkles className="w-4 h-4" />}
          >
            Initialize Operating System
          </Button>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
