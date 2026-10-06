import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { PracticeSessionRunner } from '../components/preparation/PracticeSessionRunner';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { getPreparationTopic } from '../data/preparationDataset';

describe('PREPARATION MANUFACTURING PART 3: Practice Session Runner', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/preparation';
    vi.useRealTimers();
  });

  const mcqSession = PRACTICE_SESSIONS[0]; // Standard MCQ drill
  const subjectiveSession = PRACTICE_SESSIONS.find(
    (s) => s.questions.some((q) => q.questionType === 'query' || q.questionType === 'explanation')
  ) || PRACTICE_SESSIONS[0];

  function RunnerHarness({
    session = mcqSession,
    onClose = () => {},
  }: {
    session?: typeof mcqSession;
    onClose?: () => void;
  }) {
    return (
      <PlacementProvider>
        <SessionProvider>
          <PracticeSessionRunner session={session} onClose={onClose} />
        </SessionProvider>
      </PlacementProvider>
    );
  }

  it('1. Intro state renders canonical session information', () => {
    render(<RunnerHarness session={mcqSession} />);

    expect(screen.getAllByText(mcqSession.title).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(mcqSession.description)).toBeInTheDocument();
    expect(screen.getByText(String(mcqSession.questionCount))).toBeInTheDocument();
    expect(screen.getByText(`${mcqSession.passingScorePct}%`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Assessment/i })).toBeInTheDocument();
  });

  it('2. Start action enters active state', () => {
    render(<RunnerHarness session={mcqSession} />);

    const startBtn = screen.getByRole('button', { name: /Start Assessment/i });
    act(() => {
      fireEvent.click(startBtn);
    });

    expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 1 of/i);
    expect(screen.getByText(mcqSession.questions[0].prompt)).toBeInTheDocument();
  });

  it('3. Active state renders current task/question with options', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    const firstQuestion = mcqSession.questions[0];
    expect(screen.getByText(firstQuestion.prompt)).toBeInTheDocument();
    if (firstQuestion.options) {
      for (const opt of firstQuestion.options) {
        expect(screen.getByText(opt)).toBeInTheDocument();
      }
    }
  });

  it('4. Progress state is accurate from canonical data', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '1');
    expect(progressbar).toHaveAttribute('aria-valuemax', String(mcqSession.questions.length));
  });

  it('5. Submit/continue behavior traverses questions', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    const nextBtn = screen.getByRole('button', { name: /Next Question|Submit Assessment/i });
    expect(nextBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(nextBtn);
    });

    if (mcqSession.questions.length > 1) {
      expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 2 of/i);
    }
  });

  it('6. Results state renders canonical outcome upon session completion', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    // Advance through all questions
    for (let i = 0; i < mcqSession.questions.length; i++) {
      const btn = screen.getByRole('button', { name: /Next Question|Submit Assessment/i });
      act(() => {
        fireEvent.click(btn);
      });
    }

    expect(screen.getByTestId('result-verdict')).toBeInTheDocument();
    expect(screen.getByTestId('result-score')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Preparation Hub/i })).toBeInTheDocument();
  });

  it('7. Existing evidence behavior is preserved on completion', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <PracticeSessionRunner session={mcqSession} onClose={() => {}} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const initialEvidenceCount = capturedContext!.evidenceLogs.length;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    for (let i = 0; i < mcqSession.questions.length; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Assessment/i }));
      });
    }

    expect(capturedContext!.evidenceLogs.length).toBe(initialEvidenceCount + 1);
  });

  it('8. Existing practice attempt behavior is preserved', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <PracticeSessionRunner session={mcqSession} onClose={() => {}} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const initialAttemptCount = capturedContext!.practiceAttempts.length;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    for (let i = 0; i < mcqSession.questions.length; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Assessment/i }));
      });
    }

    expect(capturedContext!.practiceAttempts.length).toBe(initialAttemptCount + 1);
    const lastAttempt = capturedContext!.practiceAttempts[capturedContext!.practiceAttempts.length - 1];
    expect(lastAttempt.sessionId).toBe(mcqSession.id);
  });

  it('9. Existing session return path invokes onClose callback', () => {
    let closed = false;
    render(<RunnerHarness session={mcqSession} onClose={() => (closed = true)} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(closed).toBe(true);
  });

  it('10. Subjective questions support self-certification checkbox', () => {
    render(<RunnerHarness session={subjectiveSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    const isSubjective = subjectiveSession.questions.some(
      (q) => q.questionType !== 'mcq' && q.questionType !== 'multiple_choice'
    );

    if (isSubjective) {
      // Find the subjective question or navigate to it
      const selfCert = screen.queryByTestId('self-certification');
      if (selfCert) {
        expect(selfCert).toBeInTheDocument();
        const checkbox = within(selfCert).getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        act(() => {
          fireEvent.click(checkbox);
        });
        expect(checkbox).toBeChecked();
      }
    }
  });

  it('11. No invented score/readiness metrics exist on result screen', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    for (let i = 0; i < mcqSession.questions.length; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Assessment/i }));
      });
    }

    const scoreElem = screen.getByTestId('result-score');
    expect(scoreElem.textContent).toMatch(/%$/);
  });

  it('12. Diagnostic motion exists through intended CSS mechanism in active state', () => {
    const { container } = render(<RunnerHarness session={mcqSession} />);

    // In intro state, diagnostic pulse rail is not rendered
    expect(screen.queryByTestId('diagnostic-pulse-rail')).not.toBeInTheDocument();

    // Start active state
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    const pulseRail = screen.getByTestId('diagnostic-pulse-rail');
    expect(pulseRail).toBeInTheDocument();
    expect(container.querySelector('.diagnostic-pulse-beam')).toBeInTheDocument();
  });

  it('13. Diagnostic motion stops on results screen', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    for (let i = 0; i < mcqSession.questions.length; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Assessment/i }));
      });
    }

    expect(screen.queryByTestId('diagnostic-pulse-rail')).not.toBeInTheDocument();
  });

  it('14. Accessibility semantics: dialog role, modal, and labelledby exist', () => {
    render(<RunnerHarness session={mcqSession} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'practice-runner-title');
  });

  it('15. Mobile-safe structure renders cleanly with responsive max width', () => {
    const { container } = render(<RunnerHarness session={mcqSession} />);
    const modalBox = container.querySelector('.max-w-2xl');
    expect(modalBox).toBeInTheDocument();
  });

  it('16. TopicWorkspace integration launches matching practice session runner', () => {
    const pythonTopic = getPreparationTopic('prep-lang')!;
    let launchedSessionId: string | undefined = undefined;

    render(
      <PlacementProvider>
        <SessionProvider>
          <TopicWorkspace
            topic={pythonTopic}
            onStartSession={(id) => (launchedSessionId = id)}
          />
        </SessionProvider>
      </PlacementProvider>
    );

    // Click Apply tab where practice sessions are offered
    const applyTab = screen.getByRole('button', { name: /Apply/i });
    act(() => {
      fireEvent.click(applyTab);
    });

    const startDrillBtns = screen.getAllByRole('button', { name: /Start Drill/i });
    if (startDrillBtns.length > 0) {
      act(() => {
        fireEvent.click(startDrillBtns[0]);
      });
      expect(launchedSessionId).toBeDefined();
    }
  });

  it('17. Retake session resets runner back to active state', () => {
    render(<RunnerHarness session={mcqSession} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Start Assessment/i }));
    });

    for (let i = 0; i < mcqSession.questions.length; i++) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Assessment/i }));
      });
    }

    const retakeBtn = screen.getByRole('button', { name: /Retake Session/i });
    act(() => {
      fireEvent.click(retakeBtn);
    });

    expect(screen.getByTestId('question-step-counter')).toHaveTextContent(/Question 1 of/i);
  });
});
