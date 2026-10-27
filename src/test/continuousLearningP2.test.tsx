import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { AppShell } from '../components/layout/AppShell';
import { getPreparationTopic } from '../data/preparationDataset';
import {
  getDefaultStorageState,
  validateImportState,
  validateStorageState,
} from '../storage/storageAdapter';
import type {
  DailyCheckIn,
  DailyTaskAssignment,
  PreparationTopic,
  PracticeAttempt,
} from '../types';

describe('P2 CONTINUOUS LEARNING EXPERIENCE & PROGRESSION INTEGRITY', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/preparation';
  });

  const pythonTopic = getPreparationTopic('prep-lang')!;
  const codingDsTopic = getPreparationTopic('prep-coding-ds')!;

  function WorkspaceHarness({
    topic = pythonTopic,
    onBackToHub,
    onStartSession,
  }: {
    topic?: PreparationTopic;
    onBackToHub?: () => void;
    onStartSession?: (sessionId?: string) => void;
  }) {
    return (
      <PlacementProvider>
        <SessionProvider>
          <TopicWorkspace
            topic={topic}
            onBackToHub={onBackToHub}
            onStartSession={onStartSession}
          />
        </SessionProvider>
      </PlacementProvider>
    );
  }

  // =========================================================================
  // A. Three-part interface
  // =========================================================================
  describe('A. Three-part interface', () => {
    it('A1. Exactly Learn, Practice, and Check appear as primary progression', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      const stepsNav = screen.getByTestId('continuous-learning-steps');
      expect(stepsNav).toBeInTheDocument();

      const buttons = within(stepsNav).getAllByRole('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveTextContent(/1\.\s*Learn/i);
      expect(buttons[1]).toHaveTextContent(/2\.\s*Practice/i);
      expect(buttons[2]).toHaveTextContent(/3\.\s*Check/i);
    });

    it('A2. Seven canonical stage tabs do NOT appear in the user-facing workspace', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      expect(screen.queryByRole('navigation', { name: /Topic Learning Progression Stages/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('knowledge-flow-rail')).not.toBeInTheDocument();
      expect(screen.queryByText(/Stage: Orient/i)).not.toBeInTheDocument();
    });

    it('A3. Existing rich topic content remains fully accessible', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      expect(screen.getByText('Understand')).toBeInTheDocument();
      expect(screen.getByText(pythonTopic.subtopicCards[0].what)).toBeInTheDocument();
      expect(screen.getByText(pythonTopic.subtopicCards[0].why)).toBeInTheDocument();
      expect(screen.getByText(pythonTopic.subtopicCards[0].example)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // B. Python subtopic navigation
  // =========================================================================
  describe('B. Python subtopic navigation', () => {
    it('B1. New learner opens prep-lang and first curriculum subtopic is displayed', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      expect(screen.getByText(/Lesson 1 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: pythonTopic.subtopics[0] })).toBeInTheDocument();
    });

    it('B2. Next advances exactly one subtopic, and Back returns exactly one subtopic', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      const nextBtn = screen.getByRole('button', { name: /Next Subtopic/i });
      act(() => {
        fireEvent.click(nextBtn);
      });

      expect(screen.getByText(/Lesson 2 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: pythonTopic.subtopics[1] })).toBeInTheDocument();

      const prevBtn = screen.getByRole('button', { name: /^Previous$/i });
      act(() => {
        fireEvent.click(prevBtn);
      });

      expect(screen.getByText(/Lesson 1 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: pythonTopic.subtopics[0] })).toBeInTheDocument();
    });

    it('B3. Navigating subtopics alone creates 0 evidence logs', () => {
      let capturedContext: ReturnType<typeof usePlacement> | null = null;
      function Capture() {
        capturedContext = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Capture />
          </SessionProvider>
        </PlacementProvider>
      );

      const initialLogs = capturedContext!.evidenceLogs.length;

      const nextBtn = screen.getByRole('button', { name: /Next Subtopic/i });
      act(() => {
        fireEvent.click(nextBtn);
        fireEvent.click(nextBtn);
      });

      expect(capturedContext!.evidenceLogs.length).toBe(initialLogs);
    });

    it('B4. The final subtopic offers deliberate completion action', () => {
      render(<WorkspaceHarness topic={pythonTopic} />);

      // Jump to last subtopic via outline
      const outlineBtn = screen.getByRole('button', { name: /Outline/i });
      act(() => {
        fireEvent.click(outlineBtn);
      });

      const lastSubtopicBtn = screen.getByRole('button', {
        name: new RegExp(pythonTopic.subtopics[pythonTopic.subtopics.length - 1], 'i'),
      });
      act(() => {
        fireEvent.click(lastSubtopicBtn);
      });

      expect(
        screen.getByText(new RegExp(`Lesson ${pythonTopic.subtopics.length} of ${pythonTopic.subtopics.length}`, 'i'))
      ).toBeInTheDocument();

      const finishBtn = screen.getByTestId('mark-learn-complete');
      expect(finishBtn).toBeInTheDocument();
      expect(finishBtn).toHaveTextContent(/Finish Learning & Go to Practice/i);
    });
  });

  // =========================================================================
  // C. Resume after refresh
  // =========================================================================
  describe('C. Resume after refresh', () => {
    it('C1. Reaching subtopic 6 saves learning cursor and restores exact position on remount', () => {
      let capturedContext: ReturnType<typeof usePlacement> | null = null;
      function Capture() {
        capturedContext = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      const { unmount } = render(
        <PlacementProvider>
          <SessionProvider>
            <Capture />
          </SessionProvider>
        </PlacementProvider>
      );

      // Advance to subtopic index 5 (Lesson 6)
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /Next Subtopic/i }));
        });
      }

      expect(screen.getByText(/Lesson 6 of 15/i)).toBeInTheDocument();
      expect(
        capturedContext!.preparationTopicProgress['prep-lang']?.learningCursor?.subtopicIndex
      ).toBe(5);

      // Simulate leave & refresh by unmounting and re-rendering with saved localStorage
      unmount();

      render(
        <PlacementProvider>
          <SessionProvider>
            <Capture />
          </SessionProvider>
        </PlacementProvider>
      );

      expect(screen.getByText(/Lesson 6 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: pythonTopic.subtopics[5] })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // D. Existing progress compatibility
  // =========================================================================
  describe('D. Existing progress compatibility', () => {
    it('D1. Topic with only Orient complete opens in Learn step', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-lang'] = {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'learn',
        completedStages: ['orient'],
        stageProgress: {
          orient: { timeSpentMinutes: 10, completedAt: '2026-10-10T10:00:00Z' },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-10T10:00:00Z',
        totalTimeSpentMinutes: 10,
        evidenceStrength: 15,
        freshness: 'fresh',
        createdAt: '2026-10-10T09:00:00Z',
        updatedAt: '2026-10-10T10:00:00Z',
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(<WorkspaceHarness topic={pythonTopic} />);
      expect(screen.getByTestId('learn-section')).toBeInTheDocument();
      // Jump to last subtopic via outline to access deliberate finish button
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Outline/i }));
      });
      const lastSub = pythonTopic.subtopics[pythonTopic.subtopics.length - 1];
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(lastSub, 'i') }));
      });
      expect(screen.getByTestId('mark-learn-complete')).toBeInTheDocument();
    });

    it('D2. Topic with Orient and Learn complete opens in Practice step', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-lang'] = {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'apply',
        completedStages: ['orient', 'learn'],
        stageProgress: {
          orient: { timeSpentMinutes: 10, completedAt: '2026-10-10T10:00:00Z' },
          learn: { timeSpentMinutes: 20, completedAt: '2026-10-10T10:30:00Z' },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-10T10:30:00Z',
        totalTimeSpentMinutes: 30,
        evidenceStrength: 30,
        freshness: 'fresh',
        createdAt: '2026-10-10T09:00:00Z',
        updatedAt: '2026-10-10T10:30:00Z',
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(<WorkspaceHarness topic={pythonTopic} />);
      expect(screen.getByTestId('practice-section')).toBeInTheDocument();
    });

    it('D3. Topic with all 7 canonical stages complete opens in Check step', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-lang'] = {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'evidence',
        completedStages: ['orient', 'learn', 'apply', 'assess', 'review', 'interview', 'evidence'],
        stageProgress: {
          orient: { timeSpentMinutes: 10 },
          learn: { timeSpentMinutes: 20 },
          apply: { timeSpentMinutes: 30 },
          assess: { timeSpentMinutes: 15 },
          review: { timeSpentMinutes: 10 },
          interview: { timeSpentMinutes: 15 },
          evidence: { timeSpentMinutes: 5 },
        },
        lastAccessedAt: '2026-10-10T11:00:00Z',
        totalTimeSpentMinutes: 105,
        evidenceStrength: 80,
        freshness: 'fresh',
        createdAt: '2026-10-10T09:00:00Z',
        updatedAt: '2026-10-10T11:00:00Z',
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(<WorkspaceHarness topic={pythonTopic} />);
      expect(screen.getByTestId('check-section')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // E. Practice runner integration
  // =========================================================================
  describe('E. Practice runner integration', () => {
    it('E1. Start Practice Drill launches matching runner and recorded attempt displays accurately', () => {
      let launchedId: string | undefined;
      const attempt: PracticeAttempt = {
        id: 'attempt-py-1',
        sessionId: 'session-py-syntax-1',
        topicId: 'prep-lang',
        domainId: 'python',
        date: '2026-10-27',
        sessionTitle: 'Python Syntax & Semantics Drill',
        category: 'coding',
        totalQuestions: 5,
        correctCount: 4,
        scorePct: 80,
        accuracyPct: 80,
        passingScorePct: 70,
        passed: true,
        totalTimeSeconds: 300,
        completedAt: '2026-10-27T10:00:00Z',
        userAnswers: [],
      };

      const state = getDefaultStorageState();
      state.practiceAttempts = [attempt];
      state.preparationTopicProgress['prep-lang'] = {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'apply',
        completedStages: ['orient', 'learn'],
        stageProgress: {
          orient: { timeSpentMinutes: 10 },
          learn: { timeSpentMinutes: 20 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-27T10:00:00Z',
        totalTimeSpentMinutes: 30,
        evidenceStrength: 30,
        freshness: 'fresh',
        createdAt: '2026-10-27T09:00:00Z',
        updatedAt: '2026-10-27T10:00:00Z',
        learningCursor: {
          subtopicIndex: 0,
          activeStep: 'practice',
          lastAccessedAt: '2026-10-27T10:00:00Z',
        },
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(
        <WorkspaceHarness
          topic={pythonTopic}
          onStartSession={(id) => (launchedId = id)}
        />
      );

      expect(screen.getByTestId('practice-section')).toBeInTheDocument();
      expect(screen.getByText(/80% PASS/i)).toBeInTheDocument();
      expect(screen.getByText(/4\/5 correct/i)).toBeInTheDocument();

      const startBtn = screen.getByTestId('start-practice-btn');
      act(() => {
        fireEvent.click(startBtn);
      });
      expect(launchedId).toBeDefined();
    });
  });

  // =========================================================================
  // F. Mastery integrity
  // =========================================================================
  describe('F. Mastery integrity', () => {
    it('F1. Finishing Learn does NOT grant verified competence (evidence strength <= 35)', () => {
      let capturedContext: ReturnType<typeof usePlacement> | null = null;
      function Capture() {
        capturedContext = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Capture />
          </SessionProvider>
        </PlacementProvider>
      );

      // Jump to last subtopic to deliberately complete learning
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Outline/i }));
      });
      const lastSub = pythonTopic.subtopics[pythonTopic.subtopics.length - 1];
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(lastSub, 'i') }));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('mark-learn-complete'));
      });

      const skill = capturedContext!.skillStates['prep-lang'];
      expect(skill.evidenceStrength).toBeLessThanOrEqual(35);
      expect(skill.evidenceStrength).toBeGreaterThan(0);
    });

    it('F2. Opening Check does NOT complete review, interview or evidence stages', () => {
      let capturedContext: ReturnType<typeof usePlacement> | null = null;
      function Capture() {
        capturedContext = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Capture />
          </SessionProvider>
        </PlacementProvider>
      );

      const nav = screen.getByTestId('continuous-learning-steps');
      const checkBtn = within(nav).getByRole('button', { name: /3\. Check/i });
      act(() => {
        fireEvent.click(checkBtn);
      });

      const completed = capturedContext!.preparationTopicProgress['prep-lang']?.completedStages ?? [];
      expect(completed).not.toContain('review');
      expect(completed).not.toContain('interview');
      expect(completed).not.toContain('evidence');
    });

    it('F3. Blocked topic prerequisite gate is strictly enforced', () => {
      render(<WorkspaceHarness topic={codingDsTopic} />);

      expect(screen.getByTestId('prerequisite-gate')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Before starting Coding & Problem Solving, complete Programming Language \(Python\)/i
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('topic-stage-progression')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // G. P0 regression
  // =========================================================================
  describe('G. P0 regression', () => {
    it('G1. Completing Orient does NOT complete Two Pointers or advance session', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      let capturedSession: ReturnType<typeof useSession> | null = null;

      function Harness() {
        capturedPlacement = usePlacement();
        capturedSession = useSession();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      const todayISO = capturedPlacement!.todayDate;
      const checkIn: DailyCheckIn = {
        id: `checkin-${todayISO}`,
        date: todayISO,
        mode: 'normal',
        availableMinutes: 120,
        energyLevel: 'medium',
        assignmentIds: ['assign-tp'],
        totalActualMinutes: 0,
        isSealed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const assignments: DailyTaskAssignment[] = [
        {
          id: 'assign-tp',
          date: todayISO,
          taskType: 'catalog_task',
          referenceId: 'task-101',
          allocatedMinutes: 60,
          completed: false,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
        capturedSession!.composeSession(120, 'balanced');
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      act(() => {
        fireEvent.click(screen.getByTestId('mark-orient-complete'));
      });

      const assign = capturedPlacement!.dailyTaskAssignments.find((a) => a.id === 'assign-tp');
      expect(assign?.completed).toBe(false);
      expect(capturedSession!.currentActivity?.sourceTaskId).toBe('task-101');
    });
  });

  // =========================================================================
  // H. P1 regression
  // =========================================================================
  describe('H. P1 regression', () => {
    it('H1. Exactly four main application navigation destinations exist in AppShell', () => {
      render(
        <PlacementProvider>
          <SessionProvider>
            <AppShell>
              <div>Content</div>
            </AppShell>
          </SessionProvider>
        </PlacementProvider>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navItems = within(nav).getAllByRole('button');
      expect(navItems).toHaveLength(4);
      expect(navItems.map((el) => el.textContent?.trim())).toEqual(['Today', 'Learn', 'Practice', 'Progress']);
    });
  });

  // =========================================================================
  // I. Backup compatibility
  // =========================================================================
  describe('I. Backup compatibility', () => {
    it('I1. Old JSON backups without learningCursor validate and load successfully', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-sql'] = {
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'orient',
        completedStages: [],
        stageProgress: {
          orient: { timeSpentMinutes: 0 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-20T10:00:00Z',
        totalTimeSpentMinutes: 0,
        evidenceStrength: 0,
        freshness: 'untested',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
      };

      expect(validateStorageState(state)).toBe(true);
      expect(validateImportState(state)).toBe(true);
    });

    it('I2. New backups with valid learningCursor round-trip through import validation', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-sql'] = {
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'orient',
        completedStages: [],
        stageProgress: {
          orient: { timeSpentMinutes: 0 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-20T10:00:00Z',
        totalTimeSpentMinutes: 0,
        evidenceStrength: 0,
        freshness: 'untested',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
        learningCursor: {
          subtopicIndex: 3,
          activeStep: 'learn',
          lastAccessedAt: '2026-10-20T10:00:00Z',
        },
      };

      expect(validateStorageState(state)).toBe(true);
      expect(validateImportState(state)).toBe(true);
    });

    it('I3. Malformed learningCursor is rejected by import validation', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-sql'] = {
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'orient',
        completedStages: [],
        stageProgress: {
          orient: { timeSpentMinutes: 0 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-20T10:00:00Z',
        totalTimeSpentMinutes: 0,
        evidenceStrength: 0,
        freshness: 'untested',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
        learningCursor: {
          subtopicIndex: -5 as unknown as number, // invalid negative index
          activeStep: 'invalid_step' as unknown as 'learn',
          lastAccessedAt: '2026-10-20T10:00:00Z',
        },
      };

      expect(validateImportState(state)).toBe(false);
    });
  });

  // =========================================================================
  // J. Topic edge cases
  // =========================================================================
  describe('J. Topic edge cases', () => {
    it('J1. Topic with fewer subtopics or single subtopic renders safely without crashing', () => {
      const minimalTopic: PreparationTopic = {
        ...pythonTopic,
        id: 'prep-minimal',
        title: 'Minimal Topic',
        subtopics: ['Single Core Concept'],
        subtopicCards: [
          {
            what: 'Basic definition',
            why: 'Crucial for understanding',
            example: 'print("hello")',
            practice: 'Type it out',
            proof: 'Runs cleanly',
          },
        ],
      };

      render(<WorkspaceHarness topic={minimalTopic} />);

      expect(screen.getByText(/Lesson 1 of 1/i)).toBeInTheDocument();
      expect(screen.getByText('Single Core Concept')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Finish Learning/i })).toBeInTheDocument();
    });

    it('J2. Out-of-bounds saved cursor safely clamps to highest valid subtopic', () => {
      const state = getDefaultStorageState();
      state.preparationTopicProgress['prep-lang'] = {
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'learn',
        completedStages: [],
        stageProgress: {
          orient: { timeSpentMinutes: 0 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-20T10:00:00Z',
        totalTimeSpentMinutes: 0,
        evidenceStrength: 0,
        freshness: 'untested',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
        learningCursor: {
          subtopicIndex: 999, // out of range
          activeStep: 'learn',
          lastAccessedAt: '2026-10-20T10:00:00Z',
        },
      };
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(<WorkspaceHarness topic={pythonTopic} />);

      // Should clamp to 15 of 15
      expect(screen.getByText(/Lesson 15 of 15/i)).toBeInTheDocument();
    });
  });
});
