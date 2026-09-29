// @vitest-environment jsdom
//
// C5 — Skill evidence source classification & manual-override persistence.
//
// These tests exercise the REAL writers in PlacementContext (task completion,
// DSA attempt, practice attempt, manual override) and then read the result back
// through the canonical skillsEngine readiness calculation, so the
// automatic-vs-manual distinction is verified end to end rather than against a
// hand-built fixture.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import { calculateTopicReadiness, type TopicReadiness } from '../engine/skillsEngine';
import { TOPICS, DOMAINS } from '../data/seedData';
import type {
  DSAAttempt,
  DSAProgress,
  EvidenceLog,
  PracticeAttempt,
  TopicSkillState,
} from '../types';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Ctx = ReturnType<typeof usePlacement>;

let mountedCtx: Ctx | null = null;

const Probe = () => {
  const current = usePlacement();
  // Published from an effect (not during render) so the probe stays pure.
  useEffect(() => {
    mountedCtx = current;
  });
  return null;
};

const getCtx = (): Ctx => {
  if (!mountedCtx) throw new Error('PlacementProvider is not mounted');
  return mountedCtx;
};

const TOPIC_ID = 'topic-dsa-arrays';

const seedBaseline = () => {
  localStorage.clear();
  StorageAdapter.saveState({
    ...(getDefaultStorageState() as AppExtendedStorageState),
  });
};

const mountApp = () =>
  render(
    <PlacementProvider>
      <Probe />
    </PlacementProvider>
  );

/** Automatic DSA attempt — must never be read back as a manual rating. */
const dsaAttempt = (): DSAAttempt => ({
  id: 'att-c5-dsa',
  problemId: 'dsa-001',
  date: getCtx().todayDate,
  result: 'pass',
  assistanceLevel: 'none',
  timeTakenMinutes: 25,
  createdAt: new Date().toISOString(),
});

const dsaProgress = (): DSAProgress => ({
  problemId: 'dsa-001',
  currentBox: 2,
  nextReviewAt: getCtx().todayDate,
  attemptCount: 1,
  passedIndependently: true,
  lastAttemptAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Automatic practice attempt — must never be read back as a manual rating. */
const practiceAttempt = (): PracticeAttempt => ({
  id: 'pa-c5-1',
  sessionId: 'coding-01',
  sessionTitle: 'Coding Fundamentals Check',
  category: 'coding',
  domainId: 'dsa',
  topicId: TOPIC_ID,
  date: getCtx().todayDate,
  completedAt: new Date().toISOString(),
  totalTimeSeconds: 600,
  scorePct: 80,
  accuracyPct: 80,
  correctCount: 4,
  totalQuestions: 5,
  passed: true,
  passingScorePct: 70,
  userAnswers: [],
});

const practiceLog = (): EvidenceLog => ({
  id: 'ev-c5-practice',
  topicId: TOPIC_ID,
  domainId: 'dsa',
  score: 80,
  confidence: 4,
  timestamp: new Date().toISOString(),
  sourceType: 'practice_session',
  sourceId: 'coding-01',
  details: 'Practice assessment recorded from Preparation',
});

/** Exactly what SkillOverrideModal hands to the context's manual writer. */
const manualRating = (strength: number): TopicSkillState => ({
  topicId: TOPIC_ID,
  domainId: 'dsa',
  lastPracticedAt: new Date().toISOString(),
  freshness: 'fresh',
  evidenceStrength: strength,
});

const readinessFor = (topicId = TOPIC_ID): TopicReadiness => {
  const topic = TOPICS.find((t) => t.id === topicId);
  const domain = DOMAINS.find((d) => d.id === topic!.domainId);
  return calculateTopicReadiness(
    topic!,
    domain!,
    getCtx().taskDefinitions,
    getCtx().taskProgress,
    getCtx().dsaProblems,
    getCtx().dsaProgress,
    getCtx().dsaAttempts,
    getCtx().evidenceLogs,
    getCtx().skillStates,
    getCtx().companyOverlays,
    getCtx().todayDate
  );
};

const manualRows = (readiness: TopicReadiness) =>
  readiness.supportingEvidence.filter((e) => e.sourceType === 'manual_override');

beforeEach(() => {
  seedBaseline();
});

afterEach(() => {
  cleanup();
  mountedCtx = null;
  localStorage.clear();
});

describe('C5 A — skill evidence source classification', () => {
  it('A1. a DSA attempt produces DSA evidence, not a manual rating override', () => {
    mountApp();

    act(() => {
      getCtx().logDSAAttempt(dsaAttempt(), dsaProgress(), 95);
    });

    const skill = getCtx().skillStates[TOPIC_ID];
    expect(skill).toBeDefined();
    expect(skill.evidenceStrength).toBeGreaterThan(0); // progression is kept
    expect(skill.manualOverride).toBeUndefined(); // …but never promoted to manual

    const log = getCtx().evidenceLogs[getCtx().evidenceLogs.length - 1];
    expect(log.sourceType).toBe('dsa_attempt');

    const readiness = readinessFor();
    expect(readiness.manualOverrideApplied).toBe(false);
    expect(manualRows(readiness)).toHaveLength(0);
    expect(readiness.supportingEvidence.some((e) => e.sourceType === 'dsa_problem')).toBe(true);
    expect(
      readiness.supportingEvidence.some(
        (e) => e.sourceType === 'evidence_log' && e.title.includes('dsa attempt')
      )
    ).toBe(true);
  });

  it('A2. a practice attempt produces practice evidence, not a manual rating override', () => {
    mountApp();

    act(() => {
      getCtx().recordPracticeAttempt(practiceAttempt(), practiceLog());
    });

    const skill = getCtx().skillStates[TOPIC_ID];
    expect(skill).toBeDefined();
    expect(skill.evidenceStrength).toBeGreaterThan(0);
    expect(skill.manualOverride).toBeUndefined();

    const log = getCtx().evidenceLogs[getCtx().evidenceLogs.length - 1];
    expect(log.sourceType).toBe('practice_session');

    const readiness = readinessFor();
    expect(readiness.manualOverrideApplied).toBe(false);
    expect(manualRows(readiness)).toHaveLength(0);
    expect(
      readiness.supportingEvidence.some(
        (e) => e.sourceType === 'evidence_log' && e.title.includes('practice session')
      )
    ).toBe(true);
  });

  it('A3. a preparation task completion produces task evidence, not a manual rating override', () => {
    mountApp();

    act(() => {
      getCtx().updateTaskState('task-101', 'completed');
    });

    const skill = getCtx().skillStates[TOPIC_ID];
    expect(skill).toBeDefined();
    expect(skill.manualOverride).toBeUndefined();

    const log = getCtx().evidenceLogs[getCtx().evidenceLogs.length - 1];
    expect(log.sourceType).toBe('daily_assignment');
    expect(log.sourceId).toBe('task-101');

    const readiness = readinessFor();
    expect(readiness.manualOverrideApplied).toBe(false);
    expect(manualRows(readiness)).toHaveLength(0);
    expect(readiness.supportingEvidence.some((e) => e.sourceType === 'task')).toBe(true);
    expect(
      readiness.supportingEvidence.some(
        (e) => e.sourceType === 'evidence_log' && e.title.includes('daily assignment')
      )
    ).toBe(true);
  });

  it('A4. only an explicit user rating is reported as a manual override', () => {
    mountApp();

    act(() => {
      getCtx().updateSkillState(manualRating(85));
    });

    expect(getCtx().skillStates[TOPIC_ID].manualOverride).toMatchObject({
      evidenceStrength: 85,
      freshness: 'fresh',
    });

    const readiness = readinessFor();
    expect(readiness.manualOverrideApplied).toBe(true);
    const rows = manualRows(readiness);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Manual Rating Override');
    expect(rows[0].scoreContribution).toBe(85);
    expect(rows[0].details).toContain('85/100');
  });

  it('A5. mixed evidence keeps every source classified by its own origin', () => {
    mountApp();

    act(() => {
      getCtx().updateTaskState('task-101', 'completed');
      getCtx().logDSAAttempt(dsaAttempt(), dsaProgress(), 95);
      getCtx().recordPracticeAttempt(practiceAttempt(), practiceLog());
      getCtx().updateSkillState(manualRating(70));
    });

    const readiness = readinessFor();

    // one row per origin, none re-labelled as manual
    expect(readiness.supportingEvidence.some((e) => e.sourceType === 'task')).toBe(true);
    expect(readiness.supportingEvidence.some((e) => e.sourceType === 'dsa_problem')).toBe(true);
    expect(
      readiness.supportingEvidence.filter((e) => e.title.includes('daily assignment'))
    ).toHaveLength(1);
    expect(
      readiness.supportingEvidence.filter((e) => e.title.includes('dsa attempt'))
    ).toHaveLength(1);
    expect(
      readiness.supportingEvidence.filter((e) => e.title.includes('practice session'))
    ).toHaveLength(1);
    expect(manualRows(readiness)).toHaveLength(1);
    expect(manualRows(readiness)[0].scoreContribution).toBe(70);

    // automatic evidence still counts — nothing was discarded
    expect(readiness.evidenceStrength).toBeGreaterThan(0);
    expect(readiness.evidenceClassification).toBe('demonstrated');
  });
});

describe('C5 B — manual override persistence', () => {
  it('B1. an override survives hydration and is never overwritten by later automatic evidence', () => {
    mountApp();

    act(() => {
      getCtx().updateSkillState(manualRating(85));
    });

    const stamped = getCtx().skillStates[TOPIC_ID];
    expect(stamped.manualOverride?.evidenceStrength).toBe(85);
    expect(readinessFor().manualOverrideApplied).toBe(true);

    // --- reload-equivalent hydration -------------------------------------
    const stored = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(stored.skillStates[TOPIC_ID].manualOverride?.evidenceStrength).toBe(85);

    // tear the app down and hydrate it again from what was persisted
    cleanup();
    mountedCtx = null;
    mountApp();
    expect(getCtx().skillStates[TOPIC_ID].manualOverride?.evidenceStrength).toBe(85);
    expect(readinessFor().manualOverrideApplied).toBe(true);

    // --- automatic evidence lands on the same topic ----------------------
    const strengthBefore = getCtx().skillStates[TOPIC_ID].evidenceStrength;
    const dsaProgressValue = dsaProgress();
    const practiceAttemptValue = practiceAttempt();
    const practiceLogValue = practiceLog();

    act(() => {
      getCtx().logDSAAttempt(dsaAttempt(), dsaProgressValue, 95);
      getCtx().recordPracticeAttempt(practiceAttemptValue, practiceLogValue);
    });

    const after = getCtx().skillStates[TOPIC_ID];
    // the user's record is distinct and intact
    expect(after.manualOverride?.evidenceStrength).toBe(85);
    expect(after.manualOverride?.updatedAt).toBe(stamped.manualOverride?.updatedAt);
    // skill progression on the same topic is still accumulated
    expect(after.evidenceStrength).toBeGreaterThanOrEqual(strengthBefore);
    // …and the readiness layer still reports exactly one manual row of 85
    const readiness = readinessFor();
    expect(readiness.manualOverrideApplied).toBe(true);
    const rows = manualRows(readiness);
    expect(rows).toHaveLength(1);
    expect(rows[0].scoreContribution).toBe(85);
    expect(rows[0].details).toContain('85/100');
  });
});
