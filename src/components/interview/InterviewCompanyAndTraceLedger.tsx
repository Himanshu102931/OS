import React from 'react';
import type { RoutePath } from '../../context/PlacementContext';
import type { CompanyOverlay } from '../../types';
import type {
  InterviewReadinessScorecard,
  ReadinessBand,
} from '../../engine/interviewReadinessEngine';
import { Button } from '../ui/button';
import { Building2, CalendarClock } from 'lucide-react';

const BAND_META: Record<ReadinessBand, { label: string; chip: string }> = {
  strong: {
    label: 'Strong',
    chip: 'bg-status-success/10 text-status-success border-status-success/30',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-surface-panel text-text-secondary border-border-default',
  },
};

export interface InterviewCompanyAndTraceLedgerProps {
  scorecard: InterviewReadinessScorecard;
  companyOverlays: CompanyOverlay[];
  todayDate: string;
  onAction: (route: RoutePath, targetId?: string) => void;
}

export const InterviewCompanyAndTraceLedger: React.FC<InterviewCompanyAndTraceLedgerProps> = ({
  scorecard,
  companyOverlays,
  todayDate,
  onAction,
}) => {
  const { dimensions, companyOverlay } = scorecard;

  const company = companyOverlay
    ? companyOverlays.find((c) => c.id === companyOverlay.companyId)
    : undefined;

  const daysUntilEvent = (() => {
    const event = companyOverlay?.eventDate ?? company?.eventDate;
    if (!event) return null;
    const diff = Math.round(
      (new Date(event).getTime() - new Date(todayDate).getTime()) / 86_400_000
    );
    return Number.isFinite(diff) ? diff : null;
  })();

  const requiredDimensions = companyOverlay?.dimensions.filter((d) => d.isRequired) ?? [];

  return (
    <section
      aria-label="Company readiness overlay"
      data-testid="company-overlay"
      className="bg-surface-panel border border-border-default rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Building2 className="size-4 text-status-danger" />
          Company Readiness Overlay
        </h2>
        {companyOverlay && (
          <span
            className="text-[11px] px-2.5 py-1 rounded-lg bg-info/10 border border-info/30 text-info font-medium"
            data-testid="company-gap-badge"
          >
            Gap: {companyOverlay.overallGap}
          </span>
        )}
      </div>

      {!companyOverlay ? (
        <p className="text-xs text-text-secondary" data-testid="company-overlay-empty">
          No company selected. Showing general readiness only — no company-specific requirements are
          applied to the evidence above.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span>
              <Building2 className="inline size-3.5 mr-1 -mt-0.5 text-status-danger" />
              <strong className="text-text-primary">{companyOverlay.companyName}</strong>
            </span>
            {company?.targetRole && (
              <span>
                Role: <strong className="text-text-primary">{company.targetRole}</strong>
              </span>
            )}
            <span>
              <CalendarClock className="inline size-3.5 mr-1 -mt-0.5 text-[var(--action-accent-interview)]" />
              Event:{' '}
              <strong className="text-text-primary">
                {companyOverlay.eventDate ?? 'Not scheduled'}
              </strong>
              {daysUntilEvent !== null && (
                <span
                  className={`ml-1.5 font-mono ${
                    daysUntilEvent <= 30 ? 'text-status-warning' : 'text-status-success'
                  }`}
                  data-testid="company-days-until"
                >
                  ({daysUntilEvent >= 0 ? `${daysUntilEvent}d left` : `${Math.abs(daysUntilEvent)}d ago`})
                </span>
              )}
            </span>
          </div>

          <p className="text-[11px] text-text-secondary border-t border-border-default pt-2">
            The company overlay is displayed alongside the general scorecard. Dimension evidence,
            capability, confidence and freshness above are unchanged by this selection.
          </p>

          <div className="space-y-1.5" data-testid="company-dimension-list">
            {companyOverlay.dimensions.map((cd) => {
              const dim = dimensions.find((d) => d.id === cd.dimensionId);
              const dimMeta = dim ? BAND_META[dim.band] : BAND_META.unassessed;
              return (
                <div
                  key={cd.dimensionId}
                  data-testid={`company-dimension-${cd.dimensionId}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border ${
                    cd.isRequired
                      ? 'bg-info/5 border-info/25'
                      : 'bg-surface-elevated border-border-default'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{dim?.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${
                          cd.isRequired
                            ? 'bg-info/10 border-info/30 text-info'
                            : 'bg-surface-panel border-border-default text-text-secondary'
                        }`}
                      >
                        {cd.isRequired ? 'Required' : 'Not required'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border capitalize readiness-badge ${dimMeta.chip}`}
                      >
                        {dimMeta.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary">{cd.gapDescription}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 bg-surface-panel border-border-default text-text-secondary capitalize">
                    {cd.priority}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border-default flex flex-wrap gap-2">
            <span className="text-[11px] text-text-secondary self-center">
              {requiredDimensions.length} of {companyOverlay.dimensions.length} dimensions required
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAction('companies')}
              data-testid="company-action"
              className="h-7 text-xs border-border-default bg-surface-elevated text-text-primary rounded-md ml-auto"
            >
              <Building2 className="size-3" />
              Manage company overlays
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
