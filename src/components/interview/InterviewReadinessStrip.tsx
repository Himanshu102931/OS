import React from 'react';
import type { CompanyOverlay } from '../../types';
import type {
  InterviewReadinessScorecard,
  ReadinessBand,
} from '../../engine/interviewReadinessEngine';
import { AlertTriangle, Clock3, TrendingUp } from 'lucide-react';

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

/** Compact, individually labelled meter — never blended with its siblings. */
const Meter: React.FC<{
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
      className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38] interview-signal-track"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    <p className="text-[10px] leading-tight text-[#5C6675]">{hint}</p>
  </div>
);

export interface InterviewReadinessStripProps {
  scorecard: InterviewReadinessScorecard;
  companyOverlays: CompanyOverlay[];
  selectedCompanyOverlayId: string | null;
  onSelectCompany: (companyId: string | null) => void;
}

export const InterviewReadinessStrip: React.FC<InterviewReadinessStripProps> = ({
  scorecard,
  companyOverlays,
  selectedCompanyOverlayId,
  onSelectCompany,
}) => {
  const { dimensions, overallBand } = scorecard;
  const overallMeta = BAND_META[overallBand];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Interview Readiness Scorecard
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 max-w-2xl">
            Evidence-driven view of what is helping or limiting interview performance. Capability,
            confidence and freshness are reported separately — never blended into a single
            percentage.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="interview-company-select"
            className="text-xs text-[#8E98A8] whitespace-nowrap"
          >
            Company focus:
          </label>
          <select
            id="interview-company-select"
            data-testid="interview-company-select"
            value={selectedCompanyOverlayId ?? ''}
            onChange={(e) => onSelectCompany(e.target.value ? e.target.value : null)}
            className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
          >
            <option value="">None (general readiness)</option>
            {companyOverlays.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.companyName} — {comp.targetRole}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── One strong summary area ───────────────────────────── */}
      <section
        className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 sm:p-6 space-y-5 readiness-glow relative overflow-hidden interview-signal-track"
        data-testid="readiness-summary"
        aria-label="Overall readiness summary"
      >
        <div className="interview-signal-beam" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6366F1] uppercase tracking-wider">
              Overall Readiness
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-lg border text-sm font-bold capitalize readiness-badge ${overallMeta.chip}`}
                data-testid="overall-band"
              >
                {overallMeta.label}
              </span>
              <span className="text-xs text-[#8E98A8]">
                across {dimensions.length} evidence dimensions
              </span>
            </div>
          </div>

          {/* Signal chips — active weakness / remediation signals */}
          <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="signal-chips">
            <span className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] font-medium readiness-badge">
              <AlertTriangle className="inline size-3 mr-1 -mt-0.5" />
              Active remediation: <strong>{scorecard.activeRemediationCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-[#FFC665] font-medium readiness-badge">
              <Clock3 className="inline size-3 mr-1 -mt-0.5" />
              Stale dimensions: <strong>{scorecard.staleEvidenceCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] font-medium readiness-badge">
              <TrendingUp className="inline size-3 mr-1 -mt-0.5" />
              Weak evidence: <strong>{scorecard.weakEvidenceCount}</strong>
            </span>
          </div>
        </div>

        {/* Three deliberately separate meters */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-1">
          <Meter
            testId="overall-evidence"
            label="Evidence"
            value={scorecard.overallEvidenceStrength}
            valueText={`${scorecard.overallEvidenceStrength}%`}
            barClass="bg-[#E5A93C]"
            hint="Recorded capability evidence from tasks, DSA, skills and practice."
          />
          <Meter
            testId="overall-confidence"
            label="Confidence"
            value={scorecard.overallConfidence}
            valueText={scorecard.overallConfidence > 0 ? `${scorecard.overallConfidence}%` : '—'}
            barClass="bg-[#38BDF8]"
            hint="How well assessed or self-rated the evidence is. Not capability."
          />
          <Meter
            testId="overall-freshness"
            label="Freshness"
            value={scorecard.overallFreshness}
            valueText={scorecard.overallFreshness > 0 ? `${scorecard.overallFreshness}%` : '—'}
            barClass="bg-[#10B981]"
            hint="How recent the evidence is before decay applies."
          />
        </div>

        <p className="text-[11px] text-[#5C6675] border-t border-[#262D38] pt-3">
          These three values are independent inputs to each readiness band. A high confidence or
          freshness score never raises the evidence score, and this view intentionally shows no
          single "percent interview ready" figure.
        </p>
      </section>
    </div>
  );
};
