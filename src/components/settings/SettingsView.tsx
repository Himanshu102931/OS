import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { ConfirmFullResetModal } from './ConfirmFullResetModal';
import type { PlacementMode } from '../../types';
import {
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  User,
  Brain,
  Palette,
  Bell,
  HelpCircle,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { Button } from '../ui/button';

export const SettingsView: React.FC = () => {
  const {
    todayDate,
    taskDefinitions,
    dsaProblems,
    companyOverlays,
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
    <div className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Sliders className="size-5 text-[#FFC665]" />
            SETTINGS & OPERATIONAL PARAMETERS
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Real runtime configuration for PlacementOS adaptive engine, profile, storage, and appearance
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-[4px] bg-[#14171D] border border-[#262D38] text-[#8E98A8]">
            Storage: <span className="text-[#FFC665] font-bold">{formattedKB} KB</span>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {saveNotification && (
        <div className="p-3 rounded-[4px] bg-[#4EAE79]/15 border border-[#4EAE79]/40 text-[#4EAE79] text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {importStatus && (
        <div
          className={`p-3 rounded-[4px] border text-xs flex items-center justify-between ${
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
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <User className="size-4 text-[#FFC665]" /> Profile & Placement Horizon Configuration
          </h2>
          <span className="text-[10px] text-[#8E98A8]">Operational Goal</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Target Goal */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-semibold">Target Role Goal</label>
            <input
              type="text"
              value={userSettings.targetPlacementGoal}
              onChange={(e) => {
                updateUserSettings({ targetPlacementGoal: e.target.value });
                triggerSaveNotify('Target role goal updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-[4px] p-2.5 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
              placeholder="e.g. Software Engineer (SDE-1)"
            />
          </div>

          {/* Placement Horizon Date */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-semibold">Placement Drive Horizon Date</label>
            <input
              type="date"
              value={userSettings.placementHorizonDate}
              onChange={(e) => {
                updateUserSettings({ placementHorizonDate: e.target.value });
                triggerSaveNotify('Placement horizon date updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-[4px] p-2.5 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
            />
          </div>

          {/* Target Focus Phase */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-semibold">Target Focus Phase</label>
            <select
              value={userSettings.targetPhaseId}
              onChange={(e) => {
                updateUserSettings({ targetPhaseId: e.target.value });
                triggerSaveNotify('Target phase updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-[4px] p-2.5 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
            >
              <option value="phase-1">Phase 1: Foundations & Early Skills</option>
              <option value="phase-2">Phase 2: Advanced Topics & CS Deep-Dive</option>
              <option value="phase-3">Phase 3: Intensive Mock Drills & OAs</option>
              <option value="phase-4">Phase 4: Placement Sprint & Drives</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-[#1B2028] rounded-[4px] border border-[#262D38] text-[11px] text-[#8E98A8] flex items-start gap-2">
          <HelpCircle className="size-3.5 text-[#FFC665] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F1F5F9]">What does this affect?</strong> Sets the target drive completion timeline, role priority weighting for target company overlays, and focus phase boundaries across the application.
          </span>
        </div>
      </section>

      {/* Section 2: Learning & Adaptive Engine Parameters */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Brain className="size-4 text-[#FFC665]" /> Learning & Adaptive Engine Parameters
          </h2>
          <span className="text-[10px] text-[#8E98A8]">Deterministic Scoring Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Daily Study Budget */}
          <div className="space-y-1.5 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
            <div className="flex justify-between items-center">
              <label className="text-[#8E98A8] block font-semibold">Daily Study Target</label>
              <span className="font-bold text-[#FFC665]">{userSettings.dailyStudyMinutes} mins</span>
            </div>
            <input
              type="range"
              min={30}
              max={480}
              step={15}
              value={userSettings.dailyStudyMinutes}
              onChange={(e) => {
                updateUserSettings({ dailyStudyMinutes: Number(e.target.value) });
                triggerSaveNotify('Daily study budget updated');
              }}
              className="w-full accent-[#E5A93C] cursor-pointer mt-2"
            />
            <span className="text-[10px] text-[#8E98A8] block pt-1">
              ({(userSettings.dailyStudyMinutes / 60).toFixed(1)} hours/day)
            </span>
          </div>

          {/* DSA Daily Problem Cap */}
          <div className="space-y-1.5 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
            <div className="flex justify-between items-center">
              <label className="text-[#8E98A8] block font-semibold">DSA Daily Problem Cap</label>
              <span className="font-bold text-[#FFC665]">{userSettings.dsaDailyCap} problems</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={userSettings.dsaDailyCap}
              onChange={(e) => {
                updateUserSettings({ dsaDailyCap: Number(e.target.value) });
                triggerSaveNotify('DSA daily cap updated');
              }}
              className="w-full accent-[#E5A93C] cursor-pointer mt-2"
            />
            <span className="text-[10px] text-[#8E98A8] block pt-1">
              Max new & review problems per daily plan
            </span>
          </div>

          {/* Operational Mode */}
          <div className="space-y-1.5 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
            <label className="text-[#8E98A8] block font-semibold">Operational Mode</label>
            <select
              value={userSettings.placementMode}
              onChange={(e) => {
                updateUserSettings({ placementMode: e.target.value as PlacementMode });
                triggerSaveNotify('Operational mode updated');
              }}
              className="w-full bg-[#14171D] border border-[#262D38] rounded-[4px] p-2 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
            >
              <option value="normal">Normal (Standard 100% budget)</option>
              <option value="reduced">Reduced Workload (50% budget)</option>
              <option value="exam">Exam Mode (30% budget)</option>
              <option value="placement_sprint">Placement Sprint (1.5x company weight)</option>
            </select>
            <span className="text-[10px] text-[#8E98A8] block pt-1">
              Adjusts time allocation & urgency weights
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#1B2028] rounded-[4px] border border-[#262D38] text-[11px] text-[#8E98A8] flex items-start gap-2">
          <HelpCircle className="size-3.5 text-[#FFC665] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F1F5F9]">What does this affect?</strong> Directly controls time budget allocation during Today daily plan generation, caps daily DSA review schedules in Leitner box transitions, and dynamically scales priority weights in the Adaptive Engine.
          </span>
        </div>
      </section>

      {/* Section 3: Appearance & Display Preferences */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Palette className="size-4 text-[#FFC665]" /> Appearance & UI Display Preferences
          </h2>
          <span className="text-[10px] text-[#8E98A8]">UI Styling & Density</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Theme Selector */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-semibold">Interface Theme</label>
            <select
              value={userSettings.theme}
              onChange={(e) => {
                updateUserSettings({ theme: e.target.value as 'dark' | 'high_contrast' | 'slate_dark' });
                triggerSaveNotify('Interface theme updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-[4px] p-2.5 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
            >
              <option value="dark">Stitch Dark (Default Charcoal)</option>
              <option value="high_contrast">High Contrast (Crisp Visibility)</option>
              <option value="slate_dark">Slate Dark (Cool Slate Tones)</option>
            </select>
          </div>

          {/* Visual Density Mode */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] block font-semibold">Visual Density</label>
            <select
              value={userSettings.densityMode}
              onChange={(e) => {
                updateUserSettings({ densityMode: e.target.value as 'compact' | 'comfortable' });
                triggerSaveNotify('Visual density mode updated');
              }}
              className="w-full bg-[#1B2028] border border-[#262D38] rounded-[4px] p-2.5 text-[#F1F5F9] focus:outline-none focus:border-[#3B4556]"
            >
              <option value="compact">Compact (Dense Developer Mode)</option>
              <option value="comfortable">Comfortable (Relaxed Spacing)</option>
            </select>
          </div>

          {/* Show Explanatory Tooltips */}
          <div className="space-y-1.5 flex items-center justify-between p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
            <div>
              <label className="text-[#F1F5F9] block font-semibold">Explanatory Tooltips</label>
              <span className="text-[10px] text-[#8E98A8]">Show helper text & badges</span>
            </div>
            <input
              type="checkbox"
              checked={userSettings.showExplanationTooltips}
              onChange={(e) => {
                updateUserSettings({ showExplanationTooltips: e.target.checked });
                triggerSaveNotify('Tooltip preference updated');
              }}
              className="accent-[#E5A93C] size-4 cursor-pointer"
            />
          </div>
        </div>

        <div className="p-3 bg-[#1B2028] rounded-[4px] border border-[#262D38] text-[11px] text-[#8E98A8] flex items-start gap-2">
          <HelpCircle className="size-3.5 text-[#FFC665] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F1F5F9]">What does this affect?</strong> Updates DOM root attributes (<code className="text-[#FFC665]">data-theme</code> and <code className="text-[#FFC665]">data-density</code>) to adjust color contrast, border visibility, element padding, and inline helper badges across all pages.
          </span>
        </div>
      </section>

      {/* Section 4: Notifications & Reminders */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#262D38] pb-3">
          <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
            <Bell className="size-4 text-[#FFC665]" /> Notifications & Reminders
          </h2>
          <span className="text-[10px] text-[#8E98A8]">Daily Execution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 flex items-center justify-between p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
            <div>
              <label className="text-[#F1F5F9] block font-semibold">Daily Check-In Reminders</label>
              <span className="text-[10px] text-[#8E98A8]">Prompt sealing of daily plan execution</span>
            </div>
            <input
              type="checkbox"
              checked={userSettings.dailyCheckInReminder}
              onChange={(e) => {
                updateUserSettings({ dailyCheckInReminder: e.target.checked });
                triggerSaveNotify('Reminder setting updated');
              }}
              className="accent-[#E5A93C] size-4 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between">
            <div>
              <label className="text-[#F1F5F9] block font-semibold">Daily Reminder Time</label>
              <span className="text-[10px] text-[#8E98A8]">Preferred prompt time (HH:mm)</span>
            </div>
            <input
              type="time"
              value={userSettings.reminderTime}
              onChange={(e) => {
                updateUserSettings({ reminderTime: e.target.value });
                triggerSaveNotify('Reminder time updated');
              }}
              className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-1.5 text-[#F1F5F9] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Section 5: Curriculum Entity Inventory */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
          <Database className="size-4 text-[#FFC665]" /> Curriculum Entity Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#8E98A8] text-[10px] block uppercase tracking-wider">Task Definitions</span>
            <span className="font-bold text-sm text-[#F1F5F9]">{taskDefinitions.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#8E98A8] text-[10px] block uppercase tracking-wider">DSA Problems</span>
            <span className="font-bold text-sm text-[#FFC665]">{dsaProblems.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#8E98A8] text-[10px] block uppercase tracking-wider">Target Companies</span>
            <span className="font-bold text-sm text-[#F1F5F9]">{companyOverlays.length}</span>
          </div>
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <span className="text-[#8E98A8] text-[10px] block uppercase tracking-wider">Core CS Domains</span>
            <span className="font-bold text-sm text-[#4EAE79]">11</span>
          </div>
        </div>
      </section>

      {/* Section 6: Data & Storage Persistence */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-5 space-y-4 shadow-sm">
        <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="size-4 text-[#FFC665]" /> Data & Storage Persistence
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Storage Engine</span>
            <span className="text-[#FFC665]">LocalStorage (Schema v1.0.0)</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Payload Size</span>
            <span className="text-[#F1F5F9]">{formattedKB} KB</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
            <span className="text-[#8E98A8]">Active Operational Date</span>
            <span className="text-[#F1F5F9]">{todayDate}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#262D38] flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={handleExport}
            className="h-8 text-xs bg-[#1B2028] hover:bg-[#262D38] text-[#F1F5F9] border border-[#262D38] px-3 rounded-[4px]"
          >
            <Download className="size-3.5 mr-1.5 text-[#FFC665]" /> Export JSON Backup
          </Button>

          <label className="cursor-pointer inline-flex items-center justify-center rounded-[4px] border border-[#262D38] bg-[#1B2028] px-3 h-8 text-xs text-[#F1F5F9] hover:bg-[#262D38] transition-colors">
            <Upload className="size-3.5 mr-1.5 text-[#4EAE79]" /> Import JSON Backup
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </section>

      {/* Section 7: Operational Reset Protocols */}
      <section className="bg-[#14171D] border border-rose-900/60 rounded-[4px] p-5 space-y-4 border-l-4 border-l-rose-500 shadow-sm">
        <h2 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="size-4" /> Reset Protocols & Safeguards
        </h2>

        <p className="text-xs text-[#8E98A8] leading-relaxed">
          Operational controls to reset application settings or perform a full factory reset. Destructive actions require explicit verification.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Protocol A: Reset Config Only */}
          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-2.5">
            <div>
              <h3 className="font-bold text-[#F1F5F9]">Reset Configuration Only</h3>
              <p className="text-[11px] text-[#8E98A8] mt-0.5">
                Restores settings & preferences to baseline defaults. Keeps all DSA Leitner boxes, task progress, and attempt history intact.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetConfigOnly}
              className="h-8 text-xs border-[#262D38] text-[#F1F5F9] hover:bg-[#262D38] rounded-[4px]"
            >
              Reset Settings Only
            </Button>
          </div>

          {/* Protocol B: Full Reset Application Data */}
          <div className="p-3.5 bg-rose-950/30 border border-rose-900/60 rounded-[4px] space-y-2.5">
            <div>
              <h3 className="font-bold text-rose-300">Full Reset Application Data</h3>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Erases all custom progress, postponements, and practice history. Restores clean seed state. Requires typed confirmation.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowFullResetModal(true)}
              className="h-8 text-xs bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 rounded-[4px]"
            >
              Full Reset Application Data
            </Button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      <ConfirmFullResetModal
        isOpen={showFullResetModal}
        onClose={() => setShowFullResetModal(false)}
        onConfirmReset={handleFullResetConfirmed}
      />
    </div>
  );
};
