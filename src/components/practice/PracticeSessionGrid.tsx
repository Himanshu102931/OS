import React from 'react';
import type { PracticeSessionDefinition, PracticeAttempt } from '../../types';
import type { PracticeTabCategory } from './PracticeCategoryTabs';
import { Clock, CheckCircle2, AlertTriangle, Play, RotateCcw, SearchX } from 'lucide-react';
import { Button } from '../ui/button';

interface PracticeSessionGridProps {
  sessions: PracticeSessionDefinition[];
  attempts: PracticeAttempt[];
  activeCategory: PracticeTabCategory;
  onStartSession: (session: PracticeSessionDefinition) => void;
  onClearFilters?: () => void;
}

export const PracticeSessionGrid: React.FC<PracticeSessionGridProps> = ({
  sessions,
  attempts,
  activeCategory,
  onStartSession,
  onClearFilters,
}) => {
  // Map latest attempt for each session
  const latestAttemptsBySession = new Map<string, PracticeAttempt>();
  attempts.forEach((a) => {
    const existing = latestAttemptsBySession.get(a.sessionId);
    if (!existing || new Date(a.completedAt || a.date).getTime() > new Date(existing.completedAt || existing.date).getTime()) {
      latestAttemptsBySession.set(a.sessionId, a);
    }
  });

  if (sessions.length === 0) {
    return (
      <div
        id="session-catalog-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeCategory}`}
        className="bg-surface border border-border rounded-xl p-12 text-center space-y-3"
      >
        <div className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-foreground-muted mx-auto">
          <SearchX className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">No practice drills found</h3>
          <p className="text-xs text-foreground-muted">
            Try adjusting your search keywords or switching category filters.
          </p>
        </div>
        {onClearFilters && (
          <Button
            size="xs"
            variant="outline"
            onClick={onClearFilters}
            className="h-8 px-3 text-xs border-border text-foreground hover:bg-surface-elevated mt-2"
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      id="session-catalog-panel"
      role="tabpanel"
      aria-labelledby={`tab-${activeCategory}`}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {sessions.map((session) => {
        const lastAttempt = latestAttemptsBySession.get(session.id);
        const isAttempted = !!lastAttempt;
        const isPassed = isAttempted && (lastAttempt.passed || (lastAttempt.accuracyPct ?? 0) >= (session.passingScorePct ?? 70));
        const isTimed = session.id.includes('timed');

        return (
          <div
            key={session.id}
            className="bg-surface border border-border hover:border-border-active rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all"
          >
            {/* Top row: Category, Duration, Timed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-foreground-muted bg-surface-elevated px-2.5 py-0.5 rounded border border-border">
                  {session.category.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2 text-xs text-foreground-muted font-mono">
                  {isTimed && (
                    <span className="text-[10px] uppercase font-semibold text-[#60A5FA] bg-[#3B82F6]/10 px-1.5 py-0.5 rounded border border-[#3B82F6]/30">
                      Timed
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-primary" /> {session.estimatedMinutes}m
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {session.title}
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                  {session.description}
                </p>
              </div>
            </div>

            {/* Bottom row: Questions & Action */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-foreground-muted font-mono text-[11px]">
                {session.questions.length} Questions
              </span>

              <div className="flex items-center gap-2.5">
                {isAttempted && (
                  <span
                    className={`font-mono text-[11px] font-semibold flex items-center gap-1 ${
                      isPassed ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="size-3 text-success" />
                    ) : (
                      <AlertTriangle className="size-3 text-warning" />
                    )}
                    {lastAttempt.accuracyPct}%
                  </span>
                )}

                <Button
                  size="xs"
                  onClick={() => onStartSession(session)}
                  className={`h-8 px-3 text-xs font-bold rounded-md transition-all ${
                    !isAttempted
                      ? 'bg-surface-elevated hover:bg-[#3B82F6] hover:text-[#0B100D] text-foreground border border-border hover:border-[#3B82F6]'
                      : isPassed
                      ? 'bg-surface-elevated hover:bg-surface-elevated/80 text-foreground-muted hover:text-foreground border border-border'
                      : 'bg-surface-elevated hover:bg-[#3B82F6] hover:text-[#0B100D] text-warning border border-warning/40 hover:border-[#3B82F6]'
                  }`}
                >
                  {!isAttempted ? (
                    <>
                      <Play className="size-3 mr-1 fill-current" /> Start Session
                    </>
                  ) : isPassed ? (
                    <>
                      <RotateCcw className="size-3 mr-1" /> Retake Session
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-3 mr-1" /> Remediate Drill
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
