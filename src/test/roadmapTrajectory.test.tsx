// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ROADMAP MANUFACTURING PART 1: Trajectory + Current Position', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  const mountRoadmap = () =>
    render(
      <PlacementProvider>
        <RoadmapView />
      </PlacementProvider>
    );

  it('1. renders Zone 1 Header, Zone 2 Position Strip, and Zone 3 Trajectory Rail', () => {
    mountRoadmap();

    // Zone 1: Header
    const header = screen.getByTestId('roadmap-header');
    expect(header).toBeDefined();
    expect(within(header).getByRole('heading', { level: 1 })).toBeDefined();
    expect(within(header).getByText(/Master Roadmap & Trajectory/i)).toBeDefined();

    // Zone 2: Position Strip
    const positionStrip = screen.getByTestId('roadmap-position-strip');
    expect(positionStrip).toBeDefined();
    expect(within(positionStrip).getByText(/Active: Phase 1/i)).toBeDefined();
    expect(within(positionStrip).getByText(/Drive Season: Apr – May 2027/i)).toBeDefined();

    // Zone 3: Trajectory Rail
    const trajectoryRail = screen.getByTestId('roadmap-trajectory-rail');
    expect(trajectoryRail).toBeDefined();
    expect(within(trajectoryRail).getByRole('tablist', { name: /Placement Phases Trajectory/i })).toBeDefined();
  });

  it('2. renders all four phases with sequence, dates, and state indicators', () => {
    mountRoadmap();

    const phase1Node = screen.getByTestId('phase-node-phase-1');
    const phase2Node = screen.getByTestId('phase-node-phase-2');
    const phase3Node = screen.getByTestId('phase-node-phase-3');
    const phase4Node = screen.getByTestId('phase-node-phase-4');

    expect(phase1Node).toBeDefined();
    expect(phase2Node).toBeDefined();
    expect(phase3Node).toBeDefined();
    expect(phase4Node).toBeDefined();

    // Stage order numbers
    expect(within(phase1Node).getByText('STAGE 01')).toBeDefined();
    expect(within(phase2Node).getByText('STAGE 02')).toBeDefined();
    expect(within(phase3Node).getByText('STAGE 03')).toBeDefined();
    expect(within(phase4Node).getByText('STAGE 04')).toBeDefined();

    // Phase date windows
    expect(within(phase1Node).getByText(/Sep 01 – Nov 30, 2026/i)).toBeDefined();
    expect(within(phase2Node).getByText(/Dec 01, 2026 – Jan 31, 2027/i)).toBeDefined();
    expect(within(phase3Node).getByText(/Feb 01 – Mar 31, 2027/i)).toBeDefined();
    expect(within(phase4Node).getByText(/Apr 01 – May 31, 2027/i)).toBeDefined();

    // Initial state: Phase 1 is Active Focus; others are Upcoming
    expect(within(phase1Node).getByText(/Active Focus/i)).toBeDefined();
    expect(within(phase2Node).getByText(/Upcoming/i)).toBeDefined();
    expect(within(phase3Node).getByText(/Upcoming/i)).toBeDefined();
    expect(within(phase4Node).getByText(/Upcoming/i)).toBeDefined();
  });

  it('3. marks Phase 1 with aria-current="step" as the canonical active phase', () => {
    mountRoadmap();

    const phase1Node = screen.getByTestId('phase-node-phase-1');
    expect(phase1Node.getAttribute('aria-current')).toBe('step');

    const phase2Node = screen.getByTestId('phase-node-phase-2');
    expect(phase2Node.getAttribute('aria-current')).toBeNull();
  });

  it('4. preserves Active Phase marker when inspecting a different phase and displays the inspection banner', () => {
    mountRoadmap();

    // Inspection banner is absent when active phase is selected
    expect(screen.queryByTestId('roadmap-inspection-banner')).toBeNull();

    // User selects Phase 2 (upcoming phase)
    const phase2Node = screen.getByTestId('phase-node-phase-2');
    fireEvent.click(phase2Node);

    // Phase 2 is now selected
    expect(phase2Node.getAttribute('aria-selected')).toBe('true');
    expect(within(phase2Node).getByText('Inspecting Phase')).toBeDefined();

    // CRITICAL: Phase 1 STILL remains marked as the Active operational phase
    const phase1Node = screen.getByTestId('phase-node-phase-1');
    expect(phase1Node.getAttribute('aria-current')).toBe('step');
    expect(within(phase1Node).getByText(/Active Focus/i)).toBeDefined();

    // Inspection banner is now displayed
    const banner = screen.getByTestId('roadmap-inspection-banner');
    expect(banner).toBeDefined();
    expect(within(banner).getByText(/Inspecting Phase 2/i)).toBeDefined();
    expect(within(banner).getByText(/Active operational phase is/i)).toBeDefined();
    expect(within(banner).getByText('Phase 1')).toBeDefined();

    // Summary header clearly labels Phase 2 as Inspected Phase Milestone, NOT Active Operational Phase
    const summaryHeader = screen.getByTestId('phase-summary-header');
    expect(within(summaryHeader).getByText('Inspected Phase Milestone')).toBeDefined();
    expect(within(summaryHeader).queryByText('Active Operational Phase')).toBeNull();
  });

  it('5. restores selection to Active Phase via Return button in inspection banner', () => {
    mountRoadmap();

    // Inspect Phase 3
    fireEvent.click(screen.getByTestId('phase-node-phase-3'));
    expect(screen.getByTestId('roadmap-inspection-banner')).toBeDefined();

    // Click Return to Active Phase
    const returnBtn = screen.getByTestId('return-to-active-phase');
    expect(returnBtn).toBeDefined();
    fireEvent.click(returnBtn);

    // Banner is gone; Phase 1 is selected and active
    expect(screen.queryByTestId('roadmap-inspection-banner')).toBeNull();
    const phase1Node = screen.getByTestId('phase-node-phase-1');
    expect(phase1Node.getAttribute('aria-selected')).toBe('true');
    expect(phase1Node.getAttribute('aria-current')).toBe('step');

    const summaryHeader = screen.getByTestId('phase-summary-header');
    expect(within(summaryHeader).getByText('Active Operational Phase')).toBeDefined();
  });

  it('6. calculates macro task count and calendar progress in the position strip', () => {
    const defaultState = getDefaultStorageState() as AppExtendedStorageState;
    // Mark one task completed
    const testState: AppExtendedStorageState = {
      ...defaultState,
      taskProgress: {
        ...defaultState.taskProgress,
        'task-101': {
          taskId: 'task-101',
          state: 'completed',
          timeSpentMinutes: 45,
          postponeCount: 0,
          skipCount: 0,
          updatedAt: '2026-10-06',
        },
      },
    };
    StorageAdapter.saveState(testState);

    mountRoadmap();

    const positionStrip = screen.getByTestId('roadmap-position-strip');
    // Verifies total count reflects the completed task
    expect(within(positionStrip).getByText(/1\/\d+ Total Tasks/i)).toBeDefined();
  });

  it('7. maintains keyboard accessibility with role="tab" and focus rings', () => {
    mountRoadmap();

    const phaseNodes = [
      screen.getByTestId('phase-node-phase-1'),
      screen.getByTestId('phase-node-phase-2'),
      screen.getByTestId('phase-node-phase-3'),
      screen.getByTestId('phase-node-phase-4'),
    ];

    for (const node of phaseNodes) {
      expect(node.tagName).toBe('BUTTON');
      expect(node.getAttribute('role')).toBe('tab');
      expect(node.getAttribute('tabIndex')).toBe('0');
      expect(node.className).toContain('focus-visible:ring-2');
    }
  });

const DeepLinkHarness = () => {
  const { routeState } = usePlacement();
  return routeState.route === 'roadmap' ? <RoadmapView /> : null;
};

  it('8. deep link resolution continues to open topic drawer seamlessly', () => {
    window.location.hash = '#/roadmap/task-101';
    render(
      <PlacementProvider>
        <DeepLinkHarness />
      </PlacementProvider>
    );

    // Drawer should open and display the topic containing task-101
    expect(screen.getByTestId('topic-detail-drawer')).toBeDefined();
    expect(screen.getByText('Master Two Pointer Technique on Arrays')).toBeDefined();
  });

  it('9. renders signature motion: Roadmap Trajectory Traveler along the 4-phase trajectory rail', () => {
    mountRoadmap();

    const rail = screen.getByTestId('roadmap-trajectory-rail');
    expect(rail).toBeDefined();

    const traveler = screen.getByTestId('roadmap-trajectory-traveler');
    expect(traveler).toBeDefined();
    expect(traveler.className).toContain('roadmap-trajectory-traveler');

    // Active phase Phase 1 has breathing emphasis
    const phase1Node = screen.getByTestId('phase-node-phase-1');
    expect(phase1Node.className).toContain('phase-active-pulse');
  });
});
