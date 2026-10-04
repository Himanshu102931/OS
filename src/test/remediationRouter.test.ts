/**
 * Task 4 - Automatic Remediation Router & Closed Learning Loops
 *
 * Behavioral coverage for the single canonical remediation-routing authority
 * (`src/engine/remediationRouter.ts`) and its integrations:
 *
 *   4A canonical router + single authority + determinism
 *   4B assessment weakness  -> remediation
 *   4C practice weakness    -> remediation
 *   4D DSA failure          -> concept lesson
 *   4E preparation complete -> retrieval/practice continuation
 *   4F project defense      -> remediation
 *   4G session composer + deep-link handoff
 *   4H end-to-end loops (A-E)
 *   4I explainability
 *   4J safety: no fabricated IDs, no duplicate evidence, prerequisites respected
 *
 * Tests use the real datasets and real engine logic (evaluatePracticeAttempt,
 * applyPreparationStageCompletion, composeAdaptiveSession) rather than mocks.
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_TO_PREP_TOPIC,
  PROJECT_DEFENSE_PREP_TOPIC_ID,
  resolveAllRemediationRoutes,
  resolveAssessmentRemediation,
  resolveDsaRemediation,
  resolvePracticeRemediation,
  resolvePreparationContinuation,
  resolveProjectDefenseRemediation,
  routeRemediationCandidates,
} from '../engine/remediationRouter';
import { routeWeaknessSignals } from '../engine/weaknessRouter';
import { composeAdaptiveSession } from '../engine/sessionComposer';
import { evaluatePracticeAttempt } from '../engine/practiceEngine';
import { applyPreparationStageCompletion } from '../engine/preparationEngine';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { DSA_PROBLEMS, PATTERN_LESSONS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import type {
  DomainAssessmentResult,
  DSAProgress,
  PracticeAttempt,
  PracticeUserAnswer,
  PreparationTopicProgress,
  TopicSkillState,
  WeaknessSignal,
} from '../types';

// ---------------------------------------------------------------------------
// Fixtures built from the real datasets
// ---------------------------------------------------------------------------

const SQL_SESSION = PRACTICE_SESSIONS.find((s) => s.id === 'practice-sql-01')!;
const DEFENSE_SESSION = PRACTICE_SESSIONS.find((s) => s.id === 'practice-project-defense-01')!;
const SQL_TOPIC = PREPARATION_TOPICS.find((t) => t.id === 'prep-sql')!;
const LANG_TOPIC = PREPARATION_TOPICS.find((t) => t.id === 'prep-lang')!;
const NOW = '2026-10-15T10:00:00.000Z';

/** Weak SQL attempt: 1 of 4 scenario questions self-certified correct (25%). */
function buildWeakSqlAttempt(): PracticeAttempt {
  const answers: PracticeUserAnswer[] = SQL_SESSION.questions.map((q, idx) => ({
    questionId: q.id,
    userResponse: idx === 1 ? 'WITH ranked AS (SELECT ...) SELECT * FROM ranked;' : 'SELECT incomplete draft',
    isCorrect: idx === 1,
  }));
  return evaluatePracticeAttempt(SQL_SESSION, answers, 600, '2026-10-15').attempt;
}

/** Passing SQL attempt: every scenario self-certified correct (100%). */
function buildPassingSqlAttempt(): PracticeAttempt {
  const answers: PracticeUserAnswer[] = SQL_SESSION.questions.map((q) => ({
    questionId: q.id,
    userResponse: 'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;',
    isCorrect: true,
  }));
  return evaluatePracticeAttempt(SQL_SESSION, answers, 600, '2026-10-15').attempt;
}

/** Failed project defense attempt: no prompt self-certified correct (0%). */
function buildFailedDefenseAttempt(): PracticeAttempt {
  const answers: PracticeUserAnswer[] = DEFENSE_SESSION.questions.map((q) => ({
    questionId: q.id,
    userResponse: 'Partial answer that misses the required trade-off.',
    isCorrect: false,
  }));
  return evaluatePracticeAttempt(DEFENSE_SESSION, answers, 900, '2026-10-15').attempt;
}

const SQL_DOMAIN_RESULT: DomainAssessmentResult = {
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
};

const SQL_WEAKNESS_SIGNAL: WeaknessSignal = {
  id: 'ws-sql-1',
  domainId: 'sql',
  topicId: 'prep-sql',
  competency: 'Relational Joins',
  errorCategory: 'E-CONCEPT',
  strength: 2,
  status: 'open',
  firstSeenAt: '2026-10-15T00:00:00Z',
  lastSeenAt: '2026-10-15T00:00:00Z',
  occurrences: 1,
  sourceAttemptIds: ['diag-1'],
};

function remediationProgress(overrides: Partial<DSAProgress> = {}): DSAProgress {
  return {
    problemId: 'dsa-001',
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
    ...overrides,
  };
}

/** Real preparation completion path: Orient + Learn completed for prep-sql. */
function buildSqlCurriculumProgress(): PreparationTopicProgress {
  const orient = applyPreparationStageCompletion({ topic: SQL_TOPIC, stage: 'orient', nowISO: NOW });
  const learn = applyPreparationStageCompletion({
    topic: SQL_TOPIC,
    stage: 'learn',
    existingProgress: orient.progress,
    existingSkill: orient.skillUpdate ?? undefined,
    nowISO: '2026-10-15T11:00:00.000Z',
  });
  return learn.progress;
}

const SQL_SKILL_DEMONSTRATED: Record<string, TopicSkillState> = {
  'prep-sql': { topicId: 'prep-sql', domainId: 'sql', freshness: 'fresh', evidenceStrength: 60 },
};

// ---------------------------------------------------------------------------

describe('Task 4A - Canonical remediation router', () => {
  it('has exactly one routing authority: weaknessRouter is a thin adapter of remediationRouter', () => {
    const options = {
      practiceAttempts: [buildWeakSqlAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      dsaProblems: [DSA_PROBLEMS[0]],
      dsaProgressMap: { 'dsa-001': remediationProgress() },
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      topics: TOPICS,
      domains: DOMAINS,
      skillStates: {},
      activePhase: 1,
    };

    // ReviewCandidate facade output must be byte-identical to the canonical engine output
    expect(routeWeaknessSignals(options)).toEqual(routeRemediationCandidates(options));
    // The same inputs must produce identical routes on repeat runs
    expect(routeRemediationCandidates(options)).toEqual(routeRemediationCandidates(options));
  });

  it('is deterministic and side-effect free: same inputs, same routes, inputs untouched', () => {
    const attempts = [buildWeakSqlAttempt(), buildFailedDefenseAttempt()];
    const prepProgress: Record<string, PreparationTopicProgress> = {
      'prep-sql': buildSqlCurriculumProgress(),
    };
    const options = {
      practiceAttempts: attempts,
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: prepProgress,
      dsaProblems: [DSA_PROBLEMS[0]],
      dsaProgressMap: { 'dsa-001': remediationProgress() },
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      topics: TOPICS,
      domains: DOMAINS,
      skillStates: {},
      activePhase: 1,
    };

    const before = JSON.stringify({
      attempts,
      prepProgress,
      dsaProgress: options.dsaProgressMap,
    });

    const run1 = resolveAllRemediationRoutes(options);
    const run2 = resolveAllRemediationRoutes(options);

    expect(run1).toEqual(run2);
    expect(run1.map((r) => r.id)).toEqual(run2.map((r) => r.id));

    const after = JSON.stringify({
      attempts,
      prepProgress,
      dsaProgress: options.dsaProgressMap,
    });
    // Routing never rewrites historical state (evidence, Leitner, progress)
    expect(after).toBe(before);
  });

  it('never fabricates IDs: every targetId exists in a canonical dataset', () => {
    const routes = resolveAllRemediationRoutes({
      practiceAttempts: [buildWeakSqlAttempt(), buildFailedDefenseAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      dsaProblems: [DSA_PROBLEMS[0]],
      dsaProgressMap: { 'dsa-001': remediationProgress() },
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      topics: TOPICS,
      domains: DOMAINS,
      skillStates: { 'prep-lang': { topicId: 'prep-lang', domainId: 'python', freshness: 'stale', evidenceStrength: 10 } },
      activePhase: 1,
    });

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const exists =
        PREPARATION_TOPICS.some((t) => t.id === route.targetId) ||
        PRACTICE_SESSIONS.some((s) => s.id === route.targetId) ||
        DSA_PROBLEMS.some((p) => p.id === route.targetId) ||
        TASK_DEFINITIONS.some((t) => t.id === route.targetId);
      expect(exists, `route ${route.id} targets unknown id ${route.targetId}`).toBe(true);
    }
  });

  it('domain to preparation mappings only point at real preparation topics', () => {
    for (const [domainId, topicId] of Object.entries(DOMAIN_TO_PREP_TOPIC)) {
      expect(
        PREPARATION_TOPICS.some((t) => t.id === topicId),
        `mapping for ${domainId} points at missing topic ${topicId}`
      ).toBe(true);
    }
  });
});

describe('Task 4B - Assessment weakness to remediation', () => {
  it('routes a weak assessment topic to the mapped preparation lesson', () => {
    const routes = resolveAssessmentRemediation({
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes.length).toBe(1);
    const route = routes[0];
    expect(route.sourceType).toBe('assessment_weakness');
    expect(route.route).toBe('preparation');
    expect(route.type).toBe('preparation_lesson');
    expect(route.targetId).toBe('prep-sql');
    expect(route.topicId).toBe('prep-sql');
    // confidence band from the assessment result is preserved on the route
    expect(route.confidence).toBe('low');
    expect(route.reason).toContain('Low-confidence assessment diagnosis');
    expect(route.reason).toContain('Relational Joins');
  });

  it('produces no route when no valid canonical mapping exists', () => {
    const routes = resolveAssessmentRemediation({
      domainResults: [
        { ...SQL_DOMAIN_RESULT, domainId: 'not-a-domain' as unknown as DomainAssessmentResult['domainId'] },
      ],
      weaknessSignals: [
        { ...SQL_WEAKNESS_SIGNAL, domainId: 'not-a-domain' as unknown as WeaknessSignal['domainId'], topicId: undefined },
      ],
      preparationTopics: PREPARATION_TOPICS,
      practiceSessions: [],
      tasks: [],
    });

    expect(routes).toEqual([]);
  });
});

describe('Task 4C - Practice weakness to remediation', () => {
  it('routes a weak practice result to the mapped preparation concept review', () => {
    const attempt = buildWeakSqlAttempt();
    expect(attempt.accuracyPct).toBeLessThan(50);

    const routes = resolvePracticeRemediation({
      practiceAttempts: [attempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes.length).toBe(1);
    const route = routes[0];
    expect(route.sourceType).toBe('practice_weakness');
    expect(route.route).toBe('preparation');
    expect(route.targetId).toBe('prep-sql');
    // explainable, human-readable reason naming the actual weak category
    expect(route.reason).toContain('Practice weakness');
    expect(route.reason).toContain('JOIN & Aggregation');
    expect(route.reason).not.toContain('undefined');
  });

  it('does not fabricate a mapping for an unknown session or unknown domain', () => {
    const ghost: PracticeAttempt = {
      id: 'att-ghost',
      sessionId: 'session-does-not-exist',
      sessionTitle: 'Ghost Session',
      category: 'core_cs',
      domainId: 'not-a-domain' as unknown as PracticeAttempt['domainId'],
      topicId: 'not-a-topic',
      date: '2026-10-15',
      completedAt: '2026-10-15T10:00:00.000Z',
      totalTimeSeconds: 60,
      scorePct: 20,
      accuracyPct: 20,
      correctCount: 0,
      totalQuestions: 5,
      passed: false,
      userAnswers: [],
      evidenceLogId: 'ev-ghost',
    };

    const routes = resolvePracticeRemediation({
      practiceAttempts: [ghost],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes).toEqual([]);
  });

  it('stops routing once a passing attempt closes the weakness', () => {
    const weakRoutes = resolvePracticeRemediation({
      practiceAttempts: [buildWeakSqlAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });
    expect(weakRoutes.length).toBe(1);

    // A later passing attempt on the same session supersedes the weakness
    const passing = buildPassingSqlAttempt();
    passing.completedAt = '2026-10-16T10:00:00.000Z';
    const closedRoutes = resolvePracticeRemediation({
      practiceAttempts: [buildWeakSqlAttempt(), passing],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });
    expect(closedRoutes).toEqual([]);
  });

  it('tolerates attempt records without answer details (no crash, deterministic route)', () => {
    const partial: PracticeAttempt = {
      ...buildWeakSqlAttempt(),
      id: 'att-no-answers',
      userAnswers: undefined as unknown as PracticeUserAnswer[],
    };

    const routes = resolvePracticeRemediation({
      practiceAttempts: [partial],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes.length).toBe(1);
    expect(routes[0].targetId).toBe('prep-sql');
  });
});

describe('Task 4D - DSA failure to concept lesson', () => {
  it('resolves the existing pattern lesson for a remediation-required problem', () => {
    const prob = DSA_PROBLEMS.find((p) => p.id === 'dsa-001')!;
    const patternLesson = PATTERN_LESSONS.find((l) => l.name === prob.primaryPattern);
    expect(patternLesson).toBeDefined();

    const routes = resolveDsaRemediation({
      dsaProblems: [prob],
      dsaProgressMap: { [prob.id]: remediationProgress() },
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes.length).toBe(1);
    const route = routes[0];
    expect(route.sourceType).toBe('dsa_failure');
    expect(route.route).toBe('preparation');
    expect(route.type).toBe('preparation_lesson');
    expect(route.targetId).toBe('prep-coding-ds');
    expect(route.patternId).toBe(patternLesson!.patternId);
    expect(route.patternName).toBe(prob.primaryPattern);
    expect(route.title).toContain(prob.primaryPattern);
    expect(route.reason).toContain('DSA remediation active');
    expect(route.reason).toContain(prob.primaryPattern);
    expect(route.sourceProblemId).toBe(prob.id);
  });

  it('creates no concept remediation when remediation is not required and leaves Leitner state untouched', () => {
    const prob = DSA_PROBLEMS.find((p) => p.id === 'dsa-001')!;
    const progress = remediationProgress({
      remediationRequired: false,
      consecutiveFailures: 1,
      nextReviewAt: '2026-10-20',
      currentBox: 3,
    });
    const snapshot = JSON.stringify(progress);

    const routes = resolveDsaRemediation({
      dsaProblems: [prob],
      dsaProgressMap: { [prob.id]: progress },
      preparationTopics: PREPARATION_TOPICS,
    });

    expect(routes).toEqual([]);
    expect(JSON.stringify(progress)).toBe(snapshot);
    expect(progress.nextReviewAt).toBe('2026-10-20');
    expect(progress.currentBox).toBe(3);
  });
});

describe('Task 4E - Preparation completion to retrieval continuation', () => {
  it('exposes the mapped practice session after curriculum completion without demonstrated evidence', () => {
    const routes = resolvePreparationContinuation({
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      practiceSessions: PRACTICE_SESSIONS,
      practiceAttempts: [],
      skillStates: {},
      domainResults: [],
    });

    expect(routes.length).toBe(1);
    const route = routes[0];
    expect(route.sourceType).toBe('preparation_continuation');
    expect(route.route).toBe('practice');
    expect(route.type).toBe('practice_session');
    expect(route.targetId).toBe('practice-sql-01');
    expect(route.topicId).toBe('prep-sql');
    expect(route.title).toBe(`Retrieval Practice: ${SQL_SESSION.title}`);
    expect(route.reason).toContain(SQL_TOPIC.title);
    expect(route.isBlocked).toBe(false);
  });

  it('does not push a continuation once evidence is already demonstrated', () => {
    const routes = resolvePreparationContinuation({
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      practiceSessions: PRACTICE_SESSIONS,
      practiceAttempts: [],
      skillStates: SQL_SKILL_DEMONSTRATED,
      domainResults: [],
    });

    expect(routes).toEqual([]);
  });

  it('does not fabricate a retrieval activity when no practice session is mapped', () => {
    const orient = applyPreparationStageCompletion({ topic: LANG_TOPIC, stage: 'orient', nowISO: NOW });
    const learn = applyPreparationStageCompletion({
      topic: LANG_TOPIC,
      stage: 'learn',
      existingProgress: orient.progress,
      existingSkill: orient.skillUpdate ?? undefined,
      nowISO: '2026-10-15T11:00:00.000Z',
    });

    const routes = resolvePreparationContinuation({
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-lang': learn.progress },
      // An explicitly empty catalog proves the router returns nothing rather
      // than inventing a session id that does not exist.
      practiceSessions: [],
      practiceAttempts: [],
      skillStates: {},
      domainResults: [],
    });

    expect(routes).toEqual([]);
  });

  it('emits canonical completion evidence exactly once (duplicate completion is guarded)', () => {
    const orient = applyPreparationStageCompletion({ topic: SQL_TOPIC, stage: 'orient', nowISO: NOW });

    expect(orient.evidence).not.toBeNull();
    expect(orient.evidence!.sourceType).toBe('preparation_lesson');
    expect(orient.evidence!.sourceId).toBe('prep-sql:orient');
    expect(orient.evidence!.topicId).toBe('prep-sql');
    expect(orient.evidence!.score).toBe(70);
    // lesson completion never claims demonstrated mastery (< 40 threshold)
    expect(orient.skillUpdate!.evidenceStrength).toBeLessThan(40);

    const duplicate = applyPreparationStageCompletion({
      topic: SQL_TOPIC,
      stage: 'orient',
      existingProgress: orient.progress,
      existingSkill: orient.skillUpdate ?? undefined,
      nowISO: '2026-10-15T12:00:00.000Z',
    });

    expect(duplicate.evidence).toBeNull();
    expect(duplicate.skillUpdate).toBeNull();
    expect(duplicate.progress.evidenceStrength).toBe(orient.progress.evidenceStrength);

    // Re-routing the same completion state produces the same continuation, not extra evidence
    const options = {
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      practiceSessions: PRACTICE_SESSIONS,
      practiceAttempts: [],
      skillStates: {},
      domainResults: [],
    };
    const first = resolvePreparationContinuation(options);
    const second = resolvePreparationContinuation(options);
    expect(first).toEqual(second);
    expect(first.length).toBe(1);
  });
});

describe('Task 4F - Project defense weakness to remediation', () => {
  it('routes a weak defense attempt to the mapped preparation topic', () => {
    const attempt = buildFailedDefenseAttempt();
    expect(attempt.category).toBe('project_defense');

    const routes = resolveProjectDefenseRemediation({
      practiceAttempts: [attempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });

    expect(routes.length).toBe(1);
    const route = routes[0];
    expect(route.sourceType).toBe('project_defense_weakness');
    expect(route.route).toBe('preparation');
    expect(route.type).toBe('preparation_lesson');
    expect(route.targetId).toBe(PROJECT_DEFENSE_PREP_TOPIC_ID);
    expect(route.topicId).toBe(PROJECT_DEFENSE_PREP_TOPIC_ID);
    expect(route.reason).toContain('Project defense');
    expect(route.sourceId).toBe(attempt.id);
  });

  it('names the weak defense dimensions when answers are recorded', () => {
    const attempt = buildFailedDefenseAttempt();
    const route = resolveProjectDefenseRemediation({
      practiceAttempts: [attempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    })[0];

    expect(route.reason).toContain('Architecture & Data Flow');
  });

  it('returns no route when no preparation mapping exists', () => {
    const attempt = buildFailedDefenseAttempt();
    const routes = resolveProjectDefenseRemediation({
      practiceAttempts: [attempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: [],
      preparationTopicProgress: {},
      skillStates: {},
    });

    expect(routes).toEqual([]);
  });

  it('returns no route for a passing defense', () => {
    const passing: PracticeAttempt = {
      ...buildFailedDefenseAttempt(),
      passed: true,
      accuracyPct: 100,
      passingScorePct: 80,
    };

    const routes = resolveProjectDefenseRemediation({
      practiceAttempts: [passing],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });

    expect(routes).toEqual([]);
  });
});

describe('Task 4G - Session composer and deep-link integration', () => {
  it('SessionComposer consumes remediation routes as a normal session activity', () => {
    const plan = composeAdaptiveSession({
      availableMinutes: 60,
      todayStr: '2026-10-15',
      strictBudget: true,
      topics: TOPICS,
      domains: DOMAINS,
      practiceAttempts: [buildWeakSqlAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
    });

    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(60);
    expect(plan.activities.length).toBeGreaterThan(0);

    const activity = plan.activities.find((a) => a.type === 'preparation_lesson');
    expect(activity).toBeDefined();
    expect(activity!.targetId).toBe('prep-sql');
    expect(activity!.route).toBe('preparation');
    expect(activity!.sourceSubsystem).toBe('preparation');
    expect(activity!.priority).toBe('routed_weakness');
    expect(activity!.reason.length).toBeGreaterThan(0);

    // Task 2 deep-link handoff contract is preserved
    expect(activity!.deepLink).toEqual({ route: 'preparation', param: 'prep-sql' });
    expect(`#/${activity!.route}/${activity!.targetId}`).toBe('#/preparation/prep-sql');
  });

  it('keeps prerequisite gates authoritative: locked preparation targets are excluded', () => {
    // practice-mock-interview-01 maps to prep-interview-tech, which requires
    // prep-coding-ds + prep-sql + prep-os to be completed first.
    const lockedAttempt: PracticeAttempt = {
      id: 'att-locked',
      sessionId: 'practice-mock-interview-01',
      sessionTitle: 'Full Technical & Behavioral Mock Interview',
      category: 'mock_interview',
      domainId: 'interviews',
      topicId: 'prep-interview-tech',
      date: '2026-10-15',
      completedAt: '2026-10-15T10:00:00.000Z',
      totalTimeSeconds: 600,
      scorePct: 30,
      accuracyPct: 30,
      correctCount: 1,
      totalQuestions: 5,
      passed: false,
      userAnswers: [],
      evidenceLogId: 'ev-locked',
    };

    const allRoutes = resolveAllRemediationRoutes({
      practiceAttempts: [lockedAttempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });
    expect(allRoutes.find((r) => r.targetId === 'prep-interview-tech')).toBeUndefined();

    // The gate is evaluated (and reported), not silently skipped
    const rawRoutes = resolvePracticeRemediation({
      practiceAttempts: [lockedAttempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });
    const blockedRoute = rawRoutes.find((r) => r.targetId === 'prep-interview-tech');
    expect(blockedRoute).toBeDefined();
    expect(blockedRoute!.isBlocked).toBe(true);
    expect(blockedRoute!.blockingReason).toBeTruthy();

    const candidates = routeWeaknessSignals({
      practiceAttempts: [lockedAttempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });
    expect(candidates.find((c) => c.targetId === 'prep-interview-tech')).toBeUndefined();
  });

  it('excludes targets already committed for today (no double-booking)', () => {
    const candidates = routeWeaknessSignals({
      practiceAttempts: [buildWeakSqlAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      committedTargetIds: new Set(['prep-sql']),
    });

    expect(candidates.find((c) => c.targetId === 'prep-sql')).toBeUndefined();
  });
});

describe('Task 4H - End-to-end learning loops', () => {
  it('Flow A: assessment weakness -> route -> preparation completion -> canonical evidence', () => {
    const routes = resolveAssessmentRemediation({
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      preparationTopics: PREPARATION_TOPICS,
    });
    expect(routes[0].targetId).toBe('prep-sql');

    const completion = applyPreparationStageCompletion({
      topic: SQL_TOPIC,
      stage: 'orient',
      nowISO: NOW,
    });

    // The remediation route and the resulting evidence land on the same canonical id
    expect(completion.evidence!.topicId).toBe(routes[0].targetId);
    expect(completion.skillUpdate!.topicId).toBe(routes[0].targetId);

    // Curriculum completion then surfaces the mapped retrieval continuation
    const continuation = resolvePreparationContinuation({
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      practiceSessions: PRACTICE_SESSIONS,
      practiceAttempts: [],
      skillStates: {},
      domainResults: [],
    });
    expect(continuation.length).toBe(1);
    expect(continuation[0].targetId).toBe('practice-sql-01');
  });

  it('Flow B: practice weakness -> route -> remediation completion closes the loop', () => {
    const weakRoutes = resolvePracticeRemediation({
      practiceAttempts: [buildWeakSqlAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });
    expect(weakRoutes[0].targetId).toBe('prep-sql');

    // Practicing the mapped concept until a passing attempt is recorded clears the route
    const passing = buildPassingSqlAttempt();
    const closed = resolvePracticeRemediation({
      practiceAttempts: [passing],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
    });
    expect(closed).toEqual([]);

    // ...and the passing attempt demonstrates evidence, so no continuation is demanded
    const continuation = resolvePreparationContinuation({
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      practiceSessions: PRACTICE_SESSIONS,
      practiceAttempts: [passing],
      skillStates: {},
      domainResults: [],
    });
    expect(continuation).toEqual([]);
  });

  it('Flow C: DSA remediation -> concept lesson route -> preparation target', () => {
    const prob = DSA_PROBLEMS.find((p) => p.id === 'dsa-001')!;
    const routes = resolveAllRemediationRoutes({
      dsaProblems: [prob],
      dsaProgressMap: { [prob.id]: remediationProgress() },
      preparationTopics: PREPARATION_TOPICS,
      practiceAttempts: [],
      practiceSessions: PRACTICE_SESSIONS,
      skillStates: {},
    });

    const conceptRoute = routes.find((r) => r.sourceType === 'dsa_failure');
    expect(conceptRoute).toBeDefined();
    expect(conceptRoute!.route).toBe('preparation');
    expect(PREPARATION_TOPICS.some((t) => t.id === conceptRoute!.targetId)).toBe(true);
  });

  it('Flow D: defense weakness -> mapped preparation remediation -> evidence target', () => {
    const attempt = buildFailedDefenseAttempt();
    const routes = resolveProjectDefenseRemediation({
      practiceAttempts: [attempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    });
    expect(routes[0].targetId).toBe(PROJECT_DEFENSE_PREP_TOPIC_ID);

    const careerTopic = PREPARATION_TOPICS.find((t) => t.id === PROJECT_DEFENSE_PREP_TOPIC_ID)!;
    const completion = applyPreparationStageCompletion({
      topic: careerTopic,
      stage: 'orient',
      nowISO: NOW,
    });
    expect(completion.evidence!.topicId).toBe(routes[0].targetId);
  });

  it('Flow E: unmapped signals stay silent and the system remains stable', () => {
    const ghostAttempt: PracticeAttempt = {
      id: 'att-flow-e',
      sessionId: 'unknown-session',
      sessionTitle: 'Unknown',
      category: 'core_cs',
      domainId: 'unknown-domain' as unknown as PracticeAttempt['domainId'],
      topicId: 'unknown-topic',
      date: '2026-10-15',
      completedAt: '2026-10-15T10:00:00.000Z',
      totalTimeSeconds: 60,
      scorePct: 10,
      accuracyPct: 10,
      correctCount: 0,
      totalQuestions: 5,
      passed: false,
      userAnswers: [],
      evidenceLogId: 'ev-flow-e',
    };

    const options = {
      practiceAttempts: [ghostAttempt],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      domainResults: [],
      weaknessSignals: [],
      dsaProblems: [],
      dsaProgressMap: {},
      tasks: [],
      taskProgressMap: {},
      skillStates: {},
    };

    expect(resolveAllRemediationRoutes(options)).toEqual([]);
    expect(routeWeaknessSignals(options)).toEqual([]);
  });
});

describe('Task 4I - Explainability of automatically generated actions', () => {
  it('every route carries a human-readable reason without internal codes or identifiers', () => {
    const routes = resolveAllRemediationRoutes({
      practiceAttempts: [buildWeakSqlAttempt(), buildFailedDefenseAttempt()],
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: { 'prep-sql': buildSqlCurriculumProgress() },
      dsaProblems: [DSA_PROBLEMS[0]],
      dsaProgressMap: { 'dsa-001': remediationProgress() },
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      topics: TOPICS,
      domains: DOMAINS,
      skillStates: {},
      activePhase: 1,
    });

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.reason.length).toBeGreaterThan(20);
      expect(route.reason).not.toContain('undefined');
      // raw error-category codes are implementation jargon, not user copy
      expect(route.reason).not.toMatch(/E-[A-Z]+/);
      // reasons never claim mastery
      expect(route.reason.toLowerCase()).not.toContain('mastered');
      expect(route.reason.toLowerCase()).not.toContain('you have mastered');
    }
  });

  it('explains why each source produced its action', () => {
    const base = {
      practiceSessions: PRACTICE_SESSIONS,
      preparationTopics: PREPARATION_TOPICS,
      preparationTopicProgress: {},
      skillStates: {},
    };

    const assessment = resolveAssessmentRemediation({
      ...base,
      domainResults: [SQL_DOMAIN_RESULT],
      weaknessSignals: [SQL_WEAKNESS_SIGNAL],
    })[0];
    expect(assessment.reason).toContain('assessment');

    const practice = resolvePracticeRemediation({
      ...base,
      practiceAttempts: [buildWeakSqlAttempt()],
    })[0];
    expect(practice.reason).toContain('Practice weakness');

    const defense = resolveProjectDefenseRemediation({
      ...base,
      practiceAttempts: [buildFailedDefenseAttempt()],
    })[0];
    expect(defense.reason).toContain('Project defense');
  });
});
