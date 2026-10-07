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
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#28352D]">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#0EA5E9] uppercase tracking-wider">
          <Sliders className="size-3.5" />
          <span>System Control Surface</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#E8F0E9]">
          Settings & Operational Parameters
        </h1>
        <p className="text-xs text-[#9AA99F] max-w-2xl leading-relaxed">
          Configure adaptive engine weights, study horizons, data portability backups, and storage safeguards.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GuideTrigger route="settings" />

        {/* Local-First Offline Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#111713] border border-[#28352D] text-xs text-[#9AA99F]">
          <ShieldCheck className="size-3.5 text-[#46B982]" />
          <span className="text-[#E8F0E9] font-medium">Local-First</span>
          <span className="text-[#86958B] hidden sm:inline">(Zero Cloud)</span>
        </div>

        {/* Live Storage Footprint Meter */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] bg-[#111713] border border-[#28352D] text-xs">
          <HardDrive className="size-3.5 text-[#0EA5E9]" />
          <div className="flex items-center gap-2">
            <span className="text-[#86958B]">Storage:</span>
            <span className="font-mono font-bold text-[#E8F0E9]">{formattedKB} KB</span>
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-[#28352D]">
              <div className="w-12 h-1.5 rounded-full bg-[#161E19] overflow-hidden">
                <div
                  className="h-full bg-[#0EA5E9] rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, Number(storagePercentage))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#86958B]">{storagePercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
