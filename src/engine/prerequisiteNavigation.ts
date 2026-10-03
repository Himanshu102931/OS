import type { Phase, TaskDefinition, TaskProgress, Topic } from '../types';
import { evaluateTaskPrerequisites } from './taskStateEngine';
import { getTaskPhaseNumber, resolvePhaseNumber } from './weaknessRouter';

/**
 * Roadmap prerequisite NAVIGATION.
 *
 * This module is a presentation-level adapter, deliberately NOT a second
 * prerequisite engine. Every lock decision is delegated to the canonical
 * helpers the rest of the app already trusts:
 *
 *   - `evaluateTaskPrerequisites` (taskStateEngine) — the prerequisite gate
 *   - `getTaskPhaseNumber` / `resolvePhaseNumber` (weaknessRouter) — the phase
 *     gate, identical to the one companyPlanEngine and weaknessRouter apply
 *
 * All it adds is the product layer the Roadmap was missing:
 *
 *   WHY  — a deterministic, human-readable explanation of each blocker
 *   WHAT — which prerequisite is blocking, and how far upstream it sits
 *   NEXT — real deep-link targets into the existing `#/roadmap/<id>` route
 *
 * It never mutates progress, never marks anything complete, never invents an
 * id or a route, and reads no clock: identical inputs always produce an
 * identical explanation.
 */

/** Why a target is blocked. Kept separate so phase gating is never mistaken for a missing prerequisite. */
export type LockCategory = 'incomplete' | 'unresolved' | 'phase_locked';

export interface TaskLockBlocker {
  category: LockCategory;
  /** Prerequisite task id. Undefined for a phase gate. */
  prerequisiteTaskId?: string;
  /**
   * Display title. Falls back to the raw id when the prerequisite definition
   * cannot be resolved, so an unresolvable reference is still nameable.
   */
  prerequisiteTitle?: string;
  /** Canonical state of the prerequisite task, or 'missing' when unresolved. */
  prerequisiteState?: TaskProgress['state'] | 'missing';
  /** Prerequisite topic — set only when it actually resolves to a topic. */
  prerequisiteTopicId?: string;
  /** Phase gate only: the task's phase number. */
  taskPhase?: number;
  /** Phase gate only: the currently active phase number. */
  activePhase?: number;
  /** Deterministic one-line reason. */
  reason: string;
}

/** NEXT — one navigable prerequisite. Only ever built from a resolvable target. */
export interface PrerequisiteNavigationAction {
  route: 'roadmap';
  /** Deep-link target id: #/roadmap/<targetId>. Resolves as a topic id or a task id. */
  targetId: string;
  label: string;
}

/** One hop on the upstream dependency path, ordered root-first. */
export interface DependencyTrailStep {
  taskId: string;
  title: string;
  state: TaskProgress['state'] | 'missing';
  /** False when the id has no task definition — never offered as an action. */
  resolvable: boolean;
}

export interface TaskLockExplanation {
  /** Canonical evaluateTaskPrerequisites(...).isBlocked */
  isPrerequisiteBlocked: boolean;
  /** task phase > active phase */
  isPhaseLocked: boolean;
  /** Either gate — this is what the UI renders a lock block for. */
  isLocked: boolean;
  /** Canonical passthrough of unmet prerequisite ids, in declaration order. */
  unmetPrerequisiteIds: string[];
  blockers: TaskLockBlocker[];
  /** WHY — why the target cannot be started right now. Empty when unlocked. */
  whyCannotStart: string;
  /** NEXT — navigation targets, one per resolvable incomplete prerequisite. */
  prerequisiteActions: PrerequisiteNavigationAction[];
  /** Compact upstream trail, root-first (A → B when C is blocked by B, B by A). */
  dependencyTrail: DependencyTrailStep[];
}

/** Guards the trail walk from a self-referential prerequisite graph. */
const MAX_TRAIL_DEPTH = 6;

function stateLabel(state: TaskProgress['state'] | 'missing'): string {
  switch (state) {
    case 'not_started':
      return 'not started';
    case 'in_progress':
      return 'in progress';
    case 'completed':
      return 'completed';
    case 'archived':
      return 'archived';
    case 'missing':
      return 'missing';
  }
}

function plural(count: number): string {
  return count === 1 ? 'is' : 'are';
}

/**
 * Walks the blocking path upstream from `task`, following only unmet
 * prerequisites, so the trail stops at the first link that is already
 * satisfied. Cycle-safe and depth-capped; a missing definition terminates the
 * walk and is reported as an unresolvable step rather than dropped.
 *
 * Returns root-first: [root, ..., nearest blocker].
 */
function buildDependencyTrail(
  task: TaskDefinition,
  taskProgress: Record<string, TaskProgress>,
  taskDefinitions: TaskDefinition[]
): DependencyTrailStep[] {
  const byId = new Map(taskDefinitions.map((t) => [t.id, t]));
  const visited = new Set<string>([task.id]);
  const trail: DependencyTrailStep[] = [];

  let currentId = evaluateTaskPrerequisites(task, taskProgress).unmetPrerequisiteIds[0];
  let depth = 0;

  while (currentId && depth < MAX_TRAIL_DEPTH && !visited.has(currentId)) {
    visited.add(currentId);
    depth += 1;

    const def = byId.get(currentId);
    if (!def) {
      trail.unshift({
        taskId: currentId,
        title: currentId,
        state: 'missing',
        resolvable: false,
      });
      break;
    }

    trail.unshift({
      taskId: def.id,
      title: def.title,
      state: taskProgress[def.id]?.state ?? 'not_started',
      resolvable: true,
    });

    currentId = evaluateTaskPrerequisites(def, taskProgress).unmetPrerequisiteIds[0];
  }

  return trail;
}

/**
 * Explains exactly why (and on what) a roadmap task is locked.
 *
 * Pure and deterministic: derived only from the supplied definitions,
 * progress and active phase.
 */
export function explainTaskLock(params: {
  task: TaskDefinition;
  taskProgress: Record<string, TaskProgress>;
  taskDefinitions: TaskDefinition[];
  topics: Topic[];
  activePhase?: Phase | number;
}): TaskLockExplanation {
  const { task, taskProgress, taskDefinitions, topics, activePhase } = params;

  // ── Canonical gates ────────────────────────────────────────────────────
  const prereq = evaluateTaskPrerequisites(task, taskProgress);
  const taskPhase = getTaskPhaseNumber(task);
  const activePhaseNum = resolvePhaseNumber(activePhase);
  const isPhaseLocked = taskPhase > activePhaseNum;

  // ── WHY: one blocker per unmet prerequisite, plus the phase gate ───────
  const blockers: TaskLockBlocker[] = [];
  const prerequisiteActions: PrerequisiteNavigationAction[] = [];
  const topicIds = new Set(topics.map((t) => t.id));

  for (const prereqId of prereq.unmetPrerequisiteIds) {
    const def = taskDefinitions.find((d) => d.id === prereqId);

    if (!def) {
      // Missing prerequisite: named honestly, and deliberately NOT actionable —
      // there is no real target, so no route is offered (no phantom routes).
      blockers.push({
        category: 'unresolved',
        prerequisiteTaskId: prereqId,
        prerequisiteTitle: prereqId,
        prerequisiteState: 'missing',
        reason: `Blocked by "${prereqId}", which does not resolve to a roadmap task, so there is no target to open.`,
      });
      continue;
    }

    const state = taskProgress[def.id]?.state ?? 'not_started';
    // A prerequisite task whose topic cannot be located has no deep link either.
    const navigable = topicIds.has(def.topicId);

    blockers.push({
      category: 'incomplete',
      prerequisiteTaskId: def.id,
      prerequisiteTitle: def.title,
      prerequisiteState: state,
      prerequisiteTopicId: navigable ? def.topicId : undefined,
      reason: `Blocked by "${def.title}" — it is ${stateLabel(state)} and must be completed first.`,
    });

    if (navigable) {
      prerequisiteActions.push({
        route: 'roadmap',
        targetId: def.id,
        label: def.title,
      });
    }
  }

  if (isPhaseLocked) {
    blockers.push({
      category: 'phase_locked',
      taskPhase,
      activePhase: activePhaseNum,
      reason: `Phase gate — this task belongs to Phase ${taskPhase} while Phase ${activePhaseNum} is the active phase.`,
    });
  }

  // ── WHY: single sentence for "why can't I start this?" ─────────────────
  const incompleteTitles = blockers
    .filter((b) => b.category === 'incomplete')
    .map((b) => b.prerequisiteTitle)
    .join(', ');
  const incompleteCount = blockers.filter((b) => b.category === 'incomplete').length;
  const unresolvedTitles = blockers
    .filter((b) => b.category === 'unresolved')
    .map((b) => b.prerequisiteTitle)
    .join(', ');
  const unresolvedCount = blockers.filter((b) => b.category === 'unresolved').length;

  // Unresolvable prerequisites are named separately: they can never reach the
  // "completed" state, so saying so would be misleading.
  const prerequisiteParts: string[] = [];
  if (incompleteCount > 0) {
    prerequisiteParts.push(`${incompleteTitles} ${plural(incompleteCount)} completed`);
  }
  if (unresolvedCount > 0) {
    prerequisiteParts.push(
      `${unresolvedTitles} ${unresolvedCount === 1 ? 'resolves' : 'resolve'} to a roadmap task`
    );
  }

  let whyCannotStart = '';
  if (prereq.isBlocked && isPhaseLocked) {
    whyCannotStart = `Cannot start until ${prerequisiteParts.join(' and ')} — and phase-aware planning holds this task until Phase ${taskPhase} activates (active phase: ${activePhaseNum}).`;
  } else if (prereq.isBlocked) {
    whyCannotStart = `Cannot start until ${prerequisiteParts.join(' and ')}.`;
  } else if (isPhaseLocked) {
    whyCannotStart = `Prerequisites are satisfied; phase-aware planning holds this task until Phase ${taskPhase} activates (active phase: ${activePhaseNum}).`;
  }

  return {
    isPrerequisiteBlocked: prereq.isBlocked,
    isPhaseLocked,
    isLocked: prereq.isBlocked || isPhaseLocked,
    unmetPrerequisiteIds: prereq.unmetPrerequisiteIds,
    blockers,
    whyCannotStart,
    prerequisiteActions,
    dependencyTrail: prereq.isBlocked
      ? buildDependencyTrail(task, taskProgress, taskDefinitions)
      : [],
  };
}

/**
 * Resolves a `#/roadmap/<id>` deep link.
 *
 * The route has always accepted a topic id (Preparation → Roadmap). The same
 * segment is also produced today by reviewScheduler / companyPlanEngine /
 * adaptiveEngine candidates, which carry a TASK id — previously those links
 * silently opened nothing. Accepting both keeps the existing route model and
 * makes prerequisite navigation (which targets tasks) deep-linkable.
 */
export function resolveRoadmapTarget(
  targetId: string | undefined,
  topics: Topic[],
  taskDefinitions: TaskDefinition[]
): { topic?: Topic; taskId?: string } {
  if (!targetId) return {};

  const asTopic = topics.find((t) => t.id === targetId);
  if (asTopic) return { topic: asTopic };

  const asTask = taskDefinitions.find((t) => t.id === targetId);
  if (!asTask) return {};

  const topic = topics.find((t) => t.id === asTask.topicId);
  return topic ? { topic, taskId: asTask.id } : { taskId: asTask.id };
}
