import React from 'react';
import { RotateCcw, AlertTriangle, RefreshCw, ClipboardCheck } from 'lucide-react';
import { Button } from '../ui/button';

interface SubsystemMaintenanceSectionProps {
  onResetUserSettings: () => void;
  onResetAssessmentProfile: () => void;
  onResetAssessmentHistory: () => void;
}

export const SubsystemMaintenanceSection: React.FC<SubsystemMaintenanceSectionProps> = ({
  onResetUserSettings,
  onResetAssessmentProfile,
  onResetAssessmentHistory,
}) => {
  return (
    <section
      aria-labelledby="subsystem-maintenance-heading"
      className="bg-surface-panel border border-border-default rounded-[4px] p-5 sm:p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-surface-subtle border border-border-default flex items-center justify-center text-warning">
            <RotateCcw className="size-4" />
          </div>
          <div>
            <h2 id="subsystem-maintenance-heading" className="text-sm font-semibold text-text-primary flex items-center gap-2">
              Scoped Subsystem Maintenance
            </h2>
            <p className="text-[11px] text-text-secondary">
              Granular reset utilities to recalibrate specific modules without wiping core roadmap or DSA progress.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-warning/10 border border-warning/30 text-warning text-[11px] font-medium">
          <AlertTriangle className="size-3" />
          <span>Non-Destructive to Curriculum</span>
        </div>
      </div>

      {/* Granular Reset Items */}
      <div className="space-y-4 divide-y divide-border-default">
        {/* 1. Reset Settings Only */}
        <div className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <RefreshCw className="size-3.5 text-info" />
              <span>Reset Configuration Settings Only</span>
            </span>
            <p className="text-[11px] text-text-secondary max-w-xl leading-relaxed">
              Restores study budget, modes, density, and display preferences to baseline defaults.
              <span className="text-accent font-medium ml-1">
                Preserves all tasks, DSA Leitner states, check-in history, and evidence logs.
              </span>
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onResetUserSettings}
            className="text-xs font-medium bg-surface-subtle hover:bg-surface-elevated text-text-primary border border-border-default hover:border-text-tertiary rounded-[4px] h-8 px-3.5 shrink-0 transition-colors"
          >
            <RotateCcw className="size-3.5 mr-1.5 text-text-tertiary" />
            <span>Reset Settings Only</span>
          </Button>
        </div>

        {/* 2. Reset Assessment Profile Only */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <ClipboardCheck className="size-3.5 text-warning" />
              <span>Reset Assessment Profile Only</span>
            </span>
            <p className="text-[11px] text-text-secondary max-w-xl leading-relaxed">
              Resets calculated domain proficiency levels to 0 and unassessed state.
              <span className="text-accent font-medium ml-1">
                Retains attempt history, item exposures, snapshots, and diagnostic response logs.
              </span>
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onResetAssessmentProfile}
            className="text-xs font-medium bg-surface-subtle hover:bg-surface-elevated text-text-primary border border-border-default hover:border-warning/50 rounded-[4px] h-8 px-3.5 shrink-0 transition-colors"
          >
            <RotateCcw className="size-3.5 mr-1.5 text-warning" />
            <span>Reset Profile Only</span>
          </Button>
        </div>

        {/* 3. Reset Assessment History & Data */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-warning flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-warning" />
              <span>Reset Assessment History & Data</span>
            </span>
            <p className="text-[11px] text-text-secondary max-w-xl leading-relaxed">
              Clears all diagnostic attempts, responses, exposures, and snapshots back to clean unassessed state.
              <span className="text-accent font-medium ml-1">
                Does not touch curriculum roadmap, DSA problem progression, or project logs.
              </span>
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onResetAssessmentHistory}
            className="text-xs font-semibold bg-warning/10 hover:bg-warning/20 text-warning border border-warning/40 rounded-[4px] h-8 px-3.5 shrink-0 transition-colors"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            <span>Reset Assessment History</span>
          </Button>
        </div>
      </div>
    </section>
  );
};
