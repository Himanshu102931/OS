import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { HardDrive, Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

export const SettingsView: React.FC = () => {
  const {
    todayDate,
    taskDefinitions,
    dsaProblems,
    companyOverlays,
    exportBackupJSON,
    importBackupJSON,
    resetApplicationData,
    storageBytes,
  } = usePlacement();

  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleExport = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placementos-backup-${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importBackupJSON(content);
      if (result.success) {
        setImportStatus({ message: 'Backup successfully restored!', isError: false });
      } else {
        setImportStatus({ message: result.error || 'Import failed.', isError: true });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    resetApplicationData();
    setShowConfirmReset(false);
    setImportStatus({ message: 'Application state reset to baseline defaults.', isError: false });
  };

  const formattedKB = (storageBytes / 1024).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#262D38]">
        <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2 font-mono">
          <HardDrive className="size-5 text-[#FFC665]" />
          SETTINGS & LOCAL CONFIGURATION
        </h1>
        <p className="text-xs text-[#8E98A8] mt-1">
          Local storage persistence status, JSON state backup/restoration, and deterministic state reset
        </p>
      </div>

      {importStatus && (
        <div
          className={`p-3 rounded-[4px] border text-xs flex items-center justify-between font-mono ${
            importStatus.isError
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <span>{importStatus.message}</span>
          <button onClick={() => setImportStatus(null)} className="underline ml-4 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage & Backup Section */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-4 space-y-4">
        <h2 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider font-mono flex items-center gap-2">
          <HardDrive className="size-3.5 text-[#FFC665]" /> Data & Storage Persistence
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Storage Engine</span>
            <span className="font-mono text-[#FFC665]">LocalStorage (v1.0.0)</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Payload Size</span>
            <span className="font-mono text-[#F1F5F9]">{formattedKB} KB</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Active Operational Date</span>
            <span className="font-mono text-[#F1F5F9]">{todayDate}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#262D38] flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleExport}
            className="h-8 text-xs bg-[#1B2028] hover:bg-[#262D38] text-[#F1F5F9] border border-[#262D38] px-3 rounded-[4px] font-mono"
          >
            <Download className="size-3.5 mr-1.5 text-[#FFC665]" /> Export JSON Backup
          </Button>

          <label className="cursor-pointer inline-flex items-center justify-center rounded-[4px] border border-[#262D38] bg-[#1B2028] px-3 h-8 text-xs font-mono text-[#F1F5F9] hover:bg-[#262D38] transition-colors">
            <Upload className="size-3.5 mr-1.5 text-emerald-400" /> Import JSON Backup
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </section>

      {/* Entity Inventory */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-4 space-y-3">
        <h2 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider font-mono">
          Curriculum Entity Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#5C6675] text-[10px] block uppercase tracking-wider">Task Definitions</span>
            <span className="font-bold text-sm text-[#F1F5F9]">{taskDefinitions.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#5C6675] text-[10px] block uppercase tracking-wider">DSA Problems</span>
            <span className="font-bold text-sm text-[#FFC665]">{dsaProblems.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#5C6675] text-[10px] block uppercase tracking-wider">Target Companies</span>
            <span className="font-bold text-sm text-[#F1F5F9]">{companyOverlays.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#5C6675] text-[10px] block uppercase tracking-wider">Core Domains</span>
            <span className="font-bold text-sm text-emerald-400">11</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-[#14171D] border border-rose-900/60 rounded-[4px] p-4 space-y-3 border-l-4 border-l-rose-500">
        <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <RotateCcw className="size-3.5" /> Reset Protocol
        </h2>

        <p className="text-xs text-[#8E98A8]">
          Resetting clears all custom progress, postponements, and attempt logs, restoring application state to baseline seed data.
        </p>

        {!showConfirmReset ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowConfirmReset(true)}
            className="h-8 text-xs bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 px-3 rounded-[4px] font-mono"
          >
            Reset Application Data
          </Button>
        ) : (
          <div className="p-3 rounded-[4px] bg-rose-950/40 border border-rose-800/80 space-y-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 font-semibold text-rose-300">
              <AlertTriangle className="size-3.5" /> Are you sure you want to reset all data?
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="xs"
                variant="destructive"
                onClick={handleConfirmReset}
                className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-2.5 rounded-[4px]"
              >
                Yes, Reset
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowConfirmReset(false)}
                className="h-7 text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
