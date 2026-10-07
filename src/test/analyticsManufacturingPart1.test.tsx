import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsHeader } from '../components/analytics/AnalyticsHeader';
import { AnalyticsHealthStrip } from '../components/analytics/AnalyticsHealthStrip';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import type {
  ActivityTelemetry,
  QualityTelemetry,
  ProgressTelemetry,
  GapNeglectTelemetry,
} from '../engine/analyticsEngine';

const mockActivity: ActivityTelemetry = {
  completedTasksCount: 14,
  totalTasksInWindow: 40,
  dsaAttemptsCount: 50,
  dsaPassedCount: 42,
  dsaIndependentPassedCount: 32,
  dsaAssistedPassedCount: 10,
  studyMinutes: 2070,
  studyHours: '34.5',
  sealedDaysCount: 17,
  totalDaysInWindow: 20,
  consistencyRate: 85,
};

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

describe('Analytics Manufacturing Part 1 — Zones 1 & 2', () => {
  describe('Zone 1 — AnalyticsHeader', () => {
    const renderHeader = (props: React.ComponentProps<typeof AnalyticsHeader>) => {
      return render(
        <PlacementProvider>
          <GuideProvider>
            <AnalyticsHeader {...props} />
          </GuideProvider>
        </PlacementProvider>
      );
    };

    it('renders the h1 title, telemetry badge, and description', () => {
      const onTimeWindowChange = vi.fn();
      const onOpenRawLogs = vi.fn();

      renderHeader({
        timeWindow: '30d',
        onTimeWindowChange,
        startDateISO: '2026-09-01',
        endDateISO: '2026-09-30',
        totalDaysInWindow: 30,
        onOpenRawLogs,
      });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Analytics & Operational Review');
      expect(screen.getByText(/TELEMETRY V1 • DETERMINISTIC/i)).toBeInTheDocument();
      expect(screen.getByText(/Weekly telemetry summary, learning velocity/i)).toBeInTheDocument();
    });

    it('renders all 4 canonical time-window selector tabs with correct active state', () => {
      const onTimeWindowChange = vi.fn();
      const onOpenRawLogs = vi.fn();

      renderHeader({
        timeWindow: '30d',
        onTimeWindowChange,
        startDateISO: '2026-09-01',
        endDateISO: '2026-09-30',
        totalDaysInWindow: 30,
        onOpenRawLogs,
      });

      const tab7d = screen.getByTestId('time-window-7d');
      const tab30d = screen.getByTestId('time-window-30d');
      const tabPhase = screen.getByTestId('time-window-phase');
      const tabAll = screen.getByTestId('time-window-all');

      expect(tab7d).toHaveAttribute('aria-selected', 'false');
      expect(tab30d).toHaveAttribute('aria-selected', 'true');
      expect(tabPhase).toHaveAttribute('aria-selected', 'false');
      expect(tabAll).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(tab7d);
      expect(onTimeWindowChange).toHaveBeenCalledWith('7d');

      fireEvent.click(tabPhase);
      expect(onTimeWindowChange).toHaveBeenCalledWith('phase');

      fireEvent.click(tabAll);
      expect(onTimeWindowChange).toHaveBeenCalledWith('all');
    });

    it('renders the date range scope banner and fires raw logs modal', () => {
      const onOpenRawLogs = vi.fn();

      renderHeader({
        timeWindow: '7d',
        onTimeWindowChange: vi.fn(),
        startDateISO: '2026-09-18',
        endDateISO: '2026-09-25',
        totalDaysInWindow: 7,
        onOpenRawLogs,
      });

      expect(screen.getByText('2026-09-18')).toBeInTheDocument();
      expect(screen.getByText('2026-09-25')).toBeInTheDocument();
      expect(screen.getByText('(7 days)')).toBeInTheDocument();

      const rawLogsBtn = screen.getByTestId('open-raw-telemetry-btn');
      fireEvent.click(rawLogsBtn);
      expect(onOpenRawLogs).toHaveBeenCalledTimes(1);
    });
  });

  describe('Zone 2 — AnalyticsHealthStrip', () => {
    it('renders all 4 operational health telemetry cards with exact canonical metrics', () => {
      render(
        <AnalyticsHealthStrip
          activity={mockActivity}
          quality={mockQuality}
          progress={mockProgress}
          gaps={mockGaps}
        />
      );

      // Card 1: Study Velocity
      const studyCard = screen.getByTestId('telemetry-card-study-velocity');
      expect(studyCard).toHaveTextContent('34.5h');
      expect(studyCard).toHaveTextContent('17d Sealed');
      expect(studyCard).toHaveTextContent('85% consistency rate');

      // Card 2: Curriculum Velocity
      const curriculumCard = screen.getByTestId('telemetry-card-curriculum-velocity');
      expect(curriculumCard).toHaveTextContent('14');
      expect(curriculumCard).toHaveTextContent('Phase 68%');
      expect(curriculumCard).toHaveTextContent('Roadmap: 35% overall');

      // Card 3: DSA Solve Quality
      const dsaCard = screen.getByTestId('telemetry-card-dsa-quality');
      expect(dsaCard).toHaveTextContent('42');
      expect(dsaCard).toHaveTextContent('76% Indep');
      expect(dsaCard).toHaveTextContent('24% assisted');

      // Card 4: Bottleneck Debt (3 overdue + 1 stale + 1 remediation = 5 gaps)
      const bottleneckCard = screen.getByTestId('telemetry-card-bottleneck-debt');
      expect(bottleneckCard).toHaveTextContent('5');
      expect(bottleneckCard).toHaveTextContent('5 Actionable');
      expect(bottleneckCard).toHaveTextContent('3 overdue');
      expect(bottleneckCard).toHaveTextContent('1 stale');
      expect(bottleneckCard).toHaveTextContent('1 remediation');
    });

    it('cleanly handles empty/zero state without NaN or crashes', () => {
      const zeroActivity: ActivityTelemetry = {
        completedTasksCount: 0,
        totalTasksInWindow: 0,
        dsaAttemptsCount: 0,
        dsaPassedCount: 0,
        dsaIndependentPassedCount: 0,
        dsaAssistedPassedCount: 0,
        studyMinutes: 0,
        studyHours: '0.0',
        sealedDaysCount: 0,
        totalDaysInWindow: 1,
        consistencyRate: 0,
      };

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
        <AnalyticsHealthStrip
          activity={zeroActivity}
          quality={zeroQuality}
          progress={zeroProgress}
          gaps={zeroGaps}
        />
      );

      const bottleneckCard = screen.getByTestId('telemetry-card-bottleneck-debt');
      expect(bottleneckCard).toHaveTextContent('0');
      expect(bottleneckCard).toHaveTextContent('Healthy');
      expect(screen.getByTestId('telemetry-card-study-velocity')).toHaveTextContent('0.0h');
    });
  });

  describe('AnalyticsView Integration — Zones 1 & 2 Orchestration', () => {
    it('mounts AnalyticsView with Zone 1 & Zone 2 rendered', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <AnalyticsView />
          </GuideProvider>
        </PlacementProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Analytics & Operational Review');
      expect(screen.getByTestId('telemetry-card-study-velocity')).toBeInTheDocument();
      expect(screen.getByTestId('telemetry-card-curriculum-velocity')).toBeInTheDocument();
      expect(screen.getByTestId('telemetry-card-dsa-quality')).toBeInTheDocument();
      expect(screen.getByTestId('telemetry-card-bottleneck-debt')).toBeInTheDocument();
    });

    it('updates time-window when user clicks 7d button in AnalyticsView', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <AnalyticsView />
          </GuideProvider>
        </PlacementProvider>
      );

      const tab7d = screen.getByTestId('time-window-7d');
      fireEvent.click(tab7d);
      expect(tab7d).toHaveAttribute('aria-selected', 'true');
    });
  });
});
