import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, X, ShieldAlert, Check, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ConfirmQuarantineActionModalProps {
  isOpen: boolean;
  action: 'restore' | 'clear';
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmQuarantineActionModal: React.FC<ConfirmQuarantineActionModalProps> = ({
  isOpen,
  action,
  onClose,
  onConfirm,
}) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isRestore = action === 'restore';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quarantine-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070B09]/80 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-surface-panel border border-border-default rounded-[4px] max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default pb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-7 rounded-[4px] flex items-center justify-center ${
                isRestore
                  ? 'bg-accent/20 border border-accent/50 text-accent'
                  : 'bg-status-danger/20 border border-status-danger/50 text-status-danger'
              }`}
            >
              {isRestore ? <RotateCcw className="size-4" /> : <ShieldAlert className="size-4" />}
            </div>
            <div>
              <h2
                id="quarantine-modal-title"
                className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono"
              >
                {isRestore ? 'Restore Quarantined Payload' : 'Clear Quarantined Snapshot'}
              </h2>
              <span
                className={`text-[10px] font-semibold font-mono ${
                  isRestore ? 'text-accent' : 'text-status-danger'
                }`}
              >
                {isRestore ? 'VALIDATED STATE OVERWRITE' : 'PERMANENT RECORD REMOVAL'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="p-1 rounded-[4px] text-text-tertiary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Warning & Information */}
        <div className="space-y-4 text-xs">
          <div
            className={`p-3 border rounded-[4px] space-y-1.5 ${
              isRestore
                ? 'bg-accent/10 border-accent/30 text-text-primary'
                : 'bg-status-danger/10 border-status-danger/30 text-status-danger'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{isRestore ? 'Integrity Validation Check' : 'Confirm Record Dismissal'}</span>
            </div>
            <p className="leading-relaxed text-[11px] text-text-secondary">
              {isRestore
                ? 'PlacementOS will validate the quarantined payload against strict schema rules. If valid, your active state will be updated. If validation fails, your current progress remains untouched.'
                : 'This will permanently remove the quarantined snapshot from browser localStorage. Ensure you have exported a copy first if you wish to preserve the raw unreadable payload.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-xs text-text-tertiary hover:text-text-primary hover:bg-surface-subtle rounded-[4px] h-8 px-3.5 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onConfirm();
                handleClose();
              }}
              className={`text-xs font-bold rounded-[4px] h-8 px-3.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                isRestore
                  ? 'bg-accent hover:bg-accent/90 text-[#141C16] shadow-sm'
                  : 'bg-status-danger hover:bg-status-danger/90 text-white shadow-sm'
              }`}
            >
              {isRestore ? (
                <>
                  <Check className="size-3.5" />
                  <span>Execute Safe Restore</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Clear Quarantine</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
