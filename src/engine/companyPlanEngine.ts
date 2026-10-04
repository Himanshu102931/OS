import type {
  CompanyOverlay,
  DomainDefinition,
  Topic,
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  TopicSkillState,
  EvidenceLog,
  PreparationTopic,
  PreparationTopicProgress,
  PracticeSessionDefinition,
  Phase,
} from '../types';
import { calculateCompanySnapshot, getDaysUntilEvent } from './companyEngine';
import type { CompanyRequirementMapping } from './companyEngine';
import { DOMAIN_TO_PREP_TOPIC, resolvePhaseNumber, getTaskPhaseNumber } from './weaknessRouter';
import { PREPARATION_TOPICS, getPreparationTopic, getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { evaluatePrerequisiteStatus } from './preparationEngine';
import { evaluateTaskPrerequisites } from './taskStateEngine';
import { isProblemUnlocked } from './dsaEngine';
import type { ReviewCandidate } from './reviewScheduler';

export interface CompanyFocusCandidateOptions {
  targetCompany: CompanyOverlay;
  domains: DomainDefinition[];
  topics: Topic[];
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  dsaAttempts?: DSAAttempt[];
  evidenceLogs?: EvidenceLog[];
  skillStates: Record<string, TopicSkillState>;
  preparationTopics?: PreparationTopic[];
  preparationTopicProgress?: Record<string, PreparationTopicProgress>;
  practiceSessions?: PracticeSessionDefinition[];
  todayStr: string;
  activePhase?: Phase | number;
  committedTargetIds?: Set<string>;
}

/**
 * Calculates deadline urgency score boost (0 - 25) based on days until company event.
 * Uses deterministic date strings (todayStr, eventDate) without Date.now().
 */
export function calculateCompanyDeadlineUrgency(
  eventDateISO?: string,
  todayISO?: string
): { daysUntil: number | null; scoreBoost: number; urgencyLabel?: string } {
  if (!eventDateISO || !todayISO) {
    return { daysUntil: null, scoreBoost: 0 };
  }

  const daysUntil = getDaysUntilEvent(eventDateISO, todayISO);
  // Bounded-ness guard: a malformed date string yields NaN, which would poison
  // priorityScore and the deterministic sort. Treat it as "no usable date"
  // rather than inventing urgency for it.
  if (daysUntil === null || !Number.isFinite(daysUntil)) {
    return { daysUntil: null, scoreBoost: 0 };
  }

  if (daysUntil <= 0) {
    return { daysUntil, scoreBoost: 25, urgencyLabel: 'Event is today or overdue' };
  }
  if (daysUntil <= 3) {
    return { daysUntil, scoreBoost: 22, urgencyLabel: `${daysUntil}d until event (critical)` };
  }
  if (daysUntil <= 7) {
    return { daysUntil, scoreBoost: 18, urgencyLabel: `${daysUntil}d until event (urgent)` };
  }
  if (daysUntil <= 14) {
    return { daysUntil, scoreBoost: 14, urgencyLabel: `${daysUntil}d until event (approaching)` };
  }
  if (daysUntil <= 30) {
    return { daysUntil, scoreBoost: 8, urgencyLabel: `${daysUntil}d until event` };
  }
  return { daysUntil, scoreBoost: 3, urgencyLabel: `${daysUntil}d until event` };
}

/** Base fields shared by every resolved company target. */
interface CompanyTargetBase {
  targetId: string;
  route: 'dsa' | 'roadmap' | 'preparation' | 'practice';
  domainId: string;
  topicId: string;
  isBlocked: boolean;
  blockingReason?: string;
}

/**
 * A company requirement that resolved to a real, dataset-backed learning target.
 * `kind` + `source` are discriminators that drive presentation only — they never
 * influence scoring, ordering, or prerequisite gating.
 */
export type ResolvedCompanyTarget =
  | (CompanyTargetBase & {
      kind: 'dsa';
      source: 'recommended_action' | 'topic_domain_fallback';
      problem: DSAProblem;
    })
  | (CompanyTargetBase & {
      kind: 'task';
      source: 'recommended_action' | 'roadmap_fallback';
      task: TaskDefinition;
    })
  | (CompanyTargetBase & {
      kind: 'prep';
      source: 'prep_fallback';
      prepTopic: PreparationTopic;
    })
  | (CompanyTargetBase & {
      kind: 'practice';
      source: 'practice_fallback';
      session: PracticeSessionDefinition;
    });

export type CompanyTargetKind = ResolvedCompanyTarget['kind'];

/** Everything `resolveCompanyGapTarget` reads. Mirrors `CompanyFocusCandidateOptions`. */
export interface CompanyGapContext {
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  preparationTopics: PreparationTopic[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  practiceSessions: PracticeSessionDefinition[];
  activePhaseNum: number;
}

/** Prerequisite + phase gate for a roadmap task, shared by both resolution paths. */
function gateRoadmapTask(
  task: TaskDefinition,
  ctx: Pick<CompanyGapContext, 'taskProgressMap' | 'activePhaseNum'>
): { isBlocked: boolean; blockingReason?: string } {
  const prereq = evaluateTaskPrerequisites(task, ctx.taskProgressMap);
  const taskPhase = getTaskPhaseNumber(task);
  const isPhaseLocked = taskPhase > ctx.activePhaseNum;
  return {
    isBlocked: prereq.isBlocked || isPhaseLocked,
    blockingReason: prereq.isBlocked
      ? `Prerequisites not completed: ${prereq.unmetPrerequisiteIds.join(', ')}`
      : isPhaseLocked
      ? `Phase locked (Task Phase ${taskPhase} > Current Phase ${ctx.activePhaseNum})`
      : undefined,
  };
}

/**
 * THE single company-requirement → learning-target resolver.
 *
 * Both `generateCompanyFocusCandidates` (scheduling) and
 * `mapCompanyRequirementTargets` (explicit inspection) call this, so company
 * requirement mapping has exactly one authority and can never diverge.
 *
 * Resolution order is unchanged from the original scheduler:
 *   1. honor `recommendedAction.targetId` when it names a real dataset entry
 *   2. DSA problem for the gap's topic/domain
 *   3. uncompleted roadmap task for the gap's topic/domain
 *   4. preparation topic (direct id → roadmap bridge → domain map)
 *   5. practice session for the gap's domain
 *
 * Deterministic and read-only. Returns `null` when no canonical target exists —
 * callers must preserve that gap as unmapped and never invent an id.
 */
export function resolveCompanyGapTarget(
  gap: CompanyRequirementMapping,
  ctx: CompanyGapContext
): ResolvedCompanyTarget | null {
  const rec = gap.recommendedAction;

  // 1. Honor the canonical recommendedAction only when the id validates.
  if (rec.targetId) {
    if (rec.type === 'dsa') {
      const problem = ctx.dsaProblems.find((p) => p.id === rec.targetId);
      if (problem) {
        const unlock = isProblemUnlocked(problem, ctx.dsaProgressMap, ctx.activePhaseNum);
        return {
          kind: 'dsa',
          source: 'recommended_action',
          targetId: problem.id,
          route: 'dsa',
          domainId: problem.domainId,
          topicId: problem.topicId,
          isBlocked: !unlock.isUnlocked,
          blockingReason: unlock.reason,
          problem,
        };
      }
    } else if (rec.type === 'task') {
      const task = ctx.tasks.find((t) => t.id === rec.targetId);
      if (task && ctx.taskProgressMap[task.id]?.state !== 'completed') {
        const gate = gateRoadmapTask(task, ctx);
        return {
          kind: 'task',
          source: 'recommended_action',
          targetId: task.id,
          route: 'roadmap',
          domainId: task.domainId,
          topicId: task.topicId,
          ...gate,
          task,
        };
      }
    }
  }

  // 2. DSA problem matching the gap's topic or domain.
  if (gap.domainId === 'dsa' || gap.category === 'topic') {
    const problem = ctx.dsaProblems.find(
      (p) =>
        (p.topicId === gap.topicId || (gap.domainId && p.domainId === gap.domainId)) &&
        !ctx.dsaProgressMap[p.id]?.passedIndependently
    );
    if (problem) {
      const unlock = isProblemUnlocked(problem, ctx.dsaProgressMap, ctx.activePhaseNum);
      return {
        kind: 'dsa',
        source: 'topic_domain_fallback',
        targetId: problem.id,
        route: 'dsa',
        domainId: problem.domainId,
        topicId: problem.topicId,
        isBlocked: !unlock.isUnlocked,
        blockingReason: unlock.reason,
        problem,
      };
    }
  }

  // 3. Uncompleted roadmap task matching the gap's topic or domain.
  const matchingTask = ctx.tasks.find(
    (t) =>
      (t.topicId === gap.topicId || (gap.domainId && t.domainId === gap.domainId)) &&
      ctx.taskProgressMap[t.id]?.state !== 'completed'
  );
  if (matchingTask) {
    const gate = gateRoadmapTask(matchingTask, ctx);
    return {
      kind: 'task',
      source: 'roadmap_fallback',
      targetId: matchingTask.id,
      route: 'roadmap',
      domainId: matchingTask.domainId,
      topicId: matchingTask.topicId,
      ...gate,
      task: matchingTask,
    };
  }

  // 4. Preparation topic: direct id → roadmap bridge → domain map.
  let prepTopic: PreparationTopic | undefined;
  if (gap.topicId) {
    prepTopic = ctx.preparationTopics.find((t) => t.id === gap.topicId);
    if (!prepTopic) {
      const bridgedId = getPreparationTopicIdByRoadmapId(gap.topicId);
      if (bridgedId) prepTopic = ctx.preparationTopics.find((t) => t.id === bridgedId);
    }
  }
  if (!prepTopic && gap.domainId) {
    const fallbackId = DOMAIN_TO_PREP_TOPIC[gap.domainId];
    if (fallbackId) prepTopic = ctx.preparationTopics.find((t) => t.id === fallbackId);
  }
  if (prepTopic) {
    const prereqStatus = evaluatePrerequisiteStatus(
      prepTopic,
      (id) => ctx.preparationTopics.find((t) => t.id === id) || getPreparationTopic(id),
      ctx.preparationTopicProgress
    );
    return {
      kind: 'prep',
      source: 'prep_fallback',
      targetId: prepTopic.id,
      route: 'preparation',
      domainId: prepTopic.domainId,
      topicId: prepTopic.id,
      isBlocked: prereqStatus.isLocked,
      blockingReason: prereqStatus.unmetPrerequisiteIds.length
        ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
        : undefined,
      prepTopic,
    };
  }

  // 5. Practice session for the gap's domain.
  if (gap.domainId) {
    const session = ctx.practiceSessions.find((s) => s.domainId === gap.domainId);
    if (session) {
      return {
        kind: 'practice',
        source: 'practice_fallback',
        targetId: session.id,
        route: 'practice',
        domainId: session.domainId,
        topicId: session.topicId || '',
        isBlocked: false,
        session,
      };
    }
  }

  return null;
}

const COMPANY_TARGET_TYPE: Record<CompanyTargetKind, ReviewCandidate['type']> = {
  dsa: 'dsa_review',
  task: 'roadmap_task',
  prep: 'preparation_lesson',
  practice: 'practice_session',
};

/**
 * Builds the `company_gap` ReviewCandidate for one resolved target. Presentation
 * text differs between the `recommendedAction` path and the fallback path, which
 * is exactly what `resolution.source` carries — scoring stays identical.
 */
function buildCompanyGapCandidate(
  resolution: ResolvedCompanyTarget,
  gap: CompanyRequirementMapping,
  companyName: string,
  urgency: { scoreBoost: number; urgencyLabel?: string }
): ReviewCandidate {
  const urg = urgency.urgencyLabel ? ` · ${urgency.urgencyLabel}` : '';
  const baseScore = Math.max(resolution.kind === 'practice' ? 35 : 40, 100 - gap.evidenceStrength);
  const priorityScore = Math.min(100, baseScore + urgency.scoreBoost);
  const req = gap.requirementName;
  const viaRecommended = resolution.source === 'recommended_action';

  switch (resolution.kind) {
    case 'dsa': {
      const prob = resolution.problem;
      return {
        id: `company-gap-dsa-${prob.id}`,
        type: 'dsa_review',
        title: `${companyName} Target: #${prob.leetcodeNumber || ''} ${prob.title}`,
        description: viaRecommended
          ? `Address gap in ${req} (${gap.statusLabel}, ${gap.evidenceStrength}% strength).`
          : `Practice DSA pattern for ${companyName} requirement (${req}).`,
        priority: 'company_gap',
        priorityScore,
        domainId: prob.domainId,
        topicId: prob.topicId,
        estimatedMinutes: prob.estimatedTimeMinutes || 25,
        reason: `${companyName} requirement "${req}" has a gap (${gap.evidenceStrength}% evidence)${urg}; ${
          viaRecommended ? 'targeted problem recommended' : 'practice problem recommended'
        }`,
        route: 'dsa',
        targetId: prob.id,
        sourceProblemId: prob.id,
        isBlocked: resolution.isBlocked,
        blockingReason: resolution.blockingReason,
      };
    }
    case 'task': {
      const task = resolution.task;
      return {
        id: `company-gap-task-${task.id}`,
        type: 'roadmap_task',
        title: `${companyName} Task: ${task.title}`,
        description: viaRecommended
          ? `Work on curriculum task to satisfy ${companyName} requirement (${req}).`
          : `Complete task to satisfy ${companyName} requirement for ${req}.`,
        priority: 'company_gap',
        priorityScore,
        domainId: task.domainId,
        topicId: task.topicId,
        estimatedMinutes: task.estimatedMinutes,
        reason: `${companyName} requirement "${req}" ${
          viaRecommended ? 'requires' : 'needs'
        } evidence (${gap.evidenceStrength}% evidence)${urg}; curriculum task recommended`,
        route: 'roadmap',
        targetId: task.id,
        sourceTaskId: task.id,
        isBlocked: resolution.isBlocked,
        blockingReason: resolution.blockingReason,
      };
    }
    case 'prep': {
      const prepTopic = resolution.prepTopic;
      return {
        id: `company-gap-prep-${prepTopic.id}`,
        type: 'preparation_lesson',
        title: `${companyName} Preparation: ${prepTopic.title}`,
        description: `Preparatory concept lesson to build evidence for ${companyName} (${req}).`,
        priority: 'company_gap',
        priorityScore,
        domainId: prepTopic.domainId,
        topicId: prepTopic.id,
        estimatedMinutes: 20,
        reason: `${companyName} requirement "${req}" has low evidence (${gap.evidenceStrength}%); foundational preparation recommended`,
        route: 'preparation',
        targetId: prepTopic.id,
        sourceTopicId: prepTopic.id,
        isBlocked: resolution.isBlocked,
        blockingReason: resolution.blockingReason,
      };
    }
    case 'practice': {
      const session = resolution.session;
      return {
        id: `company-gap-practice-${session.id}`,
        type: 'practice_session',
        title: `${companyName} Practice: ${session.title}`,
        description: `Targeted practice session to build ${companyName} requirement evidence.`,
        priority: 'company_gap',
        priorityScore,
        domainId: session.domainId,
        topicId: session.topicId || '',
        estimatedMinutes: session.estimatedMinutes || 20,
        reason: `${companyName} requirement "${req}" developing; targeted practice drill recommended`,
        route: 'practice',
        targetId: session.id,
        isBlocked: resolution.isBlocked,
      };
    }
  }
}

/**
 * Generates prioritized ReviewCandidate actions for target company requirements and gaps.
 * Connects companyEngine.calculateCompanySnapshot and recommendedAction into actionable ReviewCandidates.
 *
 * Safety & Quality:
 * - Deterministic, read-only
 * - Strictly respects prerequisites & phase locks
 * - Excludes committed/completed work
 * - Clean fallback without manufacturing phantom IDs
 */
export function generateCompanyFocusCandidates(
  options: CompanyFocusCandidateOptions
): ReviewCandidate[] {
  const {
    targetCompany,
    domains,
    topics,
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    dsaAttempts = [],
    evidenceLogs = [],
    skillStates,
    preparationTopics = PREPARATION_TOPICS,
    preparationTopicProgress = {},
    practiceSessions = PRACTICE_SESSIONS,
    todayStr,
    activePhase,
    committedTargetIds = new Set<string>(),
  } = options;

  // If company has no requirements configured at all, fallback cleanly to empty
  const hasConfiguredRequirements =
    (targetCompany.requiredDomains && targetCompany.requiredDomains.length > 0) ||
    (targetCompany.requiredTopics && targetCompany.requiredTopics.length > 0) ||
    (targetCompany.requiredLanguages && targetCompany.requiredLanguages.length > 0);

  if (!hasConfiguredRequirements) {
    return [];
  }

  // Calculate live preparation snapshot using canonical companyEngine
  const snapshot = calculateCompanySnapshot(
    targetCompany,
    domains,
    topics,
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    todayStr
  );

  // If all requirements are fully covered, no gaps to surface
  if (snapshot.gapRequirementsCount === 0 && snapshot.topActionableGaps.length === 0) {
    return [];
  }

  const companyName =
    targetCompany.companyName || (targetCompany as { name?: string }).name || 'Target Company';
  const deadlineUrgency = calculateCompanyDeadlineUrgency(targetCompany.eventDate, todayStr);
  const activePhaseNum = resolvePhaseNumber(activePhase);
  const candidates: ReviewCandidate[] = [];

  const resolutionContext: CompanyGapContext = {
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    preparationTopics,
    preparationTopicProgress,
    practiceSessions,
    activePhaseNum,
  };

  for (const gap of snapshot.topActionableGaps) {
    // Single mapping authority (§5): `resolveCompanyGapTarget` validates every
    // id against the canonical dataset and returns null when nothing matches.
    // A null resolution is preserved as an unmapped gap by
    // `mapCompanyRequirementTargets` — never turned into a fabricated target.
    const resolution = resolveCompanyGapTarget(gap, resolutionContext);
    if (!resolution) continue;

    candidates.push(buildCompanyGapCandidate(resolution, gap, companyName, deadlineUrgency));
  }

  // Filter blocked candidates and committed targets
  const unblockedCandidates = candidates.filter(
    (c) => !c.isBlocked && !committedTargetIds.has(c.targetId)
  );

  // Deterministic sort: highest priorityScore first, then targetId ascending
  unblockedCandidates.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.targetId.localeCompare(b.targetId);
  });

  // Deduplicate by targetId
  const seenTargets = new Set<string>();
  const deduplicated: ReviewCandidate[] = [];
  for (const candidate of unblockedCandidates) {
    if (!seenTargets.has(candidate.targetId)) {
      seenTargets.add(candidate.targetId);
      deduplicated.push(candidate);
    }
  }

  return deduplicated;
}

/**
 * One row of the explicit company-requirement → PlacementOS-target mapping (§5).
 *
 * `mapped === true` guarantees `targetId` was validated against the canonical
 * dataset by `resolveCompanyGapTarget`. `mapped === false` guarantees no id was
 * invented: the requirement is preserved with a human-readable `unmappedReason`.
 */
export interface CompanyRequirementTargetMapping {
  requirementId: string;
  requirementName: string;
  category: 'domain' | 'topic' | 'language';
  status: CompanyRequirementMapping['status'];
  statusLabel: string;
  evidenceStrength: number;
  gapExplanation: string;
  /** false once the requirement is covered — no target is required then. */
  requiresTarget: boolean;
  /** true only when a dataset-backed target was found and validated. */
  mapped: boolean;
  route?: 'dsa' | 'roadmap' | 'preparation' | 'practice';
  targetId?: string;
  targetType?: ReviewCandidate['type'];
  domainId?: string;
  topicId?: string;
  isBlocked?: boolean;
  blockingReason?: string;
  /** set when an already-active route (remediation/overdue) covers this target */
  reusedRoute?: boolean;
  /** present exactly when `mapped === false`; never a fabricated id. */
  unmappedReason?: string;
}

export interface CompanyRequirementMappingOptions extends CompanyFocusCandidateOptions {
  /**
   * targetIds already served by an existing route (remediation, routed weakness,
   * overdue review). Marked `reusedRoute` so company mode reuses them instead of
   * proposing a competing route (§9).
   */
  reusedRouteTargetIds?: Set<string>;
}

/**
 * Explicit, deterministic company-requirement → target mapping (§5).
 *
 * Consumes the SAME snapshot and the SAME `resolveCompanyGapTarget` authority as
 * `generateCompanyFocusCandidates`, so inspection and scheduling can never
 * disagree. Read-only, deterministic, and never fabricates a target id.
 */
export function mapCompanyRequirementTargets(
  options: CompanyRequirementMappingOptions
): CompanyRequirementTargetMapping[] {
  const {
    targetCompany,
    domains,
    topics,
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    dsaAttempts = [],
    evidenceLogs = [],
    skillStates,
    preparationTopics = PREPARATION_TOPICS,
    preparationTopicProgress = {},
    practiceSessions = PRACTICE_SESSIONS,
    todayStr,
    activePhase,
    reusedRouteTargetIds,
  } = options;

  const hasConfiguredRequirements =
    (targetCompany.requiredDomains && targetCompany.requiredDomains.length > 0) ||
    (targetCompany.requiredTopics && targetCompany.requiredTopics.length > 0) ||
    (targetCompany.requiredLanguages && targetCompany.requiredLanguages.length > 0);

  if (!hasConfiguredRequirements) return [];

  const snapshot = calculateCompanySnapshot(
    targetCompany,
    domains,
    topics,
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    todayStr
  );

  const ctx: CompanyGapContext = {
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    preparationTopics,
    preparationTopicProgress,
    practiceSessions,
    activePhaseNum: resolvePhaseNumber(activePhase),
  };

  return snapshot.requirements.map((requirement) => {
    const base = {
      requirementId: requirement.requirementId,
      requirementName: requirement.requirementName,
      category: requirement.category,
      status: requirement.status,
      statusLabel: requirement.statusLabel,
      evidenceStrength: requirement.evidenceStrength,
      gapExplanation: requirement.gapExplanation,
      requiresTarget: requirement.status !== 'covered',
    };

    if (requirement.status === 'covered') {
      // Covered requirements need no target — reporting them as "unmapped"
      // would be a false gap, so they resolve to no target deliberately.
      return { ...base, mapped: false };
    }

    const resolution = resolveCompanyGapTarget(requirement, ctx);
    if (!resolution) {
      return {
        ...base,
        mapped: false,
        unmappedReason:
          'No existing roadmap task, DSA problem, preparation lesson, or practice session matches this requirement yet. It stays visible as a gap until one does.',
      };
    }

    return {
      ...base,
      mapped: true,
      route: resolution.route,
      targetId: resolution.targetId,
      targetType: COMPANY_TARGET_TYPE[resolution.kind],
      domainId: resolution.domainId,
      topicId: resolution.topicId,
      isBlocked: resolution.isBlocked,
      blockingReason: resolution.blockingReason,
      reusedRoute: reusedRouteTargetIds?.has(resolution.targetId) ?? false,
    };
  });
}

/**
 * Counts requirements that still need work but have no validated target.
 * Covered requirements are never counted — they are not gaps.
 */
export function countUnmappedCompanyRequirements(
  mappings: CompanyRequirementTargetMapping[]
): number {
  return mappings.filter((m) => m.requiresTarget && !m.mapped).length;
}

/** Canonical datasets used to validate a `recommendedAction` deep-link (§13). */
export interface CompanyActionDatasets {
  dsaProblems: DSAProblem[];
  tasks: TaskDefinition[];
  topics: Topic[];
  preparationTopics?: PreparationTopic[];
  practiceSessions?: PracticeSessionDefinition[];
}

/**
 * Result of validating `CompanyRequirementMapping.recommendedAction` against the
 * canonical datasets before any navigation happens (§7).
 *
 * - `navigable === true` → click may call `setRoute(route, targetId)`
 * - `navigable === false` → action stays informational: no navigation, no
 *   fabricated deep-link, no invented task.
 * - `targetId === undefined` with `navigable === true` → hub navigation only.
 */
export interface CompanyActionTargetResolution {
  route: 'dsa' | 'roadmap' | 'skills' | 'dashboard' | 'preparation' | 'practice';
  hasTargetId: boolean;
  targetValid: boolean;
  targetId?: string;
  navigable: boolean;
  reason: string;
}

/**
 * Deterministically validates a company `recommendedAction` against the real
 * dataset. An unresolvable targetId disables navigation instead of pointing the
 * user at a task that does not exist.
 */
export function validateCompanyRecommendedAction(
  action: {
    route: 'dsa' | 'roadmap' | 'skills' | 'dashboard' | 'preparation' | 'practice';
    targetId?: string;
    type?: 'dsa' | 'task' | 'review';
  },
  datasets: CompanyActionDatasets
): CompanyActionTargetResolution {
  const { route, targetId } = action;

  if (!targetId) {
    // Route-only action (e.g. "View Skills"). Hub navigation, no deep-link to
    // fabricate, so it is safe to follow as-is.
    return {
      route,
      hasTargetId: false,
      targetValid: true,
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
      case 'preparation':
        return (datasets.preparationTopics ?? []).some((t) => t.id === targetId);
      case 'practice':
        return (datasets.practiceSessions ?? []).some((s) => s.id === targetId);
      case 'dashboard':
      default:
        // Dashboard never accepts a target — a targetId here cannot be validated.
        return false;
    }
  };

  if (!idExists()) {
    return {
      route,
      hasTargetId: true,
      targetValid: false,
      navigable: false,
      reason:
        'This action points at work that no longer exists in your plan, so nothing was opened. The requirement stays visible as a gap.',
    };
  }

  return {
    route,
    hasTargetId: true,
    targetValid: true,
    targetId,
    navigable: true,
    reason: 'Opens the matching item in your plan.',
  };
}

export interface CompanyFocusItem {
  title: string;
  /** One plain-language line — no weights, scores, or mastery claims. */
  reason: string;
  kind: 'weakness' | 'remediation' | 'priority';
  route?: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'dashboard';
  targetId?: string;
}

export interface CompanyFocusSummary {
  companyName: string;
  configured: boolean;
  totalRequirements: number;
  coveredRequirements: number;
  gapCount: number;
  unmappedCount: number;
  blockedCount: number;
  /** Real event date only — null when the company has no date configured. */
  eventDate?: string;
  daysUntil: number | null;
  urgencyLabel?: string;
  /** Plain-language explanation of why company mode is shaping today. */
  priorityReason: string;
  focusItems: CompanyFocusItem[];
}

export interface CompanyFocusSummaryOptions {
  targetCompany: CompanyOverlay;
  todayStr: string;
  mappings: CompanyRequirementTargetMapping[];
  /** Review candidates from the canonical scheduler, already merged. */
  candidates: ReviewCandidate[];
  /** The normal placement-priority task, used as the "also do this" item. */
  baselineTask?: { title: string; targetId: string; route?: string } | null;
}

const REMEDIATION_PRIORITIES = new Set([
  'remediation',
  'routed_weakness',
  'overdue_review',
]);

/**
 * Plain-language Company Focus summary for Today (§8, §14).
 *
 * Deliberately avoids readiness percentages, weights, and mastery claims. Urgency
 * wording is emitted only when a real `eventDate` exists.
 */
export function buildCompanyFocusSummary(
  options: CompanyFocusSummaryOptions
): CompanyFocusSummary {
  const { targetCompany, todayStr, mappings, candidates, baselineTask } = options;

  const companyName =
    targetCompany.companyName || (targetCompany as { name?: string }).name || 'Target Company';

  const configured = mappings.length > 0;
  const gapCount = mappings.filter((m) => m.requiresTarget).length;
  const unmappedCount = countUnmappedCompanyRequirements(mappings);
  const blockedCount = mappings.filter((m) => m.requiresTarget && m.isBlocked).length;
  const coveredRequirements = mappings.filter((m) => !m.requiresTarget).length;

  const urgency = calculateCompanyDeadlineUrgency(targetCompany.eventDate, todayStr);
  const hasEventDate = Boolean(targetCompany.eventDate);

  let priorityReason: string;
  if (!configured) {
    priorityReason = `No requirements are configured for ${companyName} yet, so today follows your normal placement priorities.`;
  } else if (gapCount === 0) {
    priorityReason = `Every ${companyName} requirement already has supporting evidence, so today follows your normal placement priorities.`;
  } else if (hasEventDate && urgency.daysUntil !== null && urgency.daysUntil <= 0) {
    priorityReason = `${companyName}'s event is today or overdue, so ${companyName} requirements are pulled to the top of today's plan.`;
  } else if (hasEventDate && urgency.daysUntil !== null) {
    priorityReason = `${companyName}'s event is in ${urgency.daysUntil} day${urgency.daysUntil === 1 ? '' : 's'}, so ${companyName} requirements are raised in today's plan.`;
  } else {
    priorityReason = `These ${companyName} requirements are raised in today's plan because they are relevant to your target company.`;
  }

  const focusItems: CompanyFocusItem[] = [];
  const usedTargetIds = new Set<string>();

  const companyGaps = candidates
    .filter((c) => c.priority === 'company_gap')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  for (const candidate of companyGaps) {
    if (focusItems.length >= 2) break;
    if (usedTargetIds.has(candidate.targetId)) continue;
    usedTargetIds.add(candidate.targetId);
    focusItems.push({
      title: candidate.title,
      reason: candidate.reason,
      kind: 'weakness',
      route: candidate.route,
      targetId: candidate.targetId,
    });
  }

  const remediationItem = candidates.find(
    (c) =>
      REMEDIATION_PRIORITIES.has(c.priority) &&
      !usedTargetIds.has(c.targetId) &&
      !c.isBlocked
  );
  if (remediationItem && focusItems.length < 3) {
    usedTargetIds.add(remediationItem.targetId);
    focusItems.push({
      title: remediationItem.title,
      reason: remediationItem.reason,
      kind: 'remediation',
      route: remediationItem.route,
      targetId: remediationItem.targetId,
    });
  }

  if (baselineTask && focusItems.length < 3 && !usedTargetIds.has(baselineTask.targetId)) {
    focusItems.push({
      title: baselineTask.title,
      reason: 'Your normal placement priority, kept alongside the company work.',
      kind: 'priority',
      route: (baselineTask.route as CompanyFocusItem['route']) ?? undefined,
      targetId: baselineTask.targetId,
    });
  }

  return {
    companyName,
    configured,
    totalRequirements: mappings.length,
    coveredRequirements,
    gapCount,
    unmappedCount,
    blockedCount,
    eventDate: hasEventDate ? targetCompany.eventDate : undefined,
    daysUntil: hasEventDate ? urgency.daysUntil : null,
    urgencyLabel: hasEventDate ? urgency.urgencyLabel : undefined,
    priorityReason,
    focusItems,
  };
}
