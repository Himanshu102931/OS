// @vitest-environment jsdom
import { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { DashboardView } from '../components/dashboard/DashboardView';
import { getEvaluatedCandidates, selectDailyPlan } from '../engine/adaptiveEngine';
import { composeAdaptiveSession } from '../engine/sessionComposer';
import { isEligibleSimpleTask } from '../engine/simpleFilter';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type {
  TaskDefinition,
  CompanyOverlay,
  DailyTaskAssignment,
  PracticeAttempt,
  TaskProgress,
  DomainId,
} from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getLocalTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeTask(overrides: {
  id: string;
  domainId: DomainId;
  title: string;
  topicId?: string;
  description?: string;
  phaseId?: string;
  estimatedMinutes?: number;
  importance?: number;
  taskType?: TaskDefinition['taskType'];
}): TaskDefinition {
  return {
    id: overrides.id,
    domainId: overrides.domainId,
    title: overrides.title,
    description: overrides.description || overrides.title,
    topicId: overrides.topicId || `topic-${overrides.domainId}`,
    phaseId: overrides.phaseId || 'phase-1',
    estimatedMinutes: overrides.estimatedMinutes || 30,
    importance: overrides.importance || 8,
    taskType: overrides.taskType || 'learning',
    createdAt: '2026-10-01T00:00:00Z',
  };
}

function makeAssignment(overrides: {
  id: string;
  referenceId: string;
  date: string;
  taskType?: DailyTaskAssignment['taskType'];
  allocatedMinutes?: number;
  completed?: boolean;
}): DailyTaskAssignment {
  return {
    id: overrides.id,
    referenceId: overrides.referenceId,
    date: overrides.date,
    taskType: overrides.taskType || 'catalog_task',
    allocatedMinutes: overrides.allocatedMinutes || 30,
    completed: overrides.completed ?? false,
  };
}

function makeProgress(taskId: string, state: TaskProgress['state']): TaskProgress {
  return {
    taskId,
    state,
    postponeCount: 0,
    skipCount: 0,
    timeSpentMinutes: 0,
    updatedAt: '2026-10-26T10:00:00Z',
  };
}

type Ctx = ReturnType<typeof usePlacement>;
let mountedCtx: Ctx | null = null;

const Probe = () => {
  const current = usePlacement();
  useEffect(() => {
    mountedCtx = current;
  });
  return null;
};

const getCtx = (): Ctx => {
  if (!mountedCtx) throw new Error('PlacementProvider not mounted');
  return mountedCtx;
};

const seed = (overrides: Partial<AppExtendedStorageState> = {}) => {
  localStorage.clear();
  window.location.hash = '';
  StorageAdapter.saveState({
    ...(getDefaultStorageState() as AppExtendedStorageState),
    ...overrides,
  });
};

const renderToday = () =>
  render(
    <PlacementProvider>
      <Probe />
      <DashboardView />
    </PlacementProvider>
  );

beforeEach(() => {
  mountedCtx = null;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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
  seed();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
  mountedCtx = null;
  vi.restoreAllMocks();
});

describe('PlacementOS Simple — P1 Final Correction Filtering Integrity', () => {
  /* ─── SCENARIO A: Mixed Recommendations ─── */
  describe('Scenario A — Mixed recommendations', () => {
    it('excludes retired candidates and keeps legitimate learning tasks selectable', () => {
      const syntheticTasks: TaskDefinition[] = [
        makeTask({
          id: 'task-dsa-arrays',
          topicId: 'topic-dsa-arrays',
          domainId: 'dsa',
          title: 'Master Two Sum',
          estimatedMinutes: 30,
          importance: 9,
        }),
        makeTask({
          id: 'task-python-basics',
          topicId: 'topic-python',
          domainId: 'python',
          title: 'Python Dict Comprehensions',
          estimatedMinutes: 25,
          importance: 8,
        }),
        makeTask({
          id: 'task-apt-speed',
          topicId: 'topic-apt-quant',
          domainId: 'aptitude',
          title: 'Time & Distance Drills',
          estimatedMinutes: 20,
          importance: 7,
        }),
        makeTask({
          id: 'proj-fullstack-app',
          topicId: 'topic-projects',
          domainId: 'projects',
          title: 'Build Fullstack Task Manager',
          phaseId: 'phase-2',
          estimatedMinutes: 120,
          importance: 9,
          taskType: 'project',
        }),
        makeTask({
          id: 'int-mock-faang',
          topicId: 'topic-interviews',
          domainId: 'interviews',
          title: 'FAANG Behavioral Mock',
          phaseId: 'phase-3',
          estimatedMinutes: 60,
          importance: 9,
          taskType: 'practice',
        }),
      ];

      const candidates = getEvaluatedCandidates(
        syntheticTasks,
        {},
        [],
        {},
        {},
        [],
        'normal',
        '2026-10-26'
      );

      const candidateIds = candidates.map((c) => c.task.id);
      expect(candidateIds).toContain('task-dsa-arrays');
      expect(candidateIds).toContain('task-python-basics');
      expect(candidateIds).toContain('task-apt-speed');
      expect(candidateIds).not.toContain('proj-fullstack-app');
      expect(candidateIds).not.toContain('int-mock-faang');

      // Top recommendation must be a legitimate learning task
      expect(candidates[0].task.domainId).toMatch(/^(dsa|python|aptitude)$/);
    });
  });

  /* ─── SCENARIO B: Daily Planning ─── */
  describe('Scenario B — Daily planning', () => {
    it('generates daily plans containing only legitimate tasks from mixed candidates', () => {
      const syntheticTasks: TaskDefinition[] = [
        makeTask({
          id: 'task-dsa-two-pointers',
          topicId: 'topic-dsa-arrays',
          domainId: 'dsa',
          title: 'Two Pointers Concept',
          estimatedMinutes: 30,
          importance: 9,
        }),
        makeTask({
          id: 'task-sql-joins',
          topicId: 'topic-sql',
          domainId: 'sql',
          title: 'Complex Joins Mastery',
          estimatedMinutes: 35,
          importance: 8,
        }),
        makeTask({
          id: 'proj-portfolio-site',
          topicId: 'topic-projects',
          domainId: 'projects',
          title: 'Portfolio Website Showcase',
          phaseId: 'phase-2',
          estimatedMinutes: 60,
          importance: 9,
        }),
        makeTask({
          id: 'int-sys-design',
          topicId: 'topic-interviews',
          domainId: 'interviews',
          title: 'System Design Interview Mock',
          phaseId: 'phase-3',
          estimatedMinutes: 60,
          importance: 9,
        }),
      ];

      const candidates = getEvaluatedCandidates(
        syntheticTasks,
        {},
        [],
        {},
        {},
        [],
        'normal',
        '2026-10-26'
      );

      const plan = selectDailyPlan(candidates, 120);

      expect(plan.length).toBeGreaterThan(0);
      for (const item of plan) {
        expect(isEligibleSimpleTask(item.task)).toBe(true);
        expect(item.task.domainId).not.toBe('projects');
        expect(item.task.domainId).not.toBe('interviews');
        expect(item.task.id).not.toMatch(/^(proj|int)-/);
      }
    });
  });

  /* ─── SCENARIO C: Existing Legacy Plan ─── */
  describe('Scenario C — Existing legacy plan', () => {
    it('preserves legacy retired assignments in storage while excluding them from Simple Mode execution and counts', () => {
      const today = getLocalTodayISO();
      const syntheticTasks: TaskDefinition[] = [
        makeTask({
          id: 'task-active-1',
          topicId: 'topic-dsa-arrays',
          domainId: 'dsa',
          title: 'Active DSA Task',
          estimatedMinutes: 30,
        }),
        makeTask({
          id: 'task-active-2',
          topicId: 'topic-python',
          domainId: 'python',
          title: 'Active Python Task',
          estimatedMinutes: 30,
        }),
        makeTask({
          id: 'proj-legacy-capstone',
          topicId: 'topic-projects',
          domainId: 'projects',
          title: 'Legacy Project Assignment',
          phaseId: 'phase-2',
          estimatedMinutes: 60,
        }),
      ];

      const legacyAssignments: DailyTaskAssignment[] = [
        makeAssignment({
          id: 'assign-active-1',
          date: today,
          referenceId: 'task-active-1',
          allocatedMinutes: 30,
          completed: true,
        }),
        makeAssignment({
          id: 'assign-active-2',
          date: today,
          referenceId: 'task-active-2',
          allocatedMinutes: 30,
          completed: false,
        }),
        makeAssignment({
          id: 'assign-retired-proj',
          date: today,
          referenceId: 'proj-legacy-capstone',
          allocatedMinutes: 60,
          completed: false,
        }),
      ];

      seed({
        customTaskDefinitions: syntheticTasks,
        dailyTaskAssignments: legacyAssignments,
        taskProgress: {
          'task-active-1': { ...makeProgress('task-active-1', 'completed'), lastCompletedAt: `${today}T10:00:00Z` },
          'task-active-2': makeProgress('task-active-2', 'in_progress'),
          'proj-legacy-capstone': makeProgress('proj-legacy-capstone', 'not_started'),
        },
      });

      renderToday();

      // 1. Verify storage still holds the retired assignment completely intact
      const storedState = StorageAdapter.loadState() as AppExtendedStorageState;
      expect(storedState.dailyTaskAssignments).toHaveLength(3);
      const retiredAssign = storedState.dailyTaskAssignments.find((a) => a.id === 'assign-retired-proj');
      expect(retiredAssign).toBeDefined();
      expect(retiredAssign?.completed).toBe(false);

      // 2. Execution Queue visible task counts match ONLY the visible eligible activities: 1 of 2 complete
      const countsEl = document.querySelector('[data-testid="plan-progress-counts"]');
      expect(countsEl).not.toBeNull();
      expect(countsEl?.getAttribute('data-completed')).toBe('1');
      expect(countsEl?.getAttribute('data-total')).toBe('2');
      expect(countsEl?.textContent).toContain('1 / 2 assignments complete');

      // 3. Execution Queue does NOT render the retired project task card
      const queue = document.querySelector('[data-testid="execution-queue"]');
      expect(queue).not.toBeNull();
      expect(queue?.textContent).not.toContain('Legacy Project Assignment');
      expect(queue?.textContent).toContain('Active DSA Task');
      expect(queue?.textContent).toContain('Active Python Task');

      // 4. In session composition, retired assignment is excluded
      const session = composeAdaptiveSession({
        availableMinutes: 120,
        todayStr: today,
        tasks: syntheticTasks,
        todayAssignments: legacyAssignments,
      });
      const sessionTargetIds = session.activities.map((a) => a.targetId);
      expect(sessionTargetIds).not.toContain('proj-legacy-capstone');
    });
  });

  /* ─── SCENARIO D: Dashboard Visual Controls ─── */
  describe('Scenario D — Dashboard visual controls', () => {
    it('renders Today without Company Focus controls, Companies node, or Projects/Interview nodes', () => {
      const urgentCompany: CompanyOverlay = {
        id: 'comp-urgent-fintech',
        companyName: 'Fintech Titan',
        targetRole: 'Junior Backend Engineer',
        applicationStatus: 'interview_scheduled',
        eventDate: '2026-11-05',
        requiredDomains: ['dsa', 'sql'],
        requiredTopics: ['topic-dsa-arrays', 'topic-sql'],
        requiredLanguages: ['python'],
      };

      const interviewPracticeAttempts: PracticeAttempt[] = [
        {
          id: 'pa-int-1',
          sessionId: 'ps-interview-tech-1',
          sessionTitle: 'Mock Tech Interview',
          category: 'mock_interview',
          domainId: 'interviews',
          date: '2026-10-25',
          completedAt: '2026-10-25T14:00:00Z',
          totalTimeSeconds: 1800,
          scorePct: 50,
          accuracyPct: 50,
          correctCount: 5,
          totalQuestions: 10,
          passed: false,
          userAnswers: [],
        },
      ];

      seed({
        companyOverlays: [urgentCompany],
        practiceAttempts: interviewPracticeAttempts,
      });

      renderToday();

      // 1. No Company Focus selector
      expect(document.querySelector('[data-testid="company-focus-container"]')).toBeNull();
      expect(document.querySelector('[data-testid="company-focus-select"]')).toBeNull();

      // 2. No Companies domain node in TodayHeroVisual
      const heroNodeIds = Array.from(document.querySelectorAll('[data-node-id]')).map((n) =>
        n.getAttribute('data-node-id')
      );
      expect(heroNodeIds).not.toContain('company');
      expect(heroNodeIds).not.toContain('domain-interviews');
      expect(heroNodeIds).not.toContain('domain-projects');

      // Exactly 10 nodes (primary + 9 active curriculum domains: dsa, python, sql, oop, dbms, os, cn, aptitude, communication)
      expect(heroNodeIds).toHaveLength(10);

      // 3. No interview practice chip in AttentionRail
      const rail = document.querySelector('[data-testid="attention-rail"]');
      if (rail) {
        expect(rail.textContent).not.toContain('Interview practice due');
      }

      // 4. No navigation links to retired routes in Signals & Focus
      const signalsSection = document.querySelector('[data-testid="signals-focus"]');
      expect(signalsSection).not.toBeNull();
      expect(signalsSection?.textContent).not.toContain('Interview');
      expect(signalsSection?.textContent).not.toContain('Companies');
      expect(signalsSection?.textContent).toContain('Evidence trace');
    });
  });

  /* ─── SCENARIO E: Core Functionality ─── */
  describe('Scenario E — Core functionality', () => {
    it('keeps DSA, Python, and diagnostic history intact and preserves JSON export/import of retired data', () => {
      const activeState = getDefaultStorageState() as AppExtendedStorageState;

      // Seed with some historical retired data + active data
      activeState.companyOverlays = [
        {
          id: 'comp-seed-1',
          companyName: 'Historic Target',
          targetRole: 'SWE',
          applicationStatus: 'applied',
          requiredDomains: ['dsa'],
          requiredTopics: ['topic-dsa-arrays'],
          requiredLanguages: ['python'],
        },
      ];
      activeState.dailyTaskAssignments = [
        makeAssignment({
          id: 'assign-hist-proj',
          date: '2026-10-20',
          referenceId: 'proj-capstone',
          allocatedMinutes: 45,
          completed: true,
        }),
      ];

      seed(activeState);

      renderToday();
      const ctx = getCtx();

      // 1. DSA and Python problems/tasks are intact
      expect(ctx.dsaProblems.length).toBeGreaterThan(0);
      expect(ctx.taskDefinitions.some((t) => t.domainId === 'python')).toBe(true);

      // 2. Export serialized JSON backup
      const exportedJson = StorageAdapter.exportJSON(activeState);
      expect(exportedJson).toContain('Historic Target');
      expect(exportedJson).toContain('assign-hist-proj');

      // 3. Clear storage and import the backup
      localStorage.clear();
      const importRes = StorageAdapter.importJSON(exportedJson);
      expect(importRes.success).toBe(true);

      const reloaded = StorageAdapter.loadState() as AppExtendedStorageState;
      expect(reloaded.companyOverlays).toHaveLength(1);
      expect(reloaded.companyOverlays[0].companyName).toBe('Historic Target');
      expect(reloaded.dailyTaskAssignments.some((a) => a.id === 'assign-hist-proj')).toBe(true);
    });

    it('preserves P0 completion integrity (does not mark unrelated tasks completed)', () => {
      const dsaTask = makeTask({
        id: 'task-dsa-1',
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        title: 'Two Pointers Basics',
        estimatedMinutes: 20,
      });
      const pyTask = makeTask({
        id: 'task-py-1',
        topicId: 'topic-python',
        domainId: 'python',
        title: 'Python Prerequisite',
        estimatedMinutes: 15,
      });

      seed({
        customTaskDefinitions: [dsaTask, pyTask],
        taskProgress: {
          'task-dsa-1': makeProgress('task-dsa-1', 'in_progress'),
          'task-py-1': makeProgress('task-py-1', 'not_started'),
        },
      });

      renderToday();
      const ctx = getCtx();

      // Updating Python task completion must never mark DSA task completed
      act(() => {
        ctx.updateTaskState('task-py-1', 'completed');
      });

      const updatedCtx = getCtx();
      expect(updatedCtx.taskProgress['task-py-1']?.state).toBe('completed');
      expect(updatedCtx.taskProgress['task-dsa-1']?.state).toBe('in_progress');
    });
  });
});
