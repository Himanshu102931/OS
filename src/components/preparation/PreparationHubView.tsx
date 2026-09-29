import React, { useState } from 'react';
import {
  PREPARATION_SECTIONS,
  PREPARATION_TOPICS,
  getTopicsBySection,
  getPreparationTopic,
} from '../../data/preparationDataset';
import type { PreparationTopic, PreparationSection } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { evaluateTopicPreparedness, evaluatePrerequisiteStatus } from '../../engine/preparationEngine';
import { TopicWorkspace } from './TopicWorkspace';
import { PracticeSessionRunner } from './PracticeSessionRunner';
import { GuideTrigger } from '../guide/GuideTrigger';
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

export const PreparationHubView: React.FC = () => {
  const {
    skillStates,
    practiceSessions,
    practiceAttempts,
    preparationTopicProgress,
    routeState,
    setRoute,
  } = usePlacement();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Route state IS the single source of truth — no local mirror needed.
  const selectedTopic: PreparationTopic | null =
    routeState.route === 'preparation' && routeState.targetId
      ? PREPARATION_TOPICS.find((t) => t.id === routeState.targetId) ?? null
      : null;

  const handleTopicSelect = (topic: PreparationTopic) => {
    setRoute('preparation', topic.id);
  };

  const handleBackToHub = () => {
    setRoute('preparation');
  };

  const sectionIcons: Record<string, React.FC<{ className?: string }>> = {
    coding: Code2,
    core_cs: Cpu,
    aptitude_communication: Calculator,
    interview_career: Briefcase,
  };

  /**
   * The section's real active topic: the most recently accessed topic that has
   * persisted preparation progress. Never falls back to `topics[0]` — a section
   * with no progress at all has no active topic, and says so.
   */
  const getSectionActiveTopic = (topics: PreparationTopic[]): PreparationTopic | null => {
    let active: PreparationTopic | null = null;
    let latest = '';
    for (const topic of topics) {
      const progress = preparationTopicProgress[topic.id];
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
    const skill = skillStates[activeTopic.id];
    const preparedness = evaluateTopicPreparedness({
      topic: activeTopic,
      progress: preparationTopicProgress[activeTopic.id],
      skillState: skill
        ? { evidenceStrength: skill.evidenceStrength, freshness: skill.freshness }
        : undefined,
      attempts: practiceAttempts,
    });
    return {
      activeTopic,
      activeTopicLabel: activeTopic.title,
      nextAction: preparedness.nextAction,
    };
  };

  // Helper to get section average evidence score
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

  const handleStartSession = (sessionId?: string) => {
    if (sessionId) {
      setActiveSessionId(sessionId);
      return;
    }
    // Only ever launch a session that actually belongs to the open topic —
    // never fall back to an unrelated session from another domain.
    const matched = selectedTopic
      ? practiceSessions.find(
          (sess) => sess.topicId === selectedTopic.id || sess.domainId === selectedTopic.domainId
        )
      : undefined;
    setActiveSessionId(matched?.id ?? null);
  };

  // If a topic is selected, render TopicWorkspace view
  if (selectedTopic) {
    return (
      <div className="space-y-6">
        <TopicWorkspace
          key={selectedTopic.id}
          topic={selectedTopic}
          onBackToHub={handleBackToHub}
          onStartSession={handleStartSession}
        />

        {activeSessionId && (
          <PracticeSessionRunner
            session={practiceSessions.find((s) => s.id === activeSessionId) || practiceSessions[0]}
            onClose={() => setActiveSessionId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-b border-[#262D38] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#E5A93C]/15 text-[#E5A93C] rounded border border-[#E5A93C]/30 font-bold">
              System Subsystem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">PREPARATION</h1>
          <p className="text-sm text-[#8E98A8]">Build the skills required for placement.</p>
        </div>
        <GuideTrigger route="preparation" />
      </div>

      {/* 4 Major Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-in">
        {PREPARATION_SECTIONS.map((section) => {
          const Icon = sectionIcons[section.id] || Compass;
          const stats = getSectionStats(section);
          const topics = getTopicsBySection(section.id);
          const status = getSectionStatus(section);
          // Entering the workspace opens the real active topic when there is
          // one, otherwise the section's first topic (navigation only — it
          // claims nothing about progress).
          const workspaceTopic = status.activeTopic ?? topics[0];

          /* Domain-specific SVG motif */
          const sectionMotif = (() => {
            switch (section.id) {
              case 'coding':
                return (
                  <svg viewBox="0 0 40 40" className="svg-motif absolute top-4 right-4" width="40" height="40">
                    <polyline points="8,20 18,12 18,28" fill="none" stroke="#E5A93C" strokeWidth="1.5" />
                    <polyline points="22,20 32,12 32,28" fill="none" stroke="#E5A93C" strokeWidth="1.5" />
                    <line x1="18" y1="12" x2="22" y2="12" stroke="#E5A93C" strokeWidth="1" />
                    <line x1="18" y1="28" x2="22" y2="28" stroke="#E5A93C" strokeWidth="1" />
                  </svg>
                );
              case 'core_cs':
                return (
                  <svg viewBox="0 0 40 40" className="svg-motif absolute top-4 right-4" width="40" height="40">
                    <circle cx="20" cy="20" r="8" fill="none" stroke="#E5A93C" strokeWidth="1" />
                    <circle cx="20" cy="20" r="3" fill="none" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="20" y1="4" x2="20" y2="12" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="20" y1="28" x2="20" y2="36" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="4" y1="20" x2="12" y2="20" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="28" y1="20" x2="36" y2="20" stroke="#E5A93C" strokeWidth="0.5" />
                  </svg>
                );
              case 'aptitude_communication':
                return (
                  <svg viewBox="0 0 40 40" className="svg-motif absolute top-4 right-4" width="40" height="40">
                    <path d="M8,32 L14,14 L20,24 L26,10 L32,32" fill="none" stroke="#E5A93C" strokeWidth="1" />
                    <circle cx="20" cy="24" r="2" fill="#E5A93C" />
                  </svg>
                );
              case 'interview_career':
                return (
                  <svg viewBox="0 0 40 40" className="svg-motif absolute top-4 right-4" width="40" height="40">
                    <rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke="#E5A93C" strokeWidth="1" />
                    <line x1="14" y1="16" x2="26" y2="16" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="14" y1="20" x2="26" y2="20" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="14" y1="24" x2="22" y2="24" stroke="#E5A93C" strokeWidth="0.5" />
                    <circle cx="30" cy="30" r="3" fill="none" stroke="#E5A93C" strokeWidth="0.5" />
                    <line x1="32" y1="28" x2="35" y2="31" stroke="#E5A93C" strokeWidth="0.5" />
                  </svg>
                );
              default:
                return null;
            }
          })();

          return (
            <div
              key={section.id}
              className="bg-[#14171D] border border-[#262D38] hover:border-[#3B4556] rounded-[6px] p-5 sm:p-6 transition-all flex flex-col justify-between gap-5 group hover-lift relative overflow-hidden"
            >
              {sectionMotif}
              {/* Top Section Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-[4px] bg-[#1B2028] border border-[#262D38] flex items-center justify-center text-[#E5A93C]">
                      <Icon className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#F1F5F9] tracking-tight group-hover:text-[#E5A93C] transition-colors">
                        {section.title}
                      </h2>
                      <span className="text-xs text-[#8E98A8] font-medium">{section.subtitle}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#5C6675] px-2 py-1 bg-[#1B2028] border border-[#262D38] rounded">
                    {stats.topicCount} Topics
                  </span>
                </div>

                <p className="text-xs text-[#8E98A8] leading-relaxed">{section.description}</p>
              </div>

              {/* Compact Progress & Evidence Summary */}
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8E98A8]">Evidence Score</span>
                  <span className="text-[#E5A93C] font-bold">{stats.avgScore} / 100</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#5C6675]">Active Topic:</span>
                  <span
                    className={`font-medium ${status.activeTopic ? 'text-[#F1F5F9]' : 'text-[#8E98A8]'}`}
                    data-testid={`active-topic-${section.id}`}
                  >
                    {status.activeTopicLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#8E98A8] pt-1 border-t border-[#262D38]">
                  <Sparkles className="size-3 text-[#E5A93C]" />
                  <span>Next Action:</span>
                  <span className="text-[#F1F5F9] truncate font-medium" data-testid={`next-action-${section.id}`}>
                    {status.nextAction}
                  </span>
                </div>
              </div>

              {/* Topic List & Workspace Navigation */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-mono text-[#5C6675] uppercase block">Topics in Section</span>
                <div className="space-y-1.5">
                  {topics.map((topic) => {
                    const prereqStatus = evaluatePrerequisiteStatus(
                      topic,
                      getPreparationTopic,
                      preparationTopicProgress
                    );
                    const unmetTitles = prereqStatus.unmetPrerequisiteIds
                      .map((id) => getPreparationTopic(id)?.title)
                      .filter((t): t is string => Boolean(t));
                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic)}
                        className="w-full p-2.5 bg-[#1B2028]/60 hover:bg-[#1B2028] border border-[#262D38] hover:border-[#3B4556] rounded text-left flex items-center justify-between gap-3 text-xs transition-all group/btn"
                      >
                        <span className="min-w-0">
                          <span className="text-[#8E98A8] group-hover/btn:text-[#F1F5F9] font-medium block">
                            {topic.title}
                          </span>
                          {prereqStatus.isLocked && (
                            <span className="text-[10px] text-[#F59E0B] block truncate">
                              Requires: {unmetTitles.join(', ')}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] shrink-0">
                          {topic.priority === 'high' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase rounded bg-[#E5A93C]/15 text-[#E5A93C] border border-[#E5A93C]/30">
                              high
                            </span>
                          )}
                          {prereqStatus.isLocked ? (
                            <span className="flex items-center gap-1 text-[#F59E0B]">
                              <Lock className="size-3.5" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span className="text-[#E5A93C] flex items-center gap-1">
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
                onClick={() => handleTopicSelect(workspaceTopic)}
                className="w-full py-2.5 px-4 rounded-[4px] bg-[#1B2028] hover:bg-[#222833] border border-[#3B4556] text-[#F1F5F9] font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Enter {section.title} Workspace</span>
                <ArrowRight className="size-3.5 text-[#E5A93C]" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Session Runner Modal */}
      {activeSessionId && (
        <PracticeSessionRunner
          session={practiceSessions.find((s) => s.id === activeSessionId) || practiceSessions[0]}
          onClose={() => setActiveSessionId(null)}
        />
      )}
    </div>
  );
};
