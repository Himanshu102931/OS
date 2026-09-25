import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#14171D] border border-rose-800/80 rounded-[4px] max-w-md w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#262D38] pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="size-5 shrink-0" />
            <h2 className="text-base font-bold text-[#F1F5F9]">FULL APPLICATION RESET</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-rose-950/40 border border-rose-900/80 rounded-[4px] text-rose-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <AlertTriangle className="size-3.5" /> High Risk Destructive Action
            </div>
            <p className="leading-relaxed text-[11px]">
              This action will reset PlacementOS to default seed data. All local progress will be destroyed.
            </p>
          </div>

          <div className="space-y-1 text-[#8E98A8] text-[11px]">
            <span className="font-bold text-[#F1F5F9] block text-xs">What will be permanently erased:</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All DSA Leitner Box states & practice history</li>
              <li>All Roadmap task progress & postponements</li>
              <li>All Daily Check-in records & evidence logs</li>
              <li>Custom task definitions & company targets</li>
            </ul>
          </div>

          <p className="text-[11px] text-[#F1F5F9] pt-1">
            To confirm, type <span className="text-rose-400 font-bold select-all">RESET DATA</span> below:
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder='Type "RESET DATA"'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-[#1B2028] border border-rose-900/60 rounded-[4px] p-2.5 text-xs text-rose-300 font-bold placeholder-[#5C6675] focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262D38]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-[#8E98A8] hover:text-[#F1F5F9]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isConfirmed}
                className={`text-xs font-bold rounded-[4px] ${
                  isConfirmed
                    ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                    : 'bg-[#1B2028] text-[#5C6675] cursor-not-allowed border border-[#262D38]'
                }`}
              >
                <Check className="size-3.5 mr-1" /> Execute Full Reset
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
