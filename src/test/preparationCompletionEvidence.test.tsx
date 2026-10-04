import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { PreparationHubView } from '../components/preparation/PreparationHubView';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DSAView } from '../components/dsa/DSAView';
import { PracticeView } from '../components/practice/PracticeView';
import { PREPARATION_TOPICS, getPreparationTopic } from '../data/preparationDataset';
import { applyPreparationStageCompletion } from '../engine/preparationEngine';
import { composeAdaptiveSession } from '../engine/sessionComposer';
import { calculateTopicReadiness } from '../engine/skillsEngine';
import { calculateWeakness } from '../engine/adaptiveEngine';
import { resolveEvidenceSource, type EvidenceCatalog } from '../engine/evidenceTrace';
import { TOPICS, DOMAINS, TASK_DEFINITIONS } from '../data/seedData';
import type { EvidenceLog, PreparationTopicProgress, TopicSkillState } from '../types';

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

describe('TASK 3: PREPARATION EVIDENCE & CROSS-SYSTEM COMPLETION', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // =========================================================================
  // A. Genuine Preparation completion emits canonical evidence
  // =========================================================================
  describe('A. Genuine Preparation completion emits canonical evidence', () => {
    it('A1. applyPreparationStageCompletion emits canonical EvidenceLog and skillUpdate', () => {
      const topic = getPreparationTopic('prep-lang')!;
      const now = '2026-10-04T10:00:00Z';

      const result = applyPreparationStageCompletion({
        topic,
        stage: 'orient',
        nowISO: now,
      });

      expect(result.evidence).not.toBeNull();
      expect(result.evidence?.sourceType).toBe('preparation_lesson');
      expect(result.evidence?.topicId).toBe('prep-lang');
      expect(result.evidence?.domainId).toBe('python');
      expect(result.evidence?.score).toBe(70);
      expect(result.evidence?.confidence).toBe(3);
      expect(result.evidence?.timestamp).toBe(now);
      expect(result.evidence?.sourceId).toBe('prep-lang:orient');

      expect(result.skillUpdate).not.toBeNull();
      expect(result.skillUpdate?.topicId).toBe('prep-lang');
      expect(result.skillUpdate?.domainId).toBe('python');
      expect(result.skillUpdate?.freshness).toBe('fresh');
      expect(result.skillUpdate?.evidenceStrength).toBe(15);
      expect(result.skillUpdate?.lastPracticedAt).toBe(now);

      expect(result.progress.completedStages).toEqual(['orient']);
      expect(result.progress.evidenceStrength).toBe(15);
      expect(result.progress.freshness).toBe('fresh');
    });

    it('A2. Context completePreparationStage persists EvidenceLog and updates skillStates', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function Inspector() {
        capturedPlacement = usePlacement();
        return <div>Ready</div>;
      }

      render(
        <PlacementProvider>
          <Inspector />
        </PlacementProvider>
      );

      const topic = getPreparationTopic('prep-sql')!;
      const initialLogsCount = capturedPlacement!.evidenceLogs.length;

      act(() => {
        capturedPlacement!.completePreparationStage(topic, 'orient');
      });

      expect(capturedPlacement!.evidenceLogs.length).toBe(initialLogsCount + 1);
      const emittedLog = capturedPlacement!.evidenceLogs.find(
        (l) => l.topicId === 'prep-sql' && l.sourceId === 'prep-sql:orient'
      );
      expect(emittedLog).toBeDefined();
      expect(emittedLog?.sourceType).toBe('preparation_lesson');
      expect(emittedLog?.domainId).toBe('sql');

      expect(capturedPlacement!.preparationTopicProgress['prep-sql'].completedStages).toEqual(['orient']);
      expect(capturedPlacement!.skillStates['prep-sql']).toBeDefined();
      expect(capturedPlacement!.skillStates['prep-sql'].freshness).toBe('fresh');
      expect(capturedPlacement!.skillStates['prep-sql'].evidenceStrength).toBe(15);
    });

    it('A3. Clicking "Mark Stage complete" in TopicWorkspace emits canonical evidence and updates UI', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
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

      const initialLogs = capturedPlacement!.evidenceLogs.length;
      expect(screen.getAllByText(/Programming Language \(Python\)/i).length).toBeGreaterThan(0);

      // Click "Mark Orient complete"
      const markBtn = screen.getByRole('button', { name: /Mark Orient complete/i });
      act(() => {
        fireEvent.click(markBtn);
      });

      expect(capturedPlacement!.evidenceLogs.length).toBe(initialLogs + 1);
      const log = capturedPlacement!.evidenceLogs[capturedPlacement!.evidenceLogs.length - 1];
      expect(log.topicId).toBe('prep-lang');
      expect(log.sourceType).toBe('preparation_lesson');
    });
  });

  // =========================================================================
  // B. Opening/viewing a Preparation topic does not emit capability evidence
  // =========================================================================
  describe('B. Opening/viewing a Preparation topic does not emit capability evidence', () => {
    it('B1. Navigating to and rendering a Preparation topic emits 0 evidence logs', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      const logsBefore = capturedPlacement!.evidenceLogs.length;

      // Deep link to prep-lang
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      expect(screen.getAllByText(/Programming Language \(Python\)/i).length).toBeGreaterThan(0);
      expect(capturedPlacement!.evidenceLogs.length).toBe(logsBefore);
      expect(capturedPlacement!.skillStates['prep-lang']?.evidenceStrength ?? 0).toBe(0);
    });

    it('B2. Switching between stages records stage cursor but emits 0 evidence logs', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      const logsBefore = capturedPlacement!.evidenceLogs.length;

      // Click Learn stage tab button
      const learnTab = screen.getByRole('button', { name: /Learn/i });
      act(() => {
        fireEvent.click(learnTab);
      });

      expect(capturedPlacement!.evidenceLogs.length).toBe(logsBefore);
      expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages ?? []).toEqual([]);
      expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.currentStage).toBe('learn');
    });
  });

  // =========================================================================
  // C. Closing the Preparation workspace does not mark completion
  // =========================================================================
  describe('C. Closing the Preparation workspace does not mark completion', () => {
    it('C1. Clicking "Back to Today" / "Return to Session" returns to dashboard with zero evidence and unadvanced session', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return (
          <div>
            {capturedPlacement.currentRoute === 'dashboard' && <DashboardView />}
            {capturedPlacement.currentRoute === 'preparation' && <PreparationHubView />}
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

      const initialLogs = capturedPlacement!.evidenceLogs.length;
      const initialCompletedActivities = capturedSession!.sessionState?.completedActivityIds.length ?? 0;

      // Deep link to prep-lang
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      expect(capturedPlacement!.currentRoute).toBe('preparation');

      // Click "Return to Session" button
      const returnBtn = screen.getByRole('button', { name: /Return to Session/i });
      act(() => {
        fireEvent.click(returnBtn);
      });

      expect(capturedPlacement!.currentRoute).toBe('dashboard');
      expect(capturedPlacement!.evidenceLogs.length).toBe(initialLogs);
      expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(initialCompletedActivities);
      expect(capturedPlacement!.preparationTopicProgress['prep-lang']?.completedStages ?? []).toEqual([]);
    });
  });

  // =========================================================================
  // D. Duplicate completion does not duplicate evidence
  // =========================================================================
  describe('D. Duplicate completion does not duplicate evidence', () => {
    it('D1. Pure applyPreparationStageCompletion returns null evidence on duplicate call', () => {
      const topic = getPreparationTopic('prep-lang')!;
      const first = applyPreparationStageCompletion({
        topic,
        stage: 'orient',
        nowISO: '2026-10-04T10:00:00Z',
      });

      expect(first.evidence).not.toBeNull();

      const second = applyPreparationStageCompletion({
        topic,
        stage: 'orient',
        existingProgress: first.progress,
        existingSkill: first.skillUpdate ?? undefined,
        nowISO: '2026-10-04T10:05:00Z',
      });

      expect(second.evidence).toBeNull();
      expect(second.skillUpdate).toBeNull();
      expect(second.progress.completedStages).toEqual(['orient']);
    });

    it('D2. completePreparationStage called twice writes exactly one EvidenceLog', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function Inspector() {
        capturedPlacement = usePlacement();
        return <div>Ready</div>;
      }

      render(
        <PlacementProvider>
          <Inspector />
        </PlacementProvider>
      );

      const topic = getPreparationTopic('prep-lang')!;
      const initialLogs = capturedPlacement!.evidenceLogs.length;

      act(() => {
        capturedPlacement!.completePreparationStage(topic, 'orient');
      });
      expect(capturedPlacement!.evidenceLogs.length).toBe(initialLogs + 1);

      act(() => {
        capturedPlacement!.completePreparationStage(topic, 'orient');
      });
      // Exactly 1 log, no duplicate
      expect(capturedPlacement!.evidenceLogs.length).toBe(initialLogs + 1);
    });
  });

  // =========================================================================
  // E. Preparation completion advances the active composed session exactly once
  // =========================================================================
  describe('E. Preparation completion advances the active composed session exactly once', () => {
    it('E1. Completing a deep-linked preparation activity advances session and returns to Today', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return (
          <div>
            {capturedPlacement.currentRoute === 'dashboard' && <DashboardView />}
            {capturedPlacement.currentRoute === 'preparation' && <PreparationHubView />}
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

      expect(capturedPlacement!.currentRoute).toBe('dashboard');
      const initialCompleted = capturedSession!.sessionState?.completedActivityIds.length ?? 0;
      const initialActivityIndex = capturedSession!.sessionState?.currentActivityIndex ?? 0;

      // Deep link to prep-lang
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      expect(capturedPlacement!.currentRoute).toBe('preparation');
      expect(screen.getByTestId('session-deep-link-banner')).toBeDefined();

      // Click "Complete Activity & Advance"
      const completeBtn = screen.getByRole('button', { name: /Complete Activity & Advance/i });
      act(() => {
        fireEvent.click(completeBtn);
      });

      // Should automatically return to dashboard
      expect(capturedPlacement!.currentRoute).toBe('dashboard');

      // Session should have advanced exactly once
      expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(initialCompleted + 1);
      expect(capturedSession!.sessionState?.currentActivityIndex).toBe(initialActivityIndex + 1);

      // Preparation evidence should have been emitted
      const emittedLog = capturedPlacement!.evidenceLogs.find((l) => l.topicId === 'prep-lang');
      expect(emittedLog).toBeDefined();
      expect(emittedLog?.sourceType).toBe('preparation_lesson');
    });
  });

  // =========================================================================
  // F. A composed Preparation activity is recognized as completed by session composer
  // =========================================================================
  describe('F. A composed Preparation activity is recognized as completed by session composer', () => {
    it('F1. Session composer recognizes preparation topic completed today and excludes it from eligible candidates', () => {
      const todayStr = '2026-10-04';

      const prepProgress: Record<string, PreparationTopicProgress> = {
        'prep-lang': {
          topicId: 'prep-lang',
          sectionId: 'coding',
          domainId: 'python',
          currentStage: 'learn',
          completedStages: ['orient', 'learn'],
          stageProgress: {
            orient: { timeSpentMinutes: 10, completedAt: '2026-10-04T09:00:00Z' },
            learn: { timeSpentMinutes: 20, completedAt: '2026-10-04T09:30:00Z' },
            apply: { timeSpentMinutes: 0 },
            assess: { timeSpentMinutes: 0 },
            review: { timeSpentMinutes: 0 },
            interview: { timeSpentMinutes: 0 },
            evidence: { timeSpentMinutes: 0 },
          },
          lastAccessedAt: '2026-10-04T09:30:00Z',
          totalTimeSpentMinutes: 30,
          evidenceStrength: 30,
          freshness: 'fresh',
          createdAt: '2026-10-04T09:00:00Z',
          updatedAt: '2026-10-04T09:30:00Z',
        },
      };

      const plan = composeAdaptiveSession({
        availableMinutes: 60,
        todayStr,
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: prepProgress,
      });

      // prep-lang is completed and must not be selected as an active uncompleted activity
      const prepLangActivity = plan.activities.find((a) => a.targetId === 'prep-lang');
      expect(prepLangActivity).toBeUndefined();
    });

    it('F2. Session composer recognizes topic with today evidenceLog as completed', () => {
      const todayStr = '2026-10-04';
      const evidenceLogs: EvidenceLog[] = [
        {
          id: 'ev-prep-today',
          topicId: 'prep-sql',
          domainId: 'sql',
          score: 70,
          confidence: 3,
          timestamp: '2026-10-04T10:00:00Z',
          sourceType: 'preparation_lesson',
          sourceId: 'prep-sql:orient',
        },
      ];

      const plan = composeAdaptiveSession({
        availableMinutes: 60,
        todayStr,
        preparationTopics: PREPARATION_TOPICS,
        evidenceLogs,
      });

      const prepSqlActivity = plan.activities.find((a) => a.targetId === 'prep-sql');
      expect(prepSqlActivity).toBeUndefined();
    });
  });

  // =========================================================================
  // G. Downstream evidence flow & aggregation
  // =========================================================================
  describe('G. Downstream evidence flow & aggregation', () => {
    it('G1. Emitted preparation evidence appears in bridged roadmap topic readiness in skillsEngine', () => {
      const evidenceLog: EvidenceLog = {
        id: 'evidence-prep-lang-test',
        topicId: 'prep-lang',
        domainId: 'python',
        score: 70,
        confidence: 3,
        timestamp: '2026-10-04T10:00:00Z',
        sourceType: 'preparation_lesson',
        sourceId: 'prep-lang:orient',
        details: 'Preparation stage orient completed',
      };

      const skillStates: Record<string, TopicSkillState> = {
        'prep-lang': {
          topicId: 'prep-lang',
          domainId: 'python',
          evidenceStrength: 25,
          freshness: 'fresh',
          lastPracticedAt: '2026-10-04T10:00:00Z',
        },
      };

      const roadmapTopic = TOPICS.find((t) => t.id === 'topic-py-basics')!;
      const domain = DOMAINS.find((d) => d.id === 'python');

      const readiness = calculateTopicReadiness(
        roadmapTopic,
        domain,
        [],
        {},
        [],
        {},
        [],
        [evidenceLog],
        skillStates,
        [],
        '2026-10-04'
      );

      // The bridged preparation evidence appears in supportingEvidence
      const prepEvidenceItem = readiness.supportingEvidence.find(
        (e) => e.id === 'evidence-prep-lang-test'
      );
      expect(prepEvidenceItem).toBeDefined();
      expect(prepEvidenceItem?.scoreContribution).toBe(70);
    });

    it('G2. Canonical preparation EvidenceLog resolves in evidenceTrace', () => {
      const log: EvidenceLog = {
        id: 'ev-trace-prep-1',
        topicId: 'prep-dbms',
        domainId: 'dbms',
        score: 70,
        confidence: 3,
        timestamp: '2026-10-04T10:00:00Z',
        sourceType: 'preparation_lesson',
        sourceId: 'prep-dbms:orient',
        details: 'Preparation stage "orient" completed for DBMS',
      };

      const catalog: EvidenceCatalog = {
        topics: [],
        taskDefinitions: [],
        taskProgress: {},
        dsaProblems: [],
        dsaProgress: {},
        dsaAttempts: [],
        practiceSessions: [],
        practiceAttempts: [],
        evidenceLogs: [log],
        skillStates: {},
        todayISO: '2026-10-04',
        preparationTopicProgress: {},
      };

      const resolved = resolveEvidenceSource('evidence_log', 'ev-trace-prep-1', catalog);
      expect(resolved.availability).toBe('available');
      expect(resolved.label).toContain('preparation lesson');
      expect(resolved.strength).toBe(70);
      expect(resolved.timestamp).toBe('2026-10-04T10:00:00Z');
    });

    it('G3. Adaptive engine calculateWeakness reflects fresh preparation skillState', () => {
      const task = TASK_DEFINITIONS.find((t) => t.id === 'task-101') || {
        id: 'task-test',
        title: 'Test',
        description: 'Test description',
        domainId: 'python',
        topicId: 'prep-lang',
        phaseId: 'phase-1',
        estimatedMinutes: 30,
        importance: 8,
        taskType: 'practice',
        createdAt: '2026-10-01',
      };

      const initialWeakness = calculateWeakness(task, {});
      expect(initialWeakness).toBe(85); // untested: (100 - 0) * 0.85 = 85

      const skillStates: Record<string, TopicSkillState> = {
        [task.topicId]: {
          topicId: task.topicId,
          domainId: 'python',
          evidenceStrength: 25,
          freshness: 'fresh',
          lastPracticedAt: '2026-10-04T10:00:00Z',
        },
      };

      const updatedWeakness = calculateWeakness(task, skillStates);
      // fresh: (100 - 25) * 1.0 = 75
      expect(updatedWeakness).toBe(75);
      expect(updatedWeakness).toBeLessThan(initialWeakness);
    });
  });

  // =========================================================================
  // H. Existing Task 2 cross-subsystem handoff behavior remains intact
  // =========================================================================
  describe('H. Existing Task 2 cross-subsystem handoff behavior remains intact', () => {
    it('H1. DSA deep link handoff still completes, advances session and returns to dashboard', () => {
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

      const initialCompleted = capturedSession!.sessionState?.completedActivityIds.length ?? 0;

      act(() => {
        capturedPlacement!.setRoute('dsa', 'dsa-001');
      });

      expect(capturedPlacement!.currentRoute).toBe('dsa');

      const notesInput = screen.getByPlaceholderText(/e\.g\. O\(N\) time complexity/i);
      fireEvent.change(notesInput, { target: { value: 'Solved with hash map' } });

      const submitBtn = screen.getByRole('button', { name: /Log Attempt & Record Evidence/i });
      act(() => {
        fireEvent.click(submitBtn);
      });

      expect(capturedPlacement!.currentRoute).toBe('dashboard');
      expect(capturedSession!.sessionState?.completedActivityIds.length).toBe(initialCompleted + 1);
    });

    it('H2. Practice deep link handoff opens runner modal and preserves session across navigation', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;

      function TestApp() {
        capturedPlacement = usePlacement();
        return (
          <div>
            {capturedPlacement.currentRoute === 'practice' && <PracticeView />}
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

      act(() => {
        capturedPlacement!.setRoute('practice', 'practice-apt-01');
      });

      expect(screen.getByTestId('practice-runner-modal')).toBeDefined();
    });
  });
});
