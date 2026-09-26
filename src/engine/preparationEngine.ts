import type {
  PreparationTopic,
  PreparationTopicProgress,
  PracticeAttempt,
  PreparationReadiness,
  SkillFreshnessState,
  TopicPreparedness,
  TopicStageId,
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
  const interviewProof = isStageDone('interview');

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
