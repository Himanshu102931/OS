import { describe, it, expect } from 'vitest';
import { evaluateAnalyticsTelemetry, calculateWindowStartDate } from '../engine/analyticsEngine';
import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  Topic,
  DomainDefinition,
  TopicSkillState,
  DailyCheckIn,
  Phase,
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
  description: 'Array manipulation',
  importance: 8,
};

const mockTask: TaskDefinition = {
  id: 'task-1',
  title: 'Arrays Practice 1',
  description: 'Practice two pointers',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 60,
  importance: 8,
  taskType: 'practice',
  createdAt: '2026-09-01',
};

const mockPhase: Phase = {
  id: 'phase-1',
  name: 'Phase 1: Foundations',
  startDate: '2026-09-01',
  endDate: '2026-11-30',
  description: 'Core CS & DSA',
  order: 1,
};

const mockDsaProblem: DSAProblem = {
  id: 'dsa-001',
  leetcodeNumber: 1,
  title: 'Two Sum',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  difficulty: 'easy',
  leetcodeUrl: 'https://leetcode.com',
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

describe('analyticsEngine', () => {
  it('calculates window start dates accurately', () => {
    expect(calculateWindowStartDate('7d', '2026-09-25')).toBe('2026-09-18');
    expect(calculateWindowStartDate('30d', '2026-09-25')).toBe('2026-08-26');
    expect(calculateWindowStartDate('phase', '2026-09-25', mockPhase)).toBe('2026-09-01');
    expect(calculateWindowStartDate('all', '2026-09-25')).toBe('1970-01-01');
  });

  it('handles empty datasets safely without division by zero', () => {
    const summary = evaluateAnalyticsTelemetry(
      '7d',
      '2026-09-25',
      [],
      {},
      [],
      {},
      [],
      [],
      [],
      {},
      []
    );

    expect(summary.activity.completedTasksCount).toBe(0);
    expect(summary.activity.dsaAttemptsCount).toBe(0);
    expect(summary.quality.independentSolveRatio).toBe(0);
    expect(summary.quality.assistedSolveRatio).toBe(0);
    expect(summary.progress.roadmapCompletionRate).toBe(0);
    expect(summary.gaps.overdueDsaCount).toBe(0);
  });

  it('calculates activity telemetry correctly for tasks and DSA attempts in window', () => {
    const taskProgressMap: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-22T10:00:00Z',
        timeSpentMinutes: 60,
        updatedAt: '2026-09-22',
      },
    };

    const dsaAttempts: DSAAttempt[] = [
      {
        id: 'att-1',
        problemId: 'dsa-001',
        date: '2026-09-23',
        result: 'pass',
        assistanceLevel: 'none',
        timeTakenMinutes: 20,
        createdAt: '2026-09-23T10:00:00Z',
      },
      {
        id: 'att-2',
        problemId: 'dsa-001',
        date: '2026-09-24',
        result: 'pass',
        assistanceLevel: 'hint',
        timeTakenMinutes: 25,
        createdAt: '2026-09-24T10:00:00Z',
      },
    ];

    const checkIns: DailyCheckIn[] = [
      {
        id: 'ci-1',
        date: '2026-09-23',
        mode: 'normal',
        availableMinutes: 120,
        energyLevel: 'high',
        assignmentIds: [],
        totalActualMinutes: 90,
        isSealed: true,
        createdAt: '2026-09-23',
        updatedAt: '2026-09-23',
      },
    ];

    const summary = evaluateAnalyticsTelemetry(
      '7d',
      '2026-09-25',
      [mockTask],
      taskProgressMap,
      [mockDsaProblem],
      {},
      dsaAttempts,
      [mockTopic],
      [mockDomain],
      {},
      checkIns
    );

    expect(summary.activity.completedTasksCount).toBe(1);
    expect(summary.activity.dsaAttemptsCount).toBe(2);
    expect(summary.activity.dsaPassedCount).toBe(2);
    expect(summary.activity.dsaIndependentPassedCount).toBe(1);
    expect(summary.activity.dsaAssistedPassedCount).toBe(1);
    expect(summary.quality.independentSolveRatio).toBe(50);
    expect(summary.quality.assistedSolveRatio).toBe(50);
    expect(summary.activity.studyMinutes).toBeGreaterThanOrEqual(90);
  });

  it('detects overdue DSA reviews, stale topics, and repeatedly postponed tasks', () => {
    const dsaProgressMap: Record<string, DSAProgress> = {
      'dsa-001': {
        problemId: 'dsa-001',
        currentBox: 2,
        nextReviewAt: '2026-09-20', // Overdue relative to 2026-09-25
        attemptCount: 2,
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
      },
    };

    const taskProgressMap: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'in_progress',
        postponeCount: 3,
        skipCount: 0,
        timeSpentMinutes: 10,
        updatedAt: '2026-09-01',
      },
    };

    const skillStatesMap: Record<string, TopicSkillState> = {
      'topic-dsa-arrays': {
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        freshness: 'stale',
        evidenceStrength: 30,
        lastPracticedAt: '2026-09-01T10:00:00Z',
      },
    };

    const summary = evaluateAnalyticsTelemetry(
      '7d',
      '2026-09-25',
      [mockTask],
      taskProgressMap,
      [mockDsaProblem],
      dsaProgressMap,
      [],
      [mockTopic],
      [mockDomain],
      skillStatesMap,
      []
    );

    expect(summary.gaps.overdueDsaCount).toBe(1);
    expect(summary.gaps.overdueDsaProblems[0].id).toBe('dsa-001');
    expect(summary.gaps.staleTopics.length).toBe(1);
    expect(summary.gaps.postponedTasks.length).toBe(1);

    expect(summary.reviewPrompts.length).toBeGreaterThanOrEqual(2);
    expect(summary.reviewPrompts.some((p) => p.type === 'overdue_review')).toBe(true);
    expect(summary.reviewPrompts.some((p) => p.type === 'repeated_postpone')).toBe(true);
  });
});
