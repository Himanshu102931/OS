import React from 'react';
import { Compass, Sun, BatteryMedium, CalendarCheck, Lock } from 'lucide-react';
import { TodaySection, SectionHeading, MonoChip } from './todayPrimitives';
import type { PlacementMode } from '../../types';

/**
 * §3.1 — State Strip: one wrapping row of mono chips answering "what is today
 * configured as". No cards, no charts, no colour-only meaning; every chip
 * carries a glyph and a text label.
 *
 * This is where `today-phase-mode` and `today-budget` live (§21.1 — both were
 * re-homed out of the header).
 */
export interface StateStripProps {
  phaseName: string;
  mode: PlacementMode;
  /** `todayCheckIn.availableMinutes / 60`, fallback 3 (§3.1, source unchanged). */
  budgetHours: number;
  energyLevel: string;
  isPlanCommitted: boolean;
  assignmentCount: number;
  isDaySealed: boolean;
  /** `HH:MM` read from the sealed check-in, when the day is sealed. */
  sealedAt?: string | null;
}

const modeLabel = (mode: PlacementMode) => mode.replace('_', ' ');

export const StateStrip: React.FC<StateStripProps> = ({
  phaseName,
  mode,
  budgetHours,
  energyLevel,
  isPlanCommitted,
  assignmentCount,
  isDaySealed,
  sealedAt,
}) => (
  <TodaySection section="state" mobileOrder={2} data-testid="state-strip">
    <SectionHeading>Day state</SectionHeading>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {/* phase + mode chip group */}
      <span className="inline-flex items-center gap-2" data-guide-target="today-phase-mode">
        <MonoChip>
          <Compass className="size-3" aria-hidden="true" />
          {phaseName}
        </MonoChip>
        <MonoChip tone="accent" title={`${modeLabel(mode)} placement mode`}>
          {modeLabel(mode)} mode
        </MonoChip>
      </span>

      <MonoChip data-guide-target="today-budget" title="Time budget available today">
        <Sun className="size-3" aria-hidden="true" />
        {budgetHours}h available
      </MonoChip>

      <MonoChip title="Energy selected at planning time">
        <BatteryMedium className="size-3" aria-hidden="true" />
        {energyLevel}
      </MonoChip>

      <MonoChip tone={isPlanCommitted ? 'success' : 'neutral'} title="Today's plan status">
        <CalendarCheck className="size-3" aria-hidden="true" />
        {isPlanCommitted ? `Plan committed · ${assignmentCount}` : 'No plan yet'}
      </MonoChip>

      <MonoChip tone={isDaySealed ? 'success' : 'neutral'} title="Day lifecycle status">
        <Lock className="size-3" aria-hidden="true" />
        {isDaySealed ? `Day sealed ${sealedAt ?? ''}`.trim() : 'Day open'}
      </MonoChip>
    </div>
  </TodaySection>
);
