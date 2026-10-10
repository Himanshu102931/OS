// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import React, { useMemo } from 'react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { EvidenceTracePanel } from '../components/evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../components/evidence/useEvidenceCatalog';
import { EvidenceTraceabilityModal } from '../components/skills/EvidenceTraceabilityModal';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import {
  buildEvidenceTrace,
  buildSkillEvidenceTrace,
  makeDerivedSource,
  type EvidenceCatalog,
  type EvidenceTrace,
} from '../engine/evidenceTrace';
import { calculateTopicReadiness } from '../engine/skillsEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { TaskDefinition, TaskProgress, Topic } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Evidence traceability UI:
 *   SIGNAL → WHY → EVIDENCE → SOURCE → GO TO SOURCE
 *
 * The panel renders only what the engine resolved, so these tests pin down the
 * two honesty rules that matter: a deep link is labelled as one only when the
 * destination really consumes `targetId`, and a record that cannot be found is
 * shown as unavailable instead of quietly receiving a button.
 */

const STORAGE_KEY = 'placementos_v1_state';

const TASK: TaskDefinition = {
  id: 'ui-task-sql-joins',
  title: 'UI Evidence Task',
  description: 'Fixture task for evidence traceability UI',
  domainId: 'sql',
  topicId: 'topic-sql-joins',
  phaseId: 'phase-1',
  estimatedMinutes: 25,
  importance: 7,
  taskType: 'practice',
  createdAt: '2026-06-01T00:00:00Z',
};

const PREREQ: TaskDefinition = {
  id: 'ui-task-prereq',
  title: 'UI Prerequisite Task',
  description: 'Fixture prerequisite',
  domainId: 'sql',
  topicId: 'topic-sql-joins',
  phaseId: 'phase-1',
  estimatedMinutes: 20,
  importance: 5,
  taskType: 'learning',
  createdAt: '2026-06-01T00:00:00Z',
};

const BLOCKED: TaskDefinition = {
  id: 'ui-task-blocked',
  title: 'UI Blocked Task',
  description: 'Fixture blocked task',
  domainId: 'sql',
  topicId: 'topic-sql-joins',
  phaseId: 'phase-1',
  estimatedMinutes: 30,
  importance: 6,
  taskType: 'practice',
  prerequisiteTaskDefinitionIds: ['ui-task-prereq'],
  createdAt: '2026-06-01T00:00:00Z',
};

const progress = (taskId: string, state: TaskProgress['state']): TaskProgress => ({
  taskId,
  state,
  timeSpentMinutes: state === 'completed' ? 25 : 0,
  postponeCount: 0,
  skipCount: 0,
  updatedAt: '2026-10-01',
  lastCompletedAt: state === 'completed' ? '2026-10-01T10:00:00.000Z' : undefined,
});

const seed = () => {
  const base = getDefaultStorageState() as AppExtendedStorageState;
  const next: AppExtendedStorageState = {
    ...base,
    customTaskDefinitions: [PREREQ, TASK, BLOCKED],
    taskProgress: {
      ...base.taskProgress,
      'ui-task-prereq': progress('ui-task-prereq', 'not_started'),
      'ui-task-sql-joins': progress('ui-task-sql-joins', 'completed'),
      'ui-task-blocked': progress('ui-task-blocked', 'not_started'),
    },
  };
  StorageAdapter.saveState(next);
  window.location.hash = '';
};

// ---------------------------------------------------------------------------
// Harnesses
// ---------------------------------------------------------------------------

interface PanelHarnessProps {
  build: (catalog: EvidenceCatalog) => EvidenceTrace;
  idPrefix: string;
}

const PanelHarness: React.FC<PanelHarnessProps> = ({ build, idPrefix }) => {
  const catalog = useEvidenceCatalog();
  const { routeState } = usePlacement();
  const trace = useMemo(() => build(catalog), [build, catalog]);
  return (
    <div>
      <span data-testid="current-route">{routeState.route}</span>
      <span data-testid="current-target">{routeState.targetId ?? 'none'}</span>
      <EvidenceTracePanel trace={trace} catalog={catalog} idPrefix={idPrefix} />
    </div>
  );
};

const SkillsModalHarness: React.FC<{ topicId: string }> = ({ topicId }) => {
  const ctx = usePlacement();
  const readiness = useMemo(() => {
    const topic = ctx.topics.find((t) => t.id === topicId);
    if (!topic) return null;
    return calculateTopicReadiness(
      topic,
      ctx.domains.find((d) => d.id === topic.domainId),
      ctx.taskDefinitions,
      ctx.taskProgress,
      ctx.dsaProblems,
      ctx.dsaProgress,
      ctx.dsaAttempts,
      ctx.evidenceLogs,
      ctx.skillStates,
      ctx.companyOverlays,
      ctx.todayDate
    );
  }, [ctx, topicId]);

  return (
    <div>
      <span data-testid="ev-count">{readiness?.supportingEvidence.length ?? 0}</span>
      <span data-testid="skills-route">{ctx.routeState.route}</span>
      <span data-testid="skills-target">{ctx.routeState.targetId ?? 'none'}</span>
      <EvidenceTraceabilityModal readiness={readiness} isOpen onClose={() => undefined} />
    </div>
  );
};

const mount = (node: React.ReactElement) => render(<PlacementProvider>{node}</PlacementProvider>);

// ---------------------------------------------------------------------------
// Trace construction fixtures (built from the live catalog, not hand-faked)
// ---------------------------------------------------------------------------

const deepLinkTrace = (catalog: EvidenceCatalog): EvidenceTrace =>
  buildEvidenceTrace({
    id: 'demo:deep',
    signal: 'roadmap_lock',
    label: 'Blocked task',
    why: 'Prerequisite not completed.',
    sources: [
      {
        kind: 'task_progress',
        sourceId: 'ui-task-sql-joins',
        label: 'UI Evidence Task',
        timestamp: '2026-10-01T10:00:00.000Z',
        availability: 'available',
      },
    ],
    route: 'roadmap',
    targetId: 'ui-task-sql-joins',
    catalog,
  });

const dsaDeepLinkTrace = (catalog: EvidenceCatalog): EvidenceTrace =>
  buildEvidenceTrace({
    id: 'demo:dsa-deep',
    signal: 'overdue_review',
    label: 'Overdue DSA Problem',
    why: 'Leitner review overdue.',
    sources: [
      {
        kind: 'dsa_progress',
        sourceId: 'dsa-001',
        label: 'Two Sum',
        timestamp: '2026-10-01T10:00:00.000Z',
        availability: 'available',
      },
    ],
    route: 'dsa',
    targetId: 'dsa-001',
    catalog,
  });

const practiceDeepLinkTrace = (catalog: EvidenceCatalog): EvidenceTrace => {
  const sessionId = catalog.practiceSessions[0]?.id || 'sess-sql-join';
  return buildEvidenceTrace({
    id: 'demo:practice-deep',
    signal: 'practice_weakness',
    label: 'Practice Session',
    why: 'Target practice drill.',
    sources: [
      {
        kind: 'practice_session',
        sourceId: sessionId,
        label: 'Practice Session',
        timestamp: '2026-10-01T10:00:00.000Z',
        availability: 'available',
      },
    ],
    route: 'practice',
    targetId: sessionId,
    catalog,
  });
};

const skillsDeepLinkTrace = (catalog: EvidenceCatalog): EvidenceTrace =>
  buildEvidenceTrace({
    id: 'demo:skills-deep',
    signal: 'weak_skill',
    label: 'SQL Joins Skill',
    why: 'Weak skill topic.',
    sources: [
      {
        kind: 'skill_state',
        sourceId: 'topic-sql-joins',
        label: 'SQL Joins',
        timestamp: '2026-10-01T10:00:00.000Z',
        availability: 'available',
      },
    ],
    route: 'skills',
    targetId: 'topic-sql-joins',
    catalog,
  });

const genericTrace = (catalog: EvidenceCatalog): EvidenceTrace =>
  buildEvidenceTrace({
    id: 'demo:generic',
    signal: 'practice_weakness',
    label: 'SQL JOIN Practice Session',
    why: '55% — below the 70% pass mark.',
    sources: [
      {
        kind: 'practice_attempt',
        sourceId: 'pa-ghost',
        label: 'SQL JOIN Practice Session',
        timestamp: '2026-10-01T09:30:00.000Z',
        availability: 'available',
      },
    ],
    route: 'analytics',
    targetId: 'metric-anything',
    catalog,
  });

const degradedTrace = (catalog: EvidenceCatalog): EvidenceTrace =>
  buildEvidenceTrace({
    id: 'demo:degraded',
    signal: 'assessment_weakness',
    label: 'Joins weakness',
    why: 'Seen 3 times, last 2026-09-30.',
    sources: [
      {
        kind: 'assessment_attempt',
        sourceId: 'att-ghost',
        label: 'Unavailable assessment attempt record',
        availability: 'missing',
      },
      makeDerivedSource('derived:demo', 'Aggregated from telemetry', 'no single record'),
    ],
    route: 'assessment',
    catalog,
  });

const skillTraceFor = (catalog: EvidenceCatalog): EvidenceTrace => {
  const topic: Topic = {
    id: 'topic-sql-joins',
    moduleId: 'mod-sql',
    domainId: 'sql',
    name: 'SQL Joins',
    description: 'Joins',
    importance: 7,
  };
  const readiness = calculateTopicReadiness(
    topic,
    undefined,
    catalog.taskDefinitions,
    catalog.taskProgress,
    catalog.dsaProblems,
    catalog.dsaProgress,
    catalog.dsaAttempts,
    catalog.evidenceLogs,
    catalog.skillStates,
    [],
    catalog.todayISO
  );
  return buildSkillEvidenceTrace(readiness, 'weak_skill', catalog);
};

// ---------------------------------------------------------------------------

describe('EvidenceTracePanel', () => {
  beforeEach(() => {
    seed();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('starts collapsed, toggles with aria wiring, and shows WHY / EVIDENCE / SOURCE / ACTION', () => {
    mount(<PanelHarness build={deepLinkTrace} idPrefix="demo" />);

    const toggle = screen.getByTestId('demo-trace-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'demo-trace-body');
    expect(screen.queryByTestId('demo-trace-why')).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId('demo-trace-toggle')).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByTestId('demo-trace-why').textContent).toContain('Prerequisite not completed.');
    expect(screen.getByTestId('demo-trace-origin').textContent).toBe('Direct source');
    expect(screen.getByTestId('demo-trace-sourcecount').textContent).toContain('1 source');

    const source = screen.getByTestId('demo-trace-source-0');
    expect(within(source).getByTestId('demo-trace-source-0-status').textContent).toBe('available');
    expect(within(source).getByTestId('demo-trace-source-0-go')).toBeInTheDocument();

    expect(screen.getByTestId('demo-trace-action').textContent).toContain('Open "UI Evidence Task"');
    expect(screen.queryByTestId('demo-trace-note')).toBeNull();
  });

  it('deep-links a real roadmap target and reports the resolved route in the hash', () => {
    mount(<PanelHarness build={deepLinkTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));
    fireEvent.click(screen.getByTestId('demo-trace-action'));

    expect(screen.getByTestId('current-route').textContent).toBe('roadmap');
    expect(screen.getByTestId('current-target').textContent).toBe('ui-task-sql-joins');
    expect(window.location.hash).toBe('#/roadmap/ui-task-sql-joins');
  });

  it('deep-links a real DSA problem target and reports the resolved route in the hash', () => {
    mount(<PanelHarness build={dsaDeepLinkTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));
    expect(screen.getByTestId('demo-trace-action').textContent).toContain('Open "Two Sum"');
    fireEvent.click(screen.getByTestId('demo-trace-action'));

    expect(screen.getByTestId('current-route').textContent).toBe('dsa');
    expect(screen.getByTestId('current-target').textContent).toBe('dsa-001');
    expect(window.location.hash).toBe('#/dsa/dsa-001');
  });

  it('deep-links a real Practice session target and reports the resolved route in the hash', () => {
    mount(<PanelHarness build={practiceDeepLinkTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));
    expect(screen.getByTestId('demo-trace-action').textContent).toContain('Open');
    fireEvent.click(screen.getByTestId('demo-trace-action'));

    expect(screen.getByTestId('current-route').textContent).toBe('practice');
    expect(screen.getByTestId('current-target').textContent).not.toBe('none');
    expect(window.location.hash).toMatch(/^#\/practice\/.+/);
  });

  it('deep-links a real Skills topic target and reports the resolved route in the hash', () => {
    mount(<PanelHarness build={skillsDeepLinkTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));
    expect(screen.getByTestId('demo-trace-action').textContent).toContain('Open "SQL Joins & Aggregations"');
    fireEvent.click(screen.getByTestId('demo-trace-action'));

    expect(screen.getByTestId('current-route').textContent).toBe('skills');
    expect(screen.getByTestId('current-target').textContent).toBe('topic-sql-joins');
    expect(window.location.hash).toBe('#/skills/topic-sql-joins');
  });

  it('uses an honest label for a route that cannot consume a target id', () => {
    mount(<PanelHarness build={genericTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));

    const action = screen.getByTestId('demo-trace-action');
    expect(action.textContent).toContain('Open Analytics');
    expect(action.textContent).not.toContain('metric-anything');
    expect(screen.getByTestId('demo-trace-note').textContent).toContain(
      'does not open a specific record'
    );

    fireEvent.click(action);
    expect(screen.getByTestId('current-route').textContent).toBe('analytics');
    expect(screen.getByTestId('current-target').textContent).toBe('none');
    expect(window.location.hash).toBe('#/analytics');
  });

  it('shows a missing source as unavailable with no button, and a derived entry as aggregated', () => {
    mount(<PanelHarness build={degradedTrace} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));

    expect(screen.getByTestId('demo-trace-source-0-status').textContent).toBe('unavailable');
    expect(screen.getByTestId('demo-trace-source-0-nogo').textContent).toContain(
      'Source unavailable'
    );
    expect(screen.queryByTestId('demo-trace-source-0-go')).toBeNull();

    expect(screen.getByTestId('demo-trace-source-1-status').textContent).toBe('derived');
    expect(screen.getByTestId('demo-trace-source-1-nogo').textContent).toContain(
      'Aggregated, no single source'
    );
    expect(screen.queryByTestId('demo-trace-source-1-go')).toBeNull();

    expect(screen.getByTestId('demo-trace-origin').textContent).toBe('Direct source');
    expect(screen.getByTestId('demo-trace-evidence').textContent).toContain('1 unavailable');
  });

  it('renders a skill signal with its canonical evidence classification', () => {
    mount(<PanelHarness build={skillTraceFor} idPrefix="demo" />);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));

    expect(screen.getByTestId('demo-trace-why').textContent).toContain('Low evidence in SQL Joins');
    expect(screen.getByTestId('demo-trace-classification')).toBeTruthy();
    expect(screen.getByTestId('demo-trace-sources').children.length).toBeGreaterThan(0);
  });

  it('writes nothing to local storage while opening, navigating and closing', () => {
    mount(<PanelHarness build={deepLinkTrace} idPrefix="demo" />);

    const before = window.localStorage.getItem(STORAGE_KEY);

    fireEvent.click(screen.getByTestId('demo-trace-toggle'));
    fireEvent.click(screen.getByTestId('demo-trace-action'));
    fireEvent.click(screen.getByTestId('demo-trace-toggle'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
});

// ---------------------------------------------------------------------------

describe('Skills evidence traceability modal', () => {
  beforeEach(() => {
    seed();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('resolves every supporting-evidence row to a real source and offers per-row navigation', () => {
    mount(<SkillsModalHarness topicId="topic-sql-joins" />);

    const rows = screen.getAllByTestId(/^topic-evidence-row-\d+$/);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBe(Number(screen.getByTestId('ev-count').textContent));

    rows.forEach((_, index) => {
      expect(screen.getByTestId(`topic-evidence-status-${index}`).textContent).toBe('source found');
    });

    const ourRow = rows.find((row) =>
      within(row).queryByText('UI Evidence Task')
    );
    expect(ourRow).toBeTruthy();
    const goIndex = rows.indexOf(ourRow!);
    const go = screen.getByTestId(`topic-evidence-go-${goIndex}`);
    expect(go.textContent).toContain('Open "UI Evidence Task"');

    fireEvent.click(go);
    expect(screen.getByTestId('skills-route').textContent).toBe('roadmap');
    expect(screen.getByTestId('skills-target').textContent).toBe('ui-task-sql-joins');
    expect(window.location.hash).toBe('#/roadmap/ui-task-sql-joins');
  });

  it('keeps localStorage byte-identical after opening the modal and navigating', () => {
    mount(<SkillsModalHarness topicId="topic-sql-joins" />);
    const before = window.localStorage.getItem(STORAGE_KEY);

    const rows = screen.getAllByTestId(/^topic-evidence-row-\d+$/);
    rows.forEach((_, index) => {
      const go = screen.queryByTestId(`topic-evidence-go-${index}`);
      if (go) fireEvent.click(go);
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
});

// ---------------------------------------------------------------------------

describe('Roadmap lock evidence trace', () => {
  beforeEach(() => {
    seed();
    window.location.hash = '#/roadmap';
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('traces a locked task back to the task-progress records of the task and its prerequisite', () => {
    render(
      <PlacementProvider>
        <RoadmapView />
      </PlacementProvider>
    );
    fireEvent.click(screen.getByText('SQL Joins & Aggregations'));

    const toggle = screen.getByTestId('lock-ui-task-blocked-trace-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(screen.getByTestId('lock-ui-task-blocked-trace-why').textContent).toContain('UI');
    const sourceCount = screen.getByTestId('lock-ui-task-blocked-trace-sourcecount').textContent;
    expect(sourceCount).toContain('2 sources');

    const ids = ['lock-ui-task-blocked-trace-source-0', 'lock-ui-task-blocked-trace-source-1'].map(
      (id) => within(screen.getByTestId(id)).getByTestId(`${id}-status`).textContent
    );
    expect(ids).toEqual(['available', 'available']);

    const action = screen.getByTestId('lock-ui-task-blocked-trace-action');
    expect(action.textContent).toContain('Open "UI Blocked Task"');

    fireEvent.click(action);
    expect(window.location.hash).toBe('#/roadmap/ui-task-blocked');
  });

  it('does not persist anything while the lock trace is opened', () => {
    render(
      <PlacementProvider>
        <RoadmapView />
      </PlacementProvider>
    );
    fireEvent.click(screen.getByText('SQL Joins & Aggregations'));

    const before = window.localStorage.getItem(STORAGE_KEY);
    fireEvent.click(screen.getByTestId('lock-ui-task-blocked-trace-toggle'));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
});
