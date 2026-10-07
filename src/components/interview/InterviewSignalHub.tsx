import React from 'react';
import type { RoutePath } from '../../context/PlacementContext';
import type {
  InterviewReadinessScorecard,
  ReadinessBand,
} from '../../engine/interviewReadinessEngine';
import { Button } from '../ui/button';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

const BAND_META: Record<ReadinessBand, { label: string; chip: string; bar: string }> = {
  strong: {
    label: 'Strong',
    chip: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
    bar: 'bg-[#10B981]',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30',
    bar: 'bg-[#E5A93C]',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    bar: 'bg-[#F59E0B]',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-[#14171D] text-[#8E98A8] border-[#262D38]',
    bar: 'bg-[#5C6675]',
  },
};

export interface InterviewSignalHubProps {
  scorecard: InterviewReadinessScorecard;
  onAction: (route: RoutePath, targetId?: string) => void;
}

export const InterviewSignalHub: React.FC<InterviewSignalHubProps> = ({
  scorecard,
  onAction,
}) => {
  const { dimensions, assessmentIntegration, projectReadiness } = scorecard;
  const openWeaknesses = dimensions.flatMap((d) =>
    d.weaknesses.slice(0, 1).map((w) => ({ dimension: d.name, text: w }))
  );

  return (
    <div className="space-y-6">
      {/* ── Active weakness / remediation signals ─────────────── */}
      <section
        aria-label="Active weakness and remediation signals"
        data-testid="weakness-signals"
        className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
          <Activity className="size-4 text-[#F59E0B]" />
          Active Weakness &amp; Remediation Signals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Active remediation
            </div>
            <div className="text-xl font-extrabold text-[#F59E0B] mt-1">
              {scorecard.activeRemediationCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              DSA remediation flags, open assessment weaknesses and low-evidence skills.
            </p>
          </div>
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Stale dimensions
            </div>
            <div className="text-xl font-extrabold text-[#FFC665] mt-1">
              {scorecard.staleEvidenceCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Dimensions whose evidence has passed its freshness window.
            </p>
          </div>
          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Weak evidence
            </div>
            <div className="text-xl font-extrabold text-[#F59E0B] mt-1">
              {scorecard.weakEvidenceCount}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Dimensions below the evidence-strength threshold.
            </p>
          </div>
        </div>

        {openWeaknesses.length > 0 ? (
          <ul className="space-y-1 pt-1 border-t border-[#262D38]">
            {openWeaknesses.slice(0, 6).map((w, i) => (
              <li key={`sig-${i}`} className="text-[11px] text-[#8E98A8]">
                <span className="text-[#F59E0B] font-semibold">{w.dimension}:</span> {w.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[#5C6675] pt-1 border-t border-[#262D38]">
            No active weakness or remediation signals recorded.
          </p>
        )}

        <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
          <Button
            size="xs"
            onClick={() => onAction('dsa')}
            data-testid="signal-action-dsa"
            className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
          >
            Review DSA remediation
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onAction('analytics')}
            data-testid="signal-action-analytics"
            className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
          >
            <BarChart3 className="size-3" />
            Open Review queue
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Assessment summary ──────────────────────────────── */}
        <section
          aria-label="Assessment summary"
          data-testid="assessment-summary"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <ClipboardCheck className="size-4 text-[#6366F1]" />
            Assessment Summary
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg border font-medium readiness-badge ${
                assessmentIntegration.isAssessed
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#14171D] text-[#8E98A8] border-[#262D38]'
              }`}
              data-testid="assessment-status"
            >
              {assessmentIntegration.isAssessed ? 'Assessed' : 'Not assessed'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Domains covered:{' '}
              <strong className="text-[#F1F5F9]">{assessmentIntegration.assessedDomainsCount}</strong>
            </span>
          </div>

          <div className="border border-[#262D38] rounded-lg p-3 bg-[#1B2028]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E98A8]">
              Overall ability
            </div>
            <div className="text-2xl font-extrabold text-[#F1F5F9] mt-0.5">
              {assessmentIntegration.isAssessed ? `${assessmentIntegration.overallAbility}%` : '—'}
            </div>
            <p className="text-[10px] text-[#5C6675] mt-1">
              Ability estimate from the diagnostic. Confidence is reported separately above.
            </p>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex items-start gap-2">
              <Target className="size-3.5 text-[#6366F1] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Focus area:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.primaryFocusDomain ?? 'Not set'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-[#10B981] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Strengths:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.strengths.length > 0
                    ? assessmentIntegration.strengths.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-[#F59E0B] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Weaknesses:{' '}
                <strong className="text-[#F1F5F9]">
                  {assessmentIntegration.weaknesses.length > 0
                    ? assessmentIntegration.weaknesses.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="size-3.5 text-[#38BDF8] mt-0.5 shrink-0" />
              <span className="text-[#8E98A8]">
                Reassessment recommended:{' '}
                <strong
                  className={
                    assessmentIntegration.reassessmentRecommended ? 'text-[#FFC665]' : 'text-[#F1F5F9]'
                  }
                  data-testid="assessment-reassessment"
                >
                  {assessmentIntegration.reassessmentRecommended ? 'Yes' : 'No'}
                </strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => onAction('assessment')}
              data-testid="assessment-action"
              className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#818CF8] border border-[#6366F1]/40 rounded-md"
            >
              <ClipboardCheck className="size-3" />
              {assessmentIntegration.isAssessed ? 'Open Diagnostic' : 'Run Diagnostic'}
            </Button>
          </div>
        </section>

        {/* ── Project Lab readiness ───────────────────────────── */}
        <section
          aria-label="Project Lab readiness"
          data-testid="project-readiness"
          className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#06B6D4]" />
            Project Lab Readiness
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg border font-medium readiness-badge ${
                BAND_META[projectReadiness.defenseReadiness].chip
              }`}
              data-testid="defense-band"
            >
              Defense: {BAND_META[projectReadiness.defenseReadiness].label}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Sections: <strong className="text-[#F1F5F9]">{projectReadiness.sectionsCompleted}</strong>
              /{projectReadiness.totalSections}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
              Defense evidence:{' '}
              <strong className="text-[#F1F5F9]">{projectReadiness.evidenceDefenseSessions}</strong>
            </span>
          </div>

          <div className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38]">
            <div
              className="bg-[#06B6D4] h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (projectReadiness.sectionsCompleted / Math.max(1, projectReadiness.totalSections)) *
                    100
                )}%`,
              }}
            />
          </div>

          <div className="text-xs text-[#8E98A8] space-y-1">
            <div className="flex items-center gap-2">
              <Award className="size-3.5 text-[#10B981] shrink-0" />
              Last defense:{' '}
              <strong className="text-[#F1F5F9]">
                {projectReadiness.lastDefenseDate ?? 'No recorded defense yet'}
              </strong>
            </div>
            <p className="text-[10px] text-[#5C6675]">
              Section completion is claimed only from recorded defense attempts — reading a tab
              never marks a section complete.
            </p>
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => onAction('project')}
              data-testid="project-action"
              className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#06B6D4] border border-[#06B6D4]/40 rounded-md"
            >
              <FlaskConical className="size-3" />
              Open Project Lab
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAction('practice', 'practice-project-defense-01')}
              data-testid="project-defense-action"
              className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
            >
              Launch defense session
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
