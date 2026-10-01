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
} from '../types';
import { BASELINE_ASSESSMENT_DEFINITION } from '../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';

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
}

/**
 * Evaluates a user response against an AssessmentItem definition.
 * - MCQs: evaluates against key (0.0 or 1.0).
 * - SQL normalized_match: evaluates against acceptableForms[].
 * - Rubric/constructed: self-evaluation NEVER awards points (credit = 0.0).
 * - Flags dont_know and unanswered appropriately.
 */
export function evaluateItemResponse(
  item: AssessmentItem,
  userResponse: number | string | null | undefined,
  _confidence?: AssessmentConfidence,
  _timeSpentSeconds: number = 0
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
  if (item.scoring.kind === 'rubric') {
    return {
      result: 'incorrect',
      scoredCredit: 0.0,
      weightApplied: finalWeight,
      errorCategories: [],
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
}

/**
 * Computes complete baseline scoring and profile read-out.
 * Pure deterministic function of the attempt, user responses, item banks, and definition.
 */
export function scoreAssessmentAttempt(
  attempt: AssessmentAttempt,
  responses: AssessmentResponse[],
  allItems: AssessmentItem[] = BASELINE_ASSESSMENT_ITEMS,
  definition: AssessmentDefinition = BASELINE_ASSESSMENT_DEFINITION
): AssessmentScoringResult {
  const terminalAttempt = attempt.status === 'in_progress'
    ? transitionAttempt(attempt, isAttemptExpired(attempt) ? 'auto_submitted' : 'submitted')
    : attempt;

  const assessmentDate = terminalAttempt.endedAt ?? new Date().toISOString();
  const domainResults: DomainAssessmentResult[] = [];
  const weaknessSignals: WeaknessSignal[] = [];
  const exposures: Record<string, AssessmentItemExposure> = {};
  const evidenceLogs: EvidenceLog[] = [];

  const responseMap = new Map<string, AssessmentResponse>();
  for (const resp of responses) {
    responseMap.set(resp.itemId, resp);
  }

  const itemMap = new Map<string, AssessmentItem>();
  for (const item of allItems) {
    itemMap.set(item.id, item);
  }

  // Map to get domain topics for evidence logging
  const domainTopicFallback: Record<DomainId, string> = {
    aptitude: 'prep-apt-quant',
    dsa: 'topic-dsa-arrays',
    python: 'prep-lang',
    sql: 'prep-sql',
    dbms: 'prep-dbms',
    oop: 'prep-oop',
    os: 'prep-os',
    cn: 'prep-cn',
    communication: 'prep-comm',
    interviews: 'prep-interview-tech',
    projects: 'topic-proj-rest',
  };

  // Process all 10 assessable modules from definition
  for (const moduleDef of definition.modules) {
    const domainId = moduleDef.domainId;
    const domainItems = allItems.filter((i) => i.domainId === domainId);

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
        scoredItems.push({
          weight: getProvisionalDifficultyWeight(item.difficulty) * (item.scoring.weight ?? 1),
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
      scoredItems.push({
        weight: resp.weightApplied > 0 ? resp.weightApplied : getProvisionalDifficultyWeight(item.difficulty),
        credit: resp.scoredCredit,
        guessFloor: numOptions > 1 ? 1 / numOptions : 0,
      });

      // Weakness identification (§12, §31)
      if (resp.result === 'incorrect' && item.errorCategories.length > 0) {
        const isConfidentError = resp.responseConfidence === 'confident';
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

      // Exposure recording (§13)
      exposures[item.id] = {
        itemId: item.id,
        exposureCount: 1,
        lastSeenAt: assessmentDate,
        lastAttemptId: terminalAttempt.id,
        lastResult: resp.result,
        previousAssessmentUsage: [terminalAttempt.kind],
        estimationUses: 1,
        eligibleForFutureEstimation: false,
        releasedToPractice: item.exposurePolicy.releaseToPractice,
      };
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
    // >= 5 scored responses (>= 4 for interviews), >= 2 difficulty bands, >= 2 competencies
    const minRequiredResponses = domainId === 'interviews' ? 4 : 5;
    const scoredResponsesCount = domainItems.length - unansweredCount;
    const hasMinEvidence =
      scoredResponsesCount >= minRequiredResponses &&
      difficultyBandsSet.size >= 2 &&
      competenciesSet.size >= 2;

    // Status Assignment per §4.3
    let status: 'assessed' | 'partially_assessed' | 'unassessed';
    const isClassB = ['python', 'communication', 'interviews'].includes(domainId);

    if (!hasMinEvidence) {
      status = 'partially_assessed';
    } else if (isClassB) {
      status = 'partially_assessed'; // Class B is always partial construct by definition
    } else {
      status = 'assessed';
    }

    // Level Assignment per §10.1 & §10.3
    let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    if (hasMinEvidence && abilityScore > 0) {
      level = mapAbilityToProvisionalLevel(abilityScore);
    }

    // Confidence Derivation per §11.2 (0 to 1 normalized)
    const obsFactor = Math.min(1, scoredResponsesCount / moduleDef.itemCount);
    const covFactor = Math.min(1, competenciesSet.size / Math.max(1, domainItems.length / 2));
    const diffFactor = Math.min(1, difficultyBandsSet.size / 2);
    const consistencyFactor = scoredResponsesCount > 0 ? (correctCount === 0 || correctCount === scoredResponsesCount ? 1.0 : 0.8) : 0;
    const qualityFactor = Math.max(0, 1 - (dkCount + unansweredCount) / domainItems.length);
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

    const domainResult: DomainAssessmentResult = {
      domainId,
      abilityScore,
      level,
      confidence,
      status,
      coverage: {
        topicsCovered: topicsSet.size,
        topicsTotal: topicsSet.size,
        competenciesCovered: Array.from(competenciesSet),
        difficultyBands: Array.from(difficultyBandsSet),
      },
      assessmentDate,
      provisional: true, // Baseline results are provisional until confirmed (§10.4)
      constructScope,
      attemptId: terminalAttempt.id,
      kind: terminalAttempt.kind,
    };

    domainResults.push(domainResult);

    // Evidence Log Emission (§23.1)
    if (scoredResponsesCount > 0) {
      const topicId = domainItems[0]?.topicId ?? domainTopicFallback[domainId];
      const confRating: 1 | 2 | 3 | 4 | 5 = confidence === 'high' ? 5 : confidence === 'medium' ? 3 : 2;

      evidenceLogs.push({
        id: `ev-asm-${terminalAttempt.id}-${domainId}`,
        timestamp: assessmentDate,
        sourceType: 'test',
        sourceId: terminalAttempt.id,
        topicId,
        domainId,
        score: abilityScore,
        confidence: confRating,
        details: `Assessment: diagnostic_assessment · ability ${abilityScore} · level ${level} · confidence ${confidence}`,
      });
    }
  }

  // Projects Domain (Class C - Excluded from baseline per §20)
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

  // Create Snapshot (§19, §31)
  const snapshot: AssessmentSnapshot = {
    id: `snap-baseline-${terminalAttempt.id}`,
    takenAt: assessmentDate,
    kind: terminalAttempt.kind,
    trigger: 'post_baseline',
    domainResults,
  };

  return {
    attempt: terminalAttempt,
    domainResults,
    weaknessSignals,
    snapshot,
    exposures,
    evidenceLogs,
  };
}

/**
 * Placeholder for future adaptive selection - will be implemented in Phase E
 */
export function selectSundayTestItems(): never {
  throw new Error('Not implemented in Phase C - see Phase E');
}

/**
 * Placeholder for future level regression logic - will be implemented in Phase F
 */
export function checkLevelRegression(): never {
  throw new Error('Not implemented in Phase C - see Phase F');
}

/**
 * Placeholder for future full reassessment - will be implemented in Phase F
 */
export function runFullReassessment(): never {
  throw new Error('Not implemented in Phase C - see Phase F');
}