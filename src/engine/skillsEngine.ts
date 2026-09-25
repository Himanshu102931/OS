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
  SkillFreshnessState,
} from '../types';

export type ReadinessStatus = 'ready' | 'on_track' | 'at_risk' | 'needs_baseline';
export type EvidenceClassification = 'demonstrated' | 'inferred' | 'insufficient';

export interface EvidenceItemSummary {
  id: string;
  title: string;
  sourceType: 'task' | 'dsa_problem' | 'dsa_attempt' | 'manual_override' | 'evidence_log';
  timestamp?: string;
  scoreContribution: number;
  details: string;
}

export interface TopicReadiness {
  topicId: string;
  topicName: string;
  domainId: DomainId;
  domainName: string;
  importance: number; // 1-10
  
  // Scores & Levels
  evidenceStrength: number; // 0 - 100
  currentLevel: number; // 0 - 5 scale
  targetLevel: number; // 1 - 5 scale
  
  freshness: SkillFreshnessState;
  lastPracticedAt?: string;
  
  readinessStatus: ReadinessStatus;
  evidenceClassification: EvidenceClassification;
  
  // Breakdown & Traceability
  supportingEvidence: EvidenceItemSummary[];
  taskEvidenceCount: { total: number; completed: number };
  dsaEvidenceCount: { total: number; attempted: number; mastered: number };
  manualOverrideApplied: boolean;
  
  // Gap analysis
  gapExplanation: string;
  recommendedAction: {
    label: string;
    route: 'dsa' | 'roadmap' | 'dashboard';
    targetId?: string;
    type: 'dsa' | 'task' | 'review';
  };
}

export interface DomainReadiness {
  domainId: DomainId;
  domainName: string;
  shortName: string;
  iconName: string;
  color: string;
  overallReadiness: number; // 0 - 100
  status: ReadinessStatus;
  topicsCount: number;
  readyTopicsCount: number;
  atRiskTopicsCount: number;
  needsBaselineCount: number;
  totalEvidenceItems: number;
  topGapTopicName?: string;
  lastActivityAt?: string;
}

/**
 * Calculates days between two date strings (ISO or YYYY-MM-DD).
 */
function getDaysAgo(dateStr: string, todayStr: string): number {
  const d1 = new Date(dateStr.slice(0, 10));
  const d2 = new Date(todayStr.slice(0, 10));
  const diff = d2.getTime() - d1.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates deterministic topic readiness from actual PlacementOS evidence.
 */
export function calculateTopicReadiness(
  topic: Topic,
  domain: DomainDefinition | undefined,
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  dsaAttempts: DSAAttempt[],
  evidenceLogs: EvidenceLog[],
  skillStates: Record<string, TopicSkillState>,
  companyOverlays: CompanyOverlay[],
  todayStr: string
): TopicReadiness {
  const topicTasks = tasks.filter((t) => t.topicId === topic.id);
  const topicDsaProblems = dsaProblems.filter((p) => p.topicId === topic.id);
  const manualState = skillStates[topic.id];

  const supportingEvidence: EvidenceItemSummary[] = [];
  let latestActivityTimestamp: string | undefined = undefined;

  const updateLatestActivity = (ts?: string) => {
    if (!ts) return;
    if (!latestActivityTimestamp || ts > latestActivityTimestamp) {
      latestActivityTimestamp = ts;
    }
  };

  // 1. Task Evidence
  let completedTasksCount = 0;
  for (const task of topicTasks) {
    const prog = taskProgressMap[task.id];
    if (prog && prog.state === 'completed') {
      completedTasksCount++;
      updateLatestActivity(prog.lastCompletedAt || prog.updatedAt);
      supportingEvidence.push({
        id: `task-${task.id}`,
        title: task.title,
        sourceType: 'task',
        timestamp: prog.lastCompletedAt || prog.updatedAt,
        scoreContribution: Math.round(100 / Math.max(1, topicTasks.length)),
        details: `Roadmap task completed (${task.estimatedMinutes}m, importance ${task.importance}/10)`,
      });
    }
  }

  // 2. DSA Evidence
  let dsaAttemptedCount = 0;
  let dsaMasteredCount = 0; // Leitner Box 3 or 4
  let totalDsaScore = 0;

  for (const prob of topicDsaProblems) {
    const prog = dsaProgressMap[prob.id];
    if (prog) {
      if (prog.attemptCount > 0 || prog.lastAttemptAt) {
        dsaAttemptedCount++;
        updateLatestActivity(prog.lastAttemptAt || prog.updatedAt);

        let probScore = 0;
        if (prog.currentBox === 4) probScore = 100;
        else if (prog.currentBox === 3) probScore = 85;
        else if (prog.currentBox === 2) probScore = 65;
        else if (prog.currentBox === 1) probScore = 40;

        if (prog.passedIndependently) probScore = Math.min(100, probScore + 10);
        if (prog.remediationRequired) probScore = Math.max(10, probScore - 20);

        if (prog.currentBox >= 3) {
          dsaMasteredCount++;
        }

        totalDsaScore += probScore;

        supportingEvidence.push({
          id: `dsa-prog-${prob.id}`,
          title: `#${prob.leetcodeNumber || ''} ${prob.title}`,
          sourceType: 'dsa_problem',
          timestamp: prog.lastAttemptAt || prog.updatedAt,
          scoreContribution: probScore,
          details: `Leitner Box ${prog.currentBox} (${prog.attemptCount} attempt${prog.attemptCount > 1 ? 's' : ''}${prog.passedIndependently ? ', passed independently' : ''})`,
        });
      }
    }
  }

  // Also check explicit dsaAttempts for this topic
  const topicAttempts = dsaAttempts.filter((att) => {
    const prob = dsaProblems.find((p) => p.id === att.problemId);
    return prob?.topicId === topic.id;
  });

  for (const att of topicAttempts) {
    updateLatestActivity(att.createdAt || att.date);
  }

  // 3. Evidence Logs & Manual Override
  const topicEvidenceLogs = evidenceLogs.filter((log) => log.topicId === topic.id);
  for (const log of topicEvidenceLogs) {
    updateLatestActivity(log.timestamp);
    supportingEvidence.push({
      id: log.id,
      title: `Evidence Record (${log.sourceType.replace('_', ' ')})`,
      sourceType: 'evidence_log',
      timestamp: log.timestamp,
      scoreContribution: log.score,
      details: log.details || `Score: ${log.score}/100, Confidence: ${log.confidence}/5`,
    });
  }

  let manualOverrideApplied = false;
  if (manualState) {
    if (manualState.lastPracticedAt) {
      updateLatestActivity(manualState.lastPracticedAt);
    }
    // If user saved a manual rating, record it as supporting evidence
    if (manualState.evidenceStrength > 0 || manualState.freshness !== 'untested') {
      manualOverrideApplied = true;
      supportingEvidence.push({
        id: `manual-override-${topic.id}`,
        title: 'Manual Rating Override',
        sourceType: 'manual_override',
        timestamp: manualState.lastPracticedAt,
        scoreContribution: manualState.evidenceStrength,
        details: `User override score: ${manualState.evidenceStrength}/100 (${manualState.freshness})`,
      });
    }
  }

  // Calculate Weighted Raw Evidence Score (0 - 100)
  let rawScore = 0;
  const isDsaDomain = topic.domainId === 'dsa' || topicDsaProblems.length > 0;

  if (isDsaDomain && topicDsaProblems.length > 0) {
    const dsaAvgScore = totalDsaScore / topicDsaProblems.length;
    const taskScore = topicTasks.length > 0 ? (completedTasksCount / topicTasks.length) * 100 : dsaAvgScore;
    rawScore = 0.6 * dsaAvgScore + 0.4 * taskScore;
  } else if (topicTasks.length > 0) {
    rawScore = (completedTasksCount / topicTasks.length) * 100;
  }

  // Integrate explicit evidence log or manual rating weight if present
  if (manualState && manualState.evidenceStrength > 0) {
    // Blended weight: 70% calculated evidence + 30% manual override
    rawScore = supportingEvidence.length > 1
      ? 0.7 * rawScore + 0.3 * manualState.evidenceStrength
      : manualState.evidenceStrength;
  }

  // Determine Freshness & Decay
  let freshness: SkillFreshnessState = 'untested';
  if (latestActivityTimestamp) {
    const daysAgo = getDaysAgo(latestActivityTimestamp, todayStr);
    if (daysAgo <= 7) freshness = 'fresh';
    else if (daysAgo <= 14) freshness = 'aging';
    else freshness = 'stale';
  } else if (manualState?.freshness && manualState.freshness !== 'untested') {
    freshness = manualState.freshness;
  }

  let decayMultiplier = 1.0;
  if (freshness === 'aging') decayMultiplier = 0.9;
  if (freshness === 'stale') decayMultiplier = 0.75;
  if (freshness === 'untested') decayMultiplier = 1.0;

  const finalEvidenceStrength = Math.min(100, Math.max(0, Math.round(rawScore * decayMultiplier)));

  // Map to Level (0 - 5)
  let currentLevel: number;
  if (finalEvidenceStrength >= 90) currentLevel = 5;
  else if (finalEvidenceStrength >= 75) currentLevel = 4;
  else if (finalEvidenceStrength >= 60) currentLevel = 3;
  else if (finalEvidenceStrength >= 40) currentLevel = 2;
  else if (finalEvidenceStrength >= 20) currentLevel = 1;
  else currentLevel = 0;

  // Determine Target Level (1 - 5)
  // Importance 1-4 -> 3, 5-7 -> 4, 8-10 -> 5
  let targetLevel = 3;
  if (topic.importance >= 8) targetLevel = 5;
  else if (topic.importance >= 5) targetLevel = 4;

  // Check target company requirements
  const targetCompanyMatch = companyOverlays.some((c) =>
    ['target', 'applied', 'oa_scheduled', 'interview_scheduled'].includes(c.applicationStatus) &&
    (c.requiredTopics.includes(topic.id) || c.requiredDomains.includes(topic.domainId))
  );
  if (targetCompanyMatch && targetLevel < 4) {
    targetLevel = 4;
  }

  // Evidence Classification
  let evidenceClassification: EvidenceClassification = 'insufficient';
  if (supportingEvidence.length > 0) {
    const hasDirectWork = supportingEvidence.some(
      (e) => e.sourceType === 'task' || e.sourceType === 'dsa_problem' || e.sourceType === 'dsa_attempt'
    );
    evidenceClassification = hasDirectWork ? 'demonstrated' : 'inferred';
  } else {
    // Check if domain has other completed tasks (inferred baseline)
    const domainCompletedTasks = tasks.some(
      (t) => t.domainId === topic.domainId && taskProgressMap[t.id]?.state === 'completed'
    );
    if (domainCompletedTasks) {
      evidenceClassification = 'inferred';
    }
  }

  // Readiness Status
  const targetThreshold = Math.max(40, targetLevel * 18 - 5); // Target 5: 85, Target 4: 67, Target 3: 49
  let readinessStatus: ReadinessStatus;
  if (finalEvidenceStrength === 0 && supportingEvidence.length === 0) {
    readinessStatus = 'needs_baseline';
  } else if (freshness === 'stale' || finalEvidenceStrength < (targetLevel * 15)) {
    readinessStatus = 'at_risk';
  } else if (finalEvidenceStrength >= targetThreshold) {
    readinessStatus = 'ready';
  } else {
    readinessStatus = 'on_track';
  }

  // Gap Explanation
  let gapExplanation: string;
  if (readinessStatus === 'ready') {
    gapExplanation = `Target level (${targetLevel}/5) met with ${finalEvidenceStrength}% evidence strength.`;
  } else if (readinessStatus === 'needs_baseline') {
    gapExplanation = `No evidence recorded for ${topic.name}. Complete a baseline task or DSA problem to establish readiness.`;
  } else if (freshness === 'stale') {
    gapExplanation = `Evidence strength degraded due to inactivity (>14 days). Review required to restore freshness.`;
  } else {
    const levelDiff = targetLevel - currentLevel;
    gapExplanation = `Currently Level ${currentLevel}/5 (${finalEvidenceStrength}% evidence). Target is Level ${targetLevel}/5. Need +${Math.max(1, levelDiff * 20 - (finalEvidenceStrength % 20))}% additional evidence.`;
  }

  // Recommended Next Action
  let recommendedAction: TopicReadiness['recommendedAction'] = {
    label: 'Start Task',
    route: 'roadmap',
    type: 'task',
  };

  const nextDsaProb = topicDsaProblems.find((p) => {
    const prog = dsaProgressMap[p.id];
    return !prog || prog.currentBox < 4 || prog.remediationRequired;
  });

  const nextTask = topicTasks.find((t) => taskProgressMap[t.id]?.state !== 'completed');

  if (topicDsaProblems.length > 0 && nextDsaProb) {
    recommendedAction = {
      label: `Solve #${nextDsaProb.leetcodeNumber || ''} ${nextDsaProb.title}`,
      route: 'dsa',
      targetId: nextDsaProb.id,
      type: 'dsa',
    };
  } else if (nextTask) {
    recommendedAction = {
      label: `Complete Task: ${nextTask.title}`,
      route: 'roadmap',
      targetId: nextTask.id,
      type: 'task',
    };
  } else if (freshness === 'stale') {
    recommendedAction = {
      label: `Review ${topic.name}`,
      route: topicDsaProblems.length > 0 ? 'dsa' : 'roadmap',
      type: 'review',
    };
  }

  return {
    topicId: topic.id,
    topicName: topic.name,
    domainId: topic.domainId,
    domainName: domain?.name || topic.domainId,
    importance: topic.importance,

    evidenceStrength: finalEvidenceStrength,
    currentLevel,
    targetLevel,

    freshness,
    lastPracticedAt: latestActivityTimestamp,

    readinessStatus,
    evidenceClassification,

    supportingEvidence,
    taskEvidenceCount: {
      total: topicTasks.length,
      completed: completedTasksCount,
    },
    dsaEvidenceCount: {
      total: topicDsaProblems.length,
      attempted: dsaAttemptedCount,
      mastered: dsaMasteredCount,
    },
    manualOverrideApplied,

    gapExplanation,
    recommendedAction,
  };
}

/**
 * Calculates aggregated domain readiness metrics across all domains.
 */
export function calculateDomainReadinessList(
  domains: DomainDefinition[],
  topics: Topic[],
  topicReadinessList: TopicReadiness[]
): DomainReadiness[] {
  return domains.map((dom) => {
    const domTopics = topics.filter((t) => t.domainId === dom.id);
    const domTopicReadiness = topicReadinessList.filter((tr) => tr.domainId === dom.id);

    if (domTopics.length === 0 || domTopicReadiness.length === 0) {
      return {
        domainId: dom.id,
        domainName: dom.name,
        shortName: dom.shortName,
        iconName: dom.iconName,
        color: dom.color,
        overallReadiness: 0,
        status: 'needs_baseline',
        topicsCount: 0,
        readyTopicsCount: 0,
        atRiskTopicsCount: 0,
        needsBaselineCount: 0,
        totalEvidenceItems: 0,
      };
    }

    let totalWeight = 0;
    let weightedScoreSum = 0;
    let readyCount = 0;
    let atRiskCount = 0;
    let needsBaselineCount = 0;
    let totalEvidence = 0;
    let latestActivity: string | undefined = undefined;

    let minScore = 101;
    let topGapTopicName: string | undefined = undefined;

    for (const tr of domTopicReadiness) {
      const weight = tr.importance;
      totalWeight += weight;
      weightedScoreSum += tr.evidenceStrength * weight;

      if (tr.readinessStatus === 'ready') readyCount++;
      if (tr.readinessStatus === 'at_risk') atRiskCount++;
      if (tr.readinessStatus === 'needs_baseline') needsBaselineCount++;

      totalEvidence += tr.supportingEvidence.length;

      if (tr.lastPracticedAt && (!latestActivity || tr.lastPracticedAt > latestActivity)) {
        latestActivity = tr.lastPracticedAt;
      }

      if (tr.evidenceStrength < minScore) {
        minScore = tr.evidenceStrength;
        topGapTopicName = tr.topicName;
      }
    }

    const overallReadiness = Math.round(weightedScoreSum / Math.max(1, totalWeight));

    let status: ReadinessStatus = 'needs_baseline';
    if (readyCount === domTopicReadiness.length && domTopicReadiness.length > 0) {
      status = 'ready';
    } else if (atRiskCount > 0 || overallReadiness < 40) {
      status = 'at_risk';
    } else if (overallReadiness >= 65) {
      status = 'ready';
    } else if (totalEvidence > 0) {
      status = 'on_track';
    }

    return {
      domainId: dom.id,
      domainName: dom.name,
      shortName: dom.shortName,
      iconName: dom.iconName,
      color: dom.color,
      overallReadiness,
      status,
      topicsCount: domTopics.length,
      readyTopicsCount: readyCount,
      atRiskTopicsCount: atRiskCount,
      needsBaselineCount,
      totalEvidenceItems: totalEvidence,
      topGapTopicName,
      lastActivityAt: latestActivity,
    };
  });
}
