import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectPillarNavigator } from '../components/project/ProjectPillarNavigator';
import { ProjectArchitectureBlueprint } from '../components/project/ProjectArchitectureBlueprint';
import { ProjectDefenseRubric } from '../components/project/ProjectDefenseRubric';
import { ProjectLabView } from '../components/project/ProjectLabView';
import { PROJECT_LAB_CONTENT } from '../data/projectLabContent';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';

describe('Project Manufacturing Part 2 — Zones 3 & 4', () => {
  const mockSectionCompleted = {
    overview: false,
    architecture: false,
    implementation: false,
    practices: false,
    defense: true,
    evidence: true,
  };

  const pillarIds = [
    'overview',
    'architecture',
    'implementation',
    'practices',
    'defense',
    'evidence',
  ];

  // -------------------------------------------------------------------------
  // 1. ZONE 3: PILLAR NAVIGATOR
  // -------------------------------------------------------------------------
  describe('Zone 3 — ProjectPillarNavigator Component', () => {
    it('renders all 6 canonical architectural pillars with tabs', () => {
      render(
        <ProjectPillarNavigator
          activePillar="overview"
          onSelectPillar={vi.fn()}
          sectionCompleted={mockSectionCompleted}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      for (const id of pillarIds) {
        expect(screen.getByTestId(`pillar-tab-${id}`)).toBeInTheDocument();
      }
    });

    it('marks active pillar with aria-selected=true and calls onSelectPillar on click', () => {
      const handleSelect = vi.fn();
      render(
        <ProjectPillarNavigator
          activePillar="architecture"
          onSelectPillar={handleSelect}
          sectionCompleted={mockSectionCompleted}
        />
      );

      const archTab = screen.getByTestId('pillar-tab-architecture');
      expect(archTab).toHaveAttribute('aria-selected', 'true');

      const implTab = screen.getByTestId('pillar-tab-implementation');
      expect(implTab).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(implTab);
      expect(handleSelect).toHaveBeenCalledWith('implementation');
    });

    it('supports keyboard navigation across tabs (ArrowRight, ArrowLeft, Home, End)', () => {
      const handleSelect = vi.fn();
      render(
        <ProjectPillarNavigator
          activePillar="overview"
          onSelectPillar={handleSelect}
          sectionCompleted={mockSectionCompleted}
        />
      );

      const overviewTab = screen.getByTestId('pillar-tab-overview');

      // ArrowRight -> architecture (index 1)
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
      expect(handleSelect).toHaveBeenCalledWith('architecture');

      // End -> evidence (index 5)
      fireEvent.keyDown(overviewTab, { key: 'End' });
      expect(handleSelect).toHaveBeenCalledWith('evidence');

      // Home -> overview (index 0)
      fireEvent.keyDown(overviewTab, { key: 'Home' });
      expect(handleSelect).toHaveBeenCalledWith('overview');
    });
  });

  // -------------------------------------------------------------------------
  // 2. ZONE 3: ARCHITECTURE BLUEPRINT & PIPELINE WORKSPACE
  // -------------------------------------------------------------------------
  describe('Zone 3 — ProjectArchitectureBlueprint Component', () => {
    const archContent = PROJECT_LAB_CONTENT.find((c) => c.id === 'architecture')!;
    const implContent = PROJECT_LAB_CONTENT.find((c) => c.id === 'implementation')!;

    it('renders canonical heading, intro, and visual data-flow pipeline', () => {
      render(
        <ProjectArchitectureBlueprint
          activePillar="architecture"
          sectionContent={archContent}
        />
      );

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      expect(screen.getByText(archContent.heading)).toBeInTheDocument();
      expect(screen.getByText(archContent.intro)).toBeInTheDocument();
      expect(screen.getByTestId('visual-data-flow-pipeline')).toBeInTheDocument();
    });

    it('renders all 6 data-flow stages and allows clicking to inspect contracts', () => {
      render(
        <ProjectArchitectureBlueprint
          activePillar="architecture"
          sectionContent={archContent}
        />
      );

      expect(screen.getByTestId('data-flow-node-user-action')).toBeInTheDocument();
      expect(screen.getByTestId('data-flow-node-context')).toBeInTheDocument();
      expect(screen.getByTestId('data-flow-node-pure-engine')).toBeInTheDocument();
      expect(screen.getByTestId('data-flow-node-state-update')).toBeInTheDocument();
      expect(screen.getByTestId('data-flow-node-storage-adapter')).toBeInTheDocument();
      expect(screen.getByTestId('data-flow-node-re-render')).toBeInTheDocument();

      // Click on StorageAdapter node
      fireEvent.click(screen.getByTestId('data-flow-node-storage-adapter'));
      expect(screen.getByTestId('selected-node-detail')).toHaveTextContent(
        'StorageAdapter'
      );
      expect(screen.getByTestId('selected-node-detail')).toHaveTextContent(
        'Validates schema version (1.0.0)'
      );
    });

    it('renders canonical implementation module cards when implementation pillar is active', () => {
      render(
        <ProjectArchitectureBlueprint
          activePillar="implementation"
          sectionContent={implContent}
        />
      );

      expect(screen.getByTestId('module-card-adaptiveengine-ts')).toBeInTheDocument();
      expect(screen.getByTestId('module-card-practiceengine-ts')).toBeInTheDocument();
      expect(screen.getByTestId('module-card-skillsengine-ts')).toBeInTheDocument();
      expect(screen.getByTestId('module-card-storageadapter-ts')).toBeInTheDocument();
      expect(screen.getByTestId('module-card-preparationengine-ts')).toBeInTheDocument();
      expect(screen.getByTestId('module-card-placementcontext-tsx')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 3. ZONE 4: SENIOR INTERVIEWER PUSHBACK CHEAT-SHEET
  // -------------------------------------------------------------------------
  describe('Zone 4 — ProjectDefenseRubric Component', () => {
    it('renders all five canonical interview defense cards', () => {
      render(<ProjectDefenseRubric />);

      expect(screen.getByTestId('project-defense-rubric')).toBeInTheDocument();
      expect(screen.getByTestId('rubric-card-rubric-elevator-pitch')).toBeInTheDocument();
      expect(screen.getByTestId('rubric-card-rubric-tradeoffs')).toBeInTheDocument();
      expect(screen.getByTestId('rubric-card-rubric-hardest-bug')).toBeInTheDocument();
      expect(screen.getByTestId('rubric-card-rubric-scaling')).toBeInTheDocument();
      expect(screen.getByTestId('rubric-card-rubric-rebuilding')).toBeInTheDocument();
    });

    it('toggles accordion expansion on card header click', () => {
      render(<ProjectDefenseRubric />);

      const tradeoffsCard = screen.getByTestId('rubric-card-rubric-tradeoffs');
      const tradeoffsBtn = tradeoffsCard.querySelector('button')!;

      // Click to expand Tradeoffs card
      fireEvent.click(tradeoffsBtn);
      expect(tradeoffsCard).toHaveTextContent('Why did you choose localStorage over a real backend database?');
      expect(tradeoffsCard).toHaveTextContent('Interviewer Intent & Pushback Angle');
      expect(tradeoffsCard).toHaveTextContent('Prepared Defense (Say This)');
      expect(tradeoffsCard).toHaveTextContent('Key Verification Points');
    });
  });

  // -------------------------------------------------------------------------
  // 4. INTEGRATION IN PROJECTLABVIEW
  // -------------------------------------------------------------------------
  describe('ProjectLabView Part 2 Integration', () => {
    it('renders complete orchestration with Zone 1, Zone 2, Zone 3, Zone 4', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <ProjectLabView />
          </GuideProvider>
        </PlacementProvider>
      );

      expect(screen.getByTestId('project-header')).toBeInTheDocument();
      expect(screen.getByTestId('project-defense-hero')).toBeInTheDocument();
      expect(screen.getByTestId('project-pillar-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('project-architecture-blueprint')).toBeInTheDocument();
      expect(screen.getByTestId('project-defense-rubric')).toBeInTheDocument();
    });
  });
});
