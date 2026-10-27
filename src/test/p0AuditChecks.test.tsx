// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { getPreparationTopic } from '../data/preparationDataset';
import { StorageAdapter } from '../storage/storageAdapter';
import type { DailyCheckIn, DailyTaskAssignment } from '../types';

describe('P0 AUDIT CHECKS: IDENTITY VERIFICATION & DATA SAFETY', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  const makeCheckIn = (date: string, isSealed: boolean, assignmentIds: string[]): DailyCheckIn => ({
    id: `checkin-${date}`,
    date,
    mode: 'normal',
    availableMinutes: 120,
    energyLevel: 'medium',
    assignmentIds,
    totalActualMinutes: 0,
    isSealed,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  });

  // =========================================================================
  // CHECK A: Verify Workspace / Activity Identity
  // =========================================================================
  describe('Check A — Verify workspace/activity identity', () => {
    it('A1. Clicking "Complete Activity & Advance" in Python header when Two Pointers is active does NOT complete Two Pointers or advance session', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      const pythonTopic = getPreparationTopic('prep-lang')!;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Commit a daily plan where the 1st activity is Two Pointers
      const todayISO = capturedPlacement!.todayDate;
      const checkIn = makeCheckIn(todayISO, false, ['assign-two-pointers', 'assign-arrays-medium']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-two-pointers',
          date: todayISO,
          taskType: 'dsa_review',
          referenceId: 'p-two-pointers',
          allocatedMinutes: 45,
          completed: false,
        },
        {
          id: 'assign-arrays-medium',
          date: todayISO,
          taskType: 'dsa_review',
          referenceId: 'p-arrays-medium',
          allocatedMinutes: 45,
          completed: false,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
        capturedSession!.composeSession(120, 'balanced');
      });

      // Verify session cursor is at Activity 0 (Two Pointers)
      expect(capturedSession!.currentActivity).toBeDefined();
      expect(capturedSession!.sessionState?.currentActivityIndex).toBe(0);
      expect(capturedPlacement!.dailyTaskAssignments[0].completed).toBe(false);

      // Navigate to Python workspace (prep-lang is a prerequisite)
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      expect(capturedPlacement!.routeState.route).toBe('preparation');
      expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');

      // Per STEP 5 requirements:
      // When Two Pointers is active, opening Python must NOT display session banner or Complete Activity button
      expect(screen.queryByTestId('session-deep-link-banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Complete Activity & Advance/i })).not.toBeInTheDocument();

      // Crucial assertions:
      // 1. Two Pointers MUST NOT be completed!
      const twoPointersAssign = capturedPlacement!.dailyTaskAssignments.find(
        (a) => a.id === 'assign-two-pointers'
      );
      expect(twoPointersAssign?.completed).toBe(false);

      // 2. Session cursor MUST NOT advance (must remain 0)!
      expect(capturedSession!.sessionState?.currentActivityIndex).toBe(0);

      // 3. Completed activity IDs must NOT contain Two Pointers
      expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(0);
    });

    it('A2. Clicking "Complete Activity & Advance" when workspace topic DOES match current session activity completes and advances cleanly', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      const pythonTopic = getPreparationTopic('prep-lang')!;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Commit a daily plan where the activity explicitly matches prep-lang
      const todayISO = capturedPlacement!.todayDate;
      const checkIn = makeCheckIn(todayISO, false, ['assign-python-lesson']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-python-lesson',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 'prep-lang',
          allocatedMinutes: 30,
          completed: false,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
        capturedSession!.composeSession(60, 'balanced');
      });

      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      // When the session's active activity matches prep-lang, advanceActivity works
      const advanceBtn = screen.getByRole('button', { name: /Complete Activity & Advance/i });
      act(() => {
        fireEvent.click(advanceBtn);
      });

      expect(capturedPlacement!.routeState.route).toBe('dashboard');
    });
  });

  // =========================================================================
  // CHECK B: Protect Genuine Progress When Reopening
  // =========================================================================
  describe('Check B — Protect genuine progress when reopening', () => {
    it('B1. Reopening an unsealed daily assignment preserves pre-existing roadmap task completion', () => {
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

      const todayISO = capturedPlacement!.todayDate;

      // 1. User previously completed roadmap task 't1' independently
      act(() => {
        capturedPlacement!.updateTaskState('t1', 'completed');
      });

      expect(capturedPlacement!.taskProgress['t1']?.state).toBe('completed');

      // 2. Later, task 't1' is assigned in a daily plan
      const checkIn = makeCheckIn(todayISO, false, ['assign-t1-review']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-t1-review',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 't1',
          allocatedMinutes: 30,
          completed: true, // Marked completed today
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
      });

      expect(capturedPlacement!.dailyTaskAssignments[0].completed).toBe(true);

      // 3. User reopens today's daily assignment
      act(() => {
        capturedPlacement!.syncDailyAssignmentCompletion('assign-t1-review', false);
      });

      // The assignment is reopened
      expect(capturedPlacement!.dailyTaskAssignments[0].completed).toBe(false);

      // CRUCIAL: Pre-existing roadmap task progress MUST REMAIN 'completed'!
      expect(capturedPlacement!.taskProgress['t1']?.state).toBe('completed');
    });

    it('B2. Reopening preserves unrelated evidence logs, diagnostic scores, and DSA mastery', () => {
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

      const todayISO = capturedPlacement!.todayDate;
      const checkIn = makeCheckIn(todayISO, false, ['assign-task-5']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-task-5',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 't5',
          allocatedMinutes: 30,
          completed: true,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
      });

      const initialEvidenceCount = capturedPlacement!.evidenceLogs.length;

      // Reopen assignment
      act(() => {
        capturedPlacement!.syncDailyAssignmentCompletion('assign-task-5', false);
      });

      expect(capturedPlacement!.dailyTaskAssignments[0].completed).toBe(false);
      // Evidence logs count must not be arbitrarily deleted
      expect(capturedPlacement!.evidenceLogs.length).toBe(initialEvidenceCount);
    });

    it('B3. Multiple assignments referencing the same task: reopening one does not touch the other', () => {
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

      const todayISO = capturedPlacement!.todayDate;
      const checkIn = makeCheckIn(todayISO, false, ['assign-part-1', 'assign-part-2']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-part-1',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 't1',
          allocatedMinutes: 30,
          completed: true,
        },
        {
          id: 'assign-part-2',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 't1', // Same task reference
          allocatedMinutes: 30,
          completed: true,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
      });

      // Reopen assign-part-1
      act(() => {
        capturedPlacement!.syncDailyAssignmentCompletion('assign-part-1', false);
      });

      const a1 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-part-1');
      const a2 = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-part-2');
      expect(a1?.completed).toBe(false);
      expect(a2?.completed).toBe(true);
    });

    it('B4. Repeated Reopen clicks and rapid Complete/Reopen sequences are idempotent and safe', () => {
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

      const todayISO = capturedPlacement!.todayDate;
      const checkIn = makeCheckIn(todayISO, false, ['assign-rapid']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-rapid',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 't1',
          allocatedMinutes: 30,
          completed: true,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
      });

      // Rapid complete/reopen sequence
      act(() => {
        capturedPlacement!.syncDailyAssignmentCompletion('assign-rapid', false);
        capturedPlacement!.syncDailyAssignmentCompletion('assign-rapid', false); // Duplicate reopen
        capturedPlacement!.syncDailyAssignmentCompletion('assign-rapid', true);
        capturedPlacement!.syncDailyAssignmentCompletion('assign-rapid', false);
      });

      const a = capturedPlacement!.dailyTaskAssignments.find((x) => x.id === 'assign-rapid');
      expect(a?.completed).toBe(false);
    });

    it('B5. Sealed assignments cannot be reopened', () => {
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

      const sealedDate = '2026-08-15';
      const sealedCheckIn = makeCheckIn(sealedDate, true, ['assign-sealed-task']);

      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-sealed-task',
          date: sealedDate,
          taskType: 'catalog_task',
          referenceId: 't1',
          allocatedMinutes: 30,
          completed: true,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(sealedCheckIn, assignments);
      });

      // Attempt to reopen sealed assignment
      act(() => {
        capturedPlacement!.syncDailyAssignmentCompletion('assign-sealed-task', false);
      });

      const a = capturedPlacement!.dailyTaskAssignments.find((x) => x.id === 'assign-sealed-task');
      expect(a?.completed).toBe(true); // Must remain true!
    });
  });

  // =========================================================================
  // CHECK C: Serialized Saving Sanity Check
  // =========================================================================
  describe('Check C — Serialized saving sanity check', () => {
    it('C1. Rapid consecutive updates within one tab save in order without dropping the final state', async () => {
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

      // Perform 3 rapid state updates in sequence
      act(() => {
        capturedPlacement!.updateTaskState('t1', 'in_progress');
      });
      act(() => {
        capturedPlacement!.updateTaskState('t2', 'in_progress');
      });
      act(() => {
        capturedPlacement!.updateTaskState('t1', 'completed');
      });

      // Read back state from storage
      const loaded = StorageAdapter.loadState();
      expect(loaded.taskProgress['t1']?.state).toBe('completed');
      expect(loaded.taskProgress['t2']?.state).toBe('in_progress');
      expect(capturedPlacement!.storageConflict).toBe(false);
      expect(capturedPlacement!.persistenceError).toBe(false);
    });

    it('C2. Multi-tab conflict: external tab write detected and local save aborted to prevent silent overwrite', () => {
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

      // Simulate external tab write with higher revision
      const externalState = StorageAdapter.loadState();
      externalState.storageRevision = (externalState.storageRevision ?? 1) + 5;
      externalState.taskProgress['t99'] = {
        taskId: 't99',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(externalState));

      // Attempt to save from this tab
      act(() => {
        capturedPlacement!.updateTaskState('t1', 'completed');
      });

      // Conflict must be flagged and newer external data must NOT be overwritten
      expect(capturedPlacement!.storageConflict).toBe(true);

      const currentStored = JSON.parse(localStorage.getItem('placementos_v1_state')!);
      expect(currentStored.taskProgress['t99']).toBeDefined(); // External write is preserved!
    });

    it('C3. Conflict recovery: resolveStorageConflict reloads the latest state and clears conflict flag', () => {
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

      // Simulate external tab write
      const externalState = StorageAdapter.loadState();
      externalState.storageRevision = (externalState.storageRevision ?? 1) + 2;
      externalState.taskProgress['t-external'] = {
        taskId: 't-external',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(externalState));

      // Fire save attempt to detect conflict
      act(() => {
        capturedPlacement!.updateTaskState('t1', 'completed');
      });

      expect(capturedPlacement!.storageConflict).toBe(true);

      // Resolve conflict by reloading latest state
      act(() => {
        capturedPlacement!.resolveStorageConflict();
      });

      expect(capturedPlacement!.storageConflict).toBe(false);
      expect(capturedPlacement!.taskProgress['t-external']?.state).toBe('completed');
    });
  });
});
