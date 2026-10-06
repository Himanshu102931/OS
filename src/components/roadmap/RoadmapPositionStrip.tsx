import React, { useMemo } from 'react';
import type { Phase } from '../../types';
import { Compass, Clock, Trophy, Target } from 'lucide-react';

export interface RoadmapPositionStripProps {
  activePhase: Phase;
  todayDate: string;
  totalTasksCount: number;
  completedTasksCount: number;
}

export const RoadmapPositionStrip: React.FC<RoadmapPositionStripProps> = ({
  activePhase,
  todayDate,
  totalTasksCount,
  completedTasksCount,
}) => {
  const temporalInfo = useMemo(() => {
    try {
      const [sy, sm, sd] = activePhase.startDate.split('-').map(Number);
      const [ey, em, ed] = activePhase.endDate.split('-').map(Number);
      const [ty, tm, td] = todayDate.split('-').map(Number);

      const start = new Date(Date.UTC(sy, sm - 1, sd));
      const end = new Date(Date.UTC(ey, em - 1, ed));
      const today = new Date(Date.UTC(ty, tm - 1, td));

      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const elapsedDays = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (today < start) {
        const daysUntil = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { label: `Starts in ${daysUntil}d`, isCurrent: false };
      }
      if (today > end) {
        return { label: `Window concluded (${activePhase.endDate})`, isCurrent: false };
      }
      const remainingDays = Math.max(0, totalDays - elapsedDays);
      return {
        label: `Day ${elapsedDays} of ${totalDays} · ${remainingDays}d remaining`,
        isCurrent: true,
      };
    } catch {
      return { label: activePhase.startDate, isCurrent: true };
    }
  }, [activePhase, todayDate]);

  const macroPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div
      className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/60 text-xs flex flex-wrap items-center justify-between gap-3"
      data-testid="roadmap-position-strip"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Active Operational Phase */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border-active)] font-mono text-[11px] font-semibold text-[var(--accent)]"
          title="Current operational focus phase"
        >
          <Compass className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>Active: {activePhase.name.split(':')[0]}</span>
        </span>

        {/* Temporal Progress in Active Phase */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[11px] text-[var(--foreground-muted)]"
          title="Calendar position in active phase"
        >
          <Clock className="size-3.5 text-[var(--foreground-subtle)]" aria-hidden="true" />
          <span>{temporalInfo.label}</span>
        </span>

        {/* Overall Curriculum Completion */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[11px] text-[var(--foreground-muted)]"
          title="Total tasks completed across all 4 phases"
        >
          <Trophy className="size-3.5 text-[var(--foreground-subtle)]" aria-hidden="true" />
          <span>
            {completedTasksCount}/{totalTasksCount} Total Tasks ({macroPercent}%)
          </span>
        </span>
      </div>

      {/* Target Drive Season Destination */}
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--foreground-subtle)]">
        <Target className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
        <span>Drive Season: Apr – May 2027 (Phase 4)</span>
      </div>
    </div>
  );
};
