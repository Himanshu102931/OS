/**
 * Canonical Weakness Router Facade
 *
 * Re-exports from the canonical remediationRouter engine to maintain complete
 * backward compatibility with existing tests and subsystem integrations while
 * centralizing all remediation and closed-loop routing logic in remediationRouter.
 */
import type { ReviewCandidate } from './reviewScheduler';
import {
  DOMAIN_TO_PREP_TOPIC,
  PROJECT_DEFENSE_PREP_TOPIC_ID,
  resolvePhaseNumber,
  getTaskPhaseNumber,
  remediationRouteToReviewCandidate,
  resolvePracticeRemediation,
  resolveDsaRemediation,
  resolveAssessmentRemediation,
  resolveTopicContinuationAction,
  resolvePreparationContinuation,
  resolveDefenseRemediationRoute,
  resolveProjectDefenseRemediation,
  resolveSkillRemediation,
  resolveAllRemediationRoutes,
  routeRemediationCandidates,
  type RemediationRoutingOptions,
  type RemediationRoute,
  type RemediationSourceType,
  type TopicContinuationContext,
} from './remediationRouter';

export type WeaknessRoutingOptions = RemediationRoutingOptions;
export type { RemediationRoute, RemediationSourceType, TopicContinuationContext };

export {
  DOMAIN_TO_PREP_TOPIC,
  PROJECT_DEFENSE_PREP_TOPIC_ID,
  resolvePhaseNumber,
  getTaskPhaseNumber,
  remediationRouteToReviewCandidate,
  resolvePracticeRemediation,
  resolveDsaRemediation,
  resolveAssessmentRemediation,
  resolveTopicContinuationAction,
  resolvePreparationContinuation,
  resolveDefenseRemediationRoute,
  resolveProjectDefenseRemediation,
  resolveSkillRemediation,
  resolveAllRemediationRoutes,
  routeRemediationCandidates,
};

/**
 * 1. PRACTICE WEAKNESS ROUTING (ReviewCandidate adapter)
 */
export function routePracticeWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  return resolvePracticeRemediation(options).map(remediationRouteToReviewCandidate);
}

/**
 * 2. DSA REMEDIATION & PATTERN LESSON ROUTING (ReviewCandidate adapter)
 */
export function routeDsaRemediationConcepts(options: WeaknessRoutingOptions): ReviewCandidate[] {
  return resolveDsaRemediation(options).map(remediationRouteToReviewCandidate);
}

/**
 * 3. ASSESSMENT WEAKNESS ROUTING (ReviewCandidate adapter)
 */
export function routeAssessmentWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  return resolveAssessmentRemediation(options).map(remediationRouteToReviewCandidate);
}

/**
 * 4. CANONICAL SKILLS WEAKNESS ROUTING (ReviewCandidate adapter)
 */
export function routeSkillWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  return resolveSkillRemediation(options).map(remediationRouteToReviewCandidate);
}

/**
 * Master weakness routing orchestrator (ReviewCandidate adapter).
 * Delegates to routeRemediationCandidates.
 */
export function routeWeaknessSignals(options: WeaknessRoutingOptions): ReviewCandidate[] {
  return routeRemediationCandidates(options);
}
