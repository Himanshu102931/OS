import { describe, it, expect } from 'vitest';
import { evaluateAnalyticsTelemetry, calculateWindowStartDate } from '../engine/analyticsEngine';
import { calculateTopicReadiness } from '../engine/skillsEngine';
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
  CompanyOverlay,
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
    // "All time" with no activity anchors to today, never to the epoch.
    expect(calculateWindowStartDate('all', '2026-09-25')).toBe('2026-09-25');
    // …and anchors to real activity once there is any.
    expect(calculateWindowStartDate('all', '2026-09-25', undefined, '2026-09-10')).toBe(
      '2026-09-10'
    );
    expect(calculateWindowStartDate('phase', '2026-09-25')).toBe('2026-09-25');
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
      [],
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
      checkIns,
      []
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
      [],
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

// ==========================================
// C5 — cross-page readiness invariant & telemetry truthfulness
// ==========================================
describe('C5 D — canonical readiness & honest telemetry', () => {
  const dbmsDomain: DomainDefinition = {
    id: 'dbms',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    description: 'SQL, indexing and transactions',
    iconName: 'Database',
    color: 'blue',
  };

  // importance 4 -> target Level 3 unless a target company raises it
  const acidTopic: Topic = {
    id: 'topic-dbms-acid',
    moduleId: 'mod-dbms-1',
    domainId: 'dbms',
    name: 'ACID Transactions',
    description: 'Atomicity, consistency, isolation, durability',
    importance: 4,
  };

  const acidSkillState: TopicSkillState = {
    topicId: acidTopic.id,
    domainId: 'dbms',
    freshness: 'fresh',
    evidenceStrength: 55,
    lastPracticedAt: '2026-09-25T10:00:00Z',
  };

  const overlay: CompanyOverlay = {
    id: 'comp-c5-analytics',
    companyName: 'DataCo',
    targetRole: 'Backend Engineer',
    applicationStatus: 'target',
    eventDate: '2026-11-01',
    requiredDomains: ['dbms'],
    requiredTopics: [],
    requiredLanguages: ['java'],
  };

  const TODAY = '2026-09-25';

  /** The exact call SkillsView makes. */
  const skillsReadiness = (companyOverlays: CompanyOverlay[]) =>
    calculateTopicReadiness(
      acidTopic,
      dbmsDomain,
      [],
      {},
      [],
      {},
      [],
      [],
      { [acidTopic.id]: acidSkillState },
      companyOverlays,
      TODAY
    );

  /** The exact call AnalyticsView makes. */
  const analyticsSummary = (companyOverlays: CompanyOverlay[]) =>
    evaluateAnalyticsTelemetry(
      'all',
      TODAY,
      [],
      {},
      [],
      {},
      [],
      [acidTopic],
      [dbmsDomain],
      { [acidTopic.id]: acidSkillState },
      [],
      companyOverlays
    );

  it('D1. real company overlays raise the target level in the Analytics path too', () => {
    const withoutOverlay = skillsReadiness([]);
    const withOverlay = skillsReadiness([overlay]);

    expect(withoutOverlay.targetLevel).toBe(3);
    expect(withoutOverlay.readinessStatus).toBe('ready');

    expect(withOverlay.targetLevel).toBe(4);
    expect(withOverlay.readinessStatus).toBe('at_risk');

    // Analytics must receive the same overlays — not a hardcoded empty list.
    expect(analyticsSummary([]).topicReadiness[0].readinessStatus).toBe('ready');
    expect(analyticsSummary([overlay]).topicReadiness[0].readinessStatus).toBe('at_risk');
    expect(analyticsSummary([overlay]).topicReadiness[0].targetLevel).toBe(4);
  });

  it('D2. Skills and Analytics produce identical readiness for the same state', () => {
    for (const overlays of [[], [overlay]]) {
      const fromSkills = skillsReadiness(overlays);
      const fromAnalytics = analyticsSummary(overlays).topicReadiness[0];

      expect(fromAnalytics).toEqual(fromSkills);
      expect(fromAnalytics.evidenceStrength).toBe(fromSkills.evidenceStrength);
      expect(fromAnalytics.readinessStatus).toBe(fromSkills.readinessStatus);
      expect(fromAnalytics.targetLevel).toBe(fromSkills.targetLevel);
      expect(fromAnalytics.freshness).toBe(fromSkills.freshness);
      expect(fromAnalytics.manualOverrideApplied).toBe(fromSkills.manualOverrideApplied);
      expect(fromAnalytics.supportingEvidence).toEqual(fromSkills.supportingEvidence);
    }
  });

  it('D2b. a manual override case also agrees across the two pages', () => {
    const manual: TopicSkillState = {
      ...acidSkillState,
      evidenceStrength: 90,
      manualOverride: {
        evidenceStrength: 90,
        freshness: 'fresh',
        updatedAt: '2026-09-25T09:00:00Z',
      },
    };
    const state = { [acidTopic.id]: manual };

    const fromSkills = calculateTopicReadiness(
      acidTopic,
      dbmsDomain,
      [],
      {},
      [],
      {},
      [],
      [],
      state,
      [overlay],
      TODAY
    );
    const fromAnalytics = evaluateAnalyticsTelemetry(
      'all',
      TODAY,
      [],
      {},
      [],
      {},
      [],
      [acidTopic],
      [dbmsDomain],
      state,
      [],
      [overlay]
    ).topicReadiness[0];

    expect(fromAnalytics).toEqual(fromSkills);
    expect(fromAnalytics.manualOverrideApplied).toBe(true);
    expect(fromAnalytics.evidenceStrength).toBe(90);
  });

  it('D3. a fresh install reports no activity instead of a 1970-era window', () => {
    const summary = analyticsSummary([]);

    expect(summary.startDateISO).not.toContain('1970');
    expect(summary.startDateISO).toBe(TODAY);
    expect(summary.endDateISO).toBe(TODAY);
    expect(summary.activity.totalDaysInWindow).toBe(1);
    expect(summary.activity.completedTasksCount).toBe(0);
    expect(summary.activity.sealedDaysCount).toBe(0);
    expect(summary.activity.studyMinutes).toBe(0);
    expect(summary.activity.studyHours).toBe('0.0');
    expect(summary.activity.consistencyRate).toBe(0);
  });

  it('D3b. an all-time window with real activity anchors to that activity', () => {
    const taskProgressMap: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-22T10:00:00Z',
        timeSpentMinutes: 45,
        updatedAt: '2026-09-22',
      },
    };

    const summary = evaluateAnalyticsTelemetry(
      'all',
      TODAY,
      [mockTask],
      taskProgressMap,
      [],
      {},
      [],
      [],
      [],
      {},
      [],
      []
    );

    expect(summary.startDateISO).toBe('2026-09-22');
    expect(summary.activity.totalDaysInWindow).toBe(4); // 22, 23, 24, 25
    expect(summary.activity.completedTasksCount).toBe(1);
  });

  it('D4. planned task estimates are never reported as studied time', () => {
    // The task estimates 60 minutes but no time was ever recorded against it.
    expect(mockTask.estimatedMinutes).toBe(60);
    const untimedProgress: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-22T10:00:00Z',
        timeSpentMinutes: 0,
        updatedAt: '2026-09-22',
      },
    };

    const untimed = evaluateAnalyticsTelemetry(
      '7d',
      TODAY,
      [mockTask],
      untimedProgress,
      [],
      {},
      [],
      [],
      [],
      {},
      [],
      []
    );
    expect(untimed.activity.studyMinutes).toBe(0);
    expect(untimed.activity.studyHours).toBe('0.0');

    // Only genuinely recorded minutes count.
    const sealedCheckIn: DailyCheckIn = {
      id: 'ci-c5',
      date: '2026-09-22',
      mode: 'normal',
      availableMinutes: 60,
      energyLevel: 'medium',
      assignmentIds: [],
      totalActualMinutes: 30,
      isSealed: true,
      sealedAt: '2026-09-22T21:00:00Z',
      createdAt: '2026-09-22T09:00:00Z',
      updatedAt: '2026-09-22T21:00:00Z',
    };

    const withCheckIn = evaluateAnalyticsTelemetry(
      '7d',
      TODAY,
      [mockTask],
      untimedProgress,
      [],
      {},
      [],
      [],
      [],
      {},
      [sealedCheckIn],
      []
    );
    expect(withCheckIn.activity.studyMinutes).toBe(30);
    expect(withCheckIn.activity.studyHours).toBe('0.5');

    // Tracked task minutes count too (larger of the two overlapping recordings).
    const timedProgress: Record<string, TaskProgress> = {
      'task-1': { ...untimedProgress['task-1'], timeSpentMinutes: 45 },
    };
    const withBoth = evaluateAnalyticsTelemetry(
      '7d',
      TODAY,
      [mockTask],
      timedProgress,
      [],
      {},
      [],
      [],
      [],
      {},
      [sealedCheckIn],
      []
    );
    expect(withBoth.activity.studyMinutes).toBe(45);
    expect(withBoth.activity.studyHours).toBe('0.8');
  });
});
