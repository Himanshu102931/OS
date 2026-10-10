import { describe, it, expect } from 'vitest';

import {
  buildEvidenceTrace,
  buildSkillEvidenceTrace,
  buildReviewCandidateTrace,
  buildAnalyticsPromptTrace,
  buildAssessmentWeaknessTrace,
  buildPracticeWeaknessTrace,
  buildCompanyGapTrace,
  buildInterviewDimensionTrace,
  buildProjectDefenseTrace,
  buildRoadmapLockTrace,
  collectTopicEvidenceSources,
  collectOverdueReviewSources,
  collectRemediationSources,
  dedupeEvidenceSources,
  finalizeEvidenceSources,
  isValidDate,
  makeDerivedSource,
  resolveEvidenceSource,
  resolveSourceDestination,
  resolveTraceDestination,
  routeSupportsDeepLink,
  signalKindForPriority,
  sortEvidenceSources,
  type EvidenceCatalog,
  type EvidenceSourceRef,
  type TraceRoute,
} from '../engine/evidenceTrace';
import { calculateTopicReadiness } from '../engine/skillsEngine';
import { explainTaskLock } from '../engine/prerequisiteNavigation';
import type { RoutePath } from '../context/PlacementContext';
import type { ReviewCandidate } from '../engine/reviewScheduler';
import type { ReadinessDimension } from '../engine/interviewReadinessEngine';
import type { CompanyRequirementMapping } from '../engine/companyEngine';
import type {
  AssessmentAttempt,
  AssessmentState,
  DSAProblem,
  DSAProgress,
  EvidenceLog,
  PracticeAttempt,
  PracticeSessionDefinition,
  TaskDefinition,
  TaskProgress,
  Topic,
  WeaknessSignal,
} from '../types';

/**
 * Evidence traceability is a read-only adapter over canonical state. These
 * tests pin down: every source resolves to a real record, missing records are
 * reported rather than invented, generic routes are labelled honestly, and
 * ordering is deterministic and side-effect free.
 */

const TODAY = '2026-10-03';
const OLD = '2026-08-01T10:00:00.000Z';

const TOPIC: Topic = {
  id: 'topic-sql',
  moduleId: 'mod-sql',
  domainId: 'sql',
  name: 'SQL',
  description: 'SQL fundamentals',
  importance: 7,
};

const SQL_TOPIC_TWO: Topic = {
  id: 'topic-sql-joins',
  moduleId: 'mod-sql',
  domainId: 'sql',
  name: 'SQL Joins',
  description: 'Joins',
  importance: 6,
};

const TASK_ONE: TaskDefinition = {
  id: 'task-sql-1',
  title: 'SQL JOIN Practice',
  description: 'Practice joins',
  domainId: 'sql',
  topicId: 'topic-sql',
  phaseId: 'phase-1',
  estimatedMinutes: 25,
  importance: 7,
  taskType: 'practice',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const TASK_TWO: TaskDefinition = {
  id: 'task-sql-2',
  title: 'SQL Aggregations',
  description: 'Aggregations',
  domainId: 'sql',
  topicId: 'topic-sql',
  phaseId: 'phase-1',
  estimatedMinutes: 30,
  importance: 6,
  taskType: 'learning',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const PREREQ_TASK: TaskDefinition = {
  id: 'task-sql-prereq',
  title: 'Prerequisite Lesson',
  description: 'Prereq',
  domainId: 'sql',
  topicId: 'topic-sql',
  phaseId: 'phase-1',
  estimatedMinutes: 20,
  importance: 5,
  taskType: 'learning',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const BLOCKED_TASK: TaskDefinition = {
  ...TASK_TWO,
  id: 'task-sql-blocked',
  title: 'Blocked Task',
  prerequisiteTaskDefinitionIds: ['task-sql-prereq'],
};

const completed = (taskId: string, at: string): TaskProgress => ({
  taskId,
  state: 'completed',
  postponeCount: 0,
  skipCount: 0,
  timeSpentMinutes: 25,
  lastCompletedAt: at,
  updatedAt: at,
});

const notStarted = (taskId: string): TaskProgress => ({
  taskId,
  state: 'not_started',
  postponeCount: 0,
  skipCount: 0,
  timeSpentMinutes: 0,
  updatedAt: '2026-06-01T00:00:00.000Z',
});

const LOG_ONE: EvidenceLog = {
  id: 'log-sql-1',
  topicId: 'topic-sql',
  domainId: 'sql',
  score: 55,
  confidence: 3,
  timestamp: OLD,
  sourceType: 'practice_session',
  sourceId: 'sess-sql-join',
  details: 'SQL JOIN Practice Session',
};

const SESSION: PracticeSessionDefinition = {
  id: 'sess-sql-join',
  title: 'SQL JOIN Practice Session',
  description: 'Joins',
  category: 'sql',
  domainId: 'sql',
  topicId: 'topic-sql',
  estimatedMinutes: 20,
  questionCount: 5,
  passingScorePct: 70,
  questions: [],
};

const ATTEMPT: PracticeAttempt = {
  id: 'pa-1',
  sessionId: 'sess-sql-join',
  sessionTitle: 'SQL JOIN Practice Session',
  category: 'sql',
  domainId: 'sql',
  topicId: 'topic-sql',
  date: '2026-10-01',
  completedAt: '2026-10-01T09:30:00.000Z',
  totalTimeSeconds: 600,
  scorePct: 55,
  accuracyPct: 55,
  correctCount: 1,
  totalQuestions: 2,
  passed: false,
  passingScorePct: 70,
  userAnswers: [],
  evidenceLogId: 'log-sql-1',
};

const DEFENSE_SESSION: PracticeSessionDefinition = {
  id: 'practice-project-defense-01',
  title: 'Project Defense Session',
  description: 'Defend the project',
  category: 'project_defense',
  domainId: 'projects',
  estimatedMinutes: 30,
  questionCount: 4,
  passingScorePct: 80,
  questions: [],
};

const DEFENSE_ATTEMPT: PracticeAttempt = {
  id: 'pa-defense-1',
  sessionId: 'practice-project-defense-01',
  sessionTitle: 'Project Defense Session',
  category: 'project_defense',
  domainId: 'projects',
  date: '2026-09-28',
  completedAt: '2026-09-28T12:00:00.000Z',
  totalTimeSeconds: 900,
  scorePct: 40,
  accuracyPct: 40,
  correctCount: 2,
  totalQuestions: 5,
  passed: false,
  passingScorePct: 80,
  userAnswers: [],
  evidenceLogId: 'log-defense-1',
};

const DEFENSE_LOG: EvidenceLog = {
  id: 'log-defense-1',
  topicId: 'topic-projects',
  domainId: 'projects',
  score: 40,
  confidence: 3,
  timestamp: '2026-09-28T12:00:00.000Z',
  sourceType: 'practice_session',
  sourceId: 'practice-project-defense-01',
  details: 'Project Defense Session (project_defense) with 40% accuracy',
};

const DSA_PROBLEM: DSAProblem = {
  id: 'dsa-001',
  leetcodeNumber: 1,
  title: 'Two Sum',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  difficulty: 'easy',
  leetcodeUrl: 'https://example.invalid/1',
  accessTier: 'FREE',
  primaryPattern: 'hash_map',
  dataStructure: 'array',
  algorithmicTechnique: 'hashing',
  recommendedPhase: 1,
  progressionTier: 'STARTER',
  prerequisites: [],
  isAnchor: true,
  estimatedTimeMinutes: 20,
};

const overdueProgress = (): DSAProgress => ({
  problemId: 'dsa-001',
  currentBox: 2,
  nextReviewAt: '2026-10-01',
  lastAttemptAt: '2026-09-20T10:00:00.000Z',
  attemptCount: 3,
  remediationRequired: true,
  evidenceStrength: 65,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
});

const makeCatalog = (overrides: Partial<EvidenceCatalog> = {}): EvidenceCatalog => ({
  topics: [TOPIC, SQL_TOPIC_TWO],
  taskDefinitions: [TASK_ONE, TASK_TWO, PREREQ_TASK, BLOCKED_TASK],
  taskProgress: {
    'task-sql-1': completed('task-sql-1', OLD),
    'task-sql-2': notStarted('task-sql-2'),
    'task-sql-prereq': notStarted('task-sql-prereq'),
    'task-sql-blocked': notStarted('task-sql-blocked'),
  },
  dsaProblems: [DSA_PROBLEM],
  dsaProgress: { 'dsa-001': overdueProgress() },
  dsaAttempts: [
    {
      id: 'att-1',
      problemId: 'dsa-001',
      date: '2026-09-20',
      result: 'fail',
      assistanceLevel: 'none',
      timeTakenMinutes: 35,
      createdAt: '2026-09-20T10:00:00.000Z',
    },
  ],
  evidenceLogs: [LOG_ONE],
  practiceSessions: [SESSION, DEFENSE_SESSION],
  practiceAttempts: [ATTEMPT],
  skillStates: {
    'topic-sql': {
      topicId: 'topic-sql',
      domainId: 'sql',
      lastPracticedAt: OLD,
      freshness: 'stale',
      evidenceStrength: 38,
    },
  },
  todayISO: TODAY,
  ...overrides,
});

const readinessFor = (catalog: EvidenceCatalog) =>
  calculateTopicReadiness(
    TOPIC,
    undefined,
    catalog.taskDefinitions,
    catalog.taskProgress,
    catalog.dsaProblems,
    catalog.dsaProgress,
    catalog.dsaAttempts,
    catalog.evidenceLogs,
    catalog.skillStates,
    [],
    catalog.todayISO
  );

const makeCandidate = (overrides: Partial<ReviewCandidate> = {}): ReviewCandidate => ({
  id: 'review-overdue-dsa-001',
  type: 'dsa_review',
  title: 'Review #1 Two Sum',
  description: 'Spaced repetition review',
  priority: 'overdue_review',
  priorityScore: 92,
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  estimatedMinutes: 15,
  reason: 'Leitner box 2 review is 2 days overdue',
  route: 'dsa',
  targetId: 'dsa-001',
  sourceProblemId: 'dsa-001',
  isBlocked: false,
  ...overrides,
});

const makeDimension = (overrides: Partial<ReadinessDimension> = {}): ReadinessDimension => ({
  id: 'sql_programming',
  name: 'SQL & Programming',
  shortName: 'SQL',
  description: 'SQL and programming fundamentals',
  band: 'needs_work',
  evidenceStrength: 42,
  confidence: 'medium',
  freshness: 'stale',
  evidenceItems: [
    {
      source: 'skill',
      description: 'Low SQL evidence strength (38%)',
      strength: 38,
      freshness: 'stale',
      timestamp: OLD,
    },
    {
      source: 'practice',
      description: 'SQL JOIN Practice Session scored 55%',
      strength: 55,
      freshness: 'fresh',
      timestamp: '2026-10-01T09:30:00.000Z',
    },
  ],
  gapExplanation: 'SQL evidence is below the target level',
  recommendedAction: { label: 'Open Practice', route: 'practice', targetId: 'sess-sql-join', type: 'practice' },
  capability: 40,
  confidenceScore: 55,
  freshnessScore: 25,
  weaknesses: ['SQL JOINs'],
  companyRelevant: true,
  ...overrides,
});

const makeRequirement = (
  overrides: Partial<CompanyRequirementMapping> = {}
): CompanyRequirementMapping => ({
  requirementId: 'req-topic-topic-sql',
  requirementName: 'SQL',
  category: 'topic',
  topicId: 'topic-sql',
  evidenceStrength: 38,
  currentLevel: 2,
  targetLevel: 4,
  evidenceClassification: 'demonstrated',
  freshness: 'stale',
  status: 'gap_identified',
  statusLabel: 'Gap Identified',
  supportingEvidenceCount: 2,
  gapExplanation: 'SQL evidence is below the required level for this company.',
  recommendedAction: { label: 'Complete Task: SQL Aggregations', route: 'roadmap', targetId: 'task-sql-2', type: 'task' },
  ...overrides,
});

const makeWeaknessSignal = (
  overrides: Partial<WeaknessSignal> = {}
): WeaknessSignal => ({
  id: 'ws-sql-joins-att-9',
  domainId: 'sql',
  topicId: 'topic-sql',
  competency: 'joins',
  errorCategory: 'conceptual_gap',
  strength: 3,
  status: 'open',
  firstSeenAt: '2026-09-15T10:00:00.000Z',
  lastSeenAt: '2026-09-30T10:00:00.000Z',
  occurrences: 3,
  sourceAttemptIds: ['att-9'],
  ...overrides,
});

const makeAssessmentAttempt = (id: string): AssessmentAttempt => ({
  id,
  definitionId: 'def-baseline',
  definitionVersion: 1,
  kind: 'diagnostic_assessment',
  status: 'submitted',
  startedAt: '2026-09-30T09:00:00.000Z',
  endedAt: '2026-09-30T09:40:00.000Z',
  timeLimitSeconds: 3600,
  seed: 'seed',
  selectedItemIds: [],
});

// ---------------------------------------------------------------------------
// Routing contract
// ---------------------------------------------------------------------------

describe('TraceRoute stays in lockstep with RoutePath', () => {
  it('is mutually assignable so a new route cannot silently fall out of traceability', () => {
    const traceToRoute: TraceRoute extends RoutePath ? true : false = true;
    const routeToTrace: RoutePath extends TraceRoute ? true : false = true;
    expect(traceToRoute).toBe(true);
    expect(routeToTrace).toBe(true);
  });

  it('roadmap, preparation, dsa, practice, and skills are treated as deep-linkable', () => {
    const routes: TraceRoute[] = [
      'dashboard',
      'roadmap',
      'dsa',
      'skills',
      'practice',
      'preparation',
      'project',
      'companies',
      'analytics',
      'settings',
      'assessment',
      'interview',
    ];
    expect(routes.filter(routeSupportsDeepLink)).toEqual([
      'roadmap',
      'dsa',
      'skills',
      'practice',
      'preparation',
    ]);
    expect(routeSupportsDeepLink('dsa')).toBe(true);
    expect(routeSupportsDeepLink('practice')).toBe(true);
    expect(routeSupportsDeepLink('skills')).toBe(true);
    expect(routeSupportsDeepLink('roadmap')).toBe(true);
    expect(routeSupportsDeepLink('preparation')).toBe(true);
    expect(routeSupportsDeepLink('assessment')).toBe(false);
    expect(routeSupportsDeepLink('analytics')).toBe(false);
    expect(routeSupportsDeepLink('dashboard')).toBe(false);
  });
});

describe('resolveTraceDestination — honest labels, no phantom routes', () => {
  const catalog = makeCatalog();

  it('drops a targetId for unsupported routes and says so', () => {
    const assessment = resolveTraceDestination('assessment', 'att-9', catalog);
    expect(assessment.deepLink).toBe(false);
    expect(assessment.targetId).toBeUndefined();
    expect(assessment.label).toBe('View Assessment');
    expect(assessment.note).toContain('does not open a specific record');

    const analytics = resolveTraceDestination('analytics', 'metric-1', catalog);
    expect(analytics.deepLink).toBe(false);
    expect(analytics.targetId).toBeUndefined();
    expect(analytics.label).toBe('Open Analytics');

    const dashboard = resolveTraceDestination('dashboard', 'dash-1', catalog);
    expect(dashboard.deepLink).toBe(false);
    expect(dashboard.targetId).toBeUndefined();
    expect(dashboard.label).toBe('Open Dashboard');
  });

  it('resolves a real DSA problem target and refuses a phantom one', () => {
    const real = resolveTraceDestination('dsa', 'dsa-001', catalog);
    expect(real).toMatchObject({ deepLink: true, targetId: 'dsa-001', route: 'dsa' });
    expect(real.label).toBe('Open "Two Sum"');

    const ghost = resolveTraceDestination('dsa', 'dsa-ghost', catalog);
    expect(ghost.deepLink).toBe(false);
    expect(ghost.targetId).toBeUndefined();
    expect(ghost.label).toBe('Open DSA');
    expect(ghost.note).toContain('dsa-ghost');
  });

  it('resolves a real practice session target and refuses a phantom one', () => {
    const real = resolveTraceDestination('practice', 'sess-sql-join', catalog);
    expect(real).toMatchObject({ deepLink: true, targetId: 'sess-sql-join', route: 'practice' });
    expect(real.label).toBe('Open "SQL JOIN Practice Session"');

    const ghost = resolveTraceDestination('practice', 'sess-ghost', catalog);
    expect(ghost.deepLink).toBe(false);
    expect(ghost.targetId).toBeUndefined();
    expect(ghost.label).toBe('Open Practice');
    expect(ghost.note).toContain('sess-ghost');
  });

  it('resolves a real skills target by topic or domain and refuses a phantom one', () => {
    const byTopic = resolveTraceDestination('skills', 'topic-sql', catalog);
    expect(byTopic).toMatchObject({ deepLink: true, targetId: 'topic-sql', route: 'skills' });
    expect(byTopic.label).toBe('Open "SQL"');

    const byDomain = resolveTraceDestination('skills', 'sql', catalog);
    expect(byDomain).toMatchObject({ deepLink: true, targetId: 'sql', route: 'skills' });
    expect(byDomain.label).toBe('Open "SQL"');

    const ghost = resolveTraceDestination('skills', 'skill-ghost', catalog);
    expect(ghost.deepLink).toBe(false);
    expect(ghost.targetId).toBeUndefined();
    expect(ghost.label).toBe('Open Skills Matrix');
    expect(ghost.note).toContain('skill-ghost');
  });

  it('keeps a real roadmap target and names it', () => {
    const byTask = resolveTraceDestination('roadmap', 'task-sql-1', catalog);
    expect(byTask).toMatchObject({ deepLink: true, targetId: 'task-sql-1', route: 'roadmap' });
    expect(byTask.label).toBe('Open "SQL JOIN Practice"');

    const byTopic = resolveTraceDestination('roadmap', 'topic-sql', catalog);
    expect(byTopic).toMatchObject({ deepLink: true, targetId: 'topic-sql' });
    expect(byTopic.label).toBe('Open "SQL"');
  });

  it('refuses an unknown roadmap target instead of emitting a dead link', () => {
    const ghost = resolveTraceDestination('roadmap', 'no-such-target', catalog);
    expect(ghost.deepLink).toBe(false);
    expect(ghost.targetId).toBeUndefined();
    expect(ghost.label).toBe('Open Roadmap');
    expect(ghost.note).toContain('no-such-target');
  });

  it('resolves a real preparation topic and refuses a phantom one', () => {
    const real = resolveTraceDestination('preparation', 'prep-lang', catalog);
    expect(real).toMatchObject({ deepLink: true, targetId: 'prep-lang' });
    expect(real.label).toContain('Programming Language (Python)');

    const ghost = resolveTraceDestination('preparation', 'prep-ghost', catalog);
    expect(ghost.deepLink).toBe(false);
    expect(ghost.targetId).toBeUndefined();
    expect(ghost.note).toContain('prep-ghost');
  });

  it('handles an absent target id without inventing one', () => {
    const noneRoadmap = resolveTraceDestination('roadmap', undefined, catalog);
    expect(noneRoadmap.deepLink).toBe(false);
    expect(noneRoadmap.targetId).toBeUndefined();
    expect(noneRoadmap.note).toBeUndefined();

    const noneDsa = resolveTraceDestination('dsa', undefined, catalog);
    expect(noneDsa.deepLink).toBe(false);
    expect(noneDsa.targetId).toBeUndefined();

    const nonePractice = resolveTraceDestination('practice', undefined, catalog);
    expect(nonePractice.deepLink).toBe(false);
    expect(nonePractice.targetId).toBeUndefined();

    const noneSkills = resolveTraceDestination('skills', undefined, catalog);
    expect(noneSkills.deepLink).toBe(false);
    expect(noneSkills.targetId).toBeUndefined();
  });
});

describe('resolveSourceDestination — deep link resolution across all sources', () => {
  const catalog = makeCatalog();

  it('resolves dsa progress source to deep link on problem', () => {
    const dest = resolveSourceDestination(
      { kind: 'dsa_progress', sourceId: 'dsa-001', label: 'Two Sum', availability: 'available' },
      catalog
    );
    expect(dest).toMatchObject({ route: 'dsa', targetId: 'dsa-001', deepLink: true });
    expect(dest?.label).toBe('Open "Two Sum"');
  });

  it('resolves dsa attempt source to deep link on problem', () => {
    const dest = resolveSourceDestination(
      { kind: 'dsa_attempt', sourceId: 'dsa-att-1', label: 'Two Sum Attempt', availability: 'available' },
      {
        ...catalog,
        dsaAttempts: [
          {
            id: 'dsa-att-1',
            problemId: 'dsa-001',
            date: '2026-10-01',
            result: 'pass',
            assistanceLevel: 'none',
            timeTakenMinutes: 15,
            createdAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      }
    );
    expect(dest).toMatchObject({ route: 'dsa', targetId: 'dsa-001', deepLink: true });
    expect(dest?.label).toBe('Open "Two Sum"');
  });

  it('resolves practice attempt source to deep link on session', () => {
    const dest = resolveSourceDestination(
      { kind: 'practice_attempt', sourceId: 'pa-1', label: 'SQL Practice Attempt', availability: 'available' },
      catalog
    );
    expect(dest).toMatchObject({ route: 'practice', targetId: 'sess-sql-join', deepLink: true });
    expect(dest?.label).toBe('Open "SQL JOIN Practice Session"');
  });

  it('resolves practice session source to deep link on session', () => {
    const dest = resolveSourceDestination(
      { kind: 'practice_session', sourceId: 'sess-sql-join', label: 'SQL Practice Session', availability: 'available' },
      catalog
    );
    expect(dest).toMatchObject({ route: 'practice', targetId: 'sess-sql-join', deepLink: true });
    expect(dest?.label).toBe('Open "SQL JOIN Practice Session"');
  });

  it('resolves skill state source to deep link on skills matrix', () => {
    const dest = resolveSourceDestination(
      { kind: 'skill_state', sourceId: 'topic-sql', label: 'SQL Skill', availability: 'available' },
      catalog
    );
    expect(dest).toMatchObject({ route: 'skills', targetId: 'topic-sql', deepLink: true });
    expect(dest?.label).toBe('Open "SQL"');
  });

  it('resolves evidence log of type dsa_attempt to problem deep link', () => {
    const log: EvidenceLog = {
      id: 'log-dsa-test',
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      score: 80,
      confidence: 4,
      timestamp: '2026-10-01T10:00:00.000Z',
      sourceType: 'dsa_attempt',
      sourceId: 'dsa-att-test',
    };
    const dest = resolveSourceDestination(
      { kind: 'evidence_log', sourceId: 'log-dsa-test', label: 'DSA Evidence', availability: 'available' },
      {
        ...catalog,
        evidenceLogs: [...catalog.evidenceLogs, log],
        dsaAttempts: [
          {
            id: 'dsa-att-test',
            problemId: 'dsa-001',
            date: '2026-10-01',
            result: 'pass',
            assistanceLevel: 'none',
            timeTakenMinutes: 15,
            createdAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      }
    );
    expect(dest).toMatchObject({ route: 'dsa', targetId: 'dsa-001', deepLink: true });
    expect(dest?.label).toBe('Open "Two Sum"');
  });

  it('resolves evidence log of type practice_session to session deep link', () => {
    const dest = resolveSourceDestination(
      { kind: 'evidence_log', sourceId: 'log-sql-1', label: 'Practice Evidence', availability: 'available' },
      catalog
    );
    expect(dest).toMatchObject({ route: 'practice', targetId: 'sess-sql-join', deepLink: true });
    expect(dest?.label).toBe('Open "SQL JOIN Practice Session"');
  });
});

// ---------------------------------------------------------------------------
// Source resolution safety
// ---------------------------------------------------------------------------

describe('resolveEvidenceSource — real records only', () => {
  const catalog = makeCatalog();

  it('resolves a real task record', () => {
    const source = resolveEvidenceSource('task_progress', 'task-sql-1', catalog);
    expect(source.availability).toBe('available');
    expect(source.label).toBe('SQL JOIN Practice');
    expect(source.timestamp).toBe(OLD);
  });

  it('marks a missing record unavailable rather than inventing it', () => {
    const source = resolveEvidenceSource('task_progress', 'task-ghost', catalog);
    expect(source.availability).toBe('missing');
    expect(source.sourceId).toBe('task-ghost');
    expect(source.detail).toContain('task-ghost');
    expect(source.kind).toBe('task_progress');
  });

  it('never emits a record for an empty id', () => {
    expect(resolveEvidenceSource('evidence_log', '', catalog).availability).toBe('missing');
    expect(resolveEvidenceSource('dsa_progress', '', catalog).availability).toBe('missing');
  });

  it('survives corrupted evidence without throwing', () => {
    const corrupted: EvidenceLog = {
      id: 'log-corrupt',
      topicId: 'topic-sql',
      domainId: 'sql',
      score: 0,
      confidence: 1,
      timestamp: '',
      sourceType: 'test',
      sourceId: '',
    };
    const corruptCatalog = makeCatalog({ evidenceLogs: [corrupted] });
    expect(() => resolveEvidenceSource('evidence_log', 'log-corrupt', corruptCatalog)).not.toThrow();
    const source = resolveEvidenceSource('evidence_log', 'log-corrupt', corruptCatalog);
    expect(source.availability).toBe('available');
    expect(source.timestamp).toBe('');
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate('2026-10-03')).toBe(true);
  });

  it('treats a derived entry as an explicit non-record', () => {
    const derived = makeDerivedSource('derived:x', 'Aggregated', 'no single record');
    expect(derived.kind).toBe('derived');
    expect(derived.availability).toBe('available');
    expect(resolveEvidenceSource('derived', 'derived:x', catalog).kind).toBe('derived');
  });
});

describe('ordering and deduplication', () => {
  const dated = (id: string, timestamp?: string): EvidenceSourceRef => ({
    kind: 'evidence_log',
    sourceId: id,
    label: id,
    timestamp,
    availability: 'available',
  });

  it('orders by timestamp descending, then source priority, then id', () => {
    const sorted = sortEvidenceSources([
      dated('b', '2026-01-01T00:00:00.000Z'),
      dated('a', '2026-01-01T00:00:00.000Z'),
      dated('undated'),
      dated('c', '2026-03-01T00:00:00.000Z'),
    ]);
    expect(sorted.map((s) => s.sourceId)).toEqual(['c', 'a', 'b', 'undated']);
  });

  it('produces identical output for every input permutation', () => {
    const inputs = [
      dated('x', '2026-02-01T00:00:00.000Z'),
      dated('y', '2026-02-01T00:00:00.000Z'),
      dated('z'),
      {
        kind: 'task_progress' as const,
        sourceId: 't',
        label: 't',
        timestamp: '2026-02-01T00:00:00.000Z',
        availability: 'available' as const,
      },
    ];
    const baseline = JSON.stringify(finalizeEvidenceSources(inputs));
    const rotations = [
      [inputs[1], inputs[2], inputs[3], inputs[0]],
      [inputs[3], inputs[0], inputs[2], inputs[1]],
      [inputs[2], inputs[3], inputs[1], inputs[0]],
    ];
    for (const rotation of rotations) {
      expect(JSON.stringify(finalizeEvidenceSources(rotation))).toBe(baseline);
    }
  });

  it('deduplicates the same source contributed twice', () => {
    const once = dated('dup', '2026-05-01T00:00:00.000Z');
    const twice = { ...dated('dup', '2026-05-01T00:00:00.000Z') };
    const out = dedupeEvidenceSources([once, twice]);
    expect(out).toHaveLength(1);
    expect(out[0].sourceId).toBe('dup');
  });

  it('keeps distinct kinds for the same id apart', () => {
    const out = dedupeEvidenceSources([
      { kind: 'task_progress', sourceId: 'shared', label: 'a', availability: 'available' },
      { kind: 'evidence_log', sourceId: 'shared', label: 'b', availability: 'available' },
    ]);
    expect(out).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Skill readiness signals
// ---------------------------------------------------------------------------

describe('skill signals reuse the canonical readiness result', () => {
  it('weak skill resolves to the same supporting evidence Skills shows', () => {
    const catalog = makeCatalog();
    const readiness = readinessFor(catalog);
    expect(readiness.supportingEvidence.length).toBeGreaterThan(0);

    const trace = buildSkillEvidenceTrace(readiness, 'weak_skill', catalog);

    expect(trace.signal).toBe('weak_skill');
    expect(trace.label).toBe('SQL evidence is weak');
    expect(trace.why).toContain('Low evidence in SQL');
    expect(trace.why).toContain(String(readiness.evidenceStrength));
    expect(trace.classification).toBe(readiness.evidenceClassification);
    expect(trace.sources).toHaveLength(readiness.supportingEvidence.length);
    expect(trace.sources.every((s) => s.availability === 'available')).toBe(true);
    expect(trace.origin).toBe('aggregated');
  });

  it('stale evidence explains the freshness and last activity', () => {
    const catalog = makeCatalog();
    const readiness = readinessFor(catalog);
    expect(readiness.freshness).toBe('stale');

    const trace = buildSkillEvidenceTrace(readiness, 'stale_evidence', catalog);
    expect(trace.signal).toBe('stale_evidence');
    expect(trace.why).toContain('stale');
    expect(trace.why).toContain('2026-08-01');
    expect(trace.sources.length).toBeGreaterThan(0);
  });

  it('a topic with no evidence is reported as derived, not as an empty proof', () => {
    const empty = makeCatalog({
      taskProgress: {},
      evidenceLogs: [],
      skillStates: {},
    });
    const readiness = readinessFor(empty);
    expect(readiness.supportingEvidence).toHaveLength(0);

    const trace = buildSkillEvidenceTrace(readiness, 'weak_skill', empty);
    expect(trace.origin).toBe('derived');
    expect(trace.sources).toHaveLength(1);
    expect(trace.sources[0].kind).toBe('derived');
    expect(trace.classification).toBe('insufficient');
  });

  it('reports a supporting-evidence row whose record disappeared after the score was computed', () => {
    const catalog = makeCatalog();
    const readiness = readinessFor(catalog);
    expect(readiness.supportingEvidence.some((e) => e.sourceType === 'task')).toBe(true);

    // The readiness object was computed before progress was reset; the trace
    // must not paper over the gap by dropping the row or inventing a record.
    const afterReset = makeCatalog({ taskProgress: {} });
    const trace = buildSkillEvidenceTrace(readiness, 'weak_skill', afterReset);
    const missing = trace.sources.filter((s) => s.availability === 'missing');
    expect(missing).toHaveLength(1);
    expect(missing[0].kind).toBe('task_progress');
    expect(missing[0].sourceId).toBe('task-sql-1');
    expect(missing[0].detail).toContain('task-sql-1');
    expect(trace.sources.some((s) => s.availability === 'available')).toBe(true);
    expect(trace.origin).toBe('aggregated');
  });

  it('does not mutate the readiness object it is given', () => {
    const catalog = makeCatalog();
    const readiness = readinessFor(catalog);
    const before = JSON.stringify(readiness);
    buildSkillEvidenceTrace(readiness, 'weak_skill', catalog);
    buildSkillEvidenceTrace(readiness, 'stale_evidence', catalog);
    expect(JSON.stringify(readiness)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Review candidates (Today / Dashboard / weaknessRouter / companyPlanEngine)
// ---------------------------------------------------------------------------

describe('review candidates resolve to their declared sources', () => {
  it('maps every scheduler priority onto a stable signal kind', () => {
    expect(signalKindForPriority('overdue_review')).toBe('overdue_review');
    expect(signalKindForPriority('remediation')).toBe('dsa_remediation');
    expect(signalKindForPriority('routed_weakness')).toBe('routed_weakness');
    expect(signalKindForPriority('company_gap')).toBe('company_gap');
    expect(signalKindForPriority('stale_evidence')).toBe('stale_evidence');
    expect(signalKindForPriority('weak_topic')).toBe('weak_skill');
    expect(signalKindForPriority('retention')).toBe('overdue_review');
    expect(signalKindForPriority('normal_progression')).toBe('progression');
  });

  it('overdue review → the exact Leitner record that is due', () => {
    const catalog = makeCatalog();
    const trace = buildReviewCandidateTrace(makeCandidate(), catalog);

    expect(trace.signal).toBe('overdue_review');
    expect(trace.origin).toBe('aggregated');
    const primary = trace.sources.find((s) => s.kind === 'dsa_progress');
    expect(primary).toMatchObject({ sourceId: 'dsa-001', availability: 'available' });
    expect(primary?.detail).toContain('review due 2026-10-01');
    expect(trace.sources.some((s) => s.kind === 'dsa_attempt' && s.sourceId === 'att-1')).toBe(true);
    expect(trace.destination).toMatchObject({ route: 'dsa', targetId: 'dsa-001', deepLink: true, label: 'Open "Two Sum"' });
    expect(trace.why).toBe('Leitner box 2 review is 2 days overdue');
  });

  it('DSA remediation → the remediation-flagged Leitner record', () => {
    const catalog = makeCatalog();
    const trace = buildReviewCandidateTrace(
      makeCandidate({ id: 'review-remediation-dsa-001', priority: 'remediation' }),
      catalog
    );
    expect(trace.signal).toBe('dsa_remediation');
    const leitner = trace.sources.find((s) => s.kind === 'dsa_progress');
    expect(leitner).toMatchObject({ sourceId: 'dsa-001', availability: 'available' });
    expect(leitner?.detail).toContain('remediation required');
    expect(trace.sources.some((s) => s.kind === 'dsa_attempt')).toBe(true);
    expect(collectRemediationSources(catalog)).toHaveLength(1);
  });

  it('routed weakness → the skill state the router attached', () => {
    const catalog = makeCatalog();
    const trace = buildReviewCandidateTrace(
      makeCandidate({
        id: 'weakness-skill-task-task-sql-2',
        priority: 'routed_weakness',
        route: 'roadmap',
        targetId: 'task-sql-2',
        sourceProblemId: undefined,
        sourceTaskId: 'task-sql-2',
        sourceTopicId: 'topic-sql',
        reason: 'SQL evidence is 38% against a target of 4',
      }),
      catalog
    );
    expect(trace.signal).toBe('routed_weakness');
    expect(trace.sources.map((s) => s.kind).sort()).toEqual(['skill_state', 'task_progress']);
    expect(trace.sources.every((s) => s.availability === 'available')).toBe(true);
    expect(trace.destination).toMatchObject({ route: 'roadmap', deepLink: true, targetId: 'task-sql-2' });
  });

  it('an aggregated candidate carries more than one source', () => {
    const catalog = makeCatalog();
    const trace = buildReviewCandidateTrace(
      makeCandidate({
        sourceTaskId: 'task-sql-1',
        sourceTopicId: 'topic-sql',
      }),
      catalog
    );
    expect(trace.sources.length).toBeGreaterThanOrEqual(3);
    expect(trace.origin).toBe('aggregated');
  });

  it('a candidate whose source records are gone reports them unavailable', () => {
    const catalog = makeCatalog({ dsaProgress: {}, dsaAttempts: [], taskProgress: {} });
    const trace = buildReviewCandidateTrace(
      makeCandidate({ sourceProblemId: 'dsa-ghost', targetId: 'dsa-ghost' }),
      catalog
    );
    expect(trace.sources).toHaveLength(1);
    expect(trace.sources[0]).toMatchObject({
      kind: 'dsa_progress',
      sourceId: 'dsa-ghost',
      availability: 'missing',
    });
    expect(trace.origin).toBe('direct');
    expect(trace.destination.deepLink).toBe(false);
    expect(trace.destination.targetId).toBeUndefined();
  });

  it('a candidate with no declared source at all is reported as derived', () => {
    const catalog = makeCatalog({ dsaProgress: {}, dsaAttempts: [] });
    const trace = buildReviewCandidateTrace(
      makeCandidate({ sourceProblemId: undefined, targetId: undefined }),
      catalog
    );
    expect(trace.origin).toBe('derived');
    expect(trace.sources[0].kind).toBe('derived');
  });

  it('a roadmap candidate without source refs still finds its records', () => {
    const catalog = makeCatalog();
    const trace = buildReviewCandidateTrace(
      makeCandidate({
        id: 'progression-task-sql-1',
        priority: 'normal_progression',
        route: 'roadmap',
        targetId: 'task-sql-1',
        sourceProblemId: undefined,
      }),
      catalog
    );
    expect(trace.signal).toBe('progression');
    expect(trace.sources.some((s) => s.kind === 'task_progress' && s.sourceId === 'task-sql-1')).toBe(true);
    expect(trace.destination.deepLink).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Analytics prompts
// ---------------------------------------------------------------------------

describe('analytics review prompts trace back to contributing records', () => {
  it('overdue review prompt lists every due Leitner record', () => {
    const catalog = makeCatalog();
    const trace = buildAnalyticsPromptTrace(
      {
        id: 'prompt-overdue-dsa',
        type: 'overdue_review',
        title: '1 DSA Review Overdue',
        description: 'Problem is due in the Leitner spaced repetition system.',
        route: 'dsa',
        targetId: 'dsa-001',
      },
      catalog
    );
    expect(trace.signal).toBe('overdue_review');
    expect(trace.origin).toBe('direct');
    expect(trace.sources.map((s) => s.sourceId)).toEqual(['dsa-001']);
    expect(collectOverdueReviewSources(catalog)).toHaveLength(1);
  });

  it('stale evidence prompt shows the stale skill state and its newest log', () => {
    const catalog = makeCatalog();
    const trace = buildAnalyticsPromptTrace(
      {
        id: 'prompt-stale-evidence',
        type: 'stale_evidence',
        title: '1 Topic Has Stale Evidence',
        description: 'SQL (SQL) has received no practice evidence for >14 days.',
        route: 'skills',
        targetId: 'topic-sql',
      },
      catalog
    );
    expect(trace.signal).toBe('stale_evidence');
    expect(trace.sources.map((s) => s.kind)).toEqual(['evidence_log', 'skill_state']);
    expect(trace.destination).toMatchObject({ route: 'skills', targetId: 'topic-sql', deepLink: true, label: 'Open "SQL"' });
    expect(trace.destination.targetId).toBe('topic-sql');
  });

  it('a prompt with no backing records still produces an honest derived trace', () => {
    const catalog = makeCatalog({
      dsaProgress: {},
      skillStates: {},
      taskProgress: {},
      dsaAttempts: [],
    });
    const trace = buildAnalyticsPromptTrace(
      {
        id: 'prompt-low-independence',
        type: 'low_independence',
        title: 'High Solution Assistance Rate',
        description: 'Assisted solves are high.',
        route: 'dsa',
      },
      catalog
    );
    expect(trace.origin).toBe('derived');
    expect(trace.sources[0].kind).toBe('derived');
  });
});

// ---------------------------------------------------------------------------
// Assessment / practice / company / interview / project
// ---------------------------------------------------------------------------

describe('other signals resolve to their canonical source', () => {
  it('assessment weakness → the attempts that produced it', () => {
    const assessmentState: AssessmentState = {
      attempts: [makeAssessmentAttempt('att-9')],
      responses: [],
      exposures: {},
      domainResults: [],
      snapshots: [],
      weaknessSignals: [],
      profile: { pendingSunday: false },
    };
    const catalog = makeCatalog({ assessmentState });
    const trace = buildAssessmentWeaknessTrace(makeWeaknessSignal(), catalog);

    expect(trace.signal).toBe('assessment_weakness');
    expect(trace.origin).toBe('direct');
    expect(trace.sources).toHaveLength(1);
    expect(trace.sources[0]).toMatchObject({
      kind: 'assessment_attempt',
      sourceId: 'att-9',
      availability: 'available',
    });
    expect(trace.destination).toMatchObject({ route: 'assessment', deepLink: false, label: 'View Assessment' });
  });

  it('assessment weakness without attempt references is declared derived', () => {
    const catalog = makeCatalog({ assessmentState: undefined });
    const trace = buildAssessmentWeaknessTrace(
      makeWeaknessSignal({ sourceAttemptIds: [] }),
      catalog
    );
    expect(trace.origin).toBe('derived');
    expect(trace.sources[0].kind).toBe('derived');
    expect(trace.sources[0].detail).toContain('sourceAttemptIds');
  });

  it('assessment weakness whose attempts were deleted reports them missing', () => {
    const catalog = makeCatalog({ assessmentState: undefined });
    const trace = buildAssessmentWeaknessTrace(makeWeaknessSignal(), catalog);
    expect(trace.origin).toBe('direct');
    expect(trace.sources[0].availability).toBe('missing');
    expect(trace.sources[0].sourceId).toBe('att-9');
    expect(trace.destination.deepLink).toBe(false);
  });

  it('practice weakness → the exact attempt and its evidence log', () => {
    const catalog = makeCatalog();
    const trace = buildPracticeWeaknessTrace(ATTEMPT, catalog);

    expect(trace.signal).toBe('practice_weakness');
    expect(trace.label).toBe('SQL JOIN Practice Session');
    expect(trace.why).toContain('55%');
    expect(trace.why).toContain('below the 70% pass mark');
    expect(trace.sources.map((s) => s.kind).sort()).toEqual(['evidence_log', 'practice_attempt']);
    expect(trace.sources[0]).toMatchObject({ availability: 'available' });
    expect(trace.destination).toMatchObject({ route: 'practice', deepLink: false, label: 'Open Practice' });
    expect(trace.destination.targetId).toBeUndefined();
  });

  it('company gap → the requirement evidence plus the topic records behind it', () => {
    const catalog = makeCatalog();
    const trace = buildCompanyGapTrace(makeRequirement(), catalog);

    expect(trace.signal).toBe('company_gap');
    expect(trace.origin).toBe('aggregated');
    expect(trace.classification).toBe('demonstrated');
    expect(trace.sources.length).toBeGreaterThanOrEqual(2);
    expect(trace.why).toContain('SQL: Gap Identified, 38% evidence');
    expect(trace.destination).toMatchObject({ route: 'roadmap', deepLink: true, targetId: 'task-sql-2' });
    expect(trace.sources.every((s) => s.availability === 'available')).toBe(true);
  });

  it('company gap with an unknown topic degrades to a derived requirement rating', () => {
    const catalog = makeCatalog();
    const trace = buildCompanyGapTrace(makeRequirement({ topicId: 'topic-ghost' }), catalog);
    expect(trace.origin).toBe('derived');
    expect(trace.sources[0].kind).toBe('derived');
  });

  it('interview dimension → its contributing evidence, honestly marked derived', () => {
    const catalog = makeCatalog();
    const trace = buildInterviewDimensionTrace(makeDimension(), catalog);

    expect(trace.signal).toBe('interview_readiness');
    expect(trace.origin).toBe('derived');
    expect(trace.sources).toHaveLength(2);
    expect(trace.sources.every((s) => s.kind === 'derived')).toBe(true);
    expect(trace.sources.map((s) => s.label)).toEqual([
      'practice: SQL JOIN Practice Session scored 55%',
      'skill: Low SQL evidence strength (38%)',
    ]);
    expect(trace.sources[0].strength).toBe(55);
    expect(trace.sources[1].strength).toBe(38);
    expect(trace.destination).toMatchObject({
      route: 'practice',
      targetId: 'sess-sql-join',
      deepLink: true,
      label: 'Open "SQL JOIN Practice Session"',
    });
  });

  it('interview dimension with no evidence still renders', () => {
    const catalog = makeCatalog();
    const trace = buildInterviewDimensionTrace(makeDimension({ evidenceItems: [] }), catalog);
    expect(trace.sources).toHaveLength(1);
    expect(trace.origin).toBe('derived');
  });

  it('project defense → the recorded defense attempts and their logs', () => {
    const catalog = makeCatalog({
      practiceAttempts: [ATTEMPT, DEFENSE_ATTEMPT],
      evidenceLogs: [LOG_ONE, DEFENSE_LOG],
    });
    const trace = buildProjectDefenseTrace(catalog);

    expect(trace.signal).toBe('project_defense');
    expect(trace.origin).toBe('aggregated');
    expect(trace.sources.map((s) => s.sourceId).sort()).toEqual(['log-defense-1', 'pa-defense-1']);
    expect(trace.sources[0].availability).toBe('available');
    expect(trace.why).toContain('1 recorded defense session');
    expect(trace.destination).toMatchObject({ route: 'project', deepLink: false, label: 'Open Project Lab' });
  });

  it('project defense with no session says so instead of faking evidence', () => {
    const catalog = makeCatalog({ practiceAttempts: [], evidenceLogs: [] });
    const trace = buildProjectDefenseTrace(catalog);
    expect(trace.origin).toBe('derived');
    expect(trace.why).toContain('No defense session');
  });

  it('a shared source contributes to two signals independently without mutation', () => {
    const catalog = makeCatalog();
    const before = JSON.stringify(catalog);
    const practice = buildPracticeWeaknessTrace(ATTEMPT, catalog);
    const skill = buildSkillEvidenceTrace(readinessFor(catalog), 'weak_skill', catalog);

    expect(practice.sources.some((s) => s.sourceId === 'log-sql-1')).toBe(true);
    expect(skill.sources.some((s) => s.sourceId === 'log-sql-1')).toBe(true);
    expect(practice.sources.find((s) => s.sourceId === 'log-sql-1')).not.toBe(
      skill.sources.find((s) => s.sourceId === 'log-sql-1')
    );
    expect(JSON.stringify(catalog)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Roadmap lock
// ---------------------------------------------------------------------------

describe('roadmap lock explanation is traceable to task progress', () => {
  it('lists the blocked task and every blocking prerequisite record', () => {
    const catalog = makeCatalog();
    const explanation = explainTaskLock({
      task: BLOCKED_TASK,
      taskProgress: catalog.taskProgress,
      taskDefinitions: catalog.taskDefinitions,
      topics: catalog.topics,
      activePhase: 1,
    });
    expect(explanation.isLocked).toBe(true);

    const trace = buildRoadmapLockTrace(explanation, BLOCKED_TASK.id, BLOCKED_TASK.title, catalog);
    expect(trace).not.toBeNull();
    expect(trace!.signal).toBe('roadmap_lock');
    expect(trace!.why).toBe(explanation.whyCannotStart);
    expect(trace!.sources.map((s) => s.sourceId)).toEqual(['task-sql-blocked', 'task-sql-prereq']);
    expect(trace!.sources.every((s) => s.availability === 'available')).toBe(true);
    expect(trace!.destination).toMatchObject({ route: 'roadmap', deepLink: true, targetId: 'task-sql-blocked' });
  });

  it('returns null for an unlocked task so nothing is rendered', () => {
    const catalog = makeCatalog();
    const explanation = explainTaskLock({
      task: TASK_ONE,
      taskProgress: catalog.taskProgress,
      taskDefinitions: catalog.taskDefinitions,
      topics: catalog.topics,
      activePhase: 1,
    });
    expect(buildRoadmapLockTrace(explanation, TASK_ONE.id, TASK_ONE.title, catalog)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Topic collection & purity
// ---------------------------------------------------------------------------

describe('collectTopicEvidenceSources', () => {
  it('lists only records that belong to the topic', () => {
    const catalog = makeCatalog();
    const sources = collectTopicEvidenceSources(catalog, 'topic-sql');
    expect(sources.map((s) => s.sourceId).sort()).toEqual(['log-sql-1', 'pa-1', 'task-sql-1']);
    expect(sources.every((s) => s.availability === 'available')).toBe(true);
  });

  it('returns an empty list for a topic with no records', () => {
    expect(collectTopicEvidenceSources(makeCatalog(), 'topic-dsa-hashtable')).toEqual([]);
  });
});

describe('resolveSourceDestination', () => {
  const catalog = makeCatalog();

  it('opens a task on the roadmap and a practice attempt on Practice', () => {
    const task = resolveEvidenceSource('task_progress', 'task-sql-1', catalog);
    const taskDest = resolveSourceDestination(task, catalog);
    expect(taskDest).toMatchObject({ route: 'roadmap', deepLink: true, targetId: 'task-sql-1' });

    const practice = resolveEvidenceSource('practice_attempt', 'pa-1', catalog);
    const practiceDest = resolveSourceDestination(practice, catalog);
    expect(practiceDest).toMatchObject({
      route: 'practice',
      deepLink: true,
      targetId: 'sess-sql-join',
      label: 'Open "SQL JOIN Practice Session"',
    });
  });

  it('labels generic destinations honestly instead of pretending to deep link', () => {
    const mockLog: EvidenceLog = {
      ...LOG_ONE,
      id: 'log-mock',
      sourceType: 'mock_interview',
    };
    const mockDest = resolveSourceDestination(
      resolveEvidenceSource('evidence_log', 'log-mock', makeCatalog({ evidenceLogs: [mockLog] })),
      makeCatalog({ evidenceLogs: [mockLog] })
    );
    expect(mockDest).toMatchObject({ route: 'interview', deepLink: false, label: 'Open Interview Readiness' });
    expect(mockDest?.targetId).toBeUndefined();

    const assessment = resolveSourceDestination(
      resolveEvidenceSource('assessment_attempt', 'att-9', makeCatalog({ assessmentState: undefined })),
      catalog
    );
    expect(assessment).toBeNull();
  });

  it('offers no action for derived entries or records that are gone', () => {
    expect(resolveSourceDestination(makeDerivedSource('derived:x', 'Aggregated'), catalog)).toBeNull();
    expect(
      resolveSourceDestination(resolveEvidenceSource('task_progress', 'task-ghost', catalog), catalog)
    ).toBeNull();
    expect(
      resolveSourceDestination(
        { kind: 'evidence_log', sourceId: 'log-ghost', label: 'x', availability: 'missing' },
        catalog
      )
    ).toBeNull();
  });

  it('routes an evidence log by the source that produced it', () => {
    const practiceLog = resolveSourceDestination(
      resolveEvidenceSource('evidence_log', 'log-sql-1', catalog),
      catalog
    );
    expect(practiceLog).toMatchObject({
      route: 'practice',
      targetId: 'sess-sql-join',
      deepLink: true,
      label: 'Open "SQL JOIN Practice Session"',
    });

    const unknownLog: EvidenceLog = {
      ...LOG_ONE,
      id: 'log-mock-2',
      sourceType: 'mock_interview',
    };
    const interviewLog = resolveSourceDestination(
      resolveEvidenceSource('evidence_log', 'log-mock-2', makeCatalog({ evidenceLogs: [unknownLog] })),
      makeCatalog({ evidenceLogs: [unknownLog] })
    );
    expect(interviewLog).toMatchObject({ route: 'interview', label: 'Open Interview Readiness' });
  });
});

describe('buildEvidenceTrace', () => {
  it('deduplicates, classifies and resolves in one pass', () => {
    const catalog = makeCatalog();
    const shared: EvidenceSourceRef = {
      kind: 'task_progress',
      sourceId: 'task-sql-1',
      label: 'SQL JOIN Practice',
      timestamp: OLD,
      availability: 'available',
    };
    const trace = buildEvidenceTrace({
      id: 'demo:1',
      signal: 'weak_skill',
      label: 'demo',
      why: 'because',
      sources: [shared, { ...shared }, makeDerivedSource('derived:demo', 'extra')],
      route: 'roadmap',
      targetId: 'task-sql-1',
      catalog,
    });
    expect(trace.sources).toHaveLength(2);
    expect(trace.origin).toBe('direct');
    expect(trace.destination.deepLink).toBe(true);
  });

  it('never mutates the sources array handed to it', () => {
    const catalog = makeCatalog();
    const sources: EvidenceSourceRef[] = [
      { kind: 'evidence_log', sourceId: 'log-sql-1', label: 'b', timestamp: '2020-01-01T00:00:00.000Z', availability: 'available' },
      { kind: 'task_progress', sourceId: 'task-sql-1', label: 'a', timestamp: '2026-01-01T00:00:00.000Z', availability: 'available' },
    ];
    const snapshot = JSON.stringify(sources);
    buildEvidenceTrace({
      id: 'demo:2',
      signal: 'stale_evidence',
      label: 'demo',
      why: 'because',
      sources,
      route: 'skills',
      catalog,
    });
    expect(JSON.stringify(sources)).toBe(snapshot);
    expect(sources[0].label).toBe('b');
  });
});
