import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { ConfirmFullResetModal } from './ConfirmFullResetModal';
import type { PlacementMode } from '../../types';
import {
  Download,
  Upload,
  RotateCcw,
  User,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { Button } from '../ui/button';

export const SettingsView: React.FC = () => {
  const {
    todayDate,
    userSettings,
    updateUserSettings,
    resetUserSettingsOnly,
    resetApplicationData,
    exportBackupJSON,
    importBackupJSON,
    storageBytes,
  } = usePlacement();

  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [showFullResetModal, setShowFullResetModal] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

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
        setImportStatus({ message: 'Backup JSON state successfully restored!', isError: false });
      } else {
        setImportStatus({ message: result.error || 'Import failed.', isError: true });
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfigOnly = () => {
    resetUserSettingsOnly();
    triggerSaveNotify('Configuration settings restored to baseline defaults.');
  };

  const handleFullResetConfirmed = () => {
    resetApplicationData();
    setImportStatus({ message: 'Full application data reset to baseline defaults.', isError: false });
  };

  const triggerSaveNotify = (msg: string) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const formattedKB = (storageBytes / 1024).toFixed(2);

  return (
    <div className="space-y-6 max-w-6xl xl:max-w-[1300px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Settings & Operational Parameters
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Configure profile goals, adaptive mode defaults, data backups, and storage safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-md bg-[#14171D] border border-[#262D38] text-[#8E98A8]">
            Storage Used: <span className="text-[#FFC665] font-bold font-mono">{formattedKB} KB</span>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {saveNotification && (
        <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {importStatus && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between font-medium ${
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

      {/* Section 1: Profile & Placement Horizon */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
            <User className="size-4 text-[#E5A93C]" /> Profile & Target Goals
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-medium">Target Role Goal</label>
            <input
              type="text"
              value={userSettings.targetPlacementGoal}
              onChange={(e) => {
                updateUserSettings({ targetPlacementGoal: e.target.value });
                triggerSaveNotify('Target role goal updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-md p-2.5 text-[#F1F5F9] focus:outline-none"
              placeholder="e.g. Software Engineer (SDE-1)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-medium">Default Placement Mode</label>
            <select
              value={userSettings.placementMode}
              onChange={(e) => {
                updateUserSettings({ placementMode: e.target.value as PlacementMode });
                triggerSaveNotify('Placement mode updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-md p-2.5 text-[#FFC665] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="normal">Normal Mode (Standard daily load)</option>
              <option value="reduced">Reduced Mode (Light work schedule)</option>
              <option value="exam">Exam Mode (Pause non-essential topics)</option>
              <option value="placement_sprint">Placement Sprint (High priority sprint)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 2: Storage & Backup Management */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
            <Database className="size-4 text-[#E5A93C]" /> Backup & Storage Safeguards
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            size="sm"
            onClick={handleExport}
            className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] rounded-md h-9 px-3.5"
          >
            <Download className="size-3.5 mr-2 text-[#E5A93C]" /> Export State JSON
          </Button>

          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center px-3.5 h-9 rounded-md bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] text-xs font-semibold">
              <Upload className="size-3.5 mr-2 text-[#10B981]" /> Import State JSON
            </span>
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetConfigOnly}
            className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] h-9 px-3 rounded-md"
          >
            <RotateCcw className="size-3.5 mr-1.5" /> Reset Settings Only
          </Button>
        </div>

        <div className="pt-4 border-t border-[#262D38] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-rose-400">Destructive Reset</span>
            <p className="text-[11px] text-[#8E98A8]">Clears all local evidence and resets PlacementOS data to factory defaults.</p>
          </div>

          <Button
            size="sm"
            onClick={() => setShowFullResetModal(true)}
            className="text-xs font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-md h-8 px-3"
          >
            Reset Application Data
          </Button>
        </div>
      </section>

      {/* Confirm Full Reset Modal */}
      <ConfirmFullResetModal
        isOpen={showFullResetModal}
        onClose={() => setShowFullResetModal(false)}
        onConfirmReset={() => {
          handleFullResetConfirmed();
          setShowFullResetModal(false);
        }}
      />
    </div>
  );
};
