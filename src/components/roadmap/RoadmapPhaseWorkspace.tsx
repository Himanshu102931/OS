import React from 'react';
import type { Phase, DomainDefinition } from '../../types';
import { Eye, CornerUpLeft, Calendar, Filter, X } from 'lucide-react';

interface RoadmapPhaseWorkspaceProps {
  selectedPhase: Phase;
  activePhase: Phase;
  isSelectedActive: boolean;
  phaseProgressPercent: number;
  completedTasksCount: number;
  totalTasksCount: number;
  domains: DomainDefinition[];
  filterDomain: string;
  onSelectFilterDomain: (domainId: string) => void;
  onResetFilter: () => void;
  onReturnToActivePhase: () => void;
  availableDomainIds: string[];
}

function formatPhaseDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sM = monthNames[start.getUTCMonth()];
    const sD = String(start.getUTCDate()).padStart(2, '0');
    const eM = monthNames[end.getUTCMonth()];
    const eD = String(end.getUTCDate()).padStart(2, '0');
    const year = end.getUTCFullYear();
    return `${sM} ${sD} – ${eM} ${eD}, ${year}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

export const RoadmapPhaseWorkspace: React.FC<RoadmapPhaseWorkspaceProps> = ({
  selectedPhase,
  activePhase,
  isSelectedActive,
  phaseProgressPercent,
  completedTasksCount,
  totalTasksCount,
  domains,
  filterDomain,
  onSelectFilterDomain,
  onResetFilter,
  onReturnToActivePhase,
  availableDomainIds,
}) => {
  const hasActiveFilters = filterDomain !== 'all';
  const dateRangeStr = formatPhaseDateRange(selectedPhase.startDate, selectedPhase.endDate);

  // Filter available domains present in the current phase for quick chips
  const phaseDomains = domains.filter((d) => availableDomainIds.includes(d.id));

  return (
    <div className="space-y-4" data-testid="phase-workspace-controller">
      {/* Inspection Context Banner (Displayed when inspecting a non-active phase) */}
      {!isSelectedActive && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-[var(--border-active)] bg-[var(--surface-elevated)] text-xs transition-all shadow-sm"
          data-testid="roadmap-inspection-banner"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
              <Eye className="size-4" aria-hidden="true" />
            </div>
            <div>
              <span className="font-semibold text-[var(--foreground)]">
                Inspecting Phase {selectedPhase.order}: {selectedPhase.name}
              </span>
              <span className="text-[var(--foreground-muted)] block sm:inline sm:ml-2">
                Active operational phase is <strong className="text-[var(--accent)] font-semibold">{activePhase.name.split(':')[0]}</strong>.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onReturnToActivePhase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold text-xs transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
            data-testid="return-to-active-phase"
          >
            <CornerUpLeft className="size-3.5" aria-hidden="true" />
            <span>Return to Active Phase</span>
          </button>
        </div>
      )}

      {/* Inspected Phase Summary Header (Forest-Green Tokens & Semantic Status) */}
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4 shadow-sm"
        data-testid="phase-summary-header"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider font-mono px-2 py-0.5 rounded border ${
                  isSelectedActive
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
                    : 'text-[var(--foreground-muted)] bg-[var(--surface-muted)] border-[var(--border)]'
                }`}
              >
                {isSelectedActive ? 'Active Operational Phase' : 'Inspected Phase Milestone'}
              </span>
              <span className="text-[11px] font-mono text-[var(--foreground-subtle)] flex items-center gap-1">
                <Calendar className="size-3 text-[var(--accent)]" aria-hidden="true" />
                {dateRangeStr}
              </span>
            </div>

            <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              {selectedPhase.name}
            </h2>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              {selectedPhase.description}
            </p>
          </div>

          <div className="md:text-right shrink-0 bg-[var(--surface-muted)] md:bg-transparent p-3 md:p-0 rounded-lg border md:border-0 border-[var(--border)]">
            <div className="flex items-baseline md:justify-end gap-1.5">
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {phaseProgressPercent}%
              </span>
              <span className="text-xs text-[var(--foreground-subtle)] font-mono">complete</span>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] font-mono mt-0.5">
              {completedTasksCount} of {totalTasksCount} tasks completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full bg-[var(--surface-muted)] rounded-full h-2 overflow-hidden border border-[var(--border)]"
          role="progressbar"
          aria-valuenow={phaseProgressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${selectedPhase.name} task progress`}
        >
          <div
            className="bg-[var(--primary)] h-full transition-all duration-500 rounded-full phase-progress-bar"
            style={{ width: `${phaseProgressPercent}%` }}
          />
        </div>

        {/* Domain Filter Bar with Quick Chips & Select Fallback */}
        <div
          className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3"
          data-testid="domain-filter-bar"
        >
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[var(--foreground-muted)] font-medium flex items-center gap-1 mr-1">
              <Filter className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
              <span>Domain:</span>
            </span>

            {/* Quick Filter Chips */}
            <button
              type="button"
              onClick={() => onSelectFilterDomain('all')}
              data-testid="domain-filter-chip-all"
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filterDomain === 'all'
                  ? 'bg-[var(--surface-elevated)] border-[var(--border-active)] text-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-active)]'
              } focus-visible:ring-2 focus-visible:ring-[var(--focus)]`}
            >
              All Domains
            </button>

            {phaseDomains.map((d) => {
              const isSelected = filterDomain === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectFilterDomain(d.id)}
                  data-testid={`domain-filter-chip-${d.id}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--surface-elevated)] border-[var(--border-active)] text-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-active)]'
                  } focus-visible:ring-2 focus-visible:ring-[var(--focus)]`}
                >
                  {d.name}
                </button>
              );
            })}

            {/* Accessible Select Element (Ensures keyboard navigation and select-based test compatibility) */}
            <div className="inline-block ml-1">
              <select
                aria-label="Filter by domain"
                value={filterDomain}
                onChange={(e) => onSelectFilterDomain(e.target.value)}
                data-testid="domain-filter-select"
                className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
              >
                <option value="all">All Domains ({domains.length})</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilter}
              data-testid="clear-domain-filter"
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded px-1 py-0.5 cursor-pointer"
            >
              <X className="size-3" aria-hidden="true" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
