import React from 'react';
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
} from 'lucide-react';

interface DomainSummaryCardsProps {
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

export const DomainSummaryCards: React.FC<DomainSummaryCardsProps> = ({
  domainReadinessList,
  selectedDomainId,
  onSelectDomain,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {domainReadinessList.map((dom) => {
        const Icon = iconMap[dom.iconName] || Code;
        const isSelected = selectedDomainId === dom.domainId;

        const getStatusIcon = () => {
          switch (dom.status) {
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
          <button
            key={dom.domainId}
            onClick={() => onSelectDomain(isSelected ? 'all' : dom.domainId)}
            className={`p-3.5 text-left rounded-lg border transition-all duration-150 space-y-2.5 ${
              isSelected
                ? 'bg-surface-elevated border-[var(--action-accent-skills,#8B5CF6)] ring-1 ring-[var(--action-accent-skills-ring,#C4B5FD)] shadow-md'
                : 'bg-surface border-border hover:border-border-active hover:bg-surface-elevated/60'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[4px] bg-surface-elevated border border-border text-[var(--action-accent-skills,#8B5CF6)]">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground font-mono leading-none">
                    {dom.domainName}
                  </h3>
                  <span className="text-[10px] text-foreground-muted font-mono block mt-0.5">
                    {dom.topicsCount} Topics
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono">
                {getStatusIcon()}
                <span className="text-xs font-bold text-foreground">{dom.overallReadiness}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border">
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
  );
};
