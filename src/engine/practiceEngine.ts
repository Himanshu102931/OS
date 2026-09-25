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
 * Authoritative evaluation of a completed Practice Session attempt.
 * Generates both the attempt record and the corresponding domain EvidenceLog.
 */
export function evaluatePracticeAttempt(
  session: PracticeSessionDefinition,
  userAnswers: PracticeUserAnswer[],
  totalTimeSeconds: number,
  todayISO: string
): PracticeEvaluationResult {
  let correctCount = 0;

  userAnswers.forEach((ans) => {
    const q = session.questions.find((quest) => quest.id === ans.questionId);
    if (!q) return;

    if (q.questionType === 'mcq') {
      if (typeof q.correctAnswer === 'number' && ans.selectedOption === q.correctAnswer) {
        ans.isCorrect = true;
        correctCount++;
      } else {
        ans.isCorrect = false;
      }
    } else {
      // For non-MCQ (SQL, Defense, Mock Interview), self-rating/response indicates correctness or completion
      if (ans.isCorrect || (ans.confidence && ans.confidence >= 3) || (ans.userResponse && ans.userResponse.trim().length > 10)) {
        ans.isCorrect = true;
        correctCount++;
      } else {
        ans.isCorrect = false;
      }
    }
  });

  const totalQuestions = session.questions.length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const scorePct = accuracyPct;

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
    userAnswers,
    evidenceLogId,
  };

  return { attempt, evidenceLog };
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
