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
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Settings & Configuration
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Local storage persistence status, data backups, and application reset
        </p>
      </div>

      {importStatus && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between ${
            importStatus.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <span>{importStatus.message}</span>
          <button onClick={() => setImportStatus(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Storage & Backup Section */}
      <section className="app-surface p-4 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <HardDrive className="size-3.5 text-indigo-400" /> Data & Storage Persistence
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 px-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Adapter</span>
            <span className="font-mono text-zinc-200">LocalStorage (v1.0.0)</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Storage Usage</span>
            <span className="font-mono text-zinc-200">{formattedKB} KB</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Today Date</span>
            <span className="font-mono text-zinc-200">{todayDate}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExport}
            className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 px-3"
          >
            <Download className="size-3.5 mr-1.5 text-indigo-400" /> Export JSON Backup
          </Button>

          <label className="cursor-pointer inline-flex items-center justify-center rounded border border-zinc-700/80 bg-zinc-800 px-3 h-8 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors">
            <Upload className="size-3.5 mr-1.5 text-emerald-400" /> Import JSON Backup
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </section>

      {/* Entity Inventory */}
      <section className="app-surface p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Curriculum Entity Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Task Definitions</span>
            <span className="font-mono font-semibold text-zinc-200">{taskDefinitions.length}</span>
          </div>
          <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">DSA Problems</span>
            <span className="font-mono font-semibold text-zinc-200">{dsaProblems.length}</span>
          </div>
          <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Target Companies</span>
            <span className="font-mono font-semibold text-zinc-200">{companyOverlays.length}</span>
          </div>
          <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[11px] block">Core Domains</span>
            <span className="font-mono font-semibold text-zinc-200">11</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="app-surface p-4 space-y-3 border-l-4 border-l-rose-500">
        <h2 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="size-3.5" /> Danger Zone
        </h2>

        <p className="text-xs text-zinc-400">
          Resetting clears all custom progress, postponements, and attempts, restoring the application state to default seed data.
        </p>

        {!showConfirmReset ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowConfirmReset(true)}
            className="h-8 text-xs bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 px-3"
          >
            Reset Application Data
          </Button>
        ) : (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-rose-300">
              <AlertTriangle className="size-3.5" /> Are you sure you want to reset all data?
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="xs"
                variant="destructive"
                onClick={handleConfirmReset}
                className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-2.5"
              >
                Yes, Reset
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowConfirmReset(false)}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
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
