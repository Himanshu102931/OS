import React, { useState, useMemo } from 'react';
import {
  PREPARATION_SECTIONS,
  PREPARATION_TOPICS,
} from '../../data/preparationDataset';
import type { PreparationTopic } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { evaluateTopicPreparedness } from '../../engine/preparationEngine';
import { PreparationHeader } from './PreparationHeader';
import { PreparationMasteryStrip } from './PreparationMasteryStrip';
import { PreparationSectionMatrix } from './PreparationSectionMatrix';
import { TopicWorkspace } from './TopicWorkspace';
import { PracticeSessionRunner } from './PracticeSessionRunner';

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

  /**
   * Determine the most urgent/active topic across the entire hub:
   * 1. Most recently accessed topic that has progress
   * 2. Fallback: First unlocked topic in the curriculum (prep-lang)
   */
  const activeFocusTopic: PreparationTopic | null = useMemo(() => {
    let latestTopic: PreparationTopic | null = null;
    let latestTime = '';

    for (const topic of PREPARATION_TOPICS) {
      const prog = preparationTopicProgress[topic.id];
      if (prog?.lastAccessedAt && prog.lastAccessedAt > latestTime) {
        latestTopic = topic;
        latestTime = prog.lastAccessedAt;
      }
    }

    return latestTopic ?? PREPARATION_TOPICS[0] ?? null;
  }, [preparationTopicProgress]);

  // Compute ready topics count for macro header
  const readyTopicsCount = useMemo(() => {
    return PREPARATION_TOPICS.filter((t) => {
      const prog = preparationTopicProgress[t.id];
      const skill = skillStates[t.id];
      const prep = evaluateTopicPreparedness({
        topic: t,
        progress: prog,
        skillState: skill
          ? { evidenceStrength: skill.evidenceStrength, freshness: skill.freshness }
          : undefined,
        attempts: practiceAttempts,
      });
      return prep.readiness === 'ready';
    }).length;
  }, [preparationTopicProgress, skillStates, practiceAttempts]);

  const handleStartSession = (sessionId?: string) => {
    if (sessionId) {
      setActiveSessionId(sessionId);
      return;
    }
    // Only launch a session that actually belongs to the open topic
    const matched = selectedTopic
      ? practiceSessions.find(
          (sess) => sess.topicId === selectedTopic.id || sess.domainId === selectedTopic.domainId
        )
      : undefined;
    setActiveSessionId(matched?.id ?? null);
  };

  // If a topic is selected, render TopicWorkspace view (Layer B)
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

  // Layer A: Preparation Hub View
  return (
    <div className="space-y-6" data-testid="preparation-hub-view">
      {/* Zone 1: Hub Header */}
      <PreparationHeader
        totalTopicsCount={PREPARATION_TOPICS.length}
        readyTopicsCount={readyTopicsCount}
      />

      {/* Zone 1: Macro Readiness Strip */}
      <PreparationMasteryStrip
        topics={PREPARATION_TOPICS}
        topicProgressMap={preparationTopicProgress}
        skillStates={skillStates}
        attempts={practiceAttempts}
        activeTopic={activeFocusTopic}
        onSelectTopic={handleTopicSelect}
      />

      {/* Zone 2: Section Progression Matrix */}
      <PreparationSectionMatrix
        sections={PREPARATION_SECTIONS}
        topicProgressMap={preparationTopicProgress}
        skillStates={skillStates}
        attempts={practiceAttempts}
        definingTopicId={activeFocusTopic?.id}
        onSelectTopic={handleTopicSelect}
      />

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
