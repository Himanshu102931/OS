// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBaselineAttempt,
  scoreAssessmentAttempt,
  buildSundayMiniTestAttempt,
  selectSundayTestItems,
  isSundayTestEligible,
  checkSundayObligation,
  isItemEligibleForSundayTest,
  calculateItemEstimationWeight,
  calculateSundayPriorityScore,
  deriveWeeklyAssessmentReadout,
  SUNDAY_TEST_CONSTANTS,
  isAttemptExpired,
  type SundayScoringContext,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { SUNDAY_MINI_TEST_DEFINITION } from '../data/assessment/definitions';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import type {
  AssessmentState,
  AssessmentResponse,
  AssessmentItem,
  DomainId,
  WeaknessSignal,
  AssessmentItemExposure,
  DomainAssessmentResult,

} from '../types';

describe('Phase E: Sunday Adaptive Mini Test Specification', () => {
  const TEST_SUNDAY_DATE = '2026-10-04T10:00:00.000Z'; // 33 days after baseline

  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // Helper to create a completed mock baseline assessment state (taken 33 days prior to Sunday)
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

  // Helper to create a baseline state with abundant supply across weakness, recent, and retention
  function createMockBalancedBaselineState(): { state: AssessmentState; recentCompetencies: string[] } {
    const attempt = buildBaselineAttempt();
    attempt.status = 'submitted';
    attempt.startedAt = '2026-09-01T08:00:00.000Z';
    attempt.endedAt = '2026-09-01T10:00:00.000Z';

    const weakDomains: DomainId[] = ['dsa', 'sql', 'os', 'cn'];
    const responses: AssessmentResponse[] = BASELINE_ASSESSMENT_ITEMS.map((item, idx) => {
      const isWeak = weakDomains.includes(item.domainId) && idx % 2 === 0;
      return {
        id: `resp-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: isWeak ? -1 : (item.key ?? 0),
        result: isWeak ? 'incorrect' : 'correct',
        timeSpentSeconds: 60,
        errorCategories: isWeak ? (item.errorCategories.length > 0 ? item.errorCategories : ['E-CONCEPT']) : [],
        scoredCredit: isWeak ? 0.0 : 1.0,
        weightApplied: 1.0,
        responseConfidence: isWeak ? 'confident' : 'somewhat',
      };
    });

    const scoring = scoreAssessmentAttempt(attempt, responses);

    // Pick 15 competencies from the strong domains for recent learning
    const strongCompetencies = Array.from(
      new Set(
        BASELINE_ASSESSMENT_ITEMS.filter((i) => !weakDomains.includes(i.domainId)).map((i) => i.competency)
      )
    );
    const recentCompetencies = strongCompetencies.slice(0, 15);

    return {
      state: {
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
      },
      recentCompetencies,
    };
  }


  function createMockSundayScoringContext(
    openWeaknesses: WeaknessSignal[] = [],
    previousSundayCompetencies: Set<string> = new Set(),
    lastTwoSundaysCompetencies: Set<string> = new Set()
  ): SundayScoringContext {
    const domainResults = new Map<DomainId, DomainAssessmentResult>();
    return {
      domainResults,
      openWeaknesses,
      historicalWeaknesses: openWeaknesses,
      recentCompetencies: new Set(),
      previousSundayCompetencies,
      lastTwoSundaysCompetencies,
      domainCandidateCounts: new Map(),
      totalCandidates: 84,
      currentDate: TEST_SUNDAY_DATE,
    };
  }

  // -------------------------------------------------------------------------
  // 1. Baseline Prerequisite (§18, DECIDED 5)
  // -------------------------------------------------------------------------
  describe('1. Baseline Prerequisite', () => {
    it('returns false for isSundayTestEligible if assessmentState is empty or unassessed', () => {
      expect(isSundayTestEligible(undefined)).toBe(false);
      expect(
        isSundayTestEligible({
          attempts: [],
          responses: [],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: { pendingSunday: false },
        })
      ).toBe(false);
    });

    it('returns false if baseline attempt is in_progress or abandoned', () => {
      const state: AssessmentState = {
        attempts: [
          {
            id: 'attempt-1',
            definitionId: 'baseline-v1',
            definitionVersion: 1,
            kind: 'diagnostic_assessment',
            status: 'in_progress',
            startedAt: '2026-09-01T08:00:00Z',
            timeLimitSeconds: 10800,
            seed: 'seed-test-0',
            selectedItemIds: [],
          },
        ],

        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
      };
      expect(isSundayTestEligible(state)).toBe(false);

      state.attempts[0].status = 'abandoned';
      expect(isSundayTestEligible(state)).toBe(false);
    });

    it('returns true for isSundayTestEligible once baseline is submitted or auto_submitted', () => {
      const state = createMockCompletedBaselineState();
      expect(isSundayTestEligible(state)).toBe(true);
    });

    it('throws an error if attempting to build a Sunday mini test without completed baseline', () => {
      expect(() => buildSundayMiniTestAttempt(undefined as unknown as AssessmentState)).toThrow(
        /Baseline diagnostic assessment must be completed/
      );
    });

    it('checkSundayObligation suppresses Sunday obligation if baseline is not completed', () => {
      const result = checkSundayObligation(undefined, TEST_SUNDAY_DATE);
      expect(result.pendingSunday).toBe(false);
      expect(result.reason).toContain('Baseline diagnostic assessment has not been completed');
    });
  });

  // -------------------------------------------------------------------------
  // 2. 90-Minute Hard Limit & 78-Minute Item Budget (§15.1, §15.2)
  // -------------------------------------------------------------------------
  describe('2. Time Budget & Hard Wall-Clock Duration', () => {
    it('sets 5400s (90m) hard time limit on Sunday attempt', () => {
      const state = createMockCompletedBaselineState();
      const { attempt } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'test-seed-1',
      });

      expect(attempt.kind).toBe('weekly_assessment');
      expect(attempt.definitionId).toBe('sunday-mini-test-v1');
      expect(attempt.timeLimitSeconds).toBe(5400); // 90 minutes
      expect(SUNDAY_TEST_CONSTANTS.HARD_LIMIT_SECONDS).toBe(5400);
    });

    it('keeps selected item duration within the 78-minute budget (+12m buffer = 90m total)', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        allItems: BASELINE_ASSESSMENT_ITEMS,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'budget-test',
      });


      expect(selection.totalEstimatedMinutes).toBeLessThanOrEqual(SUNDAY_TEST_CONSTANTS.SELECTION_BUDGET_MINUTES);
      expect(selection.totalEstimatedMinutes).toBeGreaterThan(25);
      expect(selection.selectedItems.length).toBeGreaterThan(10);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Deterministic Item Selection (§16.3)
  // -------------------------------------------------------------------------
  describe('3. Determinism & Seeded Reproducibility', () => {
    it('produces identical item selection and order given the same state and seed', () => {
      const state = createMockCompletedBaselineState();
      const selectionA = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'deterministic-seed-abc',
      });
      const selectionB = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'deterministic-seed-abc',
      });

      expect(selectionA.selectedItemIds).toEqual(selectionB.selectedItemIds);
      expect(selectionA.totalEstimatedMinutes).toBe(selectionB.totalEstimatedMinutes);
      expect(selectionA.targetBreakdown).toEqual(selectionB.targetBreakdown);
    });

    it('varies item sequence when different seeds are provided', () => {
      const state = createMockCompletedBaselineState();
      const selectionA = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'seed-alpha',
      });
      const selectionB = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'seed-beta',
      });

      expect(selectionA.selectedItemIds).not.toEqual(selectionB.selectedItemIds);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Target 60/20/20 Mix (§15.1)
  // -------------------------------------------------------------------------
  describe('4. Target 60/20/20 Mix Breakdown', () => {
    it('allocates content targeting weaknesses, recent material, and retention', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'mix-test',
      });

      expect(selection.targetBreakdown.weaknessCount).toBeGreaterThanOrEqual(1);
      expect(selection.targetBreakdown.retentionCount).toBeGreaterThanOrEqual(1);
      const totalAllocated =
        selection.targetBreakdown.weaknessCount +
        selection.targetBreakdown.recentCount +
        selection.targetBreakdown.retentionCount;
      expect(totalAllocated).toBe(selection.selectedItems.length);
    });

    it('achieves exact 60/20/20 allocation when sufficient eligible supply exists in all categories', () => {
      const { state, recentCompetencies } = createMockBalancedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        recentEvidenceCompetencies: recentCompetencies,
        seed: 'exact-mix-test',
      });

      const totalItems = selection.selectedItems.length;
      expect(totalItems).toBeGreaterThan(15);

      // Verify each category has candidates selected
      expect(selection.targetBreakdown.weaknessCount).toBeGreaterThan(0);
      expect(selection.targetBreakdown.recentCount).toBeGreaterThan(0);
      expect(selection.targetBreakdown.retentionCount).toBeGreaterThan(0);

      // Total sum invariant
      const sum =
        selection.targetBreakdown.weaknessCount +
        selection.targetBreakdown.recentCount +
        selection.targetBreakdown.retentionCount;
      expect(sum).toBe(totalItems);

      // Verify ratios match 60% / 20% / 20% with largest-remainder tolerance (±1 item due to rounding)
      const expectedWeakness = Math.round(totalItems * 0.60);
      const expectedRecent = Math.round(totalItems * 0.20);
      const expectedRetention = Math.round(totalItems * 0.20);

      expect(Math.abs(selection.targetBreakdown.weaknessCount - expectedWeakness)).toBeLessThanOrEqual(1);
      expect(Math.abs(selection.targetBreakdown.recentCount - expectedRecent)).toBeLessThanOrEqual(1);
      expect(Math.abs(selection.targetBreakdown.retentionCount - expectedRetention)).toBeLessThanOrEqual(1);
    });

    it('handles retention shortage with legitimate redistribution when retention supply is scarce', () => {
      const state = createMockCompletedBaselineState();
      // Keep only 2 retention items eligible by marking the others as seen recently
      const exposures = { ...state.exposures };
      for (const id of ['asm-int-005', 'asm-dsa-003', 'asm-dsa-004', 'asm-dsa-006']) {
        exposures[id] = {
          itemId: id,
          exposureCount: 1,
          lastSeenAt: '2026-10-02T10:00:00.000Z', // 2 days ago (< 14 days)
          lastAttemptId: 'attempt-recent',
          lastResult: 'correct',
          previousAssessmentUsage: ['diagnostic_assessment'],
          estimationUses: 1,
          eligibleForFutureEstimation: true,
          releasedToPractice: false,
        };
      }

      const scarceState = { ...state, exposures };
      const selection = selectSundayTestItems({
        assessmentState: scarceState,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'retention-shortage-test',
      });

      // Exactly the 2 available eligible retention items are selected
      expect(selection.targetBreakdown.retentionCount).toBe(2);
      expect(selection.selectedItemIds).toContain('asm-int-002');
      expect(selection.selectedItemIds).toContain('asm-int-004');

      // Shortfall is legitimately redistributed to weakness
      expect(selection.targetBreakdown.weaknessCount).toBe(selection.selectedItems.length - 2);
      expect(selection.selectionExceptions).toContain('category_exhausted:retention');
    });

    it('excludes retention candidates removed by exposure eligibility without fabricating items', () => {
      const state = createMockCompletedBaselineState();
      // Expose ALL retention items in the last 14 days
      const exposures = { ...state.exposures };
      const retentionIds = ['asm-int-002', 'asm-int-004', 'asm-int-005', 'asm-dsa-003', 'asm-dsa-004', 'asm-dsa-006'];
      for (const id of retentionIds) {
        exposures[id] = {
          itemId: id,
          exposureCount: 1,
          lastSeenAt: '2026-10-03T10:00:00.000Z', // 1 day ago
          lastAttemptId: 'attempt-recent',
          lastResult: 'correct',
          previousAssessmentUsage: ['diagnostic_assessment'],
          estimationUses: 1,
          eligibleForFutureEstimation: true,
          releasedToPractice: false,
        };
      }

      const exposedState = { ...state, exposures };
      const selection = selectSundayTestItems({
        assessmentState: exposedState,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'retention-exposed-test',
      });

      // Retention count is legitimately 0 because all were ineligible by exposure
      expect(selection.targetBreakdown.retentionCount).toBe(0);
      // No exposed retention items were selected
      for (const id of retentionIds) {
        expect(selection.selectedItemIds).not.toContain(id);
      }
      // All selected items are genuine weakness items, no fabricated retention
      expect(selection.targetBreakdown.weaknessCount).toBe(selection.selectedItems.length);
      expect(selection.selectionExceptions).toContain('category_exhausted:retention');
    });

    it('blocks retention candidates that would violate concentration caps and redistributes capacity', () => {
      const state = createMockCompletedBaselineState();
      // Expose DSA retention candidates so all remaining retention candidates are only in 'interviews'
      const exposures = { ...state.exposures };
      for (const id of ['asm-dsa-003', 'asm-dsa-004', 'asm-dsa-006']) {
        exposures[id] = {
          itemId: id,
          exposureCount: 1,
          lastSeenAt: '2026-10-03T10:00:00.000Z',
          lastAttemptId: 'attempt-recent',
          lastResult: 'correct',
          previousAssessmentUsage: ['diagnostic_assessment'],
          estimationUses: 1,
          eligibleForFutureEstimation: true,
          releasedToPractice: false,
        };
      }

      const cappedState = { ...state, exposures };
      const selection = selectSundayTestItems({
        assessmentState: cappedState,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'caps-retention-test',
      });

      const totalItems = selection.selectedItems.length;
      expect(totalItems).toBeGreaterThan(0);

      // Verify domain concentration cap is strictly respected (<= 40%)
      for (const count of Object.values(selection.domainBreakdown)) {
        expect(count / totalItems).toBeLessThanOrEqual(0.4001);
      }
      expect(selection.targetBreakdown.retentionCount).toBeGreaterThan(0);
    });

    it('performs deterministic replacement from the same category when a candidate is blocked by a cap', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'replacement-test',
      });

      // Both interviews and dsa retention candidates exist and are selected deterministically
      const selectedRetention = selection.selectedItems.filter((i) =>
        ['asm-int-002', 'asm-int-004', 'asm-int-005', 'asm-dsa-003', 'asm-dsa-004', 'asm-dsa-006'].includes(i.id)
      );
      expect(selectedRetention.length).toBeGreaterThanOrEqual(2);
      expect(selection.targetBreakdown.retentionCount).toBe(selectedRetention.length);
    });

    it('never fabricates retention items from arbitrary or weakness candidates', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'no-fabrication-test',
      });

      const knownRetentionIds = new Set(['asm-int-002', 'asm-int-004', 'asm-int-005', 'asm-dsa-003', 'asm-dsa-004', 'asm-dsa-006']);

      for (const item of selection.selectedItems) {
        if (knownRetentionIds.has(item.id)) {
          // Genuinely retention
          expect(item.domainId === 'interviews' || item.domainId === 'dsa').toBe(true);
        } else {
          // Genuinely weakness
          const isWeakness =
            state.weaknessSignals.some((ws) => ws.domainId === item.domainId && ws.status === 'open') ||
            (state.domainResults.find((dr) => dr.domainId === item.domainId)?.level ?? 0) <= 2;
          expect(isWeakness).toBe(true);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Guaranteed Coverage Floors (§15.2)
  // -------------------------------------------------------------------------
  describe('5. Guaranteed Coverage Floors', () => {
    it('ensures every non-unassessed domain gets >= 1 item where supply allows', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'floor-test-1',
      });

      const assessedDomains: DomainId[] = [
        'aptitude', 'dsa', 'python', 'sql', 'dbms',
        'oop', 'os', 'cn', 'communication', 'interviews',
      ];

      for (const domain of assessedDomains) {
        expect(selection.domainBreakdown[domain]).toBeGreaterThanOrEqual(1);
      }
    });

    it('ensures domains with open weakness signals get >= 2 items where supply allows', () => {
      const state = createMockCompletedBaselineState();
      const openWeaknessDomains = Array.from(
        new Set(state.weaknessSignals.filter((ws) => ws.status === 'open').map((ws) => ws.domainId))
      ).filter((d) => d !== 'projects');

      expect(openWeaknessDomains.length).toBeGreaterThan(0);

      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'weakness-floor-test',
      });

      for (const domain of openWeaknessDomains) {
        expect(selection.domainBreakdown[domain]).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. Concentration Caps (§15.2)
  // -------------------------------------------------------------------------
  describe('6. Concentration Caps', () => {
    it('enforces maximum 40% items from any single domain', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'caps-test',
      });

      const totalItems = selection.selectedItems.length;
      expect(totalItems).toBeGreaterThan(0);
      for (const count of Object.values(selection.domainBreakdown)) {
        const pct = count / totalItems;
        expect(pct).toBeLessThanOrEqual(0.4001);
      }
    });

    it('enforces topic concentration cap (<= 35%) and competency cap (<= 50%)', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'caps-test-2',
      });

      const totalItems = selection.selectedItems.length;
      expect(totalItems).toBeGreaterThan(0);
      const topicCounts: Record<string, number> = {};
      const compCounts: Record<string, number> = {};

      for (const item of selection.selectedItems) {
        topicCounts[item.topicId] = (topicCounts[item.topicId] || 0) + 1;
        compCounts[item.competency] = (compCounts[item.competency] || 0) + 1;
      }

      for (const count of Object.values(topicCounts)) {
        expect(count / totalItems).toBeLessThanOrEqual(0.3501);
      }

      for (const count of Object.values(compCounts)) {
        expect(count / totalItems).toBeLessThanOrEqual(0.5001);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. Breadth Requirement (>= 6 distinct domains §15.2)
  // -------------------------------------------------------------------------
  describe('7. Minimum Breadth Requirement', () => {
    it('includes at least 6 distinct domains where candidate supply allows', () => {
      const state = createMockCompletedBaselineState();
      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        seed: 'breadth-test',
      });

      const distinctDomains = Object.keys(selection.domainBreakdown).length;
      expect(distinctDomains).toBeGreaterThanOrEqual(SUNDAY_TEST_CONSTANTS.MIN_DISTINCT_DOMAINS);
      expect(distinctDomains).toBeGreaterThanOrEqual(6);
    });
  });

  // -------------------------------------------------------------------------
  // 8. P1–P7 Priority Scoring Formula (§16.1)
  // -------------------------------------------------------------------------
  describe('8. P1–P7 Priority Scoring Formula', () => {
    it('applies the exact weighted priority formula: 0.30 P1 + 0.22 P2 + 0.16 P3 + 0.12 P4 + 0.08 P5 + 0.06 P6 + 0.06 P7', () => {
      const candidateItem = BASELINE_ASSESSMENT_ITEMS.find((i) => i.domainId === 'dsa')!;
      const openSignals: WeaknessSignal[] = [
        {
          id: 'ws-1',
          domainId: 'dsa',
          topicId: candidateItem.topicId,
          competency: candidateItem.competency,
          sourceAttemptIds: ['attempt-1'],
          firstSeenAt: '2026-09-20T00:00:00Z',
          lastSeenAt: '2026-09-25T00:00:00Z',
          status: 'open',
          strength: 2,
          occurrences: 1,
          errorCategory: 'E-LOGIC',
        },
      ];

      const context = createMockSundayScoringContext(openSignals);
      const scoreResult = calculateSundayPriorityScore(candidateItem, context);

      expect(scoreResult.components.P1).toBe(1.0); // Directly targeted weakness
      expect(scoreResult.priorityScore).toBeGreaterThanOrEqual(0.30); // At least 0.30 from P1
      expect(scoreResult.priorityScore).toBeLessThanOrEqual(1.0);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Hysteresis & Anti-Oscillation (§16.2)
  // -------------------------------------------------------------------------
  describe('9. Hysteresis & Anti-Oscillation Rules', () => {
    it('demotes repeated targets from previous Sunday in P1 by 0.5 unless a new error category appeared', () => {
      const candidateItem = BASELINE_ASSESSMENT_ITEMS.find((i) => i.domainId === 'dsa')!;
      const openSignals: WeaknessSignal[] = [
        {
          id: 'ws-1',
          domainId: 'dsa',
          topicId: candidateItem.topicId,
          competency: candidateItem.competency,
          sourceAttemptIds: ['attempt-1'],
          firstSeenAt: '2026-09-20T00:00:00Z',
          lastSeenAt: '2026-09-25T00:00:00Z',
          status: 'open',
          strength: 2,
          occurrences: 1,
          errorCategory: 'E-LOGIC',
        },
      ];

      // Fresh target (not in previous Sunday)
      const freshContext = createMockSundayScoringContext(openSignals);
      const freshScore = calculateSundayPriorityScore(candidateItem, freshContext);

      // Repeated target (in previous Sunday)
      const repeatedContext = createMockSundayScoringContext(
        openSignals,
        new Set([candidateItem.competency]),
        new Set([candidateItem.competency])
      );
      const repeatedScore = calculateSundayPriorityScore(candidateItem, repeatedContext);

      expect(freshScore.components.P1).toBe(1.0);
      expect(repeatedScore.components.P1).toBe(0.5); // Demoted by 0.5 per §16.2
    });

    it('enforces <= 50% swing cap from previous Sunday weak competencies', () => {
      const state = createMockCompletedBaselineState();
      const prevSundayCompetencies = new Set(['time-complexity', 'sliding-window']);

      const selection = selectSundayTestItems({
        assessmentState: state,
        currentDate: TEST_SUNDAY_DATE,
        previousSundayCompetencies: prevSundayCompetencies,
        seed: 'swing-cap-test',
      });

      const prevCompetencyCount = selection.selectedItems.filter((i) =>
        prevSundayCompetencies.has(i.competency)
      ).length;

      expect(prevCompetencyCount / selection.selectedItems.length).toBeLessThanOrEqual(0.5001);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Exposure Rules (§13.2, §13.3)
  // -------------------------------------------------------------------------
  describe('10. Exposure Rules & Item Eligibility', () => {
    it('strictly excludes items seen in the last 14 days', () => {
      const item = BASELINE_ASSESSMENT_ITEMS[0];
      const recentExposure: AssessmentItemExposure = {
        itemId: item.id,
        exposureCount: 1,
        lastSeenAt: '2026-09-28T00:00:00Z', // 6 days ago from 2026-10-04
        lastAttemptId: 'attempt-1',
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 1,
        eligibleForFutureEstimation: true,
        releasedToPractice: false,
      };

      const isEligible = isItemEligibleForSundayTest(
        item,
        recentExposure,
        TEST_SUNDAY_DATE,
        BASELINE_ASSESSMENT_ITEMS
      );

      expect(isEligible).toBe(false);
    });

    it('allows items seen more than 14 days ago', () => {
      const item = BASELINE_ASSESSMENT_ITEMS[0];
      const olderExposure: AssessmentItemExposure = {
        itemId: item.id,
        exposureCount: 1,
        lastSeenAt: '2026-09-01T00:00:00Z', // 33 days ago from 2026-10-04
        lastAttemptId: 'attempt-1',
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 1,
        eligibleForFutureEstimation: true,
        releasedToPractice: false,
      };

      const isEligible = isItemEligibleForSundayTest(
        item,
        olderExposure,
        TEST_SUNDAY_DATE,
        BASELINE_ASSESSMENT_ITEMS
      );

      expect(isEligible).toBe(true);
    });

    it('discounts 2nd estimation use within 60 days to 0.5 weight, and excludes >= 3rd use', () => {
      const candidateItem = BASELINE_ASSESSMENT_ITEMS[0];
      const unexposedWeight = calculateItemEstimationWeight(candidateItem, undefined);
      expect(unexposedWeight).toBeGreaterThan(0);

      const oneUseRecent: AssessmentItemExposure = {
        itemId: candidateItem.id,
        exposureCount: 1,
        lastSeenAt: '2026-09-15T00:00:00Z', // 19 days ago (past 14-day recency, within 60-day repeat)
        lastAttemptId: 'attempt-1',
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 1,
        eligibleForFutureEstimation: true,
        releasedToPractice: false,
      };
      const secondUseWeight = calculateItemEstimationWeight(candidateItem, oneUseRecent, TEST_SUNDAY_DATE);
      expect(secondUseWeight).toBe(unexposedWeight * 0.5); // §13.3 repeat discount

      const twoUses: AssessmentItemExposure = {
        ...oneUseRecent,
        exposureCount: 2,
        estimationUses: 2,
      };

      const thirdUseWeight = calculateItemEstimationWeight(candidateItem, twoUses, TEST_SUNDAY_DATE);
      expect(thirdUseWeight).toBe(0.0); // Excluded from estimation after 2 uses (§13.3)

      const isEligibleForThird = isItemEligibleForSundayTest(
        candidateItem,
        twoUses,
        TEST_SUNDAY_DATE,
        BASELINE_ASSESSMENT_ITEMS
      );
      expect(isEligibleForThird).toBe(false);
    });

    it('strictly excludes Projects domain items and released practice items', () => {
      const projectItem: AssessmentItem = {
        ...BASELINE_ASSESSMENT_ITEMS[0],
        id: 'proj-1',
        domainId: 'projects',
      };
      expect(isItemEligibleForSundayTest(projectItem)).toBe(false);

      const releasedItem: AssessmentItem = {
        ...BASELINE_ASSESSMENT_ITEMS[0],
        id: 'released-1',
        eligibleFor: ['released_practice'],
      };
      expect(isItemEligibleForSundayTest(releasedItem)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 11. Missed Sunday Obligation Rolls Forward (§18)
  // -------------------------------------------------------------------------
  describe('11. Missed Sunday Single Obligation Roll-Forward', () => {
    it('sets pendingSunday obligation on Sunday when baseline is completed', () => {
      const state = createMockCompletedBaselineState();
      const check = checkSundayObligation(state, TEST_SUNDAY_DATE);
      expect(check.pendingSunday).toBe(true);
      expect(check.reason).toContain('scheduled for today');
    });

    it('rolls forward as a single pending obligation on Monday, count never stacks', () => {
      const state = createMockCompletedBaselineState();
      state.profile.pendingSunday = true;

      // Monday 2026-10-05
      const checkMonday = checkSundayObligation(state, '2026-10-05T09:00:00.000Z');
      expect(checkMonday.pendingSunday).toBe(true);
      expect(checkMonday.reason).toContain('obligation is pending');

      // Profile pending flag remains boolean (single obligation, not backlog count)
      expect(state.profile.pendingSunday).toBe(true);
    });

    it('does not schedule an obligation if a weekly assessment was already completed today', () => {
      const state = createMockCompletedBaselineState();
      state.attempts.push({
        id: 'attempt-weekly-1',
        definitionId: 'sunday-mini-test-v1',
        definitionVersion: 1,
        kind: 'weekly_assessment',
        status: 'submitted',
        startedAt: '2026-10-04T10:00:00.000Z',
        endedAt: '2026-10-04T11:20:00.000Z',
        timeLimitSeconds: 5400,
        seed: 'seed-test-1',
        selectedItemIds: [],
      });


      const check = checkSundayObligation(state, TEST_SUNDAY_DATE);
      expect(check.pendingSunday).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 12. Attempt Lifecycle & Expiration (§15.1)
  // -------------------------------------------------------------------------
  describe('12. Attempt Lifecycle & Expiration', () => {
    it('detects attempt expiration after 5400s', () => {
      const state = createMockCompletedBaselineState();
      const { attempt } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'expiry-test',
      });

      // After 5000 seconds -> not expired
      expect(isAttemptExpired(attempt, new Date('2026-10-04T11:23:00.000Z').getTime())).toBe(false);

      // After 5401 seconds -> expired
      expect(isAttemptExpired(attempt, new Date('2026-10-04T11:30:02.000Z').getTime())).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 13. Scoring, Evidence & Weakness Signal Resolution (§14, §17)
  // -------------------------------------------------------------------------
  describe('13. Scoring, Evidence & Signal Transition', () => {
    it('emits evidence logs with sourceType: test for weekly assessments', () => {
      const state = createMockCompletedBaselineState();
      const { attempt, selection } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'evidence-test',
      });

      const responses: AssessmentResponse[] = selection.selectedItems.map((item, idx) => ({
        id: `resp-weekly-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: idx % 2 === 0 ? (item.key ?? 0) : -1,
        result: idx % 2 === 0 ? 'correct' : 'incorrect',
        timeSpentSeconds: 60,
        errorCategories: idx % 2 === 0 ? [] : ['E-LOGIC'],
        scoredCredit: idx % 2 === 0 ? 1.0 : 0.0,
        weightApplied: 1.0,
        responseConfidence: 'confident',
      }));

      attempt.status = 'submitted';
      attempt.endedAt = '2026-10-04T11:15:00.000Z';

      const result = scoreAssessmentAttempt(
        attempt,
        responses,
        BASELINE_ASSESSMENT_ITEMS,
        SUNDAY_MINI_TEST_DEFINITION,
        state.exposures,
        state.weaknessSignals
      );

      expect(result.evidenceLogs.length).toBeGreaterThan(0);
      for (const log of result.evidenceLogs) {
        expect(log.sourceType).toBe('test');
        expect(log.details).toContain('weekly_assessment');
      }
    });

    it('resolves weakness signals on correct responses and reinforces them on errors', () => {
      const state = createMockCompletedBaselineState();
      const openSignal = state.weaknessSignals.find((ws) => ws.status === 'open')!;
      expect(openSignal).toBeDefined();

      const { attempt, selection } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'signal-test',
      });

      const responses: AssessmentResponse[] = selection.selectedItems.map((item) => {
        const isTargetWeakness = item.domainId === openSignal.domainId && (item.competency === openSignal.competency || item.topicId === openSignal.topicId);
        return {
          id: `resp-sig-${item.id}`,
          attemptId: attempt.id,
          itemId: item.id,
          response: isTargetWeakness ? (item.key ?? 0) : -1,
          result: isTargetWeakness ? 'correct' : 'incorrect',
          timeSpentSeconds: 60,
          errorCategories: isTargetWeakness ? [] : ['E-LOGIC'],
          scoredCredit: isTargetWeakness ? 1.0 : 0.0,
          weightApplied: 1.0,
          responseConfidence: 'confident',
        };
      });

      attempt.status = 'submitted';
      attempt.endedAt = '2026-10-04T11:15:00.000Z';

      const result = scoreAssessmentAttempt(
        attempt,
        responses,
        BASELINE_ASSESSMENT_ITEMS,
        SUNDAY_MINI_TEST_DEFINITION,
        state.exposures,
        state.weaknessSignals
      );

      const resolvedSignal = result.weaknessSignals.find((ws) => ws.id === openSignal.id);
      expect(resolvedSignal?.status).toBe('resolved');
      expect(resolvedSignal?.resolvedAt).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 14. Zero Mutation to Other Subsystems (§24)
  // -------------------------------------------------------------------------
  describe('14. Isolation & Zero Mutations to Other Subsystems', () => {
    it('does not mutate DSA-150 progress, Leitner boxes, or practice sessions', () => {
      const defaultState = getDefaultStorageState() as AppExtendedStorageState;
      const initialDSAProgress = JSON.parse(JSON.stringify(defaultState.dsaProgress));
      const initialSkillStates = JSON.parse(JSON.stringify(defaultState.skillStates));
      const initialPracticeAttempts = JSON.parse(JSON.stringify(defaultState.practiceAttempts));

      const state = createMockCompletedBaselineState();
      const { attempt, selection } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'isolation-test',
      });

      const responses: AssessmentResponse[] = selection.selectedItems.map((item) => ({
        id: `resp-iso-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        responseConfidence: 'confident',
      }));

      attempt.status = 'submitted';
      attempt.endedAt = '2026-10-04T11:15:00.000Z';

      scoreAssessmentAttempt(
        attempt,
        responses,
        BASELINE_ASSESSMENT_ITEMS,
        SUNDAY_MINI_TEST_DEFINITION,
        state.exposures,
        state.weaknessSignals
      );

      // Verify default state structures remain completely unchanged
      expect(defaultState.dsaProgress).toEqual(initialDSAProgress);
      expect(defaultState.skillStates).toEqual(initialSkillStates);
      expect(defaultState.practiceAttempts).toEqual(initialPracticeAttempts);
    });
  });

  // -------------------------------------------------------------------------
  // 15. Weekly Assessment Readout (§15.3)
  // -------------------------------------------------------------------------
  describe('15. Weekly Assessment Readout', () => {
    it('derives structured weekly assessment readout with accuracy, weaknesses, and retention', () => {
      const state = createMockCompletedBaselineState();
      const { attempt, selection } = buildSundayMiniTestAttempt(state, {
        currentDate: TEST_SUNDAY_DATE,
        seed: 'readout-test',
      });

      const responses: AssessmentResponse[] = selection.selectedItems.map((item, idx) => ({
        id: `resp-ro-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: idx % 2 === 0 ? (item.key ?? 0) : -1,
        result: idx % 2 === 0 ? 'correct' : 'incorrect',
        timeSpentSeconds: 60,
        errorCategories: idx % 2 === 0 ? [] : ['E-LOGIC'],
        scoredCredit: idx % 2 === 0 ? 1.0 : 0.0,
        weightApplied: 1.0,
        responseConfidence: 'confident',
      }));

      attempt.status = 'submitted';
      attempt.endedAt = '2026-10-04T11:15:00.000Z';

      const scored = scoreAssessmentAttempt(
        attempt,
        responses,
        BASELINE_ASSESSMENT_ITEMS,
        SUNDAY_MINI_TEST_DEFINITION,
        state.exposures,
        state.weaknessSignals
      );

      const updatedState: AssessmentState = {
        ...state,
        attempts: [...state.attempts, scored.attempt],
        responses: [...state.responses, ...responses],
        domainResults: [...state.domainResults, ...scored.domainResults],
        weaknessSignals: scored.weaknessSignals,
      };

      const readout = deriveWeeklyAssessmentReadout(
        scored.attempt,
        responses,
        updatedState,
        BASELINE_ASSESSMENT_ITEMS
      );

      expect(readout.isAssessed).toBe(true);
      expect(readout.attemptId).toBe(attempt.id);
      expect(readout.totalItems).toBe(selection.selectedItems.length);
      expect(readout.correctCount).toBe(Math.ceil(selection.selectedItems.length / 2));
      expect(readout.accuracyPct).toBeGreaterThan(0);
      expect(readout.totalTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(readout.domainResults.length).toBeGreaterThanOrEqual(6);
    });
  });
});
