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
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#5A6578] px-0.5">
        <span>Zone 2: Operational Health Telemetry</span>
        <span>Deterministic Evidence Readouts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 stagger-in">
        {/* 1. Study Velocity */}
        <div
          data-testid="telemetry-card-study-velocity"
          className="kpi-card telemetry-card bg-[#14171D] border border-[#262D38] rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3.5 text-[#F43F5E]" /> Study Velocity
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                {activity.sealedDaysCount}d Sealed
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F1F5F9] kpi-value flex items-baseline gap-1.5">
              <span>{activity.studyHours}h</span>
              <span className="text-xs font-sans font-normal text-[#5A6578]">logged</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8E98A8] leading-tight">
            Across {activity.sealedDaysCount} sealed days ({activity.consistencyRate}% consistency rate)
          </p>
        </div>

        {/* 2. Curriculum Progress */}
        <div
          data-testid="telemetry-card-curriculum-velocity"
          className="kpi-card telemetry-card bg-[#14171D] border border-[#262D38] rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#10B981]" /> Curriculum Velocity
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#6EE7B7] border border-[#10B981]/30">
                Phase {progress.activePhaseCompletionRate}%
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F1F5F9] kpi-value flex items-baseline gap-1.5">
              <span>{activity.completedTasksCount}</span>
              <span className="text-xs font-sans font-normal text-[#5A6578]">tasks</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8E98A8] leading-tight">
            Phase: {progress.activePhaseCompletionRate}% • Roadmap: {progress.roadmapCompletionRate}% overall
          </p>
        </div>

        {/* 3. DSA Quality & Independence */}
        <div
          data-testid="telemetry-card-dsa-quality"
          className="kpi-card telemetry-card bg-[#14171D] border border-[#262D38] rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="size-3.5 text-[#2DD4BF]" /> DSA Solve Quality
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2DD4BF]/10 text-[#5EEAD4] border border-[#2DD4BF]/30">
                {quality.independentSolveRatio}% Indep
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F1F5F9] kpi-value flex items-baseline gap-1.5">
              <span>{activity.dsaPassedCount}</span>
              <span className="text-xs font-sans font-normal text-[#5A6578]">solved</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8E98A8] leading-tight">
            {quality.independentSolveRatio}% independent • {quality.assistedSolveRatio}% assisted solves
          </p>
        </div>

        {/* 4. Operational Bottleneck Debt */}
        <div
          data-testid="telemetry-card-bottleneck-debt"
          className="kpi-card telemetry-card bg-[#14171D] border border-[#262D38] rounded-xl p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle
                  className={`size-3.5 ${totalBottlenecks > 0 ? 'text-[#F43F5E]' : 'text-[#10B981]'}`}
                />{' '}
                Bottleneck Debt
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  totalBottlenecks > 0
                    ? 'bg-[#F43F5E]/10 text-[#FDA4AF] border-[#F43F5E]/30'
                    : 'bg-[#10B981]/10 text-[#6EE7B7] border-[#10B981]/30'
                }`}
              >
                {totalBottlenecks > 0 ? `${totalBottlenecks} Actionable` : 'Healthy'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F1F5F9] kpi-value flex items-baseline gap-1.5">
              <span>{totalBottlenecks}</span>
              <span className="text-xs font-sans font-normal text-[#5A6578]">gaps</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8E98A8] leading-tight">
            {gaps.overdueDsaCount} overdue • {gaps.staleEvidenceTopicsCount} stale •{' '}
            {gaps.remediationRequiredCount} remediation
          </p>
        </div>
      </div>
    </section>
  );
};
