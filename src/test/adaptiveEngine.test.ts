import { describe, it, expect } from 'vitest';
import {
  calculateUrgency,
  calculateImportance,
  calculateWeakness,
  calculateCompanyRelevance,
  calculateSpacedRepetition,
  calculateRecoveryUrgency,
  evaluateCandidateTask,
  getEvaluatedCandidates,
  getTimeBudget,
  selectDailyPlan,
  calculateNextLeitnerBox,
  calculateEvidenceScore,
} from '../engine/adaptiveEngine';
import type {
  TaskDefinition,
  TaskProgress,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
} from '../types';
import { StorageAdapter, getDefaultStorageState, validateStorageState } from '../storage/storageAdapter';

describe('PlacementOS Adaptive Engine & Scoring Tests', () => {
  const mockTask: TaskDefinition = {
    id: 'task-test-1',
    title: 'Test Two Pointers Problem',
    description: 'Solve array two pointer problem',
    domainId: 'dsa',
    topicId: 'topic-dsa-arrays',
    phaseId: 'phase-1',
    estimatedMinutes: 60,
    importance: 8,
    taskType: 'practice',
    languageTags: ['cpp', 'java'],
    dueDate: '2026-09-28',
    createdAt: '2026-09-01T00:00:00Z',
  };

  const todayStr = '2026-09-24';

  it('calculates Urgency score correctly based on deadline proximity', () => {
    // 4 days remaining (2026-09-28 - 2026-09-24 = 4 days) -> 100 - (4 * 6.5) = 74
    const urgency = calculateUrgency(mockTask, todayStr);
    expect(urgency).toBe(74);

    // Overdue task -> 100
    const overdueTask = { ...mockTask, dueDate: '2026-09-20' };
    expect(calculateUrgency(overdueTask, todayStr)).toBe(100);

    // No deadline -> 0
    const noDeadlineTask = { ...mockTask, dueDate: undefined };
    expect(calculateUrgency(noDeadlineTask, todayStr)).toBe(0);
  });

  it('calculates Importance score by scaling 1-10 to 0-100', () => {
    expect(calculateImportance(mockTask)).toBe(80);
  });

  it('calculates Weakness score incorporating skill freshness multipliers', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'topic-dsa-arrays': {
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        freshness: 'stale', // multiplier 1.30
        evidenceStrength: 40, // base weakness = 60
      },
    };

    // 60 * 1.30 = 78
    const weakness = calculateWeakness(mockTask, skillStates);
    expect(weakness).toBe(78);
  });

  it('calculates Company Relevance including Placement Sprint multiplier', () => {
    const companies: CompanyOverlay[] = [
      {
        id: 'comp-1',
        companyName: 'Amazon',
        targetRole: 'SDE-1',
        applicationStatus: 'oa_scheduled',
        requiredDomains: ['dsa'],
        requiredTopics: ['topic-dsa-arrays'],
        requiredLanguages: ['cpp'],
      },
    ];

    // Normal mode: Domain (+30) + Topic (+40) + Language (+30) = 100
    const scoreNormal = calculateCompanyRelevance(mockTask, companies, 'normal');
    expect(scoreNormal).toBe(100);

    // Sprint mode: 100 * 1.5 = 150 clamped to 100
    const scoreSprint = calculateCompanyRelevance(mockTask, companies, 'placement_sprint');
    expect(scoreSprint).toBe(100);
  });

  it('calculates Spaced Repetition score for due items', () => {
    const dsaProgress: DSAProgress = {
      problemId: 'prob-1',
      currentBox: 2,
      nextReviewAt: '2026-09-24', // due today
      attemptCount: 1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-21T00:00:00Z',
    };

    expect(calculateSpacedRepetition(mockTask, dsaProgress, todayStr)).toBe(100);
  });

  it('calculates Recovery Urgency for postponed and overdue tasks', () => {
    const progress: TaskProgress = {
      taskId: mockTask.id,
      state: 'not_started',
      postponeCount: 2,
      skipCount: 1,
      timeSpentMinutes: 0,
      updatedAt: '2026-09-24T00:00:00Z',
    };

    // (2 * 25) + (1 * 30) = 80
    expect(calculateRecoveryUrgency(mockTask, progress, todayStr)).toBe(80);
  });

  it('evaluates complete weighted PriorityBreakdown and clamping', () => {
    const breakdown = evaluateCandidateTask(
      mockTask,
      undefined,
      undefined,
      undefined,
      {},
      [],
      'normal',
      todayStr
    );

    expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.finalScore).toBeLessThanOrEqual(100);
    expect(breakdown.explanation).toBeDefined();
  });

  it('enforces deterministic sort order (finalScore desc, dueDate asc, title asc)', () => {
    const taskA: TaskDefinition = { ...mockTask, id: 'a', title: 'Task A', importance: 9 };
    const taskB: TaskDefinition = { ...mockTask, id: 'b', title: 'Task B', importance: 5 };

    const candidates = getEvaluatedCandidates(
      [taskB, taskA],
      {},
      [],
      {},
      {},
      [],
      'normal',
      todayStr
    );

    expect(candidates[0].task.id).toBe('a');
  });

  it('allocates time budgets accurately per PlacementMode', () => {
    expect(getTimeBudget('normal', 180)).toBe(180);
    expect(getTimeBudget('reduced', 180)).toBe(90);
    expect(getTimeBudget('exam', 180)).toBe(45);
    expect(getTimeBudget('placement_sprint', 180)).toBe(180);
  });

  it('selects candidates within time budget', () => {
    const task1: TaskDefinition = { ...mockTask, id: 't1', estimatedMinutes: 60 };
    const task2: TaskDefinition = { ...mockTask, id: 't2', estimatedMinutes: 60 };
    const task3: TaskDefinition = { ...mockTask, id: 't3', estimatedMinutes: 60 };

    const candidates = getEvaluatedCandidates(
      [task1, task2, task3],
      {},
      [],
      {},
      {},
      [],
      'normal',
      todayStr
    );

    const plan = selectDailyPlan(candidates, 120);
    expect(plan.length).toBe(2);
  });
});

describe('PlacementOS 4-Box Leitner Matrix Tests', () => {
  it('handles pass + none -> advance 1 box', () => {
    const res = calculateNextLeitnerBox(1, 'pass', 'none');
    expect(res.nextBox).toBe(2);
    expect(res.intervalDays).toBe(3);
  });

  it('handles pass + hint -> stay in current box', () => {
    const res = calculateNextLeitnerBox(2, 'pass', 'hint');
    expect(res.nextBox).toBe(2);
    expect(res.intervalDays).toBe(3);
  });

  it('handles pass + solution -> regresses 1 box', () => {
    const res = calculateNextLeitnerBox(3, 'pass', 'solution');
    expect(res.nextBox).toBe(2);
    expect(res.intervalDays).toBe(3);
  });

  it('handles fail -> reset to Box 1 (1 day interval)', () => {
    const res = calculateNextLeitnerBox(4, 'fail', 'none');
    expect(res.nextBox).toBe(1);
    expect(res.intervalDays).toBe(1);
  });

  it('calculates evidence score correctly', () => {
    // pass (95) * none (1.0) + (confidence 4 - 3)*5 = 95 + 5 = 100
    expect(calculateEvidenceScore('pass', 'none', 4)).toBe(100);
    // partial (60) * hint (0.8) = 48 + (3-3)*5 = 48
    expect(calculateEvidenceScore('partial', 'hint', 3)).toBe(48);
  });
});

describe('StorageAdapter Integrity & Serialization Tests', () => {
  it('generates valid default storage state', () => {
    const defaults = getDefaultStorageState();
    expect(defaults.schemaVersion).toBe('1.0.0');
    expect(validateStorageState(defaults)).toBe(true);
  });

  it('exports and imports state via JSON safely', () => {
    const defaults = getDefaultStorageState();
    const jsonStr = StorageAdapter.exportJSON(defaults);
    const imported = StorageAdapter.importJSON(jsonStr);

    expect(imported.success).toBe(true);
    expect(imported.state?.schemaVersion).toBe('1.0.0');
  });

  it('rejects invalid JSON backup strings', () => {
    const imported = StorageAdapter.importJSON('{"invalid": true}');
    expect(imported.success).toBe(false);
    expect(imported.error).toBeDefined();
  });
});
