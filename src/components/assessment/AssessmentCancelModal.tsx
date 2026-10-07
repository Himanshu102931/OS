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
      <div className="bg-[#14171D] border border-[#262D38] rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 text-[#D05A52]">
          <div className="size-9 rounded-full bg-[#D05A52]/15 border border-[#D05A52]/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-[#D05A52]" aria-hidden="true" />
          </div>
          <div>
            <h3 id="cancel-modal-title" className="text-base font-bold text-[#F1F5F9]">
              Cancel Diagnostic Assessment?
            </h3>
            <span className="text-xs text-[#8E98A8]">Assessment cancellation confirmation</span>
          </div>
        </div>

        {/* Statistics & Warnings */}
        <div className="space-y-3 text-xs text-[#CBD5E1]">
          <div className="p-3 bg-[#1B2028] rounded border border-[#262D38] flex items-center justify-between">
            <span className="text-[#8E98A8]">Questions Answered:</span>
            <span className="font-mono font-bold text-[#D05A52]">
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

          <p className="text-[#8E98A8] text-[11px] leading-relaxed">
            Your current assessment attempt will be discarded. No diagnostic score or evidence will be recorded.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#262D38]/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-xs font-medium bg-[#1B2028] text-[#CBD5E1] border border-[#262D38] hover:bg-[#262D38] transition-colors cursor-pointer"
          >
            Keep Assessment
          </button>

          <button
            type="button"
            data-testid="confirm-cancel-btn"
            onClick={onConfirm}
            className="px-4.5 py-2 rounded text-xs font-bold bg-[#D05A52] text-[#F1F5F9] hover:bg-[#B91C1C] transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>Cancel Assessment</span>
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};