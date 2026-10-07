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
    chip: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
    bar: 'bg-[#10B981]',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30',
    bar: 'bg-[#E5A93C]',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    bar: 'bg-[#F59E0B]',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-[#14171D] text-[#8E98A8] border-[#262D38]',
    bar: 'bg-[#5C6675]',
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E98A8]">
        {label}
      </span>
      <span className="text-xs font-bold text-[#F1F5F9]" data-testid={`${testId}-value`}>
        {valueText}
      </span>
    </div>
    <div
      role="progressbar"
      aria-valuenow={Math.max(0, Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} meter`}
      className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38]"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    <p className="text-[10px] leading-tight text-[#5C6675]">{hint}</p>
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
      className="bg-[#14171D] border border-[#262D38] rounded-lg transition-all hover:bg-[#1B2028]/50 hover:border-[#2C3342]"
    >
      {/* Row header (expand toggle) */}
      <button
        type="button"
        onClick={() => onToggleExpand(dim.id)}
        aria-expanded={isExpanded}
        aria-controls={`dimension-detail-${dim.id}`}
        data-testid={`dimension-toggle-${dim.id}`}
        className="w-full text-left p-3.5 flex flex-col md:flex-row md:items-center gap-3 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6366F1] rounded-t-lg"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#F1F5F9]">{dim.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium readiness-badge ${meta.chip}`}
              data-testid={`dimension-band-${dim.id}`}
            >
              {meta.label}
            </span>
            {companyDim?.isRequired && (
              <span
                className="text-[10px] px-2 py-0.5 rounded border bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8] font-medium"
                data-testid={`dimension-company-required-${dim.id}`}
              >
                Required by {companyOverlay?.companyName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8E98A8] line-clamp-2">{dim.gapExplanation}</p>
          {topEvidence.length > 0 && (
            <p className="text-[10px] text-[#5C6675] truncate">
              Evidence: {topEvidence.map((e) => e.description).join(' · ')}
            </p>
          )}
        </div>

        {/* Three separate compact meters per dimension */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 md:shrink-0">
          <div className="min-w-[74px]" data-testid={`dimension-capability-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">Capability</div>
            <div className="text-xs font-bold text-[#F1F5F9]">
              {dim.capability}
              <span className="text-[10px] font-medium text-[#8E98A8]">%</span>
            </div>
          </div>
          <div className="min-w-[74px]" data-testid={`dimension-confidence-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">Confidence</div>
            <div className="text-xs font-bold text-[#38BDF8]">
              {CONFIDENCE_LABEL[dim.confidence]}
            </div>
          </div>
          <div className="min-w-[74px]" data-testid={`dimension-freshness-${dim.id}`}>
            <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">Freshness</div>
            <div className="text-xs font-bold text-[#10B981]">{FRESHNESS_LABEL[dim.freshness]}</div>
          </div>
        </div>

        <ChevronDown
          className={`size-4 text-[#8E98A8] shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-[#6366F1]' : ''
          }`}
        />
      </button>

      {/* Action hierarchy — always visible, one next step */}
      <div className="px-3.5 pb-3 flex flex-wrap items-center gap-2 border-t border-[#262D38]/70 pt-2.5">
        <span className="text-[10px] uppercase tracking-wider text-[#8E98A8]">Next step</span>
        <Button
          size="xs"
          onClick={() => onAction(action.route, action.targetId)}
          data-testid={`dimension-action-${dim.id}`}
          className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md focus:ring-1 focus:ring-[#6366F1]"
        >
          {action.label}
        </Button>
        <span className="text-[10px] text-[#5C6675] font-mono">→ {action.route}</span>
      </div>

      {/* Expandable evidence / weakness detail */}
      {isExpanded && (
        <div
          id={`dimension-detail-${dim.id}`}
          data-testid={`dimension-detail-${dim.id}`}
          className="px-3.5 pb-3.5 pt-1 border-t border-[#262D38]/70 space-y-3"
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
              barClass="bg-[#38BDF8]"
              hint="Assessment or manual rating certainty. Does not add capability."
            />
            <DetailMeter
              testId={`detail-freshness-${dim.id}`}
              label="Freshness"
              value={dim.freshnessScore}
              valueText={`${FRESHNESS_LABEL[dim.freshness]} (${dim.freshnessScore}%)`}
              barClass="bg-[#10B981]"
              hint="Recency of evidence before decay applies."
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E98A8]">
              Evidence trace ({dim.evidenceItems.length})
            </span>
            {dim.evidenceItems.length === 0 ? (
              <p className="text-[11px] text-[#5C6675]">
                No recorded evidence yet for this dimension.
              </p>
            ) : (
              <ul className="space-y-1">
                {dim.evidenceItems.map((ev, i) => (
                  <li
                    key={`${dim.id}-ev-${i}`}
                    className="text-[11px] text-[#8E98A8] flex items-start gap-2"
                  >
                    <span
                      className={`mt-1 size-1.5 rounded-full shrink-0 ${
                        ev.freshness === 'fresh'
                          ? 'bg-[#10B981]'
                          : ev.freshness === 'stale'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#5C6675]'
                      }`}
                    />
                    <span>
                      {ev.description}
                      <span className="text-[#5C6675]"> — {ev.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dim.weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                Active weaknesses ({dim.weaknesses.length})
              </span>
              <ul className="space-y-1">
                {dim.weaknesses.map((w, i) => (
                  <li key={`${dim.id}-w-${i}`} className="text-[11px] text-[#F59E0B]">
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
