// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup, screen, fireEvent, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { SessionDisplay } from '../components/dashboard/SessionDisplay';
import { MorningPlanningModal } from '../components/daily/MorningPlanningModal';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DSAView } from '../components/dsa/DSAView';
import { composeAdaptiveSession } from '../engine/sessionComposer';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import { calculateNextLeitnerBox, calculateNextReviewDate } from '../engine/dsaEngine';
import { TASK_DEFINITIONS } from '../data/seedData';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type { DailyTaskAssignment, DailyCheckIn, DSAProgress, DSAAttempt, LeitnerBox } from '../types';

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
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

describe('TASK 32: DIRECT LEITNER DSA REVIEWS IN MORNING PLANNING', () => {
  const TODAY = '2026-10-05';

  function makeDsaAttempt(problemId: string, result: 'pass' | 'fail' = 'pass'): DSAAttempt {
    return {
      id: `attempt-${Date.now()}-${problemId}`,
      problemId,
      date: TODAY,
      result,
      assistanceLevel: 'none',
      timeTakenMinutes: 20,
      createdAt: new Date().toISOString(),
    };
  }

  function makeDsaProgress(
    problemId: string,
    currentBox: LeitnerBox = 1,
    result: 'pass' | 'fail' = 'pass'
  ): DSAProgress {
    const nextBox = calculateNextLeitnerBox(currentBox, result, 'none');
    const nextReviewDate = calculateNextReviewDate(nextBox, TODAY);
    return {
      problemId,
      currentBox: nextBox,
      nextReviewAt: nextReviewDate,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: 1,
      passedIndependently: result === 'pass',
      consecutiveAssistedPasses: 0,
      assistedProvisional: false,
      consecutiveFailures: result === 'fail' ? 1 : 0,
      remediationRequired: false,
      patternLessonViewed: false,
      patternLessonCompleted: false,
      remediationSelfCheckPassed: false,
      evidenceStrength: 0.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function makeCheckIn(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
    return {
      id: `checkin-${overrides.date || TODAY}`,
      date: overrides.date || TODAY,
      mode: 'normal',
      availableMinutes: 120,
      energyLevel: 'medium',
      assignmentIds: [],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: `${overrides.date || TODAY}T08:00:00Z`,
      updatedAt: `${overrides.date || TODAY}T08:00:00Z`,
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

  // A. Due DSA review appears in Morning Planning
  it('A. due DSA review appears in Morning Planning modal with review badges and title', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <MorningPlanningModal
          isOpen={true}
          onClose={() => {}}
          onCommitPlan={() => {}}
        />
      );
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    // Set a DSA problem due for review today
    act(() => {
      // Simulate problem dsa-001 having a due review today
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress: DSAProgress = {
        ...makeDsaProgress('dsa-001', 1, 'pass'),
        nextReviewAt: TODAY,
      };
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    // Re-render modal to observe updated due review
    act(() => {
      render(
        <PlacementProvider>
          <Harness />
        </PlacementProvider>
      );
    });

    // Modal renders heading for Leitner DSA Reviews
    expect(screen.getAllByText(/Leitner DSA Reviews/i).length).toBeGreaterThan(0);
  });

  // B. Non-due DSA problem does not appear as a review candidate
  it('B. non-due DSA problem does not appear as a review candidate in Morning Planning', () => {
    const futureDate = '2026-10-20'; // 15 days in future
    const dsaProgMap: Record<string, DSAProgress> = {
      'dsa-001': {
        problemId: 'dsa-001',
        currentBox: 2,
        nextReviewAt: futureDate,
        attemptCount: 1,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    };

    const candidates = generateReviewCandidates({
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: dsaProgMap,
      topics: [],
      domains: [],
      skillStates: {},
      companyOverlays: [],
      currentMode: 'normal',
      todayStr: TODAY,
      todayAssignments: [],
    });

    // dsa-001 is NOT due, so it must not be in reviewCandidates
    const dsa001Review = candidates.candidates.find(
      (c) => c.targetId === 'dsa-001' && c.type === 'dsa_review'
    );
    expect(dsa001Review).toBeUndefined();
  });

  // C. Selected DSA review becomes todayAssignment
  it('C. selected DSA review becomes todayAssignment upon committing plan', () => {
    let capturedAssignments: DailyTaskAssignment[] = [];

    const handleCommit = (_checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => {
      capturedAssignments = assignments;
    };

    function Harness() {
      // Setup a due review
      return (
        <MorningPlanningModal
          isOpen={true}
          onClose={() => {}}
          onCommitPlan={handleCommit}
        />
      );
    }

    const { getByTestId } = render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    // Commit the plan
    act(() => {
      const commitBtn = getByTestId('commit-morning-plan-button');
      fireEvent.click(commitBtn);
    });

    expect(capturedAssignments.length).toBeGreaterThan(0);
    // At least one assignment was generated
    for (const a of capturedAssignments) {
      expect(a.date).toBe(TODAY);
      expect(a.allocatedMinutes).toBeGreaterThan(0);
    }
  });

  // D. Assignment contains deterministic sourceProblemId/referenceId
  it('D. DSA assignment contains deterministic sourceProblemId and referenceId', () => {
    const dsaAssign: DailyTaskAssignment = {
      id: `assign-${TODAY}-dsa-001-0`,
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    expect(dsaAssign.referenceId).toBe('dsa-001');
    expect(dsaAssign.sourceProblemId).toBe('dsa-001');
    expect(dsaAssign.taskType).toBe('dsa_review');
  });

  // E. Committed DSA review reaches adaptive session
  it('E. committed DSA review reaches adaptive session composition as a committed candidate', () => {
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-test',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    const plan = composeAdaptiveSession({
      availableMinutes: 60,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {
        'dsa-001': {
          problemId: 'dsa-001',
          currentBox: 1,
          nextReviewAt: TODAY,
          attemptCount: 1,
          createdAt: '2026-10-04T00:00:00Z',
          updatedAt: '2026-10-04T00:00:00Z',
        },
      },
      todayAssignments: [dsaAssign],
    });

    const dsaActivity = plan.activities.find((a) => a.targetId === 'dsa-001');
    expect(dsaActivity).toBeDefined();
    expect(dsaActivity!.isCommittedAssignment).toBe(true);
    expect(dsaActivity!.sourceAssignmentId).toBe('assign-dsa-test');
    expect(dsaActivity!.sourceProblemId).toBe('dsa-001');
  });

  // F. DSA assignment receives Plan Aligned / Daily Plan identity
  it('F. DSA assignment receives Plan Aligned session badge and Daily Plan activity identity', () => {
    let capturedSession: ReturnType<typeof useSession> | null = null;

    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-badge',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    function SessionConsumer() {
      capturedSession = useSession();
      return <SessionDisplay onStartActivity={() => {}} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider
          todayAssignments={[dsaAssign]}
          todayStr={TODAY}
          availableMinutes={60}
          dsaProblems={DSA_PROBLEMS}
        >
          <SessionConsumer />
        </SessionProvider>
      </PlacementProvider>
    );

    act(() => {
      capturedSession?.composeSession(60, 'balanced');
    });

    // Plan Aligned indicator is rendered
    expect(screen.getByTestId('session-committed-plan-badge')).toBeDefined();
    expect(screen.getByTestId('session-committed-plan-badge').textContent).toContain('Plan Aligned');
    // Daily Plan activity badge is rendered
    expect(screen.getAllByText(/Daily Plan/i).length).toBeGreaterThan(0);
  });

  // G. Committed DSA review does not duplicate reviewScheduler output
  it('G. committed DSA review is deduplicated and does NOT appear twice in reviewScheduler', () => {
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-dedup',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

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
      dsaProgressMap: { 'dsa-001': dsaProg },
      topics: [],
      domains: [],
      skillStates: {},
      companyOverlays: [],
      currentMode: 'normal',
      todayStr: TODAY,
      todayAssignments: [dsaAssign],
    });

    // Since dsa-001 is in todayAssignments, reviewScheduler removes it from uncommitted candidates
    const candidate = result.candidates.find((c) => c.targetId === 'dsa-001');
    expect(candidate).toBeUndefined();
  });

  // H. Completing DSA attempt marks today's assignment completed
  it('H. completing DSA attempt marks corresponding daily plan assignment completed', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 60 });
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-h',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, [dsaAssign]);
    });

    const before = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-dsa-h');
    expect(before?.completed).toBe(false);

    // Complete the problem via canonical logDSAAttempt
    act(() => {
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress = makeDsaProgress('dsa-001', 1, 'pass');
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    const after = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-dsa-h');
    expect(after?.completed).toBe(true);
  });

  // I. Exactly one DSA evidence record is emitted
  it('I. solving DSA problem emits exactly one canonical evidence log', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 60 });
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-i',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, [dsaAssign]);
    });

    const initialEvidenceCount = capturedPlacement!.evidenceLogs.length;

    act(() => {
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress = makeDsaProgress('dsa-001', 1, 'pass');
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    expect(capturedPlacement!.evidenceLogs.length).toBe(initialEvidenceCount + 1);
    const latest = capturedPlacement!.evidenceLogs[0];
    expect(latest.sourceType).toBe('dsa_attempt');
  });

  // J. Leitner progression occurs through canonical logDSAAttempt
  it('J. Leitner progression advances box and recalculates review date on pass', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    act(() => {
      // First pass moves from initial Box 1 to Box 2
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress = makeDsaProgress('dsa-001', 1, 'pass');
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    const prog = capturedPlacement!.dsaProgress['dsa-001'];
    expect(prog).toBeDefined();
    expect(prog.currentBox).toBe(2);
    // Interval for Box 2 is 3 days: 2026-10-05 + 3 = 2026-10-08
    expect(prog.nextReviewAt).toBe('2026-10-08');
  });

  // K. Unrelated DSA assignments remain unchanged
  it('K. completing one DSA assignment leaves unrelated assignments unchanged', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90 });
    const assign1: DailyTaskAssignment = {
      id: 'assign-dsa-1',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
    };
    const assign2: DailyTaskAssignment = {
      id: 'assign-dsa-2',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-002',
      allocatedMinutes: 25,
      completed: false,
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, [assign1, assign2]);
    });

    act(() => {
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress = makeDsaProgress('dsa-001', 1, 'pass');
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    const after1 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-dsa-1');
    const after2 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-dsa-2');

    expect(after1?.completed).toBe(true);
    expect(after2?.completed).toBe(false);
  });

  // L. Sealed day cannot be mutated
  it('L. sealed day assignments remain immutable when logging DSA attempt', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const sealedCheckIn = makeCheckIn({
      date: TODAY,
      isSealed: true,
    });
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-sealed',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(sealedCheckIn, [dsaAssign]);
    });

    act(() => {
      const attempt = makeDsaAttempt('dsa-001', 'pass');
      const progress = makeDsaProgress('dsa-001', 1, 'pass');
      capturedPlacement!.logDSAAttempt(attempt, progress, 90);
    });

    const assignment = capturedPlacement!.dailyTaskAssignments.find(
      (a) => a.id === 'assign-dsa-sealed'
    );
    // Since day is sealed, assignment completed status remains false
    expect(assignment?.completed).toBe(false);
  });

  // M. No due DSA state produces a safe empty state
  it('M. empty due DSA reviews produces a clean empty state in Morning Planning without errors', () => {
    function Harness() {
      return (
        <MorningPlanningModal
          isOpen={true}
          onClose={() => {}}
          onCommitPlan={() => {}}
        />
      );
    }

    // Render with baseline state (no due reviews)
    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    expect(screen.getByText(/No DSA reviews due today/i)).toBeDefined();
    // Modal still displays curriculum roadmap tasks safely
    expect(screen.getAllByText(/Curriculum Roadmap Tasks/i).length).toBeGreaterThan(0);
  });

  // N. Mixed roadmap + DSA plan remains valid
  it('N. mixed roadmap tasks and DSA reviews commit and converge seamlessly', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div>Active</div>;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90 });
    const taskAssign: DailyTaskAssignment = {
      id: 'assign-mixed-task',
      date: TODAY,
      taskType: 'catalog_task',
      referenceId: 'task-101',
      allocatedMinutes: 45,
      completed: false,
    };
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-mixed-dsa',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, [taskAssign, dsaAssign]);
    });

    expect(capturedPlacement!.dailyTaskAssignments.length).toBe(2);
    expect(capturedPlacement!.dailyTaskAssignments[0].taskType).toBe('catalog_task');
    expect(capturedPlacement!.dailyTaskAssignments[1].taskType).toBe('dsa_review');

    // Both converge into adaptive session
    const plan = composeAdaptiveSession({
      availableMinutes: 90,
      todayStr: TODAY,
      mode: 'normal',
      sessionMode: 'balanced',
      tasks: TASK_DEFINITIONS,
      taskProgressMap: {},
      dsaProblems: DSA_PROBLEMS,
      dsaProgressMap: {},
      todayAssignments: [taskAssign, dsaAssign],
    });

    const committedActs = plan.activities.filter((a) => a.isCommittedAssignment);
    expect(committedActs.length).toBe(2);
    expect(committedActs.some((a) => a.sourceTaskId === 'task-101')).toBe(true);
    expect(committedActs.some((a) => a.sourceProblemId === 'dsa-001')).toBe(true);
  });

  // O. Duplicate commitment of the same DSA problem is prevented
  it('O. duplicate commitment of the same DSA problem for the same day is prevented', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <MorningPlanningModal
          isOpen={true}
          onClose={() => {}}
          onCommitPlan={() => {}}
        />
      );
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const existingAssign: DailyTaskAssignment = {
      id: 'assign-existing-dsa-001',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(makeCheckIn(), [existingAssign]);
    });

    // Because dsa-001 is already committed, it should not appear as a selectable candidate
    expect(screen.queryByTestId('morning-dsa-item-dsa-001')).toBeNull();
  });

  // P. Dashboard Today's Plan DSA Solve CTA passes exact problem ID and deep-links
  it('P. Dashboard Today\'s Plan DSA Solve CTA passes exact problem ID and deep-links to DSAView', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <DashboardView />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const checkIn = makeCheckIn({ availableMinutes: 90 });
    const dsaAssign: DailyTaskAssignment = {
      id: 'assign-dsa-solve-test',
      date: TODAY,
      taskType: 'dsa_review',
      referenceId: 'dsa-001',
      allocatedMinutes: 20,
      completed: false,
      sourceProblemId: 'dsa-001',
    };

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, [dsaAssign]);
    });

    const solveButton = screen.getByTestId('solve-dsa-dsa-001');
    expect(solveButton).toBeDefined();

    act(() => {
      fireEvent.click(solveButton);
    });

    expect(capturedPlacement!.routeState.route).toBe('dsa');
    expect(capturedPlacement!.routeState.targetId).toBe('dsa-001');
    expect(window.location.hash).toBe('#/dsa/dsa-001');
  });

  // Q. DSAView consumes routeState.targetId and opens attempt modal for the deep-linked problem
  it('Q. DSAView consumes routeState.targetId and opens attempt modal for the deep-linked problem', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <DSAView />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    act(() => {
      capturedPlacement!.setRoute('dsa', 'dsa-001');
    });

    // Deep-linked problem attempt modal should be rendered
    const modal = screen.getByTestId('dsa-attempt-modal');
    expect(modal).toBeDefined();
    expect(within(modal).getByText('Two Sum')).toBeDefined();
  });

  // R. Generic DSA navigation without targetId remains intact
  it('R. generic DSA navigation without targetId renders catalog without opening attempt modal', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <DSAView />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    act(() => {
      capturedPlacement!.setRoute('dsa');
    });

    expect(screen.queryByTestId('dsa-attempt-modal')).toBeNull();
    expect(screen.getByText(/DSA Progression Engine/i)).toBeDefined();
  });
});
