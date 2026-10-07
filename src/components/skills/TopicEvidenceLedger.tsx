import type { TopicReadiness } from '../../engine/skillsEngine';
import type { DomainDefinition } from '../../types';
import { Search, ShieldCheck, TrendingUp, AlertTriangle, HelpCircle, ArrowRight, Sliders, Activity } from 'lucide-react';
import { Button } from '../ui/button';

interface TopicEvidenceLedgerProps {
  topics: TopicReadiness[];
  domains: DomainDefinition[];
  filterDomain: string;
  onFilterDomainChange: (domainId: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  filterFreshness: string;
  onFilterFreshnessChange: (freshness: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onOpenTraceability: (tr: TopicReadiness) => void;
  onOpenOverride: (tr: TopicReadiness) => void;
  onExecuteAction: (tr: TopicReadiness) => void;
}

export const TopicEvidenceLedger: React.FC<TopicEvidenceLedgerProps> = ({
  topics,
  domains,
  filterDomain,
  onFilterDomainChange,
  filterStatus,
  onFilterStatusChange,
  filterFreshness,
  onFilterFreshnessChange,
  searchQuery,
  onSearchQueryChange,
  onOpenTraceability,
  onOpenOverride,
  onExecuteAction,
}) => {
  const getStatusBadge = (status: TopicReadiness['readinessStatus']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--success,#4CAF78)] bg-[var(--success,#4CAF78)]/15 border border-[var(--success,#4CAF78)]/30 px-2 py-0.5 rounded-[4px]">
            <ShieldCheck className="size-3" aria-hidden="true" /> Ready
          </span>
        );
      case 'on_track':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--warning,#D19A45)] bg-[var(--warning,#D19A45)]/15 border border-[var(--warning,#D19A45)]/30 px-2 py-0.5 rounded-[4px]">
            <TrendingUp className="size-3" aria-hidden="true" /> On Track
          </span>
        );
      case 'at_risk':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--danger,#D05A52)] bg-[var(--danger,#D05A52)]/15 border border-[var(--danger,#D05A52)]/30 px-2 py-0.5 rounded-[4px]">
            <AlertTriangle className="size-3" aria-hidden="true" /> At Risk
          </span>
        );
      case 'needs_baseline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-foreground-muted bg-surface border border-border px-2 py-0.5 rounded-[4px]">
            <HelpCircle className="size-3" aria-hidden="true" /> Baseline Needed
          </span>
        );
    }
  };

  const getClassificationChip = (classification: TopicReadiness['evidenceClassification']) => {
    switch (classification) {
      case 'demonstrated':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[var(--success,#4CAF78)]/15 text-[var(--success,#4CAF78)] border border-[var(--success,#4CAF78)]/30 font-medium">
            Demonstrated
          </span>
        );
      case 'inferred':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[var(--action-accent-skills-subtle,#8b5cf61f)] text-[var(--action-accent-skills,#8B5CF6)] border border-[var(--action-accent-skills-border,#8b5cf659)] font-medium">
            Inferred
          </span>
        );
      case 'insufficient':
      default:
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-surface-muted text-foreground-muted border border-border font-medium">
            Insufficient
          </span>
        );
    }
  };

  const getFreshnessBadge = (freshness: TopicReadiness['freshness']) => {
    switch (freshness) {
      case 'fresh':
        return (
          <span className="text-[10px] font-mono text-[var(--success,#4CAF78)] capitalize">
            Fresh (≤7d)
          </span>
        );
      case 'aging':
        return (
          <span className="text-[10px] font-mono text-[var(--warning,#D19A45)] capitalize">
            Aging (8-14d)
          </span>
        );
      case 'stale':
        return (
          <span className="text-[10px] font-mono text-[var(--danger,#D05A52)] capitalize">
            Stale (&gt;14d)
          </span>
        );
      case 'untested':
      default:
        return (
          <span className="text-[10px] font-mono text-foreground-muted capitalize">
            Untested
          </span>
        );
    }
  };

  return (
    <section aria-label="Topic Evidence Ledger" className="space-y-4">
      {/* Multi-Factor Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 border border-border rounded-lg">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-3.5 text-foreground-muted absolute left-3 top-2.5" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search topic or domain..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-surface-elevated border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-secondary focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            aria-label="Filter by domain"
            value={filterDomain}
            onChange={(e) => onFilterDomainChange(e.target.value)}
            className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)]"
          >
            <option value="all">All Domains ({domains.length})</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            aria-label="Filter by readiness status"
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)]"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="needs_baseline">Needs Baseline</option>
          </select>

          <select
            aria-label="Filter by freshness"
            value={filterFreshness}
            onChange={(e) => onFilterFreshnessChange(e.target.value)}
            className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[var(--action-accent-skills,#8B5CF6)]"
          >
            <option value="all">All Freshness</option>
            <option value="fresh">Fresh</option>
            <option value="aging">Aging</option>
            <option value="stale">Stale</option>
            <option value="untested">Untested</option>
          </select>
        </div>
      </div>

      {/* Ledger Rows */}
      {topics.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-border rounded-lg text-xs font-mono text-foreground-muted space-y-1">
          <p>No topics match the selected filters.</p>
          <p className="text-[11px] text-secondary">Reset search query or filters to view competence records.</p>
        </div>
      ) : (
        <div className="space-y-3" role="table" aria-label="Topic Evidence Matrix">
          {topics.map((tr) => (
            <div
              key={tr.topicId}
              role="row"
              className="p-4 bg-surface hover:bg-surface-elevated/70 border border-border rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
            >
              {/* Left Column: Topic Metadata */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-foreground font-mono">{tr.topicName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border text-foreground-muted bg-surface-elevated">
                    {tr.domainName}
                  </span>
                  {getStatusBadge(tr.readinessStatus)}
                  {getClassificationChip(tr.evidenceClassification)}
                  <span className="text-[10px] font-mono text-foreground-muted">
                    Imp: {tr.importance}/10
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-foreground-muted pt-0.5">
                  <span>
                    Evidence: <strong className="text-foreground">{tr.evidenceStrength}%</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Level: <strong className="text-[var(--action-accent-skills,#8B5CF6)]">L{tr.currentLevel}</strong>
                    <span className="text-secondary font-normal"> / L{tr.targetLevel}</span>
                  </span>
                  <span>·</span>
                  <span>Freshness: {getFreshnessBadge(tr.freshness)}</span>
                  {tr.lastPracticedAt && (
                    <>
                      <span>·</span>
                      <span className="text-secondary">
                        Last Active: {tr.lastPracticedAt.slice(0, 10)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                <Button
                  size="xs"
                  onClick={() => onExecuteAction(tr)}
                  className="h-7 px-2.5 text-[11px] font-mono font-bold bg-[var(--action-accent-skills,#8B5CF6)] hover:bg-[var(--action-accent-skills-hover,#A78BFA)] text-white rounded-[4px] shadow-xs"
                >
                  <ArrowRight className="size-3 mr-1" aria-hidden="true" />
                  Prove Skill
                </Button>

                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onOpenTraceability(tr)}
                  className="h-7 px-2.5 text-[11px] font-mono border-border bg-surface-elevated text-foreground hover:bg-surface-muted rounded-[4px]"
                >
                  <Activity className="size-3 mr-1" aria-hidden="true" />
                  Trace Evidence
                </Button>

                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => onOpenOverride(tr)}
                  title="Self-attested rating override"
                  className="h-7 px-2 text-[11px] font-mono text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-[4px]"
                >
                  <Sliders className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
