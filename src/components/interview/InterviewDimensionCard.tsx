import React from 'react';
import type { RoutePath } from '../../context/PlacementContext';
import type {
  CompanyReadinessOverlay,
  ReadinessBand,
  ReadinessDimension,
} from '../../engine/interviewReadinessEngine';
import type { EvidenceTrace, EvidenceCatalog } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';

const BAND_META: Record<ReadinessBand, { label: string; chip: string; bar: string }> = {
  strong: {
    label: 'Strong',
    chip: 'bg-status-success/10 text-status-success border-status-success/30',
    bar: 'bg-status-success',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    bar: 'bg-status-warning',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    bar: 'bg-status-warning',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-surface-panel text-text-secondary border-border-default',
    bar: 'bg-text-tertiary',
  },
};

const FRESHNESS_LABEL: Record<string, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  untested: 'Untested',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

interface DisplayAction {
  label: string;
  route: RoutePath;
  targetId?: string;
}

/** Resolves a dimension's next step to a real, executable destination. */
function resolveAction(dim: ReadinessDimension): DisplayAction {
  if (dim.band === 'unassessed') {
    return { label: 'Run Diagnostic', route: 'assessment' };
  }
  if (dim.recommendedAction.type !== 'none') {
    return {
      label: dim.recommendedAction.label,
      route: dim.recommendedAction.route as RoutePath,
      targetId: dim.recommendedAction.targetId,
    };
  }
  return { label: "Open Today's Plan", route: 'dashboard' };
}

const DetailMeter: React.FC<{
  testId: string;
  label: string;
  value: number;
  valueText: string;
  barClass: string;
  hint: string;
}> = ({ testId, label, value, valueText, barClass, hint }) => (
  <div className="flex-1 min-w-[110px] space-y-1.5" data-testid={testId}>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      <span className="text-xs font-bold text-text-primary" data-testid={`${testId}-value`}>
        {valueText}
      </span>
    </div>
    <div
      role="progressbar"
      aria-valuenow={Math.max(0, Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} meter`}
      className="w-full bg-surface-canvas rounded-full h-1.5 overflow-hidden border border-border-default"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    <p className="text-[10px] leading-tight text-text-secondary">{hint}</p>
  </div>
);

export interface InterviewDimensionCardProps {
  dimension: ReadinessDimension;
  companyOverlay: CompanyReadinessOverlay | null;
  trace: EvidenceTrace;
  catalog: EvidenceCatalog;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onAction: (route: RoutePath, targetId?: string) => void;
}

export const InterviewDimensionCard: React.FC<InterviewDimensionCardProps> = ({
  dimension: dim,
  companyOverlay,
  trace,
  catalog,
  isExpanded,
  onToggleExpand,
  onAction,
}) => {
  const meta = BAND_META[dim.band];
  const action = resolveAction(dim);
  const companyDim = companyOverlay?.dimensions.find((c) => c.dimensionId === dim.id);
  const topEvidence = dim.evidenceItems.slice(0, 2);

  return (
    <div
      data-testid={`dimension-row-${dim.id}`}
      className="bg-surface-panel border border-border-default rounded-lg transition-all hover:bg-surface-elevated/50 hover:border-border-active"
    >
      {/* Row header (expand toggle) */}
      <button
        type="button"
        onClick={() => onToggleExpand(dim.id)}
        aria-expanded={isExpanded}
        aria-controls={`dimension-detail-${dim.id}`}
        data-testid={`dimension-toggle-${dim.id}`}
        className="w-full text-left p-3.5 flex flex-col md:flex-row md:items-center gap-3 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--action-accent-interview)] rounded-t-lg"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-primary">{dim.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium readiness-badge ${meta.chip}`}
              data-testid={`dimension-band-${dim.id}`}
            >
              {meta.label}
            </span>
            {companyDim?.isRequired && (
              <span
                className="text-[10px] px-2 py-0.5 rounded border bg-info/10 border-info/30 text-info font-medium"
                data-testid={`dimension-company-required-${dim.id}`}
              >
                Required by {companyOverlay?.companyName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary line-clamp-2">{dim.gapExplanation}</p>
          {topEvidence.length > 0 && (
            <p className="text-[10px] text-text-secondary truncate">
              Evidence: {topEvidence.map((e) => e.description).join(' · ')}
            </p>
          )}
        </div>

        {/* Three separate compact meters per dimension */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 md:shrink-0">
          <div className="min-w-[74px]" data-testid={`dimension-capability-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-text-secondary">Capability</div>
            <div className="text-xs font-bold text-text-primary">
              {dim.capability}
              <span className="text-[10px] font-medium text-text-secondary">%</span>
            </div>
          </div>
          <div className="min-w-[74px]" data-testid={`dimension-confidence-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-text-secondary">Confidence</div>
            <div className="text-xs font-bold text-info">
              {CONFIDENCE_LABEL[dim.confidence]}
            </div>
          </div>
          <div className="min-w-[74px]" data-testid={`dimension-freshness-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-text-secondary">Freshness</div>
            <div className="text-xs font-bold text-status-success">{FRESHNESS_LABEL[dim.freshness]}</div>
          </div>
        </div>

        <ChevronDown
          className={`size-4 text-text-secondary shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-[var(--action-accent-interview)]' : ''
          }`}
        />
      </button>

      {/* Action hierarchy — always visible, one next step */}
      <div className="px-3.5 pb-3 flex flex-wrap items-center gap-2 border-t border-border-default/70 pt-2.5">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary">Next step</span>
        <Button
          size="xs"
          onClick={() => onAction(action.route, action.targetId)}
          data-testid={`dimension-action-${dim.id}`}
          className="h-7 text-xs bg-surface-elevated hover:bg-surface-subtle text-status-warning border border-status-warning/40 rounded-md focus:ring-1 focus:ring-[var(--action-accent-interview)]"
        >
          {action.label}
        </Button>
        <span className="text-[10px] text-text-secondary font-mono">→ {action.route}</span>
      </div>

      {/* Expandable evidence / weakness detail */}
      {isExpanded && (
        <div
          id={`dimension-detail-${dim.id}`}
          data-testid={`dimension-detail-${dim.id}`}
          className="px-3.5 pb-3.5 pt-1 border-t border-border-default/70 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DetailMeter
              testId={`detail-capability-${dim.id}`}
              label="Capability / Evidence"
              value={dim.capability}
              valueText={`${dim.capability}%`}
              barClass={meta.bar}
              hint="Weighted recorded evidence for this dimension."
            />
            <DetailMeter
              testId={`detail-confidence-${dim.id}`}
              label="Confidence"
              value={dim.confidenceScore}
              valueText={`${CONFIDENCE_LABEL[dim.confidence]} (${dim.confidenceScore}%)`}
              barClass="bg-info"
              hint="Assessment or manual rating certainty. Does not add capability."
            />
            <DetailMeter
              testId={`detail-freshness-${dim.id}`}
              label="Freshness"
              value={dim.freshnessScore}
              valueText={`${FRESHNESS_LABEL[dim.freshness]} (${dim.freshnessScore}%)`}
              barClass="bg-status-success"
              hint="Recency of evidence before decay applies."
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Evidence trace ({dim.evidenceItems.length})
            </span>
            {dim.evidenceItems.length === 0 ? (
              <p className="text-[11px] text-text-secondary">
                No recorded evidence yet for this dimension.
              </p>
            ) : (
              <ul className="space-y-1">
                {dim.evidenceItems.map((ev, i) => (
                  <li
                    key={`${dim.id}-ev-${i}`}
                    className="text-[11px] text-text-secondary flex items-start gap-2"
                  >
                    <span
                      className={`mt-1 size-1.5 rounded-full shrink-0 ${
                        ev.freshness === 'fresh'
                          ? 'bg-status-success'
                          : ev.freshness === 'stale'
                          ? 'bg-status-warning'
                          : 'bg-text-tertiary'
                      }`}
                    />
                    <span>
                      {ev.description}
                      <span className="text-text-secondary"> — {ev.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dim.weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-status-warning">
                Active weaknesses ({dim.weaknesses.length})
              </span>
              <ul className="space-y-1">
                {dim.weaknesses.map((w, i) => (
                  <li key={`${dim.id}-w-${i}`} className="text-[11px] text-status-warning">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EvidenceTracePanel
            trace={trace}
            catalog={catalog}
            idPrefix={`dimension-${dim.id}`}
            title="Evidence trace"
          />
        </div>
      )}
    </div>
  );
};
