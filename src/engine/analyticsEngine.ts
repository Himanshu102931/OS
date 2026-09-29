import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  Topic,
  DomainDefinition,
  TopicSkillState,
  DailyCheckIn,
  Phase,
  EvidenceLog,
  CompanyOverlay,
} from '../types';
import { calculateTopicReadiness, calculateDomainReadinessList, type TopicReadiness } from './skillsEngine';

export type TimeWindow = '7d' | '30d' | 'phase' | 'all';

interface ReviewPrompt {
  id: string;
  type: 'overdue_review' | 'stale_evidence' | 'repeated_postpone' | 'remediation_needed' | 'low_independence';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  actionLabel: string;
  route: 'dsa' | 'roadmap' | 'skills';
  targetId?: string;
}

interface ActivityTelemetry {
  completedTasksCount: number;
  totalTasksInWindow: number;
  dsaAttemptsCount: number;
  dsaPassedCount: number;
  dsaIndependentPassedCount: number;
  dsaAssistedPassedCount: number;
  studyMinutes: number;
  studyHours: string;
  sealedDaysCount: number;
  totalDaysInWindow: number;
  consistencyRate: number; // 0 - 100%
}

interface QualityTelemetry {
  independentSolveRatio: number; // 0 - 100%
  assistedSolveRatio: number; // 0 - 100%
  remediationCount: number;
  reviewRetentionRate: number; // 0 - 100%
  boxDistribution: { 1: number; 2: number; 3: number; 4: number };
}

interface ProgressTelemetry {
  roadmapCompletionRate: number; // 0 - 100%
  activePhaseCompletionRate: number; // 0 - 100%
  overallDomainReadiness: number; // 0 - 100%
  patternsAttemptedCount: number;
  totalPatternsCount: number;
}

interface GapNeglectTelemetry {
  overdueDsaCount: number;
  staleEvidenceTopicsCount: number;
  repeatedlyPostponedTasksCount: number;
  remediationRequiredCount: number;
  overdueDsaProblems: { id: string; title: string; leetcodeNumber: number; box: number; daysOverdue: number }[];
  staleTopics: { topicId: string; topicName: string; domainName: string; daysInactive: number }[];
  postponedTasks: { taskId: string; title: string; postponeCount: number }[];
}

export interface AnalyticsSummary {
  timeWindow: TimeWindow;
  startDateISO: string;
  endDateISO: string;
  /**
   * Per-topic readiness produced by the same canonical skillsEngine call
   * SkillsView makes, with the same company overlays. Exposed (not recomputed)
   * so consumers and regression tests can verify both pages agree.
   */
  topicReadiness: TopicReadiness[];
  activity: ActivityTelemetry;
  quality: QualityTelemetry;
  progress: ProgressTelemetry;
  gaps: GapNeglectTelemetry;
  reviewPrompts: ReviewPrompt[];
}

/**
 * Calculates start date ISO string for a given time window.
 */
export function calculateWindowStartDate(
  timeWindow: TimeWindow,
  todayISO: string,
  activePhase?: Phase,
  earliestActivityISO?: string
): string {
  const today = todayISO.slice(0, 10);
  const d = new Date(today);

  if (timeWindow === '7d') {
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }

  if (timeWindow === '30d') {
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }

  if (timeWindow === 'phase' && activePhase?.startDate) {
    return activePhase.startDate.slice(0, 10);
  }

  // "All time", or a phase window with no known phase start: anchor the window
  // to the earliest real activity, and to today when there is none. An
  // uninitialized timestamp (the epoch) must never be presented as history.
  const earliest = earliestActivityISO?.slice(0, 10);
  if (earliest && earliest <= today) return earliest;
  return today;
}

/**
 * Earliest date on which anything actually happened.
 *
 * Deliberately limited to genuine activity records — completed tasks, DSA
 * attempts, evidence logs and sealed check-ins. Seeded/idle progress rows are
 * excluded so a fresh install reports "no activity data" instead of anchoring
 * to fabricated history. Returns `undefined` when nothing has happened yet.
 */
function findEarliestActivityDate(
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaAttempts: DSAAttempt[],
  evidenceLogs: EvidenceLog[],
  dailyCheckIns: DailyCheckIn[]
): string | undefined {
  const candidates: string[] = [];

  for (const task of tasks) {
    const prog = taskProgressMap[task.id];
    if (prog?.state !== 'completed') continue;
    const completed = (prog.lastCompletedAt || prog.updatedAt || '').slice(0, 10);
    if (completed) candidates.push(completed);
  }
  for (const att of dsaAttempts) {
    const attDate = (att.createdAt || att.date || '').slice(0, 10);
    if (attDate) candidates.push(attDate);
  }
  for (const log of evidenceLogs) {
    const logDate = (log.timestamp || '').slice(0, 10);
    if (logDate) candidates.push(logDate);
  }
  for (const ci of dailyCheckIns) {
    if (ci.isSealed && ci.date) candidates.push(ci.date.slice(0, 10));
  }

  if (candidates.length === 0) return undefined;
  return candidates.reduce((min, candidate) => (candidate < min ? candidate : min));
}

/**
 * Calculates days between two date strings (ISO or YYYY-MM-DD).
 */
function getDaysDifference(date1ISO: string, date2ISO: string): number {
  const d1 = new Date(date1ISO.slice(0, 10));
  const d2 = new Date(date2ISO.slice(0, 10));
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Main telemetry evaluation function. Calculates pure evidence analytics & review prompts.
 */
export function evaluateAnalyticsTelemetry(
  timeWindow: TimeWindow,
  todayISO: string,
  tasks: TaskDefinition[],
  taskProgressMap: Record<string, TaskProgress>,
  dsaProblems: DSAProblem[],
  dsaProgressMap: Record<string, DSAProgress>,
  dsaAttempts: DSAAttempt[],
  topics: Topic[],
  domains: DomainDefinition[],
  skillStates: Record<string, TopicSkillState>,
  dailyCheckIns: DailyCheckIn[],
  companyOverlays: CompanyOverlay[],
  activePhase?: Phase,
  evidenceLogs: EvidenceLog[] = []
): AnalyticsSummary {
  const startDateISO = calculateWindowStartDate(
    timeWindow,
    todayISO,
    activePhase,
    findEarliestActivityDate(tasks, taskProgressMap, dsaAttempts, evidenceLogs, dailyCheckIns)
  );

  // Filter DSA attempts in window
  const windowAttempts = dsaAttempts.filter((att) => {
    const attDate = (att.createdAt || att.date || '').slice(0, 10);
    return attDate >= startDateISO && attDate <= todayISO;
  });

  // Filter completed tasks in window
  const completedTasksInWindow = tasks.filter((t) => {
    const prog = taskProgressMap[t.id];
    if (!prog || prog.state !== 'completed') return false;
    const completedDate = (prog.lastCompletedAt || prog.updatedAt || '').slice(0, 10);
    return completedDate >= startDateISO && completedDate <= todayISO;
  });

  // Total study time calculation in window
  const sealedCheckInsInWindow = dailyCheckIns.filter((ci) => {
    const ciDate = ci.date.slice(0, 10);
    return ciDate >= startDateISO && ciDate <= todayISO && ci.isSealed;
  });

  const checkInMinutes = sealedCheckInsInWindow.reduce((sum, c) => sum + (c.totalActualMinutes || 0), 0);
  // Actual study time only: `timeSpentMinutes` is accumulated from minutes the
  // user really recorded (evening reflection) and `totalActualMinutes` comes
  // from sealed check-ins. The task's estimate is planned time and is never
  // counted as time studied. `Math.max` keeps the two overlapping recordings of
  // the same session from being double-counted.
  const taskMinutesInWindow = completedTasksInWindow.reduce((sum, t) => {
    const prog = taskProgressMap[t.id];
    return sum + (prog?.timeSpentMinutes || 0);
  }, 0);

  const totalStudyMinutes = Math.max(checkInMinutes, taskMinutesInWindow);
  const studyHoursFormatted = (totalStudyMinutes / 60).toFixed(1);

  // Days count calculation in window
  const daysInWindow = Math.max(1, Math.min(365, getDaysDifference(startDateISO, todayISO) + 1));
  const consistencyRate = Math.min(100, Math.round((sealedCheckInsInWindow.length / daysInWindow) * 100));

  // DSA Solves Analysis
  let dsaPassedCount = 0;
  let dsaIndependentPassedCount = 0;
  let dsaAssistedPassedCount = 0;
  let reviewAttemptsCount = 0;
  let reviewPassedCount = 0;

  for (const att of windowAttempts) {
    if (att.result === 'pass') {
      dsaPassedCount++;
      if (att.assistanceLevel === 'none') {
        dsaIndependentPassedCount++;
      } else {
        dsaAssistedPassedCount++;
      }
    }

    // Check if review attempt
    const probProg = dsaProgressMap[att.problemId];
    if (probProg && probProg.attemptCount > 1) {
      reviewAttemptsCount++;
      if (att.result === 'pass') {
        reviewPassedCount++;
      }
    }
  }

  const independentSolveRatio =
    dsaPassedCount > 0 ? Math.round((dsaIndependentPassedCount / dsaPassedCount) * 100) : 0;
  const assistedSolveRatio =
    dsaPassedCount > 0 ? Math.round((dsaAssistedPassedCount / dsaPassedCount) * 100) : 0;
  const reviewRetentionRate =
    reviewAttemptsCount > 0 ? Math.round((reviewPassedCount / reviewAttemptsCount) * 100) : 100;

  // Spaced Repetition Box Distribution
  const boxDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const prob of dsaProblems) {
    const prog = dsaProgressMap[prob.id];
    const box = prog?.currentBox || 1;
    boxDistribution[box] = (boxDistribution[box] || 0) + 1;
  }

  // DSA Remediation Count
  const remediationRequiredProblems = dsaProblems.filter(
    (p) => dsaProgressMap[p.id]?.remediationRequired === true
  );

  // Curriculum Progress
  const totalTasksCount = tasks.length;
  const overallCompletedTasksCount = Object.values(taskProgressMap).filter(
    (tp) => tp.state === 'completed'
  ).length;
  const roadmapCompletionRate =
    totalTasksCount > 0 ? Math.round((overallCompletedTasksCount / totalTasksCount) * 100) : 0;

  const phaseTasks = activePhase ? tasks.filter((t) => t.phaseId === activePhase.id) : tasks;
  const phaseCompletedTasks = phaseTasks.filter((t) => taskProgressMap[t.id]?.state === 'completed');
  const activePhaseCompletionRate =
    phaseTasks.length > 0 ? Math.round((phaseCompletedTasks.length / phaseTasks.length) * 100) : 0;

  // Skills & Domain Readiness
  const topicReadinessList = topics.map((top) => {
    const dom = domains.find((d) => d.id === top.domainId);
    return calculateTopicReadiness(
      top,
      dom,
      tasks,
      taskProgressMap,
      dsaProblems,
      dsaProgressMap,
      dsaAttempts,
      evidenceLogs,
      skillStates,
      companyOverlays,
      todayISO
    );
  });

  const domainReadinessList = calculateDomainReadinessList(domains, topics, topicReadinessList);
  const totalDomainWeight = domainReadinessList.reduce((sum, d) => sum + d.topicsCount, 0);
  const weightedDomainSum = domainReadinessList.reduce(
    (sum, d) => sum + d.overallReadiness * d.topicsCount,
    0
  );
  const overallDomainReadiness =
    totalDomainWeight > 0 ? Math.round(weightedDomainSum / totalDomainWeight) : 0;

  // Pattern Progression
  const allPatterns = Array.from(new Set(dsaProblems.map((p) => p.primaryPattern)));
  const attemptedPatterns = Array.from(
    new Set(
      dsaProblems
        .filter((p) => dsaProgressMap[p.id]?.attemptCount && dsaProgressMap[p.id].attemptCount > 0)
        .map((p) => p.primaryPattern)
    )
  );

  // Gaps & Neglect Telemetry
  const overdueDsaProblemsList: GapNeglectTelemetry['overdueDsaProblems'] = [];
  for (const prob of dsaProblems) {
    const prog = dsaProgressMap[prob.id];
    if (prog && prog.nextReviewAt && prog.nextReviewAt <= todayISO) {
      const daysOverdue = getDaysDifference(prog.nextReviewAt, todayISO);
      overdueDsaProblemsList.push({
        id: prob.id,
        title: prob.title,
        leetcodeNumber: prob.leetcodeNumber,
        box: prog.currentBox,
        daysOverdue,
      });
    }
  }

  const staleTopicsList: GapNeglectTelemetry['staleTopics'] = [];
  for (const tr of topicReadinessList) {
    if (tr.freshness === 'stale') {
      const daysInactive = tr.lastPracticedAt ? getDaysDifference(tr.lastPracticedAt, todayISO) : 15;
      staleTopicsList.push({
        topicId: tr.topicId,
        topicName: tr.topicName,
        domainName: tr.domainName,
        daysInactive,
      });
    }
  }

  const postponedTasksList: GapNeglectTelemetry['postponedTasks'] = [];
  for (const task of tasks) {
    const prog = taskProgressMap[task.id];
    if (prog && prog.postponeCount >= 2 && prog.state !== 'completed') {
      postponedTasksList.push({
        taskId: task.id,
        title: task.title,
        postponeCount: prog.postponeCount,
      });
    }
  }

  // Generate Evidence-Backed Review Prompts
  const reviewPrompts: ReviewPrompt[] = [];

  if (overdueDsaProblemsList.length > 0) {
    reviewPrompts.push({
      id: 'prompt-overdue-dsa',
      type: 'overdue_review',
      severity: 'high',
      title: `${overdueDsaProblemsList.length} DSA Review${overdueDsaProblemsList.length > 1 ? 's' : ''} Overdue`,
      description: `${overdueDsaProblemsList.length} problem${overdueDsaProblemsList.length > 1 ? 's are' : ' is'} due in the Leitner spaced repetition system. Completing reviews prevents box decay.`,
      actionLabel: 'Go to DSA Review',
      route: 'dsa',
      targetId: overdueDsaProblemsList[0].id,
    });
  }

  if (remediationRequiredProblems.length > 0) {
    reviewPrompts.push({
      id: 'prompt-remediation',
      type: 'remediation_needed',
      severity: 'high',
      title: `${remediationRequiredProblems.length} Problem Remediation Required`,
      description: `Repeated failures require reviewing the pattern lesson and self-check quiz before resuming normal attempts.`,
      actionLabel: 'Review Remediation',
      route: 'dsa',
      targetId: remediationRequiredProblems[0].id,
    });
  }

  if (staleTopicsList.length > 0) {
    reviewPrompts.push({
      id: 'prompt-stale-evidence',
      type: 'stale_evidence',
      severity: 'medium',
      title: `${staleTopicsList.length} Topic${staleTopicsList.length > 1 ? 's Have' : ' Has'} Stale Evidence`,
      description: `${staleTopicsList[0].domainName} (${staleTopicsList[0].topicName}) has received no practice evidence for >14 days.`,
      actionLabel: 'Inspect Skills Matrix',
      route: 'skills',
      targetId: staleTopicsList[0].topicId,
    });
  }

  if (postponedTasksList.length > 0) {
    reviewPrompts.push({
      id: 'prompt-postponed-tasks',
      type: 'repeated_postpone',
      severity: 'medium',
      title: `${postponedTasksList.length} Task${postponedTasksList.length > 1 ? 's' : ''} Postponed Repeatedly`,
      description: `Task "${postponedTasksList[0].title}" has been postponed ${postponedTasksList[0].postponeCount} times. Consider completing or decomposing it.`,
      actionLabel: 'View Roadmap Task',
      route: 'roadmap',
      targetId: postponedTasksList[0].taskId,
    });
  }

  if (windowAttempts.length >= 3 && independentSolveRatio < 50) {
    reviewPrompts.push({
      id: 'prompt-low-independence',
      type: 'low_independence',
      severity: 'info',
      title: 'High Solution Assistance Rate',
      description: `${assistedSolveRatio}% of recent solved DSA problems used hints or full solutions. Focus on unassisted attempts to improve mastery.`,
      actionLabel: 'Practice Anchor Problems',
      route: 'dsa',
    });
  }

  return {
    timeWindow,
    startDateISO,
    endDateISO: todayISO,
    topicReadiness: topicReadinessList,
    activity: {
      completedTasksCount: completedTasksInWindow.length,
      totalTasksInWindow: tasks.length,
      dsaAttemptsCount: windowAttempts.length,
      dsaPassedCount,
      dsaIndependentPassedCount,
      dsaAssistedPassedCount,
      studyMinutes: totalStudyMinutes,
      studyHours: studyHoursFormatted,
      sealedDaysCount: sealedCheckInsInWindow.length,
      totalDaysInWindow: daysInWindow,
      consistencyRate,
    },
    quality: {
      independentSolveRatio,
      assistedSolveRatio,
      remediationCount: remediationRequiredProblems.length,
      reviewRetentionRate,
      boxDistribution,
    },
    progress: {
      roadmapCompletionRate,
      activePhaseCompletionRate,
      overallDomainReadiness,
      patternsAttemptedCount: attemptedPatterns.length,
      totalPatternsCount: allPatterns.length,
    },
    gaps: {
      overdueDsaCount: overdueDsaProblemsList.length,
      staleEvidenceTopicsCount: staleTopicsList.length,
      repeatedlyPostponedTasksCount: postponedTasksList.length,
      remediationRequiredCount: remediationRequiredProblems.length,
      overdueDsaProblems: overdueDsaProblemsList,
      staleTopics: staleTopicsList,
      postponedTasks: postponedTasksList,
    },
    reviewPrompts,
  };
}
