import React from 'react';
import { Play, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';

interface AssessmentLaunchPanelProps {
  onStart: () => void;
  disabled?: boolean;
}

export const AssessmentLaunchPanel: React.FC<AssessmentLaunchPanelProps> = ({
  onStart,
  disabled = false,
}) => {
  return (
    <section
      aria-labelledby="launch-diagnostic-heading"
      className="bg-[#14171D] border-2 border-[#EAB308]/40 rounded-lg p-6 sm:p-7 shadow-lg space-y-5"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Launch Readiness Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#EAB308] animate-pulse" aria-hidden="true" />
            <h2
              id="launch-diagnostic-heading"
              className="text-base sm:text-lg font-bold text-[#F1F5F9] tracking-tight"
            >
              Ready to Establish Your Diagnostic Baseline?
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-[#8E98A8] max-w-2xl leading-relaxed">
            Launching initializes your authoritative baseline attempt across 84 items. Once started, the 180-minute countdown runs continuously. Ensure you are in a quiet environment with a stable power connection.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono text-[#CBD5E1]">
            <span className="flex items-center gap-1.5 text-[#EAB308]">
              <Clock className="size-3.5" aria-hidden="true" />
              <span>180m Total Window</span>
            </span>
            <span className="text-[#5C6675]">·</span>
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>Auto-Saved Responses</span>
            </span>
            <span className="text-[#5C6675]">·</span>
            <span className="flex items-center gap-1.5 text-[#38BDF8]">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>Immutable Final Seal</span>
            </span>
          </div>
        </div>

        {/* Hero Action CTA Button */}
        <div className="shrink-0">
          <Button
            data-testid="start-diagnostic-btn"
            data-subsystem="assessment"
            onClick={onStart}
            disabled={disabled}
            aria-label="Start Baseline Assessment"
            className="w-full sm:w-auto px-8 py-3.5 rounded text-sm font-bold bg-[#EAB308] text-[#0D0F12] hover:bg-[#CA8A04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] transition-all duration-150 ease-out shadow-md hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 min-h-[44px] cursor-pointer"
          >
            <Play className="size-4 fill-current" aria-hidden="true" />
            <span>Start Baseline Assessment</span>
          </Button>
        </div>
      </div>
    </section>
  );
};
