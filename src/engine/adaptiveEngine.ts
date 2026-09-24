import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  PlacementMode,
} from '../types';

export interface PriorityBreakdown {
  urgency: number;         // 0 - 100
  weakness: number;        // 0 - 100
  importance: number;      // 0 - 100
  companyRelevance: number;// 0 - 100
  spacedRepetition: number;// 0 - 100
  recoveryUrgency: number; // 0 - 100
  baseScore: number;       // Weighted score 0 - 100
  finalScore: number;      // Clamped score 0 - 100
  explanation: string;
}

export interface CandidateTask {
  task: TaskDefinition;
  progress?: TaskProgress;
  dsaProblem?: DSAProblem;
  dsaProgress?: DSAProgress;
  breakdown: PriorityBreakdown;
}

/**
 * Calculates date difference in full calendar days (target - today).
 */
export function getDaysDifference(targetDateStr: string, todayStr: string): number {
  const target = new Date(targetDateStr);
  const today = new Date(todayStr);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 1. Urgency Score (0 - 100)
 */
export function calculateUrgency(task: TaskDefinition, todayStr: string): number {
  if (!task.dueDate) return 0;
  const daysRemaining = getDaysDifference(task.dueDate, todayStr);
  if (daysRemaining <= 0) return 100;
  if (daysRemaining <= 14) return Math.max(0, Math.round(100 - daysRemaining * 6.5));
  return 10;
}

/**
 * 2. Importance Score (0 - 100)
 */
export function calculateImportance(task: TaskDefinition): number {
  return Math.min(100, Math.max(0, task.importance * 10));
}

/**
 * 3. Weakness Score (0 - 100)
 */
export function calculateWeakness(
  task: TaskDefinition,
  skillStates: Record<string, TopicSkillState>
): number {
  const skill = skillStates[task.topicId];
  const evidenceStrength = skill?.evidenceStrength ?? 0;
  const baseWeakness = 100 - evidenceStrength;

  let freshnessMultiplier = 0.85; // default untested
  if (skill) {
    switch (skill.freshness) {
      case 'fresh':
        freshnessMultiplier = 1.0;
        break;
      case 'aging':
        freshnessMultiplier = 1.15;
        break;
      case 'stale':
        freshnessMultiplier = 1.3;
        break;
      case 'untested':
      default:
        freshnessMultiplier = 0.85;
        break;
    }
  }

  return Math.min(100, Math.max(0, Math.round(baseWeakness * freshnessMultiplier)));
}

/**
 * 4. Company Relevance Score (0 - 100)
 */
export function calculateCompanyRelevance(
  task: TaskDefinition,
  companyOverlays: CompanyOverlay[],
  mode: PlacementMode
): number {
  const activeCompanies = companyOverlays.filter((c) =>
    ['target', 'applied', 'oa_scheduled', 'interview_scheduled'].includes(c.applicationStatus)
  );

  if (activeCompanies.length === 0) return 0;

  let maxCompanyScore = 0;

  for (const comp of activeCompanies) {
    let score = 0;
    if (comp.requiredDomains.includes(task.domainId)) score += 30;
    if (comp.requiredTopics.includes(task.topicId)) score += 40;

    if (task.languageTags && comp.requiredLanguages) {
      const hasLangOverlap = task.languageTags.some((lang) =>
        comp.requiredLanguages.includes(lang)
      );
      if (hasLangOverlap) score += 30;
    }

    if (score > maxCompanyScore) {
      maxCompanyScore = score;
    }
  }

  // Boost company relevance by 1.5x during placement sprint
  if (mode === 'placement_sprint') {
    maxCompanyScore = Math.round(maxCompanyScore * 1.5);
  }

  return Math.min(100, maxCompanyScore);
}

/**
 * 5. Spaced Repetition Score (0 - 100)
 */
export function calculateSpacedRepetition(
  task: TaskDefinition,
  dsaProgress?: DSAProgress,
  todayStr?: string
): number {
  if (dsaProgress && todayStr) {
    const daysUntilReview = getDaysDifference(dsaProgress.nextReviewAt, todayStr);
    if (daysUntilReview <= 0) return 100;
    if (daysUntilReview === 1) return 50;
    return 0;
  }
  return task.taskType === 'review' ? 70 : 0;
}

/**
 * 6. Recovery Urgency Score (0 - 100)
 */
export function calculateRecoveryUrgency(
  task: TaskDefinition,
  progress?: TaskProgress,
  todayStr?: string
): number {
  if (!progress) return 0;

  const postponeCount = progress.postponeCount || 0;
  const skipCount = progress.skipCount || 0;
  const isOverdue = task.dueDate && todayStr ? getDaysDifference(task.dueDate, todayStr) < 0 : false;

  const score = postponeCount * 25 + skipCount * 30 + (isOverdue ? 40 : 0);
  return Math.min(100, score);
}

/**
 * Calculates complete priority score & breakdown for a task.
 */
export function evaluateCandidateTask(
  task: TaskDefinition,
  progress: TaskProgress | undefined,
  _dsaProblem: DSAProblem | undefined,
  dsaProgress: DSAProgress | undefined,
  skillStates: Record<string, TopicSkillState>,
  companyOverlays: CompanyOverlay[],
  mode: PlacementMode,
  todayStr: string
): PriorityBreakdown {
  const urgency = calculateUrgency(task, todayStr);
  const weakness = calculateWeakness(task, skillStates);
  const importance = calculateImportance(task);
  const companyRelevance = calculateCompanyRelevance(task, companyOverlays, mode);
  const spacedRepetition = calculateSpacedRepetition(task, dsaProgress, todayStr);
  const recoveryUrgency = calculateRecoveryUrgency(task, progress, todayStr);

  // Exact V1 Priority Weights (Total = 1.00)
  const baseScore =
    0.25 * urgency +
    0.20 * weakness +
    0.20 * importance +
    0.15 * companyRelevance +
    0.10 * spacedRepetition +
    0.10 * recoveryUrgency;

  const finalScore = Math.min(100, Math.max(0, Math.round(baseScore)));

  // Generate explainable reason
  const reasons: string[] = [];
  if (urgency >= 70) reasons.push('urgent deadline');
  if (weakness >= 70) reasons.push('topic weakness / stale review');
  if (importance >= 80) reasons.push(`high core importance (${task.importance}/10)`);
  if (companyRelevance >= 50) reasons.push('matches active target company requirements');
  if (spacedRepetition >= 50) reasons.push('due in Leitner spaced repetition system');
  if (recoveryUrgency >= 50) reasons.push('repeatedly postponed / overdue recovery');

  const explanation =
    reasons.length > 0
      ? `Prioritized due to ${reasons.join(', ')}.`
      : `Standard Phase 1 roadmap task (${task.importance}/10 importance).`;

  return {
    urgency,
    weakness,
    importance,
    companyRelevance,
    spacedRepetition,
    recoveryUrgency,
    baseScore,
    finalScore,
    explanation,
  };
}

/**
 * Collects, filters, evaluates, and deterministically sorts all candidate tasks.
 */
export function getEvaluatedCandidates(
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  skillStates: Record<string, TopicSkillState>,
  companyOverlays: CompanyOverlay[],
  mode: PlacementMode,
  todayStr: string
): CandidateTask[] {
  const candidates: CandidateTask[] = [];

  for (const task of tasks) {
    const progress = taskProgressMap[task.id];

    // Exclude completed or archived tasks
    if (progress && (progress.state === 'completed' || progress.state === 'archived')) {
      continue;
    }

    // Exclude tasks postponed to future date
    if (progress?.postponedUntil && progress.postponedUntil > todayStr) {
      continue;
    }

    // Exclude tasks with incomplete prerequisites
    if (task.prerequisiteTaskDefinitionIds && task.prerequisiteTaskDefinitionIds.length > 0) {
      const hasUnmetPrereqs = task.prerequisiteTaskDefinitionIds.some(
        (prereqId) => taskProgressMap[prereqId]?.state !== 'completed'
      );
      if (hasUnmetPrereqs) continue;
    }

    const dsaProblem = dsaProblems.find((p) => p.topicId === task.topicId);
    const dsaProgress = dsaProblem ? dsaProgressMap[dsaProblem.id] : undefined;

    const breakdown = evaluateCandidateTask(
      task,
      progress,
      dsaProblem,
      dsaProgress,
      skillStates,
      companyOverlays,
      mode,
      todayStr
    );

    candidates.push({
      task,
      progress,
      dsaProblem,
      dsaProgress,
      breakdown,
    });
  }

  // Deterministic Ordering Rule:
  // 1. finalScore descending
  // 2. effectiveDueDate ascending
  // 3. importance descending
  // 4. task title string ascending
  return candidates.sort((a, b) => {
    if (b.breakdown.finalScore !== a.breakdown.finalScore) {
      return b.breakdown.finalScore - a.breakdown.finalScore;
    }

    const dateA = a.task.dueDate || '9999-99-99';
    const dateB = b.task.dueDate || '9999-99-99';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    if (b.task.importance !== a.task.importance) {
      return b.task.importance - a.task.importance;
    }

    return a.task.title.localeCompare(b.task.title);
  });
}

/**
 * Calculates time budget allocation based on PlacementMode.
 */
export function getTimeBudget(mode: PlacementMode, availableMinutes: number): number {
  switch (mode) {
    case 'reduced':
      return Math.min(90, Math.round(0.5 * availableMinutes));
    case 'exam':
      return Math.min(45, Math.round(0.3 * availableMinutes));
    case 'placement_sprint':
    case 'normal':
    default:
      return availableMinutes;
  }
}

/**
 * Selects optimal daily task plan fitting within available time budget.
 */
export function selectDailyPlan(
  candidates: CandidateTask[],
  timeBudgetMinutes: number
): CandidateTask[] {
  const selected: CandidateTask[] = [];
  let currentMinutes = 0;

  for (const candidate of candidates) {
    if (currentMinutes + candidate.task.estimatedMinutes <= timeBudgetMinutes) {
      selected.push(candidate);
      currentMinutes += candidate.task.estimatedMinutes;
    }
  }

  // Single over-budget exception rule: if plan is empty and budget > 0, pick top candidate
  if (selected.length === 0 && candidates.length > 0 && timeBudgetMinutes > 0) {
    selected.push(candidates[0]);
  }

  return selected;
}

/**
 * 4-Box Leitner Spaced Repetition Transition Rules (9 Combinations)
 */
export function calculateNextLeitnerBox(
  currentBox: 1 | 2 | 3 | 4,
  result: 'pass' | 'partial' | 'fail',
  assistanceLevel: 'none' | 'hint' | 'solution'
): { nextBox: 1 | 2 | 3 | 4; intervalDays: number } {
  let nextBox: 1 | 2 | 3 | 4;

  if (result === 'pass') {
    if (assistanceLevel === 'none') {
      nextBox = Math.min(4, currentBox + 1) as 1 | 2 | 3 | 4;
    } else if (assistanceLevel === 'hint') {
      nextBox = currentBox;
    } else {
      nextBox = Math.max(1, currentBox - 1) as 1 | 2 | 3 | 4;
    }
  } else if (result === 'partial') {
    if (assistanceLevel === 'none') {
      nextBox = currentBox;
    } else if (assistanceLevel === 'hint') {
      nextBox = Math.max(1, currentBox - 1) as 1 | 2 | 3 | 4;
    } else {
      nextBox = 1;
    }
  } else {
    // result === 'fail'
    nextBox = 1;
  }

  const boxIntervals: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
  };

  return {
    nextBox,
    intervalDays: boxIntervals[nextBox],
  };
}

/**
 * Deterministic Evidence Score Calculation
 */
export function calculateEvidenceScore(
  result: 'pass' | 'partial' | 'fail',
  assistanceLevel: 'none' | 'hint' | 'solution',
  confidence: 1 | 2 | 3 | 4 | 5
): number {
  let base = 95;
  if (result === 'partial') base = 60;
  if (result === 'fail') base = 25;

  let multiplier = 1.0;
  if (assistanceLevel === 'hint') multiplier = 0.8;
  if (assistanceLevel === 'solution') multiplier = 0.5;

  const score = Math.round(base * multiplier) + (confidence - 3) * 5;
  return Math.min(100, Math.max(0, score));
}
