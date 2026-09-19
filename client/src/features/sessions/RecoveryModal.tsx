import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { WorkSlot } from '../../types/models.ts';
import { validateFirstPhysicalAction } from '../planner/vagueTaskValidator.ts';
import {
  LifeBuoy,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: WorkSlot;
  onStartRecovery: (slot: WorkSlot, rescueAction: string) => void;
}

const QUICK_RESCUE_PROMPTS = [
  'Open the document and write 3 bullet points',
  'Read the first 2 pages and highlight key terms',
  'Write the first 100 words without editing',
  'Solve 1 single problem or write 1 function',
  'Clean workspace and open target app',
];

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  slot,
  onStartRecovery,
}) => {
  const [rescueAction, setRescueAction] = useState(
    slot.firstPhysicalAction || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleActionChange = (val: string) => {
    setRescueAction(val);
    if (error) {
      const res = validateFirstPhysicalAction(val);
      if (res.isValid) {
        setError(null);
        setSuggestion(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateFirstPhysicalAction(rescueAction);
    if (!validation.isValid) {
      setError(validation.reason || 'Please provide a concrete physical action.');
      setSuggestion(validation.suggestion || null);
      return;
    }

    onStartRecovery(slot, rescueAction.trim());
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <LifeBuoy className="w-5 h-5 text-amber-400" />
          <span>10-Minute Rescue Protocol</span>
        </div>
      }
      description="Zero guilt. Overcoming inertia is the only battle that matters today."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Anti-shaming banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Don't wait for another day. START 10-MINUTE RECOVERY.</span>
          </div>
          <p className="text-stone-300 text-xs leading-relaxed">
            Missed slots are not moral failures. They are friction signals. Ten focused minutes restores your identity as someone who moves forward under any condition.
          </p>
        </div>

        {/* Target summary */}
        <div className="p-3.5 rounded-xl surface-0 border border-stone-800/40 text-xs">
          <span className="text-stone-500 uppercase font-mono text-xs block">
            Original Slot Target
          </span>
          <span className="font-semibold text-stone-200">{slot.taskTitle}</span>
        </div>

        {/* Rescue prompt */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase text-stone-300 font-bold">
            What is the smallest useful action you can complete in 10 minutes?
          </label>
          <Input
            placeholder="e.g. Open problem 1 on page 20 and write formula"
            value={rescueAction}
            onChange={(e) => handleActionChange(e.target.value)}
            autoFocus
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
              {suggestion && (
                <p className="text-xs text-rose-200/80 pl-5">{suggestion}</p>
              )}
            </div>
          )}
        </div>

        {/* Micro prompts */}
        <div className="space-y-1.5">
          <span className="text-xs font-mono uppercase text-stone-500">
            Quick Micro-Starts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RESCUE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRescueAction(p);
                  setError(null);
                  setSuggestion(null);
                }}
                className="text-xs px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-800/40 text-stone-300 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* High-value badge info */}
        <div className="flex items-center gap-2 text-emerald-400/90 text-xs bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Rescue sessions count as high-value neuroplastic momentum victories.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Start 10-Minute Recovery
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
