import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface DangerZoneSectionProps {
  onOpenFullResetModal: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({ onOpenFullResetModal }) => {
  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="bg-status-danger/5 border border-status-danger/30 rounded-[4px] p-5 sm:p-6 space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-status-danger/20 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-status-danger/15 border border-status-danger/40 flex items-center justify-center text-status-danger">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <h2 id="danger-zone-heading" className="text-sm font-bold text-status-danger flex items-center gap-2">
              Danger Zone — Full Application Data Reset
            </h2>
            <p className="text-[11px] text-status-danger/80">
              Irreversible factory wipeout returning all state to fresh clean seed baseline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-status-danger/20 border border-status-danger/40 text-status-danger text-[11px] font-bold font-mono">
          <AlertTriangle className="size-3" />
          <span>High Risk</span>
        </div>
      </div>

      {/* Row with explanation and trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <p className="text-xs text-text-primary font-medium">
            Permanently clear local storage and restore default seed data
          </p>
          <p className="text-[11px] text-text-secondary max-w-xl leading-relaxed">
            Destroys all DSA Leitner review intervals, roadmap task completions, daily check-in streaks, custom task definitions, and evidence logs. This action cannot be undone unless you have an exported JSON backup.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onOpenFullResetModal}
          className="text-xs font-bold bg-status-danger/40 hover:bg-status-danger/50 text-status-danger border border-status-danger/40 rounded-[4px] h-9 px-4 shrink-0 transition-colors shadow-sm cursor-pointer"
        >
          <ShieldAlert className="size-3.5 mr-1.5 text-status-danger" />
          <span>Reset Application Data</span>
        </Button>
      </div>
    </section>
  );
};
