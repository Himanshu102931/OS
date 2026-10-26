import React, { useState, useEffect } from 'react';
import { Target, ArrowRight, PlayCircle } from 'lucide-react';

export interface DiagnosticReminderProps {
  onStartDiagnostic: () => void;
  hasInProgressAttempt?: boolean;
}

export const DiagnosticReminder: React.FC<DiagnosticReminderProps> = ({
  onStartDiagnostic,
  hasInProgressAttempt = false,
}) => {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div
      data-testid="diagnostic-reminder"
      role="region"
      aria-label="Baseline Diagnostic Pending Reminder"
      className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-lg border border-danger/40 bg-surface-panel text-text-primary shadow-[0_0_12px_color-mix(in_srgb,var(--danger)_14%,transparent)] transition-all"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="relative flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <span
            className="size-2.5 rounded-full bg-danger"
            style={{
              animation: reducedMotion ? 'none' : 'pulse-dot 2.2s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary">
              {hasInProgressAttempt ? 'Diagnostic In Progress' : 'Baseline Diagnostic Pending'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-danger/15 text-danger border border-danger/35 font-medium uppercase tracking-wider">
              {hasInProgressAttempt ? 'Incomplete Attempt' : 'Priority Action'}
            </span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            {hasInProgressAttempt
              ? 'You have an unfinished baseline diagnostic attempt. Answers persist automatically across reloads, but the 180-minute wall-clock timer continues running. Resume to complete your assessment before time expires.'
              : 'Calibrate your 10-domain capability scores across 84 diagnostic questions (180 min continuous wall-clock limit; answers persist on reload) to unlock personalized priority weights.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartDiagnostic}
        data-testid="start-diagnostic-reminder-btn"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-danger border border-danger/50 bg-danger/10 hover:bg-danger/20 transition-colors whitespace-nowrap self-end sm:self-auto cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger"
      >
        {hasInProgressAttempt ? (
          <>
            <PlayCircle className="size-3.5 text-danger" aria-hidden="true" />
            <span>Resume Diagnostic</span>
          </>
        ) : (
          <>
            <Target className="size-3.5 text-danger" aria-hidden="true" />
            <span>Take Diagnostic</span>
          </>
        )}
        <ArrowRight className="size-3 text-danger" aria-hidden="true" />
      </button>
    </div>
  );
};
