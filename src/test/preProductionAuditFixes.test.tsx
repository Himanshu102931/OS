import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import fs from 'node:fs';
import App from '../App';
import { PlacementProvider, usePlacement, type PlacementContextType } from '../context/PlacementContext';
import { DSAChallengeWorkspace } from '../components/dsa/DSAChallengeWorkspace';
import {
  StorageAdapter,
  DEFAULT_USER_SETTINGS,
  getDefaultStorageState,
  validateStorageState,
  validateImportState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import { DSA_MODULE_LESSONS } from '../data/dsaModuleLessons';

const setupMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('PR #1 Final Pre-Production Corrections Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    setupMatchMedia();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // FIX 1: Neutral First-Run Defaults
  // =========================================================================
  describe('Fix 1 — Neutral first-run defaults', () => {
    it('DEFAULT_USER_SETTINGS has no assumed placement deadline or career goal', () => {
      expect(DEFAULT_USER_SETTINGS.placementHorizonDate).toBe('');
      expect(DEFAULT_USER_SETTINGS.targetPlacementGoal).toBe('');
      expect(DEFAULT_USER_SETTINGS.dailyStudyMinutes).toBe(120);
      expect(DEFAULT_USER_SETTINGS.onboardingCompleted).toBe(false);
    });

    it('OnboardingModal starts with empty goal and deadline inputs for genuinely new users', () => {
      render(<App />);

      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();

      const goalInput = screen.getByTestId('onboarding-goal-input') as HTMLInputElement;
      expect(goalInput.value).toBe('');
      expect(goalInput.required).toBe(false);

      const deadlineInput = screen.getByTestId('onboarding-deadline-input') as HTMLInputElement;
      expect(deadlineInput.value).toBe('');

      // Realistic study-time options exist and default to 120
      expect(screen.getByTestId('onboarding-time-60')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-time-120')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-time-180')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-time-240')).toBeInTheDocument();
    });

    it('submitting onboarding without specifying goal or deadline saves neutral values', () => {
      render(<App />);

      const submitBtn = screen.getByTestId('onboarding-submit-btn');
      act(() => {
        fireEvent.click(submitBtn);
      });

      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.onboardingCompleted).toBe(true);
      expect(loaded.userSettings.targetPlacementGoal).toBe('');
      expect(loaded.userSettings.placementHorizonDate).toBe('');
      expect(loaded.userSettings.dailyStudyMinutes).toBe(120);
    });

    it('selecting a goal chip updates and saves that specific role without fallback', () => {
      render(<App />);

      const chip = screen.getByText('Backend Engineer');
      act(() => {
        fireEvent.click(chip);
      });

      const goalInput = screen.getByTestId('onboarding-goal-input') as HTMLInputElement;
      expect(goalInput.value).toBe('Backend Engineer');

      const submitBtn = screen.getByTestId('onboarding-submit-btn');
      act(() => {
        fireEvent.click(submitBtn);
      });

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.targetPlacementGoal).toBe('Backend Engineer');
    });

    it('"Explore First" dismisses onboarding and maintains neutral defaults without crashing', () => {
      render(<App />);

      const exploreBtn = screen.getByTestId('onboarding-explore-btn');
      act(() => {
        fireEvent.click(exploreBtn);
      });

      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.onboardingCompleted).toBe(true);
      expect(loaded.userSettings.targetPlacementGoal).toBe('');
      expect(loaded.userSettings.placementHorizonDate).toBe('');
    });

    it('existing learners with prior customized settings retain their original goal and deadline', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.targetPlacementGoal = 'Staff Systems Architect';
      state.userSettings.placementHorizonDate = '2027-12-31';
      state.userSettings.onboardingCompleted = true;
      state.taskProgress['task-101'] = {
        taskId: 'task-101',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 60,
        updatedAt: '2026-10-10T10:00:00.000Z',
      };
      StorageAdapter.saveState(state);

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.targetPlacementGoal).toBe('Staff Systems Architect');
      expect(loaded.userSettings.placementHorizonDate).toBe('2027-12-31');
      expect(loaded.userSettings.onboardingCompleted).toBe(true);

      render(<App />);
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // FIX 2: Persist Module Lesson Scores
  // =========================================================================
  describe('Fix 2 — Persist module lesson scores across all eight modules', () => {
    it('wires onSaveProgress callback from DSAChallengeWorkspace to PlacementContext', () => {
      let contextRef: PlacementContextType | undefined;
      const TestConsumer = () => {
        contextRef = usePlacement();
        return <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />;
      };

      render(
        <PlacementProvider>
          <TestConsumer />
        </PlacementProvider>
      );

      // Open Day 1 Lesson
      const studyLessonBtn = screen.getByText(/Study Module Lesson & Concepts/i);
      fireEvent.click(studyLessonBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Answer pre-check questions for Module 1
      for (const q of DSA_MODULE_LESSONS[1].startingKnowledgeCheck) {
        const promptEl = within(dialog).getByText(q.question);
        const card = promptEl.closest('div.p-4') as HTMLElement;
        const optText = q.options[q.correctIndex];
        const optEl = within(card).getByText(optText, { exact: true });
        act(() => {
          fireEvent.click(optEl);
        });
      }

      // Submit pre-check
      const submitPreCheckBtn = within(dialog).getByText(/Check Answers/i);
      act(() => {
        fireEvent.click(submitPreCheckBtn);
      });

      const totalPreCheckQuestions = DSA_MODULE_LESSONS[1].startingKnowledgeCheck.length;
      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.preCheckAttempted).toBe(true);
      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.preCheckScore).toBe(totalPreCheckQuestions);

      // Click "Explore Core Concepts"
      const exploreConceptsBtn = within(dialog).getByText(/Explore Core Concepts/i);
      act(() => {
        fireEvent.click(exploreConceptsBtn);
      });

      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.coreConceptsViewed).toBe(true);

      // Click "Study Pattern Recognition"
      const studyPatternsBtn = within(dialog).getByText(/Study Pattern Recognition/i);
      act(() => {
        fireEvent.click(studyPatternsBtn);
      });

      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.patternGuideViewed).toBe(true);

      // Switch to Exit Check tab and answer questions
      const exitTab = within(dialog).getByRole('button', { name: /Exit Check/i });
      act(() => {
        fireEvent.click(exitTab);
      });

      // Answer Exit Check questions
      for (const q of DSA_MODULE_LESSONS[1].exitCheck) {
        const promptEl = within(dialog).getByText(q.question);
        const card = promptEl.closest('div.p-4') as HTMLElement;
        const optText = q.options[q.correctIndex];
        const optEl = within(card).getByText(optText, { exact: true });
        act(() => {
          fireEvent.click(optEl);
        });
      }

      // Submit Exit Check
      const submitExitBtn = within(dialog).getByRole('button', { name: /Submit Exit Check/i });
      act(() => {
        fireEvent.click(submitExitBtn);
      });

      const totalExitQuestions = DSA_MODULE_LESSONS[1].exitCheck.length;
      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.exitCheckAttempted).toBe(true);
      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.exitCheckScore).toBe(totalExitQuestions);

      // Canonical DSA progress and assessment must remain unaltered
      expect(contextRef?.dsaProgress['p-two-sum']?.currentBox ?? 1).toBe(1);
      expect(contextRef?.assessmentState).toBeUndefined();
    });

    it('restores saved pre-check and exit-check scores when closing and reopening lesson modal', () => {
      // Seed module 2 lesson progress into storage
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.dsaChallengeState!.currentDay = 2;
      state.dsaChallengeState!.moduleLessonProgress = {
        2: {
          preCheckAttempted: true,
          preCheckScore: 2,
          coreConceptsViewed: true,
          patternGuideViewed: true,
          exitCheckAttempted: true,
          exitCheckScore: 3,
        },
      };
      StorageAdapter.saveState(state);

      render(
        <PlacementProvider>
          <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />
        </PlacementProvider>
      );

      // Verify badges rendered on active module header
      expect(screen.getByTestId('module-2-precheck-badge')).toHaveTextContent(/Pre: 2/);
      expect(screen.getByTestId('module-2-exitcheck-badge')).toHaveTextContent(/Exit: 3/);

      // Open lesson modal
      const studyLessonBtn = screen.getByText(/Study Module Lesson & Concepts/i);
      fireEvent.click(studyLessonBtn);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Score:/i)).toHaveTextContent('2');

      // Check Exit Check tab score
      const exitButton = within(dialog).getByRole('button', { name: /Exit Check/i });
      expect(exitButton).toHaveTextContent('3/5');
    });

    it('supports safe quiz retakes and updates saved score', () => {
      let contextRef: PlacementContextType | undefined;
      const TestConsumer = () => {
        contextRef = usePlacement();
        return <DSAChallengeWorkspace onOpenCanonicalAttempt={vi.fn()} />;
      };

      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.dsaChallengeState!.currentDay = 1;
      state.dsaChallengeState!.moduleLessonProgress = {
        1: {
          preCheckAttempted: true,
          preCheckScore: 1, // Prior score was 1
        },
      };
      StorageAdapter.saveState(state);

      render(
        <PlacementProvider>
          <TestConsumer />
        </PlacementProvider>
      );

      // Open lesson modal
      fireEvent.click(screen.getByText(/Study Module Lesson & Concepts/i));
      const dialog = screen.getByRole('dialog');

      // Click "Retake Pre-Check"
      const retakeBtn = within(dialog).getByText(/Retake Pre-Check/i);
      act(() => {
        fireEvent.click(retakeBtn);
      });

      // Submit button reappears
      expect(within(dialog).getByText(/Check Answers/i)).toBeInTheDocument();

      // Answer all correctly
      for (const q of DSA_MODULE_LESSONS[1].startingKnowledgeCheck) {
        const promptEl = within(dialog).getByText(q.question);
        const card = promptEl.closest('div.p-4') as HTMLElement;
        const optText = q.options[q.correctIndex];
        const optEl = within(card).getByText(optText, { exact: true });
        act(() => {
          fireEvent.click(optEl);
        });
      }

      act(() => {
        fireEvent.click(within(dialog).getByText(/Check Answers/i));
      });

      // Updated score must match total starting questions
      const totalPreCheckQuestions = DSA_MODULE_LESSONS[1].startingKnowledgeCheck.length;
      expect(contextRef?.dsaChallengeState.moduleLessonProgress?.[1]?.preCheckScore).toBe(totalPreCheckQuestions);
    });

    it('preserves moduleLessonProgress through JSON export and import', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.dsaChallengeState!.moduleLessonProgress = {
        1: { preCheckAttempted: true, preCheckScore: 3, coreConceptsViewed: true },
        8: { exitCheckAttempted: true, exitCheckScore: 3, patternGuideViewed: true },
      };

      const exportedJson = StorageAdapter.exportJSON(state);
      expect(exportedJson).toContain('"moduleLessonProgress"');

      const imported = StorageAdapter.importJSON(exportedJson);
      expect(imported.success).toBe(true);
      expect(imported.state?.dsaChallengeState?.moduleLessonProgress?.[1]?.preCheckScore).toBe(3);
      expect(imported.state?.dsaChallengeState?.moduleLessonProgress?.[8]?.exitCheckScore).toBe(3);
    });

    it('safely loads legacy backups lacking moduleLessonProgress with zero degradation', () => {
      const legacyState = getDefaultStorageState() as unknown as Record<string, unknown>;
      delete (legacyState.dsaChallengeState as Record<string, unknown>).moduleLessonProgress;

      const legacyJson = JSON.stringify(legacyState);
      const imported = StorageAdapter.importJSON(legacyJson);
      expect(imported.success).toBe(true);
      expect(imported.state?.dsaChallengeState?.moduleLessonProgress).toEqual({});

      localStorage.setItem('placementos_v1_state', legacyJson);
      const loaded = StorageAdapter.loadState();
      expect(loaded.dsaChallengeState?.moduleLessonProgress).toEqual({});
    });
  });

  // =========================================================================
  // FIX 3: Actual Production Backup Integrity Verification (Local Isolated)
  // =========================================================================
  describe('Fix 3 — Production Backup Local Isolated Verification', () => {
    it('validates the October 26 production backup safely without exposing private data', () => {
      const backupPath = 'C:\\Users\\himan\\Downloads\\placementos-backup-2026-10-26.json';
      if (!fs.existsSync(backupPath)) {
        console.warn(`[Skip] Backup file not found at ${backupPath}`);
        return;
      }

      const rawJson = fs.readFileSync(backupPath, 'utf-8');
      const parsed = JSON.parse(rawJson);

      // 1. Schema & format validation
      expect(validateStorageState(parsed)).toBe(true);
      expect(validateImportState(parsed)).toBe(true);

      // 2. StorageAdapter import round-trip
      const importResult = StorageAdapter.importJSON(rawJson);
      expect(importResult.success).toBe(true);
      const imported = importResult.state!;

      // 3. User progress checks (Diagnostic, responses, weakness signals, domain results, DSA records)
      expect(imported.assessmentState).toBeDefined();
      expect(imported.assessmentState?.profile?.baselineCompletedAt).toBeDefined();

      const responses = imported.assessmentState?.responses || [];
      expect(responses.length).toBe(84);

      const weaknesses = imported.assessmentState?.weaknessSignals || [];
      expect(weaknesses.length).toBe(24);

      const domainResults = imported.assessmentState?.domainResults || [];
      expect(domainResults.length).toBeGreaterThanOrEqual(11);

      const dsaProgressEntries = Object.values(imported.dsaProgress || {});
      expect(dsaProgressEntries.length).toBeGreaterThan(0);

      // 4. Module lesson progress field is cleanly initialized
      expect(imported.dsaChallengeState?.moduleLessonProgress).toBeDefined();

      // 5. Existing learner settings are preserved
      expect(imported.userSettings).toBeDefined();
      expect(imported.userSettings.onboardingCompleted).toBe(true);
    });
  });
});
