import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { HardDrive, ShieldCheck, Sliders } from 'lucide-react';

interface SettingsHeaderProps {
  storageBytes: number;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ storageBytes }) => {
  const formattedKB = (storageBytes / 1024).toFixed(2);
  const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB typical localStorage quota
  const storagePercentage = Math.min(100, Math.max(0.1, (storageBytes / MAX_STORAGE_BYTES) * 100)).toFixed(1);

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border-default">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-info uppercase tracking-wider">
          <Sliders className="size-3.5" />
          <span>System Control Surface</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Settings & Operational Parameters
        </h1>
        <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
          Configure adaptive engine weights, study horizons, data portability backups, and storage safeguards.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GuideTrigger route="settings" />

        {/* Local-First Offline Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-surface-panel border border-border-default text-xs text-text-secondary">
          <ShieldCheck className="size-3.5 text-accent" />
          <span className="text-text-primary font-medium">Local-First</span>
          <span className="text-text-tertiary hidden sm:inline">(Zero Cloud)</span>
        </div>

        {/* Live Storage Footprint Meter */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] bg-surface-panel border border-border-default text-xs">
          <HardDrive className="size-3.5 text-info" />
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary">Storage:</span>
            <span className="font-mono font-bold text-text-primary">{formattedKB} KB</span>
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-border-default">
              <div className="w-12 h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                <div
                  className="h-full bg-info rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, Number(storagePercentage))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-text-tertiary">{storagePercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
