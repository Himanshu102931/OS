import React from 'react';
import type { DSASignalItem } from '../../engine/dsaEngine';
import { Network, FileCode, CheckCircle2, Award } from 'lucide-react';

interface DSAAlgorithmTraceProps {
  activeSignal?: DSASignalItem | null;
  hasRemediation?: boolean;
}

export const DSAAlgorithmTrace: React.FC<DSAAlgorithmTraceProps> = ({
  activeSignal,
  hasRemediation = false,
}) => {
  const stations = [
    {
      id: 'pattern',
      step: '01',
      title: 'Pattern Matrix',
      subtitle: 'Algorithmic Taxonomy',
      icon: Network,
      isActive: !activeSignal, // Default baseline station
    },
    {
      id: 'problem',
      step: '02',
      title: 'Problem Selection',
      subtitle: activeSignal ? activeSignal.problem.title : 'Targeted Catalog',
      icon: FileCode,
      isActive: Boolean(activeSignal && !hasRemediation),
    },
    {
      id: 'attempt',
      step: '03',
      title: 'Active Attempt',
      subtitle: hasRemediation ? 'Remediation Solve' : 'Timed Solve & Trace',
      icon: CheckCircle2,
      isActive: Boolean(hasRemediation),
      isWarning: Boolean(hasRemediation),
    },
    {
      id: 'mastery',
      step: '04',
      title: 'Mastery & Proof',
      subtitle: 'Leitner Spaced Repetition',
      icon: Award,
      isActive: false,
    },
  ];

  return (
    <div
      data-testid="dsa-algorithm-trace"
      aria-label="Algorithmic Problem Laboratory Flow Trace"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 sm:p-4 space-y-3"
    >
      {/* Trace Subtitle & Metaphor Label */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
            Algorithmic Problem Laboratory Trace
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--foreground-muted)] hidden sm:inline-block">
          Pattern → Problem → Attempt → Mastery
        </span>
      </div>

      {/* Connected Trace Track with Traveling Signal */}
      <div className="relative pt-1 pb-1">
        {/* Baseline Trace Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--surface-muted)] -translate-y-1/2 rounded-full dsa-trace-track">
          {/* Luminous Animated Traveler */}
          <div
            data-testid="dsa-trace-traveler"
            className="dsa-trace-traveler"
            aria-hidden="true"
          />
        </div>

        {/* 4 Algorithmic Laboratory Stations */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 z-10">
          {stations.map((st) => {
            const Icon = st.icon;

            return (
              <div
                key={st.id}
                data-testid={`dsa-trace-station-${st.id}`}
                className={`flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-elevated)] border transition-all text-xs ${
                  st.isActive
                    ? st.isWarning
                      ? 'border-[var(--warning)] text-[var(--foreground)] dsa-station-pulse'
                      : 'border-[var(--accent)] text-[var(--foreground)] dsa-station-pulse'
                    : 'border-[var(--border)] text-[var(--foreground-muted)]'
                }`}
              >
                <div
                  className={`size-6 rounded flex items-center justify-center shrink-0 text-[10px] font-mono font-bold ${
                    st.isActive
                      ? st.isWarning
                        ? 'bg-[var(--warning)] text-[var(--background)]'
                        : 'bg-[var(--accent)] text-[var(--background)]'
                      : 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border border-[var(--border)]'
                  }`}
                >
                  {st.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <Icon
                      className={`size-3 shrink-0 ${
                        st.isWarning ? 'text-[var(--warning)]' : 'text-[var(--accent)]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="font-semibold truncate text-[11px] text-[var(--foreground)]">
                      {st.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--foreground-subtle)] font-mono block truncate">
                    {st.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
