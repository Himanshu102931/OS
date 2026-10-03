// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  routeWeaknessSignals,
  routePracticeWeakness,
  routeDsaRemediationConcepts,
  routeAssessmentWeakness,
  routeSkillWeakness,
  DOMAIN_TO_PREP_TOPIC,
} from '../engine/weaknessRouter';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import type {
  PracticeAttempt,
  DSAProgress,
  TaskProgress,
  TopicSkillState,
  DomainAssessmentResult,
  WeaknessSignal,
  DomainId,
} from '../types';

describe('Weakness Signal → Task Auto-Generation Engine', () => {
  // --- 1. PRACTICE WEAKNESS ROUTING ---
  describe('Practice Weakness Routing', () => {
    it('routes low accuracy (<50%) conceptual practice attempt to concept preparation', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-1',
        sessionId: 'prac-py-1',
        sessionTitle: 'Python Data Structures',
        category: 'coding',
        domainId: 'python',
        topicId: 'prep-lang',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 35,
        accuracyPct: 35,
        correctCount: 2,
        totalQuestions: 6,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-1',
      };

      const candidates = routePracticeWeakness({
        practiceAttempts: [mockAttempt],
        practiceSessions: PRACTICE_SESSIONS,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBeGreaterThan(0);
      const top = candidates[0];
      expect(top.route).toBe('preparation');
      expect(top.targetId).toBe('prep-lang');
      expect(top.priority).toBe('routed_weakness');
      expect(top.type).toBe('preparation_lesson');
      expect(top.title).toContain('Concept Review');
      expect(top.reason).toContain('Conceptual weakness detected');
      expect(top.priorityScore).toBe(65); // 100 - 35
    });

    it('routes moderate accuracy (50-59%) attempt to targeted practice repetition', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-2',
        sessionId: 'practice-sql-01',
        sessionTitle: 'SQL Queries Practice',
        category: 'coding',
        domainId: 'sql',
        topicId: 'prep-sql',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 55,
        accuracyPct: 55,
        correctCount: 3,
        totalQuestions: 6,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-2',
      };

      const candidates = routePracticeWeakness({
        practiceAttempts: [mockAttempt],
        practiceSessions: PRACTICE_SESSIONS,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBeGreaterThan(0);
      const top = candidates[0];
      expect(top.route).toBe('practice');
      expect(top.targetId).toBe('practice-sql-01');
      expect(top.type).toBe('practice_session');
      expect(top.reason).toContain('Practice drill score');
      expect(top.priorityScore).toBe(45); // 100 - 55
    });

    it('does not route weakness for passed attempts with accuracy >= 60%', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-3',
        sessionId: 'prac-py-1',
        sessionTitle: 'Python Data Structures',
        category: 'coding',
        domainId: 'python',
        topicId: 'prep-lang',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 85,
        accuracyPct: 85,
        correctCount: 5,
        totalQuestions: 6,
        passed: true,
        userAnswers: [],
        evidenceLogId: 'ev-3',
      };

      const candidates = routePracticeWeakness({
        practiceAttempts: [mockAttempt],
        practiceSessions: PRACTICE_SESSIONS,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBe(0);
    });
  });

  // --- 2. DSA REMEDIATION & PRECEDENCE ---
  describe('DSA Failure Routing & Remediation Precedence', () => {
    it('surfaces an explanatory concept lesson when DSA remediation is active', () => {
      const prob = DSA_PROBLEMS[0]; // dsa-001 Two Sum
      const dsaProgressMap: Record<string, DSAProgress> = {
        [prob.id]: {
          problemId: prob.id,
          currentBox: 1,
          remediationRequired: true,
          attemptCount: 3,
          consecutiveFailures: 3,
          passedIndependently: false,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
      };

      const candidates = routeDsaRemediationConcepts({
        dsaProblems: [prob],
        dsaProgressMap,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBe(1);
      const conceptCandidate = candidates[0];
      expect(conceptCandidate.route).toBe('preparation');
      expect(conceptCandidate.targetId).toBe('prep-coding-ds');
      expect(conceptCandidate.type).toBe('preparation_lesson');
      expect(conceptCandidate.priority).toBe('routed_weakness');
      expect(conceptCandidate.reason).toContain('DSA remediation active');
    });

    it('preserves remediation precedence: remediation tier beats routed weakness in scheduler', () => {
      const prob = DSA_PROBLEMS[0]; // dsa-001 Two Sum
      const dsaProgressMap: Record<string, DSAProgress> = {
        [prob.id]: {
          problemId: prob.id,
          currentBox: 1,
          remediationRequired: true,
          attemptCount: 3,
          consecutiveFailures: 3,
          passedIndependently: false,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
      };

      const schedule = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: [prob],
        dsaProgressMap,
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: {},
        companyOverlays: [],
        currentMode: 'normal',
        todayStr: '2026-10-15',
        todayAssignments: [],
      });

      // Remediation candidate (tier 0) must appear before routed_weakness (tier 2)
      expect(schedule.hasRemediation).toBe(true);
      expect(schedule.candidates.length).toBeGreaterThanOrEqual(2);

      const remediationCandidate = schedule.candidates.find(c => c.priority === 'remediation');
      const conceptCandidate = schedule.candidates.find(c => c.priority === 'routed_weakness');

      expect(remediationCandidate).toBeDefined();
      expect(remediationCandidate?.targetId).toBe(prob.id);
      expect(conceptCandidate).toBeDefined();
      expect(conceptCandidate?.targetId).toBe('prep-coding-ds');

      // Index of remediation must precede index of routed weakness
      const idxRemediation = schedule.candidates.indexOf(remediationCandidate!);
      const idxConcept = schedule.candidates.indexOf(conceptCandidate!);
      expect(idxRemediation).toBeLessThan(idxConcept);
    });

    it('deduplicates concept candidates across multiple remediation problems', () => {
      const prob1 = DSA_PROBLEMS[0];
      const prob2 = DSA_PROBLEMS[1];
      const dsaProgressMap: Record<string, DSAProgress> = {
        [prob1.id]: {
          problemId: prob1.id,
          currentBox: 1,
          remediationRequired: true,
          attemptCount: 3,
          consecutiveFailures: 3,
          passedIndependently: false,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
        [prob2.id]: {
          problemId: prob2.id,
          currentBox: 1,
          remediationRequired: true,
          attemptCount: 3,
          consecutiveFailures: 3,
          passedIndependently: false,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
      };

      const routed = routeWeaknessSignals({
        dsaProblems: [prob1, prob2],
        dsaProgressMap,
        preparationTopics: PREPARATION_TOPICS,
      });

      // Both map to prep-coding-ds, deduplicator must produce only 1 candidate
      const codingDsCandidates = routed.filter(c => c.targetId === 'prep-coding-ds');
      expect(codingDsCandidates.length).toBe(1);
    });
  });

  // --- 3. ASSESSMENT WEAKNESS ROUTING ---
  describe('Assessment Weakness Routing', () => {
    it('routes low-confidence assessment weakness to proof-building preparation', () => {
      const domainResults: DomainAssessmentResult[] = [
        {
          domainId: 'sql',
          abilityScore: 30,
          level: 1,
          confidence: 'low',
          status: 'assessed',
          assessmentDate: '2026-10-15',
          provisional: true,
          attemptId: 'diag-1',
          coverage: { topicsCovered: 1, topicsTotal: 1, competenciesCovered: [], difficultyBands: [1] },
          kind: 'diagnostic_assessment',
        },
      ];

      const weaknessSignals: WeaknessSignal[] = [
        {
          id: 'ws-sql-1',
          domainId: 'sql',
          topicId: 'prep-sql',
          competency: 'Relational Joins',
          errorCategory: 'syntax_error',
          strength: 2,
          status: 'open',
          firstSeenAt: '2026-10-15T00:00:00Z',
          lastSeenAt: '2026-10-15T00:00:00Z',
          occurrences: 1,
          sourceAttemptIds: ['diag-1'],
        },
      ];

      const candidates = routeAssessmentWeakness({
        domainResults,
        weaknessSignals,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBe(1);
      const candidate = candidates[0];
      expect(candidate.route).toBe('preparation');
      expect(candidate.targetId).toBe('prep-sql');
      expect(candidate.title).toContain('Proof Building');
      expect(candidate.reason).toContain('Low-confidence assessment diagnosis');
    });

    it('routes high-confidence assessment weakness to curriculum task or DSA problem', () => {
      const domainResults: DomainAssessmentResult[] = [
        {
          domainId: 'sql',
          abilityScore: 40,
          level: 2,
          confidence: 'high',
          status: 'assessed',
          assessmentDate: '2026-10-15',
          provisional: false,
          attemptId: 'diag-1',
          coverage: { topicsCovered: 1, topicsTotal: 1, competenciesCovered: [], difficultyBands: [1] },
          kind: 'diagnostic_assessment',
        },
      ];

      const weaknessSignals: WeaknessSignal[] = [
        {
          id: 'ws-sql-2',
          domainId: 'sql',
          topicId: 'topic-sql-fundamentals',
          competency: 'Relational Joins',
          errorCategory: 'logic_error',
          strength: 3,
          status: 'open',
          firstSeenAt: '2026-10-15T00:00:00Z',
          lastSeenAt: '2026-10-15T00:00:00Z',
          occurrences: 2,
          sourceAttemptIds: ['diag-1'],
        },
      ];

      const uncompletedTask = TASK_DEFINITIONS.find(t => t.domainId === 'sql')!;

      const candidates = routeAssessmentWeakness({
        domainResults,
        weaknessSignals,
        tasks: [uncompletedTask],
        taskProgressMap: {},
        activePhase: 2,
      });

      expect(candidates.length).toBe(1);
      const candidate = candidates[0];
      expect(candidate.route).toBe('roadmap');
      expect(candidate.targetId).toBe(uncompletedTask.id);
      expect(candidate.title).toContain('Curriculum Task');
      expect(candidate.reason).toContain('Confirmed weakness');
      expect(candidate.reason).toContain('high confidence');
    });
  });

  // --- 4. CANONICAL SKILLS WEAKNESS ROUTING ---
  describe('Skills Weakness Routing', () => {
    it('routes stale or low-evidence skill states deterministically', () => {
      const skillStates: Record<string, TopicSkillState> = {
        'prep-lang': {
          topicId: 'prep-lang',
          domainId: 'python',
          freshness: 'stale',
          evidenceStrength: 25,
        },
        'prep-dbms': {
          topicId: 'prep-dbms',
          domainId: 'dbms',
          freshness: 'fresh',
          evidenceStrength: 15,
        },
      };

      const candidates = routeSkillWeakness({
        skillStates,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(candidates.length).toBe(2);
      // Weaker skill (15%) must have higher priorityScore (85) than (25% -> 75)
      expect(candidates[0].targetId).toBe('prep-dbms');
      expect(candidates[0].priorityScore).toBe(85);
      expect(candidates[1].targetId).toBe('prep-lang');
      expect(candidates[1].priorityScore).toBe(75);
    });
  });

  // --- 5. PREREQUISITES & PHASE LOCKS ---
  describe('Safety & Prerequisite Exclusion', () => {
    it('excludes targets blocked by unfulfilled prerequisites', () => {
      // prep-interview-tech has prerequisites: ['prep-coding-ds', 'prep-sql', 'prep-os']
      // With empty preparationTopicProgress, it is locked
      const mockAttempt: PracticeAttempt = {
        id: 'att-interview',
        sessionId: 'prac-interview-1',
        sessionTitle: 'Technical Interview Mock',
        category: 'technical_interview',
        domainId: 'interviews',
        topicId: 'prep-interview-tech',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 30,
        accuracyPct: 30,
        correctCount: 1,
        totalQuestions: 5,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-int',
      };

      const candidates = routeWeaknessSignals({
        practiceAttempts: [mockAttempt],
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: {}, // No prerequisites met
      });

      // Should be excluded from final unblocked candidate output
      const blockedCandidate = candidates.find(c => c.targetId === 'prep-interview-tech');
      expect(blockedCandidate).toBeUndefined();
    });

    it('excludes roadmap tasks blocked by uncompleted prerequisites or phase locks', () => {
      const task = { ...TASK_DEFINITIONS[0], prerequisiteTaskDefinitionIds: ['task-prereq-missing'] };
      const taskProgressMap: Record<string, TaskProgress> = {
        // prerequisite not completed
      };

      const candidates = routeSkillWeakness({
        skillStates: {
          [task.topicId]: {
            topicId: task.topicId,
            domainId: task.domainId,
            freshness: 'stale',
            evidenceStrength: 10,
          },
        },
        tasks: [task],
        taskProgressMap,
        activePhase: 1,
      });

      expect(candidates[0].isBlocked).toBe(true);

      const finalCandidates = routeWeaknessSignals({
        skillStates: {
          [task.topicId]: {
            topicId: task.topicId,
            domainId: task.domainId,
            freshness: 'stale',
            evidenceStrength: 10,
          },
        },
        tasks: [task],
        taskProgressMap,
        activePhase: 1,
      });

      expect(finalCandidates.find(c => c.targetId === task.id)).toBeUndefined();
    });
  });

  // --- 6. COMMITTED TARGET EXCLUSION ---
  describe('Today Committed Target Exclusion', () => {
    it('excludes targets already committed or completed today', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-1',
        sessionId: 'prac-py-1',
        sessionTitle: 'Python Data Structures',
        category: 'coding',
        domainId: 'python',
        topicId: 'prep-lang',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 35,
        accuracyPct: 35,
        correctCount: 2,
        totalQuestions: 6,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-1',
      };

      const candidates = routeWeaknessSignals({
        practiceAttempts: [mockAttempt],
        preparationTopics: PREPARATION_TOPICS,
        committedTargetIds: new Set(['prep-lang']), // Already committed for today
      });

      expect(candidates.find(c => c.targetId === 'prep-lang')).toBeUndefined();
    });
  });

  // --- 7. NO PHANTOM TARGET GENERATION & RECOVERY FALLBACK ---
  describe('No Phantom Targets & Clean Fallback', () => {
    it('never generates a candidate with a phantom or non-existent targetId', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-phantom',
        sessionId: 'non-existent-session',
        sessionTitle: 'Phantom Session',
        category: 'coding',
        domainId: 'python',
        topicId: 'completely-unknown-topic-xyz',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 20,
        accuracyPct: 20,
        correctCount: 1,
        totalQuestions: 5,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-p',
      };

      const candidates = routePracticeWeakness({
        practiceAttempts: [mockAttempt],
        practiceSessions: PRACTICE_SESSIONS,
        preparationTopics: PREPARATION_TOPICS,
      });

      // Falls back to domain prep topic (prep-lang)
      expect(candidates.length).toBe(1);
      expect(candidates[0].targetId).toBe('prep-lang');
      expect(PREPARATION_TOPICS.some(t => t.id === candidates[0].targetId)).toBe(true);
    });

    it('provides valid domain to preparation topic mappings', () => {
      expect(DOMAIN_TO_PREP_TOPIC.python).toBe('prep-lang');
      expect(DOMAIN_TO_PREP_TOPIC.sql).toBe('prep-sql');
      expect(DOMAIN_TO_PREP_TOPIC.dsa).toBe('prep-coding-ds');
      expect(DOMAIN_TO_PREP_TOPIC.dbms).toBe('prep-dbms');
      expect(DOMAIN_TO_PREP_TOPIC.oop).toBe('prep-oop');
    });

    it('gracefully returns empty when domain has no executable target rather than fabricating one', () => {
      const candidates = routeAssessmentWeakness({
        domainResults: [{
          domainId: 'non-existent-domain' as unknown as DomainId,
          abilityScore: 10,
          level: 0,
          confidence: 'none',
          status: 'unassessed',
          assessmentDate: '2026-10-15',
          provisional: true,
          attemptId: 'diag-unknown',
          coverage: { topicsCovered: 0, topicsTotal: 1, competenciesCovered: [], difficultyBands: [1] },
          kind: 'diagnostic_assessment',
        }],
        weaknessSignals: [{
          id: 'ws-unknown',
          domainId: 'non-existent-domain' as unknown as DomainId,
          errorCategory: 'unknown',
          strength: 1,
          status: 'open',
          firstSeenAt: '2026-10-15T00:00:00Z',
          lastSeenAt: '2026-10-15T00:00:00Z',
          occurrences: 1,
          sourceAttemptIds: [],
        }],
        preparationTopics: [],
        practiceSessions: [],
        tasks: [],
      });

      expect(candidates.length).toBe(0);
    });
  });

  // --- 8. DETERMINISTIC ORDERING ---
  describe('Deterministic Ordering', () => {
    it('produces identical candidates in identical order over multiple runs', () => {
      const mockAttempt: PracticeAttempt = {
        id: 'att-det',
        sessionId: 'prac-py-1',
        sessionTitle: 'Python Data Structures',
        category: 'coding',
        domainId: 'python',
        topicId: 'prep-lang',
        date: '2026-10-15',
        completedAt: '2026-10-15T10:00:00Z',
        totalTimeSeconds: 600,
        scorePct: 40,
        accuracyPct: 40,
        correctCount: 2,
        totalQuestions: 5,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-det',
      };

      const options = {
        practiceAttempts: [mockAttempt],
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        dsaProblems: DSA_PROBLEMS,
        topics: TOPICS,
        domains: DOMAINS,
      };

      const run1 = routeWeaknessSignals(options);
      const run2 = routeWeaknessSignals(options);

      expect(run1).toEqual(run2);
      expect(run1.map(c => c.id)).toEqual(run2.map(c => c.id));
    });
  });

  // --- 9. INTEGRATION WITH REVIEW SCHEDULER ---
  describe('Scheduler Integration & Deduplication', () => {
    it('routed weakness does not duplicate reviewScheduler output', () => {
      const prob = DSA_PROBLEMS[0]; // Two Sum
      const schedule = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: [prob],
        dsaProgressMap: {
          [prob.id]: {
            problemId: prob.id,
            currentBox: 1,
            remediationRequired: true,
            attemptCount: 3,
            consecutiveFailures: 3,
            passedIndependently: false,
            assistedProvisional: false,
            consecutiveAssistedPasses: 0,
            patternLessonViewed: false,
            patternLessonCompleted: false,
            remediationSelfCheckPassed: false,
            evidenceStrength: 0,
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-15T00:00:00Z',
          },
        },
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: {
          'prep-coding-ds': {
            topicId: 'prep-coding-ds',
            domainId: 'dsa',
            freshness: 'stale',
            evidenceStrength: 20,
          },
        },
        companyOverlays: [],
        currentMode: 'normal',
        todayStr: '2026-10-15',
        todayAssignments: [],
        preparationTopics: PREPARATION_TOPICS,
      });

      // Check unique targetIds across all returned candidates
      const targetIds = schedule.candidates.map(c => c.targetId);
      const uniqueTargets = new Set(targetIds);
      expect(targetIds.length).toBe(uniqueTargets.size);
    });

    it('higher priority review beats routed weakness if targetId collides', () => {
      const prob = DSA_PROBLEMS[0];
      // Target prob.id is due for review today
      const schedule = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: [prob],
        dsaProgressMap: {
          [prob.id]: {
            problemId: prob.id,
            currentBox: 1,
            nextReviewAt: '2026-10-15', // Due today -> overdue_review (tier 1)
            remediationRequired: false,
            attemptCount: 1,
            consecutiveFailures: 0,
            passedIndependently: true,
            assistedProvisional: false,
            consecutiveAssistedPasses: 0,
            patternLessonViewed: false,
            patternLessonCompleted: false,
            remediationSelfCheckPassed: false,
            evidenceStrength: 0.5,
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-15T00:00:00Z',
          },
        },
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: {
          [prob.topicId]: {
            topicId: prob.topicId,
            domainId: 'dsa',
            freshness: 'stale',
            evidenceStrength: 10, // weak skill pointing to prob.id
          },
        },
        companyOverlays: [],
        currentMode: 'normal',
        todayStr: '2026-10-15',
        todayAssignments: [],
      });

      // prob.id should appear with priority 'overdue_review' because tier 1 > tier 2 (routed_weakness)
      const candidate = schedule.candidates.find(c => c.targetId === prob.id);
      expect(candidate).toBeDefined();
      expect(candidate?.priority).toBe('overdue_review');
    });
  });
});
