// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBaselineAttempt,
  scoreAssessmentAttempt,
  buildFullReassessmentAttempt,
  runFullReassessment,
  checkLevelRegression,
  checkLevelConfirmation,
  applyConfidenceTimeDecay,
  deriveAssessmentProfileReadout,
  generateAssessmentPlanInputs,
  transitionAttempt,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { FULL_REASSESSMENT_DEFINITION } from '../data/assessment/definitions';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import type {
  AssessmentState,
  AssessmentResponse,
  DomainAssessmentResult,
  DomainId,
} from '../types';

describe('Phase F: Level Regression & Full Reassessment Specification', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // Helper to create a standard domain assessment result
  function createDomainResult(overrides: Partial<DomainAssessmentResult> = {}): DomainAssessmentResult {
    return {
      domainId: 'dsa',
      abilityScore: 55,
      level: 3,
      confidence: 'medium',
      status: 'assessed',
      coverage: {
        topicsCovered: 5,
        topicsTotal: 8,
        competenciesCovered: ['comp-1', 'comp-2', 'comp-3'],
        difficultyBands: [1, 2, 3],
      },
      assessmentDate: '2026-09-01T10:00:00.000Z',
      provisional: true,
      attemptId: 'attempt-base-1',
      kind: 'diagnostic_assessment',
      ...overrides,
    };
  }

  // Helper to create responses for a domain
  function createResponsesForDomain(
    domainId: DomainId,
    results: Array<{ difficulty: 1 | 2 | 3 | 4; competency: string; result: 'correct' | 'incorrect' | 'dont_know' }>
  ): { responses: AssessmentResponse[]; items: typeof BASELINE_ASSESSMENT_ITEMS } {
    const domainItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === domainId);
    const responses: AssessmentResponse[] = results.map((r, idx) => {
      const item = domainItems[idx] || domainItems[0];
      return {
        id: `resp-${domainId}-${idx}`,
        attemptId: 'attempt-test-1',
        itemId: item.id,
        response: r.result === 'correct' ? (item.key ?? 0) : -1,
        result: r.result,
        timeSpentSeconds: 45,
        errorCategories: r.result === 'incorrect' ? ['E-CONCEPT'] : [],
        scoredCredit: r.result === 'correct' ? 1.0 : 0.0,
        weightApplied: 1.0,
      };
    });
    return { responses, items: domainItems };
  }

  // Helper to build a completed mock baseline state
  function createMockCompletedBaselineState(): AssessmentState {
    const attempt = buildBaselineAttempt();
    attempt.status = 'submitted';
    attempt.startedAt = '2026-09-01T08:00:00.000Z';
    attempt.endedAt = '2026-09-01T10:00:00.000Z';

    const responses: AssessmentResponse[] = BASELINE_ASSESSMENT_ITEMS.map((item, idx) => ({
      id: `resp-${item.id}`,
      attemptId: attempt.id,
      itemId: item.id,
      response: idx % 3 === 0 ? -1 : (item.key ?? 0),
      result: idx % 3 === 0 ? 'incorrect' : 'correct',
      timeSpentSeconds: 60,
      errorCategories: idx % 3 === 0 ? (item.errorCategories.length > 0 ? item.errorCategories : ['E-CONCEPT']) : [],
      scoredCredit: idx % 3 === 0 ? 0.0 : 1.0,
      weightApplied: 1.0,
      responseConfidence: idx % 3 === 0 ? 'confident' : 'somewhat',
    }));

    const scoring = scoreAssessmentAttempt(attempt, responses);

    return {
      attempts: [scoring.attempt],
      responses,
      exposures: scoring.exposures,
      domainResults: scoring.domainResults,
      snapshots: [scoring.snapshot],
      weaknessSignals: scoring.weaknessSignals,
      profile: {
        baselineCompletedAt: scoring.attempt.endedAt,
        pendingSunday: false,
      },
    };
  }

  // ==========================================================================
  // 1. One bad result does not cause regression (§17.1)
  // ==========================================================================
  it('1. one bad result does not cause regression', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 2, competency: 'comp-1', result: 'incorrect' },
    ]);

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 0,
      scoredResponses: responses,
      difficultyBands: [2],
      domainItems: items,
      priorDomainResults: [current],
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.regressedLevel).toBe(3);
    expect(regression.gates.sufficientEvidence).toBe(false);
  });

  // ==========================================================================
  // 2. Insufficient evidence blocks regression (§17.1 #1)
  // ==========================================================================
  it('2. insufficient evidence blocks regression', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    // Only 2 scored responses (requires >= 3)
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
    ]);

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 0,
      scoredResponses: responses,
      difficultyBands: [1, 2],
      domainItems: items,
      priorDomainResults: [current],
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.gates.sufficientEvidence).toBe(false);
    expect(regression.regressedLevel).toBe(3);
  });

  // ==========================================================================
  // 3. Difficulty-band requirement (§17.1 #1)
  // ==========================================================================
  it('3. difficulty-band requirement', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    // 3 responses, but all in 1 difficulty band (requires >= 2 bands)
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 1, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 1, competency: 'comp-3', result: 'incorrect' },
    ]);

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 0,
      scoredResponses: responses,
      difficultyBands: [1], // Only 1 band
      domainItems: items,
      priorDomainResults: [current],
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.gates.sufficientEvidence).toBe(false);
    expect(regression.regressedLevel).toBe(3);
  });

  // ==========================================================================
  // 4. Confidence requirement (§17.1 #2)
  // ==========================================================================
  it('4. confidence requirement', () => {
    // Current level has 'low' confidence (requires >= 'medium')
    const current = createDomainResult({ level: 3, abilityScore: 45, confidence: 'low' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 10,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [current],
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.gates.confidencePrecondition).toBe(false);
    expect(regression.regressedLevel).toBe(3);
  });

  // ==========================================================================
  // 5. Recent low observation requirement (§17.1 #3)
  // ==========================================================================
  it('5. recent low observation requirement', () => {
    // Level 3 (band min = 40). Drop threshold = 8, so newAbility <= 32.
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    // New ability is 28 (below band min 40 by 12 points >= 8), but NO prior observation in last 45 days is below-band
    const priorHigh1 = createDomainResult({
      attemptId: 'prior-1',
      abilityScore: 58,
      level: 3,
      assessmentDate: '2026-09-10T10:00:00.000Z',
    });
    const priorHigh2 = createDomainResult({
      attemptId: 'prior-2',
      abilityScore: 52,
      level: 3,
      assessmentDate: '2026-09-20T10:00:00.000Z',
    });

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 28,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [current, priorHigh1, priorHigh2],
      priorEvidenceLogs: [],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.gates.repeatedContradiction).toBe(false);
  });

  // ==========================================================================
  // 6. Prior-observation requirement (§17.1 #4)
  // ==========================================================================
  it('6. prior-observation requirement', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    // 3 responses with 1 correct: non-catastrophic
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'correct' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    // Only 1 prior observation (just the initial baseline result)
    const priorObservation = createDomainResult({
      attemptId: 'prior-below',
      abilityScore: 30, // below band
      level: 2,
      assessmentDate: '2026-09-20T10:00:00.000Z',
    });

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 28, // drop from 40 is 12 (not >= 25 catastrophic)
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorObservation], // only 1 prior observation
      priorEvidenceLogs: [],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(false);
    expect(regression.gates.priorObservationThreshold).toBe(false);
  });

  // ==========================================================================
  // 7. Catastrophic-result exception (§17.1 #4 exception)
  // ==========================================================================
  it('7. catastrophic-result exception', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    // Catastrophic drop: 0 correct out of 3 across 2 difficulty bands
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    // Even with only 1 prior observation:
    const priorBelow = createDomainResult({
      attemptId: 'prior-1',
      abilityScore: 30,
      level: 2,
      assessmentDate: '2026-09-15T10:00:00.000Z',
    });

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 0, // Catastrophic 0 score
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorBelow],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(true);
    expect(regression.isCatastrophicException).toBe(true);
    expect(regression.regressedLevel).toBe(2); // Capped at -1
  });

  // ==========================================================================
  // 8. Maximum -1 regression (§17.1 #5)
  // ==========================================================================
  it('8. maximum -1 regression', () => {
    // Current is Level 4 (band min = 65), confidence 'medium'
    const current = createDomainResult({ level: 4, abilityScore: 70, confidence: 'medium' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    // Two prior below-band observations in last 45 days
    const prior1 = createDomainResult({
      attemptId: 'p1',
      abilityScore: 35,
      level: 2,
      assessmentDate: '2026-09-10T10:00:00.000Z',
    });
    const prior2 = createDomainResult({
      attemptId: 'p2',
      abilityScore: 38,
      level: 2,
      assessmentDate: '2026-09-20T10:00:00.000Z',
    });

    // Score is 10 (would map to Level 1)
    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 10,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [prior1, prior2],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(true);
    // Even though ability 10 is Level 1, drop is capped at -1: 4 -> 3!
    expect(regression.regressedLevel).toBe(3);
    expect(regression.levelChange).toBe(-1);
  });

  // ==========================================================================
  // 9. Allowed -2 regression condition (§17.2)
  // ==========================================================================
  it('9. allowed -2 regression condition', () => {
    // Level 5 (band min = 85), confidence = 'high'
    const current = createDomainResult({ level: 5, abilityScore: 90, confidence: 'high' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    // Consecutive below-band assessment with competency contradictions (ability <= 85 - 8 = 77)
    const priorConsecutive = createDomainResult({
      attemptId: 'prior-event-1',
      abilityScore: 60, // below band 85 by 25 points
      level: 3,
      confidence: 'high',
      assessmentDate: '2026-09-25T10:00:00.000Z',
    });

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 50,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorConsecutive, priorConsecutive],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(true);
    expect(regression.isMultiStepException).toBe(true);
    expect(regression.levelChange).toBe(-2);
    expect(regression.regressedLevel).toBe(3); // 5 - 2 = 3
  });

  // ==========================================================================
  // 10. Impossible 4 -> 1 regression protection (§17.2)
  // ==========================================================================
  it('10. impossible 4 -> 1 regression protection', () => {
    // Current is Level 4 with high confidence
    const current = createDomainResult({ level: 4, abilityScore: 75, confidence: 'high' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    const priorConsecutive = createDomainResult({
      attemptId: 'prior-event-1',
      abilityScore: 40,
      level: 3,
      confidence: 'high',
      assessmentDate: '2026-09-25T10:00:00.000Z',
    });

    const regression = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 0,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorConsecutive, priorConsecutive],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(regression.hasRegressed).toBe(true);
    // 4 -> 1 is strictly forbidden: regressed level must be 2, NEVER 1!
    expect(regression.regressedLevel).toBe(2);
    expect(regression.regressedLevel).not.toBe(1);
  });

  // ==========================================================================
  // 11. Deterministic regression decision
  // ==========================================================================
  it('11. deterministic regression decision', () => {
    const current = createDomainResult({ level: 3, abilityScore: 55, confidence: 'medium' });
    const { responses, items } = createResponsesForDomain('dsa', [
      { difficulty: 1, competency: 'comp-1', result: 'incorrect' },
      { difficulty: 2, competency: 'comp-2', result: 'incorrect' },
      { difficulty: 3, competency: 'comp-3', result: 'incorrect' },
    ]);

    const priorBelow1 = createDomainResult({
      attemptId: 'p1',
      abilityScore: 30,
      level: 2,
      assessmentDate: '2026-09-10T10:00:00.000Z',
    });
    const priorBelow2 = createDomainResult({
      attemptId: 'p2',
      abilityScore: 28,
      level: 2,
      assessmentDate: '2026-09-20T10:00:00.000Z',
    });

    const run1 = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 25,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorBelow1, priorBelow2],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    const run2 = checkLevelRegression({
      currentResult: current,
      newAbilityScore: 25,
      scoredResponses: responses,
      difficultyBands: [1, 2, 3],
      domainItems: items,
      priorDomainResults: [priorBelow1, priorBelow2],
      attemptDate: '2026-10-01T10:00:00.000Z',
    });

    expect(run1).toEqual(run2);
  });

  // ==========================================================================
  // 12. Level confirmation after 2 consistent subsequent assessments (§10.4)
  // ==========================================================================
  it('12. level confirmation after 2 consistent subsequent assessments', () => {
    // Current level is 3 with 'medium' confidence
    const obs1 = createDomainResult({ attemptId: 'obs-1', level: 3, confidence: 'medium' });
    const obs2 = createDomainResult({ attemptId: 'obs-2', level: 4, confidence: 'medium' }); // within ±1 level

    const confirmation = checkLevelConfirmation({
      currentLevel: 3,
      currentConfidence: 'medium',
      priorDomainResults: [obs1, obs2],
      domainId: 'dsa',
    });

    expect(confirmation.isConfirmed).toBe(true);
    expect(confirmation.consistentObservationsCount).toBe(2);
  });

  // ==========================================================================
  // 13. Confirmation blocked with low confidence (§10.4)
  // ==========================================================================
  it('13. confirmation blocked with low confidence', () => {
    const obs1 = createDomainResult({ attemptId: 'obs-1', level: 3, confidence: 'medium' });
    const obs2 = createDomainResult({ attemptId: 'obs-2', level: 3, confidence: 'medium' });

    // Current confidence is low -> cannot confirm
    const confirmation = checkLevelConfirmation({
      currentLevel: 3,
      currentConfidence: 'low',
      priorDomainResults: [obs1, obs2],
      domainId: 'dsa',
    });

    expect(confirmation.isConfirmed).toBe(false);
  });

  // ==========================================================================
  // 14. full_reassessment kind and lifecycle (§19)
  // ==========================================================================
  it('14. full_reassessment kind and lifecycle', () => {
    const attempt = buildFullReassessmentAttempt();
    expect(attempt.kind).toBe('full_reassessment');
    expect(attempt.status).toBe('in_progress');
    expect(attempt.timeLimitSeconds).toBe(180 * 60);
    expect(attempt.definitionId).toBe(FULL_REASSESSMENT_DEFINITION.id);

    // Transition lifecycle
    const submitted = transitionAttempt(attempt, 'submitted');
    expect(submitted.status).toBe('submitted');
    expect(submitted.endedAt).toBeDefined();
  });

  // ==========================================================================
  // 15. Manual-only reassessment initiation (§19.1)
  // ==========================================================================
  it('15. manual-only reassessment initiation', () => {
    const { attempt } = runFullReassessment();
    expect(attempt.kind).toBe('full_reassessment');
    expect(attempt.selectedItemIds.length).toBeGreaterThan(0);
    // Explicit call creates attempt; no automatic timer/scheduler attached
    expect(attempt.status).toBe('in_progress');
  });

  // ==========================================================================
  // 16. History/snapshot preservation (§19.2)
  // ==========================================================================
  it('16. history/snapshot preservation', () => {
    const state = createMockCompletedBaselineState();
    expect(state.snapshots.length).toBe(1);
    const initialSnapshotId = state.snapshots[0].id;

    // Run and score a full reassessment
    const reassessAttempt = buildFullReassessmentAttempt(state);
    const responses: AssessmentResponse[] = reassessAttempt.selectedItemIds.map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: reassessAttempt.id,
      itemId,
      response: 0,
      result: 'correct',
      timeSpentSeconds: 40,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    }));

    const scoring = scoreAssessmentAttempt(
      reassessAttempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      FULL_REASSESSMENT_DEFINITION,
      state.exposures,
      state.weaknessSignals,
      state.domainResults
    );

    // New snapshot created with trigger 'manual' and kind 'full_reassessment'
    expect(scoring.snapshot.kind).toBe('full_reassessment');
    expect(scoring.snapshot.trigger).toBe('manual');
    expect(scoring.snapshot.id).not.toBe(initialSnapshotId);
  });

  // ==========================================================================
  // 17. Current-profile update after reassessment (§19.2)
  // ==========================================================================
  it('17. current-profile update after reassessment', () => {
    const state = createMockCompletedBaselineState();
    const reassessAttempt = buildFullReassessmentAttempt(state);
    reassessAttempt.status = 'submitted';
    reassessAttempt.endedAt = '2026-10-10T12:00:00.000Z';

    // In reassessment, score 100% on DSA items
    const responses: AssessmentResponse[] = reassessAttempt.selectedItemIds.map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: reassessAttempt.id,
      itemId,
      response: 0,
      result: 'correct',
      timeSpentSeconds: 40,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    }));

    const scoring = scoreAssessmentAttempt(
      reassessAttempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      FULL_REASSESSMENT_DEFINITION,
      state.exposures,
      state.weaknessSignals,
      state.domainResults
    );

    const updatedState: AssessmentState = {
      ...state,
      attempts: [...state.attempts, scoring.attempt],
      domainResults: [...state.domainResults, ...scoring.domainResults],
      snapshots: [...state.snapshots, scoring.snapshot],
    };

    const readout = deriveAssessmentProfileReadout(updatedState);
    expect(readout.isAssessed).toBe(true);
    expect(readout.latestAttemptKind).toBe('full_reassessment');
    const dsaProfile = readout.domainProfiles.find((dp) => dp.domainId === 'dsa');
    expect(dsaProfile?.latestAssessmentKind).toBe('full_reassessment');
  });

  // ==========================================================================
  // 18. Evidence sourceType 'test' (§23.1)
  // ==========================================================================
  it('18. evidence sourceType test', () => {
    const attempt = buildFullReassessmentAttempt();
    const responses: AssessmentResponse[] = attempt.selectedItemIds.slice(0, 10).map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: attempt.id,
      itemId,
      response: 0,
      result: 'correct',
      timeSpentSeconds: 30,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    }));

    const scoring = scoreAssessmentAttempt(
      attempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      FULL_REASSESSMENT_DEFINITION
    );

    expect(scoring.evidenceLogs.length).toBeGreaterThan(0);
    for (const log of scoring.evidenceLogs) {
      expect(log.sourceType).toBe('test');
      expect(log.sourceId).toBe(attempt.id);
    }
  });

  // ==========================================================================
  // 19. No DSA/practice/Leitner/pattern-mastery mutation (§17.3, §26.2)
  // ==========================================================================
  it('19. no DSA/practice/Leitner/pattern-mastery mutation', () => {
    const defaultState = getDefaultStorageState();
    const initialDsaProgress = JSON.stringify(defaultState.dsaProgress);
    const initialTasks = JSON.stringify(defaultState.taskProgress);

    const attempt = buildFullReassessmentAttempt();
    const responses: AssessmentResponse[] = attempt.selectedItemIds.map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: attempt.id,
      itemId,
      response: -1,
      result: 'incorrect',
      timeSpentSeconds: 30,
      errorCategories: ['E-SYNTAX'],
      scoredCredit: 0.0,
      weightApplied: 1.0,
    }));

    scoreAssessmentAttempt(attempt, responses, BASELINE_ASSESSMENT_ITEMS, FULL_REASSESSMENT_DEFINITION);

    // Verify storage defaults/data are completely unmutated
    expect(JSON.stringify(defaultState.dsaProgress)).toBe(initialDsaProgress);
    expect(JSON.stringify(defaultState.taskProgress)).toBe(initialTasks);
  });

  // ==========================================================================
  // 20. Persistence / reload recovery (§27)
  // ==========================================================================
  it('20. persistence/reload recovery', () => {
    const attempt = buildFullReassessmentAttempt();
    const state: AppExtendedStorageState = {
      ...getDefaultStorageState(),
      assessmentState: {
        attempts: [attempt],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
      },
    };

    StorageAdapter.saveState(state);
    const loaded = StorageAdapter.loadState();

    expect(loaded.assessmentState?.attempts.length).toBe(1);
    expect(loaded.assessmentState?.attempts[0].kind).toBe('full_reassessment');
    expect(loaded.assessmentState?.attempts[0].status).toBe('in_progress');
  });

  // ==========================================================================
  // 21. Invalid lifecycle transitions (§31)
  // ==========================================================================
  it('21. invalid lifecycle transitions', () => {
    const attempt = buildFullReassessmentAttempt();
    const submitted = transitionAttempt(attempt, 'submitted');

    // Attempting to transition from submitted back to in_progress should throw
    expect(() => transitionAttempt(submitted, 'in_progress')).toThrow();
  });

  // ==========================================================================
  // 22. Planner / readout integration (§26.1)
  // ==========================================================================
  it('22. planner/readout integration', () => {
    const regressedResult = createDomainResult({
      domainId: 'dsa',
      level: 2, // Regressed from 3 to 2
      abilityScore: 35,
      confidence: 'medium',
    });

    const planInputs = generateAssessmentPlanInputs([regressedResult], []);
    const dsaStartingPoint = planInputs.startingPoints.find((sp) => sp.domainId === 'dsa');
    const dsaEmphasis = planInputs.domainEmphases.dsa;

    // Regressed level to 2 yields 'easy' starting difficulty and elevated review frequency
    expect(dsaStartingPoint?.recommendedDifficulty).toBe('easy');
    expect(dsaEmphasis.reviewFrequencyMultiplier).toBeGreaterThanOrEqual(1.5);
  });

  // ==========================================================================
  // 23. Projects remain outside baseline assessment (§20)
  // ==========================================================================
  it('23. Projects remain outside baseline assessment', () => {
    const attempt = buildFullReassessmentAttempt();
    const responses: AssessmentResponse[] = attempt.selectedItemIds.map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: attempt.id,
      itemId,
      response: 0,
      result: 'correct',
      timeSpentSeconds: 30,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    }));

    const scoring = scoreAssessmentAttempt(
      attempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      FULL_REASSESSMENT_DEFINITION
    );

    const projectResult = scoring.domainResults.find((dr) => dr.domainId === 'projects');
    expect(projectResult).toBeDefined();
    expect(projectResult?.level).toBe(0);
    expect(projectResult?.status).toBe('unassessed');
    expect(projectResult?.confidence).toBe('none');
    expect(projectResult?.abilityScore).toBe(0);
  });

  // ==========================================================================
  // 24. Class B construct boundaries preserved (§4, §21, §22)
  // ==========================================================================
  it('24. Class B construct boundaries preserved', () => {
    const attempt = buildFullReassessmentAttempt();
    const responses: AssessmentResponse[] = attempt.selectedItemIds.map((itemId) => ({
      id: `resp-${itemId}`,
      attemptId: attempt.id,
      itemId,
      response: 0,
      result: 'correct',
      timeSpentSeconds: 30,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    }));

    const scoring = scoreAssessmentAttempt(
      attempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      FULL_REASSESSMENT_DEFINITION
    );

    const comm = scoring.domainResults.find((dr) => dr.domainId === 'communication');
    const python = scoring.domainResults.find((dr) => dr.domainId === 'python');
    const interviews = scoring.domainResults.find((dr) => dr.domainId === 'interviews');

    expect(comm?.constructScope).toBe('written_only');
    expect(python?.constructScope).toBe('reasoning_only');
    expect(interviews?.constructScope).toBe('interview_knowledge_only');
    expect(comm?.status).toBe('partially_assessed');
  });

  // ==========================================================================
  // Additional: Confidence time decay (§11.3)
  // ==========================================================================
  it('applies confidence time decay per §11.3', () => {
    const baseDate = '2026-08-01T10:00:00.000Z';

    // < 14 days: unchanged
    const day10 = '2026-08-11T10:00:00.000Z';
    expect(applyConfidenceTimeDecay('high', baseDate, day10)).toBe('high');

    // 14-42 days: demote one step (high -> medium, medium -> low, low -> low)
    const day30 = '2026-08-31T10:00:00.000Z';
    expect(applyConfidenceTimeDecay('high', baseDate, day30)).toBe('medium');
    expect(applyConfidenceTimeDecay('medium', baseDate, day30)).toBe('low');
    expect(applyConfidenceTimeDecay('low', baseDate, day30)).toBe('low');

    // > 42 days: demote to low (never to none)
    const day60 = '2026-09-30T10:00:00.000Z';
    expect(applyConfidenceTimeDecay('high', baseDate, day60)).toBe('low');
    expect(applyConfidenceTimeDecay('medium', baseDate, day60)).toBe('low');
    expect(applyConfidenceTimeDecay('low', baseDate, day60)).toBe('low');
  });
});
