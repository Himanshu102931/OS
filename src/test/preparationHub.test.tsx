import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { SessionProvider } from '../components/dashboard/SessionProvider';
import { PreparationHubView } from '../components/preparation/PreparationHubView';
import { PREPARATION_SECTIONS } from '../data/preparationDataset';

describe('PREPARATION MANUFACTURING PART 1: Hub & Macro Progression', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/preparation';
  });

  function TestHarness() {
    return (
      <PlacementProvider>
        <SessionProvider>
          <PreparationHubView />
        </SessionProvider>
      </PlacementProvider>
    );
  }

  it('1. Renders Zone 1 Hub Header and Macro Readiness Strip', () => {
    render(<TestHarness />);

    // Header elements
    expect(screen.getByRole('heading', { level: 1, name: /PREPARATION/i })).toBeInTheDocument();
    expect(screen.getByText(/Learning Progression \/ Knowledge Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/4 Core Domains/i)).toBeInTheDocument();
    expect(screen.getByText(/13 Foundational Modules/i)).toBeInTheDocument();

    // Mastery Strip section
    const strip = screen.getByTestId('preparation-mastery-strip');
    expect(strip).toBeInTheDocument();

    // 4 metric cards
    expect(screen.getByText(/Curriculum Covered/i)).toBeInTheDocument();
    expect(screen.getByText(/Demonstrated Proofs/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Focus/i)).toBeInTheDocument();
  });

  it('2. Renders all 4 canonical sections in Section Progression Matrix', () => {
    render(<TestHarness />);

    const matrix = screen.getByTestId('preparation-section-matrix');
    expect(matrix).toBeInTheDocument();

    for (const section of PREPARATION_SECTIONS) {
      expect(screen.getByTestId(`section-card-${section.id}`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(section.title, 'i') })).toBeInTheDocument();
      expect(screen.getByText(section.subtitle)).toBeInTheDocument();
    }
  });

  it('3. Displays canonical topic counts for each section', () => {
    render(<TestHarness />);

    for (const section of PREPARATION_SECTIONS) {
      const card = screen.getByTestId(`section-card-${section.id}`);
      expect(card).toHaveTextContent(`${section.topicIds.length} Topics`);
    }

    // Baseline counts: 0 / 13
    expect(screen.getByTestId('prep-covered-count')).toHaveTextContent('0');
    expect(screen.getByTestId('prep-proven-count')).toHaveTextContent('0');
    expect(screen.getByTestId('prep-ready-count')).toHaveTextContent('0');
  });

  it('4. Resolves active topic from persisted lastAccessedAt timestamp', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCaptureHarness() {
      capturedContext = usePlacement();
      return <PreparationHubView />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCaptureHarness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Update progress on prep-sql with recent lastAccessedAt
    act(() => {
      capturedContext!.updatePreparationTopicProgress({
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'learn',
        completedStages: ['orient'],
        stageProgress: {
          orient: { completedAt: '2026-10-06T12:00:00Z', timeSpentMinutes: 10 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-06T12:00:00Z',
        totalTimeSpentMinutes: 20,
        evidenceStrength: 15,
        freshness: 'fresh',
        createdAt: '2026-10-06T10:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      });
    });

    // Active topic in core_cs should reflect SQL & Relational Queries
    const activeTopicCoreCs = screen.getByTestId('active-topic-core_cs');
    expect(activeTopicCoreCs).toHaveTextContent(/SQL & Relational Queries/i);

    // Active focus in macro strip should also reflect SQL
    const focusTitle = screen.getByTestId('prep-active-focus-title');
    expect(focusTitle).toHaveTextContent(/SQL & Relational Queries/i);
  });

  it('5. Selects defining hub action on the dominant active section', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCaptureHarness() {
      capturedContext = usePlacement();
      return <PreparationHubView />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCaptureHarness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Default defining action exists on first section (Coding)
    const definingBtn = screen.getByTestId('prep-defining-action');
    expect(definingBtn).toBeInTheDocument();
    expect(definingBtn).toHaveTextContent(/Enter CODING Workspace/i);

    // When progress shifts to Core CS (prep-sql), defining action moves to Core CS
    act(() => {
      capturedContext!.updatePreparationTopicProgress({
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'learn',
        completedStages: ['orient'],
        stageProgress: {
          orient: { completedAt: '2026-10-06T15:00:00Z', timeSpentMinutes: 10 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-06T15:00:00Z',
        totalTimeSpentMinutes: 20,
        evidenceStrength: 15,
        freshness: 'fresh',
        createdAt: '2026-10-06T10:00:00Z',
        updatedAt: '2026-10-06T15:00:00Z',
      });
    });

    const updatedDefiningBtn = screen.getByTestId('prep-defining-action');
    expect(updatedDefiningBtn).toHaveTextContent(/Enter CORE CS Workspace/i);
  });

  it('6. Displays locked state and unmet prerequisites for gated topics', () => {
    render(<TestHarness />);

    // In clean state, prep-coding-ds requires prep-lang -> should be locked
    const codingDsItem = screen.getByTestId('topic-item-prep-coding-ds');
    expect(codingDsItem).toBeInTheDocument();
    expect(codingDsItem).toHaveTextContent(/Locked/i);
    expect(codingDsItem).toHaveTextContent(/Requires.*Programming Language \(Python\)/i);
  });

  it('7. Navigates to topic workspace when a topic is clicked', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCaptureHarness() {
      capturedContext = usePlacement();
      return <PreparationHubView />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCaptureHarness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Click Python topic
    const pythonItem = screen.getByTestId('topic-item-prep-lang');
    fireEvent.click(pythonItem);

    // Route state should update to preparation / prep-lang
    expect(capturedContext!.routeState.route).toBe('preparation');
    expect(capturedContext!.routeState.targetId).toBe('prep-lang');

    // Topic Workspace should be rendered
    expect(screen.getByRole('heading', { level: 1, name: /Programming Language \(Python\)/i })).toBeInTheDocument();
  });

  it('8. Preserves accessibility attributes (progressbars, semantics, focus visible)', () => {
    render(<TestHarness />);

    // Progressbars in macro strip
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThanOrEqual(3);

    for (const pb of progressBars) {
      expect(pb).toHaveAttribute('aria-valuenow');
      expect(pb).toHaveAttribute('aria-valuemin', '0');
      expect(pb).toHaveAttribute('aria-valuemax', '100');
    }
  });

  it('9. Preserves existing deep link contract and return to hub navigation', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCaptureHarness() {
      capturedContext = usePlacement();
      return <PreparationHubView />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCaptureHarness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Set deep link to prep-sql
    act(() => {
      capturedContext!.setRoute('preparation', 'prep-sql');
    });

    expect(screen.getByRole('heading', { level: 1, name: /SQL & Relational Queries/i })).toBeInTheDocument();

    // Click back button to return to hub
    const backBtn = screen.getByRole('button', { name: /Back to Today/i });
    fireEvent.click(backBtn);

    // Should return to dashboard or hub
    expect(capturedContext!.routeState.route).toBe('dashboard');
  });

  it('10. Renders signature motion: Preparation Knowledge Flow rail with luminous traveler', () => {
    render(<TestHarness />);

    const knowledgeFlow = screen.getByTestId('prep-knowledge-flow');
    expect(knowledgeFlow).toBeInTheDocument();
    expect(screen.getByText(/Preparation Knowledge Flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Learning → Practice → Proof → Placement/i)).toBeInTheDocument();

    const traveler = screen.getByTestId('prep-knowledge-traveler');
    expect(traveler).toBeInTheDocument();
    expect(traveler).toHaveClass('prep-knowledge-traveler');

    // 4 section waypoints exist
    for (const section of PREPARATION_SECTIONS) {
      expect(screen.getByTestId(`prep-flow-step-${section.id}`)).toBeInTheDocument();
    }
  });

  it('11. Applies active breathing emphasis to dominant section in knowledge flow rail', () => {
    let capturedContext: ReturnType<typeof usePlacement> | null = null;

    function ContextCaptureHarness() {
      capturedContext = usePlacement();
      return <PreparationHubView />;
    }

    render(
      <PlacementProvider>
        <SessionProvider>
          <ContextCaptureHarness />
        </SessionProvider>
      </PlacementProvider>
    );

    // Initial default defining section is coding
    const codingStep = screen.getByTestId('prep-flow-step-coding');
    expect(codingStep).toHaveClass('prep-active-section-pulse');

    // When progress shifts to Core CS (prep-sql), pulse shifts to core_cs step
    act(() => {
      capturedContext!.updatePreparationTopicProgress({
        topicId: 'prep-sql',
        sectionId: 'core_cs',
        domainId: 'sql',
        currentStage: 'learn',
        completedStages: ['orient'],
        stageProgress: {
          orient: { completedAt: '2026-10-06T18:00:00Z', timeSpentMinutes: 10 },
          learn: { timeSpentMinutes: 0 },
          apply: { timeSpentMinutes: 0 },
          assess: { timeSpentMinutes: 0 },
          review: { timeSpentMinutes: 0 },
          interview: { timeSpentMinutes: 0 },
          evidence: { timeSpentMinutes: 0 },
        },
        lastAccessedAt: '2026-10-06T18:00:00Z',
        totalTimeSpentMinutes: 25,
        evidenceStrength: 20,
        freshness: 'fresh',
        createdAt: '2026-10-06T10:00:00Z',
        updatedAt: '2026-10-06T18:00:00Z',
      });
    });

    const coreCsStep = screen.getByTestId('prep-flow-step-core_cs');
    expect(coreCsStep).toHaveClass('prep-active-section-pulse');
  });
});
