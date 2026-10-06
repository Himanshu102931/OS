import React, { useMemo } from 'react';
import type { DSAProblem, DSAProgress } from '../../types';
import { PATTERN_LESSONS } from '../../data/dsaDataset';
import { calculatePatternMastery } from '../../engine/dsaEngine';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface DSAPatternMatrixProps {
  problems: DSAProblem[];
  progressMap: Record<string, DSAProgress>;
  selectedPattern: string | null;
  onSelectPattern: (patternName: string | null) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (difficulty: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DSAPatternMatrix: React.FC<DSAPatternMatrixProps> = ({
  problems,
  progressMap,
  selectedPattern,
  onSelectPattern,
  selectedDifficulty,
  onSelectDifficulty,
  searchQuery,
  onSearchChange,
}) => {
  // Compute mastery stats for all 17 patterns
  const patternMasteryList = useMemo(() => {
    return PATTERN_LESSONS.map((pat) => {
      const mastery = calculatePatternMastery(pat.name, problems, progressMap);
      return {
        lesson: pat,
        mastery,
      };
    });
  }, [problems, progressMap]);

  // Macro counts
  const { masteredCount, inProgressCount, remediationCount } = useMemo(() => {
    let mastered = 0;
    let inProgress = 0;
    let remediation = 0;
    for (const item of patternMasteryList) {
      if (item.mastery.remediationActive) {
        remediation++;
      } else if (item.mastery.state === 'mastered') {
        mastered++;
      } else if (item.mastery.state === 'in_progress') {
        inProgress++;
      }
    }
    return {
      masteredCount: mastered,
      inProgressCount: inProgress,
      remediationCount: remediation,
    };
  }, [patternMasteryList]);

  return (
    <section
      aria-label="Algorithmic Pattern Mastery Matrix"
      data-testid="dsa-pattern-matrix"
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
              <Layers className="size-3.5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
              Algorithmic Pattern Matrix & Laboratory
            </h2>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            17 Core Placement Patterns • Independent Proof • Starter / Core Progression
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 font-semibold">
            {masteredCount} Mastered
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold">
            {inProgressCount} In Progress
          </span>
          {remediationCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 font-semibold">
              {remediationCount} Remediation
            </span>
          )}
        </div>
      </div>

      {/* Filter Controller Bar */}
      <div
        data-testid="dsa-filter-controller"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-3.5 text-[var(--foreground-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search problems, patterns, or LC #..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search problems"
            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border-active)]"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-[var(--surface-elevated)] p-0.5 rounded-md border border-[var(--border)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--foreground-subtle)] px-2">
              Difficulty:
            </span>
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => onSelectDifficulty(diff)}
                aria-pressed={selectedDifficulty === diff}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize cursor-pointer transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border-active)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {selectedPattern && (
            <button
              type="button"
              onClick={() => onSelectPattern(null)}
              className="px-2.5 py-1.5 rounded-md bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] text-xs font-medium cursor-pointer transition-colors"
            >
              Reset Pattern Filter
            </button>
          )}
        </div>
      </div>

      {/* 17-Pattern Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {patternMasteryList.map(({ lesson, mastery }) => {
          const isSelected = selectedPattern === lesson.name;

          const stateBadge = (() => {
            if (mastery.remediationActive) {
              return {
                label: 'Remediation',
                icon: <AlertTriangle className="size-3 mr-1 text-[var(--danger)]" />,
                badgeClass: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
              };
            }
            if (mastery.state === 'mastered') {
              return {
                label: 'Mastered',
                icon: <CheckCircle2 className="size-3 mr-1 text-[var(--success)]" />,
                badgeClass: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
              };
            }
            if (mastery.state === 'in_progress') {
              return {
                label: `${mastery.masteryRatio}% Mastery`,
                icon: <Sparkles className="size-3 mr-1 text-[var(--accent)]" />,
                badgeClass: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
              };
            }
            return {
              label: 'Not Started',
              icon: <Clock className="size-3 mr-1 text-[var(--foreground-subtle)]" />,
              badgeClass: 'bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border-[var(--border)]',
            };
          })();

          return (
            <div
              key={lesson.patternId}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelectPattern(isSelected ? null : lesson.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPattern(isSelected ? null : lesson.name);
                }
              }}
              data-testid={`pattern-card-${lesson.patternId}`}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 text-left cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                isSelected
                  ? 'bg-[var(--surface-elevated)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]/70 border-[var(--border)] hover:border-[var(--border-active)]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                    {lesson.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${stateBadge.badgeClass}`}
                  >
                    {stateBadge.icon}
                    <span>{stateBadge.label}</span>
                  </span>
                </div>

                <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 leading-relaxed">
                  {lesson.overview}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--foreground-muted)]">
                    {mastery.independentSolves}/{mastery.requiredIndependentSolves || 3} Independent
                  </span>
                  <span className="text-[var(--foreground-subtle)]">
                    {mastery.starterCount} Starter · {mastery.coreCount} Core
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  role="progressbar"
                  aria-valuenow={mastery.masteryRatio}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${lesson.name} Mastery Progress`}
                  className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      mastery.state === 'mastered'
                        ? 'bg-[var(--success)]'
                        : mastery.state === 'in_progress'
                        ? 'bg-[var(--accent)]'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, mastery.masteryRatio))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--foreground-subtle)] pt-0.5">
                  <span>Complexity:</span>
                  <span className="font-mono text-[var(--foreground-muted)]">
                    {lesson.expectedTimeComplexity} / {lesson.expectedSpaceComplexity}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
