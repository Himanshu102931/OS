import React from 'react';
import type { TopicReadiness } from '../../engine/skillsEngine';
import { usePlacement } from '../../context/PlacementContext';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Target,
  ArrowRight,
  Sliders,
  CheckCircle2,
  FileCode,
  Code,
} from 'lucide-react';
import { Button } from '../ui/button';

interface EvidenceTraceabilityModalProps {
  readiness: TopicReadiness | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverride?: () => void;
}

export const EvidenceTraceabilityModal: React.FC<EvidenceTraceabilityModalProps> = ({
  readiness,
  isOpen,
  onClose,
  onOpenOverride,
}) => {
  const { setRoute } = usePlacement();

  if (!isOpen || !readiness) return null;

  const handleActionClick = () => {
    onClose();
    if (readiness.recommendedAction.route === 'dsa') {
      setRoute('dsa');
    } else if (readiness.recommendedAction.route === 'roadmap') {
      setRoute('roadmap');
    }
  };

  const getStatusBadge = () => {
    switch (readiness.readinessStatus) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#4EAE79] bg-[#4EAE79]/10 border border-[#4EAE79]/30 px-2.5 py-1 rounded-[4px]">
            <ShieldCheck className="size-3.5" /> Placement Ready
          </span>
        );
      case 'on_track':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#FFC665] bg-[#FFC665]/10 border border-[#FFC665]/30 px-2.5 py-1 rounded-[4px]">
            <TrendingUp className="size-3.5" /> On Track
          </span>
        );
      case 'at_risk':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#E55353] bg-[#E55353]/10 border border-[#E55353]/30 px-2.5 py-1 rounded-[4px]">
            <AlertTriangle className="size-3.5" /> At Risk / Aging
          </span>
        );
      case 'needs_baseline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#8E98A8] bg-[#1B2028] border border-[#262D38] px-2.5 py-1 rounded-[4px]">
            <HelpCircle className="size-3.5" /> Baseline Needed
          </span>
        );
    }
  };

  const getClassificationChip = () => {
    switch (readiness.evidenceClassification) {
      case 'demonstrated':
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#4EAE79]/15 text-[#4EAE79] border border-[#4EAE79]/30 font-semibold">
            Demonstrated Evidence
          </span>
        );
      case 'inferred':
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 font-semibold">
            Inferred Readiness
          </span>
        );
      case 'insufficient':
      default:
        return (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#262D38] text-[#8E98A8] border border-[#3B4556] font-semibold">
            Insufficient Evidence
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#262D38] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FFC665]">
              <span className="uppercase font-bold tracking-wider">{readiness.domainName}</span>
              <span className="text-[#8E98A8]">•</span>
              <span className="text-[#8E98A8]">Importance: {readiness.importance}/10</span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] font-mono">{readiness.topicName}</h2>
            <div className="flex items-center gap-2 pt-1">
              {getStatusBadge()}
              {getClassificationChip()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Readiness Overview Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#1B2028] p-3.5 rounded-[4px] border border-[#262D38] text-xs font-mono">
          <div>
            <span className="text-[#8E98A8] text-[11px] block">Evidence Strength</span>
            <span className="text-lg font-bold text-[#F1F5F9]">{readiness.evidenceStrength}%</span>
          </div>

          <div>
            <span className="text-[#8E98A8] text-[11px] block">Level Progress</span>
            <span className="text-lg font-bold text-[#FFC665]">
              Level {readiness.currentLevel} <span className="text-[#8E98A8] text-xs font-normal">/ {readiness.targetLevel}</span>
            </span>
          </div>

          <div>
            <span className="text-[#8E98A8] text-[11px] block">Freshness State</span>
            <span
              className={`text-xs font-bold capitalize mt-1 inline-block ${
                readiness.freshness === 'fresh'
                  ? 'text-[#4EAE79]'
                  : readiness.freshness === 'aging'
                  ? 'text-[#FFC665]'
                  : readiness.freshness === 'stale'
                  ? 'text-[#E55353]'
                  : 'text-[#8E98A8]'
              }`}
            >
              {readiness.freshness}
            </span>
          </div>

          <div>
            <span className="text-[#8E98A8] text-[11px] block">Last Activity</span>
            <span className="text-xs font-bold text-[#F1F5F9] mt-1 block truncate">
              {readiness.lastPracticedAt ? readiness.lastPracticedAt.slice(0, 10) : 'Never'}
            </span>
          </div>
        </div>

        {/* What Caused This / Traceability Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-[#FFC665]" />
            What Caused This Readiness Rating?
          </h3>

          <div className="bg-[#1B2028] p-4 rounded-[4px] border border-[#262D38] space-y-3 text-xs">
            <p className="text-[#8E98A8] leading-relaxed">
              Readiness is computed deterministically from recorded task completions, DSA Leitner Box states, recent attempts, and evidence decay.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
              <div className="p-2.5 bg-[#14171D] rounded-[4px] border border-[#262D38] space-y-1">
                <span className="text-[#8E98A8] text-[11px] block">Roadmap Tasks</span>
                <span className="font-bold text-[#F1F5F9]">
                  {readiness.taskEvidenceCount.completed} / {readiness.taskEvidenceCount.total} completed
                </span>
              </div>
              <div className="p-2.5 bg-[#14171D] rounded-[4px] border border-[#262D38] space-y-1">
                <span className="text-[#8E98A8] text-[11px] block">DSA Problems</span>
                <span className="font-bold text-[#F1F5F9]">
                  {readiness.dsaEvidenceCount.mastered} mastered (Box 3+), {readiness.dsaEvidenceCount.attempted} attempted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Supporting Evidence Log Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-[#4EAE79]" />
            Supporting Evidence Timeline ({readiness.supportingEvidence.length})
          </h3>

          {readiness.supportingEvidence.length === 0 ? (
            <div className="p-4 bg-[#1B2028] rounded-[4px] border border-[#262D38] text-center text-xs text-[#8E98A8] font-mono">
              No recorded practice evidence for this topic yet. Complete a task or DSA problem to generate evidence.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {readiness.supportingEvidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    {ev.sourceType === 'dsa_problem' || ev.sourceType === 'dsa_attempt' ? (
                      <Code className="size-4 text-[#4EAE79]" />
                    ) : ev.sourceType === 'task' ? (
                      <FileCode className="size-4 text-[#FFC665]" />
                    ) : (
                      <Sliders className="size-4 text-[#60A5FA]" />
                    )}
                    <div>
                      <span className="font-semibold text-[#F1F5F9] block">{ev.title}</span>
                      <span className="text-[11px] text-[#8E98A8] block">{ev.details}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-[#FFC665] text-xs">+{ev.scoreContribution}%</span>
                    {ev.timestamp && (
                      <span className="text-[10px] text-[#8E98A8] block mt-0.5">
                        {ev.timestamp.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gap Explanation & Recommended Action */}
        <div className="p-4 bg-[#1B2028] rounded-[4px] border border-[#262D38] space-y-3 text-xs font-mono">
          <div className="flex items-start gap-2">
            <Target className="size-4 text-[#FFC665] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#F1F5F9] block text-[11px] uppercase tracking-wider">Gap Analysis & Target Requirement</span>
              <p className="text-[#8E98A8] mt-1 leading-relaxed">{readiness.gapExplanation}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#F1F5F9]">
              <span className="text-[#8E98A8]">Recommended Action: </span>
              <span className="font-bold text-[#FFC665]">{readiness.recommendedAction.label}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenOverride();
                  }}
                  className="text-xs border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9]"
                >
                  <Sliders className="size-3.5 mr-1" /> Override Rating
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleActionClick}
                className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold font-mono rounded-[4px] w-full sm:w-auto"
              >
                Execute Action <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
