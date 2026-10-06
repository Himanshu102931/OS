import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Compass, Calendar } from 'lucide-react';

export interface RoadmapHeaderProps {
  totalPhases: number;
  totalModules: number;
  startDate?: string;
  endDate?: string;
}

export const RoadmapHeader: React.FC<RoadmapHeaderProps> = ({
  totalPhases,
  totalModules,
  startDate = 'Sep 01, 2026',
  endDate = 'May 31, 2027',
}) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]"
      data-testid="roadmap-header"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase font-semibold text-[var(--accent)] tracking-wider">
            <Compass className="size-3" aria-hidden="true" />
            Curriculum Architecture
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
            <Calendar className="size-3" aria-hidden="true" />
            {startDate} → {endDate}
          </span>
          <span className="font-mono text-[10px] text-[var(--foreground-subtle)] hidden md:inline">
            • {totalPhases} Progressive Phases • {totalModules} Modules
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Master Roadmap & Trajectory
        </h1>
        <p className="text-xs text-[var(--foreground-muted)] mt-1 max-w-2xl leading-relaxed">
          Systematic 9-month placement curriculum tracking your active trajectory from core computer science foundations through final campus recruitment drives.
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
        <GuideTrigger route="roadmap" />
      </div>
    </div>
  );
};
