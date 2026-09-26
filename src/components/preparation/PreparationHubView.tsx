import React, { useState, useEffect } from 'react';
import { PREPARATION_SECTIONS, PREPARATION_TOPICS, getTopicsBySection } from '../../data/preparationDataset';
import type { PreparationTopic, PreparationSection } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { TopicWorkspace } from './TopicWorkspace';
import { PracticeSessionRunner } from './PracticeSessionRunner';
import {
  Code2,
  Cpu,
  Calculator,
  Briefcase,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Compass,
} from 'lucide-react';

export const PreparationHubView: React.FC = () => {
  const { skillStates, practiceSessions, routeState, setRoute } = usePlacement();
  const [selectedTopic, setSelectedTopic] = useState<PreparationTopic | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auto-select topic from URL on mount
  useEffect(() => {
    if (routeState.route === 'preparation' && routeState.preparationTopicId) {
      const topic = PREPARATION_TOPICS.find(t => t.id === routeState.preparationTopicId);
      if (topic) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTopic(topic);
      }
    } else if (routeState.route !== 'preparation') {
      setSelectedTopic(null);
    }
  }, [routeState.route, routeState.preparationTopicId]);

  const handleTopicSelect = (topic: PreparationTopic) => {
    setSelectedTopic(topic);
    setRoute('preparation', topic.id);
  };

  const handleBackToHub = () => {
    setSelectedTopic(null);
    setRoute('preparation');
  };

  const sectionIcons: Record<string, React.FC<{ className?: string }>> = {
    coding: Code2,
    core_cs: Cpu,
    aptitude_communication: Calculator,
    interview_career: Briefcase,
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
    } else if (selectedTopic) {
      const s = practiceSessions.find(
        (sess) => sess.topicId === selectedTopic.id || sess.domainId === selectedTopic.domainId
      );
      if (s) {
        setActiveSessionId(s.id);
      } else {
        setActiveSessionId(practiceSessions[0]?.id || null);
      }
    } else {
      setActiveSessionId(practiceSessions[0]?.id || null);
    }
  };

  // If a topic is selected, render TopicWorkspace view
  if (selectedTopic) {
    return (
      <div className="space-y-6">
        <TopicWorkspace
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
      <div className="border-b border-[#262D38] pb-5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#E5A93C]/15 text-[#E5A93C] rounded border border-[#E5A93C]/30 font-bold">
            System Subsystem
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">PREPARATION</h1>
        <p className="text-sm text-[#8E98A8]">Build the skills required for placement.</p>
      </div>

      {/* 4 Major Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PREPARATION_SECTIONS.map((section) => {
          const Icon = sectionIcons[section.id] || Compass;
          const stats = getSectionStats(section);
          const topics = getTopicsBySection(section.id);
          const currentTopic = topics[0] || PREPARATION_TOPICS[0];

          return (
            <div
              key={section.id}
              className="bg-[#14171D] border border-[#262D38] hover:border-[#3B4556] rounded-[6px] p-5 sm:p-6 transition-all flex flex-col justify-between gap-5 group"
            >
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
                  <span className="text-[#F1F5F9] font-medium">{currentTopic.title}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#8E98A8] pt-1 border-t border-[#262D38]">
                  <Sparkles className="size-3 text-[#E5A93C]" />
                  <span>Next Action:</span>
                  <span className="text-[#F1F5F9] truncate font-medium">Take {currentTopic.title} Assessment</span>
                </div>
              </div>

              {/* Topic List & Workspace Navigation */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-mono text-[#5C6675] uppercase block">Topics in Section</span>
                <div className="space-y-1.5">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicSelect(topic)}
                      className="w-full p-2.5 bg-[#1B2028]/60 hover:bg-[#1B2028] border border-[#262D38] hover:border-[#3B4556] rounded text-left flex items-center justify-between text-xs transition-all group/btn"
                    >
                      <span className="text-[#8E98A8] group-hover/btn:text-[#F1F5F9] font-medium">{topic.title}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        {topic.priority === 'high' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase rounded bg-[#E5A93C]/15 text-[#E5A93C] border border-[#E5A93C]/30">
                            high
                          </span>
                        )}
                        <span className="text-[#E5A93C] flex items-center gap-1">
                          <span>Open</span>
                          <ChevronRight className="size-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Section Action */}
              <button
                onClick={() => handleTopicSelect(currentTopic)}
                className="w-full py-2.5 px-4 rounded-[4px] bg-[#1B2028] hover:bg-[#262D38] border border-[#3B4556] text-[#F1F5F9] font-semibold text-xs transition-all flex items-center justify-center gap-2"
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
