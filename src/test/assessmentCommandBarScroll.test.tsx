// @vitest-environment jsdom
/**
 * TASK 124 — regression contract for the Mode B Assessment Command Bar.
 *
 * The shipped defect was not a pixel accident: the bar carried an arbitrary
 * `top-16` offset even though the AppShell header sits *above* the scroll
 * surface rather than overlaying it, and the scroll surface itself owned the
 * page gutter as padding (padding that is part of its own scrollport). Between
 * them, the bar was pinned 64px below its flow space — overlapping the question
 * stage and palette — and left a band above it that workspace content scrolled
 * visibly through.
 *
 * These tests assert the structural conditions that produced the bug, so the
 * defect cannot be reintroduced by a class-string tweak. Geometry is verified
 * separately in a real browser at 1440x900 / 1280x800 / 1024x768 / 768x1024 /
 * 375x667 (see the Task 124 report).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { AppShell } from '../components/layout/AppShell';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { StorageAdapter } from '../storage/storageAdapter';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BAR_SEL = '[data-testid="assessment-command-bar"]';
const RUNNER_SEL = '[data-testid="assessment-execution-runner"]';

/** The one element that owns vertical scrolling on desktop. */
const scrollOwner = (): HTMLElement | null =>
  document.querySelector('main[class*="overflow-y-auto"]');

const startModeB = (container: HTMLElement): HTMLElement => {
  act(() => {
    fireEvent.click(screen.getByText('Start Baseline Assessment'));
  });
  const bars = container.querySelectorAll(BAR_SEL);
  expect(bars.length).toBe(1);
  return bars[0] as HTMLElement;
};

/** Every ancestor of `el` up to (and excluding) the document root. */
const ancestorsOf = (el: Element): HTMLElement[] => {
  const out: HTMLElement[] = [];
  let node = el.parentElement;
  while (node) {
    out.push(node);
    node = node.parentElement;
  }
  return out;
};

/** Tailwind utilities that turn an element into a scroll container. */
const makesScrollContainer = (el: HTMLElement): boolean =>
  /(^|\s)(overflow(-y)?-(auto|scroll)|scroll-m|overflow:)/.test(el.className);

/** Tailwind utilities that give an element a top/inset offset. */
const hasOffset = (el: HTMLElement): boolean => /(^|\s)top-/.test(el.className);

describe('Assessment Command Bar scroll ownership', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
  });

  afterEach(() => {
    cleanup();
  });

  it('Mode A lobby renders no command bar', () => {
    const { container } = render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );
    expect(container.querySelectorAll(BAR_SEL).length).toBe(0);
  });

  it('Mode B renders exactly one command bar — no duplicate bar', () => {
    const { container } = render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );
    startModeB(container);
    expect(document.querySelectorAll(BAR_SEL).length).toBe(1);
  });

  it('pins the bar with `sticky top-0`: no positive or negative offset, no `fixed` escape hatch', () => {
    const { container } = render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );
    const bar = startModeB(container);

    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('z-30');

    // Exactly one inset utility, and it is `top-0`. The defect was an
    // arbitrary offset; neither a positive nor a negative one is acceptable.
    const insets = (bar.className.match(/(^|\s)top-\S+/g) ?? []).map((s) => s.trim());
    expect(insets).toEqual(['top-0']);

    // No `fixed` escape hatch, and no z-index escalation to mask layering.
    expect(bar.className).not.toContain('fixed');
    expect(bar.className).not.toMatch(/(^|\s)z-\[(\d{4,})\]/);
    // No viewport-relative units that would break the content column.
    expect(bar.className).not.toMatch(/\dvw/);
  });

  it('AppShell main is the single authoritative scroll owner', () => {
    render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    const owner = scrollOwner();
    expect(owner).not.toBeNull();
    expect(owner!.className).toContain('md:overflow-y-auto');
    expect(owner!.className).toContain('md:h-full');
    // The sidebar stays an independent, stationary scroller.
    const aside = document.querySelector('aside');
    expect(aside!.className).toContain('md:h-full');
    expect(aside!.className).toContain('md:overflow-y-auto');
    expect(aside!.className).toContain('md:w-60');
    expect(document.querySelector('header')!.className).toContain('z-40');
  });

  it('the scroll surface owns no padding — its padding is on an inner wrapper', () => {
    render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    const owner = scrollOwner();
    expect(owner).not.toBeNull();

    // Padding on the scroller is part of the scroller's own scrollport, so a
    // `top-0` child would pin to the bottom of that padding and leave a band
    // through which content scrolls visibly above it.
    expect(owner!.className).not.toMatch(/(^|\s)p\d*-/);
    expect(owner!.className).not.toMatch(/(^|\s)(pt|px|pb|py)-/);

    const gutter = owner!.firstElementChild as HTMLElement;
    expect(gutter).not.toBeNull();
    expect(gutter.className).toContain('p-5');
    expect(gutter.className).toContain('sm:p-7');
    expect(gutter.className).toContain('md:p-8');
  });

  it('introduces no nested scroll container between the bar and the scroll owner', () => {
    const { container } = render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    const bar = startModeB(container);
    const owner = scrollOwner();
    expect(owner).not.toBeNull();

    const chain = ancestorsOf(bar);
    expect(chain.some((el) => el === owner)).toBe(true);

    // Everything between the bar and the owner must be non-scrolling, so the
    // bar cannot end up sticking to the wrong surface.
    for (const el of chain) {
      if (el === owner || el === document.body) break;
      expect(
        makesScrollContainer(el),
        `nested scroll container: <${el.tagName.toLowerCase()} class="${el.className}">`
      ).toBe(false);
      expect(
        hasOffset(el),
        `ancestor carrying a sticky/offset conflict: <${el.tagName.toLowerCase()} class="${el.className}">`
      ).toBe(false);
    }
  });

  it('keeps the command bar inside the workspace column, not a fixed overlay', () => {
    const { container } = render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    const bar = startModeB(container);
    const runner = document.querySelector(RUNNER_SEL) as HTMLElement;

    expect(runner.className).toContain('max-w-[1280px]');
    expect(runner.className).toContain('mx-auto');

    // The bar is a direct child of the workspace, so its flow space is the
    // first block of the workspace and the content below is offset by it.
    expect(bar.parentElement).toBe(runner);

    const chain = ancestorsOf(bar);
    expect(chain.some((el) => el === runner)).toBe(true);
    expect(chain.some((el) => el === scrollOwner())).toBe(true);
    // Never position:fixed — that would detach it from the scroll surface.
    expect(
      chain.some((el) => /(^|\s)fixed\s/.test(`${el.className} `))
    ).toBe(false);
  });

  it('keeps question content and palette structurally below the command bar', () => {
    const { container } = render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    const bar = startModeB(container);
    const runner = document.querySelector(RUNNER_SEL) as HTMLElement;

    // The workspace grid that follows the bar's own flow box.
    const grid = runner.querySelector(':scope > .grid') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.previousElementSibling).toBe(bar);

    const stage = grid.firstElementChild as HTMLElement;
    const palette = runner.querySelector('aside[aria-label="Question Palette"]');
    expect(stage).not.toBeNull();
    expect(palette).not.toBeNull();

    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(bar.compareDocumentPosition(stage) & FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(palette!) & FOLLOWING).toBeTruthy();
  });

  it('leaves the palette in its own grid cell rather than under the bar', () => {
    const { container } = render(
      <PlacementProvider>
        <AppShell>
          <AssessmentRunnerView />
        </AppShell>
      </PlacementProvider>
    );
    startModeB(container);
    const runner = document.querySelector(RUNNER_SEL) as HTMLElement;
    const palette = runner.querySelector('aside[aria-label="Question Palette"]') as HTMLElement;

    const cell = palette.parentElement as HTMLElement;
    expect(cell.className).toContain('lg:col-span-1');
    // The palette column is a sibling of the stage column inside the grid that
    // follows the command bar — it never shares the bar's vertical layer.
    expect(cell.parentElement!.className).toContain('grid');
    expect(cell.parentElement!.previousElementSibling).toBe(
      runner.querySelector('[data-testid="assessment-command-bar"]')
    );
  });

  it('keeps the command bar controls intact while re-laying the scroll surface', () => {
    const { container } = render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );
    startModeB(container);

    expect(screen.getByText('Question 1 of 84')).toBeDefined();
    expect(container.querySelectorAll('[data-testid="assessment-timer"]').length).toBe(1);

    const cancel = screen.getByTestId('assessment-cancel-btn');
    const finish = screen.getByTestId('assessment-finish-btn');
    expect(cancel).toHaveTextContent('Cancel Assessment');
    expect(finish).toHaveTextContent('Finish & Submit');
    expect(screen.getAllByText(/Baseline Diagnostic/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Question Palette/i)).toBeDefined();
  });
});
