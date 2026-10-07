import React from 'react';
import type { ReviewPrompt } from '../../engine/analyticsEngine';
import type { EvidenceTrace, EvidenceCatalog } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { Button } from '../ui/button';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
} from 'lucide-react';

interface AnalyticsReviewGridProps {
  reviewPrompts: ReviewPrompt[];
  promptTraces: EvidenceTrace[];
  catalog: EvidenceCatalog;
  onAction: (route: 'dsa' | 'roadmap' | 'skills', targetId?: string) => void;
}

export const AnalyticsReviewGrid: React.FC<AnalyticsReviewGridProps> = ({
  reviewPrompts,
  promptTraces,
  catalog,
  onAction,
}) => {
  if (reviewPrompts.length === 0) {
    return (
      <section aria-label="Zone 4: Operational Review Recommendations" className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#5A6578] px-0.5">
          <span>Zone 4: Operational Review</span>
          <span>Zero Active Bottlenecks</span>
        </div>

        <div
          data-testid="review-empty-state"
          className="p-8 rounded-xl border border-[#262D38] bg-[#14171D] text-center space-y-3"
        >
          <div className="size-10 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 mx-auto flex items-center justify-center">
            <CheckCircle2 className="size-5 text-[#10B981]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#F1F5F9]">
              No Operational Bottlenecks Detected
            </h2>
            <p className="text-xs text-[#8E98A8] max-w-md mx-auto">
              All spaced reviews are up-to-date, topic evidence is fresh, and no tasks are repeatedly postponed. Telemetry indicates optimal preparation health.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Primary Spotlight is the first high-severity prompt, or the very first prompt
  const spotlightIndex = reviewPrompts.findIndex((p) => p.severity === 'high');
  const primaryPrompt = spotlightIndex >= 0 ? reviewPrompts[spotlightIndex] : reviewPrompts[0];
  const primaryTrace = spotlightIndex >= 0 ? promptTraces[spotlightIndex] : promptTraces[0];

  // Remaining prompts for the grid
  const remainingPrompts = reviewPrompts.filter((_, idx) =>
    spotlightIndex >= 0 ? idx !== spotlightIndex : idx !== 0
  );
  const remainingTraces = promptTraces.filter((_, idx) =>
    spotlightIndex >= 0 ? idx !== spotlightIndex : idx !== 0
  );

  const getSeverityBadge = (severity: ReviewPrompt['severity']) => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-[#F43F5E]/10 text-[#FDA4AF] border-[#F43F5E]/30 font-semibold">
            <AlertCircle className="size-3 text-[#F43F5E]" />
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-[#F59E0B]/10 text-[#FCD34D] border-[#F59E0B]/30 font-semibold">
            <Clock className="size-3 text-[#F59E0B]" />
            Medium Priority
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-[#3B82F6]/10 text-[#93C5FD] border-[#3B82F6]/30 font-semibold">
            <Info className="size-3 text-[#3B82F6]" />
            Advisory
          </span>
        );
    }
  };

  return (
    <section aria-label="Zone 4: Operational Review Recommendations" className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#5A6578] px-0.5">
        <span>Zone 4: Evidence-Backed Operational Review</span>
        <span>{reviewPrompts.length} Actionable Recommendations</span>
      </div>

      {/* Primary Review Spotlight */}
      <div
        data-testid="primary-review-spotlight"
        className="p-5 rounded-xl border border-[#F43F5E]/40 bg-[#14171D] space-y-4 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F43F5E] via-[#FB7185] to-[#F43F5E]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-full bg-[#F43F5E]/20 text-[#FDA4AF] flex items-center justify-center">
              <AlertTriangle className="size-3.5 text-[#F43F5E]" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FDA4AF]">
              Primary Operational Focus
            </span>
          </div>
          {getSeverityBadge(primaryPrompt.severity)}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-[#F1F5F9] font-sans">
            {primaryPrompt.title}
          </h3>
          <p className="text-xs text-[#8E98A8] leading-relaxed">
            {primaryPrompt.description}
          </p>
        </div>

        {primaryTrace && (
          <EvidenceTracePanel
            trace={primaryTrace}
            catalog={catalog}
            idPrefix={`spotlight-${primaryPrompt.id}`}
            title="Causal Evidence Breakdown"
          />
        )}

        <div className="pt-3 border-t border-[#262D38] flex justify-end">
          <Button
            size="sm"
            onClick={() => onAction(primaryPrompt.route, primaryPrompt.targetId)}
            data-testid="primary-operational-review-action"
            className="h-8 text-xs bg-[#F43F5E] hover:bg-[#FB7185] text-white rounded-md font-semibold font-sans flex items-center gap-1.5 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#F43F5E]"
          >
            Execute Operational Review ({primaryPrompt.actionLabel}) <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Remaining Prompts Grid */}
      {remainingPrompts.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#F43F5E]" /> Additional Operational Cues ({remainingPrompts.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 list-stagger">
            {remainingPrompts.map((p, idx) => (
              <div
                key={p.id}
                data-testid={`review-prompt-card-${p.id}`}
                className="p-4.5 rounded-xl border bg-[#14171D] border-[#262D38] space-y-3.5 flex flex-col justify-between hover:border-[#384252] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#F1F5F9] font-sans leading-snug">
                      {p.title}
                    </span>
                    {getSeverityBadge(p.severity)}
                  </div>
                  <p className="text-xs text-[#8E98A8] leading-relaxed">
                    {p.description}
                  </p>
                </div>

                {remainingTraces[idx] && (
                  <EvidenceTracePanel
                    trace={remainingTraces[idx]}
                    catalog={catalog}
                    idPrefix={p.id}
                    title="Contributing Evidence"
                  />
                )}

                <div className="pt-2.5 border-t border-[#262D38] flex justify-end">
                  <Button
                    size="xs"
                    onClick={() => onAction(p.route, p.targetId)}
                    data-testid={`${p.id}-action`}
                    className="h-7 text-xs bg-[#1B2028] hover:bg-[#F43F5E]/20 text-[#FDA4AF] border border-[#F43F5E]/30 rounded-md font-semibold font-mono flex items-center gap-1 transition-colors"
                  >
                    {p.actionLabel} <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
