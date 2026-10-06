import React, { useState } from 'react';
import type { PreparationTopic, TopicStageId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { useSession } from '../dashboard/SessionContext';
import {
  evaluateTopicPreparedness,
  selectPreparationStage,
  resolveInitialStage,
  evaluatePrerequisiteStatus,
  evaluateTopicProgression,
} from '../../engine/preparationEngine';
import { getPreparationTopic } from '../../data/preparationDataset';
import { TopicWorkspaceHeader } from './TopicWorkspaceHeader';
import { TopicPrerequisiteGate } from './TopicPrerequisiteGate';
import { TopicStageContent } from './TopicStageContent';

interface TopicWorkspaceProps {
  topic: PreparationTopic;
  onBackToHub?: () => void;
  onStartSession?: (sessionId?: string) => void;
}

function useSafeSession() {
  try {
    return useSession();
  } catch {
    return null;
  }
}

export const TopicWorkspace: React.FC<TopicWorkspaceProps> = ({
  topic,
  onBackToHub,
  onStartSession,
}) => {
  const {
    routeState,
    setRoute,
    skillStates,
    practiceSessions,
    practiceAttempts,
    evidenceLogs,
    preparationTopicProgress,
    updatePreparationTopicProgress,
    completePreparationStage,
  } = usePlacement();
  const session = useSafeSession();
  const [dismissedTargetId, setDismissedTargetId] = useState<string | null>(null);

  const isDeepLinked =
    routeState.route === 'preparation' &&
    Boolean(routeState.targetId) &&
    routeState.targetId === topic.id &&
    routeState.targetId !== dismissedTargetId;

  const topicProgress = preparationTopicProgress[topic.id];

  // Restores the stage THIS topic saved, falling back to the topic's first stage
  const [activeStage, setActiveStage] = useState<TopicStageId>(() =>
    resolveInitialStage(topic, topicProgress)
  );

  const topicSkill = skillStates[topic.id] || {
    topicId: topic.id,
    domainId: topic.domainId,
    freshness: 'untested' as const,
    evidenceStrength: 0,
  };

  // Availability from demonstrated prerequisite chain
  const prerequisiteStatus = evaluatePrerequisiteStatus(
    topic,
    getPreparationTopic,
    preparationTopicProgress,
    {
      skillStates,
      attempts: practiceAttempts,
    }
  );
  const unmetPrerequisiteTopics = prerequisiteStatus.unmetPrerequisiteIds
    .map((id) => getPreparationTopic(id))
    .filter((t): t is PreparationTopic => Boolean(t));

  const progression = evaluateTopicProgression(
    topic,
    getPreparationTopic,
    preparationTopicProgress,
    {
      skillStates,
      attempts: practiceAttempts,
    }
  );

  // Reusable preparedness model
  const preparedness = evaluateTopicPreparedness({
    topic,
    progress: topicProgress,
    skillState: {
      evidenceStrength: topicSkill.evidenceStrength,
      freshness: topicSkill.freshness,
    },
    attempts: practiceAttempts,
  });

  const handleStageSelect = (stage: TopicStageId) => {
    setActiveStage(stage);
    updatePreparationTopicProgress(
      selectPreparationStage(topic, topicProgress, stage, new Date().toISOString())
    );
  };

  const handleMarkStageComplete = () => {
    completePreparationStage(topic, activeStage);
    if (isDeepLinked) {
      setDismissedTargetId(routeState.targetId ?? null);
      session?.advanceActivity('completed');
      setRoute('dashboard');
    } else {
      const updatedStages = topicProgress?.completedStages.includes(activeStage)
        ? topicProgress.completedStages
        : [...(topicProgress?.completedStages ?? []), activeStage];
      const nextStage = topic.stages.find((s) => !updatedStages.includes(s)) ?? activeStage;
      if (topic.stages.includes(nextStage)) {
        setActiveStage(nextStage);
      }
    }
  };

  const handleCompleteActivity = () => {
    completePreparationStage(topic, activeStage);
    setDismissedTargetId(routeState.targetId ?? null);
    session?.advanceActivity('completed');
    setRoute('dashboard');
  };

  const handleBack = () => {
    if (isDeepLinked) {
      setDismissedTargetId(routeState.targetId ?? null);
      setRoute('dashboard');
    } else if (onBackToHub) {
      onBackToHub();
    }
  };

  const navigateToRoadmap = () => {
    if (topic.roadmapTopicId) {
      setRoute('roadmap', topic.roadmapTopicId);
    }
  };

  const handleNavigateTopic = (targetTopicId: string) => {
    setRoute('preparation', targetTopicId);
  };

  const handleDismissDeepLink = () => {
    setDismissedTargetId(routeState.targetId ?? null);
    setRoute('dashboard');
  };

  // Topic specific sessions
  const matchingSessions = practiceSessions.filter(
    (s) => s.topicId === topic.id || s.domainId === topic.domainId
  );

  // Topic specific attempts
  const topicAttempts = practiceAttempts.filter(
    (a) => a.topicId === topic.id || a.domainId === topic.domainId
  );

  // Topic specific evidence logs
  const topicEvidence = evidenceLogs.filter(
    (e) => e.topicId === topic.id || e.domainId === topic.domainId
  );

  return (
    <div className="space-y-6" data-testid="topic-knowledge-workspace">
      {/* Zone 3: Workspace Context & Topic Preparedness Header */}
      <TopicWorkspaceHeader
        topic={topic}
        topicSkill={topicSkill}
        preparedness={preparedness}
        progression={progression}
        prerequisiteStatus={prerequisiteStatus}
        unmetPrerequisiteTopics={unmetPrerequisiteTopics}
        isDeepLinked={isDeepLinked}
        matchingSessions={matchingSessions}
        onBack={handleBack}
        onNavigateRoadmap={navigateToRoadmap}
        onDismissDeepLink={handleDismissDeepLink}
        onCompleteActivity={handleCompleteActivity}
        onStartSession={onStartSession}
      />

      {/* Zone 4: Prerequisite Proof Gate (Only rendered when locked) */}
      {prerequisiteStatus.isLocked && (
        <TopicPrerequisiteGate
          topic={topic}
          prerequisiteStatus={prerequisiteStatus}
          unmetPrerequisiteTopics={unmetPrerequisiteTopics}
          topicProgressMap={preparationTopicProgress}
          onNavigateTopic={handleNavigateTopic}
        />
      )}

      {/* Zone 5: 7-Stage Progression Workspace (Rendered when unlocked) */}
      {!prerequisiteStatus.isLocked && (
        <TopicStageContent
          topic={topic}
          activeStage={activeStage}
          topicProgress={topicProgress}
          topicSkill={topicSkill}
          topicAttempts={topicAttempts}
          topicEvidence={topicEvidence}
          matchingSessions={matchingSessions}
          coveragePct={preparedness.coveragePct}
          onSelectStage={handleStageSelect}
          onMarkStageComplete={handleMarkStageComplete}
          onNavigateTopic={handleNavigateTopic}
          onStartSession={onStartSession}
        />
      )}
    </div>
  );
};
