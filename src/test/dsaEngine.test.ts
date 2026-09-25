import { describe, it, expect } from 'vitest';
import { DSA_PROBLEMS, PATTERN_LESSONS, LEARNING_RESOURCES } from '../data/dsaDataset';
import {
  isProblemUnlocked,
  calculateNextLeitnerBox,
  calculateNextReviewDate,
  calculateAttemptScore,
  updateEvidenceStrength,
  processAttemptForRemediation,
  calculatePatternMastery,
  getDSASignals,
} from '../engine/dsaEngine';
import { getDefaultStorageState, validateStorageState } from '../storage/storageAdapter';
import type { DSAProgress, PatternSelfCheckEvidence } from '../types';

describe('PlacementOS DSA Subsystem & Engine Tests (v1.4 Spec Compliance)', () => {
  // ==========================================
  // 1. CATALOG INTEGRITY TESTS
  // ==========================================
  describe('1. Catalog & Data Model Integrity', () => {
    it('contains exactly 150 unique DSA problems', () => {
      expect(DSA_PROBLEMS.length).toBe(150);
    });

    it('has sequential IDs from dsa-001 through dsa-150 with no gaps or duplicates', () => {
      const ids = DSA_PROBLEMS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(150);

      for (let i = 1; i <= 150; i++) {
        const expectedId = `dsa-${String(i).padStart(3, '0')}`;
        expect(uniqueIds.has(expectedId)).toBe(true);
      }
    });

    it('has no duplicate LeetCode problem numbers', () => {
      const lcNumbers = DSA_PROBLEMS.map((p) => p.leetcodeNumber);
      const uniqueLcNumbers = new Set(lcNumbers);
      expect(uniqueLcNumbers.size).toBe(150);
    });

    it('ensures all prerequisite IDs exist in the catalog', () => {
      const validIds = new Set(DSA_PROBLEMS.map((p) => p.id));
      for (const prob of DSA_PROBLEMS) {
        if (prob.prerequisites) {
          for (const prereqId of prob.prerequisites) {
            expect(validIds.has(prereqId)).toBe(true);
          }
        }
      }
    });

    it('verifies the prerequisite DAG has no cycles', () => {
      const problemMap = new Map(DSA_PROBLEMS.map((p) => [p.id, p]));
      const visited = new Set<string>();
      const inStack = new Set<string>();

      function hasCycle(id: string): boolean {
        visited.add(id);
        inStack.add(id);

        const prob = problemMap.get(id);
        if (prob && prob.prerequisites) {
          for (const prereqId of prob.prerequisites) {
            if (!visited.has(prereqId)) {
              if (hasCycle(prereqId)) return true;
            } else if (inStack.has(prereqId)) {
              return true;
            }
          }
        }

        inStack.delete(id);
        return false;
      }

      for (const prob of DSA_PROBLEMS) {
        if (!visited.has(prob.id)) {
          expect(hasCycle(prob.id)).toBe(false);
        }
      }
    });

    it('verifies tier totals: 46 STARTER, 74 CORE, 30 CHALLENGE', () => {
      const starter = DSA_PROBLEMS.filter((p) => p.progressionTier === 'STARTER').length;
      const core = DSA_PROBLEMS.filter((p) => p.progressionTier === 'CORE').length;
      const challenge = DSA_PROBLEMS.filter((p) => p.progressionTier === 'CHALLENGE').length;

      expect(starter).toBe(46);
      expect(core).toBe(74);
      expect(challenge).toBe(30);
      expect(starter + core + challenge).toBe(150);
    });

    it('verifies phase totals: Phase 1 = 65, Phase 2 = 73, Phase 3 = 12', () => {
      const p1 = DSA_PROBLEMS.filter((p) => p.recommendedPhase === 1).length;
      const p2 = DSA_PROBLEMS.filter((p) => p.recommendedPhase === 2).length;
      const p3 = DSA_PROBLEMS.filter((p) => p.recommendedPhase === 3).length;

      expect(p1).toBe(65);
      expect(p2).toBe(73);
      expect(p3).toBe(12);
      expect(p1 + p2 + p3).toBe(150);
    });

    it('exposes exactly 17 PatternMetadata records and 24 LearningResource records', () => {
      expect(PATTERN_LESSONS.length).toBe(17);
      expect(LEARNING_RESOURCES.length).toBe(24);
    });
  });

  // ==========================================
  // 2. MIGRATION & PERSISTENCE TESTS
  // ==========================================
  describe('2. Idempotent Migration & Persistence', () => {
    it('creates default storage state containing all 150 problems in dsaProgress', () => {
      const defaults = getDefaultStorageState();
      expect(Object.keys(defaults.dsaProgress).length).toBe(150);
      expect(defaults.dsaProgress['dsa-001'].problemId).toBe('dsa-001');
      expect(defaults.dsaProgress['dsa-150'].problemId).toBe('dsa-150');
    });

    it('preserves existing dsa-001 progress and safely hydrates missing fields', () => {
      const legacyStorageState = {
        schemaVersion: '1.0.0',
        appVersion: '1.0.0',
        lastSavedAt: new Date().toISOString(),
        currentMode: 'normal',
        taskProgress: {},
        dsaProgress: {
          'dsa-001': {
            problemId: 'dsa-001',
            currentBox: 3,
            nextReviewAt: '2026-10-01',
            lastAttemptAt: '2026-09-24T10:00:00Z',
            attemptCount: 5,
            notes: 'Legacy user note on Two Sum',
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-24T10:00:00Z',
          },
        },
        skillStates: {},
        companyOverlays: [],
        dailyCheckIns: [],
        dailyTaskAssignments: [],
      };

      expect(validateStorageState(legacyStorageState)).toBe(true);

      // Hydrate via getDefaultStorageState merge test
      const defaults = getDefaultStorageState();
      const userItem = legacyStorageState.dsaProgress['dsa-001'] as Partial<DSAProgress>;
      const mergedItem: DSAProgress = {
        ...defaults.dsaProgress['dsa-001'],
        ...userItem,
        currentBox: userItem.currentBox ?? 1,
        attemptCount: userItem.attemptCount ?? 0,
        passedIndependently: userItem.passedIndependently ?? false,
        consecutiveAssistedPasses: userItem.consecutiveAssistedPasses ?? 0,
        assistedProvisional: userItem.assistedProvisional ?? false,
        consecutiveFailures: userItem.consecutiveFailures ?? 0,
        remediationRequired: userItem.remediationRequired ?? false,
      };

      expect(mergedItem.currentBox).toBe(3);
      expect(mergedItem.attemptCount).toBe(5);
      expect(mergedItem.notes).toBe('Legacy user note on Two Sum');
      expect(mergedItem.passedIndependently).toBe(false);
      expect(mergedItem.remediationRequired).toBe(false);
    });

    it('runs migration twice on user progress for dsa-001, dsa-002, dsa-003 and confirms idempotency', () => {
      const initialLegacyState = {
        schemaVersion: '1.0.0',
        appVersion: '1.0.0',
        lastSavedAt: new Date().toISOString(),
        currentMode: 'normal' as const,
        taskProgress: {},
        dsaProgress: {
          'dsa-001': {
            problemId: 'dsa-001',
            currentBox: 3 as const,
            nextReviewAt: '2026-10-01',
            lastAttemptAt: '2026-09-24T10:00:00Z',
            attemptCount: 5,
            notes: 'Two Sum note',
            evidenceStrength: 0.85,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-24T10:00:00Z',
          },
          'dsa-002': {
            problemId: 'dsa-002',
            currentBox: 2 as const,
            nextReviewAt: '2026-09-27',
            lastAttemptAt: '2026-09-24T11:00:00Z',
            attemptCount: 2,
            notes: 'Valid Anagram note',
            evidenceStrength: 0.6,
            createdAt: '2026-09-02T00:00:00Z',
            updatedAt: '2026-09-24T11:00:00Z',
          },
          'dsa-003': {
            problemId: 'dsa-003',
            currentBox: 1 as const,
            nextReviewAt: '2026-09-25',
            lastAttemptAt: '2026-09-24T12:00:00Z',
            attemptCount: 1,
            notes: 'Group Anagrams note',
            evidenceStrength: 0.3,
            createdAt: '2026-09-03T00:00:00Z',
            updatedAt: '2026-09-24T12:00:00Z',
          },
        },
        skillStates: {},
        companyOverlays: [],
        dailyCheckIns: [],
        dailyTaskAssignments: [],
      };

      // Pass 1 Migration
      const defaults = getDefaultStorageState();
      const pass1Progress: Record<string, DSAProgress> = {};
      Object.keys(defaults.dsaProgress).forEach((probId) => {
        const defaultItem = defaults.dsaProgress[probId];
        const userItem = (initialLegacyState.dsaProgress as Record<string, Partial<DSAProgress>>)[probId];
        if (userItem) {
          pass1Progress[probId] = {
            ...defaultItem,
            ...userItem,
            currentBox: userItem.currentBox ?? defaultItem.currentBox,
            attemptCount: userItem.attemptCount ?? defaultItem.attemptCount,
            passedIndependently: userItem.passedIndependently ?? defaultItem.passedIndependently ?? false,
            consecutiveAssistedPasses: userItem.consecutiveAssistedPasses ?? defaultItem.consecutiveAssistedPasses ?? 0,
            assistedProvisional: userItem.assistedProvisional ?? defaultItem.assistedProvisional ?? false,
            consecutiveFailures: userItem.consecutiveFailures ?? defaultItem.consecutiveFailures ?? 0,
            remediationRequired: userItem.remediationRequired ?? defaultItem.remediationRequired ?? false,
            patternLessonViewed: userItem.patternLessonViewed ?? defaultItem.patternLessonViewed ?? false,
            patternLessonCompleted: userItem.patternLessonCompleted ?? defaultItem.patternLessonCompleted ?? false,
            remediationSelfCheckPassed: userItem.remediationSelfCheckPassed ?? defaultItem.remediationSelfCheckPassed ?? false,
          };
        } else {
          pass1Progress[probId] = defaultItem;
        }
      });

      expect(pass1Progress['dsa-001'].currentBox).toBe(3);
      expect(pass1Progress['dsa-001'].notes).toBe('Two Sum note');
      expect(pass1Progress['dsa-002'].currentBox).toBe(2);
      expect(pass1Progress['dsa-003'].currentBox).toBe(1);

      // Pass 2 Migration (Re-running migration on output of Pass 1)
      const pass2Progress: Record<string, DSAProgress> = {};
      Object.keys(defaults.dsaProgress).forEach((probId) => {
        const defaultItem = defaults.dsaProgress[probId];
        const userItem = pass1Progress[probId];
        pass2Progress[probId] = {
          ...defaultItem,
          ...userItem,
          currentBox: userItem.currentBox ?? defaultItem.currentBox,
          attemptCount: userItem.attemptCount ?? defaultItem.attemptCount,
        };
      });

      // Confirm Pass 1 and Pass 2 are identical (Idempotency)
      expect(JSON.stringify(pass1Progress)).toBe(JSON.stringify(pass2Progress));
    });
  });

  // ==========================================
  // 3. UNLOCKING & ANTI-LOCKOUT TESTS
  // ==========================================
  describe('3. Progressive Unlocking & Anti-Lockout', () => {
    const progressMap: Record<string, DSAProgress> = {};

    it('unlocks anchor problem with no prerequisites in Phase 1', () => {
      const dsa001 = DSA_PROBLEMS.find((p) => p.id === 'dsa-001')!;
      const result = isProblemUnlocked(dsa001, progressMap, 1);
      expect(result.isUnlocked).toBe(true);
    });

    it('locks problem requiring prerequisite if prerequisite is unattempted', () => {
      const dsa016 = DSA_PROBLEMS.find((p) => p.id === 'dsa-016')!; // Requires dsa-001
      const result = isProblemUnlocked(dsa016, progressMap, 1);
      expect(result.isUnlocked).toBe(false);
      expect(result.reason).toContain('Requires prerequisite completion');
    });

    it('unlocks problem requiring prerequisite when prerequisite is passed independently', () => {
      const dsa016 = DSA_PROBLEMS.find((p) => p.id === 'dsa-016')!;
      const testProgressMap: Record<string, DSAProgress> = {
        'dsa-001': {
          problemId: 'dsa-001',
          currentBox: 2,
          attemptCount: 1,
          passedIndependently: true,
          createdAt: '2026-09-20T00:00:00Z',
          updatedAt: '2026-09-20T00:00:00Z',
        },
      };

      const result = isProblemUnlocked(dsa016, testProgressMap, 1);
      expect(result.isUnlocked).toBe(true);
    });

    it('unlocks problem via anti-lockout when prerequisite has assistedProvisional pass', () => {
      const dsa016 = DSA_PROBLEMS.find((p) => p.id === 'dsa-016')!;
      const testProgressMap: Record<string, DSAProgress> = {
        'dsa-001': {
          problemId: 'dsa-001',
          currentBox: 1,
          attemptCount: 1,
          passedIndependently: false,
          assistedProvisional: true,
          consecutiveAssistedPasses: 1,
          createdAt: '2026-09-20T00:00:00Z',
          updatedAt: '2026-09-20T00:00:00Z',
        },
      };

      const result = isProblemUnlocked(dsa016, testProgressMap, 1);
      expect(result.isUnlocked).toBe(true);
    });

    it('locks problem if recommended phase is higher than current active phase', () => {
      const phase2Problem = DSA_PROBLEMS.find((p) => p.recommendedPhase === 2)!;
      const result = isProblemUnlocked(phase2Problem, progressMap, 1);
      expect(result.isUnlocked).toBe(false);
      expect(result.reason).toContain('Locked until Phase 2');
    });
  });

  // ==========================================
  // 4. REMEDIATION ENGINE TESTS
  // ==========================================
  describe('4. Remediation Workflow (3 Consecutive Failures)', () => {
    it('triggers remediationRequired after 3 consecutive failures', () => {
      const prog: DSAProgress = {
        problemId: 'dsa-001',
        currentBox: 1,
        attemptCount: 0,
        consecutiveFailures: 0,
        remediationRequired: false,
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      };

      // Attempt 1: Fail
      const step1 = processAttemptForRemediation(prog, 'fail');
      expect(step1.consecutiveFailures).toBe(1);
      expect(step1.remediationRequired).toBe(false);

      // Attempt 2: Fail
      const prog2 = { ...prog, consecutiveFailures: step1.consecutiveFailures };
      const step2 = processAttemptForRemediation(prog2, 'fail');
      expect(step2.consecutiveFailures).toBe(2);
      expect(step2.remediationRequired).toBe(false);

      // Attempt 3: Fail -> Triggers remediation!
      const prog3 = { ...prog2, consecutiveFailures: step2.consecutiveFailures };
      const step3 = processAttemptForRemediation(prog3, 'fail');
      expect(step3.consecutiveFailures).toBe(3);
      expect(step3.remediationRequired).toBe(true);
    });

    it('resets consecutiveFailures on a successful pass attempt', () => {
      const prog: DSAProgress = {
        problemId: 'dsa-001',
        currentBox: 1,
        attemptCount: 2,
        consecutiveFailures: 2,
        remediationRequired: false,
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      };

      const step = processAttemptForRemediation(prog, 'pass');
      expect(step.consecutiveFailures).toBe(0);
      expect(step.remediationRequired).toBe(false);
    });
  });

  // ==========================================
  // 5. THREE-STATE SELF CHECK & EVIDENCE MATH
  // ==========================================
  describe('5. 3-State Self Check & Evidence Strength Math', () => {
    it('awards +0.05 bonus only for correct self-check answers', () => {
      const selfCheck: PatternSelfCheckEvidence = {
        patternRecognition: 'correct',
        timeComplexity: 'correct',
        spaceComplexity: 'unsure',
      };

      const scoreDetails = calculateAttemptScore('pass', 'none', selfCheck);
      expect(scoreDetails.baseScore).toBe(1.0);
      expect(scoreDetails.selfCheckBonus).toBe(0.1);
      expect(scoreDetails.totalEventScore).toBe(1.1);
    });

    it('caps self-check bonus at +0.15 maximum', () => {
      const selfCheck: PatternSelfCheckEvidence = {
        patternRecognition: 'correct',
        timeComplexity: 'correct',
        spaceComplexity: 'correct',
      };

      const scoreDetails = calculateAttemptScore('pass', 'none', selfCheck);
      expect(scoreDetails.selfCheckBonus).toBe(0.15);
      expect(scoreDetails.totalEventScore).toBe(1.15);
    });

    it('updates evidence strength with 0.7 * old + 0.3 * eventScore capped at 1.0', () => {
      const newEv1 = updateEvidenceStrength(0.0, 1.0);
      expect(newEv1).toBe(0.3);

      const newEv2 = updateEvidenceStrength(0.8, 1.15); // 0.7*0.8 + 0.3*1.15 = 0.56 + 0.345 = 0.905 -> 0.9
      expect(newEv2).toBe(0.9);

      const capped = updateEvidenceStrength(0.95, 1.15); // > 1.0 -> 1.0
      expect(capped).toBe(1.0);
    });
  });

  // ==========================================
  // 6. LEITNER BOX TRANSITION TESTS
  // ==========================================
  describe('6. Leitner Box Transitions & Review Intervals', () => {
    it('transitions fail -> Box 1', () => {
      expect(calculateNextLeitnerBox(3, 'fail', 'none')).toBe(1);
    });

    it('transitions partial -> max(1, currentBox - 1)', () => {
      expect(calculateNextLeitnerBox(3, 'partial', 'none')).toBe(2);
      expect(calculateNextLeitnerBox(1, 'partial', 'none')).toBe(1);
    });

    it('retains box on pass with assistance', () => {
      expect(calculateNextLeitnerBox(2, 'pass', 'hint')).toBe(2);
      expect(calculateNextLeitnerBox(3, 'pass', 'solution')).toBe(3);
    });

    it('advances box on pass with no assistance (independent)', () => {
      expect(calculateNextLeitnerBox(1, 'pass', 'none')).toBe(2);
      expect(calculateNextLeitnerBox(2, 'pass', 'none')).toBe(3);
      expect(calculateNextLeitnerBox(4, 'pass', 'none')).toBe(4); // Box 4 cap
    });

    it('calculates review dates matching intervals: Box 1 (1d), Box 2 (3d), Box 3 (7d), Box 4 (14d)', () => {
      const fromDate = '2026-09-24';
      expect(calculateNextReviewDate(1, fromDate)).toBe('2026-09-25');
      expect(calculateNextReviewDate(2, fromDate)).toBe('2026-09-27');
      expect(calculateNextReviewDate(3, fromDate)).toBe('2026-10-01');
      expect(calculateNextReviewDate(4, fromDate)).toBe('2026-10-08');
    });
  });

  // ==========================================
  // 7. PATTERN MASTERY TESTS
  // ==========================================
  describe('7. Pattern Mastery Calculation', () => {
    it('returns state not_started when zero problems in pattern have been attempted', () => {
      const mastery = calculatePatternMastery('pat-001', DSA_PROBLEMS, {});
      expect(mastery.state).toBe('not_started');
      expect(mastery.attemptedCount).toBe(0);
      expect(mastery.masteryRatio).toBe(0);
    });

    it('marks pattern mastered when independent solves, mastery ratio >= 60%, and Box 3+ conditions are met', () => {
      const testProgressMap: Record<string, DSAProgress> = {
        'dsa-001': {
          problemId: 'dsa-001',
          currentBox: 3,
          attemptCount: 1,
          passedIndependently: true,
          evidenceStrength: 0.85,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        'dsa-010': {
          problemId: 'dsa-010',
          currentBox: 3,
          attemptCount: 1,
          passedIndependently: true,
          evidenceStrength: 0.9,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        'dsa-013': {
          problemId: 'dsa-013',
          currentBox: 3,
          attemptCount: 1,
          passedIndependently: true,
          evidenceStrength: 0.95,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      };

      const mastery = calculatePatternMastery('Arrays & Hashing', DSA_PROBLEMS, testProgressMap);
      expect(mastery.independentSolves).toBe(3);
      expect(mastery.hasBox3Or4).toBe(true);
      expect(mastery.state).toBe('mastered');
    });
  });

  // ==========================================
  // 8. ADAPTIVE DSA SELECTION TESTS
  // ==========================================
  describe('8. Adaptive Engine DSA Signals Selection', () => {
    it('prioritizes remediationRequired (Priority 1) over reviewDue (Priority 2)', () => {
      const testProgressMap: Record<string, DSAProgress> = {
        'dsa-001': {
          problemId: 'dsa-001',
          currentBox: 2,
          attemptCount: 3,
          nextReviewAt: '2026-09-20', // Review due!
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        'dsa-002': {
          problemId: 'dsa-002',
          currentBox: 1,
          attemptCount: 3,
          remediationRequired: true, // Remediation required!
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      };

      const signals = getDSASignals(DSA_PROBLEMS, testProgressMap, 1, '2026-09-24');
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].problem.id).toBe('dsa-002');
      expect(signals[0].priorityTier).toBe(1);
      expect(signals[1].problem.id).toBe('dsa-001');
      expect(signals[1].priorityTier).toBe(2);
    });
  });
});
