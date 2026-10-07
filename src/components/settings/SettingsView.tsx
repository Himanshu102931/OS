import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { SettingsHeader } from './SettingsHeader';
import { StudyParametersSection } from './StudyParametersSection';
import { DisplayPreferencesSection } from './DisplayPreferencesSection';
import { BackupStorageSection } from './BackupStorageSection';
import { SubsystemMaintenanceSection } from './SubsystemMaintenanceSection';
import { DangerZoneSection } from './DangerZoneSection';
import { ConfirmFullResetModal } from './ConfirmFullResetModal';
import { CheckCircle2 } from 'lucide-react';
import type { UserSettings } from '../../types';

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
    resetAssessmentProfileOnly,
    resetAssessmentHistoryOnly,
    phases,
  } = usePlacement();

  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [showFullResetModal, setShowFullResetModal] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const triggerSaveNotify = (msg: string) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleUpdate = (partial: Partial<UserSettings>, notifyMessage?: string) => {
    updateUserSettings(partial);
    if (notifyMessage) {
      triggerSaveNotify(notifyMessage);
    }
  };

  const handleExport = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placementos-backup-${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerSaveNotify(`Backup exported as placementos-backup-${todayDate}.json`);
  };

  const handleImportFile = async (file: File) => {
    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
      }
      const result = importBackupJSON(content);
      if (result.success) {
        setImportStatus({
          message: 'Backup JSON state successfully restored and validated.',
          isError: false,
        });
      } else {
        setImportStatus({
          message: result.error ? `Import failed: ${result.error}` : 'Import failed schema validation.',
          isError: true,
        });
      }
    } catch (err) {
      setImportStatus({
        message: err instanceof Error ? err.message : 'Failed to read backup file.',
        isError: true,
      });
    }
  };

  const handleResetConfigOnly = () => {
    resetUserSettingsOnly();
    triggerSaveNotify('Configuration settings restored to baseline defaults.');
  };

  const handleResetAssessmentProfile = () => {
    resetAssessmentProfileOnly();
    triggerSaveNotify('Assessment domain profile reset to 0 (history preserved).');
  };

  const handleResetAssessmentHistory = () => {
    resetAssessmentHistoryOnly();
    triggerSaveNotify('Assessment history, attempts, and exposures cleared.');
  };

  const handleFullResetConfirmed = () => {
    resetApplicationData();
    setImportStatus({
      message: 'Full application data reset to default seed baseline.',
      isError: false,
    });
  };

  return (
    <div
      data-testid="settings-view"
      className="settings-container space-y-6 max-w-6xl xl:max-w-[1300px] mx-auto font-sans pb-12"
    >
      {/* Zone 1: Console Header & Storage Footprint Strip */}
      <SettingsHeader storageBytes={storageBytes} />

      {/* Auto-Save Notification Toast */}
      {saveNotification && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-[4px] bg-[#161E19] border border-[#46B982]/50 text-[#46B982] text-xs flex items-center gap-2.5 font-medium animate-fade-in shadow-sm"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Zone 2: Study Horizon & Operational Parameters */}
      <StudyParametersSection
        userSettings={userSettings}
        phases={phases}
        onUpdate={handleUpdate}
      />

      {/* Zone 3: Workspace & Display Preferences */}
      <DisplayPreferencesSection
        userSettings={userSettings}
        onUpdate={handleUpdate}
      />

      {/* Zone 4: Data Portability & Storage Safeguards */}
      <BackupStorageSection
        todayDate={todayDate}
        storageBytes={storageBytes}
        onExport={handleExport}
        onImportFile={handleImportFile}
        importStatus={importStatus}
        onDismissImportStatus={() => setImportStatus(null)}
      />

      {/* Zone 5: Scoped Subsystem Maintenance */}
      <SubsystemMaintenanceSection
        onResetUserSettings={handleResetConfigOnly}
        onResetAssessmentProfile={handleResetAssessmentProfile}
        onResetAssessmentHistory={handleResetAssessmentHistory}
      />

      {/* Zone 6: Danger Zone & Factory Reset */}
      <DangerZoneSection onOpenFullResetModal={() => setShowFullResetModal(true)} />

      {/* Zone 6: Confirmation Modal */}
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
