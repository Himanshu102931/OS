import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { AssessmentRunnerView } from '../components/assessment/AssessmentRunnerView';
import { DashboardView } from '../components/dashboard/DashboardView';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
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

// Mock storage state representing the authentic baseline diagnostic scenario:
// A user who completed the baseline diagnostic assessment (84 responses, 11 domain results, 24 weaknesses, ability 13/100)
// but has NOT completed any roadmap tasks or DSA problems yet.
function buildReconciledBaselineState(): AppExtendedStorageState {
  const base = getDefaultStorageState() as AppExtendedStorageState;

  const attemptId = 'asm-attempt-baseline-diagnostic-attempt';
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

  const domainDistribution: Record<string, { correct: number; incorrect: number; dont_know: number }> = {
    aptitude: { correct: 9, incorrect: 7, dont_know: 4 },
    dsa: { correct: 0, incorrect: 1, dont_know: 8 },
    python: { correct: 2, incorrect: 4, dont_know: 2 },
    sql: { correct: 1, incorrect: 4, dont_know: 2 },
    dbms: { correct: 2, incorrect: 1, dont_know: 5 },
    oop: { correct: 1, incorrect: 0, dont_know: 6 },
    os: { correct: 1, incorrect: 2, dont_know: 3 },
    cn: { correct: 2, incorrect: 1, dont_know: 3 },
    communication: { correct: 5, incorrect: 3, dont_know: 0 },
    interviews: { correct: 3, incorrect: 1, dont_know: 1 },
  };

  const responses: AssessmentResponse[] = [];
  for (const [domainId, counts] of Object.entries(domainDistribution)) {
    const items = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === domainId);
    items.forEach((item, idx) => {
      let result: 'correct' | 'incorrect' | 'dont_know' = 'dont_know';
      if (idx < counts.correct) result = 'correct';
      else if (idx < counts.correct + counts.incorrect) result = 'incorrect';

      responses.push({
        id: `resp-${attempt.id}-${item.id}`,
        attemptId: attempt.id,
        itemId: item.id,
        response: result === 'correct' ? (item.key ?? 0) : result === 'dont_know' ? 'dont_know' : -1,
        result,
        timeSpentSeconds: 30,
        errorCategories: result === 'incorrect' ? (item.errorCategories.length ? item.errorCategories : ['E-CONCEPT']) : [],
        scoredCredit: result === 'correct' ? 1.0 : 0.0,
        weightApplied: 1.0,
        responseConfidence: 'confident',
      });
    });
  }

  const allDomainIds: DomainId[] = [
    'aptitude', 'dsa', 'python', 'sql', 'dbms',
    'oop', 'os', 'cn', 'communication', 'interviews', 'projects'
  ];

  const domainScores: Record<string, { abilityScore: number; level: 0 | 1 | 2 | 3 | 4 | 5; status: 'assessed' | 'partially_assessed' | 'unassessed'; confidence: 'high' | 'none'; constructScope?: string }> = {
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
    { id: 'ws-apt-1', domainId: 'aptitude' as DomainId, topicId: 'quant-percentages', competency: 'percentages', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-2', domainId: 'aptitude' as DomainId, topicId: 'quant-time-distance', competency: 'time-speed-distance', errorCategory: 'E-APPLY', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-3', domainId: 'aptitude' as DomainId, topicId: 'reasoning-direction-sense', competency: 'direction-sense', errorCategory: 'E-PROCEDURE', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-4', domainId: 'aptitude' as DomainId, topicId: 'quant-averages-mixtures', competency: 'averages', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-5', domainId: 'aptitude' as DomainId, topicId: 'quant-number-systems', competency: 'number-properties', errorCategory: 'E-CALC', strength: 1, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-6', domainId: 'aptitude' as DomainId, topicId: 'reasoning-syllogisms', competency: 'syllogisms', errorCategory: 'E-LOGIC', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-apt-7', domainId: 'aptitude' as DomainId, topicId: 'quant-time-distance', competency: 'relative-speed', errorCategory: 'E-APPLY', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-dsa-1', domainId: 'dsa' as DomainId, topicId: 'dsa-implementation', competency: 'recursion-complexity', errorCategory: 'E-COMPLEXITY', strength: 3, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-py-1', domainId: 'python' as DomainId, topicId: 'py-data-structures', competency: 'lists-dicts', errorCategory: 'E-SYNTAX', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-py-2', domainId: 'python' as DomainId, topicId: 'py-debugging', competency: 'traceback-analysis', errorCategory: 'E-APPLY', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-py-3', domainId: 'python' as DomainId, topicId: 'py-syntax', competency: 'scoping-rules', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-py-4', domainId: 'python' as DomainId, topicId: 'py-logic', competency: 'generators', errorCategory: 'E-LOGIC', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-sql-1', domainId: 'sql' as DomainId, topicId: 'sql-null-semantics', competency: 'null-handling', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-sql-2', domainId: 'sql' as DomainId, topicId: 'sql-group-by', competency: 'aggregations', errorCategory: 'E-SYNTAX', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-sql-3', domainId: 'sql' as DomainId, topicId: 'sql-join', competency: 'outer-joins', errorCategory: 'E-APPLY', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-sql-4', domainId: 'sql' as DomainId, topicId: 'sql-subquery', competency: 'correlated-subqueries', errorCategory: 'E-LOGIC', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-dbms-1', domainId: 'dbms' as DomainId, topicId: 'dbms-architecture', competency: 'acid-properties', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-os-1', domainId: 'os' as DomainId, topicId: 'os-concurrency', competency: 'deadlock-conditions', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-os-2', domainId: 'os' as DomainId, topicId: 'os-memory', competency: 'paging-virtual-memory', errorCategory: 'E-APPLY', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-cn-1', domainId: 'cn' as DomainId, topicId: 'cn-protocols', competency: 'osi-layers', errorCategory: 'E-CONCEPT', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-comm-1', domainId: 'communication' as DomainId, topicId: 'comm-grammar', competency: 'subject-verb-agreement', errorCategory: 'E-GRAMMAR', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-comm-2', domainId: 'communication' as DomainId, topicId: 'comm-grammar', competency: 'tense-consistency', errorCategory: 'E-GRAMMAR', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-comm-3', domainId: 'communication' as DomainId, topicId: 'comm-vocabulary', competency: 'professional-tone', errorCategory: 'E-VOCAB', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
    { id: 'ws-int-1', domainId: 'interviews' as DomainId, topicId: 'interview-star', competency: 'behavioral-structuring', errorCategory: 'E-STRUCTURE', strength: 2, status: 'open' as const, firstSeenAt: completedAt, lastSeenAt: completedAt, occurrences: 1, sourceAttemptIds: [attempt.id] },
  ];

  return {
    ...base,
    lastSavedAt: '2026-10-13T05:33:28.988Z',
    assessmentState: {
      attempts: [attempt],
      responses,
      exposures: {},
      domainResults,
      snapshots: [
        {
          id: `snap-${attempt.kind}-${attempt.id}`,
          takenAt: completedAt,
          kind: attempt.kind,
          trigger: 'post_baseline',
          domainResults,
        },
      ],
      weaknessSignals,
      profile: {
        baselineCompletedAt: completedAt,
        pendingSunday: false,
      },
    },
  };
}

const buildReportedScenarioState = buildReconciledBaselineState;

describe('TASK 173 — Post-Diagnostic Results, Navigation & Dashboard Signal Clarity', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    setupMatchMedia();
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  // --- Requirement 1: Complete domain performance breakdown is discoverable ---
  it('1. provides a discoverable read-only diagnostic results view with complete domain breakdown, raw counts, and coverage', () => {
    const state = buildReportedScenarioState();
    StorageAdapter.saveState(state);

    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    // Capability Matrix is rendered and identified
    const matrix = screen.getByTestId('diagnostic-capability-matrix');
    expect(matrix).toBeInTheDocument();

    // Domain Breakdown jump button exists in benchmark header
    const jumpBtn = screen.getByTestId('jump-to-breakdown-btn');
    expect(jumpBtn).toBeInTheDocument();
    expect(jumpBtn).toHaveTextContent(/Domain Breakdown/i);

    // Check domain capability cards (e.g. DSA, Python, SQL)
    expect(screen.getAllByText(/Data Structures & Algorithms/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Python Programming Core/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SQL & Database Queries/i).length).toBeGreaterThan(0);

    // Raw evaluation counts are rendered (e.g., correct / incorrect / don't-know)
    const dsaCard = screen.getByTestId('capability-row-dsa');
    expect(dsaCard).toBeInTheDocument();
    const rawCounts = within(dsaCard).getByTestId('raw-counts-dsa');
    expect(within(rawCounts).getByText('Correct')).toBeInTheDocument();
    expect(within(rawCounts).getByText('Incorrect')).toBeInTheDocument();
    expect(within(rawCounts).getByText(/Don't Know/i)).toBeInTheDocument();

    // Coverage stats are present
    expect(within(dsaCard).getByText(/Coverage:/i)).toBeInTheDocument();

    // Weaknesses indicator is present
    expect(within(dsaCard).getAllByText(/weakness/i).length).toBeGreaterThan(0);

    // Recommended action button per domain is present
    expect(within(dsaCard).getByRole('button', { name: /Start/i })).toBeInTheDocument();

    // Class C (Projects) is explicitly handled with no fake score and link to Project Lab
    const projectsCard = screen.getByTestId('capability-row-projects');
    expect(within(projectsCard).getByText(/Open Project Lab/i)).toBeInTheDocument();

    // Expandable item breakdown drawer can be opened
    const inspectBtn = within(dsaCard).getByRole('button', { name: /Inspect Item Breakdown/i });
    expect(inspectBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(inspectBtn);
    });

    // Drawer opens showing response details
    const breakdownDrawer = screen.getByTestId('item-breakdown-dsa');
    expect(breakdownDrawer).toBeInTheDocument();
    expect(within(breakdownDrawer).getAllByText(/Q\d+\./i).length).toBeGreaterThan(0);
  });

  // --- Requirement 2 & 3: CTA separation ---
  it('2. separates "Review Diagnostic" (stays on results) and "Start Recommended Task" (routes to canonical roadmap/DSA)', () => {
    const state = buildReportedScenarioState();
    StorageAdapter.saveState(state);

    render(
      <PlacementProvider>
        <AssessmentRunnerView />
      </PlacementProvider>
    );

    // Both buttons exist in the learning targets hero
    const reviewBtn = screen.getByTestId('review-diagnostic-btn');
    const startBtn = screen.getByTestId('start-next-action-btn');

    expect(reviewBtn).toBeInTheDocument();
    expect(reviewBtn).toHaveTextContent('Review Diagnostic');

    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toHaveTextContent('Start Recommended Task');

    // Clicking "Start Recommended Task" routes to roadmap/preparation/dsa
    act(() => {
      fireEvent.click(startBtn);
    });
    expect(window.location.hash).toMatch(/^#\/(roadmap|preparation|dsa|practice)/);

    // Clicking "Review Diagnostic" does not route away to roadmap
    window.location.hash = '#/assessment';
    act(() => {
      fireEvent.click(reviewBtn);
    });
    expect(window.location.hash).toBe('#/assessment');
  });

  // --- Requirement 4 & 5: Today Dashboard distinction and honest labeling ---
  it('4. clearly distinguishes diagnostic ability from practical readiness on Today dashboard', () => {
    const state = buildReportedScenarioState();
    StorageAdapter.saveState(state);

    render(
      <PlacementProvider>
        <DashboardView />
      </PlacementProvider>
    );

    // Signal graph header clearly clarifies practical mastery
    expect(screen.getByText(/Demonstrated Practical Curriculum & DSA Problem Mastery/i)).toBeInTheDocument();

    // Diagnostic status callout is rendered explaining the distinction
    const diagCallout = screen.getByTestId('diagnostic-status-callout');
    expect(diagCallout).toBeInTheDocument();
    expect(diagCallout).toHaveTextContent(/Baseline Diagnostic Completed/i);
    expect(diagCallout).toHaveTextContent(/Ability/i);
    expect(diagCallout).toHaveTextContent(/Graph bars above measure practical mastery/i);

    // The callout provides a button to review diagnostic results
    const reviewBtn = screen.getByTestId('review-diagnostic-today-btn');
    expect(reviewBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(reviewBtn);
    });
    expect(window.location.hash).toBe('#/assessment');
  });

  it('5. unassessed or zero-demonstrated-evidence domains are labeled needs_baseline rather than at_risk', () => {
    const state = buildReportedScenarioState();
    StorageAdapter.saveState(state);

    render(
      <PlacementProvider>
        <DashboardView />
      </PlacementProvider>
    );

    // All domain signal columns in DailySignalGraph
    const domainElements = screen.getAllByTestId('signal-domain');
    expect(domainElements).toHaveLength(11);

    // Since the user has 0 completed tasks and 0 DSA problems solved, each domain's practical readiness is 0%
    // and status MUST be 'needs_baseline' (not 'at_risk')
    for (const el of domainElements) {
      expect(el.getAttribute('data-domain-readiness')).toBe('0');
      expect(el.getAttribute('data-domain-status')).toBe('needs_baseline');
    }
  });

  // --- Requirement 6: Storage and JSON Backup timestamp integrity ---
  it('6. exportBackupJSON stamps current ISO lastSavedAt metadata and preserves sealed records', () => {
    const state = buildReportedScenarioState();
    StorageAdapter.saveState(state);

    let exportedJson = '';

    function TestHarness() {
      const { exportBackupJSON } = usePlacement();
      return (
        <button
          onClick={() => {
            exportedJson = exportBackupJSON();
          }}
        >
          Export
        </button>
      );
    }

    render(
      <PlacementProvider>
        <TestHarness />
      </PlacementProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Export'));
    });

    const parsed = JSON.parse(exportedJson);
    expect(parsed.lastSavedAt).toBeDefined();

    // Check that lastSavedAt is a valid date within the last 10 seconds
    const exportTime = new Date(parsed.lastSavedAt).getTime();
    const now = Date.now();
    expect(Math.abs(now - exportTime)).toBeLessThan(10000);

    // Preserves responses, domain results, weakness signals
    expect(parsed.assessmentState.responses).toHaveLength(84);
    expect(parsed.assessmentState.domainResults).toHaveLength(11);
    expect(parsed.assessmentState.attempts).toHaveLength(1);
    expect(parsed.assessmentState.attempts[0].status).toBe('submitted');

    // Never fabricates DSA solved problems or roadmap progress
    const dsaProgressMap = parsed.dsaProgress as Record<string, { successfulAttempts?: number }>;
    const solvedProblems = Object.values(dsaProgressMap).filter(
      (p) => (p.successfulAttempts ?? 0) > 0
    );
    expect(solvedProblems).toHaveLength(0);

    const taskProgressMap = parsed.taskProgress as Record<string, { status?: string }>;
    const completedTasks = Object.values(taskProgressMap).filter(
      (t) => t.status === 'completed'
    );
    expect(completedTasks).toHaveLength(0);
  });

  // --- Requirement 7: Authentic User October 13 Backup Verification ---
  it('7. authentic user baseline diagnostic data integrity and export/import roundtrip', async () => {
    // 100% self-contained fixture representing the authoritative baseline diagnostic
    const backupData = buildReconciledBaselineState();

    // 1. Validate against strict validateImportState
    const { validateImportState } = await import('../storage/storageAdapter');
    expect(validateImportState(backupData)).toBe(true);

    // 2. Audit exact diagnostic numbers
    const assessment = backupData.assessmentState!;
    expect(assessment).toBeDefined();
    expect(assessment.responses).toHaveLength(84);

    let correctCount = 0;
    let incorrectCount = 0;
    let dontKnowCount = 0;

    for (const r of assessment.responses) {
      if (r.result === 'correct') correctCount++;
      else if (r.result === 'incorrect') incorrectCount++;
      else if (r.result === 'dont_know') dontKnowCount++;
    }

    expect(correctCount).toBe(26);
    expect(incorrectCount).toBe(24);
    expect(dontKnowCount).toBe(34);
    expect(assessment.weaknessSignals).toHaveLength(24);

    // 2b. Reconcile exact domain-level evaluation counts
    const responseMap = new Map<string, { result: string; response: number | string }>();
    for (const resp of assessment.responses) {
      responseMap.set(resp.itemId, { result: resp.result, response: resp.response });
    }

    const expectedDomainCounts: Record<string, { correct: number; incorrect: number; dont_know: number; total: number }> = {
      aptitude: { correct: 9, incorrect: 7, dont_know: 4, total: 20 },
      dsa: { correct: 0, incorrect: 1, dont_know: 8, total: 9 },
      python: { correct: 2, incorrect: 4, dont_know: 2, total: 8 },
      sql: { correct: 1, incorrect: 4, dont_know: 2, total: 7 },
      dbms: { correct: 2, incorrect: 1, dont_know: 5, total: 8 },
      oop: { correct: 1, incorrect: 0, dont_know: 6, total: 7 },
      os: { correct: 1, incorrect: 2, dont_know: 3, total: 6 },
      cn: { correct: 2, incorrect: 1, dont_know: 3, total: 6 },
      communication: { correct: 5, incorrect: 3, dont_know: 0, total: 8 },
      interviews: { correct: 3, incorrect: 1, dont_know: 1, total: 5 },
    };

    for (const [domainId, expected] of Object.entries(expectedDomainCounts)) {
      const domainItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === domainId);
      expect(domainItems).toHaveLength(expected.total);
      let dCorrect = 0;
      let dIncorrect = 0;
      let dDontKnow = 0;
      for (const item of domainItems) {
        const resp = responseMap.get(item.id);
        if (resp?.result === 'correct') dCorrect++;
        else if (resp?.result === 'incorrect') dIncorrect++;
        else if (resp?.result === 'dont_know') dDontKnow++;
      }
      expect(dCorrect).toBe(expected.correct);
      expect(dIncorrect).toBe(expected.incorrect);
      expect(dDontKnow).toBe(expected.dont_know);
    }

    // 3. Domain evaluation: 10 of 11 assessed, Projects unassessed
    expect(assessment.domainResults).toHaveLength(11);
    const projectsDomain = assessment.domainResults.find((d: { domainId: string }) => d.domainId === 'projects')!;
    expect(projectsDomain).toBeDefined();
    expect(projectsDomain.confidence).toBe('none');
    expect(projectsDomain.level).toBe(0);

    const assessedDomains = assessment.domainResults.filter(
      (d: { domainId: string; confidence: string }) => d.domainId !== 'projects' && d.confidence !== 'none'
    );
    expect(assessedDomains).toHaveLength(10);

    // 4. Overall diagnostic capability is 13/100
    const { deriveAssessmentProfileReadout } = await import('../engine/assessmentEngine');
    const readout = deriveAssessmentProfileReadout(backupData.assessmentState);
    expect(readout.overallAbility).toBe(13);
    expect(readout.assessedDomainsCount).toBe(10);

    // 5. Sealed history: attempt submitted
    expect(assessment.attempts).toHaveLength(1);
    expect(assessment.attempts[0].status).toBe('submitted');
    expect(assessment.attempts[0].kind).toBe('diagnostic_assessment');

    // 6. Solved DSA: 0, completed roadmap tasks: 0
    const dsaProgressMap = (backupData.dsaProgress || {}) as Record<string, { successfulAttempts?: number }>;
    const solvedDsa = Object.values(dsaProgressMap).filter(
      (p) => (p?.successfulAttempts ?? 0) > 0
    );
    expect(solvedDsa).toHaveLength(0);

    const taskProgressMap = (backupData.taskProgress || {}) as Record<string, { status?: string }>;
    const completedTasks = Object.values(taskProgressMap).filter(
      (t) => t?.status === 'completed'
    );
    expect(completedTasks).toHaveLength(0);

    // 7. Seed into StorageAdapter and verify export roundtrip
    StorageAdapter.saveState(backupData);

    let exportedJson = '';
    function BackupExportHarness() {
      const { exportBackupJSON } = usePlacement();
      return (
        <button
          onClick={() => {
            exportedJson = exportBackupJSON();
          }}
        >
          Export
        </button>
      );
    }

    render(
      <PlacementProvider>
        <BackupExportHarness />
      </PlacementProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Export'));
    });

    const parsedExport = JSON.parse(exportedJson);
    expect(validateImportState(parsedExport)).toBe(true);

    // Stamped with fresh ISO lastSavedAt
    expect(parsedExport.lastSavedAt).toBeDefined();
    const exportTime = new Date(parsedExport.lastSavedAt).getTime();
    expect(Math.abs(Date.now() - exportTime)).toBeLessThan(10000);

    // Preserves responses, weakness signals, domain results without duplication
    expect(parsedExport.assessmentState.responses).toHaveLength(84);
    expect(parsedExport.assessmentState.weaknessSignals).toHaveLength(24);
    expect(parsedExport.assessmentState.domainResults).toHaveLength(11);
    expect(parsedExport.assessmentState.attempts).toHaveLength(1);
    const exportReadout = deriveAssessmentProfileReadout(parsedExport.assessmentState);
    expect(exportReadout.overallAbility).toBe(13);
  });
});
