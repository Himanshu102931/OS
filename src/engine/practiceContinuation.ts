import type {
  PracticeAttempt,
  PracticeSessionDefinition,
  TopicSkillState,
  CompanyOverlay,
  DSAProblem,
  DSAProgress,
  TaskDefinition,
  TaskProgress,
  Topic,
  DomainDefinition,
  Phase,
  PreparationTopic,
  PreparationTopicProgress,
  DomainAssessmentResult,
  WeaknessSignal,
} from '../types';
import type { AssessmentProfileReadout } from './assessmentEngine';
import {
  resolvePracticeRemediation,
  resolvePreparationContinuation,
  resolvePhaseNumber,
  type RemediationRoutingOptions,
} from './remediationRouter';
import { evaluatePrerequisiteStatus } from './preparationEngine';

/**
 * Continuation kind produced by the resolver.
 * Mirrors the product requirement outcomes: remediation, retrieval, progression, or none.
 */
export type PracticeContinuationKind =
  | 'remediation'
  | 'retrieval'
  | 'progression'
  | 'none';

/**
 * A validated continuation target that the UI/session can act upon.
 * Every field is derived from canonical datasets — no fabricated IDs.
 */
export interface PracticeContinuationTarget {
  kind: PracticeContinuationKind;
  route: 'practice' | 'preparation' | 'dsa' | 'roadmap' | 'dashboard';
  targetId: string;
  title: string;
  description: string;
  reason: string;
  estimatedMinutes: number;
  domainId: string;
  topicId?: string;
  /** Whether prerequisites/phase lock block this target right now. */
  isBlocked: boolean;
  blockingReason?: string;
  /** Source attempt that triggered this continuation. */
  sourceAttemptId: string;
  /** Source session that produced the result. */
  sourceSessionId: string;
}

/**
 * Full continuation result — a single best continuation or none.
 */
export interface PracticeContinuationResult {
  continuation: PracticeContinuationTarget | null;
  /** Human-readable summary for the completion UI. */
  summary: string;
}

/**
 * Options required to resolve a practice continuation.
 * Mirrors RemediationRoutingOptions but adds the specific attempt that just completed.
 */
export interface PracticeContinuationOptions {
  /** The practice attempt that just completed. */
  completedAttempt: PracticeAttempt;
  /** The session that was completed. */
  completedSession: PracticeSessionDefinition;
  /** All practice attempts (for latest-per-session logic in remediation). */
  practiceAttempts: PracticeAttempt[];
  /** All available practice sessions (for chaining/progression). */
  practiceSessions: PracticeSessionDefinition[];
  /** Skill states for readiness/progression checks. */
  skillStates: Record<string, TopicSkillState>;
  /** Company overlays for company relevance. */
  companyOverlays: CompanyOverlay[];
  /** DSA data for DSA remediation/progression paths. */
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  /** Roadmap data for task-based progression. */
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  /** Topic/domain metadata. */
  topics: Topic[];
  domains: DomainDefinition[];
  /** Preparation data for preparation-based continuations. */
  preparationTopics: PreparationTopic[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  /** Assessment data for assessment-driven remediation. */
  domainResults?: DomainAssessmentResult[];
  weaknessSignals?: WeaknessSignal[];
  assessmentProfileReadout?: {
    planInputs?: {
      weaknessFocusAreas: Array<{
        id: string;
        domainId: string;
        topicId?: string;
        competency?: string;
        strength: 1 | 2 | 3;
      }>;
    };
  };
  /** Active phase for prerequisite/phase gating. */
  activePhase?: Phase | number;
  /** Today string for date-driven logic. */
  todayStr: string;
  /** Target IDs already committed for today (prevents duplicate scheduling). */
  committedTargetIds?: Set<string>;
  /** Available session minutes (for budget awareness). */
  availableMinutes?: number;
}

/**
 * Pure deterministic resolver for practice session chaining.
 *
 * Flow:
 * 1. If the attempt has a weakness (failed or low accuracy) → remediationRouter
 * 2. If the attempt passed and the session topic has preparation curriculum completed
 *    but unproven evidence → retrieval practice via preparation continuation
 * 3. If the attempt passed and there is an explicitly linked next practice session
 *    (same domain/topic, not yet passed) → progression practice
 * 4. Otherwise → no continuation (none)
 *
 * All target IDs are validated against canonical datasets.
 * No target is ever fabricated.
 */
export function resolvePracticeContinuation(
  options: PracticeContinuationOptions
): PracticeContinuationResult {
  const {
    completedAttempt,
    completedSession,
    practiceAttempts,
    practiceSessions,
    skillStates,
    dsaProblems,
    dsaProgressMap,
    tasks,
    taskProgressMap,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    domainResults = [],
    weaknessSignals = [],
    assessmentProfileReadout,
    activePhase = 1,
    todayStr,
    committedTargetIds = new Set(),
    availableMinutes,
  } = options;

  const phaseNum = resolvePhaseNumber(activePhase);
  const attemptPassed = completedAttempt.passed;
  const accuracy = completedAttempt.accuracyPct ?? 0;
  const passingThreshold = completedAttempt.passingScorePct ?? 60;

  // Build remediation routing options from the full context
  // Note: companyOverlays not included — remediationRouter doesn't consume it;
  // company relevance is applied at reviewScheduler/adaptiveEngine level.
  const remediationOptions: RemediationRoutingOptions = {
    practiceAttempts,
    practiceSessions,
    dsaProblems,
    dsaProgressMap,
    tasks,
    taskProgressMap,
    topics,
    domains,
    skillStates,
    preparationTopics,
    preparationTopicProgress,
    domainResults,
    weaknessSignals,
    assessmentProfileReadout: assessmentProfileReadout as AssessmentProfileReadout | undefined,
    activePhase: phaseNum,
    todayStr,
    committedTargetIds,
  };

  // ──────────────────────────────────────────────────────────────────────
  // 1. WEAKNESS → REMEDIATION (highest priority)
  // Reuses Task 4's resolvePracticeRemediation — no duplicate logic.
  // ──────────────────────────────────────────────────────────────────────
  const isWeakness =
    !attemptPassed ||
    accuracy < passingThreshold ||
    (completedAttempt.userAnswers?.some((a) => a.isCorrect === false) ?? false);

  if (isWeakness) {
    const practiceRemediationRoutes = resolvePracticeRemediation(remediationOptions);
    // Filter to routes originating from THIS attempt
    const relevantRoutes = practiceRemediationRoutes.filter(
      (r) => r.sourceId === completedAttempt.id
    );

    if (relevantRoutes.length > 0) {
      // Pick highest priorityScore route that isn't blocked/committed
      const validRoutes = relevantRoutes.filter(
        (r) => !r.isBlocked && !committedTargetIds.has(r.targetId)
      );
      if (validRoutes.length > 0) {
        const best = validRoutes[0]; // already sorted by priorityScore desc
        return {
          continuation: {
            kind: 'remediation',
            route: best.route,
            targetId: best.targetId,
            title: best.title,
            description: best.description,
            reason: best.reason,
            estimatedMinutes: best.estimatedMinutes,
            domainId: best.domainId,
            topicId: best.topicId,
            isBlocked: best.isBlocked,
            blockingReason: best.blockingReason,
            sourceAttemptId: completedAttempt.id,
            sourceSessionId: completedSession.id,
          },
          summary: `Practice weakness detected (${accuracy}% score). ${best.reason}.`,
        };
      }
      // All remediation routes are blocked/committed — fall through to none
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. SUCCESS → RETRIEVAL (preparation curriculum completed, evidence unproven)
  // Reuses Task 4's resolvePreparationContinuation — no duplicate logic.
  // ──────────────────────────────────────────────────────────────────────
  if (attemptPassed && accuracy >= passingThreshold) {
    const prepContinuationRoutes = resolvePreparationContinuation(remediationOptions);
    // Filter to routes whose source matches this session's topic
    const sessionTopicId = completedSession.topicId;
    const relevantPrepRoutes = sessionTopicId
      ? prepContinuationRoutes.filter((r) => r.sourceId === sessionTopicId)
      : [];

    if (relevantPrepRoutes.length > 0) {
      const validRoutes = relevantPrepRoutes.filter(
        (r) => !r.isBlocked && !committedTargetIds.has(r.targetId)
      );
      if (validRoutes.length > 0) {
        const best = validRoutes[0];
        return {
          continuation: {
            kind: 'retrieval',
            route: best.route,
            targetId: best.targetId,
            title: best.title,
            description: best.description,
            reason: best.reason,
            estimatedMinutes: best.estimatedMinutes,
            domainId: best.domainId,
            topicId: best.topicId,
            isBlocked: best.isBlocked,
            blockingReason: best.blockingReason,
            sourceAttemptId: completedAttempt.id,
            sourceSessionId: completedSession.id,
          },
          summary: `Practice passed (${accuracy}%). ${best.reason}.`,
        };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. SUCCESS → PROGRESSION (explicit next practice session)
  // Chains to another practice session in the same domain/topic that the user
  // has not yet passed, respecting budget and prerequisites.
  // ──────────────────────────────────────────────────────────────────────
  if (attemptPassed && accuracy >= passingThreshold) {
    const domainId = completedSession.domainId;
    const topicId = completedSession.topicId;

    // Find practice sessions in the same domain that the user hasn't passed with >= 60%
    const candidateSessions = practiceSessions.filter((s) => {
      if (s.id === completedSession.id) return false; // don't chain to self
      if (s.domainId !== domainId) return false;
      // Only consider sessions the user hasn't already passed well
      const hasPassedWell = practiceAttempts.some(
        (a) => a.sessionId === s.id && a.passed && (a.accuracyPct ?? 0) >= 60
      );
      return !hasPassedWell;
    });

    if (candidateSessions.length > 0) {
      // Prefer session with same topicId, then first available
      let nextSession = candidateSessions.find((s) => s.topicId === topicId);
      if (!nextSession) nextSession = candidateSessions[0];

      // Validate against prerequisites (phase lock for practice is not a thing,
      // but we check if any preparation prerequisite exists)
      let isBlocked = false;
      if (nextSession.topicId) {
        const prepTopic = preparationTopics.find((t) => t.id === nextSession.topicId);
        if (prepTopic) {
          const prereqStatus = evaluatePrerequisiteStatus(
            prepTopic,
            (id) => preparationTopics.find((t) => t.id === id),
            preparationTopicProgress,
            { skillStates, attempts: practiceAttempts }
          );
          isBlocked = prereqStatus.isLocked;
        }
      }

      // Budget check: if availableMinutes is provided and this exceeds it, don't propose
      const duration = nextSession.estimatedMinutes || 20;
      const fitsBudget = availableMinutes === undefined || duration <= availableMinutes;

      if (!isBlocked && !committedTargetIds.has(nextSession.id) && fitsBudget) {
        return {
          continuation: {
            kind: 'progression',
            route: 'practice',
            targetId: nextSession.id,
            title: `Next Practice: ${nextSession.title}`,
            description: nextSession.description || `Continue practicing ${domainId.toUpperCase()} skills.`,
            reason: `Completed ${completedSession.title} with ${accuracy}%; next logical practice drill available.`,
            estimatedMinutes: duration,
            domainId: nextSession.domainId,
            topicId: nextSession.topicId,
            isBlocked: false,
            sourceAttemptId: completedAttempt.id,
            sourceSessionId: completedSession.id,
          },
          summary: `Practice passed (${accuracy}%). Next practice session available: ${nextSession.title}.`,
        };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. NO VALID CONTINUATION
  // ──────────────────────────────────────────────────────────────────────
  return {
    continuation: null,
    summary: attemptPassed
      ? `Practice completed (${accuracy}%). No further practice chaining available.`
      : `Practice completed (${accuracy}%). No valid remediation target found.`,
  };
}

/**
 * Helper to produce a deep-link navigation action from a continuation target.
 * Returns null if the target is blocked or invalid.
 */
export function getContinuationDeepLink(
  continuation: PracticeContinuationTarget | null
): { route: string; targetId: string } | null {
  if (!continuation || continuation.isBlocked) return null;
  return { route: continuation.route, targetId: continuation.targetId };
}

/**
 * Budget-aware helper: given a list of possible continuations (e.g., from
 * multiple completed attempts in a session), pick the best one that fits
 * within the available time budget.
 */
export function pickBestContinuationWithinBudget(
  continuations: PracticeContinuationTarget[],
  availableMinutes: number
): PracticeContinuationTarget | null {
  for (const c of continuations) {
    if (!c.isBlocked && c.estimatedMinutes <= availableMinutes) {
      return c;
    }
  }
  return null;
}