import React, { useState } from 'react';
import type { PreparationTopic, TopicStageId, ContinuousLearningStep } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { useSession } from '../dashboard/SessionContext';
import {
  evaluateTopicPreparedness,
  selectPreparationStage,
  resolveInitialStage,
  evaluatePrerequisiteStatus,
  evaluateTopicProgression,
  resolveContinuousLearningStep,
  resolveSubtopicIndex,
  updateLearningCursor,
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

  const isCurrentSessionActivity = Boolean(
    session?.currentActivity &&
    (session.currentActivity.targetId === topic.id || session.currentActivity.id === topic.id)
  );

  const topicProgress = preparationTopicProgress[topic.id];

  // Continuous Learning 3-Step State: learn -> practice -> check
  const [activeStep, setActiveStep] = useState<ContinuousLearningStep>(() =>
    resolveContinuousLearningStep(topic, topicProgress)
  );

  // Exact subtopic reading position (0-based)
  const [subtopicIndex, setSubtopicIndex] = useState<number>(() =>
    resolveSubtopicIndex(topic, topicProgress)
  );

  // Legacy stage state for backward compatibility
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

  const handleStepSelect = (step: ContinuousLearningStep) => {
    setActiveStep(step);
    updatePreparationTopicProgress(
      updateLearningCursor(topic, topicProgress, step, subtopicIndex)
    );
  };

  const handleSubtopicSelect = (index: number) => {
    const maxIdx = Math.max(0, (topic.subtopics?.length ?? 1) - 1);
    const clamped = Math.max(0, Math.min(index, maxIdx));
    setSubtopicIndex(clamped);
    updatePreparationTopicProgress(
      updateLearningCursor(topic, topicProgress, activeStep, clamped)
    );
  };

  const handleStageSelect = (stage: TopicStageId) => {
    setActiveStage(stage);
    if (stage === 'orient' || stage === 'learn') {
      setActiveStep('learn');
    } else if (stage === 'apply' || stage === 'assess') {
      setActiveStep('practice');
    } else {
      setActiveStep('check');
    }
    updatePreparationTopicProgress(
      selectPreparationStage(topic, topicProgress, stage, new Date().toISOString())
    );
  };

  const handleMarkStageComplete = (stage?: TopicStageId) => {
    const targetStage =
      stage ??
      (activeStep === 'learn'
        ? topicProgress?.completedStages.includes('orient')
          ? 'learn'
          : 'orient'
        : activeStep === 'practice'
        ? 'apply'
        : 'review');

    completePreparationStage(topic, targetStage);

    if (activeStep === 'learn' && targetStage === 'orient' && !topicProgress?.completedStages.includes('learn')) {
      setActiveStage('learn');
    }
  };

  const handleCompleteActivity = () => {
    const targetStage = activeStage || (topic.stages[0] ?? 'orient');
    completePreparationStage(topic, targetStage);
    setDismissedTargetId(routeState.targetId ?? null);
    // Check A: Verify workspace target matches the session activity being completed
    if (isCurrentSessionActivity && session?.currentActivity?.id) {
      session.advanceActivity('completed', topic.id);
    }
    setRoute('dashboard');
  };

  const handleBack = () => {
    if (isDeepLinked) {
      setDismissedTargetId(routeState.targetId ?? null);
      setRoute('dashboard');
    } else if (onBackToHub) {
      onBackToHub();
    } else {
      setRoute('preparation');
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
      {/* Workspace Header with 3-step navigation */}
      <TopicWorkspaceHeader
        topic={topic}
        topicSkill={topicSkill}
        preparedness={preparedness}
        progression={progression}
        prerequisiteStatus={prerequisiteStatus}
        unmetPrerequisiteTopics={unmetPrerequisiteTopics}
        isDeepLinked={isDeepLinked}
        matchingSessions={matchingSessions}
        activeStep={activeStep}
        onSelectStep={handleStepSelect}
        onBack={handleBack}
        onNavigateRoadmap={navigateToRoadmap}
        onDismissDeepLink={handleDismissDeepLink}
        onCompleteActivity={handleCompleteActivity}
        onStartSession={onStartSession}
      />

      {/* Actionable Prerequisite Gate (Rendered when locked) */}
      {prerequisiteStatus.isLocked && (
        <TopicPrerequisiteGate
          topic={topic}
          prerequisiteStatus={prerequisiteStatus}
          unmetPrerequisiteTopics={unmetPrerequisiteTopics}
          topicProgressMap={preparationTopicProgress}
          onNavigateTopic={handleNavigateTopic}
        />
      )}

      {/* Continuous Learning Workspace (Rendered when unlocked) */}
      {!prerequisiteStatus.isLocked && (
        <TopicStageContent
          topic={topic}
          activeStep={activeStep}
          subtopicIndex={subtopicIndex}
          onSelectStep={handleStepSelect}
          onSelectSubtopic={handleSubtopicSelect}
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
          onBackToHub={onBackToHub}
        />
      )}
    </div>
  );
};
