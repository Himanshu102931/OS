import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TodayHeroVisual } from './TodayHeroVisual';
import { StateStrip } from './StateStrip';
import { AttentionRail } from './AttentionRail';
import { ExecutionQueue, type QueuePlanItem } from './ExecutionQueue';
import { ProgressPanel } from './ProgressPanel';
import { SignalsFocus } from './SignalsFocus';
import { ReflectionBand } from './ReflectionBand';
import { TelemetryDisclosure } from './TelemetryDisclosure';
import { CompletionAnimation } from './CompletionAnimation';
import { GuideTrigger } from '../guide/GuideTrigger';
import { getEvaluatedCandidates, evaluatePracticeSignals } from '../../engine/adaptiveEngine';
import { generateReviewCandidates } from '../../engine/reviewScheduler';
import { evaluateAnalyticsTelemetry } from '../../engine/analyticsEngine';
import { buildReviewPromptDatasets, filterNavigablePrompts, isPromptDue } from '../../engine/reviewPromptAdapter';
import { captureCompletionRestore, captureDeferRestore, type TaskStateRestore } from '../../engine/taskStateEngine';
import { getRecommendedPracticeSession } from '../../engine/practiceEngine';
import {
  mapCompanyRequirementTargets,
  buildCompanyFocusSummary,
} from '../../engine/companyPlanEngine';
import { buildReviewCandidateTrace } from '../../engine/evidenceTrace';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import {
  getTaskLearningRoute,
  getLearningDestinationLabel,
  buildCompletionNextStep,
} from '../../engine/taskFlowEngine';
import type { TaskProgress, TaskDefinition, PracticeSessionDefinition } from '../../types';
import type { SessionActivity } from '../../engine/sessionComposer';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';
import { SessionProvider } from './SessionProvider';
import { SessionModals } from './SessionModals';
import {
  Building2, Sun, BookOpen, Clock, SkipForward, Sparkles, Check,
  AlertCircle, CheckCircle2, X, HelpCircle,
} from 'lucide-react';
import { MonoChip, TodayButton, PrimaryCTA } from './todayPrimitives';

/**
 * C7-09 — every Today section that renders `.scroll-reveal`, by the id its
 * `data-reveal` attribute carries. Graceful-fallback set for IntersectionObserver.
 */
const REVEAL_IDS = ['hero', 'journey', 'progress', 'signals', 'review', 'telemetry'];

export const DashboardView: React.FC = () => {
  const {
    taskDefinitions, taskProgress, dsaProblems, dsaProgress, dsaAttempts,
    domains, topics, activePhase, currentMode, todayDate, updateTaskState,
    restoreTaskTransaction, setRoute, companyOverlays, skillStates, dailyCheckIns,
    dailyTaskAssignments, commitDailyPlan, sealDayExecution, syncDailyAssignmentCompletion,
    decomposeTask, practiceSessions, practiceAttempts,
    recordPracticeAttempt, evidenceLogs, pendingSundayObligation,
    preparationTopicProgress, assessmentProfileReadout, assessmentState,
  } = usePlacement();
  const evidenceCatalog = useEvidenceCatalog();

  const [isMorningModalOpen, setIsMorningModalOpen] = useState(false);
  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [activePracticeSession, setActivePracticeSession] = useState<PracticeSessionDefinition | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const selectedCompany = useMemo(() =>
    selectedCompanyId ? companyOverlays.find((c) => c.id === selectedCompanyId) : null,
    [selectedCompanyId, companyOverlays]
  );

  const [completionInfo, setCompletionInfo] = useState<{
    taskId: string; taskTitle: string; previousState: TaskProgress['state']; restore: TaskStateRestore;
  } | null>(null);

  const [pendingAction, setPendingAction] = useState<{ taskId: string; action: 'postpone' | 'skip'; restore: TaskStateRestore } | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ taskId: string; restore: TaskStateRestore } | null>(null);
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());
  const isObserverActive = typeof IntersectionObserver !== 'undefined';
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const revealEverything = () => setRevealedSections(new Set(REVEAL_IDS));

    if (typeof IntersectionObserver === 'undefined') {
      revealEverything();
      return;
    }

    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.reveal || '';
              if (id) setRevealedSections((prev) => new Set([...prev, id]));
            }
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        observerRef.current?.observe(el);
      });
    } catch {
      observerRef.current = null;
      revealEverything();
    }
    return () => { observerRef.current?.disconnect(); };
  }, []);

  const setScrollRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      el.dataset.reveal = id;
      if (observerRef.current) observerRef.current.observe(el);
    }
  }, []);

  const todayCheckIn = dailyCheckIns.find((c) => c.date === todayDate);
  const isDaySealed = todayCheckIn?.isSealed ?? false;
  const todayAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);
  const isPlanCommitted = todayAssignments.length > 0;

  // C6 — THE canonical candidate evaluation for Today. EXACTLY ONE call.
  const evaluatedCandidates = useMemo(() =>
    getEvaluatedCandidates(
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      skillStates,
      companyOverlays,
      currentMode,
      todayDate,
      selectedCompanyId || undefined
    ),
    [
      taskDefinitions, taskProgress, dsaProblems, dsaProgress,
      skillStates, companyOverlays, currentMode, todayDate, selectedCompanyId,
    ]
  );

  const nextBestActionCandidate = evaluatedCandidates[0];
  const nextBestActionTask = nextBestActionCandidate?.task;
  const nextActionState = nextBestActionTask ? taskProgress[nextBestActionTask.id]?.state || 'not_started' : 'not_started';

  const practiceRecommendation = useMemo(
    () => getRecommendedPracticeSession(practiceSessions, practiceAttempts, skillStates, companyOverlays),
    [practiceSessions, practiceAttempts, skillStates, companyOverlays]
  );

  const practiceSignals = useMemo(
    () => evaluatePracticeSignals(practiceAttempts, skillStates, companyOverlays),
    [practiceAttempts, skillStates, companyOverlays]
  );
  const activeSignalChips = useMemo(() => [
    { key: 'assessmentDue', label: 'Assessment due', active: practiceSignals.assessmentDue },
    { key: 'weakTopic', label: 'Weak topic', active: practiceSignals.weakTopic },
    { key: 'stalePreparationTopic', label: 'Evidence aging', active: practiceSignals.stalePreparationTopic },
    { key: 'lowAccuracy', label: 'Low accuracy', active: practiceSignals.lowAccuracy },
    { key: 'interviewPracticeDue', label: 'Interview practice due', active: practiceSignals.interviewPracticeDue },
  ].filter((c) => c.active), [practiceSignals]);

  const analyticsTelemetry = useMemo(() =>
    evaluateAnalyticsTelemetry(
      '30d',
      todayDate,
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts || [],
      topics,
      domains,
      skillStates,
      dailyCheckIns,
      companyOverlays,
      activePhase,
      evidenceLogs
    ),
    [todayDate, taskDefinitions, taskProgress, dsaProblems, dsaProgress, dsaAttempts, topics, domains, skillStates, dailyCheckIns, companyOverlays, activePhase, evidenceLogs]
  );

  const reviewPromptDatasets = useMemo(() =>
    buildReviewPromptDatasets({
      dsaProblems,
      tasks: taskDefinitions,
      topics,
      domains,
      skillStates,
      preparationTopics: PREPARATION_TOPICS,
      practiceSessions,
    }),
    [dsaProblems, taskDefinitions, topics, domains, skillStates, practiceSessions]
  );

  const validatedReviewPrompts = useMemo(() =>
    filterNavigablePrompts(analyticsTelemetry.reviewPrompts, reviewPromptDatasets),
    [analyticsTelemetry.reviewPrompts, reviewPromptDatasets]
  );

  const primaryReviewPromptDeepLink = useMemo(() => {
    const navigable = validatedReviewPrompts.find(v =>
      v.navigable &&
      v.targetId &&
      isPromptDue(v.prompt, {
        dsaProgressMap: dsaProgress,
        taskProgressMap: taskProgress,
        skillStates,
        todayStr: todayDate,
      })
    );
    if (!navigable || !navigable.targetId) return null;
    return { route: navigable.route, targetId: navigable.targetId! };
  }, [validatedReviewPrompts, dsaProgress, taskProgress, skillStates, todayDate]);

  const reviewSchedule = useMemo(() =>
    generateReviewCandidates({
      tasks: taskDefinitions,
      taskProgressMap: taskProgress,
      dsaProblems,
      dsaProgressMap: dsaProgress,
      topics,
      domains,
      skillStates,
      companyOverlays,
      currentMode,
      todayStr: todayDate,
      todayAssignments,
      analyticsReviewPrompts: analyticsTelemetry.reviewPrompts,
      practiceAttempts,
      practiceSessions,
      preparationTopicProgress,
      assessmentProfileReadout,
      activePhase,
      targetCompanyId: selectedCompanyId || undefined,
      dsaAttempts,
      evidenceLogs,
      domainResults: assessmentState?.domainResults ?? [],
      weaknessSignals: assessmentState?.weaknessSignals ?? [],
    }),
    [taskDefinitions, taskProgress, dsaProblems, dsaProgress, topics, domains, skillStates, companyOverlays, currentMode, todayDate, todayAssignments, analyticsTelemetry, practiceAttempts, practiceSessions, preparationTopicProgress, assessmentProfileReadout, activePhase, selectedCompanyId, dsaAttempts, evidenceLogs, assessmentState]
  );

  const reviewCandidates = reviewSchedule.candidates;
  const hasRemediation = reviewSchedule.hasRemediation;
  const hasOverdueReviews = reviewSchedule.hasOverdueReviews;

  const candidateTraces = useMemo(
    () =>
      Object.fromEntries(
        reviewCandidates.map((candidate) => [
          candidate.id,
          buildReviewCandidateTrace(candidate, evidenceCatalog),
        ])
      ),
    [reviewCandidates, evidenceCatalog]
  );

  const reusedRouteTargetIds = useMemo(
    () =>
      new Set(
        reviewCandidates
          .filter((c) => c.priority === 'remediation' || c.priority === 'routed_weakness' || c.priority === 'overdue_review')
          .map((c) => c.targetId)
      ),
    [reviewCandidates]
  );

  const companyMappings = useMemo(
    () =>
      selectedCompany
        ? mapCompanyRequirementTargets({
            targetCompany: selectedCompany,
            domains,
            topics,
            tasks: taskDefinitions,
            taskProgressMap: taskProgress,
            dsaProblems,
            dsaProgressMap: dsaProgress,
            dsaAttempts,
            evidenceLogs,
            skillStates,
            preparationTopics: PREPARATION_TOPICS,
            preparationTopicProgress,
            practiceSessions,
            todayStr: todayDate,
            activePhase,
            reusedRouteTargetIds,
          })
        : [],
    [
      selectedCompany, domains, topics, taskDefinitions, taskProgress, dsaProblems, dsaProgress,
      dsaAttempts, evidenceLogs, skillStates, preparationTopicProgress, practiceSessions,
      todayDate, activePhase, reusedRouteTargetIds,
    ]
  );

  const companyFocus = useMemo(
    () =>
      selectedCompany
        ? buildCompanyFocusSummary({
            targetCompany: selectedCompany,
            todayStr: todayDate,
            mappings: companyMappings,
            candidates: reviewCandidates,
            baselineTask: nextBestActionTask
              ? { title: nextBestActionTask.title, targetId: nextBestActionTask.id, route: 'roadmap' }
              : null,
          })
        : null,
    [selectedCompany, todayDate, companyMappings, reviewCandidates, nextBestActionTask]
  );

  const completedCount = Object.values(taskProgress).filter((tp) => tp.state === 'completed').length;
  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = useCallback((domainId: string) => domains.find((d) => d.id === domainId), [domains]);

  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = todayDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } catch { return todayDate; }
  }, [todayDate]);

  const restoreSource = (taskId: string) => ({
    taskId,
    taskDef: taskDefinitions.find((t) => t.id === taskId),
    taskProgress,
    skillStates,
    evidenceLogs,
  });

  const handlePostponeClick = (taskId: string) => {
    setPendingAction({ taskId, action: 'postpone', restore: captureDeferRestore(restoreSource(taskId)) });
  };

  const handleSkipClick = (taskId: string) => {
    setPendingAction({ taskId, action: 'skip', restore: captureDeferRestore(restoreSource(taskId)) });
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const { taskId, action, restore } = pendingAction;
    setUndoInfo({ taskId, restore });
    updateTaskState(taskId, restore.previousProgress?.state ?? 'not_started', action);
    setPendingAction(null);
  };

  const handleCancelPendingAction = () => {
    setPendingAction(null);
  };

  const handleUndoAction = () => {
    if (!undoInfo) return;
    restoreTaskTransaction(undoInfo.restore);
    setUndoInfo(null);
  };

  const handleDismissUndo = () => {
    setUndoInfo(null);
  };

  const handlePostponeTask = (taskId: string) => {
    handlePostponeClick(taskId);
  };

  const handleUpdateTaskStateWithToast = (taskId: string, newState: TaskProgress['state']) => {
    const targetTask = taskDefinitions.find((t) => t.id === taskId);
    const prevState = taskProgress[taskId]?.state || 'not_started';

    const openingNewCompletion =
      newState === 'completed' && !!targetTask && prevState !== 'completed';
    const restore = openingNewCompletion ? captureCompletionRestore(restoreSource(taskId)) : null;

    updateTaskState(taskId, newState);

    if (restore && targetTask) {
      setCompletionInfo({
        taskId,
        taskTitle: targetTask.title,
        previousState: prevState,
        restore,
      });
    } else if (completionInfo?.taskId === taskId && newState !== 'completed') {
      setCompletionInfo(null);
    }
  };

  const handleUndoCompletion = () => {
    if (!completionInfo) return;
    restoreTaskTransaction(completionInfo.restore);
    setCompletionInfo(null);
  };

  const handleSkipTask = (taskId: string) => {
    handleSkipClick(taskId);
  };

  const handleStartSessionActivity = (activity: SessionActivity) => {
    switch (activity.route) {
      case 'dsa':
        setRoute('dsa', activity.targetId);
        break;
      case 'roadmap':
        setRoute('roadmap', activity.targetId);
        break;
      case 'preparation':
        setRoute('preparation', activity.targetId);
        break;
      case 'practice': {
        const session = practiceSessions.find((s) => s.id === activity.targetId);
        if (session) {
          setActivePracticeSession(session);
        } else {
          setRoute('practice', activity.targetId);
        }
        break;
      }
      case 'dashboard':
      default:
        if (activity.sourceTaskId) {
          const task = taskDefinitions.find((t) => t.id === activity.sourceTaskId);
          if (task) {
            openTaskLearning(task);
          }
        }
        break;
    }
  };

  const openTaskLearning = (task: TaskDefinition) => {
    const route = getTaskLearningRoute(task);
    setRoute(route.route, route.linkedTopicId);
  };

  const handleCompleteSessionActivity = useCallback((activity: SessionActivity) => {
    if (isDaySealed) return;
    if (activity.sourceTaskId) {
      updateTaskState(activity.sourceTaskId, 'completed');
    }
    if (activity.sourceAssignmentId) {
      syncDailyAssignmentCompletion(activity.sourceAssignmentId, true);
    } else if (activity.sourceTaskId) {
      const match = todayAssignments.find((a) => a.referenceId === activity.sourceTaskId);
      if (match) {
        syncDailyAssignmentCompletion(match.id, true);
      }
    } else if (activity.sourceProblemId) {
      const match = todayAssignments.find((a) => a.referenceId === activity.sourceProblemId);
      if (match) {
        syncDailyAssignmentCompletion(match.id, true);
      }
    }
  }, [isDaySealed, updateTaskState, syncDailyAssignmentCompletion, todayAssignments]);

  const completionNextStep = completionInfo
    ? buildCompletionNextStep({ completedTaskId: completionInfo.taskId, evidenceLogs, nextCandidates: evaluatedCandidates })
    : null;

  const assignedPlanTasks: QueuePlanItem[] = useMemo(() => {
    if (!isPlanCommitted) return [];
    const items: QueuePlanItem[] = [];
    todayAssignments.forEach((assign) => {
      const task = taskDefinitions.find((t) => t.id === assign.referenceId);
      if (task) {
        items.push({
          kind: 'task',
          assignmentId: assign.id,
          task,
          progress: taskProgress[task.id],
          completed: assign.completed || taskProgress[task.id]?.state === 'completed',
        });
      } else {
        const prob = dsaProblems.find((p) => p.id === assign.referenceId);
        if (prob) {
          items.push({
            kind: 'dsa',
            assignmentId: assign.id,
            problem: prob,
            dsaProg: dsaProgress[prob.id],
            completed: assign.completed,
            taskType: assign.taskType === 'dsa_new' ? 'dsa_new' : 'dsa_review',
          });
        }
      }
    });
    return items;
  }, [isPlanCommitted, todayAssignments, taskDefinitions, taskProgress, dsaProblems, dsaProgress]);

  const completedPlanCount = useMemo(
    () => assignedPlanTasks.filter((item) => item.completed).length,
    [assignedPlanTasks]
  );

  const completionEvidence = completionInfo && completionNextStep?.evidence
    ? { score: completionNextStep.evidence.score, topicId: completionNextStep.evidence.topicId }
    : undefined;
  const completionEvidenceLabel = completionEvidence
    ? topics.find((t) => t.id === completionEvidence.topicId)?.name ?? completionEvidence.topicId
    : undefined;
  const completionNextRoute = completionNextStep?.nextRoute ?? null;
  const completionOpenNext = completionNextRoute
    ? () => {
        setRoute(completionNextRoute.route, completionNextRoute.linkedTopicId);
        setCompletionInfo(null);
      }
    : null;

  return (
    <SessionProvider
      availableMinutes={todayCheckIn?.availableMinutes || 0}
      todayStr={todayDate}
      mode={currentMode}
      selectedCompanyId={selectedCompanyId || undefined}
      energyLevel={todayCheckIn?.energyLevel || 'medium'}
      tasks={taskDefinitions}
      taskProgressMap={taskProgress}
      dsaProblems={dsaProblems}
      dsaProgressMap={dsaProgress}
      topics={topics}
      domains={domains}
      skillStates={skillStates}
      companyOverlays={companyOverlays}
      practiceSessions={practiceSessions}
      practiceAttempts={practiceAttempts}
      preparationTopics={PREPARATION_TOPICS}
      preparationTopicProgress={preparationTopicProgress}
      domainResults={assessmentState?.domainResults ?? []}
      weaknessSignals={assessmentState?.weaknessSignals ?? []}
      assessmentProfileReadout={assessmentProfileReadout}
      activePhase={activePhase.order}
      todayAssignments={todayAssignments}
      dsaAttempts={dsaAttempts}
      evidenceLogs={evidenceLogs}
    >
      <div className="space-y-8 max-w-6xl xl:max-w-[1350px] mx-auto font-sans flex flex-col">
        {/* Post-completion animation overlay */}
        {completionInfo && completionNextStep && (
          <CompletionAnimation
            taskTitle={completionInfo.taskTitle}
            onDismiss={() => setCompletionInfo(null)}
            onUndo={handleUndoCompletion}
            nextTask={completionNextStep.nextTask ? { title: completionNextStep.nextTask.title } : null}
            onOpenNext={completionOpenNext}
            evidenceScore={completionEvidence?.score}
            evidenceTopicLabel={completionEvidenceLabel}
          />
        )}

        {/* 0. GLOBAL HEADER (§3.1) */}
        <header
          data-section="header"
          data-mobile-order={1}
          className="max-md:order-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-default"
        >
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary"
              data-guide-target="today-header"
            >
              Today
            </h1>
            <p className="text-xs text-text-secondary mt-1">{formattedDate}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {companyOverlays.length > 0 && (
              <div
                className="flex items-center gap-1.5 bg-surface-subtle border border-border-default rounded-md px-2.5 h-9"
                data-testid="company-focus-container"
              >
                <Building2 className="size-3.5 text-info shrink-0" />
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                  data-testid="company-focus-select"
                  aria-label="Company Focus Mode"
                  className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer pr-1"
                  title="Company Focus Mode"
                >
                  <option value="" className="bg-surface-panel text-text-secondary">
                    All Companies
                  </option>
                  {companyOverlays.map((comp) => (
                    <option key={comp.id} value={comp.id} className="bg-surface-panel text-text-primary">
                      {comp.companyName} {comp.eventDate ? `(${comp.eventDate})` : ''}
                    </option>
                  ))}
                </select>
                {selectedCompanyId && (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyId(null)}
                    data-testid="clear-company-focus"
                    className="text-text-tertiary hover:text-text-primary text-xs px-1 font-mono"
                    title="Clear company focus"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <GuideTrigger route="dashboard" />
            <TodayButton
              variant="tonal"
              onClick={() => setIsMorningModalOpen(true)}
              data-guide-target="today-plan-button"
              data-testid="plan-today-button"
              className="h-9 px-3.5 text-xs font-semibold"
            >
              <Sun className="size-3.5 mr-2 text-status-warning" /> Plan Today
            </TodayButton>
          </div>
        </header>

        {/* 1. STATE STRIP (§3.1) */}
        <StateStrip
          phaseName={activePhase.name}
          mode={currentMode}
          budgetHours={todayCheckIn?.availableMinutes ? Math.round(todayCheckIn.availableMinutes / 60) : 3}
          energyLevel={todayCheckIn?.energyLevel || 'medium'}
          isPlanCommitted={isPlanCommitted}
          assignmentCount={assignedPlanTasks.length}
          isDaySealed={isDaySealed}
          sealedAt={todayCheckIn?.sealedAt}
        />

        {/* 2. TODAY'S MISSION (§5) */}
        <section
          data-section="mission"
          data-mobile-order={3}
          data-testid="primary-action"
          data-guide-target="today-primary-action"
          data-atmospheric="true"
          data-reveal="hero"
          data-candidate-task-id={nextBestActionTask?.id ?? ''}
          data-candidate-task-title={nextBestActionTask?.title ?? ''}
          data-candidate-score={nextBestActionCandidate?.breakdown ? String(nextBestActionCandidate.breakdown.finalScore) : ''}
          data-candidate-reason={nextBestActionCandidate?.breakdown?.explanation ?? ''}
          className="max-md:order-3 relative overflow-hidden rounded-lg border border-border-default bg-surface-panel p-5 sm:p-6 lg:p-7"
        >
          {nextBestActionTask ? (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
              {/* LEFT ~55%: Mission details */}
              <div
                className="flex-1 min-w-0 w-full space-y-4 relative z-10"
                data-guide-target="today-primary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MonoChip tone="accent">
                      <Sparkles className="size-3.5 text-accent" /> TODAY'S MISSION
                    </MonoChip>
                    <span className="font-mono text-xs text-text-tertiary">
                      {nextBestActionTask.estimatedMinutes} mins
                    </span>
                  </div>
                  {getDomain(nextBestActionTask.domainId) && (
                    <MonoChip tone="neutral">
                      {getDomain(nextBestActionTask.domainId)?.name}
                    </MonoChip>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                    {nextBestActionTask.title}
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[68ch]">
                    {nextBestActionTask.description}
                  </p>
                </div>

                {/* Why block */}
                {nextBestActionCandidate?.breakdown && (
                  <div
                    className="flex items-start gap-2 pt-2 border-t border-border-default text-xs"
                    data-guide-target="today-why-task"
                  >
                    <HelpCircle className="size-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-text-primary">Why this task? </span>
                      <span className="text-text-secondary">
                        {nextBestActionCandidate.breakdown.explanation}
                      </span>
                    </div>
                  </div>
                )}

                {/* Priority Score & 6-Factor Visualization (§5.3) */}
                {nextBestActionCandidate?.breakdown && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                      <span className="text-text-tertiary">PRIORITY</span>
                      <span className="text-accent font-semibold">
                        {nextBestActionCandidate.breakdown.finalScore}/100
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-sm bg-surface-subtle">
                      <div
                        className="h-full bg-primary transition-[width] duration-[320ms] ease-out rounded-sm"
                        style={{ width: `${nextBestActionCandidate.breakdown.finalScore}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[10px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">URGENCY 25%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.urgency >= 70 ? 'bg-status-warning' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.urgency}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.urgency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">WEAKNESS 20%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.weakness >= 70 ? 'bg-primary' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.weakness}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.weakness}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">IMPORTANCE 20%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.importance >= 70 ? 'bg-primary' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.importance}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.importance}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">COMPANY 15%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.companyRelevance >= 70 ? 'bg-primary' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.companyRelevance}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.companyRelevance}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">SPACED REP 10%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.spacedRepetition >= 70 ? 'bg-primary' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.spacedRepetition}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.spacedRepetition}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary w-24">RECOVERY 10%</span>
                        <div className="h-1 flex-1 bg-surface-subtle rounded-sm overflow-hidden mx-1">
                          <div
                            className={`h-full ${nextBestActionCandidate.breakdown.recoveryUrgency >= 70 ? 'bg-status-warning' : 'bg-primary/45'}`}
                            style={{ width: `${nextBestActionCandidate.breakdown.recoveryUrgency}%` }}
                          />
                        </div>
                        <span className="text-text-tertiary w-6 text-right">
                          {nextBestActionCandidate.breakdown.recoveryUrgency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Row (§5.2) */}
                <div className="pt-4 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <button
                      type="button"
                      onClick={() => openTaskLearning(nextBestActionTask)}
                      data-guide-target="today-learning-link"
                      className="text-xs text-text-secondary hover:text-text-primary font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="size-3.5 text-accent" aria-hidden="true" />
                      {getLearningDestinationLabel(getTaskLearningRoute(nextBestActionTask), 'primary')}
                    </button>
                    {nextActionState !== 'completed' && (
                      <div className="flex items-center gap-1.5" data-guide-target="today-postpone-skip">
                        <TodayButton
                          variant="ghost"
                          onClick={() => handlePostponeClick(nextBestActionTask.id)}
                          data-guide-target="today-postpone"
                          title="Postpone to tomorrow"
                          aria-label={`Postpone ${nextBestActionTask.title} to tomorrow`}
                          className="h-7 text-[11px] px-2"
                        >
                          <Clock className="size-3" aria-hidden="true" /> Postpone
                        </TodayButton>
                        <TodayButton
                          variant="ghost"
                          onClick={() => handleSkipClick(nextBestActionTask.id)}
                          data-guide-target="today-skip"
                          title="Skip without completing"
                          aria-label={`Skip ${nextBestActionTask.title}`}
                          className="h-7 text-[11px] px-2"
                        >
                          <SkipForward className="size-3" aria-hidden="true" /> Skip
                        </TodayButton>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {!isDaySealed && (
                      <PrimaryCTA
                        onClick={() => setIsFocusModalOpen(true)}
                        data-guide-target="today-focus-mode"
                      >
                        <Sparkles className="size-4" aria-hidden="true" />
                        Start Focus Mode
                      </PrimaryCTA>
                    )}
                    {nextActionState === 'completed' ? (
                      <span className="text-xs text-status-success font-semibold flex items-center gap-1 px-3 py-2 bg-success/10 rounded-md border border-success/30">
                        <Check className="size-4" aria-hidden="true" /> Completed
                      </span>
                    ) : (
                      <TodayButton
                        variant="outline"
                        onClick={() => handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed')}
                        data-testid="complete-primary"
                        data-guide-target="today-complete-action"
                        className="h-9 px-4 text-xs font-semibold"
                      >
                        <Check className="size-4 text-status-success" aria-hidden="true" /> Complete
                      </TodayButton>
                    )}
                  </div>
                </div>

                {/* Popovers */}
                {pendingAction && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-surface-elevated border border-warning/40 rounded-lg p-4 shadow-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-5 text-status-warning shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-3">
                        <p className="text-xs font-semibold text-text-primary">
                          {pendingAction.action === 'postpone' ? 'Postpone until tomorrow?' : 'Skip this task?'}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {pendingAction.action === 'postpone'
                            ? 'The task will return to your plan when the date passes.'
                            : 'The task will remain in your plan but won\'t count as done.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <TodayButton
                            variant="ghost"
                            onClick={handleCancelPendingAction}
                            className="h-7 text-[11px] px-2.5"
                          >
                            <X className="size-3" /> Cancel
                          </TodayButton>
                          <TodayButton
                            variant="tonal"
                            onClick={handleConfirmAction}
                            className="h-7 text-[11px] font-bold px-2.5"
                          >
                            Confirm
                          </TodayButton>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {undoInfo && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-surface-elevated border border-success/40 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-status-success" />
                        <span className="text-xs text-status-success font-medium">Action completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TodayButton
                          variant="ghost"
                          onClick={handleUndoAction}
                          className="h-7 text-[11px] text-status-success hover:text-text-primary px-2"
                        >
                          Undo
                        </TodayButton>
                        <TodayButton
                          variant="ghost"
                          onClick={handleDismissUndo}
                          className="h-7 text-[11px] text-text-secondary hover:text-text-primary px-2"
                        >
                          <X className="size-3" />
                        </TodayButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT ~45%: Constellation Scene (§13.6, §16) */}
              <div
                className="w-full max-w-[200px] md:max-w-[260px] lg:max-w-[360px] xl:max-w-[420px] lg:w-[42%] xl:w-[45%] border-t lg:border-t-0 lg:border-l border-border-default p-4 pb-12 sm:p-5 sm:pb-12 flex flex-col items-center justify-center relative z-10 mx-auto"
                data-guide-target="today-hero-scene"
              >
                <div className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary mb-2 self-start">
                  Daily Control Scene
                </div>
                <TodayHeroVisual candidates={evaluatedCandidates} />
              </div>
            </div>
          ) : (
            /* Empty state when all targets are completed */
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              <div className="space-y-3" data-guide-target="today-primary">
                <MonoChip tone="accent">TODAY'S MISSION</MonoChip>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                  All caught up for today!
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-[68ch]">
                  You have completed all primary targets. Inspect your roadmap or review DSA patterns to stay ahead.
                </p>
                {!isDaySealed && (
                  <div className="pt-3">
                    <PrimaryCTA onClick={() => setIsEveningModalOpen(true)}>
                      Reflect &amp; Seal
                    </PrimaryCTA>
                  </div>
                )}
              </div>
              <div
                className="w-full max-w-[200px] md:max-w-[260px] lg:max-w-[360px] xl:max-w-[420px] lg:w-[42%] xl:w-[45%] p-4 pb-12 sm:p-5 sm:pb-12 mx-auto flex flex-col items-center justify-center relative z-10"
                data-guide-target="today-hero-scene"
              >
                <div className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary mb-2 self-start">
                  Daily Control Scene
                </div>
                <TodayHeroVisual candidates={evaluatedCandidates} />
              </div>
            </div>
          )}
        </section>

        {/* 3. ATTENTION RAIL (§6) */}
        <AttentionRail
          sundayPending={pendingSundayObligation}
          onOpenAssessment={() => setRoute('assessment')}
          companyFocus={companyFocus}
          onRoute={(route, targetId) => setRoute(route, targetId)}
          validatedPrompts={validatedReviewPrompts}
          reviewCandidates={reviewCandidates}
          hasOverdueReviews={hasOverdueReviews}
          hasRemediation={hasRemediation}
          primaryReviewDeepLink={primaryReviewPromptDeepLink}
          candidateTraces={candidateTraces}
          evidenceCatalog={evidenceCatalog}
          onOpenReview={() => {
            if (primaryReviewPromptDeepLink) {
              setRoute(primaryReviewPromptDeepLink.route, primaryReviewPromptDeepLink.targetId);
            }
          }}
          practice={
            practiceRecommendation
              ? {
                  title: practiceRecommendation.session.title,
                  estimatedMinutes: practiceRecommendation.session.estimatedMinutes,
                  categoryTag: practiceRecommendation.categoryTag,
                  reason: practiceRecommendation.reason,
                }
              : null
          }
          practiceChips={activeSignalChips}
          onStartDrill={() => {
            if (practiceRecommendation) {
              setActivePracticeSession(practiceRecommendation.session);
            }
          }}
          blockedCount={0}
          onOpenSkills={() => setRoute('skills')}
        />

        {/* 4. EXECUTION QUEUE (§7) */}
        <ExecutionQueue
          revealed={revealedSections.has('journey')}
          observeRef={setScrollRef('journey')}
          isPlanCommitted={isPlanCommitted}
          assignedPlanTasks={assignedPlanTasks}
          completedPlanCount={completedPlanCount}
          isPlanExpanded={isPlanExpanded}
          onToggleExpand={() => setIsPlanExpanded(!isPlanExpanded)}
          todayAssignments={todayAssignments}
          onStartActivity={handleStartSessionActivity}
          onCompleteActivity={handleCompleteSessionActivity}
          onPlanToday={() => setIsMorningModalOpen(true)}
          onOpenRoadmap={() => setRoute('roadmap')}
          onOpenDsa={(problemId) => setRoute('dsa', problemId)}
          onUpdateState={handleUpdateTaskStateWithToast}
          onDecomposeTask={decomposeTask}
          onOpenLearning={openTaskLearning}
          onPostpone={handlePostponeTask}
          onSkip={handleSkipTask}
          getDomain={getDomain}
          todayISO={todayDate}
        />

        {/* 5. PROGRESS PANEL (§8) */}
        <ProgressPanel
          revealed={revealedSections.has('progress')}
          observeRef={setScrollRef('progress')}
          progressPercent={progressPercent}
          completedCount={completedCount}
          totalTasks={totalTasks}
          analyticsTelemetry={analyticsTelemetry}
          activePhase={activePhase}
          onRoute={(route) => setRoute(route)}
        />

        {/* 6. SIGNALS & FOCUS (§9) */}
        <SignalsFocus
          revealed={revealedSections.has('signals')}
          observeRef={setScrollRef('signals')}
          companyOverlays={companyOverlays}
          onRoute={(route) => setRoute(route)}
        />

        {/* 7. REFLECTION / SEALING (§10) */}
        <ReflectionBand
          isPlanCommitted={isPlanCommitted}
          isDaySealed={isDaySealed}
          sealedAt={todayCheckIn?.sealedAt}
          pendingCount={assignedPlanTasks.length - completedPlanCount}
          totalActualMinutes={todayCheckIn?.totalActualMinutes || 0}
          onReflect={() => setIsEveningModalOpen(true)}
          onPlanToday={() => setIsMorningModalOpen(true)}
        />

        {/* 8. SECONDARY DISCLOSURE (§11) */}
        <TelemetryDisclosure
          revealed={revealedSections.has('telemetry')}
          observeRef={setScrollRef('telemetry')}
          open={showTelemetryDetails}
          onToggle={() => setShowTelemetryDetails(!showTelemetryDetails)}
          skillStates={skillStates}
          companyOverlays={companyOverlays}
          mode={currentMode}
          candidateCount={evaluatedCandidates.length}
          revealedSectionCount={revealedSections.size}
          observerActive={isObserverActive}
          onRoute={(route) => setRoute(route)}
        />

        {/* Modals */}
        <SessionModals
          activePracticeSession={activePracticeSession}
          setActivePracticeSession={setActivePracticeSession}
          nextBestActionTask={nextBestActionTask}
          isFocusModalOpen={isFocusModalOpen}
          setIsFocusModalOpen={setIsFocusModalOpen}
          isMorningModalOpen={isMorningModalOpen}
          setIsMorningModalOpen={setIsMorningModalOpen}
          isEveningModalOpen={isEveningModalOpen}
          setIsEveningModalOpen={setIsEveningModalOpen}
          selectedCompanyId={selectedCompanyId}
          todayDate={todayDate}
          domains={domains}
          recordPracticeAttempt={recordPracticeAttempt}
          handleUpdateTaskStateWithToast={handleUpdateTaskStateWithToast}
          commitDailyPlan={commitDailyPlan}
          sealDayExecution={sealDayExecution}
        />
      </div>
    </SessionProvider>
  );
};
