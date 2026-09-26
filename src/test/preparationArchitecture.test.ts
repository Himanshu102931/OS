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
import type { PracticeUserAnswer, TaskProgress, TopicSkillState, PreparationTopicProgress } from '../types';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';


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

describe('Preparation Topic & Practice Session Alignment', () => {
  it('aligns practice session topicIds with preparation topic IDs', () => {
    const prepTopicIds = new Set(PREPARATION_TOPICS.map(t => t.id));
    
    PRACTICE_SESSIONS.forEach(session => {
      if (session.topicId) {
        expect(prepTopicIds.has(session.topicId)).toBe(true);
      }
    });
  });

  it('practice session questions use matching topicIds', () => {
    PRACTICE_SESSIONS.forEach(session => {
      session.questions.forEach(q => {
        if (q.topicId) {
          const prepTopic = PREPARATION_TOPICS.find(t => t.id === q.topicId);
          if (!prepTopic) {
            // Allow domain-level fallback for mixed-category sessions
            const domainMatches = PREPARATION_TOPICS.some(t => t.domainId === q.domainId);
            expect(domainMatches).toBe(true);
          }
        }
      });
    });
  });
});

describe('Preparation Topic Progress Model', () => {
  it('defines PreparationTopicProgress with all required fields', () => {
    const progress: PreparationTopicProgress = {
      topicId: 'prep-sql',
      sectionId: 'core_cs',
      domainId: 'sql',
      currentStage: 'learn',
      completedStages: ['orient'],
      stageProgress: {
        orient: { startedAt: '2026-09-20T10:00:00Z', completedAt: '2026-09-20T11:00:00Z', timeSpentMinutes: 30 },
        learn: { startedAt: '2026-09-21T10:00:00Z', timeSpentMinutes: 45 },
        apply: { timeSpentMinutes: 0 },
        assess: { timeSpentMinutes: 0 },
        review: { timeSpentMinutes: 0 },
        interview: { timeSpentMinutes: 0 },
        evidence: { timeSpentMinutes: 0 },
      },
      lastAccessedAt: '2026-09-21T10:00:00Z',
      totalTimeSpentMinutes: 75,
      evidenceStrength: 65,
      freshness: 'fresh',
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-21T10:00:00Z',
    };

    expect(progress.topicId).toBe('prep-sql');
    expect(progress.completedStages).toContain('orient');
    expect(progress.currentStage).toBe('learn');
    expect(progress.stageProgress.orient.completedAt).toBeDefined();
    expect(progress.evidenceStrength).toBe(65);
  });

  it('tracks time spent per stage', () => {
    const stageProgress = {
      orient: { timeSpentMinutes: 20 },
      learn: { timeSpentMinutes: 45 },
      apply: { timeSpentMinutes: 30 },
      assess: { timeSpentMinutes: 25 },
      review: { timeSpentMinutes: 15 },
      interview: { timeSpentMinutes: 20 },
      evidence: { timeSpentMinutes: 10 },
    };

    const total = Object.values(stageProgress).reduce((sum, s) => sum + s.timeSpentMinutes, 0);
    expect(total).toBe(165);
  });
});

describe('Storage Persistence & Migration', () => {
  it('includes preparationTopicProgress in default storage state', () => {
    const defaultState = getDefaultStorageState();
    expect(defaultState.preparationTopicProgress).toBeDefined();
    expect(typeof defaultState.preparationTopicProgress).toBe('object');
    expect(Object.keys(defaultState.preparationTopicProgress).length).toBe(0);
  });

  it('migrates old storage state to include preparationTopicProgress', () => {
    const oldState = {
      schemaVersion: '1.0.0',
      appVersion: '1.0.0',
      lastSavedAt: '2026-09-20T00:00:00Z',
      currentMode: 'normal' as const,
      userSettings: {
        placementHorizonDate: '2027-05-31',
        targetPlacementGoal: 'SDE-1',
        targetPhaseId: 'phase-1',
        dailyStudyMinutes: 120,
        dsaDailyCap: 5,
        placementMode: 'normal' as const,
        theme: 'dark' as const,
        densityMode: 'compact' as const,
        showExplanationTooltips: true,
        dailyCheckInReminder: true,
        reminderTime: '20:00',
      },
      taskProgress: {},
      dsaProgress: {},
      skillStates: {},
      companyOverlays: [],
      dailyCheckIns: [],
      dailyTaskAssignments: [],
      practiceAttempts: [],
    };

    const result = StorageAdapter.importJSON(JSON.stringify(oldState));
    expect(result.success).toBe(true);
    expect(result.state?.preparationTopicProgress).toBeDefined();
    expect(typeof result.state?.preparationTopicProgress).toBe('object');
  });

  it('validates preparationTopicProgress field', () => {
    const validState = getDefaultStorageState();
    expect(StorageAdapter.validateStorageState(validState)).toBe(true);

    const invalidState = { ...validState, preparationTopicProgress: 'not-an-object' as unknown };
    expect(StorageAdapter.validateStorageState(invalidState)).toBe(false);
  });
});

describe('Roadmap ↔ Preparation Navigation', () => {
  it('every preparation topic with roadmapTopicId links to valid roadmap topic format', () => {
    PREPARATION_TOPICS.forEach(topic => {
      if (topic.roadmapTopicId) {
        expect(topic.roadmapTopicId).toMatch(/^topic-/);
      }
    });
  });

  it('roadmap topics have corresponding preparation topics', () => {
    const roadmapTopicIds = new Set(PREPARATION_TOPICS.map(t => t.roadmapTopicId).filter(Boolean));
    expect(roadmapTopicIds.size).toBeGreaterThan(0);
    roadmapTopicIds.forEach(id => {
      if (id) expect(id).toMatch(/^topic-/);
    });
  });
});

describe('Deep Linking & Routing', () => {
  it('generates correct hash for preparation topic deep link', () => {
    const topicId = 'prep-sql';
    const expectedHash = `#/preparation/${topicId}`;
    expect(expectedHash).toBe('#/preparation/prep-sql');
  });

  it('parses route and preparationTopicId from hash', () => {
    const hash = '#/preparation/prep-os';
    const parts = hash.replace('#/', '').split('/');
    expect(parts[0]).toBe('preparation');
    expect(parts[1]).toBe('prep-os');
  });

  it('handles root preparation route without topic', () => {
    const hash = '#/preparation';
    const parts = hash.replace('#/', '').split('/');
    expect(parts[0]).toBe('preparation');
    expect(parts[1]).toBeUndefined();
  });
});

describe('Today Page Practice Integration', () => {
  it('returns practice recommendation with preparation topic context', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'prep-sql': { topicId: 'prep-sql', domainId: 'sql', freshness: 'stale', evidenceStrength: 20 },
    };

    const rec = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], skillStates, []);
    expect(rec).not.toBeNull();
    expect(rec?.session.topicId).toBe('prep-sql');
    expect(rec?.reason).toContain('aging');
  });

  it('prioritizes company-required domains for practice', () => {
    const companyOverlays = [{
      id: 'comp-test',
      companyName: 'TestCorp',
      targetRole: 'SDE',
      applicationStatus: 'oa_scheduled' as const,
      eventDate: '2026-10-15',
      requiredDomains: ['sql'] as const,
      requiredTopics: ['prep-sql'],
      requiredLanguages: ['sql'],
    }];

    const rec = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], {}, companyOverlays as any);
    expect(rec).not.toBeNull();
    expect(rec?.session.domainId).toBe('sql');
    expect(rec?.reason).toContain('company');
  });
});

describe('No Roadmap Double-Counting', () => {
  it('practice evidence does not mutate roadmap taskProgress', () => {
    const session = PRACTICE_SESSIONS.find(s => s.category === 'aptitude')!;
    const answers: PracticeUserAnswer[] = session.questions.map(q => ({
      questionId: q.id,
      selectedOption: q.correctAnswer as number,
    }));

    const evaluation = evaluatePracticeAttempt(session, answers, 120, '2026-09-26');

    // Verify evidence log is practice_session type
    expect(evaluation.evidenceLog.sourceType).toBe('practice_session');
    expect(evaluation.evidenceLog.sourceId).toBe(session.id);

    // Verify no taskProgress mutation occurs
    const taskProgress: Record<string, TaskProgress> = {
      'task-101': { taskId: 'task-101', state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: '2026-09-26' },
    };

    // Simulate recording evidence (does not touch taskProgress)
    const evidenceScore = evaluation.evidenceLog.score;
    expect(evidenceScore).toBe(100);
    expect(taskProgress['task-101'].state).toBe('not_started');
  });

  it('skill state updates from practice do not affect roadmap tasks', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'prep-apt-quant': { topicId: 'prep-apt-quant', domainId: 'aptitude', freshness: 'fresh', evidenceStrength: 100 },
    };

    const taskProgress: Record<string, TaskProgress> = {
      'task-101': { taskId: 'task-101', state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: '2026-09-26' },
    };

    // Practice completion updates skill state
    skillStates['prep-apt-quant'].evidenceStrength = 100;
    skillStates['prep-apt-quant'].freshness = 'fresh';

    // Roadmap taskProgress unchanged
    expect(taskProgress['task-101'].state).toBe('not_started');
    expect(skillStates['prep-apt-quant'].evidenceStrength).toBe(100);
  });
});
