import { ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react';

interface SkillsProvingStripProps {
  overallPlacementReadiness: number;
  readyCount: number;
  totalTopicsCount: number;
  onTrackCount: number;
  atRiskCount: number;
  totalEvidenceCount: number;
}

export const SkillsProvingStrip: React.FC<SkillsProvingStripProps> = ({
  overallPlacementReadiness,
  readyCount,
  totalTopicsCount,
  onTrackCount,
  atRiskCount,
  totalEvidenceCount,
}) => {
  return (
    <section
      aria-label="Macro Competence Metrics"
      className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Metric 1: Overall Placement Readiness */}
        <div className="space-y-1.5 min-w-[240px]">
          <span className="text-xs font-semibold text-[var(--action-accent-skills)] uppercase tracking-wider font-mono">
            Overall Placement Readiness
          </span>
          <div className="flex items-baseline gap-3">
            <span
              data-testid="overall-readiness-value"
              className="text-3xl font-extrabold text-foreground font-mono tracking-tight"
            >
              {overallPlacementReadiness}%
            </span>
            <span className="text-xs text-foreground-muted font-sans">
              weighted evidence confidence score
            </span>
          </div>
        </div>

        {/* 3 Secondary Proving Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          {/* Metric 2: Ready Topics */}
          <div className="p-3 bg-surface-elevated border border-border rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span className="font-mono text-[11px]">Ready Topics</span>
              <ShieldCheck className="size-3.5 text-status-success" aria-hidden="true" />
            </div>
            <div className="text-base font-bold text-foreground font-mono">
              <span className="text-status-success">{readyCount}</span>
              <span className="text-xs text-foreground-muted font-normal"> / {totalTopicsCount}</span>
            </div>
            <span className="text-[10px] text-foreground-muted block">mastery threshold met</span>
          </div>

          {/* Metric 3: On Track Topics */}
          <div className="p-3 bg-surface-elevated border border-border rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span className="font-mono text-[11px]">On Track</span>
              <TrendingUp className="size-3.5 text-status-warning" aria-hidden="true" />
            </div>
            <div className="text-base font-bold text-foreground font-mono">
              <span className="text-status-warning">{onTrackCount}</span>
              <span className="text-xs text-foreground-muted font-normal"> / {totalTopicsCount}</span>
            </div>
            <span className="text-[10px] text-foreground-muted block">active progression</span>
          </div>

          {/* Metric 4: At-Risk & Aging Gaps */}
          <div className="p-3 bg-surface-elevated border border-border rounded-lg space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span className="font-mono text-[11px]">At-Risk & Stale</span>
              <AlertTriangle className="size-3.5 text-status-danger" aria-hidden="true" />
            </div>
            <div className="text-base font-bold text-foreground font-mono">
              <span className="text-status-danger">{atRiskCount}</span>
              <span className="text-xs text-foreground-muted font-normal"> topics</span>
            </div>
            <span className="text-[10px] text-foreground-muted block">decay or deficit alert</span>
          </div>
        </div>
      </div>

      {/* Progress Bar with accessible progressbar semantics */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-foreground-muted">
          <span>Global Verification Progress</span>
          <span>{totalEvidenceCount} verified evidence items</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={overallPlacementReadiness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall Placement Readiness"
          className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border"
        >
          <div
            className="h-full rounded-full transition-all duration-500 bg-[var(--action-accent-skills)]"
            style={{ width: `${Math.min(100, Math.max(2, overallPlacementReadiness))}%` }}
          />
        </div>
      </div>
    </section>
  );
};
