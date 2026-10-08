import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { AssessmentAttempt } from '../../types';

interface AssessmentSubmitModalProps {
  isOpen: boolean;
  attempt?: AssessmentAttempt;
  answeredCount: number;
  totalCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AssessmentSubmitModal: React.FC<AssessmentSubmitModalProps> = ({
  isOpen,
  attempt,
  answeredCount,
  totalCount,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const isWeekly = attempt?.kind === 'weekly_assessment';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="bg-surface-panel border border-border rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 text-action-accent">
          <div className="size-9 rounded-full bg-action-accent/15 border border-action-accent/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-action-accent" aria-hidden="true" />
          </div>
          <div>
            <h3 id="submit-modal-title" className="text-base font-bold text-foreground">
              {isWeekly ? 'Submit Sunday Adaptive Test?' : 'Submit Baseline Assessment?'}
            </h3>
            <span className="text-xs text-muted-foreground">Final assessment validation</span>
          </div>
        </div>

        {/* Statistics & Warnings */}
        <div className="space-y-3 text-xs text-foreground">
          <div className="p-3 bg-surface-elevated rounded border border-border flex items-center justify-between">
            <span className="text-muted-foreground">Questions Answered:</span>
            <span className="font-mono font-bold text-success">
              {answeredCount} / {totalCount}
            </span>
          </div>

          {unansweredCount > 0 && (
            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                <span>{unansweredCount} Unanswered Questions</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Unanswered questions receive 0 credit and will be recorded as timing/speed signals for your adaptive plan.
              </p>
            </div>
          )}

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {isWeekly
              ? 'Once submitted, your Sunday calibration results and weakness signal updates will be permanently calculated and sealed to local storage.'
              : 'Once submitted, your baseline capability profile and domain levels (0–5) will be permanently calculated and sealed to local storage.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-xs font-medium bg-surface-elevated text-foreground border border-border hover:bg-border transition-colors cursor-pointer"
          >
            Continue Assessment
          </button>

          <button
            type="button"
            data-testid="confirm-submit-btn"
            onClick={onConfirm}
            className="px-4.5 py-2 rounded text-xs font-bold bg-action-accent text-action-accent-foreground hover:bg-action-accent-hover transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>Confirm &amp; Submit</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
