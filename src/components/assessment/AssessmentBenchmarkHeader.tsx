import React from 'react';
import { Target, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import type { AssessmentAttempt } from '../../types';
import type { AssessmentProfileReadout } from '../../engine/assessmentEngine';

interface AssessmentBenchmarkHeaderProps {
  latestCompletedAttempt?: AssessmentAttempt;
  profileReadout: AssessmentProfileReadout;
  readoutTab: 'baseline' | 'weekly';
  onTabChange: (tab: 'baseline' | 'weekly') => void;
  completedWeeklyCount: number;
  pendingSundayObligation: boolean;
  onContinueToToday: () => void;
}

export const AssessmentBenchmarkHeader: React.FC<AssessmentBenchmarkHeaderProps> = ({
  latestCompletedAttempt,
  profileReadout,
  readoutTab,
  onTabChange,
  completedWeeklyCount,
  pendingSundayObligation,
  onContinueToToday,
}) => {
  const { overallAbility, assessedDomainsCount, weaknesses } = profileReadout;

  const dateFormatted = latestCompletedAttempt
    ? new Date(latestCompletedAttempt.endedAt || latestCompletedAttempt.startedAt).toLocaleString()
    : 'Authoritative Baseline';

  return (
    <header className="space-y-6" aria-label="Diagnostic Benchmark Header">
      {/* Sub-Tab Switcher */}
      <div
        role="tablist"
        aria-label="Assessment Readout Sub-Tabs"
        className="flex items-center gap-2 border-b border-border pb-2"
      >
        <button
          role="tab"
          id="tab-baseline"
          aria-selected={readoutTab === 'baseline'}
          aria-controls="panel-baseline"
          onClick={() => onTabChange('baseline')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            readoutTab === 'baseline'
              ? 'bg-action-accent text-action-accent-foreground'
              : 'bg-surface-panel text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Target className="size-3.5" aria-hidden="true" />
          <span>Baseline Diagnostic Profile</span>
        </button>

        <button
          role="tab"
          id="tab-weekly"
          aria-selected={readoutTab === 'weekly'}
          aria-controls="panel-weekly"
          onClick={() => onTabChange('weekly')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            readoutTab === 'weekly'
              ? 'bg-action-accent text-action-accent-foreground'
              : 'bg-surface-panel text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Clock className="size-3.5" aria-hidden="true" />
          <span>Sunday Adaptive Mini-Tests ({completedWeeklyCount})</span>
          {pendingSundayObligation && (
            <span
              className="size-2 rounded-full bg-amber-400 animate-pulse"
              title="Sunday calibration test pending"
              aria-label="Pending calibration obligation"
            />
          )}
        </button>
      </div>

      {readoutTab === 'baseline' && (
        <div
          data-testid="assessment-benchmark-banner"
          className="diagnostic-sweep relative bg-surface-panel border border-border rounded-lg p-6 sm:p-8 space-y-4 shadow-sm overflow-hidden"
        >
          {/* Subtle diagnostic signal sweep accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-action-accent/60 to-transparent" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-success/20 text-success border border-success/40 flex items-center gap-1">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  <span>
                    {latestCompletedAttempt?.status === 'auto_submitted'
                      ? 'Auto-Submitted (180m Limit)'
                      : 'Diagnostic Completed & Sealed'}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Attempt: {latestCompletedAttempt?.id || 'baseline'}
                </span>
                <span className="text-[10px] font-mono text-secondary">
                  PlacementOS Benchmark v1.0 · Post-Assessment Readout
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Baseline Diagnostic Capability Readout
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Completed on {dateFormatted} · {assessedDomainsCount} Assessed Domains · Authoritative Placement Baseline (Phase D)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                data-testid="continue-to-today-btn"
                onClick={onContinueToToday}
                className="px-4.5 py-2.5 rounded text-xs font-semibold bg-action-accent text-action-accent-foreground hover:bg-action-accent-hover flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <span>Continue to Today&apos;s Session</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/80 text-xs">
            <div className="bg-surface-elevated p-3 rounded border border-border">
              <div className="text-muted-foreground text-[11px]">Domains Assessed</div>
              <div className="text-base font-bold text-foreground mt-0.5">
                {assessedDomainsCount} / 11
              </div>
              <div className="text-[10px] text-secondary">Projects excluded</div>
            </div>

            <div className="bg-surface-elevated p-3 rounded border border-border">
              <div className="text-muted-foreground text-[11px]">Overall Capability Ability</div>
              <div className="text-base font-bold text-action-accent mt-0.5">
                {overallAbility}
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <div className="text-[10px] text-secondary">Chance-corrected ability</div>
            </div>

            <div className="bg-surface-elevated p-3 rounded border border-border">
              <div className="text-muted-foreground text-[11px]">Identified Weaknesses</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {weaknesses.length}
              </div>
              <div className="text-[10px] text-secondary">Signals for planner</div>
            </div>

            <div className="bg-surface-elevated p-3 rounded border border-border">
              <div className="text-muted-foreground text-[11px]">Evidence Source</div>
              <div className="text-base font-bold text-info mt-0.5 font-mono">
                sourceType: &apos;test&apos;
              </div>
              <div className="text-[10px] text-secondary">Deterministic rungs</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};