// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { SessionDisplay } from '../components/dashboard/SessionDisplay';
import { getPreparationTopic } from '../data/preparationDataset';
import { StorageAdapter, getDefaultStorageState, type AppStorageState } from '../storage/storageAdapter';
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

describe('P0 ACCEPTANCE TESTS: LEARNING FLOW & COMPLETION INTEGRITY', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // A. Completing Python Orient does not complete Two Pointers
  it('A. Completing Python Orient does not complete Two Pointers', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      const pythonTopic = getPreparationTopic('prep-lang')!;
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;
    const checkIn: DailyCheckIn = {
      id: `checkin-${todayISO}`,
      date: todayISO,
      mode: 'normal',
      availableMinutes: 120,
      energyLevel: 'medium',
      assignmentIds: ['assign-two-pointers'],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const assignments: DailyTaskAssignment[] = [
      {
        id: 'assign-two-pointers',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-101', // Master Two Pointer Technique on Arrays
        allocatedMinutes: 60,
        completed: false,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    // Verify initial state
    expect(capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-two-pointers')?.completed).toBe(false);
    expect(capturedPlacement!.taskProgress['task-101']?.state).not.toBe('completed');

    // Click "Mark Orient complete"
    const markBtn = screen.getByTestId('mark-orient-complete');
    act(() => {
      fireEvent.click(markBtn);
    });

    // Verification: Two Pointers MUST NOT be completed
    const assign = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-two-pointers');
    expect(assign?.completed).toBe(false);
    expect(capturedPlacement!.taskProgress['task-101']?.state).not.toBe('completed');
    // Python Orient progress is preserved
    expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages).toContain('orient');
  });

  // B. Completing Python Learn does not complete another Today item
  it('B. Completing Python Learn does not complete another Today item', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      const pythonTopic = getPreparationTopic('prep-lang')!;
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;
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
        referenceId: 'task-101',
        allocatedMinutes: 60,
        completed: false,
      },
      {
        id: 'assign-2',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-102',
        allocatedMinutes: 60,
        completed: false,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    // Complete Orient
    act(() => {
      fireEvent.click(screen.getByTestId('mark-orient-complete'));
    });

    // Navigate to final subtopic where deliberate Learn completion occurs
    const pythonTopic = getPreparationTopic('prep-lang')!;
    const lastSubtopicIdx = (pythonTopic.subtopics?.length ?? 1) - 1;
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Outline/i }));
    });
    act(() => {
      fireEvent.click(screen.getByTestId(`outline-subtopic-${lastSubtopicIdx}`));
    });

    // Now on final subtopic of Learn stage; complete Learn
    const markLearnBtn = screen.getByTestId('mark-learn-complete');
    act(() => {
      fireEvent.click(markLearnBtn);
    });

    // Verification: Neither assignment 1 nor 2 may be completed
    const a1 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-1');
    const a2 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-2');
    expect(a1?.completed).toBe(false);
    expect(a2?.completed).toBe(false);
    expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages).toContain('learn');
  });

  // C. Stage completion does not advance an unrelated session cursor
  it('C. Stage completion does not advance an unrelated session cursor', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      const pythonTopic = getPreparationTopic('prep-lang')!;
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;
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
        referenceId: 'task-101',
        allocatedMinutes: 60,
        completed: false,
      },
      {
        id: 'assign-2',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-102',
        allocatedMinutes: 60,
        completed: false,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    const initialCursor = capturedSession!.sessionState?.currentActivityIndex;
    expect(initialCursor).toBe(0);

    // Complete Orient and Learn
    act(() => {
      fireEvent.click(screen.getByTestId('mark-orient-complete'));
    });

    // Navigate to final subtopic where deliberate Learn completion occurs
    const pythonTopic = getPreparationTopic('prep-lang')!;
    const lastSubtopicIdx = (pythonTopic.subtopics?.length ?? 1) - 1;
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Outline/i }));
    });
    act(() => {
      fireEvent.click(screen.getByTestId(`outline-subtopic-${lastSubtopicIdx}`));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('mark-learn-complete'));
    });

    // Session cursor must remain at 0, not advanced
    expect(capturedSession!.sessionState?.currentActivityIndex).toBe(0);
    expect(capturedSession!.sessionState?.completedActivityIds).toEqual([]);
  });

  // D. The learner remains in the workspace after stage completion
  it('D. The learner remains in the workspace after stage completion', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      const pythonTopic = getPreparationTopic('prep-lang')!;
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    act(() => {
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    expect(capturedPlacement!.routeState.route).toBe('preparation');
    expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');

    // Click "Mark Orient complete"
    act(() => {
      fireEvent.click(screen.getByTestId('mark-orient-complete'));
    });

    // Still in preparation workspace, targetId is prep-lang, did not navigate to dashboard
    expect(capturedPlacement!.routeState.route).toBe('preparation');
    expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');
  });

  // E. Explicit matching activity completion still works
  it('E. Explicit matching activity completion still works', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      return (
        <SessionDisplay
          onStartActivity={() => undefined}
          onCompleteActivity={(actv) => {
            if (actv.sourceAssignmentId) {
              capturedPlacement?.syncDailyAssignmentCompletion(actv.sourceAssignmentId, true);
            }
          }}
        />
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;
    const checkIn: DailyCheckIn = {
      id: `checkin-${todayISO}`,
      date: todayISO,
      mode: 'normal',
      availableMinutes: 120,
      energyLevel: 'medium',
      assignmentIds: ['assign-match'],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const assignments: DailyTaskAssignment[] = [
      {
        id: 'assign-match',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-101',
        allocatedMinutes: 60,
        completed: false,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
    });

    const completeBtn = screen.getByRole('button', { name: /Complete/i });
    act(() => {
      fireEvent.click(completeBtn);
    });

    // Explicit matching action correctly marks completed
    const assign = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-match');
    expect(assign?.completed).toBe(true);
    expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(1);
  });

  // F. Undo/Reopen restores the correct unsealed assignment without altering other items
  it('F. Undo/Reopen restores the correct unsealed assignment without altering other items', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
    let capturedSession: ReturnType<typeof useSession> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      capturedSession = useSession();
      return <div />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    const todayISO = capturedPlacement!.todayDate;
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
        referenceId: 'task-101',
        allocatedMinutes: 60,
        completed: true, // Completed
      },
      {
        id: 'assign-2',
        date: todayISO,
        taskType: 'catalog_task',
        referenceId: 'task-102',
        allocatedMinutes: 60,
        completed: true, // Also completed
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(checkIn, assignments);
      capturedSession!.composeSession(120, 'balanced');
    });

    // Reopen ONLY assign-1
    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion('assign-1', false);
      capturedSession!.reopenActivity('assign-1');
    });

    // assign-1 is reopened (false), assign-2 remains completed (true)
    const a1 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-1');
    const a2 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-2');
    expect(a1?.completed).toBe(false);
    expect(a2?.completed).toBe(true);
  });

  // G. Sealed assignments remain protected
  it('G. Sealed assignments remain protected', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    const pastDate = '2026-09-01';
    const sealedCheckIn: DailyCheckIn = {
      id: `checkin-${pastDate}`,
      date: pastDate,
      mode: 'normal',
      availableMinutes: 120,
      energyLevel: 'medium',
      assignmentIds: ['assign-sealed'],
      totalActualMinutes: 120,
      isSealed: true, // IMMUTABLE
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const assignments: DailyTaskAssignment[] = [
      {
        id: 'assign-sealed',
        date: pastDate,
        taskType: 'catalog_task',
        referenceId: 'task-101',
        allocatedMinutes: 60,
        completed: true,
      },
    ];

    act(() => {
      capturedPlacement!.commitDailyPlan(sealedCheckIn, assignments);
    });

    // Attempt to mutate sealed assignment
    act(() => {
      capturedPlacement!.syncDailyAssignmentCompletion('assign-sealed', false);
    });

    // Assignment must remain completed (sealed day is immutable)
    const assign = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-sealed');
    expect(assign?.completed).toBe(true);
  });

  // H. Single-tab rapid saves persist without false overwrites or conflict errors
  it('H. Single-tab rapid saves persist without false overwrites or conflict errors', async () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    // Rapid consecutive stage completions and settings updates
    act(() => {
      const pythonTopic = getPreparationTopic('prep-lang')!;
      capturedPlacement!.completePreparationStage(pythonTopic, 'orient');
      capturedPlacement!.completePreparationStage(pythonTopic, 'learn');
      capturedPlacement!.completePreparationStage(pythonTopic, 'apply');
      capturedPlacement!.updateUserSettings({ theme: 'dark' });
    });

    // No storage conflict should occur
    expect(capturedPlacement!.storageConflict).toBe(false);
    expect(capturedPlacement!.persistenceError).toBe(false);

    // Stored revision in storage is valid
    const storedRev = StorageAdapter.getPersistedRevision();
    expect(storedRev).toBeGreaterThanOrEqual(1);
  });

  // I. Multi-tab stale writes cannot silently replace newer data
  it('I. Multi-tab stale writes cannot silently replace newer data', () => {
    const initialState = getDefaultStorageState();
    StorageAdapter.saveState(initialState);
    const rev1 = StorageAdapter.getPersistedRevision()!;

    // Tab A writes newer revision
    const tabAState: AppStorageState = {
      ...initialState,
      userSettings: { ...initialState.userSettings, targetPlacementGoal: 'Tab A Goal' },
    };
    const tabASave = StorageAdapter.saveStateDetailed(tabAState, { expectedRevision: rev1 });
    expect(tabASave.success).toBe(true);
    expect(tabASave.persistedRevision).toBe(rev1 + 1);

    // Tab B tries to save with stale expected revision rev1
    const tabBState: AppStorageState = {
      ...initialState,
      userSettings: { ...initialState.userSettings, targetPlacementGoal: 'Tab B Stale' },
    };
    const tabBSave = StorageAdapter.saveStateDetailed(tabBState, { expectedRevision: rev1 });
    expect(tabBSave.success).toBe(false);
    expect(tabBSave.conflict).toBe(true);

    // Storage still contains Tab A's goal, not Tab B's
    const loaded = StorageAdapter.loadState();
    expect(loaded.userSettings.targetPlacementGoal).toBe('Tab A Goal');
  });

  // J. Diagnostic and canonical DSA records remain unchanged by unrelated preparation activity
  it('J. Diagnostic and canonical DSA records remain unchanged by unrelated preparation activity', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    // Initial state: problem box 2
    act(() => {
      capturedPlacement!.updateDSAProgress({
        problemId: 'dsa-026',
        currentBox: 2,
        attemptCount: 1,
        passedIndependently: true,
        consecutiveAssistedPasses: 0,
        assistedProvisional: false,
        consecutiveFailures: 0,
        remediationRequired: false,
        patternLessonViewed: false,
        patternLessonCompleted: false,
        remediationSelfCheckPassed: false,
        evidenceStrength: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const boxBefore = capturedPlacement!.dsaProgress['dsa-026']?.currentBox;
    expect(boxBefore).toBe(2);

    // Unrelated stage completion on Python
    act(() => {
      const pythonTopic = getPreparationTopic('prep-lang')!;
      capturedPlacement!.completePreparationStage(pythonTopic, 'orient');
    });

    // DSA box must remain untouched
    expect(capturedPlacement!.dsaProgress['dsa-026']?.currentBox).toBe(2);
    expect(capturedPlacement!.dsaProgress['dsa-026']?.passedIndependently).toBe(true);
  });

  // K. Existing JSON export/import remains compatible
  it('K. Existing JSON export/import remains compatible', () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return <div />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    act(() => {
      const pythonTopic = getPreparationTopic('prep-lang')!;
      capturedPlacement!.completePreparationStage(pythonTopic, 'orient');
    });

    const json = capturedPlacement!.exportBackupJSON();
    expect(typeof json).toBe('string');
    expect(json.length).toBeGreaterThan(0);

    const importRes = capturedPlacement!.importBackupJSON(json);
    expect(importRes.success).toBe(true);
    expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages).toContain('orient');
  });
});
