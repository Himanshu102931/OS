import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { BASELINE_ASSESSMENT_DEFINITION } from '../../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../../data/assessment/items';
import {
  isAttemptExpired,
  deriveWeeklyAssessmentReadout,
} from '../../engine/assessmentEngine';
import {
  resolveAssessmentLearningTargets,
  getPrimaryAssessmentAction,
  getAssessmentTargetDeepLink,
  type AssessmentLearningTarget,
} from '../../engine/assessmentIntegration';
import type {
  AssessmentConfidence,
  AssessmentItem,
  AssessmentExecutionResult,
} from '../../types';
import type { RoutePath } from '../../context/PlacementContext';
import { AssessmentLobby } from './AssessmentLobby';
import { AssessmentExecutionRunner } from './AssessmentExecutionRunner';
import { AssessmentBenchmarkReadout } from './AssessmentBenchmarkReadout';

/**
 * Editable draft for the active item, derived from its recorded response.
 *
 * Text entries are recorded synchronously on every change (`onChange` ->
 * `handleAnswerChange`) and responses are stored verbatim, so the recorded
 * response always equals what the user typed. Deriving the draft from it keeps
 * the input correct on mount, navigation, and "Don't know"/"Skip" without a
 * mirrored local copy or a re-synchronizing effect.
 */
const draftFromRecorded = (
  recorded: { response: number | string } | undefined
): string =>
  recorded &&
  typeof recorded.response === 'string' &&
  recorded.response !== 'unanswered' &&
  recorded.response !== 'dont_know'
    ? recorded.response
    : '';

export const AssessmentRunnerView: React.FC = () => {
  const {
    assessmentState,
    startBaselineAssessment,
    startSundayAssessment,
    startFullReassessment,
    pendingSundayObligation,

    recordAssessmentResponse,
    submitAssessmentAttempt,
    cancelAssessmentAttempt,
    activeAssessmentAttempt,
    assessmentProfileReadout,
    setRoute,
    companyOverlays,
    selectedCompanyOverlayId,
    setSelectedCompanyOverlayId,
    companyAssessmentOverlayResult,
    skillStates,
    practiceSessions: allPracticeSessions,
    practiceAttempts,
    dsaProblems,
    dsaProgress,
    taskDefinitions,
    taskProgress,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase,
    todayDate,
  } = usePlacement();

  // Active question index
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  // Show submission confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  // Show cancellation confirmation modal
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  // Wall-clock remaining seconds
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(180 * 60);


  // Selected item sequence based on active attempt or default definition
  const orderedItems: AssessmentItem[] = useMemo(() => {
    if (activeAssessmentAttempt && activeAssessmentAttempt.selectedItemIds.length > 0) {
      const itemMap = new Map(BASELINE_ASSESSMENT_ITEMS.map((i) => [i.id, i]));
      return activeAssessmentAttempt.selectedItemIds
        .map((id) => itemMap.get(id))
        .filter((i): i is AssessmentItem => Boolean(i));
    }

    // Default: order items per module definitions
    const items: AssessmentItem[] = [];
    for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
      const modItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === mod.domainId);
      items.push(...modItems);
    }
    return items;
  }, [activeAssessmentAttempt]);

  const currentItem: AssessmentItem | undefined = orderedItems[currentIdx];

  // Responses map for active attempt
  const responseMap = useMemo(() => {
    const map = new Map<
      string,
      {
        response: number | string;
        confidence?: AssessmentConfidence;
        result: string;
        executionResult?: AssessmentExecutionResult;
      }
    >();
    if (!activeAssessmentAttempt || !assessmentState) return map;

    for (const resp of assessmentState.responses) {
      if (resp.attemptId === activeAssessmentAttempt.id) {
        map.set(resp.itemId, {
          response: resp.response,
          confidence: resp.responseConfidence,
          result: resp.result,
          executionResult: resp.executionResult,
        });
      }
    }
    return map;
  }, [activeAssessmentAttempt, assessmentState]);

  // Hard wall-clock timer & auto-submission
  const hasAutoSubmittedRef = useRef(false);

  const handleAutoSubmit = useCallback(() => {
    if (hasAutoSubmittedRef.current || !activeAssessmentAttempt) return;
    hasAutoSubmittedRef.current = true;
    submitAssessmentAttempt(activeAssessmentAttempt.id, true);
  }, [activeAssessmentAttempt, submitAssessmentAttempt]);

  useEffect(() => {
    if (!activeAssessmentAttempt || activeAssessmentAttempt.status !== 'in_progress') {
      return;
    }

    const checkTimer = () => {
      const startedAtMs = new Date(activeAssessmentAttempt.startedAt).getTime();
      const elapsedSec = Math.floor((Date.now() - startedAtMs) / 1000);
      const remainingSec = Math.max(0, activeAssessmentAttempt.timeLimitSeconds - elapsedSec);

      setTimeRemainingSeconds(remainingSec);

      if (remainingSec <= 0 || isAttemptExpired(activeAssessmentAttempt)) {
        handleAutoSubmit();
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [activeAssessmentAttempt, handleAutoSubmit]);

  // Handle answering an item
  const handleAnswerChange = (userResponse: number | string | null, confidence?: AssessmentConfidence) => {
    if (!activeAssessmentAttempt || !currentItem) return;
    const existing = responseMap.get(currentItem.id);
    const conf = confidence !== undefined ? confidence : existing?.confidence;
    recordAssessmentResponse(activeAssessmentAttempt.id, currentItem.id, userResponse, conf);
  };

  const handleConfidenceChange = (conf: AssessmentConfidence) => {
    if (!activeAssessmentAttempt || !currentItem) return;
    const existing = responseMap.get(currentItem.id);
    recordAssessmentResponse(
      activeAssessmentAttempt.id,
      currentItem.id,
      existing ? existing.response : null,
      conf
    );
  };

  // Find completed baseline and weekly attempts for metadata
  const completedBaselineAttempts = useMemo(() => {
    if (!assessmentState?.attempts) return [];
    return assessmentState.attempts.filter(
      (a) => a.kind === 'diagnostic_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
    );
  }, [assessmentState]);

  const completedWeeklyAttempts = useMemo(() => {
    if (!assessmentState?.attempts) return [];
    return assessmentState.attempts.filter(
      (a) => a.kind === 'weekly_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
    );
  }, [assessmentState]);

  const latestCompletedAttempt = completedBaselineAttempts[completedBaselineAttempts.length - 1];
  const latestWeeklyAttempt = completedWeeklyAttempts[completedWeeklyAttempts.length - 1];

  const activeWeeklyAttempt = latestWeeklyAttempt;

  const weeklyReadout = useMemo(() => {
    if (!activeWeeklyAttempt || !assessmentState) return null;
    return deriveWeeklyAssessmentReadout(
      activeWeeklyAttempt,
      assessmentState.responses || [],
      assessmentState,
      BASELINE_ASSESSMENT_ITEMS
    );
  }, [activeWeeklyAttempt, assessmentState]);

  // Assessment-derived learning targets (§7) — computed from canonical assessment signals
  // Reuses Task 4's remediationRouter via assessmentIntegration adapter
  const assessmentTargets = useMemo(() => {
    if (!assessmentProfileReadout?.isAssessed) return { targets: [] as AssessmentLearningTarget[], summary: 'Assessment not yet completed.' };
    return resolveAssessmentLearningTargets({
      domainResults: assessmentState?.domainResults || [],
      weaknessSignals: assessmentState?.weaknessSignals || [],
      assessmentProfileReadout,
      companyOverlays,
      skillStates,
      practiceSessions: allPracticeSessions,
      practiceAttempts,
      dsaProblems,
      dsaProgressMap: dsaProgress,
      tasks: taskDefinitions,
      taskProgressMap: taskProgress,
      topics,
      domains,
      preparationTopics,
      preparationTopicProgress,
      activePhase,
      todayStr: todayDate,
      selectedCompanyId: selectedCompanyOverlayId ?? undefined,
    });
  }, [
    assessmentProfileReadout,
    assessmentState,
    companyOverlays,
    skillStates,
    allPracticeSessions,
    practiceAttempts,
    dsaProblems,
    dsaProgress,
    taskDefinitions,
    taskProgress,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase,
    todayDate,
    selectedCompanyOverlayId,
  ]);

  // Primary assessment action for CTA
  const primaryAssessmentAction = useMemo(() => {
    if (!assessmentProfileReadout?.isAssessed) return null;
    return getPrimaryAssessmentAction({
      domainResults: assessmentState?.domainResults || [],
      weaknessSignals: assessmentState?.weaknessSignals || [],
      assessmentProfileReadout,
      companyOverlays,
      skillStates,
      practiceSessions: allPracticeSessions,
      practiceAttempts,
      dsaProblems,
      dsaProgressMap: dsaProgress,
      tasks: taskDefinitions,
      taskProgressMap: taskProgress,
      topics,
      domains,
      preparationTopics,
      preparationTopicProgress,
      activePhase,
      todayStr: todayDate,
      selectedCompanyId: selectedCompanyOverlayId ?? undefined,
    }, 60);
  }, [
    assessmentProfileReadout,
    assessmentState,
    companyOverlays,
    skillStates,
    allPracticeSessions,
    practiceAttempts,
    dsaProblems,
    dsaProgress,
    taskDefinitions,
    taskProgress,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase,
    todayDate,
    selectedCompanyOverlayId,
  ]);

  const primaryActionDeepLink = useMemo(() => {
    if (!primaryAssessmentAction) return null;
    return getAssessmentTargetDeepLink(primaryAssessmentAction, {
      preparationTopics,
      practiceSessions: allPracticeSessions,
      dsaProblems,
      tasks: taskDefinitions,
    });
  }, [primaryAssessmentAction, preparationTopics, allPracticeSessions, dsaProblems, taskDefinitions]);

  // ---------------------------------------------------------------------------
  // View 1: Mode B — Active Assessment Runner
  // ---------------------------------------------------------------------------
  const handleConfirmCancel = useCallback(() => {
    if (!activeAssessmentAttempt) return;
    setShowCancelModal(false);
    cancelAssessmentAttempt(activeAssessmentAttempt.id);
    setCurrentIdx(0);
  }, [activeAssessmentAttempt, cancelAssessmentAttempt]);

  if (activeAssessmentAttempt && activeAssessmentAttempt.status === 'in_progress') {
    const recordedCurrent = currentItem ? responseMap.get(currentItem.id) : undefined;
    const textInput = draftFromRecorded(recordedCurrent);

    return (
      <AssessmentExecutionRunner
        activeAttempt={activeAssessmentAttempt}
        orderedItems={orderedItems}
        currentIndex={currentIdx}
        responseMap={responseMap}
        timeRemainingSeconds={timeRemainingSeconds}
        showSubmitModal={showSubmitModal}
        showCancelModal={showCancelModal}
        textInput={textInput}
        onSelectIndex={(idx) => setCurrentIdx(idx)}
        onAnswerChange={handleAnswerChange}
        onConfidenceChange={handleConfidenceChange}
        onPrevious={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
        onNext={() => setCurrentIdx((prev) => Math.min(orderedItems.length - 1, prev + 1))}
        onOpenSubmitModal={() => setShowSubmitModal(true)}
        onCloseSubmitModal={() => setShowSubmitModal(false)}
        onConfirmSubmit={() => {
          setShowSubmitModal(false);
          submitAssessmentAttempt(activeAssessmentAttempt.id, false);
        }}
        onOpenCancelModal={() => setShowCancelModal(true)}
        onCloseCancelModal={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancel}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: Mode C — Phase D Diagnostic Benchmark Readout
  // ---------------------------------------------------------------------------
  if (assessmentProfileReadout.isAssessed) {
    return (
      <AssessmentBenchmarkReadout
        latestCompletedAttempt={latestCompletedAttempt}
        completedWeeklyAttempts={completedWeeklyAttempts}
        profileReadout={assessmentProfileReadout}
        assessmentState={assessmentState}
        weeklyReadout={weeklyReadout}
        pendingSundayObligation={pendingSundayObligation}
        companyOverlays={companyOverlays}
        selectedCompanyOverlayId={selectedCompanyOverlayId}
        companyAssessmentOverlayResult={companyAssessmentOverlayResult}
        assessmentTargets={assessmentTargets}
        primaryAssessmentActionReason={primaryAssessmentAction?.reason}
        primaryActionDeepLink={primaryActionDeepLink}
        onSelectCompanyOverlay={(id) => setSelectedCompanyOverlayId(id)}
        onNavigateTarget={(route, targetId) => setRoute(route as RoutePath, targetId)}
        onStartSunday={() => {
          startSundayAssessment();
          setCurrentIdx(0);
        }}
        onStartFullReassessment={() => {
          startFullReassessment();
          setCurrentIdx(0);
        }}
        onOpenProjectLab={() => setRoute('project')}
        onContinueToToday={() => setRoute('dashboard')}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // View 3: Mode A — Pre-Flight Lobby
  // ---------------------------------------------------------------------------
  return (
    <AssessmentLobby
      onStartBaseline={() => {
        startBaselineAssessment();
        setCurrentIdx(0);
      }}
    />
  );
};
