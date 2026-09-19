import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { DistractionUrge } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { sessionStorageManager } from './sessionStorage.ts';
import {
  ShieldAlert,
  CheckCircle2,
  Smartphone,
  Share2,
  MessageSquare,
  Video,
  ListTodo,
  AlertCircle,
  HelpCircle,
  Frown,
  MoreHorizontal,
} from 'lucide-react';

import { getContextualRuleReminder } from '../rules/ruleEngine.ts';
import { ContextualRuleBanner } from '../../components/ui/ContextualRuleBanner.tsx';

export interface DistractionCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  onCaptured?: (urge: DistractionUrge) => void;
}

const DISTRACTION_CATEGORIES = [
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'social media', label: 'Social Media', icon: Share2 },
  { id: 'message', label: 'Message', icon: MessageSquare },
  { id: 'YouTube', label: 'YouTube', icon: Video },
  { id: 'unrelated task', label: 'Unrelated Task', icon: ListTodo },
  { id: 'difficult part of task', label: 'Difficult Part of Task', icon: AlertCircle },
  { id: 'boredom', label: 'Boredom', icon: Frown },
  { id: 'uncertainty', label: 'Uncertainty', icon: HelpCircle },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

export const DistractionCaptureModal: React.FC<DistractionCaptureModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onCaptured,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('phone');
  const [note, setNote] = useState('');
  const [isCaptured, setIsCaptured] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const urgeText = note.trim()
      ? `[${selectedCategory}] ${note.trim()}`
      : `[${selectedCategory}] Impulse noticed`;

    const savedUrge = await dataService.captureDistraction(urgeText, sessionId);
    sessionStorageManager.addDistraction(savedUrge);

    if (onCaptured) {
      onCaptured(savedUrge);
    }

    setIsCaptured(true);
    setTimeout(() => {
      setIsCaptured(false);
      setNote('');
      setSelectedCategory('phone');
      onClose();
    }, 1400);
  };

  const handleCloseClean = () => {
    setIsCaptured(false);
    setNote('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCloseClean}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Notice Impulse & Capture</span>
        </div>
      }
      description="The urge to escape is a physiological reflex to discomfort. Name it without obeying it."
    >
      {isCaptured ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 animate-pulse">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-emerald-300">
            Captured. Return to the task.
          </h3>
          <p className="text-xs text-stone-400">
            You noticed the resistance and stayed in the seat. Resuming work immediately.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={handleCloseClean}>
              Return Now
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <ContextualRuleBanner reminder={getContextualRuleReminder('distraction_surge')} />
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase text-stone-400">
              What pulled your attention?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DISTRACTION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="text-xs font-medium truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Input
              label="Short Note (Optional)"
              placeholder="e.g. Wanted to check WhatsApp messages"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={handleCloseClean}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
            >
              Capture & Return to Work
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
