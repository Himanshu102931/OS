// @vitest-environment jsdom
//
// C7 — Today visual layer: hero routing / keyboard / responsive SVG /
// reduced motion, the Today Guide, the completion animation, signal-graph
// connector geometry and scroll-reveal safety.
//
// Everything below is read back from the real rendered DOM, from the real
// context, or from a pure function under test. Pass D style expectations are
// NOT asserted here.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DailySignalGraph, buildSignalConnectors } from '../components/dashboard/DailySignalGraph';
import { resolveHeroNodeDestination, DOMAIN_TO_PREP_TOPIC } from '../components/dashboard/TodayHeroVisual';
import { getEvaluatedCandidates, type CandidateTask } from '../engine/adaptiveEngine';
import { getTaskLearningRoute } from '../engine/taskFlowEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { CompanyOverlay, TopicSkillState } from '../types';
import { DOMAINS, TOPICS } from '../data/seedData';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ─── environment controls ──────────────────────────────────────────── */

let reducedMotion = false;

type IOMode = 'record' | 'unavailable' | 'throwing';
let ioMode: IOMode = 'record';

/** IntersectionObserver that records what it observes so tests can fire it. */
class RecordingIntersectionObserver {
  static last: RecordingIntersectionObserver | null = null;
  observed: Element[] = [];
  callback: (entries: { target: Element; isIntersecting: boolean }[]) => void;
  constructor(callback: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    this.callback = callback;
    RecordingIntersectionObserver.last = this;
  }
  observe(el: Element) { this.observed.push(el); }
  unobserve() { /* not needed */ }
  disconnect() { this.observed = []; }
  takeRecords() { return []; }
}

class ThrowingIntersectionObserver {
  constructor() { throw new Error('IntersectionObserver setup failed'); }
}

/** ResizeObserver tests drive by hand — jsdom has no layout to observe. */
class ScriptedResizeObserver {
  static last: ScriptedResizeObserver | null = null;
  target: Element | null = null;
  callback: (entries: { target: Element; contentRect: { width: number } }[]) => void;
  constructor(callback: (entries: { target: Element; contentRect: { width: number } }[]) => void) {
    this.callback = callback;
    ScriptedResizeObserver.last = this;
  }
  observe(el: Element) { this.target = el; }
  unobserve() { /* not needed */ }
  disconnect() { ScriptedResizeObserver.last = null; }
  takeRecords() { return []; }
  emit(width: number) {
    if (!this.target) throw new Error('nothing is being observed');
    this.callback([{ target: this.target, contentRect: { width } }]);
  }
}

const applyEnvironment = () => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value:
      ioMode === 'unavailable'
        ? undefined
        : ioMode === 'throwing'
          ? ThrowingIntersectionObserver
          : RecordingIntersectionObserver,
  });
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true, configurable: true, value: ScriptedResizeObserver,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
};

/** Scroll targets recorded instead of jsdom's unimplemented scrollIntoView. */
const scrollTargets: string[] = [];
const installScrollStub = () => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    configurable: true,
    value: function (this: HTMLElement) {
      scrollTargets.push(this.getAttribute('data-reveal') ?? '');
    },
  });
};

/**
 * Every component source, inlined at transform time — used to prove the
 * legacy `TodayGuide` is no longer imported or rendered by ANY component.
 */
const COMPONENT_SOURCES = import.meta.glob('../components/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/* ─── source of every Today component, inlined at transform time ───── */
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

/* ─── render harness ───────────────────────────────────────────────── */
type Ctx = ReturnType<typeof usePlacement>;
let mountedCtx: Ctx | null = null;

const Probe = () => {
  const current = usePlacement();
  useEffect(() => { mountedCtx = current; });
  return null;
};

const getCtx = (): Ctx => {
  if (!mountedCtx) throw new Error('PlacementProvider is not mounted');
  return mountedCtx;
};

const seed = (overrides: Partial<AppExtendedStorageState> = {}) => {
  localStorage.clear();
  window.location.hash = '';
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

const routeState = () => getCtx().routeState;

const canonicalList = (): CandidateTask[] => {
  const c = getCtx();
  return getEvaluatedCandidates(
    c.taskDefinitions, c.taskProgress, c.dsaProblems, c.dsaProgress,
    c.skillStates, c.companyOverlays, c.currentMode, c.todayDate
  );
};

/* ─── hero node helpers ────────────────────────────────────────────── */
const heroNodes = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-node-id]')) as HTMLElement[];

const node = (id: string): HTMLElement => {
  const el = heroNodes().find((n) => n.getAttribute('data-node-id') === id);
  if (!el) throw new Error(`hero node not rendered: ${id}`);
  return el;
};

/**
 * C7-01 — expected destination for every domain node, declared INDEPENDENTLY
 * of the component's own table so a wrong entry in `DOMAIN_TO_PREP_TOPIC`
 * cannot make these assertions agree with themselves.
 */
const EXPECTED_DOMAIN_PREP_TOPIC: Record<string, string> = {
  'domain-dsa': 'dsa',
  'domain-python': 'prep-lang',
  'domain-sql': 'prep-sql',
  'domain-oop': 'prep-oop',
  'domain-dbms': 'prep-dbms',
  'domain-os': 'prep-os',
  'domain-cn': 'prep-cn',
  'domain-aptitude': 'prep-apt-quant',
  'domain-communication': 'prep-comm',
  'domain-interviews': 'prep-interview-tech',
  'domain-projects': 'prep-coding-ds',
};

/**
 * Give every domain a real, non-zero skill rating. Readiness rolls up
 * `skillStates`, so this makes all 11 domains drawable — the state the graph
 * needs before it can have anything to connect. Read-only test setup: the
 * component under test receives it through the normal storage seed.
 */
const skillStatesForEveryDomain = (): Record<string, TopicSkillState> => {
  const states: Record<string, TopicSkillState> = {};
  for (const domain of DOMAINS) {
    const topic = TOPICS.find((t) => t.domainId === domain.id);
    if (!topic) continue;
    states[topic.id] = {
      topicId: topic.id,
      domainId: domain.id,
      lastPracticedAt: '2026-09-28T07:30:00Z',
      freshness: 'fresh',
      evidenceStrength: 90,
    };
  }
  return states;
};

const URGENT_OVERLAY: CompanyOverlay = {
  id: 'comp-c7',
  companyName: 'C7 Urgent',
  targetRole: 'SDE Intern',
  applicationStatus: 'interview_scheduled',
  eventDate: '2026-11-01',
  requiredDomains: ['dsa'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['cpp'],
};

beforeEach(() => {
  ioMode = 'record';
  reducedMotion = false;
  RecordingIntersectionObserver.last = null;
  ScriptedResizeObserver.last = null;
  scrollTargets.length = 0;
  applyEnvironment();
  installScrollStub();
  seed();
});

afterEach(() => {
  cleanup();
  mountedCtx = null;
  localStorage.clear();
  vi.restoreAllMocks();
});

/* ═══ A. HERO ROUTING ═══════════════════════════════════════════════ */
describe('C7-01 — hero node routing', () => {
  it('A1. renders the primary node and all 11 domain nodes, every one actionable', () => {
    renderToday();

    const ids = heroNodes().map((n) => n.getAttribute('data-node-id'));
    expect(ids).toContain('primary');
    for (const id of Object.keys(EXPECTED_DOMAIN_PREP_TOPIC)) expect(ids).toContain(id);
    // primary + 11 domains, no company node without an urgent overlay
    expect(ids).toHaveLength(12);

    for (const el of heroNodes()) {
      expect(el.getAttribute('data-actionable'), el.getAttribute('data-node-id') ?? undefined).toBe('true');
      expect(el.getAttribute('data-destination-route')).not.toBe('');
    }
  });

  it('A2. primary routes to the canonical top candidate learning route', () => {
    renderToday();

    const expected = getTaskLearningRoute(canonicalList()[0].task);
    const primary = node('primary');
    expect(primary.getAttribute('data-destination-route')).toBe(expected.route);
    expect(primary.getAttribute('data-destination-topic')).toBe(expected.linkedTopicId ?? '');

    fireEvent.click(primary);
    expect(routeState().route).toBe(expected.route);
    expect(routeState().targetId).toBe(expected.linkedTopicId);
  });

  it('A3. DSA routes to DSA and every other domain node routes to its Preparation topic', () => {
    renderToday();

    // Non-vacuity: the node id carries a prefix the table does NOT use, which
    // is exactly why the pre-C7 lookup (`DOMAIN_TO_PREP_TOPIC[nodeId]`) found
    // nothing and every domain node was a dead click.
    expect(DOMAIN_TO_PREP_TOPIC['domain-python']).toBeUndefined();

    for (const [nodeId, prepTopicId] of Object.entries(EXPECTED_DOMAIN_PREP_TOPIC)) {
      const el = node(nodeId);
      const isDsa = nodeId === 'domain-dsa';

      expect(el.getAttribute('data-destination-route'), nodeId).toBe(isDsa ? 'dsa' : 'preparation');
      expect(el.getAttribute('data-destination-topic'), nodeId).toBe(isDsa ? '' : prepTopicId);

      fireEvent.click(el);
      expect(routeState().route, nodeId).toBe(isDsa ? 'dsa' : 'preparation');
      if (!isDsa) expect(routeState().targetId, nodeId).toBe(prepTopicId);
    }
  });

  it('A4. the company node appears with an urgent overlay and routes to companies', () => {
    seed({ companyOverlays: [URGENT_OVERLAY] });
    renderToday();

    const company = node('company');
    expect(company.getAttribute('data-destination-route')).toBe('companies');

    fireEvent.click(company);
    expect(routeState().route).toBe('companies');
  });

  it('A5. an unknown node id and a missing candidate resolve to no destination', () => {
    renderToday();

    expect(resolveHeroNodeDestination('domain-unknown', canonicalList())).toBeNull();
    expect(resolveHeroNodeDestination('primary', [])).toBeNull();
    expect(resolveHeroNodeDestination('company', [])).toEqual({ route: 'companies' });
  });
});

/* ═══ B. KEYBOARD + FOCUS ═══════════════════════════════════════════ */
describe('C7-02 — hero keyboard + focus', () => {
  it('B1. actionable nodes are real buttons with an accessible name and focus styling', () => {
    renderToday();

    for (const el of heroNodes()) {
      const id = el.getAttribute('data-node-id')!;
      expect(el.tagName, id).toBe('BUTTON');
      expect(el.getAttribute('type'), id).toBe('button');
      expect(el.getAttribute('aria-label'), id).toBeTruthy();
      expect(el.getAttribute('tabindex'), id).toBe('0');
      expect(el.classList.contains('today-hero-node'), id).toBe(true);
    }

    // No clickable <div>/<g> with only an onClick remains in the hero.
    expect(document.querySelectorAll('[data-node-id][role="button"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-node-id]:not(button)')).toHaveLength(0);
  });

  it('B2. a node is focusable and Enter activates it', () => {
    renderToday();

    const primary = node('primary');
    const expected = getTaskLearningRoute(canonicalList()[0].task);

    act(() => primary.focus());
    expect(document.activeElement).toBe(primary);

    expect(routeState().route).toBe('dashboard');
    fireEvent.keyDown(primary, { key: 'Enter' });
    expect(routeState().route).toBe(expected.route);
  });

  it('B3. Space activates a domain node', () => {
    renderToday();

    const dsa = node('domain-dsa');
    act(() => dsa.focus());
    expect(document.activeElement).toBe(dsa);

    expect(routeState().route).toBe('dashboard');
    fireEvent.keyDown(dsa, { key: ' ' });
    expect(routeState().route).toBe('dsa');
  });
});

/* ═══ C. RESPONSIVE SVG ═════════════════════════════════════════════ */
describe('C7-03 — responsive hero stage', () => {
  it('C1. the stage is width-driven, not pinned to a fixed 480px', () => {
    renderToday();

    const hero = screen.getByTestId('today-hero');
    const svg = hero.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('100%');
    expect(svg!.getAttribute('height')).toBe('100%');

    // No inline px width and no minimum width → nothing can push the layout
    // past a 375px viewport; `w-full` + a constant cap does the sizing.
    expect(hero.style.width).toBe('');
    expect(hero.style.minWidth).toBe('');
    expect(hero.style.maxWidth).toBe('520px');
    expect(hero.style.aspectRatio).toMatch(/1\s*\/\s*1/);

    const src = dashboardSrc('TodayHeroVisual.tsx');
    expect(src).not.toContain('maxWidth: size');
    expect(src).not.toMatch(/width=\{size\}/);
  });

  it('C2. the measured size tracks the container in both directions and never feeds back into layout', () => {
    renderToday();
    const obs = ScriptedResizeObserver.last;
    expect(obs).not.toBeNull();

    const hero = screen.getByTestId('today-hero');
    const viewBox = () => hero.querySelector('svg')!.getAttribute('viewBox');

    act(() => obs!.emit(520));
    expect(viewBox()).toBe('0 0 520 520');

    // Shrink — recoverable, not locked at the previous maximum …
    act(() => obs!.emit(300));
    expect(viewBox()).toBe('0 0 300 300');
    // … and the container width is NOT derived from the measurement, which is
    // the feedback loop that used to ratchet the stage down permanently.
    expect(hero.style.maxWidth).toBe('520px');

    // Grow back — no ratchet in either direction.
    act(() => obs!.emit(520));
    expect(viewBox()).toBe('0 0 520 520');
    expect(hero.style.maxWidth).toBe('520px');
  });
});

/* ═══ D. REDUCED MOTION ═════════════════════════════════════════════ */
describe('C7-03 — reduced motion', () => {
  it('D1. every ambient/entrance SVG animation path is off under reduced motion', () => {
    reducedMotion = false;
    renderToday();
    const animating = screen.getByTestId('today-hero');
    // Non-vacuity: the animated path really is in play when motion is allowed.
    expect(animating.querySelectorAll('animate').length).toBeGreaterThan(0);
    expect(animating.querySelectorAll('[style*="pulse-ring"]').length).toBeGreaterThan(0);
    cleanup();

    reducedMotion = true;
    renderToday();
    const still = screen.getByTestId('today-hero');
    expect(still.querySelectorAll('animate')).toHaveLength(0);
    expect(still.querySelectorAll('[style*="pulse-ring"]')).toHaveLength(0);
  });

  it('D2. no unguarded <animate> element remains in the hero source', () => {
    // Every animation in the hero is inside a `!reducedMotion` render guard or
    // the parent signal block itself is gated.
    const src = dashboardSrc('TodayHeroVisual.tsx');
    expect(src).toContain('{!reducedMotion && signals.map(');
    expect(src).not.toMatch(/\{signals\.map\(/);
  });
});

/* ═══ E. TODAY GUIDE — universal Guide integration ═══════════════════ */
describe('C7-06 — Today Guide (universal system, legacy panel removed)', () => {
  it('E1. Today does not mount the legacy TodayGuide panel', () => {
    renderToday();

    // No legacy dialog, no legacy drawer, no legacy section-list anchors.
    expect(screen.queryByTestId('today-guide-dialog')).toBeNull();
    expect(document.querySelector('.today-guide-panel')).toBeNull();
    expect(screen.queryAllByTestId('guide-anchor')).toHaveLength(0);
    expect(screen.queryByTestId('guide-start')).toBeNull();

    // The legacy presentation copy must not be on the page.
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/What Today Does/i);
    expect(text).not.toMatch(/Using Today/i);
    expect(text).not.toMatch(/The Visual Scene/i);
    expect(text).not.toMatch(/Today Guide/i);
  });

  it('E2. Today exposes the shared universal GuideTrigger instead', () => {
    renderToday();

    const trigger = screen.getByTestId('today-guide-trigger');
    // Universal system: one controller, one dialog id, one state machine.
    expect(trigger.getAttribute('aria-controls')).toBe('placementos-guide-dialog');
    expect(trigger).toHaveAttribute('data-guide-target', 'today-guide-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('guide-dialog')).toBeNull();
  });

  it('E3. no component under src/components imports or renders the legacy TodayGuide', () => {
    const importers = Object.entries(COMPONENT_SOURCES)
      .filter(([file, src]) => !file.endsWith('/TodayGuide.tsx') && /TodayGuide|today-guide-panel|today-guide-dialog/.test(src))
      .map(([file]) => file);

    expect(importers).toEqual([]);
  });
});

/* ═══ F. COMPLETION ANIMATION ═══════════════════════════════════════ */
describe('C7-07 — completion animation', () => {
  it('F1. a real completion opens the animation, shows readable names and writes exactly one evidence event', () => {
    renderToday();

    const task = canonicalList()[0].task;
    const evidenceBefore = getCtx().evidenceLogs.length;

    fireEvent.click(screen.getByTestId('complete-primary'));

    const anim = screen.getByTestId('completion-animation');
    expect(anim.getAttribute('role')).toBe('status');
    expect(anim.textContent).toContain(task.title);

    // ONE evidence event for this completion — the animation itself writes nothing
    const logs = getCtx().evidenceLogs.filter(
      (l) => l.sourceType === 'daily_assignment' && l.sourceId === task.id
    );
    expect(logs).toHaveLength(1);
    expect(getCtx().evidenceLogs.length).toBe(evidenceBefore + 1);

    // human-readable topic name, never the raw internal id
    const topicName = getCtx().topics.find((t) => t.id === logs[0].topicId)?.name;
    expect(topicName).toBeTruthy();
    expect(anim.textContent).toContain(topicName!);
    expect(anim.textContent).not.toContain(logs[0].topicId);

    // dismissing creates nothing and closes the animation
    const evidenceAfterOpen = getCtx().evidenceLogs.length;
    const skillAfterOpen = { ...getCtx().skillStates };
    fireEvent.click(screen.getByTestId('completion-dismiss'));
    expect(screen.queryByTestId('completion-animation')).toBeNull();
    expect(getCtx().evidenceLogs.length).toBe(evidenceAfterOpen);
    expect(getCtx().skillStates).toEqual(skillAfterOpen);
  });

  it('F2. Undo reverses the completion through the C2 transaction restore', () => {
    renderToday();

    const task = canonicalList()[0].task;
    expect(getCtx().taskProgress[task.id]?.state).toBe('not_started');

    fireEvent.click(screen.getByTestId('complete-primary'));
    expect(getCtx().taskProgress[task.id]?.state).toBe('completed');

    fireEvent.click(screen.getByTestId('completion-undo'));
    expect(screen.queryByTestId('completion-animation')).toBeNull();
    expect(getCtx().taskProgress[task.id]?.state).toBe('not_started');
  });

  it('F3. "Open Next Step" really navigates — it is never a silent no-op', async () => {
    renderToday();

    const task = canonicalList()[0].task;
    fireEvent.click(screen.getByTestId('complete-primary'));
    // not offered before the step it announces exists
    expect(screen.queryByTestId('completion-open-next')).toBeNull();

    await act(async () => { await new Promise((r) => setTimeout(r, 2300)); });

    const nextTask = canonicalList()[0];
    expect(nextTask.task.id).not.toBe(task.id); // completed task really left the list

    const expected = getTaskLearningRoute(nextTask.task);
    const button = screen.getByTestId('completion-open-next');
    expect(button.textContent).toContain('Open Next Step');

    fireEvent.click(button);
    expect(routeState().route).toBe(expected.route);
    expect(routeState().targetId).toBe(expected.linkedTopicId);
    expect(screen.queryByTestId('completion-animation')).toBeNull();
  });
});

/* ═══ G. SIGNAL CONNECTORS ══════════════════════════════════════════ */
describe('C7-05 — signal graph connectors', () => {
  const readiness = (domainId: string, overallReadiness: number) => ({ domainId, overallReadiness });

  it('G1. joins adjacent domains of the DISPLAYED sequence', () => {
    const domains = [
      readiness('dsa', 40), readiness('python', 55), readiness('sql', 70), readiness('os', 10),
    ];
    const connectors = buildSignalConnectors(domains);

    expect(connectors).toHaveLength(3);
    expect(connectors.map((c) => `${c.from}>${c.to}`)).toEqual([
      'dsa>python', 'python>sql', 'sql>os',
    ]);
    for (const c of connectors) expect(c.x1).toBeLessThan(c.x2);
  });

  it('G2. never exceeds the drawable area, even with all 11 domains', () => {
    const ids = [
      'dsa', 'python', 'sql', 'oop', 'dbms', 'os', 'cn',
      'aptitude', 'communication', 'interviews', 'projects',
    ];
    const connectors = buildSignalConnectors(ids.map((id, i) => readiness(id, 10 + i)));

    expect(connectors).toHaveLength(10); // 11 columns → 10 adjacent joins
    for (const c of connectors) {
      expect(c.x1).toBeGreaterThan(0);
      expect(c.x2).toBeLessThan(800);
    }
    // the old fixed-step formula ran to 870 in an 800-wide viewBox
    expect(Math.max(...connectors.map((c) => c.x2))).toBeLessThan(800);
  });

  it('G3. zero-readiness domains are skipped without shifting the neighbour index', () => {
    const connectors = buildSignalConnectors([
      readiness('dsa', 0), readiness('python', 50), readiness('sql', 60), readiness('os', 0),
    ]);

    // Only python → sql has both endpoints drawable …
    expect(connectors).toHaveLength(1);
    // … and it still points at the ADJACENT displayed pair, not at whatever
    // the filtered index landed on.
    expect(connectors[0]).toMatchObject({ from: 'python', to: 'sql' });
    // centred on slots 1 and 2 of 4
    expect(connectors[0].x1).toBeCloseTo((1.5 * 800) / 4, 5);
    expect(connectors[0].x2).toBeCloseTo((2.5 * 800) / 4, 5);
  });

  it('G4. degenerate inputs produce no connectors at all', () => {
    expect(buildSignalConnectors([])).toEqual([]);
    expect(buildSignalConnectors([readiness('dsa', 50)])).toEqual([]);
    expect(buildSignalConnectors([readiness('dsa', 0), readiness('os', 0)])).toEqual([]);
  });

  it('G5. renders all 11 domains and one connector per drawable adjacent pair', () => {
    seed({ skillStates: skillStatesForEveryDomain() });
    renderSignals();

    const domains = Array.from(document.querySelectorAll('[data-testid="signal-domain"]')).map((el) => ({
      domainId: el.getAttribute('data-domain-id') ?? '',
      overallReadiness: Number(el.getAttribute('data-domain-readiness')),
    }));
    expect(domains).toHaveLength(11);
    expect(domains.every((d) => d.overallReadiness > 0)).toBe(true);

    const expectedCount = domains.reduce((n, d, i) => {
      const next = domains[i + 1];
      if (!next) return n;
      return n + (d.overallReadiness > 0 && next.overallReadiness > 0 ? 1 : 0);
    }, 0);
    expect(expectedCount).toBeGreaterThan(0);

    const lines = document.querySelectorAll('[data-testid="signal-connectors"] line');
    expect(lines).toHaveLength(expectedCount);
    for (const line of Array.from(lines)) {
      const x1 = Number(line.getAttribute('x1'));
      const x2 = Number(line.getAttribute('x2'));
      expect(x1).toBeGreaterThan(0);
      expect(x2).toBeLessThan(800);
      expect(x2).toBeGreaterThan(x1);
    }
  });
});

/* ═══ H. SCROLL REVEAL ══════════════════════════════════════════════ */
describe('C7-09 — scroll reveal safety', () => {
  it('H1. the observer path reveals a section when it intersects', () => {
    renderToday();

    const observer = RecordingIntersectionObserver.last;
    expect(observer).not.toBeNull();
    expect(observer!.observed.length).toBeGreaterThan(0);

    // The hero carries a data-reveal anchor but is deliberately always
    // visible; pick a real .scroll-reveal section (e.g. the journey).
    const target = observer!.observed.find((el) =>
      (el as HTMLElement).classList.contains('scroll-reveal')
    ) as HTMLElement | undefined;
    expect(target).toBeDefined();

    // not revealed before the intersection event arrives
    expect(target!.classList.contains('visible')).toBe(false);

    act(() => observer!.callback([{ target: target!, isIntersecting: true }]));
    expect(target!.classList.contains('visible')).toBe(true);
  });

  it('H2. without IntersectionObserver every section renders normally', () => {
    ioMode = 'unavailable';
    applyEnvironment();

    renderToday();

    const sections = Array.from(
      document.querySelectorAll('.scroll-reveal[data-reveal]')
    ) as HTMLElement[];
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.classList.contains('visible'), section.getAttribute('data-reveal') ?? undefined).toBe(true);
    }
  });

  it('H3. if observer setup fails every section still renders normally', () => {
    ioMode = 'throwing';
    applyEnvironment();

    renderToday();

    const sections = Array.from(
      document.querySelectorAll('.scroll-reveal[data-reveal]')
    ) as HTMLElement[];
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.classList.contains('visible'), section.getAttribute('data-reveal') ?? undefined).toBe(true);
    }
  });
});
