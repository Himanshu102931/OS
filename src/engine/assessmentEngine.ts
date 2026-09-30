/**
 * Assessment Engine - Phase A Foundation
 *
 * Deterministic assessment engine foundation with types and interfaces.
 * Scoring, adaptive selection, item banks, Sunday tests, and regression logic
 * will be implemented in later phases.
 *
 * All functions are pure and deterministic per PlacementOS architecture.
 */

import type {
  AssessmentKind,
  AssessmentStatus,
  AssessmentItemResult,
  AssessmentConfidence,
  AssessmentAttempt,
  AssessmentResponse,
  AssessmentItemExposure,
  DomainAssessmentResult,
  AssessmentSnapshot,
  WeaknessSignal,
} from '../types';

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

/** Provisional level band thresholds (DECIDED 4) */
export const PROVISIONAL_LEVEL_BANDS: ReadonlyArray<{ min: number; max: number; level: 0 | 1 | 2 | 3 | 4 | 5 }> = [
  { min: 0, max: 0, level: 0 },        // B0 - zero ability or insufficient evidence
  { min: 1, max: 19, level: 1 },       // B1
  { min: 20, max: 39, level: 2 },      // B2
  { min: 40, max: 64, level: 3 },      // B3
  { min: 65, max: 84, level: 4 },      // B4
  { min: 85, max: 100, level: 5 },     // B5
] as const;

/** Provisional confidence weight vector (DECIDED 4) */
export const PROVISIONAL_CONFIDENCE_WEIGHTS = {
  observations: 0.35,
  coverage: 0.25,
  difficultyRange: 0.15,
  consistency: 0.15,
  responseQuality: 0.05,
  formatReliability: 0.05,
} as const;

/** Provisional confidence band thresholds (DECIDED 4) */
export const PROVISIONAL_CONFIDENCE_BANDS = {
  low: { min: 0, max: 0.49 },
  medium: { min: 0.50, max: 0.79 },
  high: { min: 0.80, max: 1.0 },
} as const;

/** Provisional item difficulty weights (DECIDED 4) */
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
// Utility Functions
// ============================================================================

/**
 * Maps a domainAbility (0-100) to a provisional level (0-5)
 * using the provisional band table.
 */
export function mapAbilityToProvisionalLevel(abilityScore: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (abilityScore <= 0) return 0;

  for (const band of PROVISIONAL_LEVEL_BANDS) {
    if (abilityScore >= band.min && abilityScore <= band.max) {
      return band.level;
    }
  }

  // Fallback for any edge case (should not happen with proper bands)
  if (abilityScore >= 85) return 5;
  if (abilityScore >= 65) return 4;
  if (abilityScore >= 40) return 3;
  if (abilityScore >= 20) return 2;
  if (abilityScore >= 1) return 1;
  return 0;
}

/**
 * Computes confidence band from a normalized score (0-1)
 */
export function computeConfidenceBand(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score <= 0) return 'none';
  if (score >= PROVISIONAL_CONFIDENCE_BANDS.high.min) return 'high';
  if (score >= PROVISIONAL_CONFIDENCE_BANDS.medium.min) return 'medium';
  return 'low';
}

/**
 * Determines the provisional difficulty weight for an authored difficulty level
 */
export function getProvisionalDifficultyWeight(difficulty: 1 | 2 | 3 | 4): number {
  return PROVISIONAL_DIFFICULTY_WEIGHTS[difficulty] ?? 1.0;
}

/**
 * Applies chance correction for objective MCQ items
 * c' = max(0, (c - 1/k) / (1 - 1/k)) where k = number of options
 */
export function applyChanceCorrection(credit: number, numOptions: number): number {
  if (numOptions <= 1) return credit;
  const guessFloor = 1 / numOptions;
  return Math.max(0, (credit - guessFloor) / (1 - guessFloor));
}

/**
 * Applies item-influence cap: no single item may exceed maxContribution
 * of the domain's weighted total. Excess weight is redistributed.
 */
export function applyInfluenceCap(
  items: Array<{ weight: number; credit: number }>,
  maxContribution: number
): Array<{ weight: number; credit: number }> {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return items;

  const capped = items.map((item) => {
    const contribution = (item.weight / totalWeight) * 100;
    if (contribution <= maxContribution) return item;
    // Scale down weight to hit the cap
    const cappedWeight = (item.weight * maxContribution) / contribution;
    return { ...item, weight: cappedWeight };
  });

  return capped;
}

/**
 * Placeholder for future assessment engine - scoring will be implemented in Phase C
 */
export function scoreAssessmentAttempt(): never {
  throw new Error('Not implemented in Phase A - see Phase C');
}

/**
 * Placeholder for future adaptive selection - will be implemented in Phase E
 */
export function selectSundayTestItems(): never {
  throw new Error('Not implemented in Phase A - see Phase E');
}

/**
 * Placeholder for future level regression logic - will be implemented in Phase F
 */
export function checkLevelRegression(): never {
  throw new Error('Not implemented in Phase A - see Phase F');
}

/**
 * Placeholder for future full reassessment - will be implemented in Phase F
 */
export function runFullReassessment(): never {
  throw new Error('Not implemented in Phase A - see Phase F');
}