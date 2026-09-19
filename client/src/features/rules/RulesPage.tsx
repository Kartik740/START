import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { storage } from '../../lib/storage.ts';
import { dataService } from '../../services/dataService.ts';
import {
  getAugmentedRules,
} from './ruleEngine.ts';
import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  DailyReview,
} from '../../types/models.ts';
import {
  BookOpen,
  Check,
  SlidersHorizontal,
  Lightbulb,
  Shield,
  Activity,
  Star,
} from 'lucide-react';

export const RulesPage: React.FC = () => {
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [slots, setSlots] = useState<WorkSlot[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [distractions, setDistractions] = useState<DistractionUrge[]>([]);
  const [todayReview, setTodayReview] = useState<DailyReview | null>(null);

  // Load telemetry data for factual adherence
  const loadData = async () => {
    try {
      const [allSlots, allSessions, allDistractions, review] = await Promise.all([
        dataService.getAllSlots(),
        dataService.getSessions(),
        dataService.getDistractions(),
        dataService.getTodayReview(),
      ]);
      setSlots(allSlots);
      setSessions(allSessions);
      setDistractions(allDistractions);
      setTodayReview(review);
    } catch (err) {
      console.error('Failed to load rules telemetry:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const { rules, todaysRule } = getAugmentedRules(slots, sessions, distractions, todayReview);

  const handleToggleRule = (ruleNumber: number, currentEnabled: boolean) => {
    storage.setRuleEnabled(ruleNumber, !currentEnabled);
  };

  const handleSetTodaysRule = (ruleNumber: number) => {
    if (todaysRule?.ruleNumber === ruleNumber) {
      storage.setTodaysRule(null);
    } else {
      storage.setTodaysRule(ruleNumber);
    }
  };

  const filteredRules = tagFilter === 'all'
    ? rules
    : rules.filter((r) => r.contextTag === tagFilter);

  const tagVariants: Record<string, 'neutral' | 'action' | 'success' | 'warning' | 'recovery'> = {
    starting: 'action',
    planning: 'neutral',
    execution: 'success',
    environment: 'warning',
    recovery: 'recovery',
    night: 'neutral',
  };

  return (
    <PageContainer
      title="Anti-Procrastination Operating Manual"
      subtitle="The 10 non-negotiable behavioral mechanics of START. An engineering manual for interrupting the procrastination loop, not a motivational article."
      ruleHint="Personal operating system"
    >
      <div className="space-y-8">
        {/* TODAY'S RULE SPOTLIGHT CARD */}
        {todaysRule ? (
          <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/25 via-stone-900/90 to-stone-950 p-5 md:p-6 shadow-lg shadow-amber-950/10">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                  ★
                </span>
                <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase">
                  TODAY&apos;S OPERATING FOCUS — {todaysRule.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tagVariants[todaysRule.contextTag] || 'neutral'}>
                  {todaysRule.contextTag}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetTodaysRule(todaysRule.ruleNumber)}
                  className="text-xs font-mono text-stone-400 hover:text-stone-200 h-7"
                >
                  Change Focus
                </Button>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-stone-100 font-sans tracking-tight">
                  {todaysRule.name}
                </h3>
                <p className="text-sm font-medium text-amber-200/90 mt-1">
                  &ldquo;{todaysRule.principle}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800/40 space-y-1">
                  <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block font-semibold">
                    WHY START USES IT
                  </span>
                  <p className="text-stone-300 leading-relaxed">
                    {todaysRule.whyStartUsesIt}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800/40 space-y-1">
                  <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block font-semibold">
                    TODAY&apos;S FACTUAL OBSERVATION
                  </span>
                  <p className="text-stone-200 font-mono leading-relaxed">
                    {todaysRule.adherenceStatus?.label || 'Awaiting session telemetry today'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {todaysRule.adherenceStatus?.details}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border border-stone-800/40 bg-stone-900/30 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-stone-500" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
                    NO ACTIVE &ldquo;TODAY&apos;S RULE&rdquo; SET
                  </h4>
                  <p className="text-xs text-stone-400">
                    Choose one rule below to give it higher priority and contextual visibility today.
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono text-stone-500">
                Click &ldquo;Set as Today&apos;s Rule&rdquo; on any rule below
              </div>
            </div>
          </Card>
        )}

        {/* CONTROLS & TAG FILTERS */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-stone-800">
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
            <span className="text-stone-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            {[
              { id: 'all', label: 'All (10)' },
              { id: 'starting', label: 'Starting' },
              { id: 'planning', label: 'Planning' },
              { id: 'execution', label: 'Execution' },
              { id: 'environment', label: 'Environment' },
              { id: 'recovery', label: 'Recovery' },
              { id: 'night', label: 'Night' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTagFilter(tab.id)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  tagFilter === tab.id
                    ? 'bg-stone-800 text-emerald-400 font-semibold border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-stone-500">
            {rules.filter((r) => r.isEnabled).length} of 10 rules active
          </div>
        </div>

        {/* 10 OPERATING RULE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRules.map((rule) => {
            const isToday = rule.isTodayRule;

            return (
              <Card
                key={rule.ruleNumber}
                className={`border transition-all duration-200 ${
                  isToday
                    ? 'border-amber-500/50 bg-amber-950/15 ring-1 ring-amber-500/30'
                    : rule.isEnabled
                    ? 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                    : 'border-stone-800/40 bg-stone-950/40 opacity-60'
                }`}
              >
                <CardHeader className="pb-3 border-b border-stone-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {rule.code}
                      </span>
                      <Badge variant={tagVariants[rule.contextTag] || 'neutral'}>
                        {rule.contextTag}
                      </Badge>
                      {isToday && (
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                          ★ TODAY&apos;S RULE
                        </span>
                      )}
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRule(rule.ruleNumber, rule.isEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          rule.isEnabled ? 'bg-emerald-600' : 'bg-stone-800'
                        }`}
                        title={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            rule.isEnabled ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <CardTitle className="text-base text-stone-100 font-sans">
                      {rule.name}
                    </CardTitle>
                    <p className="text-xs font-medium text-stone-300 mt-0.5">
                      &ldquo;{rule.principle}&rdquo;
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Explanation */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 font-semibold">
                      <BookOpen className="w-3 h-3 text-emerald-400" />
                      <span>OPERATING MECHANICS</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed pl-4">
                      {rule.explanation}
                    </p>
                  </div>

                  {/* Why START uses it */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 font-semibold">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span>WHY START USES IT</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed pl-4">
                      {rule.whyStartUsesIt}
                    </p>
                  </div>

                  {/* Practical example */}
                  <div className="p-2.5 bg-stone-950/60 rounded border border-stone-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 font-semibold">
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                      <span>PRACTICAL EXECUTION EXAMPLE</span>
                    </div>
                    <p className="text-stone-300 pl-4 leading-relaxed font-sans">
                      {rule.practicalExample}
                    </p>
                  </div>

                  {/* Factual Today Adherence (Non-Guilt-Based) */}
                  <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-stone-400">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{rule.adherenceStatus?.label}</span>
                    </div>

                    <Button
                      variant={isToday ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() => handleSetTodaysRule(rule.ruleNumber)}
                      className={`text-xs font-mono h-7 px-2.5 ${
                        isToday
                          ? 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {isToday ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active Today</span>
                        </span>
                      ) : (
                        <span>Set as Today&apos;s Rule</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Operating Manual Philosophy Note */}
        <Card variant="subtle" className="p-4 border-stone-800">
          <div className="flex items-start gap-2.5 text-xs font-mono text-stone-400 leading-relaxed">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-stone-200 font-semibold block mb-0.5">
                OPERATING PRINCIPLE: MECHANICS OVER WILLPOWER
              </span>
              <span>
                START never relies on motivational enthusiasm. These 10 rules govern the architectural layout of the app: from mandatory concrete outputs and first physical actions to phone location validation and 10-minute rescue micro-starts.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
