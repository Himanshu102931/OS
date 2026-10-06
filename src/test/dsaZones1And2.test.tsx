// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup, screen, fireEvent, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { DSAView } from '../components/dsa/DSAView';
import { DSAHeader } from '../components/dsa/DSAHeader';
import { DSAMasteryStrip } from '../components/dsa/DSAMasteryStrip';
import { DSAActiveFocus } from '../components/dsa/DSAActiveFocus';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type { DSASignalItem } from '../engine/dsaEngine';
import type { DSAProgress } from '../types';

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

function createMockProgress(partial: Partial<DSAProgress> & { problemId: string }): DSAProgress {
  return {
    problemId: partial.problemId,
    attemptCount: partial.attemptCount ?? 1,
    passedIndependently: partial.passedIndependently,
    assistedProvisional: partial.assistedProvisional,
    currentBox: partial.currentBox ?? 1,
    lastAttemptAt: partial.lastAttemptAt ?? '2026-10-01',
    nextReviewAt: partial.nextReviewAt,
    evidenceStrength: partial.evidenceStrength ?? 0.5,
    consecutiveFailures: partial.consecutiveFailures ?? 0,
    remediationRequired: partial.remediationRequired,
    createdAt: partial.createdAt ?? '2026-10-01T00:00:00Z',
    updatedAt: partial.updatedAt ?? '2026-10-01T00:00:00Z',
  };
}

describe('DSA Subsystem Manufacturing — Zones 1 & 2', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/dsa';
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. ZONE 1: DSA HEADER & MASTERY STRIP
  // =========================================================================
  describe('Zone 1: DSAHeader & DSAMasteryStrip', () => {
    it('1.1 renders semantic h1 heading and guide trigger in DSAHeader', () => {
      render(
        <PlacementProvider>
          <DSAHeader totalProblemsCount={150} masteredCount={12} />
        </PlacementProvider>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toContain('DSA Problem Laboratory');
      expect(screen.getByText(/150-Problem Curriculum/i)).toBeDefined();
      expect(screen.getByText(/17 Algorithmic Patterns/i)).toBeDefined();
    });

    it('1.2 calculates total mastered accurately from dsaProgress (passedIndependently)', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 2,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-04',
          evidenceStrength: 0.8,
          consecutiveFailures: 0,
        }),
        'dsa-002': createMockProgress({
          problemId: 'dsa-002',
          attemptCount: 1,
          passedIndependently: false,
          assistedProvisional: true,
          currentBox: 1,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-02',
          evidenceStrength: 0.4,
          consecutiveFailures: 0,
        }),
        'dsa-003': createMockProgress({
          problemId: 'dsa-003',
          attemptCount: 2,
          passedIndependently: true,
          currentBox: 3,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-08',
          evidenceStrength: 0.9,
          consecutiveFailures: 0,
        }),
      };

      render(
        <DSAMasteryStrip
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
        />
      );

      const masteredCountEl = screen.getByTestId('dsa-mastered-count');
      expect(masteredCountEl.textContent).toBe('2');
    });

    it('1.3 displays Leitner box distribution across Box 1, Box 2, Box 3, and Box 4', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 1,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-02',
          evidenceStrength: 0.5,
          consecutiveFailures: 0,
        }),
        'dsa-002': createMockProgress({
          problemId: 'dsa-002',
          attemptCount: 2,
          passedIndependently: true,
          currentBox: 2,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-04',
          evidenceStrength: 0.7,
          consecutiveFailures: 0,
        }),
        'dsa-003': createMockProgress({
          problemId: 'dsa-003',
          attemptCount: 3,
          passedIndependently: true,
          currentBox: 3,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-08',
          evidenceStrength: 0.9,
          consecutiveFailures: 0,
        }),
        'dsa-004': createMockProgress({
          problemId: 'dsa-004',
          attemptCount: 4,
          passedIndependently: true,
          currentBox: 4,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-15',
          evidenceStrength: 1.0,
          consecutiveFailures: 0,
        }),
      };

      render(
        <DSAMasteryStrip
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
        />
      );

      expect(screen.getByTestId('dsa-box-1-count').textContent).toBe('1');
      expect(screen.getByTestId('dsa-box-2-count').textContent).toBe('1');
      expect(screen.getByTestId('dsa-box-3-count').textContent).toBe('1');
      expect(screen.getByTestId('dsa-box-4-count').textContent).toBe('1');
    });

    it('1.4 accurately calculates reviews due count against canonical todayDate', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 2,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-05', // Past date -> Due
          evidenceStrength: 0.8,
          consecutiveFailures: 0,
        }),
        'dsa-002': createMockProgress({
          problemId: 'dsa-002',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 1,
          lastAttemptAt: '2026-10-05',
          nextReviewAt: '2026-10-06', // Today date -> Due
          evidenceStrength: 0.7,
          consecutiveFailures: 0,
        }),
        'dsa-003': createMockProgress({
          problemId: 'dsa-003',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 3,
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-08', // Future date -> NOT Due
          evidenceStrength: 0.9,
          consecutiveFailures: 0,
        }),
      };

      render(
        <DSAMasteryStrip
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
        />
      );

      const dueCountEl = screen.getByTestId('dsa-reviews-due-count');
      expect(dueCountEl.textContent).toBe('2');
    });

    it('1.5 derives pattern mastery count matching calculatePatternMastery pure engine', () => {
      // Build mock progress where Two Pointers pattern is fully mastered
      const twoPointerProblems = DSA_PROBLEMS.filter(
        (p) => p.primaryPattern === 'Two Pointers'
      );

      const mockProgress: Record<string, DSAProgress> = {};
      twoPointerProblems.forEach((p, idx) => {
        mockProgress[p.id] = createMockProgress({
          problemId: p.id,
          attemptCount: 2,
          passedIndependently: true,
          currentBox: (idx === 0 ? 3 : 2) as 2 | 3, // At least one in Box 3
          lastAttemptAt: '2026-10-01',
          nextReviewAt: '2026-10-08',
          evidenceStrength: 0.9,
          consecutiveFailures: 0,
        });
      });

      render(
        <DSAMasteryStrip
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
        />
      );

      const patternMasteryEl = screen.getByTestId('dsa-pattern-mastery-count');
      expect(Number(patternMasteryEl.textContent)).toBeGreaterThanOrEqual(1);
    });

    it('1.6 enforces accessible progressbar semantics with aria attributes', () => {
      render(
        <DSAMasteryStrip
          problems={DSA_PROBLEMS}
          progressMap={{}}
          todayDate="2026-10-06"
        />
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThanOrEqual(2);

      progressBars.forEach((bar) => {
        expect(bar.getAttribute('aria-valuemin')).toBe('0');
        expect(bar.getAttribute('aria-valuemax')).toBe('100');
        expect(bar.getAttribute('aria-valuenow')).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 2. ZONE 2: ACTIVE FOCUS & DEFINING CTA
  // =========================================================================
  describe('Zone 2: DSAActiveFocus Component', () => {
    it('2.1 surfaces Remediation Required (Tier 1) as dominant mission and wires Start Remediation CTA', () => {
      const problem = DSA_PROBLEMS[0];
      const remediationSignal: DSASignalItem = {
        problem,
        priorityTier: 1,
        reason: 'Remediation required: review pattern lesson and pass self-check quiz',
      };

      const handleAttempt = vi.fn();
      const handleWorkspace = vi.fn();

      render(
        <DSAActiveFocus
          activeSignal={remediationSignal}
          onOpenAttempt={handleAttempt}
          onOpenWorkspace={handleWorkspace}
        />
      );

      expect(screen.getByText('REMEDIATION PROTOCOL')).toBeDefined();
      expect(screen.getByText(problem.title)).toBeDefined();
      expect(screen.getByText(/review pattern lesson/i)).toBeDefined();

      const primaryCta = screen.getByTestId('dsa-primary-cta');
      expect(primaryCta.textContent).toContain('Start Remediation');

      fireEvent.click(primaryCta);
      expect(handleWorkspace).toHaveBeenCalledWith(problem);
      expect(handleAttempt).not.toHaveBeenCalled();
    });

    it('2.2 surfaces Spaced Review Due (Tier 2) as dominant mission and wires Start Review CTA', () => {
      const problem = DSA_PROBLEMS[1];
      const reviewSignal: DSASignalItem = {
        problem,
        priorityTier: 2,
        reason: 'Review Due: Box 2 review scheduled for 2026-10-06',
      };

      const handleAttempt = vi.fn();
      const handleWorkspace = vi.fn();

      render(
        <DSAActiveFocus
          activeSignal={reviewSignal}
          onOpenAttempt={handleAttempt}
          onOpenWorkspace={handleWorkspace}
        />
      );

      expect(screen.getByText('SPACED REVIEW DUE')).toBeDefined();
      expect(screen.getByText(problem.title)).toBeDefined();

      const primaryCta = screen.getByTestId('dsa-primary-cta');
      expect(primaryCta.textContent).toContain('Start Review');

      fireEvent.click(primaryCta);
      expect(handleAttempt).toHaveBeenCalledWith(problem);
      expect(handleWorkspace).not.toHaveBeenCalled();
    });

    it('2.3 surfaces Newly Unlocked Problem (Tier 3) with Solve Problem CTA', () => {
      const problem = DSA_PROBLEMS[0];
      const unlockedSignal: DSASignalItem = {
        problem,
        priorityTier: 3,
        reason: 'Newly unlocked problem ready for first attempt',
      };

      const handleAttempt = vi.fn();
      const handleWorkspace = vi.fn();

      render(
        <DSAActiveFocus
          activeSignal={unlockedSignal}
          onOpenAttempt={handleAttempt}
          onOpenWorkspace={handleWorkspace}
        />
      );

      expect(screen.getByText('NEWLY UNLOCKED')).toBeDefined();
      const primaryCta = screen.getByTestId('dsa-primary-cta');
      expect(primaryCta.textContent).toContain('Solve Problem');

      fireEvent.click(primaryCta);
      expect(handleAttempt).toHaveBeenCalledWith(problem);
    });

    it('2.4 wires secondary Open Workspace CTA to handleWorkspace', () => {
      const problem = DSA_PROBLEMS[0];
      const signal: DSASignalItem = {
        problem,
        priorityTier: 3,
        reason: 'Newly unlocked problem ready for first attempt',
      };

      const handleAttempt = vi.fn();
      const handleWorkspace = vi.fn();

      render(
        <DSAActiveFocus
          activeSignal={signal}
          onOpenAttempt={handleAttempt}
          onOpenWorkspace={handleWorkspace}
        />
      );

      const workspaceCta = screen.getByTestId('dsa-workspace-cta');
      fireEvent.click(workspaceCta);
      expect(handleWorkspace).toHaveBeenCalledWith(problem);
    });

    it('2.5 renders clean idle state when activeSignal is null', () => {
      render(
        <DSAActiveFocus
          activeSignal={null}
          onOpenAttempt={vi.fn()}
          onOpenWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText(/All Current Algorithmic Goals Completed/i)).toBeDefined();
    });
  });

  // =========================================================================
  // 3. INTEGRATION IN DSAVIEW & DEEP-LINK CONTINUITY
  // =========================================================================
  describe('DSAView Integration', () => {
    it('3.1 renders Zone 1 Header, Mastery Strip, and Zone 2 Active Focus together', () => {
      render(
        <PlacementProvider>
          <DSAView />
        </PlacementProvider>
      );

      expect(screen.getByRole('heading', { level: 1, name: /DSA Problem Laboratory/i })).toBeDefined();
      expect(screen.getByTestId('dsa-mastered-count')).toBeDefined();
      expect(screen.getByTestId('dsa-active-focus')).toBeDefined();
      expect(screen.getByTestId('dsa-primary-cta')).toBeDefined();
    });

    it('3.2 prioritizes due review over newly unlocked problem in DSAView', () => {
      const state = getDefaultStorageState();
      // Mark dsa-001 as due today
      state.dsaProgress['dsa-001'] = createMockProgress({
        problemId: 'dsa-001',
        attemptCount: 1,
        passedIndependently: true,
        currentBox: 2,
        lastAttemptAt: '2026-10-01',
        nextReviewAt: '2026-10-06',
        evidenceStrength: 0.8,
        consecutiveFailures: 0,
      });
      StorageAdapter.saveState(state);

      render(
        <PlacementProvider>
          <DSAView />
        </PlacementProvider>
      );

      const activeFocus = screen.getByTestId('dsa-active-focus');
      expect(within(activeFocus).getByText('SPACED REVIEW DUE')).toBeDefined();
      expect(within(activeFocus).getByText(DSA_PROBLEMS[0].title)).toBeDefined();
    });

    it('3.3 preserves deep-link attempt modal trigger for #/dsa/<problemId>', () => {
      const state = getDefaultStorageState();
      StorageAdapter.saveState(state);

      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function TestDeepLinkHarness() {
        capturedPlacement = usePlacement();
        return <DSAView />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <TestDeepLinkHarness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Trigger deep-link via setRoute
      act(() => {
        capturedPlacement!.setRoute('dsa', 'dsa-002');
      });

      // Modal should automatically be visible with role="dialog"
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByTestId('dsa-attempt-modal')).toBeDefined();
      expect(screen.getByText(DSA_PROBLEMS[1].title)).toBeDefined();
    });

    it('3.4 preserves deep-link remediation workspace drawer trigger when remediationRequired is true', () => {
      const state = getDefaultStorageState();
      state.dsaProgress['dsa-001'] = createMockProgress({
        problemId: 'dsa-001',
        attemptCount: 3,
        passedIndependently: false,
        remediationRequired: true,
        consecutiveFailures: 3,
        currentBox: 1,
        lastAttemptAt: '2026-10-05',
        evidenceStrength: 0.1,
      });
      StorageAdapter.saveState(state);

      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function TestRemediationHarness() {
        capturedPlacement = usePlacement();
        return <DSAView />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <TestRemediationHarness />
          </SessionProvider>
        </PlacementProvider>
      );

      act(() => {
        capturedPlacement!.setRoute('dsa', 'dsa-001');
      });

      // Remediation learning workspace drawer should open with role="dialog"
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(within(dialog).getByText(/Remediation Required/i)).toBeDefined();
      expect(screen.getByText(/Submit Quiz & Clear Remediation/i)).toBeDefined();
    });

    it('3.5 verifies action-accent token is scoped strictly to primary CTA', () => {
      render(
        <PlacementProvider>
          <DSAView />
        </PlacementProvider>
      );

      const primaryCta = screen.getByTestId('dsa-primary-cta');
      expect(primaryCta.className).toContain('action-accent');

      const workspaceCta = screen.getByTestId('dsa-workspace-cta');
      expect(workspaceCta.className).not.toContain('bg-[var(--action-accent)]');

      // Mastery cards do not consume action-accent
      const masteryStrip = screen.getByLabelText(/DSA Algorithmic Mastery Strip/i);
      expect(masteryStrip.className).not.toContain('action-accent');
    });

    it('3.6 handles empty signals with clean fallback recommendation card', () => {
      render(
        <DSAActiveFocus
          activeSignal={null}
          onOpenAttempt={vi.fn()}
          onOpenWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('All Current Algorithmic Goals Completed')).toBeDefined();
      expect(screen.queryByTestId('dsa-primary-cta')).toBeNull();
    });
  });
});
