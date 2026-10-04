import type {
  ReviewPrompt,
} from './analyticsEngine';
import type {
  DSAProblem,
  TaskDefinition,
  Topic,
  DomainDefinition,
  PreparationTopic,
  PracticeSessionDefinition,
  TopicSkillState,
  DSAProgress,
  TaskProgress,
} from '../types';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';

/**
 * Canonical datasets used to validate a ReviewPrompt targetId.
 */
export interface ReviewPromptDatasets {
  dsaProblems: DSAProblem[];
  tasks: TaskDefinition[];
  topics: Topic[];
  domains: DomainDefinition[];
  preparationTopics: PreparationTopic[];
  practiceSessions: PracticeSessionDefinition[];
  skillStates: Record<string, TopicSkillState>;
}

/**
 * Result of validating a ReviewPrompt against canonical datasets.
 */
export interface ReviewPromptValidation {
  /** The original prompt */
  prompt: ReviewPrompt;
  /** Whether the prompt's targetId validates against the canonical dataset */
  targetValid: boolean;
  /** The route that is safe to navigate to (hub routes always safe) */
  route: 'dsa' | 'roadmap' | 'skills' | 'preparation' | 'practice' | 'dashboard';
  /** The targetId safe to navigate with; undefined when invalid or hub navigation */
  targetId?: string;
  /** Whether clicking performs navigation */
  navigable: boolean;
  /** Plain-language reason for the validation outcome */
  reason: string;
}

/**
 * Validates a single ReviewPrompt's targetId against the canonical datasets.
 * An invalid targetId keeps the prompt informational — no navigation, no fabricated deep-link.
 */
export function validateReviewPrompt(
  prompt: ReviewPrompt,
  datasets: ReviewPromptDatasets
): ReviewPromptValidation {
  const { route, targetId } = prompt;

  // No targetId = hub navigation only (safe)
  if (!targetId) {
    return {
      prompt,
      targetValid: true,
      route,
      navigable: true,
      reason: 'Opens the relevant workspace directly — no specific target to validate.',
    };
  }

  const idExists = (): boolean => {
    switch (route) {
      case 'dsa':
        return datasets.dsaProblems.some((p) => p.id === targetId);
      case 'roadmap':
        return datasets.tasks.some((t) => t.id === targetId);
      case 'skills':
        return datasets.topics.some((t) => t.id === targetId);
      default:
        // Dashboard never accepts a target — a targetId here cannot be validated.
        // Also catches any unexpected route values.
        return false;
    }
  };

  if (!idExists()) {
    return {
      prompt,
      targetValid: false,
      route,
      navigable: false,
      reason:
        'This prompt points at work that no longer exists in your plan, so nothing was opened. The review signal stays visible as a gap.',
    };
  }

  return {
    prompt,
    targetValid: true,
    route,
    targetId,
    navigable: true,
    reason: 'Opens the matching item in your plan.',
  };
}

/**
 * Validates all review prompts and returns only the navigable ones.
 * Invalid prompts are preserved in the full list but marked non-navigable.
 */
export function filterNavigablePrompts(
  prompts: ReviewPrompt[],
  datasets: ReviewPromptDatasets
): ReviewPromptValidation[] {
  return prompts.map((p) => validateReviewPrompt(p, datasets));
}

/**
 * Builds a ReviewPromptDatasets object from the full PlacementOS state.
 * Single source of truth for validation datasets.
 */
export function buildReviewPromptDatasets(state: {
  dsaProblems: DSAProblem[];
  tasks: TaskDefinition[];
  topics: Topic[];
  domains: DomainDefinition[];
  skillStates: Record<string, TopicSkillState>;
  preparationTopics?: PreparationTopic[];
  practiceSessions?: PracticeSessionDefinition[];
}): ReviewPromptDatasets {
  return {
    dsaProblems: state.dsaProblems,
    tasks: state.tasks,
    topics: state.topics,
    domains: state.domains,
    preparationTopics: state.preparationTopics || PREPARATION_TOPICS,
    practiceSessions: state.practiceSessions || PRACTICE_SESSIONS,
    skillStates: state.skillStates,
  };
}

/**
 * Options for converting review prompts into validated candidates for the session pipeline.
 */
export interface ReviewPromptCandidateOptions {
  /** Raw analytics prompts */
  prompts: ReviewPrompt[];
  /** Canonical datasets for validation */
  datasets: ReviewPromptDatasets;
  /** TargetIds already served by higher-priority routes (remediation, company, etc.) */
  existingRouteTargetIds: Set<string>;
  /** Available session minutes for budget-awareness */
  availableMinutes?: number;
}

/**
 * Result of converting prompts to session-ready candidates.
 */
export interface ReviewPromptCandidateResult {
  /** Validated prompts that produced candidates */
  validated: ReviewPromptValidation[];
  /** Candidates ready for the session pipeline (reviewScheduler) */
  candidates: import('./reviewScheduler').ReviewCandidate[];
  /** Prompts that had invalid/unavailable targets (informational only) */
  informational: ReviewPromptValidation[];
}

/**
 * Converts validated review prompts into session-ready ReviewCandidates.
 * 
 * This is the bridge that makes analytics review prompts operational:
 * - Validates each prompt's targetId against canonical datasets
 * - Filters out prompts already covered by higher-priority routes
 * - Converts to ReviewCandidate format for the session pipeline
 * - Respects session budget
 * 
 * Does NOT create a second scheduling system — candidates feed into
 * the existing reviewScheduler/adaptiveEngine/SessionComposer pipeline.
 */
export function reviewPromptsToCandidates(
  options: ReviewPromptCandidateOptions
): ReviewPromptCandidateResult {
  const { prompts, datasets, existingRouteTargetIds, availableMinutes } = options;

  // Validate all prompts
  const validated = prompts.map((p) => validateReviewPrompt(p, datasets));

  // Split into navigable and informational
  const navigable = validated.filter((v) => v.navigable && v.targetId && !existingRouteTargetIds.has(v.targetId!));
  const informational = validated.filter((v) => !v.navigable || !v.targetId || existingRouteTargetIds.has(v.targetId!));

  // Convert navigable prompts to ReviewCandidates
  const candidates: import('./reviewScheduler').ReviewCandidate[] = [];

  for (const v of navigable) {
    if (!v.targetId) continue;

    // Budget check
    const duration = estimateDuration(v.route, v.targetId, datasets);
    if (availableMinutes !== undefined && duration > availableMinutes) {
      // Still include in informational but don't schedule
      informational.push({ ...v, navigable: false, reason: `Exceeds session budget (${duration} min > ${availableMinutes} min)` });
      continue;
    }

    // Determine priority based on prompt type
    // eslint-disable-next-line no-useless-assignment
    let priority: import('./reviewScheduler').ReviewPriority = 'retention';
    // eslint-disable-next-line no-useless-assignment
    let priorityScore = 60;
    // eslint-disable-next-line no-useless-assignment
    let type: import('./reviewScheduler').ReviewCandidate['type'] = 'preparation_lesson';

    switch (v.prompt.type) {
      case 'overdue_review':
        priority = 'overdue_review';
        priorityScore = 90;
        type = 'dsa_review';
        break;
      case 'remediation_needed':
        priority = 'remediation';
        priorityScore = 100;
        type = 'dsa_review';
        break;
      case 'stale_evidence':
        priority = 'stale_evidence';
        priorityScore = 50;
        type = 'preparation_lesson';
        break;
      case 'repeated_postpone':
        priority = 'weak_topic';
        priorityScore = 40;
        type = 'roadmap_task';
        break;
      case 'low_independence':
        priority = 'weak_topic';
        priorityScore = 45;
        type = 'practice_session';
        break;
      default:
        priority = 'retention';
        priorityScore = 30;
        type = 'preparation_lesson';
    }

    // Map 'skills' route to 'preparation' for ReviewCandidate compatibility
    const candidateRoute = v.route === 'skills' ? 'preparation' : v.route;

    // Derive domainId/topicId from canonical datasets where available.
    // This restores traceability without inventing mappings — we only use
    // data that already exists in the canonical lookup.
    // Use the original route (v.route) for lookup, not the mapped candidateRoute.
    const { domainId, topicId } = deriveTraceability(v.route, v.targetId!, datasets);

    candidates.push({
      id: `review-prompt-${v.prompt.id}`,
      type,
      title: v.prompt.title,
      description: v.prompt.description,
      priority,
      priorityScore,
      domainId,
      topicId,
      estimatedMinutes: duration,
      reason: v.prompt.description,
      route: candidateRoute,
      targetId: v.targetId!,
      isBlocked: false,
    });
  }

  return { validated, candidates, informational };
}

/**
 * Estimates the duration of a review activity based on its route and target.
 * Pure function — no network, no I/O.
 */
function estimateDuration(
  route: string,
  targetId: string,
  datasets: ReviewPromptDatasets
): number {
  switch (route) {
    case 'dsa': {
      const prob = datasets.dsaProblems.find((p) => p.id === targetId);
      return prob ? Math.max(10, Math.floor((prob.estimatedTimeMinutes || 20) / 2)) : 15;
    }
    case 'roadmap': {
      const task = datasets.tasks.find((t) => t.id === targetId);
      return task ? task.estimatedMinutes : 30;
    }
    case 'preparation': {
      return 20;
    }
    case 'practice': {
      const session = datasets.practiceSessions.find((s) => s.id === targetId);
      return session ? (session.estimatedMinutes || 20) : 20;
    }
    default:
      return 15;
  }
}

/**
 * Derives domainId and topicId from canonical datasets for traceability.
 * Only uses data that already exists in the canonical lookup — never invents mappings.
 * Returns empty strings when no canonical mapping exists.
 */
function deriveTraceability(
  route: string,
  targetId: string,
  datasets: ReviewPromptDatasets
): { domainId: string; topicId: string } {
  switch (route) {
    case 'dsa': {
      const prob = datasets.dsaProblems.find((p) => p.id === targetId);
      return { domainId: prob?.domainId || '', topicId: prob?.topicId || '' };
    }
    case 'preparation': {
      const topic = datasets.preparationTopics.find((t) => t.id === targetId);
      return { domainId: topic?.domainId || '', topicId: topic?.id || '' };
    }
    case 'practice': {
      const session = datasets.practiceSessions.find((s) => s.id === targetId);
      return { domainId: session?.domainId || '', topicId: session?.topicId || '' };
    }
    case 'roadmap': {
      const task = datasets.tasks.find((t) => t.id === targetId);
      return { domainId: task?.domainId || '', topicId: task?.topicId || '' };
    }
    case 'skills': {
      const topic = datasets.topics.find((t) => t.id === targetId);
      return { domainId: topic?.domainId || '', topicId: topic?.id || '' };
    }
    default:
      return { domainId: '', topicId: '' };
  }
}

/**
 * Determines if a review prompt type should be considered "due" based on
 * the user's current state. Pure logic, no I/O.
 */
export function isPromptDue(
  prompt: ReviewPrompt,
  state: {
    dsaProgressMap: Record<string, DSAProgress>;
    taskProgressMap: Record<string, TaskProgress>;
    skillStates: Record<string, TopicSkillState>;
    todayStr: string;
  }
): boolean {
  switch (prompt.type) {
    case 'overdue_review': {
      // Check if the specific DSA problem is actually due
      if (!prompt.targetId) return false;
      const prog = state.dsaProgressMap[prompt.targetId];
      if (!prog?.nextReviewAt) return false;
      return prompt.targetId ? state.todayStr >= prog.nextReviewAt : false;
    }
    case 'remediation_needed': {
      // Remediation is always "due" if the prompt exists
      return true;
    }
    case 'stale_evidence': {
      // Check if the topic is actually stale
      if (!prompt.targetId) return false;
      const skill = state.skillStates[prompt.targetId];
      return skill?.freshness === 'stale';
    }
    case 'repeated_postpone': {
      // Check if task is still postponed
      if (!prompt.targetId) return false;
      const prog = state.taskProgressMap[prompt.targetId];
      return prog ? prog.postponeCount >= 2 && prog.state !== 'completed' : false;
    }
    case 'low_independence': {
      // This is a general signal, always "due" if it exists
      return true;
    }
    default:
      return false;
  }
}