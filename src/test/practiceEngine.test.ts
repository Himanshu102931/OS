import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluatePracticeAttempt,
  applyPracticeAttempt,
  getRecommendedPracticeSession,
  getPracticeCategoryStats,
} from '../engine/practiceEngine';
import { evaluatePracticeSignals } from '../engine/adaptiveEngine';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { StorageAdapter, type AppExtendedStorageState } from '../storage/storageAdapter';
import type {
  PracticeAttempt,
  PracticeSessionDefinition,
  PracticeUserAnswer,
  TaskProgress,
} from '../types';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

describe('practiceEngine', () => {
  it('loads starter question bank and sessions properly', () => {
    expect(PRACTICE_SESSIONS.length).toBeGreaterThanOrEqual(6);
    const totalQuestions = PRACTICE_SESSIONS.reduce((acc, s) => acc + s.questions.length, 0);
    expect(totalQuestions).toBeGreaterThanOrEqual(15);
  });

  it('evaluates objective session completion and scoring (Aptitude & Core CS)', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'aptitude')!;
    const answers: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      selectedOption: typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined,
    }));

    const { attempt, evidenceLog } = evaluatePracticeAttempt(session, answers, 600, '2026-09-25T10:00:00Z');

    expect(attempt.sessionId).toBe(session.id);
    expect(attempt.scorePct).toBe(100);
    expect(attempt.accuracyPct).toBe(100);
    expect(evidenceLog).toBeDefined();
    expect(evidenceLog.sourceType).toBe('practice_session');
    expect(evidenceLog.score).toBe(100);
  });

  it('handles empty state and zero answers cleanly', () => {
    const session = PRACTICE_SESSIONS[0];
    const { attempt } = evaluatePracticeAttempt(session, [], 0, '2026-09-25T10:00:00Z');

    expect(attempt.totalQuestions).toBe(session.questions.length);
    expect(attempt.userAnswers).toHaveLength(0);
    expect(attempt.scorePct).toBe(0);
    expect(attempt.accuracyPct).toBe(0);
  });

  it('evaluates SQL session with hint penalty and notes', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'sql')!;
    const answers: PracticeUserAnswer[] = session.questions.map((q, idx) => ({
      questionId: q.id,
      selectedOption: typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined,
      usedHint: idx === 0,
      notes: 'Used CTE approach',
    }));

    const { attempt } = evaluatePracticeAttempt(session, answers, 450, '2026-09-25T10:30:00Z');

    expect(attempt.sessionId).toBe(session.id);
    expect(attempt.userAnswers[0].usedHint).toBe(true);
  });

  /**
   * C3 RECONCILIATION (intentionally corrected behaviour)
   *
   * These two tests previously asserted 100% for answers that carried only a
   * confidence rating and a response string. That WAS the defect: the old
   * evaluator treated `confidence >= 3` (which the runner pre-fills to 3) or
   * `userResponse.length > 10` as correctness, so merely clicking Submit
   * earned full credit on SQL/Defense/Mock Interview sessions.
   *
   * Corrected contract:
   *   - self-rating + response text are recorded but NEVER scored → 0
   *   - an explicit `isCorrect === true` self-certification is scored, which
   *     is how an ungraded prompt is honestly marked complete (there is no
   *     answer key for these question types anywhere in the dataset)
   */
  it('evaluates Project Defense self-rated practice session', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'project_defense')!;

    // (a) self-rating + a substantive response, but no certification → not correct
    const ungraded: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      confidence: 4,
      userResponse: 'Explained microservice architectural trade-offs clearly.',
    }));
    const withoutCertification = evaluatePracticeAttempt(session, ungraded, 800, '2026-09-25T11:00:00Z');

    expect(withoutCertification.attempt.accuracyPct).toBe(0);
    expect(withoutCertification.attempt.scorePct).toBe(0);
    expect(withoutCertification.evidenceLog.score).toBe(0);
    // …while the self-report itself stays represented on the answer
    expect(withoutCertification.attempt.userAnswers[0].confidence).toBe(4);
    expect(withoutCertification.attempt.userAnswers[0].userResponse).toContain('microservice');
    expect(withoutCertification.attempt.userAnswers[0].isCorrect).toBe(false);

    // (b) explicit self-certification → scored
    const certified: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      isCorrect: true,
      confidence: 4,
      userResponse: 'Explained microservice architectural trade-offs clearly.',
    }));
    const withCertification = evaluatePracticeAttempt(session, certified, 800, '2026-09-25T11:00:00Z');

    expect(withCertification.attempt.category).toBe('project_defense');
    expect(withCertification.attempt.accuracyPct).toBe(100);
    expect(withCertification.evidenceLog.confidence).toBe(5);
    // pass/fail is derived from the threshold, not asserted by the UI
    expect(withCertification.attempt.passed).toBe(
      withCertification.attempt.scorePct >= session.passingScorePct
    );
    expect(withCertification.attempt.passingScorePct).toBe(session.passingScorePct);
  });

  it('evaluates Mock Interview self-rated practice session', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'mock_interview')!;

    // (a) presence of a response + top confidence rating alone earns nothing
    const presentOnly: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      confidence: 5,
      userResponse: 'Answered STAR method behavioral question effectively.',
    }));
    const presence = evaluatePracticeAttempt(session, presentOnly, 1200, '2026-09-25T11:30:00Z');
    expect(presence.attempt.accuracyPct).toBe(0);
    expect(presence.attempt.scorePct).toBe(0);

    // (b) certified → scored
    const certified: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      isCorrect: true,
      confidence: 5,
      userResponse: 'Answered STAR method behavioral question effectively.',
    }));
    const { attempt } = evaluatePracticeAttempt(session, certified, 1200, '2026-09-25T11:30:00Z');

    expect(attempt.category).toBe('mock_interview');
    expect(attempt.accuracyPct).toBe(100);
    expect(attempt.scorePct).toBe(100);
  });

  it('generates adaptive signals correctly for weak and stale practice domains', () => {
    const mockAttempt: PracticeAttempt = {
      id: 'att-1',
      sessionId: 'practice-sql-01',
      sessionTitle: 'SQL JOIN Assessment',
      category: 'sql',
      domainId: 'sql',
      topicId: 'topic-sql-joins',
      date: '2026-09-10',
      completedAt: '2026-09-10T10:00:00Z', // 15 days ago
      totalTimeSeconds: 600,
      totalQuestions: 5,
      correctCount: 2,
      accuracyPct: 40,
      scorePct: 40,
      passed: false, // SQL session threshold is 70
      passingScorePct: 70,
      userAnswers: [],
    };

    const signals = evaluatePracticeSignals([mockAttempt], {}, []);
    expect(signals.lowAccuracy).toBe(true);

    const emptySignals = evaluatePracticeSignals([], {}, []);
    expect(emptySignals.assessmentDue).toBe(true);
  });

  it('provides single primary recommended practice session for Today page', () => {
    const rec = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], {}, []);
    expect(rec).toBeDefined();
    expect(rec?.session.title).toBeTruthy();
    expect(rec?.reason).toBeTruthy();
  });

  it('calculates practice category stats correctly', () => {
    const mockAttempt: PracticeAttempt = {
      id: 'att-2',
      sessionId: 'practice-apt-01',
      sessionTitle: 'Aptitude Speed Test',
      category: 'aptitude',
      domainId: 'aptitude',
      topicId: 'topic-aptitude-quant',
      date: '2026-09-25',
      completedAt: '2026-09-25T10:00:00Z',
      totalTimeSeconds: 300,
      totalQuestions: 10,
      correctCount: 8,
      accuracyPct: 80,
      scorePct: 80,
      passed: true, // aptitude session threshold is 70
      passingScorePct: 70,
      userAnswers: [],
    };

    const statsMap = getPracticeCategoryStats([mockAttempt]);
    const aptStats = statsMap['aptitude'];

    expect(aptStats).toBeDefined();
    expect(aptStats.attemptCount).toBe(1);
    expect(aptStats.avgScorePct).toBe(80);
  });

  it('ensures practice evidence does NOT complete roadmap tasks (no double counting)', () => {
    const mockTaskProgressMap: Record<string, TaskProgress> = {
      'task-os-1': {
        taskId: 'task-os-1',
        state: 'not_started',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: '2026-09-25T00:00:00Z',
      },
    };

    const session = PRACTICE_SESSIONS.find((s) => s.category === 'core_cs')!;
    const answers: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      selectedOption: typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined,
    }));

    const { attempt, evidenceLog } = evaluatePracticeAttempt(session, answers, 300, '2026-09-25T12:00:00Z');

    // Verify roadmap task state is unchanged
    expect(mockTaskProgressMap['task-os-1'].state).toBe('not_started');

    // Evidence log exists with sourceType 'practice_session'
    expect(evidenceLog).toBeDefined();
    expect(evidenceLog.sourceType).toBe('practice_session');
    expect(evidenceLog.sourceId).toBe(session.id);
    expect(attempt.sessionId).toBe(session.id);
  });
});

// ---------------------------------------------------------------------------
// C3 — practice / defense scoring honesty
//
// Non-MCQ items have no answer key anywhere in the dataset, so correctness is
// never inferred from response presence, response length or a confidence
// self-rating. `passingScorePct` is evaluated, not merely displayed.
// ---------------------------------------------------------------------------

const TODAY = '2026-09-27';

const mcqSession = (): PracticeSessionDefinition =>
  PRACTICE_SESSIONS.find((s) => s.category === 'aptitude') ?? PRACTICE_SESSIONS[0];

const nonMcqSession = (): PracticeSessionDefinition =>
  PRACTICE_SESSIONS.find((s) => s.category === 'project_defense')!;

/** MCQ answers: the first `k` correct, the remainder deliberately wrong. */
const answerFirstK = (session: PracticeSessionDefinition, k: number): PracticeUserAnswer[] =>
  session.questions.map((q, i) => {
    if (typeof q.correctAnswer !== 'number') return { questionId: q.id };
    const wrong = q.correctAnswer === 0 ? 1 : 0;
    return { questionId: q.id, selectedOption: i < k ? q.correctAnswer : wrong };
  });

const freshSlice = () => ({ practiceAttempts: [], skillStates: {}, evidenceLogs: [] });

describe('C3 — non-MCQ scoring is never inferred from response presence', () => {
  const defense = nonMcqSession();

  it('A1. zero answers → score 0', () => {
    const { attempt, evidenceLog } = evaluatePracticeAttempt(defense, [], 0, TODAY);

    expect(attempt.correctCount).toBe(0);
    expect(attempt.scorePct).toBe(0);
    expect(attempt.accuracyPct).toBe(0);
    expect(attempt.totalQuestions).toBe(defense.questions.length);
    expect(attempt.passed).toBe(false);
    expect(evidenceLog.score).toBe(0);
  });

  it('A2. one answered, remaining blank → blank items are not correct', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q, i) =>
      i === 0
        ? { questionId: q.id, isCorrect: true, confidence: 4, userResponse: 'Covered the trade-off and the risk.' }
        // exactly what the runner submits when the textarea is untouched:
        // confidence pre-filled to 3, response an empty string
        : { questionId: q.id, confidence: 3, userResponse: '' }
    );
    const { attempt } = evaluatePracticeAttempt(defense, answers, 300, TODAY);

    expect(attempt.correctCount).toBe(1);
    expect(attempt.accuracyPct).toBe(Math.round((1 / defense.questions.length) * 100));
    expect(attempt.scorePct).toBeLessThan(100);
    expect(answers.filter((a) => a.isCorrect === true)).toHaveLength(1);
    expect(answers.filter((a) => a.isCorrect === false)).toHaveLength(defense.questions.length - 1);
  });

  it('A3. all blank → never 100%', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q) => ({
      questionId: q.id,
      confidence: 3,
      userResponse: '   ',
    }));
    const { attempt, evidenceLog } = evaluatePracticeAttempt(defense, answers, 120, TODAY);

    expect(attempt.scorePct).toBe(0);
    expect(attempt.scorePct).not.toBe(100);
    expect(attempt.correctCount).toBe(0);
    expect(evidenceLog.score).not.toBe(100);
  });

  it('A4. response presence alone does not equal correctness', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q) => ({
      questionId: q.id,
      confidence: 5,
      userResponse: 'I wrote a long, substantive-looking answer that must not earn credit on its own.',
    }));
    const { attempt, evidenceLog } = evaluatePracticeAttempt(defense, answers, 200, TODAY);

    expect(attempt.correctCount).toBe(0);
    expect(attempt.scorePct).toBe(0);
    expect(evidenceLog.score).toBe(0);
    // the self-report is still on the record — recorded, never scored
    expect(attempt.userAnswers[0].userResponse).toContain('substantive');
    expect(attempt.userAnswers[0].confidence).toBe(5);
  });

  it('A5. explicit self-certification is scored and self-report stays represented', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q) => ({
      questionId: q.id,
      isCorrect: true,
      confidence: 4,
      userResponse: 'Answered fully.',
    }));
    const { attempt } = evaluatePracticeAttempt(defense, answers, 400, TODAY);

    expect(attempt.correctCount).toBe(defense.questions.length);
    expect(attempt.scorePct).toBe(100);
    expect(attempt.userAnswers).toHaveLength(defense.questions.length);
    expect(attempt.userAnswers.every((a) => a.confidence === 4)).toBe(true);
    expect(attempt.userAnswers.every((a) => typeof a.userResponse === 'string')).toBe(true);
    expect(attempt.passed).toBe(attempt.scorePct >= defense.passingScorePct);
  });
});

describe('C3 — passingScorePct is actually evaluated', () => {
  const base =
    PRACTICE_SESSIONS.find((s) => s.questions.length > 1 && s.questions.every((q) => q.questionType === 'mcq'))!;

  it('B. below / exactly at / above the threshold', () => {
    const n = base.questions.length;
    const k = Math.max(1, n - 1);
    const atScore = Math.round((k / n) * 100);

    const belowThreshold = { ...base, passingScorePct: atScore + 1 };
    const exactThreshold = { ...base, passingScorePct: atScore };
    const aboveThreshold = { ...base, passingScorePct: atScore - 1 };

    const score = (session: PracticeSessionDefinition) =>
      evaluatePracticeAttempt(session, answerFirstK(base, k), 100, TODAY).attempt;

    const below = score(belowThreshold);
    expect(below.scorePct).toBe(atScore);
    expect(below.passed).toBe(false); // 80 >= 81 is false

    const exact = score(exactThreshold);
    expect(exact.scorePct).toBe(atScore);
    expect(exact.passed).toBe(true); // inclusive: >= not >
    expect(exact.passingScorePct).toBe(atScore);

    const above = score(aboveThreshold);
    expect(above.scorePct).toBe(atScore);
    expect(above.passed).toBe(true);
    expect(above.passingScorePct).toBe(atScore - 1);
  });

  it('B2. a perfect score passes the session\'s own configured threshold', () => {
    const perfect = evaluatePracticeAttempt(base, answerFirstK(base, base.questions.length), 100, TODAY).attempt;
    expect(perfect.scorePct).toBe(100);
    expect(perfect.passed).toBe(true);
    expect(perfect.passingScorePct).toBe(base.passingScorePct);
  });

  it('B3. pass/fail is a property of the attempt, not re-derived by callers', () => {
    const attempt = evaluatePracticeAttempt(base, answerFirstK(base, 0), 100, TODAY).attempt;
    expect(attempt.passed).toBe(attempt.scorePct >= base.passingScorePct);
    expect(attempt.passed).toBe(false);
  });
});

describe('C3 — MCQ regression (keyed scoring unchanged)', () => {
  const s = mcqSession();

  it('C1. correct picks score, wrong picks and unanswered items do not', () => {
    const n = s.questions.length;

    const perfect = evaluatePracticeAttempt(s, answerFirstK(s, n), 100, TODAY).attempt;
    expect(perfect.correctCount).toBe(n);
    expect(perfect.scorePct).toBe(100);

    const none = evaluatePracticeAttempt(s, [], 0, TODAY).attempt;
    expect(none.correctCount).toBe(0);
    expect(none.scorePct).toBe(0);

    const allWrong = evaluatePracticeAttempt(s, answerFirstK(s, 0), 100, TODAY).attempt;
    expect(allWrong.correctCount).toBe(0);
    expect(allWrong.scorePct).toBe(0);

    const one = evaluatePracticeAttempt(s, answerFirstK(s, 1), 100, TODAY).attempt;
    expect(one.correctCount).toBe(1);
    expect(one.accuracyPct).toBe(Math.round((1 / n) * 100));
    expect(one.scorePct).toBe(one.accuracyPct);
  });

  it('C2. MCQ verdict depends only on the keyed option — confidence and text are ignored', () => {
    const wrongWithHighConfidence: PracticeUserAnswer[] = s.questions.map((q) => ({
      questionId: q.id,
      selectedOption: typeof q.correctAnswer === 'number' ? (q.correctAnswer === 0 ? 1 : 0) : undefined,
      confidence: 5,
      userResponse: 'Confident but wrong.',
    }));
    const wrong = evaluatePracticeAttempt(s, wrongWithHighConfidence, 60, TODAY).attempt;
    expect(wrong.correctCount).toBe(0);
    expect(wrong.scorePct).toBe(0);

    const correctWithBlankText: PracticeUserAnswer[] = s.questions.map((q) => ({
      questionId: q.id,
      selectedOption: typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined,
      confidence: 1,
      userResponse: '',
    }));
    const right = evaluatePracticeAttempt(s, correctWithBlankText, 60, TODAY).attempt;
    expect(right.correctCount).toBe(s.questions.length);
    expect(right.scorePct).toBe(100);
  });

  it('C3. score can never exceed 100 even with duplicate or stray answers', () => {
    const answers = [...answerFirstK(s, s.questions.length), ...answerFirstK(s, s.questions.length)];
    answers.push({ questionId: 'does-not-exist', isCorrect: true, confidence: 5 });
    const attempt = evaluatePracticeAttempt(s, answers, 60, TODAY).attempt;
    expect(attempt.scorePct).toBeLessThanOrEqual(100);
    expect(attempt.correctCount).toBeLessThanOrEqual(attempt.totalQuestions);
  });
});

describe('C3 — recordPracticeAttempt persistence & skill credit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('D1. stored scorePct and pass state match the evaluator output', () => {
    const s = mcqSession();
    const { attempt, evidenceLog } = evaluatePracticeAttempt(s, answerFirstK(s, 1), 100, TODAY);

    const state = applyPracticeAttempt(freshSlice(), attempt, evidenceLog, '2026-09-27T10:00:00.000Z');

    expect(state.practiceAttempts).toHaveLength(1);
    expect(state.practiceAttempts[0].scorePct).toBe(attempt.scorePct);
    expect(state.practiceAttempts[0].accuracyPct).toBe(attempt.accuracyPct);
    expect(state.practiceAttempts[0].passed).toBe(attempt.passed);
    expect(state.practiceAttempts[0].passingScorePct).toBe(s.passingScorePct);
    expect(state.practiceAttempts[0].correctCount).toBe(attempt.correctCount);

    // evidence carries the same honest score, and skill credit is derived from it
    expect(state.evidenceLogs[0].score).toBe(attempt.scorePct);
    expect(state.skillStates[evidenceLog.topicId].evidenceStrength).toBe(
      Math.round(attempt.scorePct * 0.2)
    );
    expect(state.skillStates[evidenceLog.topicId].freshness).toBe('fresh');
  });

  it('D2. a 0% attempt contributes 0 skill strength — no fabricated 100% evidence', () => {
    const defense = nonMcqSession();
    const { attempt, evidenceLog } = evaluatePracticeAttempt(defense, [], 0, TODAY);

    const state = applyPracticeAttempt(freshSlice(), attempt, evidenceLog, '2026-09-27T10:00:00.000Z');

    expect(attempt.scorePct).toBe(0);
    expect(attempt.passed).toBe(false);
    expect(evidenceLog.score).toBe(0);
    expect(state.skillStates[evidenceLog.topicId].evidenceStrength).toBe(0);
    expect(state.skillStates[evidenceLog.topicId].freshness).toBe('fresh');
    // previous strength is preserved, never reset upward
    const withPrior = applyPracticeAttempt(
      {
        ...freshSlice(),
        skillStates: { [evidenceLog.topicId]: { topicId: evidenceLog.topicId, domainId: evidenceLog.domainId, freshness: 'stale', evidenceStrength: 45 } },
      },
      attempt,
      evidenceLog,
      '2026-09-27T10:00:00.000Z'
    );
    expect(withPrior.skillStates[evidenceLog.topicId].evidenceStrength).toBe(45);
  });

  it('D3. evaluator output survives a save/reload round-trip', () => {
    const s = mcqSession();
    const { attempt, evidenceLog } = evaluatePracticeAttempt(
      s,
      answerFirstK(s, Math.max(1, s.questions.length - 1)),
      100,
      TODAY
    );
    const slice = applyPracticeAttempt(freshSlice(), attempt, evidenceLog, '2026-09-27T10:00:00.000Z');

    const defaults = StorageAdapter.loadState();
    const payload: AppExtendedStorageState = {
      ...defaults,
      practiceAttempts: slice.practiceAttempts,
      skillStates: { ...defaults.skillStates, ...slice.skillStates },
      evidenceLogs: slice.evidenceLogs,
    };
    StorageAdapter.saveState(payload);

    const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
    const stored = reloaded.practiceAttempts?.[0];

    expect(stored).toBeDefined();
    expect(stored?.scorePct).toBe(attempt.scorePct);
    expect(stored?.accuracyPct).toBe(attempt.accuracyPct);
    expect(stored?.correctCount).toBe(attempt.correctCount);
    expect(stored?.passed).toBe(attempt.passed);
    expect(stored?.passingScorePct).toBe(s.passingScorePct);
    expect(reloaded.skillStates[evidenceLog.topicId].evidenceStrength).toBe(
      Math.round(attempt.scorePct * 0.2)
    );
  });

  it('D4. existing practice history without the pass/fail field remains readable', () => {
    const legacy = {
      id: 'legacy-attempt-1',
      sessionId: 'practice-sql-01',
      sessionTitle: 'Legacy SQL attempt',
      category: 'sql',
      domainId: 'sql',
      date: '2026-09-01',
      completedAt: '2026-09-01T10:00:00.000Z',
      totalTimeSeconds: 300,
      scorePct: 75,
      accuracyPct: 75,
      correctCount: 3,
      totalQuestions: 4,
      userAnswers: [],
    } as unknown as PracticeAttempt;

    const defaults = StorageAdapter.loadState();
    const payload: AppExtendedStorageState = { ...defaults, practiceAttempts: [legacy] };
    const result = StorageAdapter.importJSON(StorageAdapter.exportJSON(payload));

    expect(result.success).toBe(true);
    expect(result.state?.practiceAttempts).toHaveLength(1);
    expect(result.state?.practiceAttempts?.[0].scorePct).toBe(75);
    expect((result.state?.practiceAttempts?.[0] as PracticeAttempt).passed).toBeUndefined();
  });
});

describe('C3 — edge cases', () => {
  const defense = nonMcqSession();
  const base = PRACTICE_SESSIONS[0];

  it('E1. empty response is not correct', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q) => ({
      questionId: q.id,
      isCorrect: true,
      confidence: 5,
      userResponse: '',
    }));
    const attempt = evaluatePracticeAttempt(defense, answers, 60, TODAY).attempt;
    expect(attempt.correctCount).toBe(0);
    expect(attempt.scorePct).toBe(0);
  });

  it('E2. whitespace-only response is not correct', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q) => ({
      questionId: q.id,
      isCorrect: true,
      confidence: 5,
      userResponse: '   \n\t   ',
    }));
    const attempt = evaluatePracticeAttempt(defense, answers, 60, TODAY).attempt;
    expect(attempt.correctCount).toBe(0);
    expect(attempt.scorePct).toBe(0);
  });

  it('E3. partially answered set: certified counts, blank and uncertified do not', () => {
    const answers: PracticeUserAnswer[] = defense.questions.map((q, i) => {
      if (i === 0) return { questionId: q.id, isCorrect: true, confidence: 5, userResponse: 'Full answer' };
      if (i === 1) return { questionId: q.id, confidence: 5, userResponse: 'Long response but never certified' };
      return { questionId: q.id, confidence: 3, userResponse: '' };
    });
    const attempt = evaluatePracticeAttempt(defense, answers, 240, TODAY).attempt;

    expect(attempt.totalQuestions).toBe(defense.questions.length);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.accuracyPct).toBe(Math.round((1 / defense.questions.length) * 100));
    expect(attempt.passed).toBe(attempt.scorePct >= defense.passingScorePct);
    expect(attempt.passed).toBe(false);
  });

  it('E4. zero-question session produces 0, never 100 or NaN', () => {
    const empty: PracticeSessionDefinition = { ...base, questions: [], questionCount: 0 };
    const { attempt, evidenceLog } = evaluatePracticeAttempt(empty, [], 0, TODAY);

    expect(attempt.totalQuestions).toBe(0);
    expect(attempt.correctCount).toBe(0);
    expect(attempt.accuracyPct).toBe(0);
    expect(attempt.scorePct).toBe(0);
    expect(Number.isNaN(attempt.scorePct)).toBe(false);
    expect(attempt.passed).toBe(false);
    expect(evidenceLog.score).toBe(0);
  });

  it('E5. missing or invalid passingScorePct fails closed without affecting the score', () => {
    const answers = answerFirstK(base, base.questions.length);
    const perfect = evaluatePracticeAttempt(base, answers, 60, TODAY).attempt;
    expect(perfect.scorePct).toBe(100);
    expect(perfect.passed).toBe(true);

    const noThreshold: PracticeSessionDefinition = {
      ...base,
      passingScorePct: undefined as unknown as number,
    };
    const missingRun = evaluatePracticeAttempt(noThreshold, answerFirstK(base, base.questions.length), 60, TODAY).attempt;
    expect(missingRun.scorePct).toBe(100); // score is unaffected
    expect(missingRun.passed).toBe(false); // …but no pass is claimed without a bar
    expect(missingRun.passingScorePct).toBeUndefined();

    const brokenThreshold: PracticeSessionDefinition = { ...base, passingScorePct: Number.NaN };
    const brokenRun = evaluatePracticeAttempt(brokenThreshold, answerFirstK(base, base.questions.length), 60, TODAY).attempt;
    expect(brokenRun.scorePct).toBe(100);
    expect(brokenRun.passed).toBe(false);
    expect(brokenRun.passingScorePct).toBeUndefined();
  });

  it('E6. a threshold of 0 is valid and passes any score', () => {
    const alwaysPass: PracticeSessionDefinition = { ...base, passingScorePct: 0 };
    const attempt = evaluatePracticeAttempt(alwaysPass, [], 0, TODAY).attempt;
    expect(attempt.scorePct).toBe(0);
    expect(attempt.passed).toBe(true);
    expect(attempt.passingScorePct).toBe(0);
  });
});
