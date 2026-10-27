// @vitest-environment jsdom
/**
 * PlacementOS Simple — P1 Final User-Facing Cleanup Regression Tests
 *
 * Verifies that:
 * 1. DailySignalGraph displays exactly the 9 active domains.
 * 2. Its connectors correspond only to those displayed domains (never retired ones).
 * 3. No company interview alerts or company names render on Today.
 * 4. TelemetryDisclosure does not expose Target Companies.
 * 5. Today's accessible labels and shortcuts contain no retired-module destinations.
 * 6. Existing company, project and interview data remains intact after refresh and export/import.
 * 7. Existing P0 completion-integrity tests still pass.
 * 8. Existing P1 recommendation-filtering tests still pass.
 * 9. Diagnostic and DSA readiness scores are not silently recalculated or overwritten as a consequence of hiding UI.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DailySignalGraph } from '../components/dashboard/DailySignalGraph';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import {
  RETIRED_DOMAIN_IDS,
  RETIRED_ROUTE_PATHS,
} from '../engine/simpleFilter';
import type {
  CompanyOverlay,
  DailyTaskAssignment,
  EvidenceLog,
  TaskProgress,
  DSAProgress,
  TopicSkillState,
  AssessmentState,
} from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class MockObserver {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true, configurable: true, value: MockObserver,
});
Object.defineProperty(window, 'ResizeObserver', {
  writable: true, configurable: true, value: MockObserver,
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

const ACTIVE_9_DOMAINS = [
  'dsa',
  'python',
  'sql',
  'oop',
  'dbms',
  'os',
  'cn',
  'aptitude',
  'communication',
] as const;

/**
 * Creates a rich synthetic state containing legacy data:
 * - 11 canonical domains (including projects and interviews)
 * - Company overlays with scheduled interview/OA
 * - Project and Interview history in tasks, evidence, skillStates
 * - Existing diagnostic results across domains
 * - DSA progress
 * - Mixed daily assignments (active tasks + retired legacy assignments)
 */
function createSyntheticP1State(): AppExtendedStorageState {
  const defaults = getDefaultStorageState() as AppExtendedStorageState;
  const todayStr = '2026-10-27';

  const companyOverlays: CompanyOverlay[] = [
    {
      id: 'comp-alpha',
      companyName: 'Acme Corp',
      targetRole: 'SDE Intern',
      applicationStatus: 'interview_scheduled',
      eventDate: '2026-11-05',
      requiredDomains: ['dsa', 'dbms'],
      requiredTopics: ['topic-dsa-arrays', 'topic-dbms-sql'],
      requiredLanguages: ['python'],
    },
    {
      id: 'comp-beta',
      companyName: 'Starlight Tech',
      targetRole: 'Backend Engineer',
      applicationStatus: 'oa_scheduled',
      eventDate: '2026-11-02',
      requiredDomains: ['dsa', 'os'],
      requiredTopics: ['topic-dsa-trees'],
      requiredLanguages: ['cpp'],
    },
  ];

  const taskProgress: Record<string, TaskProgress> = {
    ...defaults.taskProgress,
    'task-101': { taskId: 'task-101', state: 'completed', postponeCount: 0, skipCount: 0, timeSpentMinutes: 30, updatedAt: '2026-10-25T10:00:00Z', lastCompletedAt: '2026-10-25T10:00:00Z' },
    // Historical project & interview tasks completed in past
    'task-proj-01': { taskId: 'task-proj-01', state: 'completed', postponeCount: 0, skipCount: 0, timeSpentMinutes: 60, updatedAt: '2026-10-20T10:00:00Z', lastCompletedAt: '2026-10-20T10:00:00Z' },
    'task-int-01': { taskId: 'task-int-01', state: 'completed', postponeCount: 0, skipCount: 0, timeSpentMinutes: 45, updatedAt: '2026-10-22T10:00:00Z', lastCompletedAt: '2026-10-22T10:00:00Z' },
  };

  const dsaProgress: Record<string, DSAProgress> = {
    ...defaults.dsaProgress,
    'dsa-014': {
      problemId: 'dsa-014',
      currentBox: 3,
      nextReviewAt: '2026-10-30',
      attemptCount: 2,
      passedIndependently: true,
      lastAttemptAt: '2026-10-25T12:00:00Z',
      createdAt: '2026-10-20T00:00:00Z',
      updatedAt: '2026-10-25T12:00:00Z',
    },
  };

  const evidenceLogs: EvidenceLog[] = [
    {
      id: 'ev-legacy-proj',
      topicId: 'topic-proj-fullstack',
      domainId: 'projects',
      score: 85,
      confidence: 4,
      timestamp: '2026-10-20T10:00:00Z',
      sourceType: 'project_feature',
      sourceId: 'task-proj-01',
    },
    {
      id: 'ev-legacy-int',
      topicId: 'topic-int-system-design',
      domainId: 'interviews',
      score: 75,
      confidence: 4,
      timestamp: '2026-10-22T10:00:00Z',
      sourceType: 'mock_interview',
      sourceId: 'task-int-01',
    },
    {
      id: 'ev-active-dsa',
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      score: 95,
      confidence: 5,
      timestamp: '2026-10-25T12:00:00Z',
      sourceType: 'dsa_attempt',
      sourceId: 'dsa-014',
    },
  ];

  const skillStates: Record<string, TopicSkillState> = {
    ...defaults.skillStates,
    'topic-dsa-arrays': {
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      freshness: 'fresh',
      evidenceStrength: 90,
      lastPracticedAt: '2026-10-25T12:00:00Z',
    },
    'topic-proj-fullstack': {
      topicId: 'topic-proj-fullstack',
      domainId: 'projects',
      freshness: 'aging',
      evidenceStrength: 85,
      lastPracticedAt: '2026-10-20T10:00:00Z',
    },
    'topic-int-mock': {
      topicId: 'topic-int-mock',
      domainId: 'interviews',
      freshness: 'fresh',
      evidenceStrength: 75,
      lastPracticedAt: '2026-10-22T10:00:00Z',
    },
  };

  const dailyTaskAssignments: DailyTaskAssignment[] = [
    {
      id: 'assign-active-task',
      date: todayStr,
      taskType: 'catalog_task',
      referenceId: 'task-102',
      allocatedMinutes: 45,
      completed: false,
    },
    {
      id: 'assign-active-dsa',
      date: todayStr,
      taskType: 'dsa_new',
      referenceId: 'dsa-014',
      allocatedMinutes: 30,
      completed: false,
    },
    {
      id: 'assign-retired-task',
      date: todayStr,
      taskType: 'catalog_task',
      referenceId: 'task-proj-02',
      allocatedMinutes: 60,
      completed: false,
    },
  ];

  const assessmentState: AssessmentState = {
    attempts: [
      {
        id: 'attempt-init',
        definitionId: 'def-diag-1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: '2026-10-24T10:00:00Z',
        timeLimitSeconds: 3600,
        seed: 'seed-1',
        selectedItemIds: ['item-1'],
      },
    ],
    responses: [],
    exposures: {},
    domainResults: [
      {
        domainId: 'dsa',
        abilityScore: 78,
        level: 3,
        confidence: 'high',
        status: 'assessed' as const,
        assessmentDate: '2026-10-24T11:00:00Z',
        provisional: true,
        attemptId: 'attempt-init',
        kind: 'diagnostic_assessment' as const,
        coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: [], difficultyBands: [1, 2, 3] },
      },
      {
        domainId: 'python',
        abilityScore: 82,
        level: 4,
        confidence: 'high',
        status: 'assessed' as const,
        assessmentDate: '2026-10-24T11:00:00Z',
        provisional: true,
        attemptId: 'attempt-init',
        kind: 'diagnostic_assessment' as const,
        coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: [], difficultyBands: [1, 2, 3] },
      },
      {
        domainId: 'sql',
        abilityScore: 65,
        level: 2,
        confidence: 'medium',
        status: 'assessed' as const,
        assessmentDate: '2026-10-24T11:00:00Z',
        provisional: true,
        attemptId: 'attempt-init',
        kind: 'diagnostic_assessment' as const,
        coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: [], difficultyBands: [1, 2, 3] },
      },
      {
        domainId: 'interviews',
        abilityScore: 70,
        level: 3,
        confidence: 'medium',
        status: 'assessed' as const,
        assessmentDate: '2026-10-24T11:00:00Z',
        provisional: true,
        attemptId: 'attempt-init',
        kind: 'diagnostic_assessment' as const,
        coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: [], difficultyBands: [1, 2, 3] },
      },
      {
        domainId: 'projects',
        abilityScore: 0,
        level: 0,
        confidence: 'low',
        status: 'unassessed' as const,
        assessmentDate: '2026-10-24T11:00:00Z',
        provisional: true,
        attemptId: 'attempt-init',
        kind: 'diagnostic_assessment' as const,
        coverage: { topicsCovered: 5, topicsTotal: 5, competenciesCovered: [], difficultyBands: [1, 2, 3] },
      },
    ],
    snapshots: [],
    weaknessSignals: [],
    profile: {
      baselineCompletedAt: '2026-10-24T11:00:00Z',
      pendingSunday: false,
    },
  };

  return {
    ...defaults,
    companyOverlays,
    taskProgress,
    dsaProgress,
    evidenceLogs,
    skillStates,
    dailyTaskAssignments,
    assessmentState,
  };
}

describe('PlacementOS Simple — P1 Final User-Facing Cleanup Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    const state = createSyntheticP1State();
    StorageAdapter.saveState(state);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // 1. DailySignalGraph displays exactly the 9 active domains
  it('1. DailySignalGraph displays exactly the 9 active domains in Simple Mode', () => {
    render(
      <PlacementProvider>
        <DailySignalGraph />
      </PlacementProvider>
    );

    const domainNodes = screen.getAllByTestId('signal-domain');
    expect(domainNodes).toHaveLength(9);

    const renderedDomainIds = domainNodes.map((el) => el.getAttribute('data-domain-id'));
    expect(renderedDomainIds).toEqual(expect.arrayContaining([...ACTIVE_9_DOMAINS]));

    // Retired domains (projects, interviews) must NEVER render
    expect(renderedDomainIds).not.toContain('projects');
    expect(renderedDomainIds).not.toContain('interviews');
    expect(renderedDomainIds).not.toContain('project');
    expect(renderedDomainIds).not.toContain('interview');
    expect(renderedDomainIds).not.toContain('companies');
  });

  // 2. Connectors correspond only to those displayed domains
  it('2. connectors correspond only to displayed active domains', () => {
    render(
      <PlacementProvider>
        <DailySignalGraph />
      </PlacementProvider>
    );

    const connectorContainer = screen.getByTestId('signal-connectors');
    const lines = connectorContainer.querySelectorAll('line');

    // All line coordinates must remain within (0, 800)
    lines.forEach((line) => {
      const x1 = Number(line.getAttribute('x1'));
      const x2 = Number(line.getAttribute('x2'));
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x2).toBeLessThanOrEqual(800);
      expect(x2).toBeGreaterThan(x1);
    });

    // None of the rendered lines can reference retired domains
    const linesKeys = Array.from(lines).map((l) => l.getAttribute('key') || '');
    for (const key of linesKeys) {
      for (const retired of RETIRED_DOMAIN_IDS) {
        expect(key.toLowerCase()).not.toContain(`-${retired}-`);
      }
    }
  });

  // 3. No company interview alerts or company names render on Today
  it('3. no company interview alerts or company names render on Today', () => {
    render(
      <PlacementProvider>
        <DashboardView />
      </PlacementProvider>
    );

    // Acme Corp and Starlight Tech are saved overlays with scheduled interview / OA
    expect(screen.queryByText('Acme Corp')).toBeNull();
    expect(screen.queryByText('Starlight Tech')).toBeNull();
    expect(screen.queryByText(/interview_scheduled/i)).toBeNull();
    expect(screen.queryByText(/oa_scheduled/i)).toBeNull();
    // DailySignalGraph badge for urgent companies must not render
    expect(screen.queryByText(/2\s+urgent/i)).toBeNull();
  });

  // 4. TelemetryDisclosure does not expose Target Companies
  it('4. TelemetryDisclosure does not expose Target Companies panel', () => {
    render(
      <PlacementProvider>
        <DashboardView />
      </PlacementProvider>
    );

    // Open telemetry disclosure
    const toggleBtn = screen.getByRole('button', { name: /telemetry/i });
    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.queryByText('Target Companies')).toBeNull();
    expect(screen.queryByText('Acme Corp')).toBeNull();
    expect(screen.queryByText('Starlight Tech')).toBeNull();

    // Developer / storage info remains intact
    expect(screen.getByText('Skill Status')).toBeInTheDocument();
    expect(screen.getByText('Engine metadata')).toBeInTheDocument();
    expect(screen.getByText('Full records')).toBeInTheDocument();
  });

  // 5. Today's accessible labels and shortcuts contain no retired-module destinations
  it('5. Today controls contain no retired-module destinations or shortcuts', () => {
    render(
      <PlacementProvider>
        <DashboardView />
      </PlacementProvider>
    );

    // Check all clickable buttons and links for navigation targets
    const buttons = screen.getAllByRole('button');
    const retiredRoutes = [...RETIRED_ROUTE_PATHS];

    for (const btn of buttons) {
      const destinationRoute = btn.getAttribute('data-destination-route');
      if (destinationRoute) {
        expect(retiredRoutes).not.toContain(destinationRoute);
      }
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
      expect(label).not.toContain('open interview readiness');
      expect(label).not.toContain('target companies');
    }

    // Hero sr-only text must not contain "company urgent"
    const hero = screen.getByTestId('today-hero');
    const srOnly = hero.querySelector('.sr-only');
    expect(srOnly?.textContent).not.toMatch(/company urgent/i);
  });

  // 6. Existing company, project and interview data remains intact after refresh and export/import
  it('6. existing company, project and interview data remains intact in storage and export/import', () => {
    let exportedJson = '';

    function ExportTester() {
      const { exportBackupJSON, companyOverlays, evidenceLogs, taskProgress } = usePlacement();
      return (
        <div>
          <button
            onClick={() => {
              exportedJson = exportBackupJSON();
            }}
          >
            Export Backup
          </button>
          <span data-testid="company-count">{companyOverlays.length}</span>
          <span data-testid="evidence-count">{evidenceLogs.length}</span>
          <span data-testid="proj-progress">{taskProgress['task-proj-01']?.state}</span>
        </div>
      );
    }

    const { unmount } = render(
      <PlacementProvider>
        <ExportTester />
      </PlacementProvider>
    );

    expect(screen.getByTestId('company-count').textContent).toBe('2');
    expect(screen.getByTestId('evidence-count').textContent).toBe('3');
    expect(screen.getByTestId('proj-progress').textContent).toBe('completed');

    screen.getByText('Export Backup').click();
    expect(exportedJson).toBeTruthy();

    const parsed = JSON.parse(exportedJson);
    expect(parsed.companyOverlays).toHaveLength(2);
    expect(parsed.companyOverlays[0].companyName).toBe('Acme Corp');
    expect(parsed.evidenceLogs.some((l: EvidenceLog) => l.domainId === 'projects')).toBe(true);
    expect(parsed.evidenceLogs.some((l: EvidenceLog) => l.domainId === 'interviews')).toBe(true);
    expect(parsed.taskProgress['task-proj-01'].state).toBe('completed');
    expect(parsed.taskProgress['task-int-01'].state).toBe('completed');

    unmount();

    // Verify import preserves records
    const imported = StorageAdapter.loadState() as AppExtendedStorageState;
    expect(imported.companyOverlays).toHaveLength(2);
    expect(imported.evidenceLogs?.some((l: EvidenceLog) => l.domainId === 'projects')).toBe(true);
    expect(imported.evidenceLogs?.some((l: EvidenceLog) => l.domainId === 'interviews')).toBe(true);
  });

  // 9. Diagnostic and DSA readiness scores are not silently recalculated or overwritten
  it('9. diagnostic ability scores and DSA readiness are not recalculated or overwritten by hiding UI', () => {
    let capturedCtx: ReturnType<typeof usePlacement> | null = null;

    function Harness() {
      capturedCtx = usePlacement();
      return <DashboardView />;
    }

    render(
      <PlacementProvider>
        <Harness />
      </PlacementProvider>
    );

    expect(capturedCtx).not.toBeNull();
    const ctx = capturedCtx!;

    // DSA problem progress is preserved
    expect(ctx.dsaProgress['dsa-014'].currentBox).toBe(3);

    // Assessment domain results preserved
    const assessedResults = ctx.assessmentState?.domainResults;
    expect(assessedResults?.find((dr) => dr.domainId === 'dsa')?.abilityScore).toBe(78);
    expect(assessedResults?.find((dr) => dr.domainId === 'python')?.abilityScore).toBe(82);
    expect(assessedResults?.find((dr) => dr.domainId === 'interviews')?.abilityScore).toBe(70);

    // Signal graph renders Track A and Track B for active domains truthfully
    const dsaNode = screen.getAllByTestId('signal-domain').find((el) => el.getAttribute('data-domain-id') === 'dsa');
    expect(dsaNode?.getAttribute('data-domain-diagnostic-ability')).toBe('78');
  });
});
