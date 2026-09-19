import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../../components/ui/Dialog.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { Badge } from '../../../components/ui/Badge.tsx';
import {
  aiDecomposeAssignment,
  aiGenerateFirstPhysicalActions,
  aiGenerateObstaclePlan,
  DecomposedMilestone,
  IfThenPlanResult,
} from '../aiWorkflows.ts';
import { isGeminiConfigured } from '../geminiService.ts';
import { dataService } from '../../../services/dataService.ts';
import { sessionStorageManager } from '../../sessions/sessionStorage.ts';
import { getTodayString, formatTime, addMinutes } from '../../../utils/dates.ts';
import { sound } from '../../../utils/sound.ts';
import { WorkSlot } from '../../../types/models.ts';
import {
  Sparkles,
  Target,
  Play,
  ShieldAlert,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface AiCoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOverwhelm?: () => void;
}

type AiToolMode = 'first_action' | 'decompose' | 'obstacle';

export const AiCoachDrawer: React.FC<AiCoachDrawerProps> = ({
  isOpen,
  onClose,
  onOpenOverwhelm,
}) => {
  const navigate = useNavigate();
  const [toolMode, setToolMode] = useState<AiToolMode>('first_action');
  const [taskInput, setTaskInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Results
  const [actionsResult, setActionsResult] = useState<string[]>([]);
  const [milestonesResult, setMilestonesResult] = useState<DecomposedMilestone[]>([]);
  const [ifThenResult, setIfThenResult] = useState<IfThenPlanResult | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleStartActionNow = async (actionText: string) => {
    const now = new Date();
    const newSlot: WorkSlot = {
      id: crypto.randomUUID(),
      date: getTodayString(),
      startTime: formatTime(now),
      endTime: formatTime(addMinutes(now, 15)),
      taskTitle: taskInput.trim() || 'AI Guided Action Sprint',
      desiredOutput: '1 measurable deliverable completed',
      firstPhysicalAction: actionText,
      estimatedDurationMinutes: 15,
      status: 'in_progress',
      isTopPriority: 1,
    };
    await dataService.saveSlot(newSlot);
    sound.playStartChime(true);
    sessionStorageManager.startSession(newSlot);
    onClose();
    navigate('/session');
  };

  const handleStartMilestoneNow = async (milestone: DecomposedMilestone) => {
    const now = new Date();
    const newSlot: WorkSlot = {
      id: crypto.randomUUID(),
      date: getTodayString(),
      startTime: formatTime(now),
      endTime: formatTime(addMinutes(now, 25)),
      taskTitle: milestone.title,
      desiredOutput: milestone.intendedOutput,
      firstPhysicalAction: milestone.nextAction,
      estimatedDurationMinutes: 25,
      status: 'in_progress',
      isTopPriority: 1,
    };
    await dataService.saveSlot(newSlot);
    sound.playStartChime(true);
    sessionStorageManager.startSession(newSlot);
    onClose();
    navigate('/session');
  };

  const handleRunTool = async () => {
    if (!taskInput.trim()) return;
    setIsLoading(true);

    try {
      if (toolMode === 'first_action') {
        const res = await aiGenerateFirstPhysicalActions(taskInput, secondaryInput);
        setActionsResult(res);
      } else if (toolMode === 'decompose') {
        const res = await aiDecomposeAssignment({
          title: taskInput,
          description: secondaryInput,
        });
        setMilestonesResult(res);
      } else if (toolMode === 'obstacle') {
        const res = await aiGenerateObstaclePlan(taskInput, secondaryInput || 'Resistance to starting');
        setIfThenResult(res);
      }
    } catch (err) {
      console.error('AI tool execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-stone-100">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>AI Executive Reasoning Assistant</span>
          </div>
          <Badge variant={isGeminiConfigured() ? 'action' : 'neutral'} size="sm">
            {isGeminiConfigured() ? 'Gemini 2.5 Active' : 'Offline Reasoning'}
          </Badge>
        </div>
      }
      description="Grounded executive-function reasoning to eliminate ambiguity and startup resistance. Not a conversational chatbot."
    >
      <div className="space-y-6 text-left">
        {/* Tool Mode Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-stone-950 rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => { setToolMode('first_action'); setActionsResult([]); }}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 ${
              toolMode === 'first_action'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>1st Action</span>
          </button>
          <button
            type="button"
            onClick={() => { setToolMode('decompose'); setMilestonesResult([]); }}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 ${
              toolMode === 'decompose'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Decompose</span>
          </button>
          <button
            type="button"
            onClick={() => { setToolMode('obstacle'); setIfThenResult(null); }}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 ${
              toolMode === 'obstacle'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>If-Then Plan</span>
          </button>
        </div>

        {/* Input Form */}
        <div className="p-4 bg-stone-900/80 rounded-xl border border-stone-800/40 space-y-3">
          <Input
            label={
              toolMode === 'first_action'
                ? 'What task are you trying to start?'
                : toolMode === 'decompose'
                ? 'What assignment or large project needs breakdown?'
                : 'What task is encountering resistance?'
            }
            placeholder={
              toolMode === 'first_action'
                ? 'e.g. Write Chapter 2 of Ethics Paper'
                : toolMode === 'decompose'
                ? 'e.g. Build 3D Reconstruction Computer Vision Pipeline'
                : 'e.g. Study Linear Algebra eigenvalues'
            }
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            autoFocus
          />

          <Input
            label={
              toolMode === 'first_action'
                ? 'Target Concrete Output (Optional):'
                : toolMode === 'decompose'
                ? 'Brief context or constraints (Optional):'
                : 'What is the most likely obstacle or delay trigger?'
            }
            placeholder={
              toolMode === 'first_action'
                ? 'e.g. 400 words written'
                : toolMode === 'decompose'
                ? 'e.g. Due in 10 days, Python, 24 hours estimated'
                : 'e.g. I get stuck on proofs and pick up my phone'
            }
            value={secondaryInput}
            onChange={(e) => setSecondaryInput(e.target.value)}
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-mono text-stone-500">
              Generates concrete, physical behavioral artifacts.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunTool}
              disabled={isLoading || !taskInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 font-mono text-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Reasoning...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Execute Reasoning
                </>
              )}
            </Button>
          </div>
        </div>

        {/* OUTPUT 1: FIRST ACTION OPTIONS */}
        {toolMode === 'first_action' && actionsResult.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-medium text-slate-300 font-semibold block">
              3 Concrete Physical Starting Actions (&lt;15s bodily movements):
            </span>
            <div className="space-y-2">
              {actionsResult.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111318] rounded-xl border border-white/[0.06] flex items-center justify-between gap-3 text-xs text-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-emerald-400 font-mono font-bold shrink-0">#{idx + 1}</span>
                    <span className="font-sans truncate">{act}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(act)}
                      className="text-xs font-mono text-slate-400 h-7 px-2"
                    >
                      {copiedText === act ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartActionNow(act)}
                      className="text-xs font-mono h-7 px-2.5 font-semibold"
                    >
                      <Play className="w-3 h-3 fill-current mr-1" /> Start Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTPUT 2: DECOMPOSED MILESTONES */}
        {toolMode === 'decompose' && milestonesResult.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-medium text-slate-300 font-semibold block">
              Sequential Milestone Breakdown:
            </span>
            <div className="space-y-2">
              {milestonesResult.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111318] rounded-xl border border-white/[0.06] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{m.title}</span>
                    <Badge variant="neutral" size="sm">{m.estimatedHours}h</Badge>
                  </div>
                  <p className="text-xs text-emerald-400 font-mono">
                    Artifact: {m.intendedOutput}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-slate-400 truncate max-w-sm">
                      1st Action: {m.nextAction}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartMilestoneNow(m)}
                      className="text-xs font-mono h-6 px-2 font-semibold shrink-0"
                    >
                      <Play className="w-2.5 h-2.5 fill-current mr-1" /> Start Milestone
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTPUT 3: IF-THEN CONTINGENCY PLAN */}
        {toolMode === 'obstacle' && ifThenResult && (
          <div className="p-4 bg-stone-950 rounded-xl border border-emerald-500/30 space-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-xs font-medium text-emerald-400 font-bold block">
                PETER GOLLWITZER IMPLEMENTATION INTENTION
              </span>
              <p className="text-sm font-semibold text-stone-100 font-sans leading-snug">
                &ldquo;{ifThenResult.fullStatement}&rdquo;
              </p>
            </div>
            <p className="text-stone-400 text-xs border-t border-stone-800 pt-2">
              {ifThenResult.explanation}
            </p>
          </div>
        )}

        {/* Quick link to Overwhelm Mode */}
        {onOpenOverwhelm && (
          <div className="pt-2 border-t border-stone-800/40 flex items-center justify-between text-xs">
            <span className="text-stone-400">Feeling completely paralyzed by too much work?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenOverwhelm();
              }}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-mono"
            >
              Launch Overwhelm Rescue →
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
};
