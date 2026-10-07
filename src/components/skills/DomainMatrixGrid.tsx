import React, { useState, useMemo } from 'react';
import type { DomainReadiness } from '../../engine/skillsEngine';
import {
  Code,
  FileCode,
  Database,
  Boxes,
  Server,
  Cpu,
  Network,
  Calculator,
  MessageSquare,
  Layout,
  Target,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  ArrowUpDown,
} from 'lucide-react';

interface DomainMatrixGridProps {
  domainReadinessList: DomainReadiness[];
  selectedDomainId: string;
  onSelectDomain: (domainId: string) => void;
}

const iconMap: Record<string, React.FC<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  Code,
  FileCode,
  Database,
  Boxes,
  Server,
  Cpu,
  Network,
  Calculator,
  MessageSquare,
  Layout,
  Target,
};

type SortKey = 'priority' | 'readiness_asc' | 'readiness_desc' | 'name';

export const DomainMatrixGrid: React.FC<DomainMatrixGridProps> = ({
  domainReadinessList,
  selectedDomainId,
  onSelectDomain,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('priority');

  const sortedList = useMemo(() => {
    const list = [...domainReadinessList];
    switch (sortBy) {
      case 'readiness_asc':
        return list.sort((a, b) => a.overallReadiness - b.overallReadiness);
      case 'readiness_desc':
        return list.sort((a, b) => b.overallReadiness - a.overallReadiness);
      case 'name':
        return list.sort((a, b) => a.domainName.localeCompare(b.domainName));
      case 'priority':
      default:
        // Priority: At Risk first, then On Track, then Ready; then lowest readiness
        return list.sort((a, b) => {
          const score = (status: string) => (status === 'at_risk' ? 0 : status === 'on_track' ? 1 : status === 'needs_baseline' ? 2 : 3);
          const diff = score(a.status) - score(b.status);
          if (diff !== 0) return diff;
          return a.overallReadiness - b.overallReadiness;
        });
    }
  }, [domainReadinessList, sortBy]);

  const getStatusIcon = (status: DomainReadiness['status']) => {
    switch (status) {
      case 'ready':
        return <ShieldCheck className="size-3.5 text-[var(--success,#4CAF78)]" aria-hidden="true" />;
      case 'on_track':
        return <TrendingUp className="size-3.5 text-[var(--warning,#D19A45)]" aria-hidden="true" />;
      case 'at_risk':
        return <AlertTriangle className="size-3.5 text-[var(--danger,#D05A52)]" aria-hidden="true" />;
      case 'needs_baseline':
      default:
        return <HelpCircle className="size-3.5 text-foreground-muted" aria-hidden="true" />;
    }
  };

  return (
    <section aria-label="11-Domain Competence Matrix" className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
            11-Domain Competence Radar
          </h2>
          <span className="text-xs text-foreground-muted">
            ({domainReadinessList.length} placement domains)
          </span>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs font-mono text-foreground-muted">
          <ArrowUpDown className="size-3 text-foreground-muted" aria-hidden="true" />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-surface-elevated border border-border rounded-[4px] px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)]"
          >
            <option value="priority">Gap Priority (At Risk First)</option>
            <option value="readiness_asc">Lowest Readiness</option>
            <option value="readiness_desc">Highest Readiness</option>
            <option value="name">Domain Name</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div
        role="tablist"
        aria-label="Filter matrix by domain"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {sortedList.map((dom) => {
          const Icon = iconMap[dom.iconName] || Code;
          const isSelected = selectedDomainId === dom.domainId;

          return (
            <button
              key={dom.domainId}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDomain(isSelected ? 'all' : dom.domainId)}
              className={`p-3.5 text-left rounded-lg border transition-all duration-150 space-y-2.5 focus-visible:ring-2 focus-visible:ring-[var(--action-accent-skills,#8B5CF6)] ${
                isSelected
                  ? 'bg-surface-elevated border-[var(--action-accent-skills,#8B5CF6)] ring-1 ring-[var(--action-accent-skills-ring,#C4B5FD)] shadow-md'
                  : 'bg-surface border-border hover:border-border-active hover:bg-surface-elevated/70'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-[4px] bg-surface-elevated border border-border text-[var(--action-accent-skills,#8B5CF6)] shrink-0">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground font-mono leading-none truncate">
                      {dom.domainName}
                    </h3>
                    <span className="text-[10px] text-foreground-muted font-mono block mt-0.5">
                      {dom.topicsCount} Topics
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono shrink-0">
                  {getStatusIcon(dom.status)}
                  <span className="text-xs font-bold text-foreground">{dom.overallReadiness}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                role="progressbar"
                aria-valuenow={dom.overallReadiness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${dom.domainName} readiness`}
                className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    dom.overallReadiness >= 75
                      ? 'bg-[var(--success,#4CAF78)]'
                      : dom.overallReadiness >= 50
                      ? 'bg-[var(--warning,#D19A45)]'
                      : 'bg-[var(--danger,#D05A52)]'
                  }`}
                  style={{ width: `${Math.max(4, dom.overallReadiness)}%` }}
                />
              </div>

              {/* Topic Breakdown Badges */}
              <div className="flex items-center justify-between text-[10px] font-mono text-foreground-muted pt-1 border-t border-border/60">
                <span className="text-[var(--success,#4CAF78)] font-medium">{dom.readyTopicsCount} Ready</span>
                <span className="text-[var(--danger,#D05A52)] font-medium">{dom.atRiskTopicsCount} At Risk</span>
                <span className="text-foreground-muted">{dom.totalEvidenceItems} Evidences</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
