import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { SettingsHeader } from './SettingsHeader';
import { StudyParametersSection } from './StudyParametersSection';
import { DisplayPreferencesSection } from './DisplayPreferencesSection';
import { BackupStorageSection } from './BackupStorageSection';
import { SubsystemMaintenanceSection } from './SubsystemMaintenanceSection';
import { DangerZoneSection } from './DangerZoneSection';
import { ConfirmFullResetModal } from './ConfirmFullResetModal';
import { ConfirmQuarantineActionModal } from './ConfirmQuarantineActionModal';
import { StorageAdapter, type QuarantinedStorageSnapshot } from '../../storage/storageAdapter';
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
  const [quarantinedSnapshot, setQuarantinedSnapshot] = useState<QuarantinedStorageSnapshot | null>(() =>
    StorageAdapter.getQuarantinedState()
  );
  const [quarantineModalAction, setQuarantineModalAction] = useState<'restore' | 'clear' | null>(null);
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

  const handleExportQuarantined = () => {
    const snapshot = StorageAdapter.getQuarantinedState();
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placementos-quarantined-backup-${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerSaveNotify(`Quarantined snapshot exported as placementos-quarantined-backup-${todayDate}.json`);
  };

  const handleConfirmQuarantineRestore = () => {
    const snapshot = StorageAdapter.getQuarantinedState();
    if (!snapshot) {
      setImportStatus({
        message: 'Restore failed: No quarantined snapshot found.',
        isError: true,
      });
      return;
    }
    const result = importBackupJSON(snapshot.payload);
    if (result.success) {
      setImportStatus({
        message: 'Quarantined backup successfully validated and restored as active application state.',
        isError: false,
      });
      setQuarantinedSnapshot(StorageAdapter.getQuarantinedState());
    } else {
      setImportStatus({
        message: `Quarantine restore failed schema validation: ${result.error || 'Invalid backup structure'}. Active state was not modified.`,
        isError: true,
      });
    }
  };

  const handleConfirmQuarantineClear = () => {
    StorageAdapter.clearQuarantinedState();
    setQuarantinedSnapshot(null);
    triggerSaveNotify('Quarantined storage snapshot record cleared.');
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
    setQuarantinedSnapshot(StorageAdapter.getQuarantinedState());
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
          className="p-3 rounded-[4px] bg-surface-subtle border border-accent/50 text-accent text-xs flex items-center gap-2.5 font-medium animate-fade-in shadow-sm"
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
        quarantinedSnapshot={quarantinedSnapshot}
        onExportQuarantined={handleExportQuarantined}
        onRequestRestoreQuarantined={() => setQuarantineModalAction('restore')}
        onRequestClearQuarantined={() => setQuarantineModalAction('clear')}
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

      {/* Quarantine Action Confirmation Modal */}
      <ConfirmQuarantineActionModal
        isOpen={quarantineModalAction !== null}
        action={quarantineModalAction || 'restore'}
        onClose={() => setQuarantineModalAction(null)}
        onConfirm={() => {
          if (quarantineModalAction === 'restore') {
            handleConfirmQuarantineRestore();
          } else if (quarantineModalAction === 'clear') {
            handleConfirmQuarantineClear();
          }
          setQuarantineModalAction(null);
        }}
      />
    </div>
  );
};
