/**
 * Assessment Engine - Deterministic Assessment Lifecycle, Scoring & Prioritization
 *
 * Implements Assessment Specification v1.0 (Phase C)
 * Pure functions for baseline assessment creation, evaluation, scoring, level mapping,
 * confidence derivation, and evidence emission.
 */

import type {
  DomainId,
  EvidenceLog,
  AssessmentKind,
  AssessmentStatus,
  AssessmentItemResult,
  AssessmentConfidence,
  AssessmentDefinition,
  AssessmentItem,
  AssessmentAttempt,
  AssessmentResponse,
  AssessmentItemExposure,
  DomainAssessmentResult,
  AssessmentSnapshot,
  WeaknessSignal,
  AssessmentState,
  CompanyAssessmentOverlay,
  DomainRoleAssessmentReadiness,
  CompanyAssessmentOverlayResult,
  ItemCalibrationObservation,
  ItemCalibrationSummary,
  CompanyOverlay,
  AssessmentExecutionResult,
  AssessmentExecutionRecord,
  PythonExecutionContract,
  PythonTestCase,
  SqlFixture,
  SqlTableFixture,
} from '../types';
import {
  BASELINE_ASSESSMENT_DEFINITION,
  SUNDAY_MINI_TEST_DEFINITION,
  FULL_REASSESSMENT_DEFINITION,
} from '../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import {
  executePythonAssessmentItem,
  executeSqlAssessmentItem,
  validatePythonSafety,
  validateSqlSafety,
  EXECUTION_ERROR_CODES,
  SandboxedPythonInterpreter,
  SandboxedSqlExecutor,
  areOutputsEqual,
} from './assessmentExecutionEngine';

// ============================================================================
// Type Guards & Validation
// ============================================================================

/** Checks if a value is a valid AssessmentKind */
export function isAssessmentKind(value: string): value is AssessmentKind {
  return ['diagnostic_assessment', 'weekly_assessment', 'full_reassessment'].includes(value);
}

/** Checks if a value is a valid AssessmentStatus */
export function isAssessmentStatus(value: string): value is AssessmentStatus {
  return ['in_progress', 'submitted', 'auto_submitted', 'abandoned'].includes(value);
}

/** Checks if a value is a valid AssessmentItemResult */
export function isAssessmentItemResult(value: string): value is AssessmentItemResult {
  return ['correct', 'incorrect', 'dont_know', 'unanswered'].includes(value);
}

/** Checks if a value is a valid AssessmentConfidence */
export function isAssessmentConfidence(value: string): value is AssessmentConfidence {
  return ['confident', 'somewhat', 'guessing'].includes(value);
}

/** Validates an AssessmentAttempt structure */
export function validateAssessmentAttempt(attempt: unknown): attempt is AssessmentAttempt {
  if (!attempt || typeof attempt !== 'object') return false;
  const a = attempt as Record<string, unknown>;

  return (
    typeof a.id === 'string' &&
    typeof a.definitionId === 'string' &&
    typeof a.definitionVersion === 'number' &&
    isAssessmentKind(a.kind as string) &&
    isAssessmentStatus(a.status as string) &&
    typeof a.startedAt === 'string' &&
    typeof a.timeLimitSeconds === 'number' &&
    typeof a.seed === 'string' &&
    Array.isArray(a.selectedItemIds)
  );
}

/** Validates an AssessmentResponse structure */
export function validateAssessmentResponse(response: unknown): response is AssessmentResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    typeof r.id === 'string' &&
    typeof r.attemptId === 'string' &&
    typeof r.itemId === 'string' &&
    (typeof r.response === 'number' || typeof r.response === 'string') &&
    isAssessmentItemResult(r.result as string) &&
    typeof r.timeSpentSeconds === 'number' &&
    Array.isArray(r.errorCategories) &&
    typeof r.scoredCredit === 'number' &&
    typeof r.weightApplied === 'number'
  );
}

/** Validates an AssessmentItemExposure structure */
export function validateAssessmentItemExposure(exposure: unknown): exposure is AssessmentItemExposure {
  if (!exposure || typeof exposure !== 'object') return false;
  const e = exposure as Record<string, unknown>;

  return (
    typeof e.itemId === 'string' &&
    typeof e.exposureCount === 'number' &&
    typeof e.lastSeenAt === 'string' &&
    typeof e.lastAttemptId === 'string' &&
    isAssessmentItemResult(e.lastResult as string) &&
    Array.isArray(e.previousAssessmentUsage) &&
    typeof e.estimationUses === 'number' &&
    typeof e.eligibleForFutureEstimation === 'boolean' &&
    typeof e.releasedToPractice === 'boolean'
  );
}

/** Validates a DomainAssessmentResult structure */
export function validateDomainAssessmentResult(result: unknown): result is DomainAssessmentResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;

  return (
    typeof r.domainId === 'string' &&
    typeof r.abilityScore === 'number' &&
    typeof r.level === 'number' &&
    [0, 1, 2, 3, 4, 5].includes(r.level) &&
    typeof r.confidence === 'string' &&
    ['none', 'low', 'medium', 'high'].includes(r.confidence) &&
    typeof r.status === 'string' &&
    ['assessed', 'partially_assessed', 'unassessed'].includes(r.status) &&
    typeof r.assessmentDate === 'string' &&
    typeof r.provisional === 'boolean' &&
    typeof r.attemptId === 'string' &&
    isAssessmentKind(r.kind as string)
  );
}

/** Validates an AssessmentSnapshot structure */
export function validateAssessmentSnapshot(snapshot: unknown): snapshot is AssessmentSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const s = snapshot as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.takenAt === 'string' &&
    isAssessmentKind(s.kind as string) &&
    typeof s.trigger === 'string' &&
    ['scheduled', 'manual', 'post_baseline'].includes(s.trigger) &&
    Array.isArray(s.domainResults) &&
    s.domainResults.every(validateDomainAssessmentResult)
  );
}

/** Validates a WeaknessSignal structure */
export function validateWeaknessSignal(signal: unknown): signal is WeaknessSignal {
  if (!signal || typeof signal !== 'object') return false;
  const s = signal as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.domainId === 'string' &&
    typeof s.strength === 'number' &&
    [1, 2, 3].includes(s.strength) &&
    typeof s.status === 'string' &&
    ['open', 'reinforced', 'resolved'].includes(s.status) &&
    typeof s.firstSeenAt === 'string' &&
    typeof s.lastSeenAt === 'string' &&
    typeof s.occurrences === 'number' &&
    Array.isArray(s.sourceAttemptIds)
  );
}

// ============================================================================
// Constants (Provisional - DECIDED 4)
// ============================================================================

/** Provisional level band thresholds (DECIDED 4 / §10.3) */
export const PROVISIONAL_LEVEL_BANDS: ReadonlyArray<{ min: number; max: number; level: 0 | 1 | 2 | 3 | 4 | 5 }> = [
  { min: 0, max: 0, level: 0 },        // B0 - zero ability or insufficient evidence
  { min: 1, max: 19, level: 1 },       // B1
  { min: 20, max: 39, level: 2 },      // B2
  { min: 40, max: 64, level: 3 },      // B3
  { min: 65, max: 84, level: 4 },      // B4
  { min: 85, max: 100, level: 5 },     // B5
] as const;

/** Provisional confidence weight vector (DECIDED 4 / §11.2) */
export const PROVISIONAL_CONFIDENCE_WEIGHTS = {
  observations: 0.35,
  coverage: 0.25,
  difficultyRange: 0.15,
  consistency: 0.15,
  responseQuality: 0.05,
  formatReliability: 0.05,
} as const;

/** Provisional confidence band thresholds (DECIDED 4 / §11.2) */
export const PROVISIONAL_CONFIDENCE_BANDS = {
  low: { min: 0, max: 0.49 },
  medium: { min: 0.50, max: 0.79 },
  high: { min: 0.80, max: 1.0 },
} as const;

/** Provisional item difficulty weights (DECIDED 4 / §9.2 Step 3) */
export const PROVISIONAL_DIFFICULTY_WEIGHTS = {
  1: 0.8,
  2: 1.0,
  3: 1.3,
  4: 1.7,
} as const;

/** Provisional Sunday composition targets (DECIDED 4) */
export const PROVISIONAL_SUNDAY_COMPOSITION = {
  weaknessTargeted: 0.60,
  recentLearning: 0.20,
  retentionMixed: 0.20,
} as const;

/** Provisional regression thresholds (DECIDED 4) */
export const PROVISIONAL_REGRESSION = {
  minScoredResponses: 3,
  minDifficultyBands: 2,
  abilityDropThreshold: 8,
  minPriorObservations: 2,
  maxLevelDrop: 1,
  catastrophicDropThreshold: 25,
  recentObservationWindowDays: 45,
} as const;

/** Provisional confidence decay windows (DECIDED 4) */
export const PROVISIONAL_CONFIDENCE_DECAY = {
  stableDays: 14,
  demoteOneStepDays: 42,
  demoteToLowDays: 42,
} as const;

/** Provisional retention policy constants (DECIDED 2) */
export const PROVISIONAL_RETENTION = {
  keepFullResponsesForAttempts: 12,
  rawResponseCutoffDays: 90,
} as const;

// ============================================================================
// Core Calculation & Scoring Helpers
// ============================================================================

/**
 * Maps a domainAbility (0-100) to a provisional level (0-5)
 * using the provisional band table (§10.3).
 */
export function mapAbilityToProvisionalLevel(abilityScore: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (abilityScore <= 0) return 0;

  for (const band of PROVISIONAL_LEVEL_BANDS) {
    if (abilityScore >= band.min && abilityScore <= band.max) {
      return band.level;
    }
  }

  if (abilityScore >= 85) return 5;
  if (abilityScore >= 65) return 4;
  if (abilityScore >= 40) return 3;
  if (abilityScore >= 20) return 2;
  if (abilityScore >= 1) return 1;
  return 0;
}

/**
 * Computes confidence band from a normalized score (0-1) per §11.2
 */
export function computeConfidenceBand(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score <= 0) return 'none';
  if (score >= PROVISIONAL_CONFIDENCE_BANDS.high.min) return 'high';
  if (score >= PROVISIONAL_CONFIDENCE_BANDS.medium.min) return 'medium';
  return 'low';
}

/**
 * Applies freshness-aware time decay to confidence ratings per §11.3:
 * - < 14 days: unchanged
 * - 14–42 days: demote one step (high -> medium, medium -> low; low stays low)
 * - > 42 days: demote to low (never to none)
 * Decay affects confidence only, never level.
 */
export function applyConfidenceTimeDecay(
  confidence: 'none' | 'low' | 'medium' | 'high',
  assessmentDate: string,
  currentDate: string = new Date().toISOString()
): 'none' | 'low' | 'medium' | 'high' {
  if (confidence === 'none') return 'none';
  const ageMs = Math.abs(new Date(currentDate).getTime() - new Date(assessmentDate).getTime());
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  if (ageDays < PROVISIONAL_CONFIDENCE_DECAY.stableDays) {
    return confidence;
  }
  if (ageDays <= PROVISIONAL_CONFIDENCE_DECAY.demoteOneStepDays) {
    if (confidence === 'high') return 'medium';
    return 'low';
  }
  return 'low';
}

/**
 * Determines the provisional difficulty weight for an authored difficulty level
 */
export function getProvisionalDifficultyWeight(difficulty: 1 | 2 | 3 | 4): number {
  return PROVISIONAL_DIFFICULTY_WEIGHTS[difficulty] ?? 1.0;
}

/**
 * Applies chance correction for objective MCQ items per §9.2 Step 2:
 * c' = max(0, (c - 1/k) / (1 - 1/k)) where k = number of options.
 */
export function applyChanceCorrection(credit: number, numOptions: number): number {
  if (numOptions <= 1) return credit;
  const guessFloor = 1 / numOptions;
  return Math.max(0, (credit - guessFloor) / (1 - guessFloor));
}

/**
 * Normalizes SQL queries for robust string matching against authored acceptable forms.
 * Trims, converts to lowercase, collapses whitespace, strips trailing semicolons,
 * and canonicalizes whitespace around operators.
 */
export function normalizeSQLQuery(sql: string): string {
  if (!sql) return '';
  return sql
    .toLowerCase()
    .replace(/;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\bas\b\s+/g, '') // strip optional 'as' alias keyword
    .replace(/["`]/g, '')
    .trim();
}

/**
 * Applies item-influence cap: no single item may exceed maxContribution percentage
 * of the domain's weighted total. Excess weight is scaled down and redistributed (§6.2).
 */
export function applyInfluenceCap(
  items: Array<{ weight: number; credit: number; guessFloor: number }>,
  maxContributionPercent: number
): Array<{ weight: number; credit: number; guessFloor: number }> {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0 || items.length <= 1) return items;

  const maxWeightAllowed = (maxContributionPercent / 100) * totalWeight;
  let excessWeight = 0;

  const capped = items.map((item) => {
    if (item.weight > maxWeightAllowed) {
      excessWeight += item.weight - maxWeightAllowed;
      return { ...item, weight: maxWeightAllowed };
    }
    return { ...item };
  });

  if (excessWeight > 0) {
    const nonCappedItems = capped.filter((item) => item.weight < maxWeightAllowed);
    const nonCappedTotal = nonCappedItems.reduce((sum, item) => sum + item.weight, 0);
    if (nonCappedTotal > 0) {
      for (const item of nonCappedItems) {
        item.weight += excessWeight * (item.weight / nonCappedTotal);
      }
    }
  }

  return capped;
}

// ============================================================================
// Attempt Lifecycle & Item Response Handling
// ============================================================================

/**
 * Constructs a new baseline diagnostic attempt with deterministic ordering.
 * Orders items by module sequence M1 to M10, then by multistage role (anchor -> branch -> confirm),
 * then by difficulty.
 */
export function buildBaselineAttempt(
  definition: AssessmentDefinition = BASELINE_ASSESSMENT_DEFINITION,
  seed: string = `baseline-${Date.now()}`
): AssessmentAttempt {
  const selectedItemIds: string[] = [];

  for (const moduleDef of definition.modules) {
    const moduleItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === moduleDef.domainId);

    // Multistage ordering: anchors first, then branches, then confirm, ascending by difficulty
    const roleRank = (role: 'anchor' | 'branch' | 'confirm'): number => {
      switch (role) {
        case 'anchor': return 1;
        case 'branch': return 2;
        case 'confirm': return 3;
        default: return 4;
      }
    };

    const ordered = [...moduleItems].sort((a, b) => {
      const rDiff = roleRank(a.assessmentRole) - roleRank(b.assessmentRole);
      if (rDiff !== 0) return rDiff;
      return a.difficulty - b.difficulty;
    });

    for (const item of ordered) {
      selectedItemIds.push(item.id);
    }
  }

  return {
    id: `asm-attempt-${seed.replace(/[^a-zA-Z0-9-]/g, '')}`,
    definitionId: definition.id,
    definitionVersion: definition.version,
    kind: definition.kind,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    timeLimitSeconds: definition.timeLimitMinutes * 60,
    seed,
    selectedItemIds,
  };
}

/**
 * Checks if an active attempt has exceeded its hard wall-clock time limit.
 */
export function isAttemptExpired(attempt: AssessmentAttempt, nowMs: number = Date.now()): boolean {
  if (attempt.status !== 'in_progress') return false;
  const startedAtMs = new Date(attempt.startedAt).getTime();
  if (isNaN(startedAtMs)) return false;
  return nowMs >= startedAtMs + attempt.timeLimitSeconds * 1000;
}

/**
 * Validates and applies a lifecycle transition on an AssessmentAttempt.
 * Rejects illegal transitions from terminal states.
 */
export function transitionAttempt(
  attempt: AssessmentAttempt,
  targetStatus: AssessmentStatus,
  endedAt: string = new Date().toISOString()
): AssessmentAttempt {
  const terminalStatuses: AssessmentStatus[] = ['submitted', 'auto_submitted', 'abandoned'];

  if (terminalStatuses.includes(attempt.status)) {
    throw new Error(`Invalid assessment attempt transition: cannot move from terminal status "${attempt.status}" to "${targetStatus}"`);
  }

  return {
    ...attempt,
    status: targetStatus,
    endedAt,
  };
}

export interface EvaluatedItemScore {
  result: AssessmentItemResult;
  scoredCredit: number;
  weightApplied: number;
  errorCategories: string[];
  executionResult?: AssessmentExecutionResult;
}

export interface RubricCriterion {
  id: string;
  description: string;
  matchKeywords: string[][];
}

export interface AuthoredRubric {
  rubricId: string;
  criteria: RubricCriterion[];
}

export const AUTHORED_RUBRICS: Record<string, AuthoredRubric> = {
  'rubric-dsa-longest-zero-sum-subarr': {
    rubricId: 'rubric-dsa-longest-zero-sum-subarr',
    criteria: [
      {
        id: 'crit-prefix-sum',
        description: 'Running prefix sum accumulator',
        matchKeywords: [['prefix', 'sum'], ['running', 'sum'], ['cumulative']],
      },
      {
        id: 'crit-hash-map',
        description: 'Hash map / dictionary storing earliest seen index',
        matchKeywords: [['hash', 'map'], ['dict'], ['earliest', 'index'], ['first', 'seen']],
      },
      {
        id: 'crit-complexity',
        description: 'O(N) time and O(N) auxiliary space complexity',
        matchKeywords: [['o(n)'], ['linear', 'time']],
      },
    ],
  },
  'rubric-py-context-mgr': {
    rubricId: 'rubric-py-context-mgr',
    criteria: [
      {
        id: 'crit-dunder-methods',
        description: '__enter__ and __exit__ dunder methods',
        matchKeywords: [['__enter__', '__exit__'], ['enter', 'exit']],
      },
      {
        id: 'crit-exit-args',
        description: 'Exception arguments: exc_type, exc_val, exc_tb',
        matchKeywords: [['exc_type'], ['exc_val'], ['exc_tb'], ['traceback'], ['exception', 'type']],
      },
      {
        id: 'crit-suppress-return-true',
        description: 'Returning True from __exit__ suppresses exception propagation',
        matchKeywords: [['return', 'true'], ['returning', 'true'], ['suppress']],
      },
    ],
  },
  'rubric-oop-di': {
    rubricId: 'rubric-oop-di',
    criteria: [
      {
        id: 'crit-abstractions',
        description: 'Both high-level and low-level modules depend on abstractions',
        matchKeywords: [['high', 'low', 'abstract'], ['depend', 'abstraction'], ['abstractions']],
      },
      {
        id: 'crit-details-depend',
        description: 'Abstractions should not depend on details; details depend on abstractions',
        matchKeywords: [['details', 'depend'], ['abstract', 'detail']],
      },
      {
        id: 'crit-concrete-example',
        description: 'Concrete interface or dependency injection example',
        matchKeywords: [['interface'], ['decoupl'], ['payment'], ['service'], ['inject']],
      },
    ],
  },
  'rubric-comm-incident-email': {
    rubricId: 'rubric-comm-incident-email',
    criteria: [
      {
        id: 'crit-status-impact',
        description: 'Clear statement of resolution, 15-minute duration, affected service',
        matchKeywords: [['resolved'], ['mitigat'], ['15', 'min'], ['outage'], ['status']],
      },
      {
        id: 'crit-root-cause',
        description: 'Technical root cause and immediate fix applied',
        matchKeywords: [['root', 'cause'], ['pool'], ['redis'], ['exhaust'], ['fix']],
      },
      {
        id: 'crit-next-steps',
        description: 'Preventative action items and post-mortem / RCA timeline',
        matchKeywords: [['post-mortem'], ['postmortem'], ['rca'], ['next', 'step'], ['prevent']],
      },
    ],
  },
  'rubric-int-tradeoff-explanation': {
    rubricId: 'rubric-int-tradeoff-explanation',
    criteria: [
      {
        id: 'crit-advantages',
        description: 'Advantageous scenarios: horizontal partition scale, high write throughput, schema flexibility',
        matchKeywords: [['horizontal'], ['partition'], ['scale'], ['throughput'], ['flexible']],
      },
      {
        id: 'crit-tradeoffs',
        description: 'Trade-offs: ACID multi-table transactions, lack of declarative SQL joins',
        matchKeywords: [['acid'], ['transaction'], ['join'], ['consisten']],
      },
      {
        id: 'crit-principle',
        description: 'Choice guided by access patterns, scaling limits, rather than hype',
        matchKeywords: [['access', 'pattern'], ['pattern'], ['scaling', 'limit'], ['tradeoff'], ['principle']],
      },
    ],
  },
};

/**
 * Deterministically evaluates structured written/rubric responses (§14.4).
 * Learner self-evaluation NEVER awards credit. Credit is derived strictly
 * from authored criteria clusters matching response text.
 */
export function evaluateRubricResponse(
  rubricId: string,
  userResponse: number | string | null | undefined,
  referenceKey?: number
): { earnedFraction: number; result: 'correct' | 'incorrect' } {
  if (typeof userResponse === 'number') {
    const isCorrect = referenceKey !== undefined && userResponse === referenceKey;
    return {
      earnedFraction: isCorrect ? 1.0 : 0.0,
      result: isCorrect ? 'correct' : 'incorrect',
    };
  }

  const text = String(userResponse || '').toLowerCase().trim();
  if (!text) {
    return { earnedFraction: 0.0, result: 'incorrect' };
  }

  const rubric = AUTHORED_RUBRICS[rubricId];
  if (!rubric || rubric.criteria.length === 0) {
    return { earnedFraction: text.length > 20 ? 0.5 : 0.0, result: 'incorrect' };
  }

  let criteriaMet = 0;
  for (const crit of rubric.criteria) {
    const matches = crit.matchKeywords.some((cluster) =>
      cluster.every((word) => text.includes(word.toLowerCase()))
    );
    if (matches) {
      criteriaMet++;
    }
  }

  const fraction = criteriaMet / rubric.criteria.length;
  const earnedFraction = Math.min(1.0, Math.max(0.0, Number(fraction.toFixed(2))));
  const result = earnedFraction >= 0.66 ? 'correct' : 'incorrect';
  return { earnedFraction, result };
}

/**
 * Evaluates a user response against an AssessmentItem definition.
 * - MCQs: evaluates against key (0.0 or 1.0).
 * - SQL normalized_match: evaluates against acceptableForms[].
 * - Rubric/constructed: evaluated deterministically via authored criteria (§14.4).
 * - Execution_test: sandboxed execution against authored contract/fixture (Phase H).
 * - Flags dont_know and unanswered appropriately.
 */
export function evaluateItemResponse(
  item: AssessmentItem,
  userResponse: number | string | null | undefined,
  _confidence?: AssessmentConfidence,
  _timeSpentSeconds?: number
): EvaluatedItemScore {
  const diffWeight = getProvisionalDifficultyWeight(item.difficulty);
  const itemWeightMultiplier = item.scoring.weight ?? 1;
  const finalWeight = diffWeight * itemWeightMultiplier;

  // Unanswered / timed-out check
  if (userResponse === null || userResponse === undefined || userResponse === '' || userResponse === 'unanswered' || userResponse === -1) {
    return {
      result: 'unanswered',
      scoredCredit: 0.0,
      weightApplied: finalWeight,
      errorCategories: ['E-SPEED'],
    };
  }

  // Explicit 'dont_know' check
  if (userResponse === 'dont_know') {
    return {
      result: 'dont_know',
      scoredCredit: 0.0,
      weightApplied: finalWeight,
      errorCategories: ['E-CONCEPT'],
    };
  }

  // 1. Objective MCQ Single-Select
  if (item.scoring.kind === 'objective') {
    if (typeof item.key === 'number') {
      const selectedIndex = typeof userResponse === 'number' ? userResponse : parseInt(String(userResponse), 10);
      const isCorrect = selectedIndex === item.key;
      return {
        result: isCorrect ? 'correct' : 'incorrect',
        scoredCredit: isCorrect ? 1.0 : 0.0,
        weightApplied: finalWeight,
        errorCategories: isCorrect ? [] : item.errorCategories,
      };
    }

    if (typeof item.key === 'string') {
      const isCorrect = String(userResponse).trim().toLowerCase() === item.key.trim().toLowerCase();
      return {
        result: isCorrect ? 'correct' : 'incorrect',
        scoredCredit: isCorrect ? 1.0 : 0.0,
        weightApplied: finalWeight,
        errorCategories: isCorrect ? [] : item.errorCategories,
      };
    }
  }

  // 2. SQL Normalized Match
  if (item.scoring.kind === 'normalized_match') {
    const normalizedUser = normalizeSQLQuery(String(userResponse));
    const forms = item.scoring.acceptableForms ?? [];
    const isCorrect = forms.some((f) => normalizeSQLQuery(f) === normalizedUser);

    return {
      result: isCorrect ? 'correct' : 'incorrect',
      scoredCredit: isCorrect ? 1.0 : 0.0,
      weightApplied: finalWeight,
      errorCategories: isCorrect ? [] : item.errorCategories,
    };
  }

  // 3. Constructed-Response / Rubric Items (§14.4 & DECIDED 1)
  // Hard Rule: Learner self-evaluation NEVER independently awards correctness/ability credit.
  // Evaluation is purely a deterministic function of the authored rubric criteria.
  if (item.scoring.kind === 'rubric') {
    const rubricId = item.scoring.rubricId || `rubric-${item.id}`;
    const rubricResult = evaluateRubricResponse(
      rubricId,
      userResponse,
      typeof item.key === 'number' ? item.key : undefined
    );

    return {
      result: rubricResult.result,
      scoredCredit: rubricResult.earnedFraction,
      weightApplied: finalWeight,
      errorCategories: rubricResult.result === 'correct' ? [] : item.errorCategories,
    };
  }

  // 4. Execution-Backed Python/SQL Test (Phase H)
  if (item.scoring.kind === 'execution_test') {
    let execResult: AssessmentExecutionResult;
    const userCode = String(userResponse);

    if (item.pythonContract || item.domainId === 'python') {
      execResult = executePythonAssessmentItem(item, userCode);
    } else if (item.sqlFixture || item.domainId === 'sql') {
      execResult = executeSqlAssessmentItem(item, userCode);
    } else {
      execResult = {
        passed: false,
        status: 'unsupported',
        errorCategory: EXECUTION_ERROR_CODES.UNSUPPORTED,
        message: 'No supported execution contract or fixture found for item',
        testsPassed: 0,
        totalTests: 0,
        executionTimeMs: 0,
      };
    }

    const isCorrect = execResult.passed;
    const errorCats = isCorrect
      ? []
      : execResult.errorCategory
      ? Array.from(new Set([execResult.errorCategory, ...item.errorCategories]))
      : item.errorCategories;

    return {
      result: isCorrect ? 'correct' : 'incorrect',
      scoredCredit: isCorrect ? 1.0 : 0.0,
      weightApplied: finalWeight,
      errorCategories: errorCats,
      executionResult: execResult,
    };
  }

  // Fallback
  return {
    result: 'incorrect',
    scoredCredit: 0.0,
    weightApplied: finalWeight,
    errorCategories: item.errorCategories,
  };
}

// ============================================================================
// Whole-Attempt Scoring & Profile Derivation
// ============================================================================

export interface AssessmentScoringResult {
  attempt: AssessmentAttempt;
  domainResults: DomainAssessmentResult[];
  weaknessSignals: WeaknessSignal[];
  snapshot: AssessmentSnapshot;
  exposures: Record<string, AssessmentItemExposure>;
  evidenceLogs: EvidenceLog[];
  calibrationObservations?: ItemCalibrationObservation[];
  executionRecords?: AssessmentExecutionRecord[];
}

/**
 * Computes complete baseline scoring and profile read-out.
 * Pure deterministic function of the attempt, user responses, item banks, and definition.
 */
export function scoreAssessmentAttempt(
  attempt: AssessmentAttempt,
  responses: AssessmentResponse[],
  allItems: AssessmentItem[] = BASELINE_ASSESSMENT_ITEMS,
  definition: AssessmentDefinition = BASELINE_ASSESSMENT_DEFINITION,
  existingExposures?: Record<string, AssessmentItemExposure>,
  existingWeaknessSignals?: WeaknessSignal[],
  existingDomainResults?: DomainAssessmentResult[],
  existingEvidenceLogs?: EvidenceLog[]
): AssessmentScoringResult {
  const terminalAttempt = attempt.status === 'in_progress'
    ? transitionAttempt(attempt, isAttemptExpired(attempt) ? 'auto_submitted' : 'submitted')
    : attempt;

  const assessmentDate = terminalAttempt.endedAt ?? new Date().toISOString();
  const domainResults: DomainAssessmentResult[] = [];
  const weaknessSignals: WeaknessSignal[] = [];
  const exposures: Record<string, AssessmentItemExposure> = {};
  const evidenceLogs: EvidenceLog[] = [];
  const calibrationObservations: ItemCalibrationObservation[] = [];
  const executionRecords: AssessmentExecutionRecord[] = [];

  const responseMap = new Map<string, AssessmentResponse>();
  for (const resp of responses) {
    responseMap.set(resp.itemId, resp);
  }

  const itemMap = new Map<string, AssessmentItem>();
  for (const item of allItems) {
    itemMap.set(item.id, item);
  }

  const isWeekly = terminalAttempt.kind === 'weekly_assessment';
  const isFullReassessment = terminalAttempt.kind === 'full_reassessment';

  // Determine modules to evaluate: for weekly assessment, target domains present in selectedItemIds
  const targetModules: Array<{ domainId: DomainId; itemCount: number }> = isWeekly
    ? Array.from(
        new Set(
          terminalAttempt.selectedItemIds
            .map((id) => itemMap.get(id)?.domainId)
            .filter((d): d is DomainId => Boolean(d) && d !== 'projects')
        )
      ).map((domainId) => ({
        domainId,
        itemCount: terminalAttempt.selectedItemIds.filter((id) => itemMap.get(id)?.domainId === domainId).length,
      }))
    : isFullReassessment
    ? FULL_REASSESSMENT_DEFINITION.modules
    : definition.modules;

  for (const moduleDef of targetModules) {
    const domainId = moduleDef.domainId;
    const domainItems = isWeekly
      ? allItems.filter((i) => terminalAttempt.selectedItemIds.includes(i.id) && i.domainId === domainId)
      : allItems.filter((i) => i.domainId === domainId);

    const scoredItems: Array<{ weight: number; credit: number; guessFloor: number }> = [];
    const difficultyBandsSet = new Set<number>();
    const competenciesSet = new Set<string>();
    const topicsSet = new Set<string>();
    let dkCount = 0;
    let unansweredCount = 0;
    let correctCount = 0;

    for (const item of domainItems) {
      topicsSet.add(item.topicId);
      const resp = responseMap.get(item.id);

      if (!resp || resp.result === 'unanswered') {
        unansweredCount++;
        const estWeight = calculateItemEstimationWeight(
          item,
          existingExposures?.[item.id],
          assessmentDate
        );
        scoredItems.push({
          weight: estWeight,
          credit: 0.0,
          guessFloor: item.options && item.options.length > 0 ? 1 / item.options.length : 0,
        });
        continue;
      }

      if (resp.result === 'dont_know') {
        dkCount++;
      } else if (resp.result === 'correct') {
        correctCount++;
      }

      difficultyBandsSet.add(item.difficulty <= 2 ? 1 : item.difficulty);
      competenciesSet.add(item.competency);

      const numOptions = item.options ? item.options.length : 0;
      const estWeight = calculateItemEstimationWeight(
        item,
        existingExposures?.[item.id],
        assessmentDate
      );
      scoredItems.push({
        weight: estWeight,
        credit: resp.scoredCredit,
        guessFloor: numOptions > 1 ? 1 / numOptions : 0,
      });

      // Weakness identification (§12, §31)
      if (resp.result === 'incorrect' && item.errorCategories.length > 0) {
        const isConfidentError = resp.responseConfidence === 'confident';
        const existingSignal = (existingWeaknessSignals || []).find(
          (ws) => ws.domainId === domainId && (ws.competency === item.competency || ws.topicId === item.topicId) && ws.status !== 'resolved'
        );

        if (existingSignal) {
          weaknessSignals.push({
            ...existingSignal,
            status: 'reinforced',
            strength: Math.min(3, isConfidentError ? existingSignal.strength + 1 : existingSignal.strength) as 1 | 2 | 3,
            lastSeenAt: assessmentDate,
            occurrences: existingSignal.occurrences + 1,
            sourceAttemptIds: Array.from(new Set([...existingSignal.sourceAttemptIds, terminalAttempt.id])),
          });
        } else {
          weaknessSignals.push({
            id: `ws-${domainId}-${item.competency}-${terminalAttempt.id}`,
            domainId,
            topicId: item.topicId,
            competency: item.competency,
            errorCategory: item.errorCategories[0],
            strength: isConfidentError ? 3 : 2,
            status: 'open',
            firstSeenAt: assessmentDate,
            lastSeenAt: assessmentDate,
            occurrences: 1,
            sourceAttemptIds: [terminalAttempt.id],
          });
        }
      } else if (resp.result === 'correct' && resp.responseConfidence === 'confident') {
        const existingSignal = (existingWeaknessSignals || []).find(
          (ws) => ws.domainId === domainId && ws.competency === item.competency && ws.status !== 'resolved'
        );
        if (existingSignal) {
          weaknessSignals.push({
            ...existingSignal,
            status: 'resolved',
            resolvedAt: assessmentDate,
            lastSeenAt: assessmentDate,
            sourceAttemptIds: Array.from(new Set([...existingSignal.sourceAttemptIds, terminalAttempt.id])),
          });
        }
      }

      // Exposure recording (§13)
      const prevExposure = existingExposures?.[item.id];
      const prevCount = prevExposure?.exposureCount ?? 0;
      const prevUses = prevExposure?.estimationUses ?? 0;
      const prevUsages = prevExposure?.previousAssessmentUsage ?? [];

      const usedInEstimation = estWeight > 0;
      exposures[item.id] = {
        itemId: item.id,
        exposureCount: prevCount + 1,
        lastSeenAt: assessmentDate,
        lastAttemptId: terminalAttempt.id,
        lastResult: resp.result,
        previousAssessmentUsage: [...prevUsages, terminalAttempt.kind],
        estimationUses: prevUses + (usedInEstimation ? 1 : 0),
        eligibleForFutureEstimation: (prevUses + (usedInEstimation ? 1 : 0)) < 2,
        releasedToPractice: item.exposurePolicy.releaseToPractice,
      };

      // Calibration Observation Recording (§9.4, §13)
      calibrationObservations.push(
        recordItemCalibrationObservation(resp, terminalAttempt, item)
      );

      // Phase H: Execution Record Recording
      if (resp.executionResult) {
        executionRecords.push({
          id: `exec-${terminalAttempt.id}-${item.id}`,
          attemptId: terminalAttempt.id,
          itemId: item.id,
          language: item.pythonContract || item.domainId === 'python' ? 'python' : 'sql',
          code: String(resp.response),
          result: resp.executionResult,
          timestamp: assessmentDate,
        });
      }
    }

    // Apply item influence cap per §6.2 / §9.2 Step 3 (max 25% standard, 30% for DSA)
    const maxCap = domainId === 'dsa' ? 30 : 25;
    const cappedItems = applyInfluenceCap(scoredItems, maxCap);

    // Step 4 — Domain Ability Estimate with Chance Correction (§9.2 Step 2 & 4)
    const totalWeight = cappedItems.reduce((sum, item) => sum + item.weight, 0);
    const weightedRawCredit = totalWeight > 0
      ? cappedItems.reduce((sum, item) => sum + item.weight * item.credit, 0) / totalWeight
      : 0;

    const weightedGuessFloor = totalWeight > 0
      ? cappedItems.reduce((sum, item) => sum + item.weight * item.guessFloor, 0) / totalWeight
      : 0;

    let chanceCorrectedCredit = weightedRawCredit;
    if (weightedGuessFloor > 0 && weightedGuessFloor < 1) {
      chanceCorrectedCredit = Math.max(0, (weightedRawCredit - weightedGuessFloor) / (1 - weightedGuessFloor));
    }

    const abilityScore = Math.min(100, Math.max(0, Math.round(chanceCorrectedCredit * 100)));

    // Minimum Evidence Threshold Check (§4.3)
    const minRequiredResponses = domainId === 'interviews' ? 4 : 5;
    const scoredResponsesCount = domainItems.length - unansweredCount;
    const hasMinEvidence = isWeekly
      ? scoredResponsesCount >= 1
      : (scoredResponsesCount >= minRequiredResponses && difficultyBandsSet.size >= 2 && competenciesSet.size >= 2);

    // Status Assignment per §4.3
    let status: 'assessed' | 'partially_assessed' | 'unassessed';
    const isClassB = ['python', 'communication', 'interviews'].includes(domainId);

    if (!hasMinEvidence) {
      status = 'partially_assessed';
    } else if (isClassB) {
      status = 'partially_assessed';
    } else if (isWeekly) {
      status = 'partially_assessed';
    } else {
      status = 'assessed';
    }

    // Level Assignment per §10.1 & §10.3
    let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    if (hasMinEvidence && abilityScore > 0) {
      level = mapAbilityToProvisionalLevel(abilityScore);
    }

    // Confidence Derivation per §11.2 (0 to 1 normalized)
    const obsFactor = Math.min(1, scoredResponsesCount / Math.max(1, moduleDef.itemCount));
    const covFactor = Math.min(1, competenciesSet.size / Math.max(1, domainItems.length / 2));
    const diffFactor = Math.min(1, difficultyBandsSet.size / 2);
    const consistencyFactor = scoredResponsesCount > 0 ? (correctCount === 0 || correctCount === scoredResponsesCount ? 1.0 : 0.8) : 0;
    const qualityFactor = Math.max(0, 1 - (dkCount + unansweredCount) / Math.max(1, domainItems.length));
    const formatRelFactor = domainItems.some((i) => i.scoring.kind === 'rubric' || i.scoring.kind === 'normalized_match') ? 0.95 : 0.85;

    const rawConfidenceScore =
      PROVISIONAL_CONFIDENCE_WEIGHTS.observations * obsFactor +
      PROVISIONAL_CONFIDENCE_WEIGHTS.coverage * covFactor +
      PROVISIONAL_CONFIDENCE_WEIGHTS.difficultyRange * diffFactor +
      PROVISIONAL_CONFIDENCE_WEIGHTS.consistency * consistencyFactor +
      PROVISIONAL_CONFIDENCE_WEIGHTS.responseQuality * qualityFactor +
      PROVISIONAL_CONFIDENCE_WEIGHTS.formatReliability * formatRelFactor;

    let confidence = scoredResponsesCount > 0 ? computeConfidenceBand(rawConfidenceScore) : 'none';

    // Confidence gating (§10.3): Low confidence estimates cannot claim Level 4 or 5
    if (confidence === 'low' && level > 3) {
      level = 3;
    }

    // Construct scope tagging (§4 / §21 / §22)
    let constructScope: string | undefined;
    if (domainId === 'communication') constructScope = 'written_only';
    else if (domainId === 'interviews') constructScope = 'interview_knowledge_only';
    else if (domainId === 'python') constructScope = 'reasoning_only';

    // Collect domain responses for regression check
    const domainResponses = domainItems
      .map((item) => responseMap.get(item.id))
      .filter((r): r is AssessmentResponse => Boolean(r));

    let finalLevel = level;
    let isProvisional = true;

    // Check Level Regression & Confirmation if existing results are present (§17, §10.4)
    if (existingDomainResults && existingDomainResults.length > 0) {
      const priorDomainHistory = existingDomainResults
        .filter((dr) => dr.domainId === domainId && dr.attemptId !== terminalAttempt.id)
        .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());

      const latestPrior = priorDomainHistory[priorDomainHistory.length - 1];

      if (latestPrior && latestPrior.level > 0) {
        if (finalLevel < latestPrior.level) {
          const regression = checkLevelRegression({
            currentResult: latestPrior,
            newAbilityScore: abilityScore,
            newConfidence: confidence,
            scoredResponses: domainResponses,
            difficultyBands: Array.from(difficultyBandsSet),
            domainItems,
            priorDomainResults: existingDomainResults,
            priorEvidenceLogs: existingEvidenceLogs,
            attemptDate: assessmentDate,
          });

          if (regression.hasRegressed) {
            finalLevel = regression.regressedLevel;
            // Add weakness signal for regression if not already present
            const existingSignal = (existingWeaknessSignals || []).find(
              (ws) => ws.domainId === domainId && ws.status !== 'resolved'
            );
            if (!existingSignal) {
              weaknessSignals.push({
                id: `ws-${domainId}-regression-${terminalAttempt.id}`,
                domainId,
                errorCategory: 'E-REGRESS',
                strength: 3,
                status: 'open',
                firstSeenAt: assessmentDate,
                lastSeenAt: assessmentDate,
                occurrences: 1,
                sourceAttemptIds: [terminalAttempt.id],
              });
            }
          } else {
            // Regression blocked by specification rules: maintain established level
            finalLevel = latestPrior.level;
          }
        }

        // Evaluate confirmation for current level (§10.4)
        const confirmation = checkLevelConfirmation({
          currentLevel: finalLevel,
          currentConfidence: confidence,
          priorDomainResults: existingDomainResults,
          domainId,
        });
        isProvisional = !confirmation.isConfirmed;
      }
    }

    const domainResult: DomainAssessmentResult = {
      domainId,
      abilityScore,
      level: finalLevel,
      confidence,
      status,
      coverage: {
        topicsCovered: topicsSet.size,
        topicsTotal: topicsSet.size,
        competenciesCovered: Array.from(competenciesSet),
        difficultyBands: Array.from(difficultyBandsSet),
      },
      assessmentDate,
      provisional: isProvisional,
      constructScope,
      attemptId: terminalAttempt.id,
      kind: terminalAttempt.kind,
    };

    domainResults.push(domainResult);

    // Evidence Log Emission (§23.1) partitioned by topicId
    if (scoredResponsesCount > 0) {
      const confRating: 1 | 2 | 3 | 4 | 5 = confidence === 'high' ? 5 : confidence === 'medium' ? 3 : 2;

      // Group domain items by topicId so every tested topic gets evidence
      const topicItemsMap = new Map<string, AssessmentItem[]>();
      for (const item of domainItems) {
        const list = topicItemsMap.get(item.topicId) || [];
        list.push(item);
        topicItemsMap.set(item.topicId, list);
      }

      for (const [topicId, topicItems] of topicItemsMap.entries()) {
        const topicResponses = topicItems
          .map((i) => responseMap.get(i.id))
          .filter((r): r is AssessmentResponse => r !== undefined && r.result !== 'unanswered');

        if (topicResponses.length > 0) {
          const totalEarned = topicResponses.reduce((sum, r) => sum + r.scoredCredit, 0);
          const topicScore = Math.round((totalEarned / topicResponses.length) * 100);

          evidenceLogs.push({
            id: `ev-asm-${terminalAttempt.id}-${domainId}-${topicId}`,
            timestamp: assessmentDate,
            sourceType: 'test',
            sourceId: terminalAttempt.id,
            topicId,
            domainId,
            score: topicScore,
            confidence: confRating,
            details: `Assessment: ${terminalAttempt.kind} · topicScore ${topicScore}% · ability ${abilityScore} · level ${finalLevel}`,
          });
        }
      }
    }
  }

  // Projects Domain (Class C - Excluded from baseline per §20)
  if (!isWeekly) {
    domainResults.push({
      domainId: 'projects',
      abilityScore: 0,
      level: 0,
      confidence: 'none',
      status: 'unassessed',
      coverage: {
        topicsCovered: 0,
        topicsTotal: 1,
        competenciesCovered: [],
        difficultyBands: [],
      },
      assessmentDate,
      provisional: true,
      constructScope: 'project_evidence_only',
      attemptId: terminalAttempt.id,
      kind: terminalAttempt.kind,
    });
  }

  // Create Snapshot (§19, §31)
  const snapshot: AssessmentSnapshot = {
    id: `snap-${terminalAttempt.kind}-${terminalAttempt.id}`,
    takenAt: assessmentDate,
    kind: terminalAttempt.kind,
    trigger:
      terminalAttempt.kind === 'weekly_assessment'
        ? 'scheduled'
        : terminalAttempt.kind === 'full_reassessment'
        ? 'manual'
        : 'post_baseline',
    domainResults,
  };

  return {
    attempt: terminalAttempt,
    domainResults,
    weaknessSignals,
    snapshot,
    exposures,
    evidenceLogs,
    calibrationObservations,
    executionRecords: executionRecords.length > 0 ? executionRecords : undefined,
  };
}

// ============================================================================
// Phase D: Profile & Plan Readout Pure Engine Functions
// ============================================================================

export interface InitialPlanStartingPoint {
  domainId: DomainId;
  topicId: string;
  topicName: string;
  reason: string;
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  priorityRank: number;
}

export interface DomainPlanEmphasis {
  domainId: DomainId;
  initialDifficulty: 'easy' | 'medium' | 'hard';
  reviewFrequencyMultiplier: number;
  priorityMultiplier: number;
  recommendedStartingTopicId: string;
  openWeaknessesCount: number;
}

export interface AssessmentPlanInputs {
  startingPoints: InitialPlanStartingPoint[];
  domainEmphases: Record<DomainId, DomainPlanEmphasis>;
  weaknessFocusAreas: Array<{
    id: string;
    domainId: DomainId;
    topicId?: string;
    competency?: string;
    errorCategory: string;
    strength: number;
    recommendedAction: string;
  }>;
  strengths: Array<{
    domainId: DomainId;
    level: number;
    abilityScore: number;
    summary: string;
  }>;
  overallReadinessSummary: {
    assessedDomainsCount: number;
    averageAbility: number;
    primaryFocusDomain: DomainId | null;
  };
}

export interface DomainAssessmentProfile {
  domainId: DomainId;
  name: string;
  category: 'Class A' | 'Class B' | 'Class C';
  level: 0 | 1 | 2 | 3 | 4 | 5;
  levelLabel: string;
  abilityScore: number;
  confidence: 'none' | 'low' | 'medium' | 'high';
  status: 'assessed' | 'partially_assessed' | 'unassessed';
  provisional: boolean;
  constructScope?: string;
  constructScopeNote?: string;
  topicsCovered: number;
  topicsTotal: number;
  competenciesCovered: string[];
  openWeaknessesCount: number;
  history?: Array<{
    attemptId: string;
    kind: AssessmentKind;
    date: string;
    level: number;
    abilityScore: number;
    confidence: 'none' | 'low' | 'medium' | 'high';
  }>;
  recentSignal?: 'regression' | 'confirmation' | 'stable' | 'initial';
  recentSignalReason?: string;
  latestAssessmentKind?: AssessmentKind;
  latestAssessmentDate?: string;
}

export interface DomainStrength {
  domainId: DomainId;
  name: string;
  level: number;
  abilityScore: number;
  confidence: 'medium' | 'high';
  summary: string;
}

export interface DomainWeakness {
  id: string;
  domainId: DomainId;
  topicId?: string;
  competency?: string;
  errorCategory: string;
  strength: 1 | 2 | 3;
  status: 'open' | 'reinforced' | 'resolved';
  recommendedAction: string;
}

export interface AssessmentProfileReadout {
  isAssessed: boolean;
  baselineCompletedAt?: string;
  attemptId?: string;
  latestAttemptKind?: AssessmentKind;
  latestAttemptDate?: string;
  domainProfiles: DomainAssessmentProfile[];
  strengths: DomainStrength[];
  weaknesses: DomainWeakness[];
  overallAbility: number;
  assessedDomainsCount: number;
  hasIncompleteEvidence: boolean;
  planInputs: AssessmentPlanInputs;
  isReassessmentRecommended?: boolean;
  nextReassessmentSuggestedAt?: string;
}

export const DOMAIN_METADATA: Record<DomainId, {
  name: string;
  category: 'Class A' | 'Class B' | 'Class C';
  fallbackTopicId: string;
  fallbackTopicName: string;
  constructScope?: string;
  constructScopeNote?: string;
}> = {
  aptitude: {
    name: 'Aptitude & Mental Ability',
    category: 'Class A',
    fallbackTopicId: 'prep-apt-quant',
    fallbackTopicName: 'Quantitative & Speed Drills',
  },
  dsa: {
    name: 'Data Structures & Algorithms',
    category: 'Class A',
    fallbackTopicId: 'topic-dsa-arrays',
    fallbackTopicName: 'Arrays & Two Pointers',
  },
  python: {
    name: 'Python Programming Core',
    category: 'Class B',
    fallbackTopicId: 'prep-lang',
    fallbackTopicName: 'Python Syntax & Data Structures',
    constructScope: 'reasoning_only',
    constructScopeNote: 'Language syntax, control flow, and data structure reasoning only (no dynamic execution)',
  },
  sql: {
    name: 'SQL & Database Queries',
    category: 'Class A',
    fallbackTopicId: 'prep-sql',
    fallbackTopicName: 'SQL Queries & Relational Joins',
  },
  dbms: {
    name: 'Database Management Systems',
    category: 'Class A',
    fallbackTopicId: 'prep-dbms',
    fallbackTopicName: 'DBMS Architecture, Indexing & ACID',
  },
  oop: {
    name: 'Object-Oriented Programming',
    category: 'Class A',
    fallbackTopicId: 'prep-oop',
    fallbackTopicName: 'OOP Principles, Polymorphism & Design',
  },
  os: {
    name: 'Operating Systems & Concurrency',
    category: 'Class A',
    fallbackTopicId: 'prep-os',
    fallbackTopicName: 'OS Processes, Threads & Memory Management',
  },
  cn: {
    name: 'Computer Networks',
    category: 'Class A',
    fallbackTopicId: 'prep-cn',
    fallbackTopicName: 'Network Layers, Protocols & TCP/IP',
  },
  communication: {
    name: 'Professional Communication',
    category: 'Class B',
    fallbackTopicId: 'prep-comm',
    fallbackTopicName: 'Written Clarity & Reading Comprehension',
    constructScope: 'written_only',
    constructScopeNote: 'Written grammar, vocabulary, and reading comprehension only (does not evaluate spoken presence)',
  },
  interviews: {
    name: 'Technical & Behavioral Interviews',
    category: 'Class B',
    fallbackTopicId: 'prep-interview-tech',
    fallbackTopicName: 'Technical Interview Problem-Solving & STAR',
    constructScope: 'interview_knowledge_only',
    constructScopeNote: 'Interview knowledge, framework comprehension, and response structuring only (does not evaluate live interactive presence)',
  },
  projects: {
    name: 'Engineering Projects Portfolio',
    category: 'Class C',
    fallbackTopicId: 'topic-proj-rest',
    fallbackTopicName: 'REST APIs & Full-Stack Engineering Defense',
    constructScope: 'project_evidence_only',
    constructScopeNote: 'Class C: Excluded from automated baseline. Capability levels are established only through real architectural defense and code in Project Lab.',
  },
};

export const LEVEL_LABELS: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: 'Level 0 — No demonstrated capability / Unassessed',
  1: 'Level 1 — Beginner',
  2: 'Level 2 — Basic',
  3: 'Level 3 — Intermediate',
  4: 'Level 4 — Job Ready',
  5: 'Level 5 — Strong',
};

/**
 * Returns recommended difficulty for practice based on assessed Level (§16 ladder)
 */
export function getRecommendedDifficulty(level: number): 'easy' | 'medium' | 'hard' {
  if (level <= 2) return 'easy';
  if (level === 3) return 'medium';
  return 'hard';
}

/**
 * Generates an actionable remediation recommendation based on error category and competency
 */
export function getRemediationAction(errorCategory: string, competency: string = 'general'): string {
  switch (errorCategory) {
    case 'E-CONCEPT':
      return `Revise fundamental concepts and rules for ${competency}.`;
    case 'E-APPLY':
      return `Practice multi-step scenario application problems in ${competency}.`;
    case 'E-PATTERN':
      return `Study recognition cues and pattern matching heuristics for ${competency}.`;
    case 'E-EXEC':
      return `Practice careful code execution and boundary checks in ${competency}.`;
    case 'E-SPEED':
      return `Work through timed practice sets to build fluency in ${competency}.`;
    case 'E-CORNER':
      return `Focus on edge cases, empty states, and boundary conditions for ${competency}.`;
    case 'E-SYNTAX':
      return `Drill language syntax rules and operator semantics in ${competency}.`;
    default:
      return `Targeted review and focused practice exercises in ${competency}.`;
  }
}

/**
 * Converts the baseline assessment results into deterministic initial planning inputs (§26.1).
 * Shifts starting point, initial difficulty, review frequency, priority weights, and weekly emphasis
 * without modifying or rewriting the master curriculum.
 */
export function generateAssessmentPlanInputs(
  domainResults: DomainAssessmentResult[] = [],
  weaknessSignals: WeaknessSignal[] = []
): AssessmentPlanInputs {
  const allDomainIds: DomainId[] = [
    'aptitude', 'dsa', 'python', 'sql', 'dbms',
    'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
  ];

  const domainResultMap = new Map<DomainId, DomainAssessmentResult>();
  for (const dr of domainResults) {
    domainResultMap.set(dr.domainId, dr);
  }

  const domainWeaknessCount: Record<DomainId, number> = {
    aptitude: 0, dsa: 0, python: 0, sql: 0, dbms: 0,
    oop: 0, os: 0, cn: 0, communication: 0, interviews: 0, projects: 0,
  };
  for (const ws of weaknessSignals) {
    if (ws.status === 'open') {
      domainWeaknessCount[ws.domainId] = (domainWeaknessCount[ws.domainId] || 0) + 1;
    }
  }

  const domainEmphases: Record<DomainId, DomainPlanEmphasis> = {} as Record<DomainId, DomainPlanEmphasis>;
  const startingPoints: InitialPlanStartingPoint[] = [];
  const strengths: Array<{ domainId: DomainId; level: number; abilityScore: number; summary: string }> = [];

  let totalAssessedAbility = 0;
  let assessedCount = 0;

  for (const domainId of allDomainIds) {
    const dr = domainResultMap.get(domainId);
    const meta = DOMAIN_METADATA[domainId];
    const level = dr ? dr.level : 0;
    const ability = dr ? dr.abilityScore : 0;
    const openWs = domainWeaknessCount[domainId] || 0;

    if (domainId !== 'projects' && dr && dr.status !== 'unassessed') {
      totalAssessedAbility += ability;
      assessedCount++;
    }

    const initialDifficulty = getRecommendedDifficulty(level);

    let reviewFrequencyMultiplier = 1.0;
    let priorityMultiplier = 1.0;

    if (domainId !== 'projects') {
      if (openWs > 0 || ability < 40) {
        reviewFrequencyMultiplier = 1.5;
        priorityMultiplier = 1.3;
      } else if (level === 3) {
        reviewFrequencyMultiplier = 1.2;
        priorityMultiplier = 1.1;
      } else if (level >= 4) {
        reviewFrequencyMultiplier = 1.0;
        priorityMultiplier = 0.85;
      }
    }

    const domainWeaknesses = weaknessSignals.filter((w) => w.domainId === domainId && w.status === 'open');
    const startingTopicId = domainWeaknesses[0]?.topicId || meta.fallbackTopicId;

    domainEmphases[domainId] = {
      domainId,
      initialDifficulty,
      reviewFrequencyMultiplier,
      priorityMultiplier,
      recommendedStartingTopicId: startingTopicId,
      openWeaknessesCount: openWs,
    };

    if (dr && level >= 4 && (dr.confidence === 'medium' || dr.confidence === 'high')) {
      strengths.push({
        domainId,
        level,
        abilityScore: ability,
        summary: `Demonstrated ${LEVEL_LABELS[level]} with ${dr.confidence} confidence in ${meta.name}.`,
      });
    }

    let reason = '';
    if (domainId === 'projects') {
      reason = 'Independent architectural defense and code implementation in Project Lab.';
    } else if (openWs > 0) {
      reason = `Diagnosed ${openWs} open weakness signal${openWs > 1 ? 's' : ''}; target fundamental remediation first.`;
    } else if (level <= 1) {
      reason = 'Foundational domain coverage needed to establish core capability.';
    } else if (level === 2 || level === 3) {
      reason = 'Standard progression and consistency drills.';
    } else {
      reason = 'Advanced practice and spaced retention maintenance.';
    }

    startingPoints.push({
      domainId,
      topicId: startingTopicId,
      topicName: meta.fallbackTopicName,
      reason,
      recommendedDifficulty: initialDifficulty,
      priorityRank: 0,
    });
  }

  // Sort starting points: lowest ability / open weaknesses prioritized
  startingPoints.sort((a, b) => {
    if (a.domainId === 'projects') return 1;
    if (b.domainId === 'projects') return -1;

    const empA = domainEmphases[a.domainId];
    const empB = domainEmphases[b.domainId];

    if (empB.priorityMultiplier !== empA.priorityMultiplier) {
      return empB.priorityMultiplier - empA.priorityMultiplier;
    }
    const drA = domainResultMap.get(a.domainId)?.abilityScore ?? 0;
    const drB = domainResultMap.get(b.domainId)?.abilityScore ?? 0;
    return drA - drB;
  });

  startingPoints.forEach((sp, idx) => {
    sp.priorityRank = idx + 1;
  });

  const weaknessFocusAreas = weaknessSignals
    .filter((ws) => ws.status === 'open')
    .map((ws) => ({
      id: ws.id,
      domainId: ws.domainId,
      topicId: ws.topicId,
      competency: ws.competency,
      errorCategory: ws.errorCategory,
      strength: ws.strength,
      recommendedAction: getRemediationAction(ws.errorCategory, ws.competency || 'general'),
    }));

  const averageAbility = assessedCount > 0 ? Math.round(totalAssessedAbility / assessedCount) : 0;
  const primaryFocusDomain = startingPoints.length > 0 && startingPoints[0].domainId !== 'projects'
    ? startingPoints[0].domainId
    : null;

  return {
    startingPoints,
    domainEmphases,
    weaknessFocusAreas,
    strengths,
    overallReadinessSummary: {
      assessedDomainsCount: assessedCount,
      averageAbility,
      primaryFocusDomain,
    },
  };
}

/**
 * Derives a full authoritative AssessmentProfileReadout from current AssessmentState.
 * Surfaces all 11 domains, distinguishes capability from confidence, marks construct scope,
 * and maintains Level 0 semantics. Handles missing or empty assessment state safely.
 */
export function deriveAssessmentProfileReadout(
  assessmentState?: AssessmentState
): AssessmentProfileReadout {
  const allDomainIds: DomainId[] = [
    'aptitude', 'dsa', 'python', 'sql', 'dbms',
    'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
  ];

  const allCompletedAttempts = (assessmentState?.attempts || []).filter(
    (a: AssessmentAttempt) => a.status === 'submitted' || a.status === 'auto_submitted'
  );
  const baselineAttempt = allCompletedAttempts.find((a: AssessmentAttempt) => a.kind === 'diagnostic_assessment');
  const latestAttempt = allCompletedAttempts[allCompletedAttempts.length - 1];

  const completedAttemptIds = new Set(allCompletedAttempts.map((a) => a.id));
  const candidateDomainResults = (assessmentState?.domainResults || []).filter(
    (dr) => completedAttemptIds.size === 0 || completedAttemptIds.has(dr.attemptId)
  );

  const domainResultMap = new Map<DomainId, DomainAssessmentResult>();
  for (const domainId of allDomainIds) {
    const domainHistory = candidateDomainResults
      .filter((dr) => dr.domainId === domainId)
      .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());
    const dr = domainHistory[domainHistory.length - 1];
    if (dr) {
      domainResultMap.set(domainId, dr);
    }
  }

  const weaknessSignals = assessmentState?.weaknessSignals || [];
  const openWeaknessesPerDomain: Record<DomainId, number> = {
    aptitude: 0, dsa: 0, python: 0, sql: 0, dbms: 0,
    oop: 0, os: 0, cn: 0, communication: 0, interviews: 0, projects: 0,
  };
  for (const ws of weaknessSignals) {
    if (ws.status === 'open' && ws.domainId in openWeaknessesPerDomain) {
      openWeaknessesPerDomain[ws.domainId as DomainId] = (openWeaknessesPerDomain[ws.domainId as DomainId] || 0) + 1;
    }
  }

  let totalAssessedAbility = 0;
  let assessedCount = 0;
  let hasIncomplete = false;

  const domainProfiles: DomainAssessmentProfile[] = allDomainIds.map((domainId) => {
    const meta = DOMAIN_METADATA[domainId];
    const openCount = openWeaknessesPerDomain[domainId] || 0;

    // Hard Rule: Projects is ALWAYS Level 0 / Unassessed / confidence none
    if (domainId === 'projects') {
      return {
        domainId: 'projects',
        name: meta.name,
        category: 'Class C',
        level: 0,
        levelLabel: LEVEL_LABELS[0],
        abilityScore: 0,
        confidence: 'none',
        status: 'unassessed',
        provisional: true,
        constructScope: meta.constructScope,
        constructScopeNote: meta.constructScopeNote,
        topicsCovered: 0,
        topicsTotal: 1,
        competenciesCovered: [],
        openWeaknessesCount: 0,
        recentSignal: 'initial',
      };
    }

    const domainHistory = candidateDomainResults
      .filter((dr) => dr.domainId === domainId)
      .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());

    const dr = domainHistory[domainHistory.length - 1];

    if (!dr || dr.status === 'unassessed') {
      hasIncomplete = true;
      return {
        domainId,
        name: meta.name,
        category: meta.category,
        level: 0,
        levelLabel: LEVEL_LABELS[0],
        abilityScore: 0,
        confidence: 'none',
        status: 'unassessed',
        provisional: true,
        constructScope: meta.constructScope,
        constructScopeNote: meta.constructScopeNote,
        topicsCovered: 0,
        topicsTotal: 1,
        competenciesCovered: [],
        openWeaknessesCount: openCount,
        recentSignal: 'initial',
      };
    }

    if (dr.status === 'partially_assessed') {
      hasIncomplete = true;
    }

    totalAssessedAbility += dr.abilityScore;
    assessedCount++;

    let recentSignal: 'regression' | 'confirmation' | 'stable' | 'initial' = 'initial';
    let recentSignalReason: string | undefined;

    if (domainHistory.length >= 2) {
      const priorDr = domainHistory[domainHistory.length - 2];
      if (dr.level < priorDr.level) {
        recentSignal = 'regression';
        recentSignalReason = `Level regressed from Level ${priorDr.level} to Level ${dr.level} following assessment`;
      } else if (!dr.provisional && priorDr.provisional) {
        recentSignal = 'confirmation';
        recentSignalReason = `Level ${dr.level} confirmed by consistent subsequent assessment observations`;
      } else {
        recentSignal = 'stable';
      }
    }

    const history = domainHistory.map((h) => ({
      attemptId: h.attemptId,
      kind: h.kind,
      date: h.assessmentDate,
      level: h.level,
      abilityScore: h.abilityScore,
      confidence: h.confidence,
    }));

    return {
      domainId,
      name: meta.name,
      category: meta.category,
      level: dr.level,
      levelLabel: LEVEL_LABELS[dr.level],
      abilityScore: dr.abilityScore,
      confidence: dr.confidence,
      status: dr.status,
      provisional: dr.provisional,
      constructScope: dr.constructScope || meta.constructScope,
      constructScopeNote: meta.constructScopeNote,
      topicsCovered: dr.coverage?.topicsCovered ?? 0,
      topicsTotal: dr.coverage?.topicsTotal ?? 1,
      competenciesCovered: dr.coverage?.competenciesCovered ?? [],
      openWeaknessesCount: openCount,
      history,
      recentSignal,
      recentSignalReason,
      latestAssessmentKind: dr.kind,
      latestAssessmentDate: dr.assessmentDate,
    };
  });

  const domainResultsList = Array.from(domainResultMap.values());
  const planInputs = generateAssessmentPlanInputs(domainResultsList, weaknessSignals);

  const strengths: DomainStrength[] = domainProfiles
    .filter((dp) => dp.domainId !== 'projects' && dp.level >= 4 && (dp.confidence === 'medium' || dp.confidence === 'high'))
    .map((dp) => ({
      domainId: dp.domainId,
      name: dp.name,
      level: dp.level,
      abilityScore: dp.abilityScore,
      confidence: dp.confidence as 'medium' | 'high',
      summary: `Demonstrated ${dp.levelLabel} in ${dp.name} with ${dp.confidence} confidence.`,
    }));

  const weaknesses: DomainWeakness[] = weaknessSignals.map((ws: WeaknessSignal) => ({
    id: ws.id,
    domainId: ws.domainId,
    topicId: ws.topicId,
    competency: ws.competency,
    errorCategory: ws.errorCategory,
    strength: ws.strength,
    status: ws.status,
    recommendedAction: getRemediationAction(ws.errorCategory, ws.competency || 'general'),
  }));

  const isAssessed = Boolean((baselineAttempt || latestAttempt) && assessedCount > 0);
  const overallAbility = assessedCount > 0 ? Math.round(totalAssessedAbility / assessedCount) : 0;

  const comprehensiveAttempts = allCompletedAttempts.filter(
    (a) => a.kind === 'diagnostic_assessment' || a.kind === 'full_reassessment'
  );
  const lastComprehensive = comprehensiveAttempts[comprehensiveAttempts.length - 1];
  let isReassessmentRecommended = false;
  let nextReassessmentSuggestedAt: string | undefined;

  if (lastComprehensive?.endedAt) {
    const lastDateMs = new Date(lastComprehensive.endedAt).getTime();
    const elapsedDays = (Date.now() - lastDateMs) / (24 * 60 * 60 * 1000);
    // Recommended cadence 6-8 weeks (42-56 days)
    if (elapsedDays >= 42) {
      isReassessmentRecommended = true;
    }
    nextReassessmentSuggestedAt = new Date(lastDateMs + 42 * 24 * 60 * 60 * 1000).toISOString();
  }

  return {
    isAssessed,
    baselineCompletedAt: baselineAttempt?.endedAt || latestAttempt?.endedAt,
    attemptId: latestAttempt?.id,
    latestAttemptKind: latestAttempt?.kind,
    latestAttemptDate: latestAttempt?.endedAt,
    domainProfiles,
    strengths,
    weaknesses,
    overallAbility,
    assessedDomainsCount: assessedCount,
    hasIncompleteEvidence: hasIncomplete,
    planInputs,
    isReassessmentRecommended,
    nextReassessmentSuggestedAt,
  };
}

// ============================================================================
// Phase E: Sunday Adaptive Mini Test Engine (§15, §16, §18)
// ============================================================================

export const SUNDAY_TEST_CONSTANTS = {
  MAX_DURATION_MINUTES: 90,
  HARD_LIMIT_SECONDS: 5400,
  ESTIMATED_TIME_BUDGET_MINUTES: 78, // 90 - 12 min buffer
  SELECTION_BUDGET_MINUTES: 78,
  BUFFER_MINUTES: 12,
  TARGET_RATIOS: {
    weakness: 0.60,
    recent: 0.20,
    retention: 0.20,
  },
  CONCENTRATION_CAPS: {
    maxDomainShare: 0.40,
    maxTopicShare: 0.35,
    maxCompetencyShare: 0.50,
  },
  MIN_DISTINCT_DOMAINS: 6,
  EXPOSURE_SUPPRESSION_DAYS: 14,
  REPEAT_WEIGHT_WINDOW_DAYS: 60,
  MAX_ESTIMATION_USES: 3,
  SWING_CAP_RATIO: 0.50,
  PRIORITY_WEIGHTS: {
    P1: 0.30, // unresolved remediation
    P2: 0.22, // high-confidence weakness
    P3: 0.16, // repeated weakness
    P4: 0.12, // recent learning retrieval
    P5: 0.08, // retention coverage
    P6: 0.06, // stale evidence
    P7: 0.06, // assessment balance
  },
} as const;

/**
 * Checks whether the learner is eligible to take Sunday mini-tests.
 * Prerequisite: Baseline diagnostic assessment must be completed (§18, DECIDED 5).
 * If baseline has not been completed, Sunday tests are suppressed and obligation stays none.
 */
export function isSundayTestEligible(assessmentState?: AssessmentState): boolean {
  if (!assessmentState) return false;
  return (assessmentState.attempts || []).some(
    (a) => a.kind === 'diagnostic_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
  );
}

/**
 * Checks pending obligation for Sunday mini test (§18).
 * Missed Sundays roll forward as a single obligation; count NEVER exceeds 1.
 */
export function checkSundayObligation(
  assessmentState?: AssessmentState,
  currentDate: string = new Date().toISOString()
): { pendingSunday: boolean; reason: string } {
  if (!isSundayTestEligible(assessmentState)) {
    return { pendingSunday: false, reason: 'Baseline diagnostic assessment has not been completed.' };
  }

  // Already pending in profile -> rolls forward as single obligation (§18)
  if (assessmentState?.profile?.pendingSunday) {
    return { pendingSunday: true, reason: 'Sunday mini-test obligation is pending.' };
  }

  const dateObj = new Date(currentDate);
  const isSunday = dateObj.getDay() === 0;

  if (isSunday) {
    const todayISO = currentDate.split('T')[0];
    const completedToday = (assessmentState?.attempts || []).some(
      (a) => a.kind === 'weekly_assessment' &&
             (a.status === 'submitted' || a.status === 'auto_submitted') &&
             a.endedAt?.startsWith(todayISO)
    );
    if (!completedToday) {
      return { pendingSunday: true, reason: 'Sunday mini-test is scheduled for today.' };
    }
  }

  return { pendingSunday: false, reason: 'No pending Sunday obligation.' };
}

/**
 * Validates whether an individual assessment item is eligible for inclusion in a Sunday mini test.
 * Enforces §13 exposure rules and §15.2 constraints:
 * - Must belong to assessment pool (origin === 'assessment')
 * - Projects domain excluded per §20
 * - Retired items excluded
 * - Pool eligibility matches 'weekly' (or fallback to 'baseline' if no weekly items authored)
 * - Excludes items seen in the last 14 days (§15.2 recent exposure rule)
 * - Excludes estimation-exhausted items (exposureCount >= 3 or estimationUses >= 3)
 */
export function isItemEligibleForSundayTest(
  item: AssessmentItem,
  exposure?: AssessmentItemExposure,
  currentDate?: string,
  candidatePool?: AssessmentItem[]
): boolean {
  if (item.origin !== 'assessment') return false;
  if (item.domainId === 'projects') return false;
  if ((item as { retired?: boolean }).retired) return false;

  // Bank eligibility: if any item in candidatePool is tagged 'weekly', enforce 'weekly'
  const poolHasWeekly = candidatePool?.some((i) => i.eligibleFor.includes('weekly')) ?? false;
  if (poolHasWeekly) {
    if (!item.eligibleFor.includes('weekly')) return false;
  } else {
    if (!item.eligibleFor.includes('weekly') && !item.eligibleFor.includes('baseline')) {
      return false;
    }
  }

  // Exposure restrictions (§13.3 & §15.2)
  if (exposure) {
    if (exposure.eligibleForFutureEstimation === false) return false;
    if (exposure.exposureCount >= 3 || exposure.estimationUses >= 2) return false;

    // Recent exposure rule: Any item seen in the last 14 days is ineligible
    if (exposure.lastSeenAt && currentDate) {
      const currentMs = new Date(currentDate).getTime();
      const lastSeenMs = new Date(exposure.lastSeenAt).getTime();
      const daysSinceSeen = (currentMs - lastSeenMs) / (1000 * 3600 * 24);
      if (daysSinceSeen < 14) return false;
    }
  }

  return true;
}

/**
 * Calculates item estimation weight applying the §13.3 repeat discount rules:
 * - 1st use: Full weight (1.0)
 * - 2nd use within 60 days: Weight ×0.5
 * - ≥3rd use: 0.0 (excluded from estimation)
 */
export function calculateItemEstimationWeight(
  item: AssessmentItem,
  exposure?: AssessmentItemExposure,
  currentDate?: string
): number {
  let multiplier = 1.0;

  if (exposure) {
    if (exposure.exposureCount >= 2 || exposure.estimationUses >= 2) {
      multiplier = 0.0;
    } else if (exposure.exposureCount === 1) {
      if (exposure.lastSeenAt && currentDate) {
        const days = (new Date(currentDate).getTime() - new Date(exposure.lastSeenAt).getTime()) / (1000 * 3600 * 24);
        multiplier = days <= 60 ? 0.5 : 0.5;
      } else {
        multiplier = 0.5;
      }
    }
  }

  const baseWeight = getProvisionalDifficultyWeight(item.difficulty) * (item.scoring.weight ?? 1);
  return baseWeight * multiplier;
}

export interface SundayScoringContext {
  domainResults: Map<DomainId, DomainAssessmentResult>;
  openWeaknesses: WeaknessSignal[];
  historicalWeaknesses: WeaknessSignal[];
  recentCompetencies: Set<string>;
  previousSundayCompetencies: Set<string>;
  lastTwoSundaysCompetencies: Set<string>;
  domainCandidateCounts: Map<DomainId, number>;
  totalCandidates: number;
  currentDate: string;
}

/**
 * Calculates deterministic priority score P1–P7 per §16.2.
 * priorityScore = 0.30·P1 + 0.22·P2 + 0.16·P3 + 0.12·P4 + 0.08·P5 + 0.06·P6 + 0.06·P7
 */
export function calculateSundayPriorityScore(
  item: AssessmentItem,
  context: SundayScoringContext
): {
  priorityScore: number;
  components: { P1: number; P2: number; P3: number; P4: number; P5: number; P6: number; P7: number };
  primaryCategory: 'weakness' | 'recent' | 'retention';
  reason: string;
} {
  // P1: Unresolved remediation (0.30)
  const matchingOpenWeakness = context.openWeaknesses.find(
    (ws) => ws.domainId === item.domainId && (ws.competency === item.competency || ws.topicId === item.topicId)
  );
  let P1 = matchingOpenWeakness ? 1.0 : 0.0;

  // Hysteresis (§16.3): If targeted in last two Sunday tests, demote P1 by 0.5 unless new error category appeared
  if (P1 > 0 && context.lastTwoSundaysCompetencies.has(item.competency)) {
    P1 = 0.5;
  }


  // P2: High-confidence weakness (0.22)
  const domainRes = context.domainResults.get(item.domainId);
  const isWeakDomain = (domainRes && domainRes.level <= 2) || matchingOpenWeakness !== undefined;
  const isHighConfidence = domainRes ? (domainRes.confidence === 'medium' || domainRes.confidence === 'high') : false;
  const P2 = isWeakDomain && isHighConfidence ? 1.0 : 0.0;

  // P3: Repeated weakness (0.16) - requires >= 2 supporting occurrences in history (§16.3)
  const historicalMatch = context.historicalWeaknesses.find(
    (ws) => ws.domainId === item.domainId && (ws.competency === item.competency || ws.topicId === item.topicId)
  );
  const P3 = historicalMatch && historicalMatch.occurrences >= 2 ? 1.0 : 0.0;

  // P4: Recent learning needing retrieval (0.12)
  const P4 = context.recentCompetencies.has(item.competency) ? 1.0 : 0.0;

  // P5: Retention coverage (0.08) - strong/medium domain (level >= 3)
  const isProficientDomain = domainRes && domainRes.level >= 3;
  let P5 = 0.0;
  if (isProficientDomain) {
    if (domainRes.assessmentDate) {
      const daysSinceAssessed = (new Date(context.currentDate).getTime() - new Date(domainRes.assessmentDate).getTime()) / (1000 * 3600 * 24);
      if (daysSinceAssessed > 14) P5 = 1.0;
    } else {
      P5 = 1.0;
    }
  }

  // P6: Stale / decaying evidence (0.06) - age > 30 days
  let P6 = 0.0;
  if (domainRes?.assessmentDate) {
    const daysSince = (new Date(context.currentDate).getTime() - new Date(domainRes.assessmentDate).getTime()) / (1000 * 3600 * 24);
    if (daysSince > 30) P6 = 1.0;
  }

  // P7: Assessment balance (0.06) - normalized candidate balance
  const countInDomain = context.domainCandidateCounts.get(item.domainId) || 1;
  const balanceRaw = context.totalCandidates > 0 ? 1.0 - (countInDomain / context.totalCandidates) : 0.5;
  const P7 = Math.max(0, Math.min(1, balanceRaw));

  const rawScore =
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P1 * P1 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P2 * P2 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P3 * P3 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P4 * P4 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P5 * P5 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P6 * P6 +
    SUNDAY_TEST_CONSTANTS.PRIORITY_WEIGHTS.P7 * P7;

  const priorityScore = Math.round(rawScore * 10000) / 10000;

  let primaryCategory: 'weakness' | 'recent' | 'retention' = 'retention';
  let reason = `Balanced domain sampling across syllabus for ${DOMAIN_METADATA[item.domainId]?.name ?? item.domainId}`;

  if (P1 > 0 || P2 > 0 || P3 > 0) {
    primaryCategory = 'weakness';
    if (P1 > 0) {
      reason = `Targeted unresolved weakness remediation in ${item.competency}`;
    } else if (P2 > 0) {
      reason = `High-confidence diagnosed weakness check in ${DOMAIN_METADATA[item.domainId]?.name ?? item.domainId}`;
    } else {
      reason = `Repeated error pattern review in ${item.competency}`;
    }
  } else if (P4 > 0) {
    primaryCategory = 'recent';
    reason = `Active retrieval check for recently practiced material in ${item.competency}`;
  } else if (P5 > 0 || P6 > 0) {
    primaryCategory = 'retention';
    reason = `Retention decay check for demonstrated proficiency in ${DOMAIN_METADATA[item.domainId]?.name ?? item.domainId}`;
  }

  return {
    priorityScore,
    components: { P1, P2, P3, P4, P5, P6, P7 },
    primaryCategory,
    reason,
  };
}

export interface SundaySelectionOptions {
  assessmentState: AssessmentState;
  allItems?: AssessmentItem[];
  currentDate?: string;
  seed?: string;
  recentEvidenceCompetencies?: string[];
  previousSundayCompetencies?: Set<string>;
  targetMaxMinutes?: number;
}


export interface SundaySelectionResult {
  selectedItemIds: string[];
  selectedItems: AssessmentItem[];
  totalEstimatedMinutes: number;
  domainBreakdown: Record<DomainId, number>;
  targetBreakdown: {
    weaknessCount: number;
    recentCount: number;
    retentionCount: number;
  };
  selectionExceptions: string[];
  itemReasons: Record<string, string>;
}

/**
 * Deterministic seeded random number generator (Linear Congruential Generator).
 */
function createSeededPRNG(seedStr: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Adaptive Selection Algorithm for Sunday Mini Tests (§15 & §16).
 * Selects items dynamically under 78-minute estimated budget, enforcing:
 * - 60% weakness / 20% recent / 20% retention mix
 * - Domain coverage floor (>= 1 item per eligible non-unassessed domain)
 * - Weakness domain floor (>= 2 items per weakness domain)
 * - Concentration caps (<= 40% domain, <= 35% topic, <= 50% competency)
 * - Swing cap (<= 50% from competencies targeted in previous Sunday)
 * - Minimum 6 distinct domains where candidate supply allows
 * - Deterministic tie-breaking and seeded item sequencing
 */
export function selectSundayTestItems(options: SundaySelectionOptions): SundaySelectionResult {
  const {
    assessmentState,
    allItems = BASELINE_ASSESSMENT_ITEMS,
    currentDate = new Date().toISOString(),
    seed = `sunday-${Date.now()}`,
    recentEvidenceCompetencies = [],
    targetMaxMinutes = SUNDAY_TEST_CONSTANTS.ESTIMATED_TIME_BUDGET_MINUTES,
  } = options;

  if (!isSundayTestEligible(assessmentState)) {
    throw new Error('Baseline diagnostic assessment must be completed before selecting Sunday mini test items.');
  }

  const selectionExceptions: string[] = [];
  const domainResultMap = new Map<DomainId, DomainAssessmentResult>();
  for (const dr of assessmentState.domainResults || []) {
    domainResultMap.set(dr.domainId, dr);
  }

  const openWeaknesses = (assessmentState.weaknessSignals || []).filter((ws) => ws.status === 'open' || ws.status === 'reinforced');
  const historicalWeaknesses = assessmentState.weaknessSignals || [];

  // Identify competencies targeted in previous Sunday attempts
  const weeklyAttempts = (assessmentState.attempts || []).filter(
    (a) => a.kind === 'weekly_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
  );
  const previousSunday = weeklyAttempts[weeklyAttempts.length - 1];
  const secondPreviousSunday = weeklyAttempts[weeklyAttempts.length - 2];

  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  const previousSundayCompetencies = new Set<string>(options.previousSundayCompetencies || []);
  if (previousSunday) {
    for (const id of previousSunday.selectedItemIds) {
      const item = itemMap.get(id);
      if (item) previousSundayCompetencies.add(item.competency);
    }
  }


  const lastTwoSundaysCompetencies = new Set<string>(previousSundayCompetencies);
  if (secondPreviousSunday) {
    for (const id of secondPreviousSunday.selectedItemIds) {
      const item = itemMap.get(id);
      if (item) lastTwoSundaysCompetencies.add(item.competency);
    }
  }

  // Filter eligible candidates
  const eligibleCandidates = allItems.filter((item) =>
    isItemEligibleForSundayTest(item, assessmentState.exposures?.[item.id], currentDate, allItems)
  );

  if (eligibleCandidates.length === 0) {
    selectionExceptions.push('candidate_pool_empty');
    return {
      selectedItemIds: [],
      selectedItems: [],
      totalEstimatedMinutes: 0,
      domainBreakdown: {} as Record<DomainId, number>,
      targetBreakdown: { weaknessCount: 0, recentCount: 0, retentionCount: 0 },
      selectionExceptions,
      itemReasons: {},
    };
  }

  // Count candidates per domain
  const domainCandidateCounts = new Map<DomainId, number>();
  for (const item of eligibleCandidates) {
    domainCandidateCounts.set(item.domainId, (domainCandidateCounts.get(item.domainId) || 0) + 1);
  }

  const scoringContext: SundayScoringContext = {
    domainResults: domainResultMap,
    openWeaknesses,
    historicalWeaknesses,
    recentCompetencies: new Set(recentEvidenceCompetencies),
    previousSundayCompetencies,
    lastTwoSundaysCompetencies,
    domainCandidateCounts,
    totalCandidates: eligibleCandidates.length,
    currentDate,
  };

  // Score all eligible candidates
  interface ScoredCandidate {
    item: AssessmentItem;
    priorityScore: number;
    primaryCategory: 'weakness' | 'recent' | 'retention';
    reason: string;
    exposureCount: number;
  }

  const scoredCandidates: ScoredCandidate[] = eligibleCandidates.map((item) => {
    const scored = calculateSundayPriorityScore(item, scoringContext);
    const exposure = assessmentState.exposures?.[item.id];
    return {
      item,
      priorityScore: scored.priorityScore,
      primaryCategory: scored.primaryCategory,
      reason: scored.reason,
      exposureCount: exposure?.exposureCount ?? 0,
    };
  });

  // Sort descending by priorityScore -> ascending by exposureCount -> ascending by item.id

  scoredCandidates.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (a.exposureCount !== b.exposureCount) {
      return a.exposureCount - b.exposureCount; // novel item preference
    }
    return a.item.id.localeCompare(b.item.id);
  });

  const selectedItems: AssessmentItem[] = [];
  const selectedItemIds = new Set<string>();
  const itemReasons: Record<string, string> = {};
  let totalEstimatedMinutes = 0;

  const domainCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const competencyCounts: Record<string, number> = {};
  let prevSundayTargetedCount = 0;

  const canAddItem = (cand: ScoredCandidate, isFloorPass: boolean = false): boolean => {
    if (selectedItemIds.has(cand.item.id)) return false;
    if (totalEstimatedMinutes + cand.item.estimatedMinutes > targetMaxMinutes) return false;

    if (isFloorPass) return true; // Floors bypass concentration caps up to 2 items

    const nextTotal = selectedItems.length + 1;
    if (nextTotal > 2) {
      const nextDomainCount = (domainCounts[cand.item.domainId] || 0) + 1;
      if (nextDomainCount / nextTotal > SUNDAY_TEST_CONSTANTS.CONCENTRATION_CAPS.maxDomainShare) {
        return false;
      }

      const nextTopicCount = (topicCounts[cand.item.topicId] || 0) + 1;
      if (nextTopicCount / nextTotal > SUNDAY_TEST_CONSTANTS.CONCENTRATION_CAPS.maxTopicShare) {
        return false;
      }

      const nextCompCount = (competencyCounts[cand.item.competency] || 0) + 1;
      if (nextCompCount / nextTotal > SUNDAY_TEST_CONSTANTS.CONCENTRATION_CAPS.maxCompetencyShare) {
        return false;
      }

      // Swing cap (§16.3): no more than 50% from competencies targeted in previous Sunday
      if (previousSundayCompetencies.has(cand.item.competency)) {
        if ((prevSundayTargetedCount + 1) / nextTotal > SUNDAY_TEST_CONSTANTS.SWING_CAP_RATIO) {
          return false;
        }
      }
    }

    return true;
  };

  const categoryCounts: Record<'weakness' | 'recent' | 'retention', number> = {
    weakness: 0,
    recent: 0,
    retention: 0,
  };

  const addItem = (cand: ScoredCandidate) => {
    selectedItems.push(cand.item);
    selectedItemIds.add(cand.item.id);
    totalEstimatedMinutes += cand.item.estimatedMinutes;
    itemReasons[cand.item.id] = cand.reason;

    domainCounts[cand.item.domainId] = (domainCounts[cand.item.domainId] || 0) + 1;
    topicCounts[cand.item.topicId] = (topicCounts[cand.item.topicId] || 0) + 1;
    competencyCounts[cand.item.competency] = (competencyCounts[cand.item.competency] || 0) + 1;
    categoryCounts[cand.primaryCategory] = (categoryCounts[cand.primaryCategory] || 0) + 1;

    if (previousSundayCompetencies.has(cand.item.competency)) {
      prevSundayTargetedCount++;
    }
  };

  // Phase 1: Guaranteed Coverage Floors (§15.2)
  // Floor A: Domains with open weakness signals get >= 2 items where supply allows
  const weaknessDomains = Array.from(new Set(openWeaknesses.map((ws) => ws.domainId))).filter((d) => d !== 'projects');
  for (const domainId of weaknessDomains) {
    const domainCandidates = scoredCandidates.filter((c) => c.item.domainId === domainId);
    let added = 0;
    for (const cand of domainCandidates) {
      if (added >= 2) break;
      if (canAddItem(cand, true)) {
        addItem(cand);
        added++;
      }
    }
    if (added < 2 && domainCandidates.length < 2) {
      selectionExceptions.push(`weakness_floor_exhausted:${domainId}`);
    }
  }

  // Floor B: Every eligible non-unassessed domain gets >= 1 item where supply allows
  const nonUnassessedDomains: DomainId[] = [
    'aptitude', 'dsa', 'python', 'sql', 'dbms',
    'oop', 'os', 'cn', 'communication', 'interviews'
  ];
  for (const domainId of nonUnassessedDomains) {
    if ((domainCounts[domainId] || 0) >= 1) continue;
    const cand = scoredCandidates.find((c) => c.item.domainId === domainId && canAddItem(c, true));
    if (cand) {
      addItem(cand);
    } else {
      selectionExceptions.push(`domain_floor_exhausted:${domainId}`);
    }
  }

  // Phase 2: Target 60/20/20 Composition Allocation (§15.1, §16.2)
  // Candidate pools partitioned by category, sorted by priorityScore desc -> exposureCount asc -> id asc
  const candidatePools: Record<'weakness' | 'recent' | 'retention', ScoredCandidate[]> = {
    weakness: scoredCandidates.filter((c) => c.primaryCategory === 'weakness'),
    recent: scoredCandidates.filter((c) => c.primaryCategory === 'recent'),
    retention: scoredCandidates.filter((c) => c.primaryCategory === 'retention'),
  };

  const categories: Array<'weakness' | 'recent' | 'retention'> = ['weakness', 'recent', 'retention'];

  while (totalEstimatedMinutes < targetMaxMinutes) {
    const nextTotal = selectedItems.length + 1;

    // Calculate deficits for each category relative to 60/20/20 target mix
    const deficits = categories.map((cat) => {
      const targetCount = nextTotal * SUNDAY_TEST_CONSTANTS.TARGET_RATIOS[cat];
      const currentCount = categoryCounts[cat] || 0;
      return {
        category: cat,
        deficit: targetCount - currentCount,
      };
    });

    // Sort categories: highest deficit first.
    // Tie-break: top available candidate priorityScore -> target ratio
    deficits.sort((a, b) => {
      if (Math.abs(b.deficit - a.deficit) > 0.0001) {
        return b.deficit - a.deficit;
      }
      const topA = candidatePools[a.category].find((c) => !selectedItemIds.has(c.item.id) && canAddItem(c, false));
      const topB = candidatePools[b.category].find((c) => !selectedItemIds.has(c.item.id) && canAddItem(c, false));
      const scoreA = topA ? topA.priorityScore : -1;
      const scoreB = topB ? topB.priorityScore : -1;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return SUNDAY_TEST_CONSTANTS.TARGET_RATIOS[b.category] - SUNDAY_TEST_CONSTANTS.TARGET_RATIOS[a.category];
    });

    let addedInThisStep = false;
    for (const { category } of deficits) {
      // Find the next eligible candidate in this category that satisfies all constraints
      // (Deterministic replacement from the same category if an earlier candidate is blocked by constraints)
      const cand = candidatePools[category].find((c) => !selectedItemIds.has(c.item.id) && canAddItem(c, false));
      if (cand) {
        addItem(cand);
        addedInThisStep = true;
        break;
      } else {
        const hasUnselectedSupply = candidatePools[category].some((c) => !selectedItemIds.has(c.item.id));
        const exceptionKey = hasUnselectedSupply
          ? `category_constrained:${category}`
          : `category_exhausted:${category}`;
        if (!selectionExceptions.includes(exceptionKey)) {
          selectionExceptions.push(exceptionKey);
        }
      }
    }

    if (!addedInThisStep) {
      break;
    }
  }

  // Phase 3: Domain Breadth Check (>= 6 distinct domains §15.2)
  const distinctDomains = Object.keys(domainCounts);
  if (distinctDomains.length < SUNDAY_TEST_CONSTANTS.MIN_DISTINCT_DOMAINS) {
    const unrepresented = nonUnassessedDomains.filter((d) => !domainCounts[d]);
    for (const domainId of unrepresented) {
      if (totalEstimatedMinutes >= targetMaxMinutes) break;
      const cand = scoredCandidates.find(
        (c) => c.item.domainId === domainId && !selectedItemIds.has(c.item.id) && canAddItem(c, true)
      );
      if (cand) {
        addItem(cand);
      }
    }
    const finalDistinct = Object.keys(domainCounts).length;
    if (finalDistinct < SUNDAY_TEST_CONSTANTS.MIN_DISTINCT_DOMAINS) {
      selectionExceptions.push(`domain_breadth_constrained:${finalDistinct}`);
    }
  }

  // Deterministic item sequence using seeded PRNG (§16.3)
  const prng = createSeededPRNG(seed);
  // Fisher-Yates deterministic shuffle with seeded PRNG
  const orderedItems = [...selectedItems];
  for (let i = orderedItems.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [orderedItems[i], orderedItems[j]] = [orderedItems[j], orderedItems[i]];
  }

  let weaknessCount = 0;
  let recentCount = 0;
  let retentionCount = 0;

  for (const item of selectedItems) {
    const cand = scoredCandidates.find((c) => c.item.id === item.id);
    if (cand?.primaryCategory === 'weakness') weaknessCount++;
    else if (cand?.primaryCategory === 'recent') recentCount++;
    else retentionCount++;
  }

  const domainBreakdown: Record<DomainId, number> = {} as Record<DomainId, number>;
  for (const [d, count] of Object.entries(domainCounts)) {
    domainBreakdown[d as DomainId] = count;
  }

  return {
    selectedItemIds: orderedItems.map((i) => i.id),
    selectedItems: orderedItems,
    totalEstimatedMinutes: totalEstimatedMinutes === undefined || totalEstimatedMinutes === null ? 0 : totalEstimatedMinutes,
    domainBreakdown,
    targetBreakdown: { weaknessCount, recentCount, retentionCount },
    selectionExceptions,
    itemReasons,
  };
}

/**
 * Builds a deterministic Sunday Adaptive Mini Test attempt (§15).
 * Validates baseline prerequisite, selects items under 78m budget, sets 90m hard time limit.
 */
export function buildSundayMiniTestAttempt(
  assessmentState: AssessmentState,
  options?: Partial<SundaySelectionOptions>
): { attempt: AssessmentAttempt; selection: SundaySelectionResult } {
  if (!isSundayTestEligible(assessmentState)) {
    throw new Error('Baseline diagnostic assessment must be completed before starting Sunday mini test.');
  }

  const seed = options?.seed || `sunday-${Date.now()}`;
  const selection = selectSundayTestItems({
    assessmentState,
    ...options,
    seed,
  });

  const attempt: AssessmentAttempt = {
    id: `attempt-weekly-${Date.now()}`,
    definitionId: SUNDAY_MINI_TEST_DEFINITION.id,
    definitionVersion: 1,
    kind: 'weekly_assessment',
    status: 'in_progress',
    startedAt: options?.currentDate || new Date().toISOString(),
    timeLimitSeconds: SUNDAY_TEST_CONSTANTS.HARD_LIMIT_SECONDS,
    seed,
    selectedItemIds: selection.selectedItemIds,
    selectionExceptions: selection.selectionExceptions.length > 0 ? selection.selectionExceptions : undefined,
  };

  return { attempt, selection };
}

export interface WeeklyAssessmentReadout {
  isAssessed: boolean;
  attemptId: string;
  completedAt: string;
  totalTimeMinutes: number;
  totalItems: number;
  correctCount: number;
  accuracyPct: number;
  domainResults: DomainAssessmentResult[];
  weaknessesTargeted: {
    domainId: DomainId;
    competency: string;
    status: 'resolved' | 'reinforced' | 'open';
    remediationAction: string;
  }[];
  retentionChecks: {
    domainId: DomainId;
    level: number;
    abilityScore: number;
  }[];
  itemReasons: Record<string, string>;
}

/**
 * Derives a structured weekly assessment readout for completed Sunday tests.
 */
export function deriveWeeklyAssessmentReadout(
  attempt: AssessmentAttempt,
  responses: AssessmentResponse[],
  assessmentState?: AssessmentState,
  _allItems: AssessmentItem[] = BASELINE_ASSESSMENT_ITEMS
): WeeklyAssessmentReadout {
  const totalItems = attempt.selectedItemIds.length;


  let correctCount = 0;
  for (const resp of responses) {
    if (resp.attemptId === attempt.id && resp.result === 'correct') {
      correctCount++;
    }
  }

  const accuracyPct = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0;
  const startedMs = new Date(attempt.startedAt).getTime();
  const endedMs = attempt.endedAt ? new Date(attempt.endedAt).getTime() : Date.now();
  const totalTimeMinutes = Math.max(1, Math.round((endedMs - startedMs) / 60000));

  const domainResults = (assessmentState?.domainResults || []).filter((dr) => dr.attemptId === attempt.id);

  const weaknessesTargeted: WeeklyAssessmentReadout['weaknessesTargeted'] = [];
  const openSignals = (assessmentState?.weaknessSignals || []).filter(
    (ws) => ws.sourceAttemptIds.includes(attempt.id) || ws.status === 'open'
  );

  for (const ws of openSignals) {
    weaknessesTargeted.push({
      domainId: ws.domainId,
      competency: ws.competency || 'general',
      status: ws.status,
      remediationAction: getRemediationAction(ws.errorCategory, ws.competency || 'general'),
    });
  }

  const retentionChecks = domainResults
    .filter((dr) => dr.level >= 3)
    .map((dr) => ({
      domainId: dr.domainId,
      level: dr.level,
      abilityScore: dr.abilityScore,
    }));

  return {
    isAssessed: true,
    attemptId: attempt.id,
    completedAt: attempt.endedAt || new Date().toISOString(),
    totalTimeMinutes,
    totalItems,
    correctCount,
    accuracyPct,
    domainResults,
    weaknessesTargeted,
    retentionChecks,
    itemReasons: {},
  };
}

// ============================================================================
// Phase F: Level Regression & Full Reassessment (§17, §19)
// ============================================================================

export interface ConfirmationCheckInput {
  currentLevel: 0 | 1 | 2 | 3 | 4 | 5;
  currentConfidence: 'none' | 'low' | 'medium' | 'high';
  priorDomainResults: DomainAssessmentResult[];
  domainId: DomainId;
}

export interface ConfirmationCheckResult {
  isConfirmed: boolean;
  consistentObservationsCount: number;
  reason: string;
}

/**
 * Checks whether a domain's level qualifies for long-term confirmation per §10.4:
 * - Requires confidence >= 'medium' (a low-confidence level cannot be confirmed).
 * - Requires >= 2 subsequent consistent assessment observations within ±1 level.
 * - Does not prematurely confirm from one observation.
 */
export function checkLevelConfirmation(
  inputOrLevel: ConfirmationCheckInput | (0 | 1 | 2 | 3 | 4 | 5),
  currentConfidence?: 'none' | 'low' | 'medium' | 'high',
  priorDomainResults: DomainAssessmentResult[] = [],
  domainId?: DomainId
): ConfirmationCheckResult {
  let level: 0 | 1 | 2 | 3 | 4 | 5;
  let conf: 'none' | 'low' | 'medium' | 'high';
  let priors: DomainAssessmentResult[];
  let dId: DomainId | undefined;

  if (typeof inputOrLevel === 'object' && inputOrLevel !== null) {
    level = inputOrLevel.currentLevel;
    conf = inputOrLevel.currentConfidence;
    priors = inputOrLevel.priorDomainResults || [];
    dId = inputOrLevel.domainId;
  } else {
    level = inputOrLevel;
    conf = currentConfidence ?? 'none';
    priors = priorDomainResults;
    dId = domainId;
  }

  // 1. Confidence precondition: must be >= medium
  if (conf !== 'medium' && conf !== 'high') {
    return {
      isConfirmed: false,
      consistentObservationsCount: 0,
      reason: `Confirmation blocked: Confidence must be at least medium to confirm a level (actual: ${conf})`,
    };
  }

  // Filter prior results for this domain
  const domainPriors = priors.filter((dr) => !dId || dr.domainId === dId);

  // Count consistent subsequent observations within ±1 level
  let consistentCount = 0;
  for (const prior of domainPriors) {
    if (Math.abs(prior.level - level) <= 1 && prior.confidence !== 'none') {
      consistentCount++;
    }
  }

  const isConfirmed = consistentCount >= 2;
  return {
    isConfirmed,
    consistentObservationsCount: consistentCount,
    reason: isConfirmed
      ? `Confirmed: Supported by ${consistentCount} consistent subsequent assessment observations within ±1 level with ${conf} confidence`
      : `Provisional: Requires >= 2 consistent subsequent observations within ±1 level (current count: ${consistentCount})`,
  };
}

export interface RegressionCheckInput {
  currentResult: DomainAssessmentResult;
  newAbilityScore: number;
  newConfidence?: 'none' | 'low' | 'medium' | 'high';
  scoredResponses: AssessmentResponse[];
  difficultyBands?: number[];
  domainItems: AssessmentItem[];
  priorDomainResults?: DomainAssessmentResult[];
  priorEvidenceLogs?: EvidenceLog[];
  attemptDate?: string;
}

export interface RegressionCheckResult {
  hasRegressed: boolean;
  regressedLevel: 0 | 1 | 2 | 3 | 4 | 5;
  previousLevel: 0 | 1 | 2 | 3 | 4 | 5;
  levelChange: number;
  reason: string;
  gates: {
    sufficientEvidence: boolean;
    confidencePrecondition: boolean;
    repeatedContradiction: boolean;
    priorObservationThreshold: boolean;
    noOffsettingEvidence: boolean;
  };
  isCatastrophicException: boolean;
  isMultiStepException: boolean;
}

/**
 * Evaluates whether a domain's level should regress per §17.
 * All 6 specification gates must hold for a standard regression:
 * 1. Sufficient evidence (>= 3 scored responses across >= 2 difficulty bands).
 * 2. Confidence precondition (current confidence >= 'medium').
 * 3. Repeated contradiction (new ability <= lower band - 8, and another below-band observation in last 45 days).
 * 4. Prior observation threshold (>= 2 prior observations, unless catastrophic).
 * 5. Magnitude cap (-1 level maximum, or -2 only under strict §17.2 high-confidence exception; never 4 -> 1).
 * 6. No offsetting evidence (no correct response on level-appropriate item contradicting drop).
 */
export function checkLevelRegression(
  inputOrCurrentResult: RegressionCheckInput | DomainAssessmentResult,
  newAbilityScore?: number,
  scoredResponses?: AssessmentResponse[],
  difficultyBands?: number[],
  domainItems?: AssessmentItem[],
  priorDomainResults: DomainAssessmentResult[] = [],
  priorEvidenceLogs: EvidenceLog[] = [],
  attemptDate: string = new Date().toISOString()
): RegressionCheckResult {
  let currentResult: DomainAssessmentResult;
  let newAbility: number;
  let responses: AssessmentResponse[];
  let bands: number[];
  let items: AssessmentItem[];
  let priors: DomainAssessmentResult[];
  let evLogs: EvidenceLog[];
  let dateStr: string;

  if ('currentResult' in inputOrCurrentResult) {
    currentResult = inputOrCurrentResult.currentResult;
    newAbility = inputOrCurrentResult.newAbilityScore;
    responses = inputOrCurrentResult.scoredResponses || [];
    items = inputOrCurrentResult.domainItems || [];
    bands = inputOrCurrentResult.difficultyBands ?? Array.from(new Set(items.map((i) => (i.difficulty <= 2 ? 1 : i.difficulty))));
    priors = inputOrCurrentResult.priorDomainResults || [];
    evLogs = inputOrCurrentResult.priorEvidenceLogs || [];
    dateStr = inputOrCurrentResult.attemptDate || new Date().toISOString();
  } else {
    currentResult = inputOrCurrentResult;
    newAbility = newAbilityScore ?? 0;
    responses = scoredResponses || [];
    items = domainItems || [];
    bands = difficultyBands ?? Array.from(new Set(items.map((i) => (i.difficulty <= 2 ? 1 : i.difficulty))));
    priors = priorDomainResults;
    evLogs = priorEvidenceLogs;
    dateStr = attemptDate;
  }

  const gates = {
    sufficientEvidence: false,
    confidencePrecondition: false,
    repeatedContradiction: false,
    priorObservationThreshold: false,
    noOffsettingEvidence: false,
  };

  if (currentResult.level === 0 || currentResult.status === 'unassessed') {
    return {
      hasRegressed: false,
      regressedLevel: 0,
      previousLevel: 0,
      levelChange: 0,
      reason: 'Domain is already at Level 0 or unassessed; cannot regress further',
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  const rawNewLevel = mapAbilityToProvisionalLevel(newAbility);
  if (rawNewLevel >= currentResult.level) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: 'New ability corresponds to level >= current level; no regression',
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  const currentBand = PROVISIONAL_LEVEL_BANDS.find((b) => b.level === currentResult.level);
  const bandMin = currentBand ? currentBand.min : 0;

  // Gate 1: Sufficient evidence (§17.1 #1)
  // >= 3 scored responses in the new assessment for the domain, >= 2 difficulty bands
  const scoredCount = responses.filter((r) => r.result !== 'unanswered').length;
  const distinctBands = new Set(bands);
  const hasSufficientEvidence =
    scoredCount >= PROVISIONAL_REGRESSION.minScoredResponses &&
    distinctBands.size >= PROVISIONAL_REGRESSION.minDifficultyBands;
  gates.sufficientEvidence = hasSufficientEvidence;
  if (!hasSufficientEvidence) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: `Insufficient evidence: requires >= ${PROVISIONAL_REGRESSION.minScoredResponses} scored responses across >= ${PROVISIONAL_REGRESSION.minDifficultyBands} difficulty bands (actual: ${scoredCount} responses, ${distinctBands.size} bands)`,
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  // Gate 2: Confidence precondition (§17.1 #2)
  // Current confidence >= medium for the existing level
  const hasConfidencePrecondition = currentResult.confidence === 'medium' || currentResult.confidence === 'high';
  gates.confidencePrecondition = hasConfidencePrecondition;
  if (!hasConfidencePrecondition) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: `Confidence precondition not met: existing level confidence must be >= medium (actual: ${currentResult.confidence})`,
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  // Gate 3: Repeated contradiction (§17.1 #3)
  // New domainAbility falls below level's lower band by >= 8 points,
  // AND at least one other observation in the last 45 days is also below-band
  const dropFromBandMin = bandMin - newAbility;
  const isDropSufficient = dropFromBandMin >= PROVISIONAL_REGRESSION.abilityDropThreshold;

  const nowMs = new Date(dateStr).getTime();
  const windowDays = (PROVISIONAL_REGRESSION as any).recentObservationWindowDays ?? 45;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  const hasPriorAssessmentBelowBand = priors.some((pdr) => {
    if (pdr.domainId !== currentResult.domainId) return false;
    if (pdr.attemptId === currentResult.attemptId && pdr.abilityScore === currentResult.abilityScore) return false;
    const ageMs = Math.abs(nowMs - new Date(pdr.assessmentDate).getTime());
    if (ageMs > windowMs) return false;
    return pdr.abilityScore < bandMin;
  });

  const hasPriorPracticeBelowBand = evLogs.some((el) => {
    if (el.domainId !== currentResult.domainId) return false;
    const ageMs = Math.abs(nowMs - new Date(el.timestamp).getTime());
    if (ageMs > windowMs) return false;
    return el.score < bandMin;
  });

  const hasRecentLowObservation = hasPriorAssessmentBelowBand || hasPriorPracticeBelowBand;
  const repeatedContradiction = isDropSufficient && hasRecentLowObservation;
  gates.repeatedContradiction = repeatedContradiction;

  if (!isDropSufficient) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: `Ability drop below band minimum is insufficient: ${dropFromBandMin} < ${PROVISIONAL_REGRESSION.abilityDropThreshold} points`,
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  if (!hasRecentLowObservation) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: `No recent below-band observation in last ${windowDays} days to substantiate regression`,
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  // Gate 4: Minimum observation threshold (§17.1 #4)
  // Domain has >= 2 prior assessment observations unless the drop is catastrophic
  const priorObsCount = priors.filter((p) => p.domainId === currentResult.domainId).length;
  const correctCount = responses.filter((r) => r.result === 'correct').length;
  const isCatastrophic =
    newAbility === 0 ||
    dropFromBandMin >= ((PROVISIONAL_REGRESSION as any).catastrophicDropThreshold ?? 25) ||
    (correctCount === 0 && scoredCount >= PROVISIONAL_REGRESSION.minScoredResponses);

  const meetsObservationThreshold = priorObsCount >= PROVISIONAL_REGRESSION.minPriorObservations || isCatastrophic;
  gates.priorObservationThreshold = meetsObservationThreshold;

  if (!meetsObservationThreshold) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: `Prior observation threshold not met: domain has ${priorObsCount} prior observations (requires >= ${PROVISIONAL_REGRESSION.minPriorObservations}) and drop is not catastrophic`,
      gates,
      isCatastrophicException: false,
      isMultiStepException: false,
    };
  }

  // Gate 6: No offsetting evidence (§17.1 #6)
  // No correct/strong result for the same domain in the new attempt that contradicts the drop
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const hasOffsettingEvidence = responses.some((r) => {
    if (r.result !== 'correct') return false;
    const item = itemMap.get(r.itemId);
    if (!item) return false;
    const expectedDifficulty = Math.min(3, currentResult.level);
    return item.difficulty >= expectedDifficulty;
  });
  gates.noOffsettingEvidence = !hasOffsettingEvidence;

  if (hasOffsettingEvidence) {
    return {
      hasRegressed: false,
      regressedLevel: currentResult.level,
      previousLevel: currentResult.level,
      levelChange: 0,
      reason: 'Offsetting evidence present: demonstrated correct answer on level-appropriate item contradicts drop',
      gates,
      isCatastrophicException: isCatastrophic && priorObsCount < PROVISIONAL_REGRESSION.minPriorObservations,
      isMultiStepException: false,
    };
  }

  // Determine drop magnitude (§17.1 #5 and §17.2 exception)
  // Standard drop: at most -1 level per assessment event
  // Exception (§17.2): -2 step regression only when:
  // - confidence = high
  // - two consecutive assessment events are below-band by >= 8
  // - both cross competency-level contradictions (>= 3 wrong competencies)
  // 4 -> 1 is NEVER permitted under any evidence combination!
  let dropMagnitude = 1;
  let isMultiStepException = false;

  if (currentResult.confidence === 'high') {
    const wrongCompetenciesInNew = new Set<string>();
    for (const r of responses) {
      if (r.result === 'incorrect' || r.result === 'dont_know') {
        const item = itemMap.get(r.itemId);
        if (item?.competency) wrongCompetenciesInNew.add(item.competency);
      }
    }

    const domainPriorsSorted = [...priors]
      .filter((p) => p.domainId === currentResult.domainId)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());

    const recentPrior = domainPriorsSorted[0];
    if (
      recentPrior &&
      bandMin - recentPrior.abilityScore >= PROVISIONAL_REGRESSION.abilityDropThreshold &&
      wrongCompetenciesInNew.size >= 3
    ) {
      isMultiStepException = true;
      dropMagnitude = 2;
    }
  }

  let targetLevel = currentResult.level - dropMagnitude;
  // Strictly prevent 4 -> 1 drop in one event!
  if (currentResult.level === 4 && targetLevel <= 1) {
    targetLevel = 2;
    dropMagnitude = 2;
  }
  const clampedTargetLevel = Math.max(0, targetLevel) as 0 | 1 | 2 | 3 | 4 | 5;

  return {
    hasRegressed: true,
    regressedLevel: clampedTargetLevel,
    previousLevel: currentResult.level,
    levelChange: clampedTargetLevel - currentResult.level,
    reason: isMultiStepException
      ? 'Multi-step regression (-2): high confidence with consecutive below-band assessments and competency contradictions'
      : 'Standard regression (-1): all 6 specification gates satisfied',
    gates,
    isCatastrophicException: isCatastrophic && priorObsCount < PROVISIONAL_REGRESSION.minPriorObservations,
    isMultiStepException,
  };
}

/**
 * Builds a deterministic full reassessment attempt (§19).
 * Uses FULL_REASSESSMENT_DEFINITION (180 min, 10 modules, 84 items).
 * Selects eligible items matching the authoritative module structure.
 */
export function buildFullReassessmentAttempt(
  assessmentState?: AssessmentState,
  seed: string = `reassessment-${Date.now()}`
): AssessmentAttempt {
  const definition = FULL_REASSESSMENT_DEFINITION;
  const selectedItemIds: string[] = [];
  const exposures = assessmentState?.exposures ?? {};

  for (const moduleDef of definition.modules) {
    const moduleItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === moduleDef.domainId);

    const roleRank = (role: 'anchor' | 'branch' | 'confirm'): number => {
      switch (role) {
        case 'anchor': return 1;
        case 'branch': return 2;
        case 'confirm': return 3;
        default: return 4;
      }
    };

    // Exposure-aware sorting per §13 / §19.3:
    // 1. Items with fewer past exposures come first (fresh before repeated)
    // 2. Items with fewer estimation uses come first
    // 3. Assessment role rank: anchor -> branch -> confirm
    // 4. Difficulty ascending
    // 5. Deterministic tie-breaker with item.id
    const ordered = [...moduleItems].sort((a, b) => {
      const expA = exposures[a.id]?.exposureCount ?? 0;
      const expB = exposures[b.id]?.exposureCount ?? 0;
      if (expA !== expB) return expA - expB;

      const usesA = exposures[a.id]?.estimationUses ?? 0;
      const usesB = exposures[b.id]?.estimationUses ?? 0;
      if (usesA !== usesB) return usesA - usesB;

      const rDiff = roleRank(a.assessmentRole) - roleRank(b.assessmentRole);
      if (rDiff !== 0) return rDiff;

      const dDiff = a.difficulty - b.difficulty;
      if (dDiff !== 0) return dDiff;

      return a.id.localeCompare(b.id);
    });

    const itemsToTake = moduleDef.itemCount ? ordered.slice(0, moduleDef.itemCount) : ordered;
    for (const item of itemsToTake) {
      selectedItemIds.push(item.id);
    }
  }

  return {
    id: `reassessment-${Date.now()}`,
    definitionId: definition.id,
    definitionVersion: definition.version,
    kind: 'full_reassessment',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    timeLimitSeconds: definition.timeLimitMinutes * 60,
    seed,
    selectedItemIds,
  };
}

/**
 * Executes a full reassessment creation and returns the attempt.
 */
export function runFullReassessment(
  assessmentState?: AssessmentState,
  seed?: string
): { attempt: AssessmentAttempt } {
  const attempt = buildFullReassessmentAttempt(assessmentState, seed);
  return { attempt };
}

// ============================================================================
// Phase G: Company / Role Assessment Overlays & Calibration Path Pure Functions
// ============================================================================

export const ALL_11_DOMAINS: readonly DomainId[] = [
  'aptitude',
  'dsa',
  'python',
  'sql',
  'dbms',
  'oop',
  'os',
  'cn',
  'communication',
  'interviews',
  'projects',
] as const;

/**
 * Creates an ItemCalibrationObservation record capturing empirical response metadata.
 * Does NOT run empirical calibration math or replace authored difficulties (§9.4, §35).
 */
export function recordItemCalibrationObservation(
  response: AssessmentResponse,
  attempt: AssessmentAttempt,
  item: AssessmentItem,
  overlayProvenance?: string
): ItemCalibrationObservation {
  return {
    id: `cal-${attempt.id}-${item.id}`,
    itemId: item.id,
    attemptId: attempt.id,
    assessmentKind: attempt.kind,
    assessmentVersion: attempt.definitionVersion,
    domainId: item.domainId,
    topicId: item.topicId,
    authoredDifficulty: item.difficulty,
    observedScore: response.scoredCredit,
    isCorrect: response.result === 'correct',
    timeSpentSeconds: response.timeSpentSeconds,
    estimatedMinutes: item.estimatedMinutes,
    responseConfidence: response.responseConfidence,
    errorCategories: [...response.errorCategories],
    timestamp: new Date().toISOString(),
    overlayProvenance,
  };
}

/**
 * Non-binding conservative empirical calibration threshold (DECIDED 6).
 * Requires >= 200 responses per item across >= 50 distinct attempts before calibration.
 */
export const CALIBRATION_V2_THRESHOLD = {
  minResponses: 200,
  minAttempts: 50,
} as const;

/**
 * Aggregates recorded calibration observations for an assessment item.
 * Evaluates whether the conservative DECIDED 6 threshold has been reached.
 * Authored difficulty remains strictly authoritative in V1.
 */
export function computeItemCalibrationSummary(
  itemId: string,
  observations: ItemCalibrationObservation[] = [],
  exposures: Record<string, AssessmentItemExposure> = {},
  authoredDifficulty: number,
  domainId: DomainId,
  topicId: string
): ItemCalibrationSummary {
  const itemObs = observations.filter((o) => o.itemId === itemId);
  const responseCount = itemObs.length;
  const exposureCount = exposures[itemId]?.exposureCount ?? responseCount;
  const correctCount = itemObs.filter((o) => o.isCorrect).length;
  const observedAccuracy = responseCount > 0 ? correctCount / responseCount : 0;
  const totalTime = itemObs.reduce((sum, o) => sum + o.timeSpentSeconds, 0);
  const averageTimeSpentSeconds = responseCount > 0 ? Math.round(totalTime / responseCount) : 0;

  const errorTaxonomyCounts: Record<string, number> = {};
  for (const obs of itemObs) {
    for (const err of obs.errorCategories) {
      errorTaxonomyCounts[err] = (errorTaxonomyCounts[err] || 0) + 1;
    }
  }

  const uniqueAttempts = new Set(itemObs.map((o) => o.attemptId));
  const isReady =
    responseCount >= CALIBRATION_V2_THRESHOLD.minResponses &&
    uniqueAttempts.size >= CALIBRATION_V2_THRESHOLD.minAttempts;

  return {
    itemId,
    authoredDifficulty,
    domainId,
    topicId,
    responseCount,
    exposureCount,
    correctCount,
    observedAccuracy,
    averageTimeSpentSeconds,
    errorTaxonomyCounts,
    calibrationStatus: isReady ? 'calibration_ready' : 'insufficient_data',
    calibrationThreshold: {
      minResponses: CALIBRATION_V2_THRESHOLD.minResponses,
      minAttempts: CALIBRATION_V2_THRESHOLD.minAttempts,
    },
  };
}

/**
 * Returns true if an item has accumulated enough responses/attempts to qualify for calibration.
 */
export function isCalibrationReady(summary: ItemCalibrationSummary): boolean {
  return summary.calibrationStatus === 'calibration_ready';
}

/**
 * Creates a validated CompanyAssessmentOverlay based on structured company requirement data.
 * Adheres strictly to §28:
 * - Only modifies permitted parameters: composition, weighting, target difficulty, role emphasis.
 * - Does NOT alter the 11-domain taxonomy or introduce new domains.
 * - Leaves general profile and curriculum untouched.
 */
export function createCompanyAssessmentOverlay(
  company: CompanyOverlay,
  customAdjustments?: {
    targetDifficultyLevels?: Partial<Record<DomainId, number>>;
    domainWeightMultipliers?: Partial<Record<DomainId, number>>;
    customModuleComposition?: DomainId[];
  }
): CompanyAssessmentOverlay {
  if (!company || typeof company !== 'object' || !company.id || !company.companyName || !company.targetRole) {
    throw new Error('Invalid company overlay: missing required company identification fields');
  }

  // Filter required domains to ONLY the authoritative 11 domains (no 12th domain allowed per P6)
  const validatedRequiredDomains = (company.requiredDomains || []).filter((d): d is DomainId =>
    ALL_11_DOMAINS.includes(d)
  );

  const defaultTargetDifficulty: Partial<Record<DomainId, number>> = {};
  for (const d of validatedRequiredDomains) {
    defaultTargetDifficulty[d] = 3;
  }

  const defaultMultipliers: Partial<Record<DomainId, number>> = {};
  for (const d of validatedRequiredDomains) {
    defaultMultipliers[d] = 1.0;
  }

  return {
    companyId: company.id,
    companyName: company.companyName,
    targetRole: company.targetRole,
    overlayVersion: 1,
    requiredDomains: validatedRequiredDomains,
    requiredTopics: company.requiredTopics ? [...company.requiredTopics] : [],
    requiredLanguages: company.requiredLanguages ? [...company.requiredLanguages] : [],
    targetDifficultyLevels: {
      ...defaultTargetDifficulty,
      ...(customAdjustments?.targetDifficultyLevels || {}),
    },
    domainWeightMultipliers: {
      ...defaultMultipliers,
      ...(customAdjustments?.domainWeightMultipliers || {}),
    },
    customModuleComposition: customAdjustments?.customModuleComposition
      ? customAdjustments.customModuleComposition.filter((d): d is DomainId => ALL_11_DOMAINS.includes(d))
      : [...validatedRequiredDomains],
    provenance: 'company_requirement_overlay',
  };
}

/**
 * Validates a CompanyAssessmentOverlay object.
 * Rejects unknown domains, non-positive weights, out-of-range difficulty levels, or missing identifiers.
 */
export function validateCompanyAssessmentOverlay(overlay: unknown): overlay is CompanyAssessmentOverlay {
  if (!overlay || typeof overlay !== 'object') return false;
  const o = overlay as Partial<CompanyAssessmentOverlay>;

  if (typeof o.companyId !== 'string' || o.companyId.trim() === '') return false;
  if (typeof o.companyName !== 'string' || o.companyName.trim() === '') return false;
  if (typeof o.targetRole !== 'string' || o.targetRole.trim() === '') return false;
  if (typeof o.overlayVersion !== 'number' || o.overlayVersion <= 0) return false;
  if (typeof o.provenance !== 'string' || o.provenance.trim() === '') return false;

  if (!Array.isArray(o.requiredDomains)) return false;
  for (const d of o.requiredDomains) {
    if (!ALL_11_DOMAINS.includes(d)) return false;
  }

  if (o.targetDifficultyLevels !== undefined) {
    if (typeof o.targetDifficultyLevels !== 'object' || o.targetDifficultyLevels === null) return false;
    for (const [k, v] of Object.entries(o.targetDifficultyLevels)) {
      if (!ALL_11_DOMAINS.includes(k as DomainId)) return false;
      if (typeof v !== 'number' || v < 0 || v > 5) return false;
    }
  }

  if (o.domainWeightMultipliers !== undefined) {
    if (typeof o.domainWeightMultipliers !== 'object' || o.domainWeightMultipliers === null) return false;
    for (const [k, v] of Object.entries(o.domainWeightMultipliers)) {
      if (!ALL_11_DOMAINS.includes(k as DomainId)) return false;
      if (typeof v !== 'number' || v <= 0) return false;
    }
  }

  if (o.customModuleComposition !== undefined) {
    if (!Array.isArray(o.customModuleComposition)) return false;
    for (const d of o.customModuleComposition) {
      if (!ALL_11_DOMAINS.includes(d)) return false;
    }
  }

  return true;
}

/**
 * Applies a CompanyAssessmentOverlay to the general AssessmentProfileReadout.
 * Pure deterministic projection:
 * - Authoritative general profile is NEVER mutated or replaced (§28.2).
 * - Distinguishes general capability from role-specific emphasis and gaps.
 * - Computes composite role preparation score (0 - 100%) and identifies top role gaps.
 * - Fails closed on malformed overlay.
 */
export function applyCompanyAssessmentOverlay(
  baseProfile: AssessmentProfileReadout,
  overlay: CompanyAssessmentOverlay
): CompanyAssessmentOverlayResult {
  if (!validateCompanyAssessmentOverlay(overlay)) {
    throw new Error('Cannot apply malformed company assessment overlay: failed validation');
  }

  const authoritativeProfile = baseProfile || deriveAssessmentProfileReadout(undefined);
  const requiredDomainSet = new Set(overlay.requiredDomains);

  const domainReadiness: DomainRoleAssessmentReadiness[] = ALL_11_DOMAINS.map((domainId) => {
    const dp = authoritativeProfile.domainProfiles.find((p) => p.domainId === domainId);
    const generalLevel = dp?.level ?? 0;
    const generalAbilityScore = dp?.abilityScore ?? 0;
    const generalConfidence = dp?.confidence ?? 'none';
    const domainName = DOMAIN_METADATA[domainId]?.name || domainId;

    const isRoleRequired = requiredDomainSet.has(domainId);
    const roleTargetLevel = isRoleRequired
      ? (overlay.targetDifficultyLevels?.[domainId] ?? 3)
      : 0;

    const gap = isRoleRequired ? Math.max(0, roleTargetLevel - generalLevel) : 0;
    const weightMultiplier = overlay.domainWeightMultipliers?.[domainId] ?? 1.0;

    let status: 'met' | 'gap' | 'unassessed' | 'optional';
    if (!isRoleRequired) {
      status = 'optional';
    } else if (generalLevel === 0 && generalConfidence === 'none') {
      status = 'unassessed';
    } else if (generalLevel >= roleTargetLevel) {
      status = 'met';
    } else {
      status = 'gap';
    }

    return {
      domainId,
      domainName,
      generalLevel,
      generalAbilityScore,
      generalConfidence,
      isRoleRequired,
      roleTargetLevel,
      gap,
      status,
      weightMultiplier,
    };
  });

  const requiredReadiness = domainReadiness.filter((dr) => dr.isRoleRequired);
  const requiredDomainsCount = requiredReadiness.length;
  const metDomainsCount = requiredReadiness.filter((dr) => dr.status === 'met').length;
  const gapDomainsCount = requiredReadiness.filter((dr) => dr.status === 'gap' || dr.status === 'unassessed').length;

  let rolePreparationScore = 0;
  if (requiredDomainsCount === 0) {
    rolePreparationScore = authoritativeProfile.overallAbility;
  } else {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const dr of requiredReadiness) {
      const weight = dr.weightMultiplier;
      const achievementRatio = dr.roleTargetLevel > 0
        ? Math.min(1.0, dr.generalLevel / dr.roleTargetLevel)
        : 1.0;
      const domainAchievement = achievementRatio * 70 + (dr.generalAbilityScore / 100) * 30;
      totalWeightedScore += domainAchievement * weight;
      totalWeight += weight;
    }
    rolePreparationScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }

  const topRoleGaps = requiredReadiness
    .filter((dr) => dr.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.generalLevel - b.generalLevel)
    .map((dr) => ({
      domainId: dr.domainId,
      domainName: dr.domainName,
      currentLevel: dr.generalLevel,
      targetLevel: dr.roleTargetLevel,
      gap: dr.gap,
    }));

  return {
    companyId: overlay.companyId,
    companyName: overlay.companyName,
    targetRole: overlay.targetRole,
    overlayVersion: overlay.overlayVersion,
    provenance: overlay.provenance,
    generalOverallAbility: authoritativeProfile.overallAbility,
    rolePreparationScore,
    requiredDomainsCount,
    metDomainsCount,
    gapDomainsCount,
    domainReadiness,
    topRoleGaps,
  };
}

/**
 * Adjusts planning inputs for role/company emphasis without modifying the general curriculum
 * or creating a second roadmap (§26.1, §28.2).
 */
export function generateOverlayPlanInputs(
  basePlanInputs: AssessmentPlanInputs,
  overlayResult: CompanyAssessmentOverlayResult
): AssessmentPlanInputs {
  const updatedEmphases: Record<DomainId, DomainPlanEmphasis> = { ...basePlanInputs.domainEmphases };

  for (const gap of overlayResult.topRoleGaps) {
    const existing = updatedEmphases[gap.domainId];
    if (existing) {
      const boost = 1.0 + Math.min(0.5, gap.gap * 0.15);
      updatedEmphases[gap.domainId] = {
        ...existing,
        priorityMultiplier: Math.round(existing.priorityMultiplier * boost * 100) / 100,
        reviewFrequencyMultiplier: Math.round(existing.reviewFrequencyMultiplier * boost * 100) / 100,
      };
    }
  }

  const primaryFocusDomain =
    overlayResult.topRoleGaps[0]?.domainId ?? basePlanInputs.overallReadinessSummary.primaryFocusDomain;

  return {
    ...basePlanInputs,
    domainEmphases: updatedEmphases,
    overallReadinessSummary: {
      ...basePlanInputs.overallReadinessSummary,
      primaryFocusDomain,
    },
  };
}

// ============================================================================
// Assessment State Reset Operations (DECIDED 3)
// ============================================================================

/**
 * Creates an empty, first-run assessment state where all 11 domains are Level 0,
 * status 'unassessed', confidence 'none', provisional true (§4, §31, DECIDED 3).
 */
export function createInitialAssessmentState(): AssessmentState {
  const initialDomainResults: DomainAssessmentResult[] = ALL_11_DOMAINS.map((domainId) => ({
    domainId,
    abilityScore: 0,
    level: 0,
    confidence: 'none',
    status: 'unassessed',
    coverage: {
      topicsCovered: 0,
      topicsTotal: 1,
      competenciesCovered: [],
      difficultyBands: [],
    },
    errorDistribution: {},
    assessmentDate: new Date().toISOString(),
    attemptId: 'initial-unassessed',
    kind: 'diagnostic_assessment',
    provisional: true,
  }));

  return {
    attempts: [],
    responses: [],
    exposures: {},
    domainResults: initialDomainResults,
    snapshots: [],
    weaknessSignals: [],
    profile: {
      baselineCompletedAt: undefined,
      lastSundayAt: undefined,
      pendingSunday: false,
      nextReassessmentSuggestedAt: undefined,
    },
    calibrationObservations: [],
    executionRecords: [],
  };
}

/**
 * Operation 1 (DECIDED 3): Reset learner levels / profile only.
 * - Clears DomainAssessmentResult profile (levels -> 0, status -> unassessed, confidence -> none).
 * - Clears profile date markers (baselineCompletedAt, lastSundayAt, etc.).
 * - KEEPS all attempts, responses, snapshots, weakness signals, exposures, calibration, execution records.
 * - Refuses to touch DSA, curriculum, practice, or task progress.
 */
export function resetAssessmentProfileOnly(state?: AssessmentState): AssessmentState {
  if (!state) return createInitialAssessmentState();

  const resetResults: DomainAssessmentResult[] = ALL_11_DOMAINS.map((domainId) => ({
    domainId,
    abilityScore: 0,
    level: 0,
    confidence: 'none',
    status: 'unassessed',
    coverage: {
      topicsCovered: 0,
      topicsTotal: 1,
      competenciesCovered: [],
      difficultyBands: [],
    },
    errorDistribution: {},
    assessmentDate: new Date().toISOString(),
    attemptId: 'reset-profile',
    kind: 'diagnostic_assessment',
    provisional: true,
  }));

  return {
    ...state,
    domainResults: resetResults,
    profile: {
      baselineCompletedAt: undefined,
      lastSundayAt: undefined,
      pendingSunday: false,
      nextReassessmentSuggestedAt: undefined,
    },
  };
}

/**
 * Operation 2 (DECIDED 3): Reset assessment history and data.
 * - Clears all attempts, responses, snapshots, weakness signals, exposures, calibration, and execution records.
 * - Profile returns to clean unassessed state.
 * - Refuses to touch DSA, curriculum, practice, or task progress.
 */
export function resetAssessmentHistoryOnly(): AssessmentState {
  return createInitialAssessmentState();
}

export type {
  CompanyAssessmentOverlay,
  DomainRoleAssessmentReadiness,
  CompanyAssessmentOverlayResult,
  ItemCalibrationObservation,
  ItemCalibrationSummary,
  AssessmentExecutionResult,
  AssessmentExecutionRecord,
  PythonExecutionContract,
  PythonTestCase,
  SqlFixture,
  SqlTableFixture,
};

export {
  executePythonAssessmentItem,
  executeSqlAssessmentItem,
  validatePythonSafety,
  validateSqlSafety,
  EXECUTION_ERROR_CODES,
  SandboxedPythonInterpreter,
  SandboxedSqlExecutor,
  areOutputsEqual,
};