import type {
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
  Topic,
  DomainDefinition,
  PracticeAttempt,
  PracticeSessionDefinition,
  PreparationTopic,
  PreparationTopicProgress,
  DomainAssessmentResult,
  WeaknessSignal,
  DomainId,
  Phase,
} from '../types';
import { PREPARATION_TOPICS, getPreparationTopic, getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { evaluatePrerequisiteStatus } from './preparationEngine';
import { evaluateTaskPrerequisites } from './taskStateEngine';
import { isProblemUnlocked } from './dsaEngine';
import { generateAssessmentPlanInputs, type AssessmentPlanInputs, type AssessmentProfileReadout } from './assessmentEngine';
import type { ReviewCandidate } from './reviewScheduler';

/**
 * Canonical domain-to-preparation-topic mapping.
 * Connects high-level domain signals to authoritative preparation topics.
 */
export const DOMAIN_TO_PREP_TOPIC: Record<DomainId | string, string> = {
  python: 'prep-lang',
  dsa: 'prep-coding-ds',
  sql: 'prep-sql',
  dbms: 'prep-dbms',
  oop: 'prep-oop',
  os: 'prep-os',
  cn: 'prep-cn',
  aptitude: 'prep-apt-quant',
  communication: 'prep-comm',
  interviews: 'prep-interview-tech',
  projects: 'prep-coding-ds',
};

export interface WeaknessRoutingOptions {
  practiceAttempts?: PracticeAttempt[];
  practiceSessions?: PracticeSessionDefinition[];
  dsaProblems?: DSAProblem[];
  dsaProgressMap?: Record<string, DSAProgress>;
  tasks?: TaskDefinition[];
  taskProgressMap?: Record<string, TaskProgress>;
  topics?: Topic[];
  domains?: DomainDefinition[];
  skillStates?: Record<string, TopicSkillState>;
  preparationTopics?: PreparationTopic[];
  preparationTopicProgress?: Record<string, PreparationTopicProgress>;
  domainResults?: DomainAssessmentResult[];
  weaknessSignals?: WeaknessSignal[];
  assessmentProfileReadout?: AssessmentProfileReadout;
  activePhase?: Phase | number;
  todayStr?: string;
  committedTargetIds?: Set<string>;
}

export function resolvePhaseNumber(phase?: Phase | number): number {
  if (typeof phase === 'object' && phase !== null) return phase.order;
  return phase ?? 1;
}

export function getTaskPhaseNumber(task: TaskDefinition): number {
  const match = task.phaseId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

/**
 * Master weakness routing orchestrator.
 * Converts practice weaknesses, DSA remediation failures, assessment focus areas,
 * and canonical skill weaknesses into prioritized, deduplicated ReviewCandidates.
 */
export function routeWeaknessSignals(options: WeaknessRoutingOptions): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  // 1. Practice weakness routing
  const practiceCandidates = routePracticeWeakness(options);
  candidates.push(...practiceCandidates);

  // 2. DSA failure remediation concept routing
  const dsaConceptCandidates = routeDsaRemediationConcepts(options);
  candidates.push(...dsaConceptCandidates);

  // 3. Assessment plan weakness routing
  const assessmentCandidates = routeAssessmentWeakness(options);
  candidates.push(...assessmentCandidates);

  // 4. Canonical skills weakness routing
  const skillCandidates = routeSkillWeakness(options);
  candidates.push(...skillCandidates);

  // Filter blocked candidates and committed targets
  const committedSet = options.committedTargetIds || new Set<string>();
  const unblockedCandidates = candidates.filter(
    (c) => !c.isBlocked && !committedSet.has(c.targetId)
  );

  // Deduplicate by targetId within routed weaknesses — highest priorityScore wins
  unblockedCandidates.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.targetId.localeCompare(b.targetId);
  });

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
 * 1. PRACTICE WEAKNESS ROUTING
 * Evaluates completed practice attempts for failure or low accuracy (<60%).
 * Prefers concept preparation if the weakness is conceptual (first attempt, low score <50%, or theory),
 * otherwise routes to targeted practice repetition.
 */
export function routePracticeWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  const attempts = options.practiceAttempts || [];
  if (attempts.length === 0) return [];

  const sessions = options.practiceSessions || PRACTICE_SESSIONS;
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};

  // Find latest attempt per session
  const latestAttemptBySession = new Map<string, PracticeAttempt>();
  for (const att of attempts) {
    const existing = latestAttemptBySession.get(att.sessionId);
    if (!existing || new Date(att.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
      latestAttemptBySession.set(att.sessionId, att);
    }
  }

  const candidates: ReviewCandidate[] = [];

  for (const [sessionId, attempt] of latestAttemptBySession.entries()) {
    // If passed with >= 60% accuracy, this is not a weakness
    if (attempt.passed && attempt.accuracyPct >= 60) continue;

    const session = sessions.find((s) => s.id === sessionId);
    const domainId = session?.domainId || attempt.domainId || 'python';
    const accuracy = attempt.accuracyPct;

    // Conceptual weakness: accuracy < 50% or explanation questions present
    const isConceptual =
      accuracy < 50 ||
      session?.category === 'core_cs' ||
      session?.questions.some((q) => q.questionType === 'explanation');

    if (isConceptual) {
      // Find matching preparation topic
      let prepTopic: PreparationTopic | undefined;
      if (session?.topicId) {
        prepTopic = prepTopics.find((t) => t.id === session.topicId);
        if (!prepTopic) {
          const bridgedId = getPreparationTopicIdByRoadmapId(session.topicId);
          if (bridgedId) prepTopic = prepTopics.find((t) => t.id === bridgedId);
        }
      }
      if (!prepTopic) {
        const fallbackId = DOMAIN_TO_PREP_TOPIC[domainId];
        if (fallbackId) prepTopic = prepTopics.find((t) => t.id === fallbackId);
      }

      if (prepTopic) {
        const prereqStatus = evaluatePrerequisiteStatus(
          prepTopic,
          (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
          prepProgress
        );

        candidates.push({
          id: `weakness-practice-concept-${prepTopic.id}`,
          type: 'preparation_lesson',
          title: `Concept Review: ${prepTopic.title}`,
          description: `Foundational concept review for ${prepTopic.title} after practice score of ${accuracy}%.`,
          priority: 'routed_weakness',
          priorityScore: Math.min(100, Math.max(50, 100 - accuracy)),
          domainId: prepTopic.domainId,
          topicId: prepTopic.id,
          estimatedMinutes: 20,
          reason: `Conceptual weakness detected in practice (${accuracy}% score); foundational review recommended`,
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
    }

    // Non-conceptual weakness or fallback: targeted practice drill repetition
    if (session) {
      candidates.push({
        id: `weakness-practice-drill-${session.id}`,
        type: 'practice_session',
        title: `Targeted Practice: ${session.title}`,
        description: `Repeat practice session to solidify pattern execution and competency.`,
        priority: 'routed_weakness',
        priorityScore: Math.min(95, Math.max(45, 100 - accuracy)),
        domainId: session.domainId,
        topicId: session.topicId || '',
        estimatedMinutes: session.estimatedMinutes || 20,
        reason: `Practice drill score (${accuracy}%) below passing threshold; repeat drill recommended`,
        route: 'practice',
        targetId: session.id,
        isBlocked: false,
      });
    }
  }

  return candidates;
}

/**
 * 2. DSA FAILURE ROUTING
 * When DSA problems have remediationRequired active:
 * Surfaces an explanatory concept/lesson route to an existing Preparation topic
 * (e.g. prep-coding-ds) while preserving DSA remediation precedence.
 */
export function routeDsaRemediationConcepts(options: WeaknessRoutingOptions): ReviewCandidate[] {
  const problems = options.dsaProblems || [];
  const progressMap = options.dsaProgressMap || {};
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;

  const candidates: ReviewCandidate[] = [];

  for (const prob of problems) {
    const prog = progressMap[prob.id];
    if (!prog?.remediationRequired) continue;

    // Find matching concept preparation topic
    let prepTopic = prepTopics.find((t) => t.id === 'prep-coding-ds');
    if (prob.topicId) {
      const bridgedId = getPreparationTopicIdByRoadmapId(prob.topicId);
      if (bridgedId) {
        const matching = prepTopics.find((t) => t.id === bridgedId);
        if (matching) prepTopic = matching;
      }
    }

    if (!prepTopic) continue;

    candidates.push({
      id: `weakness-dsa-concept-${prepTopic.id}`,
      type: 'preparation_lesson',
      title: `Concept Lesson: ${prepTopic.title}`,
      description: `Explanatory concept lesson on problem solving and patterns for ${prob.title}.`,
      priority: 'routed_weakness',
      priorityScore: 85,
      domainId: prob.domainId,
      topicId: prepTopic.id,
      estimatedMinutes: 25,
      reason: `DSA remediation active on #${prob.leetcodeNumber || ''} ${prob.title}; pattern decomposition lesson recommended`,
      route: 'preparation',
      targetId: prepTopic.id,
      sourceProblemId: prob.id,
      sourceTopicId: prepTopic.id,
      isBlocked: false,
    });
  }

  return candidates;
}

/**
 * 3. ASSESSMENT WEAKNESS ROUTING
 * Consumes assessment plan outputs (weaknessFocusAreas).
 * Preserves confidence information:
 * - Low/no confidence: prefers proof-building and retrieval (Preparation / Practice)
 * - Medium/high confidence: routes to targeted curriculum tasks or DSA problems
 */
export function routeAssessmentWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  let planInputs: AssessmentPlanInputs | undefined = options.assessmentProfileReadout?.planInputs;
  const domainResults = options.domainResults || [];

  if (!planInputs && (domainResults.length > 0 || (options.weaknessSignals || []).length > 0)) {
    planInputs = generateAssessmentPlanInputs(domainResults, options.weaknessSignals || []);
  }

  if (!planInputs || planInputs.weaknessFocusAreas.length === 0) return [];

  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};
  const sessions = options.practiceSessions || PRACTICE_SESSIONS;
  const tasks = options.tasks || [];
  const taskProgress = options.taskProgressMap || {};
  const dsaProblems = options.dsaProblems || [];
  const dsaProgress = options.dsaProgressMap || {};
  const activePhase = resolvePhaseNumber(options.activePhase);

  const candidates: ReviewCandidate[] = [];

  for (const area of planInputs.weaknessFocusAreas) {
    const dr = domainResults.find((d) => d.domainId === area.domainId);
    const confidence = dr?.confidence || 'none';
    const isLowConfidence = confidence === 'none' || confidence === 'low';

    if (isLowConfidence) {
      // Lower confidence: proof-building / retrieval in Preparation or Practice
      let prepTopic: PreparationTopic | undefined;
      if (area.topicId) {
        prepTopic = prepTopics.find((t) => t.id === area.topicId);
        if (!prepTopic) {
          const bridgedId = getPreparationTopicIdByRoadmapId(area.topicId);
          if (bridgedId) prepTopic = prepTopics.find((t) => t.id === bridgedId);
        }
      }
      if (!prepTopic) {
        const fallbackId = DOMAIN_TO_PREP_TOPIC[area.domainId];
        if (fallbackId) prepTopic = prepTopics.find((t) => t.id === fallbackId);
      }

      if (prepTopic) {
        const prereqStatus = evaluatePrerequisiteStatus(
          prepTopic,
          (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
          prepProgress
        );

        candidates.push({
          id: `weakness-assessment-prep-${area.id}`,
          type: 'preparation_lesson',
          title: `Proof Building: ${prepTopic.title}`,
          description: `Foundational study and retrieval to build verifiable evidence for ${area.domainId} (${area.errorCategory}).`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 90 : area.strength === 2 ? 80 : 70,
          domainId: area.domainId,
          topicId: prepTopic.id,
          estimatedMinutes: 25,
          reason: `Low-confidence assessment diagnosis in ${area.domainId} (${area.errorCategory}); proof-building preparation recommended`,
          route: 'preparation',
          targetId: prepTopic.id,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
        continue;
      }

      // Practice fallback for low confidence
      const session = sessions.find((s) => s.domainId === area.domainId);
      if (session) {
        candidates.push({
          id: `weakness-assessment-practice-${area.id}`,
          type: 'practice_session',
          title: `Diagnostic Practice: ${session.title}`,
          description: `Targeted practice session to build retrieval proof in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 85 : area.strength === 2 ? 75 : 65,
          domainId: area.domainId,
          topicId: session.topicId || '',
          estimatedMinutes: session.estimatedMinutes || 20,
          reason: `Low-confidence assessment diagnosis in ${area.domainId}; retrieval practice recommended`,
          route: 'practice',
          targetId: session.id,
          isBlocked: false,
        });
        continue;
      }
    } else {
      // Confirmed weakness with medium/high confidence:
      // Route to DSA problem (if DSA) or Roadmap task (if core curriculum)
      if (area.domainId === 'dsa') {
        const prob = dsaProblems.find(
          (p) =>
            (p.topicId === area.topicId || p.domainId === 'dsa') &&
            !dsaProgress[p.id]?.passedIndependently
        );
        if (prob) {
          const unlock = isProblemUnlocked(prob, dsaProgress, activePhase);
          candidates.push({
            id: `weakness-assessment-dsa-${area.id}`,
            type: 'dsa_review',
            title: `Targeted DSA: #${prob.leetcodeNumber || ''} ${prob.title}`,
            description: `Solve targeted DSA problem to address diagnosed weakness in ${area.competency || prob.title}.`,
            priority: 'routed_weakness',
            priorityScore: area.strength === 3 ? 92 : area.strength === 2 ? 82 : 72,
            domainId: prob.domainId,
            topicId: prob.topicId,
            estimatedMinutes: prob.estimatedTimeMinutes || 25,
            reason: `Confirmed weakness in ${area.domainId} (${area.errorCategory}) with ${confidence} confidence; targeted problem recommended`,
            route: 'dsa',
            targetId: prob.id,
            sourceProblemId: prob.id,
            isBlocked: !unlock.isUnlocked,
            blockingReason: unlock.reason,
          });
          continue;
        }
      }

      // Check for uncompleted roadmap task
      const task = tasks.find(
        (t) =>
          (t.topicId === area.topicId || t.domainId === area.domainId) &&
          taskProgress[t.id]?.state !== 'completed'
      );
      if (task) {
        const prereq = evaluateTaskPrerequisites(task, taskProgress);
        const taskPhase = getTaskPhaseNumber(task);
        const isPhaseLocked = taskPhase > activePhase;
        const isBlocked = prereq.isBlocked || isPhaseLocked;

        candidates.push({
          id: `weakness-assessment-task-${area.id}`,
          type: 'roadmap_task',
          title: `Curriculum Task: ${task.title}`,
          description: `Work on curriculum task to eliminate confirmed ${area.errorCategory} gap in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 88 : area.strength === 2 ? 78 : 68,
          domainId: task.domainId,
          topicId: task.topicId,
          estimatedMinutes: task.estimatedMinutes,
          reason: `Confirmed weakness in ${area.domainId} (${area.errorCategory}) with ${confidence} confidence; curriculum task recommended`,
          route: 'roadmap',
          targetId: task.id,
          sourceTaskId: task.id,
          isBlocked,
          blockingReason: prereq.isBlocked
            ? `Prerequisites not completed: ${prereq.unmetPrerequisiteIds.join(', ')}`
            : isPhaseLocked
            ? `Phase locked (Task Phase ${taskPhase} > Current Phase ${activePhase})`
            : undefined,
        });
        continue;
      }

      // Fallback if no task/DSA problem found: use preparation topic
      const fallbackPrepId = DOMAIN_TO_PREP_TOPIC[area.domainId];
      const fallbackPrep = fallbackPrepId ? prepTopics.find((t) => t.id === fallbackPrepId) : undefined;
      if (fallbackPrep) {
        const prereqStatus = evaluatePrerequisiteStatus(
          fallbackPrep,
          (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
          prepProgress
        );
        candidates.push({
          id: `weakness-assessment-prep-${area.id}`,
          type: 'preparation_lesson',
          title: `Remediation Lesson: ${fallbackPrep.title}`,
          description: `Foundational remediation for confirmed weakness in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 84 : area.strength === 2 ? 74 : 64,
          domainId: area.domainId,
          topicId: fallbackPrep.id,
          estimatedMinutes: 25,
          reason: `Confirmed weakness in ${area.domainId} (${area.errorCategory}); foundational remediation recommended`,
          route: 'preparation',
          targetId: fallbackPrep.id,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
      }
    }
  }

  return candidates;
}

/**
 * 4. CANONICAL SKILLS WEAKNESS ROUTING
 * Uses canonical TopicSkillState (evidenceStrength < 40 or freshness === 'stale')
 * to map weak skills to existing actionable sources.
 */
export function routeSkillWeakness(options: WeaknessRoutingOptions): ReviewCandidate[] {
  const skillStates = options.skillStates || {};
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};
  const tasks = options.tasks || [];
  const taskProgress = options.taskProgressMap || {};
  const dsaProblems = options.dsaProblems || [];
  const dsaProgress = options.dsaProgressMap || {};
  const activePhase = resolvePhaseNumber(options.activePhase);

  // Filter skills: evidenceStrength < 40 or stale
  const weakSkills = Object.values(skillStates).filter(
    (sk) => sk.evidenceStrength < 40 || sk.freshness === 'stale'
  );

  // Weakest first
  weakSkills.sort((a, b) => a.evidenceStrength - b.evidenceStrength);

  const candidates: ReviewCandidate[] = [];

  for (const skill of weakSkills) {
    const topicId = skill.topicId;

    // Check if topic is a Preparation topic
    const prepTopic = prepTopics.find((t) => t.id === topicId);
    if (prepTopic) {
      const prereqStatus = evaluatePrerequisiteStatus(
        prepTopic,
        (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
        prepProgress
      );

      candidates.push({
        id: `weakness-skill-prep-${prepTopic.id}`,
        type: 'preparation_lesson',
        title: `Skill Reinforcement: ${prepTopic.title}`,
        description: `Reinforce foundational skills for ${prepTopic.title} (current evidence: ${skill.evidenceStrength}%).`,
        priority: 'routed_weakness',
        priorityScore: Math.round(100 - skill.evidenceStrength),
        domainId: skill.domainId || prepTopic.domainId,
        topicId: prepTopic.id,
        estimatedMinutes: 20,
        reason: `Evidence strength is ${skill.evidenceStrength}% (${skill.freshness}); topic reinforcement recommended`,
        route: 'preparation',
        targetId: prepTopic.id,
        sourceSkillState: skill,
        isBlocked: prereqStatus.isLocked,
        blockingReason: prereqStatus.unmetPrerequisiteIds.length
          ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
          : undefined,
      });
      continue;
    }

    // Check if roadmap topic has an uncompleted task
    const nextTask = tasks.find(
      (t) => t.topicId === topicId && taskProgress[t.id]?.state !== 'completed'
    );
    if (nextTask) {
      const prereq = evaluateTaskPrerequisites(nextTask, taskProgress);
      const taskPhase = getTaskPhaseNumber(nextTask);
      const isPhaseLocked = taskPhase > activePhase;
      const isBlocked = prereq.isBlocked || isPhaseLocked;

      candidates.push({
        id: `weakness-skill-task-${nextTask.id}`,
        type: 'roadmap_task',
        title: `Curriculum Task: ${nextTask.title}`,
        description: `Work on ${nextTask.title} to restore topic readiness.`,
        priority: 'routed_weakness',
        priorityScore: Math.round(100 - skill.evidenceStrength),
        domainId: nextTask.domainId,
        topicId: nextTask.topicId,
        estimatedMinutes: nextTask.estimatedMinutes,
        reason: `Topic evidence strength is ${skill.evidenceStrength}% (${skill.freshness}); curriculum task recommended`,
        route: 'roadmap',
        targetId: nextTask.id,
        sourceTaskId: nextTask.id,
        sourceSkillState: skill,
        isBlocked,
        blockingReason: prereq.isBlocked
          ? `Prerequisites not completed: ${prereq.unmetPrerequisiteIds.join(', ')}`
          : isPhaseLocked
          ? `Phase locked (Task Phase ${taskPhase} > Current Phase ${activePhase})`
          : undefined,
      });
      continue;
    }

    // Check if roadmap topic maps to bridged preparation topic
    const bridgedId = getPreparationTopicIdByRoadmapId(topicId);
    if (bridgedId) {
      const bridgedPrep = prepTopics.find((t) => t.id === bridgedId);
      if (bridgedPrep) {
        const prereqStatus = evaluatePrerequisiteStatus(
          bridgedPrep,
          (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
          prepProgress
        );

        candidates.push({
          id: `weakness-skill-prep-${bridgedPrep.id}`,
          type: 'preparation_lesson',
          title: `Preparation Review: ${bridgedPrep.title}`,
          description: `Review preparatory material for ${bridgedPrep.title} to support roadmap topic.`,
          priority: 'routed_weakness',
          priorityScore: Math.round(100 - skill.evidenceStrength),
          domainId: skill.domainId || bridgedPrep.domainId,
          topicId: bridgedPrep.id,
          estimatedMinutes: 20,
          reason: `Topic evidence strength is ${skill.evidenceStrength}% (${skill.freshness}); preparation review recommended`,
          route: 'preparation',
          targetId: bridgedPrep.id,
          sourceSkillState: skill,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
        continue;
      }
    }

    // Check if DSA problem exists for this topic
    const nextDsa = dsaProblems.find(
      (p) => p.topicId === topicId && !dsaProgress[p.id]?.passedIndependently
    );
    if (nextDsa) {
      const unlock = isProblemUnlocked(nextDsa, dsaProgress, activePhase);
      candidates.push({
        id: `weakness-skill-dsa-${nextDsa.id}`,
        type: 'dsa_review',
        title: `DSA Problem: #${nextDsa.leetcodeNumber || ''} ${nextDsa.title}`,
        description: `Solve ${nextDsa.title} to build topic evidence.`,
        priority: 'routed_weakness',
        priorityScore: Math.round(100 - skill.evidenceStrength),
        domainId: nextDsa.domainId,
        topicId: nextDsa.topicId,
        estimatedMinutes: nextDsa.estimatedTimeMinutes || 25,
        reason: `Topic evidence strength is ${skill.evidenceStrength}% (${skill.freshness}); DSA problem practice recommended`,
        route: 'dsa',
        targetId: nextDsa.id,
        sourceProblemId: nextDsa.id,
        sourceSkillState: skill,
        isBlocked: !unlock.isUnlocked,
        blockingReason: unlock.reason,
      });
    }
  }

  return candidates;
}
