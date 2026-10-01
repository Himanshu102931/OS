// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBaselineAttempt,
  scoreAssessmentAttempt,
  deriveAssessmentProfileReadout,
  generateAssessmentPlanInputs,
  getRecommendedDifficulty,
  getRemediationAction,
  DOMAIN_METADATA,
  LEVEL_LABELS,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import type {
  AssessmentState,
  AssessmentResponse,
  DomainId,
  DSAProgress,
  DomainAssessmentResult,
  WeaknessSignal,
} from '../types';

describe('Phase D: Profile & Plan Readout Specification', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // Helper to create a completed mock assessment state
  function createMockCompletedAssessmentState(): AssessmentState {
    const attempt = buildBaselineAttempt();
    attempt.status = 'submitted';
    attempt.endedAt = '2026-10-01T10:00:00.000Z';

    const responses: AssessmentResponse[] = BASELINE_ASSESSMENT_ITEMS.map((item, idx) => ({
      id: `resp-${item.id}`,
      attemptId: attempt.id,
      itemId: item.id,
      response: idx % 3 === 0 ? -1 : (item.key ?? 0), // Mix of correct and incorrect
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

  // 1. All 11 domains appear in the profile
  describe('1. All 11 domains appear in the profile', () => {
    it('surfaces all 11 domains in the derived profile readout', () => {
      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);

      expect(readout.isAssessed).toBe(true);
      expect(readout.domainProfiles).toHaveLength(11);

      const allExpectedDomains: DomainId[] = [
        'aptitude', 'dsa', 'python', 'sql', 'dbms',
        'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
      ];

      const presentDomainIds = readout.domainProfiles.map((dp) => dp.domainId);
      for (const dId of allExpectedDomains) {
        expect(presentDomainIds).toContain(dId);
      }
    });
  });

  // 2. Level 0/ability/confidence/status mapping
  describe('2. Level 0/ability/confidence/status mapping', () => {
    it('keeps ability (0–100) and confidence (none/low/medium/high) separate', () => {
      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);

      for (const dp of readout.domainProfiles) {
        expect(typeof dp.abilityScore).toBe('number');
        expect(dp.abilityScore).toBeGreaterThanOrEqual(0);
        expect(dp.abilityScore).toBeLessThanOrEqual(100);

        expect(['none', 'low', 'medium', 'high']).toContain(dp.confidence);
        expect(typeof dp.level).toBe('number');
        expect([0, 1, 2, 3, 4, 5]).toContain(dp.level);
        expect(['assessed', 'partially_assessed', 'unassessed']).toContain(dp.status);
      }
    });

    it('adheres to Level 0 semantics: unassessed or 0 ability yields Level 0', () => {
      const unassessedReadout = deriveAssessmentProfileReadout(undefined);
      for (const dp of unassessedReadout.domainProfiles) {
        expect(dp.level).toBe(0);
        expect(dp.levelLabel).toBe(LEVEL_LABELS[0]);
        expect(dp.status).toBe('unassessed');
        expect(dp.confidence).toBe('none');
      }
    });

    it('maps difficulty to level accurately according to the §16 ladder', () => {
      expect(getRecommendedDifficulty(0)).toBe('easy');
      expect(getRecommendedDifficulty(1)).toBe('easy');
      expect(getRecommendedDifficulty(2)).toBe('easy');
      expect(getRecommendedDifficulty(3)).toBe('medium');
      expect(getRecommendedDifficulty(4)).toBe('hard');
      expect(getRecommendedDifficulty(5)).toBe('hard');
    });
  });

  // 3. Projects remain unassessed Level 0
  describe('3. Projects remain unassessed Level 0', () => {
    it('always preserves Projects as Level 0, status unassessed, and confidence none', () => {
      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);

      const projectsProfile = readout.domainProfiles.find((dp) => dp.domainId === 'projects');
      expect(projectsProfile).toBeDefined();
      expect(projectsProfile!.level).toBe(0);
      expect(projectsProfile!.abilityScore).toBe(0);
      expect(projectsProfile!.confidence).toBe('none');
      expect(projectsProfile!.status).toBe('unassessed');
      expect(projectsProfile!.category).toBe('Class C');
      expect(projectsProfile!.constructScope).toBe('project_evidence_only');
      expect(projectsProfile!.constructScopeNote).toContain('Project Lab');
    });
  });

  // 4. Class B scope limitations are represented
  describe('4. Class B scope limitations are represented', () => {
    it('includes explicit construct-scope limitations for Class B domains', () => {
      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);

      expect(DOMAIN_METADATA.python.category).toBe('Class B');
      expect(DOMAIN_METADATA.projects.category).toBe('Class C');
      const pythonProfile = readout.domainProfiles.find((dp) => dp.domainId === 'python')!;
      expect(pythonProfile.category).toBe('Class B');
      expect(pythonProfile.status).toBe('partially_assessed');
      expect(pythonProfile.constructScope).toBe('reasoning_only');
      expect(pythonProfile.constructScopeNote).toContain('dynamic execution');

      const commProfile = readout.domainProfiles.find((dp) => dp.domainId === 'communication')!;
      expect(commProfile.category).toBe('Class B');
      expect(commProfile.status).toBe('partially_assessed');
      expect(commProfile.constructScope).toBe('written_only');
      expect(commProfile.constructScopeNote).toContain('spoken');

      const interviewProfile = readout.domainProfiles.find((dp) => dp.domainId === 'interviews')!;
      expect(interviewProfile.category).toBe('Class B');
      expect(interviewProfile.status).toBe('partially_assessed');
      expect(interviewProfile.constructScope).toBe('interview_knowledge_only');
      expect(interviewProfile.constructScopeNote).toContain('interactive');
    });
  });

  // 5. Strength/weakness signals are derived deterministically
  describe('5. Strength/weakness signals are derived deterministically', () => {
    it('derives actionable remediation guidance for weaknesses based on error taxonomy', () => {
      expect(getRemediationAction('E-CONCEPT', 'SQL Joins')).toContain('fundamental concepts');
      expect(getRemediationAction('E-APPLY', 'Binary Search')).toContain('scenario application');
      expect(getRemediationAction('E-CORNER', 'Linked Lists')).toContain('edge cases');
      expect(getRemediationAction('E-SPEED', 'Aptitude Quant')).toContain('timed practice');
    });

    it('identifies confirmed strengths only when level >= 4 and confidence >= medium', () => {
      const domainResults: DomainAssessmentResult[] = [
        {
          domainId: 'dsa',
          abilityScore: 88,
          level: 5,
          confidence: 'high',
          status: 'assessed',
          coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: ['arr', 'tree'], difficultyBands: [1, 2, 3] },
          assessmentDate: '2026-10-01',
          provisional: true,
          attemptId: 'att-1',
          kind: 'diagnostic_assessment',
        },
        {
          domainId: 'sql',
          abilityScore: 70,
          level: 4,
          confidence: 'low', // Low confidence: must NOT qualify as confirmed strength
          status: 'assessed',
          coverage: { topicsCovered: 2, topicsTotal: 4, competenciesCovered: ['select'], difficultyBands: [1] },
          assessmentDate: '2026-10-01',
          provisional: true,
          attemptId: 'att-1',
          kind: 'diagnostic_assessment',
        },
      ];

      const planInputs = generateAssessmentPlanInputs(domainResults, []);
      expect(planInputs.strengths).toHaveLength(1);
      expect(planInputs.strengths[0].domainId).toBe('dsa');
    });
  });

  // 6. Assessment evidence remains sourceType 'test'
  describe('6. Assessment evidence remains sourceType "test"', () => {
    it('ensures evidence logs emitted from baseline assessment use sourceType: "test"', () => {
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
        weightApplied: 1.0,
        responseConfidence: 'confident',
      }));

      const scoring = scoreAssessmentAttempt(attempt, responses);
      expect(scoring.evidenceLogs.length).toBeGreaterThan(0);
      for (const log of scoring.evidenceLogs) {
        expect(log.sourceType).toBe('test');
        expect(log.details).toContain('Assessment: diagnostic_assessment');
      }
    });
  });

  // 7. Assessment profile does not mutate normal DSA/practice mastery
  describe('7. Assessment profile does not mutate normal DSA/practice mastery', () => {
    it('reading out or generating plan inputs does not write or mutate DSAProgress or Leitner boxes', () => {
      const initialDsaProgress: Record<string, DSAProgress> = {
        'problem-arrays-001': {
          problemId: 'problem-arrays-001',
          currentBox: 3,
          attemptCount: 5,
          successfulAttempts: 4,
          notes: 'Immutable mastery state',
          createdAt: '2026-09-01',
          updatedAt: '2026-09-15',
        },
      };

      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);

      // Verify no side-effect modifications
      expect(readout).toBeDefined();
      expect(initialDsaProgress['problem-arrays-001'].currentBox).toBe(3);
      expect(initialDsaProgress['problem-arrays-001'].successfulAttempts).toBe(4);
    });
  });

  // 8. Baseline profile produces deterministic planning inputs
  describe('8. Baseline profile produces deterministic planning inputs', () => {
    it('produces priority ranked starting points for all 11 domains', () => {
      const state = createMockCompletedAssessmentState();
      const readout = deriveAssessmentProfileReadout(state);
      const planInputs = readout.planInputs;

      expect(planInputs.startingPoints).toHaveLength(11);
      // Ensure priorityRank is 1 through 11
      const ranks = planInputs.startingPoints.map((sp) => sp.priorityRank);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

      // Projects is placed according to baseline exclusion
      const projectsSp = planInputs.startingPoints.find((sp) => sp.domainId === 'projects');
      expect(projectsSp).toBeDefined();
      expect(projectsSp!.priorityRank).toBe(11);
      expect(projectsSp!.reason).toContain('Project Lab');
    });

    it('elevates review frequency multiplier to 1.5x and priority multiplier to 1.3x for domains with open weaknesses', () => {
      const domainResults: DomainAssessmentResult[] = [
        {
          domainId: 'sql',
          abilityScore: 35,
          level: 2,
          confidence: 'medium',
          status: 'assessed',
          coverage: { topicsCovered: 3, topicsTotal: 4, competenciesCovered: ['joins'], difficultyBands: [1, 2] },
          assessmentDate: '2026-10-01',
          provisional: true,
          attemptId: 'att-1',
          kind: 'diagnostic_assessment',
        },
      ];

      const weaknessSignals: WeaknessSignal[] = [
        {
          id: 'ws-sql-joins',
          domainId: 'sql',
          topicId: 'prep-sql',
          competency: 'Relational Joins',
          errorCategory: 'E-CONCEPT',
          strength: 3,
          status: 'open',
          firstSeenAt: '2026-10-01',
          lastSeenAt: '2026-10-01',
          occurrences: 1,
          sourceAttemptIds: ['att-1'],
        },
      ];

      const planInputs = generateAssessmentPlanInputs(domainResults, weaknessSignals);
      const sqlEmphasis = planInputs.domainEmphases['sql'];

      expect(sqlEmphasis.reviewFrequencyMultiplier).toBe(1.5);
      expect(sqlEmphasis.priorityMultiplier).toBe(1.3);
      expect(sqlEmphasis.initialDifficulty).toBe('easy');
      expect(sqlEmphasis.openWeaknessesCount).toBe(1);
    });

    it('produces identical planning inputs for identical inputs (determinism)', () => {
      const state = createMockCompletedAssessmentState();
      const planInputs1 = generateAssessmentPlanInputs(state.domainResults, state.weaknessSignals);
      const planInputs2 = generateAssessmentPlanInputs(state.domainResults, state.weaknessSignals);

      expect(planInputs1).toEqual(planInputs2);
    });
  });

  // 9. Profile/readout survives persistence/reload
  describe('9. Profile/readout survives persistence/reload', () => {
    it('reconstructs the exact same profile readout after round-tripping through StorageAdapter', () => {
      const defaultState = getDefaultStorageState();
      const mockState = createMockCompletedAssessmentState();

      const extendedState: AppExtendedStorageState = {
        ...defaultState,
        assessmentState: mockState,
      };

      StorageAdapter.saveState(extendedState);
      const loaded = StorageAdapter.loadState() as AppExtendedStorageState;

      expect(loaded.assessmentState).toBeDefined();

      const readoutOriginal = deriveAssessmentProfileReadout(mockState);
      const readoutReloaded = deriveAssessmentProfileReadout(loaded.assessmentState);

      expect(readoutReloaded.isAssessed).toBe(true);
      expect(readoutReloaded.overallAbility).toBe(readoutOriginal.overallAbility);
      expect(readoutReloaded.assessedDomainsCount).toBe(readoutOriginal.assessedDomainsCount);
      expect(readoutReloaded.domainProfiles.length).toBe(11);
      expect(readoutReloaded.domainProfiles.map((d) => d.level)).toEqual(readoutOriginal.domainProfiles.map((d) => d.level));
      expect(readoutReloaded.planInputs.startingPoints.map((s) => s.priorityRank)).toEqual(
        readoutOriginal.planInputs.startingPoints.map((s) => s.priorityRank)
      );
    });
  });

  // 10. Incomplete or missing assessment state is handled safely
  describe('10. Incomplete or missing assessment state is handled safely', () => {
    it('handles undefined assessmentState gracefully with 11 Level 0 unassessed domains', () => {
      const readout = deriveAssessmentProfileReadout(undefined);

      expect(readout.isAssessed).toBe(false);
      expect(readout.domainProfiles).toHaveLength(11);
      expect(readout.strengths).toHaveLength(0);
      expect(readout.weaknesses).toHaveLength(0);
      expect(readout.overallAbility).toBe(0);
      expect(readout.assessedDomainsCount).toBe(0);

      for (const dp of readout.domainProfiles) {
        expect(dp.level).toBe(0);
        expect(dp.status).toBe('unassessed');
        expect(dp.confidence).toBe('none');
      }

      expect(readout.planInputs.startingPoints).toHaveLength(11);
    });

    it('handles empty arrays in generateAssessmentPlanInputs safely', () => {
      const planInputs = generateAssessmentPlanInputs([], []);

      expect(planInputs.startingPoints).toHaveLength(11);
      expect(planInputs.weaknessFocusAreas).toHaveLength(0);
      expect(planInputs.strengths).toHaveLength(0);
      expect(planInputs.overallReadinessSummary.assessedDomainsCount).toBe(0);
      expect(planInputs.overallReadinessSummary.averageAbility).toBe(0);
    });
  });
});
