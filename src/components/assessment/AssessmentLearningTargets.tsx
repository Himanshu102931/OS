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
        <div className="bg-[#14171D] border border-[#38BDF8]/40 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#93C5FD] uppercase tracking-wider">
            <Activity className="size-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Prescriptive Learning Targets &amp; Remediation Actions</span>
          </div>

          <p className="text-sm text-[#8E98A8] leading-relaxed">{summary}</p>

          <ol className="space-y-2 pt-1" aria-label="Prioritized Learning Targets">
            {targets.slice(0, 3).map((target, index) => (
              <li
                key={`${target.kind}-${target.targetId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-[#1B2028]/60 border border-[#262D38] text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-[#EAB308] font-bold shrink-0 w-4 text-right mt-0.5">
                    {index + 1}.
                  </span>
                  <div>
                    <span className="text-[#F1F5F9] font-medium">{target.title}</span>
                    <span className="text-[#8E98A8] block sm:inline sm:ml-1.5">
                      — {target.reason}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 font-mono text-[11px] text-[#5C6675]">
                  <span className="px-1.5 py-0.5 rounded bg-[#0D0F12] border border-[#262D38]">
                    {target.kind.toUpperCase()}
                  </span>
                  <span>{target.estimatedMinutes} min</span>
                </div>
              </li>
            ))}

            {targets.length > 3 && (
              <li className="text-xs text-[#5C6675] flex items-center gap-2 px-1 pt-1">
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
          className="diagnostic-sweep bg-[#14171D] border border-[#EAB308]/40 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FACC15] uppercase tracking-wider">
              <ArrowRight className="size-3.5 text-[#EAB308]" aria-hidden="true" />
              <span>Next Assessment Action</span>
            </div>
            <p className="text-xs text-[#CBD5E1] max-w-2xl leading-relaxed">
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
            className="px-5 py-2.5 rounded text-xs font-bold bg-[#EAB308] bg-amber-400 text-[#0D0F12] hover:bg-[#CA8A04] transition-colors whitespace-nowrap shadow-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Diagnostic</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
};
