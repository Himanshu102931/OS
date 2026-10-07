import React, { useState, useMemo } from 'react';
import type { CompanyOverlay } from '../../types';
import type { CompanyPreparationSnapshot, CompanyRequirementMapping } from '../../engine/companyEngine';
import { Button } from '../ui/button';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Layers,
  Code,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

interface CompanyRequirementMatrixProps {
  company: CompanyOverlay;
  snapshot: CompanyPreparationSnapshot | undefined;
  onSelectRequirement: (requirement: CompanyRequirementMapping) => void;
}

type RequirementCategoryFilter = 'all' | 'domain' | 'topic' | 'language';

export const CompanyRequirementMatrix: React.FC<CompanyRequirementMatrixProps> = ({
  company,
  snapshot,
  onSelectRequirement,
}) => {
  const [activeCategory, setActiveCategory] = useState<RequirementCategoryFilter>('all');

  const requirements = useMemo(() => snapshot?.requirements ?? [], [snapshot]);

  const filteredRequirements = useMemo(() => {
    if (activeCategory === 'all') return requirements;
    return requirements.filter((r) => r.category === activeCategory);
  }, [requirements, activeCategory]);

  const counts = useMemo(() => {
    return {
      all: requirements.length,
      domain: requirements.filter((r) => r.category === 'domain').length,
      topic: requirements.filter((r) => r.category === 'topic').length,
      language: requirements.filter((r) => r.category === 'language').length,
    };
  }, [requirements]);

  const getStatusBadge = (status: CompanyRequirementMapping['status']) => {
    switch (status) {
      case 'covered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded">
            <ShieldCheck className="size-3" aria-hidden="true" /> Requirement Covered
          </span>
        );
      case 'evidence_present':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded">
            <TrendingUp className="size-3" aria-hidden="true" /> Evidence Present
          </span>
        );
      case 'developing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-info bg-info/10 border border-info/30 px-2 py-0.5 rounded">
            <TrendingUp className="size-3" aria-hidden="true" /> Developing
          </span>
        );
      case 'gap_identified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-danger bg-danger/10 border border-danger/30 px-2 py-0.5 rounded">
            <AlertTriangle className="size-3" aria-hidden="true" /> Gap Identified
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-foreground-muted bg-surface-elevated border border-border px-2 py-0.5 rounded">
            <HelpCircle className="size-3" aria-hidden="true" /> Not Configured
          </span>
        );
    }
  };

  const getCategoryIcon = (category: CompanyRequirementMapping['category']) => {
    switch (category) {
      case 'domain':
        return <Layers className="size-3.5 text-foreground-muted" aria-hidden="true" />;
      case 'language':
        return <Code className="size-3.5 text-accent" aria-hidden="true" />;
      case 'topic':
      default:
        return <BookOpen className="size-3.5 text-foreground-muted" aria-hidden="true" />;
    }
  };

  return (
    <section aria-label="Requirement Coverage Matrix" className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5">
      {/* Matrix Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground font-sans">
              {company.companyName} Requirements
            </h2>
            <span className="text-xs font-mono text-accent bg-surface-elevated px-2 py-0.5 rounded border border-border">
              {company.targetRole}
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Detailed breakdown of role requirements, evidence scores, and gap remediation triggers.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Requirement category filters">
          {(
            [
              { id: 'all', label: 'All Requirements', count: counts.all },
              { id: 'domain', label: 'Domains', count: counts.domain },
              { id: 'topic', label: 'Topics', count: counts.topic },
              { id: 'language', label: 'Languages', count: counts.language },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeCategory === tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-surface-elevated text-foreground border border-border font-bold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] text-foreground-muted font-normal">
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Requirement Ledger / Rows */}
      {filteredRequirements.length === 0 ? (
        <div className="p-8 text-center bg-surface-elevated border border-border rounded-lg space-y-2">
          <p className="text-xs text-foreground-muted font-medium">
            {requirements.length === 0
              ? 'No mapped requirements — this company has no required domains, topics or languages configured yet.'
              : `No requirements in the "${activeCategory}" category.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => {
            const isCovered = req.status === 'covered';
            return (
              <div
                key={req.requirementId}
                className="bg-surface-elevated border border-border rounded-lg p-4 transition-colors hover:border-border-active space-y-3"
              >
                {/* Top Row: Name, Category, Status & Level Progress */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded bg-background border border-border">
                      {getCategoryIcon(req.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground truncate font-sans">
                        {req.requirementName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase text-foreground-muted font-semibold">
                          {req.category}
                        </span>
                        <span className="text-foreground-muted text-[10px]">•</span>
                        <span className="text-[10px] font-mono text-foreground-muted">
                          {req.supportingEvidenceCount} Evidence {req.supportingEvidenceCount === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                    {getStatusBadge(req.status)}
                    <span className="text-xs font-mono font-bold text-foreground bg-background px-2.5 py-0.5 rounded border border-border">
                      Level {req.currentLevel} <span className="text-foreground-muted font-normal">/ {req.targetLevel}</span>
                    </span>
                  </div>
                </div>

                {/* Evidence Progress Meter & Gap Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-border/60 text-xs">
                  {/* Evidence Progress Bar (4 cols) */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-foreground-muted">Evidence Strength</span>
                      <span className="font-bold text-foreground">{req.evidenceStrength}%</span>
                    </div>
                    <div
                      className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-border"
                      role="progressbar"
                      aria-valuenow={req.evidenceStrength}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${req.requirementName} evidence strength`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          req.evidenceStrength >= 75
                            ? 'bg-success'
                            : req.evidenceStrength >= 40
                            ? 'bg-accent'
                            : 'bg-warning'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, req.evidenceStrength))}%` }}
                      />
                    </div>
                  </div>

                  {/* Gap Explanation (5 cols) */}
                  <div className="md:col-span-5 text-foreground-muted text-[11px] leading-relaxed truncate md:whitespace-normal">
                    {req.gapExplanation}
                  </div>

                  {/* Action Button (3 cols) */}
                  <div className="md:col-span-3 flex justify-end">
                    <Button
                      size="xs"
                      onClick={() => onSelectRequirement(req)}
                      className={`h-7 text-xs font-mono font-semibold rounded-md px-3 cursor-pointer ${
                        isCovered
                          ? 'border border-border bg-background text-foreground-muted hover:text-foreground'
                          : 'bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30'
                      }`}
                    >
                      {isCovered ? (
                        <>
                          <CheckCircle2 className="size-3 mr-1 text-success" aria-hidden="true" /> Inspect Trace
                        </>
                      ) : (
                        <>
                          <span>Close Gap</span>
                          <ArrowRight className="size-3 ml-1" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
