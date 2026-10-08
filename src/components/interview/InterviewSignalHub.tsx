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
    chip: 'bg-status-success/10 text-status-success border-status-success/30',
    bar: 'bg-status-success',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    bar: 'bg-status-warning',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    bar: 'bg-status-warning',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-surface-panel text-text-secondary border-border-default',
    bar: 'bg-text-tertiary',
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
        className="bg-surface-panel border border-border-default rounded-xl p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Activity className="size-4 text-status-warning" />
          Active Weakness &amp; Remediation Signals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="border border-border-default rounded-lg p-3 bg-surface-elevated">
            <div className="text-[10px] uppercase tracking-wider text-text-secondary">
              Active remediation
            </div>
            <div className="text-xl font-extrabold text-status-warning mt-1">
              {scorecard.activeRemediationCount}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              DSA remediation flags, open assessment weaknesses and low-evidence skills.
            </p>
          </div>
          <div className="border border-border-default rounded-lg p-3 bg-surface-elevated">
            <div className="text-[10px] uppercase tracking-wider text-text-secondary">
              Stale dimensions
            </div>
            <div className="text-xl font-extrabold text-status-warning mt-1">
              {scorecard.staleEvidenceCount}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              Dimensions whose evidence has passed its freshness window.
            </p>
          </div>
          <div className="border border-border-default rounded-lg p-3 bg-surface-elevated">
            <div className="text-[10px] uppercase tracking-wider text-text-secondary">
              Weak evidence
            </div>
            <div className="text-xl font-extrabold text-status-warning mt-1">
              {scorecard.weakEvidenceCount}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              Dimensions below the evidence-strength threshold.
            </p>
          </div>
        </div>

        {openWeaknesses.length > 0 ? (
          <ul className="space-y-1 pt-1 border-t border-border-default">
            {openWeaknesses.slice(0, 6).map((w, i) => (
              <li key={`sig-${i}`} className="text-[11px] text-text-secondary">
                <span className="text-status-warning font-semibold">{w.dimension}:</span> {w.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-text-secondary pt-1 border-t border-border-default">
            No active weakness or remediation signals recorded.
          </p>
        )}

        <div className="pt-2 border-t border-border-default flex flex-wrap gap-2">
          <Button
            size="xs"
            onClick={() => onAction('dsa')}
            data-testid="signal-action-dsa"
            className="h-7 text-xs bg-surface-elevated hover:bg-surface-subtle text-status-warning border border-status-warning/40 rounded-md"
          >
            Review DSA remediation
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onAction('analytics')}
            data-testid="signal-action-analytics"
            className="h-7 text-xs border-border-default bg-surface-elevated text-text-primary rounded-md"
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
          className="bg-surface-panel border border-border-default rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="size-4 text-[var(--action-accent-interview)]" />
            Assessment Summary
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg border font-medium readiness-badge ${
                assessmentIntegration.isAssessed
                  ? 'bg-status-success/10 text-status-success border-status-success/30'
                  : 'bg-surface-panel text-text-secondary border-border-default'
              }`}
              data-testid="assessment-status"
            >
              {assessmentIntegration.isAssessed ? 'Assessed' : 'Not assessed'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-default text-text-secondary">
              Domains covered:{' '}
              <strong className="text-text-primary">{assessmentIntegration.assessedDomainsCount}</strong>
            </span>
          </div>

          <div className="border border-border-default rounded-lg p-3 bg-surface-elevated">
            <div className="text-[10px] uppercase tracking-wider text-text-secondary">
              Overall ability
            </div>
            <div className="text-2xl font-extrabold text-text-primary mt-0.5">
              {assessmentIntegration.isAssessed ? `${assessmentIntegration.overallAbility}%` : '—'}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              Ability estimate from the diagnostic. Confidence is reported separately above.
            </p>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex items-start gap-2">
              <Target className="size-3.5 text-[var(--action-accent-interview)] mt-0.5 shrink-0" />
              <span className="text-text-secondary">
                Focus area:{' '}
                <strong className="text-text-primary">
                  {assessmentIntegration.primaryFocusDomain ?? 'Not set'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-status-success mt-0.5 shrink-0" />
              <span className="text-text-secondary">
                Strengths:{' '}
                <strong className="text-text-primary">
                  {assessmentIntegration.strengths.length > 0
                    ? assessmentIntegration.strengths.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-status-warning mt-0.5 shrink-0" />
              <span className="text-text-secondary">
                Weaknesses:{' '}
                <strong className="text-text-primary">
                  {assessmentIntegration.weaknesses.length > 0
                    ? assessmentIntegration.weaknesses.slice(0, 3).join(', ')
                    : 'None recorded'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="size-3.5 text-info mt-0.5 shrink-0" />
              <span className="text-text-secondary">
                Reassessment recommended:{' '}
                <strong
                  className={
                    assessmentIntegration.reassessmentRecommended ? 'text-status-warning' : 'text-text-primary'
                  }
                  data-testid="assessment-reassessment"
                >
                  {assessmentIntegration.reassessmentRecommended ? 'Yes' : 'No'}
                </strong>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-default flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => onAction('assessment')}
              data-testid="assessment-action"
              className="h-7 text-xs bg-surface-elevated hover:bg-surface-subtle text-[var(--action-accent-interview-hover)] border border-[var(--action-accent-interview)]/40 rounded-md"
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
          className="bg-surface-panel border border-border-default rounded-xl p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="size-4 text-info" />
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
            <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-default text-text-secondary">
              Sections: <strong className="text-text-primary">{projectReadiness.sectionsCompleted}</strong>
              /{projectReadiness.totalSections}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-default text-text-secondary">
              Defense evidence:{' '}
              <strong className="text-text-primary">{projectReadiness.evidenceDefenseSessions}</strong>
            </span>
          </div>

          <div className="w-full bg-surface-canvas rounded-full h-1.5 overflow-hidden border border-border-default">
            <div
              className="bg-info h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(
                  (projectReadiness.sectionsCompleted / Math.max(1, projectReadiness.totalSections)) *
                    100
                )}%`,
              }}
            />
          </div>

          <div className="text-xs text-text-secondary space-y-1">
            <div className="flex items-center gap-2">
              <Award className="size-3.5 text-status-success shrink-0" />
              Last defense:{' '}
              <strong className="text-text-primary">
                {projectReadiness.lastDefenseDate ?? 'No recorded defense yet'}
              </strong>
            </div>
            <p className="text-[10px] text-text-secondary">
              Section completion is claimed only from recorded defense attempts — reading a tab
              never marks a section complete.
            </p>
          </div>

          <div className="pt-2 border-t border-border-default flex flex-wrap gap-2">
            <Button
              size="xs"
              onClick={() => onAction('project')}
              data-testid="project-action"
              className="h-7 text-xs bg-surface-elevated hover:bg-surface-subtle text-info border border-info/40 rounded-md"
            >
              <FlaskConical className="size-3" />
              Open Project Lab
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAction('practice', 'practice-project-defense-01')}
              data-testid="project-defense-action"
              className="h-7 text-xs border-border-default bg-surface-elevated text-text-primary rounded-md"
            >
              Launch defense session
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
