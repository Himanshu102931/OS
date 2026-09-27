import type { TaskDefinition, EvidenceLog } from '../types';
import {
  getPreparationTopicIdByRoadmapId,
  getPreparationTopic,
} from '../data/preparationDataset';

/**
 * Where the Today page's learning affordance sends the user for a roadmap task.
 *
 * Mapped tasks (a `topic-*` id with a preparation bridge) go straight into the
 * Preparation topic workspace, which owns the real curriculum. Unmapped tasks
 * fall back to the roadmap topic, which owns that topic's task list. Today only
 * routes — it never renders learning content of its own.
 */
export interface TaskLearningRoute {
  route: 'preparation' | 'roadmap';
  linkedTopicId: string;
  /** Present when `route === 'preparation'`; used for truthful button copy. */
  preparationTopicTitle?: string;
}

/**
 * Resolves `task.topicId` → the existing destination that owns its curriculum,
 * reusing the same bridge Skills/Companies use (`getPreparationTopicIdByRoadmapId`).
 * Deterministic: same task in, same route out.
 */
export function getTaskLearningRoute(task: Pick<TaskDefinition, 'topicId'>): TaskLearningRoute {
  const roadmapTopicId = task.topicId;
  const preparationTopicId = getPreparationTopicIdByRoadmapId(roadmapTopicId);

  if (preparationTopicId) {
    return {
      route: 'preparation',
      linkedTopicId: preparationTopicId,
      preparationTopicTitle: getPreparationTopic(preparationTopicId)?.title,
    };
  }

  return { route: 'roadmap', linkedTopicId: roadmapTopicId };
}

export type LearningLabelVariant = 'primary' | 'card';

/**
 * Copy for the learning affordance. Labels never promise curriculum content
 * that does not exist: only a mapped (preparation) route is called a workspace.
 */
export function getLearningDestinationLabel(
  route: TaskLearningRoute,
  variant: LearningLabelVariant = 'primary'
): string {
  if (route.route === 'preparation') {
    return variant === 'primary' ? 'Open Learning Workspace' : 'Open Topic';
  }
  return variant === 'primary' ? 'View Topic in Roadmap' : 'View Topic';
}

/**
 * The single `daily_assignment` evidence event written for a task by
 * `updateTaskState`. Returns the most recent one when a task was completed,
 * undone, and completed again. Read-only: never creates or mutates logs.
 */
export function findLatestTaskEvidence(
  evidenceLogs: readonly EvidenceLog[],
  taskId: string
): EvidenceLog | null {
  let latest: EvidenceLog | null = null;

  for (const log of evidenceLogs) {
    if (log.sourceType !== 'daily_assignment' || log.sourceId !== taskId) continue;
    if (!latest || log.timestamp >= latest.timestamp) {
      latest = log;
    }
  }

  return latest;
}

export interface CompletionNextStepInput {
  completedTaskId: string;
  evidenceLogs: readonly EvidenceLog[];
  /** Refreshed adaptive-engine candidates (completed tasks already excluded). */
  nextCandidates: readonly { task: TaskDefinition }[];
}

export interface CompletionNextStep {
  /** Existing evidence event for the completed task — one, or null. */
  evidence: EvidenceLog | null;
  /** Refreshed recommended next action. */
  nextTask: TaskDefinition | null;
  nextRoute: TaskLearningRoute | null;
}

/**
 * Read-only summary for the post-completion next-step state: the evidence
 * event that already exists in storage plus the adaptive engine's current top
 * candidate. Pure — writes nothing, so it cannot duplicate evidence.
 */
export function buildCompletionNextStep(input: CompletionNextStepInput): CompletionNextStep {
  const nextTask = input.nextCandidates[0]?.task ?? null;

  return {
    evidence: findLatestTaskEvidence(input.evidenceLogs, input.completedTaskId),
    nextTask,
    nextRoute: nextTask ? getTaskLearningRoute(nextTask) : null,
  };
}
