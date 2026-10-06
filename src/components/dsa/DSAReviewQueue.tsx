import React, { useMemo } from 'react';
import type { DSAProblem, DSAProgress } from '../../types';
import { getLeitnerIntervalDays } from '../../engine/dsaEngine';
import { Button } from '../ui/button';
import { RotateCcw, Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface DSAReviewQueueProps {
  problems: DSAProblem[];
  progressMap: Record<string, DSAProgress>;
  todayDate: string;
  onOpenAttempt: (problem: DSAProblem) => void;
  onOpenWorkspace?: (problem: DSAProblem) => void;
}

export const DSAReviewQueue: React.FC<DSAReviewQueueProps> = ({
  problems,
  progressMap,
  todayDate,
  onOpenAttempt,
}) => {
  // Pure derivation of reviews due today or overdue
  const reviewsDue = useMemo(() => {
    return problems.filter((p) => {
      const prog = progressMap[p.id];
      return Boolean(prog?.nextReviewAt && prog.nextReviewAt <= todayDate);
    });
  }, [problems, progressMap, todayDate]);

  return (
    <section
      aria-label="DSA Spaced Review Queue"
      data-testid="dsa-review-queue"
      className="space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--warning)]">
            <RotateCcw className="size-3.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
            Spaced Reviews Due Today ({reviewsDue.length})
          </h2>
        </div>

        {reviewsDue.length > 0 && (
          <span className="text-xs text-[var(--foreground-subtle)] font-mono hidden sm:inline-block">
            Forgetting curve protection active
          </span>
        )}
      </div>

      {reviewsDue.length === 0 ? (
        <div
          data-testid="dsa-review-queue-empty"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center space-y-2 transition-colors"
        >
          <div className="size-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">
            Zero Spaced Reviews Due Today
          </h3>
          <p className="text-xs text-[var(--foreground-subtle)] max-w-sm mx-auto">
            All problem intervals are current. Continue progressing through new pattern problems or reinforce weak topics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 list-stagger">
          {reviewsDue.map((prob) => {
            const prog = progressMap[prob.id];
            const currentBox = prog?.currentBox || 1;
            const intervalDays = getLeitnerIntervalDays(currentBox);
            const isOverdue = prog?.nextReviewAt ? prog.nextReviewAt < todayDate : false;

            const difficultyBadge = (() => {
              switch (prob.difficulty) {
                case 'easy':
                  return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30';
                case 'medium':
                  return 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30';
                case 'hard':
                  return 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30';
                default:
                  return 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]';
              }
            })();

            return (
              <div
                key={prob.id}
                className="bg-[var(--surface)] hover:bg-[var(--surface-elevated)]/60 border border-[var(--border)] hover:border-[var(--border-active)] rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--foreground-subtle)]">
                        #{prob.leetcodeNumber}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase border ${difficultyBadge}`}>
                        {prob.difficulty}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                        Box {currentBox}/4 ({intervalDays}d)
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isOverdue
                        ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30'
                        : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'
                    }`}>
                      {isOverdue ? `Overdue (${prog?.nextReviewAt})` : 'Due Today'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors line-clamp-1">
                    {prob.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                    <span className="text-[var(--accent)] font-medium">{prob.primaryPattern}</span>
                    <span className="text-[var(--border)]">•</span>
                    <span className="inline-flex items-center gap-1 text-[var(--foreground-subtle)]">
                      <Clock className="size-3" />
                      ~{prob.estimatedTimeMinutes}m
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="text-[11px] text-[var(--foreground-subtle)] flex items-center gap-1">
                    <Calendar className="size-3 text-[var(--foreground-muted)]" />
                    <span>Scheduled: {prog?.nextReviewAt}</span>
                  </div>

                  <Button
                    type="button"
                    size="xs"
                    onClick={() => onOpenAttempt(prob)}
                    aria-label={`Review ${prob.title}`}
                    className="h-7 px-3 text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--border-active)] rounded-md cursor-pointer transition-colors shadow-none"
                  >
                    <RotateCcw className="size-3 mr-1 text-[var(--warning)]" />
                    <span>Review</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
