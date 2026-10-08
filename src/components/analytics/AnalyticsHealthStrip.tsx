import React from 'react';
import type {
  ActivityTelemetry,
  QualityTelemetry,
  ProgressTelemetry,
  GapNeglectTelemetry,
} from '../../engine/analyticsEngine';
import {
  Clock,
  CheckCircle2,
  Code2,
  AlertTriangle,
} from 'lucide-react';

interface AnalyticsHealthStripProps {
  activity: ActivityTelemetry;
  quality: QualityTelemetry;
  progress: ProgressTelemetry;
  gaps: GapNeglectTelemetry;
}

export const AnalyticsHealthStrip: React.FC<AnalyticsHealthStripProps> = ({
  activity,
  quality,
  progress,
  gaps,
}) => {
  const totalBottlenecks =
    gaps.overdueDsaCount + gaps.remediationRequiredCount + gaps.staleEvidenceTopicsCount;

  return (
    <section aria-label="Operational Health & Velocity Strip" className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-text-tertiary px-0.5">
        <span>Zone 2: Operational Health Telemetry</span>
        <span>Deterministic Evidence Readouts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 stagger-in">
        {/* 1. Study Velocity */}
        <div
          data-testid="telemetry-card-study-velocity"
          className="kpi-card telemetry-card bg-surface-panel border border-border-default rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3.5 text-[var(--action-accent)]" /> Study Velocity
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border-default">
                {activity.sealedDaysCount}d Sealed
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-text-primary kpi-value flex items-baseline gap-1.5">
              <span>{activity.studyHours}h</span>
              <span className="text-xs font-sans font-normal text-text-tertiary">logged</span>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary leading-tight">
            Across {activity.sealedDaysCount} sealed days ({activity.consistencyRate}% consistency rate)
          </p>
        </div>

        {/* 2. Curriculum Progress */}
        <div
          data-testid="telemetry-card-curriculum-velocity"
          className="kpi-card telemetry-card bg-surface-panel border border-border-default rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-status-success" /> Curriculum Velocity
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/30">
                Phase {progress.activePhaseCompletionRate}%
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-text-primary kpi-value flex items-baseline gap-1.5">
              <span>{activity.completedTasksCount}</span>
              <span className="text-xs font-sans font-normal text-text-tertiary">tasks</span>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary leading-tight">
            Phase: {progress.activePhaseCompletionRate}% • Roadmap: {progress.roadmapCompletionRate}% overall
          </p>
        </div>

        {/* 3. DSA Quality & Independence */}
        <div
          data-testid="telemetry-card-dsa-quality"
          className="kpi-card telemetry-card bg-surface-panel border border-border-default rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="size-3.5 text-info" /> DSA Solve Quality
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/30">
                {quality.independentSolveRatio}% Indep
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-text-primary kpi-value flex items-baseline gap-1.5">
              <span>{activity.dsaPassedCount}</span>
              <span className="text-xs font-sans font-normal text-text-tertiary">solved</span>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary leading-tight">
            {quality.independentSolveRatio}% independent • {quality.assistedSolveRatio}% assisted solves
          </p>
        </div>

        {/* 4. Operational Bottleneck Debt */}
        <div
          data-testid="telemetry-card-bottleneck-debt"
          className="kpi-card telemetry-card bg-surface-panel border border-border-default rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle
                  className={`size-3.5 ${totalBottlenecks > 0 ? 'text-[var(--action-accent)]' : 'text-status-success'}`}
                />{' '}
                Bottleneck Debt
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  totalBottlenecks > 0
                    ? 'bg-[var(--action-accent-subtle)] text-[var(--action-accent-foreground)] border-[var(--action-accent-border)]'
                    : 'bg-status-success/10 text-status-success border-status-success/30'
                }`}
              >
                {totalBottlenecks > 0 ? `${totalBottlenecks} Actionable` : 'Healthy'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-text-primary kpi-value flex items-baseline gap-1.5">
              <span>{totalBottlenecks}</span>
              <span className="text-xs font-sans font-normal text-text-tertiary">gaps</span>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary leading-tight">
            {gaps.overdueDsaCount} overdue • {gaps.staleEvidenceTopicsCount} stale •{' '}
            {gaps.remediationRequiredCount} remediation
          </p>
        </div>
      </div>
    </section>
  );
};
