import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { WorkSlot, Assignment, Milestone } from '../../types/models.ts';
import { dataService } from '../../services/dataService.ts';
import { getTodayString, addDays, format } from '../../utils/dates.ts';
import { sound } from '../../utils/sound.ts';
import { CalendarClock, Zap, PhoneOff } from 'lucide-react';

export interface ScheduleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment?: Assignment;
  milestone?: Milestone;
  onSuccess?: (slot: WorkSlot) => void;
}

export const ScheduleSlotModal: React.FC<ScheduleSlotModalProps> = ({
  isOpen,
  onClose,
  assignment,
  milestone,
  onSuccess,
}) => {
  const todayStr = getTodayString();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [date, setDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('09:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(40);
  const [taskTitle, setTaskTitle] = useState<string>(() => {
    if (milestone) return `${assignment?.title ? `${assignment.title}: ` : ''}${milestone.title}`;
    if (assignment) return assignment.title;
    return '';
  });
  const [desiredOutput, setDesiredOutput] = useState<string>(() => {
    if (milestone?.intendedOutput) return milestone.intendedOutput;
    return '';
  });
  const [firstPhysicalAction, setFirstPhysicalAction] = useState<string>(() => {
    if (milestone?.nextAction) return milestone.nextAction;
    if (assignment?.nextAction) return assignment.nextAction;
    return '';
  });
  const [isTopPriority, setIsTopPriority] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when props change
  React.useEffect(() => {
    if (isOpen) {
      if (milestone) {
        setTaskTitle(`${assignment?.title ? `${assignment.title}: ` : ''}${milestone.title}`);
        setDesiredOutput(milestone.intendedOutput || '');
        setFirstPhysicalAction(milestone.nextAction || '');
      } else if (assignment) {
        setTaskTitle(assignment.title);
        setDesiredOutput(`Advance milestone for ${assignment.title}`);
        setFirstPhysicalAction(assignment.nextAction || '');
      }
    }
  }, [isOpen, assignment, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setErrorMsg('Please specify a task title.');
      return;
    }
    if (!desiredOutput.trim()) {
      setErrorMsg('Desired output is required. What visible artifact will exist?');
      return;
    }
    if (!firstPhysicalAction.trim()) {
      setErrorMsg('First physical action is required. What 10-second action starts this?');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate end time
      const [h, m] = startTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + durationMinutes;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      const newSlot: WorkSlot = {
        id: crypto.randomUUID(),
        date,
        startTime,
        endTime,
        assignmentId: assignment?.id,
        milestoneId: milestone?.id,
        taskTitle: taskTitle.trim(),
        desiredOutput: desiredOutput.trim(),
        firstPhysicalAction: firstPhysicalAction.trim(),
        estimatedDurationMinutes: durationMinutes,
        status: 'planned',
        isTopPriority,
      };

      await dataService.saveSlot(newSlot);
      sound.playStartChime(true);

      if (onSuccess) onSuccess(newSlot);
      onClose();
    } catch (err) {
      console.error('Failed to schedule work slot:', err);
      setErrorMsg('Failed to save slot. Please check inputs.');
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
          <CalendarClock className="w-5 h-5 text-emerald-400" />
          <span>Convert Milestone to Work Slot</span>
        </div>
      }
      description="Schedule this concrete action into today's or tomorrow's operating windows."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {assignment && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>Assignment:</span>
            <Badge variant="action">{assignment.title}</Badge>
            <span className="text-stone-500">• Deadline: {format(new Date(assignment.deadline), 'MMM d')}</span>
          </div>
        )}

        <Input
          label="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="e.g. Computer Vision: Implement Canny Filter"
        />

        {/* Highlighted Desired Output & First Physical Action */}
        <div className="space-y-3 p-4 rounded-xl bg-stone-950 border border-stone-800">
          <Input
            label="Desired Tangible Output (Visible evidence of completion)"
            value={desiredOutput}
            onChange={(e) => setDesiredOutput(e.target.value)}
            placeholder="e.g. Questions 1 to 5 solved with output verification"
            hint="Rule 03: Define what artifact will physically exist when the slot ends."
          />

          <Input
            label="First Physical Action (Execute in 15 seconds)"
            value={firstPhysicalAction}
            onChange={(e) => setFirstPhysicalAction(e.target.value)}
            placeholder="e.g. Open Jupyter notebook to cell 4 and run imports"
            hint="Rule 01: Motivation follows motion. Start with the physical motion."
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Target Day</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                  date === todayStr
                    ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                    : 'bg-stone-900 text-stone-400 border-stone-800'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(tomorrowStr)}
                className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                  date === tomorrowStr
                    ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                    : 'bg-stone-900 text-stone-400 border-stone-800'
                }`}
              >
                Tomorrow
              </button>
            </div>
          </div>

          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-300">Duration</label>
            <div className="flex items-center gap-1.5">
              {[25, 40, 50].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDurationMinutes(dur)}
                  className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                    durationMinutes === dur
                      ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Anchor Selection */}
        <div className="flex items-center justify-between p-3 rounded-xl surface-1/60 border border-stone-800">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-stone-200">Daily Priority Slot</span>
            <p className="text-xs text-stone-400">Anchor tasks are protected against distraction.</p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setIsTopPriority(p as 1 | 2 | 3)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all cursor-pointer ${
                  isTopPriority === p
                    ? 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                    : 'bg-stone-900 text-stone-400 border-stone-800'
                }`}
              >
                Top {p}
              </button>
            ))}
          </div>
        </div>

        {/* Environmental reminder */}
        <div className="flex items-center gap-2 text-xs text-amber-300/90 font-mono">
          <PhoneOff className="w-3.5 h-3.5 shrink-0" />
          <span>Rule 05: Phone will be required outside reach during this slot.</span>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Zap className="w-4 h-4" />}
          >
            Add to Day Plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
