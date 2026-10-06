// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { TaskDefinition, TaskProgress } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountRoadmap = () =>
  render(
    <PlacementProvider>
      <RoadmapView />
    </PlacementProvider>
  );

const DeepLinkHarness = () => {
  const { routeState } = usePlacement();
  return routeState.route === 'roadmap' ? <RoadmapView /> : null;
};

const mountFromDeepLink = () =>
  render(
    <PlacementProvider>
      <DeepLinkHarness />
    </PlacementProvider>
  );

describe('ROADMAP MANUFACTURING PART 2: Active Phase + Milestones + Immediate Focus', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  it('1. selected phase vs active phase: maintains operational activePhase when inspecting upcoming phase', () => {
    mountRoadmap();

    // Initially Phase 1 is selected and active
    expect(screen.getByTestId('phase-node-phase-1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('phase-node-phase-1').getAttribute('aria-current')).toBe('step');

    // Select Phase 2
    fireEvent.click(screen.getByTestId('phase-node-phase-2'));

    // Trajectory marks Phase 2 selected, but Phase 1 remains active operational
    expect(screen.getByTestId('phase-node-phase-2').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('phase-node-phase-1').getAttribute('aria-current')).toBe('step');

    // Inspection banner is displayed
    const banner = screen.getByTestId('roadmap-inspection-banner');
    expect(banner).toBeDefined();
    expect(within(banner).getByText(/Inspecting Phase 2/i)).toBeDefined();
    expect(within(banner).getByText(/Active operational phase is/i)).toBeDefined();

    // Summary header marks inspected milestone
    const summaryHeader = screen.getByTestId('phase-summary-header');
    expect(within(summaryHeader).getByText('Inspected Phase Milestone')).toBeDefined();

    // Immediate Focus honestly shows Phase 2 is gated by Phase 1 operational active state
    const focusSection = screen.getByTestId('roadmap-immediate-focus');
    expect(within(focusSection).getByTestId('focus-empty-state')).toBeDefined();
    expect(within(focusSection).getByText(/Phase 2 Milestone Gated/i)).toBeDefined();

    // Clicking return restores Phase 1 selection
    const returnBtn = screen.getByTestId('return-to-active-phase');
    fireEvent.click(returnBtn);

    expect(screen.getByTestId('phase-node-phase-1').getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByTestId('roadmap-inspection-banner')).toBeNull();
  });

  it('2. immediate focus only shows actionable tasks: renders top unblocked tasks in active phase', () => {
    mountRoadmap();

    const focusSection = screen.getByTestId('roadmap-immediate-focus');
    expect(focusSection).toBeDefined();

    // Default Phase 1 tasks include task-101 (DSA Two Pointers)
    const task101Item = screen.getByTestId('focus-task-item-task-101');
    expect(task101Item).toBeDefined();

    // Communicates domain, estimated minutes, status, and why it is actionable
    expect(within(task101Item).getByText('DSA')).toBeDefined();
    expect(within(task101Item).getByText('60m')).toBeDefined();
    expect(within(task101Item).getByText('Not Started')).toBeDefined();
    expect(within(task101Item).getByText(/Prerequisites satisfied • Ready to start/i)).toBeDefined();

    // Clicking the action button opens the task in the topic drawer
    const actionBtn = screen.getByTestId('focus-action-btn-task-101');
    fireEvent.click(actionBtn);

    expect(screen.getByTestId('topic-detail-drawer')).toBeDefined();
    const taskCard = screen.getByTestId('task-card-task-101');
    expect(taskCard.getAttribute('data-highlighted')).toBe('true');
  });

  it('3. blocked tasks are not incorrectly presented as actionable in immediate focus', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    // Create a task with an unmet prerequisite
    const upstreamTask: TaskDefinition = {
      id: 'custom-prereq-upstream',
      title: 'Prerequisite Upstream Task',
      description: 'Must be completed before downstream',
      domainId: 'dsa',
      topicId: 'topic-dsa-arrays',
      phaseId: 'phase-1',
      estimatedMinutes: 30,
      importance: 10, // Higher importance but blocked!
      taskType: 'practice',
      createdAt: '2026-09-01T00:00:00Z',
    };

    const downstreamBlockedTask: TaskDefinition = {
      id: 'custom-blocked-downstream',
      title: 'Blocked Downstream Task',
      description: 'Requires upstream task',
      domainId: 'dsa',
      topicId: 'topic-dsa-arrays',
      phaseId: 'phase-1',
      estimatedMinutes: 45,
      importance: 10, // Higher importance but blocked!
      taskType: 'practice',
      prerequisiteTaskDefinitionIds: ['custom-prereq-upstream'],
      createdAt: '2026-09-01T00:00:00Z',
    };

    const testState: AppExtendedStorageState = {
      ...defaultState,
      customTaskDefinitions: [upstreamTask, downstreamBlockedTask],
      taskProgress: {
        ...defaultState.taskProgress,
        'custom-prereq-upstream': {
          taskId: 'custom-prereq-upstream',
          state: 'not_started',
          timeSpentMinutes: 0,
          postponeCount: 0,
          skipCount: 0,
          updatedAt: '2026-10-01',
        },
        'custom-blocked-downstream': {
          taskId: 'custom-blocked-downstream',
          state: 'not_started',
          timeSpentMinutes: 0,
          postponeCount: 0,
          skipCount: 0,
          updatedAt: '2026-10-01',
        },
      },
    };
    StorageAdapter.saveState(testState);

    mountRoadmap();

    // Upstream task IS actionable and should appear
    expect(screen.getByTestId('focus-task-item-custom-prereq-upstream')).toBeDefined();

    // Downstream blocked task MUST NOT appear in immediate focus
    expect(screen.queryByTestId('focus-task-item-custom-blocked-downstream')).toBeNull();
  });

  it('4. empty focus state: displays honest empty state when all phase tasks are completed', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;

    // Mark all Phase 1 tasks completed in storage
    const completedProgress: Record<string, TaskProgress> = { ...defaultState.taskProgress };
    (defaultState.customTaskDefinitions ?? []).forEach((t) => {
      completedProgress[t.id] = {
        taskId: t.id,
        state: 'completed',
        timeSpentMinutes: 30,
        postponeCount: 0,
        skipCount: 0,
        updatedAt: '2026-10-06',
      };
    });
    // Ensure all phase-1 tasks are marked completed
    for (let i = 101; i <= 150; i++) {
      const id = `task-${i}`;
      completedProgress[id] = {
        taskId: id,
        state: 'completed',
        timeSpentMinutes: 30,
        postponeCount: 0,
        skipCount: 0,
        updatedAt: '2026-10-06',
      };
    }

    const testState: AppExtendedStorageState = {
      ...defaultState,
      taskProgress: completedProgress,
    };
    StorageAdapter.saveState(testState);

    mountRoadmap();

    const emptyState = screen.getByTestId('focus-empty-state');
    expect(emptyState).toBeDefined();
    expect(within(emptyState).getByText(/Phase Milestone Completed/i)).toBeDefined();
    expect(within(emptyState).getByText(/100% milestone achieved/i)).toBeDefined();
  });

  it('5. module milestone rendering: renders milestone cards with code, domain, progress, and collapsible toggle', () => {
    mountRoadmap();

    const milestonesList = screen.getByTestId('roadmap-milestones-list');
    expect(milestonesList).toBeDefined();

    // Module 1 (mod-dsa-1: Arrays & Two Pointers)
    const modCard = screen.getByTestId('milestone-card-mod-dsa-1');
    expect(modCard).toBeDefined();
    expect(within(modCard).getByText('M-01')).toBeDefined();
    expect(within(modCard).getByText('Arrays, Hash Tables & Two Pointers')).toBeDefined();
    expect(within(modCard).getByText('DSA')).toBeDefined();

    // Toggle button aria-expanded state
    const toggleBtn = screen.getByTestId('milestone-toggle-mod-dsa-1');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    // Collapse module
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Re-expand module
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('6. topic state rendering: topics display name, freshness badge, and click opens drawer', () => {
    mountRoadmap();

    // Topic row exists inside expanded module
    const topicRow = screen.getByTestId('topic-row-topic-dsa-arrays');
    expect(topicRow).toBeDefined();
    expect(within(topicRow).getByText('Arrays & Two Pointers')).toBeDefined();

    // Click topic row opens topic detail drawer
    fireEvent.click(topicRow);

    const drawer = screen.getByTestId('topic-detail-drawer');
    expect(drawer).toBeDefined();
    expect(within(drawer).getByText('Topic Tasks (2)')).toBeDefined();
  });

  it('7. domain filter behavior: filters milestones to selected domain and clears filter', () => {
    mountRoadmap();

    // Initial: multiple domain modules exist
    expect(screen.getByTestId('milestone-card-mod-dsa-1')).toBeDefined();
    expect(screen.getByTestId('milestone-card-mod-sql-1')).toBeDefined();

    // Click SQL domain chip
    const sqlChip = screen.getByTestId('domain-filter-chip-sql');
    fireEvent.click(sqlChip);

    // Only SQL module is displayed
    expect(screen.getByTestId('milestone-card-mod-sql-1')).toBeDefined();
    expect(screen.queryByTestId('milestone-card-mod-dsa-1')).toBeNull();

    // Clear filter
    const clearBtn = screen.getByTestId('clear-domain-filter');
    fireEvent.click(clearBtn);

    // All modules restored
    expect(screen.getByTestId('milestone-card-mod-dsa-1')).toBeDefined();
    expect(screen.getByTestId('milestone-card-mod-sql-1')).toBeDefined();
  });

  it('8. deep-link behavior: restores active topic and highlights task', () => {
    window.location.hash = '#/roadmap/task-102';
    mountFromDeepLink();

    const drawer = screen.getByTestId('topic-detail-drawer');
    expect(drawer).toBeDefined();

    const task102Card = screen.getByTestId('task-card-task-102');
    expect(task102Card).toBeDefined();
    expect(task102Card.getAttribute('data-highlighted')).toBe('true');
  });

  it('9. drawer behavior: close button closes drawer cleanly', () => {
    window.location.hash = '#/roadmap/task-101';
    mountFromDeepLink();

    expect(screen.getByTestId('topic-detail-drawer')).toBeDefined();

    const closeBtn = screen.getByLabelText('Close topic detail');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('topic-detail-drawer')).toBeNull();
  });

  it('10. accessibility semantics: accessible roles and progress bars', () => {
    mountRoadmap();

    // Accessible progress bar on phase summary
    const progressBar = screen.getByRole('progressbar', { name: /task progress/i });
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');

    // Milestone toggles have aria-expanded and aria-controls
    const toggleBtn = screen.getByTestId('milestone-toggle-mod-dsa-1');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.getAttribute('aria-controls')).toBe('module-topics-mod-dsa-1');

    // Topic row has role="button" and tabIndex={0}
    const topicRow = screen.getByTestId('topic-row-topic-dsa-arrays');
    expect(topicRow.getAttribute('role')).toBe('button');
    expect(topicRow.getAttribute('tabIndex')).toBe('0');
  });
});
