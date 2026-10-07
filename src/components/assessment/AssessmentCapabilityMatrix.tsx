import React from 'react';
import { Target } from 'lucide-react';
import type { CompanyAssessmentOverlayResult } from '../../types';
import type { DomainAssessmentProfile } from '../../engine/assessmentEngine';

interface AssessmentCapabilityMatrixProps {
  domainProfiles: DomainAssessmentProfile[];
  companyAssessmentOverlayResult?: CompanyAssessmentOverlayResult;
  onOpenProjectLab: () => void;
}

export const AssessmentCapabilityMatrix: React.FC<AssessmentCapabilityMatrixProps> = ({
  domainProfiles,
  companyAssessmentOverlayResult,
  onOpenProjectLab,
}) => {
  const classAProfiles = domainProfiles.filter((d) => d.category === 'Class A');
  const classBProfiles = domainProfiles.filter((d) => d.category === 'Class B');
  const classCProfile = domainProfiles.find((d) => d.category === 'Class C');

  const renderDomainCard = (dp: DomainAssessmentProfile) => {
    const roleReadiness = companyAssessmentOverlayResult?.domainReadiness.find(
      (d) => d.domainId === dp.domainId
    );

    return (
      <div
        key={dp.domainId}
        data-testid={`domain-card-${dp.domainId}`}
        className="diagnostic-sweep bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-3 shadow-sm hover:border-[#3B4556] transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
              {dp.domainId.toUpperCase()}
            </div>
            <div className="text-[11px] text-[#CBD5E1] font-medium">{dp.name}</div>
            <div className="text-[11px] text-[#8E98A8] mt-0.5">{dp.levelLabel}</div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {dp.recentSignal === 'regression' && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/40"
                title={dp.recentSignalReason}
              >
                Regressed
              </span>
            )}
            {dp.recentSignal === 'confirmation' && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                title={dp.recentSignalReason}
              >
                Confirmed
              </span>
            )}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                dp.provisional
                  ? 'bg-[#1B2028] text-amber-300 border-amber-800/40'
                  : 'bg-[#1B2028] text-emerald-300 border-emerald-800/40'
              }`}
            >
              {dp.provisional ? 'Provisional' : 'Confirmed'}
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                dp.confidence === 'high'
                  ? 'bg-[#1B2028] text-emerald-400 border-emerald-800/40'
                  : dp.confidence === 'medium'
                  ? 'bg-[#1B2028] text-amber-400 border-amber-800/40'
                  : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
              }`}
            >
              Conf: {dp.confidence.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Ability Score Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8E98A8]">Demonstrated Ability</span>
            <span className="font-mono text-[#F1F5F9] font-semibold">
              {dp.status === 'unassessed' ? 'Unassessed' : `${dp.abilityScore}% Ability`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${dp.name || dp.domainId} Demonstrated Ability`}
            aria-valuenow={dp.abilityScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 bg-[#1B2028] rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                dp.abilityScore >= 65
                  ? 'bg-[#10B981]'
                  : dp.abilityScore >= 40
                  ? 'bg-[#EAB308]'
                  : dp.abilityScore > 0
                  ? 'bg-[#EF4444]'
                  : 'bg-transparent'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, dp.abilityScore))}%` }}
            />
          </div>
        </div>

        {/* Construct Scope Note if present */}
        {dp.constructScopeNote && (
          <div className="text-[10px] text-[#5C6675] leading-snug border-l-2 border-[#262D38] pl-2">
            {dp.constructScopeNote}
          </div>
        )}

        {/* Target Company Requirement Indicator if active */}
        {roleReadiness && (
          <div className="p-2 rounded bg-[#1B2028] border border-[#262D38] text-[11px] flex items-center justify-between">
            <span className="text-[#8E98A8]">Target Requirement:</span>
            <span
              className={
                roleReadiness.status === 'met'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-amber-400 font-semibold'
              }
            >
              {roleReadiness.status === 'met'
                ? `Met (L${roleReadiness.roleTargetLevel})`
                : `Target L${roleReadiness.roleTargetLevel} (Gap: -${roleReadiness.gap})`}
            </span>
          </div>
        )}

        {/* Card Footer: Assessment Kind and Level */}
        <div className="text-[11px] text-[#5C6675] flex items-center justify-between pt-1 border-t border-[#262D38]/60">
          <span>
            {dp.latestAssessmentKind
              ? `${
                  dp.latestAssessmentKind === 'full_reassessment'
                    ? 'Reassessment'
                    : dp.latestAssessmentKind === 'weekly_assessment'
                    ? 'Sunday Mini'
                    : 'Baseline'
                } (${dp.latestAssessmentDate?.slice(0, 10)})`
              : `Status: ${dp.status}`}
          </span>
          <span className="font-mono text-[#8E98A8]">Level {dp.level}</span>
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Domain Capability Matrix" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
          <Target className="size-4 text-[#EAB308]" aria-hidden="true" />
          <span>Domain Capability Matrix (All 11 Domains)</span>
        </h2>
        <span className="text-xs text-[#8E98A8]">
          Provisional Levels (0 to 5) · Ability (0–100)
        </span>
      </div>

      {/* Class A: Core Technical Domains */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8] flex items-center gap-2">
          <span>Class A — Standard Standardized Modules</span>
          <span className="text-[10px] text-[#5C6675] font-normal">
            (Objective + algorithmic + theoretical constructs)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classAProfiles.map((dp) => renderDomainCard(dp))}
        </div>
      </div>

      {/* Class B: Partial Construct Domains */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8] flex items-center gap-2">
          <span>Class B — Coding &amp; Execution Constructs</span>
          <span className="text-[10px] text-[#5C6675] font-normal">
            (Reasoning / practical execution / knowledge proxies)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classBProfiles.map((dp) => renderDomainCard(dp))}
        </div>
      </div>

      {/* Class C: Projects (Excluded from automated baseline) */}
      {classCProfile && (
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8] flex items-center gap-2">
            <span>Class C — Non-Objective &amp; Extended Domain Scope</span>
            <span className="text-[10px] text-[#5C6675] font-normal">
              (Special Scope: Evidence Tracked in Project Lab)
            </span>
          </div>

          <div className="diagnostic-sweep bg-[#14171D] border border-[#262D38] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
                  PROJECTS
                </span>
                <span className="text-xs font-semibold text-[#CBD5E1]">
                  · {classCProfile.name || 'Engineering Projects Portfolio'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                  Level 0 · Unassessed · Confidence: None
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Class C Special Scope: Evidence Tracked in Project Lab
                </span>
              </div>
              <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
                {classCProfile.constructScopeNote}
              </p>
            </div>

            <button
              onClick={onOpenProjectLab}
              className="px-4 py-2 rounded text-xs font-medium bg-[#1B2028] text-[#CBD5E1] hover:text-[#F1F5F9] border border-[#3B4556] whitespace-nowrap transition-colors cursor-pointer"
            >
              Open Project Lab
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
