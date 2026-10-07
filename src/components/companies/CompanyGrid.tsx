import React, { useState, useMemo } from 'react';
import type { CompanyOverlay, DomainDefinition } from '../../types';
import type { CompanyPreparationSnapshot } from '../../engine/companyEngine';
import { calculateCompanyDeadlineUrgency } from '../../engine/companyPlanEngine';
import { Button } from '../ui/button';
import {
  Building2,
  Calendar,
  AlertCircle,
  ArrowRight,
  Trash2,
  Search,
  Plus,
  Edit2,
  Layers,
  Code,
  ShieldCheck,
} from 'lucide-react';

interface CompanyGridProps {
  companyOverlays: CompanyOverlay[];
  companySnapshotMap: Record<string, CompanyPreparationSnapshot>;
  domains: DomainDefinition[];
  todayDate: string;
  selectedCompanyId?: string | null;
  onSelectCompany: (company: CompanyOverlay) => void;
  onEditCompany: (company: CompanyOverlay) => void;
  onDeleteCompany: (companyId: string) => void;
  onAddCompany: () => void;
}

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'target', label: 'Target' },
  { id: 'applied', label: 'Applied' },
  { id: 'oa_scheduled', label: 'OA Scheduled' },
  { id: 'interview_scheduled', label: 'Interview Scheduled' },
  { id: 'offered', label: 'Offered' },
  { id: 'rejected', label: 'Archived' },
];

export const CompanyGrid: React.FC<CompanyGridProps> = ({
  companyOverlays,
  companySnapshotMap,
  domains,
  todayDate,
  selectedCompanyId,
  onSelectCompany,
  onEditCompany,
  onDeleteCompany,
  onAddCompany,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'readiness_desc' | 'readiness_asc' | 'name'>('urgency');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Map domain IDs to short names
  const domainMap = useMemo(() => {
    const map: Record<string, string> = {};
    domains.forEach((d) => {
      map[d.id] = d.shortName || d.name;
    });
    return map;
  }, [domains]);

  // Filter and sort companies
  const processedCompanies = useMemo(() => {
    return companyOverlays
      .filter((company) => {
        // Status filter
        if (statusFilter !== 'all' && company.applicationStatus !== statusFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = company.companyName.toLowerCase().includes(q);
          const matchRole = company.targetRole.toLowerCase().includes(q);
          const matchLang = (company.requiredLanguages || []).some((l) => l.toLowerCase().includes(q));
          if (!matchName && !matchRole && !matchLang) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const snapA = companySnapshotMap[a.id];
        const snapB = companySnapshotMap[b.id];
        const readinessA = snapA?.overallPreparationStrength ?? 0;
        const readinessB = snapB?.overallPreparationStrength ?? 0;

        switch (sortBy) {
          case 'readiness_desc':
            return readinessB - readinessA;
          case 'readiness_asc':
            return readinessA - readinessB;
          case 'name':
            return a.companyName.localeCompare(b.companyName);
          case 'urgency':
          default: {
            const urgA = calculateCompanyDeadlineUrgency(a.eventDate, todayDate);
            const urgB = calculateCompanyDeadlineUrgency(b.eventDate, todayDate);
            if (urgB.scoreBoost !== urgA.scoreBoost) {
              return urgB.scoreBoost - urgA.scoreBoost;
            }
            if (urgA.daysUntil !== null && urgB.daysUntil !== null) {
              return urgA.daysUntil - urgB.daysUntil;
            }
            if (urgA.daysUntil !== null) return -1;
            if (urgB.daysUntil !== null) return 1;
            return a.companyName.localeCompare(b.companyName);
          }
        }
      });
  }, [companyOverlays, statusFilter, searchQuery, sortBy, companySnapshotMap, todayDate]);

  const handleConfirmDelete = (companyId: string) => {
    onDeleteCompany(companyId);
    setPendingDeleteId(null);
  };

  if (companyOverlays.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl bg-surface px-6 py-12 text-center space-y-3">
        <Building2 className="size-8 text-foreground-muted mx-auto" aria-hidden="true" />
        <h2 className="text-base font-bold text-foreground">No target companies yet</h2>
        <p className="text-xs text-foreground-muted max-w-md mx-auto leading-relaxed">
          Add a company to map its assessment date, required domains, topics and languages
          against your live preparation evidence — so you can see the gaps that matter before
          you apply.
        </p>
        <Button
          size="sm"
          onClick={onAddCompany}
          className="text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-md h-9 px-4 cursor-pointer"
        >
          <Plus className="size-4 mr-1.5" aria-hidden="true" /> Add Company
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Target Companies Portfolio" className="space-y-4">
      {/* Portfolio Header & Filter / Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground font-sans">
            Target Companies Portfolio
          </h2>
          <span className="text-xs font-mono text-foreground-muted bg-surface-elevated px-2 py-0.5 rounded border border-border">
            {processedCompanies.length} of {companyOverlays.length}
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, roles..."
              aria-label="Search companies and roles"
              className="w-full bg-surface-elevated text-foreground text-xs pl-8 pr-2.5 py-1.5 rounded-md border border-border focus:outline-none focus:border-accent"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Filter companies by status">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                role="tab"
                type="button"
                aria-selected={statusFilter === opt.id}
                onClick={() => setStatusFilter(opt.id)}
                className={`text-[11px] font-mono px-2 py-1 rounded-md transition-colors cursor-pointer border ${
                  statusFilter === opt.id
                    ? 'bg-surface-elevated text-foreground border-border font-bold'
                    : 'text-foreground-muted hover:text-foreground border-transparent hover:bg-surface-elevated/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort By Toggle Buttons */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <span className="text-[10px] font-mono uppercase text-foreground-muted hidden xl:inline">Sort:</span>
            {(
              [
                { id: 'urgency', label: 'Urgency' },
                { id: 'readiness_desc', label: 'Readiness' },
                { id: 'name', label: 'Name' },
              ] as const
            ).map((sortOpt) => (
              <button
                key={sortOpt.id}
                type="button"
                onClick={() => setSortBy(sortOpt.id)}
                className={`text-[11px] font-mono px-2 py-1 rounded-md transition-colors cursor-pointer border ${
                  sortBy === sortOpt.id
                    ? 'bg-surface-elevated text-accent border-accent/40 font-bold'
                    : 'text-foreground-muted hover:text-foreground border-transparent hover:bg-surface-elevated/50'
                }`}
              >
                {sortOpt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Company Cards */}
      {processedCompanies.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-center space-y-2">
          <p className="text-xs text-foreground-muted">No target companies match your current search or filter criteria.</p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-xs border-border bg-surface-elevated text-foreground hover:text-foreground"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-in">
          {processedCompanies.map((company) => {
            const snapshot = companySnapshotMap[company.id];
            const overallPct = snapshot?.overallPreparationStrength ?? 0;
            const topGaps = snapshot?.topActionableGaps ?? [];
            const urgency = calculateCompanyDeadlineUrgency(company.eventDate, todayDate);
            const isFocused = selectedCompanyId === company.id;

            // Countdown tag text
            let countdownLabel = 'Not scheduled';
            if (urgency.daysUntil !== null) {
              if (urgency.daysUntil < 0) countdownLabel = `${Math.abs(urgency.daysUntil)}d overdue`;
              else if (urgency.daysUntil === 0) countdownLabel = 'Event today';
              else countdownLabel = `${urgency.daysUntil}d left`;
            }

            return (
              <div
                key={company.id}
                className={`bg-surface border rounded-xl p-5 space-y-4 transition-all duration-200 ${
                  isFocused
                    ? 'border-accent ring-1 ring-accent/30 shadow-md'
                    : 'border-border hover:border-border-active'
                }`}
              >
                {/* Header: Company Name, Role & Readiness % */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-accent shrink-0" aria-hidden="true" />
                      <h3 className="text-base font-bold text-foreground truncate font-sans">
                        {company.companyName}
                      </h3>
                    </div>
                    <p className="text-xs text-foreground-muted truncate">
                      Target Role: <strong className="text-foreground font-normal">{company.targetRole}</strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold font-mono text-foreground company-readiness">
                      {overallPct}%
                    </span>
                    <p className="text-[10px] text-foreground-muted font-mono uppercase">Readiness</p>
                  </div>
                </div>

                {/* Readiness Meter */}
                <div
                  className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-border/80"
                  role="progressbar"
                  aria-valuenow={overallPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${company.companyName} readiness meter`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      overallPct >= 75 ? 'bg-success' : overallPct >= 40 ? 'bg-accent' : 'bg-warning'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
                  />
                </div>

                {/* Event Date & Urgency Badge */}
                <div className="flex items-center justify-between gap-2 text-xs bg-surface-elevated p-2.5 rounded-lg border border-border">
                  <div className="flex items-center gap-1.5 text-foreground-muted truncate">
                    <Calendar className="size-3.5 text-accent shrink-0" aria-hidden="true" />
                    <span className="truncate">Date: <strong className="text-foreground font-mono">{company.eventDate || 'TBD'}</strong></span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 border ${
                      urgency.daysUntil !== null && urgency.daysUntil <= 7
                        ? 'bg-warning/15 text-warning border-warning/30'
                        : 'bg-surface text-foreground-muted border-border'
                    }`}
                  >
                    {countdownLabel}
                  </span>
                </div>

                {/* Required Domains & Languages Chips */}
                <div className="space-y-1.5 text-xs">
                  {/* Domains */}
                  {company.requiredDomains && company.requiredDomains.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Layers className="size-3 text-foreground-muted mr-0.5 shrink-0" aria-hidden="true" />
                      {company.requiredDomains.map((dId) => (
                        <span
                          key={dId}
                          className="text-[10px] font-mono bg-surface-elevated text-foreground-muted border border-border px-1.5 py-0.5 rounded"
                        >
                          {domainMap[dId] || dId}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Languages */}
                  {company.requiredLanguages && company.requiredLanguages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Code className="size-3 text-accent mr-0.5 shrink-0" aria-hidden="true" />
                      {company.requiredLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="text-[10px] font-mono uppercase bg-surface-elevated text-accent border border-accent/20 px-1.5 py-0.5 rounded"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top 2 Actionable Gaps */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <span className="text-[10px] font-mono font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="size-3 text-warning" aria-hidden="true" /> Top Preparation Gaps
                  </span>

                  {topGaps.length === 0 ? (
                    snapshot && snapshot.requirements.length === 0 ? (
                      <p className="text-[11px] text-foreground-muted font-medium">
                        No mapped requirements configured yet.
                      </p>
                    ) : (
                      <p className="text-[11px] text-success font-medium flex items-center gap-1 state-success">
                        <ShieldCheck className="size-3 text-success" aria-hidden="true" /> All requirements on track!
                      </p>
                    )
                  ) : (
                    <div className="space-y-1">
                      {topGaps.slice(0, 2).map((gap) => (
                        <div
                          key={gap.requirementId}
                          className="text-[11px] text-foreground bg-surface-elevated px-2.5 py-1 rounded border border-border flex items-center justify-between gap-2"
                        >
                          <span className="truncate font-sans">{gap.requirementName}</span>
                          <span className="text-[10px] font-mono text-warning shrink-0 capitalize">
                            {gap.statusLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                {pendingDeleteId === company.id ? (
                  <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-danger font-medium">
                      Delete {company.companyName}?
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setPendingDeleteId(null)}
                        className="h-7 text-xs border-border bg-surface-elevated text-foreground-muted hover:text-foreground rounded-md cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => handleConfirmDelete(company.id)}
                        className="h-7 text-xs bg-danger hover:bg-danger/90 text-white font-semibold rounded-md cursor-pointer"
                      >
                        Confirm Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company)}
                      className="text-xs text-accent hover:text-accent/80 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Inspect Requirements <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onEditCompany(company)}
                        className="h-7 text-xs border-border bg-surface-elevated text-foreground-muted hover:text-foreground rounded-md cursor-pointer"
                      >
                        <Edit2 className="size-3 mr-1" aria-hidden="true" /> Edit Company
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setPendingDeleteId(company.id)}
                        className="h-7 text-xs border-border bg-surface-elevated text-danger hover:text-danger rounded-md cursor-pointer"
                      >
                        <Trash2 className="size-3 mr-1" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
