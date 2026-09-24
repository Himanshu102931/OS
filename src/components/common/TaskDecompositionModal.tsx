import React, { useState } from 'react';
import type { TaskDefinition } from '../../types';
import { GitFork, X, CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface TaskDecompositionModalProps {
  task: TaskDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onDecomposeTask: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
}

export const TaskDecompositionModal: React.FC<TaskDecompositionModalProps> = ({
  task,
  isOpen,
  onClose,
  onDecomposeTask,
}) => {
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([
    'Subtask 1: Study core concepts & examples',
    'Subtask 2: Solve baseline practice problem',
  ]);

  if (!isOpen || !task) return null;

  const handleAddSubtask = () => {
    if (subtaskTitles.length < 5) {
      setSubtaskTitles((prev) => [...prev, `Subtask ${prev.length + 1}: Practice problem`]);
    }
  };

  const handleRemoveSubtask = (index: number) => {
    if (subtaskTitles.length > 1) {
      setSubtaskTitles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleTitleChange = (index: number, val: string) => {
    setSubtaskTitles((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validTitles = subtaskTitles.map((t) => t.trim()).filter(Boolean);
    if (validTitles.length === 0) return;

    const estMinsEach = Math.max(15, Math.round(task.estimatedMinutes / validTitles.length));

    const generatedSubtasks: TaskDefinition[] = validTitles.map((title, idx) => ({
      id: `subtask-${Date.now()}-${idx}`,
      title,
      description: `Subtask derived from parent task: "${task.title}"`,
      domainId: task.domainId,
      topicId: task.topicId,
      phaseId: task.phaseId,
      estimatedMinutes: estMinsEach,
      importance: Math.max(1, task.importance - 1),
      taskType: task.taskType,
      languageTags: task.languageTags,
      parentTaskId: task.id,
      dueDate: task.dueDate,
      createdAt: new Date().toISOString(),
    }));

    onDecomposeTask(task, generatedSubtasks);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decomp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFC665] uppercase tracking-wider font-mono">
              <GitFork className="size-3.5" />
              <span>Friction Management Protocol</span>
            </div>
            <h2 id="decomp-modal-title" className="text-xl font-bold text-[#F1F5F9] mt-0.5 font-mono">
              Decompose High-Friction Task
            </h2>
            <p className="text-xs text-[#8E98A8] mt-0.5 font-medium">"{task.title}"</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close task decomposition modal"
            className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-3 rounded-[4px] bg-[#1B2028] border border-amber-900/60 text-xs text-amber-300 flex items-center gap-2 font-mono">
          <AlertTriangle className="size-4 text-amber-400 shrink-0" />
          <span>
            This task has accumulated repeated postponements/skips. Decomposing it into smaller subtasks maintains execution momentum.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[#8E98A8] font-bold uppercase tracking-wider text-[11px]">
                Subtasks ({subtaskTitles.length})
              </label>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={handleAddSubtask}
                disabled={subtaskTitles.length >= 5}
                className="text-xs text-[#FFC665] hover:text-[#F1F5F9] rounded-[4px]"
              >
                <Plus className="size-3 mr-1" /> Add Subtask
              </Button>
            </div>

            <div className="space-y-2">
              {subtaskTitles.map((title, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(idx, e.target.value)}
                    className="flex-1 bg-[#1B2028] text-[#F1F5F9] font-medium p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none focus:border-[#3B4556]"
                  />
                  {subtaskTitles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="p-2 text-[#8E98A8] hover:text-rose-400 transition-colors"
                      title="Remove subtask"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262D38]">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-mono font-bold rounded-[4px]"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Decompose Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
