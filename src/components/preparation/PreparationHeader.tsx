import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Compass, BookOpen } from 'lucide-react';

interface PreparationHeaderProps {
  totalTopicsCount?: number;
  readyTopicsCount?: number;
}

export const PreparationHeader: React.FC<PreparationHeaderProps> = ({
  totalTopicsCount = 13,
  readyTopicsCount = 0,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-sm">
            <Compass className="size-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
              PREPARATION
            </h1>
          </div>
        </div>
        <p className="text-xs text-[var(--foreground-muted)] flex flex-wrap items-center gap-2 pl-0.5">
          <span>Learning Progression / Knowledge Workspace</span>
          <span className="text-[var(--border)]">•</span>
          <span>4 Core Domains</span>
          <span className="text-[var(--border)]">•</span>
          <span>{totalTopicsCount} Foundational Modules</span>
          <span className="text-[var(--border)]">•</span>
          <span>7-Stage Learning Progression</span>
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] font-mono">
          <BookOpen className="size-3.5 text-[var(--accent)]" />
          <span>Readiness Target: <strong className="text-[var(--foreground)] font-semibold">{readyTopicsCount}/{totalTopicsCount}</strong> Ready</span>
        </div>
        <GuideTrigger route="preparation" />
      </div>
    </header>
  );
};
