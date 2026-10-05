// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { SessionDisplay } from '../components/dashboard/SessionDisplay';
import { composeAdaptiveSession } from '../engine/sessionComposer';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import { TASK_DEFINITIONS } from '../data/seedData';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type { DailyTaskAssignment, DailyCheckIn, DSAProgress } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = (): unknown[] => [];
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
});
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
});

describe('TASK 26: DAILY PLAN & ADAPTIVE SESSION CONVERGENCE', () => {
  const TODAY = '2026-10-05';

  function makeCheckIn(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
    return {
      id: `checkin-${overrides.date || TODAY}`,
      date: overrides.date || TODAY,
      mode: 'normal',
      availableMinutes: 90,
      energyLevel: 'high',
      assignmentIds: [],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: `${overrides.date || TODAY}T08:00:00Z`,
      updatedAt: `${overrides.date || TODAY}T08:00:00Z`,
      ...overrides,
    };
  }

  function makeAssignment(overrides: Partial<DailyTaskAssignment> = {}): DailyTaskAssignment {
    return {
      id: 'assign-1',
      date: TODAY,
      taskType: 'catalog_task',
      referenceId: 'task-101',
      allocatedMinutes: 60,
      completed: false,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T10:00:00.000Z'));
    localStorage.clear();
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  // A. Morning plan influences adaptive session
  it('A. Morning plan commitments meaningfully influence adaptive session composition', () => {
    const committedAssignments: DailyTaskAssignment[] = [
      makeAssignment({
        id: 'assign-t1',
        referenceId: 'task-101',
        taskType: 'catalog_task',
      }),
    ];

    const plan = composeAdaptiveSession({
      availableMinutes: 90,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      energyLevel: 'high',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      todayAssignments: committedAssignments,
    });

    const committedActivities = plan.activities.filter((a) => a.isCommittedAssignment);
    expect(committedActivities.length).toBeGreaterThan(0);
    expect(committedActivities[0].sourceAssignmentId).toBe('assign-t1');
    expect(committedActivities[0].sourceTaskId).toBe('task-101');
  });

  // B. Deterministic session -> daily assignment mapping
  it('B. Deterministic mapping assigns sourceAssignmentId and isCommittedAssignment', () => {
    const committedAssignments: DailyTaskAssignment[] = [
      makeAssignment({
        id: 'assign-p1',
        referenceId: 'dsa-001',
        taskType: 'dsa_new',
        allocatedMinutes: 30,
      }),
      makeAssignment({
        id: 'assign-t2',
        referenceId: 'task-101',
        taskType: 'catalog_task',
        allocatedMinutes: 60,
      }),
    ];

    const plan = composeAdaptiveSession({
      availableMinutes: 120,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      energyLevel: 'high',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      todayAssignments: committedAssignments,
    });

    const mappedActivities = plan.activities.filter((a) => a.isCommittedAssignment);
    for (const act of mappedActivities) {
      expect(act.sourceAssignmentId).toBeDefined();
      expect(act.isCommittedAssignment).toBe(true);
      const matchingAssignment = committedAssignments.find((a) => a.id === act.sourceAssignmentId);
      expect(matchingAssignment).toBeDefined();
    }
  });

  // C. Session completion marks mapped assignment complete
  it('C. Completing session activity marks mapped daily assignment complete', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function TestHarness() {
      capturedPlacement = usePlacement();
      return (
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );
    }

    function SessionConsumer() {
      capturedSession = useSession();
      return (
        <div>
          <SessionDisplay onStartActivity={() => {}} />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90, energyLevel: 'high' });
    const assignments = [makeAssignment({ id: 'assign-c', referenceId: 'task-101' })];

    // Commit a plan
    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
    });

    // Verify assignment exists and is not completed
    const initialAssignment = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.referenceId === 'task-101' && a.date === capturedPlacement!.todayDate
    );
    expect(initialAssignment).toBeDefined();
    expect(initialAssignment!.completed).toBe(false);

    // Recompose session so provider incorporates the committed plan
    act(() => {
      capturedSession!.composeSession(90, 'balanced');
    });

    const activeAct = capturedSession!.currentActivity;
    expect(activeAct).toBeDefined();

    // Advance/complete the activity
    act(() => {
      capturedSession!.advanceActivity('completed');
    });

    // Verify assignment is synchronized to completed
    const updatedAssignment = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.id === initialAssignment!.id
    );
    expect(updatedAssignment!.completed).toBe(true);
  });

  // D. Unmapped session activity does not mutate assignments
  it('D. Unmapped session activity does not mutate existing daily assignments', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function TestHarness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90, energyLevel: 'medium' });
    const assignments = [makeAssignment({ id: 'assign-2', referenceId: 'task-101' })];

    // Commit plan with task task-101
    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
    });

    const beforeAssignments = [...capturedPlacement!.dailyTaskAssignments];
    expect(beforeAssignments.length).toBe(1);
    expect(beforeAssignments[0].completed).toBe(false);

    // Directly call syncDailyAssignmentCompletion with a non-existent or unmapped ID
    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion('non-existent-assignment-id', true);
    });

    expect(capturedPlacement!.dailyTaskAssignments).toEqual(beforeAssignments);
  });

  // E. No duplicate evidence
  it('E. Completing session activity and syncing assignment does NOT emit duplicate evidence', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function TestHarness() {
      capturedPlacement = usePlacement();
      return <div>Evidence Test</div>;
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 60, energyLevel: 'high' });
    const assignments = [makeAssignment({ id: 'assign-e', referenceId: 'task-101' })];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
    });

    const initialEvidenceCount = capturedPlacement!.evidenceLogs.length;

    // Update task state to completed
    act(() => {
      capturedPlacement!.updateTaskState('task-101', 'completed');
    });

    const evidenceAfterTaskComplete = capturedPlacement!.evidenceLogs.length;
    expect(evidenceAfterTaskComplete).toBe(initialEvidenceCount + 1);

    // Explicitly sync daily assignment completion
    const assignment = capturedPlacement!.dailyTaskAssignments.find((a) => a.referenceId === 'task-101');
    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion(assignment!.id, true);
    });

    // Evidence count must remain EXACTLY identical (zero additional evidence)
    expect(capturedPlacement!.evidenceLogs.length).toBe(evidenceAfterTaskComplete);
  });

  // F. No duplicate session candidates
  it('F. Morning plan commitments and review candidates do not duplicate activities', () => {
    const committedAssignments: DailyTaskAssignment[] = [
      makeAssignment({
        id: 'assign-t1',
        referenceId: 'task-101',
      }),
    ];

    const plan = composeAdaptiveSession({
      availableMinutes: 90,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      energyLevel: 'high',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      todayAssignments: committedAssignments,
    });

    const t1Activities = plan.activities.filter(
      (a) => a.targetId === 'task-101' || a.sourceTaskId === 'task-101'
    );
    expect(t1Activities.length).toBe(1);
  });

  // G. Sealed day remains immutable
  it('G. Sealed day assignments remain immutable against session completion and sync', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function TestHarness() {
      capturedPlacement = usePlacement();
      return (
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );
    }

    function SessionConsumer() {
      capturedSession = useSession();
      return <div>Sealed Test</div>;
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    const sealedCheckIn = makeCheckIn({
      availableMinutes: 60,
      energyLevel: 'medium',
      isSealed: true,
    });
    const assignments = [makeAssignment({ id: 'assign-g', referenceId: 'task-101' })];

    // Commit plan as sealed
    act(() => {
      capturedPlacement!.commitDailyPlan(sealedCheckIn, assignments);
    });

    const todayCheckIn = capturedPlacement!.dailyCheckIns.find(
      (c) => c.date === capturedPlacement!.todayDate
    );
    expect(todayCheckIn?.isSealed).toBe(true);

    const sealedAssignment = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.referenceId === 'task-101'
    );
    expect(sealedAssignment!.completed).toBe(false);

    // Try to sync assignment completion directly
    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion(sealedAssignment!.id, true);
    });

    // Sealed assignment MUST remain false (immutable)
    const afterSync = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.id === sealedAssignment!.id
    );
    expect(afterSync!.completed).toBe(false);

    // Try to advance session activity
    act(() => {
      capturedSession?.advanceActivity('completed');
    });

    const afterAdvance = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.id === sealedAssignment!.id
    );
    expect(afterAdvance!.completed).toBe(false);
  });

  // H. Existing reviewScheduler committed-target filtering remains intact
  it('H. reviewScheduler filters out targets committed in todayAssignments', () => {
    const todayAssignments: DailyTaskAssignment[] = [
      makeAssignment({
        id: 'assign-p1',
        referenceId: 'dsa-001',
        taskType: 'dsa_review',
      }),
    ];

    const dsaProg: DSAProgress = {
      problemId: 'dsa-001',
      currentBox: 1,
      nextReviewAt: TODAY,
      attemptCount: 1,
      createdAt: '2026-10-04T00:00:00Z',
      updatedAt: '2026-10-04T00:00:00Z',
    };

    const result = generateReviewCandidates({
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {
        'dsa-001': dsaProg,
      },
      topics: [],
      domains: [],
      skillStates: {},
      companyOverlays: [],
      currentMode: 'normal',
      todayStr: TODAY,
      todayAssignments,
    });

    // dsa-001 should NOT appear in reviewCandidates because it is already committed in today's assignments
    const p1Candidate = result.candidates.find((c) => c.targetId === 'dsa-001');
    expect(p1Candidate).toBeUndefined();
  });

  // I. Existing session composition behavior remains intact when todayAssignments is empty
  it('I. Baseline session composition remains intact when todayAssignments is empty', () => {
    const plan = composeAdaptiveSession({
      availableMinutes: 60,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      energyLevel: 'medium',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      todayAssignments: [],
    });

    expect(plan.activities.length).toBeGreaterThan(0);
    expect(plan.timeBudgetMinutes).toBe(60);
    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(60);
    const committedActs = plan.activities.filter((a) => a.isCommittedAssignment);
    expect(committedActs.length).toBe(0);
  });

  // J. Existing day rollover behavior remains intact
  it('J. Midnight rollover seals unsealed previous day and maintains state integrity', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function TestHarness() {
      capturedPlacement = usePlacement();
      return <div>Rollover Test</div>;
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90, energyLevel: 'high' });
    const assignments = [makeAssignment({ id: 'assign-j', referenceId: 'task-101' })];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
    });

    expect(capturedPlacement!.dailyCheckIns.find((c) => c.date === TODAY)?.isSealed).toBe(false);

    // Fast-forward time to next day
    act(() => {
      vi.setSystemTime(new Date('2026-10-06T00:05:00.000Z'));
      window.dispatchEvent(new Event('focus'));
    });

    // Previous day (2026-10-05) should be automatically sealed on rollover
    const prevCheckIn = capturedPlacement!.dailyCheckIns.find((c) => c.date === TODAY);
    expect(prevCheckIn?.isSealed).toBe(true);

    // Attempting to mutate prevCheckIn's assignment now must fail due to sealing
    const prevAssignment = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.date === TODAY && a.referenceId === 'task-101'
    );
    expect(prevAssignment).toBeDefined();

    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion(prevAssignment!.id, true);
    });

    const checkAfter = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.id === prevAssignment!.id
    );
    expect(checkAfter!.completed).toBe(false);
  });
});
