import React, { useState } from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import { TaskDecompositionModal } from './TaskDecompositionModal';
import { Clock, AlertCircle, CheckCircle2, Play, Check, GitFork, AlertTriangle } from 'lucide-react';
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
  isNextBestAction = false,
  onUpdateState,
  onDecomposeTask,
}) => {
  const [isDecompModalOpen, setIsDecompModalOpen] = useState(false);

  const state = progress?.state || 'not_started';
  const postponeCount = progress?.postponeCount || 0;
  const skipCount = progress?.skipCount || 0;
  const isHighFriction = postponeCount >= 2 || skipCount >= 1;

  const stateColors = {
    not_started: 'border-slate-800 bg-slate-900/60 text-slate-300',
    in_progress: 'border-blue-500/50 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 text-blue-200 shadow-md shadow-blue-500/10',
    completed: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 opacity-80',
    archived: 'border-slate-800 bg-slate-950 text-slate-500 opacity-50',
  };

  const stateBadges = {
    not_started: <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">To Do</span>,
    in_progress: <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80 animate-pulse">In Progress</span>,
    completed: <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1"><CheckCircle2 className="size-3"/> Completed</span>,
    archived: <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">Archived</span>,
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${stateColors[state]} ${
        isNextBestAction
          ? 'ring-2 ring-blue-500/80 shadow-xl shadow-blue-500/20 border-blue-400/80 bg-gradient-to-br from-slate-900 via-blue-950/50 to-slate-900'
          : 'hover:border-slate-700 hover:shadow-lg'
      }`}
    >
      {isNextBestAction && (
        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-blue-400 uppercase">
          <AlertCircle className="size-4 text-blue-400 animate-bounce" />
          <span>Recommended Next Best Action</span>
        </div>
      )}

      {isHighFriction && state !== 'completed' && (
        <div className="mb-2.5 flex items-center justify-between p-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
            <span>High Friction ({postponeCount} postponements)</span>
          </div>
          {onDecomposeTask && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsDecompModalOpen(true)}
              className="text-[10px] font-bold border-amber-700 bg-amber-950 hover:bg-amber-900 text-amber-200"
            >
              <GitFork className="size-3 mr-1" /> Decompose
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {domain && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800/60 shadow-inner">
                {domain.shortName}
              </span>
            )}
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
              {task.taskType}
            </span>
            {stateBadges[state]}
          </div>

          <h3 className={`font-bold text-base sm:text-lg leading-snug tracking-tight ${state === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
            {task.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
            {task.description}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-semibold text-slate-200">
            <Clock className="size-3.5 text-blue-400" />
            {task.estimatedMinutes} mins
          </span>
          <span className="flex items-center gap-1 font-medium">
            Importance: <strong className="text-white font-mono">{task.importance}/10</strong>
          </span>
          {task.dueDate && (
            <span className="text-slate-400 hidden sm:inline">
              Due: <span className="text-amber-400 font-mono font-semibold">{task.dueDate}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {state === 'not_started' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdateState(task.id, 'in_progress')}
              className="h-8 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20"
            >
              <Play className="size-3.5 mr-1" /> Start
            </Button>
          )}

          {state === 'in_progress' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdateState(task.id, 'completed')}
              className="h-8 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
            >
              <Check className="size-3.5 mr-1" /> Mark Done
            </Button>
          )}

          {state === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateState(task.id, 'not_started')}
              className="h-8 text-xs text-slate-400 hover:text-slate-200"
            >
              Reopen
            </Button>
          )}
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
