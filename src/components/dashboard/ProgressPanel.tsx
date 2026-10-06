import React from 'react';
import { CalendarRange, Target, Layers, CalendarCheck, ArrowRight, Radar } from 'lucide-react';
import { TodaySection, SectionHeading, Panel, MeterBar, TodayButton } from './todayPrimitives';
import type { AnalyticsSummary } from '../../engine/analyticsEngine';
import type { Phase } from '../../types';

export interface ProgressPanelProps {
  revealed: boolean;
  observeRef: (el: HTMLElement | null) => void;

  /** Verbatim local computation (§8) — never re-derived here. */
  progressPercent: number;
  completedCount: number;
  totalTasks: number;

  /** Canonical analytics outputs only (§8). */
  analyticsTelemetry: AnalyticsSummary;
  activePhase: Phase;

  onRoute: (route: 'interview' | 'skills' | 'analytics') => void;
}

interface CellProps {
  icon: React.ReactElement;
  label: string;
  children: React.ReactNode;
}

const Cell: React.FC<CellProps> = ({ icon, label, children }) => (
  <div className="min-w-0 border-t border-border-default pt-3">
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
      <span className="text-text-secondary" aria-hidden="true">{icon}</span>
      {label}
    </div>
    <div className="mt-1.5">{children}</div>
  </div>
);

/**
 * §8 — Progress Panel: four canonical metric cells + a link row. Roadmap,
 * phase, Leitner/consistency only. No daily completion percentage, no
 * readiness aggregate, no second formula (tests `T-NEW-4` / `T-NEW-5`).
 */
export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  revealed, observeRef,
  progressPercent, completedCount, totalTasks,
  analyticsTelemetry, activePhase,
  onRoute,
}) => {
  const { activity, quality, progress } = analyticsTelemetry;
  const box = quality.boxDistribution;

  return (
    <TodaySection
      section="progress"
      mobileOrder={7}
      revealId="progress"
      revealed={revealed}
      observeRef={observeRef}
      data-testid="progress-panel"
    >
      <SectionHeading right={<span className="font-mono text-[11px] text-text-tertiary">canonical outputs</span>}>
        Progress
      </SectionHeading>

      <Panel className="mt-3 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Cell icon={<Target className="size-3.5" />} label="Roadmap">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-lg font-semibold text-text-primary">{progressPercent}%</span>
              <span className="font-mono text-[11px] text-text-tertiary">{completedCount} / {totalTasks}</span>
            </div>
            <MeterBar value={progressPercent} className="mt-2" aria-hidden />
            <p className="mt-1.5 text-[11px] text-text-tertiary">
              {completedCount} of {totalTasks} roadmap tasks completed
            </p>
          </Cell>

          <Cell icon={<CalendarRange className="size-3.5" />} label="Phase">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-lg font-semibold text-text-primary">
                {Math.round(progress.activePhaseCompletionRate)}%
              </span>
              <span className="font-mono text-[11px] text-text-tertiary">active phase</span>
            </div>
            <MeterBar value={progress.activePhaseCompletionRate} className="mt-2" aria-hidden />
            <p className="mt-1.5 truncate text-[11px] text-text-tertiary">{activePhase.name}</p>
          </Cell>

          <Cell icon={<Layers className="size-3.5" />} label="Leitner">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-sm text-text-primary">
              <span>B1 {box[1]}</span>
              <span>B2 {box[2]}</span>
              <span>B3 {box[3]}</span>
              <span>B4 {box[4]}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-text-tertiary">
              retention {Math.round(quality.reviewRetentionRate)}%
            </p>
          </Cell>

          <Cell icon={<CalendarCheck className="size-3.5" />} label="Consistency">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-lg font-semibold text-text-primary">
                {activity.sealedDaysCount}/{activity.totalDaysInWindow}
              </span>
              <span className="font-mono text-[11px] text-text-tertiary">days sealed</span>
            </div>
            <MeterBar value={activity.consistencyRate} className="mt-2" aria-hidden />
            <p className="mt-1.5 text-[11px] text-text-tertiary">
              {Math.round(activity.consistencyRate)}% of the window sealed
            </p>
          </Cell>
        </div>

        {/* Link row — canonical surfaces are opened, never recomputed here. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-default pt-3">
          <TodayButton variant="ghost" onClick={() => onRoute('interview')}>
            <Radar className="size-3.5" aria-hidden="true" />
            Open Interview Readiness
            <ArrowRight className="size-3" aria-hidden="true" />
          </TodayButton>
          <TodayButton variant="ghost" onClick={() => onRoute('skills')}>
            Open Skills
            <ArrowRight className="size-3" aria-hidden="true" />
          </TodayButton>
          <TodayButton variant="ghost" onClick={() => onRoute('analytics')}>
            Open Analytics
            <ArrowRight className="size-3" aria-hidden="true" />
          </TodayButton>
        </div>
      </Panel>
    </TodaySection>
  );
};
