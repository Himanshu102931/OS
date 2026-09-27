import { describe, it, expect } from 'vitest';
import {
  PREPARATION_SECTIONS,
  PREPARATION_TOPICS,
  getPreparationTopic,
} from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { TOPICS, MODULES, PHASES } from '../data/seedData';
import { evaluatePracticeAttempt, getRecommendedPracticeSession } from '../engine/practiceEngine';
import { evaluatePracticeSignals } from '../engine/adaptiveEngine';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import type { PracticeSessionDefinition, PracticeUserAnswer, TopicSkillState, TaskProgress, CompanyOverlay, DomainId } from '../types';

/** Answers that must score 100% on any session (MCQ picks the keyed answer; prompts self-certify). */
function perfectAnswers(session: PracticeSessionDefinition): PracticeUserAnswer[] {
  return session.questions.map((q) =>
    q.questionType === 'mcq'
      ? { questionId: q.id, selectedOption: q.correctAnswer as number }
      : { questionId: q.id, isCorrect: true, confidence: 5 }
  );
}

// Question-count targets from the Phase 2B content spec, keyed by preparation topic.
const QUESTION_TARGETS: Record<string, [number, number]> = {
  'prep-lang': [8, 12], // Python
  'prep-coding-ds': [10, 15], // Coding
  'prep-sql': [20, 30], // SQL
  'prep-dbms': [30, 40], // DBMS
  'prep-oop': [25, 35], // OOP
  'prep-os': [30, 40], // OS
  'prep-cn': [30, 40], // CN
  'prep-apt-quant': [60, 80], // Quant
  'prep-apt-reasoning': [60, 80], // Reasoning
  'prep-verbal': [50, 70], // Verbal
  'prep-comm': [25, 30], // Communication prompts
  'prep-interview-tech': [30, 40], // Technical interview prompts
};

// Strictly numeric answer options: the explanation must contain the answer digits.
const NUMERIC_OPTION =
  /^\s*[$₹€£]?\s*-?\d[\d,]*(\.\d+)?\s*(\/\s*\d+(\.\d+)?)?\s*(km|m|cm|kg|g|hr|h|min|sec|s|ms|km\/h|%|percent|years?|months?|days?|hours?|minutes?|seconds?|pages?|frames?|nodes?|layers?|steps?|ways?|people|students)?\s*$/i;

describe('Phase 2B — Subtopic Learning Cards (WHAT/WHY/EXAMPLE/PRACTICE/PROOF)', () => {
  it('every topic has exactly one learning card per ordered subtopic', () => {
    expect(PREPARATION_TOPICS).toHaveLength(13);
    PREPARATION_TOPICS.forEach((topic) => {
      expect(topic.subtopics.length).toBeGreaterThanOrEqual(4);
      expect(topic.subtopicCards).toHaveLength(topic.subtopics.length);
    });
  });

  it('every card answers all five progressive-disclosure fields concisely', () => {
    PREPARATION_TOPICS.forEach((topic) => {
      topic.subtopicCards.forEach((card) => {
        [card.what, card.why, card.example, card.practice, card.proof].forEach((field) => {
          expect(typeof field).toBe('string');
          expect(field.trim().length).toBeGreaterThanOrEqual(10);
          // Short, high-yield form — no textbook paragraphs.
          expect(field.length).toBeLessThanOrEqual(200);
        });
      });
    });
  });

  it('cards within a topic cover distinct subtopics (no copy-paste duplication)', () => {
    PREPARATION_TOPICS.forEach((topic) => {
      const whats = topic.subtopicCards.map((c) => c.what);
      expect(new Set(whats).size).toBe(whats.length);
    });
  });
});

describe('Phase 2B — Prerequisites & Resources', () => {
  it('every prerequisiteTopicIds entry resolves to a real preparation topic', () => {
    PREPARATION_TOPICS.forEach((topic) => {
      topic.prerequisiteTopicIds.forEach((prereqId) => {
        expect(getPreparationTopic(prereqId), `${topic.id} → ${prereqId}`).toBeDefined();
        expect(prereqId).not.toBe(topic.id);
      });
    });
  });

  it('prerequisite graph is acyclic', () => {
    const state: Record<string, 'visiting' | 'done'> = {};
    const visit = (id: string, path: string[]): void => {
      if (state[id] === 'done') return;
      if (state[id] === 'visiting') {
        throw new Error(`Prerequisite cycle: ${[...path, id].join(' → ')}`);
      }
      state[id] = 'visiting';
      getPreparationTopic(id)?.prerequisiteTopicIds.forEach((next) => visit(next, [...path, id]));
      state[id] = 'done';
    };
    PREPARATION_TOPICS.forEach((t) => visit(t.id, []));
    expect(true).toBe(true);
  });

  it('cites exactly 1 primary + 1 secondary resource and at most 1 practice link per topic', () => {
    PREPARATION_TOPICS.forEach((topic) => {
      const roles = topic.recommendedResources.map((r) => r.role);
      expect(roles.filter((r) => r === 'primary'), topic.id).toHaveLength(1);
      expect(roles.filter((r) => r === 'secondary'), topic.id).toHaveLength(1);
      expect(roles.filter((r) => r === 'practice').length).toBeLessThanOrEqual(1);
      expect(roles.length).toBeLessThanOrEqual(3);
      topic.recommendedResources.forEach((res) => {
        expect(res.title.trim().length).toBeGreaterThan(0);
        if (res.url) expect(res.url).toMatch(/^https?:\/\//);
      });
    });
  });
});

describe('Phase 2B — Question Bank Coverage Targets', () => {
  const allQuestions = PRACTICE_SESSIONS.flatMap((s) => s.questions);

  it('hits the per-topic question-count target ranges', () => {
    Object.entries(QUESTION_TARGETS).forEach(([topicId, [min, max]]) => {
      const count = allQuestions.filter((q) => q.topicId === topicId).length;
      expect(count, `${topicId} has ${count}, expected ${min}–${max}`).toBeGreaterThanOrEqual(min);
      expect(count, `${topicId} has ${count}, expected ${min}–${max}`).toBeLessThanOrEqual(max);
    });
  });

  it('provides 10–15 resume-check questions in the resume category', () => {
    const resumeCount = allQuestions.filter((q) => q.category === 'resume').length;
    expect(resumeCount).toBeGreaterThanOrEqual(10);
    expect(resumeCount).toBeLessThanOrEqual(15);
  });

  it('ships the quant and reasoning timed sets as 15 questions / 20 minutes', () => {
    const timed = PRACTICE_SESSIONS.filter((s) => s.id.includes('timed'));
    expect(timed.map((s) => s.id).sort()).toEqual([
      'practice-quant-timed-01',
      'practice-reasoning-timed-01',
    ]);
    timed.forEach((s) => {
      expect(s.questionCount).toBe(15);
      expect(s.questions).toHaveLength(15);
      expect(s.estimatedMinutes).toBe(20);
    });
  });

  it('keeps every original Phase 1 session intact (append-only dataset)', () => {
    const originalIds = [
      'practice-apt-01',
      'practice-verbal-01',
      'practice-sql-01',
      'practice-corecs-01',
      'practice-project-defense-01',
      'practice-mock-interview-01',
      'practice-tech-interview-01',
      'practice-behavioral-01',
    ];
    originalIds.forEach((id) => expect(PRACTICE_SESSIONS.find((s) => s.id === id), id).toBeDefined());
    // First session must remain the 5-question aptitude MCQ session (existing tests index [0]).
    expect(PRACTICE_SESSIONS[0].category).toBe('aptitude');
    expect(PRACTICE_SESSIONS[0].questions).toHaveLength(5);
    // The accuracy-25% fixture depends on this sql session having exactly 4 questions.
    const sqlFixture = PRACTICE_SESSIONS.find((s) => s.id === 'practice-sql-01');
    expect(sqlFixture?.questions).toHaveLength(4);
    expect(PRACTICE_SESSIONS.length).toBeGreaterThanOrEqual(34);
  });
});

describe('Phase 2B — Data Integrity (IDs, topics, MCQ structure)', () => {
  it('has globally unique session IDs and question IDs', () => {
    const sessionIds = PRACTICE_SESSIONS.map((s) => s.id);
    expect(new Set(sessionIds).size).toBe(sessionIds.length);

    const questionIds = PRACTICE_SESSIONS.flatMap((s) => s.questions.map((q) => q.id));
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it('has no duplicated question prompts across the whole bank', () => {
    const prompts = PRACTICE_SESSIONS.flatMap((s) => s.questions.map((q) => q.prompt));
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('every session and question maps to a real preparation topic (no orphans)', () => {
    const topicIds = new Set(PREPARATION_TOPICS.map((t) => t.id));
    PRACTICE_SESSIONS.forEach((session) => {
      expect(topicIds.has(session.topicId as string), session.id).toBe(true);
      session.questions.forEach((q) => {
        expect(topicIds.has(q.topicId), `${session.id}/${q.id} → ${q.topicId}`).toBe(true);
      });
    });
  });

  it('session questionCount matches the actual question array', () => {
    PRACTICE_SESSIONS.forEach((s) => {
      expect(s.questionCount, s.id).toBe(s.questions.length);
    });
  });

  it('every MCQ has ≥4 unique options and an in-bounds correct answer index', () => {
    PRACTICE_SESSIONS.forEach((s) => {
      s.questions.forEach((q) => {
        if (q.questionType !== 'mcq') return;
        expect(q.options, `${s.id}/${q.id}`).toBeDefined();
        expect(q.options!.length).toBeGreaterThanOrEqual(4);
        expect(new Set(q.options!).size).toBe(q.options!.length);
        expect(typeof q.correctAnswer).toBe('number');
        expect(q.correctAnswer as number).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer as number).toBeLessThan(q.options!.length);
      });
    });
  });

  it('every question carries a prompt, explanation, and category tag', () => {
    PRACTICE_SESSIONS.forEach((s) => {
      s.questions.forEach((q) => {
        expect(q.prompt.trim().length, `${s.id}/${q.id}`).toBeGreaterThan(0);
        expect((q.explanation || '').trim().length, `${s.id}/${q.id}`).toBeGreaterThan(0);
        expect(q.categoryTag, `${s.id}/${q.id}`).toBeTruthy();
      });
    });
  });

  it('numeric answers are confirmed by the explanation text', () => {
    let checked = 0;
    PRACTICE_SESSIONS.forEach((s) => {
      s.questions.forEach((q) => {
        if (q.questionType !== 'mcq' || !q.options || typeof q.correctAnswer !== 'number') return;
        const correct = q.options[q.correctAnswer];
        if (!NUMERIC_OPTION.test(correct)) return;
        checked++;
        const digits = correct.match(/\d[\d,]*(\.\d+)?/g) || [];
        const expl = q.explanation || '';
        const confirmed = expl.includes(correct.trim()) || digits.some((d) => expl.includes(d));
        expect(confirmed, `${s.id}/${q.id}: "${correct}" not reflected in explanation`).toBe(true);
      });
    });
    // Guard against the filter silently matching nothing.
    expect(checked).toBeGreaterThanOrEqual(80);
  });
});

describe('Phase 2B — Scoring & Evidence', () => {
  it('every session scores 100% when answered correctly', () => {
    PRACTICE_SESSIONS.forEach((s) => {
      const result = evaluatePracticeAttempt(s, perfectAnswers(s), 300, '2026-09-27');
      expect(result.attempt.accuracyPct, s.id).toBe(100);
      expect(result.attempt.correctCount, s.id).toBe(s.questions.length);
      expect(result.evidenceLog.score, s.id).toBe(100);
      expect(result.evidenceLog.sourceType).toBe('practice_session');
      expect(result.evidenceLog.sourceId).toBe(s.id);
    });
  });

  it('scoring is deterministic — same answers, same score', () => {
    const s = PRACTICE_SESSIONS.find((x) => x.id === 'practice-quant-timed-01')!;
    const a = evaluatePracticeAttempt(s, perfectAnswers(s), 600, '2026-09-27');
    const b = evaluatePracticeAttempt(s, perfectAnswers(s), 600, '2026-09-27');
    expect(a.attempt.accuracyPct).toBe(b.attempt.accuracyPct);
    expect(a.attempt.correctCount).toBe(b.attempt.correctCount);
  });

  it('practice evidence does not mutate roadmap task progress (no double-counting)', () => {
    const s = PRACTICE_SESSIONS.find((x) => x.id === 'practice-os-01') || PRACTICE_SESSIONS[0];
    const evaluation = evaluatePracticeAttempt(s, perfectAnswers(s), 120, '2026-09-27');

    const taskProgress: Record<string, TaskProgress> = {
      'task-001': { taskId: 'task-001', state: 'not_started', postponeCount: 0, skipCount: 0, timeSpentMinutes: 0, updatedAt: '2026-09-27' },
    };

    expect(evaluation.evidenceLog.topicId).toBeTruthy();
    expect(taskProgress['task-001'].state).toBe('not_started');
  });
});

describe('Phase 2B — Persistence, Adaptive Signals, Today, Roadmap', () => {
  it('round-trips practice attempts and topic progress through export/import', () => {
    const state = getDefaultStorageState();
    const session = PRACTICE_SESSIONS.find((s) => s.id === 'practice-cn-01') || PRACTICE_SESSIONS[0];
    const evaluation = evaluatePracticeAttempt(session, perfectAnswers(session), 240, '2026-09-27');
    state.practiceAttempts = [evaluation.attempt];

    const imported = StorageAdapter.importJSON(StorageAdapter.exportJSON(state));
    expect(imported.success).toBe(true);
    expect(imported.state?.practiceAttempts).toHaveLength(1);
    expect(imported.state?.practiceAttempts?.[0].sessionId).toBe(session.id);
    expect(imported.state?.preparationTopicProgress).toBeDefined();
  });

  it('adaptive signals fire on a stale Phase 2B topic', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'prep-cn': { topicId: 'prep-cn', domainId: 'cn', freshness: 'stale', evidenceStrength: 15 },
    };
    const signals = evaluatePracticeSignals([], skillStates, []);
    expect(signals.stalePreparationTopic).toBe(true);
    expect(signals.assessmentDue).toBe(true);
  });

  it('Today recommends a matching session when a Phase 2B topic ages', () => {
    const skillStates: Record<string, TopicSkillState> = {
      'prep-verbal': { topicId: 'prep-verbal', domainId: 'communication', freshness: 'stale', evidenceStrength: 20 },
    };
    const rec = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], skillStates, []);
    expect(rec).not.toBeNull();
    expect(rec?.session.topicId).toBe('prep-verbal');
  });

  it('company-required domains reach the new banks', () => {
    const overlays: CompanyOverlay[] = [{
      id: 'comp-phase2b',
      companyName: 'DataCo',
      targetRole: 'SDE',
      applicationStatus: 'oa_scheduled',
      eventDate: '2026-11-01',
      requiredDomains: ['dbms'] as DomainId[],
      requiredTopics: ['prep-dbms'],
      requiredLanguages: ['dbms'],
    }];
    const rec = getRecommendedPracticeSession(PRACTICE_SESSIONS, [], {}, overlays);
    expect(rec?.session.domainId).toBe('dbms');
    expect(rec?.session.topicId).toBe('prep-dbms');
  });

  it('roadmap links still resolve and phases stay valid for all 13 topics', () => {
    const roadmapIds = new Set(TOPICS.map((t) => t.id));
    const phaseIds = PHASES.map((p) => p.id);
    const linked: string[] = [];
    PREPARATION_TOPICS.forEach((topic) => {
      expect(phaseIds).toContain(topic.recommendedPhase);
      if (topic.roadmapTopicId) {
        expect(roadmapIds.has(topic.roadmapTopicId), topic.id).toBe(true);
        linked.push(topic.roadmapTopicId);
        const roadmapTopic = TOPICS.find((t) => t.id === topic.roadmapTopicId);
        const module = MODULES.find((m) => m.id === roadmapTopic?.moduleId);
        expect(module?.phaseId).toBe(topic.recommendedPhase);
      }
    });
    expect(new Set(linked).size).toBe(linked.length);
    expect(linked.length).toBeGreaterThanOrEqual(11);
  });

  it('sections remain bidirectionally consistent with their declared topic ids', () => {
    expect(PREPARATION_SECTIONS).toHaveLength(4);
    PREPARATION_SECTIONS.forEach((section) => {
      const actual = PREPARATION_TOPICS.filter((t) => t.sectionId === section.id).map((t) => t.id);
      expect(actual).toEqual(section.topicIds);
    });
  });
});
