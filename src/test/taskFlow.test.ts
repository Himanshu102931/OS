/**
 * Today → Preparation integration (taskFlowEngine).
 *
 * Covers: roadmap task → preparation topic resolution, the routing decision
 * used by the Primary Action card and TaskCard, the unmapped-task fallback,
 * and the post-completion next-step presentation (evidence + refreshed
 * recommendation) including its no-duplicate-evidence guarantee.
 */
import { describe, it, expect } from 'vitest';
import {
  getTaskLearningRoute,
  getLearningDestinationLabel,
  findLatestTaskEvidence,
  buildCompletionNextStep,
} from '../engine/taskFlowEngine';
import { TASK_DEFINITIONS } from '../data/seedData';
import {
  getPreparationTopicIdByRoadmapId,
  getPreparationTopic,
} from '../data/preparationDataset';
import type { EvidenceLog, TaskDefinition } from '../types';

const makeLog = (overrides: Partial<EvidenceLog> & Pick<EvidenceLog, 'id' | 'sourceId'>): EvidenceLog => ({
  topicId: 'topic-dsa-arrays',
  domainId: 'dsa',
  score: 80,
  confidence: 4,
  timestamp: '2026-09-27T06:00:00.000Z',
  sourceType: 'daily_assignment',
  ...overrides,
});

const mappedTask = TASK_DEFINITIONS.find((t) => t.topicId === 'topic-dsa-arrays');
const unmappedTask = TASK_DEFINITIONS.find((t) => t.topicId === 'topic-dsa-hashtable');

describe('getTaskLearningRoute — roadmap task → preparation topic resolution', () => {
  it('has seed tasks for both the mapped and unmapped cases', () => {
    expect(mappedTask).toBeDefined();
    expect(unmappedTask).toBeDefined();
    expect(getPreparationTopicIdByRoadmapId('topic-dsa-arrays')).toBeDefined();
    expect(getPreparationTopicIdByRoadmapId('topic-dsa-hashtable')).toBeUndefined();
  });

  it('routes a mapped roadmap task into its Preparation topic workspace', () => {
    const route = getTaskLearningRoute(mappedTask as TaskDefinition);

    expect(route.route).toBe('preparation');
    expect(route.linkedTopicId).toBe(getPreparationTopicIdByRoadmapId('topic-dsa-arrays'));
    expect(route.linkedTopicId).toBe('prep-coding-ds');
    expect(route.preparationTopicTitle).toBe(
      getPreparationTopic(getPreparationTopicIdByRoadmapId('topic-dsa-arrays') as string)?.title
    );
    expect(route.preparationTopicTitle).toBeTruthy();
  });

  it('falls back to the roadmap topic when no preparation mapping exists', () => {
    const route = getTaskLearningRoute(unmappedTask as TaskDefinition);

    expect(route.route).toBe('roadmap');
    expect(route.linkedTopicId).toBe('topic-dsa-hashtable');
    expect(route.preparationTopicTitle).toBeUndefined();
  });

  it('resolves every seed task to preparation iff its topic has a bridge', () => {
    expect(TASK_DEFINITIONS.length).toBeGreaterThan(0);

    for (const task of TASK_DEFINITIONS) {
      const route = getTaskLearningRoute(task);
      const bridge = getPreparationTopicIdByRoadmapId(task.topicId);

      if (bridge) {
        expect(route.route).toBe('preparation');
        expect(route.linkedTopicId).toBe(bridge);
      } else {
        expect(route.route).toBe('roadmap');
        expect(route.linkedTopicId).toBe(task.topicId);
      }
    }
  });

  it('covers both branches across the seed curriculum', () => {
    const mappedCount = TASK_DEFINITIONS.filter(
      (t) => getPreparationTopicIdByRoadmapId(t.topicId) !== undefined
    ).length;
    const unmappedCount = TASK_DEFINITIONS.length - mappedCount;

    expect(mappedCount).toBeGreaterThan(0);
    expect(unmappedCount).toBeGreaterThan(0);
  });
});

describe('getLearningDestinationLabel — Primary Action / TaskCard copy', () => {
  it('promises a workspace only for mapped (preparation) tasks', () => {
    const route = getTaskLearningRoute(mappedTask as TaskDefinition);

    expect(route.route).toBe('preparation');
    expect(getLearningDestinationLabel(route, 'primary')).toBe('Open Learning Workspace');
    expect(getLearningDestinationLabel(route, 'card')).toBe('Open Topic');
    expect(getLearningDestinationLabel(route)).toBe('Open Learning Workspace');
  });

  it('sends unmapped tasks to the roadmap with truthful copy', () => {
    const route = getTaskLearningRoute(unmappedTask as TaskDefinition);

    expect(route.route).toBe('roadmap');
    expect(getLearningDestinationLabel(route, 'primary')).toBe('View Topic in Roadmap');
    expect(getLearningDestinationLabel(route, 'card')).toBe('View Topic');
  });
});

describe('findLatestTaskEvidence', () => {
  it('returns null when the task has no evidence event', () => {
    const logs = [makeLog({ id: 'e-1', sourceId: 'task-other' })];

    expect(findLatestTaskEvidence(logs, 'task-x')).toBeNull();
  });

  it('returns the single daily_assignment evidence event for the task', () => {
    const log = makeLog({ id: 'e-1', sourceId: 'task-x' });
    const logs = [makeLog({ id: 'e-other', sourceId: 'task-y' }), log];

    expect(findLatestTaskEvidence(logs, 'task-x')).toBe(log);
  });

  it('ignores evidence from other source types', () => {
    const logs = [makeLog({ id: 'e-dsa', sourceId: 'task-x', sourceType: 'dsa_attempt' })];

    expect(findLatestTaskEvidence(logs, 'task-x')).toBeNull();
  });

  it('returns the most recent event when a task was completed twice', () => {
    const first = makeLog({ id: 'e-1', sourceId: 'task-x', timestamp: '2026-09-27T06:00:00.000Z' });
    const second = makeLog({ id: 'e-2', sourceId: 'task-x', timestamp: '2026-09-27T09:00:00.000Z' });

    expect(findLatestTaskEvidence([first, second], 'task-x')).toBe(second);
  });
});

describe('buildCompletionNextStep — completion → evidence + next-step presentation', () => {
  it('presents the existing evidence event and the refreshed top candidate', () => {
    const evidence = makeLog({ id: 'e-1', sourceId: 'task-done' });
    const nextTask = mappedTask as TaskDefinition;

    const result = buildCompletionNextStep({
      completedTaskId: 'task-done',
      evidenceLogs: [evidence],
      nextCandidates: [{ task: nextTask }, { task: unmappedTask as TaskDefinition }],
    });

    expect(result.evidence).toBe(evidence);
    expect(result.nextTask).toBe(nextTask);
    expect(result.nextRoute).toEqual(getTaskLearningRoute(nextTask));
    expect(result.nextRoute?.route).toBe('preparation');
  });

  it('routes the next step by its own topic mapping (unmapped → roadmap)', () => {
    const result = buildCompletionNextStep({
      completedTaskId: 'task-done',
      evidenceLogs: [makeLog({ id: 'e-1', sourceId: 'task-done' })],
      nextCandidates: [{ task: unmappedTask as TaskDefinition }],
    });

    expect(result.nextTask).toBe(unmappedTask);
    expect(result.nextRoute).toEqual({ route: 'roadmap', linkedTopicId: 'topic-dsa-hashtable' });
  });

  it('returns nulls when no candidates remain, keeping existing evidence visible', () => {
    const evidence = makeLog({ id: 'e-1', sourceId: 'task-done' });

    const result = buildCompletionNextStep({
      completedTaskId: 'task-done',
      evidenceLogs: [evidence],
      nextCandidates: [],
    });

    expect(result.evidence).toBe(evidence);
    expect(result.nextTask).toBeNull();
    expect(result.nextRoute).toBeNull();
  });

  it('does not create duplicate evidence: input logs are read, never written', () => {
    const first = makeLog({ id: 'e-1', sourceId: 'task-done', timestamp: '2026-09-27T06:00:00.000Z' });
    const second = makeLog({ id: 'e-2', sourceId: 'task-done', timestamp: '2026-09-27T09:00:00.000Z' });
    const evidenceLogs = [first, second];
    const snapshot = JSON.parse(JSON.stringify(evidenceLogs));
    const nextCandidates = [{ task: mappedTask as TaskDefinition }];
    const candidatesSnapshot = nextCandidates.slice();

    const result = buildCompletionNextStep({
      completedTaskId: 'task-done',
      evidenceLogs,
      nextCandidates,
    });

    // Read-only: neither input collection changed.
    expect(evidenceLogs).toHaveLength(2);
    expect(evidenceLogs).toEqual(snapshot);
    expect(nextCandidates).toEqual(candidatesSnapshot);

    // Exactly one evidence entry is presented — the latest existing one.
    expect(result.evidence).toBe(second);
  });

  it('returns no evidence for a task that produced none', () => {
    const result = buildCompletionNextStep({
      completedTaskId: 'task-without-evidence',
      evidenceLogs: [makeLog({ id: 'e-1', sourceId: 'task-done' })],
      nextCandidates: [{ task: mappedTask as TaskDefinition }],
    });

    expect(result.evidence).toBeNull();
    expect(result.nextTask).toBeDefined();
  });
});
