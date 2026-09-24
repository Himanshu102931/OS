import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { Settings, Database, HardDrive, Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Settings className="size-3.5" />
          <span>System & Data Management</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-1">PlacementOS Configuration</h2>
        <p className="text-sm text-slate-400 mt-1">
          Local storage persistence status, backup/restore features, and system architecture parameters.
        </p>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
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

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Storage Adapter & Backup Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <HardDrive className="size-5 text-blue-400" />
            Persistence & Backup
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Persistence Adapter</span>
              <span className="font-mono text-emerald-400 font-bold">LocalStorage (v1.0.0)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Storage Usage</span>
              <span className="font-mono text-slate-200">{formattedKB} KB</span>
            </div>
            <div className="flex justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Browser Local Date</span>
              <span className="font-mono text-amber-400">{todayDate}</span>
            </div>
          </div>

          {/* Backup / Export Buttons */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Backup Tools</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-xs border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200"
              >
                <Download className="size-3.5 mr-1 text-blue-400" /> Export Backup
              </Button>

              <label className="cursor-pointer inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-3 h-8 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors">
                <Upload className="size-3.5 mr-1 text-emerald-400" /> Import Backup
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Reset & Danger Zone */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <RotateCcw className="size-5 text-rose-400" />
            Reset Application Data
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            Resetting clears custom task states, DSA Leitner box progress, and reverts PlacementOS to baseline seed data.
          </p>

          {!showConfirmReset ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirmReset(true)}
              className="text-xs bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900"
            >
              Reset to Baseline Defaults
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <AlertTriangle className="size-4 text-rose-400" />
                Confirm Reset Application Data?
              </div>
              <p className="text-[11px] text-rose-200/80">
                This action will reset local task progress to initial state. Are you sure?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={handleConfirmReset}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Yes, Reset Data
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowConfirmReset(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Inventory */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <Database className="size-5 text-emerald-400" />
          Seeded Entity Inventory
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Task Definitions</span>
            <span className="text-lg font-bold font-mono text-blue-400">{taskDefinitions.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">DSA Problems</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{dsaProblems.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Company Overlays</span>
            <span className="text-lg font-bold font-mono text-amber-400">{companyOverlays.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Core Domains</span>
            <span className="text-lg font-bold font-mono text-purple-400">11</span>
          </div>
        </div>
      </div>
    </div>
  );
};
