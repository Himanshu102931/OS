import React, { useState } from 'react';
import {
  CalendarClock, Building2, RotateCcw, Dumbbell, ShieldAlert,
  ChevronDown, ChevronRight, ArrowRight, Play, Compass,
} from 'lucide-react';
import { TodaySection, SectionHeading, MonoChip, TodayButton } from './todayPrimitives';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import type { EvidenceCatalog, EvidenceTrace } from '../../engine/evidenceTrace';
import type { CompanyFocusSummary } from '../../engine/companyPlanEngine';
import type { ReviewCandidate } from '../../engine/reviewScheduler';
import type { ReviewPromptValidation } from '../../engine/reviewPromptAdapter';
import type { RoutePath } from '../../context/PlacementContext';

type Hue = 'warning' | 'info' | 'accent' | 'success' | 'danger';

/** §6.2 — hue is the LEFT EDGE only; icon + label + count carry the meaning. */
const HUE_BAR: Record<Hue, string> = {
  warning: 'bg-status-warning',
  info: 'bg-info',
  accent: 'bg-accent',
  success: 'bg-status-success',
  danger: 'bg-status-danger',
};

const HUE_TEXT: Record<Hue, string> = {
  warning: 'text-status-warning',
  info: 'text-info',
  accent: 'text-accent',
  success: 'text-status-success',
  danger: 'text-status-danger',
};

/* ─── shared item shell (§6.1 anatomy, identical for every signal) ───── */

interface RailItemProps {
  label: string;
  hue: Hue;
  count?: string;
  detail?: React.ReactNode;
  icon: React.ReactElement;
  /** Primary action for this signal — never a filled CTA (§5.2). */
  action?: React.ReactNode;
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  /** Test id for the disclosure control (`aria-expanded` lives on it). */
  toggleTestId?: string;
  /** Test id for the whole card — used by tests that read the region's text. */
  cardTestId?: string;
  cardRole?: string;
  cardAriaLabel?: string;
}

const RailItem: React.FC<RailItemProps> = ({
  label, hue, count, detail, icon, action,
  expandable = false, open = false, onToggle, children,
  toggleTestId, cardTestId, cardRole, cardAriaLabel,
}) => (
  <li className="min-w-0 flex-1 basis-[260px]">
    <div
      className="flex h-full overflow-hidden rounded-lg border border-border-default bg-surface-panel"
      data-testid={cardTestId}
      role={cardRole}
      aria-label={cardAriaLabel}
    >
      <span className={`w-[3px] shrink-0 ${HUE_BAR[hue]}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 shrink-0 ${HUE_TEXT[hue]}`} aria-hidden="true">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button
                type="button"
                onClick={expandable ? onToggle : undefined}
                aria-expanded={expandable ? open : undefined}
                data-testid={toggleTestId}
                className={
                  expandable
                    ? 'inline-flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary transition-colors duration-150 hover:text-text-primary'
                    : 'font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary'
                }
              >
                {expandable ? (
                  open ? <ChevronDown className="size-3" aria-hidden="true" /> : <ChevronRight className="size-3" aria-hidden="true" />
                ) : null}
                {label}
              </button>
              {count ? <span className="font-mono text-[11px] text-text-secondary">{count}</span> : null}
            </div>
            {detail ? <div className="mt-1 text-xs leading-relaxed text-text-secondary">{detail}</div> : null}
          </div>
          {action ? <div className="shrink-0 self-start">{action}</div> : null}
        </div>
        {open && children ? <div className="border-t border-border-default pt-2">{children}</div> : null}
      </div>
    </div>
  </li>
);

/* ─── props ──────────────────────────────────────────────────────────── */

export interface AttentionRailProps {
  /* Sunday obligation (§6.4) */
  sundayPending: boolean;
  onOpenAssessment: () => void;

  /* Company focus — the ONE summary surface (§3.2.2) */
  companyFocus: CompanyFocusSummary | null;
  onRoute: (route: RoutePath, targetId?: string) => void;

  /* Review — union of analytics prompts + scheduler counts (§6.2/§6.3) */
  validatedPrompts: ReviewPromptValidation[];
  reviewCandidates: ReviewCandidate[];
  hasOverdueReviews: boolean;
  hasRemediation: boolean;
  primaryReviewDeepLink: { route: RoutePath; targetId: string } | null;
  candidateTraces: Record<string, EvidenceTrace>;
  evidenceCatalog: EvidenceCatalog;
  onOpenReview: () => void;

  /* Practice signal */
  practice: { title: string; estimatedMinutes: number; categoryTag: string; reason: string } | null;
  practiceChips: { key: string; label: string }[];
  onStartDrill: () => void;

  /* Reserved: blocked / overdue critical (§6.2) */
  blockedCount: number;
  onOpenSkills: () => void;
}

interface ReviewRow {
  key: string;
  title: string;
  description: string;
  severity: string;
  route: RoutePath;
  targetId: string;
  trace?: EvidenceTrace;
}

/**
 * §6 — Attention Rail: the single merged attention surface. Always visible
 * (urgency is never hidden behind a scroll reveal), hidden entirely when no
 * signal is active, with at most one detail expansion open at a time.
 */
export const AttentionRail: React.FC<AttentionRailProps> = (props) => {
  const {
    sundayPending, onOpenAssessment,
    companyFocus, onRoute,
    validatedPrompts, reviewCandidates, hasOverdueReviews, hasRemediation,
    primaryReviewDeepLink, candidateTraces, evidenceCatalog, onOpenReview,
    practice, practiceChips, onStartDrill,
    blockedCount, onOpenSkills,
  } = props;

  // The company summary opens first: it is the answer to "what is shaping
  // today?" and its reason/counts are pinned copy (companyDailyPlan §8).
  const [open, setOpen] = useState<string | null>('company');
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  const navigablePrompts = validatedPrompts.filter((v) => v.navigable);
  const informationalCount = validatedPrompts.length - navigablePrompts.length;

  const anySignal =
    sundayPending || !!companyFocus || validatedPrompts.length > 0 ||
    !!practice || blockedCount > 0;

  /** Prompts first (§6.3 rows), scheduler candidates as the fallback list. */
  const promptRows: ReviewRow[] = navigablePrompts.slice(0, 5).map((v) => {
    const match = reviewCandidates.find((c) => c.targetId === v.prompt.targetId);
    return {
      key: v.prompt.id,
      title: v.prompt.title,
      description: v.prompt.description,
      severity: v.prompt.severity,
      route: v.route,
      targetId: v.targetId ?? '',
      trace: match ? candidateTraces[match.id] : undefined,
    };
  });

  const candidateRows: ReviewRow[] = promptRows.length > 0
    ? []
    : reviewCandidates.slice(0, 5).map((c) => ({
        key: c.id,
        title: c.title,
        description: c.reason,
        severity: c.priority,
        route: c.route,
        targetId: c.targetId,
        trace: candidateTraces[c.id],
      }));

  const rows = promptRows.length > 0 ? promptRows : candidateRows;

  if (!anySignal) return null;

  return (
    <TodaySection section="attention" mobileOrder={4} data-testid="attention-rail">
      <SectionHeading right={<span className="font-mono text-[11px] text-text-tertiary">attention</span>}>
        Needs attention
      </SectionHeading>

      {/* One wrapping row — never scrolls horizontally (§16.2). */}
      <ul className="mt-3 flex flex-wrap items-stretch gap-3">
        {sundayPending && (
          <RailItem
            label="Sunday mini-test"
            hue="warning"
            count="90m"
            icon={<CalendarClock className="size-4" />}
            detail="Weekly calibration assessment scheduled."
            cardTestId="sunday-obligation-banner"
            action={
              <TodayButton variant="warning" onClick={onOpenAssessment}>
                Start Mini Test (90m)
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </TodayButton>
            }
          />
        )}

        {companyFocus && (
          <RailItem
            label="Company focus"
            hue="info"
            count={`${companyFocus.gapCount} gaps`}
            icon={<Building2 className="size-4" />}
            detail={
              <>
                <span className="text-text-primary">{companyFocus.companyName}</span>
                {companyFocus.urgencyLabel ? (
                  <MonoChip micro tone="info" className="ml-2 align-middle" data-testid="company-focus-urgency">
                    {companyFocus.urgencyLabel}
                  </MonoChip>
                ) : null}
              </>
            }
            expandable
            open={open === 'company'}
            onToggle={() => toggle('company')}
            toggleTestId="attention-company"
            cardTestId="company-focus-summary"
            cardRole="region"
            cardAriaLabel={`Company Focus: ${companyFocus.companyName}`}
          >
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-text-secondary" data-testid="company-focus-reason">
                {companyFocus.priorityReason}
              </p>

              {companyFocus.focusItems.length > 0 && (
                <ol className="space-y-1.5" data-testid="company-focus-items">
                  {companyFocus.focusItems.map((item, index) => (
                    <li key={`${item.kind}-${item.targetId ?? index}`} className="flex items-start gap-2 text-xs">
                      <span className="w-4 shrink-0 font-mono text-text-tertiary">{index + 1}.</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-text-primary">{item.title}</span>
                        <span className="text-text-secondary"> — {item.reason}</span>
                      </span>
                      {item.route && item.targetId ? (
                        <TodayButton
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onRoute(item.route as RoutePath, item.targetId)}
                        >
                          Open
                        </TodayButton>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-default pt-2 font-mono text-[11px] text-text-tertiary">
                <span data-testid="company-focus-counts">
                  {companyFocus.gapCount} of {companyFocus.totalRequirements} requirements need evidence
                </span>
                {companyFocus.unmappedCount > 0 && (
                  <span className="text-status-warning" data-testid="company-focus-unmapped">
                    {companyFocus.unmappedCount} requirement{companyFocus.unmappedCount === 1 ? '' : 's'} not mapped to a task yet
                  </span>
                )}
                {companyFocus.blockedCount > 0 && (
                  <span data-testid="company-focus-blocked">
                    {companyFocus.blockedCount} waiting on prerequisites
                  </span>
                )}
              </div>
            </div>
          </RailItem>
        )}

        {validatedPrompts.length > 0 || reviewCandidates.length > 0 ? (
          <RailItem
            label="Review due"
            hue="accent"
            count={`${reviewCandidates.length} due`}
            icon={<RotateCcw className="size-4" />}
            detail={
              hasRemediation || hasOverdueReviews
                ? [hasRemediation ? 'Remediation required' : null, hasOverdueReviews ? 'Overdue reviews' : null]
                    .filter(Boolean)
                    .join(' · ')
                : `${navigablePrompts.length} actionable review signal${navigablePrompts.length === 1 ? '' : 's'}.`
            }
            expandable
            open={open === 'review'}
            onToggle={() => toggle('review')}
            toggleTestId="attention-review"
            action={
              primaryReviewDeepLink ? (
                <TodayButton variant="tonal" onClick={onOpenReview}>
                  <Compass className="size-3.5 text-accent" aria-hidden="true" />
                  Open review
                </TodayButton>
              ) : undefined
            }
          >
            {/* §6.3 — the single source of review detail on the page. */}
            <div data-guide-target="today-review-schedule" data-reveal="review" className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-text-tertiary">
                <span data-testid="review-prompts-counts">
                  {navigablePrompts.length} of {validatedPrompts.length} prompts actionable
                </span>
                {hasOverdueReviews ? <span className="text-status-warning">overdue</span> : null}
                {hasRemediation ? <span className="text-status-warning">remediation</span> : null}
                {informationalCount > 0 ? (
                  <span className="text-status-warning" data-testid="review-prompts-unmapped">
                    {informationalCount} prompt{informationalCount === 1 ? '' : 's'} informational only
                  </span>
                ) : null}
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => (
                  <div key={row.key} className="rounded-md border border-border-default bg-surface-subtle p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xs font-semibold text-text-primary">{row.title}</h3>
                          <MonoChip micro tone={row.severity === 'high' ? 'warning' : 'neutral'}>
                            {row.severity.replace('_', ' ')}
                          </MonoChip>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{row.description}</p>
                      </div>
                      <TodayButton
                        variant="outline"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => row.targetId && onRoute(row.route, row.targetId)}
                      >
                        Go
                      </TodayButton>
                    </div>
                    {row.trace ? (
                      <EvidenceTracePanel
                        trace={row.trace}
                        catalog={evidenceCatalog}
                        idPrefix={`candidate-${row.key}`}
                        title="Evidence trace"
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              {reviewCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRoute('analytics')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-elevated hover:text-text-primary"
                >
                  View all {reviewCandidates.length} review candidates in Analytics
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </RailItem>
        ) : null}

        {practice && (
          <RailItem
            label="Practice signal"
            hue="success"
            count={`${practice.estimatedMinutes} min`}
            icon={<Dumbbell className="size-4" />}
            detail={
              <>
                <span className="text-text-primary">{practice.title}</span>
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
                  {practice.categoryTag}
                </span>
                {practiceChips.length > 0 ? (
                  <span className="mt-1 block text-text-tertiary">{practiceChips.map((c) => c.label).join(' · ')}</span>
                ) : null}
              </>
            }
            expandable
            open={open === 'practice'}
            onToggle={() => toggle('practice')}
            toggleTestId="attention-practice"
            action={
              <TodayButton variant="tonal" onClick={onStartDrill}>
                <Play className="size-3" aria-hidden="true" />
                Start Drill
              </TodayButton>
            }
          >
            <p className="text-xs leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">Why this drill? </span>
              {practice.reason}
            </p>
            <button
              type="button"
              onClick={() => onRoute('practice')}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              Explore all drills
              <ArrowRight className="size-3" aria-hidden="true" />
            </button>
          </RailItem>
        )}

        {blockedCount > 0 && (
          <RailItem
            label="Blocked"
            hue="danger"
            count={`${blockedCount} urgent`}
            icon={<ShieldAlert className="size-4" />}
            detail="Work is waiting on prerequisites."
            cardTestId="attention-blocked"
            action={
              <TodayButton variant="tonal" onClick={onOpenSkills}>
                Open skills
              </TodayButton>
            }
          />
        )}
      </ul>
    </TodaySection>
  );
};
