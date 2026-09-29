import type {
  PracticeSessionDefinition,
  PracticeAttempt,
  PracticeUserAnswer,
  EvidenceLog,
  DomainId,
  TopicSkillState,
  CompanyOverlay,
} from '../types';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';

export interface PracticeEvaluationResult {
  attempt: PracticeAttempt;
  evidenceLog: EvidenceLog;
}

export interface PracticeRecommendation {
  session: PracticeSessionDefinition;
  reason: string;
  categoryTag: string;
}

/**
 * Question types graded against a keyed option index (`correctAnswer`).
 * Everything else has no answer key anywhere in the dataset.
 */
const OBJECTIVE_QUESTION_TYPES: ReadonlySet<string> = new Set(['mcq', 'multiple_choice']);

/**
 * The single answer-shape question for UI code: a question type is graded
 * objectively iff the evaluator grades it objectively. Runners must use this
 * (not their own literal check) to decide whether to offer choice buttons or a
 * written response, so the input offered and the grading rule can never drift
 * apart.
 */
export function isObjectiveQuestionType(questionType: string): boolean {
  return OBJECTIVE_QUESTION_TYPES.has(questionType);
}

/**
 * Honest evaluation for non-MCQ items — SQL scenarios, defense prompts,
 * interview questions, explanations, short answers, self-evaluations.
 *
 * There is deliberately NO objective grader for these types: not one non-MCQ
 * question in `practiceDataset.ts` or `src/data/practice/*` carries a
 * `correctAnswer` — they carry `explanation`/`hint`, a model answer the
 * respondent compares themselves against. Inventing a heuristic that guesses
 * correctness from response length or from a confidence star-rating would be a
 * subjective grader that does not exist in this product, so it must not be
 * simulated either.
 *
 * An item is therefore correct ONLY when:
 *   1. the respondent explicitly certified it (`isCorrect === true`), and
 *   2. that certification is not contradicted by an explicitly blank /
 *      whitespace-only response.
 *
 * Everything else is NOT correct:
 *   - unanswered / no answer record           → not correct
 *   - an empty or whitespace-only response    → not correct
 *   - a response merely EXISTING              → not correct
 *   - a confidence self-rating of any value   → not correct
 *
 * The response text and the confidence rating are still stored on
 * `PracticeUserAnswer` — they are the self-reported record of what the user
 * did, and they stay in `attempt.userAnswers`. They are reported, never scored.
 */
function isNonMcqCorrect(ans: PracticeUserAnswer): boolean {
  if (ans.isCorrect !== true) return false;
  if (typeof ans.userResponse === 'string' && ans.userResponse.trim().length === 0) return false;
  return true;
}

/**
 * `scorePct >= passingScorePct`, fail-closed.
 *
 * A missing / non-numeric / non-finite threshold yields false: `scorePct >= NaN`
 * and `scorePct >= undefined` are both false, and we must never claim a pass we
 * cannot justify. A threshold of 0 is valid and passes any score.
 */
function evaluatePassThreshold(scorePct: number, passingScorePct: number | undefined): boolean {
  return typeof passingScorePct === 'number' && Number.isFinite(passingScorePct) && scorePct >= passingScorePct;
}

/**
 * Authoritative evaluation of a completed Practice Session attempt.
 * Generates both the attempt record and the corresponding domain EvidenceLog.
 *
 * This function is the ONLY source of scoring truth — UI code must read its
 * output rather than recompute a score or a pass/fail verdict.
 *
 * `totalQuestions` (the denominator) is the SESSION's question count, never the
 * number of answers supplied: unanswered items stay unanswered and are simply
 * not correct, so submitting nothing scores 0 and can never reach 100.
 */
export function evaluatePracticeAttempt(
  session: PracticeSessionDefinition,
  userAnswers: PracticeUserAnswer[],
  totalTimeSeconds: number,
  todayISO: string
): PracticeEvaluationResult {
  let correctCount = 0;

  // Iterate the SESSION, not the answers: duplicates, stray question ids and
  // omitted answers all resolve correctly and correctCount can never exceed
  // totalQuestions (so scorePct can never exceed 100).
  session.questions.forEach((q) => {
    const ans = userAnswers.find((a) => a.questionId === q.id);
    if (!ans) return; // unanswered → not correct, left untouched

    if (OBJECTIVE_QUESTION_TYPES.has(q.questionType)) {
      // Keyed choice — unchanged: correct only when the picked option index
      // equals the keyed answer. Absent or wrong selection is simply false.
      if (typeof q.correctAnswer === 'number' && ans.selectedOption === q.correctAnswer) {
        ans.isCorrect = true;
        correctCount++;
      } else {
        ans.isCorrect = false;
      }
    } else {
      const correct = isNonMcqCorrect(ans);
      ans.isCorrect = correct;
      if (correct) correctCount++;
    }
  });

  const totalQuestions = session.questions.length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const scorePct = accuracyPct;

  const hasValidThreshold =
    typeof session.passingScorePct === 'number' && Number.isFinite(session.passingScorePct);
  const passed = evaluatePassThreshold(scorePct, hasValidThreshold ? session.passingScorePct : undefined);

  const attemptId = `practice-attempt-${Date.now()}`;
  const evidenceLogId = `ev-log-practice-${Date.now()}`;

  // Map 0-100 score to 1-5 confidence level
  const confidence: 1 | 2 | 3 | 4 | 5 =
    scorePct >= 85 ? 5 : scorePct >= 70 ? 4 : scorePct >= 50 ? 3 : scorePct >= 30 ? 2 : 1;

  const evidenceLog: EvidenceLog = {
    id: evidenceLogId,
    topicId: session.topicId || `topic-${session.domainId}-general`,
    domainId: session.domainId,
    score: scorePct,
    confidence,
    timestamp: new Date().toISOString(),
    sourceType: 'practice_session',
    sourceId: session.id,
    details: `Completed ${session.title} (${session.category}) with ${scorePct}% accuracy (${correctCount}/${totalQuestions}).`,
  };

  const attempt: PracticeAttempt = {
    id: attemptId,
    sessionId: session.id,
    sessionTitle: session.title,
    category: session.category,
    domainId: session.domainId,
    topicId: session.topicId,
    date: todayISO,
    completedAt: new Date().toISOString(),
    totalTimeSeconds,
    scorePct,
    accuracyPct,
    correctCount,
    totalQuestions,
    passed,
    ...(hasValidThreshold ? { passingScorePct: session.passingScorePct } : {}),
    userAnswers,
    evidenceLogId,
  };

  return { attempt, evidenceLog };
}

/**
 * Answer bookkeeping for an ALREADY evaluated attempt.
 *
 * This is deliberately not a score: it reports how many of the session's items
 * the respondent actually supplied an answer for, so the UI can state honestly
 * what was left blank. An item counts as answered only when it carries a chosen
 * option or a non-blank written response — a record that exists but is empty is
 * still unanswered (exactly how the evaluator treats it).
 */
export interface PracticeAnswerSummary {
  answeredCount: number;
  unansweredCount: number;
  unansweredQuestionIds: string[];
}

function hasSubstantiveAnswer(ans: PracticeUserAnswer | undefined): boolean {
  if (!ans) return false;
  if (typeof ans.selectedOption === 'number') return true;
  return typeof ans.userResponse === 'string' && ans.userResponse.trim().length > 0;
}

export function summarizePracticeAnswers(
  session: PracticeSessionDefinition,
  attempt: PracticeAttempt
): PracticeAnswerSummary {
  const unansweredQuestionIds = session.questions
    .filter((q) => !hasSubstantiveAnswer(attempt.userAnswers.find((a) => a.questionId === q.id)))
    .map((q) => q.id);

  return {
    answeredCount: session.questions.length - unansweredQuestionIds.length,
    unansweredCount: unansweredQuestionIds.length,
    unansweredQuestionIds,
  };
}

/**
 * Configured time limit in seconds, or null when the session is not timed.
 *
 * The dataset marks a timed set by its own id convention — the two
 * `…-timed-…` sets (15 questions / 20 minutes), the same convention the
 * dataset contract test uses to identify them — and states the limit as
 * `estimatedMinutes`. No other session declares a limit, so no other session
 * is given one: this never invents timing rules.
 */
export function getSessionTimeLimitSeconds(
  session: PracticeSessionDefinition
): number | null {
  if (!session.id.includes('timed')) return null;
  if (!Number.isFinite(session.estimatedMinutes) || session.estimatedMinutes <= 0) return null;
  return Math.round(session.estimatedMinutes * 60);
}

/** The three collections `applyPracticeAttempt` writes. */
export interface PracticeStateSlice {
  practiceAttempts: PracticeAttempt[];
  skillStates: Record<string, TopicSkillState>;
  evidenceLogs: EvidenceLog[];
}

/**
 * Single write transaction for a practice attempt (the pure body of
 * `PlacementContext.recordPracticeAttempt`).
 *
 * Persists the evaluator's output verbatim — `scorePct` and `passed` are stored
 * exactly as `evaluatePracticeAttempt` produced them and are never recomputed.
 * Skill credit is `round(evidenceLog.score * 0.2)` against the SAME score, so a
 * 0% attempt contributes 0 strength instead of a fabricated maximum.
 */
export function applyPracticeAttempt(
  state: PracticeStateSlice,
  attempt: PracticeAttempt,
  evidenceLog: EvidenceLog,
  nowISO: string = new Date().toISOString()
): PracticeStateSlice {
  const topicId = evidenceLog.topicId;
  const existingSkill: TopicSkillState = state.skillStates[topicId] ?? {
    topicId,
    domainId: evidenceLog.domainId,
    freshness: 'untested',
    evidenceStrength: 0,
  };

  const newEvidenceStrength = Math.min(
    100,
    Math.max(0, existingSkill.evidenceStrength + Math.round(evidenceLog.score * 0.2))
  );

  return {
    practiceAttempts: [attempt, ...(state.practiceAttempts || [])],
    skillStates: {
      ...state.skillStates,
      [topicId]: {
        ...existingSkill,
        lastPracticedAt: nowISO,
        freshness: 'fresh',
        evidenceStrength: newEvidenceStrength,
      },
    },
    evidenceLogs: [...(state.evidenceLogs || []), evidenceLog],
  };
}

/**
 * Deterministic calculation of recommended Practice session for Today page.
 */
export function getRecommendedPracticeSession(
  sessions: PracticeSessionDefinition[] = PRACTICE_SESSIONS,
  attempts: PracticeAttempt[] = [],
  skillStates: Record<string, TopicSkillState> = {},
  companyOverlays: CompanyOverlay[] = []
): PracticeRecommendation | null {
  if (!sessions || sessions.length === 0) return null;

  // 1. Check for un-attempted company required domains first
  const companyRequiredDomains = new Set<DomainId>();
  companyOverlays.forEach((c) => (c.requiredDomains || []).forEach((d) => companyRequiredDomains.add(d)));

  for (const domId of companyRequiredDomains) {
    const matchingSession = sessions.find(
      (s) => s.domainId === domId && !attempts.some((a) => a.sessionId === s.id)
    );
    if (matchingSession) {
      return {
        session: matchingSession,
        reason: `Target company requirement practice for ${domId.toUpperCase()}`,
        categoryTag: matchingSession.category.replace('_', ' ').toUpperCase(),
      };
    }
  }

  // 2. Check for stale/aging topics in skillStates
  const agingTopicIds = Object.values(skillStates)
    .filter((sk) => sk.freshness === 'aging' || sk.freshness === 'stale')
    .map((sk) => sk.topicId);

  for (const topId of agingTopicIds) {
    const matchingSession = sessions.find((s) => s.topicId === topId);
    if (matchingSession) {
      return {
        session: matchingSession,
        reason: `Evidence aging for topic — practice recommended to maintain freshness`,
        categoryTag: matchingSession.category.replace('_', ' ').toUpperCase(),
      };
    }
  }

  // 3. Fallback to uncompleted session or first session
  const uncompleted = sessions.find((s) => !attempts.some((a) => a.sessionId === s.id));
  const selected = uncompleted || sessions[0];

  return {
    session: selected,
    reason: `Recommended placement assessment to build evidence strength`,
    categoryTag: selected.category.replace('_', ' ').toUpperCase(),
  };
}

/**
 * Calculates aggregate stats for practice attempts by category.
 */
export function getPracticeCategoryStats(attempts: PracticeAttempt[]) {
  const categories: Record<string, { attemptCount: number; totalScorePct: number; avgScorePct: number; totalTimeMins: number }> = {};

  attempts.forEach((a) => {
    if (!categories[a.category]) {
      categories[a.category] = { attemptCount: 0, totalScorePct: 0, avgScorePct: 0, totalTimeMins: 0 };
    }
    categories[a.category].attemptCount += 1;
    categories[a.category].totalScorePct += a.scorePct;
    categories[a.category].totalTimeMins += Math.round(a.totalTimeSeconds / 60);
  });

  Object.keys(categories).forEach((cat) => {
    const c = categories[cat];
    c.avgScorePct = c.attemptCount > 0 ? Math.round(c.totalScorePct / c.attemptCount) : 0;
  });

  return categories;
}
