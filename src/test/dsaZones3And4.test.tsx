// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { DSAView } from '../components/dsa/DSAView';
import { DSAReviewQueue } from '../components/dsa/DSAReviewQueue';
import { DSAPatternMatrix } from '../components/dsa/DSAPatternMatrix';
import { DSA_PROBLEMS, PATTERN_LESSONS } from '../data/dsaDataset';
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

describe('DSA Subsystem Manufacturing — Zones 3 & 4', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/dsa';
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. ZONE 3: SPACED REVIEW QUEUE
  // =========================================================================
  describe('Zone 3: DSAReviewQueue Component', () => {
    it('1.1 renders honest empty state when zero reviews are due', () => {
      render(
        <DSAReviewQueue
          problems={DSA_PROBLEMS}
          progressMap={{}}
          todayDate="2026-10-06"
          onOpenAttempt={vi.fn()}
        />
      );

      expect(screen.getByTestId('dsa-review-queue-empty')).toBeDefined();
      expect(screen.getByText(/Zero Spaced Reviews Due Today/i)).toBeDefined();
    });

    it('1.2 renders only problems genuinely due on or before todayDate', () => {
      const mockProgress: Record<string, DSAProgress> = {
        [DSA_PROBLEMS[0].id]: createMockProgress({
          problemId: DSA_PROBLEMS[0].id,
          nextReviewAt: '2026-10-05', // Past date -> Due
          currentBox: 2,
        }),
        [DSA_PROBLEMS[1].id]: createMockProgress({
          problemId: DSA_PROBLEMS[1].id,
          nextReviewAt: '2026-10-06', // Today date -> Due
          currentBox: 1,
        }),
        [DSA_PROBLEMS[2].id]: createMockProgress({
          problemId: DSA_PROBLEMS[2].id,
          nextReviewAt: '2026-10-08', // Future date -> NOT Due
          currentBox: 3,
        }),
      };

      render(
        <DSAReviewQueue
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
          onOpenAttempt={vi.fn()}
        />
      );

      expect(screen.getByText(DSA_PROBLEMS[0].title)).toBeDefined();
      expect(screen.getByText(DSA_PROBLEMS[1].title)).toBeDefined();
      expect(screen.queryByText(DSA_PROBLEMS[2].title)).toBeNull();
    });

    it('1.3 displays Leitner box and interval for each due problem', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          nextReviewAt: '2026-10-06',
          currentBox: 3,
        }),
      };

      render(
        <DSAReviewQueue
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
          onOpenAttempt={vi.fn()}
        />
      );

      // Box 3 has 7d interval
      expect(screen.getByText(/Box 3\/4 \(7d\)/i)).toBeDefined();
    });

    it('1.4 triggers onOpenAttempt for the exact problem when clicking Review button', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          nextReviewAt: '2026-10-06',
          currentBox: 1,
        }),
      };

      const handleAttempt = vi.fn();

      render(
        <DSAReviewQueue
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          todayDate="2026-10-06"
          onOpenAttempt={handleAttempt}
        />
      );

      const reviewButton = screen.getByRole('button', { name: `Review ${DSA_PROBLEMS[0].title}` });
      fireEvent.click(reviewButton);

      expect(handleAttempt).toHaveBeenCalledWith(DSA_PROBLEMS[0]);
    });
  });

  // =========================================================================
  // 2. ZONE 4: PATTERN MASTERY MATRIX & FILTER CONTROLLER
  // =========================================================================
  describe('Zone 4: DSAPatternMatrix Component', () => {
    it('2.1 renders all 17 canonical pattern cards', () => {
      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={{}}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      PATTERN_LESSONS.forEach((pat) => {
        expect(screen.getByTestId(`pattern-card-${pat.patternId}`)).toBeDefined();
        expect(screen.getByText(pat.name)).toBeDefined();
      });
      expect(PATTERN_LESSONS.length).toBe(17);
    });

    it('2.2 shows Not Started state when pattern has 0 attempts', () => {
      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={{}}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const firstPatternCard = screen.getByTestId(`pattern-card-${PATTERN_LESSONS[0].patternId}`);
      expect(within(firstPatternCard).getByText('Not Started')).toBeDefined();
    });

    it('2.3 shows In Progress state with mastery percentage when partially solved', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          attemptCount: 1,
          passedIndependently: true,
          currentBox: 1,
          evidenceStrength: 0.7,
        }),
      };

      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const arraysCard = screen.getByTestId('pattern-card-pat-001');
      expect(within(arraysCard).getByText(/Mastery/i)).toBeDefined();
    });

    it('2.4 shows Mastered state when criteria are satisfied', () => {
      const twoPointerProblems = DSA_PROBLEMS.filter((p) => p.primaryPattern === 'Two Pointers');
      const mockProgress: Record<string, DSAProgress> = {};
      twoPointerProblems.forEach((p, idx) => {
        mockProgress[p.id] = createMockProgress({
          problemId: p.id,
          attemptCount: 2,
          passedIndependently: true,
          currentBox: (idx === 0 ? 3 : 2) as 2 | 3,
          evidenceStrength: 0.9,
        });
      });

      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const twoPointersCard = screen.getByTestId('pattern-card-pat-002');
      expect(within(twoPointersCard).getByText('Mastered')).toBeDefined();
    });

    it('2.5 shows Remediation state when remediation is active', () => {
      const mockProgress: Record<string, DSAProgress> = {
        'dsa-001': createMockProgress({
          problemId: 'dsa-001',
          attemptCount: 3,
          remediationRequired: true,
          consecutiveFailures: 3,
          passedIndependently: false,
        }),
      };

      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={mockProgress}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const arraysCard = screen.getByTestId('pattern-card-pat-001');
      expect(within(arraysCard).getByText('Remediation')).toBeDefined();
    });

    it('2.6 calls onSelectPattern when clicking a pattern card', () => {
      const handleSelectPattern = vi.fn();

      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={{}}
          selectedPattern={null}
          onSelectPattern={handleSelectPattern}
          selectedDifficulty="all"
          onSelectDifficulty={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const twoPointersCard = screen.getByTestId('pattern-card-pat-002');
      fireEvent.click(twoPointersCard);

      expect(handleSelectPattern).toHaveBeenCalledWith('Two Pointers');
    });

    it('2.7 toggles difficulty filters through onSelectDifficulty', () => {
      const handleSelectDifficulty = vi.fn();

      render(
        <DSAPatternMatrix
          problems={DSA_PROBLEMS}
          progressMap={{}}
          selectedPattern={null}
          onSelectPattern={vi.fn()}
          selectedDifficulty="all"
          onSelectDifficulty={handleSelectDifficulty}
          searchQuery=""
          onSearchChange={vi.fn()}
        />
      );

      const easyButton = screen.getByRole('button', { name: 'easy' });
      fireEvent.click(easyButton);

      expect(handleSelectDifficulty).toHaveBeenCalledWith('easy');
    });
  });

  // =========================================================================
  // 3. INTEGRATION IN DSAVIEW
  // =========================================================================
  describe('DSAView Zones 1–4 Integration', () => {
    it('3.1 renders Zones 1, 2, 3, and 4 in canonical vertical sequence', () => {
      render(
        <PlacementProvider>
          <DSAView />
        </PlacementProvider>
      );

      expect(screen.getByRole('heading', { level: 1, name: /DSA Problem Laboratory/i })).toBeDefined();
      expect(screen.getByTestId('dsa-mastered-count')).toBeDefined();
      expect(screen.getByTestId('dsa-active-focus')).toBeDefined();
      expect(screen.getByTestId('dsa-review-queue')).toBeDefined();
      expect(screen.getByTestId('dsa-pattern-matrix')).toBeDefined();
      expect(screen.getByTestId('dsa-filter-controller')).toBeDefined();
    });

    it('3.2 filters problem catalog when selecting a pattern from the pattern matrix', () => {
      render(
        <PlacementProvider>
          <DSAView />
        </PlacementProvider>
      );

      const matrixCard = screen.getByTestId('pattern-card-pat-002'); // Two Pointers
      fireEvent.click(matrixCard);

      expect(screen.getByText(/in Two Pointers/i)).toBeDefined();
    });
  });
});
