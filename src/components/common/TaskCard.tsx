import React, { useState } from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import { TaskDecompositionModal } from './TaskDecompositionModal';
import { getTaskLearningRoute, getLearningDestinationLabel } from '../../engine/taskFlowEngine';
import { Clock, CheckCircle2, Play, Check, GitFork, AlertTriangle, RotateCcw, BookOpen, SkipForward } from 'lucide-react';
import { Button } from '../ui/button';

interface TaskCardProps {
  task: TaskDefinition;
  progress?: TaskProgress;
  domain?: DomainDefinition;
  isNextBestAction?: boolean;
  onUpdateState: (taskId: string, newState: TaskProgress['state']) => void;
  onDecomposeTask?: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
  /** Routes the task to its learning destination (Preparation workspace or roadmap topic). */
  onOpenLearning?: (task: TaskDefinition) => void;
  /** Today as YYYY-MM-DD — enables the "Postponed until" state chip. */
  todayISO?: string;
  /** Defers the task to tomorrow via `updateTaskState(taskId, state, 'postpone')`. */
  onPostpone?: (taskId: string) => void;
  /** Records a skip via `updateTaskState(taskId, state, 'skip')` — never completes the task. */
  onSkip?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  progress,
  domain,
  onUpdateState,
  onDecomposeTask,
  onOpenLearning,
  todayISO,
  onPostpone,
  onSkip,
}) => {
  const [isDecompModalOpen, setIsDecompModalOpen] = useState(false);

  const state = progress?.state || 'not_started';
  const postponeCount = progress?.postponeCount || 0;
  const skipCount = progress?.skipCount || 0;
  const isHighFriction = postponeCount >= 2 || skipCount >= 1;
  const isPostponed = !!progress?.postponedUntil && !!todayISO && progress.postponedUntil > todayISO;
  const canDefer = state !== 'completed' && state !== 'archived';

  const frictionParts: string[] = [];
  if (postponeCount > 0) frictionParts.push(`${postponeCount} postponement${postponeCount === 1 ? '' : 's'}`);
  if (skipCount > 0) frictionParts.push(`${skipCount} skip${skipCount === 1 ? '' : 's'}`);

  const stateBadges = {
    not_started: <span className="tech-chip">To Do</span>,
    in_progress: <span className="tech-chip tech-chip-warning">In Progress</span>,
    completed: <span className="tech-chip tech-chip-success flex items-center gap-1"><CheckCircle2 className="size-3"/> Done</span>,
    archived: <span className="tech-chip">Archived</span>,
  };

  return (
    <div className={`app-surface app-surface-hover p-4 transition-all ${state === 'completed' ? 'opacity-70 bg-surface-panel/60' : ''}`}>
      {isHighFriction && state !== 'completed' && (
        <div className="mb-3 flex items-center justify-between p-2 rounded-[4px] bg-status-warning/10 border border-status-warning/30 text-xs text-status-warning">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <AlertTriangle className="size-3.5 shrink-0 text-status-warning" />
            <span>High Friction ({frictionParts.join(', ')})</span>
          </div>
          {onDecomposeTask && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsDecompModalOpen(true)}
              className="text-[10px] h-6 border-status-warning/40 bg-surface-elevated text-status-warning hover:bg-status-warning/20"
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
              <span className="text-[11px] font-semibold text-accent-amber tracking-wide">
                {domain.shortName}
              </span>
            )}
            <span className="text-text-secondary">·</span>
            <span className="text-[11px] text-text-secondary capitalize font-mono">
              {task.taskType}
            </span>
            {stateBadges[state]}
            {isPostponed && (
              <span className="tech-chip tech-chip-warning font-mono" title="Deferred from today's plan — returns when this date passes">
                Postponed until {progress?.postponedUntil}
              </span>
            )}
          </div>

          <h3 className={`font-semibold text-sm leading-snug ${state === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
            {task.title}
          </h3>

          <p className="text-xs text-text-secondary line-clamp-2">
            {task.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {state === 'not_started' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'in_progress')}
              className="h-7 text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] px-3 shadow-sm"
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
          )}

          {state === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onUpdateState(task.id, 'completed')}
              className="h-7 text-xs font-semibold bg-status-success hover:bg-status-success/90 text-primary-foreground rounded-[4px] px-3 shadow-sm"
            >
              <Check className="size-3 mr-1" /> Complete
            </Button>
          )}

          {state === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateState(task.id, 'not_started')}
              className="h-7 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
            >
              <RotateCcw className="size-3 mr-1" /> Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Defer controls — optional, provided by the daily plan (Today) view */}
      {(onPostpone || onSkip) && canDefer && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {onPostpone && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onPostpone(task.id)}
              title="Postpone to tomorrow"
              aria-label={`Postpone ${task.title} to tomorrow`}
              className="h-7 text-[11px] font-medium text-text-secondary hover:text-accent-amber hover:bg-surface-elevated rounded-[4px] px-2"
            >
              <Clock className="size-3 mr-1" /> Postpone
            </Button>
          )}
          {onSkip && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onSkip(task.id)}
              title="Skip without completing — records a recovery signal"
              aria-label={`Skip ${task.title} without completing`}
              className="h-7 text-[11px] font-medium text-text-secondary hover:text-accent-amber hover:bg-surface-elevated rounded-[4px] px-2"
            >
              <SkipForward className="size-3 mr-1" /> Skip
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-border-default flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px] text-text-secondary font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-text-secondary">
            <Clock className="size-3 text-accent-amber" />
            {task.estimatedMinutes} mins
          </span>
          <span>Importance: <span className="text-text-primary">{task.importance}/10</span></span>
          {task.dueDate && <span>Due: <span className="text-accent-amber">{task.dueDate}</span></span>}
        </div>

        {onOpenLearning && (
          <button
            type="button"
            onClick={() => onOpenLearning(task)}
            className="flex items-center gap-1 text-accent-amber hover:text-accent-amber-light font-semibold transition-colors shrink-0"
          >
            <BookOpen className="size-3" />
            {getLearningDestinationLabel(getTaskLearningRoute(task), 'card')}
          </button>
        )}
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
