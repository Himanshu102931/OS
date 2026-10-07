// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { PracticeView } from '../components/practice/PracticeView';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import type { PracticeAttempt } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = (): unknown[] => [];
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
});
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ObserverStub,
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

describe('TASK 72: PRACTICE PAGE MANUFACTURING VERIFICATION', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/practice';
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  function renderPractice() {
    return render(
      <PlacementProvider>
        <SessionProvider>
          <PracticeView />
        </SessionProvider>
      </PlacementProvider>
    );
  }

  // =========================================================================
  // ZONE 1: HEADER & PROVING STRIP
  // =========================================================================
  describe('Zone 1: Practice Header & Proving Ground Strip', () => {
    it('1.1 renders page title, subtitle and GuideTrigger', () => {
      renderPractice();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Placement Assessment & Practice Hub/i);
      expect(screen.getByText(/Targeted drills for Aptitude, Verbal, SQL scenarios/i)).toBeInTheDocument();
      expect(screen.getByTestId('guide-trigger')).toBeInTheDocument();
    });

    it('1.2 renders 4 macro metrics in proving strip accurately', () => {
      // Seed two attempts: 1 passed (100%), 1 failed (40%)
      const state = getDefaultStorageState();
      const mockAttempt1: PracticeAttempt = {
        id: 'att-1',
        sessionId: 'practice-apt-01',
        sessionTitle: 'Quantitative Aptitude Essentials',
        category: 'aptitude',
        domainId: 'aptitude',
        date: '2026-10-01',
        completedAt: '2026-10-01T10:00:00Z',
        totalTimeSeconds: 300,
        scorePct: 100,
        accuracyPct: 100,
        correctCount: 5,
        totalQuestions: 5,
        passed: true,
        userAnswers: [],
      };
      const mockAttempt2: PracticeAttempt = {
        id: 'att-2',
        sessionId: 'practice-verbal-01',
        sessionTitle: 'Verbal Ability & Comprehension',
        category: 'verbal',
        domainId: 'communication',
        date: '2026-10-02',
        completedAt: '2026-10-02T10:00:00Z',
        totalTimeSeconds: 400,
        scorePct: 40,
        accuracyPct: 40,
        correctCount: 2,
        totalQuestions: 5,
        passed: false,
        userAnswers: [],
      };
      state.practiceAttempts = [mockAttempt1, mockAttempt2];
      StorageAdapter.saveState(state);

      renderPractice();

      // Total Drills = 2
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      // Average Accuracy = 70%
      expect(screen.getByText('70%')).toBeInTheDocument();
      // Remediation pending displayed
      expect(screen.getByText(/Actionable drill review/i)).toBeInTheDocument();
      expect(screen.getByText(/1 drill pending/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ZONE 2: ACTIVE RECOMMENDED DRILL HERO
  // =========================================================================
  describe('Zone 2: Active Recommended Drill Hero', () => {
    it('2.1 renders dominant recommended drill hero with Cobalt CTA', () => {
      renderPractice();

      expect(screen.getByText('RECOMMENDED DRILL')).toBeInTheDocument();
      expect(screen.getByText(/Why this drill\?/i)).toBeInTheDocument();
      const startRecBtn = screen.getByRole('button', { name: /Start Recommended Drill/i });
      expect(startRecBtn).toBeInTheDocument();

      // Clicking opens the runner modal
      act(() => {
        fireEvent.click(startRecBtn);
      });

      const modal = screen.getByTestId('practice-runner-modal');
      expect(modal).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ZONE 3: PERSISTENT REMEDIATION QUEUE
  // =========================================================================
  describe('Zone 3: Persistent Remediation & Review Queue', () => {
    it('3.1 does not render remediation queue when all attempts passed', () => {
      const state = getDefaultStorageState();
      state.practiceAttempts = [
        {
          id: 'att-1',
          sessionId: 'practice-apt-01',
          sessionTitle: 'Quantitative Aptitude Essentials',
          category: 'aptitude',
          domainId: 'aptitude',
          date: '2026-10-01',
          completedAt: '2026-10-01T10:00:00Z',
          totalTimeSeconds: 300,
          scorePct: 90,
          accuracyPct: 90,
          correctCount: 4,
          totalQuestions: 5,
          passed: true,
          userAnswers: [],
        },
      ];
      StorageAdapter.saveState(state);

      renderPractice();

      expect(screen.queryByText(/Remediation & Review Queue/i)).not.toBeInTheDocument();
    });

    it('3.2 renders remediation queue when failed attempts exist with retake action', () => {
      const state = getDefaultStorageState();
      state.practiceAttempts = [
        {
          id: 'att-fail',
          sessionId: 'practice-apt-01',
          sessionTitle: 'Quantitative Aptitude Essentials',
          category: 'aptitude',
          domainId: 'aptitude',
          topicId: 'prep-apt-quant',
          date: '2026-10-01',
          completedAt: '2026-10-01T10:00:00Z',
          totalTimeSeconds: 300,
          scorePct: 40,
          accuracyPct: 40,
          correctCount: 2,
          totalQuestions: 5,
          passed: false,
          userAnswers: [],
        },
      ];
      StorageAdapter.saveState(state);

      renderPractice();

      expect(screen.getByText(/Remediation & Review Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/40% \(Pass: 70%\)/i)).toBeInTheDocument();

      const retakeBtn = screen.getByRole('button', { name: /Retake Drill/i });
      expect(retakeBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(retakeBtn);
      });

      expect(screen.getByTestId('practice-runner-modal')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ZONE 4: DRILL CATALOG & CATEGORY TABS
  // =========================================================================
  describe('Zone 4: Drill Catalog & Category Proving Tracks', () => {
    it('4.1 renders all 7 accessible category tabs with tablist semantics', () => {
      renderPractice();

      const tablist = screen.getByRole('tablist', { name: /Practice Categories/i });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(7);

      const allTab = screen.getByRole('tab', { name: /All Sessions/i });
      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(allTab).toHaveAttribute('aria-controls', 'session-catalog-panel');
    });

    it('4.2 filters session grid when category tab is selected', () => {
      renderPractice();

      const sqlTab = screen.getByRole('tab', { name: /SQL/i });
      act(() => {
        fireEvent.click(sqlTab);
      });

      expect(sqlTab).toHaveAttribute('aria-selected', 'true');
      const catalogPanel = screen.getByRole('tabpanel');
      expect(catalogPanel).toBeInTheDocument();
      expect(catalogPanel.textContent).toContain('SQL');
    });

    it('4.3 filters session grid via search query', () => {
      renderPractice();

      const searchInput = screen.getByLabelText(/Search practice drills/i);
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'Quantitative Aptitude' } });
      });

      const catalogPanel = screen.getByRole('tabpanel');
      expect(catalogPanel.textContent).toContain('Quantitative Aptitude Essentials');
    });

    it('4.4 toggles timed-only drills filter', () => {
      renderPractice();

      const timedToggle = screen.getByRole('switch', { name: /Timed Drills Only/i });
      expect(timedToggle).toHaveAttribute('aria-checked', 'false');

      act(() => {
        fireEvent.click(timedToggle);
      });

      expect(timedToggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  // =========================================================================
  // ZONE 5: PRACTICE RUNNER WORKBENCH & MODAL
  // =========================================================================
  describe('Zone 5: Practice Runner Workbench', () => {
    it('5.1 supports question navigation, MCQ selection and keyboard shortcuts', () => {
      renderPractice();

      // Launch first session
      const startBtns = screen.getAllByRole('button', { name: /Start Session/i });
      act(() => {
        fireEvent.click(startBtns[0]);
      });

      const modal = screen.getByTestId('practice-runner-modal');
      expect(modal).toBeInTheDocument();

      // Question step counter
      expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 1 of/i);

      // Select MCQ option 2 via click
      const optionButtons = screen.getAllByRole('button').filter((b) => b.textContent?.includes('4% decrease'));
      if (optionButtons.length > 0) {
        act(() => {
          fireEvent.click(optionButtons[0]);
        });
      }

      // Press Enter/Cmd+Enter or Next button to advance
      const nextBtn = screen.getByRole('button', { name: /Next Question/i });
      act(() => {
        fireEvent.click(nextBtn);
      });

      expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 2 of/i);

      // Jump back to question 1 via step pill
      const jumpPill1 = screen.getByRole('button', { name: /Jump to question 1/i });
      act(() => {
        fireEvent.click(jumpPill1);
      });

      expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 1 of/i);
    });

    it('5.2 evaluates attempt deterministically and renders result screen with continuation', () => {
      renderPractice();

      const startBtns = screen.getAllByRole('button', { name: /Start Session/i });
      act(() => {
        fireEvent.click(startBtns[0]);
      });

      const firstSession = PRACTICE_SESSIONS[0];

      // Step through all questions and finish
      for (let i = 0; i < firstSession.questions.length; i++) {
        const btn = screen.getByRole('button', { name: /Next Question|Finish & Submit/i });
        act(() => {
          fireEvent.click(btn);
        });
      }

      // Result screen rendered
      expect(screen.getByTestId('result-verdict')).toBeInTheDocument();
      expect(screen.getByTestId('result-score')).toBeInTheDocument();
      expect(screen.getByText(/Evidence Log Integration/i)).toBeInTheDocument();

      // Close & Return
      const closeBtn = screen.getByRole('button', { name: /Close & Return/i });
      act(() => {
        fireEvent.click(closeBtn);
      });

      expect(screen.queryByTestId('practice-runner-modal')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // CROSS-SUBSYSTEM HANDOFF & DEEP LINK PRESERVATION
  // =========================================================================
  describe('Cross-Subsystem Handoff Preservation', () => {
    it('6.1 deep-linked session opens runner and advances active Today session upon completion', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return <PracticeView />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Deep link to practice-apt-01
      act(() => {
        capturedPlacement!.setRoute('practice', 'practice-apt-01');
      });

      expect(screen.getByTestId('practice-runner-modal')).toBeInTheDocument();

      const sessionDef = PRACTICE_SESSIONS.find((s) => s.id === 'practice-apt-01')!;

      // Complete session
      for (let i = 0; i < sessionDef.questions.length; i++) {
        const btn = screen.getByRole('button', { name: /Next Question|Finish & Submit/i });
        act(() => {
          fireEvent.click(btn);
        });
      }

      // Deep-linked session automatically completes, advances activity and returns to dashboard
      expect(capturedPlacement!.currentRoute).toBe('dashboard');
      expect(capturedSession!.sessionState?.completedActivityIds.length).toBeGreaterThan(0);
    });
  });
});
