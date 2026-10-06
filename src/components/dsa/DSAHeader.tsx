import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Code2, Target } from 'lucide-react';

interface DSAHeaderProps {
  totalProblemsCount?: number;
  masteredCount?: number;
}

export const DSAHeader: React.FC<DSAHeaderProps> = ({
  totalProblemsCount = 150,
  masteredCount = 0,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-sm">
            <Code2 className="size-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
              DSA Problem Laboratory
            </h1>
          </div>
        </div>
        <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-2 pl-0.5">
          <span>Curated {totalProblemsCount}-Problem Curriculum</span>
          <span className="text-[var(--border)]">•</span>
          <span>DSA Progression Engine</span>
          <span className="text-[var(--border)]">•</span>
          <span>Leitner Spaced Repetition</span>
          <span className="text-[var(--border)]">•</span>
          <span>17 Algorithmic Patterns</span>
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] font-mono">
          <Target className="size-3.5 text-[var(--accent)]" />
          <span>Curriculum Target: <strong className="text-[var(--foreground)] font-semibold">{masteredCount}/{totalProblemsCount}</strong> Mastered</span>
        </div>
        <GuideTrigger route="dsa" />
      </div>
    </header>
  );
};
