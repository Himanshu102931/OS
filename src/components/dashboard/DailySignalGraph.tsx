import React, { useMemo, useState, useEffect } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  calculateDomainReadinessList,
  calculateTopicReadiness,
  type DomainReadiness,
} from '../../engine/skillsEngine';
import { Code2, Database, Cpu, Network, Calculator, MessageSquare, Target, Layout, Boxes, AlertCircle } from 'lucide-react';

/**
 * Icons only. Domain LABELS come from the canonical readiness payload
 * (`DomainReadiness.shortName`), so Today can never drift from Skills.
 */
const DOMAIN_ICON: Record<string, React.FC<{ className?: string }>> = {
  dsa: Code2,
  python: Boxes,
  sql: Database,
  oop: Boxes,
  dbms: Database,
  os: Cpu,
  cn: Network,
  aptitude: Calculator,
  communication: MessageSquare,
  interviews: Target,
  projects: Layout,
};

/**
 * C6 — display metadata ONLY for the four statuses the canonical
 * `calculateDomainReadinessList()` already returns. The thresholds live in
 * skillsEngine; this map must never re-derive a status from a percentage.
 */
const STATUS_META: Record<string, { color: string; label: string }> = {
  ready: { color: '#10B981', label: 'Ready' },
  on_track: { color: '#F59E0B', label: 'On Track' },
  at_risk: { color: '#F43F5E', label: 'At Risk' },
  needs_baseline: { color: '#6B7280', label: 'Needs Baseline' },
};

const statusMeta = (status: string) => STATUS_META[status] ?? STATUS_META.needs_baseline;

/** C7-05 — the signal graph's drawable coordinate space (unchanged). */
const SIGNAL_VIEWBOX_WIDTH = 800;

/* ─── C7-05 — connector geometry ─────────────────────────────────────── */

export interface SignalConnector {
  /** domainId of the displayed domain the line starts at */
  from: string;
  /** domainId of the NEXT displayed domain the line ends at */
  to: string;
  x1: number;
  x2: number;
}

const CONNECTOR_COLOR: Record<string, string> = {
  dsa: '#10B981',
  sql: '#3B82F6',
  os: '#F43F5E',
};

/**
 * C7-05 — pure connector geometry for the Daily Signal graph.
 *
 * The previous implementation walked a FILTERED array but indexed the FULL one
 * (`100 + i * 70`), so a line could start at domain A and end at domain C, and
 * with 11 domains the last connector ran to x = 870 in an 800-wide viewBox.
 *
 * This version joins `i → i + 1` of the DISPLAYED sequence (the same order the
 * columns render in) and centres each endpoint on that column's slot, so every
 * coordinate is provably inside `(0, viewBoxWidth)`. Only geometry changes —
 * readiness values, ordering, and the "connect only domains that have data"
 * rule are untouched.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function buildSignalConnectors(
  readinessByDomain: readonly { domainId: string; overallReadiness: number }[],
  viewBoxWidth = 800
): SignalConnector[] {
  const count = readinessByDomain.length;
  if (count < 2) return [];

  const connectors: SignalConnector[] = [];
  for (let i = 0; i < count - 1; i++) {
    const from = readinessByDomain[i];
    const to = readinessByDomain[i + 1];
    if (from.overallReadiness <= 0 || to.overallReadiness <= 0) continue;
    // Centre of slot i and slot i + 1 in a `justify-around` row of `count`
    // columns: identical to the bar layout, and never outside the viewBox.
    connectors.push({
      from: from.domainId,
      to: to.domainId,
      x1: ((i + 0.5) * viewBoxWidth) / count,
      x2: ((i + 1.5) * viewBoxWidth) / count,
    });
  }
  return connectors;
}

export const DailySignalGraph: React.FC = () => {
  const { domains, topics, taskDefinitions, taskProgress, dsaProblems, dsaProgress, dsaAttempts, evidenceLogs, skillStates, companyOverlays, todayDate } = usePlacement();
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // C6-03 — CANONICAL readiness. Exactly the two calls SkillsView and
  // analyticsEngine make (calculateTopicReadiness → calculateDomainReadinessList),
  // fed with the REAL task definitions instead of an empty array. The previous
  // local 65/40 threshold rule was a second readiness formula and is gone.
  const readinessByDomain = useMemo<DomainReadiness[]>(() => {
    const topicReadinessList = topics.map((top) =>
      calculateTopicReadiness(
        top,
        domains.find((d) => d.id === top.domainId),
        taskDefinitions,
        taskProgress,
        dsaProblems,
        dsaProgress,
        dsaAttempts,
        evidenceLogs,
        skillStates,
        companyOverlays,
        todayDate
      )
    );
    return calculateDomainReadinessList(domains, topics, topicReadinessList);
  }, [domains, topics, taskDefinitions, taskProgress, dsaProblems, dsaProgress, dsaAttempts, evidenceLogs, skillStates, companyOverlays, todayDate]);

  const urgentComps = companyOverlays.filter(
    (c) => c.applicationStatus === 'interview_scheduled' || c.applicationStatus === 'oa_scheduled'
  );

  // C7-05 — connector geometry derived from the displayed sequence.
  const connectors = useMemo(
    () => buildSignalConnectors(readinessByDomain, SIGNAL_VIEWBOX_WIDTH),
    [readinessByDomain]
  );

  return (
    <section className="space-y-4" data-testid="daily-signal-graph">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
          <AlertCircle className="size-4 text-[#E5A93C]" /> Daily Placement Signals
        </h3>
        {urgentComps.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-mono">{urgentComps.length} urgent</span>
        )}
      </div>
      <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-4 sm:p-5">
        <div className="relative h-48 w-full overflow-hidden">
          {/* C7-05 — `preserveAspectRatio="none"` maps viewBox x linearly onto
              the row width, so a connector centred on slot i lands on the i-th
              column of the `justify-around` bar row at every viewport width. */}
          <svg
            data-testid="signal-connectors"
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${SIGNAL_VIEWBOX_WIDTH} 192`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="signalFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#46B982" stopOpacity="0" />
                <stop offset="50%" stopColor="#46B982" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#46B982" stopOpacity="0" />
              </linearGradient>
            </defs>
            {connectors.map((c) => (
              <line
                key={`flow-${c.from}-${c.to}`}
                x1={c.x1}
                y1={96}
                x2={c.x2}
                y2={96}
                stroke={CONNECTOR_COLOR[c.from] ?? '#6B7280'}
                strokeWidth="1"
                strokeOpacity={0.3}
                strokeDasharray="4 6"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
            {/* C6-04 — render EVERY domain the canonical engine returns.
                No slice cap: the row scrolls horizontally instead. */}
            <div className="flex h-full min-w-max items-center justify-around gap-2 px-4">
              {readinessByDomain.map((r) => {
                const Icon = DOMAIN_ICON[r.domainId] ?? Code2;
                const isHovered = hoveredDomain === r.domainId;
                const meta = statusMeta(r.status);
                const statusColor = meta.color;
                return (
                  <div
                    key={r.domainId}
                    data-testid="signal-domain"
                    data-domain-id={r.domainId}
                    data-domain-label={r.shortName}
                    data-domain-status={r.status}
                    data-domain-readiness={r.overallReadiness}
                    tabIndex={0}
                    role="button"
                    aria-label={`${r.shortName}: ${r.overallReadiness}% (${meta.label})`}
                    className="flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#46B982] rounded-md p-1"
                    style={{
                      opacity: isHovered ? 1 : 0.88,
                      transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoveredDomain(r.domainId)}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onFocus={() => setHoveredDomain(r.domainId)}
                    onBlur={() => setHoveredDomain(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setHoveredDomain(hoveredDomain === r.domainId ? null : r.domainId);
                      }
                    }}
                  >
                    <div
                      className="w-9 sm:w-10 bg-[#0E1410] rounded-t border border-[#212D26] relative overflow-hidden flex flex-col justify-end"
                      style={{ height: '96px' }}
                    >
                      {/* Honest bar fill: height corresponds directly to r.overallReadiness% */}
                      <div
                        className="w-full rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(r.overallReadiness > 0 ? 6 : 0, r.overallReadiness)}%`,
                          background: r.overallReadiness > 0
                            ? `linear-gradient(to top, ${statusColor}50, ${statusColor})`
                            : 'transparent',
                        }}
                      />
                      {/* Subdued baseline indicator when at 0% */}
                      {r.overallReadiness === 0 && (
                        <div className="w-full h-0.5 bg-[#28352D]" />
                      )}
                    </div>
                    <Icon className="size-4 text-[#9AA99F]" />
                    <span className="text-[9px] font-mono font-medium text-[#9AA99F]">{r.shortName}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: statusColor }}>
                      {r.overallReadiness}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {hoveredDomain && (
          <div className="mt-3 pt-3 border-t border-[#262D38] animate-fade-in">
            {(() => {
              const r = readinessByDomain.find((d) => d.domainId === hoveredDomain);
              if (!r) return null;
              const meta = statusMeta(r.status);
              const statusLabel = meta.label;
              const statusColor = meta.color;
              return (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#F1F5F9] font-semibold">{r.shortName}</span>
                    <span className="text-[11px] text-[#9AA99F]">Domain Readiness Signal</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border font-mono font-medium" style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}>
                    {statusLabel} — {r.overallReadiness}%
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      {urgentComps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urgentComps.map((comp) => (
            <div key={comp.id} className="flex items-center gap-2 px-3 py-2 bg-[#14171D] border border-[#F59E0B]/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: reducedMotion ? 'none' : 'pulse-dot 2s ease-in-out infinite' }} />
              <span className="text-xs text-[#F1F5F9]">{comp.companyName}</span>
              <span className="text-[10px] font-mono text-[#F59E0B]">{comp.applicationStatus.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
