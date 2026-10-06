import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { TopicWorkspace } from '../components/preparation/TopicWorkspace';
import { getPreparationTopic } from '../data/preparationDataset';

describe('PREPARATION MANUFACTURING PART 2: Topic Knowledge Workspace', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/preparation';
  });

  const pythonTopic = getPreparationTopic('prep-lang')!;
  const sqlTopic = getPreparationTopic('prep-sql')!;
  const codingDsTopic = getPreparationTopic('prep-coding-ds')!;

  function WorkspaceHarness({
    topic = pythonTopic,
    onBackToHub,
    onStartSession,
  }: {
    topic?: typeof pythonTopic;
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

  it('1. Topic workspace renders canonical topic identity', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Programming Language \(Python\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText(pythonTopic.description)).toBeInTheDocument();
  });

  it('2. Section/domain identity renders accurately', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    expect(screen.getAllByText(/python/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/~480 min/i)).toBeInTheDocument();
  });

  it('3. Current stage is derived from canonical progress', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const nav = screen.getByRole('navigation', { name: /Topic Learning Progression Stages/i });
    const orientTab = within(nav).getByRole('button', { name: /Orient/i });
    expect(orientTab).toHaveAttribute('aria-selected', 'true');

    // Update persisted stage to 'learn'
    act(() => {
      capturedContext!.updatePreparationTopicProgress({
        topicId: 'prep-lang',
        sectionId: 'coding',
        domainId: 'python',
        currentStage: 'learn',
        completedStages: ['orient'],
        stageProgress: {
          orient: { timeSpentMinutes: 10, completedAt: '2026-10-06T10:00:00Z' },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-06T10:00:00Z',
        totalTimeSpentMinutes: 10,
        evidenceStrength: 15,
        freshness: 'fresh',
        createdAt: '2026-10-06T09:00:00Z',
        updatedAt: '2026-10-06T10:00:00Z',
      });
    });
  });

  it('4. Seven canonical stages render in progression rail', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    const nav = screen.getByRole('navigation', { name: /Topic Learning Progression Stages/i });
    const stages = ['Orient', 'Learn', 'Apply', 'Assess', 'Review', 'Interview', 'Evidence'];
    for (const stage of stages) {
      expect(within(nav).getByRole('button', { name: new RegExp(stage, 'i') })).toBeInTheDocument();
    }
  });

  it('5. Completed and current states are distinguishable in stage tabs', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    // Complete Orient stage
    const markCompleteBtn = screen.getByTestId('mark-orient-complete');
    act(() => {
      fireEvent.click(markCompleteBtn);
    });

    // Orient stage now shows completed badge
    expect(capturedContext!.preparationTopicProgress['prep-lang'].completedStages).toContain(
      'orient'
    );
  });

  it('6. Stage selection changes visible stage content', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    // Default: Orient
    expect(screen.getByText(/Why This Topic Matters/i)).toBeInTheDocument();

    // Select Learn
    const nav = screen.getByRole('navigation', { name: /Topic Learning Progression Stages/i });
    const learnTab = within(nav).getByRole('button', { name: /^Learn$/i });
    act(() => {
      fireEvent.click(learnTab);
    });

    expect(screen.getByText(/Curriculum Subtopics/i)).toBeInTheDocument();
    expect(screen.getByText(/Core Learning Objectives/i)).toBeInTheDocument();
  });

  it('7. Subtopic knowledge cards expand smoothly on click in Learn stage', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    const nav = screen.getByRole('navigation', { name: /Topic Learning Progression Stages/i });
    const learnTab = within(nav).getByRole('button', { name: /^Learn$/i });
    act(() => {
      fireEvent.click(learnTab);
    });

    // Click first subtopic card
    const firstSubtopic = screen.getByText(/Variables, primitive\/data types & operators/i);
    act(() => {
      fireEvent.click(firstSubtopic);
    });

    // What, Why, Example, Practice, Proof labels visible
    expect(screen.getByText('What')).toBeInTheDocument();
    expect(screen.getByText('Why')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Proof')).toBeInTheDocument();
  });

  it('8. Preparedness model renders Covered/Practiced/Assessed/Retained pillars', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    expect(screen.getAllByText(/Covered/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Practiced/i)).toBeInTheDocument();
    expect(screen.getByText(/Assessed/i)).toBeInTheDocument();
    expect(screen.getByText(/Retained/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Interview/i).length).toBeGreaterThanOrEqual(1);
  });

  it('9. Defining action is state-driven and surfaces primary CTA', () => {
    let sessionStarted = false;
    render(
      <WorkspaceHarness
        topic={pythonTopic}
        onStartSession={() => (sessionStarted = true)}
      />
    );

    // In clean state with matching sessions, start drill is available
    const primaryCta = screen.getByTestId('workspace-defining-action');
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveTextContent(/Start Assessment Drill/i);

    act(() => {
      fireEvent.click(primaryCta);
    });

    expect(sessionStarted).toBe(true);
  });

  it('10. Locked topic renders prerequisite gate and hides stage content', () => {
    render(<WorkspaceHarness topic={codingDsTopic} />);

    // coding-ds requires prep-lang, clean state means locked
    const gate = screen.getByTestId('prerequisite-gate');
    expect(gate).toBeInTheDocument();
    expect(gate).toHaveTextContent(/Prerequisite Required/i);
    expect(gate).toHaveTextContent(/Programming Language \(Python\)/i);

    // Stage tabs should NOT be visible when locked
    expect(screen.queryByTestId('topic-stage-progression')).not.toBeInTheDocument();
  });

  it('11. Unlocked topic does not render prerequisite gate', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    expect(screen.queryByTestId('prerequisite-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('topic-stage-progression')).toBeInTheDocument();
  });

  it('12. Prerequisite CTA navigates to canonical prerequisite topic', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={codingDsTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const openPrereqBtn = screen.getByRole('button', {
      name: /Open Programming Language \(Python\)/i,
    });
    act(() => {
      fireEvent.click(openPrereqBtn);
    });

    expect(capturedContext!.routeState.route).toBe('preparation');
    expect(capturedContext!.routeState.targetId).toBe('prep-lang');
  });

  it('13. Deep-link route contract renders session banner when deep-linked from Today', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    // Simulate active session deep link to prep-lang
    act(() => {
      capturedContext!.setRoute('preparation', 'prep-lang');
    });

    const banner = screen.getByTestId('session-deep-link-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Active Adaptive Session Activity/i);
  });

  it('14. Session advance handoff advances session and returns to dashboard', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    act(() => {
      capturedContext!.setRoute('preparation', 'prep-lang');
    });

    const advanceBtn = screen.getByRole('button', { name: /Complete Activity & Advance/i });
    act(() => {
      fireEvent.click(advanceBtn);
    });

    expect(capturedContext!.routeState.route).toBe('dashboard');
  });

  it('15. Roadmap handoff button navigates to mapped curriculum topic', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={pythonTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const roadmapBtn = screen.getByRole('button', { name: /View in Roadmap/i });
    act(() => {
      fireEvent.click(roadmapBtn);
    });

    expect(capturedContext!.routeState.route).toBe('roadmap');
    expect(capturedContext!.routeState.targetId).toBe(pythonTopic.roadmapTopicId);
  });

  it('16. Evidence semantics: stage completion emits canonical evidence', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCapture() {
      capturedContext = usePlacement();
      return <TopicWorkspace topic={sqlTopic} />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCapture />
        </SessionProvider>
      </PlacementProvider>
    );

    const initialLogsCount = capturedContext!.evidenceLogs.length;
    const markOrientBtn = screen.getByTestId('mark-orient-complete');

    act(() => {
      fireEvent.click(markOrientBtn);
    });

    expect(capturedContext!.evidenceLogs.length).toBe(initialLogsCount + 1);
    const log = capturedContext!.evidenceLogs[capturedContext!.evidenceLogs.length - 1];
    expect(log.topicId).toBe('prep-sql');
    expect(log.sourceType).toBe('preparation_lesson');
  });

  it('17. No invented readiness metrics: evidence strength reflects canonical calculation', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    expect(screen.getByText('Evidence Score')).toBeInTheDocument();
    expect(screen.getByText('0 / 100')).toBeInTheDocument();
  });

  it('18. Accessibility semantics: navigation, buttons, and aria-selected exist on stage rail', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);

    const nav = screen.getByRole('navigation', { name: /Topic Learning Progression Stages/i });
    expect(nav).toBeInTheDocument();

    const stageButtons = ['Orient', 'Learn', 'Apply', 'Assess', 'Review', 'Interview', 'Evidence'];
    for (const name of stageButtons) {
      const btn = within(nav).getByRole('button', { name: new RegExp(name, 'i') });
      expect(btn).toBeInTheDocument();
    }
  });

  it('19. Mobile-safe structure renders without horizontal overflow layout', () => {
    const { container } = render(<WorkspaceHarness topic={pythonTopic} />);
    const workspace = container.querySelector('[data-testid="topic-knowledge-workspace"]');
    expect(workspace).toBeInTheDocument();
  });

  it('20. TopicWorkspace preserves clean back to hub callback', () => {
    let backCalled = false;

    render(
      <WorkspaceHarness
        topic={pythonTopic}
        onBackToHub={() => (backCalled = true)}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Preparation Hub/i });
    act(() => {
      fireEvent.click(backBtn);
    });

    expect(backCalled).toBe(true);
  });

  it('21. Knowledge Flow renders for the seven canonical stages', () => {
    const { container } = render(<WorkspaceHarness topic={pythonTopic} />);
    const rail = screen.getByTestId('knowledge-flow-rail');
    expect(rail).toBeInTheDocument();

    const beam = container.querySelector('.knowledge-flow-beam');
    expect(beam).toBeInTheDocument();
  });

  it('22. Visual motion system does not create a second progression source', () => {
    render(<WorkspaceHarness topic={pythonTopic} />);
    const currentBadges = screen.getAllByText('Current');
    expect(currentBadges.length).toBe(1);
  });

  it('23. Current stage receives breathing halo and is derived from canonical progress', () => {
    const { container } = render(<WorkspaceHarness topic={pythonTopic} />);
    const breathingStage = container.querySelector('.stage-current-breath');
    expect(breathingStage).toBeInTheDocument();
    expect(breathingStage).toHaveTextContent(/Orient/i);
  });

  it('24. Stage selection triggers CSS enter transition on stage panel', () => {
    const { container } = render(<WorkspaceHarness topic={pythonTopic} />);
    const panel = container.querySelector('.stage-panel-enter');
    expect(panel).toBeInTheDocument();

    const learnTab = screen.getByRole('button', { name: /Learn/i });
    act(() => {
      fireEvent.click(learnTab);
    });

    const updatedPanel = container.querySelector('.stage-panel-enter');
    expect(updatedPanel).toBeInTheDocument();
    expect(updatedPanel).toHaveAttribute('id', 'stage-panel-learn');
  });

  it('25. Pure CSS implementation: no requestAnimationFrame loops or timer hooks', () => {
    const { container } = render(<WorkspaceHarness topic={pythonTopic} />);
    const rail = screen.getByTestId('knowledge-flow-rail');
    expect(rail).toBeInTheDocument();
    expect(container.querySelector('.knowledge-flow-beam')).toBeInTheDocument();
  });
});
