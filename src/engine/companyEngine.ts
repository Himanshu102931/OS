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
} from '../types';
import {
  calculateTopicReadiness,
  type TopicReadiness,
  type EvidenceClassification,
} from './skillsEngine';

export type CompanyRequirementStatus =
  | 'covered'
  | 'evidence_present'
  | 'developing'
  | 'gap_identified'
  | 'not_configured';

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
      [company],
      todayISO
    );
    topicReadinessMap.set(top.id, tr);
  }

  // 1. Process Required Domains
  for (const domainId of company.requiredDomains || []) {
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
  for (const topicId of company.requiredTopics || []) {
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
  for (const lang of company.requiredLanguages || []) {
    const matchingTasks = tasks.filter((t) => t.languageTags?.includes(lang.toLowerCase()));
    const completedMatchingTasks = matchingTasks.filter(
      (t) => taskProgressMap[t.id]?.state === 'completed'
    );

    const completionRate =
      matchingTasks.length > 0
        ? Math.round((completedMatchingTasks.length / matchingTasks.length) * 100)
        : 0;

    let status: CompanyRequirementStatus = 'gap_identified';
    if (matchingTasks.length === 0) {
      status = 'evidence_present'; // Language assumed integrated into DSA/domain practice
    } else if (completionRate >= 70) {
      status = 'covered';
    } else if (completedMatchingTasks.length > 0) {
      status = 'developing';
    }

    requirements.push({
      requirementId: `req-lang-${lang}`,
      requirementName: `Language Fluency: ${lang.toUpperCase()}`,
      category: 'language',
      evidenceStrength: matchingTasks.length > 0 ? completionRate : 60,
      currentLevel: matchingTasks.length > 0 ? Math.min(5, Math.floor(completionRate / 20)) : 3,
      targetLevel: 4,
      evidenceClassification: completedMatchingTasks.length > 0 ? 'demonstrated' : 'inferred',
      freshness: 'fresh',
      status,
      statusLabel: status === 'covered' ? 'Requirement Covered' : 'Evidence Present',
      supportingEvidenceCount: completedMatchingTasks.length,
      gapExplanation:
        matchingTasks.length > 0
          ? `${completedMatchingTasks.length}/${matchingTasks.length} ${lang.toUpperCase()} roadmap tasks completed.`
          : `Language ${lang.toUpperCase()} practiced through standard DSA and domain problems.`,
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
    company,
    totalRequirementsCount,
    coveredRequirementsCount,
    gapRequirementsCount,
    unconfiguredCount,
    overallPreparationStrength,
    requirements,
    topActionableGaps,
  };
}
