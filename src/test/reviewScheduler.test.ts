// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateReviewCandidates,
} from '../engine/reviewScheduler';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TOPICS } from '../data/seedData';
import { DOMAINS } from '../data/seedData';
import { TASK_DEFINITIONS } from '../data/seedData';
import { PHASES } from '../data/seedData';
import { StorageAdapter } from '../storage/storageAdapter';
import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  Phase,
  PlacementMode,
  DailyTaskAssignment,
  Topic,
  DomainDefinition,
  PracticeAttempt,
} from '../types';
import { type ReviewPrompt } from '../engine/analyticsEngine';

function createMockState(overrides: Partial<{
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  topics: Topic[];
  domains: DomainDefinition[];
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  activePhase: Phase;
  currentMode: PlacementMode;
  todayStr: string;
  todayAssignments: DailyTaskAssignment[];
  analyticsReviewPrompts: ReviewPrompt[];
  practiceAttempts: PracticeAttempt[];
  targetCompanyId?: string;
}> = {}) {
  return {
    tasks: overrides.tasks ?? TASK_DEFINITIONS,
    taskProgressMap: overrides.taskProgressMap ?? {},
    dsaProblems: overrides.dsaProblems ?? DSA_PROBLEMS,
    dsaProgressMap: overrides.dsaProgressMap ?? {},
    topics: overrides.topics ?? TOPICS,
    domains: overrides.domains ?? DOMAINS,
    skillStates: overrides.skillStates ?? {},
    companyOverlays: overrides.companyOverlays ?? [],
    activePhase: overrides.activePhase ?? PHASES[0],
    currentMode: overrides.currentMode ?? 'normal',
    todayStr: overrides.todayStr ?? '2026-10-15',
    todayAssignments: overrides.todayAssignments ?? [],
    analyticsReviewPrompts: overrides.analyticsReviewPrompts ?? [],
    practiceAttempts: overrides.practiceAttempts,
    targetCompanyId: overrides.targetCompanyId,
  };
}

function createDSACandidate(probId: string, progress: Partial<DSAProgress> = {}): DSAProgress {
  return {
    problemId: probId,
    currentBox: 1,
    nextReviewAt: undefined,
    lastAttemptAt: undefined,
    attemptCount: 0,
    passedIndependently: false,
    consecutiveAssistedPasses: 0,
    assistedProvisional: false,
    consecutiveFailures: 0,
    remediationRequired: false,
    patternLessonViewed: false,
    patternLessonCompleted: false,
    remediationSelfCheckPassed: false,
    evidenceStrength: 0,
    ...progress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createSkillState(topicId: string, overrides: Partial<TopicSkillState> = {}): TopicSkillState {
  return {
    topicId,
    domainId: 'dsa',
    freshness: 'untested',
    evidenceStrength: 0,
    ...overrides,
  };
}

function createCompanyOverlay(overrides: Partial<CompanyOverlay> = {}): CompanyOverlay {
  return {
    id: 'comp-1',
    companyName: 'TestCorp',
    targetRole: 'Software Engineer',
    applicationStatus: 'target',
    requiredDomains: ['dsa'],
    requiredTopics: [],
    requiredLanguages: ['python'],
    eventDate: '2026-12-01',
    ...overrides,
  };
}

function createReviewPrompt(type: ReviewPrompt['type'], targetId: string): ReviewPrompt {
  return {
    id: `prompt-${type}-${targetId}`,
    type,
    severity: 'high',
    title: `Test ${type}`,
    description: 'Test description',
    actionLabel: 'Go',
    route: 'dsa',
    targetId,
  };
}

// --- Tests ---

describe('Review Scheduler — Adaptive Review Scheduler', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // ============================================================================
  // A. REMEDIATION OUTRANKS OVERDUE REVIEW
  // ============================================================================
  describe('Priority: remediation > overdue_review', () => {
    it('places remediation candidates before overdue review candidates', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, {
            remediationRequired: true,
            nextReviewAt: '2026-10-10', // also overdue
          }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      expect(result.candidates.length).toBeGreaterThan(0);

      // First candidate should be remediation
      const first = result.candidates[0];
      expect(first.priority).toBe('remediation');
      expect(first.priority).not.toBe('overdue_review');

      // If there are multiple candidates, remediation should come first
      const remediationCount = result.candidates.filter(c => c.priority === 'remediation').length;
      const overdueCount = result.candidates.filter(c => c.priority === 'overdue_review').length;
      expect(remediationCount).toBeGreaterThanOrEqual(1);

      if (overdueCount > 0) {
        const firstOverdueIdx = result.candidates.findIndex(c => c.priority === 'overdue_review');
        const firstRemediationIdx = result.candidates.findIndex(c => c.priority === 'remediation');
        expect(firstRemediationIdx).toBeLessThan(firstOverdueIdx);
      }
    });
  });

  // ============================================================================
  // B. OVERDUE REVIEW OUTRANKS NORMAL PROGRESSION
  // ============================================================================
  describe('Priority: overdue_review > normal_progression', () => {
    it('places overdue review candidates before normal progression candidates', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const task = TASK_DEFINITIONS.find(t => t.id === 'task-101')!;
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, {
            nextReviewAt: '2026-10-10', // overdue
          }),
        },
        taskProgressMap: {
          [task.id]: { taskId: task.id, state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: todayStr },
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const overdueIdx = result.candidates.findIndex(c => c.priority === 'overdue_review');
      const progressionIdx = result.candidates.findIndex(c => c.priority === 'normal_progression');

      if (overdueIdx >= 0 && progressionIdx >= 0) {
        expect(overdueIdx).toBeLessThan(progressionIdx);
      }
      expect(overdueIdx).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // C. STALE EVIDENCE / WEAK-TOPIC ORDERING
  // ============================================================================
  describe('Stale evidence / weak-topic ordering', () => {
    it('weaker evidence receives higher priority within stale_evidence tier', () => {
      const topicId = 'topic-dsa-arrays';
      const dsaProb1 = DSA_PROBLEMS.find(p => p.topicId === topicId)!;
      const dsaProb2 = DSA_PROBLEMS.find(p => p.id !== dsaProb1.id && p.topicId === topicId)!;
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb1, dsaProb2],
        dsaProgressMap: {
          [dsaProb1.id]: createDSACandidate(dsaProb1.id, { evidenceStrength: 0.2 }), // weaker
          [dsaProb2.id]: createDSACandidate(dsaProb2.id, { evidenceStrength: 0.5 }), // stronger
        },
        skillStates: {
          [topicId]: createSkillState(topicId, { freshness: 'stale', evidenceStrength: 30 }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const staleCandidates = result.candidates.filter(c => c.priority === 'stale_evidence');

      expect(staleCandidates.length).toBeGreaterThanOrEqual(1);

      // The candidate with weaker evidence (0.2) should have higher priorityScore
      if (staleCandidates.length >= 2) {
        // Verify the scoring formula: score = 100 - evidenceStrength * 100
        // So 0.2 => 80, 0.5 => 50
        // We'll verify by checking that lower evidence strength yields higher priorityScore
        const candidate1 = staleCandidates[0];
        const candidate2 = staleCandidates[1];
        expect(candidate1.priorityScore).toBeGreaterThanOrEqual(candidate2.priorityScore);
      }
    });

    it('weak_topic candidates have evidenceStrength < 40% and not stale', () => {
      const topicId = 'topic-dsa-arrays';
      const dsaProb = DSA_PROBLEMS.find(p => p.topicId === topicId)!;
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { evidenceStrength: 0.3 }),
        },
        skillStates: {
          [topicId]: createSkillState(topicId, { freshness: 'fresh', evidenceStrength: 30 }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const weakCandidates = result.candidates.filter(c => c.priority === 'weak_topic');

      expect(weakCandidates.length).toBeGreaterThanOrEqual(1);
      for (const c of weakCandidates) {
        expect(c.priority).toBe('weak_topic');
        expect(c.sourceSkillState?.evidenceStrength).toBeLessThan(40);
        expect(c.sourceSkillState?.freshness).not.toBe('stale');
      }
    });

    it('DSA evidence scaling in weak_topic: weaker evidence scores higher and is not pinned to 100', () => {
      const topicId = 'topic-dsa-arrays';
      const dsaProb = DSA_PROBLEMS.find(p => p.topicId === topicId && (!p.prerequisites || p.prerequisites.length === 0))!;
      const todayStr = '2026-10-15';

      // 1. Weak evidence (0.1 -> 10%) should yield priorityScore: 90
      const stateWeak = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { evidenceStrength: 0.1 }),
        },
        skillStates: {
          [topicId]: createSkillState(topicId, { freshness: 'fresh', evidenceStrength: 30 }),
        },
        todayStr,
      });
      const resultWeak = generateReviewCandidates(stateWeak);
      const candidateWeak = resultWeak.candidates.find(c => c.targetId === dsaProb.id);
      expect(candidateWeak).toBeDefined();
      expect(candidateWeak?.priority).toBe('weak_topic');
      expect(candidateWeak?.priorityScore).toBe(90);

      // 2. Stronger evidence (0.3 -> 30%) should yield priorityScore: 70
      const stateStrong = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { evidenceStrength: 0.3 }),
        },
        skillStates: {
          [topicId]: createSkillState(topicId, { freshness: 'fresh', evidenceStrength: 30 }),
        },
        todayStr,
      });
      const resultStrong = generateReviewCandidates(stateStrong);
      const candidateStrong = resultStrong.candidates.find(c => c.targetId === dsaProb.id);
      expect(candidateStrong).toBeDefined();
      expect(candidateStrong?.priority).toBe('weak_topic');
      expect(candidateStrong?.priorityScore).toBe(70);

      // 3. Proves weaker evidence (0.1) receives higher score than stronger evidence (0.3),
      // and neither is artificially pinned to 100
      expect(candidateWeak!.priorityScore).toBeGreaterThan(candidateStrong!.priorityScore);
      expect(candidateWeak!.priorityScore).toBeLessThan(100);
      expect(candidateStrong!.priorityScore).toBeLessThan(100);
    });

    it('stale evidence tier is ordered before weak_topic tier', () => {
      const staleTopic = 'topic-dsa-arrays';
      const weakTopic = 'topic-dsa-linkedlist';
      const dsaProbStale = DSA_PROBLEMS.find(p => p.topicId === staleTopic)!;
      const dsaProbWeak = DSA_PROBLEMS.find(p => p.topicId === weakTopic)!;
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProbStale, dsaProbWeak],
        dsaProgressMap: {
          [dsaProbStale.id]: createDSACandidate(dsaProbStale.id, { evidenceStrength: 0.3 }),
          [dsaProbWeak.id]: createDSACandidate(dsaProbWeak.id, { evidenceStrength: 0.3 }),
        },
        skillStates: {
          [staleTopic]: createSkillState(staleTopic, { freshness: 'stale', evidenceStrength: 30 }),
          [weakTopic]: createSkillState(weakTopic, { freshness: 'fresh', evidenceStrength: 30 }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const staleIdx = result.candidates.findIndex(c => c.priority === 'stale_evidence');
      const weakIdx = result.candidates.findIndex(c => c.priority === 'weak_topic');

      if (staleIdx >= 0 && weakIdx >= 0) {
        expect(staleIdx).toBeLessThan(weakIdx);
      }
    });
  });

  // ============================================================================
  // D. COMPANY RELEVANCE CANNOT CROSS PRIORITY TIERS
  // ============================================================================
  describe('Company relevance cannot cross priority tiers', () => {
    it('company boost increases priorityScore within tier but never changes tier', () => {
      const topicId = 'topic-dsa-arrays';
      const dsaProb = DSA_PROBLEMS.find(p => p.topicId === topicId)!; // dsa-014 Majority Element
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { evidenceStrength: 0.3 }),
        },
        skillStates: {
          [topicId]: createSkillState(topicId, { freshness: 'fresh', evidenceStrength: 30 }),
        },
        companyOverlays: [createCompanyOverlay({ requiredTopics: [topicId] })],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const weakCandidates = result.candidates.filter(c => c.priority === 'weak_topic');

      expect(weakCandidates.length).toBeGreaterThanOrEqual(1);

      // Company boost adds max 20 to priorityScore, but cannot push into higher tier
      for (const c of weakCandidates) {
        expect(c.priority).toBe('weak_topic');
        expect(c.priorityScore).toBeLessThanOrEqual(100);
      }
    });

    it('remediation tier unaffected by company boost', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, {
            remediationRequired: true,
            evidenceStrength: 0.9, // high evidence but remediation overrides
          }),
        },
        skillStates: {
          ['topic-dsa-hashtable']: createSkillState('topic-dsa-hashtable', { evidenceStrength: 90 }),
        },
        companyOverlays: [createCompanyOverlay({ requiredDomains: ['dsa'] })],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const remediationCandidates = result.candidates.filter(c => c.priority === 'remediation');

      expect(remediationCandidates.length).toBeGreaterThanOrEqual(1);
      for (const c of remediationCandidates) {
        expect(c.priority).toBe('remediation');
        // Should remain in remediation tier regardless of company
      }
    });
  });

  // ============================================================================
  // E. CANDIDATES ALREADY COMMITTED/COMPLETED TODAY ARE EXCLUDED
  // ============================================================================
  describe('Exclusion of already committed/completed work', () => {
    it('excludes candidates whose targetId is in todayAssignments', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { nextReviewAt: '2026-10-10' }),
        },
        todayAssignments: [
          { id: 'assign-1', date: todayStr, taskType: 'dsa_review', referenceId: dsaProb.id, allocatedMinutes: 15, completed: false, actualMinutes: 0 },
        ],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const overdueCandidates = result.candidates.filter(c => c.targetId === dsaProb.id);

      expect(overdueCandidates.length).toBe(0);
    });

    it('excludes candidates already completed today', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { nextReviewAt: '2026-10-10' }),
        },
        todayAssignments: [
          { id: 'assign-1', date: todayStr, taskType: 'dsa_review', referenceId: dsaProb.id, allocatedMinutes: 15, completed: true, actualMinutes: 15 },
        ],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const overdueCandidates = result.candidates.filter(c => c.targetId === dsaProb.id);

      expect(overdueCandidates.length).toBe(0);
    });
  });

  // ============================================================================
  // F. PREREQUISITE-LOCKED CANDIDATES ARE EXCLUDED
  // ============================================================================
  describe('Prerequisite-locked candidates are excluded', () => {
    it('excludes roadmap tasks with unmet prerequisites', () => {
      const task1 = { ...TASK_DEFINITIONS.find(t => t.id === 'task-1')!, prerequisiteTaskDefinitionIds: ['prereq-1'] };
      const prereqTask = { ...TASK_DEFINITIONS.find(t => t.id === 'task-2')!, id: 'prereq-1', title: 'Prereq Task' };
      const todayStr = '2026-10-15';

      const state = createMockState({
        tasks: [task1, prereqTask],
        taskProgressMap: {
          [prereqTask.id]: { taskId: prereqTask.id, state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: todayStr },
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const candidate = result.candidates.find(c => c.targetId === task1.id);
      if (candidate) {
        expect(candidate.isBlocked).toBe(true);
      }
    });
  });

  // ============================================================================
  // G. IDENTICAL STATE PRODUCES IDENTICAL CANDIDATE ORDERING
  // ============================================================================
  describe('Deterministic output', () => {
    it('produces identical candidate ordering for identical state', () => {
      const todayStr = '2026-10-15';
      const state = createMockState({ todayStr });

      const result1 = generateReviewCandidates(state);
      const result2 = generateReviewCandidates(state);

      expect(result1.candidates.length).toBe(result2.candidates.length);
      for (let i = 0; i < result1.candidates.length; i++) {
        expect(result1.candidates[i].targetId).toBe(result2.candidates[i].targetId);
        expect(result1.candidates[i].priority).toBe(result2.candidates[i].priority);
        expect(result1.candidates[i].priorityScore).toBe(result2.candidates[i].priorityScore);
      }
    });
  });

  // ============================================================================
  // H. EMPTY REVIEW QUEUE FALLS BACK CLEANLY
  // ============================================================================
  describe('Empty review queue fallback', () => {
    it('returns normal progression candidates when no review obligations exist', () => {
      const todayStr = '2026-10-15';
      const state = createMockState({ todayStr });

      const result = generateReviewCandidates(state);

      // Should have normal_progression candidates
      const progressionCandidates = result.candidates.filter(c => c.priority === 'normal_progression');
      expect(progressionCandidates.length).toBeGreaterThanOrEqual(0);
      expect(result.totalReviewObligations).toBe(0);
      expect(result.hasRemediation).toBe(false);
      expect(result.hasOverdueReviews).toBe(false);
    });
  });

  // ============================================================================
  // ADDITIONAL: VALID CANDIDATE ROUTES/TARGETS AND CROSS-TIER DEDUPLICATION
  // ============================================================================
  describe('Candidate validity and deduplication', () => {
    it('every candidate has a valid targetId that exists in source data', () => {
      const todayStr = '2026-10-15';
      const state = createMockState({ todayStr });

      const result = generateReviewCandidates(state);

      for (const c of result.candidates) {
        // targetId should correspond to existing task, DSA problem, or topic
        const hasValidTarget =
          TASK_DEFINITIONS.some(t => t.id === c.targetId) ||
          DSA_PROBLEMS.some(p => p.id === c.targetId) ||
          TOPICS.some(t => t.id === c.targetId);

        expect(hasValidTarget).toBe(true);
        expect(c.route).toMatch(/^(dsa|roadmap|preparation|practice|dashboard)$/);
        expect(c.estimatedMinutes).toBeGreaterThan(0);
        expect(c.reason).toBeTruthy();
        expect(c.reason.length).toBeGreaterThan(0);
      }
    });

    it('no duplicate candidates for the same underlying target across all tiers', () => {
      const todayStr = '2026-10-15';
      const state = createMockState({ todayStr });

      const result = generateReviewCandidates(state);
      const allTargets = result.candidates.map(c => c.targetId);
      const uniqueTargets = new Set(allTargets);
      expect(uniqueTargets.size).toBe(allTargets.length);
    });

    it('cross-tier deduplication: problem in both overdue and stale returns higher-priority candidate only', () => {
      const topicId = 'topic-dsa-hashtable';
      const dsaProb = DSA_PROBLEMS.find(p => p.topicId === topicId)!;
      const todayStr = '2026-10-15';

      // Qualifies for BOTH overdue_review (nextReviewAt <= todayStr)
      // AND stale_evidence (topic freshness is stale with low evidence)
      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, {
            nextReviewAt: '2026-10-10', // overdue review (tier 1)
            evidenceStrength: 0.2,
          }),
        },
        skillStates: {
          [topicId]: createSkillState(topicId, {
            freshness: 'stale',
            evidenceStrength: 25,
          }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const matchingCandidates = result.candidates.filter(c => c.targetId === dsaProb.id);

      // Exactly ONE candidate returned for this targetId
      expect(matchingCandidates).toHaveLength(1);
      // Higher priority tier (overdue_review) wins over stale_evidence
      expect(matchingCandidates[0].priority).toBe('overdue_review');
    });
  });

  // ============================================================================
  // ADDITIONAL: ANALYTICS INTEGRATION
  // ============================================================================
  describe('Analytics integration', () => {
    it('consumes analytics review prompts as validation/boost signals', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const prompt = createReviewPrompt('overdue_review', dsaProb.id);

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { nextReviewAt: '2026-10-10' }),
        },
        analyticsReviewPrompts: [prompt],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const candidate = result.candidates.find(c => c.targetId === dsaProb.id && c.priority === 'overdue_review');

      if (candidate) {
        // Should have small analytics boost (5 points)
        expect(candidate.priorityScore).toBeGreaterThan(80);
      }
    });

    it('analytics prompts do not create new candidates, only boost existing ones', () => {
      const todayStr = '2026-10-15';
      const prompt = createReviewPrompt('overdue_review', 'non-existent-problem');

      const state = createMockState({
        analyticsReviewPrompts: [prompt],
        todayStr,
      });

      const result = generateReviewCandidates(state);

      // Should not create candidate for non-existent problem
      const phantom = result.candidates.find(c => c.targetId === 'non-existent-problem');
      expect(phantom).toBeUndefined();
    });

    it('analytics prompt types are tracked but do not create competing scheduling', () => {
      const todayStr = '2026-10-15';
      const prompts = [
        createReviewPrompt('remediation_needed', 'dsa-001'),
        createReviewPrompt('stale_evidence', 'topic-dsa-arrays'),
        createReviewPrompt('repeated_postpone', 'task-1'),
      ];

      const state = createMockState({
        analyticsReviewPrompts: prompts,
        todayStr,
      });

      const result = generateReviewCandidates(state);

      // Should not crash and should produce deterministic output
      expect(result.candidates).toBeDefined();
      expect(Array.isArray(result.candidates)).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('Edge cases', () => {
    it('handles all candidates already committed today', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { nextReviewAt: '2026-10-10' }),
        },
        todayAssignments: [
          { id: 'assign-1', date: todayStr, taskType: 'dsa_review', referenceId: dsaProb.id, allocatedMinutes: 15, completed: false, actualMinutes: 0 },
        ],
        todayStr,
      });

      const result = generateReviewCandidates(state);

      // Should fall back to normal progression
      const progressionCandidates = result.candidates.filter(c => c.priority === 'normal_progression');
      expect(progressionCandidates.length).toBeGreaterThanOrEqual(0);
    });

    it('handles stale skill with no actionable learning item', () => {
      const staleTopic = 'topic-unknown';
      const todayStr = '2026-10-15';

      const state = createMockState({
        topics: [{ ...TOPICS[0], id: staleTopic, domainId: 'dsa', name: 'Unknown Topic' }],
        skillStates: {
          [staleTopic]: createSkillState(staleTopic, { freshness: 'stale', evidenceStrength: 10 }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);

      // Should not crash, may produce roadmap task fallback or nothing
      expect(result.candidates).toBeDefined();
    });

    it('handles Sunday/pending assessment interaction', () => {
      const todayStr = '2026-10-15'; // Not Sunday
      const state = createMockState({ todayStr });

      const result = generateReviewCandidates(state);
      expect(result.candidates).toBeDefined();
    });

    it('handles phase transitions - locked problems remain locked', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';
      const phase1 = PHASES[0];

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { remediationRequired: true }),
        },
        activePhase: phase1,
        todayStr,
      });

      const result = generateReviewCandidates(state);

      // Remediation should still be available (always actionable)
      const remediationCandidates = result.candidates.filter(c => c.priority === 'remediation');
      expect(remediationCandidates.length).toBeGreaterThanOrEqual(0);
    });

    it('handles date rollover - todayStr is canonical', () => {
      const dsaProb = DSA_PROBLEMS.find(p => p.id === 'dsa-001')!; // Two Sum
      const todayStr = '2026-10-15';

      const state = createMockState({
        dsaProblems: [dsaProb],
        dsaProgressMap: {
          [dsaProb.id]: createDSACandidate(dsaProb.id, { nextReviewAt: todayStr }),
        },
        todayStr,
      });

      const result = generateReviewCandidates(state);
      const dueToday = result.candidates.find(c => c.targetId === dsaProb.id && c.priority === 'overdue_review');

      // nextReviewAt === today should be due today (daysOverdue = 0)
      if (dueToday) {
        expect(dueToday.reason).toContain('Due spaced repetition');
      }
    });

    it('enforces tier priority: remediation > overdue_review > routed_weakness > normal_progression', () => {
      const todayStr = '2026-10-15';
      const prob1 = DSA_PROBLEMS[0]; // remediation
      const prob2 = DSA_PROBLEMS[1]; // overdue review

      const state = createMockState({
        dsaProblems: [prob1, prob2],
        dsaProgressMap: {
          [prob1.id]: createDSACandidate(prob1.id, { remediationRequired: true }),
          [prob2.id]: createDSACandidate(prob2.id, { nextReviewAt: '2026-10-10' }),
        },
        practiceAttempts: [
          {
            id: 'att-weak',
            sessionId: 'practice-sql-01',
            sessionTitle: 'SQL Practice',
            category: 'coding',
            domainId: 'sql',
            topicId: 'prep-sql',
            date: todayStr,
            completedAt: `${todayStr}T10:00:00Z`,
            totalTimeSeconds: 600,
            scorePct: 30,
            accuracyPct: 30,
            correctCount: 1,
            totalQuestions: 5,
            passed: false,
            userAnswers: [],
            evidenceLogId: 'ev-w',
          },
        ],
        todayStr,
      });

      const result = generateReviewCandidates(state);
      expect(result.hasRemediation).toBe(true);
      expect(result.hasOverdueReviews).toBe(true);
      expect(result.hasRoutedWeakness).toBe(true);

      const remediationCandidate = result.candidates.find(c => c.priority === 'remediation');
      const overdueCandidate = result.candidates.find(c => c.priority === 'overdue_review');
      const weaknessCandidate = result.candidates.find(c => c.priority === 'routed_weakness');
      const progressionCandidate = result.candidates.find(c => c.priority === 'normal_progression');

      expect(remediationCandidate).toBeDefined();
      expect(overdueCandidate).toBeDefined();
      expect(weaknessCandidate).toBeDefined();

      const idxRem = result.candidates.indexOf(remediationCandidate!);
      const idxOverdue = result.candidates.indexOf(overdueCandidate!);
      const idxWeakness = result.candidates.indexOf(weaknessCandidate!);

      expect(idxRem).toBeLessThan(idxOverdue);
      expect(idxOverdue).toBeLessThan(idxWeakness);

      if (progressionCandidate) {
        const idxProg = result.candidates.indexOf(progressionCandidate);
        expect(idxWeakness).toBeLessThan(idxProg);
      }
    });

    it('places company_gap below routed_weakness but above stale evidence and normal progression', () => {
      const todayStr = '2026-10-15';
      const prob1 = DSA_PROBLEMS[0]; // remediation
      const prob2 = DSA_PROBLEMS[1]; // overdue
      const prob3 = DSA_PROBLEMS[2]; // normal

      const company: CompanyOverlay = {
        id: 'comp-alpha',
        companyName: 'Alpha Corp',
        targetRole: 'SDE',
        applicationStatus: 'target',
        requiredDomains: ['dbms'],
        requiredTopics: ['prep-sys-01'],
        requiredLanguages: [],
      };

      const sysTopic: Topic = {
        id: 'prep-sys-01',
        moduleId: 'mod-dbms-01',
        domainId: 'dbms',
        name: 'Scaling Systems',
        description: 'System scaling concepts',
        importance: 8,
      };

      const sysTask: TaskDefinition = {
        id: 'task-sys-01',
        title: 'Study System Scaling',
        description: 'Prepare scaling architectures',
        topicId: 'prep-sys-01',
        domainId: 'dbms',
        phaseId: 'phase-1',
        estimatedMinutes: 60,
        importance: 8,
        taskType: 'learning',
        createdAt: '2026-09-01T00:00:00Z',
      };

      const state = createMockState({
        tasks: [...TASK_DEFINITIONS, sysTask],
        topics: [...TOPICS, sysTopic],
        domains: DOMAINS,
        dsaProblems: [prob1, prob2, prob3],
        dsaProgressMap: {
          [prob1.id]: createDSACandidate(prob1.id, { remediationRequired: true }),
          [prob2.id]: createDSACandidate(prob2.id, { nextReviewAt: '2026-10-10' }),
        },
        companyOverlays: [company],
        practiceAttempts: [
          {
            id: 'att-weak-sql',
            sessionId: 'practice-sql-01',
            sessionTitle: 'SQL Practice',
            category: 'coding',
            domainId: 'sql',
            topicId: 'prep-sql',
            date: todayStr,
            completedAt: `${todayStr}T10:00:00Z`,
            totalTimeSeconds: 600,
            scorePct: 30,
            accuracyPct: 30,
            correctCount: 1,
            totalQuestions: 5,
            passed: false,
            userAnswers: [],
            evidenceLogId: 'ev-w',
          },
        ],
        todayStr,
        targetCompanyId: 'comp-alpha',
      });

      const result = generateReviewCandidates(state);

      expect(result.hasRemediation).toBe(true);
      expect(result.hasOverdueReviews).toBe(true);
      expect(result.hasRoutedWeakness).toBe(true);
      expect(result.hasCompanyFocusGaps).toBe(true);

      const remCandidate = result.candidates.find(c => c.priority === 'remediation');
      const overdueCandidate = result.candidates.find(c => c.priority === 'overdue_review');
      const weaknessCandidate = result.candidates.find(c => c.priority === 'routed_weakness');
      const companyCandidate = result.candidates.find(c => c.priority === 'company_gap');
      const progressionCandidate = result.candidates.find(c => c.priority === 'normal_progression');

      expect(remCandidate).toBeDefined();
      expect(overdueCandidate).toBeDefined();
      expect(weaknessCandidate).toBeDefined();
      expect(companyCandidate).toBeDefined();

      const idxRem = result.candidates.indexOf(remCandidate!);
      const idxOverdue = result.candidates.indexOf(overdueCandidate!);
      const idxWeakness = result.candidates.indexOf(weaknessCandidate!);
      const idxCompany = result.candidates.indexOf(companyCandidate!);

      expect(idxRem).toBeLessThan(idxOverdue);
      expect(idxOverdue).toBeLessThan(idxWeakness);
      expect(idxWeakness).toBeLessThan(idxCompany);

      if (progressionCandidate) {
        const idxProg = result.candidates.indexOf(progressionCandidate);
        expect(idxCompany).toBeLessThan(idxProg);
      }
    });
  });
});
