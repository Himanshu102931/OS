import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { Button } from '../ui/button';

interface ConfirmFullResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ConfirmFullResetModal: React.FC<ConfirmFullResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = useCallback(() => {
    setConfirmText('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET DATA';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    onConfirmReset();
    setConfirmText('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070B09]/80 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-surface-panel border border-status-danger/80 rounded-[4px] max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default pb-3.5">
          <div className="flex items-center gap-2.5 text-status-danger">
            <div className="size-7 rounded-[4px] bg-status-danger/20 border border-status-danger/50 flex items-center justify-center">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
                Full Application Data Reset
              </h2>
              <span className="text-[10px] text-status-danger font-semibold font-mono">HIGH-RISK IRREVERSIBLE ACTION</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="p-1 rounded-[4px] text-text-tertiary hover:text-text-primary hover:bg-surface-subtle transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-[4px] text-status-danger space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="size-3.5 text-status-danger shrink-0" />
              <span>Warning: Destructive Local State Wipe</span>
            </div>
            <p className="leading-relaxed text-[11px] text-text-secondary">
              This operation will permanently wipe all local database keys and reset PlacementOS to default seed values.
            </p>
          </div>

          <div className="space-y-1.5 text-text-secondary text-[11px] bg-surface-subtle p-3 rounded-[4px] border border-border-default">
            <span className="font-semibold text-text-primary block text-xs">
              The following state will be permanently destroyed:
            </span>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>All DSA Leitner Box progression & practice attempt history</li>
              <li>All Roadmap task completion records, notes, & postponements</li>
              <li>All Daily Check-in records, reflection notes, & evidence logs</li>
              <li>Custom task definitions & target company requirement overlays</li>
              <li>All diagnostic assessment attempts, responses, & exposure records</li>
            </ul>
          </div>

          <p className="text-[11px] text-text-primary">
            To execute this action, type <span className="text-status-danger font-bold font-mono select-all">RESET DATA</span> below:
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              placeholder='Type "RESET DATA"'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-surface-subtle border border-status-danger/30 focus:border-status-danger rounded-[4px] p-2.5 text-xs text-status-danger font-bold font-mono placeholder-text-tertiary focus:outline-none"
              aria-label="Confirm full reset by typing RESET DATA"
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-xs text-text-tertiary hover:text-text-primary hover:bg-surface-subtle rounded-[4px] h-8 px-3.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isConfirmed}
                className={`text-xs font-bold rounded-[4px] h-8 px-3.5 transition-all ${
                  isConfirmed
                    ? 'bg-status-danger hover:bg-status-danger/90 text-white cursor-pointer shadow-sm'
                    : 'bg-surface-subtle text-text-tertiary cursor-not-allowed border border-border-default'
                }`}
              >
                <Check className="size-3.5 mr-1" />
                <span>Execute Full Reset</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
