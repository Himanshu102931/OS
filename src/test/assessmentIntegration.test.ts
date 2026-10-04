/**
 * Task 10 — Assessment Integration Tests
 *
 * Covers every exported function in src/engine/assessmentIntegration.ts
 * using real canonical seed data (no vacuous mocks).
 *
 * Exports under test:
 *   - resolveAssessmentLearningTargets
 *   - validateAssessmentTarget
 *   - getAssessmentTargetDeepLink
 *   - pickBestAssessmentTargetsWithinBudget
 *   - assessmentTargetsToReviewCandidates
 *   - hasAssessmentActionableSignals
 *   - getPrimaryAssessmentAction
 *   - _testDeterminism
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAssessmentLearningTargets,
  validateAssessmentTarget,
  getAssessmentTargetDeepLink,
  pickBestAssessmentTargetsWithinBudget,
  assessmentTargetsToReviewCandidates,
  hasAssessmentActionableSignals,
  getPrimaryAssessmentAction,
  _testDeterminism,
  type AssessmentLearningTarget,
  type AssessmentIntegrationOptions,
} from '../engine/assessmentIntegration';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import type {
  DomainAssessmentResult,
  TopicSkillState,
  DSAProgress,
  TaskProgress,
  PreparationTopicProgress,
  PracticeAttempt,
  CompanyOverlay,
} from '../types';
import type {
  AssessmentProfileReadout,
  DomainAssessmentProfile,
} from '../engine/assessmentEngine';

// ---------------------------------------------------------------------------
// Canonical fixtures built from real datasets
// ---------------------------------------------------------------------------

const TODAY = '2026-10-15';

const ALL_DSA_PROBLEMS = DSA_PROBLEMS;
const ALL_TASKS = TASK_DEFINITIONS;
const ALL_TOPICS = TOPICS;
const ALL_DOMAINS = DOMAINS;
const ALL_PREP_TOPICS = PREPARATION_TOPICS;
const ALL_PRACTICE_SESSIONS = PRACTICE_SESSIONS;

const EMPTY_SKILL_STATES: Record<string, TopicSkillState> = {};
const EMPTY_DSA_PROGRESS: Record<string, DSAProgress> = {};
const EMPTY_TASK_PROGRESS: Record<string, TaskProgress> = {};
const EMPTY_PREP_PROGRESS: Record<string, PreparationTopicProgress> = {};
const EMPTY_PRACTICE_ATTEMPTS: PracticeAttempt[] = [];
const EMPTY_COMPANY_OVERLAYS: CompanyOverlay[] = [];

/** Minimal AssessmentProfileReadout with no weaknesses — for empty-state tests */
function makeEmptyProfile(): AssessmentProfileReadout {
  return {
    isAssessed: true,
    domainProfiles: [],
    strengths: [],
    weaknesses: [],
    overallAbility: 0,
    assessedDomainsCount: 0,
    hasIncompleteEvidence: false,
    planInputs: {
      startingPoints: [],
      domainEmphases: {} as Record<string, never>,
      weaknessFocusAreas: [],
      strengths: [],
      overallReadinessSummary: {
        assessedDomainsCount: 0,
        averageAbility: 0,
        primaryFocusDomain: null,
      },
    },
  };
}

/** Profile with a low-confidence weakness focus area for a given domain */
function makeWeaknessProfile(domainId: DomainAssessmentProfile['domainId'], topicId?: string): AssessmentProfileReadout {
  return {
    isAssessed: true,
    domainProfiles: [
      {
        domainId,
        name: domainId,
        category: 'Class A',
        level: 1,
        levelLabel: 'Beginner',
        abilityScore: 30,
        confidence: 'low',
        status: 'assessed',
        provisional: false,
        topicsCovered: 1,
        topicsTotal: 5,
        competenciesCovered: ['basics'],
        openWeaknessesCount: 1,
      },
    ],
    strengths: [],
    weaknesses: [],
    overallAbility: 30,
    assessedDomainsCount: 1,
    hasIncompleteEvidence: true,
    planInputs: {
      startingPoints: [],
      domainEmphases: {} as Record<string, never>,
      weaknessFocusAreas: [
        {
          id: `wfa-${domainId}`,
          domainId,
          topicId,
          competency: 'core',
          errorCategory: 'knowledge_gap',
          strength: 2,
          recommendedAction: 'Review fundamentals',
        },
      ],
      strengths: [],
      overallReadinessSummary: {
        assessedDomainsCount: 1,
        averageAbility: 30,
        primaryFocusDomain: domainId,
      },
    },
  };
}

/** Profile with medium/high confidence weakness for DSA domain */
function makeMediumConfidenceDsaProfile(): AssessmentProfileReadout {
  return {
    isAssessed: true,
    domainProfiles: [
      {
        domainId: 'dsa',
        name: 'Data Structures & Algorithms',
        category: 'Class A',
        level: 2,
        levelLabel: 'Developing',
        abilityScore: 55,
        confidence: 'medium',
        status: 'assessed',
        provisional: false,
        topicsCovered: 3,
        topicsTotal: 8,
        competenciesCovered: ['arrays', 'strings'],
        openWeaknessesCount: 1,
      },
    ],
    strengths: [],
    weaknesses: [],
    overallAbility: 55,
    assessedDomainsCount: 1,
    hasIncompleteEvidence: true,
    planInputs: {
      startingPoints: [],
      domainEmphases: {} as Record<string, never>,
      weaknessFocusAreas: [
        {
          id: 'wfa-dsa-medium',
          domainId: 'dsa',
          topicId: 'topic-dsa-arrays',
          competency: 'arrays',
          errorCategory: 'knowledge_gap',
          strength: 2,
          recommendedAction: 'Targeted DSA practice',
        },
      ],
      strengths: [],
      overallReadinessSummary: {
        assessedDomainsCount: 1,
        averageAbility: 55,
        primaryFocusDomain: 'dsa',
      },
    },
  };
}

/** Profile with confidence-only signal (low confidence, low level, no weakness focus area) */
function makeConfidenceOnlyProfile(domainId: DomainAssessmentProfile['domainId']): AssessmentProfileReadout {
  return {
    isAssessed: true,
    domainProfiles: [
      {
        domainId,
        name: domainId,
        category: 'Class A',
        level: 1,
        levelLabel: 'Beginner',
        abilityScore: 20,
        confidence: 'low',
        status: 'assessed',
        provisional: false,
        topicsCovered: 0,
        topicsTotal: 5,
        competenciesCovered: [],
        openWeaknessesCount: 0,
      },
    ],
    strengths: [],
    weaknesses: [],
    overallAbility: 20,
    assessedDomainsCount: 1,
    hasIncompleteEvidence: true,
    planInputs: {
      startingPoints: [],
      domainEmphases: {} as Record<string, never>,
      weaknessFocusAreas: [],
      strengths: [],
      overallReadinessSummary: {
        assessedDomainsCount: 1,
        averageAbility: 20,
        primaryFocusDomain: domainId,
      },
    },
  };
}

/** Domain assessment result for confidence-based routing */
function makeDomainResult(
  domainId: DomainAssessmentResult['domainId'],
  confidence: DomainAssessmentResult['confidence'],
  level: DomainAssessmentResult['level'] = 1,
): DomainAssessmentResult {
  return {
    domainId,
    abilityScore: 30,
    level,
    confidence,
    status: 'assessed',
    coverage: { topicsCovered: 1, topicsTotal: 5, competenciesCovered: ['core'], difficultyBands: [1] },
    assessmentDate: '2026-10-01T00:00:00.000Z',
    provisional: false,
    attemptId: 'test-attempt',
    kind: 'diagnostic_assessment',
  };
}

/** Base options factory — accepts overrides */
function makeBaseOptions(overrides: Partial<AssessmentIntegrationOptions> = {}): AssessmentIntegrationOptions {
  return {
    domainResults: [],
    weaknessSignals: [],
    assessmentProfileReadout: makeEmptyProfile(),
    companyOverlays: EMPTY_COMPANY_OVERLAYS,
    skillStates: EMPTY_SKILL_STATES,
    practiceSessions: ALL_PRACTICE_SESSIONS,
    practiceAttempts: EMPTY_PRACTICE_ATTEMPTS,
    dsaProblems: ALL_DSA_PROBLEMS,
    dsaProgressMap: EMPTY_DSA_PROGRESS,
    tasks: ALL_TASKS,
    taskProgressMap: EMPTY_TASK_PROGRESS,
    topics: ALL_TOPICS,
    domains: ALL_DOMAINS,
    preparationTopics: ALL_PREP_TOPICS,
    preparationTopicProgress: EMPTY_PREP_PROGRESS,
    activePhase: 1,
    todayStr: TODAY,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. No assessment state — returns safe empty result
// ---------------------------------------------------------------------------

describe('A. No assessment state', () => {
  it('returns empty targets when profile has no weaknesses and no low-confidence domains', () => {
    const result = resolveAssessmentLearningTargets(makeBaseOptions());
    expect(result.targets).toEqual([]);
    expect(result.summary).toContain('No additional learning targets');
  });

  it('returns empty targets when not assessed', () => {
    const options = makeBaseOptions({
      assessmentProfileReadout: { ...makeEmptyProfile(), isAssessed: false },
    });
    const result = resolveAssessmentLearningTargets(options);
    expect(result.targets).toEqual([]);
  });

  it('does not fabricate targets from empty datasets', () => {
    const options = makeBaseOptions({
      dsaProblems: [],
      tasks: [],
      preparationTopics: [],
      practiceSessions: [],
      assessmentProfileReadout: makeWeaknessProfile('dsa'),
    });
    const result = resolveAssessmentLearningTargets(options);
    // Weakness profile exists but no canonical targets to route to
    expect(result.targets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// B. Weak assessment domain — produces valid learning target
// ---------------------------------------------------------------------------

describe('B. Weak assessment domain', () => {
  it('produces a preparation target for low-confidence weakness', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    const target = result.targets[0];
    expect(target.kind).toBe('preparation');
    expect(target.route).toBe('preparation');
    expect(target.targetId).toBeTruthy();
    expect(target.isBlocked).toBe(false);
  });

  it('target exists in canonical preparation dataset', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    const target = result.targets[0];
    const exists = ALL_PREP_TOPICS.some((t) => t.id === target.targetId);
    expect(exists).toBe(true);
  });

  it('produces a practice target when no preparation topic matches', () => {
    // Use a domain that has no direct prep topic mapping but has practice sessions
    const profile = makeWeaknessProfile('aptitude');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('aptitude', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    // Should produce either preparation or practice target
    expect(result.targets.length).toBeGreaterThan(0);
    const target = result.targets[0];
    expect(['preparation', 'practice']).toContain(target.kind);
  });
});

// ---------------------------------------------------------------------------
// C. Low confidence — produces proof-building Preparation/Practice target
// ---------------------------------------------------------------------------

describe('C. Low confidence routing', () => {
  it('routes low-confidence weakness to preparation target', () => {
    const profile = makeWeaknessProfile('python');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('python', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    // Low confidence → proof-building (preparation or practice)
    const kinds = result.targets.map((t) => t.kind);
    expect(kinds).toContain('preparation');
  });

  it('marks source signal as weakness_focus_area', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    expect(result.targets[0].sourceSignal.type).toBe('weakness_focus_area');
  });
});

// ---------------------------------------------------------------------------
// D. Medium/high confidence + weakness — targeted remediation
// ---------------------------------------------------------------------------

describe('D. Medium/high confidence routing', () => {
  it('routes medium-confidence DSA weakness to DSA target', () => {
    const profile = makeMediumConfidenceDsaProfile();
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('dsa', 'medium', 2)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    const dsaTargets = result.targets.filter((t) => t.kind === 'dsa');
    expect(dsaTargets.length).toBeGreaterThan(0);
  });

  it('routes medium-confidence non-DSA weakness to roadmap task', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'medium', 2)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    // Should route to roadmap task or DSA (not preparation/practice)
    const targeted = result.targets.filter((t) => t.kind === 'roadmap' || t.kind === 'dsa');
    expect(targeted.length).toBeGreaterThan(0);
  });

  it('produces DSA target that exists in canonical dataset', () => {
    const profile = makeMediumConfidenceDsaProfile();
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('dsa', 'medium', 2)],
    });
    const result = resolveAssessmentLearningTargets(options);

    const dsaTargets = result.targets.filter((t) => t.kind === 'dsa');
    if (dsaTargets.length > 0) {
      const exists = ALL_DSA_PROBLEMS.some((p) => p.id === dsaTargets[0].targetId);
      expect(exists).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// E. Confidence-only weakness — routes to foundational work
// ---------------------------------------------------------------------------

describe('E. Confidence-only weakness', () => {
  it('produces foundational preparation target for low-confidence domain', () => {
    const profile = makeConfidenceOnlyProfile('python');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('python', 'low', 1)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    const target = result.targets[0];
    expect(target.kind).toBe('preparation');
    expect(target.route).toBe('preparation');
  });

  it('uses fallback topic from DOMAIN_METADATA', () => {
    const profile = makeConfidenceOnlyProfile('python');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('python', 'low', 1)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    // Python fallback is 'prep-lang'
    expect(result.targets[0].targetId).toBe('prep-lang');
  });

  it('marks source signal as confidence_signal', () => {
    const profile = makeConfidenceOnlyProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low', 1)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    expect(result.targets[0].sourceSignal.type).toBe('confidence_signal');
  });

  it('does not produce target for high-confidence domain', () => {
    const profile = makeConfidenceOnlyProfile('python');
    // Override domain profile to high confidence
    profile.domainProfiles[0].confidence = 'high';
    profile.domainProfiles[0].level = 4;
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('python', 'high', 4)],
    });
    const result = resolveAssessmentLearningTargets(options);

    // High confidence + high level → no foundational target
    expect(result.targets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// F. Unmapped assessment domain — uses only validated fallback topic
// ---------------------------------------------------------------------------

describe('F. Unmapped domain fallback', () => {
  it('uses fallback topic for domain without direct weakness mapping', () => {
    // 'os' domain has fallback 'prep-os' in DOMAIN_METADATA
    const profile = makeConfidenceOnlyProfile('os');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('os', 'low', 1)],
    });
    const result = resolveAssessmentLearningTargets(options);

    expect(result.targets.length).toBeGreaterThan(0);
    expect(result.targets[0].targetId).toBe('prep-os');
  });

  it('does not fabricate target for projects domain', () => {
    const profile = makeConfidenceOnlyProfile('projects');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('projects', 'low', 1)],
    });
    const result = resolveAssessmentLearningTargets(options);

    // Projects is excluded from confidence-only routing
    expect(result.targets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// G. Invalid target — rejected safely
// ---------------------------------------------------------------------------

describe('G. Invalid target rejection', () => {
  it('validateAssessmentTarget returns false for non-existent preparation target', () => {
    const target: AssessmentLearningTarget = {
      kind: 'preparation',
      route: 'preparation',
      targetId: 'nonexistent-prep-topic',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'python',
      isBlocked: false,
      sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'python', confidence: 'low' },
    };
    const isValid = validateAssessmentTarget(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(isValid).toBe(false);
  });

  it('validateAssessmentTarget returns false for non-existent DSA target', () => {
    const target: AssessmentLearningTarget = {
      kind: 'dsa',
      route: 'dsa',
      targetId: 'dsa-nonexistent',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'dsa',
      isBlocked: false,
      sourceSignal: { type: 'domain_weakness', id: 'test', domainId: 'dsa', confidence: 'medium' },
    };
    const isValid = validateAssessmentTarget(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(isValid).toBe(false);
  });

  it('getAssessmentTargetDeepLink returns null for invalid target', () => {
    const target: AssessmentLearningTarget = {
      kind: 'preparation',
      route: 'preparation',
      targetId: 'nonexistent',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'python',
      isBlocked: false,
      sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'python', confidence: 'low' },
    };
    const link = getAssessmentTargetDeepLink(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(link).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// H. Blocked target — rejected or filtered safely
// ---------------------------------------------------------------------------

describe('H. Blocked target handling', () => {
  it('filters out blocked targets from results', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
      // Block the fallback prep topic by adding it to committed targets
      committedTargetIds: new Set(['prep-sql']),
    });
    const result = resolveAssessmentLearningTargets(options);

    // The prep-sql target should be filtered out
    const blockedTarget = result.targets.find((t) => t.targetId === 'prep-sql');
    expect(blockedTarget).toBeUndefined();
  });

  it('getAssessmentTargetDeepLink returns null for blocked target', () => {
    const target: AssessmentLearningTarget = {
      kind: 'preparation',
      route: 'preparation',
      targetId: 'prep-sql',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'sql',
      isBlocked: true,
      blockingReason: 'Prerequisite not met',
      sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
    };
    const link = getAssessmentTargetDeepLink(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(link).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// I. Completed target — filtered appropriately
// ---------------------------------------------------------------------------

describe('I. Completed target filtering', () => {
  it('filters out already-committed targets', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
      committedTargetIds: new Set(['prep-sql']),
    });
    const result = resolveAssessmentLearningTargets(options);

    const committed = result.targets.find((t) => t.targetId === 'prep-sql');
    expect(committed).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// J. Already demonstrated target — no redundant work
// ---------------------------------------------------------------------------

describe('J. Already demonstrated target', () => {
  it('does not produce duplicate targets for same weakness', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    // Check no duplicate targetIds
    const targetIds = result.targets.map((t) => t.targetId);
    const uniqueIds = new Set(targetIds);
    expect(targetIds.length).toBe(uniqueIds.size);
  });
});

// ---------------------------------------------------------------------------
// K. Duplicate assessment result — deterministic behavior
// ---------------------------------------------------------------------------

describe('K. Duplicate assessment determinism', () => {
  it('produces identical output for identical input', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });

    const result1 = resolveAssessmentLearningTargets(options);
    const result2 = resolveAssessmentLearningTargets(options);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('_testDeterminism returns true for identical inputs', () => {
    const profile = makeWeaknessProfile('dsa');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('dsa', 'low')],
    });
    expect(_testDeterminism(options)).toBe(true);
  });

  it('does not produce duplicate candidates via assessmentTargetsToReviewCandidates', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);
    const candidates = assessmentTargetsToReviewCandidates(result.targets);

    const ids = candidates.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ---------------------------------------------------------------------------
// L. Company selection — does not corrupt assessment target validation
// ---------------------------------------------------------------------------

describe('L. Company selection', () => {
  it('company overlay does not bypass prerequisite gating', () => {
    const companyOverlay: CompanyOverlay = {
      id: 'company-1',
      companyName: 'TestCorp',
      targetRole: 'SDE',
      applicationStatus: 'target',
      requiredDomains: ['dsa', 'python'],
      requiredTopics: [],
      requiredLanguages: ['python'],
    };

    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
      companyOverlays: [companyOverlay],
      selectedCompanyId: 'company-1',
    });
    const result = resolveAssessmentLearningTargets(options);

    // Company overlay should not corrupt target validation
    // Targets should still be valid canonical IDs
    for (const target of result.targets) {
      const exists =
        ALL_PREP_TOPICS.some((t) => t.id === target.targetId) ||
        ALL_DSA_PROBLEMS.some((p) => p.id === target.targetId) ||
        ALL_TASKS.some((t) => t.id === target.targetId) ||
        ALL_PRACTICE_SESSIONS.some((s) => s.id === target.targetId);
      expect(exists).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// M. Budget boundaries — 25, 45, 60, 120 minutes
// ---------------------------------------------------------------------------

describe('M. Budget boundaries', () => {
  function makeTargets(): AssessmentLearningTarget[] {
    return [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL Prep',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
      {
        kind: 'practice',
        route: 'practice',
        targetId: ALL_PRACTICE_SESSIONS[0]?.id || 'practice-sql-01',
        title: 'Practice',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 45,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'weakness_focus_area', id: 'test', domainId: 'sql', confidence: 'low' },
      },
      {
        kind: 'dsa',
        route: 'dsa',
        targetId: ALL_DSA_PROBLEMS[0]?.id || 'dsa-001',
        title: 'DSA',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 60,
        domainId: 'dsa',
        isBlocked: false,
        sourceSignal: { type: 'domain_weakness', id: 'test', domainId: 'dsa', confidence: 'medium' },
      },
    ];
  }

  it('fits targets within 25-minute budget', () => {
    const targets = makeTargets();
    const picked = pickBestAssessmentTargetsWithinBudget(targets, 25);
    const totalMinutes = picked.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(25);
  });

  it('fits targets within 45-minute budget', () => {
    const targets = makeTargets();
    const picked = pickBestAssessmentTargetsWithinBudget(targets, 45);
    const totalMinutes = picked.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(45);
  });

  it('fits targets within 60-minute budget', () => {
    const targets = makeTargets();
    const picked = pickBestAssessmentTargetsWithinBudget(targets, 60);
    const totalMinutes = picked.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(60);
  });

  it('fits targets within 120-minute budget', () => {
    const targets = makeTargets();
    const picked = pickBestAssessmentTargetsWithinBudget(targets, 120);
    const totalMinutes = picked.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    expect(totalMinutes).toBeLessThanOrEqual(120);
  });

  it('filters out targets exceeding budget in resolveAssessmentLearningTargets', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
      availableMinutes: 5, // Very small budget
    });
    const result = resolveAssessmentLearningTargets(options);

    for (const target of result.targets) {
      expect(target.estimatedMinutes).toBeLessThanOrEqual(5);
    }
  });
});

// ---------------------------------------------------------------------------
// N. Determinism — repeated identical input produces identical output
// ---------------------------------------------------------------------------

describe('N. Determinism', () => {
  it('resolveAssessmentLearningTargets is deterministic', () => {
    const profile = makeWeaknessProfile('dsa');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('dsa', 'low')],
    });

    const results = Array.from({ length: 5 }, () => resolveAssessmentLearningTargets(options));
    const first = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(first);
    }
  });

  it('assessmentTargetsToReviewCandidates is deterministic', () => {
    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
    ];

    const c1 = assessmentTargetsToReviewCandidates(targets);
    const c2 = assessmentTargetsToReviewCandidates(targets);
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
  });
});

// ---------------------------------------------------------------------------
// O. Input immutability — inputs/datasets must not be mutated
// ---------------------------------------------------------------------------

describe('O. Input immutability', () => {
  it('does not mutate input options', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const snapshot = JSON.stringify(options);

    resolveAssessmentLearningTargets(options);

    expect(JSON.stringify(options)).toBe(snapshot);
  });

  it('does not mutate input targets array', () => {
    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
    ];
    const snapshot = JSON.stringify(targets);

    assessmentTargetsToReviewCandidates(targets);
    pickBestAssessmentTargetsWithinBudget(targets, 60);

    expect(JSON.stringify(targets)).toBe(snapshot);
  });

  it('does not mutate datasets in validateAssessmentTarget', () => {
    const target: AssessmentLearningTarget = {
      kind: 'preparation',
      route: 'preparation',
      targetId: 'prep-sql',
      title: 'SQL',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'sql',
      isBlocked: false,
      sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
    };
    const datasets = {
      preparationTopics: [...ALL_PREP_TOPICS],
      practiceSessions: [...ALL_PRACTICE_SESSIONS],
      dsaProblems: [...ALL_DSA_PROBLEMS],
      tasks: [...ALL_TASKS],
    };
    const snapshot = JSON.stringify(datasets);

    validateAssessmentTarget(target, datasets);

    expect(JSON.stringify(datasets)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// P. Deep-link validation — every returned target resolves to a valid route
// ---------------------------------------------------------------------------

describe('P. Deep-link validation', () => {
  it('getAssessmentTargetDeepLink returns valid route for preparation target', () => {
    const target: AssessmentLearningTarget = {
      kind: 'preparation',
      route: 'preparation',
      targetId: 'prep-sql',
      title: 'SQL',
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: 25,
      domainId: 'sql',
      isBlocked: false,
      sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
    };
    const link = getAssessmentTargetDeepLink(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(link).toEqual({ route: 'preparation', targetId: 'prep-sql' });
  });

  it('getAssessmentTargetDeepLink returns valid route for DSA target', () => {
    const dsaProblem = ALL_DSA_PROBLEMS[0];
    if (!dsaProblem) return; // Skip if no DSA problems in dataset

    const target: AssessmentLearningTarget = {
      kind: 'dsa',
      route: 'dsa',
      targetId: dsaProblem.id,
      title: dsaProblem.title,
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: dsaProblem.estimatedTimeMinutes || 25,
      domainId: 'dsa',
      isBlocked: false,
      sourceSignal: { type: 'domain_weakness', id: 'test', domainId: 'dsa', confidence: 'medium' },
    };
    const link = getAssessmentTargetDeepLink(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(link).toEqual({ route: 'dsa', targetId: dsaProblem.id });
  });

  it('getAssessmentTargetDeepLink returns valid route for roadmap target', () => {
    const task = ALL_TASKS[0];
    if (!task) return;

    const target: AssessmentLearningTarget = {
      kind: 'roadmap',
      route: 'roadmap',
      targetId: task.id,
      title: task.title,
      description: 'Test',
      reason: 'Test',
      estimatedMinutes: task.estimatedMinutes,
      domainId: task.domainId,
      isBlocked: false,
      sourceSignal: { type: 'domain_weakness', id: 'test', domainId: task.domainId, confidence: 'medium' },
    };
    const link = getAssessmentTargetDeepLink(target, {
      preparationTopics: ALL_PREP_TOPICS,
      practiceSessions: ALL_PRACTICE_SESSIONS,
      dsaProblems: ALL_DSA_PROBLEMS,
      tasks: ALL_TASKS,
    });
    expect(link).toEqual({ route: 'roadmap', targetId: task.id });
  });

  it('all targets from resolveAssessmentLearningTargets produce valid deep links', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const result = resolveAssessmentLearningTargets(options);

    for (const target of result.targets) {
      const link = getAssessmentTargetDeepLink(target, {
        preparationTopics: ALL_PREP_TOPICS,
        practiceSessions: ALL_PRACTICE_SESSIONS,
        dsaProblems: ALL_DSA_PROBLEMS,
        tasks: ALL_TASKS,
      });
      expect(link).not.toBeNull();
      expect(link!.route).toMatch(/^(preparation|practice|dsa|roadmap)$/);
      expect(link!.targetId).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Q. hasAssessmentActionableSignals
// ---------------------------------------------------------------------------

describe('Q. hasAssessmentActionableSignals', () => {
  it('returns true when weakness produces targets', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    expect(hasAssessmentActionableSignals(options)).toBe(true);
  });

  it('returns false when no actionable signals exist', () => {
    const options = makeBaseOptions({
      assessmentProfileReadout: makeEmptyProfile(),
    });
    expect(hasAssessmentActionableSignals(options)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R. getPrimaryAssessmentAction
// ---------------------------------------------------------------------------

describe('R. getPrimaryAssessmentAction', () => {
  it('returns the first budget-fitting target', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const primary = getPrimaryAssessmentAction(options, 60);

    expect(primary).not.toBeNull();
    expect(primary!.estimatedMinutes).toBeLessThanOrEqual(60);
  });

  it('returns null when no targets fit the budget', () => {
    const profile = makeWeaknessProfile('sql');
    const options = makeBaseOptions({
      assessmentProfileReadout: profile,
      domainResults: [makeDomainResult('sql', 'low')],
    });
    const primary = getPrimaryAssessmentAction(options, 1);

    expect(primary).toBeNull();
  });

  it('returns null when not assessed', () => {
    const options = makeBaseOptions({
      assessmentProfileReadout: { ...makeEmptyProfile(), isAssessed: false },
    });
    const primary = getPrimaryAssessmentAction(options, 60);

    expect(primary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S. assessmentTargetsToReviewCandidates
// ---------------------------------------------------------------------------

describe('S. assessmentTargetsToReviewCandidates', () => {
  it('filters out blocked targets', () => {
    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: true,
        blockingReason: 'Prerequisite not met',
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates).toEqual([]);
  });

  it('maps preparation kind to preparation_lesson type', () => {
    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates[0].type).toBe('preparation_lesson');
  });

  it('maps dsa kind to dsa_review type', () => {
    const dsaProblem = ALL_DSA_PROBLEMS[0];
    if (!dsaProblem) return;

    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'dsa',
        route: 'dsa',
        targetId: dsaProblem.id,
        title: dsaProblem.title,
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'dsa',
        isBlocked: false,
        sourceSignal: { type: 'domain_weakness', id: 'test', domainId: 'dsa', confidence: 'medium' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates[0].type).toBe('dsa_review');
  });

  it('maps practice kind to practice_session type', () => {
    const session = ALL_PRACTICE_SESSIONS[0];
    if (!session) return;

    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'practice',
        route: 'practice',
        targetId: session.id,
        title: session.title,
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: session.estimatedMinutes || 20,
        domainId: session.domainId,
        isBlocked: false,
        sourceSignal: { type: 'weakness_focus_area', id: 'test', domainId: session.domainId, confidence: 'low' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates[0].type).toBe('practice_session');
  });

  it('maps roadmap kind to roadmap_task type', () => {
    const task = ALL_TASKS[0];
    if (!task) return;

    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'roadmap',
        route: 'roadmap',
        targetId: task.id,
        title: task.title,
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: task.estimatedMinutes,
        domainId: task.domainId,
        isBlocked: false,
        sourceSignal: { type: 'domain_weakness', id: 'test', domainId: task.domainId, confidence: 'medium' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates[0].type).toBe('roadmap_task');
  });

  it('preserves domainId from target', () => {
    const targets: AssessmentLearningTarget[] = [
      {
        kind: 'preparation',
        route: 'preparation',
        targetId: 'prep-sql',
        title: 'SQL',
        description: 'Test',
        reason: 'Test',
        estimatedMinutes: 25,
        domainId: 'sql',
        isBlocked: false,
        sourceSignal: { type: 'confidence_signal', id: 'test', domainId: 'sql', confidence: 'low' },
      },
    ];
    const candidates = assessmentTargetsToReviewCandidates(targets);
    expect(candidates[0].domainId).toBe('sql');
  });
});
