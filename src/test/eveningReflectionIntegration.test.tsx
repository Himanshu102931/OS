// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { EveningReflectionModal } from '../components/daily/EveningReflectionModal';
import type {
  DailyCheckIn,
  DailyTaskAssignment,
  DSAProgress,
  EvidenceLog,
  TaskProgress,
  TopicSkillState,
} from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SealHandler = (
  updatedCheckIn: DailyCheckIn,
  updatedAssignments: DailyTaskAssignment[],
  newEvidenceLogs: EvidenceLog[],
  updatedTaskProgressMap: Record<string, TaskProgress>,
  updatedDsaProgressMap: Record<string, DSAProgress>,
  updatedSkillStatesMap: Record<string, TopicSkillState>
) => void;

describe('TASK 40: EVENING REFLECTION - Direct DSA Assignment Integration', () => {
  const TODAY = '2026-10-05';

  let ctx: ReturnType<typeof usePlacement> | null = null;

  function Harness({ onSealDay, onClose }: { onSealDay: SealHandler; onClose: () => void }) {
    ctx = usePlacement();
    return <EveningReflectionModal isOpen={true} onClose={onClose} onSealDay={onSealDay} />;
  }

  function makeCheckIn(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
    return {
      id: `checkin-${TODAY}`,
      date: TODAY,
      mode: 'normal',
      availableMinutes: 90,
      energyLevel: 'high',
      assignmentIds: [],
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: `${TODAY}T08:00:00Z`,
      updatedAt: `${TODAY}T08:00:00Z`,
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

  interface RenderOptions {
    assignments?: DailyTaskAssignment[];
    checkIn?: DailyCheckIn;
    onSealDay?: ReturnType<typeof vi.fn>;
    /** Complete a task through Today BEFORE the seal, to exercise the duplicate guard. */
    completeTaskThroughToday?: string;
  }

  function renderModal(options: RenderOptions = {}) {
    const checkIn = options.checkIn ?? makeCheckIn();
    const assignments = options.assignments ?? [];
    const onSealDay = options.onSealDay ?? (vi.fn() as ReturnType<typeof vi.fn>);
    const onClose = vi.fn();

    render(
      <PlacementProvider>
        <Harness onSealDay={onSealDay as SealHandler} onClose={onClose} />
      </PlacementProvider>
    );

    act(() => {
      ctx!.commitDailyPlan(checkIn, assignments);
    });

    const taskToComplete = options.completeTaskThroughToday;
    if (taskToComplete) {
      act(() => {
        ctx!.updateTaskState(taskToComplete, 'completed');
      });
    }

    return { onSealDay, onClose, getCtx: () => ctx! };
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

  // A. Roadmap assignment still renders
  it('A. roadmap assignment still renders', () => {
    renderModal({ assignments: [makeAssignment({ id: 'assign-a' })] });

    expect(
      screen.getByText('Master Two Pointer Technique on Arrays')
    ).toBeInTheDocument();
    expect(screen.getByTestId('reflection-item-assign-a')).toBeInTheDocument();
  });

  // B. direct dsa_review assignment renders (the original gap: DSA items used to render null)
  it('B. direct dsa_review assignment renders', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-b', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    expect(screen.getByTestId('reflection-item-assign-b')).toBeInTheDocument();
    expect(screen.getByText('DSA Review')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
  });

  // C. direct dsa_new assignment renders
  it('C. direct dsa_new assignment renders', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-c', taskType: 'dsa_new', referenceId: 'dsa-001' }),
      ],
    });

    expect(screen.getByTestId('reflection-item-assign-c')).toBeInTheDocument();
    expect(screen.getByText('DSA New')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
  });

  // D. sourceProblemId resolves the canonical DSA problem (takes precedence over referenceId)
  it('D. sourceProblemId resolves canonical DSA problem', () => {
    renderModal({
      assignments: [
        makeAssignment({
          id: 'assign-d',
          taskType: 'dsa_review',
          referenceId: 'dsa-011', // non-canonical pointer — must NOT win
          sourceProblemId: 'dsa-001', // canonical problem — must win
        }),
      ],
    });

    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.queryByText('3Sum')).toBeNull();
  });

  // E. referenceId fallback is safe where sourceProblemId is absent
  it('E. referenceId fallback is safe where applicable', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-e1', taskType: 'dsa_review', referenceId: 'dsa-001' }),
        // Unresolvable problem id: must render nothing for that item without crashing
        makeAssignment({ id: 'assign-e2', taskType: 'dsa_new', referenceId: 'dsa-does-not-exist' }),
      ],
    });

    expect(screen.getByTestId('reflection-item-assign-e1')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.queryByTestId('reflection-item-assign-e2')).toBeNull();
  });

  // F. DSA title/pattern/difficulty/review-new metadata renders
  it('F. DSA metadata renders correctly', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-f', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('DSA Review')).toBeInTheDocument();
    expect(screen.getByText('Arrays & Hashing · easy')).toBeInTheDocument();
  });

  // G. DSA assignment supports the existing reflection inputs
  it('G. DSA assignment supports existing reflection inputs', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-g', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    expect(screen.getByTestId('reflection-minutes-assign-g')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-assistance-assign-g')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-confidence-assign-g')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-completed-assign-g')).toBeInTheDocument();

    // Labels remain as visible text
    expect(screen.getByText(/actual time \(mins\)/i)).toBeInTheDocument();
    expect(screen.getByText(/assistance required/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence \(1 - 5\)/i)).toBeInTheDocument();
  });

  // H. actual minutes can be recorded
  it('H. actual minutes can be recorded', () => {
    renderModal({ assignments: [makeAssignment({ id: 'assign-h', allocatedMinutes: 60 })] });

    const minutesInput = screen.getByTestId('reflection-minutes-assign-h');
    expect(minutesInput).toHaveValue(60);

    fireEvent.change(minutesInput, { target: { value: '45' } });
    expect(minutesInput).toHaveValue(45);
  });

  // I. confidence/assistance use the existing reflection model
  it('I. confidence/assistance use existing reflection model', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-i', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    const assistance = screen.getByTestId('reflection-assistance-assign-i');
    const confidence = screen.getByTestId('reflection-confidence-assign-i');
    expect(assistance).toHaveValue('none');
    expect(confidence).toHaveValue('4');

    fireEvent.change(assistance, { target: { value: 'hint' } });
    fireEvent.change(confidence, { target: { value: '5' } });
    expect(assistance).toHaveValue('hint');
    expect(confidence).toHaveValue('5');
  });

  // J. mixed roadmap + DSA assignments render together
  it('J. mixed roadmap + DSA assignments render together', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-j-roadmap', taskType: 'catalog_task', referenceId: 'task-101' }),
        makeAssignment({ id: 'assign-j-dsa', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    expect(screen.getByTestId('reflection-item-assign-j-roadmap')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-item-assign-j-dsa')).toBeInTheDocument();
    expect(screen.getByText('Master Two Pointer Technique on Arrays')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('DSA Review')).toBeInTheDocument();
  });

  // K. completed DSA assignment remains visible
  it('K. completed DSA assignment remains visible', () => {
    renderModal({
      assignments: [
        makeAssignment({ id: 'assign-k', taskType: 'dsa_new', referenceId: 'dsa-001', completed: true }),
      ],
    });

    expect(screen.getByTestId('reflection-item-assign-k')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByTestId('reflection-completed-assign-k')).toBeChecked();
  });

  // L. sealed day prevents reflection mutation
  it('L. sealed day prevents reflection mutation', () => {
    const { onSealDay } = renderModal({
      checkIn: makeCheckIn({ isSealed: true }),
      assignments: [makeAssignment({ id: 'assign-l', allocatedMinutes: 60 })],
    });

    expect(screen.getByText(/day is sealed/i)).toBeInTheDocument();
    expect(screen.getByTestId('reflection-minutes-assign-l')).toBeDisabled();
    expect(screen.getByTestId('reflection-assistance-assign-l')).toBeDisabled();
    expect(screen.getByTestId('reflection-confidence-assign-l')).toBeDisabled();
    expect(screen.getByTestId('reflection-completed-assign-l')).toBeDisabled();
    expect(screen.getByTestId('seal-day-button')).toBeDisabled();

    // Attempt a mutation anyway — sealed state must not change
    fireEvent.change(screen.getByTestId('reflection-minutes-assign-l'), { target: { value: '99' } });
    expect(screen.getByTestId('reflection-minutes-assign-l')).toHaveValue(60);

    fireEvent.click(screen.getByTestId('seal-day-button'));
    expect(onSealDay).not.toHaveBeenCalled();
  });

  // M. roadmap reflection regression: roadmap behaviour unchanged by the DSA integration
  it('M. roadmap reflection regression', () => {
    renderModal({
      assignments: [makeAssignment({ id: 'assign-m', taskType: 'catalog_task', referenceId: 'task-101', allocatedMinutes: 60 })],
    });

    const item = screen.getByTestId('reflection-item-assign-m');
    expect(item).toBeInTheDocument();
    expect(screen.getByText('Master Two Pointer Technique on Arrays')).toBeInTheDocument();

    // Reflection inputs still work for roadmap tasks
    const minutes = screen.getByTestId('reflection-minutes-assign-m');
    fireEvent.change(minutes, { target: { value: '30' } });
    expect(minutes).toHaveValue(30);

    const completed = screen.getByTestId('reflection-completed-assign-m');
    expect(completed).toBeChecked();
    fireEvent.click(completed);
    expect(completed).not.toBeChecked();
  });

  // N. no duplicate EvidenceLog: task already completed through Today emits zero new evidence at seal
  it('N. no duplicate EvidenceLog created', () => {
    const { onSealDay, getCtx } = renderModal({
      assignments: [makeAssignment({ id: 'assign-n', taskType: 'catalog_task', referenceId: 'task-101' })],
      completeTaskThroughToday: 'task-101',
    });

    // Completing through Today emitted exactly one evidence event
    const evidenceBefore = getCtx().evidenceLogs.length;
    expect(evidenceBefore).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('seal-day-button'));

    expect(onSealDay).toHaveBeenCalledTimes(1);
    const [, , newEvidenceLogs] = onSealDay.mock.calls[0];
    expect(newEvidenceLogs).toHaveLength(0);
    expect(getCtx().evidenceLogs).toHaveLength(evidenceBefore);
  });

  // O. no duplicate DSA attempt / evidence, no Leitner advance from Evening Reflection
  it('O. no duplicate DSA attempt/evidence created', () => {
    const { onSealDay, getCtx } = renderModal({
      assignments: [
        makeAssignment({ id: 'assign-o', taskType: 'dsa_review', referenceId: 'dsa-001' }),
      ],
    });

    const dsaAttemptsBefore = getCtx().dsaAttempts.length;
    const dsaProgressBefore = { ...getCtx().dsaProgress };
    const evidenceBefore = getCtx().evidenceLogs.length;

    fireEvent.click(screen.getByTestId('seal-day-button'));
    expect(onSealDay).toHaveBeenCalledTimes(1);

    const [, updatedAssignments, newEvidenceLogs, , updatedDsaProgressMap] = onSealDay.mock.calls[0];

    // The recorded reflection is carried through…
    expect(updatedAssignments[0].actualMinutes).toBeGreaterThan(0);

    // …but no evidence, no Leitner advance, no DSA attempt:
    expect(newEvidenceLogs).toHaveLength(0);
    expect(updatedDsaProgressMap).toEqual(dsaProgressBefore);
    expect(getCtx().dsaAttempts).toHaveLength(dsaAttemptsBefore);
    expect(getCtx().evidenceLogs).toHaveLength(evidenceBefore);
  });

  // P. empty state remains correct
  it('P. empty state remains correct', () => {
    renderModal();

    expect(
      screen.getByText(/no active assignments found for today/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('seal-day-button')).toBeDisabled();
  });
});
