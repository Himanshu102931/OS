// @vitest-environment jsdom
/**
 * F-INTEG-MIDNIGHT-SEAL regression coverage.
 *
 * Before the fix, an app left open across local midnight advanced `todayDate`
 * but left the previous day's check-in unsealed until the next reload ran the
 * hydration pass. These tests pin the required behavior:
 *
 *   1. crossing local midnight while open seals the previous day immediately,
 *   2. an already-sealed previous check-in is never re-stamped,
 *   3. no prior check-in means no bogus record is created,
 *   4. repeated interval/focus execution is idempotent,
 *   5. the new day's own check-in behavior is untouched,
 *   6. the decision is keyed to the *local* calendar date, not UTC.
 *
 * The local calendar date is forced through the same getters `getTodayISO()`
 * reads, so results do not depend on the host machine's timezone.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import type { AppStorageState } from '../storage/storageAdapter';
import type { DailyCheckIn } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DAY_ONE = '2026-10-04';
const DAY_TWO = '2026-10-05';

/** Forces the local calendar date that `getTodayISO()` derives. */
const forceLocalDate = (year: number, monthIndex: number, day: number) => {
  vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(year);
  vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(monthIndex);
  vi.spyOn(Date.prototype, 'getDate').mockReturnValue(day);
};

const forceDayOne = () => forceLocalDate(2026, 9, 4);
const forceDayTwo = () => forceLocalDate(2026, 9, 5);

/**
 * Runs one rollover check. This is the exact callback the 60s interval and the
 * `focus` listener both invoke, so ticking this way covers timer execution too.
 */
const tick = () => {
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
};

const makeCheckIn = (
  date: string,
  isSealed: boolean = false,
  extra: Partial<DailyCheckIn> = {}
): DailyCheckIn => ({
  id: `ci-${date}`,
  date,
  mode: 'normal',
  availableMinutes: 120,
  energyLevel: 'high',
  assignmentIds: [],
  totalActualMinutes: 0,
  isSealed,
  createdAt: `${date}T06:00:00.000Z`,
  updatedAt: `${date}T06:00:00.000Z`,
  ...extra,
});

const stateWith = (checkIns: DailyCheckIn[]): AppStorageState => ({
  ...getDefaultStorageState(),
  dailyCheckIns: checkIns,
});

type ProbeCheckIn = { date: string; isSealed: boolean; sealedAt?: string; updatedAt: string };

/** Exposes provider state through the DOM (never through render-time writes). */
const Probe = ({ planDate }: { planDate?: string }) => {
  const ctx = usePlacement();
  return (
    <div>
      <div
        data-testid="probe"
        data-today={ctx.todayDate}
        data-count={String(ctx.dailyCheckIns.length)}
        data-checkins={JSON.stringify(
          ctx.dailyCheckIns.map((c) => ({
            date: c.date,
            isSealed: c.isSealed,
            sealedAt: c.sealedAt,
            updatedAt: c.updatedAt,
          }))
        )}
      />
      {planDate ? (
        <button data-testid="plan" onClick={() => ctx.commitDailyPlan(makeCheckIn(planDate, false), [])}>
          plan
        </button>
      ) : null}
    </div>
  );
};

const readProbe = () => {
  const el = screen.getByTestId('probe');
  return {
    today: el.getAttribute('data-today') ?? '',
    count: Number(el.getAttribute('data-count')),
    checkins: JSON.parse(el.getAttribute('data-checkins') ?? '[]') as ProbeCheckIn[],
  };
};

const byDate = (date: string) => readProbe().checkins.filter((c) => c.date === date);

describe('F-INTEG-MIDNIGHT-SEAL: sealing on local midnight rollover', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/dashboard';
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    StorageAdapter.clearState();
    window.location.hash = '';
    vi.useRealTimers();
  });

  it('1. seals the previous day when an open app crosses local midnight', () => {
    forceDayOne();
    StorageAdapter.saveState(stateWith([makeCheckIn(DAY_ONE, false)]));

    render(
      <PlacementProvider>
        <Probe />
      </PlacementProvider>
    );

    // Still the same local day: hydration must not have sealed anything.
    expect(readProbe().today).toBe(DAY_ONE);
    expect(readProbe().checkins[0].isSealed).toBe(false);

    // Local clock crosses midnight while the app stays open.
    forceDayTwo();
    tick();

    const after = readProbe();
    expect(after.today).toBe(DAY_TWO);
    expect(after.count).toBe(1); // no duplicate record
    expect(after.checkins[0].isSealed).toBe(true);
    expect(after.checkins[0].sealedAt).toBeTruthy();
    expect(after.checkins[0].updatedAt).toBeTruthy();

    // ...and the sealed state was persisted, not just held in memory.
    const stored = StorageAdapter.loadState();
    expect(stored.dailyCheckIns).toHaveLength(1);
    expect(stored.dailyCheckIns[0].date).toBe(DAY_ONE);
    expect(stored.dailyCheckIns[0].isSealed).toBe(true);
    expect(stored.dailyCheckIns[0].sealedAt).toBe(after.checkins[0].sealedAt);
  });

  it('2. leaves an already-sealed previous check-in untouched', () => {
    forceDayOne();
    StorageAdapter.saveState(
      stateWith([
        makeCheckIn(DAY_ONE, true, {
          sealedAt: '2026-10-04T18:00:00.000Z',
          updatedAt: '2026-10-04T18:00:00.000Z',
        }),
      ])
    );

    render(
      <PlacementProvider>
        <Probe />
      </PlacementProvider>
    );
    const before = readProbe().checkins[0];

    forceDayTwo();
    tick();

    const after = readProbe();
    expect(after.today).toBe(DAY_TWO);
    expect(after.count).toBe(1);
    expect(after.checkins[0].isSealed).toBe(true);
    // Never re-stamped: the original seal timestamps survive verbatim.
    expect(after.checkins[0].sealedAt).toBe('2026-10-04T18:00:00.000Z');
    expect(after.checkins[0].updatedAt).toBe('2026-10-04T18:00:00.000Z');
    expect(after.checkins[0].updatedAt).toBe(before.updatedAt);
  });

  it('3. creates no bogus check-in when there was no prior one', () => {
    forceDayOne();
    StorageAdapter.saveState(stateWith([]));

    render(
      <PlacementProvider>
        <Probe />
      </PlacementProvider>
    );
    expect(readProbe().count).toBe(0);

    forceDayTwo();
    tick();

    expect(readProbe().count).toBe(0);
    expect(readProbe().checkins).toHaveLength(0);
    expect(StorageAdapter.loadState().dailyCheckIns).toHaveLength(0);
  });

  it('4. is idempotent across repeated rollover ticks', () => {
    forceDayOne();
    StorageAdapter.saveState(stateWith([makeCheckIn(DAY_ONE, false)]));

    render(
      <PlacementProvider>
        <Probe />
      </PlacementProvider>
    );

    forceDayTwo();
    tick();

    const first = readProbe();
    expect(first.count).toBe(1);
    expect(first.checkins[0].isSealed).toBe(true);
    const firstSealedAt = first.checkins[0].sealedAt;
    const firstUpdatedAt = first.checkins[0].updatedAt;
    expect(firstSealedAt).toBeTruthy();

    // A *re*-seal would re-stamp both timestamps — make that loudly visible.
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2099-12-31T23:59:59.999Z');

    tick();
    tick();
    tick();

    const later = readProbe();
    expect(later.today).toBe(DAY_TWO);
    expect(later.count).toBe(1);
    expect(later.checkins[0].isSealed).toBe(true);
    expect(later.checkins[0].sealedAt).toBe(firstSealedAt);
    expect(later.checkins[0].sealedAt).not.toBe('2099-12-31T23:59:59.999Z');
    expect(later.checkins[0].updatedAt).toBe(firstUpdatedAt);
    expect(byDate(DAY_ONE)).toHaveLength(1);
  });

  it('5. keeps the new day\'s own check-in behavior unchanged', () => {
    forceDayOne();
    StorageAdapter.saveState(stateWith([makeCheckIn(DAY_ONE, false)]));

    render(
      <PlacementProvider>
        <Probe planDate={DAY_TWO} />
      </PlacementProvider>
    );

    forceDayTwo();
    tick();

    const sealedYesterday = readProbe();
    expect(sealedYesterday.count).toBe(1);
    expect(sealedYesterday.checkins[0].isSealed).toBe(true);

    // The new day plans normally: its check-in must be created unsealed.
    fireEvent.click(screen.getByTestId('plan'));

    const after = readProbe();
    expect(after.today).toBe(DAY_TWO);
    expect(after.count).toBe(2);
    expect(byDate(DAY_TWO)).toHaveLength(1);
    expect(byDate(DAY_TWO)[0].isSealed).toBe(false);
    // Yesterday's record is still there, sealed, exactly once.
    expect(byDate(DAY_ONE)).toHaveLength(1);
    expect(byDate(DAY_ONE)[0].isSealed).toBe(true);
  });

  it('6. keys the rollover to the local calendar date, not the UTC date', () => {
    forceDayOne();
    StorageAdapter.saveState(stateWith([makeCheckIn(DAY_ONE, false)]));

    render(
      <PlacementProvider>
        <Probe />
      </PlacementProvider>
    );
    expect(readProbe().today).toBe(DAY_ONE);
    expect(readProbe().checkins[0].isSealed).toBe(false);

    // The local calendar has ticked over to Oct 5 while the UTC instant is
    // still Oct 4 (e.g. 00:30 IST == 19:00 UTC on the previous day). A UTC-based
    // rollover would see "no change", leave todayDate alone and never seal.
    forceDayTwo();
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-10-04T19:00:00.000Z');
    tick();

    const after = readProbe();
    expect(after.today).toBe(DAY_TWO);
    expect(after.count).toBe(1);
    expect(after.checkins[0].isSealed).toBe(true);
    // The seal was stamped at a UTC instant that still reads Oct 4 — proving the
    // decision came from the local calendar, not from a UTC date string.
    expect(after.checkins[0].sealedAt).toBe('2026-10-04T19:00:00.000Z');
  });
});
