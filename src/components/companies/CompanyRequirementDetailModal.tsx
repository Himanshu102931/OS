import React from 'react';
import type { CompanyRequirementMapping } from '../../engine/companyEngine';
import { usePlacement } from '../../context/PlacementContext';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';

interface CompanyRequirementDetailModalProps {
  requirement: CompanyRequirementMapping | null;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyRequirementDetailModal: React.FC<CompanyRequirementDetailModalProps> = ({
  requirement,
  companyName,
  isOpen,
  onClose,
}) => {
  const { setRoute } = usePlacement();

  if (!isOpen || !requirement) return null;

  const handleActionClick = () => {
    onClose();
    if (requirement.recommendedAction.route === 'dsa') {
      setRoute('dsa');
    } else if (requirement.recommendedAction.route === 'roadmap') {
      setRoute('roadmap');
    } else if (requirement.recommendedAction.route === 'skills') {
      setRoute('skills');
    }
  };

  const getStatusBadge = () => {
    switch (requirement.status) {
      case 'covered':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#4EAE79] bg-[#4EAE79]/10 border border-[#4EAE79]/30 px-2.5 py-1 rounded-[4px]">
            <ShieldCheck className="size-3.5" /> Requirement Covered
          </span>
        );
      case 'evidence_present':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#FFC665] bg-[#FFC665]/10 border border-[#FFC665]/30 px-2.5 py-1 rounded-[4px]">
            <TrendingUp className="size-3.5" /> Evidence Present
          </span>
        );
      case 'developing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-2.5 py-1 rounded-[4px]">
            <TrendingUp className="size-3.5" /> Developing
          </span>
        );
      case 'gap_identified':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-400 bg-rose-950/20 border border-rose-800/40 px-2.5 py-1 rounded-[4px]">
            <AlertTriangle className="size-3.5" /> Gap Identified
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#8E98A8] bg-[#1B2028] border border-[#262D38] px-2.5 py-1 rounded-[4px]">
            <HelpCircle className="size-3.5" /> Not Configured
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#262D38] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#FFC665]">
              <span>COMPANY REQUIREMENT TRACEABILITY</span>
              <span>•</span>
              <span>{companyName}</span>
            </div>
            <h2 className="text-lg font-bold text-[#F1F5F9] mt-0.5">{requirement.requirementName}</h2>
            <div className="flex items-center gap-2 pt-1.5">
              {getStatusBadge()}
              <span className="text-[11px] text-[#8E98A8] border border-[#262D38] bg-[#1B2028] px-2 py-0.5 rounded-[4px] uppercase font-bold">
                {requirement.category}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] text-xs">
          <div>
            <span className="text-[#8E98A8] text-[10px] block">Evidence Strength</span>
            <span className="text-lg font-bold text-[#F1F5F9]">{requirement.evidenceStrength}%</span>
          </div>

          <div>
            <span className="text-[#8E98A8] text-[10px] block">Level Progress</span>
            <span className="text-lg font-bold text-[#FFC665]">
              Level {requirement.currentLevel} <span className="text-[#8E98A8] text-xs font-normal">/ {requirement.targetLevel}</span>
            </span>
          </div>

          <div>
            <span className="text-[#8E98A8] text-[10px] block">Evidence Classification</span>
            <span
              className={`text-[11px] font-bold capitalize block mt-1 ${
                requirement.evidenceClassification === 'demonstrated'
                  ? 'text-[#4EAE79]'
                  : requirement.evidenceClassification === 'inferred'
                  ? 'text-[#3B82F6]'
                  : 'text-[#8E98A8]'
              }`}
            >
              {requirement.evidenceClassification}
            </span>
          </div>
        </div>

        {/* What Evidence Supports This? */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-[#FFC665]" /> What evidence supports this requirement?
          </h3>
          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] text-xs space-y-2">
            <p className="text-[#8E98A8] leading-relaxed text-[11px]">
              Mapped from underlying PlacementOS evidence records, DSA attempt logs, and roadmap task completions for this required domain or skill.
            </p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#262D38]">
              <span className="text-[#8E98A8]">Supporting Evidence Logs:</span>
              <span className="font-bold text-[#F1F5F9]">{requirement.supportingEvidenceCount} items recorded</span>
            </div>
          </div>
        </div>

        {/* Gap Explanation & Action */}
        <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-3 text-xs">
          <div className="flex items-start gap-2">
            <Target className="size-4 text-[#FFC665] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#F1F5F9] block text-[11px] uppercase tracking-wider">Gap Analysis</span>
              <p className="text-[#8E98A8] mt-1 leading-relaxed">{requirement.gapExplanation}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-[#8E98A8]">Recommended Next Action: </span>
              <span className="font-bold text-[#FFC665]">{requirement.recommendedAction.label}</span>
            </div>

            <Button
              size="sm"
              onClick={handleActionClick}
              className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold rounded-[4px] w-full sm:w-auto"
            >
              Execute Preparation Action <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
