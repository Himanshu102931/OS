// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { SkillsView } from '../components/skills/SkillsView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { TaskDefinition, TaskProgress } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'placementos_v1_state';

const FIXTURE_TASK: TaskDefinition = {
  id: 'fixture-task-sql-joins',
  title: 'Fixture SQL Joins Task',
  description: 'Practice complex inner and outer joins',
  domainId: 'sql',
  topicId: 'topic-sql-joins',
  phaseId: 'phase-1',
  estimatedMinutes: 30,
  importance: 8,
  taskType: 'practice',
  createdAt: '2026-06-01T00:00:00Z',
};

const makeProgress = (taskId: string, state: TaskProgress['state']): TaskProgress => ({
  taskId,
  state,
  timeSpentMinutes: state === 'completed' ? 30 : 0,
  postponeCount: 0,
  skipCount: 0,
  updatedAt: '2026-10-01',
  lastCompletedAt: state === 'completed' ? '2026-10-01T10:00:00.000Z' : undefined,
});

const seedStorage = () => {
  const base = getDefaultStorageState() as AppExtendedStorageState;
  const next: AppExtendedStorageState = {
    ...base,
    customTaskDefinitions: [FIXTURE_TASK],
    taskProgress: {
      ...base.taskProgress,
      'fixture-task-sql-joins': makeProgress('fixture-task-sql-joins', 'completed'),
    },
  };
  StorageAdapter.saveState(next);
  window.location.hash = '';
};

describe('Skills Page Redesign & Manufacturing Suite (Task 75)', () => {
  beforeEach(() => {
    seedStorage();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('renders Zone 1: Skills Header and Proving Strip with canonical metrics', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    expect(screen.getByText('Skills Matrix & Evidence Readiness')).toBeInTheDocument();
    expect(screen.getByTestId('overall-readiness-value')).toBeInTheDocument();
    expect(screen.getByText(/Global Verification Progress/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Overall Placement Readiness/i })).toBeInTheDocument();
  });

  it('renders Zone 2: Primary Skill Gap Focus Hero with defining CTA', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    expect(screen.getByText(/Top Priority Competence Gap/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strengthen Skill/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trace Causal Evidence/i })).toBeInTheDocument();
  });

  it('renders Zone 3: All 11 placement domains in the competence radar', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const expectedDomains = [
      'Data Structures & Algorithms',
      'Python & Scripting',
      'SQL & Database Queries',
      'Object-Oriented Programming',
      'Database Management Systems',
      'Operating Systems',
      'Computer Networks',
      'Quantitative & Logical Aptitude',
      'Communication & Behavioral',
      'System & Web Projects',
      'Mock Interviews & Assessments',
    ];

    expectedDomains.forEach((domainName) => {
      expect(screen.getByRole('tab', { name: new RegExp(domainName, 'i') })).toBeInTheDocument();
    });
  });

  it('filters topic matrix when a domain is selected in Zone 3', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    // Click on Operating Systems domain tab
    const osTab = screen.getByRole('tab', { name: /Operating Systems/i });
    expect(osTab).toBeTruthy();
    fireEvent.click(osTab);

    // Ledger should now show OS topics
    expect(screen.getByText('CPU Scheduling Algorithms')).toBeInTheDocument();
  });

  it('renders Zone 4: Topic Evidence Ledger and allows search filtering', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search topic or domain/i);
    fireEvent.change(searchInput, { target: { value: 'Scheduling' } });

    expect(screen.getByText('CPU Scheduling Algorithms')).toBeInTheDocument();
  });

  it('opens Zone 5: Evidence Traceability Drawer when clicking Trace Evidence', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const traceButtons = screen.getAllByRole('button', { name: /Trace Evidence/i });
    expect(traceButtons.length).toBeGreaterThan(0);
    fireEvent.click(traceButtons[0]);

    // Drawer dialog should appear
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/What Caused This Readiness Rating\?/i)).toBeInTheDocument();
  });

  it('opens Manual Override Modal with explicit self-attestation warning', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const overrideButtons = screen.getAllByTitle(/Self-attested rating override/i);
    expect(overrideButtons.length).toBeGreaterThan(0);
    fireEvent.click(overrideButtons[0]);

    // Override modal with warning should appear
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Self-Attested Skill Rating/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Self-Attestation Warning:/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Save Rating Override/i })).toBeInTheDocument();
  });

  it('navigates to canonical workspace when executing recommended action', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const proveButtons = screen.getAllByRole('button', { name: /Prove Skill/i });
    expect(proveButtons.length).toBeGreaterThan(0);

    fireEvent.click(proveButtons[0]);
    // Verifies route changes without throwing
    expect(window.location.hash).toMatch(/^#\/(roadmap|dsa|preparation|practice)/);
  });

  it('opens drawer on deep link via topic ID', () => {
    window.location.hash = '#/skills/topic-sql-joins';

    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/SQL Joins & Aggregations/i)).toBeInTheDocument();
  });

  it('preserves storage byte-identity when merely viewing and navigating', () => {
    render(
      <PlacementProvider>
        <SkillsView />
      </PlacementProvider>
    );

    const before = window.localStorage.getItem(STORAGE_KEY);
    const traceButtons = screen.getAllByRole('button', { name: /Trace Evidence/i });
    if (traceButtons[0]) {
      fireEvent.click(traceButtons[0]);
    }
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
});
