import React from 'react';
import type { TimeWindow } from '../../engine/analyticsEngine';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Calendar, Info } from 'lucide-react';

interface AnalyticsHeaderProps {
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
  startDateISO: string;
  endDateISO: string;
  totalDaysInWindow: number;
  onOpenRawLogs: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeWindow,
  onTimeWindowChange,
  startDateISO,
  endDateISO,
  totalDaysInWindow,
  onOpenRawLogs,
}) => {
  const windowOptions: { id: TimeWindow; label: string; fullLabel: string }[] = [
    { id: '7d', label: '7 Days', fullLabel: '7-Day Sprint Horizon' },
    { id: '30d', label: '30 Days', fullLabel: '30-Day Preparation Cycle' },
    { id: 'phase', label: 'Phase', fullLabel: 'Active Phase Horizon' },
    { id: 'all', label: 'Horizon', fullLabel: 'Full Historical Horizon' },
  ];

  return (
    <header className="space-y-4 font-sans" aria-label="Analytics & Operational Review Header">
      {/* Title, Subtitle, Guide, Window Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
              Analytics & Operational Review
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#F43F5E]/10 text-[#FDA4AF] border border-[#F43F5E]/30 tracking-wider">
              <span className="size-1.5 rounded-full bg-[#F43F5E] animate-pulse" />
              TELEMETRY V1 • DETERMINISTIC
            </span>
          </div>
          <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
            Weekly telemetry summary, learning velocity, retention radar, and evidence-backed review actions.
          </p>
        </div>

        {/* Right Cluster: GuideTrigger + Window Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <GuideTrigger route="analytics" />

          <div
            role="tablist"
            aria-label="Analytics Time Window Selector"
            className="flex items-center gap-1 bg-[#14171D] p-1 border border-[#262D38] rounded-lg"
          >
            {windowOptions.map((opt) => {
              const isActive = timeWindow === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={opt.fullLabel}
                  onClick={() => onTimeWindowChange(opt.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[32px] sm:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E] ${
                    isActive
                      ? 'bg-[#F43F5E] text-white shadow-sm font-bold'
                      : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]'
                  }`}
                  data-testid={`time-window-${opt.id}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Range Scope Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#14171D] border border-[#262D38] rounded-xl text-xs text-[#8E98A8]">
        <div className="flex items-center gap-2 font-mono">
          <Calendar className="size-3.5 text-[#F43F5E]" />
          <span>
            Period: <strong className="text-[#F1F5F9] font-semibold">{startDateISO}</strong> to{' '}
            <strong className="text-[#F1F5F9] font-semibold">{endDateISO}</strong>{' '}
            <span className="text-[#5A6578]">({totalDaysInWindow} {totalDaysInWindow === 1 ? 'day' : 'days'})</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenRawLogs}
          data-testid="open-raw-telemetry-btn"
          className="text-xs text-[#FDA4AF] hover:text-white bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 border border-[#F43F5E]/30 px-2.5 py-1 rounded-md font-semibold font-mono flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]"
        >
          <Info className="size-3.5 text-[#F43F5E]" /> Raw Telemetry Logs
        </button>
      </div>
    </header>
  );
};
