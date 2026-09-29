/**
 * C2 — Today's Completion / Postpone / Skip transactions, end to end.
 *
 * These run the SAME call sequence `DashboardView` issues (capture → action →
 * undo) through the same pure engine functions `PlacementContext` calls, so a
 * failure here means the real UI path is broken rather than a test double.
 * Persistence is asserted through `StorageAdapter` save/load, not through
 * React component state.
 *
 * Invariants under test:
 *  - one legitimate completion ⇒ 1 transition + 1 evidence event + 1 skill update
 *  - pressing completion again   ⇒ 0 additional evidence, 0 additional skill updates
 *  - completion then undo        ⇒ exact pre-completion task AND skill state,
 *                                  completion evidence absent, unrelated state unchanged
 *  - postpone / skip then undo   ⇒ exact pre-action TaskProgress restored
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyTaskStateUpdate,
  applyTaskStateRestore,
  captureCompletionRestore,
  captureDeferRestore,
  isTaskCompletionEvidence,
  type TaskStateRestore,
  type TaskStateSlice,
} from '../engine/taskStateEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import { TASK_DEFINITIONS } from '../data/seedData';
import type { TaskProgress } from '../types';

const TODAY = '2026-09-27';
const NOW = Date.parse('2026-09-27T09:00:00Z');

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

const TASK = TASK_DEFINITIONS[0];

// ---------------------------------------------------------------------------
// Harness mirroring DashboardView + PlacementContext
// ---------------------------------------------------------------------------

/**
 * `PlacementContext.updateTaskState` — the single write transaction
 * (progress + the one evidence event + the one skill update).
 */
const writeUpdate = (
  state: TaskStateSlice,
  taskId: string,
  newState: TaskProgress['state'],
  action?: 'postpone' | 'skip',
  now = NOW
): TaskStateSlice => {
  const taskDef = TASK_DEFINITIONS.find((t) => t.id === taskId);
  const ownSkill = taskDef ? state.skillStates[taskDef.topicId] : undefined;
  const { progress, evidence, skillUpdate } = applyTaskStateUpdate({
    taskId,
    newState,
    action,
    existing: state.taskProgress[taskId],
    taskDef,
    existingSkill: ownSkill,
    now,
    todayISO: TODAY,
  });

  return {
    taskProgress: { ...state.taskProgress, [taskId]: progress },
    skillStates: skillUpdate
      ? { ...state.skillStates, [skillUpdate.topicId]: skillUpdate }
      : state.skillStates,
    evidenceLogs: evidence ? [...state.evidenceLogs, evidence] : state.evidenceLogs,
  };
};

/**
 * `PlacementContext.restoreTaskTransaction` — applies a captured snapshot
 * verbatim. Never creates evidence, never recomputes a skill value.
 */
const writeRestore = (state: TaskStateSlice, restore: TaskStateRestore): TaskStateSlice =>
  applyTaskStateRestore(restore, state);

/**
 * `DashboardView` today-flow: carries the snapshot between the action and its
 * undo, exactly as the component's state does.
 */
const createTodayFlow = (initial: TaskStateSlice) => {
  let state: TaskStateSlice = {
    taskProgress: { ...initial.taskProgress },
    skillStates: { ...initial.skillStates },
    evidenceLogs: [...initial.evidenceLogs],
  };
  let completionSnapshot: TaskStateRestore | null = null;
  let deferSnapshot: TaskStateRestore | null = null;

  return {
    get state() { return state; },
    get completionSnapshot() { return completionSnapshot; },
    get deferSnapshot() { return deferSnapshot; },

    /** `handleUpdateTaskStateWithToast(taskId, 'completed')`. */
    complete(taskId: string, now = NOW) {
      const prevState = state.taskProgress[taskId]?.state ?? 'not_started';
      const openingNewCompletion = prevState !== 'completed';
      // The snapshot is taken BEFORE the transition — never after.
      const snapshot = openingNewCompletion
        ? captureCompletionRestore({
            taskId,
            taskDef: TASK_DEFINITIONS.find((t) => t.id === taskId),
            taskProgress: state.taskProgress,
            skillStates: state.skillStates,
            evidenceLogs: state.evidenceLogs,
          })
        : null;

      state = writeUpdate(state, taskId, 'completed', undefined, now);
      // A repeat call must not replace the original snapshot with one whose
      // previousState is 'completed' — that would neuter Undo.
      if (snapshot) completionSnapshot = snapshot;
    },

    /** `handleUndoCompletion`. */
    undoCompletion() {
      if (!completionSnapshot) return;
      state = writeRestore(state, completionSnapshot);
      completionSnapshot = null;
    },

    /** `handlePostponeClick` / `handleSkipClick` — capture only, no write. */
    stageDefer(taskId: string, action: 'postpone' | 'skip') {
      deferSnapshot = captureDeferRestore({
        taskId,
        taskDef: TASK_DEFINITIONS.find((t) => t.id === taskId),
        taskProgress: state.taskProgress,
        skillStates: state.skillStates,
        evidenceLogs: state.evidenceLogs,
      });
      return action;
    },

    /** `handleConfirmAction` — issues the staged action. */
    confirmDefer(taskId: string, action: 'postpone' | 'skip', now = NOW) {
      state = writeUpdate(state, taskId, state.taskProgress[taskId]?.state ?? 'not_started', action, now);
    },

    /** `handleUndoAction`. */
    undoDefer() {
      if (!deferSnapshot) return;
      state = writeRestore(state, deferSnapshot);
      deferSnapshot = null;
    },
  };
};

const makeInitial = (): TaskStateSlice => ({
  taskProgress: {
    [TASK.id]: {
      taskId: TASK.id,
      state: 'in_progress',
      postponeCount: 1,
      skipCount: 1,
      timeSpentMinutes: 25,
      lastCompletedAt: '2026-09-25T10:00:00.000Z',
      postponedUntil: '2026-09-26', // a lapsed defer, still in the persisted record
      updatedAt: '2026-09-26T12:00:00.000Z',
    },
  },
  skillStates: {
    [TASK.topicId]: {
      topicId: TASK.topicId,
      domainId: TASK.domainId,
      freshness: 'stale',
      evidenceStrength: 55,
      lastPracticedAt: '2026-09-20T10:00:00.000Z',
    },
  },
  evidenceLogs: [],
});

const countCompletionEvidence = (state: TaskStateSlice) =>
  state.evidenceLogs.filter((log) => isTaskCompletionEvidence(log, TASK.id)).length;

describe('Today — completion / postpone / skip transactions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. complete → undo restores the exact pre-completion state', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    flow.complete(TASK.id);

    expect(flow.state.taskProgress[TASK.id].state).toBe('completed');
    expect(countCompletionEvidence(flow.state)).toBe(1);
    expect(flow.state.skillStates[TASK.topicId].evidenceStrength).toBeGreaterThan(55);

    flow.undoCompletion();

    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.skillStates[TASK.topicId]).toEqual(start.skillStates[TASK.topicId]);
    expect(flow.state.evidenceLogs).toHaveLength(0);
    expect(flow.state.evidenceLogs).toEqual(start.evidenceLogs);
  });

  it('2. complete → save → reload hydrates the transaction; undo survives a reload', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);
    flow.complete(TASK.id);

    const persist = (slice: TaskStateSlice) => {
      const storage: AppExtendedStorageState = {
        ...getDefaultStorageState(),
        taskProgress: { ...getDefaultStorageState().taskProgress, ...slice.taskProgress },
        skillStates: { ...getDefaultStorageState().skillStates, ...slice.skillStates },
        evidenceLogs: slice.evidenceLogs,
      };
      StorageAdapter.saveState(storage);
      const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
      return {
        taskProgress: reloaded.taskProgress,
        skillStates: reloaded.skillStates,
        evidenceLogs: reloaded.evidenceLogs || [],
      };
    };

    // hydration-equivalent state after the completion
    const hydratedAfterComplete = persist(flow.state);
    expect(hydratedAfterComplete.taskProgress[TASK.id].state).toBe('completed');
    expect(hydratedAfterComplete.evidenceLogs.filter((l) => isTaskCompletionEvidence(l, TASK.id))).toHaveLength(1);
    expect(hydratedAfterComplete.skillStates[TASK.topicId].evidenceStrength).toBe(
      flow.state.skillStates[TASK.topicId].evidenceStrength
    );

    // undo the HYDRATED state (not a React-only copy) and persist again
    const undone = writeRestore(
      {
        taskProgress: hydratedAfterComplete.taskProgress,
        skillStates: hydratedAfterComplete.skillStates,
        evidenceLogs: hydratedAfterComplete.evidenceLogs,
      },
      flow.completionSnapshot as TaskStateRestore
    );
    const hydratedAfterUndo = persist(undone);

    expect(hydratedAfterUndo.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(hydratedAfterUndo.skillStates[TASK.topicId]).toEqual(start.skillStates[TASK.topicId]);
    expect(hydratedAfterUndo.evidenceLogs).toHaveLength(0);
  });

  it('3. postpone → undo restores postponeCount and postponedUntil exactly', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    flow.stageDefer(TASK.id, 'postpone');
    flow.confirmDefer(TASK.id, 'postpone');

    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(2);
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-28');
    expect(countCompletionEvidence(flow.state)).toBe(0);
    expect(flow.state.evidenceLogs).toHaveLength(0); // postpone emits no evidence

    flow.undoDefer();

    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(1); // restored, not re-incremented
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-26'); // previous value back
    expect(flow.state.evidenceLogs).toHaveLength(0); // undo creates no evidence
    expect(flow.state.skillStates).toEqual(start.skillStates); // undo creates no skill side effect
  });

  it('3b. postpone → undo removes postponedUntil when the task had none before', () => {
    const start = makeInitial();
    delete (start.taskProgress[TASK.id] as { postponedUntil?: string }).postponedUntil;
    const flow = createTodayFlow(start);

    flow.stageDefer(TASK.id, 'postpone');
    flow.confirmDefer(TASK.id, 'postpone');
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-28');

    flow.undoDefer();
    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBeUndefined();
  });

  it('4. skip → undo restores skipCount and every other field exactly', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    flow.stageDefer(TASK.id, 'skip');
    flow.confirmDefer(TASK.id, 'skip');

    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(2);
    expect(flow.state.taskProgress[TASK.id].state).toBe('in_progress'); // skip never completes

    flow.undoDefer();

    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(1);
    expect(flow.state.evidenceLogs).toHaveLength(0);
    expect(flow.state.skillStates).toEqual(start.skillStates);
  });

  it('5. re-completing an already-completed task adds nothing and keeps Undo valid', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    flow.complete(TASK.id);
    const afterFirst = {
      taskProgress: { ...flow.state.taskProgress },
      skillStates: { ...flow.state.skillStates },
      evidenceLogs: [...flow.state.evidenceLogs],
    };
    const firstSnapshot = flow.completionSnapshot as TaskStateRestore;

    flow.complete(TASK.id, NOW + 1_000); // press completion again

    expect(flow.state.taskProgress[TASK.id]).toEqual(afterFirst.taskProgress[TASK.id]);
    expect(flow.state.evidenceLogs).toHaveLength(1); // 0 additional evidence events
    expect(flow.state.skillStates).toEqual(afterFirst.skillStates); // 0 additional skill updates
    // the ORIGINAL snapshot survived, so Undo still reverses the real completion
    expect(flow.completionSnapshot).toEqual(firstSnapshot);
    expect(flow.completionSnapshot?.previousProgress).toEqual(start.taskProgress[TASK.id]);

    flow.undoCompletion();
    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.evidenceLogs).toHaveLength(0);
  });

  it('6. evidence count before/after every operation', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    expect(flow.state.evidenceLogs).toHaveLength(0); // before

    flow.complete(TASK.id);
    expect(flow.state.evidenceLogs).toHaveLength(1); // after completion

    flow.complete(TASK.id, NOW + 1); // re-complete
    expect(flow.state.evidenceLogs).toHaveLength(1); // unchanged

    flow.undoCompletion();
    expect(flow.state.evidenceLogs).toHaveLength(0); // after undo

    flow.stageDefer(TASK.id, 'postpone');
    flow.confirmDefer(TASK.id, 'postpone');
    expect(flow.state.evidenceLogs).toHaveLength(0); // postpone emits none

    flow.undoDefer();
    expect(flow.state.evidenceLogs).toHaveLength(0); // undo emits none

    flow.stageDefer(TASK.id, 'skip');
    flow.confirmDefer(TASK.id, 'skip');
    expect(flow.state.evidenceLogs).toHaveLength(0); // skip emits none

    flow.undoDefer();
    expect(flow.state.evidenceLogs).toHaveLength(0);
  });

  it('7/8/9. postponeCount, skipCount, postponedUntil and lastCompletedAt across completion + undo', () => {
    const start = makeInitial();
    const flow = createTodayFlow(start);

    // completion + undo
    expect(flow.state.taskProgress[TASK.id].lastCompletedAt).toBe('2026-09-25T10:00:00.000Z');
    flow.complete(TASK.id);
    expect(flow.state.taskProgress[TASK.id].lastCompletedAt).toBe(new Date(NOW).toISOString());
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(1);
    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(1);
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-26');
    flow.undoCompletion();
    expect(flow.state.taskProgress[TASK.id].lastCompletedAt).toBe('2026-09-25T10:00:00.000Z'); // restored
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(1);
    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(1);
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-26');

    // postpone + undo
    flow.stageDefer(TASK.id, 'postpone');
    flow.confirmDefer(TASK.id, 'postpone');
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(2);
    flow.undoDefer();
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(1);
    expect(flow.state.taskProgress[TASK.id].postponedUntil).toBe('2026-09-26');
    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(1);

    // skip + undo
    flow.stageDefer(TASK.id, 'skip');
    flow.confirmDefer(TASK.id, 'skip');
    expect(flow.state.taskProgress[TASK.id].skipCount).toBe(2);
    expect(flow.state.taskProgress[TASK.id].postponeCount).toBe(1);
    flow.undoDefer();
    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);

    // the whole flow is still exactly where it started
    expect(flow.state.taskProgress[TASK.id]).toEqual(start.taskProgress[TASK.id]);
    expect(flow.state.skillStates).toEqual(start.skillStates);
    expect(flow.state.evidenceLogs).toEqual(start.evidenceLogs);
  });
});
