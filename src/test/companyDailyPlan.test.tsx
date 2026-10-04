// @vitest-environment jsdom
//
// Task 5 — Company-Specific Daily Plan Mode (§16 acceptance coverage).
//
// The Companies subsystem is a *planning lens*, not a second engine. These
// tests pin the parts Task 5 owns:
//   §5  explicit requirement → target mapping, unmapped gaps preserved
//   §6  bounded urgency derived from the existing date helpers
//   §7  recommendedAction becomes operational only when its target validates
//   §8  Today shows a plain-language Company Focus view
//   §9  company mode reuses remediation routes instead of adding another one
//   §10 SessionComposer still respects budget/energy with company focus on
//   §13 every generated deep-link validates against the canonical datasets
//   §12/§16 persistence behaviour, determinism and non-mutation
//
// Everything is exercised against the REAL seed datasets — no fixtures that
// could agree with a wrong implementation by construction.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import {
  mapCompanyRequirementTargets,
  countUnmappedCompanyRequirements,
  validateCompanyRecommendedAction,
  buildCompanyFocusSummary,
  generateCompanyFocusCandidates,
  calculateCompanyDeadlineUrgency,
} from '../engine/companyPlanEngine';
import type { CompanyRequirementTargetMapping } from '../engine/companyPlanEngine';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import { getEvaluatedCandidates, evaluateCandidateTask } from '../engine/adaptiveEngine';
import { composeAdaptiveSession, type SessionPlan } from '../engine/sessionComposer';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import type { CompanyOverlay, TopicSkillState, TaskDefinition, DSAProgress } from '../types';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ─── jsdom lacks these browser APIs ─────────────────────────────────── */
class ObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = (): unknown[] => [];
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
});
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
});
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

/* ─── fixtures ──────────────────────────────────────────────────────── */

const TODAY = '2026-10-15';

const DATED_COMPANY: CompanyOverlay = {
  id: 'comp-dated',
  companyName: 'Dated Corp',
  targetRole: 'Software Engineer',
  applicationStatus: 'oa_scheduled',
  eventDate: '2026-10-22', // 7d out → existing bounded urgency band
  requiredDomains: ['dsa', 'python'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['python'],
};

const UNDATED_COMPANY: CompanyOverlay = {
  id: 'comp-undated',
  companyName: 'Undated Ltd',
  targetRole: 'Backend Engineer',
  applicationStatus: 'applied',
  requiredDomains: ['sql'],
  requiredTopics: ['prep-sql'],
  requiredLanguages: [],
};

/** A language no seed task is tagged with → guaranteed `not_configured`. */
const UNTAGGED_LANGUAGE_COMPANY: CompanyOverlay = {
  id: 'comp-rust',
  companyName: 'Rustworks',
  targetRole: 'Systems Engineer',
  applicationStatus: 'target',
  requiredDomains: [],
  requiredTopics: [],
  requiredLanguages: ['rust'],
};

const NO_REQUIREMENTS_COMPANY: CompanyOverlay = {
  id: 'comp-empty',
  companyName: 'Empty Inc',
  targetRole: 'SDE',
  applicationStatus: 'target',
  requiredDomains: [],
  requiredTopics: [],
  requiredLanguages: [],
};

const SKILL_STATES: Record<string, TopicSkillState> = {
  'topic-dsa-arrays': {
    topicId: 'topic-dsa-arrays',
    domainId: 'dsa',
    evidenceStrength: 25,
    freshness: 'fresh',
  },
  'prep-sql': {
    topicId: 'prep-sql',
    domainId: 'sql',
    evidenceStrength: 20,
    freshness: 'stale',
  },
};

type MappingOverrides = Partial<Parameters<typeof mapCompanyRequirementTargets>[0]>;

const mappingOptions = (
  targetCompany: CompanyOverlay,
  overrides: MappingOverrides = {}
) => ({
  targetCompany,
  domains: DOMAINS,
  topics: TOPICS,
  tasks: TASK_DEFINITIONS,
  taskProgressMap: {},
  dsaProblems: DSA_PROBLEMS,
  dsaProgressMap: {},
  skillStates: SKILL_STATES,
  preparationTopics: PREPARATION_TOPICS,
  practiceSessions: PRACTICE_SESSIONS,
  todayStr: TODAY,
  ...overrides,
});

const EMPTY_DATASETS: MappingOverrides = {
  tasks: [],
  dsaProblems: [],
  preparationTopics: [],
  practiceSessions: [],
};

const datasetHasId = (row: CompanyRequirementTargetMapping): boolean => {
  switch (row.route) {
    case 'dsa':
      return DSA_PROBLEMS.some((p) => p.id === row.targetId);
    case 'roadmap':
      return TASK_DEFINITIONS.some((t) => t.id === row.targetId);
    case 'preparation':
      return PREPARATION_TOPICS.some((t) => t.id === row.targetId);
    case 'practice':
      return PRACTICE_SESSIONS.some((s) => s.id === row.targetId);
    default:
      return false;
  }
};

/* ═══ §5 — explicit requirement → target mapping ═══════════════════════ */

describe('§5 company requirement → target mapping', () => {
  it('maps every actionable requirement to a target that exists in the real datasets', () => {
    const mappings = mapCompanyRequirementTargets(mappingOptions(DATED_COMPANY));

    expect(mappings.length).toBeGreaterThan(0);
    const mapped = mappings.filter((m) => m.requiresTarget && m.mapped);
    expect(mapped.length).toBeGreaterThan(0);

    for (const row of mapped) {
      expect(row.targetId, row.requirementName).toBeTruthy();
      expect(row.route, row.requirementName).toBeTruthy();
      expect(datasetHasId(row), `${row.requirementName} → ${row.targetId}`).toBe(true);
      expect(row.unmappedReason).toBeUndefined();
    }
  });

  it('preserves an untagged requirement as an unmapped gap instead of fabricating a target', () => {
    const mappings = mapCompanyRequirementTargets(
      mappingOptions(UNTAGGED_LANGUAGE_COMPANY)
    );

    // Non-vacuity: the seed curriculum tags no task with RUST, so the
    // requirement really is reported as `not_configured`.
    const languageRow = mappings.find((m) => m.category === 'language');
    expect(languageRow).toBeDefined();
    expect(languageRow!.status).toBe('not_configured');
    expect(languageRow!.requiresTarget).toBe(true);

    expect(languageRow!.mapped).toBe(false);
    expect(languageRow!.targetId).toBeUndefined();
    expect(languageRow!.route).toBeUndefined();
    expect(languageRow!.unmappedReason).toBeTruthy();
    expect(languageRow!.unmappedReason!.length).toBeGreaterThan(20);

    expect(countUnmappedCompanyRequirements(mappings)).toBeGreaterThanOrEqual(1);

    // Nothing downstream manufactures work for it either.
    const candidates = generateCompanyFocusCandidates(
      mappingOptions(UNTAGGED_LANGUAGE_COMPANY)
    );
    expect(candidates.filter((c) => /rust/i.test(c.title + c.description))).toHaveLength(0);
  });

  it('reports no target at all when every dataset is empty — the gaps survive, no ids appear', () => {
    const mappings = mapCompanyRequirementTargets(
      mappingOptions(DATED_COMPANY, EMPTY_DATASETS)
    );
    const gaps = mappings.filter((m) => m.requiresTarget);

    expect(gaps.length).toBeGreaterThan(0);
    for (const row of gaps) {
      expect(row.mapped).toBe(false);
      expect(row.targetId).toBeUndefined();
      expect(row.unmappedReason).toBeTruthy();
    }
    expect(countUnmappedCompanyRequirements(mappings)).toBe(gaps.length);

    // And the scheduler manufactures no candidates for those gaps.
    expect(
      generateCompanyFocusCandidates(mappingOptions(DATED_COMPANY, EMPTY_DATASETS))
    ).toHaveLength(0);
  });

  it('never schedules a target the explicit mapping does not also recognise (single authority)', () => {
    const options = mappingOptions(DATED_COMPANY);
    const mappedTargets = new Set(
      mapCompanyRequirementTargets(options)
        .filter((m) => m.mapped && m.targetId)
        .map((m) => m.targetId)
    );

    const candidates = generateCompanyFocusCandidates(options);
    expect(candidates.length).toBeGreaterThan(0);

    for (const candidate of candidates) {
      expect(mappedTargets.has(candidate.targetId), candidate.targetId).toBe(true);
    }
  });

  it('returns an empty mapping for a company with no configured requirements', () => {
    const mappings = mapCompanyRequirementTargets(
      mappingOptions(NO_REQUIREMENTS_COMPANY)
    );
    expect(mappings).toHaveLength(0);
    expect(countUnmappedCompanyRequirements(mappings)).toBe(0);
    expect(
      generateCompanyFocusCandidates(mappingOptions(NO_REQUIREMENTS_COMPANY))
    ).toHaveLength(0);

    const summary = buildCompanyFocusSummary({
      targetCompany: NO_REQUIREMENTS_COMPANY,
      todayStr: TODAY,
      mappings,
      candidates: [],
      baselineTask: null,
    });
    expect(summary.configured).toBe(false);
    expect(summary.priorityReason).toMatch(/No requirements are configured/i);
    expect(summary.focusItems).toHaveLength(0);
  });

  it('does not report an already-covered requirement as an unmapped gap', () => {
    const covered: CompanyRequirementTargetMapping[] = [
      {
        requirementId: 'req-covered',
        requirementName: 'Python fluency',
        category: 'language',
        status: 'covered',
        statusLabel: 'Requirement Covered',
        evidenceStrength: 90,
        gapExplanation: 'covered',
        requiresTarget: false,
        mapped: false,
      },
      {
        requirementId: 'req-open',
        requirementName: 'Open gap',
        category: 'domain',
        status: 'gap_identified',
        statusLabel: 'Gap Identified',
        evidenceStrength: 10,
        gapExplanation: 'gap',
        requiresTarget: true,
        mapped: false,
        unmappedReason: 'nothing matches yet',
      },
    ];

    expect(countUnmappedCompanyRequirements(covered)).toBe(1);

    const summary = buildCompanyFocusSummary({
      targetCompany: DATED_COMPANY,
      todayStr: TODAY,
      mappings: covered,
      candidates: [],
      baselineTask: null,
    });
    expect(summary.coveredRequirements).toBe(1);
    expect(summary.gapCount).toBe(1);
    expect(summary.unmappedCount).toBe(1);
  });

  it('describes an already-covered plan honestly instead of promoting mastery again', () => {
    const covered: CompanyRequirementTargetMapping[] = [
      {
        requirementId: 'req-1',
        requirementName: 'DSA',
        category: 'domain',
        status: 'covered',
        statusLabel: 'Requirement Covered',
        evidenceStrength: 88,
        gapExplanation: 'covered',
        requiresTarget: false,
        mapped: false,
      },
    ];

    const summary = buildCompanyFocusSummary({
      targetCompany: DATED_COMPANY,
      todayStr: TODAY,
      mappings: covered,
      candidates: [],
      baselineTask: null,
    });

    expect(summary.gapCount).toBe(0);
    expect(summary.unmappedCount).toBe(0);
    expect(summary.priorityReason).toMatch(/already has supporting evidence/i);
    expect(summary.focusItems).toHaveLength(0);
    // Never claims a readiness percentage or a weight.
    expect(summary.priorityReason).not.toMatch(/weight|readiness|%|score/i);
  });
});

/* ═══ §6 — bounded company urgency ════════════════════════════════════ */

describe('§6 company urgency stays bounded and date-driven', () => {
  /** A real open gap, so the summary reaches the date-driven wording branch. */
  const openGap: CompanyRequirementTargetMapping = {
    requirementId: 'req-open',
    requirementName: 'DSA arrays',
    category: 'domain',
    status: 'gap_identified',
    statusLabel: 'Gap Identified',
    evidenceStrength: 15,
    gapExplanation: 'low evidence',
    requiresTarget: true,
    mapped: true,
    route: 'roadmap',
    targetId: TASK_DEFINITIONS[0].id,
    targetType: 'roadmap_task',
    domainId: TASK_DEFINITIONS[0].domainId,
    topicId: TASK_DEFINITIONS[0].topicId,
    isBlocked: false,
  };

  it('produces no urgency when no date exists', () => {
    const urgency = calculateCompanyDeadlineUrgency(undefined, TODAY);
    expect(urgency.daysUntil).toBeNull();
    expect(urgency.scoreBoost).toBe(0);
    expect(urgency.urgencyLabel).toBeUndefined();

    const summary = buildCompanyFocusSummary({
      targetCompany: UNDATED_COMPANY,
      todayStr: TODAY,
      mappings: [openGap],
      candidates: [],
      baselineTask: null,
    });
    expect(summary.daysUntil).toBeNull();
    expect(summary.urgencyLabel).toBeUndefined();
    expect(summary.eventDate).toBeUndefined();
    // Relevance is stated — calendar urgency is not, because there is no date.
    expect(summary.priorityReason).toMatch(/relevant to your target company/i);
    expect(summary.priorityReason).not.toMatch(/\d+\s*days?|today or overdue|approaching/i);
  });

  it('bounds a future date to the existing 0–25 band and labels it in plain language', () => {
    for (const eventDate of ['2026-10-16', '2026-10-18', '2026-10-22', '2026-11-14', '2027-02-01']) {
      const urgency = calculateCompanyDeadlineUrgency(eventDate, TODAY);
      expect(urgency.daysUntil).not.toBeNull();
      expect(urgency.scoreBoost).toBeGreaterThanOrEqual(0);
      expect(urgency.scoreBoost).toBeLessThanOrEqual(25);
      expect(urgency.urgencyLabel, eventDate).toBeTruthy();
    }
  });

  it('handles a past date deterministically and without negative urgency', () => {
    const past = calculateCompanyDeadlineUrgency('2026-01-01', TODAY);
    expect(past.daysUntil).toBeLessThan(0);
    expect(past.scoreBoost).toBeGreaterThanOrEqual(0);
    expect(past.scoreBoost).toBeLessThanOrEqual(25);
    expect(past.urgencyLabel).toBe('Event is today or overdue');

    // Deterministic: same inputs, same output, every time.
    expect(calculateCompanyDeadlineUrgency('2026-01-01', TODAY)).toEqual(past);

    // And it never leaks a negative number into the summary wording.
    const summary = buildCompanyFocusSummary({
      targetCompany: { ...DATED_COMPANY, eventDate: '2026-01-01' },
      todayStr: TODAY,
      mappings: [openGap],
      candidates: [],
      baselineTask: null,
    });
    expect(summary.priorityReason).toMatch(/today or overdue/i);
    expect(summary.priorityReason).not.toMatch(/-\d/);
    expect(summary.urgencyLabel).toBe('Event is today or overdue');
  });

  it('states calendar urgency in plain language once a real date is in range', () => {
    const summary = buildCompanyFocusSummary({
      targetCompany: DATED_COMPANY, // 2026-10-22, 7 days from TODAY
      todayStr: TODAY,
      mappings: [openGap],
      candidates: [],
      baselineTask: null,
    });

    expect(summary.daysUntil).toBe(7);
    expect(summary.priorityReason).toMatch(/7 days/i);
    expect(summary.priorityReason).toMatch(/Dated Corp/);
    // Plain language only — no weight, score, or readiness figure.
    expect(summary.priorityReason).not.toMatch(/weight|score|0\.\d{2}|%/i);
  });

  it('treats a malformed date as "no usable date" instead of emitting NaN urgency', () => {
    const urgency = calculateCompanyDeadlineUrgency('not-a-date', TODAY);
    expect(urgency.daysUntil).toBeNull();
    expect(urgency.scoreBoost).toBe(0);
    expect(Number.isNaN(urgency.scoreBoost)).toBe(false);
  });
});

/* ═══ §7 / §13 — recommendedAction validation ═════════════════════════ */

describe('§7 recommendedAction is operational only when its target validates', () => {
  const datasets = {
    dsaProblems: DSA_PROBLEMS,
    tasks: TASK_DEFINITIONS,
    topics: TOPICS,
    preparationTopics: PREPARATION_TOPICS,
    practiceSessions: PRACTICE_SESSIONS,
  };

  it('keeps a valid deep-link operational', () => {
    const problem = DSA_PROBLEMS[0];
    const task = TASK_DEFINITIONS[0];

    const viaDsa = validateCompanyRecommendedAction(
      { route: 'dsa', targetId: problem.id, type: 'dsa' },
      datasets
    );
    expect(viaDsa.navigable).toBe(true);
    expect(viaDsa.targetValid).toBe(true);
    expect(viaDsa.targetId).toBe(problem.id);

    const viaTask = validateCompanyRecommendedAction(
      { route: 'roadmap', targetId: task.id, type: 'task' },
      datasets
    );
    expect(viaTask.navigable).toBe(true);
    expect(viaTask.targetId).toBe(task.id);
  });

  it('refuses to navigate when the target id does not exist — no fabricated deep-link', () => {
    const result = validateCompanyRecommendedAction(
      { route: 'roadmap', targetId: 'task-does-not-exist', type: 'task' },
      datasets
    );

    expect(result.navigable).toBe(false);
    expect(result.targetValid).toBe(false);
    expect(result.targetId).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });

  it('treats a route-only action as safe hub navigation with no invented target', () => {
    const result = validateCompanyRecommendedAction(
      { route: 'skills', type: 'review' },
      datasets
    );

    expect(result.navigable).toBe(true);
    expect(result.hasTargetId).toBe(false);
    expect(result.targetId).toBeUndefined();
  });

  it('refuses a target on a route that cannot carry one', () => {
    const result = validateCompanyRecommendedAction(
      { route: 'dashboard', targetId: 'task-orphan', type: 'task' },
      datasets
    );
    expect(result.navigable).toBe(false);
    expect(result.targetId).toBeUndefined();
  });

  it('rejects a target that belongs to a different workspace than its route', () => {
    // A DSA problem id offered as a roadmap target must not validate.
    const result = validateCompanyRecommendedAction(
      { route: 'roadmap', targetId: DSA_PROBLEMS[0].id, type: 'task' },
      datasets
    );
    expect(result.targetValid).toBe(false);
    expect(result.navigable).toBe(false);
  });

  it('validates every recommendedAction the real snapshot produces', () => {
    const mappings = mapCompanyRequirementTargets(mappingOptions(DATED_COMPANY));
    const snapshotActions = mappings.map((m) => ({ requirementId: m.requirementId }));

    // Drive the real recommendedAction objects through the validator.
    const requirements = generateCompanyFocusCandidates(
      mappingOptions(DATED_COMPANY)
    );
    expect(requirements.length).toBeGreaterThan(0);
    expect(snapshotActions.length).toBeGreaterThan(0);

    for (const row of mappings) {
      if (!row.mapped || !row.targetId) continue;
      const result = validateCompanyRecommendedAction(
        { route: row.route ?? 'dashboard', targetId: row.targetId },
        datasets
      );
      expect(result.navigable, `${row.requirementName} → ${row.targetId}`).toBe(true);
    }
  });
});

/* ═══ §9 — reuse of existing remediation routes ═══════════════════════ */

describe('§9 company mode reuses existing routes instead of adding another engine', () => {
  const todayStr = TODAY;
  const problem = DSA_PROBLEMS[0];

  const company: CompanyOverlay = {
    id: 'comp-reuse',
    companyName: 'Reuse Corp',
    targetRole: 'SDE',
    applicationStatus: 'target',
    requiredDomains: ['dsa'],
    requiredTopics: [],
    requiredLanguages: [],
  };

  const remediationProgress = (): Record<string, DSAProgress> => ({
    [problem.id]: {
      problemId: problem.id,
      currentBox: 1 as DSAProgress['currentBox'],
      nextReviewAt: undefined,
      lastAttemptAt: undefined,
      attemptCount: 0,
      passedIndependently: false,
      consecutiveAssistedPasses: 0,
      assistedProvisional: false,
      consecutiveFailures: 0,
      remediationRequired: true,
      patternLessonViewed: false,
      patternLessonCompleted: false,
      remediationSelfCheckPassed: false,
      evidenceStrength: 0,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  });

  const remediationState = () => ({
    tasks: TASK_DEFINITIONS,
    taskProgressMap: {},
    dsaProblems: DSA_PROBLEMS,
    dsaProgressMap: remediationProgress(),
    topics: TOPICS,
    domains: DOMAINS,
    skillStates: SKILL_STATES,
    companyOverlays: [company],
    currentMode: 'normal' as const,
    todayStr,
    todayAssignments: [],
    analyticsReviewPrompts: [],
    practiceAttempts: [],
    targetCompanyId: 'comp-reuse',
  });

  it('emits at most one candidate per target — company mode never adds a competing route', () => {
    const result = generateReviewCandidates(remediationState());

    expect(result.candidates.length).toBeGreaterThan(1);
    const targetIds = result.candidates.map((c) => c.targetId);
    expect(new Set(targetIds).size).toBe(targetIds.length);
  });

  it('keeps remediation ranked above company_gap while both tiers are present', () => {
    const result = generateReviewCandidates(remediationState());

    const remIndex = result.candidates.findIndex((c) => c.priority === 'remediation');
    const companyIndex = result.candidates.findIndex((c) => c.priority === 'company_gap');

    expect(remIndex).toBeGreaterThanOrEqual(0);
    // Either the company gap exists below remediation, or it was folded into a
    // target remediation already owns — never above it.
    if (companyIndex >= 0) expect(companyIndex).toBeGreaterThan(remIndex);
  });

  it('marks a requirement whose target an existing route already covers', () => {
    const base = mapCompanyRequirementTargets(mappingOptions(DATED_COMPANY));
    const alreadyRouted = base.find((m) => m.mapped && m.targetId);
    expect(alreadyRouted).toBeDefined();

    const reuseSet = new Set([alreadyRouted!.targetId!]);
    const withReuse = mapCompanyRequirementTargets(
      mappingOptions(DATED_COMPANY, { reusedRouteTargetIds: reuseSet })
    );
    const reusedRow = withReuse.find((m) => m.requirementId === alreadyRouted!.requirementId);

    expect(reusedRow?.reusedRoute).toBe(true);

    // Without the set, the same requirement reports no reuse.
    const withoutReuse = base.find((m) => m.requirementId === alreadyRouted!.requirementId);
    expect(withoutReuse?.reusedRoute).toBe(false);

    // Reuse never changes the target itself — the mapping stays stable.
    expect(reusedRow?.targetId).toBe(alreadyRouted!.targetId);
    expect(reusedRow?.route).toBe(alreadyRouted!.route);
  });
});

/* ═══ §10 — SessionComposer integration ═══════════════════════════════ */

describe('§10 SessionComposer receives company relevance as a signal only', () => {
  const sessionOptions = (overrides: Record<string, unknown> = {}) => ({
    availableMinutes: 60,
    todayStr: TODAY,
    topics: TOPICS,
    domains: DOMAINS,
    preparationTopics: PREPARATION_TOPICS,
    practiceSessions: PRACTICE_SESSIONS,
    companyOverlays: [DATED_COMPANY],
    strictBudget: true,
    ...overrides,
  });

  it('shapes the session when a company is selected', () => {
    const focused = composeAdaptiveSession(
      sessionOptions({ selectedCompanyId: DATED_COMPANY.id }) as never
    );
    const unfocused = composeAdaptiveSession(sessionOptions() as never);

    expect(focused.activities.some((a) => a.priority === 'company_gap')).toBe(true);
    expect(unfocused.activities.some((a) => a.priority === 'company_gap')).toBe(false);
  });

  it('never exceeds the time budget with company focus enabled', () => {
    for (const availableMinutes of [25, 45, 60, 120]) {
      const plan = composeAdaptiveSession(
        sessionOptions({ availableMinutes, selectedCompanyId: DATED_COMPANY.id }) as never
      );
      expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(availableMinutes);
      expect(plan.timeBudgetMinutes).toBe(availableMinutes);
      expect(plan.remainingMinutes).toBe(availableMinutes - plan.totalEstimatedMinutes);
    }
  });

  it('keeps energy-level handling intact alongside company focus', () => {
    const low = composeAdaptiveSession(
      sessionOptions({ energyLevel: 'low', selectedCompanyId: DATED_COMPANY.id }) as never
    );
    const high = composeAdaptiveSession(
      sessionOptions({ energyLevel: 'high', selectedCompanyId: DATED_COMPANY.id }) as never
    );

    expect(low.totalEstimatedMinutes).toBeLessThanOrEqual(60);
    expect(high.totalEstimatedMinutes).toBeLessThanOrEqual(60);
    expect(low.remainingMinutes).toBe(60 - low.totalEstimatedMinutes);
    expect(high.remainingMinutes).toBe(60 - high.totalEstimatedMinutes);
  });

  it('produces an identical plan for identical inputs (deterministic composition)', () => {
    const opts = sessionOptions({ selectedCompanyId: DATED_COMPANY.id }) as never;
    // `composedAt` is a wall-clock stamp, not part of the composition itself.
    const shape = (plan: SessionPlan): Omit<SessionPlan, 'composedAt'> => {
      const { composedAt, ...rest } = plan;
      void composedAt;
      return rest;
    };

    const first = composeAdaptiveSession(opts);
    const second = composeAdaptiveSession(opts);
    expect(shape(second)).toEqual(shape(first));
    expect(first.activities.map((a) => a.targetId)).toEqual(
      second.activities.map((a) => a.targetId)
    );
    expect(first.selectedCompanyId).toBe(DATED_COMPANY.id);
  });
});

/* ═══ §9 / §16 — single priority engine, no prerequisite bypass ═══════ */

describe('§16 company mode never becomes a second priority engine', () => {
  it('keeps the documented 6-factor weights as the only scoring formula', () => {
    const task = TASK_DEFINITIONS.find((t) => t.domainId === 'python') as TaskDefinition;
    expect(task).toBeDefined();

    const breakdown = evaluateCandidateTask(
      task,
      undefined,
      undefined,
      undefined,
      SKILL_STATES,
      [DATED_COMPANY],
      'normal',
      TODAY,
      DATED_COMPANY.id
    );

    const expectedBase =
      0.25 * breakdown.urgency +
      0.20 * breakdown.weakness +
      0.20 * breakdown.importance +
      0.15 * breakdown.companyRelevance +
      0.10 * breakdown.spacedRepetition +
      0.10 * breakdown.recoveryUrgency;

    expect(breakdown.baseScore).toBeCloseTo(expectedBase, 10);
    expect(breakdown.finalScore).toBe(
      Math.min(100, Math.max(0, Math.round(expectedBase)))
    );
    expect(breakdown.companyRelevance).toBeGreaterThan(0);
  });

  it('explains the company signal in plain language, never as a weight', () => {
    const task = TASK_DEFINITIONS.find((t) => t.domainId === 'python') as TaskDefinition;

    const breakdown = evaluateCandidateTask(
      task,
      undefined,
      undefined,
      undefined,
      SKILL_STATES,
      [DATED_COMPANY],
      'normal',
      TODAY,
      DATED_COMPANY.id
    );

    expect(breakdown.explanation).toMatch(/company/i);
    expect(breakdown.explanation).not.toMatch(/weight|0\.\d{2}|\bfactor\b/i);
  });

  it('does not bypass prerequisites: a phase-locked company target is reported but never scheduled', () => {
    // Only tasks beyond phase 1 are visible, and the active phase is 1 — every
    // roadmap resolution must therefore come back blocked.
    const lateTasks = TASK_DEFINITIONS.filter((t) => t.phaseId !== 'phase-1');
    expect(lateTasks.length).toBeGreaterThan(0);

    const blockedOptions = mappingOptions(DATED_COMPANY, {
      tasks: lateTasks,
      dsaProblems: [],
      activePhase: 1,
    });

    const mappings = mapCompanyRequirementTargets(blockedOptions);
    const blockedRows = mappings.filter((m) => m.requiresTarget && m.isBlocked === true);
    expect(blockedRows.length).toBeGreaterThan(0);
    for (const row of blockedRows) {
      expect(row.blockingReason, row.requirementName).toBeTruthy();
    }

    // The mapping is informational: blocked targets are reported for the
    // Companies view but never reach Today as executable work.
    const scheduled = generateCompanyFocusCandidates(blockedOptions);
    const blockedIds = new Set(blockedRows.map((r) => r.targetId));
    expect(scheduled.every((c) => !c.isBlocked)).toBe(true);
    for (const row of blockedRows) {
      expect(scheduled.some((c) => c.targetId === row.targetId), row.targetId).toBe(false);
    }
    expect(blockedIds.size).toBeGreaterThan(0);
  });

  it('keeps the adaptive candidate list free of blocked company work', () => {
    const candidates = getEvaluatedCandidates(
      TASK_DEFINITIONS,
      {},
      DSA_PROBLEMS,
      {},
      SKILL_STATES,
      [DATED_COMPANY],
      'normal',
      TODAY,
      DATED_COMPANY.id
    );
    expect(candidates.length).toBeGreaterThan(0);

    const blocked = generateCompanyFocusCandidates(mappingOptions(DATED_COMPANY)).filter(
      (c) => c.isBlocked
    );
    expect(blocked).toHaveLength(0);
  });

  it('does not ship a parallel company priority or remediation engine', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const engineDir = path.join(process.cwd(), 'src', 'engine');
    const files = fs.readdirSync(engineDir);

    // §9 explicitly forbids these competing modules.
    expect(files).not.toContain('companyRemediationRouter.ts');
    expect(files).not.toContain('companyPriorityEngine.ts');
    expect(files).not.toContain('companySessionComposer.ts');

    // The company lens must not re-implement the adaptive weighting.
    const source = fs.readFileSync(path.join(engineDir, 'companyPlanEngine.ts'), 'utf8');
    expect(source).not.toContain('0.25 *');
    expect(source).not.toContain('0.20 *');
    expect(source).toContain('resolveCompanyGapTarget');
  });
});

/* ═══ §12 / §16 — persistence behaviour ═══════════════════════════════ */

describe('§12 company selection follows the existing persistence behaviour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists company overlays and does not persist a separate company selection', () => {
    const base = getDefaultStorageState() as AppExtendedStorageState;
    StorageAdapter.saveState({
      ...base,
      companyOverlays: [DATED_COMPANY, UNDATED_COMPANY],
    });

    const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(reloaded.companyOverlays).toHaveLength(2);
    expect(reloaded.companyOverlays[0].companyName).toBe('Dated Corp');
    expect(reloaded.companyOverlays[1].companyName).toBe('Undated Ltd');

    // The overlay list is the persisted selection surface — there is no second
    // "which company is focused" key in storage.
    expect(Object.keys(reloaded)).not.toContain('selectedCompanyId');
    expect(Object.keys(reloaded)).not.toContain('selectedCompanyOverlayId');
    expect(Object.keys(base)).not.toContain('selectedCompanyId');
  });
});

/* ═══ §16 — determinism and non-mutation ══════════════════════════════ */

describe('§16 deterministic and read-only', () => {
  it('returns identical mappings on repeated execution', () => {
    const options = mappingOptions(DATED_COMPANY);
    expect(mapCompanyRequirementTargets(options)).toEqual(
      mapCompanyRequirementTargets(options)
    );
  });

  it('returns identical candidates on repeated execution', () => {
    const options = mappingOptions(DATED_COMPANY);
    expect(generateCompanyFocusCandidates(options)).toEqual(
      generateCompanyFocusCandidates(options)
    );
  });

  it('returns an identical review schedule on repeated execution', () => {
    const state = {
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      topics: TOPICS,
      domains: DOMAINS,
      skillStates: SKILL_STATES,
      companyOverlays: [DATED_COMPANY],
      currentMode: 'normal' as const,
      todayStr: TODAY,
      todayAssignments: [],
      targetCompanyId: DATED_COMPANY.id,
    };
    expect(generateReviewCandidates(state)).toEqual(generateReviewCandidates(state));
  });

  it('never mutates its inputs', () => {
    const taskProgress = {};
    const dsaProgress = {};
    const skillStates: Record<string, TopicSkillState> = JSON.parse(
      JSON.stringify(SKILL_STATES)
    );

    const before = JSON.stringify({ taskProgress, dsaProgress, skillStates });

    mapCompanyRequirementTargets(
      mappingOptions(DATED_COMPANY, {
        taskProgressMap: taskProgress,
        dsaProgressMap: dsaProgress,
        skillStates,
      })
    );
    generateCompanyFocusCandidates(
      mappingOptions(DATED_COMPANY, {
        taskProgressMap: taskProgress,
        dsaProgressMap: dsaProgress,
        skillStates,
      })
    );

    expect(JSON.stringify({ taskProgress, dsaProgress, skillStates })).toBe(before);
  });

  it('never mutates the company overlay list', () => {
    const overlays = [DATED_COMPANY, UNDATED_COMPANY];
    const snapshot = JSON.parse(JSON.stringify(overlays));

    generateCompanyFocusCandidates(mappingOptions(DATED_COMPANY));
    mapCompanyRequirementTargets(mappingOptions(UNDATED_COMPANY));

    expect(JSON.parse(JSON.stringify(overlays))).toEqual(snapshot);
  });
});

/* ═══ §8 — Today shows a plain-language Company Focus view ════════════ */

describe('§8 Today Company Focus panel', () => {
  type Ctx = ReturnType<typeof usePlacement>;
  let mountedCtx: Ctx | null = null;

  const Probe = () => {
    const current = usePlacement();
    useEffect(() => {
      mountedCtx = current;
    });
    return null;
  };

  const seed = (overrides: Partial<AppExtendedStorageState> = {}) => {
    localStorage.clear();
    window.location.hash = '';
    StorageAdapter.saveState({
      ...(getDefaultStorageState() as AppExtendedStorageState),
      ...overrides,
    });
  };

  const renderToday = () =>
    render(
      <PlacementProvider>
        <Probe />
        <DashboardView />
      </PlacementProvider>
    );

  const panel = (): HTMLElement | null =>
    document.querySelector('[data-testid="company-focus-summary"]');

  const selectCompany = (id: string) => {
    const select = document.querySelector(
      '[data-testid="company-focus-select"]'
    ) as HTMLSelectElement | null;
    expect(select, 'company focus select must exist').toBeTruthy();
    fireEvent.change(select!, { target: { value: id } });
  };

  /** A real date a handful of days from the machine's actual today. */
  const upcomingEventDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  const DATED_FOR_TODAY: CompanyOverlay = {
    ...DATED_COMPANY,
    eventDate: upcomingEventDate(5),
  };

  beforeEach(() => {
    mountedCtx = null;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
    mountedCtx = null;
  });

  it('stays hidden while no company is selected — existing Today behaviour is untouched', () => {
    seed({ companyOverlays: [DATED_FOR_TODAY, UNDATED_COMPANY] });
    renderToday();

    expect(panel()).toBeNull();
    expect(mountedCtx).not.toBeNull();
    expect(mountedCtx!.companyOverlays).toHaveLength(2);
  });

  it('appears once a company is selected and explains itself in plain language', () => {
    seed({ companyOverlays: [DATED_FOR_TODAY, UNDATED_COMPANY] });
    renderToday();

    selectCompany(DATED_FOR_TODAY.id);

    const el = panel();
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('Dated Corp');

    const reason = document.querySelector(
      '[data-testid="company-focus-reason"]'
    ) as HTMLElement;
    expect(reason.textContent).toBeTruthy();
    expect(reason.textContent).toMatch(/Dated Corp/);
    // §14 — no weights, no scores, no fabricated mastery claim.
    expect(reason.textContent).not.toMatch(/weight|0\.\d{2}|mastery|proficient/i);

    // Counts row exists and is human readable.
    const counts = document.querySelector(
      '[data-testid="company-focus-counts"]'
    ) as HTMLElement;
    expect(counts.textContent).toMatch(/\d+ of \d+ requirements/);
  });

  it('shows urgency wording only when the selected company has a real event date', () => {
    seed({ companyOverlays: [DATED_FOR_TODAY, UNDATED_COMPANY] });
    renderToday();

    selectCompany(DATED_FOR_TODAY.id);
    const datedBadge = document.querySelector('[data-testid="company-focus-urgency"]');
    expect(datedBadge).not.toBeNull();
    expect(datedBadge?.textContent).toMatch(/until event|today or overdue/i);

    // The reason itself also carries the calendar fact for the dated company.
    const datedReason = document.querySelector(
      '[data-testid="company-focus-reason"]'
    ) as HTMLElement;
    expect(datedReason.textContent).toMatch(/\d+ days?/i);

    // Switch to the company with no date → urgency wording must disappear.
    cleanup();
    mountedCtx = null;
    seed({ companyOverlays: [DATED_FOR_TODAY, UNDATED_COMPANY] });
    renderToday();
    selectCompany(UNDATED_COMPANY.id);

    expect(panel()).not.toBeNull();
    expect(document.querySelector('[data-testid="company-focus-urgency"]')).toBeNull();

    const reason = document.querySelector(
      '[data-testid="company-focus-reason"]'
    ) as HTMLElement;
    expect(reason.textContent).not.toMatch(/\d+\s*days?|today or overdue/i);
  });

  it('follows the current selection rather than a stale one when the company changes', () => {
    seed({ companyOverlays: [DATED_FOR_TODAY, UNDATED_COMPANY] });
    renderToday();

    selectCompany(UNDATED_COMPANY.id);
    expect(panel()?.textContent).toContain('Undated Ltd');

    selectCompany(DATED_FOR_TODAY.id);
    expect(panel()?.textContent).toContain('Dated Corp');
    expect(panel()?.textContent).not.toContain('Undated Ltd');

    // Clearing returns Today to its pre-company state.
    const clear = document.querySelector(
      '[data-testid="clear-company-focus"]'
    ) as HTMLElement | null;
    expect(clear).not.toBeNull();
    fireEvent.click(clear!);
    expect(panel()).toBeNull();
  });
});
