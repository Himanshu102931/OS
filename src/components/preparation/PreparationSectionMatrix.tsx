import React from 'react';
import type {
  PreparationSection,
  PreparationTopic,
  PreparationTopicProgress,
  TopicSkillState,
  PracticeAttempt,
} from '../../types';
import { getPreparationTopic, getTopicsBySection } from '../../data/preparationDataset';
import {
  evaluatePrerequisiteStatus,
  evaluateTopicProgression,
} from '../../engine/preparationEngine';
import {
  Code2,
  Cpu,
  Calculator,
  Briefcase,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Compass,
  Lock,
} from 'lucide-react';

interface PreparationSectionMatrixProps {
  sections: PreparationSection[];
  topicProgressMap: Record<string, PreparationTopicProgress>;
  skillStates: Record<string, TopicSkillState>;
  attempts: PracticeAttempt[];
  definingTopicId?: string | null;
  onSelectTopic: (topic: PreparationTopic) => void;
}

export const PreparationSectionMatrix: React.FC<PreparationSectionMatrixProps> = ({
  sections,
  topicProgressMap,
  skillStates,
  attempts,
  definingTopicId,
  onSelectTopic,
}) => {
  const sectionIcons: Record<string, React.FC<{ className?: string }>> = {
    coding: Code2,
    core_cs: Cpu,
    aptitude_communication: Calculator,
    interview_career: Briefcase,
  };

  /**
   * Section's real active topic: the most recently accessed topic with persisted progress.
   */
  const getSectionActiveTopic = (topics: PreparationTopic[]): PreparationTopic | null => {
    let active: PreparationTopic | null = null;
    let latest = '';
    for (const topic of topics) {
      const progress = topicProgressMap[topic.id];
      if (!progress) continue;
      const accessedAt = progress.lastAccessedAt || '';
      if (!active || accessedAt > latest) {
        active = topic;
        latest = accessedAt;
      }
    }
    return active;
  };

  /** Honest per-section status: active topic (or baseline) + its real next action. */
  const getSectionStatus = (section: PreparationSection) => {
    const topics = getTopicsBySection(section.id);
    const activeTopic = getSectionActiveTopic(topics);
    if (!activeTopic) {
      return {
        activeTopic: null as PreparationTopic | null,
        activeTopicLabel: 'Choose a topic to begin',
        nextAction: 'Choose a topic to begin',
      };
    }
    const progression = evaluateTopicProgression(
      activeTopic,
      getPreparationTopic,
      topicProgressMap,
      {
        skillStates,
        attempts,
      }
    );
    return {
      activeTopic,
      activeTopicLabel: activeTopic.title,
      nextAction: progression.actionableStep?.description || progression.preparedness.nextAction,
    };
  };

  // Section average evidence score
  const getSectionStats = (section: PreparationSection) => {
    const topics = getTopicsBySection(section.id);
    let totalScore = 0;
    let freshCount = 0;

    topics.forEach((t) => {
      const sk = skillStates[t.id];
      if (sk) {
        totalScore += sk.evidenceStrength;
        if (sk.freshness === 'fresh') freshCount++;
      }
    });

    const avgScore = topics.length > 0 ? Math.round(totalScore / topics.length) : 0;
    return { avgScore, freshCount, topicCount: topics.length };
  };

  return (
    <div className="space-y-4" data-testid="preparation-knowledge-flow-container">
      {/* Signature Motion: Preparation Knowledge Flow Rail */}
      <div
        data-testid="prep-knowledge-flow"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Preparation Knowledge Flow
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--foreground-muted)] hidden sm:inline-block">
            Learning → Practice → Proof → Placement
          </span>
        </div>

        {/* 4-Section Connected Flow Rail with Traveling Signal */}
        <div className="relative pt-1 pb-1">
          {/* Baseline Track Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--surface-muted)] -translate-y-1/2 rounded-full prep-flow-track">
            {/* Luminous Animated Traveler */}
            <div
              data-testid="prep-knowledge-traveler"
              className="prep-knowledge-traveler"
              aria-hidden="true"
            />
          </div>

          {/* 4 Section Progression Waypoints */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 z-10">
            {sections.map((sec, idx) => {
              const Icon = sectionIcons[sec.id] || Compass;
              const topics = getTopicsBySection(sec.id);
              const isDefining = definingTopicId && topics.some((t) => t.id === definingTopicId);
              const stageLabels = ['Learning', 'Foundations', 'Practice & Drill', 'Proof & Placement'];

              return (
                <div
                  key={sec.id}
                  data-testid={`prep-flow-step-${sec.id}`}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-elevated)] border transition-all text-xs ${
                    isDefining
                      ? 'border-[var(--accent)] text-[var(--foreground)] prep-active-section-pulse'
                      : 'border-[var(--border)] text-[var(--foreground-muted)]'
                  }`}
                >
                  <div
                    className={`size-6 rounded flex items-center justify-center shrink-0 text-[10px] font-mono font-bold ${
                      isDefining
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border border-[var(--border)]'
                    }`}
                  >
                    0{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Icon className="size-3 text-[var(--accent)] shrink-0" aria-hidden="true" />
                      <span className="font-semibold truncate text-[11px] text-[var(--foreground)]">
                        {sec.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--foreground-subtle)] font-mono block truncate">
                      {stageLabels[idx]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section
        aria-label="Preparation Section Progression Matrix"
        data-testid="preparation-section-matrix"
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
      {sections.map((section) => {
        const Icon = sectionIcons[section.id] || Compass;
        const stats = getSectionStats(section);
        const topics = getTopicsBySection(section.id);
        const status = getSectionStatus(section);
        const workspaceTopic = status.activeTopic ?? topics[0];
        const isDefiningSection =
          definingTopicId && topics.some((t) => t.id === definingTopicId);

        return (
          <div
            key={section.id}
            data-testid={`section-card-${section.id}`}
            className={`bg-[var(--surface)] border rounded-xl p-5 sm:p-6 transition-all flex flex-col justify-between gap-5 group ${
              isDefiningSection
                ? 'border-[var(--border-active)] prep-active-section-pulse'
                : 'border-[var(--border)] hover:border-[var(--border-active)]'
            }`}
          >
            {/* Top Section Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Icon className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight group-hover:text-[var(--accent)] transition-colors">
                      {section.title}
                    </h2>
                    <span className="text-xs text-[var(--foreground-muted)] font-medium">
                      {section.subtitle}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[var(--foreground-muted)] px-2 py-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-md">
                  {stats.topicCount} Topics
                </span>
              </div>

              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                {section.description}
              </p>
            </div>

            {/* Progress & Evidence Summary */}
            <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--foreground-muted)]">Evidence Score</span>
                <span className="text-[var(--accent)] font-bold">{stats.avgScore} / 100</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--foreground-subtle)]">Active Topic:</span>
                <span
                  className={`font-medium ${status.activeTopic ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}
                  data-testid={`active-topic-${section.id}`}
                >
                  {status.activeTopicLabel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)] pt-1 border-t border-[var(--border)]">
                <Sparkles className="size-3 text-[var(--accent)] shrink-0" />
                <span className="shrink-0">Next Action:</span>
                <span
                  className="text-[var(--foreground)] truncate font-medium"
                  data-testid={`next-action-${section.id}`}
                >
                  {status.nextAction}
                </span>
              </div>
            </div>

            {/* Topic List & Progression Status */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-[var(--foreground-subtle)] uppercase block tracking-wider">
                Topics in Section
              </span>
              <div className="space-y-1.5">
                {topics.map((topic) => {
                  const prereqStatus = evaluatePrerequisiteStatus(
                    topic,
                    getPreparationTopic,
                    topicProgressMap,
                    {
                      skillStates,
                      attempts,
                    }
                  );
                  const progression = evaluateTopicProgression(
                    topic,
                    getPreparationTopic,
                    topicProgressMap,
                    {
                      skillStates,
                      attempts,
                    }
                  );
                  const unmetTitles = prereqStatus.unmetPrerequisiteIds
                    .map((id) => getPreparationTopic(id)?.title)
                    .filter((t): t is string => Boolean(t));

                  return (
                    <button
                      key={topic.id}
                      onClick={() => onSelectTopic(topic)}
                      data-testid={`topic-item-${topic.id}`}
                      className="w-full p-2.5 bg-[var(--surface-elevated)]/60 hover:bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--border-active)] rounded-lg text-left flex items-center justify-between gap-3 text-xs transition-all group/btn focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                    >
                      <span className="min-w-0">
                        <span className="text-[var(--foreground-muted)] group-hover/btn:text-[var(--foreground)] font-medium block">
                          {topic.title}
                        </span>
                        {prereqStatus.isLocked && (
                          <span className="text-[10px] text-[var(--warning)] block truncate">
                            {prereqStatus.unmetEvidencePrerequisiteIds?.length
                              ? `Requires proof in: ${unmetTitles.join(', ')}`
                              : `Requires: ${unmetTitles.join(', ')}`}
                          </span>
                        )}
                        {!prereqStatus.isLocked && progression.state === 'learned_unproven' && (
                          <span className="text-[10px] text-[var(--warning)] block truncate">
                            Learned • Practice proof required
                          </span>
                        )}
                        {!prereqStatus.isLocked && progression.state === 'ready_to_progress' && (
                          <span className="text-[10px] text-[var(--success)] block truncate">
                            Evidenced • Ready to progress
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] shrink-0 font-mono">
                        {topic.priority === 'high' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase rounded bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                            high
                          </span>
                        )}
                        {prereqStatus.isLocked ? (
                          <span className="flex items-center gap-1 text-[var(--warning)]">
                            <Lock className="size-3.5" />
                            <span>Locked</span>
                          </span>
                        ) : progression.state === 'learned_unproven' ? (
                          <span className="text-[var(--warning)] flex items-center gap-1">
                            <span>Practice</span>
                            <ChevronRight className="size-3.5" />
                          </span>
                        ) : progression.state === 'ready_to_progress' ? (
                          <span className="text-[var(--success)] flex items-center gap-1">
                            <span>Ready</span>
                            <ChevronRight className="size-3.5" />
                          </span>
                        ) : (
                          <span className="text-[var(--accent)] flex items-center gap-1">
                            <span>Open</span>
                            <ChevronRight className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Section Action */}
            <button
              onClick={() => onSelectTopic(workspaceTopic)}
              data-testid={isDefiningSection ? 'prep-defining-action' : undefined}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none ${
                isDefiningSection
                  ? 'bg-[var(--action-accent)] text-[var(--action-accent-foreground)] hover:bg-[var(--action-accent-hover)] shadow-sm'
                  : 'bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)]'
              }`}
            >
              <span>Enter {section.title} Workspace</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        );
      })}
      </section>
    </div>
  );
};
