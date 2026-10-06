import React, { useMemo } from 'react';
import type { DSAProblem, DSAProgress } from '../../types';
import { PATTERN_LESSONS } from '../../data/dsaDataset';
import { calculatePatternMastery } from '../../engine/dsaEngine';
import { CheckCircle2, RotateCcw, Award, Layers } from 'lucide-react';

interface DSAMasteryStripProps {
  problems: DSAProblem[];
  progressMap: Record<string, DSAProgress>;
  todayDate: string;
}

export const DSAMasteryStrip: React.FC<DSAMasteryStripProps> = ({
  problems,
  progressMap,
  todayDate,
}) => {
  // 1. Total Mastered (passedIndependently === true)
  const { totalMastered, totalProblems, masteredPercent } = useMemo(() => {
    const mastered = problems.filter((p) => progressMap[p.id]?.passedIndependently).length;
    const total = problems.length || 150;
    const pct = Math.round((mastered / total) * 100);
    return { totalMastered: mastered, totalProblems: total, masteredPercent: pct };
  }, [problems, progressMap]);

  // 2. Leitner Box Distribution
  const boxDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, unstarted: 0 };
    for (const prob of problems) {
      const prog = progressMap[prob.id];
      if (prog && prog.currentBox && prog.currentBox >= 1 && prog.currentBox <= 4) {
        counts[prog.currentBox as 1 | 2 | 3 | 4]++;
      } else {
        counts.unstarted++;
      }
    }
    return counts;
  }, [problems, progressMap]);

  // 3. Reviews Due Today (nextReviewAt <= todayDate)
  const reviewsDueCount = useMemo(() => {
    return problems.filter((p) => {
      const prog = progressMap[p.id];
      return Boolean(prog?.nextReviewAt && prog.nextReviewAt <= todayDate);
    }).length;
  }, [problems, progressMap, todayDate]);

  // 4. Pattern Mastery Count (out of 17)
  const { masteredPatternsCount, inProgressPatternsCount, patternMasteryPercent } = useMemo(() => {
    let mastered = 0;
    let inProgress = 0;
    for (const pat of PATTERN_LESSONS) {
      const result = calculatePatternMastery(pat.name, problems, progressMap);
      if (result.state === 'mastered') {
        mastered++;
      } else if (result.state === 'in_progress') {
        inProgress++;
      }
    }
    const totalPatterns = PATTERN_LESSONS.length || 17;
    const pct = Math.round((mastered / totalPatterns) * 100);
    return {
      masteredPatternsCount: mastered,
      inProgressPatternsCount: inProgress,
      patternMasteryPercent: pct,
    };
  }, [problems, progressMap]);

  return (
    <section
      aria-label="DSA Algorithmic Mastery Strip"
      data-testid="dsa-mastery-strip"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {/* 1. Total Mastered */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Total Mastered
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--foreground)]" data-testid="dsa-mastered-count">
              {totalMastered}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-mono">
              / {totalProblems} ({masteredPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            Independent solutions logged
          </p>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={masteredPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="DSA Mastered Problems Progress"
          className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]"
        >
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, masteredPercent))}%` }}
          />
        </div>
      </div>

      {/* 2. Leitner Box Distribution */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Leitner Boxes
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)]">
            <Layers className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-[var(--surface-elevated)] p-1.5 rounded border border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--foreground)]" data-testid="dsa-box-1-count">{boxDistribution[1]}</div>
              <div className="text-[10px] text-[var(--foreground-subtle)]">B1 · 1d</div>
            </div>
            <div className="bg-[var(--surface-elevated)] p-1.5 rounded border border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--foreground)]" data-testid="dsa-box-2-count">{boxDistribution[2]}</div>
              <div className="text-[10px] text-[var(--foreground-subtle)]">B2 · 3d</div>
            </div>
            <div className="bg-[var(--surface-elevated)] p-1.5 rounded border border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--foreground)]" data-testid="dsa-box-3-count">{boxDistribution[3]}</div>
              <div className="text-[10px] text-[var(--foreground-subtle)]">B3 · 7d</div>
            </div>
            <div className="bg-[var(--surface-elevated)] p-1.5 rounded border border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--accent)]" data-testid="dsa-box-4-count">{boxDistribution[4]}</div>
              <div className="text-[10px] text-[var(--foreground-subtle)]">B4 · 14d</div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[var(--foreground-subtle)]">
          {problems.length - boxDistribution.unstarted} active in Leitner cycle
        </p>
      </div>

      {/* 3. Reviews Due Today */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Reviews Due Today
          </span>
          <div className={`size-6 rounded-md border flex items-center justify-center ${
            reviewsDueCount > 0
              ? 'bg-[var(--warning)]/15 border-[var(--warning)]/30 text-[var(--warning)]'
              : 'bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)]'
          }`}>
            <RotateCcw className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                reviewsDueCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]'
              }`}
              data-testid="dsa-reviews-due-count"
            >
              {reviewsDueCount}
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {reviewsDueCount === 1 ? 'problem due' : 'problems due'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            {reviewsDueCount > 0 ? 'Forgetting curve protection active' : 'All spaced reviews up to date'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
            reviewsDueCount > 0
              ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'
              : 'bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border-[var(--border)]'
          }`}>
            {reviewsDueCount > 0 ? 'Scheduled for today' : 'Clear queue'}
          </span>
        </div>
      </div>

      {/* 4. Pattern Readiness / Mastery */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Pattern Mastery
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <Award className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--foreground)]" data-testid="dsa-pattern-mastery-count">
              {masteredPatternsCount}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-mono">
              / 17 ({patternMasteryPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            {inProgressPatternsCount} patterns in active training
          </p>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={patternMasteryPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pattern Mastery Progress"
          className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]"
        >
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, patternMasteryPercent))}%` }}
          />
        </div>
      </div>
    </section>
  );
};
