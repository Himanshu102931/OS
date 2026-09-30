// @vitest-environment jsdom
//
// C6 — Today candidate + readiness consistency.
//
// The invariant under test: ONE canonical candidate evaluation and ONE
// canonical readiness calculation feed every Today section.
//
//   DashboardView ── getEvaluatedCandidates(full live state)
//        ├─ Primary Action        (data-testid="primary-action")
//        ├─ TodayHeroVisual       (candidates prop)
//        └─ DailyJourney          (candidates prop)
//
//   skillsEngine ── calculateTopicReadiness → calculateDomainReadinessList
//        ├─ DailySignalGraph      (today)
//        ├─ SkillsView            (skills page)
//        └─ analyticsEngine       (analytics page)
//
// Pass D style expectations are NOT asserted here — every expectation below
// is read back from the real rendered DOM or from the real engines.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup, screen } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DailySignalGraph } from '../components/dashboard/DailySignalGraph';
import { getEvaluatedCandidates, type CandidateTask } from '../engine/adaptiveEngine';
import {
  calculateDomainReadinessList,
  calculateTopicReadiness,
  type DomainReadiness,
} from '../engine/skillsEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { CompanyOverlay, DSAAttempt, DSAProgress, PlacementMode } from '../types';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ─── jsdom lacks these browser APIs ─────────────────────────────────── */
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

type Ctx = ReturnType<typeof usePlacement>;
let mountedCtx: Ctx | null = null;

/**
 * Source of every Today component, inlined at transform time. `import.meta.url`
 * is not a `file:` URL under the jsdom environment, so Vite's `?raw` glob is
 * used instead of reading from disk.
 */
const DASHBOARD_SOURCES = import.meta.glob('../components/dashboard/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const dashboardSrc = (fileName: string): string => {
  const src = DASHBOARD_SOURCES[`../components/dashboard/${fileName}`];
  if (typeof src !== 'string') throw new Error(`missing inlined source: ${fileName}`);
  return src;
};

const Probe = () => {
  const current = usePlacement();
  // Published from an effect (not during render) so the probe stays pure.
  useEffect(() => {
    mountedCtx = current;
  });
  return null;
};

const getCtx = (): Ctx => {
  if (!mountedCtx) throw new Error('PlacementProvider is not mounted');
  return mountedCtx;
};

const seed = (overrides: Partial<AppExtendedStorageState> = {}) => {
  localStorage.clear();
  StorageAdapter.saveState({
    ...(getDefaultStorageState() as AppExtendedStorageState),
    ...overrides,
  });
};

const renderToday = () =>
  render(
    <PlacementProvider>
      <Probe />
      <DashboardView />
    </PlacementProvider>
  );

const renderSignals = () =>
  render(
    <PlacementProvider>
      <Probe />
      <DailySignalGraph />
    </PlacementProvider>
  );

/* ─── candidate identity helpers ────────────────────────────────────── */
interface Cand {
  id: string;
  title: string;
  score: string;
  reason: string;
}

const toCand = (c?: CandidateTask): Cand => ({
  id: c?.task.id ?? '',
  title: c?.task.title ?? '',
  score: c?.breakdown ? String(c.breakdown.finalScore) : '',
  reason: c?.breakdown?.explanation ?? '',
});

const readCand = (el: Element | null): Cand => {
  if (!el) throw new Error('candidate element not rendered');
  return {
    id: el.getAttribute('data-candidate-task-id') ?? '',
    title: el.getAttribute('data-candidate-task-title') ?? '',
    score: el.getAttribute('data-candidate-score') ?? '',
    reason: el.getAttribute('data-candidate-reason') ?? '',
  };
};

const primary = () => readCand(screen.getByTestId('primary-action'));
const journey = () => readCand(screen.getByTestId('daily-journey'));

/** Canonical evaluation from the live context state (the invariant source). */
const canonicalList = (mode?: PlacementMode): CandidateTask[] => {
  const c = getCtx();
  return getEvaluatedCandidates(
    c.taskDefinitions,
    c.taskProgress,
    c.dsaProblems,
    c.dsaProgress,
    c.skillStates,
    c.companyOverlays,
    mode ?? c.currentMode,
    c.todayDate
  );
};

const canonicalTop = (mode?: PlacementMode) => toCand(canonicalList(mode)[0]);

/**
 * What DailyJourney used to compute in isolation: empty dsaProblems /
 * dsaProgress / skillStates and a hardcoded 'normal' mode. Any assertion that
 * this differs from `canonicalList()` proves the scenario actually exercises
 * the C6-01 defect rather than passing vacuously.
 */
const legacyShadowList = (): CandidateTask[] => {
  const c = getCtx();
  return getEvaluatedCandidates(
    c.taskDefinitions,
    c.taskProgress,
    [],
    {},
    {},
    c.companyOverlays,
    'normal',
    c.todayDate
  );
};

const candidateIds = (list: CandidateTask[]) => list.map((x) => x.task.id).join('|');

/* ─── fixtures ──────────────────────────────────────────────────────── */
const OVERLAY: CompanyOverlay = {
  id: 'comp-c6',
  companyName: 'C6 Corp',
  targetRole: 'SDE Intern',
  applicationStatus: 'target',
  eventDate: '2026-11-01',
  requiredDomains: ['dsa'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['cpp'],
};

const dsaAttempt = (todayISO: string): DSAAttempt => ({
  id: 'att-c6-1',
  // dsa-014 (Majority Element) is the FIRST topic-dsa-arrays problem in
  // DSA_PROBLEMS (Two Sum moved to topic-dsa-hashtable in the D1 retag) —
  // getEvaluatedCandidates links a task to its topic's first problem, so this
  // is the attempt that feeds task-101's spaced-repetition breakdown.
  problemId: 'dsa-014',
  date: todayISO,
  result: 'pass',
  assistanceLevel: 'none',
  timeTakenMinutes: 30,
  createdAt: new Date().toISOString(),
});

const dsaProgress = (todayISO: string): DSAProgress => ({
  problemId: 'dsa-014',
  currentBox: 2,
  nextReviewAt: todayISO,
  attemptCount: 1,
  passedIndependently: true,
  lastAttemptAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/* ─── canonical readiness helpers ───────────────────────────────────── */
const canonicalDomains = (): DomainReadiness[] => {
  const c = getCtx();
  const topicList = c.topics.map((top) =>
    calculateTopicReadiness(
      top,
      c.domains.find((d) => d.id === top.domainId),
      c.taskDefinitions,
      c.taskProgress,
      c.dsaProblems,
      c.dsaProgress,
      c.dsaAttempts,
      c.evidenceLogs,
      c.skillStates,
      c.companyOverlays,
      c.todayDate
    )
  );
  return calculateDomainReadinessList(c.domains, c.topics, topicList);
};

interface RenderedDomain {
  id: string;
  label: string;
  status: string;
  readiness: number;
}

const renderedDomains = (): RenderedDomain[] =>
  Array.from(document.querySelectorAll('[data-testid="signal-domain"]')).map((el) => ({
    id: el.getAttribute('data-domain-id') ?? '',
    label: el.getAttribute('data-domain-label') ?? '',
    status: el.getAttribute('data-domain-status') ?? '',
    readiness: Number(el.getAttribute('data-domain-readiness')),
  }));

beforeEach(() => {
  seed();
});

afterEach(() => {
  cleanup();
  mountedCtx = null;
  localStorage.clear();
});

/* ═══ A. DAILYJOURNEY ═══════════════════════════════════════════════ */
describe('C6 A — DailyJourney uses the canonical Today candidate', () => {
  it('A1. fresh clean baseline — journey agrees with the canonical top candidate', () => {
    renderToday();

    const expected = canonicalTop();
    expect(expected.id).not.toBe('');

    const shown = journey();
    expect(shown.id).toBe(expected.id);
    expect(shown.title).toBe(expected.title);
    expect(shown.score).toBe(expected.score);
    expect(shown.reason).toBe(expected.reason);
  });

  it('A2. after task completion — journey follows the recomputed top candidate', () => {
    renderToday();

    const before = canonicalTop();
    act(() => {
      getCtx().updateTaskState(before.id, 'completed');
    });

    const after = canonicalTop();
    expect(after.id).not.toBe(before.id);
    expect(journey()).toEqual(after);
    expect(primary()).toEqual(after);
  });

  it('A3. DSA progress — journey reflects the DSA-aware canonical evaluation', () => {
    renderToday();

    const todayISO = getCtx().todayDate;
    act(() => {
      getCtx().logDSAAttempt(dsaAttempt(todayISO), dsaProgress(todayISO), 95);
    });

    const expected = canonicalTop();
    expect(journey()).toEqual(expected);

    // The legacy isolated call could not see this DSA progress — prove the
    // scenario really does distinguish the two computations.
    expect(candidateIds(canonicalList())).not.toBe(candidateIds(legacyShadowList()));
    expect(journey().id + '|' + journey().score).not.toBe(
      (legacyShadowList()[0]?.task.id ?? '') + '|' + (legacyShadowList()[0]?.breakdown?.finalScore ?? '')
    );
  });

  it('A4. company overlay — journey agrees with the overlay-aware canonical evaluation', () => {
    renderToday();

    act(() => {
      getCtx().saveCompanyOverlay(OVERLAY);
    });
    expect(getCtx().companyOverlays).toHaveLength(1);

    const expected = canonicalTop();
    expect(expected.id).not.toBe('');
    expect(journey()).toEqual(expected);
    expect(primary()).toEqual(expected);
  });

  it('A5. every placement mode — journey receives the authoritative current mode', () => {
    renderToday();

    const modes: PlacementMode[] = ['normal', 'reduced', 'exam', 'placement_sprint'];
    for (const mode of modes) {
      act(() => {
        getCtx().setPlacementMode(mode);
      });
      expect(getCtx().currentMode).toBe(mode);
      expect(journey()).toEqual(canonicalTop(mode));
      expect(primary()).toEqual(canonicalTop(mode));
    }
  });

  it('A6. C6-01 regression guard — DailyJourney contains no engine call and no hardcoded mode', () => {
    const src = dashboardSrc('DailyJourney.tsx');
    expect(src).not.toContain('getEvaluatedCandidates(');
    expect(src).not.toMatch(/'normal'/);
    expect(src).not.toMatch(/'reduced'/);
    expect(src).not.toMatch(/'exam'/);
    expect(src).not.toMatch(/\[\s*\]\s*,\s*\{\s*\}\s*,\s*\{\s*\}/);
  });
});

/* ═══ B. DAILY SIGNAL GRAPH ═════════════════════════════════════════ */
describe('C6 B — DailySignalGraph uses canonical readiness', () => {
  it('B1. renders every domain the canonical engine returns (no eight-domain cap)', () => {
    renderSignals();

    const canonical = canonicalDomains();
    expect(getCtx().domains.length).toBeGreaterThan(8); // seed really has 11

    const shown = renderedDomains();
    expect(shown).toHaveLength(canonical.length);
    expect(shown.map((d) => d.id)).toEqual(canonical.map((d) => d.domainId));
  });

  it('B2. labels, statuses and percentages match the canonical engine exactly', () => {
    renderSignals();

    const canonical = canonicalDomains();
    const shown = renderedDomains();

    expect(shown.map((d) => d.label)).toEqual(canonical.map((d) => d.shortName));
    expect(shown.map((d) => d.status)).toEqual(canonical.map((d) => d.status));
    expect(shown.map((d) => d.readiness)).toEqual(canonical.map((d) => d.overallReadiness));
  });

  it('B3. with real evidence the graph still mirrors the canonical numbers (not a local average)', () => {
    renderSignals();

    const todayISO = getCtx().todayDate;
    act(() => {
      getCtx().updateTaskState('task-101', 'completed');
      getCtx().logDSAAttempt(dsaAttempt(todayISO), dsaProgress(todayISO), 95);
    });

    const canonical = canonicalDomains();
    const shown = renderedDomains();
    expect(shown.map((d) => d.readiness)).toEqual(canonical.map((d) => d.overallReadiness));
    expect(shown.map((d) => d.status)).toEqual(canonical.map((d) => d.status));
    // at least one domain has actually moved off zero
    expect(shown.some((d) => d.readiness > 0)).toBe(true);
  });

  it('B4. fresh baseline does not fabricate readiness', () => {
    renderSignals();

    const shown = renderedDomains();
    expect(shown.length).toBeGreaterThan(0);
    for (const d of shown) expect(d.readiness).toBe(0);
    expect(shown.map((d) => d.status)).toEqual(canonicalDomains().map((d) => d.status));
  });

  it('B5. no local 40/65 thresholds, no slice(0, 8), no shadow engine call remain', () => {
    // the eight-domain truncation must be gone from the whole Today surface
    for (const [path, src] of Object.entries(DASHBOARD_SOURCES)) {
      expect(src, `${path} must not truncate the domain list`).not.toMatch(
        /slice\(\s*0\s*,\s*8\s*\)/
      );
    }

    const graph = dashboardSrc('DailySignalGraph.tsx');
    expect(graph).not.toMatch(/>=\s*65/);
    expect(graph).not.toMatch(/>=\s*40/);
    expect(graph).toContain('calculateTopicReadiness(');
    expect(graph).toContain('calculateDomainReadinessList(');
    expect(graph).not.toContain('getEvaluatedCandidates(');

    // Today's readiness section must never re-run candidate selection itself
    for (const f of ['DailyJourney.tsx', 'DailySignalGraph.tsx', 'TodayHeroVisual.tsx']) {
      expect(dashboardSrc(f), `${f} must consume the parent's canonical result`).not.toContain(
        'getEvaluatedCandidates('
      );
    }

    // DashboardView keeps exactly ONE call: the canonical Today evaluation.
    expect(dashboardSrc('DashboardView.tsx').match(/getEvaluatedCandidates\(/g)).toHaveLength(1);
  });
});

/* ═══ C. CROSS-TODAY CONSISTENCY ════════════════════════════════════ */
describe('C6 C — primary action and DailyJourney identify the same candidate', () => {
  const expectAllTodaySectionsAgree = () => {
    const expected = canonicalTop();
    expect(expected.id).not.toBe('');
    expect(primary()).toEqual(expected);   // DashboardView primary
    expect(journey()).toEqual(expected);    // DailyJourney
  };

  it('C1. fresh baseline', () => {
    renderToday();
    expectAllTodaySectionsAgree();
  });

  it('C2. user with completed tasks and recorded evidence', () => {
    renderToday();
    act(() => {
      getCtx().updateTaskState('task-101', 'completed');
    });
    expectAllTodaySectionsAgree();
  });

  it('C3. user with DSA progress plus a company overlay', () => {
    renderToday();
    const todayISO = getCtx().todayDate;
    act(() => {
      getCtx().logDSAAttempt(dsaAttempt(todayISO), dsaProgress(todayISO), 95);
      getCtx().saveCompanyOverlay(OVERLAY);
    });
    expectAllTodaySectionsAgree();
  });

  it('C4. reduced and exam modes', () => {
    renderToday();
    for (const mode of ['reduced', 'exam'] as PlacementMode[]) {
      act(() => {
        getCtx().setPlacementMode(mode);
      });
      expectAllTodaySectionsAgree();
    }
  });

  it('C5. the meaningful identity, not just the task id, is shared', () => {
    renderToday();
    const expected = canonicalTop();
    expect(journey().reason).toBe(expected.reason);
    expect(journey().score).toBe(expected.score);
    expect(primary().reason).toBe(expected.reason);
    expect(primary().score).toBe(expected.score);
  });
});

/* ═══ D. CROSS-PAGE READINESS ═══════════════════════════════════════ */
describe('C6 D — Today consumes the same readiness result as Skills/Analytics', () => {
  it('D1. Today signal graph === skillsEngine.calculateDomainReadinessList', () => {
    renderSignals();

    const todayISO = getCtx().todayDate;
    act(() => {
      getCtx().updateTaskState('task-101', 'completed');
      getCtx().logDSAAttempt(dsaAttempt(todayISO), dsaProgress(todayISO), 95);
      getCtx().saveCompanyOverlay(OVERLAY);
    });

    const shown = renderedDomains();
    const canonical = canonicalDomains();
    expect(shown.map((d) => d.id)).toEqual(canonical.map((d) => d.domainId));
    expect(shown.map((d) => d.status)).toEqual(canonical.map((d) => d.status));
    expect(shown.map((d) => d.readiness)).toEqual(canonical.map((d) => d.overallReadiness));
  });
});

/* ═══ E. SOURCE-LEVEL GUARD ═════════════════════════════════════════ */
describe('C6 E — canonical wiring stays in place', () => {
  it('E1. TodayHeroVisual consumes the parent-supplied candidates', () => {
    const src = dashboardSrc('TodayHeroVisual.tsx');
    expect(src).not.toContain('getEvaluatedCandidates(');
    expect(src).toContain('candidates: CandidateTask[]');
  });

  it('E2. DashboardView passes one evaluation to both Today sections', () => {
    const src = dashboardSrc('DashboardView.tsx');
    expect(src).toContain('<DailyJourney candidates={evaluatedCandidates} />');
    expect(src).toContain('<TodayHeroVisual candidates={evaluatedCandidates} />');
  });
});
