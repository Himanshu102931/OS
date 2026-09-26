import { describe, it, expect } from 'vitest';
import { PREPARATION_TOPICS, getPreparationTopic } from '../data/preparationDataset';
import { evaluateTopicPreparedness, applyStageCompletion } from '../engine/preparationEngine';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import type {
  PracticeAttempt,
  PreparationTopicProgress,
  TopicStageId,
} from '../types';

const ALL_STAGES: TopicStageId[] = [
  'orient',
  'learn',
  'apply',
  'assess',
  'review',
  'interview',
  'evidence',
];

function buildProgress(
  completedStages: TopicStageId[],
  overrides: Partial<PreparationTopicProgress> = {}
): PreparationTopicProgress {
  const stageProgress = Object.fromEntries(
    ALL_STAGES.map((s) => [
      s,
      {
        startedAt: completedStages.includes(s) ? '2026-09-20T10:00:00Z' : undefined,
        completedAt: completedStages.includes(s) ? '2026-09-20T11:00:00Z' : undefined,
        timeSpentMinutes: completedStages.includes(s) ? 30 : 0,
      },
    ])
  ) as PreparationTopicProgress['stageProgress'];

  return {
    topicId: 'prep-sql',
    sectionId: 'core_cs',
    domainId: 'sql',
    currentStage: completedStages[completedStages.length - 1] || 'orient',
    completedStages,
    stageProgress,
    lastAccessedAt: '2026-09-21T10:00:00Z',
    totalTimeSpentMinutes: completedStages.length * 30,
    evidenceStrength: 0,
    freshness: 'untested',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
    ...overrides,
  };
}

function buildAttempt(accuracyPct: number, id = 'att-1', topicId = 'prep-sql'): PracticeAttempt {
  return {
    id,
    sessionId: 'practice-sql-01',
    sessionTitle: 'SQL Query Scenarios & Optimization',
    category: 'sql',
    domainId: 'sql',
    topicId,
    date: '2026-09-25',
    completedAt: '2026-09-25T10:00:00Z',
    totalTimeSeconds: 600,
    totalQuestions: 4,
    correctCount: Math.round((accuracyPct / 100) * 4),
    accuracyPct,
    scorePct: accuracyPct,
    userAnswers: [],
  };
}

describe('Preparedness Model — Coverage + Application + Assessment + Evidence', () => {
  const sqlTopic = getPreparationTopic('prep-sql')!;

  it('reports a fresh topic as not_started with all proofs missing', () => {
    const result = evaluateTopicPreparedness({ topic: sqlTopic, attempts: [] });

    expect(result.readiness).toBe('not_started');
    expect(result.currentLevel).toBe(0);
    expect(result.targetLevel).toBe(4);
    expect(result.covered).toBe(false);
    expect(result.coveragePct).toBe(0);
    expect(result.practiced).toBe(false);
    expect(result.assessmentPerformance).toBeNull();
    expect(result.evidenceStrength).toBe(0);
    expect(result.missingProof).toHaveLength(5);
    expect(result.nextAction).toContain('Orient and Learn');
  });

  it('advances a contiguous level rung as each proof pillar is earned', () => {
    // Coverage: orient + learn
    const covered = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn']),
      attempts: [],
    });
    expect(covered.covered).toBe(true);
    expect(covered.coveragePct).toBe(100);
    expect(covered.currentLevel).toBe(1);
    expect(covered.readiness).toBe('learning');

    // Application: apply stage
    const practiced = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply']),
      attempts: [],
    });
    expect(practiced.practiced).toBe(true);
    expect(practiced.currentLevel).toBe(2);
    expect(practiced.readiness).toBe('practicing');

    // Assessment: passing attempt
    const assessed = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply']),
      attempts: [buildAttempt(85)],
    });
    expect(assessed.assessmentPerformance).toBe(85);
    expect(assessed.currentLevel).toBe(3);
    expect(assessed.readiness).toBe('assessed');

    // Retention: fresh evidence
    const retained = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply'], { evidenceStrength: 75, freshness: 'fresh' }),
      attempts: [buildAttempt(85)],
      skillState: { evidenceStrength: 75, freshness: 'fresh' },
    });
    expect(retained.currentLevel).toBe(4);
    expect(retained.readiness).toBe('ready'); // targetLevel 4 reached

    // Interview proof: level 5
    const defended = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply', 'interview'], {
        evidenceStrength: 75,
        freshness: 'fresh',
      }),
      attempts: [buildAttempt(85)],
      skillState: { evidenceStrength: 75, freshness: 'fresh' },
    });
    expect(defended.interviewProof).toBe(true);
    expect(defended.currentLevel).toBe(5);
    expect(defended.readiness).toBe('ready');
  });

  it('infers coverage from a passing assessment when stage progress is absent', () => {
    const result = evaluateTopicPreparedness({
      topic: sqlTopic,
      attempts: [buildAttempt(88)],
      skillState: { evidenceStrength: 70, freshness: 'fresh' },
    });

    expect(result.covered).toBe(true);
    expect(result.coveragePct).toBe(100);
    expect(result.currentLevel).toBe(4);
    expect(result.readiness).toBe('ready');
  });

  it('does not equate stage completion percentage with readiness', () => {
    // 5 of 7 stages complete (71%) but no assessment proof and no evidence.
    const result = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply', 'assess', 'review']),
      attempts: [],
    });

    expect(result.coveragePct).toBe(100);
    expect(result.practiced).toBe(true);
    expect(result.currentLevel).toBe(3); // assessed via stage, but retention missing
    expect(result.readiness).not.toBe('ready');
    expect(result.missingProof.join(' ')).toContain('Retention');
    expect(result.missingProof.join(' ')).toContain('Interview');
  });

  it('marks a targetLevel-3 topic ready at level 3 while a level-2 topic stays practicing', () => {
    const quant = getPreparationTopic('prep-apt-quant')!;
    const atLevel3 = evaluateTopicPreparedness({
      topic: quant,
      progress: buildProgress(['orient', 'learn', 'apply']),
      attempts: [buildAttempt(80, 'att-q1', 'prep-apt-quant')],
    });
    expect(atLevel3.targetLevel).toBe(3);
    expect(atLevel3.currentLevel).toBe(3);
    expect(atLevel3.readiness).toBe('ready');

    const atLevel2 = evaluateTopicPreparedness({
      topic: quant,
      progress: buildProgress(['orient', 'learn', 'apply']),
      attempts: [],
    });
    expect(atLevel2.readiness).toBe('practicing');
    expect(atLevel2.currentLevel).toBe(2);
    expect(atLevel2.assessmentPerformance).toBeNull(); // no proof, no score
  });

  it('treats stale evidence as not retained even with high strength', () => {
    const result = evaluateTopicPreparedness({
      topic: sqlTopic,
      progress: buildProgress(['orient', 'learn', 'apply'], { evidenceStrength: 90, freshness: 'stale' }),
      attempts: [buildAttempt(85)],
      skillState: { evidenceStrength: 90, freshness: 'stale' },
    });

    expect(result.evidenceStrength).toBe(90);
    expect(result.currentLevel).toBe(3);
    expect(result.nextAction).toContain('stale');
    expect(result.missingProof.join(' ')).toContain('Retention');
  });

  it('filters attempts by topic id and reports the best accuracy as an integer', () => {
    const otherTopicAttempt = { ...buildAttempt(100, 'att-other'), topicId: 'prep-os' };
    const result = evaluateTopicPreparedness({
      topic: sqlTopic,
      attempts: [buildAttempt(55, 'att-1'), buildAttempt(78, 'att-2'), otherTopicAttempt],
    });

    expect(result.attemptCount).toBe(2);
    expect(result.assessmentPerformance).toBe(78);
    expect(Number.isInteger(result.assessmentPerformance)).toBe(true);
  });

  it('evaluates every preparation topic without crashing on empty inputs', () => {
    PREPARATION_TOPICS.forEach((topic) => {
      const result = evaluateTopicPreparedness({ topic, attempts: [] });
      expect(result.topicId).toBe(topic.id);
      expect(result.currentLevel).toBeGreaterThanOrEqual(0);
      expect(result.currentLevel).toBeLessThanOrEqual(5);
      expect(result.missingProof.length).toBeGreaterThan(0);
      expect(result.nextAction.length).toBeGreaterThan(0);
    });
  });
});

describe('Stage Completion Recorder', () => {
  const sqlTopic = getPreparationTopic('prep-sql')!;
  const now = '2026-09-26T09:00:00Z';

  it('creates a new progress record when none exists', () => {
    const progress = applyStageCompletion(sqlTopic, undefined, 'orient', now);

    expect(progress.topicId).toBe('prep-sql');
    expect(progress.completedStages).toEqual(['orient']);
    expect(progress.stageProgress.orient.completedAt).toBe(now);
    expect(progress.createdAt).toBe(now);
    expect(ALL_STAGES.every((s) => progress.stageProgress[s] !== undefined)).toBe(true);
  });

  it('is idempotent and advances the current stage to the next incomplete one', () => {
    const first = applyStageCompletion(sqlTopic, undefined, 'orient', now);
    const second = applyStageCompletion(sqlTopic, first, 'orient', '2026-09-26T10:00:00Z');

    expect(second.completedStages).toEqual(['orient']); // no duplicate
    expect(second.stageProgress.orient.completedAt).toBe(now); // original timestamp kept
    expect(second.currentStage).toBe('learn'); // next stage in curriculum order
    expect(second.updatedAt).toBe('2026-09-26T10:00:00Z');
    expect(second.createdAt).toBe(now);
  });

  it('never mutates the previous progress object', () => {
    const existing = applyStageCompletion(sqlTopic, undefined, 'orient', now);
    const snapshot = JSON.parse(JSON.stringify(existing));
    applyStageCompletion(sqlTopic, existing, 'learn', '2026-09-26T11:00:00Z');
    expect(existing).toEqual(snapshot);
  });

  it('produces progress that passes storage validation and round-trips', () => {
    const progress = applyStageCompletion(sqlTopic, undefined, 'orient', now);
    const state = {
      ...getDefaultStorageState(),
      preparationTopicProgress: { 'prep-sql': progress },
    };

    expect(StorageAdapter.validateStorageState(state)).toBe(true);

    const imported = StorageAdapter.importJSON(StorageAdapter.exportJSON(state));
    expect(imported.success).toBe(true);
    expect(imported.state?.preparationTopicProgress['prep-sql'].completedStages).toEqual(['orient']);
  });

  it('feeds stage completion into the preparedness model', () => {
    const progress = applyStageCompletion(sqlTopic, undefined, 'orient', now);
    const withLearn = applyStageCompletion(sqlTopic, progress, 'learn', now);
    const result = evaluateTopicPreparedness({ topic: sqlTopic, progress: withLearn, attempts: [] });

    expect(result.covered).toBe(true);
    expect(result.currentLevel).toBe(1);
    expect(result.readiness).toBe('learning');
  });
});
