import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsObservatory } from '../components/analytics/AnalyticsObservatory';
import { AnalyticsReviewGrid } from '../components/analytics/AnalyticsReviewGrid';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import type {
  QualityTelemetry,
  ProgressTelemetry,
  GapNeglectTelemetry,
  ReviewPrompt,
} from '../engine/analyticsEngine';
import type { EvidenceTrace, EvidenceCatalog } from '../engine/evidenceTrace';

const mockQuality: QualityTelemetry = {
  independentSolveRatio: 76,
  assistedSolveRatio: 24,
  remediationCount: 1,
  reviewRetentionRate: 90,
  boxDistribution: { 1: 30, 2: 40, 3: 50, 4: 30 },
};

const mockProgress: ProgressTelemetry = {
  roadmapCompletionRate: 35,
  activePhaseCompletionRate: 68,
  overallDomainReadiness: 55,
  patternsAttemptedCount: 12,
  totalPatternsCount: 17,
};

const mockGaps: GapNeglectTelemetry = {
  overdueDsaCount: 3,
  staleEvidenceTopicsCount: 1,
  repeatedlyPostponedTasksCount: 2,
  remediationRequiredCount: 1,
  overdueDsaProblems: [
    { id: 'dsa-001', title: 'Two Sum', leetcodeNumber: 1, box: 2, daysOverdue: 2 },
  ],
  staleTopics: [
    { topicId: 'topic-1', topicName: 'ACID Transactions', domainName: 'DBMS', daysInactive: 18 },
  ],
  postponedTasks: [
    { taskId: 'task-1', title: 'Virtual Memory Lab', postponeCount: 3 },
  ],
};

const mockReviewPrompts: ReviewPrompt[] = [
  {
    id: 'prompt-overdue-dsa',
    type: 'overdue_review',
    severity: 'high',
    title: '3 DSA Reviews Overdue',
    description: '3 problems are due in the Leitner spaced repetition system.',
    actionLabel: 'Go to DSA Review',
    route: 'dsa',
    targetId: 'dsa-001',
  },
  {
    id: 'prompt-stale-evidence',
    type: 'stale_evidence',
    severity: 'medium',
    title: '1 Topic Has Stale Evidence',
    description: 'DBMS (ACID Transactions) has received no practice evidence for >14 days.',
    actionLabel: 'Inspect Skills Matrix',
    route: 'skills',
    targetId: 'topic-1',
  },
  {
    id: 'prompt-postponed-tasks',
    type: 'repeated_postpone',
    severity: 'medium',
    title: '1 Task Postponed Repeatedly',
    description: 'Task "Virtual Memory Lab" has been postponed 3 times.',
    actionLabel: 'View Roadmap Task',
    route: 'roadmap',
    targetId: 'task-1',
  },
];

const mockCatalog: EvidenceCatalog = {
  taskProgress: {},
  dsaProgress: {},
  dsaAttempts: [],
  practiceAttempts: [],
  evidenceLogs: [],
  practiceSessions: [],
  taskDefinitions: [],
  dsaProblems: [],
  topics: [],
  skillStates: {},
  todayISO: '2026-09-25',
};

const mockPromptTraces: EvidenceTrace[] = [
  {
    id: 'trace-1',
    label: '3 overdue reviews in Box 2',
    why: 'Spaced repetition prevents forgetting curve decay',
    origin: 'direct',
    sources: [],
    signal: 'overdue_review',
    destination: {
      route: 'dsa',
      targetId: 'dsa-001',
      deepLink: true,
      label: 'Go to DSA Review',
    },
  },
  {
    id: 'trace-2',
    label: 'ACID Transactions inactive for 18 days',
    why: 'Evidence recency decays after 14 days',
    origin: 'direct',
    sources: [],
    signal: 'stale_evidence',
    destination: {
      route: 'skills',
      targetId: 'topic-1',
      deepLink: true,
      label: 'Inspect Skills Matrix',
    },
  },
  {
    id: 'trace-3',
    label: 'Virtual Memory Lab postponed 3 times',
    why: 'Repeatedly postponed tasks indicate learning blockers',
    origin: 'direct',
    sources: [],
    signal: 'progression',
    destination: {
      route: 'roadmap',
      targetId: 'task-1',
      deepLink: true,
      label: 'View Roadmap Task',
    },
  },
];

describe('Analytics Manufacturing Part 2 — Zones 3 & 4', () => {
  describe('Zone 3 — AnalyticsObservatory', () => {
    it('renders Panel A: Leitner Spaced Repetition Radar with box distribution and retention rate', () => {
      render(
        <AnalyticsObservatory
          quality={mockQuality}
          progress={mockProgress}
          gaps={mockGaps}
        />
      );

      const panelA = screen.getByTestId('observatory-panel-leitner');
      expect(panelA).toHaveTextContent('Leitner Spaced Repetition Radar');
      expect(panelA).toHaveTextContent('90% Retention');
      expect(panelA).toHaveTextContent('3 Due Today');
      expect(panelA).toHaveTextContent('Box 1 (1d)');
      expect(panelA).toHaveTextContent('Box 4 (14d)');

      const progressBar = screen.getByRole('progressbar', { name: /Leitner Box Distribution Bar/i });
      expect(progressBar).toBeInTheDocument();
    });

    it('renders Panel B: Pattern Progression & Domain Readiness Radar', () => {
      render(
        <AnalyticsObservatory
          quality={mockQuality}
          progress={mockProgress}
          gaps={mockGaps}
        />
      );

      const panelB = screen.getByTestId('observatory-panel-progression');
      expect(panelB).toHaveTextContent('Pattern Progression & Domain Readiness');
      expect(panelB).toHaveTextContent('55% Ready');
      expect(panelB).toHaveTextContent('12 / 17 (71%)');
      expect(panelB).toHaveTextContent('Weighted 11-Domain Curriculum Readiness');

      const patternBar = screen.getByRole('progressbar', { name: /Pattern Progression Progressbar/i });
      expect(patternBar).toHaveAttribute('aria-valuenow', '12');

      const domainBar = screen.getByRole('progressbar', { name: /Overall Domain Readiness Progressbar/i });
      expect(domainBar).toHaveAttribute('aria-valuenow', '55');
    });

    it('cleanly handles empty/zero state in Observatory without division by zero', () => {
      const zeroQuality: QualityTelemetry = {
        independentSolveRatio: 0,
        assistedSolveRatio: 0,
        remediationCount: 0,
        reviewRetentionRate: 100,
        boxDistribution: { 1: 150, 2: 0, 3: 0, 4: 0 },
      };

      const zeroProgress: ProgressTelemetry = {
        roadmapCompletionRate: 0,
        activePhaseCompletionRate: 0,
        overallDomainReadiness: 0,
        patternsAttemptedCount: 0,
        totalPatternsCount: 17,
      };

      const zeroGaps: GapNeglectTelemetry = {
        overdueDsaCount: 0,
        staleEvidenceTopicsCount: 0,
        repeatedlyPostponedTasksCount: 0,
        remediationRequiredCount: 0,
        overdueDsaProblems: [],
        staleTopics: [],
        postponedTasks: [],
      };

      render(
        <AnalyticsObservatory
          quality={zeroQuality}
          progress={zeroProgress}
          gaps={zeroGaps}
        />
      );

      expect(screen.getByText('All Reviews Clear')).toBeInTheDocument();
      expect(screen.getByText('0 / 17 (0%)')).toBeInTheDocument();
      expect(screen.getByText('0% Ready')).toBeInTheDocument();
    });
  });

  describe('Zone 4 — AnalyticsReviewGrid', () => {
    const renderReviewGrid = (props: React.ComponentProps<typeof AnalyticsReviewGrid>) => {
      return render(
        <PlacementProvider>
          <GuideProvider>
            <AnalyticsReviewGrid {...props} />
          </GuideProvider>
        </PlacementProvider>
      );
    };

    it('renders Primary Review Spotlight for highest-severity prompt with defining action', () => {
      const onAction = vi.fn();

      renderReviewGrid({
        reviewPrompts: mockReviewPrompts,
        promptTraces: mockPromptTraces,
        catalog: mockCatalog,
        onAction,
      });

      const spotlight = screen.getByTestId('primary-review-spotlight');
      expect(spotlight).toHaveTextContent('Primary Operational Focus');
      expect(spotlight).toHaveTextContent('3 DSA Reviews Overdue');
      expect(spotlight).toHaveTextContent('High Priority');

      const primaryActionBtn = screen.getByTestId('primary-operational-review-action');
      expect(primaryActionBtn).toHaveTextContent('Execute Operational Review (Go to DSA Review)');

      fireEvent.click(primaryActionBtn);
      expect(onAction).toHaveBeenCalledWith('dsa', 'dsa-001');
    });

    it('renders remaining prompts in the recommendations grid', () => {
      const onAction = vi.fn();

      renderReviewGrid({
        reviewPrompts: mockReviewPrompts,
        promptTraces: mockPromptTraces,
        catalog: mockCatalog,
        onAction,
      });

      const stalePromptCard = screen.getByTestId('review-prompt-card-prompt-stale-evidence');
      expect(stalePromptCard).toHaveTextContent('1 Topic Has Stale Evidence');
      expect(stalePromptCard).toHaveTextContent('Medium Priority');

      const staleActionBtn = screen.getByTestId('prompt-stale-evidence-action');
      fireEvent.click(staleActionBtn);
      expect(onAction).toHaveBeenCalledWith('skills', 'topic-1');

      const postponeCard = screen.getByTestId('review-prompt-card-prompt-postponed-tasks');
      expect(postponeCard).toHaveTextContent('1 Task Postponed Repeatedly');

      const postponeActionBtn = screen.getByTestId('prompt-postponed-tasks-action');
      fireEvent.click(postponeActionBtn);
      expect(onAction).toHaveBeenCalledWith('roadmap', 'task-1');
    });

    it('renders clean empty state when 0 review prompts exist', () => {
      renderReviewGrid({
        reviewPrompts: [],
        promptTraces: [],
        catalog: mockCatalog,
        onAction: vi.fn(),
      });

      expect(screen.getByTestId('review-empty-state')).toHaveTextContent('No Operational Bottlenecks Detected');
      expect(screen.getByText(/All spaced reviews are up-to-date/i)).toBeInTheDocument();
    });
  });

  describe('AnalyticsView Part 2 Full Orchestration', () => {
    it('mounts full AnalyticsView with Zones 1, 2, 3, 4 and signature motion', () => {
      const { container } = render(
        <PlacementProvider>
          <GuideProvider>
            <AnalyticsView />
          </GuideProvider>
        </PlacementProvider>
      );

      // Verify signature motion class
      const rootDiv = container.querySelector('.telemetry-sweep');
      expect(rootDiv).toBeInTheDocument();

      // Verify Zone 1
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Analytics & Operational Review');

      // Verify Zone 2
      expect(screen.getByTestId('telemetry-card-study-velocity')).toBeInTheDocument();

      // Verify Zone 3
      expect(screen.getByTestId('observatory-panel-leitner')).toBeInTheDocument();
      expect(screen.getByTestId('observatory-panel-progression')).toBeInTheDocument();

      // Verify Zone 4 (either spotlight/prompts or empty state depending on mock state)
      expect(
        screen.queryByTestId('primary-review-spotlight') || screen.queryByTestId('review-empty-state')
      ).toBeInTheDocument();
    });
  });
});
