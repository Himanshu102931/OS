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
    chip: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
  },
  developing: {
    label: 'Developing',
    chip: 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30',
  },
  needs_work: {
    label: 'Needs Work',
    chip: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
  },
  unassessed: {
    label: 'Unassessed',
    chip: 'bg-[#14171D] text-[#8E98A8] border-[#262D38]',
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
      className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
          <Building2 className="size-4 text-[#FF5722]" />
          Company Readiness Overlay
        </h2>
        {companyOverlay && (
          <span
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] font-medium"
            data-testid="company-gap-badge"
          >
            Gap: {companyOverlay.overallGap}
          </span>
        )}
      </div>

      {!companyOverlay ? (
        <p className="text-xs text-[#8E98A8]" data-testid="company-overlay-empty">
          No company selected. Showing general readiness only — no company-specific requirements are
          applied to the evidence above.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E98A8]">
            <span>
              <Building2 className="inline size-3.5 mr-1 -mt-0.5 text-[#FF5722]" />
              <strong className="text-[#F1F5F9]">{companyOverlay.companyName}</strong>
            </span>
            {company?.targetRole && (
              <span>
                Role: <strong className="text-[#F1F5F9]">{company.targetRole}</strong>
              </span>
            )}
            <span>
              <CalendarClock className="inline size-3.5 mr-1 -mt-0.5 text-[#6366F1]" />
              Event:{' '}
              <strong className="text-[#F1F5F9]">
                {companyOverlay.eventDate ?? 'Not scheduled'}
              </strong>
              {daysUntilEvent !== null && (
                <span
                  className={`ml-1.5 font-mono ${
                    daysUntilEvent <= 30 ? 'text-[#F59E0B]' : 'text-[#10B981]'
                  }`}
                  data-testid="company-days-until"
                >
                  ({daysUntilEvent >= 0 ? `${daysUntilEvent}d left` : `${Math.abs(daysUntilEvent)}d ago`})
                </span>
              )}
            </span>
          </div>

          <p className="text-[11px] text-[#5C6675] border-t border-[#262D38] pt-2">
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
                      ? 'bg-[#38BDF8]/5 border-[#38BDF8]/25'
                      : 'bg-[#1B2028] border-[#262D38]'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#F1F5F9]">{dim?.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${
                          cd.isRequired
                            ? 'bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8]'
                            : 'bg-[#14171D] border-[#262D38] text-[#8E98A8]'
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
                    <p className="text-[10px] text-[#8E98A8]">{cd.gapDescription}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 bg-[#14171D] border-[#262D38] text-[#8E98A8] capitalize">
                    {cd.priority}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#262D38] flex flex-wrap gap-2">
            <span className="text-[11px] text-[#8E98A8] self-center">
              {requiredDimensions.length} of {companyOverlay.dimensions.length} dimensions required
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onAction('companies')}
              data-testid="company-action"
              className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md ml-auto"
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
