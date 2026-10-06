import React, { useMemo } from 'react';
import type {
  PreparationTopic,
  PreparationTopicProgress,
  TopicSkillState,
  PracticeAttempt,
} from '../../types';
import { evaluateTopicPreparedness } from '../../engine/preparationEngine';
import { CheckCircle2, ShieldCheck, Award, Sparkles } from 'lucide-react';

interface PreparationMasteryStripProps {
  topics: PreparationTopic[];
  topicProgressMap: Record<string, PreparationTopicProgress>;
  skillStates: Record<string, TopicSkillState>;
  attempts: PracticeAttempt[];
  activeTopic?: PreparationTopic | null;
  onSelectTopic?: (topic: PreparationTopic) => void;
}

export const PreparationMasteryStrip: React.FC<PreparationMasteryStripProps> = ({
  topics,
  topicProgressMap,
  skillStates,
  attempts,
  activeTopic,
  onSelectTopic,
}) => {
  // Compute prepared states for all topics
  const {
    coveredCount,
    provenCount,
    readyCount,
    totalTopics,
    coveredPercent,
    provenPercent,
    readyPercent,
  } = useMemo(() => {
    let covered = 0;
    let proven = 0;
    let ready = 0;
    const total = topics.length || 13;

    for (const topic of topics) {
      const prog = topicProgressMap[topic.id];
      const skill = skillStates[topic.id];
      const preparedness = evaluateTopicPreparedness({
        topic,
        progress: prog,
        skillState: skill
          ? { evidenceStrength: skill.evidenceStrength, freshness: skill.freshness }
          : undefined,
        attempts,
      });

      if (preparedness.covered) covered++;
      if (preparedness.practiced || preparedness.evidenceStrength >= 40) proven++;
      if (preparedness.readiness === 'ready') ready++;
    }

    return {
      coveredCount: covered,
      provenCount: proven,
      readyCount: ready,
      totalTopics: total,
      coveredPercent: Math.round((covered / total) * 100),
      provenPercent: Math.round((proven / total) * 100),
      readyPercent: Math.round((ready / total) * 100),
    };
  }, [topics, topicProgressMap, skillStates, attempts]);

  return (
    <section
      aria-label="Preparation Macro Readiness Strip"
      data-testid="preparation-mastery-strip"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {/* 1. Curriculum Covered */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Curriculum Covered
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold font-mono text-[var(--foreground)]"
              data-testid="prep-covered-count"
            >
              {coveredCount}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-mono">
              / {totalTopics} ({coveredPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            Orient & Learn stages complete
          </p>
        </div>

        <div className="w-full bg-[var(--surface-muted)] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-300 ease-out"
            role="progressbar"
            aria-valuenow={coveredPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Curriculum coverage progress"
            style={{ width: `${Math.min(100, coveredPercent)}%` }}
          />
        </div>
      </div>

      {/* 2. Demonstrated Proofs */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Demonstrated Proofs
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <ShieldCheck className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold font-mono text-[var(--foreground)]"
              data-testid="prep-proven-count"
            >
              {provenCount}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-mono">
              / {totalTopics} ({provenPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            Practice drills & assessment proof
          </p>
        </div>

        <div className="w-full bg-[var(--surface-muted)] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300 ease-out"
            role="progressbar"
            aria-valuenow={provenPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Demonstrated proofs progress"
            style={{ width: `${Math.min(100, provenPercent)}%` }}
          />
        </div>
      </div>

      {/* 3. Placement Ready */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Placement Ready
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <Award className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold font-mono text-[var(--foreground)]"
              data-testid="prep-ready-count"
            >
              {readyCount}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-mono">
              / {totalTopics} ({readyPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
            Met target level requirements
          </p>
        </div>

        <div className="w-full bg-[var(--surface-muted)] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[var(--success)] h-1.5 rounded-full transition-all duration-300 ease-out"
            role="progressbar"
            aria-valuenow={readyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Placement readiness progress"
            style={{ width: `${Math.min(100, readyPercent)}%` }}
          />
        </div>
      </div>

      {/* 4. Active Focus Topic */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Active Focus
          </span>
          <div className="size-6 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--warning)]">
            <Sparkles className="size-3.5" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold text-[var(--foreground)] truncate max-w-[180px]"
              data-testid="prep-active-focus-title"
            >
              {activeTopic ? activeTopic.title : 'Ready to begin'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5 truncate">
            {activeTopic ? `In Domain: ${activeTopic.domainId.toUpperCase()}` : 'Select a topic to start learning'}
          </p>
        </div>

        {activeTopic && onSelectTopic ? (
          <button
            onClick={() => onSelectTopic(activeTopic)}
            className="w-full py-1 text-center text-xs font-semibold text-[var(--accent)] hover:text-[var(--primary-hover)] transition-colors flex items-center justify-between"
          >
            <span>Resume Focus</span>
            <span className="font-mono text-[11px]">→</span>
          </button>
        ) : (
          <div className="h-6 flex items-center text-[11px] text-[var(--foreground-muted)] font-mono">
            4 domains open
          </div>
        )}
      </div>
    </section>
  );
};
