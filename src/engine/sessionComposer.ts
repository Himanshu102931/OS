import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  PlacementMode,
  DailyTaskAssignment,
  Topic,
  DomainDefinition,
  Phase,
  PracticeAttempt,
  PracticeSessionDefinition,
  PreparationTopic,
  PreparationTopicProgress,
  DomainAssessmentResult,
  WeaknessSignal,
  DSAAttempt,
  EvidenceLog,
} from '../types';
import { generateReviewCandidates } from './reviewScheduler';
import type { ReviewCandidate, ReviewPriority } from './reviewScheduler';
import { type ReviewPrompt } from './analyticsEngine';
import type { AssessmentProfileReadout } from './assessmentEngine';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { COVERAGE_STAGES } from './preparationEngine';

/**
 * Session Composer Modes supported by PlacementOS.
 * - 'balanced': default - balanced distribution across urgent review, weaknesses/deadlines, and targeted practice/learning.
 * - 'focused': deep work on single top priority/weakness, pairing learning with practice and avoiding context switching.
 * - 'review_heavy': prioritizes clearing reviews, remediation, and retention backlog first.
 */
export type SessionComposerMode = 'balanced' | 'focused' | 'review_heavy';

/**
 * Energy Level convention from DailyCheckIn.
 */
export type EnergyLevel = 'low' | 'medium' | 'high';

/**
 * Prioritized priority tiers from highest to lowest.
 */
export const COMPOSER_PRIORITY_TIERS: ReviewPriority[] = [
  'remediation',
  'overdue_review',
  'routed_weakness',
  'company_gap',
  'stale_evidence',
  'weak_topic',
  'retention',
  'normal_progression',
];

/**
 * Maps a candidate priority tier and internal score to a 0-100 composite priority score.
 * Guarantees that activities from higher priority tiers always have a score greater than or
 * equal to activities from lower tiers, while preserving relative order within the tier.
 */
export function calculateActivityPriorityScore(
  priority: ReviewPriority,
  tierScore: number
): number {
  const tierIndex = COMPOSER_PRIORITY_TIERS.indexOf(priority);
  const invertedTier = tierIndex >= 0 ? 7 - tierIndex : 0;
  const base = invertedTier * 12.5;
  const withinTier = Math.min(12.4, Math.max(0, (tierScore / 100) * 12.5));
  return Math.round((base + withinTier) * 10) / 10;
}

export interface SessionActivity {
  id: string;
  type:
    | 'dsa_review'
    | 'dsa_remediation'
    | 'dsa_new'
    | 'roadmap_task'
    | 'preparation_lesson'
    | 'practice_session'
    | 'review_activity';
  title: string;
  description: string;
  sourceSubsystem: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'review' | 'assessment';
  priority: ReviewPriority;
  priorityScore: number;
  domainId: string;
  topicId: string;
  estimatedMinutes: number;
  reason: string;
  route: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'dashboard';
  targetId: string;
  deepLink: {
    route: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'dashboard';
    param?: string;
  };
  producesEvidence: boolean;
  evidenceExpectation?: string;
  sourceProblemId?: string;
  sourceTaskId?: string;
  sourceTopicId?: string;
  sourceSkillState?: unknown;
  isBlocked: boolean;
  blockingReason?: string;
}

export interface SessionPlan {
  activities: SessionActivity[];
  totalEstimatedMinutes: number;
  timeBudgetMinutes: number;
  remainingMinutes: number;
  composedAt: string;
  availableMinutes: number;
  mode: PlacementMode;
  sessionMode: SessionComposerMode;
  todayStr: string;
  selectedCompanyId?: string;
  energyLevel?: EnergyLevel;
}

export interface SessionState {
  plan: SessionPlan;
  currentActivityIndex: number;
  startedAt: string;
  completedActivityIds: string[];
  skippedActivityIds: string[];
  failedActivityIds: string[];
  postponedActivityIds: string[];
}

export interface AdaptiveSessionOptions {
  // Time budget
  availableMinutes: number;
  // Current date (YYYY-MM-DD)
  todayStr: string;
  // Placement mode
  mode?: PlacementMode;
  // Session composition mode (balanced, focused, review_heavy)
  sessionMode?: SessionComposerMode;
  // Energy level from DailyCheckIn
  energyLevel?: EnergyLevel;
  // Selected company for Company Focus Mode
  selectedCompanyId?: string;
  // If true, never exceed availableMinutes under any circumstances
  strictBudget?: boolean;

  // Canonical candidate sources
  tasks?: TaskDefinition[] | unknown[];
  taskProgressMap?: Record<string, TaskProgress | unknown>;
  dsaProblems?: DSAProblem[] | unknown[];
  dsaProgressMap?: Record<string, DSAProgress | unknown>;
  topics?: Topic[] | unknown[];
  domains?: DomainDefinition[] | unknown[];
  skillStates?: Record<string, TopicSkillState | unknown>;
  companyOverlays?: CompanyOverlay[] | unknown[];
  practiceSessions?: PracticeSessionDefinition[] | unknown[];
  practiceAttempts?: PracticeAttempt[] | unknown[];
  preparationTopics?: PreparationTopic[] | unknown[];
  preparationTopicProgress?: Record<string, PreparationTopicProgress | unknown>;
  domainResults?: DomainAssessmentResult[] | unknown[];
  weaknessSignals?: WeaknessSignal[] | unknown[];
  assessmentProfileReadout?: AssessmentProfileReadout | unknown;
  activePhase?: Phase | number;
  todayAssignments?: DailyTaskAssignment[] | unknown[];
  dsaAttempts?: DSAAttempt[] | unknown[];
  evidenceLogs?: EvidenceLog[] | unknown[];
  analyticsReviewPrompts?: ReviewPrompt[];
}

export type SessionComposerOptions = AdaptiveSessionOptions;

/**
 * Builds a SessionActivity with rich metadata, deep-link routing, and evidence expectation.
 */
function buildSessionActivityFromCandidate(
  candidate: ReviewCandidate,
  overrideReason?: string,
  overrideScore?: number
): SessionActivity {
  let sourceSubsystem: SessionActivity['sourceSubsystem'];
  let route: SessionActivity['route'];
  let producesEvidence: boolean;
  let evidenceExpectation: string;

  switch (candidate.type) {
    case 'dsa_review':
    case 'dsa_remediation':
    case 'dsa_new':
      sourceSubsystem = 'dsa';
      route = 'dsa';
      producesEvidence = true;
      evidenceExpectation = 'Completing DSA problem updates Leitner box and logs practice evidence';
      break;
    case 'preparation_lesson':
      sourceSubsystem = 'preparation';
      route = 'preparation';
      producesEvidence = true;
      evidenceExpectation = 'Completing lesson updates preparation topic progress and unlocks practice drills';
      break;
    case 'practice_session':
      sourceSubsystem = 'practice';
      route = 'practice';
      producesEvidence = true;
      evidenceExpectation = 'Completing practice drill records accuracy score and updates skill telemetry';
      break;
    case 'roadmap_task':
    default:
      sourceSubsystem = 'roadmap';
      route = candidate.route || 'roadmap';
      producesEvidence = true;
      evidenceExpectation = 'Completing task updates curriculum progress and produces evidence';
      break;
  }

  // Format explainable reason
  let reason = overrideReason || candidate.reason;
  if (!reason) {
    switch (candidate.priority) {
      case 'remediation':
        reason = 'Active remediation required';
        break;
      case 'overdue_review':
        reason = 'Overdue review';
        break;
      case 'routed_weakness':
        reason = 'Current weakness';
        break;
      case 'company_gap':
        reason = 'Company deadline pressure';
        break;
      case 'stale_evidence':
        reason = 'Evidence aging / refresh';
        break;
      case 'weak_topic':
        reason = 'Current weakness';
        break;
      case 'retention':
        reason = 'Retention review';
        break;
      default:
        reason = 'Curriculum progression';
        break;
    }
  }

  const priorityScore =
    typeof overrideScore === 'number'
      ? overrideScore
      : calculateActivityPriorityScore(candidate.priority, candidate.priorityScore);

  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    description: candidate.description,
    sourceSubsystem,
    priority: candidate.priority,
    priorityScore,
    domainId: candidate.domainId,
    topicId: candidate.topicId,
    estimatedMinutes: candidate.estimatedMinutes,
    reason,
    route,
    targetId: candidate.targetId,
    deepLink: {
      route,
      param: candidate.targetId,
    },
    producesEvidence,
    evidenceExpectation,
    sourceProblemId: candidate.sourceProblemId,
    sourceTaskId: candidate.sourceTaskId,
    sourceTopicId: candidate.sourceTopicId,
    sourceSkillState: candidate.sourceSkillState,
    isBlocked: false,
  };
}

/**
 * Primary Adaptive Session Composer function.
 * Deterministically packs available time with prioritized, balanced activities
 * based on review urgency, weaknesses, company deadlines, prerequisites, and session mode.
 * Pure function: no persistence, no side-effects, deterministic output.
 */
export function composeAdaptiveSession(options: AdaptiveSessionOptions): SessionPlan {
  const {
    availableMinutes,
    todayStr,
    mode = 'normal',
    sessionMode = 'balanced',
    energyLevel = 'medium',
    selectedCompanyId,
    strictBudget = false,
    tasks = [],
    taskProgressMap = {},
    dsaProblems = [],
    dsaProgressMap = {},
    topics = [],
    domains = [],
    skillStates = {},
    companyOverlays = [],
    practiceSessions = [],
    practiceAttempts = [],
    preparationTopics = [],
    preparationTopicProgress = {},
    domainResults = [],
    weaknessSignals = [],
    assessmentProfileReadout,
    activePhase = 1,
    todayAssignments = [],
    dsaAttempts = [],
    evidenceLogs = [],
    analyticsReviewPrompts = [],
  } = options;

  // 1. Budget boundary check
  if (availableMinutes <= 0) {
    return {
      activities: [],
      totalEstimatedMinutes: 0,
      timeBudgetMinutes: 0,
      remainingMinutes: 0,
      composedAt: new Date().toISOString(),
      availableMinutes: 0,
      mode,
      sessionMode,
      todayStr,
      selectedCompanyId,
      energyLevel,
    };
  }

  // Available catalogs with canonical fallbacks
  const availablePracticeCatalog = (
    practiceSessions && (practiceSessions as unknown[]).length > 0
      ? practiceSessions
      : PRACTICE_SESSIONS
  ) as PracticeSessionDefinition[];

  const prepTopicsCatalog = (
    preparationTopics && (preparationTopics as unknown[]).length > 0
      ? preparationTopics
      : PREPARATION_TOPICS
  ) as PreparationTopic[];

  // 2. Collect candidates via canonical reviewScheduler (pure function)
  const reviewResult = generateReviewCandidates({
    tasks: tasks as TaskDefinition[],
    taskProgressMap: taskProgressMap as Record<string, TaskProgress>,
    dsaProblems: dsaProblems as DSAProblem[],
    dsaProgressMap: dsaProgressMap as Record<string, DSAProgress>,
    topics: topics as Topic[],
    domains: domains as DomainDefinition[],
    skillStates: skillStates as Record<string, TopicSkillState>,
    companyOverlays: companyOverlays as CompanyOverlay[],
    currentMode: mode,
    todayStr,
    todayAssignments: todayAssignments as DailyTaskAssignment[],
    analyticsReviewPrompts,
    practiceAttempts: practiceAttempts as PracticeAttempt[],
    practiceSessions: availablePracticeCatalog,
    preparationTopics: prepTopicsCatalog,
    preparationTopicProgress: preparationTopicProgress as Record<string, PreparationTopicProgress>,
    domainResults: domainResults as DomainAssessmentResult[],
    weaknessSignals: weaknessSignals as WeaknessSignal[],
    assessmentProfileReadout: assessmentProfileReadout as AssessmentProfileReadout | undefined,
    activePhase: typeof activePhase === 'number' ? activePhase : 1,
    targetCompanyId: selectedCompanyId,
    dsaAttempts: dsaAttempts as DSAAttempt[],
    evidenceLogs: evidenceLogs as EvidenceLog[],
  });

  // 3. Exclude blocked candidates and already-completed work
  const todayAssignmentsTyped = todayAssignments as DailyTaskAssignment[];
  const todayCompletedTargets = new Set(
    todayAssignmentsTyped.filter((a) => a.completed).map((a) => a.referenceId)
  );

  const isCompletedOrArchived = (targetId: string) => {
    if (todayCompletedTargets.has(targetId)) return true;
    const taskProg = (taskProgressMap as Record<string, TaskProgress>)[targetId];
    if (taskProg && (taskProg.state === 'completed' || taskProg.state === 'archived')) return true;

    // Check preparation topic progress
    const prepProg = (preparationTopicProgress as Record<string, PreparationTopicProgress>)[targetId];
    if (prepProg) {
      const hasCompletedToday = prepProg.completedStages?.some(
        (s) => prepProg.stageProgress?.[s]?.completedAt?.startsWith(todayStr)
      );
      const hasCoverage = COVERAGE_STAGES.every((s) => prepProg.completedStages?.includes(s));
      if (hasCompletedToday || hasCoverage) return true;
    }

    // Check today's canonical evidence logs for this topic
    const hasEvidenceToday = (evidenceLogs as EvidenceLog[]).some(
      (l) => l.topicId === targetId && l.timestamp?.startsWith(todayStr)
    );
    if (hasEvidenceToday) return true;

    return false;
  };

  const eligibleCandidates = reviewResult.candidates.filter(
    (c) => !c.isBlocked && !isCompletedOrArchived(c.targetId)
  );

  // 4. Composition State
  const activities: SessionActivity[] = [];
  let remaining = availableMinutes;
  const selectedTargetIds = new Set<string>();

  const tryAddCandidate = (candidate: ReviewCandidate, overrideReason?: string): boolean => {
    if (selectedTargetIds.has(candidate.targetId)) return false;

    // Energy adjustment for low energy: prefer shorter activities (<= 30 min) when available
    if (
      energyLevel === 'low' &&
      candidate.estimatedMinutes > 30 &&
      eligibleCandidates.some(
        (c) => c.estimatedMinutes <= 30 && !selectedTargetIds.has(c.targetId)
      )
    ) {
      return false;
    }

    if (candidate.estimatedMinutes <= remaining) {
      const activity = buildSessionActivityFromCandidate(candidate, overrideReason);
      activities.push(activity);
      selectedTargetIds.add(candidate.targetId);
      remaining -= candidate.estimatedMinutes;
      return true;
    }
    return false;
  };

  const tryAddComplementaryPractice = (domainId: string, topicId: string): boolean => {
    const matchingSession = availablePracticeCatalog.find(
      (s) =>
        !selectedTargetIds.has(s.id) &&
        (s.domainId === domainId || s.topicId === topicId) &&
        (s.estimatedMinutes || 20) <= remaining
    );
    if (!matchingSession) return false;

    const duration = matchingSession.estimatedMinutes || 20;
    const domainDef = (domains as DomainDefinition[]).find((d) => d.id === domainId);
    const domainName = domainDef?.name || domainId.toUpperCase();
    const title = matchingSession.title || `${domainName} Practice`;

    // Ensure priorityScore preserves non-increasing order
    const parentScore =
      activities.length > 0 ? activities[activities.length - 1].priorityScore : 65;
    const score = Math.max(0, Math.round((parentScore - 0.1) * 10) / 10);

    const practiceActivity: SessionActivity = {
      id: `session-act-practice-${matchingSession.id}`,
      type: 'practice_session',
      title,
      description: matchingSession.description || `Targeted practice drill to reinforce ${domainName}`,
      sourceSubsystem: 'practice',
      priority: 'routed_weakness',
      priorityScore: score,
      domainId,
      topicId,
      estimatedMinutes: duration,
      reason: "reinforce today's preparation",
      route: 'practice',
      targetId: matchingSession.id,
      deepLink: {
        route: 'practice',
        param: matchingSession.id,
      },
      producesEvidence: true,
      evidenceExpectation: 'Completing practice drill records accuracy score and updates skill telemetry',
      isBlocked: false,
    };

    activities.push(practiceActivity);
    selectedTargetIds.add(matchingSession.id);
    remaining -= duration;
    return true;
  };

  // 5. Compose based on Session Mode
  if (sessionMode === 'review_heavy') {
    // Mode: Review-Heavy — clears reviews, remediation, retention, and stale evidence first
    const reviewTiers: ReviewPriority[] = [
      'remediation',
      'overdue_review',
      'retention',
      'stale_evidence',
    ];
    const reviewCandidates = eligibleCandidates.filter((c) => reviewTiers.includes(c.priority));
    const nonReviewCandidates = eligibleCandidates.filter((c) => !reviewTiers.includes(c.priority));

    for (const cand of reviewCandidates) {
      if (remaining <= 0) break;
      tryAddCandidate(cand);
    }

    // Fill any remaining budget with weaknesses or progression
    for (const cand of nonReviewCandidates) {
      if (remaining <= 0) break;
      tryAddCandidate(cand);
    }
  } else if (sessionMode === 'focused') {
    // Mode: Focused — deep dive on single top priority target, pairing learning with practice
    // At most 1 quick review (<= 15 min) if urgent
    const urgentReview = eligibleCandidates.find(
      (c) =>
        (c.priority === 'remediation' || c.priority === 'overdue_review') &&
        c.estimatedMinutes <= 15
    );
    if (urgentReview) {
      tryAddCandidate(urgentReview, 'Overdue review');
    }

    // Pick top focus candidate (company gap, weakness, or primary task)
    const focusCandidate = eligibleCandidates.find(
      (c) => !selectedTargetIds.has(c.targetId) && c.estimatedMinutes <= remaining
    );
    if (focusCandidate) {
      tryAddCandidate(focusCandidate);
      // Immediately pair with practice for this domain/topic if time permits
      if (remaining >= 15) {
        tryAddComplementaryPractice(focusCandidate.domainId, focusCandidate.topicId);
      }
    }

    // If budget remains, fill with items in the same domain or next priority
    for (const cand of eligibleCandidates) {
      if (remaining <= 0) break;
      if (!selectedTargetIds.has(cand.targetId)) {
        tryAddCandidate(cand);
      }
    }
  } else {
    // Mode: Balanced (default) — balanced distribution:
    // 1. Urgent review (capped: max 1 item for <=30min, max 2 items / ~40% time for >30min)
    // 2. High-priority focus (Weakness or Company requirement)
    // 3. Complementary practice if a learning lesson was picked
    // 4. Remaining budget filled with highest-priority progression/reviews

    const maxReviewItems = availableMinutes <= 30 ? 1 : 2;
    const maxReviewMinutes = availableMinutes <= 30 ? 15 : Math.floor(availableMinutes * 0.4);

    let reviewsAddedCount = 0;
    let reviewsAddedMinutes = 0;

    const urgentReviews = eligibleCandidates.filter(
      (c) => c.priority === 'remediation' || c.priority === 'overdue_review'
    );

    for (const rev of urgentReviews) {
      if (reviewsAddedCount >= maxReviewItems) break;
      if (reviewsAddedMinutes + rev.estimatedMinutes > maxReviewMinutes && activities.length > 0) {
        break;
      }
      if (rev.estimatedMinutes <= remaining) {
        if (tryAddCandidate(rev)) {
          reviewsAddedCount++;
          reviewsAddedMinutes += rev.estimatedMinutes;
        }
      }
    }

    // Step 2: Target weakness or company requirement
    const priorityFocus = eligibleCandidates.find(
      (c) =>
        !selectedTargetIds.has(c.targetId) &&
        (c.priority === 'company_gap' ||
          c.priority === 'routed_weakness' ||
          c.priority === 'weak_topic') &&
        c.estimatedMinutes <= remaining
    );

    if (priorityFocus) {
      tryAddCandidate(priorityFocus);
      // Step 2b: Complementary practice to reinforce preparation
      if (priorityFocus.type === 'preparation_lesson' && remaining >= 15) {
        tryAddComplementaryPractice(priorityFocus.domainId, priorityFocus.topicId);
      }
    }

    // Step 3: Fill remaining budget with highest priority eligible candidates
    for (const cand of eligibleCandidates) {
      if (remaining <= 0) break;
      if (!selectedTargetIds.has(cand.targetId)) {
        const added = tryAddCandidate(cand);
        // If we added a preparation topic and have time, reinforce it with practice
        if (added && cand.type === 'preparation_lesson' && remaining >= 15) {
          tryAddComplementaryPractice(cand.domainId, cand.topicId);
        }
      }
    }
  }

  // 6. Over-budget exception rule for tiny budgets (when strictBudget is not requested)
  // Preserves compatibility with existing tests when availableMinutes is small (e.g., 1-5 mins)
  if (
    activities.length === 0 &&
    eligibleCandidates.length > 0 &&
    availableMinutes > 0 &&
    !strictBudget
  ) {
    const top = eligibleCandidates[0];
    activities.push(buildSessionActivityFromCandidate(top));
  }

  const currentMinutes = activities.reduce((sum, a) => sum + a.estimatedMinutes, 0);

  return {
    activities,
    totalEstimatedMinutes: currentMinutes,
    timeBudgetMinutes: availableMinutes,
    remainingMinutes: Math.max(0, availableMinutes - currentMinutes),
    composedAt: new Date().toISOString(),
    availableMinutes,
    mode,
    sessionMode,
    todayStr,
    selectedCompanyId,
    energyLevel,
  };
}

/**
 * Backwards-compatible session plan composer.
 * Delegates to composeAdaptiveSession.
 */
export function composeSessionPlan(options: SessionComposerOptions): SessionPlan {
  return composeAdaptiveSession(options);
}

export function createSessionState(plan: SessionPlan): SessionState {
  return {
    plan,
    currentActivityIndex: 0,
    startedAt: new Date().toISOString(),
    completedActivityIds: [],
    skippedActivityIds: [],
    failedActivityIds: [],
    postponedActivityIds: [],
  };
}

export function advanceSession(
  state: SessionState,
  outcome: 'completed' | 'skipped' | 'failed' | 'postponed'
) {
  const currentActivity = state.plan.activities[state.currentActivityIndex];
  if (!currentActivity) {
    return { nextActivity: null, newState: state };
  }

  const newCompleted = [...state.completedActivityIds];
  const newSkipped = [...state.skippedActivityIds];
  const newFailed = [...state.failedActivityIds];
  const newPostponed = [...state.postponedActivityIds];

  switch (outcome) {
    case 'completed':
      newCompleted.push(currentActivity.id);
      break;
    case 'skipped':
      newSkipped.push(currentActivity.id);
      break;
    case 'failed':
      newFailed.push(currentActivity.id);
      break;
    case 'postponed':
      newPostponed.push(currentActivity.id);
      break;
  }

  const nextIndex = state.currentActivityIndex + 1;
  const nextActivity = state.plan.activities[nextIndex] || null;

  return {
    nextActivity,
    newState: {
      ...state,
      currentActivityIndex: nextIndex,
      completedActivityIds: newCompleted,
      skippedActivityIds: newSkipped,
      failedActivityIds: newFailed,
      postponedActivityIds: newPostponed,
    },
  };
}

export function recoverSession(state: SessionState, availableMinutes: number) {
  let nextIndex = state.currentActivityIndex;

  while (nextIndex < state.plan.activities.length) {
    const activity = state.plan.activities[nextIndex];
    if (activity.estimatedMinutes <= availableMinutes) {
      const nextActivity = state.plan.activities[nextIndex];
      return {
        nextActivity,
        newState: {
          ...state,
          currentActivityIndex: nextIndex,
        },
      };
    }
    nextIndex++;
  }

  return { nextActivity: null, newState: state };
}

export function getCurrentActivity(state: SessionState): SessionActivity | null {
  return state.plan.activities[state.currentActivityIndex] || null;
}

export function getRemainingTime(state: SessionState): number {
  const remainingActivities = state.plan.activities.slice(state.currentActivityIndex);
  return remainingActivities.reduce((sum: number, a: SessionActivity) => sum + a.estimatedMinutes, 0);
}

export function getSessionProgress(state: SessionState) {
  const total = state.plan.activities.length;
  const completed = state.completedActivityIds.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
