import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../App';
import { PlacementProvider } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import {
  StorageAdapter,
  getDefaultStorageState,
  hasUserLearningHistory,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import type {
  AssessmentAttempt,
  AssessmentResponse,
  DomainId,
  DomainAssessmentResult,
  WeaknessSignal,
} from '../types';

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

function buildAuthenticBaselineState(): AppExtendedStorageState {
  const base = getDefaultStorageState() as AppExtendedStorageState;

  const attemptId = 'asm-attempt-baseline-authentic';
  const completedAt = '2026-10-13T05:33:28.988Z';

  const attempt: AssessmentAttempt = {
    id: attemptId,
    definitionId: 'baseline-v1',
    definitionVersion: 1,
    kind: 'diagnostic_assessment',
    status: 'submitted',
    startedAt: '2026-10-13T05:00:00.000Z',
    endedAt: completedAt,
    timeLimitSeconds: 10800,
    seed: 'seed-baseline',
    selectedItemIds: BASELINE_ASSESSMENT_ITEMS.map((i) => i.id),
  };

  const domainScores: Record<
    string,
    {
      abilityScore: number;
      level: 0 | 1 | 2 | 3 | 4 | 5;
      status: 'assessed' | 'partially_assessed' | 'unassessed';
      confidence: 'high' | 'none';
      constructScope?: string;
    }
  > = {
    aptitude: { abilityScore: 23, level: 2, status: 'assessed', confidence: 'high' },
    dsa: { abilityScore: 0, level: 0, status: 'assessed', confidence: 'high' },
    python: { abilityScore: 0, level: 0, status: 'partially_assessed', confidence: 'high', constructScope: 'reasoning_only' },
    sql: { abilityScore: 0, level: 0, status: 'assessed', confidence: 'high' },
    dbms: { abilityScore: 0, level: 0, status: 'assessed', confidence: 'high' },
    oop: { abilityScore: 0, level: 0, status: 'assessed', confidence: 'high' },
    os: { abilityScore: 0, level: 0, status: 'assessed', confidence: 'high' },
    cn: { abilityScore: 3, level: 1, status: 'assessed', confidence: 'high' },
    communication: { abilityScore: 53, level: 3, status: 'partially_assessed', confidence: 'high', constructScope: 'written_only' },
    interviews: { abilityScore: 52, level: 3, status: 'partially_assessed', confidence: 'high', constructScope: 'interview_knowledge_only' },
    projects: { abilityScore: 0, level: 0, status: 'unassessed', confidence: 'none', constructScope: 'project_evidence_only' },
  };

  const allDomainIds: DomainId[] = [
    'aptitude', 'dsa', 'python', 'sql', 'dbms',
    'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
  ];

  const domainResults: DomainAssessmentResult[] = allDomainIds.map((domainId) => {
    const meta = domainScores[domainId];
    const totalItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === domainId).length;
    return {
      domainId,
      abilityScore: meta.abilityScore,
      level: meta.level,
      confidence: meta.confidence,
      status: meta.status,
      coverage: {
        topicsCovered: totalItems,
        topicsTotal: totalItems || 1,
        competenciesCovered: [],
        difficultyBands: [1, 2, 3],
      },
      assessmentDate: completedAt,
      provisional: true,
      constructScope: meta.constructScope,
      attemptId: attempt.id,
      kind: 'diagnostic_assessment' as const,
    };
  });

  const weaknessSignals: WeaknessSignal[] = [
    {
      id: 'ws-apt-1',
      domainId: 'aptitude' as DomainId,
      topicId: 'quant-percentages',
      competency: 'percentages',
      errorCategory: 'E-CONCEPT',
      strength: 2,
      status: 'open' as const,
      firstSeenAt: completedAt,
      lastSeenAt: completedAt,
      occurrences: 1,
      sourceAttemptIds: [attempt.id],
    },
  ];

  return {
    ...base,
    userSettings: {
      ...base.userSettings,
      onboardingCompleted: true,
      diagnosticDismissed: false,
    },
    assessmentState: {
      attempts: [attempt],
      responses: [],
      exposures: {},
      domainResults,
      snapshots: [],
      weaknessSignals,
      profile: {
        baselineCompletedAt: completedAt,
        pendingSunday: false,
      },
    },
  };
}

describe('TASK 174 — Personalized Onboarding, Dual-Track Dashboard & Assessment Improvements', () => {
  beforeEach(() => {
    localStorage.clear();
    setupMatchMedia();
    window.location.hash = '#/dashboard';
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // --- Phase 1: Onboarding Flow ---
  describe('Phase 1: Personalized First-Run Onboarding Experience', () => {
    it('shows onboarding modal for genuinely new user with empty storage', () => {
      // Empty storage simulates fresh visitor
      render(<App />);

      const modal = screen.getByTestId('onboarding-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText(/Welcome to PlacementOS/i)).toBeInTheDocument();

      // Goal selection exists
      expect(screen.getByTestId('onboarding-goal-input')).toBeInTheDocument();

      // Realistic daily study availability options exist
      expect(screen.getByTestId('onboarding-time-60')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-time-120')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-time-180')).toBeInTheDocument();

      // Unknown deadline option exists
      expect(screen.getByTestId('onboarding-unknown-deadline')).toBeInTheDocument();

      // Explore First button exists
      expect(screen.getByTestId('onboarding-explore-btn')).toBeInTheDocument();
    });

    it('allows "Explore First" to complete onboarding without requiring form inputs', () => {
      render(<App />);

      const exploreBtn = screen.getByTestId('onboarding-explore-btn');
      act(() => {
        fireEvent.click(exploreBtn);
      });

      // Modal should be dismissed
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      // Persisted settings should record onboardingCompleted: true
      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.onboardingCompleted).toBe(true);
    });

    it('persists customized goals, study availability, and unknown horizon date', () => {
      render(<App />);

      // Fill in goal
      const goalInput = screen.getByTestId('onboarding-goal-input');
      act(() => {
        fireEvent.change(goalInput, { target: { value: 'Frontend Platform Engineer' } });
      });

      // Select 60 min availability
      const time60 = screen.getByTestId('onboarding-time-60');
      act(() => {
        fireEvent.click(time60);
      });

      // Mark deadline unknown
      const unknownCheck = screen.getByTestId('onboarding-unknown-deadline');
      act(() => {
        fireEvent.click(unknownCheck);
      });

      // Submit
      const submitBtn = screen.getByTestId('onboarding-submit-btn');
      act(() => {
        fireEvent.click(submitBtn);
      });

      // Modal should close
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.onboardingCompleted).toBe(true);
      expect(loaded.userSettings.targetPlacementGoal).toBe('Frontend Platform Engineer');
      expect(loaded.userSettings.dailyStudyMinutes).toBe(60);
      expect(loaded.userSettings.placementHorizonDate).toBe('');
    });

    it('never shows onboarding modal to an existing learner with prior progress', () => {
      // Simulate existing user state with completed tasks or DSA progress but onboardingCompleted undefined
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.taskProgress['task-101'] = {
        taskId: 'task-101',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 45,
        updatedAt: '2026-10-10T10:00:00.000Z',
      };
      // Explicitly delete or leave onboardingCompleted undefined to simulate legacy state
      delete (state.userSettings as unknown as Record<string, unknown>).onboardingCompleted;

      StorageAdapter.saveState(state);

      // Verify helper correctly detects history
      expect(hasUserLearningHistory(state)).toBe(true);

      render(<App />);

      // Onboarding modal must NOT be shown
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
    });
  });

  // --- Phase 2: Diagnostic Invitation and Reminder Lifecycle ---
  describe('Phase 2: Diagnostic Invitation and Reminder Lifecycle', () => {
    it('shows two-step first-run modal sequence: onboarding first, then diagnostic modal upon completion', () => {
      // Fresh user state: onboardingCompleted false
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = false;
      state.userSettings.diagnosticDismissed = false;
      StorageAdapter.saveState(state);

      render(<App />);

      // Step 1: Onboarding modal is displayed first
      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
      // Step 2: Diagnostic modal is NOT yet open
      expect(screen.queryByTestId('diagnostic-invitation')).not.toBeInTheDocument();

      // Learner completes onboarding by clicking "Explore First"
      const exploreBtn = screen.getByTestId('onboarding-explore-btn');
      act(() => {
        fireEvent.click(exploreBtn);
      });

      // Onboarding modal is now closed
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      // Step 2 modal: Diagnostic invitation modal is now displayed
      const invitation = screen.getByTestId('diagnostic-invitation');
      expect(invitation).toBeInTheDocument();
      expect(screen.getByTestId('start-diagnostic-invitation-btn')).toBeInTheDocument();
      expect(screen.getByTestId('start-diagnostic-invitation-btn')).toHaveTextContent(/Start Diagnostic/i);
      expect(screen.getByTestId('dismiss-diagnostic-invitation-btn')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-diagnostic-invitation-btn')).toHaveTextContent(/Not Now/i);

      // Dismiss the diagnostic modal
      const dismissBtn = screen.getByTestId('dismiss-diagnostic-invitation-btn');
      act(() => {
        fireEvent.click(dismissBtn);
      });

      // Diagnostic modal is gone
      expect(screen.queryByTestId('diagnostic-invitation')).not.toBeInTheDocument();

      // Compact reminder is visible on Today
      expect(screen.getByTestId('diagnostic-reminder')).toBeInTheDocument();
      expect(screen.getByTestId('start-diagnostic-reminder-btn')).toHaveTextContent(/Take Diagnostic/i);

      // Navigation indicator is present on assessment tab
      expect(screen.getByTestId('diagnostic-nav-indicator')).toBeInTheDocument();

      // Preliminary recommendation notice and badge are visible in Today's Mission
      expect(screen.getByTestId('preliminary-curriculum-badge')).toBeInTheDocument();
      expect(screen.getByTestId('preliminary-recommendation-notice')).toBeInTheDocument();
      expect(screen.getByTestId('prioritize-diagnostic-btn')).toBeInTheDocument();

      // Persisted state records dismissal
      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.onboardingCompleted).toBe(true);
      expect(loaded.userSettings.diagnosticDismissed).toBe(true);
    });

    it('dismissing diagnostic modal with Escape key dismisses modal and persists dismissal', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = false;
      StorageAdapter.saveState(state);

      render(<App />);

      expect(screen.getByTestId('diagnostic-invitation')).toBeInTheDocument();

      // Press Escape
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(screen.queryByTestId('diagnostic-invitation')).not.toBeInTheDocument();
      expect(screen.getByTestId('diagnostic-reminder')).toBeInTheDocument();

      const loaded = StorageAdapter.loadState();
      expect(loaded.userSettings.diagnosticDismissed).toBe(true);
    });

    it('offers Resume Diagnostic when an in-progress attempt exists', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = false;
      state.assessmentState = {
        attempts: [
          {
            id: 'attempt-in-progress-1',
            definitionId: 'baseline-v1',
            definitionVersion: 1,
            kind: 'diagnostic_assessment',
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            timeLimitSeconds: 7200,
            seed: 'resume-seed',
            selectedItemIds: [BASELINE_ASSESSMENT_ITEMS[0].id],
          },
        ],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          pendingSunday: false,
        },
      };
      StorageAdapter.saveState(state);

      render(<App />);

      // Modal shows "Resume Diagnostic"
      const startBtn = screen.getByTestId('start-diagnostic-invitation-btn');
      expect(startBtn).toHaveTextContent(/Resume Diagnostic/i);

      // Dismiss modal
      act(() => {
        fireEvent.click(screen.getByTestId('dismiss-diagnostic-invitation-btn'));
      });

      // Compact reminder on Today also shows "Resume Diagnostic"
      const reminderBtn = screen.getByTestId('start-diagnostic-reminder-btn');
      expect(reminderBtn).toHaveTextContent(/Resume Diagnostic/i);
    });

    it('refreshing does not reopen the modal once dismissed, preserving the persistent reminder', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = true;
      StorageAdapter.saveState(state);

      // Initial render (simulating fresh page load / refresh)
      render(<App />);

      // Modal is NOT reopened
      expect(screen.queryByTestId('diagnostic-invitation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();

      // Compact reminder remains visible on Today
      expect(screen.getByTestId('diagnostic-reminder')).toBeInTheDocument();
      expect(screen.getByTestId('diagnostic-nav-indicator')).toBeInTheDocument();
    });

    it('suppresses both invitation and reminder once baseline diagnostic is completed', () => {
      const state = buildAuthenticBaselineState();
      StorageAdapter.saveState(state);

      render(<App />);

      // Neither modal invitation nor compact reminder nor nav indicator should be present
      expect(screen.queryByTestId('diagnostic-invitation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('diagnostic-reminder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('diagnostic-nav-indicator')).not.toBeInTheDocument();

      // Preliminary notices in mission should NOT be present
      expect(screen.queryByTestId('preliminary-curriculum-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('preliminary-recommendation-notice')).not.toBeInTheDocument();

      // Instead, the completed baseline status callout is shown in Signals
      expect(screen.getByTestId('diagnostic-status-callout')).toBeInTheDocument();
    });

    it('truthfully advertises 180 min continuous wall-clock limit and reload persistence in invitation and reminder', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = false;
      StorageAdapter.saveState(state);

      render(<App />);

      // Invitation modal
      const invitation = screen.getByTestId('diagnostic-invitation');
      expect(within(invitation).getByText(/180 min wall-clock limit/i)).toBeInTheDocument();
      expect(within(invitation).getByText(/84 Questions · 10 Domains/i)).toBeInTheDocument();
      expect(within(invitation).getByText(/continuous wall-clock limit/i)).toBeInTheDocument();
      expect(within(invitation).getByText(/answers persist automatically across reloads/i)).toBeInTheDocument();

      // Dismiss modal to see reminder
      const dismissBtn = screen.getByTestId('dismiss-diagnostic-invitation-btn');
      act(() => {
        fireEvent.click(dismissBtn);
      });

      // Reminder banner
      const reminder = screen.getByTestId('diagnostic-reminder');
      expect(within(reminder).getByText(/180 min continuous wall-clock limit/i)).toBeInTheDocument();
      expect(within(reminder).getByText(/answers persist on reload/i)).toBeInTheDocument();
    });

    it('informs learner with in-progress attempt that elapsed wall-clock time continues while answers persist', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = false;
      state.assessmentState = {
        attempts: [
          {
            id: 'attempt-in-progress-wall-clock',
            definitionId: 'baseline-v1',
            definitionVersion: 1,
            kind: 'diagnostic_assessment',
            status: 'in_progress',
            startedAt: new Date(Date.now() - 60000).toISOString(),
            timeLimitSeconds: 10800,
            seed: 'resume-seed',
            selectedItemIds: [BASELINE_ASSESSMENT_ITEMS[0].id],
          },
        ],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          pendingSunday: false,
        },
      };
      StorageAdapter.saveState(state);

      render(<App />);

      const invitation = screen.getByTestId('diagnostic-invitation');
      expect(within(invitation).getByText(/180-minute wall-clock timer continues running from when you started/i)).toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByTestId('dismiss-diagnostic-invitation-btn'));
      });

      const reminder = screen.getByTestId('diagnostic-reminder');
      expect(within(reminder).getByText(/180-minute wall-clock timer continues running/i)).toBeInTheDocument();
    });
  });

  // --- Phase 3: Dual-Track Domain Dashboard ---
  describe('Phase 3: Dual-Track Domain Signals', () => {
    it('displays Track A diagnostic ability and Track B practical mastery for each domain without contradiction', () => {
      const state = buildAuthenticBaselineState();
      StorageAdapter.saveState(state);

      render(
        <PlacementProvider>
          <DashboardView />
        </PlacementProvider>
      );

      // Verify exactly 9 active domain elements render with dual-track attributes (interviews & projects filtered in Simple Mode)
      const domainElements = screen.getAllByTestId('signal-domain');
      expect(domainElements).toHaveLength(9);

      // Helper to find domain by id
      const findDomain = (id: string) => domainElements.find((el) => el.getAttribute('data-domain-id') === id);

      // Aptitude: ability 23, practical 0
      const apt = findDomain('aptitude');
      expect(apt).toBeDefined();
      expect(apt?.getAttribute('data-domain-diagnostic-ability')).toBe('23');
      expect(apt?.getAttribute('data-domain-practical-mastery')).toBe('0');
      expect(apt?.getAttribute('data-domain-status')).toBe('needs_baseline');

      // Computer Networks: ability 3, practical 0
      const cn = findDomain('cn');
      expect(cn).toBeDefined();
      expect(cn?.getAttribute('data-domain-diagnostic-ability')).toBe('3');
      expect(cn?.getAttribute('data-domain-practical-mastery')).toBe('0');

      // Communication: ability 53, practical 0
      const comm = findDomain('communication');
      expect(comm).toBeDefined();
      expect(comm?.getAttribute('data-domain-diagnostic-ability')).toBe('53');
      expect(comm?.getAttribute('data-domain-practical-mastery')).toBe('0');

      // Interviews & Projects: retired from Today presentation in Simple Mode
      expect(findDomain('interviews')).toBeUndefined();
      expect(findDomain('projects')).toBeUndefined();

      // Underlying assessment domain results remain intact in stored state
      expect(state.assessmentState?.domainResults?.find((dr) => dr.domainId === 'interviews')?.abilityScore).toBe(52);

      // Hover on Aptitude and check detail breakdown and navigation CTA
      act(() => {
        fireEvent.mouseEnter(apt!);
      });

      const detail = screen.getByTestId('signal-domain-detail');
      expect(detail).toBeInTheDocument();
      expect(detail).toHaveTextContent(/Track A: Diagnostic Ability/i);
      expect(detail).toHaveTextContent(/23\/100/i);
      expect(detail).toHaveTextContent(/Track B: Practical Mastery/i);

      // Navigation button to assessment exists
      const navBtn = screen.getByTestId('navigate-assessment-from-signal');
      expect(navBtn).toBeInTheDocument();
      act(() => {
        fireEvent.click(navBtn);
      });
      expect(window.location.hash).toBe('#/assessment');
    });
  });

  // --- Phase 4: Assessment Unfamiliarity Control ---
  describe('Phase 4: Optional Per-Question Unfamiliarity Control', () => {
    it('allows learner to check unfamiliarity while choosing an answer, creating weakness signal', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;

      // Create an active in-progress diagnostic attempt
      const attempt: AssessmentAttempt = {
        id: 'asm-test-unfamiliar',
        definitionId: 'baseline-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        timeLimitSeconds: 7200,
        seed: 'test-seed',
        selectedItemIds: [BASELINE_ASSESSMENT_ITEMS[0].id],
      };
      state.assessmentState = {
        attempts: [attempt],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          pendingSunday: false,
        },
      };
      StorageAdapter.saveState(state);

      window.location.hash = '#/assessment';

      render(
        <PlacementProvider>
          <AssessmentRunnerView />
        </PlacementProvider>
      );

      // Unfamiliar topic control exists
      const unfamiliarControl = screen.getByTestId('unfamiliar-topic-control');
      expect(unfamiliarControl).toBeInTheDocument();

      const checkbox = screen.getByTestId('unfamiliar-topic-checkbox');
      expect(checkbox).not.toBeChecked();

      // Check unfamiliarity
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(checkbox).toBeChecked();

      // Choose option A (index 0)
      const options = screen.getAllByRole('radio');
      expect(options.length).toBeGreaterThan(0);
      act(() => {
        fireEvent.click(options[0]);
      });

      // Verify response was recorded with unfamiliarTopic: true
      const loaded = StorageAdapter.loadState();
      const recordedResp = loaded.assessmentState?.responses.find(
        (r) => r.attemptId === attempt.id && r.itemId === BASELINE_ASSESSMENT_ITEMS[0].id
      );
      expect(recordedResp).toBeDefined();
      expect(recordedResp?.response).toBe(0);
      expect(recordedResp?.unfamiliarTopic).toBe(true);
    });

    it('allows learner to simultaneously select an answer, record confidence, and toggle topic unfamiliarity without penalty or field collisions', () => {
      const state = getDefaultStorageState() as AppExtendedStorageState;
      state.userSettings.onboardingCompleted = true;

      const testItem = BASELINE_ASSESSMENT_ITEMS[0];
      const attempt: AssessmentAttempt = {
        id: 'asm-test-simultaneous',
        definitionId: 'baseline-diagnostic-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        timeLimitSeconds: 10800,
        seed: 'simultaneous-seed',
        selectedItemIds: [testItem.id],
      };
      state.assessmentState = {
        attempts: [attempt],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          pendingSunday: false,
        },
      };
      StorageAdapter.saveState(state);

      window.location.hash = '#/assessment';

      render(
        <PlacementProvider>
          <AssessmentRunnerView />
        </PlacementProvider>
      );

      // 1. Select answer option
      const options = screen.getAllByRole('radio');
      act(() => {
        fireEvent.click(options[0]);
      });

      // 2. Select confidence
      const confidenceBtns = screen.getAllByRole('button');
      const somewhatBtn = confidenceBtns.find((b) => b.textContent?.includes('Somewhat confident'));
      expect(somewhatBtn).toBeDefined();
      act(() => {
        fireEvent.click(somewhatBtn!);
      });

      // 3. Check unfamiliarity checkbox
      const checkbox = screen.getByTestId('unfamiliar-topic-checkbox');
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(checkbox).toBeChecked();

      // Verify all three fields are recorded simultaneously in storage without overwriting each other
      const loaded = StorageAdapter.loadState();
      const recordedResp = loaded.assessmentState?.responses.find(
        (r) => r.attemptId === attempt.id && r.itemId === testItem.id
      );
      expect(recordedResp).toBeDefined();
      expect(recordedResp?.response).toBe(0);
      expect(recordedResp?.responseConfidence).toBe('somewhat');
      expect(recordedResp?.unfamiliarTopic).toBe(true);

      // Verify evaluation credit: if answer matches key, scoredCredit is 1.0 (no arbitrary scoring penalty)
      if (testItem.key === 0) {
        expect(recordedResp?.result).toBe('correct');
        expect(recordedResp?.scoredCredit).toBe(1.0);
      }
    });

    it('loads legacy assessment state safely without unfamiliarTopic field', () => {
      const legacyState = getDefaultStorageState() as AppExtendedStorageState;
      const legacyResp: AssessmentResponse = {
        id: 'legacy-resp-1',
        attemptId: 'att-1',
        itemId: BASELINE_ASSESSMENT_ITEMS[0].id,
        response: 1,
        result: 'correct',
        timeSpentSeconds: 20,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        // unfamiliarTopic is omitted as in older schemas
      };
      const legacyAttempt: AssessmentAttempt = {
        id: 'att-1',
        definitionId: 'baseline-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: new Date().toISOString(),
        timeLimitSeconds: 7200,
        seed: 'test-seed',
        selectedItemIds: [BASELINE_ASSESSMENT_ITEMS[0].id],
      };
      legacyState.assessmentState = {
        attempts: [legacyAttempt],
        responses: [legacyResp],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          pendingSunday: false,
        },
      };

      StorageAdapter.saveState(legacyState);
      const loaded = StorageAdapter.loadState();
      expect(loaded.assessmentState?.responses[0].id).toBe('legacy-resp-1');
      expect(loaded.assessmentState?.responses[0].unfamiliarTopic).toBeUndefined();
    });
  });

  // --- Phase 6: JSON Export/Import Roundtrip ---
  describe('Phase 6: Storage & Backup Serialization Integrity', () => {
    it('roundtrips onboarding status, dismissal flag, and response unfamiliarity through JSON backup', () => {
      const state = buildAuthenticBaselineState();
      state.userSettings.onboardingCompleted = true;
      state.userSettings.diagnosticDismissed = true;
      state.assessmentState!.responses.push({
        id: 'resp-unfamiliar-test',
        attemptId: state.assessmentState!.attempts[0].id,
        itemId: BASELINE_ASSESSMENT_ITEMS[0].id,
        response: 0,
        result: 'correct',
        timeSpentSeconds: 25,
        errorCategories: [],
        scoredCredit: 1.0,
        weightApplied: 1.0,
        unfamiliarTopic: true,
      });

      StorageAdapter.saveState(state);

      // Export JSON backup
      const exportedJson = StorageAdapter.exportJSON(state);
      expect(exportedJson).toContain('"onboardingCompleted": true');
      expect(exportedJson).toContain('"diagnosticDismissed": true');
      expect(exportedJson).toContain('"unfamiliarTopic": true');

      // Clear storage
      localStorage.clear();

      // Re-import JSON backup
      const importResult = StorageAdapter.importJSON(exportedJson);
      expect(importResult.success).toBe(true);

      const reloaded = StorageAdapter.loadState();
      expect(reloaded.userSettings.onboardingCompleted).toBe(true);
      expect(reloaded.userSettings.diagnosticDismissed).toBe(true);
      expect(reloaded.assessmentState?.responses[0].unfamiliarTopic).toBe(true);
    });
  });
});
