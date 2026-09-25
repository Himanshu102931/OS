import { describe, it, expect } from 'vitest';
import {
  calculateTopicReadiness,
  calculateDomainReadinessList,
  type TopicReadiness,
} from '../engine/skillsEngine';
import type {
  Topic,
  DomainDefinition,
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
} from '../types';

const mockDomain: DomainDefinition = {
  id: 'dsa',
  name: 'Data Structures & Algorithms',
  shortName: 'DSA',
  description: 'Arrays, Trees, Graphs',
  iconName: 'Code',
  color: 'emerald',
};

const mockTopic: Topic = {
  id: 'topic-dsa-arrays',
  moduleId: 'mod-dsa-1',
  domainId: 'dsa',
  name: 'Arrays & Two Pointers',
  description: 'Array manipulation and two pointer techniques',
  importance: 8,
};

const mockTasks: TaskDefinition[] = [
  {
    id: 'task-1',
    title: 'Arrays Practice 1',
    description: 'Solve 3 array problems',
    domainId: 'dsa',
    topicId: 'topic-dsa-arrays',
    phaseId: 'phase-1',
    estimatedMinutes: 60,
    importance: 8,
    taskType: 'practice',
    createdAt: '2026-09-01',
  },
];

const mockDsaProblem: DSAProblem = {
  id: 'dsa-001',
  leetcodeNumber: 1,
  title: 'Two Sum',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  difficulty: 'easy',
  leetcodeUrl: 'https://leetcode.com/problems/two-sum',
  accessTier: 'FREE',
  primaryPattern: 'Two Pointers',
  dataStructure: 'Array',
  algorithmicTechnique: 'Hashing',
  recommendedPhase: 1,
  progressionTier: 'STARTER',
  prerequisites: [],
  isAnchor: true,
  estimatedTimeMinutes: 20,
};

describe('skillsEngine', () => {
  it('handles zero evidence cleanly (needs_baseline)', () => {
    const readiness = calculateTopicReadiness(
      mockTopic,
      mockDomain,
      [],
      {},
      [],
      {},
      [],
      [],
      {},
      [],
      '2026-09-25'
    );

    expect(readiness.evidenceStrength).toBe(0);
    expect(readiness.currentLevel).toBe(0);
    expect(readiness.targetLevel).toBe(5); // importance 8 => target Level 5
    expect(readiness.readinessStatus).toBe('needs_baseline');
    expect(readiness.evidenceClassification).toBe('insufficient');
    expect(readiness.supportingEvidence).toHaveLength(0);
  });

  it('calculates demonstrated evidence from completed task and DSA problem', () => {
    const taskProgressMap: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-24T10:00:00Z',
        timeSpentMinutes: 60,
        updatedAt: '2026-09-24T10:00:00Z',
      },
    };

    const dsaProgressMap: Record<string, DSAProgress> = {
      'dsa-001': {
        problemId: 'dsa-001',
        currentBox: 3,
        attemptCount: 2,
        passedIndependently: true,
        lastAttemptAt: '2026-09-24T12:00:00Z',
        createdAt: '2026-09-20',
        updatedAt: '2026-09-24',
      },
    };

    const readiness = calculateTopicReadiness(
      mockTopic,
      mockDomain,
      mockTasks,
      taskProgressMap,
      [mockDsaProblem],
      dsaProgressMap,
      [],
      [],
      {},
      [],
      '2026-09-25'
    );

    expect(readiness.evidenceStrength).toBeGreaterThan(70);
    expect(readiness.currentLevel).toBeGreaterThanOrEqual(4);
    expect(readiness.evidenceClassification).toBe('demonstrated');
    expect(readiness.supportingEvidence.length).toBeGreaterThanOrEqual(2);
    expect(readiness.freshness).toBe('fresh');
  });

  it('applies aging/stale freshness decay when practice is old', () => {
    const dsaProgressMap: Record<string, DSAProgress> = {
      'dsa-001': {
        problemId: 'dsa-001',
        currentBox: 4,
        attemptCount: 3,
        passedIndependently: true,
        lastAttemptAt: '2026-09-01T12:00:00Z', // 24 days ago relative to 2026-09-25
        createdAt: '2026-08-20',
        updatedAt: '2026-09-01',
      },
    };

    const readiness = calculateTopicReadiness(
      mockTopic,
      mockDomain,
      [],
      {},
      [mockDsaProblem],
      dsaProgressMap,
      [],
      [],
      {},
      [],
      '2026-09-25'
    );

    expect(readiness.freshness).toBe('stale');
    expect(readiness.readinessStatus).toBe('at_risk');
    expect(readiness.gapExplanation).toContain('degraded due to inactivity');
  });

  it('integrates manual override correctly', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'topic-dsa-arrays': {
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        freshness: 'fresh',
        evidenceStrength: 85,
        lastPracticedAt: '2026-09-25T10:00:00Z',
      },
    };

    const readiness = calculateTopicReadiness(
      mockTopic,
      mockDomain,
      [],
      {},
      [],
      {},
      [],
      [],
      skillStates,
      [],
      '2026-09-25'
    );

    expect(readiness.manualOverrideApplied).toBe(true);
    expect(readiness.evidenceStrength).toBe(85);
    expect(readiness.readinessStatus).toBe('ready');
  });

  it('aggregates domain readiness correctly', () => {
    const topicReadiness: TopicReadiness = {
      topicId: 'topic-dsa-arrays',
      topicName: 'Arrays & Two Pointers',
      domainId: 'dsa',
      domainName: 'Data Structures & Algorithms',
      importance: 8,
      evidenceStrength: 80,
      currentLevel: 4,
      targetLevel: 5,
      freshness: 'fresh',
      readinessStatus: 'on_track',
      evidenceClassification: 'demonstrated',
      supportingEvidence: [],
      taskEvidenceCount: { total: 1, completed: 1 },
      dsaEvidenceCount: { total: 1, attempted: 1, mastered: 1 },
      manualOverrideApplied: false,
      gapExplanation: 'Need slight boost to reach level 5',
      recommendedAction: { label: 'Practice DSA', route: 'dsa', type: 'dsa' },
    };

    const domainsList = calculateDomainReadinessList(
      [mockDomain],
      [mockTopic],
      [topicReadiness]
    );

    expect(domainsList).toHaveLength(1);
    expect(domainsList[0].domainId).toBe('dsa');
    expect(domainsList[0].overallReadiness).toBe(80);
    expect(domainsList[0].topicsCount).toBe(1);
  });
});
