import React, { useRef } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

interface BackupStorageSectionProps {
  todayDate: string;
  storageBytes: number;
  onExport: () => void;
  onImportFile: (file: File) => void;
  importStatus: { message: string; isError: boolean } | null;
  onDismissImportStatus: () => void;
}

export const BackupStorageSection: React.FC<BackupStorageSectionProps> = ({
  todayDate,
  storageBytes,
  onExport,
  onImportFile,
  importStatus,
  onDismissImportStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || fileInputRef.current?.files?.[0];
    if (file) {
      onImportFile(file);
      // Reset input value so re-importing same file triggers change event
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formattedKB = (storageBytes / 1024).toFixed(2);

  return (
    <section
      aria-labelledby="backup-storage-heading"
      className="bg-[#111713] border border-[#28352D] rounded-[4px] p-5 sm:p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#28352D] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-[#161E19] border border-[#28352D] flex items-center justify-center text-[#0EA5E9]">
            <Database className="size-4" />
          </div>
          <div>
            <h2 id="backup-storage-heading" className="text-sm font-semibold text-[#E8F0E9] flex items-center gap-2">
              Data Portability & Backup Safeguards
            </h2>
            <p className="text-[11px] text-[#9AA99F]">
              Export verified JSON snapshots or restore complete study trajectories across browsers and devices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-[#161E19] border border-[#28352D] text-[#86958B] text-[11px] font-mono">
          <span>Schema v1.0.0</span>
        </div>
      </div>

      {/* Import / Export Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Export JSON Button */}
        <Button
          type="button"
          size="sm"
          onClick={onExport}
          className="text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] active:bg-[#0369A1] text-white border border-[#0EA5E9]/50 rounded-[4px] h-9 px-4 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Download className="size-3.5" />
          <span>Export State JSON</span>
        </Button>

        {/* Import JSON File Trigger */}
        <label className="cursor-pointer">
          <span className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-[4px] bg-[#161E19] hover:bg-[#1B241F] text-[#E8F0E9] border border-[#28352D] hover:border-[#46B982]/50 text-xs font-semibold transition-all">
            <Upload className="size-3.5 text-[#46B982]" />
            <span>Import State JSON</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload Backup JSON File"
          />
        </label>
      </div>

      {/* Import Status Alert Banner */}
      {importStatus && (
        <div
          role="alert"
          className={`p-3.5 rounded-[4px] border text-xs flex items-start justify-between gap-3 animate-fade-in ${
            importStatus.isError
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {importStatus.isError ? (
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-400" />
            )}
            <span className="font-medium leading-relaxed">{importStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={onDismissImportStatus}
            className="text-[11px] underline shrink-0 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Storage Diagnostic Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#28352D] text-xs font-mono">
        <div className="p-3 rounded-[4px] bg-[#161E19] border border-[#28352D] space-y-1">
          <span className="text-[10px] text-[#86958B] uppercase block">Storage Key</span>
          <span className="text-[#E8F0E9] font-medium text-[11px]">placementos_v1_state</span>
        </div>
        <div className="p-3 rounded-[4px] bg-[#161E19] border border-[#28352D] space-y-1">
          <span className="text-[10px] text-[#86958B] uppercase block">Active Payload Size</span>
          <span className="text-[#38BDF8] font-bold text-[11px]">{formattedKB} KB</span>
        </div>
        <div className="p-3 rounded-[4px] bg-[#161E19] border border-[#28352D] space-y-1">
          <span className="text-[10px] text-[#86958B] uppercase block">Export Filename</span>
          <span className="text-[#86958B] text-[11px] truncate block">placementos-backup-{todayDate}.json</span>
        </div>
      </div>
    </section>
  );
};
