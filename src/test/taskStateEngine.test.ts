import { describe, it, expect } from 'vitest';
import { applyTaskStateUpdate, applyTaskStateRestore, captureDeferRestore, nextDayISO, type TaskStateSlice } from '../engine/taskStateEngine';
import {
  calculateRecoveryUrgency,
  evaluateCandidateTask,
  getEvaluatedCandidates,
  selectDailyPlan,
} from '../engine/adaptiveEngine';
import type { CandidateTask } from '../engine/adaptiveEngine';
import type { TaskDefinition, TaskProgress, TopicSkillState } from '../types';

/**
 * Focused tests for the daily-task postpone/skip capability.
 *
 * State transitions run through `applyTaskStateUpdate` — the pure function
 * behind `PlacementContext.updateTaskState` — and plan/recovery expectations
 * use the EXISTING adaptive engine rules unchanged (postponedUntil exclusion,
 * 25/30/40 recovery formula, 50-point reason threshold).
 */

const TODAY = '2026-09-27';
const NOW = Date.parse('2026-09-27T09:00:00Z');

const makeTask = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'task-1',
  title: 'Defer Test Task',
  description: 'Task used to verify postpone/skip transitions',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 60,
  importance: 8,
  taskType: 'practice',
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

const makeProgress = (overrides: Partial<TaskProgress> = {}): TaskProgress => ({
  taskId: 'task-1',
  state: 'not_started',
  postponeCount: 0,
  skipCount: 0,
  timeSpentMinutes: 0,
  updatedAt: '2026-09-26T00:00:00Z',
  ...overrides,
});

const candidateIds = (candidates: CandidateTask[]): string[] => candidates.map((c) => c.task.id);

describe('Daily-task postpone/skip state transitions (updateTaskState path)', () => {
  it('postpone: increments postponeCount, schedules tomorrow, preserves state, emits no evidence', () => {
    const { progress, evidence } = applyTaskStateUpdate({
      taskId: 'task-1',
      newState: 'not_started',
      action: 'postpone',
      existing: makeProgress({ state: 'in_progress' }),
      now: NOW,
      todayISO: TODAY,
    });

    expect(progress.postponeCount).toBe(1);
    expect(progress.postponedUntil).toBe('2026-09-28');
    expect(progress.state).toBe('in_progress');
    expect(progress.state).not.toBe('completed');
    expect(progress.skipCount).toBe(0);
    expect(progress.updatedAt).toBe(new Date(NOW).toISOString());
    expect(evidence).toBeNull();
  });

  it('postpone: creates a default progress record for a task that was never touched', () => {
    const { progress, evidence } = applyTaskStateUpdate({
      taskId: 'task-new',
      newState: 'not_started',
      action: 'postpone',
      now: NOW,
      todayISO: TODAY,
    });

    expect(progress).toMatchObject({
      taskId: 'task-new',
      state: 'not_started',
      postponeCount: 1,
      skipCount: 0,
      postponedUntil: '2026-09-28',
      timeSpentMinutes: 0,
    });
    expect(evidence).toBeNull();
  });

  it('skip: increments skipCount, keeps the task open, emits no evidence', () => {
    const { progress, evidence } = applyTaskStateUpdate({
      taskId: 'task-1',
      newState: 'not_started',
      action: 'skip',
      existing: makeProgress({ state: 'in_progress' }),
      now: NOW,
      todayISO: TODAY,
    });

    expect(progress.skipCount).toBe(1);
    expect(progress.postponeCount).toBe(0);
    expect(progress.postponedUntil).toBeUndefined();
    expect(progress.state).toBe('in_progress');
    expect(progress.state).not.toBe('completed');
    expect(progress.lastCompletedAt).toBeUndefined();
    expect(evidence).toBeNull();
  });

  it('skip: cannot mark a task completed even if a completed state is requested', () => {
    const { progress, evidence } = applyTaskStateUpdate({
      taskId: 'task-1',
      newState: 'completed',
      action: 'skip',
      existing: makeProgress(),
      now: NOW,
      todayISO: TODAY,
    });

    expect(progress.state).toBe('not_started');
    expect(progress.lastCompletedAt).toBeUndefined();
    expect(evidence).toBeNull();
  });

  it('emits no evidence logs for postpone or skip transitions', () => {
    const postponed = applyTaskStateUpdate({
      taskId: 'task-1',
      newState: 'not_started',
      action: 'postpone',
      existing: makeProgress(),
      now: NOW,
      todayISO: TODAY,
    });
    const skipped = applyTaskStateUpdate({
      taskId: 'task-1',
      newState: 'not_started',
      action: 'skip',
      existing: makeProgress(),
      now: NOW,
      todayISO: TODAY,
    });

    expect(postponed.evidence).toBeNull();
    expect(skipped.evidence).toBeNull();
  });
});

describe('postponedUntil behavior with existing planning semantics', () => {
  it('nextDayISO adds one calendar day across month/year boundaries', () => {
    expect(nextDayISO('2026-09-27')).toBe('2026-09-28');
    expect(nextDayISO('2026-09-30')).toBe('2026-10-01');
    expect(nextDayISO('2026-12-31')).toBe('2027-01-01');
    expect(nextDayISO('2028-02-28')).toBe('2028-02-29'); // leap year
  });

  it('excludes a postponed task from candidates while postponedUntil is in the future', () => {
    const task = makeTask();
    const progress = makeProgress({ postponeCount: 1, postponedUntil: '2026-09-28' });

    const todayCandidates = getEvaluatedCandidates(
      [task],
      { [task.id]: progress },
      [],
      {},
      {},
      [],
      'normal',
      TODAY
    );
    expect(candidateIds(todayCandidates)).not.toContain(task.id);
  });

  it('returns a postponed task to the plan once the postponed date arrives', () => {
    const task = makeTask();
    const progress = makeProgress({ postponeCount: 1, postponedUntil: '2026-09-28' });

    const tomorrowCandidates = getEvaluatedCandidates(
      [task],
      { [task.id]: progress },
      [],
      {},
      {},
      [],
      'normal',
      '2026-09-28'
    );
    expect(candidateIds(tomorrowCandidates)).toContain(task.id);
  });

  it('keeps a task whose postpone already lapsed in today’s candidates', () => {
    const task = makeTask();
    const progress = makeProgress({ postponeCount: 1, postponedUntil: '2026-09-26' });

    const candidates = getEvaluatedCandidates(
      [task],
      { [task.id]: progress },
      [],
      {},
      {},
      [],
      'normal',
      TODAY
    );
    expect(candidateIds(candidates)).toContain(task.id);
  });
});

describe('Recovery signal activation with unchanged engine rules', () => {
  it('two postpones reach the existing 50-point recovery threshold and surface the reason', () => {
    const task = makeTask(); // no dueDate → no overdue contribution
    let progress = makeProgress();

    ({ progress } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'postpone',
      existing: progress,
      now: NOW,
      todayISO: TODAY,
    }));
    ({ progress } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'postpone',
      existing: progress,
      now: NOW + 86_400_000,
      todayISO: '2026-09-28',
    }));

    expect(progress.postponeCount).toBe(2);
    expect(progress.postponedUntil).toBe('2026-09-29');

    // Day 3: task re-enters the plan with recovery = 2 × 25 = 50 (existing formula/threshold)
    expect(calculateRecoveryUrgency(task, progress, '2026-09-29')).toBe(50);

    const candidates = getEvaluatedCandidates(
      [task],
      { [task.id]: progress },
      [],
      {},
      {},
      [],
      'normal',
      '2026-09-29'
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].breakdown.recoveryUrgency).toBe(50);
    expect(candidates[0].breakdown.explanation).toContain('repeatedly postponed / overdue recovery');
  });

  it('two skips activate the recovery reason without deferring or completing the task', () => {
    const task = makeTask();
    let progress = makeProgress();

    ({ progress } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'skip',
      existing: progress,
      now: NOW,
      todayISO: TODAY,
    }));
    ({ progress } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'skip',
      existing: progress,
      now: NOW + 60_000,
      todayISO: TODAY,
    }));

    expect(progress.skipCount).toBe(2);
    expect(progress.state).toBe('not_started');
    expect(progress.postponedUntil).toBeUndefined();
    expect(calculateRecoveryUrgency(task, progress, TODAY)).toBe(60); // 2 × 30, existing formula

    const candidates = getEvaluatedCandidates(
      [task],
      { [task.id]: progress },
      [],
      {},
      {},
      [],
      'normal',
      TODAY
    );
    expect(candidateIds(candidates)).toContain(task.id);
    expect(candidates[0].breakdown.explanation).toContain('repeatedly postponed / overdue recovery');
  });

  it('keeps the existing sub-threshold behavior: one postpone alone does not trigger the reason', () => {
    const task = makeTask();
    const progress = makeProgress({ postponeCount: 1 });

    const breakdown = evaluateCandidateTask(task, progress, undefined, undefined, {}, [], 'normal', TODAY);
    expect(breakdown.recoveryUrgency).toBe(25); // 1 × 25, threshold unchanged at 50
    expect(breakdown.explanation).not.toContain('repeatedly postponed / overdue recovery');
  });
});

describe('Plan behavior after postpone/skip', () => {
  const planTaskA = makeTask({ id: 'task-a', title: 'Task A' });
  const planTaskB = makeTask({ id: 'task-b', title: 'Task B' });
  const planTaskC = makeTask({ id: 'task-c', title: 'Task C' });
  const allTasks = [planTaskA, planTaskB, planTaskC];

  it('postpone: task leaves today’s plan; remaining budget math and uniqueness stay valid', () => {
    const { progress: postponed } = applyTaskStateUpdate({
      taskId: 'task-a',
      newState: 'not_started',
      action: 'postpone',
      existing: makeProgress({ taskId: 'task-a' }),
      now: NOW,
      todayISO: TODAY,
    });

    const candidates = getEvaluatedCandidates(
      allTasks,
      { 'task-a': postponed },
      [],
      {},
      {},
      [],
      'normal',
      TODAY
    );
    expect(candidateIds(candidates)).toEqual(['task-b', 'task-c']); // postponed excluded, no duplicates

    const plan = selectDailyPlan(candidates, 120);
    expect(candidateIds(plan)).toEqual(['task-b', 'task-c']);
    const totalMinutes = plan.reduce((sum, c) => sum + c.task.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(120);
    const ids = candidateIds(plan);
    expect(new Set(ids).size).toBe(ids.length); // no duplicate task assignments
  });

  it('postpone: recommitting a plan after the postpone date returns the task exactly once', () => {
    const { progress: postponed } = applyTaskStateUpdate({
      taskId: 'task-a',
      newState: 'not_started',
      action: 'postpone',
      existing: makeProgress({ taskId: 'task-a' }),
      now: NOW,
      todayISO: TODAY,
    });

    const nextDay = getEvaluatedCandidates(
      allTasks,
      { 'task-a': postponed },
      [],
      {},
      {},
      [],
      'normal',
      '2026-09-28'
    );
    expect(candidateIds(nextDay)).toEqual(['task-a', 'task-b', 'task-c']);
    const ids = candidateIds(nextDay);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skip: task is not treated as completed and remains an eligible plan candidate', () => {
    const { progress: skipped } = applyTaskStateUpdate({
      taskId: 'task-a',
      newState: 'not_started',
      action: 'skip',
      existing: makeProgress({ taskId: 'task-a' }),
      now: NOW,
      todayISO: TODAY,
    });

    expect(skipped.state).toBe('not_started');

    const candidates = getEvaluatedCandidates(
      allTasks,
      { 'task-a': skipped },
      [],
      {},
      {},
      [],
      'normal',
      TODAY
    );
    expect(candidateIds(candidates)).toContain('task-a'); // not excluded: skip sets no postponedUntil
    expect(candidateIds(candidates)).toHaveLength(3); // task counts unchanged
    expect(candidates.find((c) => c.task.id === 'task-a')?.progress?.state).not.toBe('completed');

    const plan = selectDailyPlan(candidates, 60);
    const ids = candidateIds(plan);
    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.reduce((sum, c) => sum + c.task.estimatedMinutes, 0)).toBeLessThanOrEqual(60);
  });
});

describe('Completion and reopen safety around postpone/skip', () => {
  it('completing after a postpone still emits the standard daily-assignment evidence', () => {
    const task = makeTask();
    const { progress: postponed } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'postpone',
      existing: makeProgress(),
      now: NOW,
      todayISO: TODAY,
    });

    const completed = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed',
      existing: postponed,
      taskDef: task,
      now: NOW + 3_600_000,
      todayISO: TODAY,
    });

    expect(completed.progress.state).toBe('completed');
    expect(completed.progress.postponeCount).toBe(1); // history preserved
    expect(completed.evidence).not.toBeNull();
    expect(completed.evidence).toMatchObject({
      sourceType: 'daily_assignment',
      sourceId: task.id,
      score: 80,
      confidence: 4,
      topicId: task.topicId,
      domainId: task.domainId,
    });
  });

  it('reopen/complete still works after a skip', () => {
    const task = makeTask();
    const { progress: skipped } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      action: 'skip',
      existing: makeProgress(),
      now: NOW,
      todayISO: TODAY,
    });

    const completed = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed',
      existing: skipped,
      taskDef: task,
      now: NOW + 3_600_000,
      todayISO: TODAY,
    });
    expect(completed.progress.state).toBe('completed');
    expect(completed.evidence).not.toBeNull();
    expect(completed.progress.skipCount).toBe(1);

    const reopened = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      existing: completed.progress,
      now: NOW + 7_200_000,
      todayISO: TODAY,
    });
    expect(reopened.progress.state).toBe('not_started');
    expect(reopened.progress.lastCompletedAt).toBe(completed.progress.lastCompletedAt);
    expect(reopened.evidence).toBeNull();

    const recommpleted = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed',
      existing: reopened.progress,
      taskDef: task,
      now: NOW + 10_800_000,
      todayISO: TODAY,
    });
    expect(recommpleted.progress.state).toBe('completed');
    expect(recommpleted.evidence).not.toBeNull();
    expect(recommpleted.evidence?.id).not.toBe(completed.evidence?.id); // completion semantics unchanged
  });
});

// ---------------------------------------------------------------------------
// C2 — idempotent completion + transactional undo (P0-01 … P0-03)
// ---------------------------------------------------------------------------

describe('C2 — completion idempotency and undo-equivalent restore', () => {
  /**
   * Mirrors the single write transaction in `PlacementContext.updateTaskState`
   * (progress + the one evidence event + the one skill update) so "exactly
   * one" can be asserted as a real count over state, not just a non-null field.
   */
  const skillTopicId = (s: TopicSkillState) => s.topicId;

  const runUpdate = (
    state: TaskStateSlice,
    params: Parameters<typeof applyTaskStateUpdate>[0]
  ): TaskStateSlice => {
    const { progress, evidence, skillUpdate } = applyTaskStateUpdate(params);
    return {
      taskProgress: { ...state.taskProgress, [params.taskId]: progress },
      skillStates: skillUpdate
        ? { ...state.skillStates, [skillTopicId(skillUpdate)]: skillUpdate }
        : state.skillStates,
      evidenceLogs: evidence ? [...state.evidenceLogs, evidence] : state.evidenceLogs,
    };
  };

  const emptySlice = (): TaskStateSlice => ({ taskProgress: {}, skillStates: {}, evidenceLogs: [] });

  const completionParams = (
    existing?: TaskProgress,
    existingSkill?: TopicSkillState
  ): Parameters<typeof applyTaskStateUpdate>[0] => ({
    taskId: 'task-1',
    newState: 'completed',
    existing,
    taskDef: makeTask(),
    existingSkill,
    now: NOW,
    todayISO: TODAY,
  });

  it('1. not_started → completed: task completed, exactly one evidence event, exactly one skill update', () => {
    const task = makeTask();
    const start: TaskStateSlice = {
      taskProgress: { 'task-1': makeProgress() },
      skillStates: {},
      evidenceLogs: [],
    };

    const after = runUpdate(start, completionParams(start.taskProgress['task-1']));

    expect(after.taskProgress['task-1'].state).toBe('completed');
    expect(after.evidenceLogs).toHaveLength(1);
    expect(after.evidenceLogs[0].sourceType).toBe('daily_assignment');
    expect(after.evidenceLogs[0].sourceId).toBe(task.id);
    expect(Object.keys(after.skillStates)).toHaveLength(1);
    expect(after.skillStates[task.topicId]).toBeDefined();
  });

  it('2. completed → completed: task unchanged, evidence === null, skillUpdate === null', () => {
    const first = runUpdate(
      { ...emptySlice(), taskProgress: { 'task-1': makeProgress() } },
      completionParams(makeProgress())
    );
    const once = structuredClone(first);

    // Direct contract …
    const repeat = applyTaskStateUpdate(completionParams(first.taskProgress['task-1'], first.skillStates['topic-dsa-arrays']));
    expect(repeat.evidence).toBeNull();
    expect(repeat.skillUpdate).toBeNull();
    expect(repeat.progress).toEqual(first.taskProgress['task-1']);

    // … and through the write transaction: no additional evidence, no additional skill update.
    const twice = runUpdate(first, completionParams(first.taskProgress['task-1'], first.skillStates['topic-dsa-arrays']));
    expect(twice.taskProgress['task-1']).toEqual(once.taskProgress['task-1']);
    expect(twice.evidenceLogs).toHaveLength(1);
    expect(twice.skillStates).toEqual(once.skillStates);
    // the transition is the duplicate test — no timestamp/id is consulted
    expect(twice.taskProgress['task-1'].updatedAt).toBe(once.taskProgress['task-1'].updatedAt);
  });

  it('3. postpone → undo-equivalent restore: exact previous TaskProgress restored', () => {
    const previous = makeProgress({ state: 'in_progress', timeSpentMinutes: 15 });
    const start: TaskStateSlice = {
      taskProgress: { 'task-1': previous },
      skillStates: {},
      evidenceLogs: [],
    };

    const snapshot = captureDeferRestore({ taskId: 'task-1', taskProgress: start.taskProgress, skillStates: start.skillStates, evidenceLogs: start.evidenceLogs });
    const postponed = runUpdate(start, {
      taskId: 'task-1',
      newState: 'in_progress',
      action: 'postpone',
      existing: previous,
      taskDef: makeTask(),
      now: NOW,
      todayISO: TODAY,
    });

    // the action really happened …
    expect(postponed.taskProgress['task-1'].postponeCount).toBe(1);
    expect(postponed.taskProgress['task-1'].postponedUntil).toBe('2026-09-28');
    // … and it changed nothing else
    expect(postponed.evidenceLogs).toHaveLength(0);
    expect(postponed.skillStates).toEqual({});

    const restored = applyTaskStateRestore(snapshot, postponed);

    expect(restored.taskProgress['task-1']).toEqual(previous);
    expect(restored.evidenceLogs).toEqual(postponed.evidenceLogs); // undo creates no evidence
    expect(restored.skillStates).toEqual(postponed.skillStates); // undo creates no skill side effect
  });

  it('4. skip → undo-equivalent restore: exact previous TaskProgress restored', () => {
    const previous = makeProgress({ state: 'in_progress', timeSpentMinutes: 40 });
    const start: TaskStateSlice = {
      taskProgress: { 'task-1': previous },
      skillStates: {},
      evidenceLogs: [],
    };

    const snapshot = captureDeferRestore({ taskId: 'task-1', taskProgress: start.taskProgress, skillStates: start.skillStates, evidenceLogs: start.evidenceLogs });
    const skipped = runUpdate(start, {
      taskId: 'task-1',
      newState: 'in_progress',
      action: 'skip',
      existing: previous,
      taskDef: makeTask(),
      now: NOW,
      todayISO: TODAY,
    });

    expect(skipped.taskProgress['task-1'].skipCount).toBe(1);
    expect(skipped.taskProgress['task-1'].state).toBe('in_progress');
    expect(skipped.evidenceLogs).toHaveLength(0);

    const restored = applyTaskStateRestore(snapshot, skipped);

    expect(restored.taskProgress['task-1']).toEqual(previous);
    expect(restored.evidenceLogs).toEqual(skipped.evidenceLogs);
    expect(restored.skillStates).toEqual(skipped.skillStates);
  });
});
