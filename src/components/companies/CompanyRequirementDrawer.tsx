import React, { useEffect, useRef } from 'react';
import type { CompanyRequirementMapping } from '../../engine/companyEngine';
import type {
  DSAProblem,
  TaskDefinition,
  Topic,
  PreparationTopic,
  PracticeSessionDefinition,
} from '../../types';
import { validateCompanyRecommendedAction } from '../../engine/companyPlanEngine';
import { buildCompanyGapTrace } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { Button } from '../ui/button';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';

interface CompanyRequirementDrawerProps {
  requirement: CompanyRequirementMapping | null;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  datasets: {
    dsaProblems: DSAProblem[];
    tasks: TaskDefinition[];
    topics: Topic[];
    preparationTopics: PreparationTopic[];
    practiceSessions: PracticeSessionDefinition[];
  };
  onExecuteAction: (route: string, targetId?: string) => void;
}

export const CompanyRequirementDrawer: React.FC<CompanyRequirementDrawerProps> = ({
  requirement,
  companyName,
  isOpen,
  onClose,
  datasets,
  onExecuteAction,
}) => {
  const catalog = useEvidenceCatalog();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Escape key handler and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !requirement) return null;

  const requirementTrace = buildCompanyGapTrace(requirement, catalog);

  const actionCheck = validateCompanyRecommendedAction(requirement.recommendedAction, datasets);

  const handleActionClick = () => {
    if (!actionCheck.navigable) return;
    onClose();
    onExecuteAction(actionCheck.route, actionCheck.targetId);
  };

  const getStatusBadge = () => {
    switch (requirement.status) {
      case 'covered':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-success bg-success/10 border border-success/30 px-2.5 py-1 rounded">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Requirement Covered
          </span>
        );
      case 'evidence_present':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded">
            <TrendingUp className="size-3.5" aria-hidden="true" /> Evidence Present
          </span>
        );
      case 'developing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-info bg-info/10 border border-info/30 px-2.5 py-1 rounded">
            <TrendingUp className="size-3.5" aria-hidden="true" /> Developing
          </span>
        );
      case 'gap_identified':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-danger bg-danger/10 border border-danger/30 px-2.5 py-1 rounded">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> Gap Identified
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-foreground-muted bg-surface-elevated border border-border px-2.5 py-1 rounded">
            <HelpCircle className="size-3.5" aria-hidden="true" /> Not Configured
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end"
      aria-labelledby="drawer-requirement-title"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="company-drawer-slide w-full max-w-xl sm:max-w-2xl bg-surface border-l border-border h-full flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3 bg-surface-elevated">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-accent">
              <span>COMPANY REQUIREMENT TRACEABILITY</span>
              <span>•</span>
              <span className="font-bold text-foreground">{companyName}</span>
            </div>
            <h2 id="drawer-requirement-title" className="text-xl font-bold text-foreground font-sans">
              {requirement.requirementName}
            </h2>
            <div className="flex items-center gap-2 pt-1">
              {getStatusBadge()}
              <span className="text-[11px] font-mono text-foreground-muted border border-border bg-surface px-2 py-0.5 rounded uppercase font-semibold">
                {requirement.category}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close requirement detail"
            className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-surface-elevated border border-border rounded-lg text-xs">
            <div>
              <span className="text-foreground-muted font-mono text-[10px] block uppercase">Evidence Strength</span>
              <span className="text-lg font-bold font-mono text-foreground">{requirement.evidenceStrength}%</span>
            </div>

            <div>
              <span className="text-foreground-muted font-mono text-[10px] block uppercase">Level Progress</span>
              <span className="text-lg font-bold font-mono text-accent">
                Level {requirement.currentLevel} <span className="text-foreground-muted text-xs font-normal">/ {requirement.targetLevel}</span>
              </span>
            </div>

            <div>
              <span className="text-foreground-muted font-mono text-[10px] block uppercase">Evidence Proof</span>
              <span
                className={`text-xs font-mono font-bold capitalize block mt-1 ${
                  requirement.evidenceClassification === 'demonstrated'
                    ? 'text-success'
                    : requirement.evidenceClassification === 'inferred'
                    ? 'text-info'
                    : 'text-foreground-muted'
                }`}
              >
                {requirement.evidenceClassification}
              </span>
            </div>
          </div>

          {/* Causal Evidence Trace */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
              <HelpCircle className="size-3.5 text-accent" aria-hidden="true" /> Supporting Evidence
            </h3>
            <div className="p-3 bg-surface-elevated border border-border rounded-lg text-xs space-y-2">
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Mapped from underlying curriculum evidence records, DSA attempt logs, and roadmap task completions for this required competency.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-border">
                <span className="text-foreground-muted">Supporting Evidence Logs:</span>
                <span className="font-bold text-foreground">{requirement.supportingEvidenceCount} items recorded</span>
              </div>
            </div>

            <EvidenceTracePanel
              trace={requirementTrace}
              catalog={catalog}
              idPrefix={`req-${requirement.requirementId}`}
              title="Evidence trace & causal links"
              defaultOpen={true}
            />
          </div>

          {/* Gap Analysis */}
          <div className="p-4 bg-surface-elevated border border-border rounded-lg space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Target className="size-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider font-mono">
                  Deficit Gap Analysis
                </span>
                <p className="text-foreground-muted mt-1 leading-relaxed text-xs">{requirement.gapExplanation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-surface-elevated border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-foreground-muted">Recommended Action: </span>
            <span className="font-mono font-bold text-accent">{requirement.recommendedAction.label}</span>
            {!actionCheck.navigable && (
              <span className="block text-[11px] text-foreground-muted mt-0.5" data-testid="company-action-unavailable">
                {actionCheck.reason}
              </span>
            )}
          </div>

          {actionCheck.navigable ? (
            <Button
              size="sm"
              onClick={handleActionClick}
              data-testid="company-action-execute"
              className="text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-md px-4 cursor-pointer"
            >
              Execute Preparation Action <ArrowRight className="size-3.5 ml-1.5" aria-hidden="true" />
            </Button>
          ) : (
            <span className="text-xs font-mono text-foreground-muted border border-border bg-surface px-3 py-1.5 rounded-md text-center">
              No linked workspace
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
