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
  DomainId,
  SkillFreshnessState,
} from '../types';
import {
  calculateTopicReadiness,
  type TopicReadiness,
  type EvidenceClassification,
} from './skillsEngine';

type CompanyRequirementStatus =
  | 'covered'
  | 'evidence_present'
  | 'developing'
  | 'gap_identified'
  | 'not_configured';

const COMPANY_REQUIREMENT_STATUS_LABELS: Record<CompanyRequirementStatus, string> = {
  covered: 'Requirement Covered',
  evidence_present: 'Evidence Present',
  developing: 'Developing',
  gap_identified: 'Gap Identified',
  not_configured: 'Not Configured',
};

/**
 * Freshness of language evidence, derived from the real last completion
 * timestamp of a task tagged with that language. Uses the same 7 / 14 day
 * thresholds as `skillsEngine.calculateTopicReadiness`; it never asserts
 * 'fresh' without an actual completion behind it.
 */
function calculateLanguageFreshness(
  lastCompletedAtISO: string | undefined,
  todayISO: string
): SkillFreshnessState {
  if (!lastCompletedAtISO) return 'untested';

  const last = new Date(lastCompletedAtISO.slice(0, 10)).getTime();
  const today = new Date(todayISO.slice(0, 10)).getTime();
  if (!Number.isFinite(last) || !Number.isFinite(today)) return 'untested';

  const daysAgo = Math.floor((today - last) / 86_400_000);
  if (daysAgo <= 7) return 'fresh';
  if (daysAgo <= 14) return 'aging';
  return 'stale';
}

export interface CompanyRequirementMapping {
  requirementId: string;
  requirementName: string;
  category: 'domain' | 'topic' | 'language';
  domainId?: DomainId;
  topicId?: string;

  // Real underlying evidence from skillsEngine
  evidenceStrength: number; // 0 - 100%
  currentLevel: number; // 0 - 5
  targetLevel: number; // 0 - 5
  evidenceClassification: EvidenceClassification;
  freshness: string;

  status: CompanyRequirementStatus;
  statusLabel: string;
  supportingEvidenceCount: number;
  gapExplanation: string;

  recommendedAction: {
    label: string;
    route: 'dsa' | 'roadmap' | 'skills' | 'dashboard';
    targetId?: string;
    type: 'dsa' | 'task' | 'review';
  };
}

export interface CompanyPreparationSnapshot {
  company: CompanyOverlay;
  totalRequirementsCount: number;
  coveredRequirementsCount: number;
  gapRequirementsCount: number;
  unconfiguredCount: number;

  overallPreparationStrength: number; // 0 - 100%
  requirements: CompanyRequirementMapping[];
  topActionableGaps: CompanyRequirementMapping[];
}

/**
 * Calculates date difference in days (eventDate - today).
 */
export function getDaysUntilEvent(eventDateISO?: string, todayISO?: string): number | null {
  if (!eventDateISO || !todayISO) return null;
  const target = new Date(eventDateISO.slice(0, 10));
  const today = new Date(todayISO.slice(0, 10));
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates factual preparation snapshot for a target company overlay.
 */
export function calculateCompanySnapshot(
  company: CompanyOverlay,
  domains: DomainDefinition[],
  topics: Topic[],
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  dsaAttempts: DSAAttempt[],
  evidenceLogs: EvidenceLog[],
  skillStates: Record<string, TopicSkillState>,
  todayISO: string
): CompanyPreparationSnapshot {
  const requirements: CompanyRequirementMapping[] = [];

  /**
   * C4-03 — normalise the requirement lists once, up front.
   *
   * `requiredDomains` / `requiredTopics` / `requiredLanguages` are required by
   * the type, but a record written by an older build or a hand-edited import
   * may arrive without them. Absent must mean "no mapped requirements", never a
   * crash and never an invented default — so coerce to an empty list before
   * anything downstream (including skillsEngine's target-company matching)
   * reads them.
   */
  const overlay: CompanyOverlay = {
    ...company,
    requiredDomains: company.requiredDomains ?? [],
    requiredTopics: company.requiredTopics ?? [],
    requiredLanguages: company.requiredLanguages ?? [],
  };

  // Compute readiness for all topics using skillsEngine
  const topicReadinessMap = new Map<string, TopicReadiness>();
  for (const top of topics) {
    const dom = domains.find((d) => d.id === top.domainId);
    const tr = calculateTopicReadiness(
      top,
      dom,
      tasks,
      taskProgressMap,
      dsaProblems,
      dsaProgressMap,
      dsaAttempts,
      evidenceLogs,
      skillStates,
      [overlay],
      todayISO
    );
    topicReadinessMap.set(top.id, tr);
  }

  // 1. Process Required Domains
  for (const domainId of overlay.requiredDomains) {
    const dom = domains.find((d) => d.id === domainId);
    const domainTopics = topics.filter((t) => t.domainId === domainId);
    const domTopicReadiness = domainTopics
      .map((t) => topicReadinessMap.get(t.id))
      .filter((tr): tr is TopicReadiness => Boolean(tr));

    if (domTopicReadiness.length === 0) {
      requirements.push({
        requirementId: `req-dom-${domainId}`,
        requirementName: dom ? dom.name : domainId.toUpperCase(),
        category: 'domain',
        domainId,
        evidenceStrength: 0,
        currentLevel: 0,
        targetLevel: 4,
        evidenceClassification: 'insufficient',
        freshness: 'untested',
        status: 'not_configured',
        statusLabel: 'Not Configured',
        supportingEvidenceCount: 0,
        gapExplanation: `Domain ${dom?.shortName || domainId} has no configured curriculum topics in baseline.`,
        recommendedAction: {
          label: `Start ${dom?.shortName || domainId} Tasks`,
          route: 'roadmap',
          type: 'task',
        },
      });
      continue;
    }

    const avgStrength = Math.round(
      domTopicReadiness.reduce((sum, tr) => sum + tr.evidenceStrength, 0) / domTopicReadiness.length
    );
    const totalEvidenceCount = domTopicReadiness.reduce(
      (sum, tr) => sum + tr.supportingEvidence.length,
      0
    );

    let status: CompanyRequirementStatus;
    let statusLabel: string;
    if (avgStrength >= 70) {
      status = 'covered';
      statusLabel = 'Requirement Covered';
    } else if (avgStrength >= 45) {
      status = 'evidence_present';
      statusLabel = 'Evidence Present';
    } else if (totalEvidenceCount > 0) {
      status = 'developing';
      statusLabel = 'Developing';
    } else {
      status = 'gap_identified';
      statusLabel = 'Gap Identified';
    }

    const bestTopic = domTopicReadiness.sort((a, b) => a.evidenceStrength - b.evidenceStrength)[0];

    requirements.push({
      requirementId: `req-dom-${domainId}`,
      requirementName: dom ? `${dom.name} (${dom.shortName})` : domainId.toUpperCase(),
      category: 'domain',
      domainId,
      evidenceStrength: avgStrength,
      currentLevel: Math.min(5, Math.floor(avgStrength / 20)),
      targetLevel: 4,
      evidenceClassification:
        totalEvidenceCount > 0
          ? domTopicReadiness.some((tr) => tr.evidenceClassification === 'demonstrated')
            ? 'demonstrated'
            : 'inferred'
          : 'insufficient',
      freshness: bestTopic?.freshness || 'untested',
      status,
      statusLabel,
      supportingEvidenceCount: totalEvidenceCount,
      gapExplanation:
        status === 'covered'
          ? `Target requirement met with ${avgStrength}% evidence strength across ${dom?.shortName} topics.`
          : `Current evidence strength is ${avgStrength}%. Target level is 4 (70%). ${bestTopic ? bestTopic.gapExplanation : ''}`,
      recommendedAction: bestTopic?.recommendedAction || {
        label: `Review ${dom?.shortName || domainId}`,
        route: 'roadmap',
        type: 'task',
      },
    });
  }

  // 2. Process Explicit Required Topics
  for (const topicId of overlay.requiredTopics) {
    const tr = topicReadinessMap.get(topicId);
    if (!tr) continue;

    let status: CompanyRequirementStatus;
    let statusLabel: string;
    if (tr.evidenceStrength >= 75 && tr.freshness !== 'stale') {
      status = 'covered';
      statusLabel = 'Requirement Covered';
    } else if (tr.evidenceStrength >= 45) {
      status = 'evidence_present';
      statusLabel = 'Evidence Present';
    } else if (tr.supportingEvidence.length > 0) {
      status = 'developing';
      statusLabel = 'Developing';
    } else {
      status = 'gap_identified';
      statusLabel = 'Gap Identified';
    }

    requirements.push({
      requirementId: `req-top-${topicId}`,
      requirementName: tr.topicName,
      category: 'topic',
      domainId: tr.domainId,
      topicId: tr.topicId,
      evidenceStrength: tr.evidenceStrength,
      currentLevel: tr.currentLevel,
      targetLevel: Math.max(4, tr.targetLevel),
      evidenceClassification: tr.evidenceClassification,
      freshness: tr.freshness,
      status,
      statusLabel,
      supportingEvidenceCount: tr.supportingEvidence.length,
      gapExplanation: tr.gapExplanation,
      recommendedAction: tr.recommendedAction,
    });
  }

  // 3. Process Required Languages
  //
  // The ONLY real evidence a language has is roadmap work tagged with it that
  // was actually completed. Nothing else may be inferred:
  //   - no tagged task  → nothing to measure, so report a not_configured
  //                        baseline (0 / untested / insufficient) instead of
  //                        the previous hardcoded 60% + 'fresh' + 'Evidence
  //                        Present' guess that fabricated a satisfied card.
  //   - tagged task     → completion rate against those tasks, freshness
  //                        derived from the real last completion timestamp.
  for (const lang of overlay.requiredLanguages) {
    const matchingTasks = tasks.filter((t) => t.languageTags?.includes(lang.toLowerCase()));
    const completedMatchingTasks = matchingTasks.filter(
      (t) => taskProgressMap[t.id]?.state === 'completed'
    );

    const hasEvidence = matchingTasks.length > 0;

    if (!hasEvidence) {
      requirements.push({
        requirementId: `req-lang-${lang}`,
        requirementName: `Language Fluency: ${lang.toUpperCase()}`,
        category: 'language',
        evidenceStrength: 0,
        currentLevel: 0,
        targetLevel: 4,
        evidenceClassification: 'insufficient',
        freshness: 'untested',
        status: 'not_configured',
        statusLabel: COMPANY_REQUIREMENT_STATUS_LABELS.not_configured,
        supportingEvidenceCount: 0,
        gapExplanation: `No roadmap tasks are tagged with ${lang.toUpperCase()}, so no language evidence exists yet.`,
        recommendedAction: {
          label: `Practice ${lang.toUpperCase()} Tasks`,
          route: 'roadmap',
          type: 'task',
        },
      });
      continue;
    }

    const completionRate = Math.round(
      (completedMatchingTasks.length / matchingTasks.length) * 100
    );

    const lastCompletionISO = completedMatchingTasks
      .map((t) => taskProgressMap[t.id]?.lastCompletedAt)
      .filter((iso): iso is string => Boolean(iso))
      .sort()
      .pop();

    let status: CompanyRequirementStatus;
    if (completionRate >= 70) {
      status = 'covered';
    } else if (completionRate >= 45) {
      status = 'evidence_present';
    } else if (completedMatchingTasks.length > 0) {
      status = 'developing';
    } else {
      status = 'gap_identified';
    }

    requirements.push({
      requirementId: `req-lang-${lang}`,
      requirementName: `Language Fluency: ${lang.toUpperCase()}`,
      category: 'language',
      evidenceStrength: completionRate,
      currentLevel: Math.min(5, Math.floor(completionRate / 20)),
      targetLevel: 4,
      evidenceClassification:
        completedMatchingTasks.length > 0 ? 'demonstrated' : 'insufficient',
      freshness: calculateLanguageFreshness(lastCompletionISO, todayISO),
      status,
      statusLabel: COMPANY_REQUIREMENT_STATUS_LABELS[status],
      supportingEvidenceCount: completedMatchingTasks.length,
      gapExplanation: `${completedMatchingTasks.length}/${matchingTasks.length} ${lang.toUpperCase()} roadmap tasks completed.`,
      recommendedAction: {
        label: `Practice ${lang.toUpperCase()} Tasks`,
        route: 'roadmap',
        type: 'task',
      },
    });
  }

  // Aggregate Metrics
  const totalRequirementsCount = requirements.length;
  const coveredRequirementsCount = requirements.filter((r) => r.status === 'covered').length;
  const gapRequirementsCount = requirements.filter(
    (r) => r.status === 'gap_identified' || r.status === 'developing'
  ).length;
  const unconfiguredCount = requirements.filter((r) => r.status === 'not_configured').length;

  const overallPreparationStrength =
    totalRequirementsCount > 0
      ? Math.round(
          requirements.reduce((sum, r) => sum + r.evidenceStrength, 0) / totalRequirementsCount
        )
      : 0;

  const topActionableGaps = requirements
    .filter((r) => r.status !== 'covered')
    .sort((a, b) => a.evidenceStrength - b.evidenceStrength);

  return {
    company: overlay,
    totalRequirementsCount,
    coveredRequirementsCount,
    gapRequirementsCount,
    unconfiguredCount,
    overallPreparationStrength,
    requirements,
    topActionableGaps,
  };
}
