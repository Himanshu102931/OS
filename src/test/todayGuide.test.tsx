// @vitest-environment jsdom
//
// TODAY GUIDE INTEGRATION
//
// Today must render ONE guide: the universal GuideTrigger / GuideContext /
// GuideOverlay system used by every other page. The legacy Today-specific
// panel (TodayGuide.tsx — "What Today Does" / "Using Today" / "The Visual
// Scene", section anchors, scroll-into-view) must not be part of the active
// render tree.
//
// Everything below is read back from the real rendered DOM, the real guide
// controller, the real placement engine, or source files on disk. jsdom has
// no layout, so geometry is supplied through a rect registry that stands in
// for getBoundingClientRect / elementFromPoint — the guide code under test
// (GuideOverlay + guidePlacement) is the production code path, unchanged.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { GuideProvider, useGuide } from '../components/guide/GuideContext';
import { GuideOverlay } from '../components/guide/GuideOverlay';
import type { GuideController } from '../components/guide/GuideTypes';
import { DashboardView } from '../components/dashboard/DashboardView';
import { PAGE_GUIDE_DEFINITIONS } from '../components/guide/GuideDefinitions';
import { checkRectIntersection } from '../components/guide/guidePlacement';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ─── guide under test ─────────────────────────────────────────────── */

const dashboardDef = PAGE_GUIDE_DEFINITIONS.find((d) => d.route === 'dashboard')!;
const STEPS = dashboardDef.sections.flatMap((s) => s.steps);
const TOTAL = STEPS.length;

/** Popover height GuideOverlay feeds into calculatePopoverPlacement. */
const POPOVER_HEIGHT = 220;
const VIEWPORT_PADDING = 16;

/* ─── environment: observers, media, scroll ────────────────────────── */

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
}

const applyEnvironment = () => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true, configurable: true, value: RecordingIntersectionObserver,
  });
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true, configurable: true, value: ScriptedResizeObserver,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true, configurable: true,
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
};

/** Scroll calls are recorded — the guide must never move the page. */
const scrollCalls: string[] = [];
const installScrollGuards = () => {
  scrollCalls.length = 0;
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    writable: true, configurable: true,
    value: function (this: HTMLElement) { scrollCalls.push(`scrollIntoView:${this.tagName}`); },
  });
  Object.defineProperty(window, 'scrollTo', {
    writable: true, configurable: true,
    value: (...args: unknown[]) => { scrollCalls.push(`scrollTo:${JSON.stringify(args)}`); },
  });
  Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 400 });
  Object.defineProperty(window, 'pageYOffset', { writable: true, configurable: true, value: 400 });
};

/* ─── geometry: rects + frame queue (jsdom has no layout) ──────────── */

type Rect = { top: number; left: number; width: number; height: number };
const rects = new Map<Element, Rect>();
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

const containsPoint = (r: Rect, x: number, y: number) =>
  x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;

/** Deepest registered element under a point — elementFromPoint stand-in. */
const hitTest = (x: number, y: number): Element | null => {
  let best: Element | null = null;
  for (const [el, r] of rects) {
    if (!containsPoint(r, x, y)) continue;
    if (!best) { best = el; continue; }
    if (best.contains(el)) best = el;                 // deeper wins
    else if (el.contains(best)) { /* keep deeper */ }
    else if (best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = el;
  }
  return best;
};

const installGeometry = () => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true, writable: true,
    value: function (this: HTMLElement) {
      const r = rects.get(this);
      if (!r) return originalGetBoundingClientRect.call(this);
      return {
        top: r.top, left: r.left, width: r.width, height: r.height,
        right: r.left + r.width, bottom: r.top + r.height,
        x: r.left, y: r.top, toJSON: () => ({}),
      } as unknown as DOMRect;
    },
  });
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true, writable: true,
    value: (x: number, y: number) => hitTest(x, y),
  });
};

const restoreGeometry = () => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true, writable: true, value: originalGetBoundingClientRect,
  });
  delete (document as unknown as Record<string, unknown>).elementFromPoint;
};

/** Manual rAF queue — deterministic frames, never an unbounded animation loop. */
let frameQueue: { id: number; cb: FrameRequestCallback; cancelled: boolean }[] = [];
let nextFrameId = 1;
const installFrames = () => {
  frameQueue = [];
  nextFrameId = 1;
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true, writable: true,
    value: (cb: FrameRequestCallback) => {
      frameQueue.push({ id: nextFrameId, cb, cancelled: false });
      return nextFrameId++;
    },
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true, writable: true,
    value: (id: number) => {
      const frame = frameQueue.find((f) => f.id === id);
      if (frame) frame.cancelled = true;
    },
  });
};

/** Flush queued frames inside act() so target rects land in guide state. */
const settle = () =>
  act(() => {
    const pending = frameQueue;
    frameQueue = [];
    for (const frame of pending) if (!frame.cancelled) frame.cb(0);
  });

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
};

/* ─── render harness ───────────────────────────────────────────────── */

type Ctx = ReturnType<typeof usePlacement>;
let mountedCtx: Ctx | null = null;
let guideCtx: GuideController | null = null;

const Probe = () => {
  const current = usePlacement();
  useEffect(() => { mountedCtx = current; });
  return null;
};

const GuideProbe = () => {
  const controller = useGuide();
  useEffect(() => { guideCtx = controller; });
  return null;
};

const getCtx = (): Ctx => {
  if (!mountedCtx) throw new Error('PlacementProvider is not mounted');
  return mountedCtx;
};
const getGuide = (): GuideController => {
  if (!guideCtx) throw new Error('GuideProvider is not mounted');
  return guideCtx;
};

const seed = () => {
  localStorage.clear();
  window.location.hash = '';
  StorageAdapter.saveState({
    ...(getDefaultStorageState() as AppExtendedStorageState),
  });
};

const renderToday = () =>
  render(
    <PlacementProvider>
      <Probe />
      <GuideProvider>
        <GuideProbe />
        <DashboardView />
        <GuideOverlay />
      </GuideProvider>
    </PlacementProvider>
  );

/* ─── guide helpers ────────────────────────────────────────────────── */

const appState = () => localStorage.getItem('placementos_v1_state') ?? '';

const openTour = () => {
  fireEvent.click(screen.getByTestId('today-guide-trigger'));
  settle();
};

const stepCount = () => screen.getByTestId('guide-step-count').textContent ?? '';
const currentStepId = () => getGuide().currentStep?.id ?? '';

const goToStep = (index: number) => {
  let guard = 0;
  while (getGuide().stepIndex < index && guard++ < TOTAL + 2) {
    fireEvent.click(screen.getByTestId('guide-next'));
    settle();
  }
  if (getGuide().stepIndex !== index) throw new Error(`could not reach step ${index}`);
};

const popoverBox = () => {
  const el = screen.getByTestId('guide-dialog');
  const top = parseFloat(el.style.top);
  const left = parseFloat(el.style.left);
  const width = parseFloat(el.style.width);
  return { top, left, right: left + width, bottom: top + POPOVER_HEIGHT, width, height: POPOVER_HEIGHT };
};

const assertPopoverInViewport = (width: number, height: number) => {
  const box = popoverBox();
  expect(box.left).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
  expect(box.top).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
  expect(box.right).toBeLessThanOrEqual(width - VIEWPORT_PADDING);
  expect(box.bottom).toBeLessThanOrEqual(height - VIEWPORT_PADDING);
};

const byTarget = (name: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-guide-target="${name}"]`);
  if (!el) throw new Error(`no element carries data-guide-target="${name}"`);
  return el;
};

/** Rect corners — the registry stores top/left/width/height only. */
const rightOf = (r: Rect) => r.left + r.width;
const bottomOf = (r: Rect) => r.top + r.height;
/** Shape a stored Rect into the {top,left,right,bottom} box the shared checker takes. */
const boxOf = (r: Rect) => ({ top: r.top, left: r.left, right: rightOf(r), bottom: bottomOf(r) });

const register = (table: Record<string, Rect>) => {
  rects.clear();
  for (const [name, rect] of Object.entries(table)) rects.set(byTarget(name), rect);
};

/** Desktop 1440×900 — every Today feature as it sits on a real screen. */
const DESKTOP: Record<string, Rect> = {
  'today-header': { top: 56, left: 45, width: 260, height: 36 },
  'today-phase-mode': { top: 28, left: 45, width: 330, height: 20 },
  'today-budget': { top: 104, left: 45, width: 300, height: 18 },
  'today-plan-button': { top: 48, left: 1160, width: 130, height: 36 },
  'today-primary': { top: 150, left: 45, width: 740, height: 480 },
  'today-why-task': { top: 420, left: 77, width: 660, height: 44 },
  'today-hero-scene': { top: 150, left: 785, width: 610, height: 480 },
  'today-domain-nodes': { top: 210, left: 830, width: 520, height: 380 },
  'today-daily-journey': { top: 660, left: 45, width: 1350, height: 200 },
  'today-readiness-signals': { top: 670, left: 45, width: 1350, height: 300 },
  'today-plan-list': { top: 700, left: 45, width: 1350, height: 240 },
  'today-learning-link': { top: 520, left: 77, width: 220, height: 20 },
  'today-focus-mode': { top: 500, left: 520, width: 170, height: 40 },
  'today-complete-action': { top: 500, left: 640, width: 120, height: 40 },
  'today-postpone-skip': { top: 500, left: 77, width: 240, height: 36 },
  'today-telemetry': { top: 700, left: 45, width: 1350, height: 60 },
  'today-guide-trigger': { top: 48, left: 1060, width: 90, height: 30 },
};

/** Mobile 375×667 — the same features on a phone. */
const MOBILE: Record<string, Rect> = {
  'today-header': { top: 40, left: 16, width: 200, height: 36 },
  'today-phase-mode': { top: 24, left: 16, width: 240, height: 20 },
  'today-budget': { top: 76, left: 16, width: 240, height: 18 },
  'today-plan-button': { top: 40, left: 239, width: 120, height: 36 },
  'today-primary': { top: 110, left: 16, width: 343, height: 300 },
  'today-why-task': { top: 300, left: 24, width: 300, height: 60 },
  'today-hero-scene': { top: 110, left: 16, width: 343, height: 300 },
  'today-domain-nodes': { top: 150, left: 40, width: 300, height: 240 },
  'today-daily-journey': { top: 490, left: 16, width: 343, height: 170 },
  'today-readiness-signals': { top: 450, left: 16, width: 343, height: 200 },
  'today-plan-list': { top: 460, left: 16, width: 343, height: 200 },
  'today-learning-link': { top: 380, left: 24, width: 240, height: 24 },
  'today-focus-mode': { top: 400, left: 140, width: 170, height: 40 },
  'today-complete-action': { top: 420, left: 239, width: 120, height: 40 },
  'today-postpone-skip': { top: 400, left: 24, width: 200, height: 36 },
  'today-telemetry': { top: 470, left: 16, width: 343, height: 80 },
  'today-guide-trigger': { top: 40, left: 120, width: 90, height: 30 },
};

/* ─── component sources (legacy import guard) ──────────────────────── */

const COMPONENT_SOURCES = import.meta.glob('../components/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const GUIDE_SOURCES = import.meta.glob('../components/guide/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/* ─── lifecycle ────────────────────────────────────────────────────── */

beforeEach(() => {
  applyEnvironment();
  installScrollGuards();
  installGeometry();
  installFrames();
  setViewport(1440, 900);
  seed();
});

afterEach(() => {
  cleanup();
  mountedCtx = null;
  guideCtx = null;
  rects.clear();
  restoreGeometry();
  localStorage.clear();
  vi.restoreAllMocks();
});

/* ═══ A. LEGACY REMOVAL ═════════════════════════════════════════════ */

describe('A — legacy Today guide removal', () => {
  it('A1. no component imports or renders the legacy TodayGuide panel', () => {
    const importers = Object.entries(COMPONENT_SOURCES)
      .filter(([file, src]) => !file.endsWith('/TodayGuide.tsx') && /TodayGuide|today-guide-panel|today-guide-dialog|GUIDE_SECTIONS/.test(src))
      .map(([file]) => file);
    expect(importers).toEqual([]);
  });

  it('A2. opening Today’s guide renders the shared overlay, never the legacy panel', () => {
    renderToday();

    expect(screen.queryByTestId('today-guide-dialog')).toBeNull();
    openTour();

    // Universal system: one dialog, one state machine.
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();
    expect(screen.getByTestId('guide-overlay')).not.toBeNull();
    expect(screen.queryByTestId('today-guide-dialog')).toBeNull();
    expect(document.querySelector('.today-guide-panel')).toBeNull();
    expect(screen.queryAllByTestId('guide-anchor')).toHaveLength(0);
    expect(screen.queryByTestId('guide-start')).toBeNull();

    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/What Today Does/i);
    expect(text).not.toMatch(/Using Today/i);
    expect(text).not.toMatch(/The Visual Scene/i);
    expect(text).not.toMatch(/Today Guide/i);
  });
});

/* ═══ B. UNIVERSAL GUIDE ════════════════════════════════════════════ */

describe('B — universal GuideOverlay on Today', () => {
  it('B1. Guide opens at Step 1 with a floating popover and a spotlight on a real Today feature', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    expect(stepCount()).toBe(`1/${TOTAL}`);
    expect(getGuide().currentStep?.id).toBe(STEPS[0].id);
    expect(getGuide().activeGuide?.originRoute).toBe('dashboard');

    const popover = screen.getByTestId('guide-dialog');
    expect(popover.getAttribute('role')).toBe('dialog');
    // Floating card, not a fixed right-hand drawer.
    expect(popover.style.position).toBe('fixed');
    expect(popover.style.width).toBeTruthy();

    // Spotlight ring sits exactly over the highlighted target (+8px ring).
    const ring = document.querySelector('[data-testid="guide-overlay"] div[style*="9999px"]') as HTMLElement | null;
    expect(ring).not.toBeNull();
    const target = byTarget('today-header');
    const rect = rects.get(target)!;
    expect(ring!.style.width).toBe(`${rect.width + 16}px`);
    expect(ring!.style.height).toBe(`${rect.height + 16}px`);
    expect(ring!.style.top).toBe(`${rect.top - 8}px`);
    expect(ring!.style.left).toBe(`${rect.left - 8}px`);
  });

  it('B2. Next advances, Previous returns and is disabled on Step 1', () => {
    renderToday();
    openTour();

    expect(screen.getByTestId('guide-prev').hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByTestId('guide-next'));
    settle();
    expect(stepCount()).toBe(`2/${TOTAL}`);
    expect(currentStepId()).toBe(STEPS[1].id);

    fireEvent.click(screen.getByTestId('guide-prev'));
    settle();
    expect(stepCount()).toBe(`1/${TOTAL}`);
    expect(screen.getByTestId('guide-prev').hasAttribute('disabled')).toBe(true);
  });
});

/* ═══ C. TODAY TARGETS ══════════════════════════════════════════════ */

describe('C — Today tour targets are real DOM elements', () => {
  it('C1. every Today step resolves to an element that exists on the page', () => {
    renderToday();

    const missing: string[] = [];
    for (const step of STEPS) {
      if (!document.querySelector(String(step.target))) missing.push(step.id);
    }
    expect(missing).toEqual([]);
    // and no step is missing its target declaration
    expect(STEPS.every((s) => typeof s.target === 'string' && s.target.length > 0)).toBe(true);
  });

  it('C2. representative Today targets exist and map to the expected feature', () => {
    renderToday();

    expect(byTarget('today-plan-button').textContent).toContain('Plan Today');
    expect(byTarget('today-primary').querySelector('h2')).not.toBeNull();
    expect(byTarget('today-hero-scene').textContent).toContain('Daily Control Scene');
    expect(byTarget('today-domain-nodes').querySelectorAll('[data-node-id]').length).toBeGreaterThan(0);
    expect(byTarget('today-daily-journey')).not.toBeNull();
    expect(byTarget('today-readiness-signals')).not.toBeNull();
    expect(byTarget('today-complete-action').textContent).toContain('Complete');
    expect(byTarget('today-postpone-skip').querySelectorAll('button').length).toBe(2);
    expect(byTarget('today-focus-mode').textContent).toContain('Focus Mode');
    expect(byTarget('today-telemetry').textContent).toContain('Telemetry');
    expect(byTarget('today-guide-trigger').getAttribute('data-testid')).toBe('today-guide-trigger');
  });
});

/* ═══ D. COLLISION ══════════════════════════════════════════════════ */

describe('D — popover never covers the feature it explains', () => {
  it('D1. desktop: for EVERY Today step the popover rectangle is disjoint from the target', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    const violations: string[] = [];
    for (let i = 0; i < TOTAL; i++) {
      goToStep(i);
      const step = STEPS[i];
      const target = document.querySelector(String(step.target)) as HTMLElement | null;
      if (!target || !rects.has(target)) {
        violations.push(`${step.id}: unresolvable target`);
        continue;
      }
      const targetRect = rects.get(target)!;
      const box = popoverBox();

      if (checkRectIntersection(box, boxOf(targetRect))) violations.push(`${step.id}: intersects target`);
      if (box.left < VIEWPORT_PADDING || box.top < VIEWPORT_PADDING) violations.push(`${step.id}: above/left padding`);
      if (box.right > 1440 - VIEWPORT_PADDING || box.bottom > 900 - VIEWPORT_PADDING) {
        violations.push(`${step.id}: outside viewport`);
      }
      const boxEl = screen.getByTestId('guide-dialog');
      expect(boxEl.style.position).toBe('fixed');
    }
    expect(violations).toEqual([]);
  });

  it('D2. the primary-task popover cannot cover the card, its controls or Complete', () => {
    renderToday();
    register(DESKTOP);
    openTour();
    goToStep(STEPS.findIndex((s) => s.id === 'today-primary-action'));

    const primary = rects.get(byTarget('today-primary'))!;
    const box = popoverBox();

    // Everything the user must still see lives INSIDE the highlighted card…
    for (const name of ['today-complete-action', 'today-postpone-skip', 'today-focus-mode', 'today-why-task']) {
      const feature = rects.get(byTarget(name))!;
      expect(primary.left).toBeLessThanOrEqual(feature.left);
      expect(rightOf(primary)).toBeGreaterThanOrEqual(rightOf(feature));
      expect(primary.top).toBeLessThanOrEqual(feature.top);
      expect(bottomOf(primary)).toBeGreaterThanOrEqual(bottomOf(feature));
    }

    // …and the popover sits entirely outside the card, so none of them is covered.
    expect(checkRectIntersection(box, boxOf(primary))).toBe(false);
  });

  it('D3. the hero-scene popover cannot cover the constellation or its nodes', () => {
    renderToday();
    register(DESKTOP);
    openTour();
    goToStep(STEPS.findIndex((s) => s.id === 'today-hero-scene'));

    const scene = rects.get(byTarget('today-hero-scene'))!;
    const nodes = rects.get(byTarget('today-domain-nodes'))!;
    const box = popoverBox();

    // nodes are a subset of the scene, scene is disjoint from the popover
    expect(scene.left).toBeLessThanOrEqual(nodes.left);
    expect(rightOf(scene)).toBeGreaterThanOrEqual(rightOf(nodes));
    expect(checkRectIntersection(box, boxOf(scene))).toBe(false);
    expect(checkRectIntersection(box, boxOf(nodes))).toBe(false);

    // …and the domain-node step itself keeps the nodes clear
    goToStep(STEPS.findIndex((s) => s.id === 'today-domain-nodes'));
    expect(checkRectIntersection(popoverBox(), boxOf(rects.get(byTarget('today-domain-nodes'))!))).toBe(false);
  });

  it('D4. Readiness Signals and Complete are both left fully visible', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    goToStep(STEPS.findIndex((s) => s.id === 'today-readiness-signals'));
    expect(checkRectIntersection(popoverBox(), boxOf(rects.get(byTarget('today-readiness-signals'))!))).toBe(false);
    assertPopoverInViewport(1440, 900);

    goToStep(STEPS.findIndex((s) => s.id === 'today-complete-action'));
    const complete = rects.get(byTarget('today-complete-action'))!;
    expect(checkRectIntersection(popoverBox(), boxOf(complete))).toBe(false);
    // still hit-testable: a click at its centre resolves to the button itself
    const centerX = complete.left + complete.width / 2;
    const centerY = complete.top + complete.height / 2;
    expect(hitTest(centerX, centerY)).toBe(byTarget('today-complete-action'));
  });
});

/* ═══ E. INTERACTION ════════════════════════════════════════════════ */

describe('E — the highlighted target stays interactive', () => {
  it('E1. clicking the highlighted target runs its real handler exactly once and keeps the tour open', () => {
    renderToday();
    register(DESKTOP);

    // The Postpone control inside the highlighted group.
    const postponeButton = screen.getByRole('button', { name: /Postpone/i });
    const buttonRect = { top: 500, left: 77, width: 110, height: 36 };
    rects.set(postponeButton, buttonRect);

    openTour();
    goToStep(STEPS.findIndex((s) => s.id === 'today-postpone-skip'));
    expect(currentStepId()).toBe('today-postpone-skip');

    const before = appState();

    // A real pointer-down inside the spotlight cutout (over the button).
    const backdrop = screen.getByTestId('guide-overlay').querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop, {
      clientX: buttonRect.left + buttonRect.width / 2,
      clientY: buttonRect.top + buttonRect.height / 2,
    });

    // The application handler ran exactly once: one confirmation popover.
    expect(screen.getAllByText('Postpone until tomorrow?')).toHaveLength(1);
    // …the guide itself added nothing and did not close.
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();
    expect(currentStepId()).toBe('today-postpone-skip');
    // …and no task state moved.
    expect(appState()).toBe(before);

    // Cancel the confirmation — still zero mutations.
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText('Postpone until tomorrow?')).toBeNull();
    expect(appState()).toBe(before);
  });

  it('E2. a click on the highlighted target itself (direct) also runs once without closing', () => {
    renderToday();
    register(DESKTOP);
    openTour();
    goToStep(STEPS.findIndex((s) => s.id === 'today-telemetry'));

    const toggle = byTarget('today-telemetry').querySelector('button')!;
    const before = appState();
    fireEvent.click(toggle);

    expect(byTarget('today-telemetry').textContent).toContain('Skill Status');
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();
    expect(appState()).toBe(before);
  });

  it('E3. a click outside the target closes the tour', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    const backdrop = screen.getByTestId('guide-overlay').querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop, { clientX: 1400, clientY: 870 });

    expect(screen.queryByTestId('guide-dialog')).toBeNull();
    expect(getGuide().isOpen).toBe(false);
  });
});

/* ═══ F. CLOSE PATHS ════════════════════════════════════════════════ */

describe('F — every close path', () => {
  it('F1. outside click, Escape, Guide toggle, Skip and Done all close; the popover itself does not', () => {
    renderToday();
    register(DESKTOP);

    // click inside popover → stays open
    openTour();
    fireEvent.click(screen.getByTestId('guide-dialog'));
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();

    // Escape → close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('guide-dialog')).toBeNull();

    // Guide button while active → close
    openTour();
    fireEvent.click(screen.getByTestId('today-guide-trigger'));
    expect(screen.queryByTestId('guide-dialog')).toBeNull();

    // Skip → close (and records completion, exactly like every other page)
    openTour();
    fireEvent.click(screen.getByTestId('guide-skip'));
    expect(screen.queryByTestId('guide-dialog')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('placementos_guide_completion') || '{}');
    expect(stored.completedRoutes?.dashboard).toBe(true);

    // replay starts again at Step 1
    openTour();
    expect(stepCount()).toBe(`1/${TOTAL}`);

    // walk to the end → Done → close
    for (let i = 1; i < TOTAL; i++) {
      fireEvent.click(screen.getByTestId('guide-next'));
      settle();
    }
    const next = screen.getByTestId('guide-next');
    expect(next.textContent).toBe('Done');
    fireEvent.click(next);
    settle();
    expect(screen.queryByTestId('guide-dialog')).toBeNull();
    expect(getGuide().isOpen).toBe(false);
  });

  it('F2. outside click on the backdrop (not the target) closes, inside the popover does not', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    const backdrop = screen.getByTestId('guide-overlay').querySelector('[aria-hidden="true"]')!;
    fireEvent.click(screen.getByTestId('guide-dialog'));
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();

    fireEvent.click(backdrop, { clientX: 1430, clientY: 890 });
    expect(screen.queryByTestId('guide-dialog')).toBeNull();
  });
});

/* ═══ G. CROSS-PAGE ═════════════════════════════════════════════════ */

describe('G — cross-page continuation from Today', () => {
  it('G1. using a real Today link navigates without auto-starting the destination guide', () => {
    renderToday();
    register(DESKTOP);
    openTour();

    const stepBefore = getGuide().stepIndex;
    const idBefore = currentStepId();
    expect(idBefore).not.toBe('');

    // A real Today feature that navigates (Open Learning Workspace).
    fireEvent.click(byTarget('today-learning-link'));
    settle();

    const ctx = getCtx();
    expect(ctx.currentRoute).not.toBe('dashboard');

    // The destination guide did NOT start: origin + step index are remembered.
    expect(guideCtx!.activeGuide?.originRoute).toBe('dashboard');
    expect(guideCtx!.stepIndex).toBe(stepBefore);
    expect(currentStepId()).toBe(idBefore);
    expect(guideCtx!.getGuideDefinition(ctx.currentRoute)).not.toBeNull();

    // Continuation banner explains where the user is.
    expect(
      screen.getByText(new RegExp(`Viewing ${ctx.currentRoute} from dashboard tour`, 'i'), { selector: 'span' }),
    ).not.toBeNull();

    // Return → hands control back to Today (shared behaviour: Return is Next).
    // The origin tour is still the same one — no destination guide took over.
    fireEvent.click(screen.getByText('Return →'));
    settle();
    expect(getCtx().currentRoute).toBe('dashboard');
    expect(guideCtx!.activeGuide?.originRoute).toBe('dashboard');
    expect(guideCtx!.stepIndex).toBe(stepBefore + 1);
    expect(currentStepId()).toBe(STEPS[stepBefore + 1].id);
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();
  });
});

/* ═══ H. SAFETY ═════════════════════════════════════════════════════ */

describe('H — walking the Today tour mutates nothing', () => {
  it('H1. a full walkthrough writes zero completions, evidence, skill, DSA and practice records', () => {
    renderToday();
    register(DESKTOP);

    const ctx = getCtx();
    const stateBefore = appState();
    const evidenceBefore = ctx.evidenceLogs.length;
    const progressBefore = JSON.stringify(ctx.taskProgress);
    const skillsBefore = JSON.stringify(ctx.skillStates);
    const dsaBefore = JSON.stringify(ctx.dsaProgress);
    const practiceBefore = JSON.stringify(ctx.practiceAttempts);

    openTour();
    for (let i = 1; i < TOTAL; i++) {
      fireEvent.click(screen.getByTestId('guide-next'));
      settle();
    }
    // one step back, then skip out
    fireEvent.click(screen.getByTestId('guide-prev'));
    settle();
    fireEvent.click(screen.getByTestId('guide-skip'));

    expect(appState()).toBe(stateBefore);
    expect(getCtx().evidenceLogs.length).toBe(evidenceBefore);
    expect(JSON.stringify(getCtx().taskProgress)).toBe(progressBefore);
    expect(JSON.stringify(getCtx().skillStates)).toBe(skillsBefore);
    expect(JSON.stringify(getCtx().dsaProgress)).toBe(dsaBefore);
    expect(JSON.stringify(getCtx().practiceAttempts)).toBe(practiceBefore);
    expect(scrollCalls).toEqual([]);
  });

  it('H2. the guide never scrolls the page and no guide source contains scrollIntoView', () => {
    renderToday();
    register(DESKTOP);

    const before = window.scrollY;
    openTour();
    for (let i = 1; i < TOTAL; i++) {
      fireEvent.click(screen.getByTestId('guide-next'));
      settle();
    }

    expect(scrollCalls).toEqual([]);
    expect(window.scrollY).toBe(before);

    for (const [file, src] of Object.entries(GUIDE_SOURCES)) {
      expect(src.includes('scrollIntoView'), file).toBe(false);
      expect(src.includes('scrollTo('), file).toBe(false);
    }
  });
});

/* ═══ I. MOBILE ═════════════════════════════════════════════════════ */

describe('I — mobile 375×667', () => {
  it('I1. the popover stays inside the phone viewport for every step and never becomes a drawer', async () => {
    setViewport(375, 667);
    renderToday();
    register(MOBILE);
    openTour();

    const violations: string[] = [];
    for (let i = 0; i < TOTAL; i++) {
      goToStep(i);
      const box = popoverBox();
      const el = screen.getByTestId('guide-dialog');

      if (el.style.position !== 'fixed') violations.push(`${STEPS[i].id}: not position:fixed`);
      if (box.width > 375 - VIEWPORT_PADDING * 2) violations.push(`${STEPS[i].id}: wider than viewport`);
      if (box.left < VIEWPORT_PADDING || box.right > 375 - VIEWPORT_PADDING) {
        violations.push(`${STEPS[i].id}: horizontal overflow`);
      }
      if (box.top < VIEWPORT_PADDING || box.bottom > 667 - VIEWPORT_PADDING) {
        violations.push(`${STEPS[i].id}: vertical overflow`);
      }
      const target = document.querySelector(String(STEPS[i].target)) as HTMLElement | null;
      if (target && rects.has(target) && checkRectIntersection(box, boxOf(rects.get(target)!))) {
        violations.push(`${STEPS[i].id}: covers target`);
      }
    }
    expect(violations).toEqual([]);
    expect(scrollCalls).toEqual([]);
  });

  it('I2. controls keep working on mobile: Complete and Plan stay visible and hit-testable', () => {
    setViewport(375, 667);
    renderToday();
    register(MOBILE);
    openTour();

    // The tour only moves forward — Plan (early) before Complete (late).
    goToStep(STEPS.findIndex((s) => s.id === 'today-plan-button'));
    const plan = rects.get(byTarget('today-plan-button'))!;
    expect(checkRectIntersection(popoverBox(), boxOf(plan))).toBe(false);
    assertPopoverInViewport(375, 667);
    expect(hitTest(plan.left + plan.width / 2, plan.top + plan.height / 2)).toBe(byTarget('today-plan-button'));

    goToStep(STEPS.findIndex((s) => s.id === 'today-complete-action'));
    const complete = rects.get(byTarget('today-complete-action'))!;
    expect(checkRectIntersection(popoverBox(), boxOf(complete))).toBe(false);
    assertPopoverInViewport(375, 667);
    expect(hitTest(complete.left + complete.width / 2, complete.top + complete.height / 2)).toBe(
      byTarget('today-complete-action'),
    );
  });
});
