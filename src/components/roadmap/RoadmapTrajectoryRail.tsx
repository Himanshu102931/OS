import React from 'react';
import type { Phase, TaskDefinition, TaskProgress } from '../../types';
import { Check, Lock, Sparkles, Layers } from 'lucide-react';

export interface RoadmapTrajectoryRailProps {
  phases: Phase[];
  activePhase: Phase;
  selectedPhaseId: string;
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  onSelectPhase: (phaseId: string) => void;
}

const PHASE_SHORT_NAMES: Record<string, string> = {
  'phase-1': 'Foundation & Baseline',
  'phase-2': 'Core CS Deep-Dive',
  'phase-3': 'Mock Drills & OAs',
  'phase-4': 'Placement Sprint',
};

const formatDateWindow = (start: string, end: string): string => {
  const formatSingle = (s: string) => {
    const [, m, d] = s.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${d}`;
  };
  const startYear = start.split('-')[0];
  const endYear = end.split('-')[0];
  if (startYear === endYear) {
    return `${formatSingle(start)} – ${formatSingle(end)}, ${startYear}`;
  }
  return `${formatSingle(start)}, ${startYear} – ${formatSingle(end)}, ${endYear}`;
};

export const RoadmapTrajectoryRail: React.FC<RoadmapTrajectoryRailProps> = ({
  phases,
  activePhase,
  selectedPhaseId,
  taskDefinitions,
  taskProgress,
  onSelectPhase,
}) => {
  return (
    <div className="space-y-2.5" data-testid="roadmap-trajectory-rail">
      {/* Rail Subtitle & Legend */}
      <div className="flex items-center justify-between text-xs text-[var(--foreground-subtle)] px-1">
        <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)] flex items-center gap-1.5">
          <Layers className="size-3 text-[var(--accent)]" aria-hidden="true" />
          Multi-Stage Placement Trajectory Rail
        </span>
        <div className="hidden sm:flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--accent)]" /> Active Focus
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--border-active)]" /> Inspected
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--foreground-subtle)] opacity-40" /> Upcoming
          </span>
        </div>
      </div>

      {/* Continuous Trajectory Traveler Motion Track */}
      <div className="relative py-1" aria-hidden="true">
        <div className="h-1 w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-full roadmap-trajectory-track relative">
          <div
            data-testid="roadmap-trajectory-traveler"
            className="roadmap-trajectory-traveler"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 4-Phase Trajectory Track */}
      <div
        className="overflow-x-auto pb-1"
        data-guide-target="roadmap-phases"
        role="tablist"
        aria-label="Placement Phases Trajectory"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {phases.map((ph) => {
            const isSelected = ph.id === selectedPhaseId;
            const isActive = ph.id === activePhase.id;
            const phTasks = taskDefinitions.filter((t) => t.phaseId === ph.id);
            const phDone = phTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
            const pct = phTasks.length > 0 ? Math.round((phDone / phTasks.length) * 100) : 0;
            const isCompleted = phTasks.length > 0 && phDone === phTasks.length;
            const shortName = PHASE_SHORT_NAMES[ph.id] || ph.name.split(':')[1]?.trim() || ph.name;

            return (
              <button
                key={ph.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-current={isActive ? 'step' : undefined}
                tabIndex={0}
                onClick={() => onSelectPhase(ph.id)}
                data-testid={`phase-node-${ph.id}`}
                className={`relative flex flex-col justify-between p-3.5 rounded-lg border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-elevated)] border-[var(--primary)] phase-active-pulse'
                    : isCompleted
                    ? 'bg-[var(--surface)] border-[var(--success)]/40 hover:bg-[var(--surface-elevated)]'
                    : isSelected
                    ? 'bg-[var(--surface-elevated)] border-[var(--border-active)]'
                    : 'bg-[var(--surface-muted)]/70 border-[var(--border)] hover:border-[var(--border-active)] hover:bg-[var(--surface-muted)]'
                }${isSelected && !isActive ? ' ring-1 ring-[var(--border-active)]' : ''}`}
              >
                {/* Node Header Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-semibold text-[var(--foreground-subtle)]">
                      STAGE 0{ph.order}
                    </span>

                    {/* Status Pill */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--accent)]">
                        <Sparkles className="size-2.5 text-[var(--accent)]" aria-hidden="true" />
                        Active Focus
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--success)]/15 border border-[var(--success)]/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--success)]">
                        <Check className="size-2.5" aria-hidden="true" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                        <Lock className="size-2.5 text-[var(--foreground-subtle)]" aria-hidden="true" />
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Phase Title */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-sm text-[var(--foreground)] line-clamp-1">
                        {shortName}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-[var(--foreground-muted)] line-clamp-1">
                      {formatDateWindow(ph.startDate, ph.endDate)}
                    </p>
                  </div>
                </div>

                {/* Progress Meter Bar */}
                <div className="mt-3.5 pt-2.5 border-t border-[var(--border)]/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[var(--foreground-subtle)]">
                      {phDone}/{phTasks.length} Tasks
                    </span>
                    <span
                      className={`font-semibold ${
                        isCompleted
                          ? 'text-[var(--success)]'
                          : isActive
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--foreground-muted)]'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Fill */}
                  <div
                    className="w-full bg-[var(--surface-canvas)] rounded-full h-1.5 overflow-hidden border border-[var(--border)]/60"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${ph.name} progress`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-[var(--success)]'
                          : isActive
                          ? 'bg-[var(--accent)]'
                          : 'bg-[var(--primary)]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Inspected Indicator Badge when selected but not active */}
                {isSelected && !isActive && (
                  <div className="mt-2 text-center">
                    <span className="inline-block w-full py-0.5 rounded bg-[var(--surface-canvas)] border border-[var(--border-active)] font-mono text-[9px] uppercase tracking-wider text-[var(--foreground-muted)] font-medium">
                      Inspecting Phase
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
