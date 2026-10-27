import React from 'react';
import type { PreparationTopic, PreparationTopicProgress } from '../../types';
import type { PrerequisiteStatus } from '../../engine/preparationEngine';
import { Lock, ArrowRight, BookOpen, Target } from 'lucide-react';

interface TopicPrerequisiteGateProps {
  topic: PreparationTopic;
  prerequisiteStatus: PrerequisiteStatus;
  unmetPrerequisiteTopics: PreparationTopic[];
  topicProgressMap: Record<string, PreparationTopicProgress>;
  onNavigateTopic: (topicId: string) => void;
}

export const TopicPrerequisiteGate: React.FC<TopicPrerequisiteGateProps> = ({
  topic,
  prerequisiteStatus,
  unmetPrerequisiteTopics,
  topicProgressMap,
  onNavigateTopic,
}) => {
  if (unmetPrerequisiteTopics.length === 0) {
    return null;
  }

  // Focus on the earliest actionable foundation first
  const primaryPrereq = unmetPrerequisiteTopics[0];
  const otherPrereqs = unmetPrerequisiteTopics.slice(1);

  const isPrimaryEvidenceUnmet =
    prerequisiteStatus.unmetEvidencePrerequisiteIds?.includes(primaryPrereq.id);

  const primaryProgress = topicProgressMap[primaryPrereq.id];
  const primaryDoneStages = primaryProgress?.completedStages ?? [];

  return (
    <section
      aria-label="Topic Prerequisite Gate"
      data-testid="prerequisite-gate"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-5 shadow-xs"
    >
      {/* Primary Actionable Block */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--warning)]">
          <Lock className="size-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Prerequisite Required
          </h2>
        </div>

        <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-3">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Before starting {topic.title}, complete {primaryPrereq.title}.
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-1 leading-relaxed">
              {isPrimaryEvidenceUnmet
                ? `You have covered the lessons in ${primaryPrereq.title}, but practical or assessment demonstration is required before unlocking ${topic.title}.`
                : `${primaryPrereq.title} provides the foundational concepts required for ${topic.title}.`}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onNavigateTopic(primaryPrereq.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold text-xs transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
            >
              {isPrimaryEvidenceUnmet ? (
                <>
                  <Target className="size-3.5" />
                  <span>Practice {primaryPrereq.title}</span>
                </>
              ) : (
                <>
                  <BookOpen className="size-3.5" />
                  <span>{primaryDoneStages.length > 0 ? `Continue ${primaryPrereq.title}` : `Open ${primaryPrereq.title}`}</span>
                </>
              )}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Additional prerequisites if any */}
      {otherPrereqs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] block">
            Also required:
          </span>
          <ul className="space-y-2">
            {otherPrereqs.map((prereq) => {
              const isEvidenceUnmet =
                prerequisiteStatus.unmetEvidencePrerequisiteIds?.includes(prereq.id);
              return (
                <li
                  key={prereq.id}
                  className="p-3 bg-[var(--surface-muted)]/60 border border-[var(--border)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <span className="text-[var(--foreground)] font-medium">
                    {prereq.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateTopic(prereq.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--accent)] hover:border-[var(--border-active)] transition-colors cursor-pointer shrink-0"
                  >
                    <span>{isEvidenceUnmet ? `Practice ${prereq.title}` : `Open ${prereq.title}`}</span>
                    <ArrowRight className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
