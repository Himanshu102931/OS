import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  PlacementMode,
  DailyTaskAssignment,
  Topic,
  DomainDefinition,
  Phase,
  PracticeAttempt,
  PracticeSessionDefinition,
  PreparationTopic,
  PreparationTopicProgress,
  DomainAssessmentResult,
  WeaknessSignal,
} from '../types';
import { getEvaluatedCandidates } from './adaptiveEngine';
import { evaluateTaskPrerequisites } from './taskStateEngine';
import { type ReviewPrompt } from './analyticsEngine';
import type { AssessmentProfileReadout } from './assessmentEngine';
import { routeWeaknessSignals } from './weaknessRouter';

export type ReviewPriority =
  | 'remediation'      // Active remediation required (highest)
  | 'overdue_review'   // Due/overdue Leitner reviews
  | 'routed_weakness'  // Routed weakness signals (practice, assessment, DSA concept, skills)
  | 'stale_evidence'   // Stale or weakening evidence (>14 days)
  | 'weak_topic'       // High-value weak topics/patterns
  | 'retention'        // Retention reviews approaching due date
  | 'normal_progression'; // Normal curriculum progression

export interface ReviewCandidate {
  id: string;
  type: 'dsa_review' | 'dsa_remediation' | 'dsa_new' | 'roadmap_task' | 'preparation_lesson' | 'practice_session';
  title: string;
  description: string;
  priority: ReviewPriority;
  priorityScore: number; // 0-100 for sorting within priority tier
  domainId: string;
  topicId: string;
  estimatedMinutes: number;
  reason: string;
  route: 'dsa' | 'roadmap' | 'preparation' | 'practice' | 'dashboard';
  targetId: string;
  // Source references for traceability
  sourceProblemId?: string;
  sourceTaskId?: string;
  sourceTopicId?: string;
  sourceSkillState?: TopicSkillState;
  // Prerequisites check
  isBlocked: boolean;
  blockingReason?: string;
}

export interface ReviewSchedulerOptions {
  tasks: TaskDefinition[];
  taskProgressMap: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgressMap: Record<string, DSAProgress>;
  topics: Topic[];
  domains: DomainDefinition[];
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  currentMode: PlacementMode;
  todayStr: string;
  todayAssignments: DailyTaskAssignment[];
  // Optional analytics review prompts to consume as signals
  // These are produced by analyticsEngine.evaluateAnalyticsTelemetry()
  // The scheduler uses them as validation/boost signals, not as a second scheduling definition
  analyticsReviewPrompts?: ReviewPrompt[];
  // Optional weakness routing inputs
  practiceAttempts?: PracticeAttempt[];
  practiceSessions?: PracticeSessionDefinition[];
  preparationTopics?: PreparationTopic[];
  preparationTopicProgress?: Record<string, PreparationTopicProgress>;
  domainResults?: DomainAssessmentResult[];
  weaknessSignals?: WeaknessSignal[];
  assessmentProfileReadout?: AssessmentProfileReadout;
  activePhase?: Phase | number;
}

export interface ReviewSchedulerResult {
  candidates: ReviewCandidate[];
  totalReviewObligations: number;
  hasRemediation: boolean;
  hasOverdueReviews: boolean;
  hasRoutedWeakness: boolean;
  debugInfo?: {
    remediationCount: number;
    overdueReviewCount: number;
    routedWeaknessCount: number;
    staleTopicCount: number;
    weakTopicCount: number;
    retentionCount: number;
    normalProgressionCount: number;
  };
}

/**
 * Deterministic review scheduler that produces prioritized review candidates
 * from existing persisted state without inventing a second scheduling system.
 * Reuses existing deterministic scoring, evidence, review dates, remediation state,
 * phase constraints, company relevance, and task prerequisite logic.
 */
export function generateReviewCandidates(options: ReviewSchedulerOptions): ReviewSchedulerResult {
  const {
    tasks,
    taskProgressMap,
    dsaProblems,
    dsaProgressMap,
    topics,
    domains,
    skillStates,
    companyOverlays,
    currentMode,
    todayStr,
    todayAssignments,
    analyticsReviewPrompts = [],
  } = options;

  const candidates: ReviewCandidate[] = [];
  const todayAssignmentsSet = new Set(todayAssignments.map(a => a.referenceId));
  const completedTasksToday = new Set(
    todayAssignments
      .filter(a => a.completed)
      .map(a => a.referenceId)
  );

  // Build a set of analytics prompt target IDs for quick lookup
  // These prompts are consumed as validation/boost signals, not as a second scheduling definition
  const analyticsPromptTargetIds = new Set(analyticsReviewPrompts.map(p => p.targetId).filter(Boolean));

  // --- 1. ACTIVE REMEDIATION (highest priority) ---
  const remediationCandidates = generateRemediationCandidates(
    dsaProblems, dsaProgressMap, topics, domains
  );
  candidates.push(...remediationCandidates);

  // --- 2. OVERDUE/DUE LEITNER REVIEWS ---
  const overdueReviewCandidates = generateOverdueReviewCandidates(
    dsaProblems, dsaProgressMap, topics, domains, todayStr
  );
  candidates.push(...overdueReviewCandidates);

  // --- 3. ROUTED WEAKNESS SIGNALS ---
  const routedWeaknessCandidates = routeWeaknessSignals({
    practiceAttempts: options.practiceAttempts,
    practiceSessions: options.practiceSessions,
    dsaProblems,
    dsaProgressMap,
    tasks,
    taskProgressMap,
    topics,
    domains,
    skillStates,
    preparationTopics: options.preparationTopics,
    preparationTopicProgress: options.preparationTopicProgress,
    domainResults: options.domainResults,
    weaknessSignals: options.weaknessSignals,
    assessmentProfileReadout: options.assessmentProfileReadout,
    activePhase: options.activePhase,
    todayStr,
    committedTargetIds: todayAssignmentsSet,
  });
  candidates.push(...routedWeaknessCandidates);

  // --- 4. STALE/WEAKENING EVIDENCE ---
  const staleEvidenceCandidates = generateStaleEvidenceCandidates(
    topics, domains, skillStates, dsaProblems, dsaProgressMap,
    tasks, taskProgressMap
  );
  candidates.push(...staleEvidenceCandidates);

  // --- 5. HIGH-VALUE WEAK TOPICS/PATTERNS ---
  const weakTopicCandidates = generateWeakTopicCandidates(
    topics, domains, skillStates, dsaProblems, dsaProgressMap,
    tasks, taskProgressMap, companyOverlays
  );
  candidates.push(...weakTopicCandidates);

  // --- 6. RETENTION REVIEWS APPROACHING DUE DATE ---
  const retentionCandidates = generateRetentionCandidates(
    dsaProblems, dsaProgressMap, topics, domains, todayStr
  );
  candidates.push(...retentionCandidates);

  // --- 7. NORMAL PROGRESSION (via existing adaptive engine) ---
  const progressionCandidates = generateNormalProgressionCandidates(
    tasks, taskProgressMap, dsaProblems, dsaProgressMap,
    skillStates, companyOverlays, currentMode, todayStr, todayAssignmentsSet
  );
  candidates.push(...progressionCandidates);

  // Filter out already committed/completed for today
  const filteredCandidates = candidates.filter(c => {
    if (todayAssignmentsSet.has(c.targetId)) return false;
    if (completedTasksToday.has(c.targetId)) return false;
    return true;
  });

  // Apply analytics prompt validation/boost
  // Analytics prompts are consumed as validation signals: if a candidate matches
  // an analytics review prompt target, it gets a small priorityScore boost within its tier
  // This consumes analytics output without creating a second scheduling definition
  const boostedCandidates = filteredCandidates.map(c => {
    const analyticsBoost = analyticsPromptTargetIds.has(c.targetId) ? 5 : 0;
    return { ...c, priorityScore: Math.min(100, c.priorityScore + analyticsBoost) };
  });

  // Filter out blocked candidates (prerequisites not met)
  const unblockedCandidates = boostedCandidates.filter(c => !c.isBlocked);

  // Deterministic sort: priority tier -> priorityScore desc -> targetId asc
  const priorityOrder: ReviewPriority[] = [
    'remediation',
    'overdue_review',
    'routed_weakness',
    'stale_evidence',
    'weak_topic',
    'retention',
    'normal_progression',
  ];

  unblockedCandidates.sort((a, b) => {
    const tierA = priorityOrder.indexOf(a.priority);
    const tierB = priorityOrder.indexOf(b.priority);
    if (tierA !== tierB) return tierA - tierB;
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.targetId.localeCompare(b.targetId);
  });

  // Deduplicate by targetId across tiers — higher-priority candidate wins
  const seenTargets = new Set<string>();
  const deduplicatedCandidates: ReviewCandidate[] = [];
  for (const candidate of unblockedCandidates) {
    if (!seenTargets.has(candidate.targetId)) {
      seenTargets.add(candidate.targetId);
      deduplicatedCandidates.push(candidate);
    }
  }

  return {
    candidates: deduplicatedCandidates,
    totalReviewObligations: deduplicatedCandidates.filter(c =>
      c.priority !== 'normal_progression'
    ).length,
    hasRemediation: remediationCandidates.length > 0,
    hasOverdueReviews: overdueReviewCandidates.length > 0,
    hasRoutedWeakness: routedWeaknessCandidates.length > 0,
    debugInfo: {
      remediationCount: remediationCandidates.length,
      overdueReviewCount: overdueReviewCandidates.length,
      routedWeaknessCount: routedWeaknessCandidates.length,
      staleTopicCount: staleEvidenceCandidates.length,
      weakTopicCount: weakTopicCandidates.length,
      retentionCount: retentionCandidates.length,
      normalProgressionCount: progressionCandidates.length,
    },
  };
}

// --- Helper Functions ---

function generateRemediationCandidates(
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  topics: Topic[],
  domains: DomainDefinition[]
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const prob of dsaProblems) {
    const prog = dsaProgressMap[prob.id];
    if (!prog?.remediationRequired) continue;

    const topic = topics.find(t => t.id === prob.topicId);
    const domain = domains.find(d => d.id === prob.domainId);
    if (!topic || !domain) continue;

    const unlockStatus = isProblemUnlockedForRemediation(prob, dsaProgressMap);
    if (!unlockStatus.isUnlocked) continue;

    candidates.push({
      id: `review-remediation-${prob.id}`,
      type: 'dsa_remediation',
      title: `Remediation: ${prob.title}`,
      description: `Review pattern lesson and pass self-check quiz for ${domain.shortName}: ${prob.title}`,
      priority: 'remediation',
      priorityScore: 100, // Highest within tier
      domainId: prob.domainId,
      topicId: prob.topicId,
      estimatedMinutes: Math.max(15, prob.estimatedTimeMinutes || 15),
      reason: 'Active remediation required: 3+ consecutive failures on this pattern',
      route: 'dsa',
      targetId: prob.id,
      sourceProblemId: prob.id,
      sourceTopicId: topic.id,
      isBlocked: false,
    });
  }
  return candidates;
}

function isProblemUnlockedForRemediation(
  problem: DSAProblem,
  progressMap: Record<string, DSAProgress>
): { isUnlocked: boolean } {
  // Remediation problems are always actionable regardless of phase lock
  if (!problem.prerequisites || problem.prerequisites.length === 0) {
    return { isUnlocked: true };
  }
  for (const prereqId of problem.prerequisites) {
    const prereqProg = progressMap[prereqId];
    if (!prereqProg) return { isUnlocked: false };
    const isSatisfied = prereqProg.passedIndependently ||
                        prereqProg.assistedProvisional ||
                        (prereqProg.currentBox && prereqProg.currentBox >= 2);
    if (!isSatisfied) return { isUnlocked: false };
  }
  return { isUnlocked: true };
}

function generateOverdueReviewCandidates(
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  topics: Topic[],
  domains: DomainDefinition[],
  todayStr: string
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const prob of dsaProblems) {
    const prog = dsaProgressMap[prob.id];
    if (!prog?.nextReviewAt) continue;
    if (prog.nextReviewAt > todayStr) continue; // Not yet due

    const topic = topics.find(t => t.id === prob.topicId);
    const domain = domains.find(d => d.id === prob.domainId);
    if (!topic || !domain) continue;

    const unlockStatus = isProblemUnlockedForRemediation(prob, dsaProgressMap);
    if (!unlockStatus.isUnlocked) continue;

    const daysOverdue = daysBetween(prog.nextReviewAt, todayStr);
    const priorityScore = Math.min(100, 80 + daysOverdue * 2); // More overdue = higher

    candidates.push({
      id: `review-overdue-${prob.id}`,
      type: 'dsa_review',
      title: `Review: ${prob.title}`,
      description: `Leitner Box ${prog.currentBox} review${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ' (due today)'}`,
      priority: 'overdue_review',
      priorityScore,
      domainId: prob.domainId,
      topicId: prob.topicId,
      estimatedMinutes: Math.max(10, (prob.estimatedTimeMinutes || 15) / 2),
      reason: `${daysOverdue > 0 ? 'Overdue' : 'Due'} spaced repetition review in Leitner system`,
      route: 'dsa',
      targetId: prob.id,
      sourceProblemId: prob.id,
      sourceTopicId: topic.id,
      isBlocked: false,
    });
  }
  return candidates;
}

function generateStaleEvidenceCandidates(
  topics: Topic[],
  domains: DomainDefinition[],
  skillStates: Record<string, TopicSkillState>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const topic of topics) {
    const skill = skillStates[topic.id];
    if (!skill || skill.freshness !== 'stale') continue;
    if (skill.evidenceStrength >= 60) continue; // Only surface if evidence is actually weak

    const domain = domains.find(d => d.id === topic.domainId);
    if (!domain) continue;

    // Check if there's an existing DSA problem for this topic that needs review
    const topicDsaProblems = dsaProblems.filter(p => p.topicId === topic.id);
    let bestDsaCandidate: DSAProblem | null = null;
    let bestScore = 0;

    for (const prob of topicDsaProblems) {
      const prog = dsaProgressMap[prob.id];
      if (!prog) continue;
      // Prefer problems with weaker evidence for stale evidence review
      const unlockStatus = isProblemUnlockedForRemediation(prob, dsaProgressMap);
      if (!unlockStatus.isUnlocked) continue;
      // Weaker evidence = higher priority for stale evidence review
      const score = 100 - (prog.evidenceStrength || 0) * 100;
      if (score > bestScore) {
        bestScore = score;
        bestDsaCandidate = prob;
      }
    }

    if (bestDsaCandidate) {
      candidates.push({
        id: `review-stale-dsa-${bestDsaCandidate.id}`,
        type: 'dsa_review',
        title: `Review: ${bestDsaCandidate.title}`,
        description: `Stale evidence in ${domain.shortName}: ${topic.name} (${Math.round(skill.evidenceStrength)}% strength, ${skill.freshness})`,
        priority: 'stale_evidence',
        priorityScore: Math.round(100 - skill.evidenceStrength),
        domainId: topic.domainId,
        topicId: topic.id,
        estimatedMinutes: Math.max(10, (bestDsaCandidate.estimatedTimeMinutes || 15) / 2),
        reason: `No practice evidence for >14 days; strength degraded to ${Math.round(skill.evidenceStrength)}%`,
        route: 'dsa',
        targetId: bestDsaCandidate.id,
        sourceProblemId: bestDsaCandidate.id,
        sourceTopicId: topic.id,
        sourceSkillState: skill,
        isBlocked: false,
      });
    } else {
      // No DSA problem, fall back to roadmap task
      const topicTasks = tasks.filter(t => t.topicId === topic.id);
      const nextTask = topicTasks.find(t => {
        const prog = taskProgressMap[t.id];
        return !prog || prog.state !== 'completed';
      });
      if (nextTask) {
        candidates.push({
          id: `review-stale-task-${nextTask.id}`,
          type: 'roadmap_task',
          title: `Review: ${nextTask.title}`,
          description: `Stale evidence in ${domain.shortName}: ${topic.name}`,
          priority: 'stale_evidence',
          priorityScore: Math.round(100 - skill.evidenceStrength),
          domainId: topic.domainId,
          topicId: topic.id,
          estimatedMinutes: nextTask.estimatedMinutes,
          reason: `No practice evidence for >14 days; strength degraded to ${Math.round(skill.evidenceStrength)}%`,
          route: 'roadmap',
          targetId: nextTask.id,
          sourceTaskId: nextTask.id,
          sourceTopicId: topic.id,
          sourceSkillState: skill,
          isBlocked: evaluateTaskPrerequisites(nextTask, taskProgressMap).isBlocked,
          blockingReason: evaluateTaskPrerequisites(nextTask, taskProgressMap).unmetPrerequisiteIds.join(', '),
        });
      }
    }
  }
  return candidates;
}

function generateWeakTopicCandidates(
  topics: Topic[],
  domains: DomainDefinition[],
  skillStates: Record<string, TopicSkillState>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  companyOverlays: CompanyOverlay[]
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const topic of topics) {
    const skill = skillStates[topic.id];
    if (!skill) continue;

    // Weak topic: evidence strength < 40% but not stale (stale handled above)
    if (skill.freshness === 'stale') continue;
    if (skill.evidenceStrength >= 40) continue;

    const domain = domains.find(d => d.id === topic.domainId);
    if (!domain) continue;

    // Check company relevance boost
    const companyBoost = getCompanyRelevanceBoost(topic, domain, companyOverlays);

    // Prefer DSA problems for weak topics
    const topicDsaProblems = dsaProblems.filter(p => p.topicId === topic.id);
    let bestDsaCandidate: DSAProblem | null = null;
    let bestScore = 0;

    for (const prob of topicDsaProblems) {
      const prog = dsaProgressMap[prob.id];
      if (!prog || prog.remediationRequired) continue;
      const unlockStatus = isProblemUnlockedForRemediation(prob, dsaProgressMap);
      if (!unlockStatus.isUnlocked) continue;
      const dsaEvidenceScore = prog.evidenceStrength !== undefined
        ? 100 - prog.evidenceStrength * 100
        : 50;
      const score = companyBoost + dsaEvidenceScore;
      if (score > bestScore) {
        bestScore = score;
        bestDsaCandidate = prob;
      }
    }

    if (bestDsaCandidate) {
      candidates.push({
        id: `review-weak-dsa-${bestDsaCandidate.id}`,
        type: 'dsa_review',
        title: `Strengthen: ${bestDsaCandidate.title}`,
        description: `Weak topic in ${domain.shortName}: ${topic.name} (${Math.round(skill.evidenceStrength)}% evidence)`,
        priority: 'weak_topic',
        priorityScore: Math.min(100, Math.round(bestScore)),
        domainId: topic.domainId,
        topicId: topic.id,
        estimatedMinutes: Math.max(10, (bestDsaCandidate.estimatedTimeMinutes || 15) / 2),
        reason: `Evidence strength below threshold (${Math.round(skill.evidenceStrength)}%)`,
        route: 'dsa',
        targetId: bestDsaCandidate.id,
        sourceProblemId: bestDsaCandidate.id,
        sourceTopicId: topic.id,
        sourceSkillState: skill,
        isBlocked: false,
      });
    } else {
      // Fall back to roadmap task
      const topicTasks = tasks.filter(t => t.topicId === topic.id);
      const nextTask = topicTasks.find(t => {
        const prog = taskProgressMap[t.id];
        return !prog || prog.state !== 'completed';
      });
      if (nextTask) {
        const prereqCheck = evaluateTaskPrerequisites(nextTask, taskProgressMap);
        candidates.push({
          id: `review-weak-task-${nextTask.id}`,
          type: 'roadmap_task',
          title: `Strengthen: ${nextTask.title}`,
          description: `Weak topic in ${domain.shortName}: ${topic.name}`,
          priority: 'weak_topic',
          priorityScore: Math.min(100, companyBoost + (100 - skill.evidenceStrength)),
          domainId: topic.domainId,
          topicId: topic.id,
          estimatedMinutes: nextTask.estimatedMinutes,
          reason: `Evidence strength below threshold (${Math.round(skill.evidenceStrength)}%)`,
          route: 'roadmap',
          targetId: nextTask.id,
          sourceTaskId: nextTask.id,
          sourceTopicId: topic.id,
          sourceSkillState: skill,
          isBlocked: prereqCheck.isBlocked,
          blockingReason: prereqCheck.unmetPrerequisiteIds.join(', '),
        });
      }
    }
  }
  return candidates;
}

function generateRetentionCandidates(
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  topics: Topic[],
  domains: DomainDefinition[],
  todayStr: string
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const prob of dsaProblems) {
    const prog = dsaProgressMap[prob.id];
    if (!prog?.nextReviewAt) continue;
    if (prog.nextReviewAt <= todayStr) continue; // Already handled in overdue

    // Due within 3 days (retention window)
    const daysUntil = daysBetween(todayStr, prog.nextReviewAt);
    if (daysUntil > 3) continue;

    const topic = topics.find(t => t.id === prob.topicId);
    const domain = domains.find(d => d.id === prob.domainId);
    if (!topic || !domain) continue;

    const unlockStatus = isProblemUnlockedForRemediation(prob, dsaProgressMap);
    if (!unlockStatus.isUnlocked) continue;

    candidates.push({
      id: `review-retention-${prob.id}`,
      type: 'dsa_review',
      title: `Retention: ${prob.title}`,
      description: `Upcoming Leitner Box ${prog.currentBox} review in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
      priority: 'retention',
      priorityScore: Math.max(50, 100 - daysUntil * 10), // Sooner = higher
      domainId: prob.domainId,
      topicId: prob.topicId,
      estimatedMinutes: Math.max(10, (prob.estimatedTimeMinutes || 15) / 2),
      reason: `Spaced repetition review due soon (${daysUntil} days)`,
      route: 'dsa',
      targetId: prob.id,
      sourceProblemId: prob.id,
      sourceTopicId: topic.id,
      isBlocked: false,
    });
  }
  return candidates;
}

function generateNormalProgressionCandidates(
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  skillStates: Record<string, TopicSkillState>,
  companyOverlays: CompanyOverlay[],
  currentMode: PlacementMode,
  todayStr: string,
  todayAssignmentsSet: Set<string>
): ReviewCandidate[] {
  // Use existing adaptive engine to get evaluated candidates
  const evaluated = getEvaluatedCandidates(
    tasks, taskProgressMap, dsaProblems, dsaProgressMap,
    skillStates, companyOverlays, currentMode, todayStr
  );

  return evaluated
    .filter(c => {
      // Only include tasks not already assigned today
      return !todayAssignmentsSet.has(c.task.id);
    })
    .map(c => ({
      id: `progression-${c.task.id}`,
      type: 'roadmap_task' as const,
      title: c.task.title,
      description: c.task.description,
      priority: 'normal_progression' as ReviewPriority,
      priorityScore: c.breakdown.finalScore,
      domainId: c.task.domainId,
      topicId: c.task.topicId,
      estimatedMinutes: c.task.estimatedMinutes,
      reason: c.breakdown.explanation,
      route: 'roadmap' as const,
      targetId: c.task.id,
      sourceTaskId: c.task.id,
      isBlocked: false,
    }));
}

function getCompanyRelevanceBoost(
  topic: Topic,
  domain: DomainDefinition,
  companyOverlays: CompanyOverlay[]
): number {
  const activeCompanies = companyOverlays.filter(c =>
    ['target', 'applied', 'oa_scheduled', 'interview_scheduled'].includes(c.applicationStatus)
  );
  if (activeCompanies.length === 0) return 0;

  let maxBoost = 0;
  for (const comp of activeCompanies) {
    let boost = 0;
    if (comp.requiredDomains.includes(domain.id)) boost += 15;
    if (comp.requiredTopics.includes(topic.id)) boost += 20;
    maxBoost = Math.max(maxBoost, boost);
  }
  return maxBoost;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO.slice(0, 10));
  const to = new Date(toISO.slice(0, 10));
  const diff = to.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}