import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetAssessmentProfileOnly,
  resetAssessmentHistoryOnly,
  createInitialAssessmentState,
  buildBaselineAttempt,
  scoreAssessmentAttempt,
  evaluateItemResponse,
  isAttemptExpired,
  transitionAttempt,
  buildFullReassessmentAttempt,
} from '../engine/assessmentEngine';
import { executePythonAssessmentItem } from '../engine/assessmentExecutionEngine';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import type { AssessmentResponse, AssessmentItem, AssessmentState } from '../types';

describe('Assessment Post-Audit Remediation Batch 1', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // F-SEC-01: Python prototype-pollution defense
  describe('F-SEC-01: Python prototype-pollution defense', () => {
    it('blocks prototype pollution via dynamic key assignment payload', () => {
      const basePy = BASELINE_ASSESSMENT_ITEMS.find((i) => i.domainId === 'python' && i.pythonContract)!;
      const item: AssessmentItem = {
        ...basePy,
        id: 'test-sec-01',
        prompt: 'Pollution attack test',
        pythonContract: {
          entryPoint: 'solution',
          testCases: [{ inputs: [], expected: null }],
        },
      };

      const maliciousCode = `
def solution():
    d = {}
    k = "__" + "proto" + "__"
    d[k] = {"polluted": True}
    return d
`;
      const res = executePythonAssessmentItem(item, maliciousCode);
      expect(res.passed).toBe(false);
      expect(res.status).toBe('sandbox_violation');
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  // F-STOR-01: Storage resilience
  describe('F-STOR-01: Storage resilience against corrupted assessmentState', () => {
    it('isolates invalid assessmentState while preserving user curriculum and DSA data', () => {
      const baseState = getDefaultStorageState();
      const firstProbId = Object.keys(baseState.dsaProgress)[0];
      baseState.dsaProgress[firstProbId].currentBox = 4;
      baseState.dsaProgress[firstProbId].passedIndependently = true;

      const corruptState = {
        ...baseState,
        assessmentState: { attempts: 'invalid_type_here' } as unknown as AssessmentState,
      };

      StorageAdapter.saveState(corruptState);
      const loaded = StorageAdapter.loadState();

      expect(loaded.dsaProgress[firstProbId].currentBox).toBe(4);
      expect(loaded.dsaProgress[firstProbId].passedIndependently).toBe(true);
      expect(loaded.assessmentState).toBeUndefined();
    });
  });

  // F-SCOR-01 & F-TEST-01: Rubric scoring integration
  describe('F-SCOR-01 & F-TEST-01: Deterministic rubric grading in production pipeline', () => {
    it('scores rubric items deterministically when criteria clusters are met', () => {
      const rubricItem = BASELINE_ASSESSMENT_ITEMS.find((i) => i.scoring.kind === 'rubric')!;
      expect(rubricItem).toBeDefined();

      // Criteria matched
      const validText = 'We use a prefix sum map with earliest index tracking to achieve linear O(N) complexity.';
      const evalMatch = evaluateItemResponse(rubricItem, validText, 'confident', 45);
      expect(evalMatch.result).toBe('correct');
      expect(evalMatch.scoredCredit).toBe(1.0);

      // Criteria unmatched
      const unmatchingText = 'I am completely certain of this answer but have no keywords.';
      const evalNoMatch = evaluateItemResponse(rubricItem, unmatchingText, 'confident', 45);
      expect(evalNoMatch.result).toBe('incorrect');
      expect(evalNoMatch.scoredCredit).toBe(0.0);
    });

    it('end-to-end integration: rubric items contribute non-zero credit to domain scoring', () => {
      const rubricItem = BASELINE_ASSESSMENT_ITEMS.find((i) => i.scoring.kind === 'rubric')!;
      const attempt = buildBaselineAttempt();
      const response: AssessmentResponse = {
        id: 'resp-rubric-test',
        attemptId: attempt.id,
        itemId: rubricItem.id,
        response: 'prefix sum with hash map of index in O(N) linear time',
        result: 'correct',
        timeSpentSeconds: 50,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
      };

      const result = scoreAssessmentAttempt(attempt, [response], [rubricItem]);
      const domainRes = result.domainResults.find((d) => d.domainId === rubricItem.domainId);
      expect(domainRes).toBeDefined();
      expect(domainRes!.abilityScore).toBeGreaterThan(0);
    });
  });

  // F-EXPO-01 & F-TEST-01: Exposure discount in scoring
  describe('F-EXPO-01 & F-TEST-01: Exposure discount and exclusion in scoring', () => {
    it('discounts 2nd exposure to 0.5x weight and excludes >=3rd exposure from estimation', () => {
      const item = BASELINE_ASSESSMENT_ITEMS[0];
      const attempt = buildBaselineAttempt();

      const response: AssessmentResponse = {
        id: 'resp-expo-1',
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 30,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
      };

      // 1st use (clean)
      const res1 = scoreAssessmentAttempt(attempt, [response], [item], undefined, {});
      expect(res1.exposures[item.id].exposureCount).toBe(1);
      expect(res1.exposures[item.id].estimationUses).toBe(1);

      // 2nd use within 60 days
      const res2 = scoreAssessmentAttempt(attempt, [response], [item], undefined, res1.exposures);
      expect(res2.exposures[item.id].exposureCount).toBe(2);
      expect(res2.exposures[item.id].estimationUses).toBe(2);

      // 3rd use -> excluded from estimation
      const res3 = scoreAssessmentAttempt(attempt, [response], [item], undefined, res2.exposures);
      expect(res3.exposures[item.id].exposureCount).toBe(3);
      // estimationUses must not increment
      expect(res3.exposures[item.id].estimationUses).toBe(2);
      expect(res3.exposures[item.id].eligibleForFutureEstimation).toBe(false);
    });
  });

  // F-REASS-01: Exposure-aware item selection
  describe('F-REASS-01: Exposure-aware selection in full reassessment', () => {
    it('prioritizes unexposed and low-exposure items over heavily exposed items', () => {
      const state = createInitialAssessmentState();
      const firstItem = BASELINE_ASSESSMENT_ITEMS[0];
      state.exposures[firstItem.id] = {
        itemId: firstItem.id,
        lastAttemptId: 'att-mock',
        lastSeenAt: new Date().toISOString(),
        exposureCount: 5,
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 2,
        eligibleForFutureEstimation: false,
        releasedToPractice: false,
      };

      const reassessment = buildFullReassessmentAttempt(state, 'seed-test-reass');
      expect(reassessment.selectedItemIds.length).toBeGreaterThan(0);
      // The heavily exposed item should not be the first item in its domain
      const firstDomainItemIds = reassessment.selectedItemIds.filter((id) => {
        const itm = BASELINE_ASSESSMENT_ITEMS.find((i) => i.id === id);
        return itm?.domainId === firstItem.domainId;
      });
      expect(firstDomainItemIds[0]).not.toBe(firstItem.id);
    });
  });

  // F-STAT-01: State-machine integrity
  describe('F-STAT-01: State-machine integrity and lifecycle transitions', () => {
    it('identifies expired in_progress attempts and allows transition to abandoned', () => {
      const attempt = buildBaselineAttempt();
      attempt.startedAt = new Date(Date.now() - (attempt.timeLimitSeconds + 60) * 1000).toISOString();

      expect(isAttemptExpired(attempt)).toBe(true);
      const abandoned = transitionAttempt(attempt, 'abandoned');
      expect(abandoned.status).toBe('abandoned');
      expect(abandoned.endedAt).toBeDefined();
    });

    it('rejects illegal transitions from terminal states', () => {
      const attempt = buildBaselineAttempt();
      const abandoned = transitionAttempt(attempt, 'abandoned');
      expect(() => transitionAttempt(abandoned, 'submitted')).toThrow(/cannot move from terminal status/);
    });
  });

  // F-RESET-01: DECIDED 3 two distinct reset operations
  describe('F-RESET-01: DECIDED 3 two distinct reset operations', () => {
    it('resetAssessmentProfileOnly resets levels to 0 but preserves attempt history and exposures', () => {
      const state = createInitialAssessmentState();
      state.attempts.push(buildBaselineAttempt());
      state.exposures['item-1'] = {
        itemId: 'item-1',
        lastAttemptId: 'att-mock',
        lastSeenAt: new Date().toISOString(),
        exposureCount: 1,
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 1,
        eligibleForFutureEstimation: true,
        releasedToPractice: false,
      };
      state.domainResults = [
        {
          domainId: 'python',
          abilityScore: 78,
          level: 3,
          confidence: 'high',
          status: 'assessed',
          coverage: { topicsCovered: 1, topicsTotal: 1, competenciesCovered: ['syntax'], difficultyBands: [1, 2] },
          assessmentDate: new Date().toISOString(),
          attemptId: 'att-mock',
          kind: 'diagnostic_assessment',
          provisional: false,
        },
      ];

      const resetState = resetAssessmentProfileOnly(state);

      // Levels reset to 0 and unassessed
      expect(resetState.domainResults.every((d) => d.level === 0 && d.status === 'unassessed' && d.confidence === 'none')).toBe(true);
      // History and exposures preserved
      expect(resetState.attempts.length).toBe(1);
      expect(resetState.exposures['item-1']).toBeDefined();
    });

    it('resetAssessmentHistoryOnly clears all history, exposures, and attempts back to baseline', () => {
      const state = createInitialAssessmentState();
      state.attempts.push(buildBaselineAttempt());
      state.exposures['item-1'] = {
        itemId: 'item-1',
        lastAttemptId: 'att-mock',
        lastSeenAt: new Date().toISOString(),
        exposureCount: 2,
        lastResult: 'correct',
        previousAssessmentUsage: ['diagnostic_assessment'],
        estimationUses: 2,
        eligibleForFutureEstimation: false,
        releasedToPractice: false,
      };

      const resetState = resetAssessmentHistoryOnly();

      expect(resetState.attempts.length).toBe(0);
      expect(Object.keys(resetState.exposures).length).toBe(0);
      expect(resetState.snapshots.length).toBe(0);
      expect(resetState.weaknessSignals.length).toBe(0);
      expect(resetState.domainResults.every((d) => d.level === 0 && d.status === 'unassessed')).toBe(true);
    });
  });

  // F-EVID-01: Multi-topic evidence partitioning
  describe('F-EVID-01: Partitioning EvidenceLog entries by sampled topic', () => {
    it('creates topic-specific EvidenceLog entries for all topics sampled in an assessment', () => {
      const attempt = buildBaselineAttempt();
      const aptItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === 'aptitude');
      const itemA = aptItems[0];
      const itemB = aptItems.find((i) => i.topicId !== itemA.topicId)!;

      const responses: AssessmentResponse[] = [
        {
          id: 'r-a',
          attemptId: attempt.id,
          itemId: itemA.id,
          response: itemA.key ?? 0,
          result: 'correct',
          timeSpentSeconds: 30,
          errorCategories: [],
          scoredCredit: 1.0,
          weightApplied: 1.0,
        },
        {
          id: 'r-b',
          attemptId: attempt.id,
          itemId: itemB.id,
          response: itemB.key ?? 0,
          result: 'correct',
          timeSpentSeconds: 30,
          errorCategories: [],
          scoredCredit: 1.0,
          weightApplied: 1.0,
        },
      ];

      const scored = scoreAssessmentAttempt(attempt, responses, [itemA, itemB]);
      const aptLogs = scored.evidenceLogs.filter((l) => l.domainId === 'aptitude');
      expect(aptLogs.length).toBe(2);
      expect(aptLogs.map((l) => l.topicId)).toContain(itemA.topicId);
      expect(aptLogs.map((l) => l.topicId)).toContain(itemB.topicId);
    });
  });
});
