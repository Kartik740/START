import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '../../components/layout/PageContainer.tsx';
import { dataService } from '../../services/dataService.ts';
import { storage } from '../../lib/storage.ts';
import {
  WorkSlot,
  WorkSession,
  DistractionUrge,
  Assignment,
  DailyReview,
} from '../../types/models.ts';
import {
  calculateWeeklyMetrics,
  identifyBehavioralPatterns,
  buildWeeklyReflection,
  calculateMonthlyAnalytics,
  filterDataByDateRange,
} from './analyticsEngine.ts';
import { generateSampleAnalyticsData } from './sampleAnalyticsData.ts';
import { WeeklyView } from './components/WeeklyView.tsx';
import { MonthlyView } from './components/MonthlyView.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import {
  Calendar,
  Sparkles,
  RefreshCw,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { subDays, format } from 'date-fns';

type AnalyticsTab = 'weekly' | 'monthly';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('weekly');
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Live storage data
  const [slots, setSlots] = useState<WorkSlot[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [distractions, setDistractions] = useState<DistractionUrge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);

  // Week offset (0 = current 7 days, 1 = previous 7 days, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Load live data from dataService
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allSlots, allSessions, allDistractions, allAssignments, allReviews] =
        await Promise.all([
          dataService.getAllSlots(),
          dataService.getSessions(),
          dataService.getDistractions(),
          dataService.getAssignments(),
          dataService.getDailyReviews(),
        ]);
      setSlots(allSlots);
      setSessions(allSessions);
      setDistractions(allDistractions);
      setAssignments(allAssignments);
      setReviews(allReviews);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  // Compute active data set (Live vs Sample Telemetry)
  const sampleData = useMemo(() => generateSampleAnalyticsData(), []);

  const activeSlots = useSampleData ? sampleData.slots : slots;
  const activeSessions = useSampleData ? sampleData.sessions : sessions;
  const activeDistractions = useSampleData ? sampleData.distractions : distractions;
  const activeAssignments = useSampleData ? sampleData.assignments : assignments;
  const activeReviews = useSampleData ? sampleData.reviews : reviews;

  // Date range for Weekly View
  const today = new Date();
  const weekEndDate = subDays(today, weekOffset * 7);
  const weekStartDate = subDays(weekEndDate, 6);

  // Filter for weekly view
  const {
    filteredSlots: weekSlots,
    filteredSessions: weekSessions,
    filteredDistractions: weekDistractions,
  } = useMemo(
    () =>
      filterDataByDateRange(
        activeSlots,
        activeSessions,
        activeDistractions,
        weekStartDate,
        weekEndDate
      ),
    [activeSlots, activeSessions, activeDistractions, weekStartDate, weekEndDate]
  );

  // Weekly Calculations
  const weeklyMetrics = useMemo(
    () =>
      calculateWeeklyMetrics(
        weekSlots,
        weekSessions,
        weekDistractions,
        activeAssignments
      ),
    [weekSlots, weekSessions, weekDistractions, activeAssignments]
  );

  const patternAnalysis = useMemo(
    () => identifyBehavioralPatterns(weekSlots, weekSessions, weekDistractions),
    [weekSlots, weekSessions, weekDistractions]
  );

  const weeklyReflection = useMemo(
    () =>
      buildWeeklyReflection(
        weeklyMetrics,
        patternAnalysis.patterns,
        activeReviews
      ),
    [weeklyMetrics, patternAnalysis.patterns, activeReviews]
  );

  // Monthly Calculations
  const monthlyMetrics = useMemo(
    () =>
      calculateMonthlyAnalytics(
        activeSlots,
        activeSessions,
        activeDistractions,
        activeAssignments,
        today
      ),
    [activeSlots, activeSessions, activeDistractions, activeAssignments]
  );

  return (
    <PageContainer
      title="Behavioral Patterns & Evidence"
      subtitle="Data-driven insight into your procrastination system. Track starting friction, delay triggers, and recovery velocity."
      ruleHint="Rule 08: Measure output, not hours"
    >
      <div className="space-y-6">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-800/40">
          {/* View Mode Toggle: Weekly vs Monthly */}
          <div className="inline-flex items-center p-1 bg-stone-900 border border-stone-800/40 rounded-lg">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>WEEKLY ANALYSIS</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>MONTHLY TRENDS</span>
            </button>
          </div>

          {/* Right Controls: Date Range & Sample Data Sandbox Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'weekly' && (
              <div className="flex items-center gap-1.5 bg-stone-900/60 border border-stone-800/40 rounded-lg p-1 text-xs font-mono text-stone-300">
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="px-2 py-1 hover:bg-stone-800 rounded text-stone-400 hover:text-stone-200"
                  title="Previous week"
                >
                  ←
                </button>
                <span className="px-2">
                  {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d')}
                  {weekOffset === 0 && (
                    <span className="text-emerald-400 ml-1 font-semibold">(Current)</span>
                  )}
                </span>
                <button
                  onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                  className="px-2 py-1 hover:bg-stone-800 rounded text-stone-400 hover:text-stone-200 disabled:opacity-30"
                  title="Next week"
                >
                  →
                </button>
              </div>
            )}

            {/* Sample Data Toggle for inspection */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseSampleData(!useSampleData)}
              className={`text-xs font-mono ${
                useSampleData
                  ? 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20'
                  : 'border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              {useSampleData ? 'Previewing Sample Telemetry' : 'Demo 4-Week Telemetry'}
            </Button>

            {useSampleData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseSampleData(false)}
                className="text-xs text-stone-500 hover:text-stone-300"
                title="Return to real database"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Live Data
              </Button>
            )}
          </div>
        </div>

        {/* Informational Banner when Sample Telemetry is active */}
        {useSampleData && (
          <div className="p-3 bg-emerald-950/30 border border-sky-800/40 rounded-lg text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="action" size="sm">SANDBOX PREVIEW</Badge>
              <span>
                Displaying 4 weeks of realistic behavioral telemetry (delay patterns, morning vs afternoon completion, phone urges, and 10-minute micro-start recoveries).
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUseSampleData(false)}
              className="text-xs text-emerald-400 hover:text-emerald-300 h-6 px-2"
            >
              Back to Live Data
            </Button>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs font-mono text-stone-400">Loading behavioral records...</p>
          </div>
        ) : activeTab === 'weekly' ? (
          <WeeklyView
            metrics={weeklyMetrics}
            patterns={patternAnalysis.patterns}
            reflection={weeklyReflection}
            hasEnoughData={patternAnalysis.hasEnoughData}
            totalSessionCount={patternAnalysis.totalSessionCount}
            sessionsNeeded={patternAnalysis.sessionsNeeded}
            onLoadSampleData={() => setUseSampleData(true)}
            isSampleActive={useSampleData}
            sessions={weekSessions}
          />
        ) : (
          <MonthlyView monthly={monthlyMetrics} />
        )}
      </div>
    </PageContainer>
  );
};
