import React from 'react';
import { Radar, Building2, Waypoints, ArrowRight } from 'lucide-react';
import { TodaySection, SectionHeading, MonoChip } from './todayPrimitives';
import { DailySignalGraph } from './DailySignalGraph';
import type { CompanyOverlay, AssessmentState } from '../../types';
import type { AssessmentProfileReadout } from '../../engine/assessmentEngine';

export interface SignalsFocusProps {
  revealed: boolean;
  observeRef: (el: HTMLElement | null) => void;

  companyOverlays: CompanyOverlay[];
  onRoute: (route: 'interview' | 'companies' | 'analytics' | 'assessment') => void;
  assessmentProfileReadout?: AssessmentProfileReadout;
  assessmentState?: AssessmentState;
}

/**
 * Display-only legend for the four statuses `calculateDomainReadinessList`
 * already returns. Mirrors the labels `DailySignalGraph` renders; never
 * re-derives a status from a percentage.
 */
const LEGEND: { status: string; label: string; swatch: string }[] = [
  { status: 'ready', label: 'Ready', swatch: 'bg-status-success' },
  { status: 'on_track', label: 'On Track', swatch: 'bg-status-warning' },
  { status: 'at_risk', label: 'At Risk', swatch: 'bg-status-danger' },
  { status: 'needs_baseline', label: 'Needs Baseline', swatch: 'bg-text-tertiary' },
];

const TILES: { id: string; label: string; note: string; route: 'interview' | 'companies' | 'analytics'; icon: React.ReactElement }[] = [
  { id: 'interview', label: 'Interview', note: 'canonical readiness surface', route: 'interview', icon: <Radar className="size-4" /> },
  { id: 'companies', label: 'Companies', note: '', route: 'companies', icon: <Building2 className="size-4" /> },
  { id: 'evidence', label: 'Evidence trace', note: '', route: 'analytics', icon: <Waypoints className="size-4" /> },
];

/**
 * §9 — Signals & Focus. `DailySignalGraph` is the one place domain readiness
 * appears (§3.2.3); the focus tiles below it are navigation only and carry no
 * metrics, so no Attention or Progress datum is duplicated.
 */
export const SignalsFocus: React.FC<SignalsFocusProps> = ({
  revealed, observeRef, companyOverlays, onRoute, assessmentProfileReadout, assessmentState,
}) => (
  <TodaySection
    section="signals"
    mobileOrder={8}
    revealId="signals"
    revealed={revealed}
    observeRef={observeRef}
    data-testid="signals-focus"
    data-guide-target="today-readiness-signals"
  >
    <SectionHeading right={<span className="font-mono text-[11px] text-text-tertiary">11 domains</span>}>
      Signals &amp; Focus
    </SectionHeading>

    <div className="mt-3">
      <DailySignalGraph />
    </div>

    {/* Non-colour encoding for the graph states (§9.3, §16). */}
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {LEGEND.map((entry) => (
        <li key={entry.status} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-sm ${entry.swatch}`} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">{entry.label}</span>
        </li>
      ))}
    </ul>

    {((assessmentProfileReadout?.isAssessed) || (assessmentState?.attempts?.some((a) => a.status === 'submitted' || a.status === 'auto_submitted'))) && (
      <div
        className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-panel p-3"
        data-testid="diagnostic-status-callout"
      >
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="size-2 rounded-full bg-accent mt-1 sm:mt-0 shrink-0" />
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-text-primary">
              Baseline Diagnostic Completed ({assessmentProfileReadout?.overallAbility ?? 0}/100 Ability)
            </div>
            <p className="text-[11px] text-text-secondary">
              Graph bars above measure practical mastery (curriculum tasks &amp; DSA problems completed). Your diagnostic capability scores and domain evaluations are preserved separately in Assessment.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRoute('assessment')}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded px-2.5 py-1 text-xs font-medium text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 transition-colors whitespace-nowrap cursor-pointer"
          data-testid="review-diagnostic-today-btn"
        >
          Review Diagnostic Results
          <ArrowRight className="size-3" />
        </button>
      </div>
    )}

    {/* Navigation-only focus tiles — deliberately data-free (§9.2). */}
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {TILES.map((tile) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onRoute(tile.route)}
          className="group flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-panel px-3 py-2.5 text-left transition-colors duration-150 hover:border-border-active hover:bg-surface-elevated"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-text-secondary" aria-hidden="true">{tile.icon}</span>
            <span className="truncate text-sm font-medium text-text-primary">{tile.label}</span>
            {tile.id === 'companies' ? (
              <MonoChip micro tone="neutral">{companyOverlays.length} targets</MonoChip>
            ) : tile.note ? (
              <span className="hidden truncate text-[11px] text-text-tertiary lg:inline">{tile.note}</span>
            ) : null}
          </span>
          <ArrowRight className="size-3.5 shrink-0 text-text-tertiary transition-colors duration-150 group-hover:text-text-primary" aria-hidden="true" />
        </button>
      ))}
    </div>
  </TodaySection>
);
