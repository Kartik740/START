import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { dataService } from '../../services/dataService.ts';
import { storage } from '../../lib/storage.ts';
import { getTodayString } from '../../utils/dates.ts';
import { DailyReview, WorkSlot, WorkSession, DistractionUrge } from '../../types/models.ts';
import { NightReviewWizard } from './NightReviewWizard.tsx';
import { calculateDailyFactualSummary } from './reviewAnalytics.ts';
import {
  MoonStar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  RotateCcw,
  Activity,
  Lightbulb,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReviewPage: React.FC = () => {
  const today = getTodayString();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [todayReview, setTodayReview] = useState<DailyReview | null>(null);
  const [allReviews, setAllReviews] = useState<DailyReview[]>([]);
  const [todaySlots, setTodaySlots] = useState<WorkSlot[]>([]);
  const [todaySessions, setTodaySessions] = useState<WorkSession[]>([]);
  const [todayDistractions, setTodayDistractions] = useState<DistractionUrge[]>([]);

  const loadReviewState = async () => {
    try {
      const [review, reviewsList, slots, sessions, distractions] = await Promise.all([
        dataService.getDailyReview(today),
        dataService.getDailyReviews(),
        dataService.getSlots(today),
        dataService.getSessions(),
        dataService.getDistractions(),
      ]);

      setTodayReview(review);
      setAllReviews(reviewsList);
      setTodaySlots(slots);
      setTodaySessions(sessions);
      setTodayDistractions(distractions);
    } catch (err) {
      console.error('Failed to load review page data:', err);
    }
  };

  useEffect(() => {
    loadReviewState();
    return storage.subscribe(() => {
      loadReviewState();
    });
  }, [today]);

  const factualSummary = calculateDailyFactualSummary(
    todaySlots,
    todaySessions,
    todayDistractions,
    today
  );

  return (
    <PageContainer
      title="Night Review & Tomorrow Setup"
      subtitle="The purpose is not journaling. The purpose is turning today's empirical data into a better plan for tomorrow."
      ruleHint="Rule 10: Tomorrow is planned at night"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<MoonStar className="w-4 h-4" />}
            onClick={() => setIsWizardOpen(true)}
            className="bg-teal-600 hover:bg-teal-500 text-stone-100 font-bold"
          >
            {todayReview ? 'Update Evening Review' : 'Begin Evening Review'}
          </Button>
          <Link to="/planner">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Planner
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 text-left">
        {/* TOP FACTUAL SUMMARY STRIP (No single score) */}
        <div className="p-4 rounded-xl bg-[#12151c] border border-white/[0.065] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Today&apos;s Velocity & Telemetry
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">{today}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Planned</span>
              <span className="font-mono font-bold text-white text-base">
                {factualSummary.plannedSessions}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Started</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                {factualSummary.startedSessions}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Completed</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                {factualSummary.completedSessions}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Focus Time</span>
              <span className="font-mono font-bold text-emerald-300 text-base">
                {factualSummary.focusTimeMinutes}m
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Delayed Starts</span>
              <span className="font-mono font-bold text-amber-400 text-base">
                {factualSummary.delayedStarts}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Distractions</span>
              <span className="font-mono font-bold text-amber-300 text-base">
                {factualSummary.distractionEvents}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[11px] font-mono text-slate-500 block">Tasks Done</span>
              <span className="font-mono font-bold text-emerald-300 text-base">
                {factualSummary.tasksCompleted}
              </span>
            </div>
          </div>
        </div>

        {/* REVIEW STATUS CARD */}
        {todayReview ? (
          <div className="space-y-6">
            {/* SUBMITTED REVIEW OVERVIEW */}
            <Card variant="active" className="border-teal-500/50 surface-1 shadow-2xl">
              <CardHeader className="border-b border-stone-800/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>NIGHT REVIEW LOCKED IN FOR TODAY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWizardOpen(true)}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Re-run Night Review
                    </Button>
                    <Link to="/planner">
                      <Button variant="primary" size="sm" className="bg-teal-600 hover:bg-teal-500 text-stone-100 font-bold">
                        View Tomorrow in Planner →
                      </Button>
                    </Link>
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl text-stone-100 mt-2 font-bold">
                  Tomorrow's Operational Blueprint
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* FINAL FOCAL POINT: TOMORROW STARTS WITH */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 via-stone-950 to-teal-950/80 border-2 border-teal-500/80 space-y-2 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-medium text-teal-400 font-extrabold">
                    <Zap className="w-4 h-4 text-teal-400" />
                    <span>TOMORROW STARTS WITH</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-mono font-black text-stone-100 leading-snug">
                    &ldquo;{todayReview.tomorrowStartsWith}&rdquo;
                  </p>
                  <p className="text-xs text-stone-400">
                    Anchor Target:{' '}
                    <strong className="text-emerald-300">
                      {todayReview.tomorrowTop1?.desiredOutput || 'First deliverable'}
                    </strong>
                  </p>
                </div>

                {/* Empirical Reflection */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase text-teal-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Data-Based Reflection</span>
                  </div>
                  <p className="text-sm text-stone-200 font-medium leading-relaxed">
                    &ldquo;{todayReview.dataBasedReflection}&rdquo;
                  </p>
                </div>

                {/* Tomorrow Timeline */}
                {todayReview.tomorrowInitialTimeline && todayReview.tomorrowInitialTimeline.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-stone-400 block">
                      Tomorrow's Scheduled Timeline
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {todayReview.tomorrowInitialTimeline.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 ${
                            item.isBreak
                              ? 'bg-stone-950/40 border-dashed border-stone-800 text-stone-500'
                              : 'bg-stone-950 border-stone-800 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-teal-400">{item.time}</span>
                            <span className="text-stone-600">—</span>
                            <span className={item.isBreak ? 'italic text-stone-500' : 'font-semibold'}>
                              {item.title}
                            </span>
                          </div>
                          {item.output && (
                            <span className="text-emerald-400 text-xs truncate max-w-sm">
                              Output: {item.output}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Behavioral Experiment */}
                {todayReview.tomorrowBehavioralExperiment && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center gap-2.5 text-amber-200">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-mono font-bold uppercase block text-xs text-amber-400">
                        Tomorrow's One Experiment:
                      </span>
                      <span className="font-medium">
                        &ldquo;{todayReview.tomorrowBehavioralExperiment}&rdquo;
                      </span>
                    </div>
                  </div>
                )}

                {/* Today's Actual Deliverables */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <span className="text-xs font-medium text-stone-400 block">
                    Actual Tangible Deliverables Produced Today
                  </span>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/40 text-xs text-stone-200 whitespace-pre-line font-mono">
                    {todayReview.accomplishedSummary || 'No specific output recorded.'}
                  </div>
                </div>

                {/* Procrastination Triggers & Catalysts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-2">
                    <span className="text-xs font-mono uppercase text-stone-500 font-bold block">
                      Delay Triggers Experienced
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {todayReview.procrastinationReasons && todayReview.procrastinationReasons.length > 0 ? (
                        todayReview.procrastinationReasons.map((r, i) => (
                          <Badge key={i} variant="warning">
                            {r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-stone-500 italic">None reported</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 space-y-2">
                    <span className="text-xs font-mono uppercase text-stone-500 font-bold block">
                      What Helped Start Today
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {todayReview.whatHelpedStart && todayReview.whatHelpedStart.length > 0 ? (
                        todayReview.whatHelpedStart.map((w, i) => (
                          <Badge key={i} variant="success">
                            {w}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-stone-500 italic">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-6 sm:p-10 rounded-xl bg-[#12151c] border border-white/[0.065]">
            <EmptyState
              icon={<MoonStar className="w-6 h-6 text-emerald-400" />}
              title="Night Review is ready to begin."
              description="The purpose of the evening review is turning today's behavioral tallies into tomorrow's Top 3 priorities, concrete outputs, and the single 15-second starter action for tomorrow morning."
              action={
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => setIsWizardOpen(true)}
                  className="px-8"
                >
                  Begin Guided Night Review
                </Button>
              }
              secondaryNote="Rule 10: Tomorrow is planned at night, not negotiated in the morning."
            />
          </div>
        )}

        {/* 8-STEP PROTOCOL OVERVIEW */}
        <div className="p-5 rounded-xl bg-[#12151c] border border-white/[0.065] space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Evening Review Architecture</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-slate-400">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">01. Actual Output</span>
              Tangible artifacts created today.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">02. Procrastination</span>
              Friction triggers and delay causes.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">03. What Helped</span>
              Starting catalysts that worked.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">04. Reflection</span>
              Empirical data-based synthesis.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">05. Top 3 Priorities</span>
              Anchor, Secondary, and Buffer tasks.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">06. Action Conversion</span>
              Outputs, first actions, and If-Thens.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">07. One Experiment</span>
              Single behavioral alteration.
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="font-mono text-emerald-400 font-semibold block mb-1 text-[11px]">08. Tomorrow Starts</span>
              Locked starting action & timeline.
            </div>
          </div>
        </div>

        {/* REVIEW HISTORY */}
        {allReviews.length > 0 && (
          <div className="space-y-3 pt-4">
            <span className="text-xs font-medium text-stone-400 block">
              Review History ({allReviews.length} recorded)
            </span>
            <div className="space-y-2">
              {allReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-stone-200">{rev.date}</span>
                      <span className="text-stone-600">•</span>
                      <span className="text-teal-400">
                        Top 1: {rev.tomorrowTop1?.title || 'Anchor Priority'}
                      </span>
                    </div>
                    <p className="text-stone-400 text-xs truncate max-w-lg">
                      {rev.dataBasedReflection || rev.accomplishedSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-stone-500 font-mono text-xs">
                    <span className="text-emerald-400 font-semibold">
                      {rev.factualSummary?.completedSessions ?? rev.completedSlotsCount ?? 0} slots
                    </span>
                    <span>•</span>
                    <span className="text-teal-300">
                      {rev.factualSummary?.focusTimeMinutes ?? 0}m focus
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NIGHT REVIEW WIZARD MODAL */}
        <NightReviewWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onReviewSaved={(savedReview) => {
            setTodayReview(savedReview);
            loadReviewState();
          }}
        />
      </div>
    </PageContainer>
  );
};
