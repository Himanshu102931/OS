import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { useSession } from '../components/dashboard/SessionContext';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { PreparationHubView } from '../components/preparation/PreparationHubView';
import { getPreparationTopic } from '../data/preparationDataset';
import { getDefaultStorageState } from '../storage/storageAdapter';
import type {
  DailyCheckIn,
  DailyTaskAssignment,
  PracticeAttempt,
} from '../types';

describe('P2 CORRECTIVE AUDIT — REGRESSION TESTS', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/preparation';
  });

  const pythonTopic = getPreparationTopic('prep-lang')!;

  // =========================================================================
  // 1. Stale cursor writes must not overwrite canonical progress/evidence
  // =========================================================================
  describe('Step 2: Stale cursor writes must not overwrite canonical progress/evidence', () => {
    it('finishing Learn from pristine state preserves evidenceStrength, freshness, and stage timestamps', () => {
      let capturedContext: ReturnType<typeof usePlacement> | null = null;
      function Harness() {
        capturedContext = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Verify no prior progress
      expect(capturedContext!.preparationTopicProgress['prep-lang']).toBeUndefined();

      // Jump to the last subtopic via outline
      const outlineBtn = screen.getByRole('button', { name: /Outline/i });
      act(() => {
        fireEvent.click(outlineBtn);
      });

      const lastSubtopicName = pythonTopic.subtopics[pythonTopic.subtopics.length - 1];
      const lastSubtopicBtn = screen.getByRole('button', {
        name: new RegExp(lastSubtopicName, 'i'),
      });
      act(() => {
        fireEvent.click(lastSubtopicBtn);
      });

      // Click "Finish Learning & Go to Practice"
      const finishBtn = screen.getByRole('button', { name: /Finish Learning & Go to Practice/i });
      act(() => {
        fireEvent.click(finishBtn);
      });

      const progress = capturedContext!.preparationTopicProgress['prep-lang'];
      expect(progress).toBeDefined();

      // Canonical stages Orient and Learn must both be completed
      expect(progress.completedStages).toContain('orient');
      expect(progress.completedStages).toContain('learn');

      // Evidence strength must have increased (applyPreparationStageCompletion awards points)
      expect(progress.evidenceStrength).toBeGreaterThan(0);
      expect(progress.freshness).toBe('fresh');

      // Stage timestamps must be preserved
      expect(progress.stageProgress.orient?.completedAt).toBeDefined();
      expect(progress.stageProgress.learn?.completedAt).toBeDefined();

      // Active step cursor must point to practice
      expect(progress.learningCursor?.activeStep).toBe('practice');
    });
  });

  // =========================================================================
  // 2. Practice-to-topic identity isolation
  // =========================================================================
  describe('Step 3: Practice-to-topic identity isolation', () => {
    it('Topic A must NOT display Topic B attempts even if both share the same domainId', () => {
      // Both prep-lang and a synthetic topic share domainId 'python'
      const attemptTopicB: PracticeAttempt = {
        id: 'attempt-topic-b-1',
        sessionId: 'session-py-syntax-1',
        topicId: 'prep-coding-ds', // Topic B
        domainId: pythonTopic.domainId, // Same domain 'python' or shared domain
        date: '2026-10-27',
        completedAt: '2026-10-27T10:00:00Z',
        sessionTitle: 'Topic B Practice Drill',
        category: 'coding',
        totalQuestions: 5,
        correctCount: 5,
        scorePct: 100,
        accuracyPct: 100,
        passingScorePct: 70,
        passed: true,
        totalTimeSeconds: 240,
        userAnswers: [],
      };

      const state = getDefaultStorageState();
      state.practiceAttempts = [attemptTopicB];
      localStorage.setItem('placementos_v1_state', JSON.stringify(state));

      render(
        <PlacementProvider>
          <SessionProvider>
            <TopicWorkspace topic={pythonTopic} />
          </SessionProvider>
        </PlacementProvider>
      );

      // Switch to Practice step
      const practiceStepBtn = screen.getByRole('button', { name: /2\.\s*Practice/i });
      act(() => {
        fireEvent.click(practiceStepBtn);
      });

      // Python topic (prep-lang) has NO attempts of its own
      expect(screen.queryByText('Topic B Practice Drill')).not.toBeInTheDocument();
      expect(screen.queryByText(/Recorded Practice Attempts/i)).not.toBeInTheDocument();
    });

    it('integrated practice workflow: starts runner, answers, submits, closes, and verifies canonical attempt and evidence on topic', () => {
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

      // 1. Navigate into prep-lang topic
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      // 2. Select Practice step
      const practiceStepBtn = screen.getByRole('button', { name: /2\.\s*Practice/i });
      act(() => {
        fireEvent.click(practiceStepBtn);
      });

      // Confirm no attempts initially
      expect(screen.queryByTestId('recorded-practice-attempts')).not.toBeInTheDocument();

      // 3. Launch real practice runner
      const startDrillBtn = screen.getByRole('button', { name: /Start Practice Drill/i });
      act(() => {
        fireEvent.click(startDrillBtn);
      });

      // 4. In PracticeSessionRunner intro step: click Start Assessment
      const dialog = screen.getByRole('dialog');
      const startAssessmentBtn = within(dialog).getByRole('button', { name: /^Start Assessment$/i });
      act(() => {
        fireEvent.click(startAssessmentBtn);
      });

      // 5. Answer all questions until submitted
      while (screen.queryByTestId('diagnostic-pulse-rail')) {
        const dialog = screen.getByRole('dialog');
        const textarea = within(dialog).queryByRole('textbox');
        if (textarea) {
          act(() => {
            fireEvent.change(textarea, { target: { value: 'My verified response notes' } });
            const checkbox = within(dialog).queryByRole('checkbox');
            if (checkbox) fireEvent.click(checkbox);
          });
        } else {
          // Objective question: select the first option
          const optionButtons = within(dialog)
            .getAllByRole('button')
            .filter((btn) => /^[A-D]\s/i.test(btn.textContent?.trim() || ''));
          if (optionButtons.length > 0) {
            act(() => {
              fireEvent.click(optionButtons[0]);
            });
          }
        }

        const nextBtn = within(dialog).queryByRole('button', { name: /Next Question/i });
        if (nextBtn) {
          act(() => {
            fireEvent.click(nextBtn);
          });
        } else {
          const submitBtn = within(dialog).getByRole('button', { name: /Submit Assessment/i });
          act(() => {
            fireEvent.click(submitBtn);
          });
          break;
        }
      }

      // 6. Verify result step in runner dialog
      expect(
        screen.getByText(/One attempt and one evidence event recorded for this session/i)
      ).toBeInTheDocument();

      // 7. Click the topic-specific return button (no manual reopening needed!)
      const returnBtn = screen.getByRole('button', {
        name: (content) => content.includes('Return to') && content.includes('Python'),
      });
      act(() => {
        fireEvent.click(returnBtn);
      });

      // 8. Explicitly verify route and workspace remain on the original topic
      expect(capturedPlacement!.routeState.route).toBe('preparation');
      expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');
      expect(screen.getByTestId('topic-knowledge-workspace')).toBeInTheDocument();

      // 9. Verify recorded attempt in UI is visible on the Practice step
      const recordedSection = screen.getByTestId('recorded-practice-attempts');
      expect(recordedSection).toBeInTheDocument();
      expect(within(recordedSection).getByText('Python Fundamentals Drill')).toBeInTheDocument();

      // 10. Verify context state has exactly 1 practice attempt and 1 evidence event for prep-lang
      expect(capturedPlacement!.practiceAttempts).toHaveLength(1);
      expect(capturedPlacement!.practiceAttempts[0].topicId).toBe('prep-lang');
      expect(capturedPlacement!.practiceAttempts[0].sessionId).toBe('practice-python-01');

      const matchingEvidence = capturedPlacement!.evidenceLogs.filter(
        (e) => e.topicId === 'prep-lang' && e.sourceId === 'practice-python-01'
      );
      expect(matchingEvidence).toHaveLength(1);
      expect(matchingEvidence[0].domainId).toBe('python');

      // 11. Check step is accessible directly from the same workspace
      const checkTabBtn = screen.getByRole('button', { name: /3\.\s*Check/i });
      act(() => {
        fireEvent.click(checkTabBtn);
      });
      expect(screen.getByRole('heading', { name: /Check Understanding/i })).toBeInTheDocument();
      expect(screen.getByText(/1 attempt\(s\)/i)).toBeInTheDocument();
    });

    it('closing practice runner early returns to topic without recording attempt or evidence', () => {
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

      // 1. Navigate to prep-lang topic workspace
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      // 2. Select Practice step
      const practiceStepBtn = screen.getByRole('button', { name: /2\.\s*Practice/i });
      act(() => {
        fireEvent.click(practiceStepBtn);
      });

      // 3. Launch practice runner
      const startDrillBtn = screen.getByRole('button', { name: /Start Practice Drill/i });
      act(() => {
        fireEvent.click(startDrillBtn);
      });

      // 4. Modal is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // 5. Click Cancel without submitting
      const cancelBtn = within(dialog).getByRole('button', { name: /Cancel/i });
      act(() => {
        fireEvent.click(cancelBtn);
      });

      // 6. Dialog is closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 7. Topic workspace remains open at prep-lang
      expect(capturedPlacement!.routeState.route).toBe('preparation');
      expect(capturedPlacement!.routeState.targetId).toBe('prep-lang');
      expect(screen.getByTestId('topic-knowledge-workspace')).toBeInTheDocument();

      // 8. No attempts or evidence recorded
      expect(capturedPlacement!.practiceAttempts).toHaveLength(0);
      expect(screen.queryByTestId('recorded-practice-attempts')).not.toBeInTheDocument();
      const prepProgress = capturedPlacement!.preparationTopicProgress['prep-lang'];
      expect(prepProgress?.completedStages?.includes('apply')).toBeFalsy();
      expect(prepProgress?.completedStages?.includes('assess')).toBeFalsy();
      expect(prepProgress?.stageProgress?.apply?.completedAt).toBeUndefined();
      expect(prepProgress?.stageProgress?.assess?.completedAt).toBeUndefined();
    });

    it('PracticeSessionRunner prevents repeated submissions and duplicate evidence creation', () => {
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

      const practiceStepBtn = screen.getByRole('button', { name: /2\.\s*Practice/i });
      act(() => {
        fireEvent.click(practiceStepBtn);
      });

      const startDrillBtn = screen.getByRole('button', { name: /Start Practice Drill/i });
      act(() => {
        fireEvent.click(startDrillBtn);
      });

      const dialog = screen.getByRole('dialog');
      const startAssessmentBtn = within(dialog).getByRole('button', { name: /^Start Assessment$/i });
      act(() => {
        fireEvent.click(startAssessmentBtn);
      });

      while (screen.queryByTestId('diagnostic-pulse-rail')) {
        const dialog = screen.getByRole('dialog');
        const textarea = within(dialog).queryByRole('textbox');
        if (textarea) {
          act(() => {
            fireEvent.change(textarea, { target: { value: 'Answer' } });
            const checkbox = within(dialog).queryByRole('checkbox');
            if (checkbox) fireEvent.click(checkbox);
          });
        } else {
          const optionButtons = within(dialog)
            .getAllByRole('button')
            .filter((btn) => /^[A-D]\s/i.test(btn.textContent?.trim() || ''));
          if (optionButtons.length > 0) {
            act(() => {
              fireEvent.click(optionButtons[0]);
            });
          }
        }

        const nextBtn = within(dialog).queryByRole('button', { name: /Next Question/i });
        if (nextBtn) {
          act(() => {
            fireEvent.click(nextBtn);
          });
        } else {
          const submitBtn = within(dialog).getByRole('button', { name: /Submit Assessment/i });
          act(() => {
            fireEvent.click(submitBtn);
          });
          act(() => {
            fireEvent.click(submitBtn);
          });
          break;
        }
      }

      expect(capturedPlacement!.practiceAttempts).toHaveLength(1);
      const evidence = capturedPlacement!.evidenceLogs.filter(
        (e) => e.topicId === 'prep-lang' && e.sourceId === 'practice-python-01'
      );
      expect(evidence).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. Remove misleading legacy completion shortcuts
  // =========================================================================
  describe('Step 4: Remove misleading legacy completion shortcuts', () => {
    it('does NOT expose Mark Learn complete before the final subtopic', () => {
      render(
        <PlacementProvider>
          <SessionProvider>
            <TopicWorkspace topic={pythonTopic} />
          </SessionProvider>
        </PlacementProvider>
      );

      // On subtopic 1 of 15, "Mark Learn complete" should NOT exist
      expect(screen.queryByTestId('mark-learn-complete')).not.toBeInTheDocument();
    });

    it('does NOT contain obsolete mark-assess-complete, mark-review-complete, or mark-evidence-complete buttons', () => {
      render(
        <PlacementProvider>
          <SessionProvider>
            <TopicWorkspace topic={pythonTopic} />
          </SessionProvider>
        </PlacementProvider>
      );

      expect(screen.queryByTestId('mark-assess-complete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mark-review-complete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mark-evidence-complete')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Session banner visibility requires matching active session activity
  // =========================================================================
  describe('Step 5: Session banner visibility requires matching active session activity', () => {
    it('opening a topic with targetId from Learn does NOT show session banner or Complete Activity button', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      function Harness() {
        capturedPlacement = usePlacement();
        return <TopicWorkspace topic={pythonTopic} />;
      }

      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Ordinary navigation from Learn Hub passes targetId='prep-lang'
      act(() => {
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      // No active session exists, so no session deep-link banner should be shown!
      expect(screen.queryByTestId('session-deep-link-banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Complete Activity & Advance/i })).not.toBeInTheDocument();

      // Back button should return to Preparation Hub, NOT Today
      expect(screen.getByText('Preparation Hub')).toBeInTheDocument();
      expect(screen.queryByText('Back to Today')).not.toBeInTheDocument();
    });

    it('unrelated active session activity (Two Pointers) does NOT show banner on Python topic', () => {
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
          referenceId: 'task-101', // Two Pointers
          allocatedMinutes: 60,
          completed: false,
        },
      ];

      act(() => {
        capturedPlacement!.commitDailyPlan(checkIn, assignments);
        capturedSession!.composeSession(120, 'balanced');
        capturedPlacement!.setRoute('preparation', 'prep-lang');
      });

      // The active session is for Two Pointers ('task-101'), not Python ('prep-lang')!
      // Therefore, Python must NOT show the session deep-link banner or Complete Activity button
      expect(screen.queryByTestId('session-deep-link-banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Complete Activity & Advance/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. PreparationHubView excludes retired interview_career section in Simple Mode
  // =========================================================================
  describe('Step 6: PreparationHubView excludes retired interview_career section', () => {
    it('PreparationHubView displays only active sections and hides interview_career', () => {
      render(
        <PlacementProvider>
          <SessionProvider>
            <PreparationHubView />
          </SessionProvider>
        </PlacementProvider>
      );

      expect(screen.getAllByText('CODING').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CORE CS').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('APTITUDE & COMMUNICATION').length).toBeGreaterThanOrEqual(1);

      // INTERVIEW & CAREER must be hidden in Simple Mode presentation
      expect(screen.queryByText('INTERVIEW & CAREER')).not.toBeInTheDocument();
      expect(screen.queryByText('prep-interview-tech')).not.toBeInTheDocument();
    });

    it('direct navigation to retired topic prep-interview-tech redirects to active hub without rendering retired module', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
      }

      window.location.hash = '#/preparation/prep-interview-tech';
      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Safe fallback: Does NOT render TopicWorkspace for retired interview
      expect(screen.queryByTestId('topic-knowledge-workspace')).not.toBeInTheDocument();
      // Renders active Preparation Hub View without blank screen
      expect(screen.getByTestId('preparation-hub-view')).toBeInTheDocument();
      // Redirects routeState cleanly to active hub
      expect(capturedPlacement!.routeState.targetId).toBeUndefined();
      expect(capturedPlacement!.routeState.route).toBe('preparation');
    });

    it('direct navigation to retired topic prep-interview-career redirects to active hub without rendering retired module', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
      }

      window.location.hash = '#/preparation/prep-interview-career';
      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      expect(screen.queryByTestId('topic-knowledge-workspace')).not.toBeInTheDocument();
      expect(screen.getByTestId('preparation-hub-view')).toBeInTheDocument();
      expect(capturedPlacement!.routeState.targetId).toBeUndefined();
      expect(capturedPlacement!.routeState.route).toBe('preparation');
    });

    it('direct navigation to valid active topic prep-sql renders SQL workspace without redirection', () => {
      let capturedPlacement: ReturnType<typeof usePlacement> | null = null;
      function Harness() {
        capturedPlacement = usePlacement();
        return <PreparationHubView />;
      }

      window.location.hash = '#/preparation/prep-sql';
      render(
        <PlacementProvider>
          <SessionProvider>
            <Harness />
          </SessionProvider>
        </PlacementProvider>
      );

      // Valid active topic renders TopicWorkspace immediately
      expect(screen.getByTestId('topic-knowledge-workspace')).toBeInTheDocument();
      expect(capturedPlacement!.routeState.targetId).toBe('prep-sql');
      expect(screen.queryByTestId('preparation-hub-view')).not.toBeInTheDocument();
    });
  });
});
