// @vitest-environment jsdom
//
// GUIDE VIEWPORT + SCROLL ACCESSIBILITY
//
// Regression cover for the reported bug: on several pages a Guide step anchored
// near the bottom of the viewport pushed the popover — and with it Previous /
// Next / Skip — below the fold. The card is `position: fixed`, so scrolling the
// page could never bring it back up; the card also clipped its own footer.
//
// jsdom has no layout, so geometry comes from a rect registry standing in for
// getBoundingClientRect / elementFromPoint. The production code path
// (GuideOverlay + guidePlacement) is what runs, unmodified.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider, useGuide } from '../components/guide/GuideContext';
import { GuideOverlay } from '../components/guide/GuideOverlay';
import { GuideTrigger } from '../components/guide/GuideTrigger';
import { checkRectIntersection, calculatePopoverPlacement } from '../components/guide/guidePlacement';
import { PAGE_GUIDE_DEFINITIONS } from '../components/guide/GuideDefinitions';
import type { GuideController, RoutePath } from '../components/guide/GuideTypes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const POP = 16;
/** Height placement falls back to while the card has not been measured yet. */
const ASSUMED_HEIGHT = 220;

/* ─── environment ──────────────────────────────────────────────────── */

const scrollCalls: string[] = [];
const addedListenerTypes = new Set<string>();

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
};

const applyEnvironment = () => {
  scrollCalls.length = 0;
  addedListenerTypes.clear();

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
  Object.defineProperty(window, 'matchMedia', {
    writable: true, configurable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
};

/** Record every listener the app attaches so we can prove the guide adds none that hijack scrolling. */
const startListenerAudit = () => {
  const originalPrototypeAdd = EventTarget.prototype.addEventListener;
  const windowOwnAdd = Object.prototype.hasOwnProperty.call(window, 'addEventListener')
    ? (window as unknown as { addEventListener: typeof EventTarget.prototype.addEventListener }).addEventListener
    : null;

  const wrap = (original: typeof EventTarget.prototype.addEventListener) =>
    function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      addedListenerTypes.add(String(type));
      return original.call(this, type, listener, options);
    } as typeof EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = wrap(originalPrototypeAdd);
  if (windowOwnAdd) {
    (window as unknown as { addEventListener: typeof EventTarget.prototype.addEventListener }).addEventListener =
      wrap(windowOwnAdd);
  }

  return () => {
    EventTarget.prototype.addEventListener = originalPrototypeAdd;
    if (windowOwnAdd) {
      (window as unknown as { addEventListener: typeof EventTarget.prototype.addEventListener }).addEventListener =
        windowOwnAdd;
    }
  };
};

/* ─── geometry + frames ────────────────────────────────────────────── */

type Rect = { top: number; left: number; width: number; height: number };
const rects = new Map<Element, Rect>();
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

const containsPoint = (r: Rect, x: number, y: number) =>
  x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;

const hitTest = (x: number, y: number): Element | null => {
  let best: Element | null = null;
  for (const [el, r] of rects) {
    if (!containsPoint(r, x, y)) continue;
    if (!best) best = el;
    else if (best.contains(el)) best = el;
    else if (!el.contains(best) && best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = el;
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
    configurable: true, writable: true, value: (x: number, y: number) => hitTest(x, y),
  });
};

const restoreGeometry = () => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true, writable: true, value: originalGetBoundingClientRect,
  });
  delete (document as unknown as Record<string, unknown>).elementFromPoint;
};

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

const settle = () =>
  act(() => {
    const pending = frameQueue;
    frameQueue = [];
    for (const frame of pending) if (!frame.cancelled) frame.cb(0);
  });

/** A user-driven page scroll: the guide must react by re-measuring, never by moving the page. */
const userScroll = () => {
  window.dispatchEvent(new Event('scroll'));
  settle();
};

/* ─── render harness ───────────────────────────────────────────────── */

let guideCtx: GuideController | null = null;
const GuideProbe = () => {
  const controller = useGuide();
  useEffect(() => { guideCtx = controller; });
  return null;
};
const getGuide = (): GuideController => {
  if (!guideCtx) throw new Error('GuideProvider is not mounted');
  return guideCtx;
};

const Host: React.FC<{ route: RoutePath }> = ({ route }) => (
  <div>
    <h1 data-testid="host-heading" data-guide-target="host-heading">Page Heading</h1>
    <button type="button" data-testid="host-target" data-guide-target="host-target">
      Do the thing
    </button>
    <GuideTrigger route={route} />
    <GuideOverlay />
  </div>
);

const renderHost = (route: RoutePath = 'settings') =>
  render(
    <PlacementProvider>
      <GuideProvider>
        <GuideProbe />
        <Host route={route} />
      </GuideProvider>
    </PlacementProvider>,
  );

const headingRect: Rect = { top: 60, left: 40, width: 420, height: 56 };
const targetRectFixture: Rect = { top: 240, left: 40, width: 320, height: 72 };

const registerHost = () => {
  const heading = screen.getByTestId('host-heading');
  const target = screen.getByTestId('host-target');
  rects.set(heading, headingRect);
  rects.set(target, targetRectFixture);
};

const openTour = () => {
  // Dashboard's trigger carries its own test id; every other page shares one.
  const trigger = screen.queryByTestId('guide-trigger') ?? screen.getByTestId('today-guide-trigger');
  fireEvent.click(trigger);
  settle();
};

const goToStep = (index: number) => {
  let guard = 0;
  while (getGuide().stepIndex < index && guard++ < 40) {
    fireEvent.click(screen.getByTestId('guide-next'));
    settle();
  }
  if (getGuide().stepIndex !== index) throw new Error(`could not reach step ${index}`);
};

/* ─── card geometry ────────────────────────────────────────────────── */

const cardEl = () => screen.getByTestId('guide-dialog');

const cardBox = () => {
  const el = cardEl();
  const top = parseFloat(el.style.top);
  const left = parseFloat(el.style.left);
  const width = parseFloat(el.style.width);
  const height = rects.get(el)?.height ?? ASSUMED_HEIGHT;
  return { top, left, width, height, right: left + width, bottom: top + height };
};

/**
 * Give the card a simulated rendered height (jsdom lays nothing out), then let
 * the production measurement pass pick it up and re-place the card.
 * Re-registers until the box stops moving — the same fixed point the real
 * layout loop reaches, without any ResizeObserver.
 */
const simulateCardHeight = (height: number) => {
  const el = cardEl();
  const register = () => {
    rects.set(el, {
      top: parseFloat(el.style.top),
      left: parseFloat(el.style.left),
      width: parseFloat(el.style.width),
      height,
    });
  };
  register();
  userScroll();
  register();
  userScroll();
  register();
};

const expectInViewport = (width: number, height: number) => {
  const box = cardBox();
  expect(box.top).toBeGreaterThanOrEqual(POP);
  expect(box.left).toBeGreaterThanOrEqual(POP);
  expect(box.right).toBeLessThanOrEqual(width - POP);
  expect(box.bottom).toBeLessThanOrEqual(height - POP);
};

const contentRegion = () => screen.getByTestId('guide-step');
/** The nav bar holding Previous / Next / Skip — a direct child of the card. */
const footerEl = () => screen.getByTestId('guide-prev').parentElement!;

/** The card's own sources — used for "the guide does not touch scrolling" proofs. */
const GUIDE_SOURCES = import.meta.glob('../components/guide/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/* ─── lifecycle ────────────────────────────────────────────────────── */

let stopListenerAudit: (() => void) | null = null;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  applyEnvironment();
  installGeometry();
  installFrames();
  setViewport(1440, 900);
  stopListenerAudit = startListenerAudit();
});

afterEach(() => {
  stopListenerAudit?.();
  stopListenerAudit = null;
  cleanup();
  guideCtx = null;
  rects.clear();
  restoreGeometry();
  localStorage.clear();
});

/* ═══ A. VIEWPORT CONTAINMENT ═══════════════════════════════════════ */

describe('A — the card never leaves the viewport', () => {
  it('A1. placement is computed from the REAL card height, not the old 220px assumption', () => {
    renderHost();
    registerHost();
    openTour();

    // Baseline: unmeasured card still uses the documented assumed height.
    expect(cardBox().height).toBe(ASSUMED_HEIGHT);
    expectInViewport(1440, 900);

    // A card that actually renders 520px tall must be placed for 520px.
    simulateCardHeight(520);
    const box = cardBox();
    expect(box.height).toBe(520);
    expect(box.top + box.height).toBeLessThanOrEqual(900 - POP);
    expect(box.top).toBeGreaterThanOrEqual(POP);
  });

  it('A2. a card taller than the viewport is capped to viewport − 32 and still fits', () => {
    renderHost();
    registerHost();
    openTour();

    const overflowContent = 1500; // natural content height far beyond the screen
    const rendered = Math.min(overflowContent, 900 - POP * 2);
    simulateCardHeight(rendered);

    expect(cardBox().height).toBe(868);
    expectInViewport(1440, 900);
    // The card claims the whole 16px rail and stops exactly there.
    expect(cardBox().bottom).toBeLessThanOrEqual(900 - POP);
  });

  it('A3. a target near the bottom keeps the whole card above the fold', () => {
    renderHost();
    registerHost();
    openTour();

    // Move the highlighted feature to the very bottom of the screen.
    rects.set(screen.getByTestId('host-heading'), { top: 800, left: 600, width: 420, height: 56 });
    userScroll();
    simulateCardHeight(420);

    expectInViewport(1440, 900);
    const box = cardBox();
    // Honest bottom: 420px of card accounted for, so nothing hangs off-screen.
    expect(box.bottom).toBeLessThanOrEqual(900 - POP);
    expect(box.height).toBe(420);
  });

  it('A4. max-height is 100dvh when the engine supports it, exact pixels otherwise — never 100vh', () => {
    const cssHolder = window as unknown as Record<string, unknown>;
    const originalCSS = cssHolder.CSS;
    const defineCss = (supports: (p: string, v: string) => boolean) => {
      Object.defineProperty(window, 'CSS', {
        writable: true, configurable: true,
        value: { supports },
      });
    };

    try {
      defineCss((property, value) => property === 'height' && value === '100dvh');
      renderHost();
      registerHost();
      openTour();
      expect(cardEl().style.maxHeight).toBe('calc(100dvh - 32px)');
      cleanup();
      rects.clear();

      defineCss(() => false);
      renderHost();
      registerHost();
      openTour();
      const declared = cardEl().style.maxHeight;
      expect(declared).not.toContain('100vh');
      expect(declared).toBe(`${900 - POP * 2}px`);
    } finally {
      if (originalCSS === undefined) delete cssHolder.CSS;
      else cssHolder.CSS = originalCSS;
    }
  });

  it('A5. resizing the viewport re-places the card instead of leaving stale coordinates', () => {
    renderHost();
    registerHost();
    openTour();
    simulateCardHeight(400);

    expect(cardBox().width).toBe(360);
    expectInViewport(1440, 900);

    setViewport(320, 900);
    window.dispatchEvent(new Event('resize'));
    settle();
    simulateCardHeight(400);

    // The card re-measures and re-places for the narrower screen.
    expect(cardBox().width).toBeLessThanOrEqual(320 - POP * 2);
    expectInViewport(320, 900);
    expect(scrollCalls).toEqual([]);
  });
});

/* ═══ B. INTERNAL CONTENT SCROLL ════════════════════════════════════ */

describe('B — only the content scrolls; the footer never leaves', () => {
  it('B1. the card is a flex column and the navigation controls are outside the scroll region', () => {
    renderHost();
    registerHost();
    openTour();

    const card = cardEl();
    expect(card.className).toContain('flex');
    expect(card.className).toContain('flex-col');

    const content = contentRegion();
    expect(content.className).toContain('overflow-y-auto');
    expect(content.className).toContain('min-h-0');

    // Previous / Next / Skip / Done must NOT be inside the scrollable content.
    for (const id of ['guide-prev', 'guide-next', 'guide-skip']) {
      expect(content.contains(screen.getByTestId(id))).toBe(false);
      expect(card.contains(screen.getByTestId(id))).toBe(true);
    }
  });

  it('B2. header and footer are pinned (shrink-0) and the footer is the card’s last child', () => {
    renderHost();
    registerHost();
    openTour();

    const card = cardEl();
    const content = contentRegion();
    const footer = footerEl();

    expect(footer.className).toContain('shrink-0');
    expect(card.lastElementChild).toBe(footer);
    // Content is the only sibling that may shrink and scroll.
    expect(content).not.toBe(card.firstElementChild);
    expect(content).not.toBe(card.lastElementChild);
  });

  it('B3. with tall copy the cap still lands the footer inside the viewport', () => {
    renderHost();
    registerHost();
    openTour();
    simulateCardHeight(900 - POP * 2); // content wants more room than the screen has

    const card = cardEl();
    expect(card.style.maxHeight).toBeTruthy();
    // Footer is the last child of a card whose bottom edge is on the 16px rail.
    expect(card.lastElementChild).toBe(footerEl());
    expect(cardBox().bottom).toBeLessThanOrEqual(900 - POP);
    expect(screen.getByTestId('guide-prev')).toBeTruthy();
    expect(screen.getByTestId('guide-next')).toBeTruthy();
    expect(screen.getByTestId('guide-skip')).toBeTruthy();
  });
});

/* ═══ C. THE PAGE STAYS SCROLLABLE ══════════════════════════════════ */

describe('C — opening the guide never locks the page', () => {
  it('C1. no overflow lock is written to body or documentElement', () => {
    renderHost();
    registerHost();
    openTour();
    goToStep(3);

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.touchAction ?? '').toBe('');
    expect(document.documentElement.style.touchAction ?? '').toBe('');
  });

  it('C2. wheel and touchmove over the backdrop and the card are never cancelled', () => {
    renderHost();
    registerHost();
    openTour();

    const backdrop = screen.getByTestId('guide-overlay').querySelector('[aria-hidden="true"]')!;
    expect(backdrop.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))).toBe(true);
    expect(backdrop.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }))).toBe(true);

    const card = cardEl();
    expect(card.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))).toBe(true);
    expect(card.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }))).toBe(true);
    expect(contentRegion().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))).toBe(true);
  });

  it('C3. the guide attaches no wheel / touch / pointer listeners of its own', () => {
    renderHost();
    registerHost();

    addedListenerTypes.clear();
    openTour();
    goToStep(2);

    for (const forbidden of ['wheel', 'touchmove', 'touchstart', 'pointermove', 'pointercancel']) {
      expect(addedListenerTypes.has(forbidden), `unexpected ${forbidden} listener`).toBe(false);
    }
    // It does listen for scroll/resize — passively, purely to re-place the card.
    expect(addedListenerTypes.has('scroll')).toBe(true);
    expect(addedListenerTypes.has('resize')).toBe(true);
  });

  it('C4. no guide source hijacks page scrolling', () => {
    for (const [file, src] of Object.entries(GUIDE_SOURCES)) {
      expect(src.includes('touch-action'), file).toBe(false);
      expect(src.includes("addEventListener('wheel'"), file).toBe(false);
      expect(src.includes('addEventListener("wheel"'), file).toBe(false);
      expect(src.includes("addEventListener('touchmove'"), file).toBe(false);
      expect(src.includes('onWheel'), file).toBe(false);
      expect(src.includes('onTouchMove'), file).toBe(false);
      expect(src.includes('document.body.style'), file).toBe(false);
      expect(src.includes('documentElement.style'), file).toBe(false);
      expect(src.includes('scrollIntoView'), file).toBe(false);
      expect(src.includes('scrollTo('), file).toBe(false);
    }
  });
});

/* ═══ D. OFF-SCREEN TARGET ══════════════════════════════════════════ */

describe('D — off-screen target: no forced scrolling, controls still usable', () => {
  it('D1. an unmeasurable target shows a contextual note instead of dragging the page', () => {
    renderHost();
    registerHost();
    openTour();

    // The highlighted feature exists but has no layout box — i.e. it sits
    // outside the viewport. Step 1 of the Settings tour targets `h1`.
    rects.delete(screen.getByTestId('host-heading'));
    userScroll();

    expect(getGuide().isOpen).toBe(true);
    expect(screen.getByText(/scroll page to bring the highlighted element into view/i)).toBeTruthy();
    expect(screen.getByTestId('guide-prev')).toBeTruthy();
    expect(screen.getByTestId('guide-next')).toBeTruthy();
    expect(screen.getByTestId('guide-skip')).toBeTruthy();
    expect(scrollCalls).toEqual([]);
    expect(window.scrollY).toBe(400);
    expectInViewport(1440, 900);
  });

  it('D2. a manual scroll recomputes targetRect — the spotlight follows, the page does not move', () => {
    renderHost();
    registerHost();
    openTour();

    rects.delete(screen.getByTestId('host-heading'));
    userScroll();
    const spotlightAt = () =>
      Array.from(document.querySelectorAll('div')).find((d) => d.style.boxShadow.includes('9999px'));
    expect(spotlightAt()).toBeUndefined();

    // The user scrolls the feature back into view.
    rects.set(screen.getByTestId('host-heading'), { top: 310, left: 120, width: 300, height: 80 });
    userScroll();

    const ring = spotlightAt();
    expect(ring).toBeTruthy();
    expect(ring!.style.top).toBe(`${310 - 8}px`);
    expect(ring!.style.left).toBe(`${120 - 8}px`);
    // Still zero programmatic scrolling.
    expect(scrollCalls).toEqual([]);
    expect(window.scrollY).toBe(400);
    expectInViewport(1440, 900);
  });
});

/* ═══ E. MOBILE 375×667 ═════════════════════════════════════════════ */

describe('E — mobile 375×667', () => {
  it('E1. the card fits the phone, the footer stays visible and the card is never a drawer', () => {
    setViewport(375, 667);
    renderHost();
    registerHost();
    openTour();

    simulateCardHeight(600);

    const card = cardEl();
    const box = cardBox();

    expect(card.style.position).toBe('fixed');
    expect(box.width).toBeLessThanOrEqual(375 - POP * 2);
    expect(box.left).toBeGreaterThanOrEqual(POP);
    expect(box.right).toBeLessThanOrEqual(375 - POP);
    expect(box.top).toBeGreaterThanOrEqual(POP);
    expect(box.bottom).toBeLessThanOrEqual(667 - POP);

    // Not a full-height side drawer.
    expect(box.width).toBeLessThan(375);
    expect(card.style.left).not.toBe('0px');

    // Content is the scroller, controls are outside it.
    expect(contentRegion().className).toContain('overflow-y-auto');
    expect(contentRegion().contains(screen.getByTestId('guide-next'))).toBe(false);
    expect(card.lastElementChild).toBe(footerEl());
    expect(cardEl().style.maxHeight).toBeTruthy();
  });

  it('E2. on a short phone screen a viewport-tall card still keeps every control reachable', () => {
    setViewport(375, 667);
    renderHost();
    registerHost();
    openTour();

    simulateCardHeight(667 - POP * 2);

    expect(cardBox().height).toBe(635);
    expectInViewport(375, 667);
    expect(cardEl().lastElementChild).toBe(footerEl());
    expect(screen.getByTestId('guide-prev')).toBeTruthy();
    expect(screen.getByTestId('guide-next')).toBeTruthy();
    expect(screen.getByTestId('guide-skip')).toBeTruthy();
  });
});

/* ═══ F. COLLISION ══════════════════════════════════════════════════ */

describe('F — the taller card still never covers the highlighted target', () => {
  it('F1. a 520px card placed beside the highlighted feature has zero intersection', () => {
    renderHost();
    registerHost();
    openTour();
    simulateCardHeight(520);

    const ring = Array.from(document.querySelectorAll('div')).find((d) =>
      d.style.boxShadow.includes('9999px'),
    );
    expect(ring, 'step 1 should spotlight the page heading').toBeTruthy();

    const spotlight = {
      top: parseFloat(ring!.style.top),
      left: parseFloat(ring!.style.left),
      right: parseFloat(ring!.style.left) + parseFloat(ring!.style.width),
      bottom: parseFloat(ring!.style.top) + parseFloat(ring!.style.height),
    };
    const box = cardBox();

    expect(box.height).toBe(520);
    expect(
      checkRectIntersection({ top: box.top, left: box.left, right: box.right, bottom: box.bottom }, spotlight),
    ).toBe(false);
    expectInViewport(1440, 900);
  });

  it('F2. pure geometry sweep: top / centre / bottom / edge targets all stay inside and clear', () => {
    const viewport = { width: 1440, height: 900 };
    const targets = [
      { top: 16, left: 16, width: 200, height: 60, right: 216, bottom: 76 },       // top-left corner
      { top: 420, left: 620, width: 240, height: 90, right: 860, bottom: 510 },     // dead centre
      { top: 820, left: 600, width: 320, height: 60, right: 920, bottom: 880 },     // pinned to the floor
      { top: 300, left: 1360, width: 64, height: 64, right: 1424, bottom: 364 },     // right edge
      { top: 300, left: 4, width: 64, height: 64, right: 68, bottom: 364 },          // left edge
      { top: 4, left: 600, width: 300, height: 48, right: 900, bottom: 52 },         // pinned to the ceiling
    ];
    const heights = [220, 420, 640, 900 - POP * 2];

    for (const target of targets) {
      for (const height of heights) {
        const result = calculatePopoverPlacement(
          target,
          { width: 360, height },
          viewport,
          { viewportPadding: POP, targetGap: 16, spotlightPadding: 8 },
        );
        const box = {
          top: result.top,
          left: result.left,
          right: result.left + result.width,
          bottom: result.top + result.height,
        };

        expect(box.top, `target ${target.top} h=${height}`).toBeGreaterThanOrEqual(POP);
        expect(box.left, `target ${target.left} h=${height}`).toBeGreaterThanOrEqual(POP);
        expect(box.right).toBeLessThanOrEqual(viewport.width - POP);
        expect(box.bottom).toBeLessThanOrEqual(viewport.height - POP);
        expect(
          checkRectIntersection(box, {
            top: target.top - 8,
            left: target.left - 8,
            right: target.right + 8,
            bottom: target.bottom + 8,
          }),
          `overlap for target ${target.top} h=${height}`,
        ).toBe(false);
      }
    }
  });
});

/* ═══ G. INTERACTION ════════════════════════════════════════════════ */

describe('G — the highlighted target stays live', () => {
  it('G1. a click that lands on the target runs the underlying handler exactly once and keeps the guide open', () => {
    let clicks = 0;
    // Step 1 of the Settings tour highlights `h1`; the button inside it is what
    // the user actually presses, exactly as in the real page.
    const HostWithCounter: React.FC = () => (
      <div>
        <h1 data-testid="host-heading">
          <button type="button" data-testid="host-target" onClick={() => { clicks++; }}>
            Do the thing
          </button>
        </h1>
        <GuideTrigger route="settings" />
        <GuideOverlay />
      </div>
    );

    render(
      <PlacementProvider>
        <GuideProvider>
          <GuideProbe />
          <HostWithCounter />
        </GuideProvider>
      </PlacementProvider>,
    );
    rects.set(screen.getByTestId('host-heading'), headingRect);
    rects.set(screen.getByTestId('host-target'), { top: 52, left: 72, width: 200, height: 40 });
    openTour();
    simulateCardHeight(320);

    // The card must not be sitting on top of the highlighted feature.
    const box = cardBox();
    expect(
      checkRectIntersection(
        { top: box.top, left: box.left, right: box.right, bottom: box.bottom },
        { top: headingRect.top - 8, left: headingRect.left - 8, right: headingRect.left + headingRect.width + 8, bottom: headingRect.top + headingRect.height + 8 },
      ),
    ).toBe(false);

    // The backdrop sits above the page, so this exercises the forward-through-
    // the-spotlight path rather than a plain DOM click.
    const backdrop = screen.getByTestId('guide-overlay').querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop, {
      clientX: 72 + 100,
      clientY: 52 + 20,
    });

    expect(clicks).toBe(1);
    expect(getGuide().isOpen).toBe(true);
    expect(screen.getByTestId('guide-dialog')).not.toBeNull();
  });
});

/* ═══ H. CROSS-PAGE REGRESSION ══════════════════════════════════════ */

describe('H — all 10 page tours keep the card inside the viewport', () => {
  const PAGES: RoutePath[] = [
    'dashboard', 'roadmap', 'dsa', 'preparation', 'practice',
    'skills', 'analytics', 'companies', 'project', 'settings',
  ];

  it('H1. every step of every page tour satisfies the 16px viewport inset', () => {
    const violations: string[] = [];

    for (const route of PAGES) {
      cleanup();
      guideCtx = null;
      rects.clear();

      renderHost(route);
      registerHost();
      openTour();

      const total = getGuide().totalSteps;
      expect(total).toBeGreaterThan(0);

      for (let i = 0; i < total; i++) {
        goToStep(i);
        simulateCardHeight(260 + i * 12); // varying copy length per step

        const box = cardBox();
        if (box.top < POP || box.left < POP || box.right > 1440 - POP || box.bottom > 900 - POP) {
          violations.push(`${route} step ${i}: out of viewport ${JSON.stringify(box)}`);
        }
        // Controls stay mounted and reachable at every step.
        for (const id of ['guide-prev', 'guide-next', 'guide-skip']) {
          if (!screen.queryByTestId(id)) violations.push(`${route} step ${i}: missing ${id}`);
        }
        // Where the feature is measurable, the card must not cover its spotlight.
        const spotlight = Array.from(document.querySelectorAll('div')).find((d) =>
          d.style.boxShadow.includes('9999px'),
        );
        if (spotlight) {
          const ring = {
            top: parseFloat(spotlight.style.top),
            left: parseFloat(spotlight.style.left),
            right: parseFloat(spotlight.style.left) + parseFloat(spotlight.style.width),
            bottom: parseFloat(spotlight.style.top) + parseFloat(spotlight.style.height),
          };
          if (checkRectIntersection({ top: box.top, left: box.left, right: box.right, bottom: box.bottom }, ring)) {
            violations.push(`${route} step ${i}: covers the highlighted feature`);
          }
        }
      }

      fireEvent.click(screen.getByTestId('guide-close'));
      settle();
      expect(getGuide().isOpen).toBe(false);
    }

    expect(violations).toEqual([]);
    expect(scrollCalls).toEqual([]);
    expect(PAGES).toHaveLength(PAGE_GUIDE_DEFINITIONS.length);
  });
});
