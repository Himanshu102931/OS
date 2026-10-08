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
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-text-tertiary px-0.5">
          <span>Zone 4: Operational Review</span>
          <span>Zero Active Bottlenecks</span>
        </div>

        <div
          data-testid="review-empty-state"
          className="p-8 rounded-xl border border-border-default bg-surface-panel text-center space-y-3"
        >
          <div className="size-10 rounded-full bg-status-success/10 border border-status-success/30 mx-auto flex items-center justify-center">
            <CheckCircle2 className="size-5 text-status-success" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-text-primary">
              No Operational Bottlenecks Detected
            </h2>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
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
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-[var(--action-accent-subtle)] text-[var(--action-accent-foreground)] border-[var(--action-accent-border)] font-semibold">
            <AlertCircle className="size-3 text-[var(--action-accent)]" />
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-status-warning/10 text-status-warning border-status-warning/30 font-semibold">
            <Clock className="size-3 text-status-warning" />
            Medium Priority
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border capitalize bg-info/10 text-info border-info/30 font-semibold">
            <Info className="size-3 text-info" />
            Advisory
          </span>
        );
    }
  };

  return (
    <section aria-label="Zone 4: Operational Review Recommendations" className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-text-tertiary px-0.5">
        <span>Zone 4: Evidence-Backed Operational Review</span>
        <span>{reviewPrompts.length} Actionable Recommendations</span>
      </div>

      {/* Primary Review Spotlight */}
      <div
        data-testid="primary-review-spotlight"
        className="p-5 rounded-xl border border-[var(--action-accent-border)] bg-surface-panel space-y-4 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--action-accent)] via-[var(--action-accent-hover)] to-[var(--action-accent)]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-full bg-[var(--action-accent-subtle)] text-[var(--action-accent-foreground)] flex items-center justify-center">
              <AlertTriangle className="size-3.5 text-[var(--action-accent)]" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--action-accent-foreground)]">
              Primary Operational Focus
            </span>
          </div>
          {getSeverityBadge(primaryPrompt.severity)}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-text-primary font-sans">
            {primaryPrompt.title}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
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

        <div className="pt-3 border-t border-border-default flex justify-end">
          <Button
            size="sm"
            onClick={() => onAction(primaryPrompt.route, primaryPrompt.targetId)}
            data-testid="primary-operational-review-action"
            className="h-8 text-xs bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-white rounded-md font-semibold font-sans flex items-center gap-1.5 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[var(--action-accent-ring)]"
          >
            Execute Operational Review ({primaryPrompt.actionLabel}) <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Remaining Prompts Grid */}
      {remainingPrompts.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[var(--action-accent)]" /> Additional Operational Cues ({remainingPrompts.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 list-stagger">
            {remainingPrompts.map((p, idx) => (
              <div
                key={p.id}
                data-testid={`review-prompt-card-${p.id}`}
                className="p-4.5 rounded-xl border bg-surface-panel border-border-default space-y-3.5 flex flex-col justify-between hover:border-border-active transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-primary font-sans leading-snug">
                      {p.title}
                    </span>
                    {getSeverityBadge(p.severity)}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
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

                <div className="pt-2.5 border-t border-border-default flex justify-end">
                  <Button
                    size="xs"
                    onClick={() => onAction(p.route, p.targetId)}
                    data-testid={`${p.id}-action`}
                    className="h-7 text-xs bg-surface-elevated hover:bg-[var(--action-accent-subtle)] text-[var(--action-accent-foreground)] border border-[var(--action-accent-border)] rounded-md font-semibold font-mono flex items-center gap-1 transition-colors"
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
