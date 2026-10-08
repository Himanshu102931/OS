import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AssessmentCancelModalProps {
  isOpen: boolean;
  answeredCount: number;
  totalCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AssessmentCancelModal: React.FC<AssessmentCancelModalProps> = ({
  isOpen,
  answeredCount,
  totalCount,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const unansweredCount = Math.max(0, totalCount - answeredCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="bg-surface-panel border border-border rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 text-danger">
          <div className="size-9 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-danger" aria-hidden="true" />
          </div>
          <div>
            <h3 id="cancel-modal-title" className="text-base font-bold text-foreground">
              Cancel Diagnostic Assessment?
            </h3>
            <span className="text-xs text-muted-foreground">Assessment cancellation confirmation</span>
          </div>
        </div>

        {/* Statistics & Warnings */}
        <div className="space-y-3 text-xs text-foreground">
          <div className="p-3 bg-surface-elevated rounded border border-border flex items-center justify-between">
            <span className="text-muted-foreground">Questions Answered:</span>
            <span className="font-mono font-bold text-danger">
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
            Your current assessment attempt will be discarded. No diagnostic score or evidence will be recorded.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-xs font-medium bg-surface-elevated text-foreground border border-border hover:bg-border transition-colors cursor-pointer"
          >
            Keep Assessment
          </button>

          <button
            type="button"
            data-testid="confirm-cancel-btn"
            onClick={onConfirm}
            className="px-4.5 py-2 rounded text-xs font-bold bg-danger text-foreground hover:bg-[#B91C1C] transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>Cancel Assessment</span>
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};