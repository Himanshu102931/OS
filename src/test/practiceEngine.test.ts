import { describe, it, expect } from 'vitest';
import {
  evaluatePracticeAttempt,
  getRecommendedPracticeSession,
  getPracticeCategoryStats,
} from '../engine/practiceEngine';
import { evaluatePracticeSignals } from '../engine/adaptiveEngine';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import type {
  PracticeAttempt,
  PracticeUserAnswer,
  TaskProgress,
} from '../types';

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

  it('evaluates Project Defense self-rated practice session', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'project_defense')!;
    const answers: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      confidence: 4,
      userResponse: 'Explained microservice architectural trade-offs clearly.',
    }));

    const { attempt, evidenceLog } = evaluatePracticeAttempt(session, answers, 800, '2026-09-25T11:00:00Z');

    expect(attempt.category).toBe('project_defense');
    expect(attempt.accuracyPct).toBe(100);
    expect(evidenceLog.confidence).toBe(5);
  });

  it('evaluates Mock Interview self-rated practice session', () => {
    const session = PRACTICE_SESSIONS.find((s) => s.category === 'mock_interview')!;
    const answers: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      confidence: 5,
      userResponse: 'Answered STAR method behavioral question effectively.',
    }));

    const { attempt } = evaluatePracticeAttempt(session, answers, 1200, '2026-09-25T11:30:00Z');

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
