import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/Dialog.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { dataService } from '../../../services/dataService.ts';
import { aiResolveOverwhelm, OverwhelmTriageResult } from '../aiWorkflows.ts';
import { useNavigate } from 'react-router-dom';
import { sessionStorageManager } from '../../sessions/sessionStorage.ts';
import { WorkSlot } from '../../../types/models.ts';
import { getTodayString } from '../../../utils/dates.ts';
import {
  LifeBuoy,
  Play,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface OverwhelmRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDistress?: string;
}

export const OverwhelmRescueModal: React.FC<OverwhelmRescueModalProps> = ({
  isOpen,
  onClose,
  initialDistress = 'I have too much work and I feel overwhelmed.',
}) => {
  const navigate = useNavigate();
  const [distressInput, setDistressInput] = useState(initialDistress);
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<OverwhelmTriageResult | null>(null);

  // User edited commitments
  const [outcome, setOutcome] = useState('');
  const [action, setAction] = useState('');
  const [duration, setDuration] = useState(10);

  // Run triage
  const handleTriage = async (customInput?: string) => {
    setIsLoading(true);
    try {
      const [assignments, slots] = await Promise.all([
        dataService.getAssignments(),
        dataService.getSlots(),
      ]);

      const result = await aiResolveOverwhelm({
        userInput: customInput || distressInput,
        activeAssignments: assignments
          .filter((a) => a.status === 'in_progress' || a.status === 'not_started')
          .map((a) => ({ title: a.title, deadline: a.deadline })),
        currentSlots: slots.map((s) => ({ title: s.taskTitle })),
      });

      setTriageResult(result);
      setOutcome(result.mostImportantOutcome);
      setAction(result.smallestUsefulAction);
      setDuration(result.suggestedDurationMinutes || 10);
    } catch (err) {
      console.error('Overwhelm triage failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleTriage(distressInput);
    } else {
      setTriageResult(null);
    }
  }, [isOpen]);

  // One-click start 10-minute micro rescue
  const handleLaunchMicroSession = async () => {
    const today = getTodayString();
    const rescueSlot: WorkSlot = {
      id: crypto.randomUUID(),
      date: today,
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date(Date.now() + duration * 60000).toTimeString().slice(0, 5),
      taskTitle: outcome || 'Overwhelm Rescue Micro-Start',
      desiredOutput: outcome || '10-minute focused progress delivered',
      firstPhysicalAction: action || 'Open file and type the first line',
      estimatedDurationMinutes: duration,
      status: 'in_progress',
      isTopPriority: 1,
    };

    await dataService.saveSlot(rescueSlot);

    // Initialize active session
    sessionStorageManager.startSession(rescueSlot, duration, true);

    onClose();
    navigate('/session');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <LifeBuoy className="w-5 h-5 text-amber-400" />
          <span>Overwhelm Reduction Protocol</span>
        </div>
      }
      description="Overwhelm is working memory attempting to execute five tasks at once. We reduce the cloud to three atomic questions."
    >
      <div className="space-y-6 text-left">
        {/* User Input Expression */}
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 font-semibold">
              Current Friction State:
            </span>
            <span className="text-xs text-stone-500 font-mono">Input</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={distressInput}
              onChange={(e) => setDistressInput(e.target.value)}
              placeholder="e.g. I have too much work and don't know where to begin"
              className="text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTriage()}
              disabled={isLoading}
              className="shrink-0 text-xs font-mono"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Reduce'}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs font-mono text-stone-400">
              Collapsing task ambiguity with START reasoning...
            </p>
          </div>
        )}

        {/* THREE MANDATORY OVERWHELM QUESTIONS */}
        {!isLoading && triageResult && (
          <div className="space-y-4">
            {/* Calming Insight Callout */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed font-mono">
                {triageResult.calmingInsight}
              </p>
            </div>

            {/* QUESTION 1: WHAT IS THE MOST IMPORTANT OUTCOME? */}
            <div className="p-4 rounded-xl surface-1 border border-stone-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                  1
                </span>
                <label className="text-xs font-medium text-emerald-300 font-bold">
                  What is the most important outcome?
                </label>
              </div>
              <p className="text-xs text-stone-400">
                You cannot finish five projects right now. Name the single deliverable that matters most today.
              </p>
              <Input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="text-xs font-medium"
              />
            </div>

            {/* QUESTION 2: WHAT IS THE SMALLEST USEFUL ACTION? */}
            <div className="p-4 rounded-xl surface-1 border border-stone-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                  2
                </span>
                <label className="text-xs font-medium text-emerald-300 font-bold">
                  What is the smallest useful action?
                </label>
              </div>
              <p className="text-xs text-stone-400">
                Name the physical bodily movement taking less than 15 seconds to begin.
              </p>
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="text-xs font-medium"
              />
            </div>

            {/* QUESTION 3: WHEN WILL YOU START? */}
            <div className="p-4 rounded-xl surface-1 border border-stone-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                  3
                </span>
                <label className="text-xs font-medium text-amber-300 font-bold">
                  When will you start?
                </label>
              </div>
              <p className="text-xs text-stone-400">
                Commit to a low-stakes micro-session right now. 10 minutes bypasses resistance.
              </p>

              <div className="flex items-center gap-2">
                {[10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      duration === mins
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {mins} minutes
                  </button>
                ))}
                <span className="text-xs text-stone-500 font-mono ml-2">
                  (Micro-commitment)
                </span>
              </div>
            </div>

            {/* Launch Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleLaunchMicroSession}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs font-mono shadow-lg shadow-emerald-950/40"
                leftIcon={<Play className="w-4 h-4" />}
              >
                START {duration}-MINUTE RESCUE NOW →
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
