import React, { useMemo, useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import {
  generateInterviewReadinessScorecard,
  type ReadinessBand,
  type ReadinessDimension,
} from '../../engine/interviewReadinessEngine';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';
import { buildInterviewDimensionTrace } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { Button } from '../ui/button';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Layers,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Visual tokens — reuse the established PlacementOS dark palette.
   Capability, confidence and freshness are rendered as three
   separate, individually labelled meters so they can never be
   mistaken for one blended number.
   ──────────────────────────────────────────────────────────────── */

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
    <div className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    <p className="text-[10px] leading-tight text-[#5C6675]">{hint}</p>
  </div>
);

export const InterviewReadinessView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    topics,
    domains,
    skillStates,
    companyOverlays,
    practiceAttempts,
    practiceSessions,
    evidenceLogs,
    assessmentState,
    preparationTopicProgress,
    dailyTaskAssignments,
    todayDate,
    currentMode,
    activePhase,
    selectedCompanyOverlayId,
    setSelectedCompanyOverlayId,
    setRoute,
  } = usePlacement();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const catalog = useEvidenceCatalog();

  const todayAssignments = useMemo(
    () => dailyTaskAssignments.filter((a) => a.date === todayDate),
    [dailyTaskAssignments, todayDate]
  );

  const scorecard = useMemo(
    () =>
      generateInterviewReadinessScorecard({
        tasks: taskDefinitions,
        taskProgress,
        dsaProblems,
        dsaProgress,
        dsaAttempts,
        topics,
        domains,
        skillStates,
        companyOverlays,
        practiceAttempts,
        practiceSessions,
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress,
        domainResults: assessmentState?.domainResults ?? [],
        weaknessSignals: assessmentState?.weaknessSignals ?? [],
        evidenceLogs,
        assessmentState,
        todayStr: todayDate,
        selectedCompanyId: selectedCompanyOverlayId ?? undefined,
        currentMode,
        todayAssignments,
        activePhase,
      }),
    [
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      topics,
      domains,
      skillStates,
      companyOverlays,
      practiceAttempts,
      practiceSessions,
      preparationTopicProgress,
      assessmentState,
      evidenceLogs,
      todayDate,
      selectedCompanyOverlayId,
      currentMode,
      todayAssignments,
      activePhase,
    ]
  );

  const { dimensions, overallBand, assessmentIntegration, projectReadiness, companyOverlay } =
    scorecard;

  /** SIGNAL → WHY → EVIDENCE → SOURCE for each readiness dimension. */
  const dimensionTraces = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dim) => [dim.id, buildInterviewDimensionTrace(dim, catalog)])
      ),
    [dimensions, catalog]
  );

  const company = companyOverlay
    ? companyOverlays.find((c) => c.id === companyOverlay.companyId)
    : undefined;

  const daysUntilEvent = useMemo(() => {
    const event = companyOverlay?.eventDate ?? company?.eventDate;
    if (!event) return null;
    const diff = Math.round(
      (new Date(event).getTime() - new Date(todayDate).getTime()) / 86_400_000
    );
    return Number.isFinite(diff) ? diff : null;
  }, [companyOverlay?.eventDate, company?.eventDate, todayDate]);

  const overallMeta = BAND_META[overallBand];
  const requiredDimensions = companyOverlay?.dimensions.filter((d) => d.isRequired) ?? [];
  const openWeaknesses = dimensions.flatMap((d) =>
    d.weaknesses.slice(0, 1).map((w) => ({ dimension: d.name, text: w }))
  );

  const handleAction = (action: DisplayAction) => setRoute(action.route, action.targetId);

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
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
            onChange={(e) => setSelectedCompanyOverlayId(e.target.value ? e.target.value : null)}
            className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#E5A93C]"
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
        className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 sm:p-6 space-y-5 readiness-glow"
        data-testid="readiness-summary"
        aria-label="Overall readiness summary"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#E5A93C] uppercase tracking-wider">
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

      {/* ── Compact dimension rows ────────────────────────────── */}
      <section aria-label="Readiness dimensions" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <Layers className="size-4 text-[#E5A93C]" />
            Readiness Dimensions
          </h2>
          <span className="text-[11px] text-[#8E98A8]">
            {dimensions.filter((d) => d.band === 'strong').length} strong ·{' '}
            {dimensions.filter((d) => d.band === 'developing').length} developing ·{' '}
            {dimensions.filter((d) => d.band === 'needs_work').length} need work ·{' '}
            {dimensions.filter((d) => d.band === 'unassessed').length} unassessed
          </span>
        </div>

        <div className="space-y-2.5 stagger-in" data-testid="dimension-list">
          {dimensions.map((dim) => {
            const meta = BAND_META[dim.band];
            const isExpanded = expandedId === dim.id;
            const action = resolveAction(dim);
            const companyDim = companyOverlay?.dimensions.find((c) => c.dimensionId === dim.id);
            const topEvidence = dim.evidenceItems.slice(0, 2);

            return (
              <div
                key={dim.id}
                data-testid={`dimension-row-${dim.id}`}
                className="bg-[#14171D] border border-[#262D38] rounded-lg transition-all hover:bg-[#1B2028]/50"
              >
                {/* Row header (expand toggle) */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : dim.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`dimension-detail-${dim.id}`}
                  data-testid={`dimension-toggle-${dim.id}`}
                  className="w-full text-left p-3.5 flex flex-col md:flex-row md:items-center gap-3 cursor-pointer"
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
                      <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">
                        Capability
                      </div>
                      <div className="text-xs font-bold text-[#F1F5F9]">
                        {dim.capability}
                        <span className="text-[10px] font-medium text-[#8E98A8]">%</span>
                      </div>
                    </div>
                    <div className="min-w-[74px]" data-testid={`dimension-confidence-${dim.id}`}>
                      <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">
                        Confidence
                      </div>
                      <div className="text-xs font-bold text-[#38BDF8]">
                        {CONFIDENCE_LABEL[dim.confidence]}
                      </div>
                    </div>
                    <div className="min-w-[74px]" data-testid={`dimension-freshness-${dim.id}`}>
                      <div className="text-[9px] uppercase tracking-wider text-[#8E98A8]">
                        Freshness
                      </div>
                      <div className="text-xs font-bold text-[#10B981]">
                        {FRESHNESS_LABEL[dim.freshness]}
                      </div>
                    </div>
                  </div>

                  <ChevronDown
                    className={`size-4 text-[#8E98A8] shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Action hierarchy — always visible, one next step */}
                <div className="px-3.5 pb-3 flex flex-wrap items-center gap-2 border-t border-[#262D38]/70 pt-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
                    Next step
                  </span>
                  <Button
                    size="xs"
                    onClick={() => handleAction(action)}
                    data-testid={`dimension-action-${dim.id}`}
                    className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
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
                      <Meter
                        testId={`detail-capability-${dim.id}`}
                        label="Capability / Evidence"
                        value={dim.capability}
                        valueText={`${dim.capability}%`}
                        barClass={meta.bar}
                        hint="Weighted recorded evidence for this dimension."
                      />
                      <Meter
                        testId={`detail-confidence-${dim.id}`}
                        label="Confidence"
                        value={dim.confidenceScore}
                        valueText={`${CONFIDENCE_LABEL[dim.confidence]} (${dim.confidenceScore}%)`}
                        barClass="bg-[#38BDF8]"
                        hint="Assessment or manual rating certainty. Does not add capability."
                      />
                      <Meter
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
                      trace={dimensionTraces[dim.id]}
                      catalog={catalog}
                      idPrefix={`dimension-${dim.id}`}
                      title="Evidence trace"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Active weakness / remediation signals ─────────────── */}
      <section
        aria-label="Active weakness and remediation signals"
        data-testid="weakness-signals"
        className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
          <Activity className="size-4 text-[#F59E0B]" />
          Active Weakness &amp; Remediation Signals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Active remediation
            </div>
            <div className="text-xl font-extrabold text-[#F59E0B] mt-1">
              {scorecard.activeRemediationCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              DSA remediation flags, open assessment weaknesses and low-evidence skills.
            </p>
          </div>
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Stale dimensions
            </div>
            <div className="text-xl font-extrabold text-[#FFC665] mt-1">
              {scorecard.staleEvidenceCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Dimensions whose evidence has passed its freshness window.
            </p>
          </div>
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Weak evidence
            </div>
            <div className="text-xl font-extrabold text-[#F59E0B] mt-1">
              {scorecard.weakEvidenceCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Dimensions below the evidence-strength threshold.
            </p>
          </div>
        </div>

        {openWeaknesses.length > 0 ? (
          <ul className="space-y-1 pt-1 border-t border-[#262D38]">
            {openWeaknesses.slice(0, 6).map((w, i) => (
              <li key={`sig-${i}`} className="text-[11px] text-[#8E98A8]">
                <span className="text-[#F59E0B] font-semibold">{w.dimension}:</span> {w.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[#5C6675] pt-1 border-t border-[#262D38]">
            No active weakness or remediation signals recorded.
          </p>
        )}

        <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
          <Button
            size="xs"
            onClick={() => setRoute('dsa')}
            data-testid="signal-action-dsa"
            className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
          >
            Review DSA remediation
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setRoute('analytics')}
            data-testid="signal-action-analytics"
            className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
          >
            <BarChart3 className="size-3" />
            Open Review queue
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Assessment summary ──────────────────────────────── */}
        <section
          aria-label="Assessment summary"
          data-testid="assessment-summary"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <ClipboardCheck className="size-4 text-[#E5A93C]" />
            Assessment Summary
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg border font-medium readiness-badge ${
                assessmentIntegration.isAssessed
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#14171D] text-[#8E98A8] border-[#262D38]'
              }`}
              data-testid="assessment-status"
            >
              {assessmentIntegration.isAssessed ? 'Assessed' : 'Not assessed'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Domains covered:{' '}
              <strong className="text-[#F1F5F9]">{assessmentIntegration.assessedDomainsCount}</strong>
            </span>
          </div>

          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Overall ability
            </div>
            <div className="text-2xl font-extrabold text-[#F1F5F9] mt-0.5">
              {assessmentIntegration.isAssessed ? `${assessmentIntegration.overallAbility}%` : '—'}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Ability estimate from the diagnostic. Confidence is reported separately above.
            </p>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex items-start gap-2">
              <Target className="size-3.5 text-[#E5A93C] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Focus area:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.primaryFocusDomain ?? 'Not set'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-[#10B981] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Strengths:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.strengths.length > 0
                    ? assessmentIntegration.strengths.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-[#F59E0B] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Weaknesses:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.weaknesses.length > 0
                    ? assessmentIntegration.weaknesses.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="size-3.5 text-[#38BDF8] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Reassessment recommended:{' '}
                <strong
                  className={
                    assessmentIntegration.reassessmentRecommended ? 'text-[#FFC665]' : 'text-[#F1F5F9]'
                  }
                  data-testid="assessment-reassessment"
                >
                  {assessmentIntegration.reassessmentRecommended ? 'Yes' : 'No'}
                </strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => setRoute('assessment')}
              data-testid="assessment-action"
              className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
            >
              <ClipboardCheck className="size-3" />
              {assessmentIntegration.isAssessed ? 'Open Diagnostic' : 'Run Diagnostic'}
            </Button>
          </div>
        </section>

        {/* ── Project Lab readiness ───────────────────────────── */}
        <section
          aria-label="Project Lab readiness"
          data-testid="project-readiness"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#E5A93C]" />
            Project Lab Readiness
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg border font-medium readiness-badge ${
                BAND_META[projectReadiness.defenseReadiness].chip
              }`}
              data-testid="defense-band"
            >
              Defense: {BAND_META[projectReadiness.defenseReadiness].label}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Sections: <strong className="text-[#F1F5F9]">{projectReadiness.sectionsCompleted}</strong>
              /{projectReadiness.totalSections}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Defense evidence:{' '}
              <strong className="text-[#F1F5F9]">{projectReadiness.evidenceDefenseSessions}</strong>
            </span>
          </div>

          <div className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38]">
            <div
              className="bg-[#E5A93C] h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (projectReadiness.sectionsCompleted / Math.max(1, projectReadiness.totalSections)) *
                    100
                )}%`,
              }}
            />
          </div>

          <div className="text-xs text-[#8E98A8] space-y-1">
            <div className="flex items-center gap-2">
              <Award className="size-3.5 text-[#10B981] shrink-0" />
              Last defense:{' '}
              <strong className="text-[#F1F5F9]">
                {projectReadiness.lastDefenseDate ?? 'No recorded defense yet'}
              </strong>
            </div>
            <p className="text-[10px] text-[#5C6675]">
              Section completion is claimed only from recorded defense attempts — reading a tab
              never marks a section complete.
            </p>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => setRoute('project')}
              data-testid="project-action"
              className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
            >
              <FlaskConical className="size-3" />
              Open Project Lab
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setRoute('practice', 'practice-project-defense-01')}
              data-testid="project-defense-action"
              className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
            >
              Launch defense session
            </Button>
          </div>
        </section>
      </div>

      {/* ── Company overlay ───────────────────────────────────── */}
      <section
        aria-label="Company readiness overlay"
        data-testid="company-overlay"
        className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <Building2 className="size-4 text-[#E5A93C]" />
            Company Readiness Overlay
          </h2>
          {companyOverlay && (
            <span
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] font-medium"
              data-testid="company-gap-badge"
            >
              Gap: {companyOverlay.overallGap}
            </span>
          )}
        </div>

        {!companyOverlay ? (
          <p className="text-xs text-[#8E98A8]" data-testid="company-overlay-empty">
            No company selected. Showing general readiness only — no company-specific requirements
            are applied to the evidence above.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E98A8]">
              <span>
                <Building2 className="inline size-3.5 mr-1 -mt-0.5" />
                <strong className="text-[#F1F5F9]">{companyOverlay.companyName}</strong>
              </span>
              {company?.targetRole && (
                <span>
                  Role: <strong className="text-[#F1F5F9]">{company.targetRole}</strong>
                </span>
              )}
              <span>
                <CalendarClock className="inline size-3.5 mr-1 -mt-0.5" />
                Event:{' '}
                <strong className="text-[#F1F5F9]">
                  {companyOverlay.eventDate ?? 'Not scheduled'}
                </strong>
                {daysUntilEvent !== null && (
                  <span
                    className={`ml-1.5 ${daysUntilEvent <= 30 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}
                    data-testid="company-days-until"
                  >
                    ({daysUntilEvent >= 0 ? `${daysUntilEvent}d left` : `${Math.abs(daysUntilEvent)}d ago`})
                  </span>
                )}
              </span>
            </div>

            <p className="text-[11px] text-[#5C6675] border-t border-[#262D38] pt-2">
              The company overlay is displayed alongside the general scorecard. Dimension evidence,
              capability, confidence and freshness above are unchanged by this selection.
            </p>

            <div className="space-y-1.5" data-testid="company-dimension-list">
              {companyOverlay.dimensions.map((cd) => {
                const dim = dimensions.find((d) => d.id === cd.dimensionId);
                const dimMeta = dim ? BAND_META[dim.band] : BAND_META.unassessed;
                return (
                  <div
                    key={cd.dimensionId}
                    data-testid={`company-dimension-${cd.dimensionId}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border ${
                      cd.isRequired
                        ? 'bg-[#38BDF8]/5 border-[#38BDF8]/25'
                        : 'bg-[#1B2028] border-[#262D38]'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#F1F5F9]">{dim?.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${
                            cd.isRequired
                              ? 'bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8]'
                              : 'bg-[#14171D] border-[#262D38] text-[#8E98A8]'
                          }`}
                        >
                          {cd.isRequired ? 'Required' : 'Not required'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border capitalize readiness-badge ${dimMeta.chip}`}
                        >
                          {dimMeta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8E98A8]">{cd.gapDescription}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 bg-[#14171D] border-[#262D38] text-[#8E98A8] capitalize">
                      {cd.priority}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
              <span className="text-[11px] text-[#8E98A8] self-center">
                {requiredDimensions.length} of {companyOverlay.dimensions.length} dimensions
                required
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setRoute('companies')}
                data-testid="company-action"
                className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md ml-auto"
              >
                <Building2 className="size-3" />
                Manage company overlays
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
