import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { ShieldCheck } from 'lucide-react';

interface SkillsHeaderProps {
  viewMode: 'matrix' | 'domains';
  onViewModeChange: (mode: 'matrix' | 'domains') => void;
}

export const SkillsHeader: React.FC<SkillsHeaderProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[4px] bg-[var(--action-accent-skills-subtle)] border border-[var(--action-accent-skills-border)] text-[var(--action-accent-skills)]">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Skills Matrix & Evidence Readiness
          </h1>
        </div>
        <p className="text-xs text-foreground-muted">
          Authoritative topic evidence strength calculated from completed tasks, DSA attempts, and freshness decay.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <GuideTrigger route="skills" />
        <div
          role="tablist"
          aria-label="Skills view layout modes"
          className="flex items-center gap-1.5 bg-surface p-1 border border-border rounded-lg"
        >
          <button
            role="tab"
            aria-selected={viewMode === 'matrix'}
            onClick={() => onViewModeChange('matrix')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--action-accent-skills)] ${
              viewMode === 'matrix'
                ? 'bg-surface-elevated text-foreground border border-border shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Matrix Ledger
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'domains'}
            onClick={() => onViewModeChange('domains')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--action-accent-skills)] ${
              viewMode === 'domains'
                ? 'bg-surface-elevated text-foreground border border-border shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Domain Radar
          </button>
        </div>
      </div>
    </header>
  );
};
