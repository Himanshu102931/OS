import type {
  PreparationTopic,
  PreparationTopicProgress,
  PracticeAttempt,
  PreparationReadiness,
  SkillFreshnessState,
  TopicPreparedness,
  TopicStageId,
  TopicSkillState,
  DSAProgress,
  TaskProgress,
  DomainAssessmentResult,
  AssessmentState,
} from '../types';

/** Stages that establish curriculum coverage (the knowledge arc). */
const COVERAGE_STAGES: TopicStageId[] = ['orient', 'learn'];

/** Accuracy at or above this is considered proof of assessed coverage/competence. */
const ASSESSMENT_PASS_PCT = 70;

/** Evidence strength at or above this (and not stale) counts as retained proof. */
const RETENTION_MIN_EVIDENCE = 60;

export interface PreparednessInput {
  topic: PreparationTopic;
  /** Stage-level progress for the topic, when recorded. */
  progress?: PreparationTopicProgress;
  /** Skill state keyed by preparation topic id (evidence from practice/daily work). */
  skillState?: { evidenceStrength: number; freshness: SkillFreshnessState };
  /** All practice attempts; filtered internally by topic id. */
  attempts: PracticeAttempt[];
}

/**
 * Deterministic preparedness model for a preparation topic.
 *
 * Four proof pillars:
 *  1. Coverage     — Orient + Learn stages completed (or a passing assessment
 *                    proving the curriculum was covered).
 *  2. Application  — Apply stage completed or at least one practice attempt.
 *  3. Assessment   — best attempt accuracy ≥ 70% (or Assess stage completed).
 *  4. Retention / interview evidence — retained evidence strength plus
 *                    interview-stage proof (run level 5).
 *
 * currentLevel is a contiguous 0–5 rung built from those pillars, so a level
 * always means every rung below it is also proven. `readiness` becomes
 * 'ready' only when currentLevel reaches the topic's targetLevel — completion
 * percentage alone never implies readiness.
 */
export function evaluateTopicPreparedness(input: PreparednessInput): TopicPreparedness {
  const { topic, progress, skillState, attempts } = input;

  const topicAttempts = attempts.filter((a) => a.topicId === topic.id);
  const attemptCount = topicAttempts.length;
  const assessmentPerformance =
    attemptCount > 0
      ? Math.round(Math.max(...topicAttempts.map((a) => a.accuracyPct)))
      : null;

  const completedStages = progress?.completedStages ?? [];
  const isStageDone = (stage: TopicStageId) => completedStages.includes(stage);

  // 1. Coverage (coarse: 0 | 50 | 100 from stage arc, proven up to 100)
  const stageCoverageCount = COVERAGE_STAGES.filter(isStageDone).length;
  const stageCoveragePct = Math.round((stageCoverageCount / COVERAGE_STAGES.length) * 100);
  const assessmentProvesCoverage =
    assessmentPerformance !== null && assessmentPerformance >= ASSESSMENT_PASS_PCT;
  const covered = stageCoveragePct === 100 || assessmentProvesCoverage || isStageDone('review');
  const coveragePct = covered ? 100 : stageCoveragePct;

  // 2. Application
  const practiced = isStageDone('apply') || attemptCount > 0;

  // 3. Assessment
  const assessed =
    (assessmentPerformance !== null && assessmentPerformance >= ASSESSMENT_PASS_PCT) ||
    isStageDone('assess');

  // 4. Retention / interview evidence
  const evidenceStrength = Math.max(
    skillState?.evidenceStrength ?? 0,
    progress?.evidenceStrength ?? 0
  );
  const evidenceFreshness: SkillFreshnessState =
    skillState?.freshness ?? progress?.freshness ?? 'untested';
  const retained =
    evidenceStrength >= RETENTION_MIN_EVIDENCE &&
    (evidenceFreshness === 'fresh' || evidenceFreshness === 'aging');
  // Interview proof — only meaningful for topics that actually expose the
  // Interview stage. A topic must never be asked for proof of a stage it does
  // not support, so for topics without one the pillar is vacuously satisfied.
  // Generic rule (stage-driven, no topic-id special cases): the ladder itself
  // (rungs 1–5) and targetLevel behaviour are unchanged.
  const supportsInterviewStage = topic.stages.includes('interview');
  const interviewProof = !supportsInterviewStage || isStageDone('interview');

  // Contiguous level rung — a level implies every lower rung is proven.
  let currentLevel = 0;
  if (covered) currentLevel = 1;
  if (currentLevel === 1 && practiced) currentLevel = 2;
  if (currentLevel === 2 && assessed) currentLevel = 3;
  if (currentLevel === 3 && retained) currentLevel = 4;
  if (currentLevel === 4 && interviewProof) currentLevel = 5;

  const targetLevel = topic.targetLevel;

  let readiness: PreparationReadiness;
  if (currentLevel >= targetLevel) {
    readiness = 'ready';
  } else if (currentLevel >= 3) {
    readiness = 'assessed';
  } else if (currentLevel === 2) {
    readiness = 'practicing';
  } else if (currentLevel === 1 || practiced || attemptCount > 0) {
    readiness = 'learning';
  } else {
    readiness = 'not_started';
  }

  // Missing proof, in pillar order.
  const missingProof: string[] = [];
  if (!covered) {
    missingProof.push(
      `Coverage: complete the Orient + Learn stages or score ${ASSESSMENT_PASS_PCT}%+ in an assessment`
    );
  }
  if (!practiced) {
    missingProof.push('Application: complete the Apply stage or attempt a practice session');
  }
  if (!assessed) {
    missingProof.push(`Assessment: pass a practice assessment with ${ASSESSMENT_PASS_PCT}%+ accuracy`);
  }
  if (!retained) {
    missingProof.push(
      `Retention: record evidence of ${RETENTION_MIN_EVIDENCE}+/100 that is not stale`
    );
  }
  if (!interviewProof) {
    missingProof.push('Interview: complete the Interview stage checkpoint for this topic');
  }

  // Next action — first unmet rung in ladder order.
  let nextAction: string;
  if (!covered) {
    nextAction = `Complete the Orient and Learn stages for ${topic.title}`;
  } else if (!practiced) {
    nextAction = `Apply the concepts: attempt a practice session for ${topic.title}`;
  } else if (!assessed) {
    nextAction = `Pass an assessment for ${topic.title} (${ASSESSMENT_PASS_PCT}%+ accuracy)`;
  } else if (!retained) {
    nextAction =
      evidenceFreshness === 'stale'
        ? `Refresh stale evidence for ${topic.title} with a quick review`
        : `Record retention evidence for ${topic.title} (${RETENTION_MIN_EVIDENCE}+/100)`;
  } else if (!interviewProof) {
    nextAction = `Complete an interview-stage checkpoint for ${topic.title}`;
  } else {
    nextAction = `Maintain ${topic.title} readiness with periodic review`;
  }

  return {
    topicId: topic.id,
    readiness,
    currentLevel,
    targetLevel,
    covered,
    coveragePct,
    practiced,
    attemptCount,
    assessmentPerformance,
    evidenceStrength,
    evidenceFreshness,
    interviewProof,
    missingProof,
    nextAction,
  };
}

/**
 * Zero-filled stage record map for a topic progress record, carrying forward
 * any prior per-stage records (the type requires every stage key).
 */
function cloneStageProgress(
  existing: PreparationTopicProgress | undefined
): PreparationTopicProgress['stageProgress'] {
  const stageProgress: PreparationTopicProgress['stageProgress'] = {
    orient: { timeSpentMinutes: 0 },
    learn: { timeSpentMinutes: 0 },
    apply: { timeSpentMinutes: 0 },
    assess: { timeSpentMinutes: 0 },
    review: { timeSpentMinutes: 0 },
    interview: { timeSpentMinutes: 0 },
    evidence: { timeSpentMinutes: 0 },
  };
  for (const key of Object.keys(stageProgress) as TopicStageId[]) {
    const prior = existing?.stageProgress[key];
    if (prior) stageProgress[key] = { ...prior };
  }
  return stageProgress;
}

/**
 * Immutable stage-selection update: records the stage the user is actually
 * looking at without claiming it was completed. This is what makes
 * `currentStage` readable state instead of write-only state — the workspace
 * restores it on reload and per topic, so no stage leaks between topics.
 */
export function selectPreparationStage(
  topic: PreparationTopic,
  existing: PreparationTopicProgress | undefined,
  stage: TopicStageId,
  nowISO: string
): PreparationTopicProgress {
  return {
    topicId: topic.id,
    sectionId: topic.sectionId,
    domainId: topic.domainId,
    currentStage: stage,
    completedStages: existing?.completedStages ?? [],
    stageProgress: cloneStageProgress(existing),
    lastAccessedAt: nowISO,
    totalTimeSpentMinutes: existing?.totalTimeSpentMinutes ?? 0,
    evidenceStrength: existing?.evidenceStrength ?? 0,
    freshness: existing?.freshness ?? 'untested',
    createdAt: existing?.createdAt ?? nowISO,
    updatedAt: nowISO,
  };
}

/**
 * Immutable stage-completion update: returns a new PreparationTopicProgress
 * with `stage` marked complete (idempotent) and the current stage advanced to
 * the next incomplete stage of the topic's curriculum order.
 */
export function applyStageCompletion(
  topic: PreparationTopic,
  existing: PreparationTopicProgress | undefined,
  stage: TopicStageId,
  nowISO: string
): PreparationTopicProgress {
  const completedStages = existing?.completedStages.includes(stage)
    ? existing.completedStages
    : [...(existing?.completedStages ?? []), stage];

  // Zero-fill the full stage record map (type requires every stage key).
  const stageProgress = cloneStageProgress(existing);
  const priorStage = stageProgress[stage];
  stageProgress[stage] = {
    ...priorStage,
    startedAt: priorStage.startedAt ?? existing?.lastAccessedAt ?? nowISO,
    completedAt: priorStage.completedAt ?? nowISO,
  };

  const currentStage =
    topic.stages.find((s) => !completedStages.includes(s)) ?? stage;

  return {
    topicId: topic.id,
    sectionId: topic.sectionId,
    domainId: topic.domainId,
    currentStage,
    completedStages,
    stageProgress,
    lastAccessedAt: nowISO,
    totalTimeSpentMinutes: existing?.totalTimeSpentMinutes ?? 0,
    evidenceStrength: existing?.evidenceStrength ?? 0,
    freshness: existing?.freshness ?? 'untested',
    createdAt: existing?.createdAt ?? nowISO,
    updatedAt: nowISO,
  };
}

/**
 * The stage a topic must open on: the persisted `currentStage` when it is a
 * stage this topic actually has, otherwise the topic's first stage. Never read
 * from anywhere else, so a stage saved for topic A can never be restored for
 * topic B.
 */
export function resolveInitialStage(
  topic: PreparationTopic,
  existing: PreparationTopicProgress | undefined
): TopicStageId {
  const saved = existing?.currentStage;
  if (saved && topic.stages.includes(saved)) return saved;
  return topic.stages[0] ?? 'orient';
}

export const MIN_DEMONSTRATED_EVIDENCE_STRENGTH = 40;
export const MIN_PRACTICE_PASSING_ACCURACY = 50;

export type PrerequisiteUnmetReason = 'curriculum_unmet' | 'evidence_unmet' | 'unresolvable';

export interface PrerequisiteDetail {
  prerequisiteTopicId: string;
  prerequisiteTitle: string;
  reason: PrerequisiteUnmetReason;
  missingProof: string[];
  actionableTarget?: {
    type: 'preparation_lesson' | 'practice_session' | 'dsa_problem' | 'roadmap_task';
    label: string;
    route: 'preparation' | 'dsa' | 'roadmap';
    targetId: string;
  };
}

export interface PrerequisiteStatus {
  /** True while at least one declared prerequisite has not satisfied curriculum coverage and demonstrated evidence. */
  isLocked: boolean;
  /** Ids of the unmet prerequisites, in declaration order (empty when open). */
  unmetPrerequisiteIds: string[];
  /** Ids of prerequisites where curriculum is completed, but demonstrated evidence is insufficient. */
  unmetEvidencePrerequisiteIds?: string[];
  /** Detailed breakdown per unmet prerequisite for rich explanation and actionable routing. */
  details?: PrerequisiteDetail[];
}

export interface PrerequisiteEvaluationContext {
  skillStates?: Record<string, TopicSkillState>;
  attempts?: PracticeAttempt[];
  assessmentResults?: DomainAssessmentResult[] | AssessmentState;
  dsaProgressMap?: Record<string, DSAProgress>;
  taskProgressMap?: Record<string, TaskProgress>;
}

/**
 * Evaluates whether a prerequisite topic has completed its curriculum knowledge arc.
 * Covered when:
 *  - Orient + Learn stages are completed, OR
 *  - All declared topic stages are completed, OR
 *  - Review stage is completed, OR
 *  - An assessment / practice attempt scored >= 70% accuracy proving curriculum coverage.
 */
export function isPrerequisiteCurriculumSatisfied(
  prereq: PreparationTopic,
  progress: PreparationTopicProgress | undefined,
  attempts?: PracticeAttempt[]
): boolean {
  if (!progress) return false;
  const completed = progress.completedStages ?? [];
  const hasOrientAndLearn = COVERAGE_STAGES.every((s) => completed.includes(s));
  const hasAllStages = prereq.stages.length > 0 && prereq.stages.every((s) => completed.includes(s));
  const hasReview = completed.includes('review');

  const topicAttempts = attempts ? attempts.filter((a) => a.topicId === prereq.id) : [];
  const hasAssessmentPass = topicAttempts.some((a) => a.accuracyPct >= ASSESSMENT_PASS_PCT);

  return hasOrientAndLearn || hasAllStages || hasReview || hasAssessmentPass;
}

/**
 * Evaluates whether a prerequisite topic has demonstrated real evidence of competence.
 * Completion of lesson/stages alone does NOT satisfy evidence.
 *
 * Demonstrated evidence sources:
 *  1. Practice attempts: At least one attempt with passing outcome (a.passed === true)
 *     or unfailed session meeting minimum accuracy (a.passed !== false && accuracyPct >= 50%).
 *     Explicitly failed attempts (passed === false) do not falsely grant mastery even if accuracy is >= 50%.
 *  2. Canonical SkillState: evidenceStrength >= 40 (Level 2+ demonstrated competence)
 *     either directly for this prep topic or through its bridged roadmap topic.
 *  3. Assessment result: Passing domain score (>= 70%) or level >= 2 in assessment profile.
 *  4. Topic progress evidence: progress.evidenceStrength >= 40 where it represents real evidence.
 */
export function isPrerequisiteEvidenceSatisfied(
  prereq: PreparationTopic,
  progress: PreparationTopicProgress | undefined,
  context?: PrerequisiteEvaluationContext
): boolean {
  // 1. Practice attempts for this topic
  if (context?.attempts && context.attempts.length > 0) {
    const topicAttempts = context.attempts.filter((a) => a.topicId === prereq.id);
    const hasPassingAttempt = topicAttempts.some(
      (a) =>
        a.passed === true ||
        (a.passed !== false && a.accuracyPct >= MIN_PRACTICE_PASSING_ACCURACY)
    );
    if (hasPassingAttempt) return true;
  }

  // 2. Canonical SkillState (prep topic or bridged roadmap topic)
  if (context?.skillStates) {
    const ownSkill = context.skillStates[prereq.id];
    if (ownSkill && ownSkill.evidenceStrength >= MIN_DEMONSTRATED_EVIDENCE_STRENGTH) {
      return true;
    }
    if (prereq.roadmapTopicId) {
      const bridgedSkill = context.skillStates[prereq.roadmapTopicId];
      if (bridgedSkill && bridgedSkill.evidenceStrength >= MIN_DEMONSTRATED_EVIDENCE_STRENGTH) {
        return true;
      }
    }
  }

  // 3. Assessment Results
  if (context?.assessmentResults) {
    let domainResults: DomainAssessmentResult[] = [];
    if (Array.isArray(context.assessmentResults)) {
      domainResults = context.assessmentResults;
    } else if (
      typeof context.assessmentResults === 'object' &&
      'domainResults' in context.assessmentResults &&
      Array.isArray(context.assessmentResults.domainResults)
    ) {
      domainResults = context.assessmentResults.domainResults;
    }
    const domainMatch = domainResults.find((dr) => dr.domainId === prereq.domainId);
    if (
      domainMatch &&
      (domainMatch.abilityScore >= ASSESSMENT_PASS_PCT || domainMatch.level >= 2)
    ) {
      return true;
    }
  }

  // 4. Persisted progress evidenceStrength
  if (progress && progress.evidenceStrength >= MIN_DEMONSTRATED_EVIDENCE_STRENGTH) {
    return true;
  }

  return false;
}

/**
 * Availability of a preparation topic from its declared prerequisites.
 *
 * Evidence-driven progression rule:
 * A prerequisite is ONLY satisfied when BOTH:
 *  1. Curriculum coverage is complete (Orient + Learn completed, or equivalent passing assessment).
 *  2. Demonstrated evidence is recorded (practice session >= 50% accuracy, assessment pass,
 *     or skill evidence strength >= 40).
 *
 * Merely opening or marking a lesson complete does not falsely unlock downstream topics.
 */
export function evaluatePrerequisiteStatus(
  topic: PreparationTopic,
  resolveTopic: (topicId: string) => PreparationTopic | undefined,
  progressById: Record<string, PreparationTopicProgress>,
  context?: PrerequisiteEvaluationContext
): PrerequisiteStatus {
  const unmetPrerequisiteIds: string[] = [];
  const unmetEvidencePrerequisiteIds: string[] = [];
  const details: PrerequisiteDetail[] = [];

  for (const prereqId of topic.prerequisiteTopicIds) {
    const prereq = resolveTopic(prereqId);
    if (!prereq) {
      unmetPrerequisiteIds.push(prereqId);
      details.push({
        prerequisiteTopicId: prereqId,
        prerequisiteTitle: prereqId,
        reason: 'unresolvable',
        missingProof: ['Prerequisite topic definition could not be resolved'],
      });
      continue;
    }

    const prog = progressById[prereqId];
    const isCurriculumDone = isPrerequisiteCurriculumSatisfied(prereq, prog, context?.attempts);
    const isEvidenceDone = isPrerequisiteEvidenceSatisfied(prereq, prog, context);

    if (!isCurriculumDone) {
      unmetPrerequisiteIds.push(prereqId);
      details.push({
        prerequisiteTopicId: prereqId,
        prerequisiteTitle: prereq.title,
        reason: 'curriculum_unmet',
        missingProof: [`Complete Orient and Learn stages for ${prereq.title}`],
        actionableTarget: {
          type: 'preparation_lesson',
          label: `Open ${prereq.title}`,
          route: 'preparation',
          targetId: prereqId,
        },
      });
    } else if (!isEvidenceDone) {
      unmetPrerequisiteIds.push(prereqId);
      unmetEvidencePrerequisiteIds.push(prereqId);
      details.push({
        prerequisiteTopicId: prereqId,
        prerequisiteTitle: prereq.title,
        reason: 'evidence_unmet',
        missingProof: [
          `Demonstrate practice or assessment proof in ${prereq.title} (practice score >= 50% or evidence strength >= 40)`,
        ],
        actionableTarget: {
          type: 'practice_session',
          label: `Practice ${prereq.title}`,
          route: 'preparation',
          targetId: prereqId,
        },
      });
    }
  }

  return {
    isLocked: unmetPrerequisiteIds.length > 0,
    unmetPrerequisiteIds,
    unmetEvidencePrerequisiteIds:
      unmetEvidencePrerequisiteIds.length > 0 ? unmetEvidencePrerequisiteIds : undefined,
    details: details.length > 0 ? details : undefined,
  };
}

export type TopicProgressionState =
  | 'locked'
  | 'available_to_learn'
  | 'learned_unproven'
  | 'ready_to_progress';

export interface TopicProgressionResult {
  topicId: string;
  state: TopicProgressionState;
  isUnlocked: boolean;
  prerequisiteStatus: PrerequisiteStatus;
  preparedness: TopicPreparedness;
  evidenceSummary: {
    hasCurriculumCoverage: boolean;
    hasDemonstratedEvidence: boolean;
    evidenceStrength: number;
    attemptCount: number;
    assessmentScore: number | null;
  };
  actionableStep?: {
    type: 'learn' | 'practice' | 'assess' | 'prerequisite' | 'maintain';
    label: string;
    description: string;
    route: 'preparation' | 'dsa' | 'roadmap';
    targetId: string;
  };
}

/**
 * Comprehensive, deterministic progression evaluation for a preparation topic.
 *
 * Categorizes a topic into exactly one of four distinct progression states:
 *  - 'locked': Prerequisites not met (curriculum or evidence missing in prerequisite chain).
 *  - 'available_to_learn': Prerequisites satisfied (or none declared), but topic curriculum
 *    not yet completed (Orient + Learn not completed).
 *  - 'learned_unproven': Topic curriculum completed, but demonstrated proof of application
 *    (practice / assessment / skill evidence) has not yet been demonstrated.
 *  - 'ready_to_progress': Both curriculum coverage and demonstrated evidence are satisfied,
 *    enabling downstream dependent topics to unlock.
 */
export function evaluateTopicProgression(
  topic: PreparationTopic,
  resolveTopic: (topicId: string) => PreparationTopic | undefined,
  progressById: Record<string, PreparationTopicProgress>,
  context?: PrerequisiteEvaluationContext
): TopicProgressionResult {
  const prerequisiteStatus = evaluatePrerequisiteStatus(
    topic,
    resolveTopic,
    progressById,
    context
  );

  const topicProgress = progressById[topic.id];
  const topicSkill =
    context?.skillStates?.[topic.id] ||
    (topic.roadmapTopicId ? context?.skillStates?.[topic.roadmapTopicId] : undefined);
  const attempts = context?.attempts ?? [];

  const preparedness = evaluateTopicPreparedness({
    topic,
    progress: topicProgress,
    skillState: topicSkill
      ? { evidenceStrength: topicSkill.evidenceStrength, freshness: topicSkill.freshness }
      : undefined,
    attempts,
  });

  const hasCurriculumCoverage = preparedness.covered;
  const hasDemonstratedEvidence = isPrerequisiteEvidenceSatisfied(topic, topicProgress, context);

  let state: TopicProgressionState;
  let actionableStep: TopicProgressionResult['actionableStep'];

  if (prerequisiteStatus.isLocked) {
    state = 'locked';
    const firstUnmetDetail = prerequisiteStatus.details?.[0];
    if (firstUnmetDetail?.actionableTarget) {
      actionableStep = {
        type: 'prerequisite',
        label: firstUnmetDetail.actionableTarget.label,
        description: firstUnmetDetail.missingProof.join('; '),
        route: firstUnmetDetail.actionableTarget.route,
        targetId: firstUnmetDetail.actionableTarget.targetId,
      };
    }
  } else if (!hasCurriculumCoverage) {
    state = 'available_to_learn';
    actionableStep = {
      type: 'learn',
      label: `Learn ${topic.title}`,
      description: `Complete Orient and Learn stages for ${topic.title}`,
      route: 'preparation',
      targetId: topic.id,
    };
  } else if (!hasDemonstratedEvidence) {
    state = 'learned_unproven';
    actionableStep = {
      type: 'practice',
      label: `Prove Readiness: ${topic.title}`,
      description: `Attempt a practice session or assessment drill for ${topic.title} to demonstrate application`,
      route: 'preparation',
      targetId: topic.id,
    };
  } else {
    state = 'ready_to_progress';
    actionableStep = {
      type: preparedness.readiness === 'ready' ? 'maintain' : 'assess',
      label: preparedness.readiness === 'ready' ? 'Maintain Readiness' : `Assess ${topic.title}`,
      description: preparedness.nextAction,
      route: 'preparation',
      targetId: topic.id,
    };
  }

  return {
    topicId: topic.id,
    state,
    isUnlocked: !prerequisiteStatus.isLocked,
    prerequisiteStatus,
    preparedness,
    evidenceSummary: {
      hasCurriculumCoverage,
      hasDemonstratedEvidence,
      evidenceStrength: preparedness.evidenceStrength,
      attemptCount: preparedness.attemptCount,
      assessmentScore: preparedness.assessmentPerformance,
    },
    actionableStep,
  };
}
