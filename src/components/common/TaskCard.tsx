import React, { useState } from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import { TaskDecompositionModal } from './TaskDecompositionModal';
import { Clock, CheckCircle2, Play, Check, GitFork, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface TaskCardProps {
  task: TaskDefinition;
  progress?: TaskProgress;
  domain?: DomainDefinition;
  isNextBestAction?: boolean;
  onUpdateState: (taskId: string, newState: TaskProgress['state']) => void;
  onDecomposeTask?: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  progress,
  domain,
  onUpdateState,
  onDecomposeTask,
}) => {
  const [isDecompModalOpen, setIsDecompModalOpen] = useState(false);

  const state = progress?.state || 'not_started';
  const postponeCount = progress?.postponeCount || 0;
  const skipCount = progress?.skipCount || 0;
  const isHighFriction = postponeCount >= 2 || skipCount >= 1;

  const stateBadges = {
    not_started: <span className="tech-chip">To Do</span>,
    in_progress: <span className="tech-chip tech-chip-warning">In Progress</span>,
    completed: <span className="tech-chip tech-chip-success flex items-center gap-1"><CheckCircle2 className="size-3"/> Done</span>,
    archived: <span className="tech-chip">Archived</span>,
  };

  return (
    <div className={`app-surface app-surface-hover p-4 transition-all ${state === 'completed' ? 'opacity-70 bg-[#14171D]/60' : ''}`}>
      {isHighFriction && state !== 'completed' && (
        <div className="mb-3 flex items-center justify-between p-2 rounded-[4px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B]">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <AlertTriangle className="size-3.5 shrink-0 text-[#F59E0B]" />
            <span>High Friction ({postponeCount} postponements)</span>
          </div>
          {onDecomposeTask && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsDecompModalOpen(true)}
              className="text-[10px] h-6 border-[#F59E0B]/40 bg-[#1B2028] text-[#F59E0B] hover:bg-[#F59E0B]/20"
            >
              <GitFork className="size-3 mr-1" /> Decompose
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {domain && (
              <span className="text-[11px] font-semibold text-[#FFC665] tracking-wide">
                {domain.shortName}
              </span>
            )}
            <span className="text-[#5C6675]">·</span>
            <span className="text-[11px] text-[#8E98A8] capitalize font-mono">
              {task.taskType}
            </span>
            {stateBadges[state]}
          </div>

          <h3 className={`font-semibold text-sm leading-snug ${state === 'completed' ? 'line-through text-[#5C6675]' : 'text-[#F1F5F9]'}`}>
            {task.title}
          </h3>

          <p className="text-xs text-[#8E98A8] line-clamp-2">
            {task.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {state === 'not_started' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'in_progress')}
              className="h-7 text-xs font-semibold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-3 shadow-sm"
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
          )}

          {state === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'completed')}
              className="h-7 text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-[4px] px-3 shadow-sm"
            >
              <Check className="size-3 mr-1" /> Complete
            </Button>
          )}

          {state === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateState(task.id, 'not_started')}
              className="h-7 text-xs text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
            >
              <RotateCcw className="size-3 mr-1" /> Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#262D38] flex items-center justify-between text-[11px] text-[#8E98A8] font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#8E98A8]">
            <Clock className="size-3 text-[#E5A93C]" />
            {task.estimatedMinutes} mins
          </span>
          <span>Importance: <span className="text-[#F1F5F9]">{task.importance}/10</span></span>
          {task.dueDate && <span>Due: <span className="text-[#FFC665]">{task.dueDate}</span></span>}
        </div>
      </div>

      {/* Task Decomposition Modal */}
      {onDecomposeTask && (
        <TaskDecompositionModal
          task={task}
          isOpen={isDecompModalOpen}
          onClose={() => setIsDecompModalOpen(false)}
          onDecomposeTask={onDecomposeTask}
        />
      )}
    </div>
  );
};
