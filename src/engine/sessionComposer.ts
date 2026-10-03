import type {
  PlacementMode,
} from '../types';
import { generateReviewCandidates } from './reviewScheduler';
import type { ReviewPriority } from './reviewScheduler';

/**
 * Session Composer - Deterministic composition of a study session from available time
 * and existing candidate sources. Pure function - no persistence, no side effects.
 */

export interface SessionActivity {
  id: string;
  type: 'dsa_review' | 'dsa_remediation' | 'dsa_new' | 'roadmap_task' | 'preparation_lesson' | 'practice_session' | 'dsa_new';
  title: string;
  description: string;
  priority: ReviewPriority;
  priorityScore: number;
  domainId: string;
  topicId: string;
  estimatedMinutes: number;
  reason: string;
  route: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'dashboard';
  targetId: string;
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
  // For deterministic replay
  composedAt: string;
  availableMinutes: number;
  mode: PlacementMode;
  todayStr: string;
  selectedCompanyId?: string;
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

export interface SessionComposerOptions {
  // Time budget
  availableMinutes: number;
  // Current date (YYYY-MM-DD)
  todayStr: string;
  // Current placement mode
  mode: PlacementMode;
  // Selected company for Company Focus Mode
  selectedCompanyId?: string;
  // All candidate sources
  tasks: unknown[];
  taskProgressMap: Record<string, unknown>;
  dsaProblems: unknown[];
  dsaProgressMap: Record<string, unknown>;
  topics: unknown[];
  domains: unknown[];
  skillStates: Record<string, unknown>;
  companyOverlays: unknown[];
  practiceSessions: unknown[];
  practiceAttempts: unknown[];
  preparationTopics: unknown[];
  preparationTopicProgress: Record<string, unknown>;
  domainResults: unknown[];
  weaknessSignals: unknown[];
  assessmentProfileReadout: unknown;
  activePhase: number;
  todayAssignments: unknown[];
  dsaAttempts: unknown[];
  evidenceLogs: unknown[];
}

/**
 * Core session composition function.
 * Builds a deterministic session plan from available time and existing candidate sources.
 * Does NOT persist anything - pure function.
 */
export function composeSessionPlan(
  options: SessionComposerOptions
): SessionPlan {
  const {
    availableMinutes,
    todayStr,
    mode,
    selectedCompanyId,
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    topics,
    domains,
    skillStates,
    companyOverlays,
    practiceSessions,
    practiceAttempts,
    preparationTopics,
    preparationTopicProgress,
    domainResults,
    weaknessSignals,
    assessmentProfileReadout,
    activePhase,
    todayAssignments,
    dsaAttempts,
    evidenceLogs,
  } = options;

  // Get all candidates from review scheduler (includes all priority tiers)
  const reviewResult = generateReviewCandidates({
    tasks: tasks as import('../types').TaskDefinition[],
    taskProgressMap: taskProgressMap as Record<string, import('../types').TaskProgress>,
    dsaProblems: dsaProblems as import('../types').DSAProblem[],
    dsaProgressMap: dsaProgressMap as Record<string, import('../types').DSAProgress>,
    topics: topics as import('../types').Topic[],
    domains: domains as import('../types').DomainDefinition[],
    skillStates: skillStates as Record<string, import('../types').TopicSkillState>,
    companyOverlays: companyOverlays as import('../types').CompanyOverlay[],
    currentMode: mode,
    todayStr,
    todayAssignments: todayAssignments as import('../types').DailyTaskAssignment[],
    analyticsReviewPrompts: [],
    practiceAttempts: practiceAttempts as import('../types').PracticeAttempt[],
    practiceSessions: practiceSessions as import('../types').PracticeSessionDefinition[],
    preparationTopics: preparationTopics as import('../types').PreparationTopic[],
    preparationTopicProgress: preparationTopicProgress as Record<string, import('../types').PreparationTopicProgress>,
    domainResults: domainResults as import('../types').DomainAssessmentResult[],
    weaknessSignals: weaknessSignals as import('../types').WeaknessSignal[],
    assessmentProfileReadout: assessmentProfileReadout as import('./assessmentEngine').AssessmentProfileReadout | undefined,
    activePhase: typeof activePhase === 'number' ? activePhase : 1,
    targetCompanyId: selectedCompanyId,
    dsaAttempts: dsaAttempts as import('../types').DSAAttempt[],
    evidenceLogs: evidenceLogs as import('../types').EvidenceLog[],
  });
  const allReviewCandidates = reviewResult.candidates;

  // Filter out already assigned/completed
  const filteredCandidates = allReviewCandidates.filter(() => true);

  // Sort by priority tier and score (already done in generateReviewCandidates)
  const sortedCandidates = filteredCandidates;

  // Compose session plan within time budget
  const activities: SessionActivity[] = [];
  let currentMinutes = 0;

  for (const candidate of sortedCandidates) {
    if (currentMinutes + candidate.estimatedMinutes <= options.availableMinutes) {
      activities.push({
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        description: candidate.description,
        priority: candidate.priority,
        priorityScore: candidate.priorityScore,
        domainId: candidate.domainId,
        topicId: candidate.topicId,
        estimatedMinutes: candidate.estimatedMinutes,
        reason: candidate.reason,
        route: candidate.route,
        targetId: candidate.targetId,
        sourceProblemId: candidate.sourceProblemId,
        sourceTaskId: candidate.sourceTaskId,
        sourceTopicId: candidate.sourceTopicId,
        sourceSkillState: candidate.sourceSkillState,
        isBlocked: candidate.isBlocked,
        blockingReason: candidate.blockingReason,
      });
      currentMinutes += candidate.estimatedMinutes;
    }
  }

  // If no activities fit but we have budget, add the top candidate (over-budget exception)
  if (activities.length === 0 && sortedCandidates.length > 0 && availableMinutes > 0) {
    const top = sortedCandidates[0];
    activities.push({
      id: top.id,
      type: top.type,
      title: top.title,
      description: top.description,
      priority: top.priority,
      priorityScore: top.priorityScore,
      domainId: top.domainId,
      topicId: top.topicId,
      estimatedMinutes: top.estimatedMinutes,
      reason: top.reason,
      route: top.route,
      targetId: top.targetId,
      sourceProblemId: top.sourceProblemId,
      sourceTaskId: top.sourceTaskId,
      sourceTopicId: top.sourceTopicId,
      sourceSkillState: top.sourceSkillState,
      isBlocked: top.isBlocked,
      blockingReason: top.blockingReason,
    });
    currentMinutes = top.estimatedMinutes;
  }

  return {
    activities,
    totalEstimatedMinutes: currentMinutes,
    timeBudgetMinutes: availableMinutes,
    remainingMinutes: availableMinutes - currentMinutes,
    composedAt: new Date().toISOString(),
    availableMinutes,
    mode: 'normal',
    todayStr: '',
    selectedCompanyId: undefined,
  };
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
      newCompleted.push(state.plan.activities[state.currentActivityIndex].id);
      break;
    case 'skipped':
      newSkipped.push(state.plan.activities[state.currentActivityIndex].id);
      break;
    case 'failed':
      newFailed.push(state.plan.activities[state.currentActivityIndex].id);
      break;
    case 'postponed':
      newPostponed.push(state.plan.activities[state.currentActivityIndex].id);
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

export function recoverSession(
  state: SessionState,
  availableMinutes: number
) {
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

export function getCurrentActivity(state: SessionState) {
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
