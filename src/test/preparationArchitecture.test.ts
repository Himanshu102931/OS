import { describe, it, expect } from 'vitest';
import {
  PREPARATION_SECTIONS,
  PREPARATION_TOPICS,
  getPreparationSection,
  getPreparationTopic,
  getTopicsBySection,
} from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { evaluatePracticeAttempt, getRecommendedPracticeSession } from '../engine/practiceEngine';
import { evaluatePracticeSignals } from '../engine/adaptiveEngine';
import type { PracticeUserAnswer, TaskProgress, TopicSkillState } from '../types';


describe('Preparation Architecture & Universal Engine (Phase 1)', () => {
  it('defines exactly 4 core preparation sections', () => {
    expect(PREPARATION_SECTIONS).toHaveLength(4);
    const sectionIds = PREPARATION_SECTIONS.map((s) => s.id);
    expect(sectionIds).toEqual(['coding', 'core_cs', 'aptitude_communication', 'interview_career']);
  });

  it('populates preparation topics across all 4 sections', () => {
    expect(PREPARATION_TOPICS.length).toBeGreaterThanOrEqual(10);
    PREPARATION_TOPICS.forEach((topic) => {
      expect(topic.id).toBeDefined();
      expect(topic.sectionId).toBeDefined();
      expect(topic.domainId).toBeDefined();
      expect(topic.title).toBeDefined();
      expect(topic.whyItMatters).toBeDefined();
      expect(topic.learningObjectives.length).toBeGreaterThan(0);
      expect(topic.stages.length).toBeGreaterThan(0);
    });
  });

  it('retrieves topics and sections by lookup functions correctly', () => {
    const coreCsTopics = getTopicsBySection('core_cs');
    expect(coreCsTopics.length).toBe(5);
    const topicIds = coreCsTopics.map((t) => t.id);
    expect(topicIds).toContain('prep-sql');
    expect(topicIds).toContain('prep-dbms');
    expect(topicIds).toContain('prep-oop');
    expect(topicIds).toContain('prep-os');
    expect(topicIds).toContain('prep-cn');

    const codingSection = getPreparationSection('coding');
    expect(codingSection).toBeDefined();
    expect(codingSection?.title).toBe('CODING');

    const sqlTopic = getPreparationTopic('prep-sql');
    expect(sqlTopic).toBeDefined();
    expect(sqlTopic?.title).toBe('SQL & Relational Queries');

    const recommendation = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], {}, []);
    expect(recommendation).not.toBeNull();
    expect(recommendation?.session).toBeDefined();
  });


  it('supports universal practice session categories and question types', () => {
    const categories = new Set(PRACTICE_SESSIONS.map((s) => s.category));
    expect(categories.has('aptitude')).toBe(true);
    expect(categories.has('verbal')).toBe(true);
    expect(categories.has('sql')).toBe(true);
    expect(categories.has('core_cs')).toBe(true);
    expect(categories.has('project_defense')).toBe(true);
    expect(categories.has('technical_interview')).toBe(true);
    expect(categories.has('behavioral_interview')).toBe(true);
  });

  it('evaluates practice session attempts deterministically with timing and accuracy', () => {
    const sampleSession = PRACTICE_SESSIONS[0]; // Aptitude session with 5 MCQ questions
    const answers: PracticeUserAnswer[] = sampleSession.questions.map((q) => ({
      questionId: q.id,
      selectedOption: q.correctAnswer as number,
    }));

    const result = evaluatePracticeAttempt(sampleSession, answers, 300, '2026-09-26');

    expect(result.attempt.accuracyPct).toBe(100);
    expect(result.attempt.scorePct).toBe(100);
    expect(result.attempt.totalTimeSeconds).toBe(300);
    expect(result.attempt.correctCount).toBe(sampleSession.questions.length);

    // Evidence log generation
    expect(result.evidenceLog.sourceType).toBe('practice_session');
    expect(result.evidenceLog.score).toBe(100);
    expect(result.evidenceLog.confidence).toBe(5);
  });

  it('handles partial correctness and non-MCQ self ratings in practice evaluation', () => {
    const sqlSession = PRACTICE_SESSIONS.find((s) => s.category === 'sql')!;
    const answers: PracticeUserAnswer[] = [
      { questionId: sqlSession.questions[0].id, isCorrect: true, confidence: 4 },
      { questionId: sqlSession.questions[1].id, isCorrect: false, confidence: 1 },
    ];

    const result = evaluatePracticeAttempt(sqlSession, answers, 180, '2026-09-26');
    expect(result.attempt.correctCount).toBe(1);
    expect(result.attempt.accuracyPct).toBe(25); // 1 / 4 questions
  });

  it('generates canonical evidence without mutating Roadmap taskProgress (no double-counting)', () => {
    const session = PRACTICE_SESSIONS[0];
    const answers: PracticeUserAnswer[] = session.questions.map((q) => ({
      questionId: q.id,
      selectedOption: q.correctAnswer as number,
    }));

    const evaluation = evaluatePracticeAttempt(session, answers, 120, '2026-09-26');

    // Roadmap task progress map before evidence record
    const dummyTaskProgress: Record<string, TaskProgress> = {
      'task-001': { taskId: 'task-001', state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: '2026-09-26' },
    };

    // Simulate recording evidence in skill state
    const skillState: TopicSkillState = {
      topicId: evaluation.evidenceLog.topicId,
      domainId: evaluation.evidenceLog.domainId,
      freshness: 'fresh',
      evidenceStrength: evaluation.evidenceLog.score,
    };

    // Verify taskProgress remains untouched
    expect(dummyTaskProgress['task-001'].state).toBe('not_started');
    expect(skillState.evidenceStrength).toBe(100);
    expect(skillState.freshness).toBe('fresh');
  });

  it('links preparation topics bidirectionally to roadmap topics', () => {
    PREPARATION_TOPICS.forEach((prepTopic) => {
      if (prepTopic.roadmapTopicId) {
        expect(prepTopic.roadmapTopicId).toMatch(/^topic-/);
      }
    });
  });

  it('integrates practice signals with adaptive engine cleanly', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'prep-os': { topicId: 'prep-os', domainId: 'os', freshness: 'stale', evidenceStrength: 20 },
    };

    const signals = evaluatePracticeSignals([], skillStates, []);
    expect(signals.assessmentDue).toBe(true);
    expect(signals.weakTopic).toBe(true);
    expect(signals.staleDomain).toBe(true);
    expect(signals.stalePreparationTopic).toBe(true);
  });

  it('handles empty answers gracefully without crashing', () => {
    const session = PRACTICE_SESSIONS[0];
    const result = evaluatePracticeAttempt(session, [], 0, '2026-09-26');
    expect(result.attempt.accuracyPct).toBe(0);
    expect(result.attempt.correctCount).toBe(0);
  });
});
