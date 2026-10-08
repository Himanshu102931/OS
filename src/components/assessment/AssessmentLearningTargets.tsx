import React from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import type { AssessmentLearningTarget } from '../../engine/assessmentIntegration';

interface AssessmentLearningTargetsProps {
  targets: AssessmentLearningTarget[];
  summary: string;
  primaryActionReason?: string;
  primaryActionDeepLink?: {
    route: string;
    targetId?: string;
  } | null;
  onNavigateTarget: (route: string, targetId?: string) => void;
}

export const AssessmentLearningTargets: React.FC<AssessmentLearningTargetsProps> = ({
  targets,
  summary,
  primaryActionReason,
  primaryActionDeepLink,
  onNavigateTarget,
}) => {
  if (targets.length === 0 && !primaryActionDeepLink) {
    return null;
  }

  return (
    <section aria-label="Assessment Learning Targets" className="space-y-4">
      {/* Target Breakdown Card */}
      {targets.length > 0 && (
        <div className="bg-surface-panel border border-info/40 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-info uppercase tracking-wider">
            <Activity className="size-3.5 text-info" aria-hidden="true" />
            <span>Prescriptive Learning Targets &amp; Remediation Actions</span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>

          <ol className="space-y-2 pt-1" aria-label="Prioritized Learning Targets">
            {targets.slice(0, 3).map((target, index) => (
              <li
                key={`${target.kind}-${target.targetId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-surface-elevated/60 border border-border text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-action-accent font-bold shrink-0 w-4 text-right mt-0.5">
                    {index + 1}.
                  </span>
                  <div>
                    <span className="text-foreground font-medium">{target.title}</span>
                    <span className="text-muted-foreground block sm:inline sm:ml-1.5">
                      — {target.reason}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 font-mono text-[11px] text-secondary">
                  <span className="px-1.5 py-0.5 rounded bg-background border border-border">
                    {target.kind.toUpperCase()}
                  </span>
                  <span>{target.estimatedMinutes} min</span>
                </div>
              </li>
            ))}

            {targets.length > 3 && (
              <li className="text-xs text-secondary flex items-center gap-2 px-1 pt-1">
                <span className="font-mono shrink-0 w-4 text-right">+</span>
                <span>
                  {targets.length - 3} more target{targets.length - 3 > 1 ? 's' : ''} available in Today&apos;s Session
                </span>
              </li>
            )}
          </ol>
        </div>
      )}

      {/* Hero Prescriptive Action CTA Banner */}
      {primaryActionDeepLink && (
        <div
          data-testid="hero-prescriptive-cta"
          className="diagnostic-sweep bg-surface-panel border border-action-accent/40 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-action-accent-ring uppercase tracking-wider">
              <ArrowRight className="size-3.5 text-action-accent" aria-hidden="true" />
              <span>Next Assessment Action</span>
            </div>
            <p className="text-xs text-foreground max-w-2xl leading-relaxed">
              {primaryActionReason || 'Continue learning based on your assessment results.'}
            </p>
          </div>

          <button
            data-testid="start-next-action-btn"
            aria-label="Review Diagnostic"
            onClick={() => {
              if (primaryActionDeepLink) {
                onNavigateTarget(primaryActionDeepLink.route, primaryActionDeepLink.targetId);
              }
            }}
            className="px-5 py-2.5 rounded text-xs font-bold bg-action-accent text-action-accent-foreground hover:bg-action-accent-hover transition-colors whitespace-nowrap shadow-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Diagnostic</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
};
