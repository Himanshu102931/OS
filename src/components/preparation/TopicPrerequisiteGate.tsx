import React from 'react';
import type { PreparationTopic, PreparationTopicProgress } from '../../types';
import type { PrerequisiteStatus } from '../../engine/preparationEngine';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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
  return (
    <section
      aria-label="Topic Prerequisite Proof Gate"
      data-testid="prerequisite-gate"
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="size-4 text-[var(--warning)]" />
          <span>Prerequisite Required</span>
        </h3>
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
          Complete curriculum coverage and demonstrate evidence in the prerequisite topic
          {unmetPrerequisiteTopics.length > 1 ? 's' : ''} below to unlock {topic.title}.
        </p>
      </div>

      <ul className="space-y-2">
        {unmetPrerequisiteTopics.map((prereq) => {
          const prereqProgress = topicProgressMap[prereq.id];
          const doneStages = prereqProgress?.completedStages ?? [];
          const doneCount = prereq.stages.filter((s) => doneStages.includes(s)).length;
          const isEvidenceUnmet =
            prerequisiteStatus.unmetEvidencePrerequisiteIds?.includes(prereq.id);

          return (
            <li
              key={prereq.id}
              className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--foreground)] block">
                  {prereq.title}
                </span>
                <span className="text-[11px] text-[var(--foreground-muted)] font-mono block">
                  {isEvidenceUnmet
                    ? `Curriculum complete (${doneCount}/${prereq.stages.length} stages) — demonstrated practice or assessment evidence required before unlocking ${topic.title}`
                    : `${doneCount} of ${prereq.stages.length} stages complete — required before ${topic.title}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTopic(prereq.id)}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--accent)] hover:border-[var(--border-active)] hover:text-[var(--foreground)] transition-all shrink-0 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <span>{isEvidenceUnmet ? `Practice ${prereq.title}` : `Open ${prereq.title}`}</span>
                <ArrowRight className="size-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
