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
 * Forces the local PlacementOS calendar date using the canonical local getters
 * that `getTodayISO()` reads. Returns a cleanup function to restore the original
 * Date methods and TZ. This does NOT mock `getDay()` — we want to test the
 * real `getLocalDayOfWeek` behavior across timezones.
 */
const setLocalCalendarDate = (
  year: number,
  monthIndex: number,
  day: number,
  tz = 'UTC'
): (() => void) => {
  const origTZ = process.env.TZ;
  process.env.TZ = tz;
  vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(year);
  vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(monthIndex);
  vi.spyOn(Date.prototype, 'getDate').mockReturnValue(day);
  // Do NOT mock getDay() — we want the real getLocalDayOfWeek behavior.
  return () => {
    vi.restoreAllMocks();
    process.env.TZ = origTZ;
  };
};

/** 2026-10-04 is a Sunday in all timezones with the new local parser. */
const SUNDAY = (tz = 'UTC') => setLocalCalendarDate(2026, 9, 4, tz);
/** 2026-10-05 is a Monday. */
const MONDAY = (tz = 'UTC') => setLocalCalendarDate(2026, 9, 5, tz);

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
  let restoreDate: () => void;

  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
    vi.useRealTimers();
  });

  afterEach(() => {
    if (restoreDate) restoreDate();
    cleanup();
    vi.restoreAllMocks();
    StorageAdapter.clearState();
    window.location.hash = '';
    vi.useRealTimers();
  });

  it('latches pendingSunday on a Sunday when eligible and no weekly test was completed', () => {
    StorageAdapter.saveState(buildState([baselineAttempt]));
    restoreDate = SUNDAY();

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
    restoreDate = SUNDAY();

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
    restoreDate = MONDAY();

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
    restoreDate = SUNDAY();

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

/**
 * F-DATE-SUNDAY-LOCAL-DAY regression tests.
 *
 * The bug: `new Date('YYYY-MM-DD').getDay()` parses the bare ISO date as UTC
 * midnight, then reads the weekday in local time. For negative UTC offsets
 * (e.g. America/New_York, America/Los_Angeles) this shifts the weekday by -1.
 *
 * These tests explicitly vary the process timezone and verify that
 * `getLocalDayOfWeek` (and by extension the Sunday latch + obligation check)
 * correctly identifies Sunday and Monday regardless of timezone.
 */
import { getLocalDayOfWeek } from '../engine/assessmentEngine';
import { checkSundayObligation } from '../engine/assessmentEngine';
import type { AssessmentState } from '../types';

describe('F-DATE-SUNDAY-LOCAL-DAY: getLocalDayOfWeek and Sunday logic across timezones', () => {
  const TIMEZONES = [
    'Asia/Kolkata',       // UTC+05:30
    'UTC',                // UTC+00:00
    'America/New_York',   // UTC-04:00 (EDT in October)
    'America/Los_Angeles',// UTC-07:00 (PDT in October)
  ] as const;

  const SUNDAY_ISO = '2026-10-04'; // a Sunday
  const MONDAY_ISO = '2026-10-05'; // a Monday

  // Helper to run a test block with a specific TZ, restoring after.
  const withTZ = (tz: string, fn: () => void) => {
    const origTZ = process.env.TZ;
    process.env.TZ = tz;
    try {
      fn();
    } finally {
      process.env.TZ = origTZ;
    }
  };

  const makeMinimalAssessmentState = (): AssessmentState => ({
    attempts: [baselineAttempt],
    responses: [],
    exposures: {},
    domainResults: [],
    snapshots: [],
    weaknessSignals: [],
    profile: { baselineCompletedAt: '2026-10-01T10:30:00.000Z', pendingSunday: false },
  });

  for (const tz of TIMEZONES) {
    it(`getLocalDayOfWeek('${SUNDAY_ISO}') === 0 (Sunday) in ${tz}`, () => {
      withTZ(tz, () => {
        expect(getLocalDayOfWeek(SUNDAY_ISO)).toBe(0);
      });
    });

    it(`getLocalDayOfWeek('${MONDAY_ISO}') === 1 (Monday) in ${tz}`, () => {
      withTZ(tz, () => {
        expect(getLocalDayOfWeek(MONDAY_ISO)).toBe(1);
      });
    });
  }

  // Now test the full Sunday obligation flow through both production paths:
  // 1. PlacementContext Sunday latch (via checkSundayObligation)
  // 2. assessmentEngine.checkSundayObligation directly
  for (const tz of TIMEZONES) {
    it(`checkSundayObligation sees Sunday in ${tz} when eligible and no weekly completed`, () => {
      withTZ(tz, () => {
        const state = makeMinimalAssessmentState();
        const result = checkSundayObligation(state, SUNDAY_ISO);
        expect(result.pendingSunday).toBe(true);
        expect(result.reason).toContain('Sunday mini-test is scheduled');
      });
    });

    it(`checkSundayObligation sees NO obligation on Monday in ${tz}`, () => {
      withTZ(tz, () => {
        const state = makeMinimalAssessmentState();
        const result = checkSundayObligation(state, MONDAY_ISO);
        expect(result.pendingSunday).toBe(false);
      });
    });

    it(`PlacementContext Sunday latch fires in ${tz}`, () => {
      withTZ(tz, () => {
        StorageAdapter.clearState();
        StorageAdapter.saveState(buildState([baselineAttempt]));
        window.location.hash = '#/assessment';

        setLocalCalendarDate(2026, 9, 4, tz);

        render(
          <PlacementProvider>
            <SundayProbe />
          </PlacementProvider>
        );

        expect(readSundayProbe().obligation).toBe('true');
        expect(readSundayProbe().latched).toBe('true');

        const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
        expect(reloaded.assessmentState?.profile?.pendingSunday).toBe(true);
      });
    });
  }

  // Regression: ensure the OLD buggy behavior would have failed.
  // This is a sanity check that demonstrates the bug exists in the naive parser.
  it('naive Date.parse("YYYY-MM-DD").getDay() IS buggy in negative-offset timezones (sanity)', () => {
    const buggyTimezones = ['America/New_York', 'America/Los_Angeles'];
    for (const tz of buggyTimezones) {
      withTZ(tz, () => {
        const naive = new Date(SUNDAY_ISO).getDay();
        // This is the bug: returns 6 (Saturday) instead of 0 (Sunday)
        expect(naive).not.toBe(0); // this proves the bug exists
      });
    }
    // And confirm it works in non-negative offsets
    for (const tz of ['Asia/Kolkata', 'UTC']) {
      withTZ(tz, () => {
        const naive = new Date(SUNDAY_ISO).getDay();
        expect(naive).toBe(0);
      });
    }
  });
});
