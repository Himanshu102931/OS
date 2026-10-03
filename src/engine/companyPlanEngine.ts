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
  if (daysUntil === null) {
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

  for (const gap of snapshot.topActionableGaps) {
    // 1. Try to honor recommendedAction from company snapshot if actionable
    const rec = gap.recommendedAction;
    let candidateAdded = false;

    if (rec.targetId) {
      if (rec.type === 'dsa') {
        const prob = dsaProblems.find((p) => p.id === rec.targetId);
        if (prob) {
          const unlock = isProblemUnlocked(prob, dsaProgressMap, activePhaseNum);
          const baseScore = Math.max(40, 100 - gap.evidenceStrength);
          const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

          candidates.push({
            id: `company-gap-dsa-${prob.id}`,
            type: 'dsa_review',
            title: `${companyName} Target: #${prob.leetcodeNumber || ''} ${prob.title}`,
            description: `Address gap in ${gap.requirementName} (${gap.statusLabel}, ${gap.evidenceStrength}% strength).`,
            priority: 'company_gap',
            priorityScore,
            domainId: prob.domainId,
            topicId: prob.topicId,
            estimatedMinutes: prob.estimatedTimeMinutes || 25,
            reason: `${companyName} requirement "${gap.requirementName}" has a gap (${gap.evidenceStrength}% evidence)${deadlineUrgency.urgencyLabel ? ` · ${deadlineUrgency.urgencyLabel}` : ''}; targeted problem recommended`,
            route: 'dsa',
            targetId: prob.id,
            sourceProblemId: prob.id,
            isBlocked: !unlock.isUnlocked,
            blockingReason: unlock.reason,
          });
          candidateAdded = true;
        }
      } else if (rec.type === 'task') {
        const task = tasks.find((t) => t.id === rec.targetId);
        if (task && taskProgressMap[task.id]?.state !== 'completed') {
          const prereq = evaluateTaskPrerequisites(task, taskProgressMap);
          const taskPhase = getTaskPhaseNumber(task);
          const isPhaseLocked = taskPhase > activePhaseNum;
          const isBlocked = prereq.isBlocked || isPhaseLocked;
          const baseScore = Math.max(40, 100 - gap.evidenceStrength);
          const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

          candidates.push({
            id: `company-gap-task-${task.id}`,
            type: 'roadmap_task',
            title: `${companyName} Task: ${task.title}`,
            description: `Work on curriculum task to satisfy ${companyName} requirement (${gap.requirementName}).`,
            priority: 'company_gap',
            priorityScore,
            domainId: task.domainId,
            topicId: task.topicId,
            estimatedMinutes: task.estimatedMinutes,
            reason: `${companyName} requirement "${gap.requirementName}" requires evidence (${gap.evidenceStrength}% evidence)${deadlineUrgency.urgencyLabel ? ` · ${deadlineUrgency.urgencyLabel}` : ''}; curriculum task recommended`,
            route: 'roadmap',
            targetId: task.id,
            sourceTaskId: task.id,
            isBlocked,
            blockingReason: prereq.isBlocked
              ? `Prerequisites not completed: ${prereq.unmetPrerequisiteIds.join(', ')}`
              : isPhaseLocked
              ? `Phase locked (Task Phase ${taskPhase} > Current Phase ${activePhaseNum})`
              : undefined,
          });
          candidateAdded = true;
        }
      }
    }

    if (candidateAdded) continue;

    // 2. Fallback resolution: map requirement by topic or domain
    // A. Check for matching DSA problem
    if (gap.domainId === 'dsa' || gap.category === 'topic') {
      const prob = dsaProblems.find(
        (p) =>
          (p.topicId === gap.topicId || (gap.domainId && p.domainId === gap.domainId)) &&
          !dsaProgressMap[p.id]?.passedIndependently
      );
      if (prob) {
        const unlock = isProblemUnlocked(prob, dsaProgressMap, activePhaseNum);
        const baseScore = Math.max(40, 100 - gap.evidenceStrength);
        const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

        candidates.push({
          id: `company-gap-dsa-${prob.id}`,
          type: 'dsa_review',
          title: `${companyName} Target: #${prob.leetcodeNumber || ''} ${prob.title}`,
          description: `Practice DSA pattern for ${companyName} requirement (${gap.requirementName}).`,
          priority: 'company_gap',
          priorityScore,
          domainId: prob.domainId,
          topicId: prob.topicId,
          estimatedMinutes: prob.estimatedTimeMinutes || 25,
          reason: `${companyName} requirement "${gap.requirementName}" has a gap (${gap.evidenceStrength}% evidence)${deadlineUrgency.urgencyLabel ? ` · ${deadlineUrgency.urgencyLabel}` : ''}; practice problem recommended`,
          route: 'dsa',
          targetId: prob.id,
          sourceProblemId: prob.id,
          isBlocked: !unlock.isUnlocked,
          blockingReason: unlock.reason,
        });
        continue;
      }
    }

    // B. Check for uncompleted Roadmap Task
    const matchingTask = tasks.find(
      (t) =>
        (t.topicId === gap.topicId || (gap.domainId && t.domainId === gap.domainId)) &&
        taskProgressMap[t.id]?.state !== 'completed'
    );
    if (matchingTask) {
      const prereq = evaluateTaskPrerequisites(matchingTask, taskProgressMap);
      const taskPhase = getTaskPhaseNumber(matchingTask);
      const isPhaseLocked = taskPhase > activePhaseNum;
      const isBlocked = prereq.isBlocked || isPhaseLocked;
      const baseScore = Math.max(40, 100 - gap.evidenceStrength);
      const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

      candidates.push({
        id: `company-gap-task-${matchingTask.id}`,
        type: 'roadmap_task',
        title: `${companyName} Task: ${matchingTask.title}`,
        description: `Complete task to satisfy ${companyName} requirement for ${gap.requirementName}.`,
        priority: 'company_gap',
        priorityScore,
        domainId: matchingTask.domainId,
        topicId: matchingTask.topicId,
        estimatedMinutes: matchingTask.estimatedMinutes,
        reason: `${companyName} requirement "${gap.requirementName}" needs evidence (${gap.evidenceStrength}% evidence)${deadlineUrgency.urgencyLabel ? ` · ${deadlineUrgency.urgencyLabel}` : ''}; curriculum task recommended`,
        route: 'roadmap',
        targetId: matchingTask.id,
        sourceTaskId: matchingTask.id,
        isBlocked,
        blockingReason: prereq.isBlocked
          ? `Prerequisites not completed: ${prereq.unmetPrerequisiteIds.join(', ')}`
          : isPhaseLocked
          ? `Phase locked (Task Phase ${taskPhase} > Current Phase ${activePhaseNum})`
          : undefined,
      });
      continue;
    }

    // C. Check for matching Preparation Topic
    let prepTopic: PreparationTopic | undefined;
    if (gap.topicId) {
      prepTopic = preparationTopics.find((t) => t.id === gap.topicId);
      if (!prepTopic) {
        const bridgedId = getPreparationTopicIdByRoadmapId(gap.topicId);
        if (bridgedId) prepTopic = preparationTopics.find((t) => t.id === bridgedId);
      }
    }
    if (!prepTopic && gap.domainId) {
      const fallbackId = DOMAIN_TO_PREP_TOPIC[gap.domainId];
      if (fallbackId) prepTopic = preparationTopics.find((t) => t.id === fallbackId);
    }

    if (prepTopic) {
      const prereqStatus = evaluatePrerequisiteStatus(
        prepTopic,
        (id) => preparationTopics.find((t) => t.id === id) || getPreparationTopic(id),
        preparationTopicProgress
      );
      const baseScore = Math.max(40, 100 - gap.evidenceStrength);
      const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

      candidates.push({
        id: `company-gap-prep-${prepTopic.id}`,
        type: 'preparation_lesson',
        title: `${companyName} Preparation: ${prepTopic.title}`,
        description: `Preparatory concept lesson to build evidence for ${companyName} (${gap.requirementName}).`,
        priority: 'company_gap',
        priorityScore,
        domainId: prepTopic.domainId,
        topicId: prepTopic.id,
        estimatedMinutes: 20,
        reason: `${companyName} requirement "${gap.requirementName}" has low evidence (${gap.evidenceStrength}%); foundational preparation recommended`,
        route: 'preparation',
        targetId: prepTopic.id,
        sourceTopicId: prepTopic.id,
        isBlocked: prereqStatus.isLocked,
        blockingReason: prereqStatus.unmetPrerequisiteIds.length
          ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
          : undefined,
      });
      continue;
    }

    // D. Check for Practice Session
    if (gap.domainId) {
      const session = practiceSessions.find((s) => s.domainId === gap.domainId);
      if (session) {
        const baseScore = Math.max(35, 100 - gap.evidenceStrength);
        const priorityScore = Math.min(100, baseScore + deadlineUrgency.scoreBoost);

        candidates.push({
          id: `company-gap-practice-${session.id}`,
          type: 'practice_session',
          title: `${companyName} Practice: ${session.title}`,
          description: `Targeted practice session to build ${companyName} requirement evidence.`,
          priority: 'company_gap',
          priorityScore,
          domainId: session.domainId,
          topicId: session.topicId || '',
          estimatedMinutes: session.estimatedMinutes || 20,
          reason: `${companyName} requirement "${gap.requirementName}" developing; targeted practice drill recommended`,
          route: 'practice',
          targetId: session.id,
          isBlocked: false,
        });
      }
    }
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
