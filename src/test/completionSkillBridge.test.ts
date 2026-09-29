/**
 * Daily completion → skill-state bridge (+ evening-seal duplicate guard).
 *
 * Finalized decisions under test:
 *  A. EMA `clamp(0.7 × old + 0.3 × evidenceScore)` — never the DSA `+0.15`
 *     or practice `+0.20` additive formulas.
 *  B. Applied inside the normal completion transaction, derived from the SAME
 *     evidence object (skill ⇔ evidence lockstep).
 *  C. Evening seal emits no duplicate evidence/skill for a task already
 *     completed through Today; all other assignments keep existing behaviour.
 *  D. A first-time roadmap state seeds `oldStrength` from the bridged
 *     preparation strength (`getPreparationTopicIdByRoadmapId`).
 *  E. All five task types bridge.
 *  F. `fresh` + `lastPracticedAt = evidence.timestamp` + `domainId` from the
 *     evidence/task definition + preserved fields + clamp [0,100].
 *  G. Pure extension of `TaskStateUpdateResult`; `updateTaskState` remains the
 *     single write transaction.
 *
 * Adaptive formulas (`calculateWeakness`, candidate weights) and readiness
 * formulas are asserted UNCHANGED — only their inputs move.
 */
import { describe, it, expect } from 'vitest';
import {
  applyTaskStateUpdate,
  applyTaskStateRestore,
  captureCompletionRestore,
  computeCompletionSkillStrength,
  applySealAssignmentCompletion,
  type TaskStateSlice,
} from '../engine/taskStateEngine';
import { calculateWeakness, evaluateCandidateTask } from '../engine/adaptiveEngine';
import { calculateTopicReadiness } from '../engine/skillsEngine';
import { getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { TOPICS, DOMAINS, TASK_DEFINITIONS } from '../data/seedData';
import type {
  EvidenceLog,
  TaskDefinition,
  TaskProgress,
  TopicSkillState,
} from '../types';

const TODAY = '2026-09-27';
const NOW = Date.parse('2026-09-27T09:00:00Z');
const TS = new Date(NOW).toISOString();

const makeTask = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'task-bridge-1',
  title: 'Bridge Test Task',
  description: 'Task used to verify the completion → skill-state bridge',
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
  taskId: 'task-bridge-1',
  state: 'not_started',
  postponeCount: 0,
  skipCount: 0,
  timeSpentMinutes: 0,
  updatedAt: '2026-09-26T00:00:00Z',
  ...overrides,
});

const makeSkill = (
  overrides: Partial<TopicSkillState> & Pick<TopicSkillState, 'topicId'>
): TopicSkillState => ({
  domainId: 'dsa',
  freshness: 'untested',
  evidenceStrength: 0,
  ...overrides,
});

/** Runs a normal completion through the pure updateTaskState transition. */
const complete = (
  opts: {
    task?: TaskDefinition;
    existing?: TaskProgress;
    existingSkill?: TopicSkillState;
    bridgedPrepStrength?: number;
    now?: number;
  } = {}
) => {
  const task = opts.task ?? makeTask();
  return applyTaskStateUpdate({
    taskId: task.id,
    newState: 'completed',
    existing: opts.existing,
    taskDef: task,
    existingSkill: opts.existingSkill,
    bridgedPrepStrength: opts.bridgedPrepStrength,
    now: opts.now ?? NOW,
    todayISO: TODAY,
  });
};

describe('Completion → skill-state bridge (updateTaskState path)', () => {
  it('1. completion produces a skill update alongside the single evidence event', () => {
    const task = makeTask();
    const { progress, evidence, skillUpdate } = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed',
      existing: makeProgress(),
      taskDef: task,
      now: NOW,
      todayISO: TODAY,
    });

    expect(progress.state).toBe('completed');
    expect(evidence).not.toBeNull();
    expect(evidence?.score).toBe(80); // completion evidence semantics unchanged
    expect(skillUpdate).not.toBeNull();
    expect(skillUpdate?.topicId).toBe(task.topicId);
    expect(skillUpdate?.domainId).toBe(task.domainId);
    // lockstep: the skill update belongs to this very event
    expect(skillUpdate?.lastPracticedAt).toBe(evidence?.timestamp);
  });

  it('2. exact EMA: clamp(0.7 × old + 0.3 × evidenceScore) — not the additive formulas', () => {
    expect(computeCompletionSkillStrength(0, 80)).toBe(0.7 * 0 + 0.3 * 80); // 24
    expect(computeCompletionSkillStrength(40, 80)).toBe(0.7 * 40 + 0.3 * 80); // 52
    expect(computeCompletionSkillStrength(60, 80)).toBe(0.7 * 60 + 0.3 * 80); // 66
    expect(computeCompletionSkillStrength(100, 80)).toBe(0.7 * 100 + 0.3 * 80); // 94

    const seeded = complete({
      existingSkill: makeSkill({ topicId: 'topic-dsa-arrays', evidenceStrength: 40, freshness: 'aging' }),
    });
    expect(seeded.skillUpdate?.evidenceStrength).toBe(0.7 * 40 + 0.3 * 80);

    // explicitly NOT the DSA +0.15 / practice +0.20 additive formulas
    // (from 0: EMA = 24, DSA would be +12, practice would be +16)
    const fromZero = complete();
    expect(fromZero.skillUpdate?.evidenceStrength).toBe(0.7 * 0 + 0.3 * 80);
    expect(fromZero.skillUpdate?.evidenceStrength).not.toBe(Math.round(80 * 0.15));
    expect(fromZero.skillUpdate?.evidenceStrength).not.toBe(Math.round(80 * 0.2));
  });

  it('3. creates a brand-new skill state when the topic has none', () => {
    const { skillUpdate, evidence } = complete();

    expect(skillUpdate).not.toBeNull();
    expect(Object.keys(skillUpdate as TopicSkillState).sort()).toEqual([
      'domainId',
      'evidenceStrength',
      'freshness',
      'lastPracticedAt',
      'topicId',
    ]);
    expect(skillUpdate).toEqual({
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      freshness: 'fresh',
      lastPracticedAt: (evidence as EvidenceLog).timestamp,
      evidenceStrength: 0.7 * 0 + 0.3 * 80,
    });
  });

  it('4. first roadmap state seeds from the bridged preparation strength (D)', () => {
    // No own state + bridged prep strength 60 → EMA from 60, not from 0
    const seeded = complete({ bridgedPrepStrength: 60 });
    expect(seeded.skillUpdate?.evidenceStrength).toBe(0.7 * 60 + 0.3 * 80); // 66, not 24

    // Own state exists → bridged strength ignored (own state authoritative)
    const own = complete({
      existingSkill: makeSkill({ topicId: 'topic-dsa-arrays', evidenceStrength: 40 }),
      bridgedPrepStrength: 60,
    });
    expect(own.skillUpdate?.evidenceStrength).toBe(0.7 * 40 + 0.3 * 80); // 52

    // Neither exists → seeds from 0
    const fresh = complete();
    expect(fresh.skillUpdate?.evidenceStrength).toBe(0.7 * 0 + 0.3 * 80); // 24
  });

  it('5. accumulates across two completions and stays bounded', () => {
    // Two GENUINE completions: the task must be reopened in between, because
    // re-completing an already-completed task is now a no-op (P0-01) and no
    // longer produces a second event. The accumulation, distinct-event and
    // clamp assertions below are unchanged.
    const task = makeTask();
    const reopen = (existing?: TaskProgress, now = NOW) =>
      applyTaskStateUpdate({
        taskId: task.id,
        newState: 'not_started',
        existing,
        taskDef: task,
        now,
        todayISO: TODAY,
      });

    const first = complete();
    const second = complete({
      existing: reopen(first.progress, NOW + 500).progress,
      existingSkill: first.skillUpdate as TopicSkillState,
      now: NOW + 1_000,
    });

    expect(second.skillUpdate?.evidenceStrength).toBe(
      0.7 * (first.skillUpdate as TopicSkillState).evidenceStrength + 0.3 * 80
    );
    // each genuine completion emits its own event and the skill follows 1:1
    expect(second.evidence?.id).not.toBe(first.evidence?.id);

    // long run converges, never exceeds the clamp
    let acc: TopicSkillState | undefined;
    let prog: TaskProgress | undefined;
    for (let i = 0; i < 12; i++) {
      const reopened = reopen(prog, NOW + i);
      const r = complete({
        existing: reopened.progress,
        existingSkill: acc,
        now: NOW + i + 1,
      });
      acc = r.skillUpdate as TopicSkillState;
      prog = r.progress;
    }
    expect((acc as TopicSkillState).evidenceStrength).toBeGreaterThan(0);
    expect((acc as TopicSkillState).evidenceStrength).toBeLessThanOrEqual(100);
  });

  it('6. clamps strength to [0, 100]', () => {
    expect(computeCompletionSkillStrength(150, 80)).toBe(100);
    expect(computeCompletionSkillStrength(-50, 80)).toBe(0);
    expect(computeCompletionSkillStrength(100, 80)).toBe(0.7 * 100 + 0.3 * 80); // in range untouched

    // through the transition with out-of-range seeds
    expect(complete({ bridgedPrepStrength: 150 }).skillUpdate?.evidenceStrength).toBe(100);
    expect(complete({ bridgedPrepStrength: -50 }).skillUpdate?.evidenceStrength).toBe(0);
  });

  it('7. sets freshness/lastPracticedAt from the evidence and preserves existing fields (F)', () => {
    const existingSkill = makeSkill({
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      freshness: 'stale',
      evidenceStrength: 40,
      lastPracticedAt: '2026-09-01T00:00:00.000Z',
    });

    const { skillUpdate, evidence } = complete({ existingSkill });

    expect(skillUpdate?.freshness).toBe('fresh');
    expect(skillUpdate?.lastPracticedAt).toBe((evidence as EvidenceLog).timestamp);
    expect(skillUpdate?.lastPracticedAt).toBe(TS);
    expect(skillUpdate?.domainId).toBe((evidence as EvidenceLog).domainId);
    expect(skillUpdate?.topicId).toBe('topic-dsa-arrays');
    expect(skillUpdate?.evidenceStrength).toBe(0.7 * 40 + 0.3 * 80);
  });

  it('8. all five task types produce a skill update (E)', () => {
    const types: TaskDefinition['taskType'][] = [
      'learning',
      'practice',
      'project',
      'assessment',
      'review',
    ];

    for (const taskType of types) {
      const task = makeTask({ id: `task-${taskType}`, taskType });
      const { skillUpdate, evidence } = applyTaskStateUpdate({
        taskId: task.id,
        newState: 'completed',
        taskDef: task,
        now: NOW,
        todayISO: TODAY,
      });

      expect(skillUpdate, taskType).not.toBeNull();
      expect(evidence, taskType).not.toBeNull();
      expect(skillUpdate?.evidenceStrength, taskType).toBe(0.7 * 0 + 0.3 * 80);
      expect(skillUpdate?.topicId, taskType).toBe(task.topicId);
    }

    // the seed curriculum actually uses all five
    expect(
      Array.from(new Set(TASK_DEFINITIONS.map((t) => t.taskType))).sort()
    ).toEqual(['assessment', 'learning', 'practice', 'project', 'review']);
  });

  it('9. reopen / postpone / skip produce no skill update (no evidence → no skill)', () => {
    const task = makeTask();

    // reopen after a completion
    const completed = complete({ task });
    const reopened = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'not_started',
      existing: completed.progress,
      taskDef: task,
      existingSkill: completed.skillUpdate as TopicSkillState,
      now: NOW + 1,
      todayISO: TODAY,
    });
    expect(reopened.evidence).toBeNull();
    expect(reopened.skillUpdate).toBeNull();

    // postpone / skip — even with a task definition and skill state in scope
    const postponed = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed', // action overrides the requested state
      action: 'postpone',
      existing: makeProgress(),
      taskDef: task,
      existingSkill: makeSkill({ topicId: task.topicId, evidenceStrength: 40 }),
      now: NOW,
      todayISO: TODAY,
    });
    expect(postponed.evidence).toBeNull();
    expect(postponed.skillUpdate).toBeNull();

    const skipped = applyTaskStateUpdate({
      taskId: task.id,
      newState: 'completed', // action overrides the requested state
      action: 'skip',
      existing: makeProgress(),
      taskDef: task,
      existingSkill: makeSkill({ topicId: task.topicId, evidenceStrength: 40 }),
      now: NOW,
      todayISO: TODAY,
    });
    expect(skipped.evidence).toBeNull();
    expect(skipped.skillUpdate).toBeNull();
  });

  it('10. unknown task definition → no evidence and no skill update', () => {
    const res = applyTaskStateUpdate({
      taskId: 'task-ghost',
      newState: 'completed',
      existing: makeProgress({ taskId: 'task-ghost' }),
      existingSkill: makeSkill({ topicId: 'topic-dsa-arrays', evidenceStrength: 40 }),
      now: NOW,
      todayISO: TODAY,
    });

    expect(res.evidence).toBeNull();
    expect(res.skillUpdate).toBeNull();
  });

  it('11. skill computation never appends to or mutates evidence collections', () => {
    const existingLogs: EvidenceLog[] = [
      {
        id: 'evidence-task-prev',
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        score: 80,
        confidence: 4,
        timestamp: '2026-09-26T09:00:00.000Z',
        sourceType: 'daily_assignment',
        sourceId: 'task-other',
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(existingLogs));
    const frozenSkill = Object.freeze(
      makeSkill({ topicId: 'topic-dsa-arrays', evidenceStrength: 40 })
    );

    const res = complete({ existingSkill: frozenSkill });

    // inputs untouched — the skill math is pure
    expect(existingLogs).toEqual(snapshot);
    expect(Object.isFrozen(frozenSkill)).toBe(true);
    expect(frozenSkill.evidenceStrength).toBe(40);

    // exactly ONE new event per completion (what updateTaskState appends)
    const nextLogs = [...existingLogs, res.evidence as EvidenceLog];
    expect(nextLogs).toHaveLength(snapshot.length + 1);
    expect(res.evidence?.id).toBe(`evidence-task-${NOW}`);

    // the skill update is derived from that same event — no mirrored log
    expect(res.skillUpdate?.evidenceStrength).toBe(
      0.7 * 40 + 0.3 * (res.evidence as EvidenceLog).score
    );
  });
});

describe('Evening seal duplicate guard (C)', () => {
  const task = makeTask();

  it('12. already-completed task: no duplicate evidence, no second skill update, progress still recorded', () => {
    const existingProgress = makeProgress({
      state: 'completed',
      lastCompletedAt: '2026-09-27T08:00:00.000Z',
      timeSpentMinutes: 45,
    });

    const res = applySealAssignmentCompletion({
      reflection: {
        assignmentId: 'assign-1',
        completed: true,
        actualMinutes: 30,
        score: 90,
        confidence: 4,
      },
      task,
      existingProgress,
      existingSkill: makeSkill({ topicId: task.topicId, evidenceStrength: 52 }),
      now: NOW,
    });

    expect(res.evidence).toBeNull(); // completion already emitted its event
    expect(res.skillUpdate).toBeNull(); // completion already applied the EMA

    // progress bookkeeping is unaffected by the guard (unchanged seal behaviour)
    expect(res.progress.state).toBe('completed');
    expect(res.progress.timeSpentMinutes).toBe(75);
    expect(res.progress.updatedAt).toBe(TS);
  });

  it('13a. seal still records an assignment not completed through Today (existing behaviour)', () => {
    const res = applySealAssignmentCompletion({
      reflection: {
        assignmentId: 'assign-2',
        completed: true,
        actualMinutes: 30,
        score: 90,
        confidence: 5,
      },
      task,
      existingProgress: makeProgress(),
      existingSkill: makeSkill({ topicId: task.topicId, evidenceStrength: 70, freshness: 'aging' }),
      now: NOW,
    });

    expect(res.evidence).toMatchObject({
      id: `evidence-${NOW}-${task.id}`,
      topicId: task.topicId,
      domainId: task.domainId,
      score: 90,
      confidence: 5,
      sourceType: 'daily_assignment',
      sourceId: 'assign-2',
      timestamp: TS,
    });
    // seal EMA formula preserved exactly: round(0.7 × old + 0.3 × score)
    expect(res.skillUpdate?.evidenceStrength).toBe(Math.round(0.7 * 70 + 0.3 * 90));
    expect(res.skillUpdate?.freshness).toBe('fresh');
    expect(res.skillUpdate?.lastPracticedAt).toBe(TS);
    expect(res.progress.state).toBe('completed');
    expect(res.progress.timeSpentMinutes).toBe(30);
    expect(res.progress.lastCompletedAt).toBe(TS);
  });

  it('13b. seal keeps recording a genuinely uncompleted reflection exactly as before', () => {
    const res = applySealAssignmentCompletion({
      reflection: {
        assignmentId: 'assign-3',
        completed: false,
        actualMinutes: 20,
        score: 40,
        confidence: 2,
      },
      task,
      existingProgress: makeProgress(),
      now: NOW,
    });

    // existing seal behaviour: state reflects the reflection, minutes accumulate
    expect(res.progress.state).toBe('not_started');
    expect(res.progress.timeSpentMinutes).toBe(20);
    // and evidence + skill are still recorded (pre-guard behaviour preserved)
    expect(res.evidence).not.toBeNull();
    expect(res.evidence?.sourceId).toBe('assign-3');
    expect(res.skillUpdate).not.toBeNull();
    expect(res.skillUpdate?.evidenceStrength).toBe(Math.round(0.7 * 0 + 0.3 * 40));
  });

  it('13c. seal starts a never-touched assignment from the same defaults as before', () => {
    const res = applySealAssignmentCompletion({
      reflection: {
        assignmentId: 'assign-4',
        completed: true,
        actualMinutes: 25,
        score: 80,
        confidence: 4,
      },
      task: makeTask({ id: 'task-new' }),
      now: NOW,
    });

    expect(res.progress).toMatchObject({
      taskId: 'task-new',
      state: 'completed',
      postponeCount: 0,
      skipCount: 0,
      timeSpentMinutes: 25,
    });
    expect(res.evidence).not.toBeNull();
    expect(res.skillUpdate).not.toBeNull();
  });
});

describe('Engine reaction without changing formulas', () => {
  it('14. weakness reacts to the bridged skill state; adaptive formulas unchanged', () => {
    const task = makeTask();

    const before = calculateWeakness(task, {});
    expect(before).toBe(85); // 100 × 0.85 — untested default, formula unchanged

    const { skillUpdate } = complete({ task });
    const states = { [task.topicId]: skillUpdate as TopicSkillState };

    const after = calculateWeakness(task, states);
    expect(after).toBe(76); // (100 − 24) × 1.0 (fresh) — same formula, new state
    expect(after).toBeLessThan(before);

    // candidate scoring: same weights, different weakness input
    const progress = makeProgress();
    const bBefore = evaluateCandidateTask(task, progress, undefined, undefined, {}, [], 'normal', TODAY);
    const bAfter = evaluateCandidateTask(task, progress, undefined, undefined, states, [], 'normal', TODAY);

    expect(bBefore.weakness).toBe(85);
    expect(bAfter.weakness).toBe(76);
    expect(bAfter.baseScore).toBeCloseTo(
      0.25 * bAfter.urgency +
        0.20 * bAfter.weakness +
        0.20 * bAfter.importance +
        0.15 * bAfter.companyRelevance +
        0.10 * bAfter.spacedRepetition +
        0.10 * bAfter.recoveryUrgency,
      10
    );
    expect(bAfter.finalScore).toBeLessThan(bBefore.finalScore); // the engine learns
  });

  it('15. preparation/roadmap readiness does not regress when the bridge materializes an own state (D)', () => {
    const topic = TOPICS.find((t) => t.id === 'topic-sql-joins');
    const domain = DOMAINS.find((d) => d.id === topic?.domainId);
    const sqlTask = TASK_DEFINITIONS.find((t) => t.id === 'task-103');
    expect(topic).toBeDefined();
    expect(domain).toBeDefined();
    expect(sqlTask).toBeDefined();
    expect(getPreparationTopicIdByRoadmapId('topic-sql-joins')).toBe('prep-sql');

    const taskProgressMap: Record<string, TaskProgress> = {
      'task-103': {
        taskId: 'task-103',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-27T08:00:00.000Z',
        timeSpentMinutes: 50,
        updatedAt: '2026-09-27T08:00:00.000Z',
      },
    };
    const completionLog: EvidenceLog = {
      id: 'evidence-task-103',
      topicId: 'topic-sql-joins',
      domainId: 'sql',
      score: 80,
      confidence: 4,
      timestamp: '2026-09-27T08:00:00.000Z',
      sourceType: 'daily_assignment',
      sourceId: 'task-103',
    };
    // No own roadmap skill state; a bridged preparation state carries strength 60.
    const bridgedStates: Record<string, TopicSkillState> = {
      'prep-sql': {
        topicId: 'prep-sql',
        domainId: 'sql',
        freshness: 'fresh',
        evidenceStrength: 60,
        lastPracticedAt: '2026-09-26T10:00:00.000Z',
      },
    };

    const readinessWith = (skillStates: Record<string, TopicSkillState>) =>
      calculateTopicReadiness(
        topic as NonNullable<typeof topic>,
        domain as NonNullable<typeof domain>,
        TASK_DEFINITIONS,
        taskProgressMap,
        [],
        {},
        [],
        [completionLog],
        skillStates,
        [],
        TODAY
      );

    const before = readinessWith(bridgedStates); // world where the own state does not exist yet

    // the bridge materializes the own state — seeded from the bridged strength
    const skillUpdate = applyTaskStateUpdate({
      taskId: 'task-103',
      newState: 'completed',
      taskDef: sqlTask as TaskDefinition,
      bridgedPrepStrength: 60,
      now: NOW,
      todayISO: TODAY,
    }).skillUpdate as TopicSkillState;
    expect(skillUpdate.evidenceStrength).toBe(0.7 * 60 + 0.3 * 80); // 66, not 24

    const after = readinessWith({ ...bridgedStates, [topic!.id]: skillUpdate });

    // no regression purely because the own state materialized
    expect(after.evidenceStrength).toBeGreaterThanOrEqual(before.evidenceStrength);
    // the bridged preparation rating was not collapsed
    expect(after.evidenceStrength).toBeGreaterThanOrEqual(60);

    // documents what the seed prevents: an unseeded own state would erode readiness
    const naive = readinessWith({
      ...bridgedStates,
      [topic!.id]: { ...skillUpdate, evidenceStrength: 24 },
    });
    expect(naive.evidenceStrength).toBeLessThan(before.evidenceStrength);
  });
});

// ---------------------------------------------------------------------------
// C2 — the completion transaction is idempotent and exactly reversible
// (P0-01 duplicate credit, P0-02 undo must fully reverse completion)
// ---------------------------------------------------------------------------

describe('C2 — completion transaction: idempotent and exactly reversible', () => {
  const TASK = makeTask();

  const slice = (overrides: Partial<TaskStateSlice> = {}): TaskStateSlice => ({
    taskProgress: {},
    skillStates: {},
    evidenceLogs: [],
    ...overrides,
  });

  /** `PlacementContext.updateTaskState`'s single write transaction. */
  const applyCompletion = (
    state: TaskStateSlice,
    now = NOW
  ): TaskStateSlice => {
    const { progress, evidence, skillUpdate } = applyTaskStateUpdate({
      taskId: TASK.id,
      newState: 'completed',
      existing: state.taskProgress[TASK.id],
      taskDef: TASK,
      existingSkill: state.skillStates[TASK.topicId],
      now,
      todayISO: TODAY,
    });
    return {
      taskProgress: { ...state.taskProgress, [TASK.id]: progress },
      skillStates: skillUpdate
        ? { ...state.skillStates, [skillTopicId(skillUpdate)]: skillUpdate }
        : state.skillStates,
      evidenceLogs: evidence ? [...state.evidenceLogs, evidence] : state.evidenceLogs,
    };
  };

  const skillTopicId = (s: TopicSkillState) => s.topicId;

  /** DashboardView's capture, taken from the render BEFORE completion is issued. */
  const capture = (state: TaskStateSlice) =>
    captureCompletionRestore({
      taskId: TASK.id,
      taskDef: TASK,
      taskProgress: state.taskProgress,
      skillStates: state.skillStates,
      evidenceLogs: state.evidenceLogs,
    });

  it('1. first completion updates skill exactly once', () => {
    const before = slice({ taskProgress: { [TASK.id]: makeProgress() } });
    const after = applyCompletion(before);

    expect(after.evidenceLogs).toHaveLength(1);
    expect(after.evidenceLogs[0].sourceId).toBe(TASK.id);
    expect(Object.keys(after.skillStates)).toHaveLength(1);
    expect(after.skillStates[TASK.topicId]).toBeDefined();
    expect(after.skillStates[TASK.topicId].evidenceStrength).toBe(
      0.7 * 0 + 0.3 * after.evidenceLogs[0].score
    );
  });

  it('2. re-completion produces no second skill update and no second evidence event', () => {
    const before = slice({ taskProgress: { [TASK.id]: makeProgress() } });
    const once = applyCompletion(before);
    const snapshotOfOnce = structuredClone(once);

    const twice = applyCompletion(once, NOW + 1_000);

    // the state transition itself is the duplicate test — no id/timestamp involved
    expect(twice.taskProgress[TASK.id]).toEqual(once.taskProgress[TASK.id]);
    expect(twice.evidenceLogs).toHaveLength(1);
    expect(twice.skillStates).toEqual(snapshotOfOnce.skillStates);
    expect(twice.skillStates[TASK.topicId].evidenceStrength).toBe(
      snapshotOfOnce.skillStates[TASK.topicId].evidenceStrength
    );
  });

  it('3. completion undo restores the exact previous skill state (snapshot, not inverse math)', () => {
    const priorSkill = makeSkill({
      topicId: TASK.topicId,
      evidenceStrength: 55,
      freshness: 'stale',
      lastPracticedAt: '2026-09-20T10:00:00.000Z',
    });
    const priorProgress = makeProgress({
      state: 'in_progress',
      postponeCount: 2,
      timeSpentMinutes: 30,
      lastCompletedAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-26T12:00:00.000Z',
    });
    const before = slice({
      taskProgress: { [TASK.id]: priorProgress },
      skillStates: { [TASK.topicId]: priorSkill },
    });

    const snapshot = capture(before);
    const after = applyCompletion(before);
    expect(after.skillStates[TASK.topicId].evidenceStrength).toBeGreaterThan(55); // credit applied

    const restored = applyTaskStateRestore(snapshot, after);

    expect(restored.skillStates[TASK.topicId]).toEqual(priorSkill);
    expect(restored.skillStates[TASK.topicId].evidenceStrength).toBe(55);
    expect(restored.taskProgress[TASK.id]).toEqual(priorProgress);
    expect(restored.taskProgress[TASK.id].lastCompletedAt).toBe('2026-09-25T10:00:00.000Z');
    expect(restored.evidenceLogs).toHaveLength(0);
  });

  it('4. completion undo does not alter unrelated skill or evidence records', () => {
    const unrelatedSkill = makeSkill({ topicId: 'topic-dsa-graphs', evidenceStrength: 71 });
    const unrelatedEvidence: EvidenceLog = {
      id: 'ev-dsa-1',
      topicId: 'topic-dsa-graphs',
      domainId: 'dsa',
      score: 90,
      confidence: 4,
      timestamp: TS,
      sourceType: 'dsa_attempt',
      sourceId: 'dsa-1',
    };
    // an earlier completion cycle's evidence for the SAME task must survive
    const priorCompletionEvidence: EvidenceLog = {
      id: 'evidence-task-bridge-1-previous-cycle',
      topicId: TASK.topicId,
      domainId: 'dsa',
      score: 80,
      confidence: 4,
      timestamp: TS,
      sourceType: 'daily_assignment',
      sourceId: TASK.id,
    };

    const before = slice({
      taskProgress: { [TASK.id]: makeProgress() },
      skillStates: {
        [TASK.topicId]: makeSkill({ topicId: TASK.topicId, evidenceStrength: 40 }),
        'topic-dsa-graphs': unrelatedSkill,
      },
      evidenceLogs: [unrelatedEvidence, priorCompletionEvidence],
    });

    const snapshot = capture(before);
    const after = applyCompletion(before);
    expect(after.evidenceLogs).toHaveLength(3); // 2 pre-existing + exactly 1 new

    const restored = applyTaskStateRestore(snapshot, after);

    // only the evidence THIS transaction added is gone
    expect(restored.evidenceLogs.map((l) => l.id).sort()).toEqual(
      ['ev-dsa-1', 'evidence-task-bridge-1-previous-cycle'].sort()
    );
    // unrelated skill untouched; the task's own skill returned to its snapshot
    expect(restored.skillStates['topic-dsa-graphs']).toEqual(unrelatedSkill);
    expect(restored.skillStates[TASK.topicId]).toEqual(before.skillStates[TASK.topicId]);
    expect(restored.skillStates[TASK.topicId].evidenceStrength).toBe(40);
  });
});
