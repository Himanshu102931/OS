import React, { useEffect } from 'react';
import { Target, ArrowRight, CheckCircle2, Sparkles, X, PlayCircle } from 'lucide-react';

export interface DiagnosticInvitationProps {
  isOpen: boolean;
  onStartDiagnostic: () => void;
  onDismiss: () => void;
  hasInProgressAttempt?: boolean;
}

export const DiagnosticInvitation: React.FC<DiagnosticInvitationProps> = ({
  isOpen,
  onStartDiagnostic,
  onDismiss,
  hasInProgressAttempt = false,
}) => {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-background/80 backdrop-blur-sm motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-modal-title"
      aria-describedby="diagnostic-modal-desc"
    >
      <div
        data-testid="diagnostic-invitation"
        className="relative w-full max-w-xl rounded-xl border border-accent/40 bg-surface-panel p-6 sm:p-7 shadow-2xl transition-all motion-safe:animate-scale-in my-8"
      >
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Top bar with badge and close button */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="size-3 text-accent" aria-hidden="true" />
              {hasInProgressAttempt ? 'Assessment In Progress' : 'Recommended First Step'}
            </span>
            <span className="text-text-tertiary font-mono text-xs">• 84 Questions · 10 Domains</span>
            <span className="text-text-tertiary font-mono text-xs">• 180 min wall-clock limit</span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close diagnostic invitation"
            className="text-text-tertiary hover:text-text-primary p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 relative z-10 pt-2">
          <h2
            id="diagnostic-modal-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary"
          >
            {hasInProgressAttempt
              ? 'Resume Your Baseline Diagnostic'
              : 'Establish Your Baseline with the Placement Diagnostic'}
          </h2>
          <p
            id="diagnostic-modal-desc"
            className="text-xs sm:text-sm text-text-secondary leading-relaxed"
          >
            {hasInProgressAttempt
              ? 'You have an active diagnostic assessment attempt in progress. Recorded answers persist automatically across browser reloads, but the 180-minute wall-clock timer continues running from when you started. Resume to complete your evaluation.'
              : 'Take the comprehensive baseline diagnostic (84 questions across 10 core placement domains, 180-minute continuous wall-clock limit). Your recorded answers persist automatically across reloads, but the clock continues running once started.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-[11px] text-text-secondary">
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <CheckCircle2 className="size-3.5 text-accent shrink-0" />
              <span>0–100 Ability Scores</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <CheckCircle2 className="size-3.5 text-accent shrink-0" />
              <span>Target Learning Gaps</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-surface-canvas border border-border-default">
              <CheckCircle2 className="size-3.5 text-accent shrink-0" />
              <span>No Penalty for Guessing</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border-default relative z-10">
          <button
            type="button"
            onClick={onDismiss}
            data-testid="dismiss-diagnostic-invitation-btn"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-canvas hover:bg-surface-subtle border border-border-default transition-colors cursor-pointer"
          >
            Not Now (Explore First)
          </button>

          <button
            type="button"
            onClick={onStartDiagnostic}
            data-testid="start-diagnostic-invitation-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent/90 transition-colors shadow-md cursor-pointer"
          >
            {hasInProgressAttempt ? (
              <>
                <PlayCircle className="size-4" aria-hidden="true" />
                <span>Resume Diagnostic</span>
              </>
            ) : (
              <>
                <Target className="size-4" aria-hidden="true" />
                <span>Start Diagnostic</span>
              </>
            )}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
