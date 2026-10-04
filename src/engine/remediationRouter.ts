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
  RemediationRoute,
  RemediationSourceType,
} from '../types';
import { PREPARATION_TOPICS, getPreparationTopic, getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PATTERN_LESSONS } from '../data/dsaDataset';
import {
  evaluatePrerequisiteStatus,
  isPrerequisiteCurriculumSatisfied,
  isPrerequisiteEvidenceSatisfied,
  type PrerequisiteEvaluationContext,
} from './preparationEngine';
import { evaluateTaskPrerequisites } from './taskStateEngine';
import { isProblemUnlocked } from './dsaEngine';
import { summarizePracticeAnswers } from './practiceEngine';
import { generateAssessmentPlanInputs, type AssessmentPlanInputs, type AssessmentProfileReadout } from './assessmentEngine';
import type { ReviewCandidate } from './reviewScheduler';

export type { RemediationRoute, RemediationSourceType };

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
  projects: 'prep-interview-career',
};

export interface RemediationRoutingOptions {
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
 * Maps a canonical RemediationRoute to a ReviewCandidate consumable by reviewScheduler and SessionComposer.
 */
export function remediationRouteToReviewCandidate(route: RemediationRoute): ReviewCandidate {
  return {
    id: route.id,
    type: route.type,
    title: route.title,
    description: route.description,
    priority: route.priority,
    priorityScore: route.priorityScore,
    domainId: route.domainId,
    topicId: route.topicId || '',
    estimatedMinutes: route.estimatedMinutes,
    reason: route.reason,
    route: route.route,
    targetId: route.targetId,
    sourceProblemId: route.sourceProblemId,
    sourceTaskId: route.sourceTaskId,
    sourceTopicId: route.sourceTopicId,
    sourceSkillState: route.sourceSkillState,
    isBlocked: route.isBlocked,
    blockingReason: route.blockingReason,
  };
}

/**
 * 1. PRACTICE WEAKNESS REMEDIATION
 * Evaluates completed practice attempts for failure or low accuracy (<60%).
 * Uses summarizePracticeAnswers() to inspect unanswered questions and incorrect items.
 * Prefers concept preparation if the weakness is conceptual (first attempt, low score <50%, or theory),
 * otherwise routes to targeted practice repetition.
 */
export function resolvePracticeRemediation(options: RemediationRoutingOptions): RemediationRoute[] {
  const attempts = options.practiceAttempts || [];
  if (attempts.length === 0) return [];

  const sessions = options.practiceSessions || PRACTICE_SESSIONS;
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};

  // Find latest attempt per session
  const latestAttemptBySession = new Map<string, PracticeAttempt>();
  for (const att of attempts) {
    // Project defense is evaluated in dedicated resolveProjectDefenseRemediation
    if (att.category === 'project_defense') continue;

    const existing = latestAttemptBySession.get(att.sessionId);
    if (!existing || new Date(att.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
      latestAttemptBySession.set(att.sessionId, att);
    }
  }

  const routes: RemediationRoute[] = [];

  for (const [sessionId, attempt] of latestAttemptBySession.entries()) {
    const passingThreshold = attempt.passingScorePct ?? 60;
    // If passed with >= passing threshold, this is not a weakness
    if (attempt.passed && attempt.accuracyPct >= passingThreshold) continue;

    const session = sessions.find((s) => s.id === sessionId);
    // Domain identity comes only from real records; no invented default domain.
    const domainId = session?.domainId || attempt.domainId;
    const accuracy = attempt.accuracyPct ?? 0;
    // Older / partial attempt records may not carry answers; degrade safely.
    const userAnswers = attempt.userAnswers || [];

    const summary = session ? summarizePracticeAnswers(session, attempt) : null;
    const weakQuestions = session?.questions.filter((q) =>
      userAnswers.some((a) => a.questionId === q.id && a.isCorrect === false)
    ) || [];
    const weakTags = [...new Set(weakQuestions.map((q) => q.categoryTag).filter(Boolean))] as string[];

    // Conceptual weakness: accuracy < 50% or core_cs category or explanation questions present
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
      if (!prepTopic && domainId) {
        const fallbackId = DOMAIN_TO_PREP_TOPIC[domainId];
        if (fallbackId) prepTopic = prepTopics.find((t) => t.id === fallbackId);
      }

      if (prepTopic) {
        const prereqStatus = evaluatePrerequisiteStatus(
          prepTopic,
          (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
          prepProgress,
          { skillStates: options.skillStates, attempts: options.practiceAttempts }
        );

        let reason = `Conceptual weakness detected in practice (${accuracy}% score); review ${prepTopic.title} concepts`;
        if (weakTags.length > 0) {
          reason = `Practice weakness: ${weakTags.join(', ')}; review ${prepTopic.title} concepts (${accuracy}% score)`;
        } else if (summary && summary.unansweredCount > 0) {
          reason = `Practice weakness: ${summary.unansweredCount} unanswered question(s) in ${session?.title || prepTopic.title} (${accuracy}% score); foundational review recommended`;
        }

        routes.push({
          id: `weakness-practice-concept-${prepTopic.id}`,
          sourceType: 'practice_weakness',
          sourceId: attempt.id,
          type: 'preparation_lesson',
          title: `Concept Review: ${prepTopic.title}`,
          description: `Foundational concept review for ${prepTopic.title} after practice score of ${accuracy}%.`,
          priority: 'routed_weakness',
          priorityScore: Math.min(100, Math.max(50, 100 - accuracy)),
          domainId: prepTopic.domainId,
          topicId: prepTopic.id,
          estimatedMinutes: 20,
          confidence: accuracy >= 40 ? 'low' : 'none',
          reason,
          route: 'preparation',
          targetId: prepTopic.id,
          sourceTopicId: prepTopic.id,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
            ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
            : prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
        continue;
      }
    }

    // Non-conceptual weakness or drill fallback: targeted practice drill repetition
    if (session) {
      routes.push({
        id: `weakness-practice-drill-${session.id}`,
        sourceType: 'practice_weakness',
        sourceId: attempt.id,
        type: 'practice_session',
        title: `Targeted Practice: ${session.title}`,
        description: `Repeat practice session to solidify pattern execution and competency.`,
        priority: 'routed_weakness',
        priorityScore: Math.min(95, Math.max(45, 100 - accuracy)),
        domainId: session.domainId,
        topicId: session.topicId || '',
        estimatedMinutes: session.estimatedMinutes || 20,
        confidence: 'medium',
        reason: `Practice drill score (${accuracy}%) below passing threshold; repeat drill recommended`,
        route: 'practice',
        targetId: session.id,
        isBlocked: false,
      });
    }
  }

  return routes;
}

/**
 * 2. DSA REMEDIATION & PATTERN LESSON ROUTING
 * When DSA problems have remediationRequired active:
 * Resolves the canonical pattern lesson from PATTERN_LESSONS,
 * and surfaces an explanatory concept lesson route to the matching Preparation topic (prep-coding-ds).
 */
export function resolveDsaRemediation(options: RemediationRoutingOptions): RemediationRoute[] {
  const problems = options.dsaProblems || [];
  const progressMap = options.dsaProgressMap || {};
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;

  const routes: RemediationRoute[] = [];

  for (const prob of problems) {
    const prog = progressMap[prob.id];
    if (!prog?.remediationRequired) continue;

    const patternLesson = PATTERN_LESSONS.find((p) => p.name === prob.primaryPattern);

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

    const patternLabel = patternLesson?.name;
    const reason = `DSA remediation active after the failed attempt on ${prob.title}${
      patternLabel
        ? `; reinforce ${patternLabel} concepts before retrying`
        : '; pattern decomposition lesson recommended'
    }`;

    routes.push({
      id: `weakness-dsa-concept-${prepTopic.id}`,
      sourceType: 'dsa_failure',
      sourceId: prob.id,
      type: 'preparation_lesson',
      title: patternLesson ? `Concept Lesson: ${patternLesson.name}` : `Concept Lesson: ${prepTopic.title}`,
      description: patternLesson
        ? `Review the ${patternLesson.name} pattern lesson before retrying ${prob.title}.`
        : `Explanatory concept lesson on problem solving and patterns for ${prob.title}.`,
      priority: 'routed_weakness',
      priorityScore: 85,
      domainId: prob.domainId,
      topicId: prepTopic.id,
      estimatedMinutes: 25,
      confidence: 'medium',
      patternId: patternLesson?.patternId,
      patternName: patternLesson?.name,
      reason,
      route: 'preparation',
      targetId: prepTopic.id,
      sourceProblemId: prob.id,
      sourceTopicId: prepTopic.id,
      isBlocked: false,
    });
  }

  return routes;
}

/**
 * 3. ASSESSMENT WEAKNESS ROUTING
 * Consumes assessment plan outputs (weaknessFocusAreas).
 * Preserves confidence information:
 * - Low/no confidence: prefers proof-building and retrieval (Preparation / Practice)
 * - Medium/high confidence: routes to targeted curriculum tasks or DSA problems
 */
export function resolveAssessmentRemediation(options: RemediationRoutingOptions): RemediationRoute[] {
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

  const routes: RemediationRoute[] = [];

  for (const area of planInputs.weaknessFocusAreas) {
    const dr = domainResults.find((d) => d.domainId === area.domainId);
    const confidence = dr?.confidence || 'none';
    const isLowConfidence = confidence === 'none' || confidence === 'low';
    // Human-readable focus, never raw error-category codes.
    const focus = area.competency ? ` (focus: ${area.competency})` : '';

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
          prepProgress,
          { skillStates: options.skillStates, attempts: options.practiceAttempts }
        );

        routes.push({
          id: `weakness-assessment-prep-${area.id}`,
          sourceType: 'assessment_weakness',
          sourceId: area.id,
          type: 'preparation_lesson',
          title: `Proof Building: ${prepTopic.title}`,
          description: `Foundational study and retrieval to build verifiable evidence for ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 90 : area.strength === 2 ? 80 : 70,
          domainId: area.domainId,
          topicId: prepTopic.id,
          estimatedMinutes: 25,
          confidence,
          reason: `Low-confidence assessment diagnosis in ${area.domainId}; proof-building preparation recommended${focus}`,
          route: 'preparation',
          targetId: prepTopic.id,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
            ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
            : prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
        continue;
      }

      // Practice fallback for low confidence
      const session = sessions.find((s) => s.domainId === area.domainId);
      if (session) {
        routes.push({
          id: `weakness-assessment-practice-${area.id}`,
          sourceType: 'assessment_weakness',
          sourceId: area.id,
          type: 'practice_session',
          title: `Diagnostic Practice: ${session.title}`,
          description: `Targeted practice session to build retrieval proof in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 85 : area.strength === 2 ? 75 : 65,
          domainId: area.domainId,
          topicId: session.topicId || '',
          estimatedMinutes: session.estimatedMinutes || 20,
          confidence,
          reason: `Low-confidence assessment diagnosis in ${area.domainId}; retrieval practice recommended${focus}`,
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
          routes.push({
            id: `weakness-assessment-dsa-${area.id}`,
            sourceType: 'assessment_weakness',
            sourceId: area.id,
            type: 'dsa_review',
            title: `Targeted DSA: ${prob.leetcodeNumber ? `#${prob.leetcodeNumber} ` : ''}${prob.title}`,
            description: `Solve a targeted DSA problem to address the diagnosed weakness in ${area.competency || prob.title}.`,
            priority: 'routed_weakness',
            priorityScore: area.strength === 3 ? 92 : area.strength === 2 ? 82 : 72,
            domainId: prob.domainId,
            topicId: prob.topicId,
            estimatedMinutes: prob.estimatedTimeMinutes || 25,
            confidence,
            reason: `Confirmed weakness in ${area.domainId} with ${confidence} confidence${focus}; targeted problem recommended`,
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

        routes.push({
          id: `weakness-assessment-task-${area.id}`,
          sourceType: 'assessment_weakness',
          sourceId: area.id,
          type: 'roadmap_task',
          title: `Curriculum Task: ${task.title}`,
          description: `Work on a curriculum task to close the confirmed gap in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 88 : area.strength === 2 ? 78 : 68,
          domainId: task.domainId,
          topicId: task.topicId,
          estimatedMinutes: task.estimatedMinutes,
          confidence,
          reason: `Confirmed weakness in ${area.domainId} with ${confidence} confidence${focus}; curriculum task recommended`,
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
          prepProgress,
          { skillStates: options.skillStates, attempts: options.practiceAttempts }
        );
        routes.push({
          id: `weakness-assessment-prep-${area.id}`,
          sourceType: 'assessment_weakness',
          sourceId: area.id,
          type: 'preparation_lesson',
          title: `Remediation Lesson: ${fallbackPrep.title}`,
          description: `Foundational remediation for confirmed weakness in ${area.domainId}.`,
          priority: 'routed_weakness',
          priorityScore: area.strength === 3 ? 84 : area.strength === 2 ? 74 : 64,
          domainId: area.domainId,
          topicId: fallbackPrep.id,
          estimatedMinutes: 25,
          confidence,
          reason: `Confirmed weakness in ${area.domainId}${focus}; foundational remediation recommended`,
          route: 'preparation',
          targetId: fallbackPrep.id,
          isBlocked: prereqStatus.isLocked,
          blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
            ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
            : prereqStatus.unmetPrerequisiteIds.length
            ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
            : undefined,
        });
      }
    }
  }

  return routes;
}

/**
 * Context for resolving a preparation continuation action. Carries the canonical
 * readiness signals so an already-demonstrated topic never produces a redundant
 * continuation, and the full preparation progress so prerequisite gating stays
 * authoritative.
 */
export interface TopicContinuationContext {
  practiceSessions?: PracticeSessionDefinition[];
  practiceAttempts?: PracticeAttempt[];
  evidenceContext?: Pick<PrerequisiteEvaluationContext, 'skillStates' | 'assessmentResults'>;
  preparationTopics?: PreparationTopic[];
  preparationTopicProgress?: Record<string, PreparationTopicProgress>;
}

/**
 * Helper to resolve the next logical retrieval continuation action after completing a preparation topic stage.
 */
export function resolveTopicContinuationAction(
  topic: PreparationTopic,
  progress: PreparationTopicProgress | undefined,
  context: TopicContinuationContext = {}
): RemediationRoute | null {
  const practiceSessions = context.practiceSessions || PRACTICE_SESSIONS;
  const practiceAttempts = context.practiceAttempts || [];
  const prepTopics = context.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = context.preparationTopicProgress || {};

  if (!progress || (!progress.completedStages?.length)) return null;

  const evidenceEvalContext: PrerequisiteEvaluationContext = {
    attempts: practiceAttempts,
    skillStates: context.evidenceContext?.skillStates,
    assessmentResults: context.evidenceContext?.assessmentResults,
  };
  const isCurriculumDone = isPrerequisiteCurriculumSatisfied(topic, progress, practiceAttempts);
  const isEvidenceDone = isPrerequisiteEvidenceSatisfied(topic, progress, evidenceEvalContext);

  // Only route retrieval continuation when curriculum is completed but evidence remains unproven
  if (!isCurriculumDone || isEvidenceDone) return null;

  const matchingSession =
    practiceSessions.find((s) => s.topicId === topic.id) ||
    practiceSessions.find((s) => s.domainId === topic.domainId && s.category !== 'project_defense');

  // No explicitly mapped practice/retrieval activity exists -> never fabricate one.
  if (!matchingSession) return null;

  // Check if session has already been passed with >= 60% accuracy
  const hasPassed = practiceAttempts.some(
    (a) => a.sessionId === matchingSession.id && a.passed && a.accuracyPct >= 60
  );
  if (hasPassed) return null;

  const prereqStatus = evaluatePrerequisiteStatus(
    topic,
    (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
    prepProgress,
    evidenceEvalContext
  );

  return {
    id: `weakness-prep-retrieval-${matchingSession.id}`,
    sourceType: 'preparation_continuation',
    sourceId: topic.id,
    type: 'practice_session',
    title: `Retrieval Practice: ${matchingSession.title}`,
    description: `Demonstrate practice evidence and solidify understanding for ${topic.title}.`,
    priority: 'routed_weakness',
    priorityScore: 78,
    domainId: matchingSession.domainId,
    topicId: topic.id,
    estimatedMinutes: matchingSession.estimatedMinutes || 20,
    confidence: 'medium',
    reason: `Study stages for ${topic.title} are complete; retrieval practice recommended to demonstrate understanding`,
    route: 'practice',
    targetId: matchingSession.id,
    isBlocked: prereqStatus.isLocked,
    blockingReason: prereqStatus.unmetPrerequisiteIds.length
      ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
      : prereqStatus.unmetEvidencePrerequisiteIds?.length
      ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
      : undefined,
  };
}

/**
 * 4. PREPARATION COMPLETION → RETRIEVAL / PRACTICE CONTINUATION
 * Inspects preparation topics that have curriculum completed (Orient + Learn) but lack
 * demonstrated practice proof (learned_unproven state).
 * Exposes mapped practice sessions as the next logical retrieval continuation action.
 */
export function resolvePreparationContinuation(options: RemediationRoutingOptions): RemediationRoute[] {
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};
  const sessions = options.practiceSessions || PRACTICE_SESSIONS;
  const attempts = options.practiceAttempts || [];

  const routes: RemediationRoute[] = [];

  for (const topic of prepTopics) {
    const prog = prepProgress[topic.id];
    const route = resolveTopicContinuationAction(topic, prog, {
      practiceSessions: sessions,
      practiceAttempts: attempts,
      evidenceContext: {
        skillStates: options.skillStates,
        assessmentResults: options.domainResults,
      },
      preparationTopics: prepTopics,
      preparationTopicProgress: prepProgress,
    });
    if (route) {
      routes.push(route);
    }
  }

  return routes;
}

/**
 * Canonical preparation topic for project defense and portfolio notes.
 * This is the topic every project_defense evidence record already lands on.
 */
export const PROJECT_DEFENSE_PREP_TOPIC_ID = 'prep-interview-career';

/**
 * Helper to resolve project defense remediation for a specific defense attempt.
 *
 * The preparation target is resolved from explicit mappings first (the session's
 * or attempt's topicId), then the documented defense topic. A candidate id is only
 * ever used if it resolves to a real preparation topic - otherwise no route.
 */
export function resolveDefenseRemediationRoute(
  attempt: PracticeAttempt,
  practiceSessions: PracticeSessionDefinition[] = PRACTICE_SESSIONS,
  prepTopics: PreparationTopic[] = PREPARATION_TOPICS,
  prepProgress: Record<string, PreparationTopicProgress> = {},
  skillStates: Record<string, TopicSkillState> = {}
): RemediationRoute | null {
  const passingThreshold = attempt.passingScorePct ?? 80;
  const accuracy = attempt.accuracyPct ?? 0;
  if (attempt.passed && accuracy >= passingThreshold) return null;

  const session = practiceSessions.find((s) => s.id === attempt.sessionId);
  const userAnswers = attempt.userAnswers || [];

  const candidateTopicIds = [
    session?.topicId,
    attempt.topicId,
    PROJECT_DEFENSE_PREP_TOPIC_ID,
  ].filter((id): id is string => Boolean(id));

  let prepTopic: PreparationTopic | undefined;
  for (const id of candidateTopicIds) {
    prepTopic = prepTopics.find((t) => t.id === id);
    if (prepTopic) break;
    const bridgedId = getPreparationTopicIdByRoadmapId(id);
    if (bridgedId) {
      prepTopic = prepTopics.find((t) => t.id === bridgedId);
      if (prepTopic) break;
    }
  }
  // No valid preparation mapping exists for this attempt -> no fabricated route.
  if (!prepTopic) return null;

  const summary = session ? summarizePracticeAnswers(session, attempt) : null;
  const incorrectQuestions = session?.questions.filter((q) =>
    userAnswers.some((a) => a.questionId === q.id && a.isCorrect === false)
  ) || [];
  const incorrectTags = [...new Set(incorrectQuestions.map((q) => q.categoryTag).filter(Boolean))] as string[];

  let reason = `Project defense score (${accuracy}%) below passing threshold (${passingThreshold}%); review portfolio architecture and defense notes in ${prepTopic.title} before retrying`;
  if (incorrectTags.length > 0) {
    reason = `Project defense weakness in ${incorrectTags.join(', ')} (${accuracy}% score); review system architecture and defense notes in ${prepTopic.title} before retrying`;
  } else if (summary && summary.unansweredCount > 0) {
    reason = `Project defense has ${summary.unansweredCount} unanswered prompt(s) (${accuracy}% score); review defense notes in ${prepTopic.title} before retrying`;
  }

  const prereqStatus = evaluatePrerequisiteStatus(
    prepTopic,
    (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
    prepProgress,
    { skillStates }
  );

  return {
    id: `weakness-defense-prep-${prepTopic.id}`,
    sourceType: 'project_defense_weakness',
    sourceId: attempt.id,
    type: 'preparation_lesson',
    title: `Defense Preparation: ${prepTopic.title}`,
    description: `Review project architecture, data flow, trade-offs, and defense notes after a ${accuracy}% score on project defense.`,
    priority: 'routed_weakness',
    priorityScore: Math.min(100, Math.max(55, 100 - accuracy)),
    domainId: prepTopic.domainId,
    topicId: prepTopic.id,
    estimatedMinutes: 25,
    confidence: 'medium',
    reason,
    route: 'preparation',
    targetId: prepTopic.id,
    sourceTopicId: prepTopic.id,
    isBlocked: prereqStatus.isLocked,
    blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
      ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
      : prereqStatus.unmetPrerequisiteIds.length
      ? `Prerequisite preparation not completed: ${prereqStatus.unmetPrerequisiteIds.join(', ')}`
      : undefined,
  };
}

/**
 * 5. PROJECT DEFENSE WEAKNESS ROUTING
 * Evaluates recorded project defense attempts from Project Lab.
 * Maps weak defense scores, unanswered prompts, and specific architecture/security gaps
 * to Preparation remediation (prep-interview-career) where valid mappings exist.
 */
export function resolveProjectDefenseRemediation(options: RemediationRoutingOptions): RemediationRoute[] {
  const attempts = options.practiceAttempts || [];
  const defenseAttempts = attempts.filter((a) => a.category === 'project_defense');
  if (defenseAttempts.length === 0) return [];

  // Sort by date/completedAt descending to get latest defense attempt
  defenseAttempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const latestAttempt = defenseAttempts[0];

  const sessions = options.practiceSessions || PRACTICE_SESSIONS;
  const prepTopics = options.preparationTopics || PREPARATION_TOPICS;
  const prepProgress = options.preparationTopicProgress || {};
  const skillStates = options.skillStates || {};

  const route = resolveDefenseRemediationRoute(latestAttempt, sessions, prepTopics, prepProgress, skillStates);
  return route ? [route] : [];
}

/**
 * 6. CANONICAL SKILLS WEAKNESS ROUTING
 * Uses canonical TopicSkillState (evidenceStrength < 40 or freshness === 'stale')
 * to map weak skills to existing actionable sources.
 */
export function resolveSkillRemediation(options: RemediationRoutingOptions): RemediationRoute[] {
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

  const routes: RemediationRoute[] = [];

  for (const skill of weakSkills) {
    const topicId = skill.topicId;

    // Check if topic is a Preparation topic
    const prepTopic = prepTopics.find((t) => t.id === topicId);
    if (prepTopic) {
      const prereqStatus = evaluatePrerequisiteStatus(
        prepTopic,
        (id) => prepTopics.find((t) => t.id === id) || getPreparationTopic(id),
        prepProgress,
        { skillStates: options.skillStates, attempts: options.practiceAttempts }
      );

      routes.push({
        id: `weakness-skill-prep-${prepTopic.id}`,
        sourceType: 'skill_weakness',
        sourceId: skill.topicId,
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
        blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
          ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
          : prereqStatus.unmetPrerequisiteIds.length
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

      routes.push({
        id: `weakness-skill-task-${nextTask.id}`,
        sourceType: 'skill_weakness',
        sourceId: skill.topicId,
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
          prepProgress,
          { skillStates: options.skillStates, attempts: options.practiceAttempts }
        );

        routes.push({
          id: `weakness-skill-prep-${bridgedPrep.id}`,
          sourceType: 'skill_weakness',
          sourceId: skill.topicId,
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
          blockingReason: prereqStatus.unmetEvidencePrerequisiteIds?.length
            ? `Prerequisite evidence not demonstrated: ${prereqStatus.unmetEvidencePrerequisiteIds.join(', ')}`
            : prereqStatus.unmetPrerequisiteIds.length
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
      routes.push({
        id: `weakness-skill-dsa-${nextDsa.id}`,
        sourceType: 'skill_weakness',
        sourceId: skill.topicId,
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

  return routes;
}

/**
 * Resolves all candidate remediation routes across all six sources:
 * 1. Practice weaknesses (accuracy, unanswered, conceptual vs drill)
 * 2. DSA failure remediation concepts (pattern lessons + prep-coding-ds)
 * 3. Assessment weaknesses (confidence-based: proof building vs targeted tasks)
 * 4. Preparation completion continuations (retrieval practice drills)
 * 5. Project defense weaknesses (defense simulator prompts -> prep-interview-career)
 * 6. Skill weaknesses (stale or low-evidence topics)
 *
 * Filters out blocked candidates and committed targets, then deterministically deduplicates
 * by targetId (highest priorityScore wins).
 */
export function resolveAllRemediationRoutes(options: RemediationRoutingOptions): RemediationRoute[] {
  const routes: RemediationRoute[] = [];

  // 1. Practice weakness routing
  routes.push(...resolvePracticeRemediation(options));

  // 2. DSA failure remediation concept routing
  routes.push(...resolveDsaRemediation(options));

  // 3. Assessment plan weakness routing
  routes.push(...resolveAssessmentRemediation(options));

  // 4. Preparation completion continuation routing
  routes.push(...resolvePreparationContinuation(options));

  // 5. Project defense weakness routing
  routes.push(...resolveProjectDefenseRemediation(options));

  // 6. Canonical skills weakness routing
  routes.push(...resolveSkillRemediation(options));

  // Filter blocked routes and committed targets
  const committedSet = options.committedTargetIds || new Set<string>();
  const unblockedRoutes = routes.filter(
    (r) => !r.isBlocked && !committedSet.has(r.targetId)
  );

  // Deterministic sort: highest priorityScore first; tie-break by targetId, then id
  unblockedRoutes.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    const targetComp = a.targetId.localeCompare(b.targetId);
    if (targetComp !== 0) return targetComp;
    return a.id.localeCompare(b.id);
  });

  // Deduplicate by targetId — highest priorityScore wins
  const seenTargets = new Set<string>();
  const deduplicated: RemediationRoute[] = [];
  for (const route of unblockedRoutes) {
    if (!seenTargets.has(route.targetId)) {
      seenTargets.add(route.targetId);
      deduplicated.push(route);
    }
  }

  return deduplicated;
}

/**
 * Master weakness routing orchestrator producing ReviewCandidate[] for reviewScheduler.
 * Pure deterministic facade over resolveAllRemediationRoutes.
 */
export function routeRemediationCandidates(options: RemediationRoutingOptions): ReviewCandidate[] {
  const routes = resolveAllRemediationRoutes(options);
  return routes.map(remediationRouteToReviewCandidate);
}
