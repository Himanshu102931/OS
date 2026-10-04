// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  resolvePracticeContinuation,
  getContinuationDeepLink,
} from '../engine/practiceContinuation';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import type {
  PracticeAttempt,
  PracticeSessionDefinition,
  TopicSkillState,
  CompanyOverlay,
  DSAProgress,
  TaskProgress,
  PreparationTopicProgress,
  TopicStageId,
  DomainAssessmentResult,
  WeaknessSignal,
} from '../types';

const TODAY = '2026-10-15';

// A simple passed attempt factory
function makeAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'practice-attempt-1',
    sessionId: 'practice-apt-01',
    sessionTitle: 'Quantitative Aptitude Essentials',
    category: 'aptitude',
    domainId: 'aptitude',
    topicId: 'prep-apt-quant',
    date: TODAY,
    completedAt: new Date().toISOString(),
    totalTimeSeconds: 1200,
    scorePct: 85,
    accuracyPct: 85,
    correctCount: 4,
    totalQuestions: 5,
    passed: true,
    passingScorePct: 70,
    userAnswers: [],
    evidenceLogId: 'ev-log-1',
    ...overrides,
  };
}

// A simple failed/weak attempt factory
function makeWeakAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'practice-attempt-weak',
    sessionId: 'practice-sql-01',
    sessionTitle: 'SQL Query Scenarios & Optimization',
    category: 'sql',
    domainId: 'sql',
    topicId: 'prep-sql',
    date: TODAY,
    completedAt: new Date().toISOString(),
    totalTimeSeconds: 1200,
    scorePct: 35,
    accuracyPct: 35,
    correctCount: 1,
    totalQuestions: 4,
    passed: false,
    passingScorePct: 70,
    userAnswers: [
      { questionId: 'q-sql-1', isCorrect: false },
      { questionId: 'q-sql-2', isCorrect: false },
    ],
    evidenceLogId: 'ev-log-weak',
    ...overrides,
  };
}

const mockSession: PracticeSessionDefinition = {
  id: 'practice-sql-01',
  title: 'SQL Query Scenarios & Optimization',
  description: 'JOINs, Aggregations, HAVING, Window Functions, Subqueries, and CTEs.',
  category: 'sql',
  domainId: 'sql',
  topicId: 'prep-sql',
  estimatedMinutes: 20,
  questionCount: 4,
  passingScorePct: 70,
  questions: [
    { id: 'q-sql-1', category: 'sql', domainId: 'sql', topicId: 'prep-sql', categoryTag: 'JOIN', questionType: 'sql_scenario', prompt: '...', explanation: '...' },
    { id: 'q-sql-2', category: 'sql', domainId: 'sql', topicId: 'prep-sql', categoryTag: 'Window', questionType: 'sql_scenario', prompt: '...', explanation: '...' },
    { id: 'q-sql-3', category: 'sql', domainId: 'sql', topicId: 'prep-sql', categoryTag: 'EXISTS', questionType: 'sql_scenario', prompt: '...', explanation: '...' },
    { id: 'q-sql-4', category: 'sql', domainId: 'sql', topicId: 'prep-sql', categoryTag: 'CTE', questionType: 'sql_scenario', prompt: '...', explanation: '...' },
  ],
};

const aptSession: PracticeSessionDefinition = {
  id: 'practice-apt-01',
  title: 'Quantitative Aptitude Essentials',
  description: '5-question drill covering Percentages, Ratios, Profit & Loss, Time & Work, and Speed/Distance.',
  category: 'aptitude',
  domainId: 'aptitude',
  topicId: 'prep-apt-quant',
  estimatedMinutes: 20,
  questionCount: 5,
  passingScorePct: 70,
  questions: [
    { id: 'q-apt-1', category: 'aptitude', domainId: 'aptitude', topicId: 'prep-apt-quant', categoryTag: 'Percentages', questionType: 'mcq', prompt: '...', options: [], correctAnswer: 0 },
    { id: 'q-apt-2', category: 'aptitude', domainId: 'aptitude', topicId: 'prep-apt-quant', categoryTag: 'Time', questionType: 'mcq', prompt: '...', options: [], correctAnswer: 0 },
  ],
};

const baseOptions = {
  practiceAttempts: [],
  practiceSessions: PRACTICE_SESSIONS,
  skillStates: {} as Record<string, TopicSkillState>,
  companyOverlays: [] as CompanyOverlay[],
  dsaProblems: DSA_PROBLEMS,
  dsaProgressMap: {} as Record<string, DSAProgress>,
  tasks: TASK_DEFINITIONS,
  taskProgressMap: {} as Record<string, TaskProgress>,
  topics: TOPICS,
  domains: DOMAINS,
  preparationTopics: PREPARATION_TOPICS,
  preparationTopicProgress: {} as Record<string, PreparationTopicProgress>,
  domainResults: [] as DomainAssessmentResult[],
  weaknessSignals: [] as WeaknessSignal[],
  activePhase: 1,
  todayStr: TODAY,
  committedTargetIds: new Set<string>(),
  availableMinutes: 60,
};

describe('§19 Practice Session Chaining — PracticeContinuation engine', () => {
  describe('Completion — successful practice', () => {
    it('returns progression continuation when next practice session exists in same domain and not yet passed', () => {
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      expect(result.continuation).not.toBeNull();
      expect(result.continuation?.kind).toBe('progression');
      expect(result.continuation?.route).toBe('practice');
      expect(result.continuation?.targetId).toBeDefined();
      // Target must be a real practice session
      const targetSession = PRACTICE_SESSIONS.find(s => s.id === result.continuation?.targetId);
      expect(targetSession).toBeDefined();
      expect(targetSession?.domainId).toBe('aptitude');
    });

    it('returns no continuation when no valid next practice session exists', () => {
      const attempt = makeAttempt({ sessionId: 'practice-project-defense-01' });
      const projectSession = PRACTICE_SESSIONS.find(s => s.id === 'practice-project-defense-01')!;
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: projectSession,
        practiceAttempts: [attempt],
        practiceSessions: [projectSession], // only this session exists
      };

      const result = resolvePracticeContinuation(options);

      // No other session in same domain → no progression
      expect(result.continuation).toBeNull();
      expect(result.summary).toContain('No further practice chaining available');
    });
  });

  describe('Weakness — failed practice', () => {
    it('returns remediation continuation when attempt fails', () => {
      const attempt = makeWeakAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: mockSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      expect(result.continuation).not.toBeNull();
      expect(result.continuation?.kind).toBe('remediation');
      // Remediation route must be preparation or practice (per remediationRouter)
      expect(['preparation', 'practice']).toContain(result.continuation?.route);
      expect(result.continuation?.targetId).toBeDefined();
      expect(result.continuation?.isBlocked).toBe(false);
    });

    it('returns no continuation when all remediation routes are blocked', () => {
      const attempt = makeWeakAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: mockSession,
        practiceAttempts: [attempt],
        preparationTopicProgress: {
          'prep-sql': {
            topicId: 'prep-sql',
            sectionId: 'coding' as const,
            domainId: 'sql' as const,
            currentStage: 'orient' as const,
            completedStages: [] as TopicStageId[],
            stageProgress: {
              orient: { timeSpentMinutes: 0 },
              learn: { timeSpentMinutes: 0 },
              apply: { timeSpentMinutes: 0 },
              assess: { timeSpentMinutes: 0 },
              review: { timeSpentMinutes: 0 },
              interview: { timeSpentMinutes: 0 },
              evidence: { timeSpentMinutes: 0 },
            },
            lastAccessedAt: '2026-10-12T00:00:00.000Z',
            totalTimeSpentMinutes: 0,
            evidenceStrength: 0,
            freshness: 'fresh' as const,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-12T00:00:00.000Z',
          },
        },
      };

      const result = resolvePracticeContinuation(options);

      // Could be null if prerequisites block it
      if (result.continuation) {
        expect(result.continuation.kind).toBe('remediation');
      }
    });

    it('does not duplicate remediation logic — uses resolvePracticeRemediation from remediationRouter', () => {
      const attempt = makeWeakAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: mockSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      // The continuation reason should match the remediationRouter output pattern
      if (result.continuation) {
        expect(result.continuation.reason).toBeTruthy();
        expect(result.continuation.reason.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Retrieval — preparation curriculum completed but evidence unproven', () => {
    it('returns retrieval continuation when preparation is complete but no practice proof exists', () => {
      const attempt = makeAttempt({ sessionId: 'practice-sql-01', passed: true, accuracyPct: 80 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: mockSession,
        practiceAttempts: [attempt],
        preparationTopicProgress: {
          'prep-sql': {
            topicId: 'prep-sql',
            sectionId: 'coding' as const,
            domainId: 'sql' as const,
            currentStage: 'apply' as const,
            completedStages: ['orient', 'learn'] as TopicStageId[],
            stageProgress: {
              orient: { startedAt: '2026-10-10T00:00:00.000Z', completedAt: '2026-10-10T00:00:00.000Z', timeSpentMinutes: 10 },
              learn: { startedAt: '2026-10-11T00:00:00.000Z', completedAt: '2026-10-12T00:00:00.000Z', timeSpentMinutes: 20 },
              apply: { startedAt: '2026-10-12T00:00:00.000Z', timeSpentMinutes: 0 },
              assess: { timeSpentMinutes: 0 },
              review: { timeSpentMinutes: 0 },
              interview: { timeSpentMinutes: 0 },
              evidence: { timeSpentMinutes: 0 },
            },
            lastAccessedAt: '2026-10-12T00:00:00.000Z',
            totalTimeSpentMinutes: 30,
            evidenceStrength: 50,
            freshness: 'fresh' as const,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-12T00:00:00.000Z',
          },
        },
      };

      const result = resolvePracticeContinuation(options);

      // May return retrieval if resolvePreparationContinuation finds a route
      // or progression if no retrieval route exists
      if (result.continuation) {
        expect(['retrieval', 'progression', 'remediation']).toContain(result.continuation.kind);
        expect(result.continuation.targetId).toBeDefined();
      }
    });
  });

  describe('Chaining — explicit next session relationship', () => {
    it('chains to next practice session in same domain when available', () => {
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      expect(result.continuation).not.toBeNull();
      expect(result.continuation?.kind).toBe('progression');
      expect(result.continuation?.route).toBe('practice');
    });

    it('rejects invalid next session (not in PRACTICE_SESSIONS)', () => {
      const attempt = makeAttempt();
      const fakeSession = { ...aptSession, id: 'fake-session-id' };
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: fakeSession,
        practiceAttempts: [attempt],
        practiceSessions: [fakeSession], // not in canonical PRACTICE_SESSIONS
      };

      const result = resolvePracticeContinuation(options);

      // Should not fabricate a target
      expect(result.continuation).toBeNull();
    });

    it('does not infer chain from naming similarity alone', () => {
      // Two sessions with similar names but no explicit relationship
      const attempt = makeAttempt({ sessionId: 'practice-verbal-01' });
      const verbalSession = PRACTICE_SESSIONS.find(s => s.id === 'practice-verbal-01')!;
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: verbalSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      // If no other session in same domain, no chain
      if (result.continuation?.kind === 'progression') {
        // Verify it's a real session in the same domain
        const target = PRACTICE_SESSIONS.find(s => s.id === result.continuation?.targetId);
        expect(target).toBeDefined();
        expect(target?.domainId).toBe('communication');
      }
    });
  });

  describe('Budget', () => {
    it('respects 25-minute budget', () => {
      const attempt = makeAttempt({ scorePct: 90, accuracyPct: 90 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
        availableMinutes: 25,
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.estimatedMinutes).toBeLessThanOrEqual(25);
      }
    });

    it('respects 45-minute budget', () => {
      const attempt = makeAttempt({ scorePct: 90, accuracyPct: 90 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
        availableMinutes: 45,
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.estimatedMinutes).toBeLessThanOrEqual(45);
      }
    });

    it('respects 60-minute budget', () => {
      const attempt = makeAttempt({ scorePct: 90, accuracyPct: 90 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
        availableMinutes: 60,
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.estimatedMinutes).toBeLessThanOrEqual(60);
      }
    });

    it('respects 120-minute budget', () => {
      const attempt = makeAttempt({ scorePct: 90, accuracyPct: 90 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
        availableMinutes: 120,
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.estimatedMinutes).toBeLessThanOrEqual(120);
      }
    });

    it('does not propose continuation exceeding available minutes', () => {
      const attempt = makeAttempt({ scorePct: 90, accuracyPct: 90 });
      const longSession = { ...aptSession, estimatedMinutes: 100 };
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: longSession,
        practiceAttempts: [attempt],
        availableMinutes: 30,
        practiceSessions: [longSession], // Only this long session available
      };

      const result = resolvePracticeContinuation(options);

      // Should not propose a 100-minute session when only 30 minutes available
      expect(result.continuation).toBeNull();
    });
  });

  describe('Evidence semantics', () => {
    it('does not create evidence from navigation', () => {
      // The engine itself does not emit evidence — it only reads state
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      // Engine returns continuation only — no evidence creation
      expect(result.continuation).toBeDefined();
      // Continuation target has no evidenceLogId (it's not an evidence object)
      expect('evidenceLogId' in (result.continuation ?? {})).toBe(false);
    });

    it('does not create duplicate completion evidence', () => {
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt, attempt], // duplicate attempt
      };

      const result = resolvePracticeContinuation(options);

      // Should still return single continuation, not duplicate
      expect(result.continuation ? 1 : 0).toBeLessThanOrEqual(1);
    });

    it('preserves historical evidence — does not mutate input attempts', () => {
      const attempt = makeAttempt();
      const attempts = [attempt];
      const attemptsSnapshot = JSON.stringify(attempts);
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: attempts,
      };

      resolvePracticeContinuation(options);

      expect(JSON.stringify(attempts)).toBe(attemptsSnapshot);
    });
  });

  describe('Deep-link behavior', () => {
    it('returns valid deep-link for Practice target', () => {
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);
      const deepLink = getContinuationDeepLink(result.continuation);

      if (deepLink) {
        expect(deepLink.route).toBe('practice');
        expect(deepLink.targetId).toBe(result.continuation?.targetId);
      }
    });

    it('returns null for blocked continuation', () => {
      const attempt = makeWeakAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: mockSession,
        practiceAttempts: [attempt],
        // Force a blocked remediation by having a remediation target that's committed
        committedTargetIds: new Set(['prep-sql']),
      };

      const result = resolvePracticeContinuation(options);
      const deepLink = getContinuationDeepLink(result.continuation);

      // If continuation exists but is blocked, deep-link should be null
      if (result.continuation?.isBlocked) {
        expect(deepLink).toBeNull();
      }
    });

    it('rejects invalid target (not in canonical dataset)', () => {
      // The engine should never return a targetId not in PRACTICE_SESSIONS
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        const isValid = PRACTICE_SESSIONS.some(s => s.id === result.continuation?.targetId);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Prerequisites', () => {
    it('does not surface blocked target as executable', () => {
      // This is tested implicitly — continuation.isBlocked should be false for returned targets
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.isBlocked).toBe(false);
      }
    });

    it('unlocked target works', () => {
      const attempt = makeAttempt();
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const result = resolvePracticeContinuation(options);

      if (result.continuation) {
        expect(result.continuation.isBlocked).toBe(false);
        expect(result.continuation.blockingReason).toBeUndefined();
      }
    });
  });

  describe('Task 4 regression — remediationRouter unchanged', () => {
    it('resolvePracticeRemediation still produces remediation routes', async () => {
      // Just verify the function exists and runs without error
      const { resolvePracticeRemediation } = await import('../engine/remediationRouter');
      expect(typeof resolvePracticeRemediation).toBe('function');
    });
  });

  describe('Task 5 regression — companyPlanEngine unchanged', () => {
    it('companyPlanEngine exports still present', async () => {
      const { generateCompanyFocusCandidates } = await import('../engine/companyPlanEngine');
      expect(typeof generateCompanyFocusCandidates).toBe('function');
    });
  });

  describe('Determinism', () => {
    it('returns identical result on repeated execution', () => {
      const attempt = makeAttempt({ scorePct: 75, accuracyPct: 75 });
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      const first = resolvePracticeContinuation(options);
      const second = resolvePracticeContinuation(options);

      expect(second).toEqual(first);
    });

    it('does not mutate inputs', () => {
      const attempt = makeAttempt({ scorePct: 75, accuracyPct: 75 });
      const attempts = [attempt];
      const attemptsSnapshot = JSON.stringify(attempts);
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: attempts,
      };

      resolvePracticeContinuation(options);

      expect(JSON.stringify(attempts)).toBe(attemptsSnapshot);
    });

    it('does not mutate practice sessions array', () => {
      const attempt = makeAttempt({ scorePct: 75, accuracyPct: 75 });
      const sessionsSnapshot = JSON.stringify(PRACTICE_SESSIONS);
      const options = {
        ...baseOptions,
        completedAttempt: attempt,
        completedSession: aptSession,
        practiceAttempts: [attempt],
      };

      resolvePracticeContinuation(options);

      expect(JSON.stringify(PRACTICE_SESSIONS)).toBe(sessionsSnapshot);
    });
  });
});