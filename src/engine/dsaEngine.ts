import type {
  DSAProblem,
  DSAProgress,
  LeitnerBox,
  AttemptResult,
  AssistanceLevel,
  PatternSelfCheckEvidence,
} from '../types';

/**
 * Calculates whether a DSA problem is unlocked.
 * Requirements (v1.4 Section 7):
 * 1. Phase check: recommendedPhase (1..4) <= current active phase (1..4).
 * 2. Prerequisite check:
 *    - Anchor problems (isAnchor === true) or empty prerequisites: unlocked if recommended phase <= current active phase.
 *    - Non-anchor problems: ALL prerequisite problem IDs must be satisfied in progressMap.
 *      A prerequisite is satisfied if progressMap[prereqId] exists AND
 *      (passedIndependently === true OR assistedProvisional === true OR currentBox >= 2).
 * 3. Remediation state:
 *    - If progressMap[problem.id]?.remediationRequired === true, it is in remediation mode (actionable for remediation).
 */
export interface UnlockResult {
  isUnlocked: boolean;
  reason?: string;
  unmetPrerequisites?: string[];
}

export function isProblemUnlocked(
  problem: DSAProblem,
  progressMap: Record<string, DSAProgress>,
  currentPhase: number = 1
): UnlockResult {
  // 1. Phase check
  if (problem.recommendedPhase > currentPhase) {
    return {
      isUnlocked: false,
      reason: `Locked until Phase ${problem.recommendedPhase} (Current: Phase ${currentPhase})`,
    };
  }

  // 2. Prerequisite check
  if (!problem.prerequisites || problem.prerequisites.length === 0) {
    return { isUnlocked: true };
  }

  const unmetPrereqs: string[] = [];
  for (const prereqId of problem.prerequisites) {
    const prereqProg = progressMap[prereqId];
    if (!prereqProg) {
      unmetPrereqs.push(prereqId);
      continue;
    }
    // Prerequisite satisfied if passed independently, provisionally passed via assistance, or in Leitner box >= 2
    const isSatisfied =
      prereqProg.passedIndependently ||
      prereqProg.assistedProvisional ||
      (prereqProg.currentBox && prereqProg.currentBox >= 2);
    if (!isSatisfied) {
      unmetPrereqs.push(prereqId);
    }
  }

  if (unmetPrereqs.length > 0) {
    return {
      isUnlocked: false,
      reason: `Requires prerequisite completion (${unmetPrereqs.length} remaining)`,
      unmetPrerequisites: unmetPrereqs,
    };
  }

  return { isUnlocked: true };
}

/**
 * Leitner Box Intervals & Transition logic (v1.4 Section 12)
 * Boxes 1..4 spaced review intervals (in days):
 * Box 1 = 1 day
 * Box 2 = 3 days
 * Box 3 = 7 days
 * Box 4 = 14 days
 */
export function getLeitnerIntervalDays(box: LeitnerBox): number {
  switch (box) {
    case 1:
      return 1;
    case 2:
      return 3;
    case 3:
      return 7;
    case 4:
      return 14;
    default:
      return 1;
  }
}

/**
 * Calculates next review date ISO string (YYYY-MM-DD) from current date.
 */
export function calculateNextReviewDate(box: LeitnerBox, fromDateISO?: string): string {
  const baseDate = fromDateISO ? new Date(fromDateISO) : new Date();
  const intervalDays = getLeitnerIntervalDays(box);
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deterministic Leitner Box Transition Function (v1.4 Section 12)
 * Rules:
 * - fail -> Box 1
 * - partial -> max(1, currentBox - 1)
 * - pass + hint/solution -> retain current box (min 1)
 * - pass + none -> min(4, currentBox + 1)
 */
export function calculateNextLeitnerBox(
  currentBox: LeitnerBox = 1,
  result: AttemptResult,
  assistance: AssistanceLevel
): LeitnerBox {
  if (result === 'fail') {
    return 1;
  }
  if (result === 'partial') {
    return Math.max(1, currentBox - 1) as LeitnerBox;
  }
  if (result === 'pass') {
    if (assistance === 'none') {
      return Math.min(4, currentBox + 1) as LeitnerBox;
    } else {
      return currentBox;
    }
  }
  return currentBox;
}

/**
 * Attempt Scoring & Evidence Strength (v1.4 Section 11 & 10)
 * BaseScore:
 * pass + none = 1.0
 * pass + hint = 0.6
 * pass + solution = 0.3
 * partial + none = 0.5
 * partial + hint = 0.3
 * partial + solution = 0.1
 * fail = 0.0
 *
 * SelfCheckBonus:
 * Each of (patternRecognition, timeComplexity, spaceComplexity):
 * 'correct' -> +0.05
 * 'incorrect' / 'unsure' -> +0.00
 * Max selfCheckBonus = +0.15
 *
 * AttemptEventScore = BaseScore + SelfCheckBonus
 * EvidenceStrengthNew = min(1.0, 0.7 * EvidenceStrengthOld + 0.3 * AttemptEventScore)
 */
export function calculateAttemptScore(
  result: AttemptResult,
  assistance: AssistanceLevel,
  selfCheck?: PatternSelfCheckEvidence
): { baseScore: number; selfCheckBonus: number; totalEventScore: number } {
  let baseScore = 0.0;
  if (result === 'pass') {
    if (assistance === 'none') baseScore = 1.0;
    else if (assistance === 'hint') baseScore = 0.6;
    else if (assistance === 'solution') baseScore = 0.3;
  } else if (result === 'partial') {
    if (assistance === 'none') baseScore = 0.5;
    else if (assistance === 'hint') baseScore = 0.3;
    else if (assistance === 'solution') baseScore = 0.1;
  } else {
    baseScore = 0.0;
  }

  let selfCheckBonus = 0.0;
  if (selfCheck) {
    if (selfCheck.patternRecognition === 'correct') selfCheckBonus += 0.05;
    if (selfCheck.timeComplexity === 'correct') selfCheckBonus += 0.05;
    if (selfCheck.spaceComplexity === 'correct') selfCheckBonus += 0.05;
  }

  selfCheckBonus = Math.round(selfCheckBonus * 100) / 100;
  const totalEventScore = Math.round((baseScore + selfCheckBonus) * 100) / 100;

  return {
    baseScore,
    selfCheckBonus,
    totalEventScore,
  };
}

export function updateEvidenceStrength(
  currentEvidence: number = 0.0,
  attemptEventScore: number
): number {
  const newStrength = 0.7 * currentEvidence + 0.3 * attemptEventScore;
  const rounded = Number(newStrength.toFixed(2));
  return Math.min(1.0, Math.max(0, rounded));
}

/**
 * Remediation Evaluator (v1.4 Section 9)
 * Rules:
 * - 3 consecutive failures -> remediationRequired = true
 * - Cleared only when: patternLessonCompleted === true AND remediationSelfCheckPassed === true (quiz score >= 2/3)
 */
export function processAttemptForRemediation(
  currentProgress: DSAProgress | undefined,
  result: AttemptResult
): {
  consecutiveFailures: number;
  remediationRequired: boolean;
} {
  let newFailures = currentProgress?.consecutiveFailures || 0;
  let remediationReq = currentProgress?.remediationRequired || false;

  if (result === 'fail') {
    newFailures += 1;
    if (newFailures >= 3) {
      remediationReq = true;
    }
  } else if (result === 'pass') {
    newFailures = 0;
  }

  return {
    consecutiveFailures: newFailures,
    remediationRequired: remediationReq,
  };
}

/**
 * Pattern Mastery Engine (v1.4 Section 14)
 * MASTERED requires:
 * 1. UniqueIndependentSolves >= min(2, StarterCount) + min(1, CoreCount)
 * 2. BestPerProblemMasteryRatio >= 60% (ratio of attempted problems meeting independent mastery evidence strength >= 0.60 or passedIndependently)
 * 3. At least one problem in pattern reaches Leitner Box 3 or 4
 */
export interface PatternMasteryResult {
  patternId: string;
  state: 'not_started' | 'in_progress' | 'mastered';
  totalProblems: number;
  attemptedCount: number;
  independentSolves: number;
  assistedSolves: number;
  starterCount: number;
  coreCount: number;
  requiredIndependentSolves: number;
  masteryRatio: number; // 0..100
  hasBox3Or4: boolean;
  remediationActive: boolean;
}

export function calculatePatternMastery(
  patternId: string,
  problems: DSAProblem[],
  progressMap: Record<string, DSAProgress>
): PatternMasteryResult {
  const patternProblems = problems.filter(
    (p) => p.primaryPattern === patternId || p.secondaryPatterns?.includes(patternId)
  );

  const starterCount = patternProblems.filter(
    (p) => p.progressionTier?.toLowerCase() === 'starter'
  ).length;
  const coreCount = patternProblems.filter(
    (p) => p.progressionTier?.toLowerCase() === 'core'
  ).length;
  const requiredIndependentSolves = Math.min(2, starterCount) + Math.min(1, coreCount);

  let attemptedCount = 0;
  let independentSolves = 0;
  let assistedSolves = 0;
  let masteredEvidenceCount = 0;
  let hasBox3Or4 = false;
  let remediationActive = false;

  for (const prob of patternProblems) {
    const prog = progressMap[prob.id];
    if (prog && prog.attemptCount > 0) {
      attemptedCount++;
      if (prog.remediationRequired) {
        remediationActive = true;
      }
      if (prog.passedIndependently) {
        independentSolves++;
      } else if (prog.assistedProvisional) {
        assistedSolves++;
      }
      if ((prog.evidenceStrength && prog.evidenceStrength >= 0.6) || prog.passedIndependently) {
        masteredEvidenceCount++;
      }
      if (prog.currentBox >= 3) {
        hasBox3Or4 = true;
      }
    }
  }

  const masteryRatio = attemptedCount > 0 ? Math.round((masteredEvidenceCount / attemptedCount) * 100) : 0;

  const isMastered =
    independentSolves >= requiredIndependentSolves &&
    masteryRatio >= 60 &&
    hasBox3Or4 &&
    !remediationActive;

  const state = attemptedCount === 0 ? 'not_started' : isMastered ? 'mastered' : 'in_progress';

  return {
    patternId,
    state,
    totalProblems: patternProblems.length,
    attemptedCount,
    independentSolves,
    assistedSolves,
    starterCount,
    coreCount,
    requiredIndependentSolves,
    masteryRatio,
    hasBox3Or4,
    remediationActive,
  };
}

/**
 * Adaptive DSA Selection (v1.4 Section 13)
 * Priority order:
 * 1. remediationRequired
 * 2. reviewDue (nextReviewAt <= todayISO)
 * 3. newlyUnlocked (unlocked, attemptCount === 0)
 * 4. weakPattern (in pattern with mastery state != 'mastered')
 * 5. normal progression
 *
 * Tie-breaking:
 * - prefer anchor problems (isAnchor === true)
 * - prefer earlier curriculum phase
 * - deterministic problem ID order
 * Maximum 2 actions/day.
 */
export interface DSASignalItem {
  problem: DSAProblem;
  progress?: DSAProgress;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

export function getDSASignals(
  problems: DSAProblem[],
  progressMap: Record<string, DSAProgress>,
  currentPhase: number = 1,
  todayISO: string = new Date().toISOString().split('T')[0]
): DSASignalItem[] {
  const items: DSASignalItem[] = [];

  for (const prob of problems) {
    const prog = progressMap[prob.id];
    const unlockStatus = isProblemUnlocked(prob, progressMap, currentPhase);

    // 1. Remediation required (always actionable regardless of phase lock)
    if (prog?.remediationRequired) {
      items.push({
        problem: prob,
        progress: prog,
        priorityTier: 1,
        reason: 'Remediation required: review pattern lesson and pass self-check quiz',
      });
      continue;
    }

    if (!unlockStatus.isUnlocked) continue;

    // 2. Review due
    if (prog && prog.nextReviewAt && prog.nextReviewAt <= todayISO) {
      items.push({
        problem: prob,
        progress: prog,
        priorityTier: 2,
        reason: `Review Due: Box ${prog.currentBox} review scheduled for ${prog.nextReviewAt}`,
      });
      continue;
    }

    // 3. Newly unlocked
    if (!prog || prog.attemptCount === 0) {
      items.push({
        problem: prob,
        progress: prog,
        priorityTier: 3,
        reason: 'Newly unlocked problem ready for first attempt',
      });
      continue;
    }

    // 4. Weak pattern reinforcement / low evidence strength
    if (prog.evidenceStrength !== undefined && prog.evidenceStrength < 0.6) {
      items.push({
        problem: prob,
        progress: prog,
        priorityTier: 4,
        reason: `Reinforce weak pattern evidence (${Math.round(prog.evidenceStrength * 100)}%)`,
      });
      continue;
    }

    // 5. Normal progression
    items.push({
      problem: prob,
      progress: prog,
      priorityTier: 5,
      reason: 'Normal curriculum progression',
    });
  }

  // Sort deterministically
  items.sort((a, b) => {
    if (a.priorityTier !== b.priorityTier) {
      return a.priorityTier - b.priorityTier;
    }
    // Prefer anchor problems
    if (a.problem.isAnchor !== b.problem.isAnchor) {
      return a.problem.isAnchor ? -1 : 1;
    }
    // Prefer earlier phase
    if (a.problem.recommendedPhase !== b.problem.recommendedPhase) {
      return a.problem.recommendedPhase - b.problem.recommendedPhase;
    }
    // Deterministic ID order
    return a.problem.id.localeCompare(b.problem.id);
  });

  return items;
}
