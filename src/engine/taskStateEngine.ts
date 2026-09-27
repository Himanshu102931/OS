import type { EvidenceLog, TaskDefinition, TaskProgress } from '../types';

/**
 * Daily-task defer/skip actions handled through the existing `updateTaskState`
 * path. They only touch the already-existing TaskProgress fields
 * (`postponeCount`, `skipCount`, `postponedUntil`) — no new persistence keys.
 *
 * - `postpone` defers the task using the engine's existing planning semantics:
 *   `getEvaluatedCandidates` excludes tasks whose `postponedUntil` is a future
 *   date, so a task postponed today returns to the plan once the date passes.
 * - `skip` records a friction/recovery signal (`skipCount`) without changing
 *   the task state, so the task is never treated as completed.
 *
 * Neither action emits evidence.
 */
export type TaskStateAction = 'postpone' | 'skip';

export interface TaskStateUpdateParams {
  taskId: string;
  /** Requested state. Ignored when `action` is set (existing state is preserved). */
  newState: TaskProgress['state'];
  action?: TaskStateAction;
  existing?: TaskProgress;
  /** Task definition — only needed to emit evidence on completion. */
  taskDef?: TaskDefinition;
  /** Epoch milliseconds — used for timestamps and evidence ids (deterministic in tests). */
  now: number;
  /** Today as YYYY-MM-DD — anchor used to schedule a postpone. */
  todayISO: string;
}

export interface TaskStateUpdateResult {
  progress: TaskProgress;
  /** Evidence log produced by this transition, or null when none is due. */
  evidence: EvidenceLog | null;
}

/** Adds one calendar day to a YYYY-MM-DD string (pure, timezone-independent). */
export function nextDayISO(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure TaskProgress transition used by `PlacementContext.updateTaskState`.
 *
 * Plain state changes (start / complete / reopen) behave exactly as before:
 * completion stamps `lastCompletedAt` and emits a `daily_assignment` evidence
 * log (score 80, confidence 4) when the task definition is known.
 *
 * Postpone/skip actions preserve the current state, never emit evidence, and
 * only bump the existing defer/skip counters.
 */
export function applyTaskStateUpdate(params: TaskStateUpdateParams): TaskStateUpdateResult {
  const { taskId, newState, action, existing, taskDef, now, todayISO } = params;
  const timestamp = new Date(now).toISOString();

  const base: TaskProgress = existing ?? {
    taskId,
    state: 'not_started',
    postponeCount: 0,
    skipCount: 0,
    timeSpentMinutes: 0,
    updatedAt: timestamp,
  };

  if (action === 'postpone') {
    return {
      progress: {
        ...base,
        postponeCount: base.postponeCount + 1,
        postponedUntil: nextDayISO(todayISO),
        updatedAt: timestamp,
      },
      evidence: null,
    };
  }

  if (action === 'skip') {
    return {
      progress: {
        ...base,
        skipCount: base.skipCount + 1,
        updatedAt: timestamp,
      },
      evidence: null,
    };
  }

  const isCompleting = newState === 'completed';
  const progress: TaskProgress = {
    ...base,
    state: newState,
    lastCompletedAt: isCompleting ? timestamp : base.lastCompletedAt,
    updatedAt: timestamp,
  };

  const evidence: EvidenceLog | null =
    isCompleting && taskDef
      ? {
          id: `evidence-task-${now}`,
          topicId: taskDef.topicId,
          domainId: taskDef.domainId,
          score: 80,
          confidence: 4,
          timestamp,
          sourceType: 'daily_assignment',
          sourceId: taskId,
        }
      : null;

  return { progress, evidence };
}
