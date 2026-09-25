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

const iconMap: Record<string, React.FC<{ className?: string }>> = {
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
              return <ShieldCheck className="size-3.5 text-[#4EAE79]" />;
            case 'on_track':
              return <TrendingUp className="size-3.5 text-[#FFC665]" />;
            case 'at_risk':
              return <AlertTriangle className="size-3.5 text-[#E55353]" />;
            case 'needs_baseline':
            default:
              return <HelpCircle className="size-3.5 text-[#8E98A8]" />;
          }
        };

        return (
          <button
            key={dom.domainId}
            onClick={() => onSelectDomain(isSelected ? 'all' : dom.domainId)}
            className={`p-3.5 text-left rounded-[4px] border transition-all duration-150 space-y-2.5 ${
              isSelected
                ? 'bg-[#1B2028] border-[#E5A93C] ring-1 ring-[#E5A93C]/30 shadow-lg'
                : 'bg-[#14171D] border-[#262D38] hover:border-[#3B4556] hover:bg-[#1B2028]/60'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#FFC665]">
                  <Icon className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F1F5F9] font-mono leading-none">
                    {dom.shortName}
                  </h3>
                  <span className="text-[10px] text-[#8E98A8] font-mono block mt-0.5">
                    {dom.topicsCount} Topics
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono">
                {getStatusIcon()}
                <span className="text-xs font-bold text-[#F1F5F9]">{dom.overallReadiness}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#1B2028] rounded-full overflow-hidden border border-[#262D38]">
              <div
                className={`h-full transition-all duration-300 ${
                  dom.overallReadiness >= 75
                    ? 'bg-[#4EAE79]'
                    : dom.overallReadiness >= 50
                    ? 'bg-[#FFC665]'
                    : 'bg-[#E55353]'
                }`}
                style={{ width: `${Math.max(4, dom.overallReadiness)}%` }}
              />
            </div>

            {/* Topic Breakdown Badges */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8E98A8] pt-1 border-t border-[#262D38]/60">
              <span className="text-[#4EAE79] font-medium">{dom.readyTopicsCount} Ready</span>
              <span className="text-[#E55353] font-medium">{dom.atRiskTopicsCount} At Risk</span>
              <span className="text-[#8E98A8]">{dom.totalEvidenceItems} Evidences</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
