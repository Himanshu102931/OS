import { describe, it, expect } from 'vitest';
import {
  explainTaskLock,
  resolveRoadmapTarget,
} from '../engine/prerequisiteNavigation';
import { evaluateTaskPrerequisites } from '../engine/taskStateEngine';
import { getEvaluatedCandidates } from '../engine/adaptiveEngine';
import { isProblemUnlocked } from '../engine/dsaEngine';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type { TaskDefinition, TaskProgress, Topic } from '../types';

/**
 * Prerequisite navigation is a presentation layer over the canonical gates.
 * These tests pin down the explanation, the chain, the phase separation and
 * the fact that no route is ever invented.
 */

const TOPICS: Topic[] = [
  {
    id: 'topic-dsa-arrays',
    moduleId: 'mod-dsa',
    domainId: 'dsa',
    name: 'Arrays & Two Pointers',
    description: 'Arrays',
    importance: 8,
  },
  {
    id: 'topic-dsa-hashtable',
    moduleId: 'mod-dsa',
    domainId: 'dsa',
    name: 'Hash Tables',
    description: 'Hashing',
    importance: 7,
  },
];

const makeTask = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'task-a',
  title: 'Task A',
  description: 'Task A description',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 30,
  importance: 5,
  taskType: 'learning',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const progress = (taskId: string, state: TaskProgress['state']): TaskProgress => ({
  taskId,
  state,
  postponeCount: 0,
  skipCount: 0,
  timeSpentMinutes: 0,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const explain = (
  task: TaskDefinition,
  taskDefinitions: TaskDefinition[],
  taskProgress: Record<string, TaskProgress> = {},
  activePhase: number = 1
) =>
  explainTaskLock({
    task,
    taskProgress,
    taskDefinitions,
    topics: TOPICS,
    activePhase,
  });

describe('F-PRE-NAV: locked task identifies the exact prerequisite', () => {
  const taskA = makeTask({ id: 'task-a', title: 'Prereq A' });
  const taskB = makeTask({
    id: 'task-b',
    title: 'Task B',
    prerequisiteTaskDefinitionIds: ['task-a'],
  });
  const definitions = [taskA, taskB];

  it('names the single blocking prerequisite, its state and its category', () => {
    const lock = explain(taskB, definitions);

    expect(lock.isPrerequisiteBlocked).toBe(true);
    expect(lock.isPhaseLocked).toBe(false);
    expect(lock.isLocked).toBe(true);
    expect(lock.unmetPrerequisiteIds).toEqual(['task-a']);
    expect(lock.blockers).toHaveLength(1);

    const blocker = lock.blockers[0];
    expect(blocker.category).toBe('incomplete');
    expect(blocker.prerequisiteTaskId).toBe('task-a');
    expect(blocker.prerequisiteTitle).toBe('Prereq A');
    expect(blocker.prerequisiteState).toBe('not_started');
    expect(blocker.prerequisiteTopicId).toBe('topic-dsa-arrays');
    expect(blocker.reason).toContain('Prereq A');
    expect(blocker.reason).toContain('not started');
  });

  it('reports every unmet prerequisite in declaration order', () => {
    const taskA2 = makeTask({ id: 'task-a2', title: 'Prereq A2' });
    const multi = makeTask({
      id: 'task-m',
      title: 'Multi',
      prerequisiteTaskDefinitionIds: ['task-a2', 'task-a'],
    });

    const lock = explain(multi, [taskA, taskA2, multi]);

    expect(lock.unmetPrerequisiteIds).toEqual(['task-a2', 'task-a']);
    expect(lock.blockers.map((b) => b.prerequisiteTaskId)).toEqual([
      'task-a2',
      'task-a',
    ]);
    expect(lock.prerequisiteActions.map((a) => a.targetId)).toEqual([
      'task-a2',
      'task-a',
    ]);
  });

  it('mirrors the canonical prerequisite evaluator exactly', () => {
    const lock = explain(taskB, definitions);
    const canonical = evaluateTaskPrerequisites(taskB, {});

    expect(lock.unmetPrerequisiteIds).toEqual(canonical.unmetPrerequisiteIds);
    expect(lock.isPrerequisiteBlocked).toBe(canonical.isBlocked);
  });

  it('surfaces an in-progress prerequisite as incomplete, not missing', () => {
    const lock = explain(taskB, definitions, {
      'task-a': progress('task-a', 'in_progress'),
    });

    expect(lock.blockers[0].prerequisiteState).toBe('in_progress');
    expect(lock.blockers[0].reason).toContain('in progress');
    expect(lock.prerequisiteActions).toHaveLength(1);
  });

  it('explains an archived prerequisite with its real state', () => {
    const lock = explain(taskB, definitions, {
      'task-a': progress('task-a', 'archived'),
    });

    expect(lock.blockers[0].prerequisiteState).toBe('archived');
    expect(lock.blockers[0].reason).toContain('archived');
  });

  it('unlocks the target once the prerequisite is completed', () => {
    const lock = explain(taskB, definitions, {
      'task-a': progress('task-a', 'completed'),
    });

    expect(lock.isPrerequisiteBlocked).toBe(false);
    expect(lock.isLocked).toBe(false);
    expect(lock.blockers).toEqual([]);
    expect(lock.prerequisiteActions).toEqual([]);
    expect(lock.dependencyTrail).toEqual([]);
    expect(lock.whyCannotStart).toBe('');
  });

  it('offers only real routes — never a phantom target', () => {
    const lock = explain(taskB, definitions);

    expect(lock.prerequisiteActions).toEqual([
      { route: 'roadmap', targetId: 'task-a', label: 'Prereq A' },
    ]);
    for (const action of lock.prerequisiteActions) {
      const resolved = resolveRoadmapTarget(action.targetId, TOPICS, definitions);
      expect(resolved.topic).toBeDefined();
      expect(resolved.taskId).toBe(action.targetId);
    }
  });
});

describe('F-PRE-NAV: missing prerequisite is handled safely', () => {
  const taskGhost = makeTask({
    id: 'task-b',
    title: 'Task B',
    prerequisiteTaskDefinitionIds: ['ghost-task'],
  });

  it('names the unresolvable id and offers no navigation action', () => {
    const lock = explain(taskGhost, [taskGhost]);

    expect(lock.isPrerequisiteBlocked).toBe(true);
    expect(lock.blockers).toHaveLength(1);
    expect(lock.blockers[0].category).toBe('unresolved');
    expect(lock.blockers[0].prerequisiteTaskId).toBe('ghost-task');
    expect(lock.blockers[0].prerequisiteState).toBe('missing');
    expect(lock.prerequisiteActions).toEqual([]);
    expect(lock.whyCannotStart).toContain('ghost-task');
  });

  it('keeps the unresolvable hop visible in the trail as unresolvable', () => {
    const lock = explain(taskGhost, [taskGhost]);

    expect(lock.dependencyTrail).toEqual([
      { taskId: 'ghost-task', title: 'ghost-task', state: 'missing', resolvable: false },
    ]);
  });

  it('does not navigate when a prerequisite exists but its topic does not', () => {
    const orphanPrereq = makeTask({
      id: 'task-orphan',
      title: 'Orphan Prereq',
      topicId: 'topic-does-not-exist',
    });
    const taskB = makeTask({
      id: 'task-b',
      title: 'Task B',
      prerequisiteTaskDefinitionIds: ['task-orphan'],
    });

    const lock = explain(taskB, [orphanPrereq, taskB]);

    expect(lock.blockers[0].category).toBe('incomplete');
    expect(lock.blockers[0].prerequisiteTopicId).toBeUndefined();
    expect(lock.prerequisiteActions).toEqual([]);
  });
});

describe('F-PRE-NAV: dependency chain A → B → C', () => {
  const taskA = makeTask({ id: 'task-a', title: 'Task A' });
  const taskB = makeTask({
    id: 'task-b',
    title: 'Task B',
    prerequisiteTaskDefinitionIds: ['task-a'],
  });
  const taskC = makeTask({
    id: 'task-c',
    title: 'Task C',
    prerequisiteTaskDefinitionIds: ['task-b'],
  });
  const definitions = [taskA, taskB, taskC];

  it('C names B as its blocker', () => {
    const lock = explain(taskC, definitions);

    expect(lock.unmetPrerequisiteIds).toEqual(['task-b']);
    expect(lock.blockers[0].prerequisiteTitle).toBe('Task B');
    expect(lock.prerequisiteActions[0].targetId).toBe('task-b');
  });

  it('B names A as its blocker', () => {
    const lock = explain(taskB, definitions);

    expect(lock.unmetPrerequisiteIds).toEqual(['task-a']);
    expect(lock.blockers[0].prerequisiteTitle).toBe('Task A');
    expect(lock.prerequisiteActions[0].targetId).toBe('task-a');
  });

  it('exposes the upstream trail root-first so the chain can be walked backwards', () => {
    const lock = explain(taskC, definitions);

    expect(lock.dependencyTrail.map((s) => s.taskId)).toEqual(['task-a', 'task-b']);
    expect(lock.dependencyTrail.every((s) => s.resolvable)).toBe(true);
  });

  it('stops the trail at the first satisfied link', () => {
    const lock = explain(taskC, definitions, {
      'task-a': progress('task-a', 'completed'),
    });

    // A is done, so C's blocking path starts at B and stops there: the trail
    // only ever contains hops that are actually still blocking.
    expect(lock.dependencyTrail.map((s) => s.taskId)).toEqual(['task-b']);
    expect(lock.dependencyTrail.every((s) => s.state !== 'completed')).toBe(true);
  });

  it('completion of A makes B eligible, and completion of B makes C eligible', () => {
    const afterA = explain(taskB, definitions, {
      'task-a': progress('task-a', 'completed'),
    });
    expect(afterA.isLocked).toBe(false);
    expect(explain(taskC, definitions, { 'task-a': progress('task-a', 'completed') }).isLocked).toBe(
      true
    );

    const afterB = explain(taskC, definitions, {
      'task-a': progress('task-a', 'completed'),
      'task-b': progress('task-b', 'completed'),
    });
    expect(afterB.isLocked).toBe(false);
    expect(afterB.blockers).toEqual([]);
    expect(afterB.prerequisiteActions).toEqual([]);
  });

  it('never marks anything complete itself', () => {
    const taskProgress: Record<string, TaskProgress> = {};
    explain(taskC, definitions, taskProgress);
    explain(taskB, definitions, taskProgress);
    expect(taskProgress).toEqual({});
  });

  it('terminates on a cyclic prerequisite graph', () => {
    const cycX = makeTask({ id: 'task-x', title: 'X', prerequisiteTaskDefinitionIds: ['task-y'] });
    const cycY = makeTask({ id: 'task-y', title: 'Y', prerequisiteTaskDefinitionIds: ['task-x'] });

    const lock = explain(cycX, [cycX, cycY]);

    expect(lock.isLocked).toBe(true);
    expect(lock.dependencyTrail.length).toBeLessThanOrEqual(6);
    expect(lock.dependencyTrail.map((s) => s.taskId)).toEqual(['task-y']);
  });
});

describe('F-PRE-NAV: phase gates stay separate from prerequisite gates', () => {
  const phaseTask = makeTask({ id: 'task-p2', title: 'Phase 2 Task', phaseId: 'phase-2' });

  it('explains a phase-only lock without pretending a prerequisite is missing', () => {
    const lock = explain(phaseTask, [phaseTask], {}, 1);

    expect(lock.isPrerequisiteBlocked).toBe(false);
    expect(lock.isPhaseLocked).toBe(true);
    expect(lock.isLocked).toBe(true);
    expect(lock.unmetPrerequisiteIds).toEqual([]);
    expect(lock.blockers).toHaveLength(1);
    expect(lock.blockers[0].category).toBe('phase_locked');
    expect(lock.blockers[0].prerequisiteTaskId).toBeUndefined();
    expect(lock.blockers[0].taskPhase).toBe(2);
    expect(lock.blockers[0].activePhase).toBe(1);
    expect(lock.blockers[0].reason).toContain('Phase gate');
    expect(lock.whyCannotStart).toContain('Prerequisites are satisfied');
    expect(lock.prerequisiteActions).toEqual([]);
    expect(lock.dependencyTrail).toEqual([]);
  });

  it('is not phase locked once the active phase reaches the task phase', () => {
    const lock = explain(phaseTask, [phaseTask], {}, 2);

    expect(lock.isPhaseLocked).toBe(false);
    expect(lock.isLocked).toBe(false);
    expect(lock.blockers).toEqual([]);
  });

  it('explains prerequisite + phase together and keeps both actionable sets distinct', () => {
    const prereq = makeTask({ id: 'task-a', title: 'Prereq A' });
    const both = makeTask({
      id: 'task-both',
      title: 'Both',
      phaseId: 'phase-2',
      prerequisiteTaskDefinitionIds: ['task-a'],
    });

    const lock = explain(both, [prereq, both], {}, 1);

    expect(lock.isPrerequisiteBlocked).toBe(true);
    expect(lock.isPhaseLocked).toBe(true);
    expect(lock.blockers.map((b) => b.category)).toEqual([
      'incomplete',
      'phase_locked',
    ]);
    expect(lock.whyCannotStart).toContain('Prereq A');
    expect(lock.whyCannotStart).toContain('Phase 2 activates');
    // Only the prerequisite is navigable; the phase gate offers no action.
    expect(lock.prerequisiteActions).toHaveLength(1);
    expect(lock.prerequisiteActions[0].targetId).toBe('task-a');
  });

  it('drops the prerequisite blocker when the prerequisite completes, keeping the phase blocker', () => {
    const prereq = makeTask({ id: 'task-a', title: 'Prereq A' });
    const both = makeTask({
      id: 'task-both',
      title: 'Both',
      phaseId: 'phase-2',
      prerequisiteTaskDefinitionIds: ['task-a'],
    });

    const lock = explain(both, [prereq, both], { 'task-a': progress('task-a', 'completed') }, 1);

    expect(lock.isPrerequisiteBlocked).toBe(false);
    expect(lock.isPhaseLocked).toBe(true);
    expect(lock.blockers.map((b) => b.category)).toEqual(['phase_locked']);
    expect(lock.prerequisiteActions).toEqual([]);
  });
});

describe('F-PRE-NAV: deterministic prerequisite explanation', () => {
  it('produces byte-identical output across repeated invocations', () => {
    const taskA = makeTask({ id: 'task-a', title: 'Prereq A' });
    const taskB = makeTask({
      id: 'task-b',
      title: 'Task B',
      phaseId: 'phase-2',
      prerequisiteTaskDefinitionIds: ['task-a', 'ghost-task'],
    });
    const definitions = [taskA, taskB];
    const taskProgress = { 'task-a': progress('task-a', 'in_progress') };

    const first = JSON.stringify(explain(taskB, definitions, taskProgress, 1));
    const second = JSON.stringify(explain(taskB, definitions, taskProgress, 1));
    const third = JSON.stringify(explain(taskB, definitions, taskProgress, 1));

    expect(second).toBe(first);
    expect(third).toBe(first);
  });
});

describe('F-PRE-NAV: resolveRoadmapTarget', () => {
  const taskA = makeTask({ id: 'task-a', title: 'Prereq A' });
  const definitions = [taskA];

  it('resolves a topic id (the existing Preparation → Roadmap deep link)', () => {
    const resolved = resolveRoadmapTarget('topic-dsa-arrays', TOPICS, definitions);
    expect(resolved.topic?.id).toBe('topic-dsa-arrays');
    expect(resolved.taskId).toBeUndefined();
  });

  it('resolves a task id to its topic (Today / review-candidate links)', () => {
    const resolved = resolveRoadmapTarget('task-a', TOPICS, definitions);
    expect(resolved.topic?.id).toBe('topic-dsa-arrays');
    expect(resolved.taskId).toBe('task-a');
  });

  it('returns nothing for an unknown id rather than a phantom target', () => {
    expect(resolveRoadmapTarget('nope', TOPICS, definitions)).toEqual({});
    expect(resolveRoadmapTarget('task-unknown', TOPICS, definitions)).toEqual({});
    expect(resolveRoadmapTarget(undefined, TOPICS, definitions)).toEqual({});
    expect(resolveRoadmapTarget('', TOPICS, definitions)).toEqual({});
  });

  it('reports the task without a topic when the topic reference is broken', () => {
    const orphan = makeTask({ id: 'task-orphan', topicId: 'missing-topic' });
    expect(resolveRoadmapTarget('task-orphan', TOPICS, [orphan])).toEqual({
      taskId: 'task-orphan',
    });
  });
});

describe('F-PRE-NAV: locked tasks stay excluded from Today (no-company / normal mode)', () => {
  const taskA = makeTask({ id: 'task-a', title: 'Prereq A', importance: 9 });
  const taskB = makeTask({
    id: 'task-b',
    title: 'Task B',
    importance: 9,
    prerequisiteTaskDefinitionIds: ['task-a'],
  });

  const evaluate = (taskProgress: Record<string, TaskProgress>) =>
    getEvaluatedCandidates(
      [taskA, taskB],
      taskProgress,
      [],
      {},
      {},
      [],
      'normal',
      '2026-10-15'
    );

  it('excludes the locked task and keeps the unlocked one', () => {
    const ids = evaluate({}).map((c) => c.task.id);

    expect(ids).toContain('task-a');
    expect(ids).not.toContain('task-b');
  });

  it('admits the target only after its prerequisite is completed', () => {
    const ids = evaluate({ 'task-a': progress('task-a', 'completed') }).map((c) => c.task.id);

    // task-a itself is completed, so Today correctly stops offering it…
    expect(ids).not.toContain('task-a');
    // …and task-b is no longer blocked, so it becomes actionable.
    expect(ids).toContain('task-b');
  });
});

describe('F-PRE-NAV: Preparation and DSA bridge regression', () => {
  it('keeps the reverse Roadmap → Preparation lookup used by RoadmapView resolvable', () => {
    const bridged = PREPARATION_TOPICS.find((pt) => pt.roadmapTopicId === 'topic-dsa-arrays');
    expect(bridged).toBeDefined();
    expect(typeof bridged!.id).toBe('string');
    expect(bridged!.id.length).toBeGreaterThan(0);
  });

  it('leaves DSA phase unlocking semantics untouched', () => {
    const lateProblem = DSA_PROBLEMS.find((p) => p.recommendedPhase > 1);
    expect(lateProblem).toBeDefined();

    const locked = isProblemUnlocked(lateProblem!, {}, 1);
    expect(locked.isUnlocked).toBe(false);
    expect(locked.reason).toContain(`Locked until Phase ${lateProblem!.recommendedPhase}`);

    const unlocked = isProblemUnlocked(lateProblem!, {}, lateProblem!.recommendedPhase);
    expect(unlocked.isUnlocked).toBe(true);
  });

  it('leaves DSA prerequisite unlocking semantics untouched', () => {
    const chained = DSA_PROBLEMS.find(
      (p) => p.recommendedPhase <= 1 && (p.prerequisites?.length ?? 0) > 0
    );
    expect(chained).toBeDefined();

    const blocked = isProblemUnlocked(chained!, {}, 1);
    expect(blocked.isUnlocked).toBe(false);
    expect(blocked.unmetPrerequisites).toEqual(chained!.prerequisites);

    const satisfied = isProblemUnlocked(
      chained!,
      {
        [chained!.prerequisites[0]]: {
          problemId: chained!.prerequisites[0],
          currentBox: 2,
          attemptCount: 3,
          totalAttempts: 3,
          successfulAttempts: 3,
          passedIndependently: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      1
    );
    expect(satisfied.isUnlocked).toBe(true);
  });
});
