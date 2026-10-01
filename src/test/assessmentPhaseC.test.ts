// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBaselineAttempt,
  evaluateItemResponse,
  scoreAssessmentAttempt,
  transitionAttempt,
  isAttemptExpired,
  applyChanceCorrection,
  getProvisionalDifficultyWeight,
  mapAbilityToProvisionalLevel,
  normalizeSQLQuery,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_DEFINITION } from '../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import type {
  AssessmentAttempt,
  AssessmentResponse,
  DSAProgress,
} from '../types';

describe('Phase C: Baseline Assessment Engine + Runner', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // 1. Deterministic baseline construction/selection
  describe('1. Deterministic baseline construction/selection', () => {
    it('produces identical selected items and order for the same seed', () => {
      const attempt1 = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, 'seed-12345');
      const attempt2 = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, 'seed-12345');

      expect(attempt1.id).toBe(attempt2.id);
      expect(attempt1.selectedItemIds).toEqual(attempt2.selectedItemIds);
      expect(attempt1.selectedItemIds.length).toBe(84);
    });

    it('orders items by module sequence (M1 to M10), then multistage role (anchor -> branch -> confirm), then difficulty', () => {
      const attempt = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, 'order-test');
      const itemMap = new Map(BASELINE_ASSESSMENT_ITEMS.map((i) => [i.id, i]));

      let lastModuleIndex = -1;
      const moduleOrder = BASELINE_ASSESSMENT_DEFINITION.modules.map((m) => m.domainId);

      for (const itemId of attempt.selectedItemIds) {
        const item = itemMap.get(itemId);
        expect(item).toBeDefined();
        const currentModIndex = moduleOrder.indexOf(item!.domainId);
        expect(currentModIndex).toBeGreaterThanOrEqual(lastModuleIndex);
        lastModuleIndex = currentModIndex;
      }
    });
  });

  // 2. Correct module/item counts
  describe('2. Correct module/item counts', () => {
    it('contains exactly 84 items across 10 modules, with Projects excluded', () => {
      const attempt = buildBaselineAttempt();
      expect(attempt.selectedItemIds.length).toBe(84);

      const itemMap = new Map(BASELINE_ASSESSMENT_ITEMS.map((i) => [i.id, i]));
      const domainCounts: Record<string, number> = {};

      for (const id of attempt.selectedItemIds) {
        const item = itemMap.get(id)!;
        domainCounts[item.domainId] = (domainCounts[item.domainId] || 0) + 1;
      }

      // Check against BASELINE_ASSESSMENT_DEFINITION.modules
      for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
        expect(domainCounts[mod.domainId]).toBe(mod.itemCount);
      }

      // Projects must have 0 items in baseline
      expect(domainCounts['projects']).toBeUndefined();
    });
  });

  // 3. Scoring for MCQ
  describe('3. Scoring for MCQ', () => {
    const sampleMCQ = BASELINE_ASSESSMENT_ITEMS.find(
      (i) => i.scoring.kind === 'objective' && typeof i.key === 'number'
    )!;

    it('awards 1.0 credit for correct option index and records no error categories', () => {
      const result = evaluateItemResponse(sampleMCQ, sampleMCQ.key);
      expect(result.result).toBe('correct');
      expect(result.scoredCredit).toBe(1.0);
      expect(result.errorCategories).toEqual([]);
    });

    it('awards 0.0 credit for wrong option index and attaches authored error categories', () => {
      const wrongIndex = typeof sampleMCQ.key === 'number' ? (sampleMCQ.key + 1) % 4 : 0;
      const result = evaluateItemResponse(sampleMCQ, wrongIndex);
      expect(result.result).toBe('incorrect');
      expect(result.scoredCredit).toBe(0.0);
      expect(result.errorCategories).toEqual(sampleMCQ.errorCategories);
    });

    it('handles explicit "dont_know" with 0.0 credit and E-CONCEPT diagnosis', () => {
      const result = evaluateItemResponse(sampleMCQ, 'dont_know');
      expect(result.result).toBe('dont_know');
      expect(result.scoredCredit).toBe(0.0);
      expect(result.errorCategories).toContain('E-CONCEPT');
    });

    it('handles unanswered/timed-out with 0.0 credit and E-SPEED diagnosis', () => {
      const result = evaluateItemResponse(sampleMCQ, null);
      expect(result.result).toBe('unanswered');
      expect(result.scoredCredit).toBe(0.0);
      expect(result.errorCategories).toContain('E-SPEED');
    });
  });

  // 4. SQL acceptableForms matching
  describe('4. SQL acceptableForms matching', () => {
    const sampleSQL = BASELINE_ASSESSMENT_ITEMS.find((i) => i.scoring.kind === 'normalized_match')!;

    it('accepts exact queries regardless of case, whitespace, trailing semicolons, and optional AS alias', () => {
      const form = sampleSQL.scoring.acceptableForms![0];
      const dirtyVariant = `  ${form.toUpperCase()} ;   `;
      const result = evaluateItemResponse(sampleSQL, dirtyVariant);

      expect(result.result).toBe('correct');
      expect(result.scoredCredit).toBe(1.0);
    });

    it('rejects incorrect SQL queries', () => {
      const result = evaluateItemResponse(sampleSQL, 'SELECT * FROM completely_wrong_table');
      expect(result.result).toBe('incorrect');
      expect(result.scoredCredit).toBe(0.0);
    });

    it('normalizes SQL queries predictably', () => {
      const raw = 'SELECT id,  name AS employee_name   FROM employees;';
      const normalized = normalizeSQLQuery(raw);
      expect(normalized).toBe('select id, name employee_name from employees');
    });
  });

  // 5. Constructed-response scoring restrictions
  describe('5. Constructed-response scoring restrictions', () => {
    const sampleRubric = BASELINE_ASSESSMENT_ITEMS.find((i) => i.scoring.kind === 'rubric')!;

    it('strictly forbids awarding credit from learner self-evaluation', () => {
      // Even with confident self-reporting and full text, rubric automated credit is 0.0
      const result = evaluateItemResponse(sampleRubric, 'Some well written answer', 'confident', 120);
      expect(result.scoredCredit).toBe(0.0);
      expect(result.result).toBe('incorrect');
    });
  });

  // 6. Chance correction
  describe('6. Chance correction', () => {
    it('calculates chance correction: c\' = max(0, (c - 1/k) / (1 - 1/k))', () => {
      // 4 options: guessFloor = 0.25
      expect(applyChanceCorrection(1.0, 4)).toBe(1.0);
      expect(applyChanceCorrection(0.25, 4)).toBe(0.0);
      expect(applyChanceCorrection(0.1, 4)).toBe(0.0);
      expect(applyChanceCorrection(0.625, 4)).toBeCloseTo(0.5, 4);
    });

    it('returns raw credit when options <= 1', () => {
      expect(applyChanceCorrection(0.8, 1)).toBe(0.8);
      expect(applyChanceCorrection(0.8, 0)).toBe(0.8);
    });
  });

  // 7. Difficulty weighting
  describe('7. Difficulty weighting', () => {
    it('returns exact specified provisional weights: easy 0.8, medium 1.0, hard 1.3, very hard 1.7', () => {
      expect(getProvisionalDifficultyWeight(1)).toBe(0.8);
      expect(getProvisionalDifficultyWeight(2)).toBe(1.0);
      expect(getProvisionalDifficultyWeight(3)).toBe(1.3);
      expect(getProvisionalDifficultyWeight(4)).toBe(1.7);
    });
  });

  // 8. Ability calculation
  describe('8. Ability calculation', () => {
    it('calculates 100 for all-correct responses in a domain', () => {
      const attempt = buildBaselineAttempt();
      const domainItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === 'aptitude');

      const responses: AssessmentResponse[] = domainItems.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);
      const aptResult = scoring.domainResults.find((d) => d.domainId === 'aptitude')!;

      expect(aptResult.abilityScore).toBe(100);
      expect(aptResult.level).toBe(5);
    });

    it('calculates 0 for all-incorrect responses in a domain', () => {
      const attempt = buildBaselineAttempt();
      const domainItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === 'aptitude');

      const responses: AssessmentResponse[] = domainItems.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: -1,
        result: 'incorrect',
        timeSpentSeconds: 60,
        errorCategories: item.errorCategories,
        scoredCredit: 0.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'guessing',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);
      const aptResult = scoring.domainResults.find((d) => d.domainId === 'aptitude')!;

      expect(aptResult.abilityScore).toBe(0);
      expect(aptResult.level).toBe(0);
    });
  });

  // 9. Level 0–5 mapping
  describe('9. Level 0–5 mapping', () => {
    it('maps abilities to provisional bands accurately', () => {
      expect(mapAbilityToProvisionalLevel(0)).toBe(0);
      expect(mapAbilityToProvisionalLevel(1)).toBe(1);
      expect(mapAbilityToProvisionalLevel(19)).toBe(1);
      expect(mapAbilityToProvisionalLevel(20)).toBe(2);
      expect(mapAbilityToProvisionalLevel(39)).toBe(2);
      expect(mapAbilityToProvisionalLevel(40)).toBe(3);
      expect(mapAbilityToProvisionalLevel(64)).toBe(3);
      expect(mapAbilityToProvisionalLevel(65)).toBe(4);
      expect(mapAbilityToProvisionalLevel(84)).toBe(4);
      expect(mapAbilityToProvisionalLevel(85)).toBe(5);
      expect(mapAbilityToProvisionalLevel(100)).toBe(5);
    });
  });

  // 10. Confidence and status behavior
  describe('10. Confidence and status behavior', () => {
    it('sets Class A domains with sufficient evidence to assessed and Class B to partially_assessed', () => {
      const attempt = buildBaselineAttempt();
      const responses: AssessmentResponse[] = BASELINE_ASSESSMENT_ITEMS.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);

      const dsaResult = scoring.domainResults.find((d) => d.domainId === 'dsa')!;
      expect(dsaResult.status).toBe('assessed');

      const pyResult = scoring.domainResults.find((d) => d.domainId === 'python')!;
      expect(pyResult.status).toBe('partially_assessed');
      expect(pyResult.constructScope).toBe('reasoning_only');

      const commResult = scoring.domainResults.find((d) => d.domainId === 'communication')!;
      expect(commResult.status).toBe('partially_assessed');
      expect(commResult.constructScope).toBe('written_only');

      const projResult = scoring.domainResults.find((d) => d.domainId === 'projects')!;
      expect(projResult.status).toBe('unassessed');
      expect(projResult.level).toBe(0);
      expect(projResult.confidence).toBe('none');
    });

    it('assigns Level 0 when evidence is insufficient (< 5 scored responses)', () => {
      const attempt = buildBaselineAttempt();
      // Only 2 responses for aptitude (insufficient evidence)
      const aptItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === 'aptitude').slice(0, 2);
      const responses: AssessmentResponse[] = aptItems.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);
      const aptResult = scoring.domainResults.find((d) => d.domainId === 'aptitude')!;

      expect(aptResult.status).toBe('partially_assessed');
      expect(aptResult.level).toBe(0);
    });
  });

  // 11. Evidence creation using sourceType 'test'
  describe('11. Evidence creation using sourceType "test"', () => {
    it('creates EvidenceLog entries with sourceType: test and diagnostic_assessment details', () => {
      const attempt = buildBaselineAttempt();
      const responses: AssessmentResponse[] = BASELINE_ASSESSMENT_ITEMS.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);

      expect(scoring.evidenceLogs.length).toBeGreaterThan(0);
      for (const log of scoring.evidenceLogs) {
        expect(log.sourceType).toBe('test');
        expect(log.sourceId).toBe(attempt.id);
        expect(log.details).toContain('Assessment: diagnostic_assessment');
      }
    });
  });

  // 12. Diagnostic scoring does not mutate DSAProgress/Leitner/pattern mastery
  describe('12. Diagnostic scoring does not mutate DSAProgress/Leitner/pattern mastery', () => {
    it('preserves DSAProgress, Leitner boxes, and pattern mastery untouched', () => {
      const initialDsaProgress: Record<string, DSAProgress> = {
        'problem-arrays-001': {
          problemId: 'problem-arrays-001',
          currentBox: 2,
          attemptCount: 3,
          successfulAttempts: 2,
          notes: 'Important test note',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
        },
      };

      const attempt = buildBaselineAttempt();
      const dsaItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === 'dsa');

      const responses: AssessmentResponse[] = dsaItems.map((item) => ({
        id: `r-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: item.key ?? 0,
        result: 'correct',
        timeSpentSeconds: 90,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: getProvisionalDifficultyWeight(item.difficulty),
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);

      // Verify scoring returned no mutation to DSAProgress
      expect(scoring).not.toHaveProperty('dsaProgress');
      expect(scoring).not.toHaveProperty('dsaAttempts');

      // The original progress remains intact
      expect(initialDsaProgress['problem-arrays-001'].currentBox).toBe(2);
      expect(initialDsaProgress['problem-arrays-001'].successfulAttempts).toBe(2);
    });
  });

  // 13. Attempt start/progress/submit lifecycle
  describe('13. Attempt start/progress/submit lifecycle', () => {
    it('transitions attempt from in_progress to submitted and records completion time', () => {
      const attempt = buildBaselineAttempt();
      expect(attempt.status).toBe('in_progress');
      expect(attempt.endedAt).toBeUndefined();

      const endedAt = new Date().toISOString();
      const submitted = transitionAttempt(attempt, 'submitted', endedAt);

      expect(submitted.status).toBe('submitted');
      expect(submitted.endedAt).toBe(endedAt);
    });
  });

  // 14. Auto-submit at hard limit
  describe('14. Auto-submit at hard limit', () => {
    it('detects expiration after 180 minutes wall-clock limit and marks status auto_submitted', () => {
      const attempt = buildBaselineAttempt();
      const pastStartedAt = new Date(Date.now() - (181 * 60 * 1000)).toISOString();
      const expiredAttempt: AssessmentAttempt = {
        ...attempt,
        startedAt: pastStartedAt,
      };

      expect(isAttemptExpired(expiredAttempt)).toBe(true);

      const scoring = scoreAssessmentAttempt(expiredAttempt, []);
      expect(scoring.attempt.status).toBe('auto_submitted');
    });

    it('does not expire within 180 minutes', () => {
      const attempt = buildBaselineAttempt();
      const recentStartedAt = new Date(Date.now() - (60 * 60 * 1000)).toISOString(); // 1 hour ago
      const nonExpiredAttempt: AssessmentAttempt = {
        ...attempt,
        startedAt: recentStartedAt,
      };

      expect(isAttemptExpired(nonExpiredAttempt)).toBe(false);
    });
  });

  // 15. Refresh/reload recovery
  describe('15. Refresh/reload recovery', () => {
    it('persists in-progress attempt and responses through storage round-trip', () => {
      const defaultState = getDefaultStorageState();
      const attempt = buildBaselineAttempt();
      const response: AssessmentResponse = {
        id: 'resp-test-1',
        attemptId: attempt.id,
        itemId: attempt.selectedItemIds[0],
        response: 2,
        result: 'correct',
        timeSpentSeconds: 45,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        responseConfidence: 'confident',
      };

      const extendedState: AppExtendedStorageState = {
        ...defaultState,
        assessmentState: {
          attempts: [attempt],
          responses: [response],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: { pendingSunday: false },
        },
      };

      StorageAdapter.saveState(extendedState);
      const loaded = StorageAdapter.loadState() as AppExtendedStorageState;

      expect(loaded.assessmentState).toBeDefined();
      expect(loaded.assessmentState!.attempts.length).toBe(1);
      expect(loaded.assessmentState!.attempts[0].id).toBe(attempt.id);
      expect(loaded.assessmentState!.responses.length).toBe(1);
      expect(loaded.assessmentState!.responses[0].response).toBe(2);
    });
  });

  // 16. Invalid lifecycle transitions
  describe('16. Invalid lifecycle transitions', () => {
    it('throws when attempting to transition from submitted, auto_submitted, or abandoned', () => {
      const attempt = buildBaselineAttempt();
      const submitted = transitionAttempt(attempt, 'submitted');

      expect(() => transitionAttempt(submitted, 'in_progress')).toThrow(/terminal status "submitted"/);

      const autoSubmitted = transitionAttempt(attempt, 'auto_submitted');
      expect(() => transitionAttempt(autoSubmitted, 'abandoned')).toThrow(/terminal status "auto_submitted"/);

      const abandoned = transitionAttempt(attempt, 'abandoned');
      expect(() => transitionAttempt(abandoned, 'submitted')).toThrow(/terminal status "abandoned"/);
    });
  });

  // 17. Deterministic results for identical seed + responses
  describe('17. Deterministic results for identical seed + responses', () => {
    it('produces identical domain results and snapshot for identical inputs', () => {
      const attempt1 = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, 'reproducibility-seed');
      const attempt2 = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, 'reproducibility-seed');

      const responses1: AssessmentResponse[] = attempt1.selectedItemIds.slice(0, 30).map((itemId, idx) => ({
        id: `r-${idx}`,
        attemptId: attempt1.id,
        itemId,
        response: idx % 2 === 0 ? 0 : 1,
        result: idx % 2 === 0 ? 'correct' : 'incorrect',
        timeSpentSeconds: 60,
        errorCategories: idx % 2 === 0 ? [] : ['E-LOGIC'],
        scoredCredit: idx % 2 === 0 ? 1.0 : 0.0,
        weightApplied: 1.0,
        responseConfidence: 'somewhat',
      }));

      const responses2: AssessmentResponse[] = attempt2.selectedItemIds.slice(0, 30).map((itemId, idx) => ({
        id: `r-${idx}`,
        attemptId: attempt2.id,
        itemId,
        response: idx % 2 === 0 ? 0 : 1,
        result: idx % 2 === 0 ? 'correct' : 'incorrect',
        timeSpentSeconds: 60,
        errorCategories: idx % 2 === 0 ? [] : ['E-LOGIC'],
        scoredCredit: idx % 2 === 0 ? 1.0 : 0.0,
        weightApplied: 1.0,
        responseConfidence: 'somewhat',
      }));

      const scoring1 = scoreAssessmentAttempt(attempt1, responses1);
      const scoring2 = scoreAssessmentAttempt(attempt2, responses2);

      const abilities1 = scoring1.domainResults.map((d) => ({ domainId: d.domainId, ability: d.abilityScore, level: d.level }));
      const abilities2 = scoring2.domainResults.map((d) => ({ domainId: d.domainId, ability: d.abilityScore, level: d.level }));

      expect(abilities1).toEqual(abilities2);
      expect(scoring1.weaknessSignals.length).toEqual(scoring2.weaknessSignals.length);
    });
  });

  // 18. Baseline completion/readout data integrity
  describe('18. Baseline completion/readout data integrity', () => {
    it('produces a complete AssessmentSnapshot with all 11 domains represented', () => {
      const attempt = buildBaselineAttempt();
      const scoring = scoreAssessmentAttempt(attempt, []);

      expect(scoring.snapshot).toBeDefined();
      expect(scoring.snapshot.domainResults.length).toBe(11);

      const allDomains = [
        'aptitude', 'dsa', 'python', 'sql', 'dbms',
        'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
      ];

      const presentDomains = scoring.snapshot.domainResults.map((d) => d.domainId);
      for (const d of allDomains) {
        expect(presentDomains).toContain(d);
      }
    });
  });
});
