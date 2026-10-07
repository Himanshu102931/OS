import type {
  DomainDefinition,
  DomainId,
  Topic,
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  TopicSkillState,
  CompanyOverlay,
  EvidenceLog,
  PracticeAttempt,
  PracticeSessionDefinition,
  PreparationTopic,
  PreparationTopicProgress,
  DailyTaskAssignment,
  PlacementMode,
  Phase,
  DomainAssessmentResult,
  WeaknessSignal,
  ProjectLabSectionId,
  AssessmentState,
  SkillFreshnessState,
} from '../types';
import { calculateTopicReadiness, calculateDomainReadinessList, type TopicReadiness, type DomainReadiness } from './skillsEngine';
import { generateReviewCandidates, type ReviewCandidate } from './reviewScheduler';
import { deriveAssessmentProfileReadout } from './assessmentEngine';

/**
 * Interview Readiness Dimensions - deterministic, evidence-driven
 * Each dimension maps to canonical PlacementOS evidence sources
 */

export type ReadinessBand = 'strong' | 'developing' | 'needs_work' | 'unassessed';

export interface DimensionEvidence {
  source: 'dsa' | 'skill' | 'practice' | 'task' | 'assessment' | 'project' | 'evidence_log';
  description: string;
  strength: number; // 0-100
  freshness: 'fresh' | 'aging' | 'stale' | 'untested';
  timestamp?: string;
}

export interface ReadinessDimension {
  id: string;
  name: string;
  shortName: string;
  description: string;
  band: ReadinessBand;
  evidenceStrength: number; // 0-100
  confidence: 'high' | 'medium' | 'low' | 'none';
  freshness: 'fresh' | 'aging' | 'stale' | 'untested';
  evidenceItems: DimensionEvidence[];
  gapExplanation: string;
  recommendedAction: {
    label: string;
    route: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'project' | 'dashboard';
    targetId?: string;
    type: 'dsa' | 'task' | 'review' | 'practice' | 'project' | 'preparation' | 'none';
  };
  // Separate concerns
  capability: number; // 0-100, from actual evidence
  confidenceScore: number; // 0-100, from assessment/user
  freshnessScore: number; // 0-100, time-decay
  weaknesses: string[]; // active weakness signals
  companyRelevant: boolean;
}

export interface CompanyReadinessOverlay {
  companyId: string;
  companyName: string;
  eventDate?: string;
  dimensions: {
    dimensionId: string;
    isRequired: boolean;
    gapDescription: string;
    priority: 'critical' | 'important' | 'nice_to_have';
  }[];
  overallGap: 'none' | 'minor' | 'significant' | 'major';
}

export interface InterviewReadinessScorecard {
  dimensions: ReadinessDimension[];
  overallBand: ReadinessBand;
  overallEvidenceStrength: number; // 0-100
  overallConfidence: number; // 0-100
  overallFreshness: number; // 0-100
  activeRemediationCount: number;
  staleEvidenceCount: number;
  weakEvidenceCount: number;
  assessmentIntegration: {
    isAssessed: boolean;
    overallAbility: number;
    assessedDomainsCount: number;
    primaryFocusDomain: string | null;
    strengths: string[];
    weaknesses: string[];
    reassessmentRecommended: boolean;
  };
  projectReadiness: {
    sectionsCompleted: number;
    totalSections: number;
    evidenceDefenseSessions: number;
    lastDefenseDate?: string;
    defenseReadiness: ReadinessBand;
  };
  companyOverlay: CompanyReadinessOverlay | null;
}

/**
 * Map domain IDs to interview readiness dimensions
 */
const DOMAIN_TO_DIMENSION: Record<DomainId, string> = {
  dsa: 'coding_dsa',
  python: 'coding_dsa',
  sql: 'sql_programming',
  dbms: 'sql_programming',
  oop: 'core_cs',
  os: 'core_cs',
  cn: 'core_cs',
  aptitude: 'core_cs',
  communication: 'communication',
  interviews: 'interview_execution',
  projects: 'projects',
};

/**
 * Dimension display configuration
 */
const DIMENSION_CONFIG: Record<string, { name: string; shortName: string; description: string }> = {
  coding_dsa: {
    name: 'Coding / DSA',
    shortName: 'DSA',
    description: 'Algorithmic problem solving, data structures, complexity analysis',
  },
  core_cs: {
    name: 'Core CS Fundamentals',
    shortName: 'Core CS',
    description: 'Operating Systems, Computer Networks, OOP, DBMS, Aptitude',
  },
  sql_programming: {
    name: 'SQL / Programming Fundamentals',
    shortName: 'SQL/Prog',
    description: 'Query writing, database design, Python fundamentals',
  },
  communication: {
    name: 'Communication',
    shortName: 'Comm',
    description: 'Verbal ability, articulation, structured communication',
  },
  interview_execution: {
    name: 'Interview Execution',
    shortName: 'Interview',
    description: 'Mock interview performance, technical explanation, system design',
  },
  projects: {
    name: 'Projects / Project Lab',
    shortName: 'Projects',
    description: 'Project completion, architecture defense, code quality',
  },
};

/**
 * Calculate dimension band from scores
 */
function calculateBand(evidenceStrength: number, confidence: number, freshness: number): ReadinessBand {
  // Weighted composite: evidence 50%, confidence 25%, freshness 25%
  const composite = Math.round(0.5 * evidenceStrength + 0.25 * confidence + 0.25 * freshness);
  if (composite >= 75) return 'strong';
  if (composite >= 50) return 'developing';
  if (composite >= 25) return 'needs_work';
  return 'unassessed';
}

/**
 * Freshness score from state
 */
function freshnessToScore(freshness: 'fresh' | 'aging' | 'stale' | 'untested'): number {
  switch (freshness) {
    case 'fresh': return 100;
    case 'aging': return 70;
    case 'stale': return 40;
    case 'untested': return 0;
  }
}

/**
 * Confidence level to score
 */
function confidenceToScore(confidence: 'high' | 'medium' | 'low' | 'none'): number {
  switch (confidence) {
    case 'high': return 100;
    case 'medium': return 70;
    case 'low': return 40;
    case 'none': return 0;
  }
}

/**
 * Aggregate topic readiness into dimension readiness
 */
function aggregateDimensionFromTopics(
  dimensionId: string,
  topicReadinessList: TopicReadiness[],
  domainReadinessList: DomainReadiness[],
  skillStates: Record<string, TopicSkillState>,
  practiceAttempts: PracticeAttempt[],
  practiceSessions: PracticeSessionDefinition[],
  domainResults: DomainAssessmentResult[],
  reviewCandidates: ReviewCandidate[],
  todayStr: string
): ReadinessDimension {
  const config = DIMENSION_CONFIG[dimensionId];
  if (!config) {
    throw new Error(`Unknown dimension: ${dimensionId}`);
  }

  // Get relevant domains for this dimension
  const relevantDomainIds = Object.entries(DOMAIN_TO_DIMENSION)
    .filter(([, dim]) => dim === dimensionId)
    .map(([domainId]) => domainId);

  // Collect evidence from topic readiness
  const relevantTopics = topicReadinessList.filter(tr => relevantDomainIds.includes(tr.domainId));
  const relevantDomainReadiness = domainReadinessList.filter(dr => relevantDomainIds.includes(dr.domainId));

  // Evidence aggregation
  const evidenceItems: DimensionEvidence[] = [];
  let totalEvidenceStrength = 0;
  let totalWeight = 0;
  let maxFreshnessScore = 0;
  const weaknesses: string[] = [];

  // 1. Topic/Skill evidence
  for (const tr of relevantTopics) {
    if (tr.evidenceStrength > 0 || tr.supportingEvidence.length > 0) {
      evidenceItems.push({
        source: tr.domainId === 'dsa' ? 'dsa' : 'skill',
        description: `${tr.topicName}: ${tr.evidenceStrength}% evidence (Level ${tr.currentLevel}/${tr.targetLevel})`,
        strength: tr.evidenceStrength,
        freshness: tr.freshness,
        timestamp: tr.lastPracticedAt,
      });
      totalEvidenceStrength += tr.evidenceStrength * tr.importance;
      totalWeight += tr.importance;
      maxFreshnessScore = Math.max(maxFreshnessScore, freshnessToScore(tr.freshness));
    }

    // Collect weaknesses
    if (tr.readinessStatus === 'at_risk' || tr.readinessStatus === 'needs_baseline') {
      weaknesses.push(`${tr.topicName}: ${tr.gapExplanation}`);
    }
  }

  // 2. Practice attempt evidence — resolved against the canonical session dataset
  const relevantPracticeAttempts = practiceAttempts.filter(att => {
    const session = practiceSessions.find(s => s.id === att.sessionId);
    return session && relevantDomainIds.includes(session.domainId);
  });

  for (const att of relevantPracticeAttempts) {
    const session = practiceSessions.find(s => s.id === att.sessionId);
    if (!session) continue;

    const domainId = session.domainId;
    const sessionDim = DOMAIN_TO_DIMENSION[domainId as DomainId] || 'unknown';
    if (sessionDim !== dimensionId) continue;

    const freshness = att.completedAt ? (() => {
      const daysAgo = Math.floor((new Date(todayStr).getTime() - new Date(att.completedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo <= 7) return 'fresh';
      if (daysAgo <= 14) return 'aging';
      return 'stale';
    })() : 'untested';

    evidenceItems.push({
      source: 'practice',
      description: `${session.title}: ${att.accuracyPct}% accuracy (${att.correctCount}/${att.totalQuestions})`,
      strength: att.accuracyPct,
      freshness,
      timestamp: att.completedAt,
    });
    totalEvidenceStrength += att.accuracyPct;
    totalWeight += 1;
    maxFreshnessScore = Math.max(maxFreshnessScore, freshnessToScore(freshness));
  }

  // 3. Assessment confidence (separate from capability)
  let assessmentConfidence = 0;
  let assessmentCount = 0;
  for (const domainId of relevantDomainIds) {
    const dr = domainResults.find(d => d.domainId === domainId);
    if (dr && dr.status !== 'unassessed') {
      assessmentConfidence += confidenceToScore(dr.confidence);
      assessmentCount++;
    }
  }
  const avgAssessmentConfidence = assessmentCount > 0 ? Math.round(assessmentConfidence / assessmentCount) : 0;

  // 4. Skill state confidence (from TopicSkillState manual override)
  let skillConfidenceSum = 0;
  let skillConfidenceCount = 0;
  for (const topicId of Object.keys(skillStates)) {
    const topic = topicReadinessList.find(tr => tr.topicId === topicId);
    if (!topic || !relevantDomainIds.includes(topic.domainId)) continue;
    const skillState = skillStates[topicId];
    if (skillState?.manualOverride) {
      // Map freshness to confidence: fresh->high, aging->medium, stale->low, untested->none
      const freshnessToConfidence: Record<SkillFreshnessState, 'high' | 'medium' | 'low' | 'none'> = {
        fresh: 'high',
        aging: 'medium',
        stale: 'low',
        untested: 'none',
      };
      skillConfidenceSum += confidenceToScore(freshnessToConfidence[skillState.manualOverride.freshness]);
      skillConfidenceCount++;
    }
  }
  const avgSkillConfidence = skillConfidenceCount > 0 ? Math.round(skillConfidenceSum / skillConfidenceCount) : 0;

  // Combined confidence: assessment + skill overrides
  const combinedConfidence = assessmentCount > 0 || skillConfidenceCount > 0
    ? Math.round((avgAssessmentConfidence * assessmentCount + avgSkillConfidence * skillConfidenceCount) / (assessmentCount + skillConfidenceCount))
    : 0;

  // 5. Overall freshness
  let overallFreshness = maxFreshnessScore;
  if (overallFreshness === 0) {
    // Check if any domain has fresh evidence
    for (const dr of relevantDomainReadiness) {
      if (dr.lastActivityAt) {
        const daysAgo = Math.floor((new Date(todayStr).getTime() - new Date(dr.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 7) overallFreshness = Math.max(overallFreshness, 100);
        else if (daysAgo <= 14) overallFreshness = Math.max(overallFreshness, 70);
        else overallFreshness = Math.max(overallFreshness, 40);
      }
    }
  }

  // Calculate final scores
  const avgEvidenceStrength = totalWeight > 0 ? Math.round(totalEvidenceStrength / totalWeight) : 0;
  const confidenceScore = combinedConfidence;
  const freshnessScore = overallFreshness;

  // Determine band
  const band = calculateBand(avgEvidenceStrength, confidenceScore, freshnessScore);

  // Gap explanation
  const gapExplanation =
    band === 'strong' ? 'Well-supported by evidence across relevant topics. Maintain with periodic review.' :
    band === 'developing' ? 'Some evidence exists but gaps remain. Targeted practice on weak topics will strengthen readiness.' :
    band === 'needs_work' ? 'Limited evidence in core areas. Prioritize foundational topics and practice sessions.' :
    'No evidence recorded yet. Start with baseline assessments and introductory topics.';

  // Recommended action — select from the review candidates already computed
  // once from the real canonical state by generateInterviewReadinessScorecard().
  let recommendedAction: ReadinessDimension['recommendedAction'] = {
    label: 'Begin Baseline',
    route: 'dashboard',
    type: 'none',
  };

  const relevantCandidates = reviewCandidates.filter(c => {
    const dim = DOMAIN_TO_DIMENSION[c.domainId as DomainId];
    return dim === dimensionId;
  });

  if (relevantCandidates.length > 0) {
    const top = relevantCandidates[0];
    // Map review candidate types to action types
    const typeMap: Record<string, 'dsa' | 'task' | 'review' | 'practice' | 'project' | 'preparation' | 'none'> = {
      dsa_review: 'dsa',
      dsa_new: 'dsa',
      dsa_remediation: 'dsa',
      practice_session: 'practice',
      preparation_lesson: 'preparation',
      roadmap_task: 'task',
    };
    recommendedAction = {
      label: top.title,
      route: top.route,
      targetId: top.targetId,
      type: typeMap[top.type] || 'none',
    };
  }

  return {
    id: dimensionId,
    name: config.name,
    shortName: config.shortName,
    description: config.description,
    band,
    evidenceStrength: avgEvidenceStrength,
    confidence: combinedConfidence >= 70 ? 'high' : combinedConfidence >= 40 ? 'medium' : combinedConfidence > 0 ? 'low' : 'none',
    freshness: overallFreshness >= 70 ? 'fresh' : overallFreshness >= 40 ? 'aging' : overallFreshness > 0 ? 'stale' : 'untested',
    evidenceItems,
    gapExplanation,
    recommendedAction,
    capability: avgEvidenceStrength,
    confidenceScore,
    freshnessScore,
    weaknesses,
    companyRelevant: false, // Will be set by company overlay
  };
}

/**
 * Project Lab readiness assessment
 */
export function calculateProjectReadiness(
  practiceAttempts: PracticeAttempt[],
  evidenceLogs: EvidenceLog[]
): InterviewReadinessScorecard['projectReadiness'] {
  const sections: ProjectLabSectionId[] = [
    'overview', 'architecture', 'implementation', 'practices', 'defense', 'evidence',
  ];
  const totalSections = sections.length;

  // Same canonical rule ProjectLabView uses: section completion is claimed only
  // from recorded defense data. Reading a tab never completes a section.
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const sectionCompleted: Record<ProjectLabSectionId, boolean> = {
    overview: false,
    architecture: false,
    implementation: false,
    practices: false,
    defense: projectAttempts.some((a) => a.passed),
    evidence: projectAttempts.length > 0,
  };
  const completedSections = sections.filter((s) => sectionCompleted[s]).length;

  // Defense evidence: recorded practice_session logs on the defense topic.
  const defenseLogs = evidenceLogs.filter(
    (log) => log.topicId === 'prep-interview-career' && log.sourceType === 'practice_session'
  );

  const lastAttemptAt = projectAttempts.reduce<string | undefined>(
    (latest, a) => (!latest || a.completedAt > latest ? a.completedAt : latest),
    undefined
  );
  const lastLogAt = defenseLogs.reduce<string | undefined>(
    (latest, log) => (!latest || log.timestamp > latest ? log.timestamp : latest),
    undefined
  );
  const lastDefenseDate =
    lastAttemptAt && lastLogAt
      ? lastAttemptAt > lastLogAt
        ? lastAttemptAt
        : lastLogAt
      : (lastAttemptAt ?? lastLogAt);

  const evidenceDefenseSessions = Math.max(defenseLogs.length, projectAttempts.length);

  const defenseReadiness: ReadinessBand =
    evidenceDefenseSessions >= 3 && projectAttempts.some((a) => a.passed)
      ? 'strong'
      : evidenceDefenseSessions >= 1
      ? 'developing'
      : 'needs_work';

  return {
    sectionsCompleted: completedSections,
    totalSections,
    evidenceDefenseSessions,
    lastDefenseDate,
    defenseReadiness,
  };
}

/**
 * Company overlay for interview readiness
 */
function calculateCompanyOverlay(
  selectedCompanyId: string | undefined,
  companyOverlays: CompanyOverlay[],
  topicReadinessList: TopicReadiness[],
  _domainReadinessList: DomainReadiness[],
  todayStr: string
): CompanyReadinessOverlay | null {
  if (!selectedCompanyId) return null;

  const company = companyOverlays.find(c => c.id === selectedCompanyId);
  if (!company) return null;

  const dimensions = [
    'coding_dsa', 'core_cs', 'sql_programming',
    'communication', 'interview_execution', 'projects'
  ];

  // Build topic -> dimension map from canonical topics
  const topicToDimension: Record<string, string> = {};
  for (const tr of topicReadinessList) {
    const dim = DOMAIN_TO_DIMENSION[tr.domainId as DomainId];
    if (dim) {
      topicToDimension[tr.topicId] = dim;
    }
  }

  const companyDimensions = dimensions.map(dimId => {
    const relevantDomainIds = Object.entries(DOMAIN_TO_DIMENSION)
      .filter(([, dim]) => dim === dimId)
      .map(([domainId]) => domainId);

    // Check if company requires this dimension by resolving required topics
    const isRequired = company.requiredTopics.some((topicId: string) => {
      const topicDim = topicToDimension[topicId];
      return topicDim === dimId;
    }) || relevantDomainIds.some((domainId: string) => company.requiredDomains.includes(domainId as DomainId));

    const gapDescription = isRequired
      ? `Required for ${company.companyName} - verify evidence in ${DIMENSION_CONFIG[dimId].name}`
      : `Not specifically required but strengthens profile`;

    // Determine priority: critical if required and event is soon, important if required, nice_to_have otherwise
    let priority: 'critical' | 'important' | 'nice_to_have';
    if (isRequired) {
      if (company.eventDate) {
        const daysUntil = Math.floor((new Date(company.eventDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
        priority = daysUntil <= 30 ? 'critical' : 'important';
      } else {
        priority = 'important';
      }
    } else {
      priority = 'nice_to_have';
    }

    return {
      dimensionId: dimId,
      isRequired,
      gapDescription,
      priority,
    };
  });

  // Calculate overall gap
  const criticalGaps = dimensions.filter(d => {
    const dim = companyDimensions.find(cd => cd.dimensionId === d);
    return dim?.isRequired && dim.priority === 'critical';
  }).length;

  let overallGap: CompanyReadinessOverlay['overallGap'] = 'none';
  if (criticalGaps >= 3) overallGap = 'major';
  else if (criticalGaps >= 2) overallGap = 'significant';
  else if (criticalGaps >= 1) overallGap = 'minor';

  return {
    companyId: company.id,
    companyName: company.companyName,
    eventDate: company.eventDate,
    dimensions: companyDimensions,
    overallGap,
  };
}

/**
 * Main entry point - generates complete interview readiness scorecard
 */
export function generateInterviewReadinessScorecard(
  options: {
    // Canonical state
    tasks: TaskDefinition[];
    taskProgress: Record<string, TaskProgress>;
    dsaProblems: DSAProblem[];
    dsaProgress: Record<string, DSAProgress>;
    dsaAttempts: DSAAttempt[];
    topics: Topic[];
    domains: DomainDefinition[];
    skillStates: Record<string, TopicSkillState>;
    companyOverlays: CompanyOverlay[];
    practiceAttempts: PracticeAttempt[];
    practiceSessions: PracticeSessionDefinition[];
    preparationTopics: PreparationTopic[];
    preparationTopicProgress: Record<string, PreparationTopicProgress>;
    domainResults: DomainAssessmentResult[];
    weaknessSignals: WeaknessSignal[];
    evidenceLogs: EvidenceLog[];
    assessmentState?: AssessmentState;
    todayStr: string;
    selectedCompanyId?: string;
    currentMode?: PlacementMode;
    todayAssignments?: DailyTaskAssignment[];
    activePhase?: Phase | number;
  }
): InterviewReadinessScorecard {
  const {
    tasks,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    topics,
    domains,
    skillStates,
    companyOverlays,
    practiceAttempts,
    practiceSessions,
    preparationTopics,
    preparationTopicProgress,
    domainResults,
    weaknessSignals,
    evidenceLogs,
    assessmentState,
    todayStr,
    selectedCompanyId,
    currentMode = 'normal',
    todayAssignments = [],
    activePhase,
  } = options;

  // 1. Compute topic readiness (reuses skillsEngine)
  const topicReadinessList = topics.map(topic =>
    calculateTopicReadiness(
      topic,
      domains.find(d => d.id === topic.domainId),
      tasks,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      evidenceLogs,
      skillStates,
      companyOverlays,
      todayStr
    )
  );

  // 2. Compute domain readiness - single canonical calculation
  const domainReadinessList = calculateDomainReadinessList(domains, topics, topicReadinessList);

  // 3. Assessment profile
  const assessmentProfile = assessmentState ? deriveAssessmentProfileReadout(assessmentState) : undefined;

  // 3b. Single canonical review-candidate pass over the real persisted state.
  //      Recommended dimension actions are selected from these candidates, so
  //      every action resolves to a real existing target (no phantom IDs) and
  //      keeps reviewScheduler's prerequisite, phase-gate, company-focus and
  //      same-day-exclusion semantics intact.
  const reviewResult = generateReviewCandidates({
    tasks,
    taskProgressMap: taskProgress,
    dsaProblems,
    dsaProgressMap: dsaProgress,
    topics,
    domains,
    skillStates,
    companyOverlays,
    currentMode,
    todayStr,
    todayAssignments,
    practiceAttempts,
    practiceSessions,
    preparationTopics,
    preparationTopicProgress,
    domainResults,
    weaknessSignals,
    assessmentProfileReadout: assessmentProfile,
    activePhase,
    targetCompanyId: selectedCompanyId,
    dsaAttempts,
    evidenceLogs,
  });

  // 4. Compute all dimensions
  const dimensionIds = ['coding_dsa', 'core_cs', 'sql_programming', 'communication', 'interview_execution', 'projects'];
  const dimensions = dimensionIds.map(dimId =>
    aggregateDimensionFromTopics(
      dimId,
      topicReadinessList,
      domainReadinessList,
      skillStates,
      practiceAttempts,
      practiceSessions,
      domainResults,
      reviewResult.candidates,
      todayStr
    )
  );

  // 5. Project readiness
  const projectReadiness = calculateProjectReadiness(practiceAttempts, evidenceLogs);

  // 6. Company overlay
  const companyOverlay = calculateCompanyOverlay(
    selectedCompanyId,
    companyOverlays,
    topicReadinessList,
    domainReadinessList,
    todayStr
  );

  // Mark company-relevant dimensions
  if (companyOverlay) {
    for (const dim of dimensions) {
      const companyDim = companyOverlay.dimensions.find(cd => cd.dimensionId === dim.id);
      if (companyDim) {
        dim.companyRelevant = true;
      }
    }
  }

  // 7. Assessment integration
  const assessmentIntegration = {
    isAssessed: assessmentProfile?.isAssessed ?? false,
    overallAbility: assessmentProfile?.overallAbility ?? 0,
    assessedDomainsCount: assessmentProfile?.assessedDomainsCount ?? 0,
    primaryFocusDomain: assessmentProfile?.planInputs?.overallReadinessSummary?.primaryFocusDomain ?? null,
    strengths: assessmentProfile?.strengths.map(s => s.summary) ?? [],
    weaknesses: assessmentProfile?.weaknesses.map(w => `${w.domainId}: ${w.competency}`) ?? [],
    reassessmentRecommended: assessmentProfile?.isReassessmentRecommended ?? false,
  };

  // 8. Overall scores
  const overallEvidenceStrength = dimensions.length > 0
    ? Math.round(dimensions.reduce((sum, d) => sum + d.evidenceStrength, 0) / dimensions.length)
    : 0;
  const overallConfidence = dimensions.length > 0
    ? Math.round(dimensions.reduce((sum, d) => sum + d.confidenceScore, 0) / dimensions.length)
    : 0;
  const overallFreshness = dimensions.length > 0
    ? Math.round(dimensions.reduce((sum, d) => sum + d.freshnessScore, 0) / dimensions.length)
    : 0;

  // Count active remediation, stale evidence, weak evidence
  // activeRemediationCount: DSA remediationRequired + assessment weakness signals + skill remediation
  const activeRemediationCount = dsaProblems.filter(p => dsaProgress[p.id]?.remediationRequired).length
    + weaknessSignals.filter(w => w.status === 'open').length
    + Object.values(skillStates).filter(s => s.evidenceStrength < 40).length;

  const staleEvidenceCount = dimensions.filter(d => d.freshness === 'stale').length;
  const weakEvidenceCount = dimensions.filter(d => d.evidenceStrength < 40).length;

  // Overall band
  const overallBand = calculateBand(overallEvidenceStrength, overallConfidence, overallFreshness);

  return {
    dimensions,
    overallBand,
    overallEvidenceStrength,
    overallConfidence,
    overallFreshness,
    activeRemediationCount,
    staleEvidenceCount,
    weakEvidenceCount,
    assessmentIntegration,
    projectReadiness,
    companyOverlay,
  };
}
