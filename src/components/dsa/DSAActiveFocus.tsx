import React from 'react';
import type { DSAProblem } from '../../types';
import type { DSASignalItem } from '../../engine/dsaEngine';
import { Button } from '../ui/button';
import {
  Play,
  RotateCcw,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Award,
  Target,
  Clock,
  Code2,
  CheckCircle2,
} from 'lucide-react';

interface DSAActiveFocusProps {
  activeSignal: DSASignalItem | null;
  onOpenAttempt: (problem: DSAProblem) => void;
  onOpenWorkspace: (problem: DSAProblem) => void;
}

export const DSAActiveFocus: React.FC<DSAActiveFocusProps> = ({
  activeSignal,
  onOpenAttempt,
  onOpenWorkspace,
}) => {
  if (!activeSignal) {
    return (
      <section
        aria-label="Active DSA Focus"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center space-y-3"
      >
        <div className="size-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-5" />
        </div>
        <h2 className="text-base font-bold text-[var(--foreground)]">All Current Algorithmic Goals Completed</h2>
        <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
          No urgent reviews or unlocked problems pending in the current phase. Advance roadmap tasks or practice pattern drills.
        </p>
      </section>
    );
  }

  const { problem, priorityTier, reason } = activeSignal;

  // Derive badge config by priority tier
  const tierConfig = (() => {
    switch (priorityTier) {
      case 1:
        return {
          label: 'REMEDIATION PROTOCOL',
          icon: <AlertTriangle className="size-3.5 text-[var(--danger)]" />,
          badgeClass: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
          ctaText: 'Start Remediation',
          ctaIcon: <BookOpen className="size-4 mr-1.5" />,
          isRemediation: true,
        };
      case 2:
        return {
          label: 'SPACED REVIEW DUE',
          icon: <RotateCcw className="size-3.5 text-[var(--warning)]" />,
          badgeClass: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
          ctaText: 'Start Review',
          ctaIcon: <RotateCcw className="size-4 mr-1.5" />,
          isRemediation: false,
        };
      case 3:
        return {
          label: 'NEWLY UNLOCKED',
          icon: <Sparkles className="size-3.5 text-[var(--accent)]" />,
          badgeClass: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
          ctaText: 'Solve Problem',
          ctaIcon: <Play className="size-4 mr-1.5 fill-current" />,
          isRemediation: false,
        };
      case 4:
        return {
          label: 'PATTERN REINFORCEMENT',
          icon: <Award className="size-3.5 text-[var(--accent)]" />,
          badgeClass: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
          ctaText: 'Solve Problem',
          ctaIcon: <Play className="size-4 mr-1.5 fill-current" />,
          isRemediation: false,
        };
      case 5:
      default:
        return {
          label: 'RECOMMENDED FOCUS',
          icon: <Target className="size-3.5 text-[var(--foreground-muted)]" />,
          badgeClass: 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]',
          ctaText: 'Solve Problem',
          ctaIcon: <Play className="size-4 mr-1.5 fill-current" />,
          isRemediation: false,
        };
    }
  })();

  const difficultyBadge = (() => {
    switch (problem.difficulty) {
      case 'easy':
        return {
          label: 'Easy',
          badgeClass: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
        };
      case 'medium':
        return {
          label: 'Medium',
          badgeClass: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
        };
      case 'hard':
        return {
          label: 'Hard',
          badgeClass: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
        };
      default:
        return {
          label: problem.difficulty,
          badgeClass: 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]',
        };
    }
  })();

  const handlePrimaryClick = () => {
    if (tierConfig.isRemediation) {
      onOpenWorkspace(problem);
    } else {
      onOpenAttempt(problem);
    }
  };

  return (
    <section
      aria-label="DSA Active Focus Mission"
      data-testid="dsa-active-focus"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm transition-all"
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${tierConfig.badgeClass}`}
          >
            {tierConfig.icon}
            <span>{tierConfig.label}</span>
          </span>
          {problem.isAnchor && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)] uppercase tracking-wider">
              Anchor
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[var(--foreground-muted)] font-semibold">
            LC #{problem.leetcodeNumber}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${difficultyBadge.badgeClass}`}
          >
            {difficultyBadge.label}
          </span>
          {problem.progressionTier && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border border-[var(--border)]">
              {problem.progressionTier}
            </span>
          )}
        </div>
      </div>

      {/* Problem Title & Core Info */}
      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {problem.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--foreground-muted)]">
          <span className="font-semibold text-[var(--accent)]">{problem.primaryPattern}</span>
          <span className="text-[var(--border-active)]">•</span>
          <span>{problem.dataStructure}</span>
          <span className="text-[var(--border-active)]">•</span>
          <span className="text-[var(--foreground-subtle)]">{problem.algorithmicTechnique}</span>
          <span className="text-[var(--border-active)]">•</span>
          <span className="inline-flex items-center gap-1 text-[var(--foreground-muted)]">
            <Clock className="size-3 text-[var(--foreground-subtle)]" />
            ~{problem.estimatedTimeMinutes} mins
          </span>
        </div>
      </div>

      {/* Adaptive Reason Callout */}
      <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg p-3 flex items-start gap-2.5 text-xs text-[var(--foreground)]">
        <div className="size-5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
          <Code2 className="size-3" />
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
            Active Recommendation Reason
          </div>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {reason.replace(/^Remediation required/i, 'Remediation active')}
          </p>
        </div>
      </div>

      {/* Action Strip */}
      <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenWorkspace(problem)}
            data-testid="dsa-workspace-cta"
            className="h-9 px-3.5 text-xs font-semibold bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-md transition-colors"
          >
            <BookOpen className="size-3.5 mr-1.5 text-[var(--accent)]" />
            Open Workspace
          </Button>

          {problem.leetcodeUrl && (
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] rounded-md transition-colors border border-transparent hover:border-[var(--border)]"
            >
              <span>LeetCode</span>
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* Primary Defining CTA with Action Accent */}
        <Button
          type="button"
          size="sm"
          onClick={handlePrimaryClick}
          data-testid="dsa-primary-cta"
          className="h-9 px-5 text-xs font-bold bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] border border-[var(--action-accent-border)] rounded-md shadow-sm cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[var(--action-accent-ring)]"
        >
          {tierConfig.ctaIcon}
          <span>{tierConfig.ctaText}</span>
        </Button>
      </div>
    </section>
  );
};
