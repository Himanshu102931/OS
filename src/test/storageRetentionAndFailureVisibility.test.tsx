import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppStorageState,
} from '../storage/storageAdapter';
import type {
  AssessmentAttempt,
  AssessmentResponse,
  ItemCalibrationObservation,
  AssessmentExecutionRecord,
} from '../types';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { AppShell } from '../components/layout/AppShell';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

const STORAGE_KEY = 'placementos_v1_state';

describe('Task 152 — Storage Assessment Retention & Persistence Hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saveState automatically invokes assessment pruning when persisting to localStorage', () => {
    const base = getDefaultStorageState();
    const now = Date.now();
    const oneHundredDaysAgo = now - 100 * 24 * 60 * 60 * 1000;

    // Create 14 attempts: 12 recent, 2 older than 90 days
    const attempts: AssessmentAttempt[] = [];
    const responses: AssessmentResponse[] = [];
    const observations: ItemCalibrationObservation[] = [];
    const executionRecords: AssessmentExecutionRecord[] = [];

    // 2 old attempts (older than 90 days)
    for (let i = 1; i <= 2; i++) {
      const attId = `att-old-${i}`;
      const attDate = new Date(oneHundredDaysAgo - i * 86400000).toISOString();
      attempts.push({
        id: attId,
        definitionId: 'def-baseline',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: attDate,
        endedAt: attDate,
        timeLimitSeconds: 1800,
        seed: `seed-old-${i}`,
        selectedItemIds: ['item-1'],
      });
      responses.push({
        id: `resp-old-${i}`,
        attemptId: attId,
        itemId: 'item-1',
        response: 1,
        result: 'correct',
        timeSpentSeconds: 60,
        errorCategories: [],
        scoredCredit: 1,
        weightApplied: 1,
      });
      observations.push({
        id: `obs-old-${i}`,
        itemId: 'item-1',
        attemptId: attId,
        assessmentKind: 'diagnostic_assessment',
        assessmentVersion: 1,
        domainId: 'dsa',
        topicId: 'topic-dsa-arrays',
        authoredDifficulty: 2,
        observedScore: 1,
        isCorrect: true,
        timeSpentSeconds: 60,
        estimatedMinutes: 2,
        errorCategories: [],
        timestamp: attDate,
      });
      executionRecords.push({
        id: `exec-old-${i}`,
        attemptId: attId,
        itemId: 'item-1',
        language: 'python',
        code: 'print("old")',
        timestamp: attDate,
        result: {
          passed: true,
          status: 'success',
          testsPassed: 1,
          totalTests: 1,
          executionTimeMs: 10,
        },
      });
    }

    // 12 recent attempts
    for (let i = 1; i <= 12; i++) {
      const attId = `att-recent-${i}`;
      const attDate = new Date(now - i * 86400000).toISOString();
      attempts.push({
        id: attId,
        definitionId: 'def-baseline',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: attDate,
        endedAt: attDate,
        timeLimitSeconds: 1800,
        seed: `seed-recent-${i}`,
        selectedItemIds: ['item-1'],
      });
      responses.push({
        id: `resp-recent-${i}`,
        attemptId: attId,
        itemId: 'item-1',
        response: 1,
        result: 'correct',
        timeSpentSeconds: 45,
        errorCategories: [],
        scoredCredit: 1,
        weightApplied: 1,
      });
      observations.push({
        id: `obs-recent-${i}`,
        itemId: 'item-1',
        attemptId: attId,
        assessmentKind: 'diagnostic_assessment',
        assessmentVersion: 1,
        domainId: 'dsa',
        topicId: 'topic-dsa-arrays',
        authoredDifficulty: 2,
        observedScore: 1,
        isCorrect: true,
        timeSpentSeconds: 45,
        estimatedMinutes: 2,
        errorCategories: [],
        timestamp: attDate,
      });
      executionRecords.push({
        id: `exec-recent-${i}`,
        attemptId: attId,
        itemId: 'item-1',
        language: 'python',
        code: 'print("recent")',
        timestamp: attDate,
        result: {
          passed: true,
          status: 'success',
          testsPassed: 1,
          totalTests: 1,
          executionTimeMs: 10,
        },
      });
    }

    const state: AppStorageState = {
      ...base,
      assessmentState: {
        attempts,
        responses,
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        calibrationObservations: observations,
        executionRecords,
        profile: {
          pendingSunday: false,
        },
      },
    };

    // Verify initial response count before save
    expect(state.assessmentState?.responses.length).toBe(14);
    expect(state.assessmentState?.calibrationObservations?.length).toBe(14);
    expect(state.assessmentState?.executionRecords?.length).toBe(14);

    // Perform saveState
    const saveResult = StorageAdapter.saveState(state);
    expect(saveResult).toBe(true);

    // Ensure caller state was NOT mutated in place
    expect(state.assessmentState?.responses.length).toBe(14);

    // Read stored JSON from localStorage
    const rawStored = localStorage.getItem(STORAGE_KEY);
    expect(rawStored).toBeTruthy();
    const storedState = JSON.parse(rawStored!) as AppStorageState;

    // Verify pruned storage contents: exactly 12 recent responses retained, 2 old dropped
    expect(storedState.assessmentState?.responses.length).toBe(12);
    expect(storedState.assessmentState?.responses.some((r) => r.id === 'resp-old-1')).toBe(false);
    expect(storedState.assessmentState?.responses.some((r) => r.id === 'resp-recent-1')).toBe(true);

    // Observations and execution records beyond 12 recent and older than 90 days pruned
    expect(storedState.assessmentState?.calibrationObservations?.length).toBe(12);
    expect(storedState.assessmentState?.executionRecords?.length).toBe(12);

    // Attempt headers and domain results remain untouched (never dropped)
    expect(storedState.assessmentState?.attempts.length).toBe(14);

    // Verify unrelated data is intact
    expect(storedState.userSettings).toEqual(base.userSettings);
    expect(storedState.taskProgress).toEqual(base.taskProgress);
    expect(storedState.dsaProgress).toEqual(base.dsaProgress);
  });

  it('exportJSON applies assessment retention pruning prior to exporting', () => {
    const base = getDefaultStorageState();
    const now = Date.now();
    const oneHundredDaysAgo = now - 100 * 24 * 60 * 60 * 1000;

    const attempts: AssessmentAttempt[] = [];
    const responses: AssessmentResponse[] = [];

    // 1 old attempt
    attempts.push({
      id: 'att-old',
      definitionId: 'def-1',
      definitionVersion: 1,
      kind: 'diagnostic_assessment',
      status: 'submitted',
      startedAt: new Date(oneHundredDaysAgo).toISOString(),
      timeLimitSeconds: 1800,
      seed: 'seed-old',
      selectedItemIds: ['item-1'],
    });
    responses.push({
      id: 'resp-old',
      attemptId: 'att-old',
      itemId: 'item-1',
      response: 1,
      result: 'correct',
      timeSpentSeconds: 60,
      errorCategories: [],
      scoredCredit: 1,
      weightApplied: 1,
    });

    // 12 recent attempts
    for (let i = 1; i <= 12; i++) {
      const attId = `att-recent-${i}`;
      attempts.push({
        id: attId,
        definitionId: 'def-1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: new Date(now - i * 86400000).toISOString(),
        timeLimitSeconds: 1800,
        seed: `seed-${i}`,
        selectedItemIds: ['item-1'],
      });
      responses.push({
        id: `resp-recent-${i}`,
        attemptId: attId,
        itemId: 'item-1',
        response: 1,
        result: 'correct',
        timeSpentSeconds: 40,
        errorCategories: [],
        scoredCredit: 1,
        weightApplied: 1,
      });
    }

    const state: AppStorageState = {
      ...base,
      assessmentState: {
        attempts,
        responses,
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
      },
    };

    const exportedJson = StorageAdapter.exportJSON(state);
    const parsed = JSON.parse(exportedJson) as AppStorageState;

    expect(parsed.assessmentState?.responses.length).toBe(12);
    expect(parsed.assessmentState?.responses.some((r) => r.id === 'resp-old')).toBe(false);
    expect(parsed.assessmentState?.attempts.length).toBe(13);
  });

  it('PlacementProvider exposes persistenceError = true and renders warning banner when saveState fails', async () => {
    // Initial clean storage state
    StorageAdapter.saveState(getDefaultStorageState());

    const TestConsumer = () => {
      const { persistenceError, setPlacementMode } = usePlacement();
      return (
        <div>
          <span data-testid="error-status">{persistenceError ? 'HAS_ERROR' : 'ALL_GOOD'}</span>
          <button data-testid="trigger-mode-btn" onClick={() => setPlacementMode('exam')}>
            Trigger Mode
          </button>
        </div>
      );
    };

    const { unmount } = render(
      <PlacementProvider>
        <AppShell>
          <TestConsumer />
        </AppShell>
      </PlacementProvider>
    );

    // Initially all good and no banner
    expect(screen.getByTestId('error-status').textContent).toBe('ALL_GOOD');
    expect(screen.queryByTestId('persistence-error-banner')).toBeNull();

    // Mock saveState to simulate QuotaExceededError / failure
    vi.spyOn(StorageAdapter, 'saveState').mockReturnValue(false);

    // Trigger state change
    await act(async () => {
      screen.getByTestId('trigger-mode-btn').click();
    });

    // persistenceError should now be true and banner visible
    expect(screen.getByTestId('error-status').textContent).toBe('HAS_ERROR');
    expect(screen.getByTestId('persistence-error-banner')).not.toBeNull();
    expect(screen.getByText(/Storage Save Failed:/i)).toBeDefined();

    // Now restore saveState to return true (successful write)
    vi.spyOn(StorageAdapter, 'saveState').mockReturnValue(true);

    // Trigger another state change
    await act(async () => {
      screen.getByTestId('trigger-mode-btn').click();
    });

    // persistenceError should now be cleared and banner removed
    expect(screen.getByTestId('error-status').textContent).toBe('ALL_GOOD');
    expect(screen.queryByTestId('persistence-error-banner')).toBeNull();

    unmount();
  });
});
