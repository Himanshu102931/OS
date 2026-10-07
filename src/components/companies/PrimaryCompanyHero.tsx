import React, { useMemo } from 'react';
import type {
  CompanyOverlay,
  TaskDefinition,
  DSAProblem,
  Topic,
  PreparationTopic,
  PracticeSessionDefinition,
} from '../../types';
import type { CompanyPreparationSnapshot } from '../../engine/companyEngine';
import {
  calculateCompanyDeadlineUrgency,
  validateCompanyRecommendedAction,
} from '../../engine/companyPlanEngine';
import { Button } from '../ui/button';
import {
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  ListFilter,
} from 'lucide-react';

interface PrimaryCompanyHeroProps {
  primaryCompany: CompanyOverlay;
  snapshot: CompanyPreparationSnapshot | undefined;
  todayDate: string;
  datasets: {
    dsaProblems: DSAProblem[];
    tasks: TaskDefinition[];
    topics: Topic[];
    preparationTopics: PreparationTopic[];
    practiceSessions: PracticeSessionDefinition[];
  };
  onPrepareForCompany: (route: string, targetId?: string) => void;
  onInspectRequirements: (company: CompanyOverlay) => void;
}

const STATUS_LABELS: Record<CompanyOverlay['applicationStatus'], { label: string; className: string }> = {
  target: { label: 'Target', className: 'bg-surface-elevated text-foreground-muted border-border' },
  applied: { label: 'Applied', className: 'bg-warning/15 text-warning border-warning/30' },
  oa_scheduled: { label: 'OA Scheduled', className: 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30' },
  interview_scheduled: { label: 'Interview Scheduled', className: 'bg-accent/15 text-accent border-accent/30' },
  offered: { label: 'Offer Received', className: 'bg-success/15 text-success border-success/30' },
  rejected: { label: 'Rejected', className: 'bg-surface-elevated text-foreground-muted border-border' },
  archived: { label: 'Archived', className: 'bg-surface-elevated text-foreground-muted border-border' },
};

export const PrimaryCompanyHero: React.FC<PrimaryCompanyHeroProps> = ({
  primaryCompany,
  snapshot,
  todayDate,
  datasets,
  onPrepareForCompany,
  onInspectRequirements,
}) => {
  const urgency = useMemo(() => {
    return calculateCompanyDeadlineUrgency(primaryCompany.eventDate, todayDate);
  }, [primaryCompany.eventDate, todayDate]);

  const topGap = useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.topActionableGaps && snapshot.topActionableGaps.length > 0) {
      return snapshot.topActionableGaps[0];
    }
    return snapshot.requirements.find((r) => r.status !== 'covered') || null;
  }, [snapshot]);

  const actionCheck = useMemo(() => {
    if (!topGap) {
      return {
        route: 'practice' as const,
        hasTargetId: false,
        targetValid: true,
        navigable: true,
        reason: 'All requirements covered. General practice recommended.',
      };
    }
    return validateCompanyRecommendedAction(topGap.recommendedAction, datasets);
  }, [topGap, datasets]);

  const handlePrepareClick = () => {
    if (actionCheck.navigable) {
      onPrepareForCompany(actionCheck.route, actionCheck.targetId);
    }
  };

  const overallPct = snapshot?.overallPreparationStrength ?? 0;
  const totalReqs = snapshot?.totalRequirementsCount ?? 0;
  const coveredReqs = snapshot?.coveredRequirementsCount ?? 0;
  const statusMeta = STATUS_LABELS[primaryCompany.applicationStatus] || STATUS_LABELS.target;

  // Human-readable countdown text
  const countdownText = useMemo(() => {
    if (urgency.daysUntil === null) return 'No assessment date scheduled';
    if (urgency.daysUntil < 0) return `${Math.abs(urgency.daysUntil)} days overdue`;
    if (urgency.daysUntil === 0) return 'Assessment drive is today!';
    if (urgency.daysUntil === 1) return '1 day left until assessment';
    return `${urgency.daysUntil} days left until assessment`;
  }, [urgency.daysUntil]);

  return (
    <section
      aria-label="Primary Target Focus & Drive Urgency Hero"
      className="company-deadline-track bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 transition-all shadow-sm"
    >
      {/* Signature Motion Beam at Top Border */}
      <div className="company-deadline-beam" aria-hidden="true" />

      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#FB7185] bg-[#F43F5E]/10 border border-[#F43F5E]/30 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <Zap className="size-3 text-[#FB7185]" aria-hidden="true" /> Primary Target Spotlight
          </span>
          <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold border px-2.5 py-0.5 rounded-md ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>

        {/* Date Countdown Pill */}
        <div className="flex items-center gap-2 text-xs font-mono text-foreground-muted bg-surface-elevated px-3 py-1 rounded-md border border-border">
          <Calendar className="size-3.5 text-accent" aria-hidden="true" />
          <span>{countdownText}</span>
          {urgency.urgencyLabel && urgency.daysUntil !== null && urgency.daysUntil <= 14 && (
            <span className="text-[10px] font-bold text-warning uppercase">· Urgent</span>
          )}
        </div>
      </div>

      {/* Main Grid: Target Details & Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Info: Company, Role & Readiness Bar (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-accent" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                {primaryCompany.companyName}
              </h2>
            </div>
            <p className="text-sm text-foreground-muted">
              Target Role: <strong className="text-foreground font-medium">{primaryCompany.targetRole}</strong>
            </p>
          </div>

          {/* Dual Progress Meter: Overall Readiness % & Covered Fraction */}
          <div className="space-y-2 p-3.5 bg-surface-elevated border border-border rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-foreground-muted font-semibold">
                Live Alignment Readiness
              </span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-lg font-bold text-foreground">{overallPct}%</span>
                <span className="text-[11px] text-foreground-muted">
                  ({coveredReqs}/{totalReqs} Requirements Covered)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border"
              role="progressbar"
              aria-valuenow={overallPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${primaryCompany.companyName} preparation readiness`}
            >
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallPct >= 75
                    ? 'bg-success'
                    : overallPct >= 40
                    ? 'bg-accent'
                    : 'bg-warning'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Info: Critical Requirement Gap Spotlight (5 cols) */}
        <div className="lg:col-span-5 bg-surface-elevated border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-border pb-2">
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-foreground-muted flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" /> Critical Deficit Spotlight
            </span>
            {topGap && (
              <span className="text-[10px] font-mono text-foreground-muted capitalize">
                {topGap.category}
              </span>
            )}
          </div>

          {topGap ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-foreground text-sm font-sans">
                  {topGap.requirementName}
                </span>
                <span className="font-mono text-[11px] text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded shrink-0">
                  Level {topGap.currentLevel}/{topGap.targetLevel}
                </span>
              </div>
              <p className="text-foreground-muted text-[11px] leading-relaxed line-clamp-2">
                {topGap.gapExplanation}
              </p>
              <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-1 border-t border-border/60">
                <span>Evidence Confidence:</span>
                <span className="font-mono font-bold text-foreground">{topGap.evidenceStrength}%</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center space-y-1">
              <ShieldCheck className="size-5 text-success mx-auto" aria-hidden="true" />
              <p className="text-xs font-semibold text-success">All configured requirements on track!</p>
              <p className="text-[11px] text-foreground-muted">
                {totalReqs > 0
                  ? 'Demonstrated evidence satisfies all required benchmarks.'
                  : 'No specific requirements configured yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer: Primary CTA & Secondary Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border">
        <p className="text-xs text-foreground-muted">
          {topGap
            ? `Immediate focus: Close ${topGap.requirementName} gap to raise drive readiness.`
            : 'Target benchmarks are fulfilled. Maintain freshness through periodic practice.'}
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onInspectRequirements(primaryCompany)}
            className="text-xs border-border bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground rounded-md h-9 px-3.5 transition-colors cursor-pointer"
          >
            <ListFilter className="size-3.5 mr-1.5" aria-hidden="true" /> Inspect All Requirements
          </Button>

          <Button
            size="sm"
            onClick={handlePrepareClick}
            data-testid="primary-company-prepare"
            className="text-xs font-semibold bg-[#F43F5E] hover:bg-[#FB7185] text-white focus-visible:ring-[#FECDD3] rounded-md h-9 px-4 shadow-sm transition-colors cursor-pointer"
          >
            <span>Prepare for {primaryCompany.companyName}</span>
            <ArrowRight className="size-3.5 ml-1.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
};
