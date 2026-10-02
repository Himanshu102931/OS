import { describe, it, expect } from 'vitest';
import {
  StorageAdapter,
  validateStorageState,
  getDefaultStorageState,
  DEFAULT_USER_SETTINGS,
} from '../storage/storageAdapter';
import type { AppStorageState } from '../storage/storageAdapter';
import type { AssessmentState, AssessmentKind } from '../types';

describe('Phase A: Assessment Specification Foundations', () => {
  const defaultState: AppStorageState = getDefaultStorageState();

  describe('AssessmentKind type validation', () => {
    it('should accept diagnostic_assessment', () => {
      const kind: AssessmentState['attempts'][0]['kind'] = 'diagnostic_assessment';
      expect(kind).toBe('diagnostic_assessment');
    });

    it('should accept weekly_assessment', () => {
      const kind: AssessmentState['attempts'][0]['kind'] = 'weekly_assessment';
      expect(kind).toBe('weekly_assessment');
    });

    it('should accept full_reassessment', () => {
      const kind: AssessmentState['attempts'][0]['kind'] = 'full_reassessment';
      expect(kind).toBe('full_reassessment');
    });
  });

  describe('missing assessmentState', () => {
    it('should have undefined assessmentState in default state', () => {
      expect(defaultState.assessmentState).toBeUndefined();
    });

    it('should remain valid without assessmentState in storage validation', () => {
      const stateWithoutAssessment: AppStorageState = {
        ...defaultState,
        assessmentState: undefined,
      };
      expect(validateStorageState(stateWithoutAssessment)).toBe(true);
    });
  });

  describe('valid assessmentState', () => {
    it('should validate a complete assessmentState structure', () => {
      const validState: AssessmentState = {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          baselineCompletedAt: undefined,
          lastSundayAt: undefined,
          pendingSunday: false,
          nextReassessmentSuggestedAt: undefined,
        },
      };

      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: validState,
      };

      expect(validateStorageState(storageState)).toBe(true);
    });
  });

  describe('malformed assessmentState', () => {
    it('should reject assessmentState with invalid attempts', () => {
      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: {
          attempts: 'invalid' as unknown as AssessmentState['attempts'],
          ...defaultState.assessmentState,
        } as AssessmentState,
      };

      expect(validateStorageState(storageState)).toBe(false);
    });

    it('should reject assessmentState with invalid responses', () => {
      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: {
          responses: 'invalid' as unknown as AssessmentState['responses'],
          ...defaultState.assessmentState,
        } as AssessmentState,
      };

      expect(validateStorageState(storageState)).toBe(false);
    });

    it('should reject assessmentState with invalid domainResults', () => {
      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: {
          domainResults: 'invalid' as unknown as AssessmentState['domainResults'],
          ...defaultState.assessmentState,
        } as AssessmentState,
      };

      expect(validateStorageState(storageState)).toBe(false);
    });

    it('should reject assessmentState with kind outside allowed values', () => {
      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: {
          attempts: [{
            id: 'test',
            definitionId: 'test',
            definitionVersion: 1,
            kind: 'invalid_kind' as AssessmentKind,
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            timeLimitSeconds: 60,
            seed: 'test',
            selectedItemIds: [],
          }],
          responses: [],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: {
            baselineCompletedAt: undefined,
            lastSundayAt: undefined,
            pendingSunday: false,
            nextReassessmentSuggestedAt: undefined,
          },
        } as AssessmentState,
      };

      expect(validateStorageState(storageState)).toBe(false);
    });
  });

  describe('backward-compatible import', () => {
    it('should accept legacy state without assessmentState in importJSON', () => {
      const legacyState = JSON.stringify({
        schemaVersion: '1.0.0',
        appVersion: '1.0.0',
        lastSavedAt: new Date().toISOString(),
        currentMode: 'normal',
        userSettings: DEFAULT_USER_SETTINGS,
        taskProgress: {},
        dsaProgress: {},
        skillStates: {},
        companyOverlays: [],
        dailyCheckIns: [],
        dailyTaskAssignments: [],
        practiceAttempts: [],
        preparationTopicProgress: {},
      });

      const result = StorageAdapter.importJSON(legacyState);
      expect(result.success).toBe(true);
    });

    it('should accept legacy state with assessmentState in importJSON', () => {
      const stateWithAssessment = {
        ...getDefaultStorageState(),
        assessmentState: {
          attempts: [],
          responses: [],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: {
            baselineCompletedAt: undefined,
            lastSundayAt: undefined,
            pendingSunday: false,
            nextReassessmentSuggestedAt: undefined,
          },
        },
      };

      const result = StorageAdapter.importJSON(JSON.stringify(stateWithAssessment));
      expect(result.success).toBe(true);
    });
  });

  describe('pruning/retention behavior', () => {
    it('should prune assessment responses per retention policy', () => {
      const { pruneAssessmentResponses } = StorageAdapter;

      // Test with empty state
      const emptyState: AssessmentState = {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          baselineCompletedAt: undefined,
          lastSundayAt: undefined,
          pendingSunday: false,
          nextReassessmentSuggestedAt: undefined,
        },
      };

      const pruned = pruneAssessmentResponses(emptyState);
      expect(pruned.responses).toEqual([]);
    });

    it('should apply assessment pruning to full app state', () => {
      const { applyAssessmentPruning } = StorageAdapter;

      const stateWithAssessment = {
        ...getDefaultStorageState(),
        assessmentState: {
          attempts: [],
          responses: [],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: {
            baselineCompletedAt: undefined,
            lastSundayAt: undefined,
            pendingSunday: false,
            nextReassessmentSuggestedAt: undefined,
          },
        } as AssessmentState,
      };

      const pruned = applyAssessmentPruning(stateWithAssessment as AppStorageState);
      expect(pruned.assessmentState).toBeDefined();
    });
  });

  describe('assessment kind/type validation', () => {
    it('should validate AssessmentKind values', () => {
      const validKinds = ['diagnostic_assessment', 'weekly_assessment', 'full_reassessment'] as const;

      for (const kind of validKinds) {
        const storageState: AppStorageState = {
          ...defaultState,
          assessmentState: {
            attempts: [{
              id: 'test',
              definitionId: 'test',
              definitionVersion: 1,
              kind,
              status: 'in_progress',
              startedAt: new Date().toISOString(),
              timeLimitSeconds: 60,
              seed: 'test',
              selectedItemIds: [],
            }],
            responses: [],
            exposures: {},
            domainResults: [],
            snapshots: [],
            weaknessSignals: [],
            profile: {
              baselineCompletedAt: undefined,
              lastSundayAt: undefined,
              pendingSunday: false,
              nextReassessmentSuggestedAt: undefined,
            },
          } as AssessmentState,
        };

        expect(validateStorageState(storageState)).toBe(true);
      }
    });

    it('should reject AssessmentKind outside allowed values', () => {
      const storageState: AppStorageState = {
        ...defaultState,
        assessmentState: {
          attempts: [{
            id: 'test',
            definitionId: 'test',
            definitionVersion: 1,
            kind: 'invalid_kind' as AssessmentKind,
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            timeLimitSeconds: 60,
            seed: 'test',
            selectedItemIds: [],
          }],
          responses: [],
          exposures: {},
          domainResults: [],
          snapshots: [],
          weaknessSignals: [],
          profile: {
            baselineCompletedAt: undefined,
            lastSundayAt: undefined,
            pendingSunday: false,
            nextReassessmentSuggestedAt: undefined,
          },
        } as AssessmentState,
      };

      expect(validateStorageState(storageState)).toBe(false);
    });

    it('should isolate malformed assessmentState in loadState and preserve core progress without resetting defaults', () => {
      const firstProbId = Object.keys(defaultState.dsaProgress)[0];
      const customState: AppStorageState = {
        ...defaultState,
        dsaProgress: {
          ...defaultState.dsaProgress,
          [firstProbId]: {
            ...defaultState.dsaProgress[firstProbId],
            currentBox: 3,
            attemptCount: 5,
            passedIndependently: true,
          },
        },
        assessmentState: {
          attempts: 'malformed_data' as unknown as AssessmentState['attempts'],
        } as unknown as AssessmentState,
      };

      StorageAdapter.saveState(customState);
      const loaded = StorageAdapter.loadState();

      // Core progress MUST be preserved
      expect(loaded.dsaProgress[firstProbId].currentBox).toBe(3);
      expect(loaded.dsaProgress[firstProbId].passedIndependently).toBe(true);
      // Malformed assessmentState is isolated to undefined
      expect(loaded.assessmentState).toBeUndefined();
    });
  });
});