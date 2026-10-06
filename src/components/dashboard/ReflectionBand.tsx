import React from 'react';
import { CheckCircle2, Lock, Sun, Moon, CalendarCheck } from 'lucide-react';
import { TodaySection, SectionHeading, TodayButton } from './todayPrimitives';

export interface ReflectionBandProps {
  isPlanCommitted: boolean;
  isDaySealed: boolean;
  /** ISO timestamp written by the seal transaction. */
  sealedAt?: string;
  /** Assignments still awaiting reflection (`assignments pending reflection`). */
  pendingCount: number;
  /** Read-only sealed summary — canonical `DailyCheckIn.totalActualMinutes`. */
  totalActualMinutes: number;
  onReflect: () => void;
  onPlanToday: () => void;
}

const hhmm = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * §10 — Reflection / Sealing: the day-lifecycle band. The header's old
 * "Reflect & Seal" control lives here now; `EveningReflectionModal`'s
 * `seal-day-button` remains the only sealing control and stays untouched.
 * Sealed days render read-only with no action button.
 */
export const ReflectionBand: React.FC<ReflectionBandProps> = ({
  isPlanCommitted, isDaySealed, sealedAt, pendingCount, totalActualMinutes,
  onReflect, onPlanToday,
}) => (
  <TodaySection section="reflection" mobileOrder={6} data-testid="reflection-seal">
    <SectionHeading right={<span className="font-mono text-[11px] text-text-tertiary">day lifecycle</span>}>
      Reflection
    </SectionHeading>

    <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-lg border border-border-default bg-surface-panel px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-2.5">
        {isDaySealed ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
        ) : (
          <Moon className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        )}
        <div className="min-w-0">
          {isDaySealed ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Lock className="size-3.5 text-status-success" aria-hidden="true" />
                Day sealed {hhmm(sealedAt)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                {totalActualMinutes} minutes recorded · sealed days are immutable
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-text-primary">
                Day open{isPlanCommitted ? ` · ${pendingCount} assignment${pendingCount === 1 ? '' : 's'} pending reflection` : ''}
              </p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                {isPlanCommitted
                  ? 'Sealing writes one check-in for the day and closes it for editing.'
                  : 'Commit a plan first — Today will not seal an unplanned day.'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Exactly one action at a time: Reflect & Seal, else Plan Today. */}
      {!isDaySealed ? (
        isPlanCommitted ? (
          <TodayButton variant="tonal" onClick={onReflect}>
            <Moon className="size-3.5" aria-hidden="true" />
            Reflect &amp; Seal
          </TodayButton>
        ) : (
          <TodayButton variant="tonal" onClick={onPlanToday}>
            <Sun className="size-3.5" aria-hidden="true" />
            Plan Today
          </TodayButton>
        )
      ) : null}
    </div>

    {!isDaySealed && isPlanCommitted ? (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary">
        <CalendarCheck className="size-3" aria-hidden="true" />
        {pendingCount} of the day's assignments are still open
      </p>
    ) : null}
  </TodaySection>
);
