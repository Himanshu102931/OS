// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { AppShell } from '../components/layout/AppShell';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const DASHBOARD_SOURCES = import.meta.glob('../components/dashboard/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const getSrc = (filename: string): string => {
  const match = Object.entries(DASHBOARD_SOURCES).find(([p]) => p.endsWith(`/${filename}`));
  if (!match) throw new Error(`Missing source: ${filename}`);
  return match[1];
};

const TODAY_CONVERTED_FILES = [
  'DashboardView.tsx',
  'TodayHeroVisual.tsx',
  'StateStrip.tsx',
  'AttentionRail.tsx',
  'ExecutionQueue.tsx',
  'ProgressPanel.tsx',
  'SignalsFocus.tsx',
  'ReflectionBand.tsx',
  'TelemetryDisclosure.tsx',
  'todayPrimitives.tsx',
];

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
      <DashboardView />
    </PlacementProvider>
  );

beforeEach(() => {
  seed();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('TASK 47: Frozen Specification Verification (T-NEW-1 to T-NEW-11)', () => {
  // T-NEW-1: Single primary filled CTA
  it('T-NEW-1: at most 1 [data-cta="primary"] on page, lives inside primary-action', () => {
    // Normal state
    const { unmount } = renderToday();
    const primaryCtas = document.querySelectorAll('[data-cta="primary"]');
    expect(primaryCtas.length).toBeLessThanOrEqual(1);
    if (primaryCtas.length === 1) {
      const primaryAction = screen.getByTestId('primary-action');
      expect(primaryAction.contains(primaryCtas[0])).toBe(true);
    }
    unmount();

    // Sealed state
    const today = new Date().toISOString().slice(0, 10);
    seed({
      dailyCheckIns: [
        {
          id: 'checkin-today',
          date: today,
          availableMinutes: 180,
          energyLevel: 'high',
          mode: 'normal',
          assignmentIds: [],
          totalActualMinutes: 120,
          notes: '',
          isSealed: true,
          sealedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    renderToday();
    expect(document.querySelectorAll('[data-cta="primary"]')).toHaveLength(0);
  });

  // T-NEW-2: Mission <-> constellation agreement
  it('T-NEW-2: Mission and Constellation agree on candidate attributes', () => {
    renderToday();
    const primary = screen.getByTestId('primary-action');
    const hero = screen.getByTestId('today-hero');

    expect(primary.getAttribute('data-candidate-task-id')).toBe(
      hero.getAttribute('data-candidate-task-id')
    );
    expect(primary.getAttribute('data-candidate-task-title')).toBe(
      hero.getAttribute('data-candidate-task-title')
    );
    expect(primary.getAttribute('data-candidate-score')).toBe(
      hero.getAttribute('data-candidate-score')
    );
    expect(primary.getAttribute('data-candidate-reason')).toBe(
      hero.getAttribute('data-candidate-reason')
    );
  });

  // T-NEW-3: Green contract — zero legacy hex in converted files
  it('T-NEW-3: zero legacy hex colors in active Today components', () => {
    const legacyHexRegex = /#(E5A93C|FFC665|F59E0B|10B981|3B82F6|0D0F12|14171D|1B2028|222833|262D38|3B4556|8E98A8|5C6675|F1F5F9|432C00)/i;
    for (const filename of TODAY_CONVERTED_FILES) {
      const src = getSrc(filename);
      const match = src.match(legacyHexRegex);
      expect(match, `${filename} contains forbidden legacy hex: ${match?.[0]}`).toBeNull();
    }
  });

  // T-NEW-4: Count format without percentage in queue header
  it('T-NEW-4: queue count uses count format and never daily percentage', () => {
    const today = new Date().toISOString().slice(0, 10);
    seed({
      dailyTaskAssignments: [
        {
          id: 'assign-1',
          date: today,
          taskType: 'catalog_task',
          referenceId: 'task-101',
          allocatedMinutes: 30,
          completed: false,
        },
      ],
    });
    renderToday();
    const counts = screen.getByTestId('plan-progress-counts');
    expect(counts.textContent).toMatch(/\d+ \/ \d+ assignments complete/);
    expect(counts.textContent).not.toContain('%');

    // Source scan: no daily completion percentage calculation in execution queue
    const queueSrc = getSrc('ExecutionQueue.tsx');
    expect(queueSrc).not.toMatch(/dailyCompletion/i);
  });

  // T-NEW-5: Forbidden metric scan
  it('T-NEW-5: Today files contain no fabricated readiness formulas or fake metrics', () => {
    for (const filename of TODAY_CONVERTED_FILES) {
      const src = getSrc(filename);
      expect(src, `${filename} must not mention placement ready`).not.toMatch(/placement ready/i);
      expect(src, `${filename} must not render overallDomainReadiness`).not.toContain('.overallDomainReadiness');
    }
  });

  // T-NEW-6: Attention dedup — old redundant surfaces absent
  it('T-NEW-6: retired review panels absent, attention rail consolidates signals', () => {
    renderToday();
    expect(screen.queryByTestId('review-prompts-summary')).toBeNull();
    expect(screen.queryByTestId('primary-review-prompt-cta')).toBeNull();
  });

  // T-NEW-7: DailyJourney successors verified
  it('T-NEW-7: DailyJourney is retired, successor guide targets and attributes exist', () => {
    renderToday();
    expect(screen.queryByTestId('daily-journey')).toBeNull();
    expect(document.querySelector('[data-guide-target="today-daily-journey"]')).not.toBeNull();
    expect(screen.getByTestId('execution-queue')).not.toBeNull();
  });

  // T-NEW-8: Accessibility attributes present
  it('T-NEW-8: accessibility attributes (aria-expanded, screen reader summary, svg aria-hidden)', () => {
    renderToday();
    const hero = screen.getByTestId('today-hero');
    expect(hero.getAttribute('role')).toBe('group');
    expect(hero.getAttribute('aria-label')).toBe("Today's domain map");

    // Static screen reader summary exists
    const srSummary = hero.querySelector('.sr-only');
    expect(srSummary).not.toBeNull();
    expect(srSummary!.textContent).toMatch(/Mission:/);

    // Decorative svg marked aria-hidden
    const svg = hero.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  // T-NEW-9: Mobile ordering sequence
  it('T-NEW-9: sections carry locked data-mobile-order attributes 1 through 9', () => {
    renderToday();
    const expectedOrders: Record<string, number> = {
      header: 1,
      state: 2,
      mission: 3,
      attention: 4,
      queue: 5,
      reflection: 6,
      progress: 7,
      signals: 8,
      telemetry: 9,
    };

    for (const [section, order] of Object.entries(expectedOrders)) {
      const el = document.querySelector(`[data-section="${section}"]`);
      expect(el, `Section [data-section="${section}"] must exist`).not.toBeNull();
      expect(el!.getAttribute('data-mobile-order')).toBe(String(order));
    }
  });

  // T-NEW-10: Animation registry source scan — no forbidden infinite loops
  it('T-NEW-10: Today components contain no forbidden infinite animations, Math.random or RAF loops', () => {
    const heroSrc = getSrc('TodayHeroVisual.tsx');
    expect(heroSrc).not.toContain('Math.random');
    expect(heroSrc).not.toContain('requestAnimationFrame');
    expect(heroSrc).not.toContain('repeatCount="indefinite"');
    expect(heroSrc).not.toMatch(/animation:.*infinite/);

    for (const filename of TODAY_CONVERTED_FILES) {
      const src = getSrc(filename);
      expect(src, `${filename} must not contain repeatCount indefinite`).not.toContain('repeatCount="indefinite"');
    }
  });

  // T-NEW-11: Constellation states and visible legend
  it('T-NEW-11: constellation nodes carry states, aria-labels, and legend exists', () => {
    renderToday();
    const hero = screen.getByTestId('today-hero');

    // Legend present
    expect(hero.textContent).toMatch(/Mission/);
    expect(hero.textContent).toMatch(/Due/);
    expect(hero.textContent).toMatch(/Urgent/);
    expect(hero.textContent).toMatch(/Blocked/);
    expect(hero.textContent).toMatch(/Complete/);
    expect(hero.textContent).toMatch(/Idle/);

    // Primary node has mission state
    const primaryNode = screen.getByTestId('hero-node-primary');
    expect(primaryNode.getAttribute('aria-label')).toMatch(/mission/);
  });
});

describe('TASK 48: Constellation Interaction Contract & Polish Verification', () => {
  it('T48-1: center TODAY node has truthful semantic destination, aria-label, and title', () => {
    renderToday();
    const primaryNode = screen.getByTestId('hero-node-primary');

    expect(primaryNode.getAttribute('data-node-id')).toBe('primary');
    expect(primaryNode.getAttribute('data-actionable')).toBe('true');
    expect(primaryNode.getAttribute('data-destination-route')).toBeTruthy();
    expect(primaryNode.getAttribute('aria-label')).toMatch(/Primary action:.*— mission/);
    expect(primaryNode.getAttribute('title')).toMatch(/Primary action:/);
  });

  it('T48-2: keyboard interaction triggers focus and tooltip on nodes', () => {
    renderToday();
    const primaryNode = screen.getByTestId('hero-node-primary');

    expect(primaryNode.getAttribute('tabindex')).toBe('0');
    fireEvent.focus(primaryNode);
    expect(screen.getByText(/Learning workspace ·/i)).toBeTruthy();

    fireEvent.blur(primaryNode);
    expect(screen.queryByText(/Learning workspace ·/i)).toBeNull();
  });

  it('T48-3: each constellation node has an actionable button and destination', () => {
    renderToday();
    const nodes = document.querySelectorAll('.today-hero-node');
    expect(nodes.length).toBeGreaterThanOrEqual(12);

    nodes.forEach((nodeEl) => {
      expect(nodeEl.tagName).toBe('BUTTON');
      expect(nodeEl.getAttribute('type')).toBe('button');
      expect(nodeEl.getAttribute('aria-label')).toBeTruthy();
      expect(nodeEl.getAttribute('data-destination-route')).toBeTruthy();
    });
  });

  it('T48-4: constellation scene wrapper carries responsive max-width classes', () => {
    renderToday();
    const heroScene = document.querySelector('[data-guide-target="today-hero-scene"]');
    expect(heroScene).not.toBeNull();
    const className = heroScene!.className;
    expect(className).toContain('max-w-[200px]');
    expect(className).toContain('md:max-w-[260px]');
    expect(className).toContain('lg:max-w-[360px]');
  });

  it('T48-5: execution queue communicates state at a glance', () => {
    const today = new Date().toISOString().slice(0, 10);
    seed({
      dailyTaskAssignments: [
        {
          id: 'assign-1',
          date: today,
          taskType: 'catalog_task',
          referenceId: 'task-101',
          allocatedMinutes: 30,
          completed: false,
        },
      ],
    });
    renderToday();

    const queue = screen.getByTestId('execution-queue');
    expect(queue).not.toBeNull();
    expect(queue.querySelector('[data-testid="plan-progress-counts"]')).not.toBeNull();
  });

  it('T48-6: mission card carries atmospheric styling attribute', () => {
    renderToday();
    const primaryAction = screen.getByTestId('primary-action');
    expect(primaryAction.getAttribute('data-atmospheric')).toBe('true');
  });
});

describe('TASK 49: Today Final Visual Manufacturing & Experience Polish', () => {
  it('T49-1: constellation carries orbital motion and counter-rotation classes when motion allowed', () => {
    renderToday();
    const orbitContainer = document.querySelector('.constellation-orbit');
    expect(orbitContainer).not.toBeNull();

    const counterElements = document.querySelectorAll('.constellation-node-counter');
    expect(counterElements.length).toBeGreaterThanOrEqual(11);

    // Primary mission node has subtle breathing energy pulse class
    const primaryNode = screen.getByTestId('hero-node-primary');
    expect(primaryNode.classList.contains('mission-pulse-glow')).toBe(true);
  });

  it('T49-2: reduced motion disables continuous orbital animation and pulse classes', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true, configurable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    renderToday();
    const hero = screen.getByTestId('today-hero');
    expect(hero.querySelectorAll('.constellation-orbit')).toHaveLength(0);
    expect(hero.querySelectorAll('.constellation-node-counter')).toHaveLength(0);
    expect(hero.querySelectorAll('.mission-pulse-glow')).toHaveLength(0);
  });

  it('T49-3: constellation desktop scale expands to xl:max-w-[420px]', () => {
    renderToday();
    const heroScene = document.querySelector('[data-guide-target="today-hero-scene"]');
    expect(heroScene).not.toBeNull();
    const className = heroScene!.className;
    expect(className).toContain('xl:max-w-[420px]');
    expect(className).toContain('xl:w-[45%]');
  });

  it('T49-4: single candidate evaluation invariant in DashboardView is preserved', () => {
    const dashboardSrc = getSrc('DashboardView.tsx');
    const matches = dashboardSrc.match(/getEvaluatedCandidates\(/g);
    expect(matches).not.toBeNull();
    expect(matches).toHaveLength(1);
  });

  it('T49-5: TodayGuide remains untouched and never mounted as legacy panel', () => {
    renderToday();
    expect(screen.queryByTestId('today-guide-dialog')).toBeNull();
    expect(document.querySelector('.today-guide-panel')).toBeNull();
  });

  it('T49-6: AppShell stationary desktop layout and navigation styling contract verified', () => {
    render(
      <PlacementProvider>
        <AppShell>
          <div data-testid="test-content">Dashboard Content</div>
        </AppShell>
      </PlacementProvider>
    );

    const aside = document.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside!.className).toContain('md:h-full');
    expect(aside!.className).toContain('md:overflow-y-auto');

    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    expect(main!.className).toContain('md:h-full');
    expect(main!.className).toContain('md:overflow-y-auto');

    const navButtons = Array.from(document.querySelectorAll('aside nav button'));
    expect(navButtons.length).toBeGreaterThan(0);
    const activeBtn = navButtons.find((btn) => btn.getAttribute('aria-current') === 'page');
    expect(activeBtn).toBeDefined();
    expect(activeBtn!.className).toContain('border-l-[#46B982]');

    // Inactive button hover styling
    const inactiveBtn = navButtons.find((btn) => !btn.getAttribute('aria-current'));
    expect(inactiveBtn).toBeDefined();
    expect(inactiveBtn!.className).toContain('hover:translate-x-0.5');
    expect(inactiveBtn!.className).toContain('duration-150');
  });
});
