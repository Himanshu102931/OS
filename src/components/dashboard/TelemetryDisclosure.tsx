import React from 'react';
import { BarChart3, ChevronDown, ChevronUp, Settings, Building2, AlertCircle } from 'lucide-react';
import { TodaySection, Panel, MonoChip, TodayButton } from './todayPrimitives';
import type { CompanyOverlay, TopicSkillState } from '../../types';

export interface TelemetryDisclosureProps {
  revealed: boolean;
  observeRef: (el: HTMLElement | null) => void;

  open: boolean;
  onToggle: () => void;

  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  /** Engine metadata — read, never recomputed (§11). */
  mode: string;
  candidateCount: number;
  revealedSectionCount: number;
  observerActive: boolean;

  onRoute: (route: 'analytics' | 'settings') => void;
}

const FRESHNESS_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  fresh: 'success',
  aging: 'warning',
  stale: 'neutral',
  untested: 'neutral',
};

/**
 * §11 — Secondary Disclosure: collapsed on first paint, everything inside is
 * Tier 3 by definition (§19). No new numbers, no new charts.
 */
export const TelemetryDisclosure: React.FC<TelemetryDisclosureProps> = ({
  revealed, observeRef, open, onToggle,
  skillStates, companyOverlays, mode, candidateCount, revealedSectionCount, observerActive,
  onRoute,
}) => (
  <TodaySection
    section="telemetry"
    mobileOrder={9}
    revealId="telemetry"
    revealed={revealed}
    observeRef={observeRef}
    data-testid="secondary-disclosure"
    data-guide-target="today-telemetry"
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-0 flex w-full items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-panel px-4 py-2.5 text-left transition-colors duration-150 hover:bg-surface-elevated"
    >
      <span className="flex items-center gap-2">
        <BarChart3 className="size-3.5 text-text-secondary" aria-hidden="true" />
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Telemetry
        </span>
      </span>
      <span className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary">
        {open ? 'Hide' : 'Inspect'}
        {open ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
      </span>
    </button>

    {open ? (
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel className="p-4">
          <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <AlertCircle className="size-3.5 text-text-tertiary" aria-hidden="true" />
            Skill Status
          </h3>
          <div className="mt-2 space-y-1.5">
            {Object.values(skillStates).slice(0, 4).map((sk) => (
              <div key={sk.topicId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-text-primary">{sk.topicId.replace('topic-', '')}</span>
                <MonoChip micro tone={FRESHNESS_TONE[sk.freshness] ?? 'neutral'}>{sk.freshness}</MonoChip>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <Building2 className="size-3.5 text-text-tertiary" aria-hidden="true" />
            Target Companies
          </h3>
          <div className="mt-2 space-y-1.5">
            {companyOverlays.slice(0, 3).map((comp) => (
              <div key={comp.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-text-primary">{comp.companyName}</span>
                <span className="font-mono text-[11px] text-text-tertiary">{comp.eventDate ?? 'no date'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            Engine metadata
          </h3>
          <dl className="mt-2 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-tertiary">mode</dt>
              <dd className="text-text-secondary">{mode}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-tertiary">candidates evaluated</dt>
              <dd className="text-text-secondary">{candidateCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-tertiary">sections revealed</dt>
              <dd className="text-text-secondary">{revealedSectionCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-tertiary">scroll observer</dt>
              <dd className="text-text-secondary">{observerActive ? 'active' : 'fallback'}</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="flex flex-col gap-2 p-4">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            Full records
          </h3>
          <TodayButton variant="tonal" onClick={() => onRoute('analytics')}>
            Open Analytics
          </TodayButton>
          <TodayButton variant="tonal" onClick={() => onRoute('settings')}>
            <Settings className="size-3.5" aria-hidden="true" />
            Open Settings
          </TodayButton>
        </Panel>
      </div>
    ) : null}
  </TodaySection>
);
