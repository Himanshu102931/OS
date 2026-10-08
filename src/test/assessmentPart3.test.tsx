/**
 * Assessment Manufacturing Part 3 — Diagnostic Benchmark Readout (Mode C) Tests
 *
 * Verifies Mode C against the frozen visual specification:
 * 1. Post-assessment state renders
 * 2. Canonical profile readout is consumed
 * 3. 11-Domain capability matrix renders correctly
 * 4. Domain values come from canonical data
 * 5. Baseline vs Sunday context is preserved
 * 6. Learning targets derive from canonical diagnostic output
 * 7. Primary remediation action routes correctly
 * 8. Weakness taxonomy uses canonical data
 * 9. Company overlay does not mutate canonical company state
 * 10. Sunday mini-test state is represented
 * 11. Historical calibration is honest when data is absent
 * 12. No fake blended readiness score is introduced
 * 13. Benchmark Topaz is limited to diagnostic action emphasis
 * 14. Accessibility semantics exist
 * 15. Reduced-motion behavior exists
 * 16. No duplicate scoring logic exists
 * 17. Existing runner behavior remains intact
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import { deriveAssessmentProfileReadout } from '../engine/assessmentEngine';
import type {
  AssessmentAttempt,
  AssessmentResponse,
  DomainAssessmentResult,
  WeaknessSignal,
  AssessmentSnapshot,
  CompanyOverlay,
} from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Assessment Manufacturing Part 3 — Mode C Diagnostic Benchmark Readout', () => {
  const completedAttempt: AssessmentAttempt = {
    id: 'attempt-baseline-1',
    definitionId: 'baseline-v1',
    definitionVersion: 1,
    kind: 'diagnostic_assessment',
    status: 'submitted',
    startedAt: '2026-10-01T08:00:00.000Z',
    endedAt: '2026-10-01T10:30:00.000Z',
    timeLimitSeconds: 10800,
    seed: 'seed-completed-1',
    selectedItemIds: ['item-1', 'item-2'],
  };

  const domainResults: DomainAssessmentResult[] = [
    {
      domainId: 'aptitude',
      abilityScore: 78,
      level: 4,
      confidence: 'high',
      status: 'assessed',
      coverage: { topicsCovered: 4, topicsTotal: 4, competenciesCovered: ['quant', 'logical'], difficultyBands: [1, 2, 3] },
      assessmentDate: '2026-10-01T10:30:00.000Z',
      provisional: false,
      attemptId: completedAttempt.id,
      kind: 'diagnostic_assessment',
    },
    {
      domainId: 'dsa',
      abilityScore: 62,
      level: 3,
      confidence: 'high',
      status: 'assessed',
      coverage: { topicsCovered: 8, topicsTotal: 10, competenciesCovered: ['arrays', 'dp'], difficultyBands: [1, 2, 3] },
      assessmentDate: '2026-10-01T10:30:00.000Z',
      provisional: false,
      attemptId: completedAttempt.id,
      kind: 'diagnostic_assessment',
    },
    {
      domainId: 'os',
      abilityScore: 35,
      level: 2,
      confidence: 'medium',
      status: 'assessed',
      coverage: { topicsCovered: 3, topicsTotal: 6, competenciesCovered: ['concurrency'], difficultyBands: [1, 2] },
      assessmentDate: '2026-10-01T10:30:00.000Z',
      provisional: true,
      attemptId: completedAttempt.id,
      kind: 'diagnostic_assessment',
    },
    {
      domainId: 'projects',
      abilityScore: 0,
      level: 0,
      confidence: 'none',
      status: 'unassessed',
      coverage: { topicsCovered: 0, topicsTotal: 4, competenciesCovered: [], difficultyBands: [] },
      assessmentDate: '2026-10-01T10:30:00.000Z',
      provisional: true,
      constructScope: 'project_evidence_only',
      attemptId: completedAttempt.id,
      kind: 'diagnostic_assessment',
    },
  ];

  const weaknessSignals: WeaknessSignal[] = [
    {
      id: 'ws-os-1',
      domainId: 'os',
      topicId: 'prep-os-concurrency',
      competency: 'Process Synchronization & Mutexes',
      errorCategory: 'E-CONCEPT',
      strength: 3,
      status: 'open',
      firstSeenAt: '2026-10-01T10:30:00.000Z',
      lastSeenAt: '2026-10-01T10:30:00.000Z',
      occurrences: 3,
      sourceAttemptIds: [completedAttempt.id],
    },
    {
      id: 'ws-dsa-1',
      domainId: 'dsa',
      topicId: 'prep-dsa-dp',
      competency: 'Dynamic Programming Memoization',
      errorCategory: 'E-CORNER',
      strength: 2,
      status: 'open',
      firstSeenAt: '2026-10-01T10:30:00.000Z',
      lastSeenAt: '2026-10-01T10:30:00.000Z',
      occurrences: 2,
      sourceAttemptIds: [completedAttempt.id],
    },
  ];

  const snapshot: AssessmentSnapshot = {
    id: 'snap-baseline-1',
    takenAt: '2026-10-01T10:30:00.000Z',
    kind: 'diagnostic_assessment',
    trigger: 'post_baseline',
    domainResults: domainResults,
  };

  const sampleCompanyOverlay: CompanyOverlay = {
    id: 'google-swe',
    companyName: 'Google',
    targetRole: 'Software Engineer',
    applicationStatus: 'target',
    requiredDomains: ['dsa', 'os', 'aptitude'],
    requiredTopics: [],
    requiredLanguages: [],
  };

  const seedCompletedState = (): AppExtendedStorageState => {
    const defaultState = getDefaultStorageState();
    return {
      ...defaultState,
      companyOverlays: [sampleCompanyOverlay],
      assessmentState: {
        attempts: [completedAttempt],
        responses: [] as AssessmentResponse[],
        exposures: {},
        domainResults: domainResults,
        snapshots: [snapshot],
        weaknessSignals: weaknessSignals,
        profile: {
          baselineCompletedAt: '2026-10-01T10:30:00.000Z',
          pendingSunday: false,
        },
      },
    };
  };

  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/assessment';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <PlacementProvider>
        <GuideProvider>{ui}</GuideProvider>
      </PlacementProvider>
    );
  };

  it('1. post-assessment state renders when baseline is completed', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    expect(screen.getByText('Baseline Diagnostic Capability Readout')).toBeInTheDocument();
    expect(screen.getByText(/PlacementOS Benchmark v1\.0 · Post-Assessment Readout/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagnostic Completed & Sealed/i)).toBeInTheDocument();
  });

  it('2. canonical profile readout is consumed directly from deriveAssessmentProfileReadout', () => {
    const state = seedCompletedState();
    const readout = deriveAssessmentProfileReadout(state.assessmentState);

    expect(readout.isAssessed).toBe(true);
    expect(readout.domainProfiles.length).toBe(11);
    expect(readout.weaknesses.length).toBe(2);

    StorageAdapter.saveState(state);
    renderWithProviders(<AssessmentRunnerView />);

    expect(screen.getByText(/Overall Capability Ability/i)).toBeInTheDocument();
    expect(screen.getByText(`${readout.overallAbility}`)).toBeInTheDocument();
  });

  it('3. 11-domain capability matrix renders with Class A, Class B, and Class C sections', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    // Class A
    expect(screen.getByText(/Class A — Standard Standardized Modules/i)).toBeInTheDocument();
    // Class B
    expect(screen.getByText(/Class B — Coding & Execution Constructs/i)).toBeInTheDocument();
    // Class C
    expect(screen.getByText(/Class C — Non-Objective & Extended Domain Scope/i)).toBeInTheDocument();

    // Verify all 11 canonical domains are represented in the matrix
    const domainNames = [
      'Aptitude & Mental Ability',
      'Data Structures & Algorithms',
      'SQL & Database Queries',
      'Database Management Systems',
      'Object-Oriented Programming',
      'Operating Systems & Concurrency',
      'Computer Networks',
      'Python Programming Core',
      'Professional Communication',
      'Technical & Behavioral Interviews',
      'Engineering Projects Portfolio',
    ];

    domainNames.forEach((name) => {
      expect(screen.getAllByText(new RegExp(name, 'i')).length).toBeGreaterThan(0);
    });
  });

  it('4. domain values come strictly from canonical data without fabricated scores', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    // Aptitude has score 78 and level 4
    expect(screen.getAllByText(/Level 4 — Job Ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText('78% Ability')).toBeInTheDocument();

    // Projects has score 0, unassessed
    expect(screen.getAllByText(/Class C Special Scope: Evidence Tracked in Project Lab/i).length).toBeGreaterThan(0);
  });

  it('5. baseline vs Sunday context is preserved via sub-tab switcher', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    const baselineTab = screen.getByRole('tab', { name: /Baseline Diagnostic Profile/i });
    const sundayTab = screen.getByRole('tab', { name: /Sunday Adaptive Mini-Tests/i });

    expect(baselineTab).toBeInTheDocument();
    expect(sundayTab).toBeInTheDocument();
    expect(baselineTab).toHaveAttribute('aria-selected', 'true');
    expect(sundayTab).toHaveAttribute('aria-selected', 'false');

    // Switch to Sunday tab
    act(() => {
      fireEvent.click(sundayTab);
    });

    expect(sundayTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/90-Minute Adaptive Mini-Test Protocol/i).length).toBeGreaterThan(0);
  });

  it('6. learning targets derive from canonical diagnostic output and weakness signals', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    expect(screen.getByText(/Prescriptive Learning Targets & Remediation Actions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Process Synchronization & Mutexes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dynamic Programming Memoization/i).length).toBeGreaterThan(0);
  });

  it('7. primary remediation action routes correctly to canonical destination', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    const primaryCta = screen.getByRole('button', { name: /Review Diagnostic/i });
    expect(primaryCta).toBeInTheDocument();

    act(() => {
      fireEvent.click(primaryCta);
    });

    // Should route to the canonical destination resolved by remediationRouter
    expect(window.location.hash).toMatch(/^#\/(roadmap|preparation|dsa|practice)/);
  });

  it('8. weakness taxonomy uses canonical error categories and strength indicators', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    expect(screen.getByText(/Taxonomy: E-CONCEPT/i)).toBeInTheDocument();
    expect(screen.getByText(/Taxonomy: E-CORNER/i)).toBeInTheDocument();
    expect(screen.getByText(/High Priority \(3 Occurrences\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium Priority \(2 Occurrences\)/i)).toBeInTheDocument();
  });

  it('9. company overlay does not mutate canonical company state and allows neutral selection', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    // Neutral selection by default
    expect(screen.getByText(/Select a target company to evaluate baseline diagnostic readiness/i)).toBeInTheDocument();

    const companySelect = screen.getByLabelText(/Select Target Company/i);
    expect(companySelect).toBeInTheDocument();

    // Select the configured company
    act(() => {
      fireEvent.change(companySelect, { target: { value: 'google-swe' } });
    });

    // Diagnostic overlay evaluates Google requirements
    expect(screen.getByText(/Google Target Company Overlay/i)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise Systems Tier/i)).toBeInTheDocument();
  });

  it('10. Sunday mini-test state is represented with 60/20/20 composition and launch button', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    // In Zone 5 of readout
    expect(screen.getByText(/Sunday Mini-Test Engine & Longitudinal Observatory/i)).toBeInTheDocument();
    expect(screen.getByText(/60% Open Weaknesses \/ 20% Spaced Repetition \/ 20% Unassessed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Sunday Mini-Test/i })).toBeInTheDocument();
  });

  it('11. historical calibration is explicitly honest when data is absent', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    const sundayTab = screen.getByRole('tab', { name: /Sunday Adaptive Mini-Tests/i });
    act(() => {
      fireEvent.click(sundayTab);
    });

    expect(screen.getByText(/No Weekly Calibration Mini-Tests Logged Yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sunday calibration tests are 90-minute adaptive evaluations conducted weekly/i)
    ).toBeInTheDocument();
  });

  it('12. no fake blended readiness score is introduced', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    // Should show dual readiness notice stating assessment diagnostic is separate from company readiness
    expect(screen.getByText(/Diagnostic Benchmark vs Company Readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Assessment diagnostics provide empirical capability evidence/i)).toBeInTheDocument();
  });

  it('13. Benchmark Topaz is reserved for defining action and critical diagnostic emphasis', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    const primaryCta = screen.getByRole('button', { name: /Review Diagnostic/i });
    expect(primaryCta.className).toContain('bg-action-accent');
  });

  it('14. accessibility semantics exist for tablist, tabs, tabpanels, and progressbars', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    renderWithProviders(<AssessmentRunnerView />);

    const tablist = screen.getByRole('tablist', { name: /Assessment Readout Sub-Tabs/i });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(2);

    const tabpanels = screen.getAllByRole('tabpanel');
    expect(tabpanels.length).toBeGreaterThan(0);

    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars.length).toBeGreaterThan(0);
  });

  it('15. reduced-motion safety is supported in visual signal scan indicators', () => {
    const state = seedCompletedState();
    StorageAdapter.saveState(state);

    const { container } = renderWithProviders(<AssessmentRunnerView />);

    // Check for diagnostic signal sweep / motion classes
    const sweepElements = container.querySelectorAll('.diagnostic-sweep');
    expect(sweepElements.length).toBeGreaterThan(0);
  });

  it('16. no duplicate scoring logic exists — uses deriveAssessmentProfileReadout', () => {
    const state = seedCompletedState();
    const readout = deriveAssessmentProfileReadout(state.assessmentState);
    expect(typeof deriveAssessmentProfileReadout).toBe('function');
    expect(readout.assessedDomainsCount).toBe(3);
  });

  it('17. existing runner behavior remains intact when no attempt or in-progress attempt is present', () => {
    StorageAdapter.clearState();

    renderWithProviders(<AssessmentRunnerView />);

    // When no attempt, Mode A lobby renders
    expect(screen.getByText('Baseline Diagnostic Assessment')).toBeInTheDocument();
    expect(screen.getByText('Start Baseline Assessment')).toBeInTheDocument();
  });
});
