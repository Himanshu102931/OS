import React from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import { Clock, AlertCircle, CheckCircle2, Play, Check } from 'lucide-react';
import { Button } from '../ui/button';

interface TaskCardProps {
  task: TaskDefinition;
  progress?: TaskProgress;
  domain?: DomainDefinition;
  isNextBestAction?: boolean;
  onUpdateState: (taskId: string, newState: TaskProgress['state']) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  progress,
  domain,
  isNextBestAction = false,
  onUpdateState,
}) => {
  const state = progress?.state || 'not_started';

  const stateColors = {
    not_started: 'border-slate-800 bg-slate-900/60 text-slate-300',
    in_progress: 'border-blue-500/40 bg-blue-950/30 text-blue-200',
    completed: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 opacity-75',
    archived: 'border-slate-800 bg-slate-950 text-slate-500 opacity-50',
  };

  const stateBadges = {
    not_started: <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">To Do</span>,
    in_progress: <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-medium">In Progress</span>,
    completed: <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-medium flex items-center gap-1"><CheckCircle2 className="size-3"/> Completed</span>,
    archived: <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500">Archived</span>,
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 ${stateColors[state]} ${
        isNextBestAction
          ? 'ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/10 border-blue-500/60 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900'
          : 'hover:border-slate-700'
      }`}
    >
      {isNextBestAction && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-blue-400 uppercase">
          <AlertCircle className="size-3.5 text-blue-400" />
          <span>Recommended Next Best Action</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {domain && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                {domain.shortName}
              </span>
            )}
            <span className="text-xs text-slate-400 uppercase font-medium tracking-wide">
              {task.taskType}
            </span>
            {stateBadges[state]}
          </div>

          <h3 className={`font-semibold text-base leading-snug ${state === 'completed' ? 'line-through text-slate-400' : 'text-slate-100'}`}>
            {task.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-medium text-slate-300">
            <Clock className="size-3.5 text-slate-400" />
            {task.estimatedMinutes} mins
          </span>
          <span className="flex items-center gap-1">
            Importance: <strong className="text-slate-200">{task.importance}/10</strong>
          </span>
          {task.dueDate && (
            <span className="text-slate-400 hidden sm:inline">
              Due: <span className="text-amber-400 font-medium">{task.dueDate}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {state === 'not_started' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdateState(task.id, 'in_progress')}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
          )}

          {state === 'in_progress' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdateState(task.id, 'completed')}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Check className="size-3 mr-1" /> Mark Done
            </Button>
          )}

          {state === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateState(task.id, 'not_started')}
              className="h-7 text-xs text-slate-400 hover:text-slate-200"
            >
              Reopen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
