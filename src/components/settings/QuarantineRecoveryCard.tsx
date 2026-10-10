import React from 'react';
import { ShieldAlert, Download, RotateCcw, Trash2, FileCode, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { QuarantinedStorageSnapshot } from '../../storage/storageAdapter';

interface QuarantineRecoveryCardProps {
  quarantinedSnapshot: QuarantinedStorageSnapshot | null;
  onExport: () => void;
  onRequestRestore: () => void;
  onRequestClear: () => void;
}

export const QuarantineRecoveryCard: React.FC<QuarantineRecoveryCardProps> = ({
  quarantinedSnapshot,
  onExport,
  onRequestRestore,
  onRequestClear,
}) => {
  if (!quarantinedSnapshot) return null;

  const isValidJSON = (() => {
    try {
      const parsed = JSON.parse(quarantinedSnapshot.payload);
      return Boolean(parsed && typeof parsed === 'object');
    } catch {
      return false;
    }
  })();

  const payloadBytes = new Blob([quarantinedSnapshot.payload]).size;
  const payloadKB = (payloadBytes / 1024).toFixed(2);

  return (
    <div
      data-testid="quarantine-recovery-section"
      className="p-5 rounded-[4px] bg-surface-subtle border border-accent/40 space-y-4 font-sans animate-fade-in"
    >
      {/* Header with Alert Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-accent/20 border border-accent/50 flex items-center justify-center text-accent">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Quarantined State Snapshot Detected</span>
            </h3>
            <p className="text-[11px] text-text-secondary">
              A previous local payload failed integrity checks and was preserved in quarantine before defaults were loaded.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-accent/15 border border-accent/40 text-accent text-[11px] font-mono font-semibold">
          <AlertCircle className="size-3" />
          <span>Quarantine Active</span>
        </div>
      </div>

      {/* Snapshot Metadata Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-[4px] bg-surface-panel border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary text-[10px] uppercase">
            <Clock className="size-3" />
            <span>Quarantined At</span>
          </div>
          <span className="text-text-primary text-[11px] block truncate" title={quarantinedSnapshot.quarantinedAt}>
            {quarantinedSnapshot.quarantinedAt}
          </span>
        </div>

        <div className="p-2.5 rounded-[4px] bg-surface-panel border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary text-[10px] uppercase">
            <AlertCircle className="size-3" />
            <span>Integrity Reason</span>
          </div>
          <span className="text-text-primary text-[11px] block truncate" title={quarantinedSnapshot.reason}>
            {quarantinedSnapshot.reason}
          </span>
        </div>

        <div className="p-2.5 rounded-[4px] bg-surface-panel border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary text-[10px] uppercase">
            <FileCode className="size-3" />
            <span>Payload Size</span>
          </div>
          <span className="text-accent font-bold text-[11px] block">
            {payloadKB} KB ({quarantinedSnapshot.payload.length.toLocaleString()} chars)
          </span>
        </div>

        <div className="p-2.5 rounded-[4px] bg-surface-panel border border-border-default space-y-1">
          <div className="flex items-center gap-1.5 text-text-tertiary text-[10px] uppercase">
            {isValidJSON ? <CheckCircle2 className="size-3 text-status-success" /> : <AlertCircle className="size-3 text-status-danger" />}
            <span>JSON Structure</span>
          </div>
          <span className={`text-[11px] font-semibold block ${isValidJSON ? 'text-status-success' : 'text-status-danger'}`}>
            {isValidJSON ? 'Syntactically Valid' : 'Malformed / Parse Error'}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download / Export Quarantined Snapshot */}
          <Button
            type="button"
            size="sm"
            onClick={onExport}
            data-testid="export-quarantine-btn"
            className="text-xs font-semibold bg-accent hover:bg-accent/90 text-[#141C16] rounded-[4px] h-8 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="size-3.5" />
            <span>Export Quarantined File</span>
          </Button>

          {/* Attempt Safe Restore (with validation & modal confirmation) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestRestore}
            data-testid="restore-quarantine-btn"
            disabled={!isValidJSON}
            className={`text-xs font-semibold rounded-[4px] h-8 px-3.5 flex items-center gap-1.5 transition-all ${
              isValidJSON
                ? 'border-border-default hover:border-accent hover:text-accent bg-surface-panel cursor-pointer'
                : 'opacity-50 cursor-not-allowed border-border-default bg-surface-panel text-text-tertiary'
            }`}
          >
            <RotateCcw className="size-3.5 text-accent" />
            <span>Attempt Safe Restore</span>
          </Button>
        </div>

        {/* Dismiss / Clear Quarantine */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRequestClear}
          data-testid="clear-quarantine-btn"
          className="text-xs text-text-tertiary hover:text-status-danger hover:bg-status-danger/10 rounded-[4px] h-8 px-3 flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          <span>Clear Record</span>
        </Button>
      </div>
    </div>
  );
};
