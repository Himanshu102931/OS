// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { TaskDefinition, TaskProgress } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Roadmap prerequisite navigation UI:
 *   LOCKED → WHY LOCKED → WHAT PREREQUISITE → OPEN PREREQUISITE → RETURN
 */

const makeTask = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'nav-task',
  title: 'Nav Task',
  description: 'Navigation fixture task',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 30,
  importance: 6,
  taskType: 'practice',
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

const makeProgress = (taskId: string, overrides: Partial<TaskProgress> = {}): TaskProgress => ({
  taskId,
  state: 'not_started',
  timeSpentMinutes: 0,
  postponeCount: 0,
  skipCount: 0,
  updatedAt: '2026-10-01',
  ...overrides,
});

const seed = (
  customTaskDefinitions: TaskDefinition[],
  taskProgress: Record<string, TaskProgress> = {}
) => {
  const defaultState = getDefaultStorageState() as AppExtendedStorageState;
  const next: AppExtendedStorageState = {
    ...defaultState,
    customTaskDefinitions,
    taskProgress: { ...defaultState.taskProgress, ...taskProgress },
  };
  StorageAdapter.saveState(next);
};

const mount = () =>
  render(
    <PlacementProvider>
      <RoadmapView />
    </PlacementProvider>
  );

/**
 * Mirrors App.tsx: the view only mounts once the hash has been parsed by the
 * provider, which is what makes a cold deep link work in the real app.
 */
const DeepLinkHarness = () => {
  const { routeState } = usePlacement();
  return routeState.route === 'roadmap' ? <RoadmapView /> : null;
};

const mountFromDeepLink = () =>
  render(
    <PlacementProvider>
      <DeepLinkHarness />
    </PlacementProvider>
  );

const openArraysTopic = () => fireEvent.click(screen.getByText('Arrays & Two Pointers'));

/** Every prerequisite action rendered anywhere in the document. */
const prereqActionButtons = () =>
  Array.from(
    document.querySelectorAll('[data-testid^="open-prereq-"]')
  ) as HTMLButtonElement[];

/** The task card currently marked as the deep-link target. */
const highlightedCard = () => document.querySelector('[data-highlighted="true"]');

describe('F-UI-PRE-NAV: lock explanation names the real blocker', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  it('explains exactly which prerequisite blocks the target and why', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      {
        'nav-upstream': makeProgress('nav-upstream'),
        'nav-target': makeProgress('nav-target'),
      }
    );

    mount();
    openArraysTopic();

    const card = screen.getByTestId('task-card-nav-target');
    const lock = within(card).getByTestId('task-lock-nav-target');

    // WHAT — the exact prerequisite, not just "Locked"
    const blocker = within(lock).getByTestId('lock-blocker-nav-target-0');
    expect(blocker.getAttribute('data-category')).toBe('incomplete');
    expect(blocker.textContent).toContain('Upstream Hash Task');
    expect(blocker.textContent).toContain('not started');

    // The legacy warning line still names the prerequisite too
    const warning = within(card).getByTestId('prereq-warning-nav-target');
    expect(warning.textContent).toContain('Prerequisites must be completed first:');
    expect(warning.textContent).toContain('Upstream Hash Task');

    // WHY — a single deterministic sentence
    const why = within(lock).getByTestId('lock-why-nav-target');
    expect(why.textContent).toBe('Cannot start until Upstream Hash Task is completed.');

    // NEXT — one real, resolvable action
    const action = within(lock).getByTestId('open-prereq-nav-target-nav-upstream');
    expect(action).toBeDefined();
    expect(action.textContent).toContain('Open prerequisite: Upstream Hash Task');

    // Completion stays gated exactly as before
    const completeBtn = within(card).getByTestId('complete-btn-nav-target');
    expect((completeBtn as HTMLButtonElement).disabled).toBe(true);
    expect(completeBtn.textContent).toContain('Locked');
  });

  it('does not claim a prerequisite when the task is only phase locked', () => {
    seed([makeTask({ id: 'phase-two-task', title: 'Phase Two Task', phaseId: 'phase-2' })], {
      'phase-two-task': makeProgress('phase-two-task'),
    });

    mount();
    openArraysTopic();

    const card = screen.getByTestId('task-card-phase-two-task');
    const lock = within(card).getByTestId('task-lock-phase-two-task');

    expect(within(card).queryByTestId('prereq-warning-phase-two-task')).toBeNull();

    const blocker = within(lock).getByTestId('lock-blocker-phase-two-task-0');
    expect(blocker.getAttribute('data-category')).toBe('phase_locked');
    expect(blocker.textContent).toContain('Phase gate');
    expect(blocker.textContent).toContain('Phase 2');
    expect(blocker.textContent).not.toMatch(/Blocked by/);

    expect(within(lock).getByTestId('lock-why-phase-two-task').textContent).toContain(
      'Prerequisites are satisfied'
    );
    expect(within(lock).getByTestId('phase-no-action-phase-two-task')).toBeDefined();
    expect(prereqActionButtons()).toHaveLength(0);

    // Existing Roadmap behaviour: only prerequisites gate the Complete action.
    const completeBtn = within(card).getByTestId('complete-btn-phase-two-task');
    expect((completeBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('explains prerequisite and phase together, offering only valid actions', () => {
    seed(
      [
        makeTask({ id: 'chain-a', title: 'Chain Step A' }),
        makeTask({
          id: 'both-task',
          title: 'Both Gates Task',
          phaseId: 'phase-2',
          prerequisiteTaskDefinitionIds: ['chain-a'],
        }),
      ],
      { 'chain-a': makeProgress('chain-a'), 'both-task': makeProgress('both-task') }
    );

    mount();
    openArraysTopic();

    const card = screen.getByTestId('task-card-both-task');
    const lock = within(card).getByTestId('task-lock-both-task');

    expect(within(lock).getByTestId('lock-blocker-both-task-0').getAttribute('data-category')).toBe(
      'incomplete'
    );
    expect(within(lock).getByTestId('lock-blocker-both-task-1').getAttribute('data-category')).toBe(
      'phase_locked'
    );

    const why = within(lock).getByTestId('lock-why-both-task').textContent ?? '';
    expect(why).toContain('Chain Step A');
    expect(why).toContain('Phase 2 activates');

    // Only the prerequisite is navigable — the phase gate yields no action.
    expect(within(lock).queryByTestId('phase-no-action-both-task')).toBeNull();
    expect(within(lock).getByTestId('open-prereq-both-task-chain-a')).toBeDefined();

    expect((within(card).getByTestId('complete-btn-both-task') as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('names an unresolvable prerequisite without inventing a route', () => {
    seed(
      [
        makeTask({
          id: 'ghost-task',
          title: 'Ghost Dependent Task',
          prerequisiteTaskDefinitionIds: ['not-a-real-task'],
        }),
      ],
      { 'ghost-task': makeProgress('ghost-task') }
    );

    mount();
    openArraysTopic();

    const card = screen.getByTestId('task-card-ghost-task');
    const lock = within(card).getByTestId('task-lock-ghost-task');

    const blocker = within(lock).getByTestId('lock-blocker-ghost-task-0');
    expect(blocker.getAttribute('data-category')).toBe('unresolved');
    expect(blocker.textContent).toContain('not-a-real-task');
    expect(blocker.textContent).toContain('does not resolve to a roadmap task');

    // No action button at all → nothing to click, no phantom route.
    expect(card.querySelector('[data-testid^="open-prereq-"]')).toBeNull();
    expect(within(lock).getByTestId('prereq-unopenable-ghost-task')).toBeDefined();

    expect(within(lock).getByTestId('lock-why-ghost-task').textContent).toBe(
      'Cannot start until not-a-real-task resolves to a roadmap task.'
    );
  });

  it('renders the combined, partial-data case without crashing', () => {
    seed(
      [
        makeTask({ id: 'chain-a', title: 'Chain Step A' }),
        makeTask({ id: 'chain-b', title: 'Chain Step B', prerequisiteTaskDefinitionIds: ['chain-a'] }),
        makeTask({ id: 'phase-two-task', title: 'Phase Two Task', phaseId: 'phase-2' }),
        makeTask({
          id: 'ghost-task',
          title: 'Ghost Dependent Task',
          prerequisiteTaskDefinitionIds: ['not-a-real-task'],
        }),
        makeTask({
          id: 'both-task',
          title: 'Both Gates Task',
          phaseId: 'phase-2',
          prerequisiteTaskDefinitionIds: ['chain-a'],
        }),
      ],
      {
        'chain-a': makeProgress('chain-a'),
        'chain-b': makeProgress('chain-b'),
        'phase-two-task': makeProgress('phase-two-task'),
        'ghost-task': makeProgress('ghost-task'),
        'both-task': makeProgress('both-task'),
      }
    );

    expect(() => {
      mount();
      openArraysTopic();
    }).not.toThrow();

    for (const id of ['chain-a', 'chain-b', 'phase-two-task', 'ghost-task', 'both-task']) {
      expect(screen.getByTestId(`task-card-${id}`)).toBeDefined();
    }
    expect(screen.getByTestId('task-lock-chain-b')).toBeDefined();
    expect(screen.getByTestId('task-lock-phase-two-task')).toBeDefined();
    expect(screen.getByTestId('task-lock-ghost-task')).toBeDefined();
    expect(screen.getByTestId('task-lock-both-task')).toBeDefined();
    expect(screen.queryByTestId('task-lock-chain-a')).toBeNull();
  });
});

describe('F-UI-PRE-NAV: prerequisite action navigates to a real target', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  it('opens the prerequisite task in its own topic and deep-links the hash', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      { 'nav-upstream': makeProgress('nav-upstream'), 'nav-target': makeProgress('nav-target') }
    );

    mount();
    openArraysTopic();

    fireEvent.click(screen.getByTestId('open-prereq-nav-target-nav-upstream'));

    // Real route, real target
    expect(window.location.hash).toBe('#/roadmap/nav-upstream');

    // The drawer moved to the prerequisite's topic and its card is highlighted
    const drawer = screen.getByTestId('topic-detail-drawer');
    expect(within(drawer).getByText('Hash Tables & Sets')).toBeDefined();
    const upstreamCard = within(drawer).getByTestId('task-card-nav-upstream');
    expect(upstreamCard.getAttribute('data-highlighted')).toBe('true');

    // The prerequisite itself is actionable (no prerequisites of its own)
    const upstreamComplete = within(upstreamCard).getByTestId('complete-btn-nav-upstream');
    expect((upstreamComplete as HTMLButtonElement).disabled).toBe(false);
    expect(upstreamComplete.textContent).toContain('Complete');
  });

  it('returns to the original target after the prerequisite', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      { 'nav-upstream': makeProgress('nav-upstream'), 'nav-target': makeProgress('nav-target') }
    );

    mount();
    openArraysTopic();

    // Return context is absent before drilling in
    expect(screen.queryByTestId('return-to-target')).toBeNull();

    fireEvent.click(screen.getByTestId('open-prereq-nav-target-nav-upstream'));
    expect(window.location.hash).toBe('#/roadmap/nav-upstream');

    const returnBtn = screen.getByTestId('return-to-target');
    expect(returnBtn.getAttribute('aria-label')).toBe('Return to Downstream Array Task');
    expect(returnBtn.textContent).toContain('Back to Downstream Array Task');

    fireEvent.click(returnBtn);

    expect(window.location.hash).toBe('#/roadmap/nav-target');
    const drawer = screen.getByTestId('topic-detail-drawer');
    expect(within(drawer).getByText('Arrays & Two Pointers')).toBeDefined();
    expect(
      within(drawer).getByTestId('task-card-nav-target').getAttribute('data-highlighted')
    ).toBe('true');
    // The stack is consumed — no stale return affordance
    expect(screen.queryByTestId('return-to-target')).toBeNull();
  });

  it('unlocks the target after the prerequisite is completed', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      { 'nav-upstream': makeProgress('nav-upstream'), 'nav-target': makeProgress('nav-target') }
    );

    mount();
    openArraysTopic();

    fireEvent.click(screen.getByTestId('open-prereq-nav-target-nav-upstream'));
    fireEvent.click(screen.getByTestId('complete-btn-nav-upstream'));

    const stored = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(stored.taskProgress['nav-upstream']?.state).toBe('completed');

    fireEvent.click(screen.getByTestId('return-to-target'));

    const card = screen.getByTestId('task-card-nav-target');
    expect(within(card).queryByTestId('task-lock-nav-target')).toBeNull();
    expect(within(card).queryByTestId('prereq-warning-nav-target')).toBeNull();

    const completeBtn = within(card).getByTestId('complete-btn-nav-target');
    expect((completeBtn as HTMLButtonElement).disabled).toBe(false);
    expect(completeBtn.textContent).toContain('Complete');
  });

  it('writes no new persistence keys while navigating', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      { 'nav-upstream': makeProgress('nav-upstream'), 'nav-target': makeProgress('nav-target') }
    );

    const before = Object.keys(StorageAdapter.loadState() as AppExtendedStorageState).sort();

    mount();
    openArraysTopic();
    fireEvent.click(screen.getByTestId('open-prereq-nav-target-nav-upstream'));
    fireEvent.click(screen.getByTestId('return-to-target'));

    const after = Object.keys(StorageAdapter.loadState() as AppExtendedStorageState).sort();
    expect(after).toEqual(before);
  });
});

describe('F-UI-PRE-NAV: multi-level dependency chain', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  const seedChain = () =>
    seed(
      [
        makeTask({ id: 'chain-a', title: 'Chain Step A' }),
        makeTask({ id: 'chain-b', title: 'Chain Step B', prerequisiteTaskDefinitionIds: ['chain-a'] }),
        makeTask({ id: 'chain-c', title: 'Chain Step C', prerequisiteTaskDefinitionIds: ['chain-b'] }),
      ],
      {
        'chain-a': makeProgress('chain-a'),
        'chain-b': makeProgress('chain-b'),
        'chain-c': makeProgress('chain-c'),
      }
    );

  it('C blames B, B blames A, and the trail exposes the whole chain', () => {
    seedChain();
    mount();
    openArraysTopic();

    const cardC = screen.getByTestId('task-card-chain-c');
    expect(
      within(cardC).getByTestId('lock-blocker-chain-c-0').textContent
    ).toContain('Chain Step B');
    expect(within(cardC).queryByTestId('lock-blocker-chain-c-1')).toBeNull();
    expect(within(cardC).getByTestId('lock-why-chain-c').textContent).toBe(
      'Cannot start until Chain Step B is completed.'
    );

    const cardB = screen.getByTestId('task-card-chain-b');
    expect(
      within(cardB).getByTestId('lock-blocker-chain-b-0').textContent
    ).toContain('Chain Step A');

    // A has nothing blocking it
    const cardA = screen.getByTestId('task-card-chain-a');
    expect(within(cardA).queryByTestId('task-lock-chain-a')).toBeNull();

    // Compact dependency trail: A → B → C
    const trail = within(cardC).getByTestId('prereq-trail-chain-c');
    expect(trail.textContent).toContain('Chain Step A');
    expect(trail.textContent).toContain('Chain Step B');
    expect(trail.textContent).toContain('Chain Step C');
    expect(trail.textContent).toContain('→');
  });

  it('lets the user walk backwards through the chain', () => {
    seedChain();
    mount();
    openArraysTopic();

    // C → B
    fireEvent.click(screen.getByTestId('open-prereq-chain-c-chain-b'));
    expect(window.location.hash).toBe('#/roadmap/chain-b');
    expect(
      screen.getByTestId('task-card-chain-b').getAttribute('data-highlighted')
    ).toBe('true');

    // Return to C
    fireEvent.click(screen.getByTestId('return-to-target'));
    expect(window.location.hash).toBe('#/roadmap/chain-c');

    // C → jump straight to the root of the chain via the trail
    fireEvent.click(screen.getByTestId('trail-step-chain-c-chain-a'));
    expect(window.location.hash).toBe('#/roadmap/chain-a');
    expect(
      screen.getByTestId('task-card-chain-a').getAttribute('data-highlighted')
    ).toBe('true');

    // The trail pushed its own return context so the user can come back
    expect(screen.getByTestId('return-to-target').getAttribute('aria-label')).toBe(
      'Return to Chain Step C'
    );
  });

  it('admits B only after A completes, and C only after B completes', () => {
    seedChain();
    mount();
    openArraysTopic();

    // Complete A in place
    fireEvent.click(screen.getByTestId('complete-btn-chain-a'));

    expect(screen.queryByTestId('task-lock-chain-b')).toBeNull();
    expect(screen.getByTestId('complete-btn-chain-b')).toBeDefined();
    expect(
      (screen.getByTestId('complete-btn-chain-b') as HTMLButtonElement).disabled
    ).toBe(false);

    // C is still blocked — by B, which just became eligible but is not done
    const cardC = screen.getByTestId('task-card-chain-c');
    expect(within(cardC).getByTestId('task-lock-chain-c')).toBeDefined();
    expect(
      within(cardC).getByTestId('lock-blocker-chain-c-0').textContent
    ).toContain('Chain Step B');

    fireEvent.click(screen.getByTestId('complete-btn-chain-b'));

    expect(screen.queryByTestId('task-lock-chain-c')).toBeNull();
    expect(
      (screen.getByTestId('complete-btn-chain-c') as HTMLButtonElement).disabled
    ).toBe(false);
  });
});

describe('F-UI-PRE-NAV: route integrity and accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.location.hash = '';
  });

  it('only ever renders prerequisite actions that resolve to a real target', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
        makeTask({
          id: 'ghost-task',
          title: 'Ghost Dependent Task',
          prerequisiteTaskDefinitionIds: ['not-a-real-task'],
        }),
      ],
      {
        'nav-upstream': makeProgress('nav-upstream'),
        'nav-target': makeProgress('nav-target'),
        'ghost-task': makeProgress('ghost-task'),
      }
    );

    mount();
    openArraysTopic();

    const buttons = prereqActionButtons();
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);

    expect(window.location.hash).toBe('#/roadmap/nav-upstream');
    // A real, resolvable task is now the highlighted target
    expect(highlightedCard()?.getAttribute('data-testid')).toBe('task-card-nav-upstream');
  });

  it('keeps prerequisite and return actions keyboard accessible and labelled', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
        makeTask({ id: 'chain-a', title: 'Chain Step A' }),
        makeTask({ id: 'chain-b', title: 'Chain Step B', prerequisiteTaskDefinitionIds: ['chain-a'] }),
      ],
      {
        'nav-upstream': makeProgress('nav-upstream'),
        'nav-target': makeProgress('nav-target'),
        'chain-a': makeProgress('chain-a'),
        'chain-b': makeProgress('chain-b'),
      }
    );

    mount();
    openArraysTopic();

    const action = screen.getByTestId('open-prereq-nav-target-nav-upstream');
    expect(action.tagName).toBe('BUTTON');
    expect(action.getAttribute('aria-label')).toBe(
      'Open prerequisite Upstream Hash Task for Downstream Array Task'
    );
    expect(action.className).toContain('focus-visible:ring');

    const trailStep = screen.getByTestId('trail-step-chain-b-chain-a');
    expect(trailStep.tagName).toBe('BUTTON');
    expect(trailStep.getAttribute('aria-label')).toBe('Open prerequisite Chain Step A');
    expect(trailStep.className).toContain('focus-visible:ring');

    fireEvent.click(action);
    const returnBtn = screen.getByTestId('return-to-target');
    expect(returnBtn.tagName).toBe('BUTTON');
    expect(returnBtn.getAttribute('aria-label')).toBe('Return to Downstream Array Task');
    expect(returnBtn.className).toContain('focus-visible:ring');
  });

  it('restores the drawer from a task-id deep link on mount', () => {
    seed(
      [
        makeTask({ id: 'nav-upstream', title: 'Upstream Hash Task', topicId: 'topic-dsa-hashtable' }),
        makeTask({
          id: 'nav-target',
          title: 'Downstream Array Task',
          prerequisiteTaskDefinitionIds: ['nav-upstream'],
        }),
      ],
      {}
    );

    // Same shape the Today / review candidates already emit: #/roadmap/<task id>
    window.location.hash = '#/roadmap/nav-target';
    mountFromDeepLink();

    const drawer = screen.getByTestId('topic-detail-drawer');
    expect(within(drawer).getByText('Arrays & Two Pointers')).toBeDefined();
    expect(
      within(drawer).getByTestId('task-card-nav-target').getAttribute('data-highlighted')
    ).toBe('true');
    expect(within(drawer).getByTestId('task-lock-nav-target')).toBeDefined();
  });

  it('renders the Preparation bridge from the roadmap drawer', () => {
    seed([makeTask({ id: 'nav-target', title: 'Downstream Array Task' })], {});

    mount();
    openArraysTopic();

    const drawer = screen.getByTestId('topic-detail-drawer');
    const prepButton = within(drawer).getByText('Open Preparation');
    expect(prepButton).toBeDefined();

    fireEvent.click(prepButton);
    expect(window.location.hash.startsWith('#/preparation/')).toBe(true);
  });
});
