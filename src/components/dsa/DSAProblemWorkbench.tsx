import React, { useMemo, useState, useCallback } from 'react';
import type { DSAProblem, DSAProgress } from '../../types';
import { isProblemUnlocked, getLeitnerIntervalDays } from '../../engine/dsaEngine';
import { Button } from '../ui/button';
import {
  Code2,
  Search,
  Lock,
  RotateCcw,
  BookOpen,
  ExternalLink,
  Play,
  Filter,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface DSAProblemWorkbenchProps {
  problems: DSAProblem[];
  progressMap: Record<string, DSAProgress>;
  currentPhaseIndex: number;
  todayDate: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (difficulty: string) => void;
  selectedPattern: string | null;
  onSelectPattern: (pattern: string | null) => void;
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
  onOpenAttempt: (problem: DSAProblem) => void;
  onOpenWorkspace: (problem: DSAProblem) => void;
}

export const DSAProblemWorkbench: React.FC<DSAProblemWorkbenchProps> = ({
  problems,
  progressMap,
  currentPhaseIndex,
  todayDate,
  searchQuery,
  onSearchChange,
  selectedDifficulty,
  onSelectDifficulty,
  selectedPattern,
  onSelectPattern,
  selectedStatus: controlledStatus,
  onSelectStatus: controlledOnSelectStatus,
  onOpenAttempt,
  onOpenWorkspace,
}) => {
  const [internalStatus, setInternalStatus] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(30);
  const activeStatus = controlledStatus ?? internalStatus;
  const handleStatusChange = (newStatus: string) => {
    setVisibleCount(30);
    if (controlledOnSelectStatus) {
      controlledOnSelectStatus(newStatus);
    } else {
      setInternalStatus(newStatus);
    }
  };

  // Derive problem status helper
  const getProblemStatus = useCallback(
    (p: DSAProblem) => {
      const prog = progressMap[p.id];
      const unlockStatus = isProblemUnlocked(p, progressMap, currentPhaseIndex);

      if (prog?.remediationRequired) {
        return {
          key: 'remediation',
          label: 'Remediation',
          badgeClass: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
          isLocked: false,
          reason: 'Remediation required: review pattern lesson and pass self-check quiz',
        };
      }
      if (!unlockStatus.isUnlocked) {
        return {
          key: 'locked',
          label: 'Locked',
          badgeClass: 'bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border-[var(--border)]',
          isLocked: true,
          reason: unlockStatus.reason || `Locked until Phase ${p.recommendedPhase}`,
        };
      }
      if (prog?.passedIndependently) {
        return {
          key: 'mastered',
          label: 'Mastered',
          badgeClass: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
          isLocked: false,
        };
      }
      if (prog?.nextReviewAt && prog.nextReviewAt <= todayDate) {
        return {
          key: 'due',
          label: 'Review Due',
          badgeClass: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
          isLocked: false,
        };
      }
      if (prog?.assistedProvisional) {
        return {
          key: 'assisted',
          label: 'Assisted',
          badgeClass: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
          isLocked: false,
        };
      }
      return {
        key: 'unlocked',
        label: 'Unlocked',
        badgeClass: 'bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)]',
        isLocked: false,
      };
    },
    [progressMap, currentPhaseIndex, todayDate]
  );

  // Filtered problems list
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchPattern = p.primaryPattern.toLowerCase().includes(q);
        const matchLC = String(p.leetcodeNumber).includes(q);
        if (!matchTitle && !matchPattern && !matchLC) return false;
      }

      // 2. Difficulty Filter
      if (selectedDifficulty !== 'all' && p.difficulty !== selectedDifficulty) {
        return false;
      }

      // 3. Pattern Filter
      if (selectedPattern) {
        const matchesPrimary = p.primaryPattern === selectedPattern;
        const matchesSecondary = Boolean(p.secondaryPatterns?.includes(selectedPattern));
        if (!matchesPrimary && !matchesSecondary) return false;
      }

      // 4. Status Filter
      if (activeStatus !== 'all') {
        const status = getProblemStatus(p);
        if (activeStatus === 'unlocked' && status.isLocked) return false;
        if (activeStatus === 'due' && status.key !== 'due') return false;
        if (activeStatus === 'mastered' && status.key !== 'mastered') return false;
        if (activeStatus === 'locked' && !status.isLocked) return false;
        if (activeStatus === 'remediation' && status.key !== 'remediation') return false;
      }

      return true;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedPattern, activeStatus, getProblemStatus]);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    let unlocked = 0;
    let due = 0;
    let mastered = 0;
    let locked = 0;
    let remediation = 0;

    for (const p of problems) {
      const status = getProblemStatus(p);
      if (status.key === 'remediation') remediation++;
      else if (status.key === 'due') due++;
      else if (status.key === 'mastered') mastered++;
      else if (status.isLocked) locked++;
      else unlocked++;
    }

    return {
      all: problems.length,
      unlocked,
      due,
      mastered,
      locked,
      remediation,
    };
  }, [problems, getProblemStatus]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedDifficulty !== 'all' || selectedPattern !== null || activeStatus !== 'all';

  const resetAllFilters = () => {
    onSearchChange('');
    onSelectDifficulty('all');
    onSelectPattern(null);
    handleStatusChange('all');
  };

  return (
    <section
      aria-label="Curated 150-Problem Workbench"
      data-testid="dsa-problem-workbench"
      className="space-y-4"
    >
      {/* Workbench Header & Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
              <Code2 className="size-3.5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
              Curated 150-Problem Workbench
            </h2>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            Algorithmic Practice Catalog • Progression DAG • Leitner Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Accessible Full Catalog button for test harness and quick toggle */}
          <button
            type="button"
            onClick={resetAllFilters}
            aria-label="Full Catalog"
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono font-medium text-[var(--foreground)] hover:border-[var(--border-active)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5 text-[var(--accent)]" />
            <span>Full Catalog ({filteredProblems.length}/{problems.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Controller & Status Tabs */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-4 space-y-3">
        {/* Row 1: Search & Difficulty */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="size-3.5 text-[var(--foreground-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by problem title, pattern, or LC #..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search problem catalog"
              className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border-active)]"
            />
          </div>

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
          </div>
        </div>

        {/* Row 2: Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] text-xs">
          <span className="text-[10px] uppercase font-semibold text-[var(--foreground-subtle)] mr-1">
            Status:
          </span>
          {[
            { id: 'all', label: `All (${statusCounts.all})` },
            { id: 'unlocked', label: `Unlocked (${statusCounts.unlocked})` },
            { id: 'due', label: `Reviews Due (${statusCounts.due})` },
            { id: 'mastered', label: `Mastered (${statusCounts.mastered})` },
            { id: 'locked', label: `Locked (${statusCounts.locked})` },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleStatusChange(st.id)}
              aria-pressed={activeStatus === st.id}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeStatus === st.id
                  ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-active)] shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-transparent'
              }`}
            >
              {st.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:underline cursor-pointer"
            >
              <X className="size-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Active Filter Indicators */}
        {selectedPattern && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--foreground-muted)]">
            <span>Pattern Filter: <strong className="text-[var(--accent)] font-semibold">{selectedPattern}</strong> ({filteredProblems.length} available in {selectedPattern})</span>
            <button
              type="button"
              onClick={() => onSelectPattern(null)}
              aria-label="Clear pattern filter"
              className="size-4 rounded flex items-center justify-center hover:bg-[var(--surface-elevated)] text-[var(--foreground-subtle)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Problem Workbench Table / List */}
      {filteredProblems.length === 0 ? (
        <div
          data-testid="dsa-workbench-empty"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center space-y-3"
        >
          <div className="size-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] flex items-center justify-center mx-auto">
            <Filter className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">No Problems Match Filter Criteria</h3>
          <p className="text-xs text-[var(--foreground-subtle)] max-w-sm mx-auto">
            Try adjusting your search query, difficulty selector, pattern filter, or status view.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetAllFilters}
            className="text-xs font-semibold bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-2 list-stagger" data-testid="dsa-problem-list">
          {filteredProblems.slice(0, visibleCount).map((prob) => {
            const status = getProblemStatus(prob);
            const prog = progressMap[prob.id];
            const currentBox = prog?.currentBox || 1;
            const intervalDays = getLeitnerIntervalDays(currentBox);

            const difficultyBadgeClass = (() => {
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
                data-testid={`workbench-problem-${prob.id}`}
                className={`p-3.5 sm:p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
                  status.isLocked
                    ? 'bg-[var(--surface)]/60 border-[var(--border)]/60 opacity-80'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]/60 border-[var(--border)] hover:border-[var(--border-active)]'
                }`}
              >
                {/* Left Section: Meta & Title */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--foreground-subtle)]">
                      #{prob.leetcodeNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border uppercase tracking-wider ${difficultyBadgeClass}`}
                    >
                      {prob.difficulty}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                    {prob.progressionTier && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border border-[var(--border)]">
                        {prob.progressionTier}
                      </span>
                    )}
                    {prob.isAnchor && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                        Anchor
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight truncate">
                    {prob.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--foreground-muted)]">
                    <span className="text-[var(--accent)] font-medium">{prob.primaryPattern}</span>
                    <span className="text-[var(--border)]">•</span>
                    <span className="text-[var(--foreground-subtle)]">{prob.dataStructure}</span>
                    <span className="text-[var(--border)]">•</span>
                    <span className="text-[var(--foreground-subtle)]">{prob.algorithmicTechnique}</span>
                    <span className="text-[var(--border)]">•</span>
                    <span className="text-[var(--foreground-subtle)] font-mono">~{prob.estimatedTimeMinutes}m</span>
                  </div>
                </div>

                {/* Middle Section: Leitner / Lock / Review Details */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1 text-xs font-mono text-[var(--foreground-subtle)] shrink-0">
                  {status.isLocked ? (
                    <div className="flex items-center gap-1.5 text-[var(--foreground-subtle)] text-[11px]">
                      <Lock className="size-3" />
                      <span>{status.reason}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--foreground)]">
                          Box {currentBox}/4
                        </span>
                        <span className="text-[10px] text-[var(--foreground-muted)]">
                          ({intervalDays}d)
                        </span>
                      </div>
                      {prog?.nextReviewAt && (
                        <span
                          className={`text-[10px] ${
                            prog.nextReviewAt <= todayDate
                              ? 'text-[var(--warning)] font-semibold'
                              : 'text-[var(--foreground-subtle)]'
                          }`}
                        >
                          Review: {prog.nextReviewAt}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Right Section: Compact Subordinated Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onOpenWorkspace(prob)}
                    aria-label={`Inspect ${prob.title} in workspace`}
                    className="h-8 px-3 text-xs font-medium border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-md cursor-pointer transition-colors"
                  >
                    <BookOpen className="size-3 mr-1 text-[var(--foreground-muted)]" />
                    <span>Workspace</span>
                  </Button>

                  {status.isLocked ? (
                    <Button
                      size="xs"
                      disabled
                      aria-label={`${prob.title} is locked`}
                      className="h-8 px-3 text-xs font-medium bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border border-[var(--border)] rounded-md opacity-60 cursor-not-allowed"
                    >
                      <Lock className="size-3 mr-1" />
                      <span>Locked</span>
                    </Button>
                  ) : status.key === 'remediation' ? (
                    <Button
                      size="xs"
                      onClick={() => onOpenWorkspace(prob)}
                      aria-label={`Remediate ${prob.title}`}
                      className="h-8 px-3 text-xs font-semibold bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25 text-[var(--danger)] border border-[var(--danger)]/30 rounded-md cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="size-3 mr-1" />
                      <span>Remediate</span>
                    </Button>
                  ) : status.key === 'due' ? (
                    <Button
                      size="xs"
                      onClick={() => onOpenAttempt(prob)}
                      aria-label={`Review ${prob.title}`}
                      className="h-8 px-3 text-xs font-semibold bg-[var(--warning)]/15 hover:bg-[var(--warning)]/25 text-[var(--warning)] border border-[var(--warning)]/30 rounded-md cursor-pointer transition-colors"
                    >
                      <RotateCcw className="size-3 mr-1" />
                      <span>Review</span>
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      onClick={() => onOpenAttempt(prob)}
                      aria-label={`Attempt ${prob.title}`}
                      className="h-8 px-3 text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--border-active)] rounded-md cursor-pointer transition-colors"
                    >
                      <Play className="size-3 mr-1 fill-current text-[var(--accent)]" />
                      <span>{status.key === 'mastered' ? 'Re-drill' : 'Attempt'}</span>
                    </Button>
                  )}

                  {prob.leetcodeUrl && (
                    <a
                      href={prob.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open LeetCode problem #${prob.leetcodeNumber}`}
                      className="size-8 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-active)] transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProblems.length > visibleCount && (
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--foreground-muted)] border-t border-[var(--border)]">
              <span>
                Showing {Math.min(visibleCount, filteredProblems.length)} of {filteredProblems.length} problems
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className="bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  Show Next 30
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setVisibleCount(filteredProblems.length)}
                  className="bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  Show All ({filteredProblems.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
