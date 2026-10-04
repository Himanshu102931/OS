// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { DSAView } from '../components/dsa/DSAView';
import { PreparationHubView } from '../components/preparation/PreparationHubView';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { PracticeView } from '../components/practice/PracticeView';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { DashboardView } from '../components/dashboard/DashboardView';
import { StorageAdapter, getDefaultStorageState } from '../storage/storageAdapter';
import { routeWeaknessSignals } from '../engine/weaknessRouter';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import type {
  DomainAssessmentResult,
  WeaknessSignal,
  AssessmentState,
  TopicSkillState,
  PreparationTopicProgress,
} from '../types';

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

describe('UNIFIED CROSS-SUBSYSTEM SESSION HANDOFF & DEEP-LINKING', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // A. Session persistence across route changes
  it('A. Session persistence: preserves session state when navigating away from Dashboard and returning', async () => {
    let capturedSession: ReturnType<typeof useSession> | null = null;
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Inspector() {
      capturedSession = useSession();
      capturedPlacement = usePlacement();
      return (
        <div>
          <span data-testid="route-indicator">{capturedPlacement.currentRoute}</span>
          <span data-testid="completed-count">
            {capturedSession.sessionState?.completedActivityIds.length ?? 0}
          </span>
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Inspector />
        </SessionProvider>
      </PlacementProvider>
    );

    expect(capturedSession).not.toBeNull();
    expect(capturedPlacement).not.toBeNull();

    // Advance first activity to completed
    act(() => {
      capturedSession!.advanceActivity('completed');
    });

    expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(1);
    expect(capturedSession!.sessionState?.currentActivityIndex).toBe(1);

    // Navigate to DSA
    act(() => {
      capturedPlacement!.setRoute('dsa');
    });
    expect(capturedPlacement!.currentRoute).toBe('dsa');

    // Verify session state is still intact
    expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(1);
    expect(capturedSession!.sessionState?.currentActivityIndex).toBe(1);

    // Navigate back to Dashboard
    act(() => {
      capturedPlacement!.setRoute('dashboard');
    });
    expect(capturedPlacement!.currentRoute).toBe('dashboard');

    // Session progress remains preserved
    expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(1);
    expect(capturedSession!.sessionState?.currentActivityIndex).toBe(1);
  });

  // B. DSA deep-link
  it('B. DSA deep-link: opens exact problem attempt modal without manual search', async () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          <DSAView />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Deep-link to dsa-001 (Two Sum)
    act(() => {
      capturedPlacement!.setRoute('dsa', 'dsa-001');
    });

    // Verify attempt modal is open with Two Sum
    const modal = screen.getByTestId('dsa-attempt-modal');
    expect(modal).toBeDefined();
    expect(modal.textContent).toContain('Two Sum');
    expect(modal.textContent).toContain('DSA Attempt Protocol');
  });

  // C. DSA remediation deep-link
  it('C. DSA remediation deep-link: opens remediation workspace when remediationRequired is true', async () => {
    // Seed problem dsa-001 with remediationRequired
    const state = getDefaultStorageState();
    state.dsaProgress['dsa-001'] = {
      problemId: 'dsa-001',
      currentBox: 1,
      attemptCount: 3,
      consecutiveFailures: 2,
      remediationRequired: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    StorageAdapter.saveState(state);

    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          <DSAView />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Deep link to problem with remediationRequired
    act(() => {
      capturedPlacement!.setRoute('dsa', 'dsa-001');
    });

    // Verify TaskLearningWorkspaceDrawer opened for remediation
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Remediation Required/i)).toBeDefined();
    expect(screen.getByText(/Submit Quiz & Clear Remediation/i)).toBeDefined();
  });

  // D. Preparation deep-link
  it('D. Preparation deep-link: opens exact topic workspace', async () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          <PreparationHubView />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Deep link to prep-lang
    act(() => {
      capturedPlacement!.setRoute('preparation', 'prep-lang');
    });

    // TopicWorkspace should be open with the title
    expect(screen.getAllByText('Programming Language (Python)').length).toBeGreaterThan(0);
    expect(screen.getByText(/Core syntax, memory execution/i)).toBeDefined();
  });

  // E. Roadmap deep-link
  it('E. Roadmap deep-link: resolves exact task and opens topic drawer', async () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          {capturedPlacement.currentRoute === 'dashboard' && <DashboardView />}
          {capturedPlacement.currentRoute === 'roadmap' && <RoadmapView />}
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Deep link to task-101
    act(() => {
      capturedPlacement!.setRoute('roadmap', 'task-101');
    });

    // Topic drawer should be open with the resolved task
    expect(screen.getByTestId('topic-detail-drawer')).toBeDefined();
    expect(screen.getByText(/Master Two Pointer Technique on Arrays/i)).toBeDefined();
  });

  // F. Practice deep-link
  it('F. Practice deep-link: opens exact practice session runner modal', async () => {
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          <PracticeView />
        </div>
      );
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

    // PracticeRunnerModal should be open
    const modal = screen.getByTestId('practice-runner-modal');
    expect(modal).toBeDefined();
    expect(modal.textContent).toContain('Quantitative Aptitude Essentials');
  });

  // G. Session continuity across completion
  it('G. Session continuity: completing DSA deep-linked activity advances session and returns to Today', async () => {
    let capturedSession: ReturnType<typeof useSession> | null = null;
    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function TestApp() {
      capturedSession = useSession();
      capturedPlacement = usePlacement();

      return (
        <div>
          {capturedPlacement.currentRoute === 'dashboard' && <DashboardView />}
          {capturedPlacement.currentRoute === 'dsa' && <DSAView />}
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <TestApp />
        </SessionProvider>
      </PlacementProvider>
    );

    expect(capturedPlacement!.currentRoute).toBe('dashboard');
    const initialCompleted = capturedSession!.sessionState?.completedActivityIds.length ?? 0;

    // Deep link to dsa-001
    act(() => {
      capturedPlacement!.setRoute('dsa', 'dsa-001');
    });

    expect(capturedPlacement!.currentRoute).toBe('dsa');
    expect(screen.getByRole('dialog')).toBeDefined();

    // Fill notes and submit attempt
    const notesInput = screen.getByPlaceholderText(/e\.g\. O\(N\) time complexity/i);
    fireEvent.change(notesInput, { target: { value: 'Used hash map in O(n) time' } });

    const submitBtn = screen.getByRole('button', { name: /Log Attempt & Record Evidence/i });
    act(() => {
      fireEvent.click(submitBtn);
    });

    // Should return to dashboard automatically
    expect(capturedPlacement!.currentRoute).toBe('dashboard');

    // Session progress should have advanced
    expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(initialCompleted + 1);
    expect(capturedSession!.sessionState?.currentActivityIndex).toBe(1);
  });

  // H. Assessment confidence routing
  it('H. Assessment confidence routing: medium/high confidence routes to targeted problem rather than low-confidence preparation', () => {
    const lowConfidenceResult: DomainAssessmentResult = {
      attemptId: 'att-1',
      domainId: 'dsa',
      kind: 'diagnostic_assessment',
      status: 'assessed',
      abilityScore: 45,
      confidence: 'low',
      level: 2,
      provisional: true,
      assessmentDate: '2026-10-01T00:00:00Z',
      coverage: {
        topicsCovered: 1,
        topicsTotal: 1,
        competenciesCovered: ['hash_tables'],
        difficultyBands: [1, 2],
      },
    };

    const highConfidenceResult: DomainAssessmentResult = {
      ...lowConfidenceResult,
      confidence: 'high',
      provisional: false,
    };

    const weaknessSignal: WeaknessSignal = {
      id: 'ws-dsa-1',
      domainId: 'dsa',
      topicId: 'topic-dsa-hashtable',
      competency: 'hash_tables',
      errorCategory: 'algorithmic_misapplication',
      strength: 3,
      status: 'open',
      firstSeenAt: '2026-10-01T00:00:00Z',
      lastSeenAt: '2026-10-01T00:00:00Z',
      occurrences: 1,
      sourceAttemptIds: ['att-1'],
    };

    // Unlock prep-coding-ds prerequisites by supplying completed prep-lang
    const prepProgress: Record<string, PreparationTopicProgress> = {
      'prep-lang': {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'apply',
        completedStages: ['orient', 'learn'],
        stageProgress: {
          orient: { timeSpentMinutes: 10, completedAt: '2026-10-01T00:00:00Z' },
          learn: { timeSpentMinutes: 30, completedAt: '2026-10-01T00:00:00Z' },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-01T00:00:00Z',
        totalTimeSpentMinutes: 40,
        evidenceStrength: 60,
        freshness: 'fresh',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    };

    const skillStates: Record<string, TopicSkillState> = {
      'prep-lang': {
        topicId: 'prep-lang',
        domainId: 'python',
        evidenceStrength: 60,
        freshness: 'fresh',
      },
    };

    // Route with low confidence -> routes to preparation
    const lowCandidates = routeWeaknessSignals({
      domainResults: [lowConfidenceResult],
      weaknessSignals: [weaknessSignal],
      dsaProblems: DSA_PROBLEMS,
      preparationTopicProgress: prepProgress,
      skillStates,
    });

    const lowTarget = lowCandidates.find((c) => c.domainId === 'dsa');
    expect(lowTarget).toBeDefined();
    expect(lowTarget?.route).toBe('preparation');

    // Route with high confidence -> routes directly to targeted dsa problem
    const highCandidates = routeWeaknessSignals({
      domainResults: [highConfidenceResult],
      weaknessSignals: [weaknessSignal],
      dsaProblems: DSA_PROBLEMS,
      preparationTopicProgress: prepProgress,
      skillStates,
    });

    const highTarget = highCandidates.find((c) => c.domainId === 'dsa');
    expect(highTarget).toBeDefined();
    expect(highTarget?.route).toBe('dsa');
    expect(highTarget?.type).toBe('dsa_review');
  });

  // I. Assessment -> Today CTA
  it('I. Assessment -> Today: assessment summary renders Continue to Today CTA and routes to dashboard', async () => {
    // Seed a valid assessed state so AssessmentRunnerView renders the capability readout
    const state = getDefaultStorageState();
    const validAssessmentState: AssessmentState = {
      attempts: [
        {
          id: 'baseline-att-1',
          definitionId: 'def-1',
          definitionVersion: 1,
          kind: 'diagnostic_assessment',
          status: 'submitted',
          startedAt: '2026-10-01T10:00:00Z',
          endedAt: '2026-10-01T11:00:00Z',
          timeLimitSeconds: 10800,
          seed: 'seed-1',
          selectedItemIds: ['item-1'],
        },
      ],
      responses: [],
      exposures: {},
      domainResults: [
        {
          attemptId: 'baseline-att-1',
          domainId: 'dsa',
          kind: 'diagnostic_assessment',
          status: 'assessed',
          abilityScore: 80,
          confidence: 'high',
          level: 3,
          provisional: false,
          assessmentDate: '2026-10-01T11:00:00Z',
          coverage: {
            topicsCovered: 1,
            topicsTotal: 1,
            competenciesCovered: ['hash_tables'],
            difficultyBands: [1, 2],
          },
        },
      ],
      snapshots: [],
      weaknessSignals: [],
      calibrationObservations: [],
      profile: {
        baselineCompletedAt: '2026-10-01T11:00:00Z',
        pendingSunday: false,
      },
    };
    state.assessmentState = validAssessmentState;
    StorageAdapter.saveState(state);

    let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedPlacement = usePlacement();
      return (
        <div>
          <AssessmentRunnerView />
        </div>
      );
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <Harness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Find the CTA button
    const ctaButton = screen.getByTestId('continue-to-today-btn');
    expect(ctaButton).toBeDefined();
    expect(ctaButton.textContent).toContain("Continue to Today's Session");

    // Click it
    act(() => {
      fireEvent.click(ctaButton);
    });

    // Check routing
    expect(capturedPlacement!.currentRoute).toBe('dashboard');
  });
});
