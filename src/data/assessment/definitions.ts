import type { AssessmentDefinition } from '../../types';

/**
 * Baseline Diagnostic Assessment v1.0 Definition
 *
 * 180-minute hard limit across 10 modules, 84 items total.
 * Module structure, time budgets, item counts, and difficulty mixes per §6.2 of the specification.
 * (Projects domain excluded per §20).
 */
export const BASELINE_ASSESSMENT_DEFINITION: AssessmentDefinition = {
  id: 'baseline-diagnostic-v1',
  kind: 'diagnostic_assessment',
  name: 'PlacementOS Baseline Diagnostic Assessment',
  timeLimitMinutes: 180,
  modules: [
    // M1: Aptitude & Quant Reasoning - 25 min, 20 items
    {
      domainId: 'aptitude',
      timeBudget: 25,
      itemCount: 20,
      difficultyMix: { easy: 8, medium: 8, hard: 4 }, // 40/40/20
    },
    // M2: DSA Reasoning & Coding - 35 min, 9 items
    {
      domainId: 'dsa',
      timeBudget: 35,
      itemCount: 9,
      difficultyMix: { easy: 3, medium: 4, hard: 2 }, // 30/45/25
    },
    // M3: Python Code Reasoning - 15 min, 8 items
    {
      domainId: 'python',
      timeBudget: 15,
      itemCount: 8,
      difficultyMix: { easy: 3, medium: 4, hard: 1 }, // 35/45/20
    },
    // M4: SQL Query Reasoning - 15 min, 7 items
    {
      domainId: 'sql',
      timeBudget: 15,
      itemCount: 7,
      difficultyMix: { easy: 2, medium: 3, hard: 2 }, // 35/45/20
    },
    // M5: DBMS Concepts & Scenarios - 12 min, 8 items
    {
      domainId: 'dbms',
      timeBudget: 12,
      itemCount: 8,
      difficultyMix: { easy: 3, medium: 3, hard: 2 }, // 40/40/20
    },
    // M6: OOP Code Reasoning - 12 min, 7 items
    {
      domainId: 'oop',
      timeBudget: 12,
      itemCount: 7,
      difficultyMix: { easy: 3, medium: 3, hard: 1 }, // 40/40/20
    },
    // M7: OS Concepts & Scenarios - 10 min, 6 items
    {
      domainId: 'os',
      timeBudget: 10,
      itemCount: 6,
      difficultyMix: { easy: 2, medium: 2, hard: 2 }, // 40/40/20
    },
    // M8: CN Concepts & Scenarios - 10 min, 6 items
    {
      domainId: 'cn',
      timeBudget: 10,
      itemCount: 6,
      difficultyMix: { easy: 2, medium: 2, hard: 2 }, // 40/40/20
    },
    // M9: Communication - 16 min, 8 items (incl. 1 written response)
    {
      domainId: 'communication',
      timeBudget: 16,
      itemCount: 8,
      difficultyMix: { easy: 3, medium: 3, hard: 2 }, // 40/40/20
    },
    // M10: Interview Knowledge - 10 min, 5 items
    {
      domainId: 'interviews',
      timeBudget: 10,
      itemCount: 5,
      difficultyMix: { easy: 2, medium: 2, hard: 1 }, // 40/40/20
    },
  ],
  version: 1,
};

/**
 * Sunday Adaptive Mini Test Definition (§15)
 *
 * 90-minute hard limit.
 * Dynamic composition: 60% prior weaknesses, 20% recent material, 20% retention.
 * Estimated time budget <= 78 min (+ 12 min buffer).
 */
export const SUNDAY_MINI_TEST_DEFINITION: AssessmentDefinition = {
  id: 'sunday-mini-test-v1',
  kind: 'weekly_assessment',
  name: 'PlacementOS Sunday Adaptive Mini Test',
  timeLimitMinutes: 90,
  modules: [],
  version: 1,
};

/**
 * Full Diagnostic Reassessment Definition (§19)
 *
 * 180-minute hard limit across the 10 authoritative modules (84 items total).
 * Identical blueprint family to baseline diagnostic, measuring longitudinal progress
 * and evaluating regression/confirmation. (Projects domain excluded per §20).
 */
export const FULL_REASSESSMENT_DEFINITION: AssessmentDefinition = {
  id: 'full-reassessment-v1',
  kind: 'full_reassessment',
  name: 'PlacementOS Full Diagnostic Reassessment',
  timeLimitMinutes: 180,
  modules: BASELINE_ASSESSMENT_DEFINITION.modules,
  version: 1,
};

export const ASSESSMENT_DEFINITIONS: AssessmentDefinition[] = [
  BASELINE_ASSESSMENT_DEFINITION,
  SUNDAY_MINI_TEST_DEFINITION,
  FULL_REASSESSMENT_DEFINITION,
];