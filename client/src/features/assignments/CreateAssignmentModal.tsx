import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input, Textarea } from '../../components/ui/Input.tsx';
import {
  Assignment,
  Milestone,
  AssignmentStatus,
  ImportanceLevel,
} from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { sound } from '../../utils/sound.ts';
import { addDays, format } from '../../utils/dates.ts';
import {
  BREAKDOWN_TEMPLATES,
  buildTemplateMilestones,
} from './decompositionPresets.ts';
import {
  Plus,
  Trash2,
  FolderGit2,
  Sparkles,
  Layers,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { aiDecomposeAssignment } from '../ai/aiWorkflows.ts';

export interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (assignment: Assignment) => void;
}

const CATEGORY_OPTIONS = [
  'Technical / Coding',
  'Writing / Papers',
  'Problem Sets / Math',
  'Reading / Literature',
  'Research',
  'Administrative',
];

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const defaultDeadline = format(addDays(new Date(), 10), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technical / Coding');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [estimatedTotalHours, setEstimatedTotalHours] = useState(12);
  const [importance, setImportance] = useState<ImportanceLevel>('high');
  const [status, setStatus] = useState<AssignmentStatus>('not_started');

  // Breakdown & Milestones state
  const [showBreakdownSection, setShowBreakdownSection] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('technical_project');
  const [milestones, setMilestones] = useState<Milestone[]>(() =>
    buildTemplateMilestones('technical_project', 'draft-id')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isDecomposing, setIsDecomposing] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const newMilestones = buildTemplateMilestones(templateId, 'draft-id');
    setMilestones(newMilestones);
    const totalHours = newMilestones.reduce((sum, m) => sum + m.estimatedHours, 0);
    setEstimatedTotalHours(totalHours);
  };

  const handleAiDecompose = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title before running AI decomposition.');
      return;
    }
    setIsDecomposing(true);
    setErrorMsg(null);
    try {
      const generated = await aiDecomposeAssignment({
        title,
        category,
        description,
      });
      const converted: Milestone[] = generated.map((m, idx) => ({
        id: crypto.randomUUID(),
        assignmentId: 'draft-id',
        title: m.title,
        intendedOutput: m.intendedOutput,
        sequence: idx,
        estimatedHours: m.estimatedHours,
        status: idx === 0 ? 'in_progress' : 'not_started',
        nextAction: m.nextAction,
      }));
      setMilestones(converted);
      const totalH = converted.reduce((acc, m) => acc + m.estimatedHours, 0);
      setEstimatedTotalHours(totalH);
      setShowBreakdownSection(true);
    } catch (err) {
      console.error('AI decomposition error:', err);
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleUpdateMilestone = (idx: number, fields: Partial<Milestone>) => {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], ...fields };
    setMilestones(updated);
  };

  const handleAddMilestone = () => {
    const newM: Milestone = {
      id: crypto.randomUUID(),
      assignmentId: 'draft-id',
      title: `Step ${milestones.length + 1}`,
      intendedOutput: '',
      sequence: milestones.length,
      estimatedHours: 2,
      status: 'not_started',
      nextAction: '',
    };
    setMilestones([...milestones, newM]);
  };

  const handleRemoveMilestone = (idx: number) => {
    const filtered = milestones.filter((_, i) => i !== idx);
    filtered.forEach((m, i) => {
      m.sequence = i;
    });
    setMilestones(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment or project title.');
      return;
    }
    if (!deadline) {
      setErrorMsg('Please set a target completion deadline.');
      return;
    }
    if (milestones.length === 0) {
      setErrorMsg('Please add at least one milestone to break down this assignment.');
      return;
    }

    // Validate that milestones have visible output
    const vagueMilestone = milestones.find(
      (m) => !m.intendedOutput.trim() || !m.nextAction.trim()
    );
    if (vagueMilestone) {
      setErrorMsg(
        `Milestone "${vagueMilestone.title}" requires both an intended visible output and a first physical action.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const assignmentId = crypto.randomUUID();

      const finalMilestones: Milestone[] = milestones.map((m, idx) => ({
        ...m,
        id: crypto.randomUUID(),
        assignmentId,
        sequence: idx,
      }));

      const newAssignment: Assignment = {
        id: assignmentId,
        title: title.trim(),
        category,
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        estimatedTotalHours,
        importance,
        status,
        milestones: finalMilestones,
        nextAction: finalMilestones[0]?.nextAction || 'Review assignment requirements',
        progressPercent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dataService.saveAssignment(newAssignment);
      sound.playStartChime(true);

      if (onSuccess) onSuccess(newAssignment);
      onClose();
    } catch (err) {
      console.error('Failed to create assignment:', err);
      setErrorMsg('Failed to save assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-stone-100">
          <FolderGit2 className="w-5 h-5 text-emerald-400" />
          <span>New Assignment / Project</span>
        </div>
      }
      description="Distant deadlines create the illusion of safety. Break your deliverables into concrete milestones with visible proof of completion."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-left max-h-[75vh] overflow-y-auto pr-1">
        {/* Basic Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Input
              label="Assignment Title"
              placeholder="e.g. Complete Computer Vision project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-stone-500 font-mono text-xs">
                Name the overarching deliverable or project
              </span>
              <button
                type="button"
                onClick={() => {
                  handleTemplateChange('technical_project');
                  setShowBreakdownSection(true);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-mono text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Break this down (Research → Submit)</span>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Description & Scope (Optional)"
            placeholder="Key requirements, grading rubric notes, or scope boundaries..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Deadline & Effort Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Absolute Deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

            <Input
              label="Estimated Total Effort (Hours)"
              type="number"
              min="1"
              max="200"
              value={estimatedTotalHours}
              onChange={(e) => setEstimatedTotalHours(Number(e.target.value))}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">Importance Level</label>
              <div className="flex items-center gap-1">
                {(['low', 'medium', 'high', 'critical'] as ImportanceLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setImportance(lvl)}
                    className={`flex-1 py-2 text-xs font-mono uppercase rounded-lg border transition-all cursor-pointer ${
                      importance === lvl
                        ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Initial Status</label>
            <div className="flex flex-wrap gap-2">
              {(['not_started', 'in_progress', 'paused', 'completed', 'archived'] as AssignmentStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase rounded-lg border transition-all cursor-pointer ${
                    status === st
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BREAK THIS DOWN WORKFLOW */}
        <div className="pt-4 border-t border-stone-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-stone-100">
                “Break This Down” Milestone Workflow
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowBreakdownSection(!showBreakdownSection)}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              {showBreakdownSection ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showBreakdownSection && (
            <div className="space-y-4">
              {/* Task Decomposition Assistant Card */}
              <div className="p-4 rounded-xl bg-stone-950 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>TASK DECOMPOSITION ASSISTANT</span>
                </div>
                <p className="text-stone-200 font-medium">
                  &ldquo;What would count as visible evidence that each step is complete?&rdquo;
                </p>
                <div className="p-2.5 rounded-xl surface-1 border border-stone-800/40 font-mono text-xs space-y-1 text-stone-300">
                  <div className="text-rose-400">
                    ✕ Bad: <span className="text-stone-400">&ldquo;Study Canny Edge Detection&rdquo;</span>
                  </div>
                  <div className="text-emerald-400">
                    ✓ Concrete: <span className="text-stone-200">&ldquo;Explain Canny in my own words and solve 5 practice questions.&rdquo;</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-stone-900">
                  <span className="text-stone-400 text-xs">
                    Use AI reasoning to break down &ldquo;{title || 'this assignment'}&rdquo; into verifiable milestones.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiDecompose}
                    disabled={isDecomposing}
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-mono text-xs shrink-0"
                  >
                    {isDecomposing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Decomposing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        AI Decompose Assignment
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Template Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-300">
                  Select Staged Sequence Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {BREAKDOWN_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tpl.id)}
                      className={`p-3 rounded-lg text-left border transition-all cursor-pointer space-y-1 ${
                        selectedTemplateId === tpl.id
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-stone-200 truncate">
                        {tpl.name}
                      </div>
                      <div className="text-xs text-stone-400 leading-tight">
                        {tpl.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestone List Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-400">
                    Milestones ({milestones.length} stages)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleAddMilestone}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Milestone
                  </Button>
                </div>

                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800/40 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 font-mono text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            placeholder="Milestone title (e.g. 1. Research & Outline)"
                            value={m.title}
                            onChange={(e) =>
                              handleUpdateMilestone(idx, { title: e.target.value })
                            }
                            className="h-8 text-xs font-semibold"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-stone-400">
                            <Clock className="w-3.5 h-3.5" />
                            <input
                              type="number"
                              min="0.5"
                              max="40"
                              step="0.5"
                              value={m.estimatedHours}
                              onChange={(e) =>
                                handleUpdateMilestone(idx, {
                                  estimatedHours: parseFloat(e.target.value) || 1,
                                })
                              }
                              className="w-12 h-8 rounded bg-stone-950 border border-stone-800/40 text-center text-xs font-mono text-stone-100"
                            />
                            <span>hrs</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            aria-label="Remove milestone"
                            className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Intended Output & First Action inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-xs font-mono text-stone-400 mb-1">
                            Visible Output (Proof of completion)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 1-page summary notes written"
                            value={m.intendedOutput}
                            onChange={(e) =>
                              handleUpdateMilestone(idx, { intendedOutput: e.target.value })
                            }
                            className="w-full bg-stone-950 border border-stone-800/40 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-stone-400 mb-1">
                            First Physical Action (15s start)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Open PDF to page 10"
                            value={m.nextAction}
                            onChange={(e) =>
                              handleUpdateMilestone(idx, { nextAction: e.target.value })
                            }
                            className="w-full bg-stone-950 border border-stone-800/40 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Assignment & Milestones
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
