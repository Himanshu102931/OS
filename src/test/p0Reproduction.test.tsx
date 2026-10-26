// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { getPreparationTopic } from '../data/preparationDataset';
import type { DailyCheckIn, DailyTaskAssignment } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = (): unknown[] => [];
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true, configurable: true, value: ObserverStub,
});
Object.defineProperty(window, 'ResizeObserver', {
  writable: true, configurable: true, value: ObserverStub,
});

describe('P0 REPRODUCTION: Lesson stage completion falsely completing session tasks', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('reproduces bug: completing Python Orient falsely completes Two Pointers daily assignment', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function TestApp() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      const pythonTopic = getPreparationTopic('prep-lang')!;
      return (
        <div data-testid="test-container">
          <TopicWorkspace topic={pythonTopic} />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <TestApp />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;

    // 1. User commits a daily plan with Two Pointers as first assignment
    const checkIn: DailyCheckIn = {
      id: `checkin-${todayISO}`,
      date: todayISO,
      mode: 'normal',
      availableMinutes: 120,
      energyLevel: 'medium',
      assignmentIds: ['assign-1', 'assign-2'],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const assignments: DailyTaskAssignment[] = [
      {
        id: 'assign-1',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-101', // Master Two Pointer Technique on Arrays
        allocatedMinutes: 60,
        completed: false,
      },
      {
        id: 'assign-2',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-102', // Another task
        allocatedMinutes: 60,
        completed: false,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
    });

    // Verify session starts on Activity 0 (Two Pointers)
    expect(capturedSession!.sessionState?.plan.activities.length).toBeGreaterThan(0);
    const initialActivity = capturedSession!.currentActivity;
    expect(initialActivity?.sourceTaskId).toBe('task-101');
    expect(capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-1')?.completed).toBe(false);

    // 2. User opened Python in preparation (e.g. prerequisite navigation)
    act(() => {
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    expect(capturedPlacement!.routeState.route).toBe('preparation');
    expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');

    // 3. User completes "Orient" stage on Python
    const markOrientBtn = screen.getByTestId('mark-orient-complete');
    act(() => {
      fireEvent.click(markOrientBtn);
    });

    // In the CURRENT buggy implementation:
    // - Two Pointers assignment was falsely marked completed!
    // - Route was unexpectedly changed to 'dashboard'!
    // - Current session activity advanced to the next activity!
    const assign1After = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-1');
    const routeAfter = capturedPlacement!.routeState.route;

    // EXPECTED CORRECT BEHAVIOR (fails before fix):
    // 1. Two Pointers assignment MUST NOT be completed by completing Python Orient
    expect(assign1After?.completed).toBe(false);
    // 2. Route MUST remain in 'preparation' workspace (no surprise navigation to dashboard)
    expect(routeAfter).toBe('preparation');
    // 3. Current activity in session MUST NOT advance
    expect(capturedSession!.currentActivity?.sourceTaskId).toBe('task-101');
    // 4. Python Orient progress is recorded
    expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages).toContain('orient');
  });
});
