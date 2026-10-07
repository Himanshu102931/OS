import React from 'react';
import type {
  QualityTelemetry,
  ProgressTelemetry,
  GapNeglectTelemetry,
} from '../../engine/analyticsEngine';
import {
  BrainCircuit,
  Layers,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsObservatoryProps {
  quality: QualityTelemetry;
  progress: ProgressTelemetry;
  gaps: GapNeglectTelemetry;
}

export const AnalyticsObservatory: React.FC<AnalyticsObservatoryProps> = ({
  quality,
  progress,
  gaps,
}) => {
  const totalBoxes =
    (quality.boxDistribution[1] || 0) +
    (quality.boxDistribution[2] || 0) +
    (quality.boxDistribution[3] || 0) +
    (quality.boxDistribution[4] || 0) || 150;

  const box1Pct = Math.round(((quality.boxDistribution[1] || 0) / totalBoxes) * 100);
  const box2Pct = Math.round(((quality.boxDistribution[2] || 0) / totalBoxes) * 100);
  const box3Pct = Math.round(((quality.boxDistribution[3] || 0) / totalBoxes) * 100);
  const box4Pct = Math.round(((quality.boxDistribution[4] || 0) / totalBoxes) * 100);

  const patternPct =
    progress.totalPatternsCount > 0
      ? Math.round((progress.patternsAttemptedCount / progress.totalPatternsCount) * 100)
      : 0;

  return (
    <section aria-label="Zone 3: Telemetry Observatory" className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#5A6578] px-0.5">
        <span>Zone 3: Telemetry Observatory</span>
        <span>Dual-Panel Memory & Progression Radar</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel A: Leitner Spaced Repetition Radar */}
        <div
          data-testid="observatory-panel-leitner"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-[#F43F5E]" />
                <h2 className="text-sm font-bold text-[#F1F5F9] font-sans">
                  Leitner Spaced Repetition Radar
                </h2>
              </div>
              <span
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#1B2028] text-[#6EE7B7] border border-[#10B981]/30 flex items-center gap-1"
                aria-label={`Review Retention Rate: ${quality.reviewRetentionRate}%`}
              >
                <ShieldCheck className="size-3 text-[#10B981]" />
                {quality.reviewRetentionRate}% Retention
              </span>
            </div>

            <p className="text-xs text-[#8E98A8] leading-relaxed">
              Tracking forgetting-curve transitions across all 150 curated algorithmic problems.
            </p>

            {/* Proportional Stacked Box Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8E98A8]">
                <span>Box Distribution (150 Problems)</span>
                <span>
                  {gaps.overdueDsaCount > 0 ? (
                    <span className="text-[#FDA4AF] font-semibold flex items-center gap-1">
                      <AlertCircle className="size-3 text-[#F43F5E]" />
                      {gaps.overdueDsaCount} Due Today
                    </span>
                  ) : (
                    <span className="text-[#6EE7B7]">All Reviews Clear</span>
                  )}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Leitner Box Distribution Bar"
                aria-valuenow={quality.boxDistribution[4]}
                aria-valuemin={0}
                aria-valuemax={totalBoxes}
                className="h-3 w-full bg-[#0F1216] rounded-full overflow-hidden flex border border-[#262D38]"
              >
                <div
                  style={{ width: `${box1Pct}%` }}
                  className="bg-[#384252] h-full transition-all duration-300"
                  title={`Box 1: ${quality.boxDistribution[1]} problems (${box1Pct}%)`}
                />
                <div
                  style={{ width: `${box2Pct}%` }}
                  className="bg-[#3B82F6] h-full transition-all duration-300"
                  title={`Box 2: ${quality.boxDistribution[2]} problems (${box2Pct}%)`}
                />
                <div
                  style={{ width: `${box3Pct}%` }}
                  className="bg-[#8B5CF6] h-full transition-all duration-300"
                  title={`Box 3: ${quality.boxDistribution[3]} problems (${box3Pct}%)`}
                />
                <div
                  style={{ width: `${box4Pct}%` }}
                  className="bg-[#10B981] h-full transition-all duration-300"
                  title={`Box 4 (Mastered): ${quality.boxDistribution[4]} problems (${box4Pct}%)`}
                />
              </div>
            </div>

            {/* 4 Box Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded bg-[#1B2028] border border-[#262D38] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E98A8]">
                  <span className="size-2 rounded-full bg-[#384252]" /> Box 1 (1d)
                </div>
                <div className="font-bold text-[#F1F5F9]">{quality.boxDistribution[1] || 0}</div>
              </div>
              <div className="p-2 rounded bg-[#1B2028] border border-[#262D38] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E98A8]">
                  <span className="size-2 rounded-full bg-[#3B82F6]" /> Box 2 (3d)
                </div>
                <div className="font-bold text-[#F1F5F9]">{quality.boxDistribution[2] || 0}</div>
              </div>
              <div className="p-2 rounded bg-[#1B2028] border border-[#262D38] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E98A8]">
                  <span className="size-2 rounded-full bg-[#8B5CF6]" /> Box 3 (7d)
                </div>
                <div className="font-bold text-[#F1F5F9]">{quality.boxDistribution[3] || 0}</div>
              </div>
              <div className="p-2 rounded bg-[#1B2028] border border-[#262D38] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E98A8]">
                  <span className="size-2 rounded-full bg-[#10B981]" /> Box 4 (14d)
                </div>
                <div className="font-bold text-[#F1F5F9]">{quality.boxDistribution[4] || 0}</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#5A6578] border-t border-[#262D38] pt-2 flex items-center justify-between font-mono">
            <span>Intervals: 1d → 3d → 7d → 14d</span>
            <span>Box 4 = Mastered</span>
          </div>
        </div>

        {/* Panel B: Pattern & Domain Progression Radar */}
        <div
          data-testid="observatory-panel-progression"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-[#2DD4BF]" />
                <h2 className="text-sm font-bold text-[#F1F5F9] font-sans">
                  Pattern Progression & Domain Readiness
                </h2>
              </div>
              <span
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#1B2028] text-[#5EEAD4] border border-[#2DD4BF]/30 flex items-center gap-1"
                aria-label={`Overall Domain Readiness: ${progress.overallDomainReadiness}%`}
              >
                <TrendingUp className="size-3 text-[#2DD4BF]" />
                {progress.overallDomainReadiness}% Ready
              </span>
            </div>

            <p className="text-xs text-[#8E98A8] leading-relaxed">
              Curriculum pattern penetration and evidence-weighted competence across all 11 domains.
            </p>

            {/* Pattern Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8E98A8]">
                <span>17 Core Algorithmic Patterns</span>
                <span className="text-[#F1F5F9] font-bold">
                  {progress.patternsAttemptedCount} / {progress.totalPatternsCount} ({patternPct}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Pattern Progression Progressbar"
                aria-valuenow={progress.patternsAttemptedCount}
                aria-valuemin={0}
                aria-valuemax={progress.totalPatternsCount}
                className="h-2.5 w-full bg-[#0F1216] rounded-full overflow-hidden border border-[#262D38]"
              >
                <div
                  style={{ width: `${patternPct}%` }}
                  className="bg-[#F43F5E] h-full transition-all duration-300 rounded-full"
                />
              </div>
            </div>

            {/* Overall Domain Readiness Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8E98A8]">
                <span>Weighted 11-Domain Curriculum Readiness</span>
                <span className="text-[#2DD4BF] font-bold">
                  {progress.overallDomainReadiness}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Overall Domain Readiness Progressbar"
                aria-valuenow={progress.overallDomainReadiness}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2.5 w-full bg-[#0F1216] rounded-full overflow-hidden border border-[#262D38]"
              >
                <div
                  style={{ width: `${progress.overallDomainReadiness}%` }}
                  className="bg-[#2DD4BF] h-full transition-all duration-300 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#5A6578] border-t border-[#262D38] pt-2 flex items-center justify-between font-mono">
            <span>Canonical skillsEngine aggregation</span>
            <span>Target Level = 4/5</span>
          </div>
        </div>
      </div>
    </section>
  );
};
