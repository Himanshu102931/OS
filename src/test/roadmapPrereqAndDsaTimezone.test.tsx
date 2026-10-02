// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { DSAView } from '../components/dsa/DSAView';
import { evaluateTaskPrerequisites } from '../engine/taskStateEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { TaskDefinition, TaskProgress, DSAProgress } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const makeTask = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'task-test-target',
  title: 'Target Downstream Task',
  description: 'Requires completion of prerequisite tasks first',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 45,
  importance: 8,
  taskType: 'practice',
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

const makeProgress = (taskId: string, overrides: Partial<TaskProgress> = {}): TaskProgress => ({
  taskId,
  state: 'not_started',
  timeSpentMinutes: 0,
  postponeCount: 0,
  skipCount: 0,
  updatedAt: '2026-10-01',
  ...overrides,
});

const makeDSAProgress = (problemId: string, overrides: Partial<DSAProgress> = {}): DSAProgress => ({
  problemId,
  currentBox: 1,
  attemptCount: 0,
  passedIndependently: false,
  assistedProvisional: false,
  remediationRequired: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

describe('F-UI-ROADMAP-PREREQ: Unit & Engine Prerequisite Evaluation', () => {
  it('returns isBlocked: false when task has no prerequisites declared', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: undefined });
    const progressMap: Record<string, TaskProgress> = {};
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(false);
    expect(result.unmetPrerequisiteIds).toEqual([]);
  });

  it('returns isBlocked: false when prerequisiteTaskDefinitionIds is empty', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: [] });
    const progressMap: Record<string, TaskProgress> = {};
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(false);
    expect(result.unmetPrerequisiteIds).toEqual([]);
  });

  it('returns isBlocked: true when prerequisite is not present in taskProgressMap', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: ['task-101'] });
    const progressMap: Record<string, TaskProgress> = {};
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(true);
    expect(result.unmetPrerequisiteIds).toEqual(['task-101']);
  });

  it('returns isBlocked: true when prerequisite is not_started or in_progress', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: ['task-101'] });
    const progressMap: Record<string, TaskProgress> = {
      'task-101': makeProgress('task-101', {
        state: 'in_progress',
        timeSpentMinutes: 30,
        updatedAt: '2026-10-01T10:00:00Z',
      }),
    };
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(true);
    expect(result.unmetPrerequisiteIds).toEqual(['task-101']);
  });

  it('returns isBlocked: false only when all declared prerequisites have state === "completed"', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: ['task-101', 'task-102'] });
    const progressMap: Record<string, TaskProgress> = {
      'task-101': makeProgress('task-101', {
        state: 'completed',
        timeSpentMinutes: 45,
        updatedAt: '2026-10-01T10:00:00Z',
      }),
      'task-102': makeProgress('task-102', {
        state: 'completed',
        timeSpentMinutes: 45,
        updatedAt: '2026-10-01T11:00:00Z',
      }),
    };
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(false);
    expect(result.unmetPrerequisiteIds).toEqual([]);
  });

  it('identifies only the unmet prerequisites when some are completed', () => {
    const task = makeTask({ prerequisiteTaskDefinitionIds: ['task-101', 'task-102', 'task-103'] });
    const progressMap: Record<string, TaskProgress> = {
      'task-101': makeProgress('task-101', { state: 'completed', timeSpentMinutes: 45 }),
      'task-102': makeProgress('task-102', { state: 'not_started', timeSpentMinutes: 0 }),
    };
    const result = evaluateTaskPrerequisites(task, progressMap);

    expect(result.isBlocked).toBe(true);
    expect(result.unmetPrerequisiteIds).toEqual(['task-102', 'task-103']);
  });
});

describe('F-UI-ROADMAP-PREREQ: RoadmapView UI Prerequisite Gating', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  it('disables the Complete action and displays locked visual state when prerequisites are unmet', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    // Custom task definitions: task-downstream depends on task-upstream
    const upstreamTask = makeTask({
      id: 'custom-task-upstream',
      title: 'Foundational Upstream Task',
      topicId: 'topic-dsa-arrays',
      prerequisiteTaskDefinitionIds: [],
    });
    const downstreamTask = makeTask({
      id: 'custom-task-downstream',
      title: 'Advanced Downstream Task',
      topicId: 'topic-dsa-arrays',
      prerequisiteTaskDefinitionIds: ['custom-task-upstream'],
    });

    const testState: AppExtendedStorageState = {
      ...defaultState,
      customTaskDefinitions: [upstreamTask, downstreamTask],
      taskProgress: {
        ...defaultState.taskProgress,
        'custom-task-upstream': makeProgress('custom-task-upstream', { state: 'not_started' }),
        'custom-task-downstream': makeProgress('custom-task-downstream', { state: 'not_started' }),
      },
    };
    StorageAdapter.saveState(testState);

    render(
      <PlacementProvider>
        <RoadmapView />
      </PlacementProvider>
    );

    // Click on the topic "Arrays & Two Pointers" to open the Topic Detail Drawer
    const topicItem = screen.getByText('Arrays & Two Pointers');
    fireEvent.click(topicItem);

    // Find the task cards inside the open drawer
    const downstreamCard = screen.getByTestId('task-card-custom-task-downstream');
    expect(downstreamCard).toBeDefined();

    // Verify visual lock warning is present and names the prerequisite
    const warning = within(downstreamCard).getByTestId('prereq-warning-custom-task-downstream');
    expect(warning.textContent).toContain('Prerequisites must be completed first:');
    expect(warning.textContent).toContain('Foundational Upstream Task');

    // Verify the Complete button is disabled and marked Locked
    const completeBtn = within(downstreamCard).getByTestId('complete-btn-custom-task-downstream');
    expect(completeBtn).toBeDefined();
    expect((completeBtn as HTMLButtonElement).disabled).toBe(true);
    expect(completeBtn.textContent).toContain('Locked');

    // Attempting to click the disabled button must NOT trigger completion
    fireEvent.click(completeBtn);

    const reloadedState = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(reloadedState.taskProgress['custom-task-downstream']?.state).toBe('not_started');
  });

  it('enables the Complete action when all prerequisites are satisfied', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    const upstreamTask = makeTask({
      id: 'custom-task-upstream',
      title: 'Foundational Upstream Task',
      topicId: 'topic-dsa-arrays',
      prerequisiteTaskDefinitionIds: [],
    });
    const downstreamTask = makeTask({
      id: 'custom-task-downstream',
      title: 'Advanced Downstream Task',
      topicId: 'topic-dsa-arrays',
      prerequisiteTaskDefinitionIds: ['custom-task-upstream'],
    });

    // Upstream task is completed
    const testState: AppExtendedStorageState = {
      ...defaultState,
      customTaskDefinitions: [upstreamTask, downstreamTask],
      taskProgress: {
        ...defaultState.taskProgress,
        'custom-task-upstream': makeProgress('custom-task-upstream', {
          state: 'completed',
          timeSpentMinutes: 30,
          lastCompletedAt: '2026-10-01T10:00:00Z',
        }),
        'custom-task-downstream': makeProgress('custom-task-downstream', { state: 'not_started' }),
      },
    };
    StorageAdapter.saveState(testState);

    render(
      <PlacementProvider>
        <RoadmapView />
      </PlacementProvider>
    );

    // Click on the topic "Arrays & Two Pointers" to open the Topic Detail Drawer
    const topicItem = screen.getByText('Arrays & Two Pointers');
    fireEvent.click(topicItem);

    const downstreamCard = screen.getByTestId('task-card-custom-task-downstream');
    expect(downstreamCard).toBeDefined();

    // No warning should be rendered
    expect(within(downstreamCard).queryByTestId('prereq-warning-custom-task-downstream')).toBeNull();

    // Complete button should be enabled and say Complete
    const completeBtn = within(downstreamCard).getByTestId('complete-btn-custom-task-downstream');
    expect((completeBtn as HTMLButtonElement).disabled).toBe(false);
    expect(completeBtn.textContent).toContain('Complete');

    // Clicking completes the task
    fireEvent.click(completeBtn);

    const reloadedState = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(reloadedState.taskProgress['custom-task-downstream']?.state).toBe('completed');
  });
});

describe('F-INT-TIMEZONE-DSA: Canonical Local todayDate and IST Midnight Boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    window.location.hash = '';
    vi.useRealTimers();
  });

  it('determines Review Due using todayDate from usePlacement rather than local UTC calculation', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    // Problem dsa-001 has nextReviewAt set to today's local date
    const localToday = '2026-10-02';
    const testState: AppExtendedStorageState = {
      ...defaultState,
      dsaProgress: {
        ...defaultState.dsaProgress,
        'dsa-001': makeDSAProgress('dsa-001', {
          currentBox: 2,
          attemptCount: 1,
          passedIndependently: false,
          assistedProvisional: false,
          remediationRequired: false,
          lastAttemptAt: '2026-09-29T10:00:00Z',
          nextReviewAt: localToday,
          updatedAt: '2026-09-29T10:00:00Z',
        }),
      },
    };
    StorageAdapter.saveState(testState);

    // Mock Date so getTodayISO() returns '2026-10-02'
    // Specifically mock Date so that toISOString returns yesterday's UTC date '2026-10-01T20:30:00.000Z'
    // (This reproduces IST 02:00 AM on Oct 2)
    const simulatedLocalTime = new Date('2026-10-01T20:30:00.000Z'); // 02:00 IST on Oct 2
    vi.setSystemTime(simulatedLocalTime);

    // Ensure Date local methods return Oct 2
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(9); // October (0-indexed 9)
    vi.spyOn(Date.prototype, 'getDate').mockReturnValue(2);  // 2nd

    // Note: toISOString() still returns '2026-10-01T...'
    const utcToday = new Date().toISOString().split('T')[0];
    expect(utcToday).toBe('2026-10-01');

    // Probe the canonical PlacementOS calendar date consumed by DSAView
    let canonicalToday = '';
    const TodayDateProbe = () => {
      canonicalToday = usePlacement().todayDate;
      return null;
    };

    render(
      <PlacementProvider>
        <TodayDateProbe />
        <DSAView />
      </PlacementProvider>
    );

    // IST edge case (00:00–05:30): the canonical local date is 2026-10-02 while
    // the UTC date is still 2026-10-01. Review status must follow the local date.
    expect(canonicalToday).toBe('2026-10-02');
    expect(canonicalToday).not.toBe(utcToday);

    // In Progression Journey tab, verify reviewsDue banner displays the count
    expect(screen.getByText('Spaced Reviews Due Today (1)')).toBeDefined();

    // Switch to Full Catalog tab
    const catalogTab = screen.getByRole('button', { name: /full catalog/i });
    fireEvent.click(catalogTab);

    // In DSAView, dsa-001 (Two Sum) should have badge "Review Due" because nextReviewAt ('2026-10-02') <= todayDate ('2026-10-02')
    // With the old bug (using toISOString: '2026-10-01'), '2026-10-02' <= '2026-10-01' was FALSE.
    // With the fix (using todayDate), '2026-10-02' <= '2026-10-02' is TRUE.
    const reviewDueBadges = screen.getAllByText('Review Due');
    expect(reviewDueBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT mark a future review as Review Due on local today', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    const testState: AppExtendedStorageState = {
      ...defaultState,
      dsaProgress: {
        ...defaultState.dsaProgress,
        'dsa-001': makeDSAProgress('dsa-001', {
          currentBox: 2,
          attemptCount: 1,
          passedIndependently: false,
          assistedProvisional: false,
          remediationRequired: false,
          lastAttemptAt: '2026-10-01T10:00:00Z',
          nextReviewAt: '2026-10-05', // Due in 3 days
          updatedAt: '2026-10-01T10:00:00Z',
        }),
      },
    };
    StorageAdapter.saveState(testState);

    render(
      <PlacementProvider>
        <DSAView />
      </PlacementProvider>
    );

    const catalogTab = screen.getByRole('button', { name: /full catalog/i });
    fireEvent.click(catalogTab);

    // Should NOT have Review Due badge
    expect(screen.queryByText('Review Due')).toBeNull();
  });
});
