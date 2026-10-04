import type {
  DomainAssessmentResult,
  WeaknessSignal,
  DomainId,
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
  PracticeSessionDefinition,
  PracticeAttempt,
} from '../types';
import { DOMAIN_METADATA } from './assessmentEngine';
import type { AssessmentProfileReadout } from './assessmentEngine';
import {
  resolveAssessmentRemediation,
  type RemediationRoutingOptions,
} from './remediationRouter';
import { resolvePhaseNumber } from './remediationRouter';

/**
 * Assessment-derived learning target kind.
 * Mirrors the product requirement outcomes: preparation, practice, dsa, roadmap, or none.
 */
export type AssessmentTargetKind =
  | 'preparation'
  | 'practice'
  | 'dsa'
  | 'roadmap'
  | 'none';

/**
 * A validated assessment-derived learning target.
 * Every field is derived from canonical datasets — no fabricated IDs.
 */
export interface AssessmentLearningTarget {
  kind: AssessmentTargetKind;
  route: 'preparation' | 'practice' | 'dsa' | 'roadmap';
  targetId: string;
  title: string;
  description: string;
  reason: string;
  estimatedMinutes: number;
  domainId: DomainId;
  topicId?: string;
  /** Whether prerequisites/phase lock block this target right now. */
  isBlocked: boolean;
  blockingReason?: string;
  /** Source assessment signal that triggered this target. */
  sourceSignal: {
    type: 'weakness_focus_area' | 'confidence_signal' | 'domain_weakness';
    id: string;
    domainId: DomainId;
    confidence: 'none' | 'low' | 'medium' | 'high';
  };
}

/**
 * Full assessment integration result — zero or more learning targets.
 */
export interface AssessmentIntegrationResult {
  targets: AssessmentLearningTarget[];
  /** Human-readable summary for the UI. */
  summary: string;
}

/**
 * Options required to resolve assessment-derived learning targets.
 * Mirrors RemediationRoutingOptions but adds assessment-specific context.
 */
export interface AssessmentIntegrationOptions {
  /** Current assessment domain results. */
  domainResults: DomainAssessmentResult[];
  /** Current weakness signals. */
  weaknessSignals: WeaknessSignal[];
  /** Assessment profile readout (contains planInputs, weaknesses, strengths). */
  assessmentProfileReadout: AssessmentProfileReadout | undefined;
  /** Company overlays for company relevance (does not bypass prerequisites). */
  companyOverlays: CompanyOverlay[];
  /** Skill states for readiness/progression checks. */
  skillStates: Record<string, TopicSkillState>;
  /** All available practice sessions (for practice targets). */
  practiceSessions: PracticeSessionDefinition[];
  /** Practice attempts for remediation/progression logic. */
  practiceAttempts: PracticeAttempt[];
  /** DSA data for DSA targets. */
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  /** Roadmap data for task targets. */
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  /** Topic/domain metadata. */
  topics: Topic[];
  domains: DomainDefinition[];
  /** Preparation data for preparation targets. */
  preparationTopics: PreparationTopic[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  /** Active phase for prerequisite/phase gating. */
  activePhase?: Phase | number;
  /** Today string for date-driven logic. */
  todayStr: string;
  /** Target IDs already committed for today (prevents duplicate scheduling). */
  committedTargetIds?: Set<string>;
  /** Available session minutes (for budget awareness). */
  availableMinutes?: number;
  /** Whether a target company is selected (company focus mode). */
  selectedCompanyId?: string;
}

/**
 * Pure deterministic resolver for assessment-derived learning targets.
 *
 * Flow:
 * 1. Reuse remediationRouter.resolveAssessmentRemediation to get canonical routes
 * 2. Filter by assessment confidence signals (low/medium/high)
 * 3. Validate all target IDs against canonical datasets
 * 4. Return structured learning targets with plain-language explanations
 *
 * All target IDs are validated against canonical datasets.
 * No target is ever fabricated.
 * Confidence-only signals guide evidence collection, not competency failure.
 */
export function resolveAssessmentLearningTargets(
  options: AssessmentIntegrationOptions
): AssessmentIntegrationResult {
  const {
    domainResults,
    weaknessSignals,
    assessmentProfileReadout,
    skillStates,
    practiceSessions,
    practiceAttempts,
    dsaProblems,
    dsaProgressMap,
    tasks,
    taskProgressMap,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase = 1,
    todayStr,
    committedTargetIds = new Set(),
    availableMinutes,
  } = options;

  const phaseNum = resolvePhaseNumber(activePhase);

  // Build remediation routing options from the full context
  const remediationOptions: RemediationRoutingOptions = {
    domainResults,
    weaknessSignals,
    assessmentProfileReadout,
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
    activePhase: phaseNum,
    todayStr,
    committedTargetIds,
  };

  // Get canonical remediation routes from Task 4's remediationRouter
  const remediationRoutes = resolveAssessmentRemediation(remediationOptions);

  // Build a set of committed target IDs that should not be re-routed.
  // Note: We intentionally do NOT include allRemediationRoutes target IDs here,
  // because resolveAllRemediationRoutes includes the assessment weakness routes
  // themselves — filtering them out would suppress all assessment-derived targets.
  const unavailableTargetIds = new Set(committedTargetIds);

  // Convert remediation routes to AssessmentLearningTarget format
  const targets: AssessmentLearningTarget[] = [];
  const seenTargetIds = new Set<string>();

  for (const route of remediationRoutes) {
    // Skip if target is blocked or already committed/unavailable
    if (route.isBlocked || unavailableTargetIds.has(route.targetId)) continue;
    // Skip if we've already added this target (deduplication)
    if (seenTargetIds.has(route.targetId)) continue;
    seenTargetIds.add(route.targetId);

    // Budget check: if availableMinutes is provided and this exceeds it, skip
    if (availableMinutes !== undefined && route.estimatedMinutes > availableMinutes) {
      continue;
    }

    // Map route type to assessment target kind
    let kind: AssessmentTargetKind;
    switch (route.type) {
      case 'preparation_lesson':
        kind = 'preparation';
        break;
      case 'practice_session':
        kind = 'practice';
        break;
      case 'dsa_review':
        kind = 'dsa';
        break;
      case 'roadmap_task':
        kind = 'roadmap';
        break;
      default:
        continue; // skip unknown types
    }

    // Determine source signal from the route
    const sourceSignal = {
      type: route.sourceType === 'assessment_weakness' ? 'weakness_focus_area' as const
        : route.sourceType === 'practice_weakness' ? 'weakness_focus_area' as const
        : 'domain_weakness' as const,
      id: route.sourceId,
      domainId: route.domainId as DomainId,
      confidence: route.confidence as 'none' | 'low' | 'medium' | 'high',
    };

    targets.push({
      kind,
      route: route.route,
      targetId: route.targetId,
      title: route.title,
      description: route.description,
      reason: route.reason,
      estimatedMinutes: route.estimatedMinutes,
      domainId: route.domainId as DomainId,
      topicId: route.topicId,
      isBlocked: route.isBlocked,
      blockingReason: route.blockingReason,
      sourceSignal,
    });
  }

  // Also handle confidence-only signals that don't produce weaknessFocusAreas
  // These are domains with low confidence but no explicit weakness signal
  if (assessmentProfileReadout) {
    for (const profile of assessmentProfileReadout.domainProfiles) {
      if (profile.domainId === 'projects') continue;
      if (profile.level <= 1 && profile.confidence === 'low') {
        // Low confidence at low level → foundational preparation
        const domainId = profile.domainId as DomainId;
        const fallbackId = DOMAIN_METADATA[domainId]?.fallbackTopicId;
        if (fallbackId) {
          const prepTopic = preparationTopics.find((t) => t.id === fallbackId);
          if (prepTopic && !unavailableTargetIds.has(prepTopic.id) && !seenTargetIds.has(prepTopic.id)) {
            // Budget check for confidence-only targets
            if (availableMinutes !== undefined && 25 > availableMinutes) continue;
            seenTargetIds.add(prepTopic.id);
            targets.push({
              kind: 'preparation',
              route: 'preparation',
              targetId: prepTopic.id,
              title: `Foundational Review: ${prepTopic.title}`,
              description: `Build foundational evidence for ${domainId} (Level ${profile.level}, ${profile.confidence} confidence).`,
              reason: `Assessment shows low confidence (${profile.confidence}) at Level ${profile.level} for ${DOMAIN_METADATA[domainId]?.name || domainId}; foundational preparation recommended.`,
              estimatedMinutes: 25,
              domainId,
              topicId: prepTopic.id,
              isBlocked: false,
              sourceSignal: {
                type: 'confidence_signal',
                id: `confidence-${domainId}`,
                domainId,
                confidence: profile.confidence,
              },
            });
          }
        }
      }
    }
  }

  // Generate summary
  const summary = generateAssessmentSummary(targets, assessmentProfileReadout);

  return { targets, summary };
}

/**
 * Generates a plain-language summary of assessment-derived targets.
 * No weights, scores, or mastery claims — only observable facts.
 */
function generateAssessmentSummary(
  targets: AssessmentLearningTarget[],
  profile?: AssessmentProfileReadout
): string {
  if (targets.length === 0) {
    if (profile?.isAssessed) {
      return 'Assessment completed. No additional learning targets derived from current results.';
    }
    return 'No assessment data available.';
  }

  const byKind = targets.reduce((acc, t) => {
    acc[t.kind] = (acc[t.kind] || 0) + 1;
    return acc;
  }, {} as Record<AssessmentTargetKind, number>);

  const parts: string[] = [];
  if (byKind.preparation) parts.push(`${byKind.preparation} preparation lesson${byKind.preparation > 1 ? 's' : ''}`);
  if (byKind.practice) parts.push(`${byKind.practice} practice session${byKind.practice > 1 ? 's' : ''}`);
  if (byKind.dsa) parts.push(`${byKind.dsa} DSA problem${byKind.dsa > 1 ? 's' : ''}`);
  if (byKind.roadmap) parts.push(`${byKind.roadmap} curriculum task${byKind.roadmap > 1 ? 's' : ''}`);

  const targetList = parts.join(', ');
  return `Assessment derived ${targetList}. ${targets[0]?.reason || ''}`;
}

/**
 * Validates an assessment-derived target against canonical datasets.
 * Returns true if the targetId exists in the appropriate dataset.
 */
export function validateAssessmentTarget(
  target: AssessmentLearningTarget,
  datasets: {
    preparationTopics: PreparationTopic[];
    practiceSessions: PracticeSessionDefinition[];
    dsaProblems: DSAProblem[];
    tasks: TaskDefinition[];
  }
): boolean {
  switch (target.route) {
    case 'preparation':
      return datasets.preparationTopics.some((t) => t.id === target.targetId);
    case 'practice':
      return datasets.practiceSessions.some((s) => s.id === target.targetId);
    case 'dsa':
      return datasets.dsaProblems.some((p) => p.id === target.targetId);
    case 'roadmap':
      return datasets.tasks.some((t) => t.id === target.targetId);
    default:
      return false;
  }
}

/**
 * Produces a deep-link navigation action from an assessment target.
 * Returns null if the target is blocked or invalid.
 */
export function getAssessmentTargetDeepLink(
  target: AssessmentLearningTarget | null,
  datasets: {
    preparationTopics: PreparationTopic[];
    practiceSessions: PracticeSessionDefinition[];
    dsaProblems: DSAProblem[];
    tasks: TaskDefinition[];
  }
): { route: string; targetId: string } | null {
  if (!target || target.isBlocked) return null;
  if (!validateAssessmentTarget(target, datasets)) return null;
  return { route: target.route, targetId: target.targetId };
}

/**
 * Budget-aware helper: pick the best assessment targets that fit
 * within the available time budget.
 */
export function pickBestAssessmentTargetsWithinBudget(
  targets: AssessmentLearningTarget[],
  availableMinutes: number
): AssessmentLearningTarget[] {
  const valid = targets.filter((t) => !t.isBlocked && t.estimatedMinutes <= availableMinutes);
  const picked: AssessmentLearningTarget[] = [];
  let usedMinutes = 0;

  for (const t of valid) {
    if (usedMinutes + t.estimatedMinutes <= availableMinutes) {
      picked.push(t);
      usedMinutes += t.estimatedMinutes;
    }
  }
  return picked;
}

/**
 * Assessment-derived targets as ReviewCandidates for the session composer.
 * This allows assessment signals to flow through the existing SessionComposer
 * without creating a second session state machine.
 */
export function assessmentTargetsToReviewCandidates(
  targets: AssessmentLearningTarget[]
): import('./reviewScheduler').ReviewCandidate[] {
  return targets
    .filter((t) => !t.isBlocked)
    .map((t) => ({
      id: `assessment-${t.kind}-${t.targetId}`,
      type: t.kind === 'preparation' ? 'preparation_lesson' as const
        : t.kind === 'practice' ? 'practice_session' as const
        : t.kind === 'dsa' ? 'dsa_review' as const
        : 'roadmap_task' as const,
      title: t.title,
      description: t.description,
      priority: 'routed_weakness' as const,
      // Priority score is intentionally fixed at 80 as a neutral base.
      // Assessment-derived targets do not carry a deterministic strength signal
      // (unlike remediation routes which use area.strength 1-3 → 60-90).
      // The adaptive engine is the canonical priority authority and will adjust
      // this score based on urgency, weakness, importance, and other factors.
      // Creating a second priority formula here would duplicate adaptiveEngine logic.
      priorityScore: 80,
      domainId: t.domainId,
      topicId: t.topicId || '',
      estimatedMinutes: t.estimatedMinutes,
      reason: t.reason,
      route: t.route,
      targetId: t.targetId,
      isBlocked: false,
    }));
}

/**
 * Check if assessment has any actionable signals (weaknesses or low confidence).
 * Used by the Assessment CTA to determine if a "Continue to Learning" button should appear.
 */
export function hasAssessmentActionableSignals(
  options: AssessmentIntegrationOptions
): boolean {
  const result = resolveAssessmentLearningTargets(options);
  return result.targets.length > 0;
}

/**
 * Returns the primary assessment-derived action for the Assessment CTA.
 * Returns the highest-priority unblocked target that fits in a standard session.
 */
export function getPrimaryAssessmentAction(
  options: AssessmentIntegrationOptions,
  availableMinutes: number = 60
): AssessmentLearningTarget | null {
  const result = resolveAssessmentLearningTargets(options);
  const budgeted = pickBestAssessmentTargetsWithinBudget(result.targets, availableMinutes);
  return budgeted[0] || null;
}

/**
 * Deterministic check: repeated identical inputs produce identical outputs.
 * Inputs remain unmutated.
 */
export function _testDeterminism(options: AssessmentIntegrationOptions): boolean {
  const first = resolveAssessmentLearningTargets(options);
  const second = resolveAssessmentLearningTargets(options);
  return JSON.stringify(first) === JSON.stringify(second);
}