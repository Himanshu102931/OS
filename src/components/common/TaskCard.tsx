import React, { useState } from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import { TaskDecompositionModal } from './TaskDecompositionModal';
import { Clock, CheckCircle2, Play, Check, GitFork, AlertTriangle } from 'lucide-react';
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
    not_started: <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">To Do</span>,
    in_progress: <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">In Progress</span>,
    completed: <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-1"><CheckCircle2 className="size-3"/> Done</span>,
    archived: <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-500">Archived</span>,
  };

  return (
    <div className={`app-surface p-3.5 transition-colors ${state === 'completed' ? 'opacity-70' : ''}`}>
      {isHighFriction && state !== 'completed' && (
        <div className="mb-2 flex items-center justify-between p-2 rounded bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
            <span>High Friction ({postponeCount} postponements)</span>
          </div>
          {onDecomposeTask && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsDecompModalOpen(true)}
              className="text-[10px] h-6 border-amber-800 bg-amber-950 text-amber-200"
            >
              <GitFork className="size-3 mr-1" /> Decompose
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {domain && (
              <span className="text-[11px] font-medium text-zinc-300">
                {domain.shortName}
              </span>
            )}
            <span className="text-zinc-600">·</span>
            <span className="text-[11px] text-zinc-400 capitalize">
              {task.taskType}
            </span>
            {stateBadges[state]}
          </div>

          <h3 className={`font-semibold text-sm leading-snug ${state === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
            {task.title}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2">
            {task.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {state === 'not_started' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'in_progress')}
              className="h-7 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded px-2.5"
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
          )}

          {state === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'completed')}
              className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded px-2.5"
            >
              <Check className="size-3 mr-1" /> Complete
            </Button>
          )}

          {state === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateState(task.id, 'not_started')}
              className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-400">
            <Clock className="size-3 text-zinc-400" />
            {task.estimatedMinutes} mins
          </span>
          <span>Importance: <span className="font-mono text-zinc-300">{task.importance}/10</span></span>
          {task.dueDate && <span>Due: <span className="font-mono text-zinc-300">{task.dueDate}</span></span>}
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
