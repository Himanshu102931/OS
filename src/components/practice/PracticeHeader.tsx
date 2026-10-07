import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Target } from 'lucide-react';

interface PracticeHeaderProps {
  totalAttempts: number;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({ totalAttempts }) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
            <Target className="size-3.5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Placement Assessment & Practice Hub
          </h1>
        </div>
        <p className="text-xs text-foreground-muted">
          Targeted drills for Aptitude, Verbal, SQL scenarios, Core CS, Project Defense, and Mock Interviews.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs text-foreground-muted">
        <GuideTrigger route="practice" />
        <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground-muted text-xs">
          Attempts Completed: <strong className="text-foreground font-semibold">{totalAttempts}</strong>
        </span>
      </div>
    </header>
  );
};
