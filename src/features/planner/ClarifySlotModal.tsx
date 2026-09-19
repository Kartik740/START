import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { WorkSlot } from '../../types/models.ts';
import {
  validateConcreteOutput,
  validateFirstPhysicalAction,
} from './vagueTaskValidator.ts';
import { aiGenerateFirstPhysicalActions } from '../ai/aiWorkflows.ts';
import { dataService } from '../../services/dataService.ts';
import { sound } from '../../utils/sound.ts';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Target,
  ArrowRight,
} from 'lucide-react';

export interface ClarifySlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: WorkSlot | null;
  onStartReadySlot: (readySlot: WorkSlot) => void;
}

export const ClarifySlotModal: React.FC<ClarifySlotModalProps> = ({
  isOpen,
  onClose,
  slot,
  onStartReadySlot,
}) => {
  const [output, setOutput] = useState(slot?.desiredOutput || '');
  const [action, setAction] = useState(slot?.firstPhysicalAction || '');
  const [outputError, setOutputError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isGeneratingAiActions, setIsGeneratingAiActions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  if (!slot) return null;

  const handleGenerateAi = async () => {
    setIsGeneratingAiActions(true);
    try {
      const suggestions = await aiGenerateFirstPhysicalActions(
        slot.taskTitle,
        output || 'Tangible milestone'
      );
      setAiSuggestions(suggestions);
    } catch (err) {
      console.error('Failed to generate AI physical actions:', err);
    } finally {
      setIsGeneratingAiActions(false);
    }
  };

  const handleConfirmAndStart = async (e: React.FormEvent) => {
    e.preventDefault();

    const outputResult = validateConcreteOutput(output);
    if (!outputResult.isValid) {
      setOutputError(outputResult.reason || 'Please define a concrete visible output.');
      return;
    }

    const actionResult = validateFirstPhysicalAction(action);
    if (!actionResult.isValid) {
      setActionError(actionResult.reason || 'First physical action cannot be vague.');
      return;
    }

    setOutputError(null);
    setActionError(null);

    const updatedSlot: WorkSlot = {
      ...slot,
      desiredOutput: output.trim(),
      firstPhysicalAction: action.trim(),
      status: 'in_progress',
      preparedData: {
        ...(slot.preparedData || {
          durationMinutes: slot.estimatedDurationMinutes,
          likelyObstacle: 'Initial resistance',
          ifThenPlan: 'Take the first physical step immediately',
          phoneLocation: 'outside reach',
          plannedReward: 'Restorative break',
        }),
        workingOn: slot.taskTitle,
        desiredOutput: output.trim(),
        firstPhysicalAction: action.trim(),
      },
    };

    await dataService.saveSlot(updatedSlot);
    sound.playStartChime(true);
    onStartReadySlot(updatedSlot);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Define Tangible Output & First Action"
      description="START requires visible proof of completion and a 15-second physical action before starting work. Ambiguity triggers avoidance."
      maxWidth="lg"
    >
      <form onSubmit={handleConfirmAndStart} className="space-y-4 pt-1">
        {/* Slot context banner */}
        <div className="p-3 rounded-xl bg-stone-900 border border-stone-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-stone-400 block">
                Target Task
              </span>
              <p className="text-sm font-semibold text-stone-100 truncate">
                {slot.taskTitle}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 shrink-0">
            {slot.estimatedDurationMinutes}m
          </span>
        </div>

        {/* Behavioral Rule Enforcement Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>BEHAVIORAL INVARIANT (RULES 2 & 3)</span>
          </div>
          <p className="text-stone-300 text-xs leading-relaxed">
            The brain flees ambiguity. When an output or action is vague, your nervous system escapes into distraction. Define what exists when the timer rings.
          </p>
        </div>

        {/* Input 1: Concrete Output */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-stone-200">
            1. Desired Visible Output (Proof of Completion)
          </label>
          <Input
            placeholder="e.g. Complete 5 problems, Write 400 words, Implement API endpoint..."
            value={output}
            onChange={(e) => {
              setOutput(e.target.value);
              if (outputError) setOutputError(null);
            }}
            error={outputError || undefined}
            autoFocus
          />
          <span className="text-xs text-stone-400 font-mono block">
            What artifact, file, or solved question will exist when the timer rings?
          </span>
        </div>

        {/* Input 2: First Physical Action */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-stone-200">
              2. First Physical Action (First 15 Seconds)
            </label>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGeneratingAiActions}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isGeneratingAiActions ? 'Generating...' : 'AI Suggest 1st Action'}</span>
            </button>
          </div>
          <Input
            placeholder="e.g. Open Tutorial 3, Create the file, Write the heading..."
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              if (actionError) setActionError(null);
            }}
            error={actionError || undefined}
          />
          <span className="text-xs text-stone-400 font-mono block">
            Physical motion to perform in the first 15 seconds (mouse click, open file, write 1 line).
          </span>
        </div>

        {/* AI Action Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="p-3 rounded-xl bg-stone-900 border border-emerald-500/30 space-y-2 text-left">
            <span className="text-xs font-mono text-emerald-400 font-bold block">
              Suggested 15-Second Physical Starters:
            </span>
            <div className="space-y-1.5">
              {aiSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAction(sug);
                    setActionError(null);
                  }}
                  className={`w-full p-2 rounded-lg text-left text-xs border transition-all cursor-pointer flex items-center justify-between ${
                    action === sug
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/40'
                      : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                  }`}
                >
                  <span className="font-mono text-xs">{sug}</span>
                  {action === sug && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal-600 hover:bg-teal-500 font-bold"
          >
            Start Focus Session
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
