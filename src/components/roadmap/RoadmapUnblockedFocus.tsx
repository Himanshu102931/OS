import React, { useMemo } from 'react';
import type { Phase, TaskDefinition, TaskProgress, Topic, DomainDefinition } from '../../types';
import { explainTaskLock } from '../../engine/prerequisiteNavigation';
import { Button } from '../ui/button';
import {
  Clock,
  ArrowRight,
  Play,
  CheckCircle2,
  Lock,
  Sparkles,
  BookOpen,
  CornerUpLeft,
} from 'lucide-react';

interface RoadmapUnblockedFocusProps {
  selectedPhase: Phase;
  activePhase: Phase;
  isSelectedActive: boolean;
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  topics: Topic[];
  domains: DomainDefinition[];
  onOpenTask: (taskId: string) => void;
  onOpenWorkspace: (task: TaskDefinition) => void;
  onReturnToActivePhase: () => void;
}

export const RoadmapUnblockedFocus: React.FC<RoadmapUnblockedFocusProps> = ({
  selectedPhase,
  activePhase,
  isSelectedActive,
  taskDefinitions,
  taskProgress,
  topics,
  domains,
  onOpenTask,
  onOpenWorkspace,
  onReturnToActivePhase,
}) => {
  // Topic lookup map for fast title resolution
  const topicMap = useMemo(() => {
    return new Map(topics.map((t) => [t.id, t]));
  }, [topics]);

  // Domain lookup map
  const domainMap = useMemo(() => {
    return new Map(domains.map((d) => [d.id, d]));
  }, [domains]);

  // Phase tasks
  const phaseTasks = useMemo(() => {
    return taskDefinitions.filter((t) => t.phaseId === selectedPhase.id);
  }, [taskDefinitions, selectedPhase.id]);

  // Incomplete tasks in this phase
  const pendingPhaseTasks = useMemo(() => {
    return phaseTasks.filter((t) => taskProgress[t.id]?.state !== 'completed');
  }, [phaseTasks, taskProgress]);

  // Actionable unblocked tasks: pending tasks where explainTaskLock produces isLocked === false
  const actionableTasks = useMemo(() => {
    return pendingPhaseTasks.filter((task) => {
      const lock = explainTaskLock({
        task,
        taskProgress,
        taskDefinitions,
        topics,
        activePhase,
      });
      return !lock.isLocked;
    });
  }, [pendingPhaseTasks, taskProgress, taskDefinitions, topics, activePhase]);

  // Rank actionable tasks: in_progress first, then highest importance, then canonical order
  const rankedFocusTasks = useMemo(() => {
    return [...actionableTasks].sort((a, b) => {
      const stateA = taskProgress[a.id]?.state === 'in_progress' ? 1 : 0;
      const stateB = taskProgress[b.id]?.state === 'in_progress' ? 1 : 0;
      if (stateA !== stateB) return stateB - stateA;
      if (b.importance !== a.importance) return b.importance - a.importance;
      return 0;
    });
  }, [actionableTasks, taskProgress]);

  // Show top 2–3 actionable tasks
  const topFocusTasks = rankedFocusTasks.slice(0, 3);

  return (
    <div
      role="region"
      aria-labelledby="immediate-focus-heading"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4 shadow-sm"
      data-testid="roadmap-immediate-focus"
    >
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 id="immediate-focus-heading" className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              Immediate Focus & Next Action
            </h3>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {topFocusTasks.length > 0
                ? `Top actionable tasks unblocked in ${selectedPhase.name.split(':')[0]}`
                : `Action status for ${selectedPhase.name.split(':')[0]}`}
            </p>
          </div>
        </div>

        {topFocusTasks.length > 0 && (
          <span className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded border border-[var(--accent)]/20 font-semibold self-start sm:self-auto">
            {actionableTasks.length} Unblocked Task{actionableTasks.length === 1 ? '' : 's'} Ready
          </span>
        )}
      </div>

      {/* Focus Items Grid */}
      {topFocusTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {topFocusTasks.map((task, idx) => {
            const parentTopic = topicMap.get(task.topicId);
            const domain = domainMap.get(task.domainId);
            const state = taskProgress[task.id]?.state || 'not_started';
            const isInProgress = state === 'in_progress';
            const isFirst = idx === 0;

            const actionableReason = isInProgress
              ? 'In progress • Ready to continue'
              : 'Prerequisites satisfied • Ready to start';

            return (
              <div
                key={task.id}
                data-testid={`focus-task-item-${task.id}`}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between space-y-3.5 ${
                  isFirst
                    ? 'bg-[var(--surface-elevated)] border-[var(--action-accent-border)]/60 shadow-sm'
                    : 'bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--border-active)]'
                }`}
              >
                {/* Meta Top Line */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {domain && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-mono font-medium">
                          {domain.shortName}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border capitalize font-semibold ${
                          isInProgress
                            ? 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30'
                            : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]'
                        }`}
                      >
                        {isInProgress ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>

                    <span className="text-[11px] text-[var(--foreground-subtle)] font-mono flex items-center gap-1">
                      <Clock className="size-3 text-[var(--accent)]" aria-hidden="true" />
                      {task.estimatedMinutes}m
                    </span>
                  </div>

                  {/* Task Title & Topic Context */}
                  <div>
                    {parentTopic && (
                      <span className="text-[10px] font-mono text-[var(--foreground-subtle)] block truncate">
                        Topic: {parentTopic.name}
                      </span>
                    )}
                    <h4
                      onClick={() => onOpenTask(task.id)}
                      className="text-xs font-bold text-[var(--foreground)] hover:text-[var(--accent)] cursor-pointer transition-colors line-clamp-1 mt-0.5"
                      title={task.title}
                    >
                      {task.title}
                    </h4>
                    <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2 mt-1 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Reason & Action Row */}
                <div className="pt-2 border-t border-[var(--border)]/70 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium">
                    {isInProgress ? (
                      <span className="text-[var(--warning)] flex items-center gap-1">
                        <Play className="size-2.5 fill-current" aria-hidden="true" />
                        {actionableReason}
                      </span>
                    ) : (
                      <span className="text-[var(--accent)] flex items-center gap-1">
                        <CheckCircle2 className="size-2.5" aria-hidden="true" />
                        {actionableReason}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Primary visually dominant action */}
                    <Button
                      size="xs"
                      onClick={() => onOpenTask(task.id)}
                      data-testid={`focus-action-btn-${task.id}`}
                      className="flex-1 h-7 text-xs bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--action-accent-ring)] transition-colors"
                    >
                      <span>{isInProgress ? 'Resume Task' : 'Start Task'}</span>
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Button>

                    {/* Secondary Workspace Action */}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onOpenWorkspace(task)}
                      data-testid={`focus-workspace-btn-${task.id}`}
                      title="Open Learning Workspace"
                      className="h-7 px-2 text-xs border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-md cursor-pointer"
                    >
                      <BookOpen className="size-3" aria-hidden="true" />
                      <span className="sr-only">Learning Workspace</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Honest Empty State */
        <div
          data-testid="focus-empty-state"
          className="p-6 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-center space-y-3"
        >
          <div className="mx-auto size-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)]">
            {pendingPhaseTasks.length === 0 ? (
              <CheckCircle2 className="size-5 text-[var(--accent)]" aria-hidden="true" />
            ) : !isSelectedActive ? (
              <Lock className="size-5 text-[var(--warning)]" aria-hidden="true" />
            ) : (
              <Clock className="size-5 text-[var(--accent)]" aria-hidden="true" />
            )}
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-xs font-bold text-[var(--foreground)]">
              {pendingPhaseTasks.length === 0
                ? 'Phase Milestone Completed'
                : !isSelectedActive
                ? `Phase ${selectedPhase.order} Milestone Gated`
                : 'No Unblocked Tasks Currently Available'}
            </h4>
            <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
              {pendingPhaseTasks.length === 0
                ? `All ${phaseTasks.length} tasks in this phase have been successfully completed. 100% milestone achieved!`
                : !isSelectedActive
                ? `This phase is upcoming. Operational focus remains on Phase 1 (${activePhase.name.split(':')[0]}). Tasks will unlock once Phase 1 criteria are satisfied.`
                : 'All remaining incomplete tasks in this phase currently require upstream prerequisites to be completed first.'}
            </p>
          </div>

          {!isSelectedActive && (
            <div className="pt-1">
              <Button
                size="xs"
                onClick={onReturnToActivePhase}
                data-testid="focus-empty-return-btn"
                className="h-7 text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold rounded-md px-3 cursor-pointer inline-flex items-center gap-1.5"
              >
                <CornerUpLeft className="size-3" aria-hidden="true" />
                <span>Return to Active Phase</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
