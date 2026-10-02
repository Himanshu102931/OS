// @vitest-environment jsdom
/**
 * Focused regression coverage for the two behavior-sensitive refactors that
 * replaced React effects (F-LINT-REACT-EFFECTS):
 *
 *  1. PlacementContext's Sunday obligation latch — was written by a
 *     setState-in-effect, now derived and applied during render.
 *  2. AssessmentRunnerView's editable text draft — was mirrored local state
 *     re-synchronized by an effect, now derived from the recorded response.
 *
 * Both must keep producing exactly the state the effect used to produce.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { AssessmentAttempt } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Completed baseline so `isSundayTestEligible` is true. */
const baselineAttempt: AssessmentAttempt = {
  id: 'attempt-baseline-done',
  definitionId: 'baseline-v1',
  definitionVersion: 1,
  kind: 'diagnostic_assessment',
  status: 'submitted',
  startedAt: '2026-10-01T08:00:00.000Z',
  endedAt: '2026-10-01T10:30:00.000Z',
  timeLimitSeconds: 10800,
  seed: 'seed-baseline',
  selectedItemIds: ['item-1'],
};

/** Weekly assessment already completed on the mocked local day. */
const weeklyAttemptCompletedToday: AssessmentAttempt = {
  id: 'attempt-weekly-done-today',
  definitionId: 'sunday-v1',
  definitionVersion: 1,
  kind: 'weekly_assessment',
  status: 'submitted',
  startedAt: '2026-10-04T06:00:00.000Z',
  endedAt: '2026-10-04T07:00:00.000Z',
  timeLimitSeconds: 10800,
  seed: 'seed-sunday',
  selectedItemIds: ['item-2'],
};

const buildState = (attempts: AssessmentAttempt[]): AppExtendedStorageState => ({
  ...(getDefaultStorageState() as AppExtendedStorageState),
  assessmentState: {
    attempts,
    responses: [],
    exposures: {},
    domainResults: [],
    snapshots: [],
    weaknessSignals: [],
    profile: {
      baselineCompletedAt: '2026-10-01T10:30:00.000Z',
      pendingSunday: false,
    },
  },
});

/**
 * Forces the local PlacementOS calendar date so the result does not depend on
 * the host machine's timezone: `getTodayISO()` reads these local getters, and
 * the Sunday latch reads `getDay()`.
 */
const mockLocalDate = (year: number, monthIndex: number, day: number, dayOfWeek: number) => {
  vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(year);
  vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(monthIndex);
  vi.spyOn(Date.prototype, 'getDate').mockReturnValue(day);
  vi.spyOn(Date.prototype, 'getDay').mockReturnValue(dayOfWeek);
};

/** 2026-10-04 is a Sunday; dayOfWeek 0 = Sunday, 1 = Monday. */
const SUNDAY = () => mockLocalDate(2026, 9, 4, 0);
const MONDAY = () => mockLocalDate(2026, 9, 5, 1);

/**
 * Exposes the Sunday-latch inputs/outputs through the DOM so they can be
 * asserted without mutating any variable outside of render.
 */
const SundayProbe = () => {
  const ctx = usePlacement();
  return (
    <div
      data-testid="sunday-probe"
      data-obligation={String(ctx.pendingSundayObligation)}
      data-latched={String(ctx.assessmentState?.profile?.pendingSunday ?? false)}
    />
  );
};

const readSundayProbe = () => {
  const el = screen.getByTestId('sunday-probe');
  return {
    obligation: el.getAttribute('data-obligation'),
    latched: el.getAttribute('data-latched'),
  };
};

describe('F-LINT-REACT-EFFECTS: Sunday obligation latch', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    StorageAdapter.clearState();
    window.location.hash = '';
    vi.useRealTimers();
  });

  it('latches pendingSunday on a Sunday when eligible and no weekly test was completed', () => {
    StorageAdapter.saveState(buildState([baselineAttempt]));
    SUNDAY();

    render(
      <PlacementProvider>
        <SundayProbe />
      </PlacementProvider>
    );

    // Obligation is surfaced...
    expect(readSundayProbe().obligation).toBe('true');
    // ...and the latch is persisted so it rolls forward (§18).
    expect(readSundayProbe().latched).toBe('true');

    const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(reloaded.assessmentState?.profile?.pendingSunday).toBe(true);
  });

  it('does NOT latch when a weekly assessment was already completed today', () => {
    StorageAdapter.saveState(buildState([baselineAttempt, weeklyAttemptCompletedToday]));
    SUNDAY();

    render(
      <PlacementProvider>
        <SundayProbe />
      </PlacementProvider>
    );

    expect(readSundayProbe().latched).toBe('false');
    expect(readSundayProbe().obligation).toBe('false');
  });

  it('does NOT latch on a non-Sunday even though the baseline is complete', () => {
    StorageAdapter.saveState(buildState([baselineAttempt]));
    MONDAY();

    render(
      <PlacementProvider>
        <SundayProbe />
      </PlacementProvider>
    );

    expect(readSundayProbe().latched).toBe('false');
    expect(readSundayProbe().obligation).toBe('false');
  });

  it('leaves an already-latched obligation untouched (no render loop, no re-write)', () => {
    const state = buildState([baselineAttempt]);
    state.assessmentState!.profile.pendingSunday = true;
    StorageAdapter.saveState(state);
    SUNDAY();

    render(
      <PlacementProvider>
        <SundayProbe />
      </PlacementProvider>
    );

    expect(readSundayProbe().latched).toBe('true');
    expect(readSundayProbe().obligation).toBe('true');
  });
});

describe('F-LINT-REACT-EFFECTS: AssessmentRunnerView derived text draft', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    StorageAdapter.clearState();
    window.location.hash = '';
  });

  const currentDraft = (): string =>
    (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '';

  /** Advances one question at a time until a free-text item renders. */
  const advanceToFreeTextItem = () => {
    for (let i = 0; i < 84; i++) {
      if (document.querySelector('textarea')) return true;
      const next = screen.queryByText('Next Question');
      if (!next) return false;
      act(() => {
        fireEvent.click(next);
      });
    }
    return Boolean(document.querySelector('textarea'));
  };

  it('derives the draft from the recorded response across mount and navigation', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Start Baseline Assessment'));
    });

    expect(advanceToFreeTextItem()).toBe(true);

    // Typing records the response synchronously, so the derived draft mirrors it.
    const draft = 'select employee_id from employees;';
    act(() => {
      fireEvent.change(document.querySelector('textarea')!, { target: { value: draft } });
    });
    expect(currentDraft()).toBe(draft);
    expect(screen.getByText(/1 answered/i)).toBeDefined();

    // Navigate away and back: the draft must be re-derived, not lost.
    act(() => {
      fireEvent.click(screen.getByText('Next Question'));
    });
    act(() => {
      fireEvent.click(screen.getByText('Previous Question'));
    });
    expect(currentDraft()).toBe(draft);
  });

  it('clears the draft when "I don\'t know" is recorded', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Start Baseline Assessment'));
    });
    expect(advanceToFreeTextItem()).toBe(true);

    act(() => {
      fireEvent.change(document.querySelector('textarea')!, { target: { value: 'partial answer' } });
    });
    expect(currentDraft()).toBe('partial answer');

    act(() => {
      fireEvent.click(screen.getByText("I don't know this concept"));
    });
    expect(currentDraft()).toBe('');
  });

  it('starts an empty draft for a text item that has no recorded response', () => {
    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Start Baseline Assessment'));
    });
    expect(advanceToFreeTextItem()).toBe(true);

    expect(currentDraft()).toBe('');
  });
});
