import React, { useContext } from 'react';
import { CheckCircle2, Clock, ChevronUp, ChevronDown, Sun, ArrowRight } from 'lucide-react';
import { TodaySection, SectionHeading, MonoChip, TodayButton } from './todayPrimitives';
import { SessionDisplay } from './SessionDisplay';
import { SessionContext } from './SessionContext';
import { TaskCard } from '../common/TaskCard';
import type { DomainDefinition, DailyTaskAssignment, DSAProblem, DSAProgress, TaskDefinition, TaskProgress } from '../../types';
import type { SessionActivity } from '../../engine/sessionComposer';

/** Plan rows, exactly as `DashboardView` merges assignments with progress (§7.1). */
export type QueuePlanItem =
  | { kind: 'task'; assignmentId: string; task: TaskDefinition; progress?: TaskProgress; completed: boolean }
  | {
      kind: 'dsa';
      assignmentId: string;
      problem: DSAProblem;
      dsaProg?: DSAProgress;
      completed: boolean;
      taskType: 'dsa_review' | 'dsa_new';
    };

export interface ExecutionQueueProps {
  revealed: boolean;
  observeRef: (el: HTMLElement | null) => void;

  isPlanCommitted: boolean;
  assignedPlanTasks: QueuePlanItem[];
  completedPlanCount: number;
  isPlanExpanded: boolean;
  onToggleExpand: () => void;
  todayAssignments: DailyTaskAssignment[];

  /* Reused session panel (§4 — SessionDisplay is unchanged) */
  onStartActivity: (activity: SessionActivity) => void;
  onCompleteActivity: (activity: SessionActivity) => void;

  /* Controls */
  onPlanToday: () => void;
  onOpenRoadmap: () => void;
  onOpenDsa: (problemId: string) => void;
  onUpdateState: (taskId: string, state: TaskProgress['state']) => void;
  onDecomposeTask: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
  onOpenLearning: (task: TaskDefinition) => void;
  onPostpone: (taskId: string) => void;
  onSkip: (taskId: string) => void;

  getDomain: (domainId: string) => DomainDefinition | undefined;
  todayISO: string;
}

const hhmm = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * §7 — Execution Queue: Today Session + Today's Plan merged into one section.
 * Ordering authority is the committed `dailyTaskAssignments` order; this
 * component never re-ranks, never scores, never filters by priority, and never
 * renders a daily completion percentage (§7.1, test `T-NEW-4`).
 */
export const ExecutionQueue: React.FC<ExecutionQueueProps> = ({
  revealed, observeRef,
  isPlanCommitted, assignedPlanTasks, completedPlanCount, isPlanExpanded, onToggleExpand,
  todayAssignments,
  onStartActivity, onCompleteActivity,
  onPlanToday, onOpenRoadmap, onOpenDsa, onUpdateState, onDecomposeTask, onOpenLearning, onPostpone, onSkip,
  getDomain, todayISO,
}) => {
  const session = useContext(SessionContext);
  const activeAssignmentId = session?.currentActivity?.sourceAssignmentId ?? null;

  const activeIndex = activeAssignmentId
    ? assignedPlanTasks.findIndex((i) => i.assignmentId === activeAssignmentId)
    : -1;
  const nextIndex = assignedPlanTasks.findIndex(
    (item, index) => !item.completed && index > activeIndex
  );

  const visible = isPlanExpanded ? assignedPlanTasks : assignedPlanTasks.slice(0, 5);

  return (
    <TodaySection
      section="queue"
      mobileOrder={5}
      revealId="journey"
      revealed={revealed}
      observeRef={observeRef}
      data-testid="execution-queue"
      data-guide-target="today-daily-journey"
    >
      <SectionHeading
        right={
          isPlanCommitted ? (
            <span
              className="font-mono text-[11px] text-text-secondary"
              data-testid="plan-progress-counts"
              data-completed={completedPlanCount}
              data-total={assignedPlanTasks.length}
            >
              {completedPlanCount} / {assignedPlanTasks.length} assignments complete
            </span>
          ) : undefined
        }
      >
        Execution Queue
      </SectionHeading>

      {/* Active session panel — reused unchanged (§4). */}
      <div className="mt-3">
        <SessionDisplay onStartActivity={onStartActivity} onCompleteActivity={onCompleteActivity} />
      </div>

      <div className="mt-4" data-guide-target="today-plan-list">
        {!isPlanCommitted ? (
          /* Empty state: one line + tonal Plan Today (§7.1) — never filled. */
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border-default bg-surface-panel px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-sm text-text-secondary">
              No plan committed yet — Today falls back to your roadmap queue.
            </p>
            <TodayButton variant="tonal" onClick={onPlanToday}>
              <Sun className="size-3.5" aria-hidden="true" />
              Plan Today
            </TodayButton>
          </div>
        ) : (
          <>
            <ol className="flex flex-col gap-2">
              {visible.map((item, index) => {
                const isActive = !item.completed && item.assignmentId === activeAssignmentId;
                const isNext = index === nextIndex;
                const allocated =
                  todayAssignments.find((a) => a.id === item.assignmentId)?.allocatedMinutes;

                const rowState = isActive
                  ? 'border-border-active bg-surface-elevated'
                  : item.completed
                    ? 'border-border-default bg-surface-subtle'
                    : 'border-border-default bg-surface-panel';

                if (item.kind === 'task') {
                  const completedAt = hhmm(item.progress?.lastCompletedAt);
                  return (
                    <li
                      key={item.assignmentId}
                      aria-current={isActive ? 'step' : undefined}
                      className={`relative overflow-hidden rounded-lg border pl-3 transition-colors duration-200 ${rowState} ${
                        isActive ? 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent' : ''
                      }`}
                      data-queue-state={
                        item.completed ? 'completed' : isActive ? 'ACTIVE' : isNext ? 'NEXT' : 'planned'
                      }
                    >
                      {item.completed && completedAt ? (
                        <span className="absolute right-3 top-2 font-mono text-[10px] text-text-tertiary">
                          {completedAt}
                        </span>
                      ) : !item.completed && isActive ? (
                        <span className="absolute right-3 top-2 z-10">
                          <MonoChip micro tone="accent">ACTIVE</MonoChip>
                        </span>
                      ) : !item.completed && isNext ? (
                        <span className="absolute right-3 top-2 z-10">
                          <MonoChip micro tone="neutral">NEXT</MonoChip>
                        </span>
                      ) : null}
                      <TaskCard
                        task={item.task}
                        progress={item.progress}
                        domain={getDomain(item.task.domainId)}
                        onUpdateState={onUpdateState}
                        onDecomposeTask={onDecomposeTask}
                        onOpenLearning={onOpenLearning}
                        todayISO={todayISO}
                        onPostpone={onPostpone}
                        onSkip={onSkip}
                      />
                    </li>
                  );
                }

                return (
                  <li
                    key={item.assignmentId}
                    aria-current={isActive ? 'step' : undefined}
                    className={`relative flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-200 ${rowState}`}
                    data-queue-state={
                      item.completed ? 'completed' : isActive ? 'ACTIVE' : isNext ? 'NEXT' : 'planned'
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {item.completed ? (
                        <CheckCircle2 className="size-4 shrink-0 text-status-success" aria-hidden="true" />
                      ) : isActive ? (
                        <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      ) : (
                        <span className="size-2 shrink-0 rounded-full border border-border-active" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <MonoChip micro tone="neutral">DSA {item.taskType === 'dsa_review' ? 'Review' : 'Practice'}</MonoChip>
                          {isActive ? <MonoChip micro tone="accent">ACTIVE</MonoChip> : null}
                          {isNext ? <MonoChip micro tone="neutral">NEXT</MonoChip> : null}
                        </div>
                        <h3
                          className={`mt-1 truncate text-sm font-medium ${
                            item.completed ? 'text-text-secondary line-through opacity-60' : 'text-text-primary'
                          }`}
                        >
                          {item.problem.title}
                        </h3>
                        <p className="font-mono text-[11px] text-text-tertiary">
                          {item.problem.primaryPattern} · {item.problem.difficulty}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary">
                        <Clock className="size-3" aria-hidden="true" />
                        {allocated || item.problem.estimatedTimeMinutes}m
                      </span>
                      {item.completed ? (
                        <span className="flex items-center gap-1 text-xs text-status-success">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" /> completed
                        </span>
                      ) : (
                        <TodayButton
                          variant={isActive ? 'outline' : 'ghost'}
                          onClick={() => onOpenDsa(item.problem.id)}
                          data-testid={`solve-dsa-${item.problem.id}`}
                        >
                          Solve
                        </TodayButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {assignedPlanTasks.length > 5 && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-elevated hover:text-text-primary"
              >
                {isPlanExpanded ? (
                  <>
                    <span>Collapse List</span>
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>Show All ({assignedPlanTasks.length} Items)</span>
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onOpenRoadmap}
                className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
              >
                View Roadmap
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
    </TodaySection>
  );
};
