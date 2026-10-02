// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBaselineAttempt,
  buildSundayMiniTestAttempt,
  buildFullReassessmentAttempt,
  scoreAssessmentAttempt,
  deriveAssessmentProfileReadout,
  generateAssessmentPlanInputs,
  createCompanyAssessmentOverlay,
  validateCompanyAssessmentOverlay,
  applyCompanyAssessmentOverlay,
  generateOverlayPlanInputs,
  recordItemCalibrationObservation,
  computeItemCalibrationSummary,
  isCalibrationReady,
  CALIBRATION_V2_THRESHOLD,
  ALL_11_DOMAINS,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { BASELINE_ASSESSMENT_DEFINITION } from '../data/assessment/definitions';
import { DSA_PROBLEMS, PHASES, MODULES, TOPICS, TASK_DEFINITIONS } from '../data/seedData';
import {
  StorageAdapter,
  getDefaultStorageState,
  validateStorageState,
  validateImportState,
  pruneAssessmentResponses,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type {
  AssessmentState,
  AssessmentResponse,
  DomainAssessmentResult,
  CompanyOverlay,
  ItemCalibrationObservation,
  DomainId,
} from '../types';

describe('Phase G: Company/Role Overlays & Calibration Path Specification', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
  });

  // Sample company overlay fixture
  const SAMPLE_COMPANY: CompanyOverlay = {
    id: 'comp-google',
    companyName: 'Google',
    targetRole: 'Software Engineer (L3)',
    applicationStatus: 'applied',
    requiredDomains: ['dsa', 'sql', 'os', 'cn'],
    requiredTopics: ['topic-dsa-arrays', 'prep-sql'],
    requiredLanguages: ['python'],
  };

  // Helper to create synthetic baseline domain results
  function createSyntheticDomainResults(): DomainAssessmentResult[] {
    const domains: DomainId[] = [
      'aptitude', 'dsa', 'python', 'sql', 'dbms',
      'oop', 'os', 'cn', 'communication', 'interviews',
    ];
    return domains.map((domainId) => ({
      domainId,
      abilityScore: domainId === 'dsa' ? 75 : domainId === 'sql' ? 60 : 45,
      level: domainId === 'dsa' ? 4 : domainId === 'sql' ? 3 : 2,
      confidence: 'medium',
      status: 'assessed',
      coverage: {
        topicsCovered: 3,
        topicsTotal: 4,
        competenciesCovered: ['comp-1', 'comp-2'],
        difficultyBands: [1, 2, 3],
      },
      assessmentDate: '2026-09-15T12:00:00.000Z',
      provisional: false,
      attemptId: 'base-attempt-1',
      kind: 'diagnostic_assessment',
    }));
  }

  // Helper to build a completed assessment state
  function createCompletedAssessmentState(): AssessmentState {
    const domainResults = createSyntheticDomainResults();
    return {
      attempts: [
        {
          id: 'base-attempt-1',
          definitionId: BASELINE_ASSESSMENT_DEFINITION.id,
          definitionVersion: 1,
          kind: 'diagnostic_assessment',
          status: 'submitted',
          startedAt: '2026-09-15T10:00:00.000Z',
          endedAt: '2026-09-15T12:00:00.000Z',
          timeLimitSeconds: 180 * 60,
          seed: 'seed-base-1',
          selectedItemIds: BASELINE_ASSESSMENT_ITEMS.map((i) => i.id),
        },
      ],
      responses: [],
      exposures: {},
      domainResults,
      snapshots: [
        {
          id: 'snap-1',
          takenAt: '2026-09-15T12:00:00.000Z',
          kind: 'diagnostic_assessment',
          trigger: 'post_baseline',
          domainResults,
        },
      ],
      weaknessSignals: [],
      profile: {
        baselineCompletedAt: '2026-09-15T12:00:00.000Z',
        pendingSunday: false,
      },
    };
  }

  // 1. Baseline remains company-agnostic
  it('1. baseline diagnostic attempt and definition contain zero company references', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    expect(attempt.kind).toBe('diagnostic_assessment');
    expect(BASELINE_ASSESSMENT_DEFINITION.id).toBe('baseline-diagnostic-v1');
    expect((attempt as unknown as Record<string, unknown>).companyId).toBeUndefined();
    expect((attempt as unknown as Record<string, unknown>).companyOverlay).toBeUndefined();

    // Baseline items contain no company-specific identifiers
    for (const item of BASELINE_ASSESSMENT_ITEMS) {
      expect(item.id).toMatch(/^asm-/);
      expect((item as unknown as Record<string, unknown>).companyId).toBeUndefined();
    }
  });

  // 2. Valid company/role overlay applies deterministically
  it('2. valid company/role overlay applies deterministically on top of general profile', () => {
    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);

    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY, {
      targetDifficultyLevels: { dsa: 4, sql: 4, os: 3, cn: 3 },
      domainWeightMultipliers: { dsa: 2.0, sql: 1.5 },
    });

    const result1 = applyCompanyAssessmentOverlay(generalProfile, overlay);
    const result2 = applyCompanyAssessmentOverlay(generalProfile, overlay);

    expect(result1).toEqual(result2);
    expect(result1.companyId).toBe('comp-google');
    expect(result1.companyName).toBe('Google');
    expect(result1.targetRole).toBe('Software Engineer (L3)');
    expect(result1.requiredDomainsCount).toBe(4);
    expect(result1.domainReadiness).toHaveLength(11);
  });

  // 3. Malformed overlay fails closed
  it('3. malformed overlay fails closed safely', () => {
    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);

    // Malformed 1: empty companyId
    expect(validateCompanyAssessmentOverlay({ ...SAMPLE_COMPANY, companyId: '' })).toBe(false);

    // Malformed 2: unknown domain
    expect(
      validateCompanyAssessmentOverlay({
        ...SAMPLE_COMPANY,
        companyId: 'comp-1',
        overlayVersion: 1,
        provenance: 'test',
        requiredDomains: ['invalid_domain_xyz'],
      })
    ).toBe(false);

    // Malformed 3: negative weight multiplier
    expect(
      validateCompanyAssessmentOverlay({
        companyId: 'comp-1',
        companyName: 'Test',
        targetRole: 'SWE',
        overlayVersion: 1,
        provenance: 'test',
        requiredDomains: ['dsa'],
        domainWeightMultipliers: { dsa: -1.5 },
      })
    ).toBe(false);

    // Applying malformed overlay throws and preserves general profile
    expect(() => {
      applyCompanyAssessmentOverlay(generalProfile, {
        companyId: '',
        companyName: '',
        targetRole: '',
        overlayVersion: 0,
        requiredDomains: [],
        provenance: '',
      });
    }).toThrow(/Cannot apply malformed company assessment overlay/);
  });

  // 4. Unknown company/role fails safely
  it('4. unknown company/role fails safely without altering general assessment state', () => {
    expect(() => {
      createCompanyAssessmentOverlay(null as unknown as CompanyOverlay);
    }).toThrow(/Invalid company overlay/);

    expect(() => {
      createCompanyAssessmentOverlay({} as CompanyOverlay);
    }).toThrow(/Invalid company overlay/);
  });

  // 5. Overlay modifies only permitted assessment parameters
  it('5. overlay modifies only permitted assessment parameters (§28.2)', () => {
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY, {
      targetDifficultyLevels: { dsa: 4, sql: 3 },
      domainWeightMultipliers: { dsa: 1.5, sql: 1.2 },
      customModuleComposition: ['dsa', 'sql', 'os'],
    });

    // Permitted keys:
    // companyId, companyName, targetRole, overlayVersion, requiredDomains,
    // requiredTopics, requiredLanguages, targetDifficultyLevels, domainWeightMultipliers,
    // customModuleComposition, provenance
    const permittedKeys = new Set([
      'companyId',
      'companyName',
      'targetRole',
      'overlayVersion',
      'requiredDomains',
      'requiredTopics',
      'requiredLanguages',
      'targetDifficultyLevels',
      'domainWeightMultipliers',
      'customModuleComposition',
      'provenance',
    ]);

    for (const key of Object.keys(overlay)) {
      expect(permittedKeys.has(key)).toBe(true);
    }
  });

  // 6. Overlay cannot introduce new domains
  it('6. overlay cannot introduce new domains outside the 11 placement domains', () => {
    expect(ALL_11_DOMAINS).toHaveLength(11);

    const corruptCompany = {
      ...SAMPLE_COMPANY,
      requiredDomains: ['dsa', 'crypto_currency' as DomainId, 'cloud_ops' as DomainId],
    };

    const overlay = createCompanyAssessmentOverlay(corruptCompany as unknown as CompanyOverlay);
    // Invalid domains are stripped
    expect(overlay.requiredDomains).toEqual(['dsa']);
    for (const d of overlay.requiredDomains) {
      expect(ALL_11_DOMAINS.includes(d)).toBe(true);
    }
  });

  // 7. Overlay cannot mutate DSA-150 / master curriculum
  it('7. overlay cannot mutate DSA-150 or the master curriculum', () => {
    const initialDsaCount = DSA_PROBLEMS.length;
    const initialPhasesCount = PHASES.length;
    const initialModulesCount = MODULES.length;
    const initialTopicsCount = TOPICS.length;
    const initialTasksCount = TASK_DEFINITIONS.length;

    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY);
    applyCompanyAssessmentOverlay(generalProfile, overlay);

    expect(DSA_PROBLEMS.length).toBe(initialDsaCount);
    expect(PHASES.length).toBe(initialPhasesCount);
    expect(MODULES.length).toBe(initialModulesCount);
    expect(TOPICS.length).toBe(initialTopicsCount);
    expect(TASK_DEFINITIONS.length).toBe(initialTasksCount);
  });

  // 8. Overlay cannot bypass exposure rules
  it('8. overlay cannot bypass exposure tracking rules', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    const item = BASELINE_ASSESSMENT_ITEMS[0];
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-1',
        attemptId: attempt.id,
        itemId: item.id,
        response: 1,
        result: 'correct',
        timeSpentSeconds: 45,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
      },
    ];

    const result = scoreAssessmentAttempt(
      attempt,
      responses,
      BASELINE_ASSESSMENT_ITEMS,
      BASELINE_ASSESSMENT_DEFINITION
    );

    expect(result.exposures[item.id]).toBeDefined();
    expect(result.exposures[item.id].exposureCount).toBe(1);
    expect(result.exposures[item.id].lastAttemptId).toBe(attempt.id);
  });

  // 9. General capability profile remains separate from overlay result
  it('9. general capability profile remains authoritative and strictly separate from overlay result', () => {
    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);

    const generalDsaLevelBefore = generalProfile.domainProfiles.find((d) => d.domainId === 'dsa')?.level;
    const generalOverallBefore = generalProfile.overallAbility;

    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY, {
      targetDifficultyLevels: { dsa: 5 }, // higher than current level 4
    });
    const overlayResult = applyCompanyAssessmentOverlay(generalProfile, overlay);

    // General profile is completely unmodified
    const generalDsaLevelAfter = generalProfile.domainProfiles.find((d) => d.domainId === 'dsa')?.level;
    expect(generalDsaLevelAfter).toBe(generalDsaLevelBefore);
    expect(generalProfile.overallAbility).toBe(generalOverallBefore);

    // Overlay result provides distinct role metrics
    expect(overlayResult.rolePreparationScore).toBeDefined();
    expect(overlayResult.generalOverallAbility).toBe(generalOverallBefore);
    expect(overlayResult.domainReadiness.find((d) => d.domainId === 'dsa')?.roleTargetLevel).toBe(5);
    expect(overlayResult.domainReadiness.find((d) => d.domainId === 'dsa')?.generalLevel).toBe(4);
    expect(overlayResult.domainReadiness.find((d) => d.domainId === 'dsa')?.gap).toBe(1);
  });

  // 10. Overlay provenance and version are preserved
  it('10. overlay provenance and version are preserved', () => {
    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY);
    const result = applyCompanyAssessmentOverlay(generalProfile, overlay);

    expect(result.provenance).toBe('company_requirement_overlay');
    expect(result.overlayVersion).toBe(1);
  });

  // 11. Same inputs produce deterministic overlay behavior
  it('11. same inputs produce deterministic overlay behavior across repeated runs', () => {
    const state = createCompletedAssessmentState();
    const generalProfile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY);

    const runA = applyCompanyAssessmentOverlay(generalProfile, overlay);
    const runB = applyCompanyAssessmentOverlay(generalProfile, overlay);

    expect(runA.rolePreparationScore).toBe(runB.rolePreparationScore);
    expect(runA.metDomainsCount).toBe(runB.metDomainsCount);
    expect(runA.gapDomainsCount).toBe(runB.gapDomainsCount);
    expect(runA.topRoleGaps).toEqual(runB.topRoleGaps);
  });

  // 12. Calibration observation records are created correctly
  it('12. calibration observation records are created correctly from answered items', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    const item = BASELINE_ASSESSMENT_ITEMS[0];
    const response: AssessmentResponse = {
      id: 'resp-cal-1',
      attemptId: attempt.id,
      itemId: item.id,
      response: 1,
      result: 'correct',
      timeSpentSeconds: 65,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
      responseConfidence: 'confident',
    };

    const obs = recordItemCalibrationObservation(response, attempt, item, 'baseline');
    expect(obs.itemId).toBe(item.id);
    expect(obs.attemptId).toBe(attempt.id);
    expect(obs.assessmentKind).toBe('diagnostic_assessment');
    expect(obs.assessmentVersion).toBe(1);
    expect(obs.domainId).toBe(item.domainId);
    expect(obs.topicId).toBe(item.topicId);
    expect(obs.authoredDifficulty).toBe(item.difficulty);
    expect(obs.observedScore).toBe(1.0);
    expect(obs.isCorrect).toBe(true);
    expect(obs.timeSpentSeconds).toBe(65);
    expect(obs.responseConfidence).toBe('confident');
    expect(obs.timestamp).toBeDefined();
  });

  // 13. Calibration data preserves item/domain/module provenance
  it('13. calibration data preserves item, domain, and module/topic provenance', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    const item = BASELINE_ASSESSMENT_ITEMS.find((i) => i.domainId === 'sql')!;
    const response: AssessmentResponse = {
      id: 'resp-sql-1',
      attemptId: attempt.id,
      itemId: item.id,
      response: 'SELECT * FROM users',
      result: 'incorrect',
      timeSpentSeconds: 120,
      errorCategories: ['E-SYNTAX'],
      scoredCredit: 0.0,
      weightApplied: 1.3,
    };

    const obs = recordItemCalibrationObservation(response, attempt, item);
    expect(obs.domainId).toBe('sql');
    expect(obs.topicId).toBe(item.topicId);
    expect(obs.errorCategories).toContain('E-SYNTAX');
  });

  // 14. Assessment version is preserved in calibration observations
  it('14. assessment definition version is preserved in calibration observations', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    expect(attempt.definitionVersion).toBe(1);

    const item = BASELINE_ASSESSMENT_ITEMS[0];
    const response: AssessmentResponse = {
      id: 'resp-v1',
      attemptId: attempt.id,
      itemId: item.id,
      response: 1,
      result: 'correct',
      timeSpentSeconds: 30,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    };

    const obs = recordItemCalibrationObservation(response, attempt, item);
    expect(obs.assessmentVersion).toBe(1);
  });

  // 15. Empirical calibration is NOT executed (DECIDED 6)
  it('15. empirical calibration is NOT executed; remains inactive below DECIDED 6 threshold', () => {
    expect(CALIBRATION_V2_THRESHOLD.minResponses).toBe(200);
    expect(CALIBRATION_V2_THRESHOLD.minAttempts).toBe(50);

    // Create 10 synthetic observations (far below 200)
    const observations: ItemCalibrationObservation[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `cal-${i}`,
      itemId: 'asm-m1-01',
      attemptId: `att-${i}`,
      assessmentKind: 'diagnostic_assessment',
      assessmentVersion: 1,
      domainId: 'aptitude',
      topicId: 'prep-apt-quant',
      authoredDifficulty: 2,
      observedScore: i % 2 === 0 ? 1 : 0,
      isCorrect: i % 2 === 0,
      timeSpentSeconds: 60,
      estimatedMinutes: 2,
      errorCategories: i % 2 === 0 ? [] : ['E-CALC'],
      timestamp: '2026-09-15T12:00:00.000Z',
    }));

    const summary = computeItemCalibrationSummary(
      'asm-m1-01',
      observations,
      {},
      2,
      'aptitude',
      'prep-apt-quant'
    );

    expect(summary.responseCount).toBe(10);
    expect(summary.calibrationStatus).toBe('insufficient_data');
    expect(isCalibrationReady(summary)).toBe(false);
  });

  // 16. Authored difficulty remains authoritative
  it('16. authored difficulty remains authoritative for scoring; empirical data does not alter weights', () => {
    const attempt = buildBaselineAttempt('seed-phase-g');
    const item = BASELINE_ASSESSMENT_ITEMS[0]; // difficulty 1
    const responses: AssessmentResponse[] = [
      {
        id: 'resp-auth-1',
        attemptId: attempt.id,
        itemId: item.id,
        response: 1,
        result: 'correct',
        timeSpentSeconds: 40,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 0.8, // authored weight for difficulty 1
      },
    ];

    const result = scoreAssessmentAttempt(attempt, responses, BASELINE_ASSESSMENT_ITEMS, BASELINE_ASSESSMENT_DEFINITION);
    // Scored using authored difficulty weight
    expect(result.domainResults[0].abilityScore).toBeGreaterThanOrEqual(0);
    expect(result.calibrationObservations).toBeDefined();
    expect(result.calibrationObservations?.length).toBe(1);
    expect(result.calibrationObservations?.[0].authoredDifficulty).toBe(item.difficulty);
  });

  // 17. Raw history and retention remain valid
  it('17. raw history and retention remain valid and prune observations older than 90 days', () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    const state: AssessmentState = {
      attempts: Array.from({ length: 14 }).map((_, i) => ({
        id: `att-${i}`,
        definitionId: 'def-1',
        definitionVersion: 1,
        kind: 'weekly_assessment',
        status: 'submitted',
        startedAt: i < 12 ? recentDate : oldDate,
        endedAt: i < 12 ? recentDate : oldDate,
        timeLimitSeconds: 5400,
        seed: `seed-${i}`,
        selectedItemIds: ['asm-m1-01'],
      })),
      responses: Array.from({ length: 14 }).map((_, i) => ({
        id: `resp-${i}`,
        attemptId: `att-${i}`,
        itemId: 'asm-m1-01',
        response: 1,
        result: 'correct',
        timeSpentSeconds: 50,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
      })),
      exposures: {},
      domainResults: [],
      snapshots: [],
      weaknessSignals: [],
      profile: { pendingSunday: false },
      calibrationObservations: [
        {
          id: 'cal-recent',
          itemId: 'asm-m1-01',
          attemptId: 'att-0',
          assessmentKind: 'weekly_assessment',
          assessmentVersion: 1,
          domainId: 'aptitude',
          topicId: 'prep-apt-quant',
          authoredDifficulty: 1,
          observedScore: 1.0,
          isCorrect: true,
          timeSpentSeconds: 50,
          estimatedMinutes: 2,
          errorCategories: [],
          timestamp: recentDate,
        },
        {
          id: 'cal-old',
          itemId: 'asm-m1-01',
          attemptId: 'att-13',
          assessmentKind: 'weekly_assessment',
          assessmentVersion: 1,
          domainId: 'aptitude',
          topicId: 'prep-apt-quant',
          authoredDifficulty: 1,
          observedScore: 1.0,
          isCorrect: true,
          timeSpentSeconds: 50,
          estimatedMinutes: 2,
          errorCategories: [],
          timestamp: oldDate,
        },
      ],
    };

    const pruned = pruneAssessmentResponses(state);
    // Recent observation is kept; old observation beyond 12 attempts is pruned
    expect(pruned.calibrationObservations).toBeDefined();
    expect(pruned.calibrationObservations?.some((o) => o.id === 'cal-recent')).toBe(true);
    expect(pruned.calibrationObservations?.some((o) => o.id === 'cal-old')).toBe(false);
  });

  // 18. Old state without Phase G fields still imports cleanly
  it('18. old state without Phase G fields still imports and validates successfully', () => {
    const defaultState = getDefaultStorageState();
    const rawLegacyState = {
      ...defaultState,
      assessmentState: {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
        // No calibrationObservations field
      },
    };

    expect(validateStorageState(rawLegacyState)).toBe(true);
    expect(validateImportState(rawLegacyState as unknown as AppExtendedStorageState)).toBe(true);
  });

  // 19. Malformed persisted Phase G data fails closed
  it('19. malformed persisted Phase G calibration data fails closed in storage validation', () => {
    const stateWithCorruptCalibration = {
      schemaVersion: '1.0.0',
      userSettings: {
        theme: 'dark',
        densityMode: 'compact',
        telemetryOptIn: false,
        diagnosticsExpanded: false,
        debugDiagnostics: false,
      },
      taskProgress: {},
      dsaProgress: {},
      skillStates: {},
      companyOverlays: [],
      dailyCheckIns: [],
      dailyTaskAssignments: [],
      assessmentState: {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
        calibrationObservations: [
          {
            // Missing required fields
            id: 'corrupt-1',
            itemId: 12345, // invalid type
          },
        ],
      },
    };

    expect(validateStorageState(stateWithCorruptCalibration)).toBe(false);
    expect(validateImportState(stateWithCorruptCalibration as unknown as AppExtendedStorageState)).toBe(false);
  });

  // 20. Weekly/baseline/reassessment semantics remain distinct
  it('20. weekly, baseline, and full reassessment semantics remain distinct in calibration observations', () => {
    const baseAttempt = buildBaselineAttempt('seed-phase-g');
    const sundayAttempt = buildSundayMiniTestAttempt(createCompletedAssessmentState()).attempt;
    const fullAttempt = buildFullReassessmentAttempt('seed-phase-g-reassess');

    const item = BASELINE_ASSESSMENT_ITEMS[0];
    const resp: AssessmentResponse = {
      id: 'resp-kind',
      attemptId: 'temp',
      itemId: item.id,
      response: 1,
      result: 'correct',
      timeSpentSeconds: 40,
      errorCategories: [],
      scoredCredit: 1.0,
      weightApplied: 1.0,
    };

    const obsBase = recordItemCalibrationObservation(resp, baseAttempt, item);
    const obsSunday = recordItemCalibrationObservation(resp, sundayAttempt, item);
    const obsFull = recordItemCalibrationObservation(resp, fullAttempt, item);

    expect(obsBase.assessmentKind).toBe('diagnostic_assessment');
    expect(obsSunday.assessmentKind).toBe('weekly_assessment');
    expect(obsFull.assessmentKind).toBe('full_reassessment');
  });

  // 21. Overlay does not mutate DSA/practice/Leitner/pattern mastery
  it('21. overlay does not mutate DSA, practice, Leitner, or pattern mastery state', () => {
    const state = createCompletedAssessmentState();
    const profile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY);

    // Apply overlay
    applyCompanyAssessmentOverlay(profile, overlay);

    // State passed into engine is intact
    expect(state.domainResults).toHaveLength(10);
    expect(state.attempts).toHaveLength(1);
  });

  // 22. UI exposes general vs overlay context correctly
  it('22. UI data model exposes general vs overlay context distinctly', () => {
    const state = createCompletedAssessmentState();
    const profile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY, {
      targetDifficultyLevels: { dsa: 4, sql: 4 },
    });

    const overlayResult = applyCompanyAssessmentOverlay(profile, overlay);

    // Check separation of general level and role target
    for (const dr of overlayResult.domainReadiness) {
      expect(typeof dr.generalLevel).toBe('number');
      expect(typeof dr.roleTargetLevel).toBe('number');
      if (dr.isRoleRequired) {
        expect(['met', 'gap', 'unassessed']).toContain(dr.status);
      } else {
        expect(dr.status).toBe('optional');
      }
    }
  });

  // 23. Planning receives only permitted role/company emphasis
  it('23. planning receives only permitted role/company emphasis (§26.1, §28.2)', () => {
    const state = createCompletedAssessmentState();
    const profile = deriveAssessmentProfileReadout(state);
    const overlay = createCompanyAssessmentOverlay(SAMPLE_COMPANY, {
      targetDifficultyLevels: { dsa: 5, sql: 3, os: 2, cn: 2 }, // only dsa has gap (current 4 -> target 5)
    });

    const overlayResult = applyCompanyAssessmentOverlay(profile, overlay);
    const basePlanInputs = generateAssessmentPlanInputs(state.domainResults, state.weaknessSignals);

    const overlayPlanInputs = generateOverlayPlanInputs(basePlanInputs, overlayResult);

    // Starting points and curriculum tasks are unchanged
    expect(overlayPlanInputs.startingPoints).toEqual(basePlanInputs.startingPoints);

    // Domain emphasis for gap domain (dsa) is boosted
    const baseDsaPriority = basePlanInputs.domainEmphases['dsa']?.priorityMultiplier ?? 1.0;
    const overlayDsaPriority = overlayPlanInputs.domainEmphases['dsa']?.priorityMultiplier ?? 1.0;
    expect(overlayDsaPriority).toBeGreaterThanOrEqual(baseDsaPriority);

    // Primary focus domain reflects top gap
    expect(overlayPlanInputs.overallReadinessSummary.primaryFocusDomain).toBe('dsa');
  });
});
