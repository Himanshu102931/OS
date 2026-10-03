import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskCard } from '../common/TaskCard';
import { TodayHeroVisual } from './TodayHeroVisual';
import { DailySignalGraph } from './DailySignalGraph';
import { DailyJourney } from './DailyJourney';
import { CompletionAnimation } from './CompletionAnimation';
import { GuideTrigger } from '../guide/GuideTrigger';
import { getEvaluatedCandidates, evaluatePracticeSignals } from '../../engine/adaptiveEngine';
import { generateReviewCandidates } from '../../engine/reviewScheduler';
import { evaluateAnalyticsTelemetry } from '../../engine/analyticsEngine';
import { captureCompletionRestore, captureDeferRestore, type TaskStateRestore } from '../../engine/taskStateEngine';
import { getRecommendedPracticeSession } from '../../engine/practiceEngine';
import { buildReviewCandidateTrace } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import {
  getTaskLearningRoute,
  getLearningDestinationLabel,
  buildCompletionNextStep,
} from '../../engine/taskFlowEngine';
import type { TaskProgress, TaskDefinition, PracticeSessionDefinition } from '../../types';
import type { SessionActivity } from '../../engine/sessionComposer';
import { SessionProvider } from './SessionProvider';
import { SessionDisplay } from './SessionDisplay';
import { SessionModals } from './SessionModals';
import {
  Sun, Moon, Building2, BarChart3, ArrowRight, AlertCircle,
  HelpCircle, ChevronDown, ChevronUp, Check, BookOpen,
  CheckCircle2, Sparkles, Compass, Target, Play,
  Clock, SkipForward, X,
} from 'lucide-react';
import { Button } from '../ui/button';

/**
 * C7-09 — every Today section that renders `.scroll-reveal`, by the id its
 * `data-reveal` attribute carries. Used as the graceful-fallback set: when the
 * IntersectionObserver cannot be created, all of them are revealed immediately
 * so no section can stay permanently invisible.
 */
const REVEAL_IDS = ['hero', 'journey', 'signals', 'practice', 'review', 'plan', 'progress', 'telemetry'];

export const DashboardView: React.FC = () => {
  const {
    taskDefinitions, taskProgress, dsaProblems, dsaProgress, dsaAttempts,
    domains, topics, activePhase, currentMode, todayDate, updateTaskState,
    restoreTaskTransaction, setRoute, companyOverlays, skillStates, dailyCheckIns,
    dailyTaskAssignments, commitDailyPlan, sealDayExecution,
    decomposeTask, practiceSessions, practiceAttempts,
    recordPracticeAttempt, evidenceLogs, pendingSundayObligation,
    preparationTopicProgress, assessmentProfileReadout,
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

  // Post-completion next-step state. `restore` is the exact snapshot of the
  // ONE completion transaction Undo is allowed to reverse.
  const [completionInfo, setCompletionInfo] = useState<{
    taskId: string; taskTitle: string; previousState: TaskProgress['state']; restore: TaskStateRestore;
  } | null>(null);

  // Postpone/Skip confirmation & undo state. `restore` holds the whole
  // pre-action TaskProgress — not just its `state` field — so undo returns
  // postponeCount / skipCount / postponedUntil exactly as they were.
  const [pendingAction, setPendingAction] = useState<{ taskId: string; action: 'postpone' | 'skip'; restore: TaskStateRestore } | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ taskId: string; restore: TaskStateRestore } | null>(null);
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const revealEverything = () => setRevealedSections(new Set(REVEAL_IDS));

    // No IntersectionObserver (old browser / stripped environment) → render
    // content normally instead of crashing or leaving it at opacity: 0.
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
      // Observe all existing data-reveal elements
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        observerRef.current?.observe(el);
      });
    } catch {
      // Setup failed → same fallback. `setScrollRef` skips observing when
      // `observerRef.current` is null, and the sections are already visible.
      observerRef.current = null;
      revealEverything();
    }
    return () => { observerRef.current?.disconnect(); };
  }, []);

  // Scroll-reveal callback ref factory
  const setScrollRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      el.dataset.reveal = id;
      if (observerRef.current) observerRef.current.observe(el);
    }
  }, []);

  const todayCheckIn = dailyCheckIns.find((c) => c.date === todayDate);
  const isDaySealed = todayCheckIn?.isSealed ?? false;
  const todayAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);
  const isPlanCommitted = todayAssignments.length > 0;

  // C6 — THE canonical candidate evaluation for Today. One call, full live
  // state, one authoritative mode/date. Its result is handed to the primary
  // action, TodayHeroVisual and DailyJourney so every Today section describes
  // the same candidate.
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
    [taskDefinitions, taskProgress, dsaProblems, dsaProgress, skillStates, companyOverlays, currentMode, todayDate, selectedCompanyId]
  );

  const nextBestActionCandidate = evaluatedCandidates[0];
  const nextBestActionTask = nextBestActionCandidate?.task;
  const nextActionState = nextBestActionTask ? taskProgress[nextBestActionTask.id]?.state || 'not_started' : 'not_started';

  // Practice recommendation
  const practiceRecommendation = useMemo(
    () => getRecommendedPracticeSession(practiceSessions, practiceAttempts, skillStates, companyOverlays),
    [practiceSessions, practiceAttempts, skillStates, companyOverlays]
  );

  // Practice signals
  const practiceSignals = useMemo(
    () => evaluatePracticeSignals(practiceAttempts, skillStates, companyOverlays),
    [practiceAttempts, skillStates, companyOverlays]
  );
  const activeSignalChips = [
    { key: 'assessmentDue', label: 'Assessment due', active: practiceSignals.assessmentDue },
    { key: 'weakTopic', label: 'Weak topic', active: practiceSignals.weakTopic },
    { key: 'stalePreparationTopic', label: 'Evidence aging', active: practiceSignals.stalePreparationTopic },
    { key: 'lowAccuracy', label: 'Low accuracy', active: practiceSignals.lowAccuracy },
    { key: 'interviewPracticeDue', label: 'Interview practice due', active: practiceSignals.interviewPracticeDue },
  ].filter((c) => c.active);

  // Analytics telemetry — evaluate once per render to produce review prompts
  const analyticsTelemetry = useMemo(() =>
    evaluateAnalyticsTelemetry(
      '30d', // 30-day window for review prompts
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

  // Adaptive Review Scheduler — deterministic review candidates from existing state
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
    }),
    [taskDefinitions, taskProgress, dsaProblems, dsaProgress, topics, domains, skillStates, companyOverlays, currentMode, todayDate, todayAssignments, analyticsTelemetry, practiceAttempts, practiceSessions, preparationTopicProgress, assessmentProfileReadout, activePhase, selectedCompanyId, dsaAttempts, evidenceLogs]
  );

  const reviewCandidates = reviewSchedule.candidates;
  const hasRemediation = reviewSchedule.hasRemediation;
  const hasOverdueReviews = reviewSchedule.hasOverdueReviews;

  /** SIGNAL → WHY → EVIDENCE → SOURCE for each Today review candidate. */
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

  const completedCount = Object.values(taskProgress).filter((tp) => tp.state === 'completed').length;
  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = todayDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } catch { return todayDate; }
  }, [todayDate]);

  // ---- Transactional undo snapshots --------------------------------------
  // Captured from the SAME render that issues the action, so a snapshot can
  // never disagree with the transaction it reverses. Both captures live in the
  // engine so the view cannot drift from the restore contract (and the tests
  // exercise exactly this code path).

  /** The state a capture reads. */
  const restoreSource = (taskId: string) => ({
    taskId,
    taskDef: taskDefinitions.find((t) => t.id === taskId),
    taskProgress,
    skillStates,
    evidenceLogs,
  });

  // Postpone/Skip confirmation flow
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

  /** Cancel closes the confirmation popover without applying anything. */
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

  // Task Completion Handler with Next-Step State & Undo
  const handleUpdateTaskStateWithToast = (taskId: string, newState: TaskProgress['state']) => {
    const targetTask = taskDefinitions.find((t) => t.id === taskId);
    const prevState = taskProgress[taskId]?.state || 'not_started';

    // Only a task that is NOT already completed may open a new completion
    // transaction. The engine's idempotency guard makes a repeat call a no-op;
    // skipping the snapshot here keeps Undo pointed at the completion that
    // really happened instead of one whose previousState is 'completed'.
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

  // Session Activity Handler - route to the appropriate view for the activity
  const handleStartSessionActivity = (activity: SessionActivity) => {
    // Route to the appropriate view based on activity type
    switch (activity.route) {
      case 'dsa':
        setRoute('dsa', activity.targetId);
        break;
      case 'roadmap':
        setRoute('roadmap');
        break;
      case 'preparation':
        setRoute('preparation', activity.targetId);
        break;
      case 'practice':
        setRoute('practice');
        break;
      case 'dashboard':
      default:
        // For dashboard activities (like tasks), use the existing task learning route
        if (activity.sourceTaskId) {
          const task = taskDefinitions.find((t) => t.id === activity.sourceTaskId);
          if (task) {
            openTaskLearning(task);
          }
        }
        break;
    }
    // Advance session to next activity (marked as 'completed' since user started it)
    // The actual completion will be handled by the specific view's completion
    // For now, we don't auto-advance here - the user completes the activity in its view
  };

  const openTaskLearning = (task: TaskDefinition) => {
    const route = getTaskLearningRoute(task);
    setRoute(route.route, route.linkedTopicId);
  };

  const completionNextStep = completionInfo
    ? buildCompletionNextStep({ completedTaskId: completionInfo.taskId, evidenceLogs, nextCandidates: evaluatedCandidates })
    : null;

  // Build assigned tasks
  const assignedPlanTasks: { assignmentId: string; task: TaskDefinition; progress?: TaskProgress }[] = [];
  if (isPlanCommitted) {
    todayAssignments.forEach((assign) => {
      const task = taskDefinitions.find((t) => t.id === assign.referenceId);
      if (task) assignedPlanTasks.push({ assignmentId: assign.id, task, progress: taskProgress[task.id] });
    });
  }
  const visiblePlanTasks = isPlanExpanded ? assignedPlanTasks : assignedPlanTasks.slice(0, 3);

  // Completion animation data — C7-07: all of it is read back from what the
  // completion transaction already wrote; nothing here writes anything.
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
      preparationTopics={[]}
      preparationTopicProgress={preparationTopicProgress}
      domainResults={[]}
      weaknessSignals={[]}
      assessmentProfileReadout={assessmentProfileReadout}
      activePhase={activePhase.order}
      todayAssignments={todayAssignments}
      dsaAttempts={dsaAttempts}
      evidenceLogs={evidenceLogs}
    >
      <div className="space-y-8 max-w-6xl xl:max-w-[1350px] mx-auto font-sans">
        {/* Post-completion animation */}
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

        {/* Sunday Mini Test Pending Notification (§18) */}
        {pendingSundayObligation && (
          <div
            data-testid="sunday-obligation-banner"
            className="bg-[#14171D] border-2 border-[#E5A93C] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-[#E5A93C]/10"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#E5A93C] text-xs font-semibold uppercase tracking-wider">
                <Clock className="size-4" />
                <span>Sunday Adaptive Mini Test Pending</span>
              </div>
              <h2 className="text-base font-bold text-[#F1F5F9]">
                Weekly Calibration Assessment Scheduled
              </h2>
              <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
                Your deterministic 90-minute weekly calibration is ready. It targets your diagnosed weaknesses (60%), recent curriculum topics (20%), and retention checks (20%).
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setRoute('assessment')}
              className="bg-[#E5A93C] hover:bg-[#D4982B] text-[#0D0F12] font-semibold flex items-center gap-2 shrink-0 self-start sm:self-center"
            >
              <span>Start Mini Test (90m)</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* 1. CALM RITUAL HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262D38]/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8E98A8]" data-guide-target="today-phase-mode">
            <Compass className="size-3.5 text-[#E5A93C]" />
            <span>{activePhase.name}</span>
            <span>·</span>
            <span className="capitalize text-[#FFC665]">{currentMode.replace('_', ' ')} Mode</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9] mt-1" data-guide-target="today-header">
            {formattedDate}
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1" data-guide-target="today-budget">
            Budget: <strong className="text-[#F1F5F9]">{todayCheckIn?.availableMinutes ? Math.round(todayCheckIn.availableMinutes / 60) : 3} hours available today</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {companyOverlays.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#1B2028] border border-[#262D38] rounded-md px-2.5 h-9" data-testid="company-focus-container">
              <Building2 className="size-3.5 text-[#E5A93C] shrink-0" />
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                data-testid="company-focus-select"
                aria-label="Company Focus Mode"
                className="bg-transparent text-xs text-[#F1F5F9] focus:outline-none cursor-pointer pr-1"
                title="Company Focus Mode"
              >
                <option value="" className="bg-[#1B2028] text-[#8E98A8]">All Companies</option>
                {companyOverlays.map((comp) => (
                  <option key={comp.id} value={comp.id} className="bg-[#1B2028] text-[#F1F5F9]">
                    {comp.companyName} {comp.eventDate ? `(${comp.eventDate})` : ''}
                  </option>
                ))}
              </select>
              {selectedCompanyId && (
                <button
                  type="button"
                  onClick={() => setSelectedCompanyId(null)}
                  data-testid="clear-company-focus"
                  className="text-[#8E98A8] hover:text-[#F1F5F9] text-xs px-1 font-mono"
                  title="Clear company focus"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <GuideTrigger route="dashboard" />
          <Button size="sm" onClick={() => setIsMorningModalOpen(true)}
            data-guide-target="today-plan-button"
            data-testid="plan-today-button"
            className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] rounded-md h-9 px-3.5">
            <Sun className="size-3.5 mr-2 text-[#F59E0B]" /> Plan Today
          </Button>
          {isPlanCommitted && (
            <Button size="sm" disabled={isDaySealed} onClick={() => setIsEveningModalOpen(true)}
              className={`text-xs font-semibold rounded-md h-9 px-3.5 border ${isDaySealed ? 'bg-[#14171D] text-[#5C6675] border-[#262D38]' : 'bg-[#1B2028] text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/10'}`}>
              <Moon className="size-3.5 mr-2 text-[#10B981]" /> {isDaySealed ? 'Day Sealed' : 'Reflect & Seal'}
            </Button>
          )}
        </div>
      </div>

      {/* 2. HERO COMPOSITION — LEFT CONTENT + RIGHT VISUAL SCENE */}
      {nextBestActionTask ? (
        <section
          ref={setScrollRef('hero')}
          className="bg-gradient-to-br from-[#1B2028] via-[#14171D] to-[#0D0F12] border border-[#E5A93C]/30 rounded-xl shadow-lg relative overflow-hidden"
          style={{ minHeight: '480px' }}
          data-testid="primary-action"
          data-guide-target="today-primary-action"
          data-candidate-task-id={nextBestActionTask.id}
          data-candidate-task-title={nextBestActionTask.title}
          data-candidate-score={nextBestActionCandidate?.breakdown?.finalScore ?? ''}
          data-candidate-reason={nextBestActionCandidate?.breakdown?.explanation ?? ''}
        >
          {/* Ambient gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#E5A93C]/5 via-transparent to-transparent pointer-events-none" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(229,169,60,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(229,169,60,0.1) 1px, transparent 1px), linear-gradient(rgba(229,169,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(229,169,60,0.05) 1px, transparent 1px)` , backgroundSize: '60px 60px, 60px 60px, 30px 30px, 30px 30px' }} />

          <div className="flex flex-col lg:flex-row" style={{ minHeight: '480px' }}>
            {/* LEFT ~55%: Primary Action */}
            <div className="flex-1 p-6 sm:p-7 lg:p-8 space-y-5 relative z-10 flex flex-col justify-center"
              data-guide-target="today-primary">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/15 border border-[#E5A93C]/30 text-xs font-bold text-[#FFC665]">
                    <Sparkles className="size-3.5 text-[#E5A93C]" /> PRIMARY ACTION
                  </span>
                  <span className="text-xs text-[#8E98A8]">{nextBestActionTask.estimatedMinutes} mins</span>
                </div>
                {getDomain(nextBestActionTask.domainId) && (
                  <span className="text-xs text-[#FFC665] bg-[#14171D] border border-[#262D38] px-2.5 py-1 rounded-md font-medium">
                    {getDomain(nextBestActionTask.domainId)?.name}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight leading-snug">
                  {nextBestActionTask.title}
                </h2>
                <p className="text-sm text-[#8E98A8] leading-relaxed max-w-xl">
                  {nextBestActionTask.description}
                </p>
              </div>

              {/* Human Reasoning */}
              {nextBestActionCandidate?.breakdown && (
                <div className="pt-3 border-t border-[#262D38]/80 flex items-start gap-2 text-xs" data-guide-target="today-why-task">
                  <HelpCircle className="size-4 text-[#E5A93C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#FFC665]">Why this task? </span>
                    <span className="text-[#8E98A8]">{nextBestActionCandidate.breakdown.explanation}</span>
                  </div>
                </div>
              )}

              {/* Priority Score Bar (visual, not raw number) */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-[#5C6675] font-mono">PRIORITY</span>
                  <span className="text-[#E5A93C] font-mono font-bold">{nextBestActionCandidate.breakdown.finalScore}/100</span>
                </div>
                <div className="w-full bg-[#0D0F12] rounded-full h-1.5 overflow-hidden border border-[#262D38]">
                  <div className="bg-gradient-to-r from-[#E5A93C] to-[#FFC665] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${nextBestActionCandidate.breakdown.finalScore}%` }} />
                </div>
              </div>

              {/* Action Row */}
              <div className="pt-4 border-t border-[#262D38]/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <button onClick={() => openTaskLearning(nextBestActionTask)}
                    data-guide-target="today-learning-link"
                    className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] font-medium flex items-center gap-1.5 transition-colors">
                    <BookOpen className="size-3.5 text-[#E5A93C]" /> {getLearningDestinationLabel(getTaskLearningRoute(nextBestActionTask), 'primary')}
                  </button>
                  {nextActionState !== 'completed' && (
                    <div className="flex items-center gap-1.5" data-guide-target="today-postpone-skip">
                      <Button size="xs" variant="ghost" onClick={() => handlePostponeClick(nextBestActionTask.id)}
                        data-guide-target="today-postpone"
                        title="Postpone to tomorrow" aria-label={`Postpone ${nextBestActionTask.title} to tomorrow`}
                        className="h-7 text-[11px] font-medium text-[#8E98A8] hover:text-[#FFC665] hover:bg-[#1B2028] rounded-[4px] px-2">
                          <Clock className="size-3 mr-1" /> Postpone
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => handleSkipClick(nextBestActionTask.id)}
                          data-guide-target="today-skip"
                          title="Skip without completing" aria-label={`Skip ${nextBestActionTask.title}`}
                          className="h-7 text-[11px] font-medium text-[#8E98A8] hover:text-[#FFC665] hover:bg-[#1B2028] rounded-[4px] px-2">
                          <SkipForward className="size-3 mr-1" /> Skip
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Button size="sm" onClick={() => setIsFocusModalOpen(true)}
                    data-guide-target="today-focus-mode"
                    className="h-10 px-5 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md shadow-md transition-all active:scale-95">
                    <Sparkles className="size-4 mr-1.5 text-[#432C00]" /> Start Focus Mode
                  </Button>
                  {nextActionState === 'completed' ? (
                    <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1 px-3 py-2 bg-[#10B981]/10 rounded-md border border-[#10B981]/30">
                      <Check className="size-4" /> Completed
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed')}
                      data-testid="complete-primary"
                      data-guide-target="today-complete-action"
                      className="h-10 px-4 text-xs font-semibold border-[#262D38] bg-[#14171D] text-[#F1F5F9] hover:bg-[#1B2028] rounded-md">
                      <Check className="size-4 mr-1 text-[#10B981]" /> Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Confirmation Popover */}
            {pendingAction && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#1B2028] border border-[#E5A93C]/40 rounded-lg p-4 shadow-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <p className="text-xs font-semibold text-[#F1F5F9]">
                      {pendingAction.action === 'postpone' ? 'Postpone until tomorrow?' : 'Skip this task?'}
                    </p>
                    <p className="text-[11px] text-[#8E98A8]">
                      {pendingAction.action === 'postpone'
                        ? 'The task will return to your plan when the date passes.'
                        : 'The task will remain in your plan but won\'t count as done.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="xs" variant="ghost" onClick={handleCancelPendingAction}
                        className="h-7 text-[11px] text-[#8E98A8] hover:text-[#F1F5F9]">
                        <X className="size-3 mr-1" /> Cancel
                      </Button>
                      <Button size="xs" onClick={handleConfirmAction}
                        className="h-7 text-[11px] font-bold bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00]">
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Undo Notification */}
            {undoInfo && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#10B981]/15 border border-[#10B981]/40 rounded-lg p-4 shadow-lg animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#10B981]" />
                    <span className="text-xs text-[#10B981] font-medium">Action completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="ghost" onClick={handleUndoAction}
                      className="h-7 text-[11px] text-[#10B981] hover:text-[#F1F5F9]">
                      Undo
                    </Button>
                    <Button size="xs" variant="ghost" onClick={handleDismissUndo}
                      className="h-7 text-[11px] text-[#8E98A8] hover:text-[#F1F5F9]">
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT ~45%: Large Art-Directed Visual Scene */}
            <div className="lg:w-[45%] border-t lg:border-t-0 lg:border-l border-[#262D38]/40 p-4 sm:p-5 flex flex-col items-center justify-center relative z-10" data-guide-target="today-hero-scene">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#5C6675] mb-2 self-start">
                Daily Control Scene
              </div>
              <TodayHeroVisual candidates={evaluatedCandidates} />
            </div>
          </div>
        </section>
      ) : (
        <div className="p-8 rounded-xl bg-[#14171D] border border-[#262D38] text-center space-y-3">
          <CheckCircle2 className="size-10 text-[#10B981] mx-auto" />
          <h3 className="text-lg font-bold text-[#F1F5F9]">All caught up for today!</h3>
          <p className="text-xs text-[#8E98A8] max-w-md mx-auto">
            You have completed all primary targets. Inspect your roadmap or review DSA patterns to stay ahead.
          </p>
        </div>
      )}

      {/* 3. DAILY JOURNEY — Scroll Reveal */}
      <div ref={setScrollRef('journey')} className={`scroll-reveal ${revealedSections.has('journey') ? 'visible' : ''}`} data-reveal="journey" data-guide-target="today-daily-journey">
        <DailyJourney candidates={evaluatedCandidates} />
      </div>

      {/* 4. DAILY SIGNAL VISUALIZATION — Scroll Reveal */}
      <div ref={setScrollRef('signals')} className={`scroll-reveal ${revealedSections.has('signals') ? 'visible' : ''}`} data-reveal="signals" data-guide-target="today-readiness-signals">
        <DailySignalGraph />
      </div>

      {/* 5. PRIMARY PRACTICE DRILL RECOMMENDATION */}
      {practiceRecommendation && (
        <section ref={setScrollRef('practice')} className={`scroll-reveal ${revealedSections.has('practice') ? 'visible' : ''}`}>
          <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-[#E5A93C]" />
                <span className="text-xs font-bold text-[#F1F5F9]">
                  {practiceRecommendation.session.estimatedMinutes} min · {practiceRecommendation.session.title}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#FFC665] border border-[#262D38] font-mono">
                {practiceRecommendation.categoryTag}
              </span>
            </div>
            <p className="text-xs text-[#8E98A8]">
              <span className="text-[#FFC665] font-semibold">Why this drill? </span>
              {practiceRecommendation.reason}
            </p>
            {activeSignalChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeSignalChips.map((chip) => (
                  <span key={chip.key} className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">{chip.label}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-[#262D38]">
              <button onClick={() => setRoute('practice')} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] font-medium flex items-center gap-1">
                Explore All Practice Drills <ArrowRight className="size-3" />
              </button>
              <Button size="xs" onClick={() => setActivePracticeSession(practiceRecommendation.session)}
                className="h-8 text-xs font-bold bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md px-3">
                <Play className="size-3 mr-1" /> Start Drill
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Review Schedule — Adaptive review candidates from existing evidence/review/remediation signals */}
      {reviewCandidates.length > 0 && (
        <section ref={setScrollRef('review')} className={`scroll-reveal ${revealedSections.has('review') ? 'visible' : ''}`} data-reveal="review" data-guide-target="today-review-schedule">
          <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-[#F59E0B]" />
                <span className="text-xs font-bold text-[#F1F5F9]">Review Schedule</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#FFC665] border border-[#262D38] font-mono">
                {reviewCandidates.length} candidate{reviewCandidates.length !== 1 ? 's' : ''}
              </span>
            </div>

            {(hasRemediation || hasOverdueReviews || reviewSchedule.hasRoutedWeakness || reviewSchedule.hasCompanyFocusGaps) && (
              <div className="flex flex-wrap gap-1.5">
                {hasRemediation && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">Remediation Required</span>
                )}
                {hasOverdueReviews && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">Overdue Reviews</span>
                )}
                {reviewSchedule.hasRoutedWeakness && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#E5A93C]/10 text-[#FFC665] border border-[#E5A93C]/30">Weakness Actions</span>
                )}
                {reviewSchedule.hasCompanyFocusGaps && selectedCompany && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/30" data-testid="review-company-focus-badge">
                    {selectedCompany.companyName} Targets
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {reviewCandidates.slice(0, 5).map((candidate, index) => (
                <div
                  key={candidate.id}
                  className={`p-3 bg-[#0D0F12] border rounded-lg space-y-2 transition-colors ${
                    candidate.priority === 'remediation' ? 'border-[#F59E0B]/40' :
                    candidate.priority === 'overdue_review' ? 'border-[#F59E0B]/40' :
                    candidate.priority === 'routed_weakness' ? 'border-[#E5A93C]/40' :
                    candidate.priority === 'company_gap' ? 'border-[#3B82F6]/40' :
                    candidate.priority === 'stale_evidence' ? 'border-[#F59E0B]/40' :
                    candidate.priority === 'weak_topic' ? 'border-[#E5A93C]/40' :
                    candidate.priority === 'retention' ? 'border-[#10B981]/40' :
                    'border-[#262D38]'
                  }`}
                  data-guide-target={`today-review-item-${index}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${
                          candidate.priority === 'remediation' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
                          candidate.priority === 'overdue_review' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
                          candidate.priority === 'routed_weakness' ? 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30' :
                          candidate.priority === 'company_gap' ? 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30' :
                          candidate.priority === 'stale_evidence' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
                          candidate.priority === 'weak_topic' ? 'bg-[#E5A93C]/10 text-[#E5A93C] border-[#E5A93C]/30' :
                          candidate.priority === 'retention' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' :
                          'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                        }`}>
                          {candidate.priority === 'routed_weakness'
                            ? 'Weakness Action'
                            : candidate.priority === 'company_gap'
                            ? `${selectedCompany?.companyName || 'Company'} Target`
                            : candidate.priority.replace('_', ' ')}
                        </span>
                        {getDomain(candidate.domainId) && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#FFC665] border border-[#262D38] font-medium">
                            {getDomain(candidate.domainId)?.shortName}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#14171D] text-[#8E98A8] border border-[#262D38] font-mono capitalize">
                          {candidate.route}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#F1F5F9] mt-1 truncate">{candidate.title}</h4>
                      <p className="text-[11px] text-[#8E98A8] mt-0.5 line-clamp-1">{candidate.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#8E98A8] font-mono">{candidate.estimatedMinutes} min</span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setRoute(candidate.route, candidate.targetId)}
                        className="h-7 text-[11px] border-[#262D38] bg-[#14171D] text-[#F1F5F9] hover:bg-[#1B2028] rounded-md px-2.5"
                      >
                        Go
                      </Button>
                    </div>
                  </div>

                  <EvidenceTracePanel
                    trace={candidateTraces[candidate.id]}
                    catalog={evidenceCatalog}
                    idPrefix={`candidate-${candidate.id}`}
                    title="Evidence trace"
                  />
                </div>
              ))}
              {reviewCandidates.length > 5 && (
                <button
                  onClick={() => setRoute('analytics')}
                  className="w-full py-2 text-xs font-medium text-[#8E98A8] hover:text-[#F1F5F9] bg-[#14171D] hover:bg-[#1B2028] border border-[#262D38] rounded-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  View all {reviewCandidates.length} review candidates in Analytics <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5b. CHAINED PRACTICE SESSION — Deterministic session from available time */}
      <SessionDisplay onStartActivity={handleStartSessionActivity} />

      {/* 6. UP NEXT / TODAY'S PLAN */}
      <section ref={setScrollRef('plan')} className={`scroll-reveal ${revealedSections.has('plan') ? 'visible' : ''}`} data-reveal="plan" data-guide-target="today-plan-list">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">
              {isPlanCommitted ? `Today's Plan (${assignedPlanTasks.length} assigned)` : "Up Next"}
            </h3>
            <button onClick={() => setRoute('roadmap')} className="text-xs text-[#E5A93C] hover:text-[#FFC665] font-medium flex items-center gap-1 transition-colors">
              View Roadmap <ArrowRight className="size-3.5" />
            </button>
          </div>
          {!isPlanCommitted ? (
            <div className="p-5 rounded-lg bg-[#14171D] border border-[#262D38] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[#F1F5F9]">Plan today's focus session</h4>
                <p className="text-xs text-[#8E98A8] mt-0.5">Set your time budget and select targets for today.</p>
              </div>
              <Button size="sm" onClick={() => setIsMorningModalOpen(true)}
                className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md h-8 px-3.5 shrink-0">
                <Sun className="size-3.5 mr-1.5 text-[#F59E0B]" /> Commit Morning Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3 list-stagger">
              {visiblePlanTasks.map(({ assignmentId, task, progress }) => {
                const state = progress?.state || 'not_started';
                const stateClass = state === 'in_progress' ? 'state-active' : state === 'completed' ? 'state-completed' : state === 'not_started' ? 'state-due' : '';
                return (
                  <div key={assignmentId} className={stateClass}>
                    <TaskCard task={task} progress={progress} domain={getDomain(task.domainId)} onUpdateState={handleUpdateTaskStateWithToast} onDecomposeTask={decomposeTask} onOpenLearning={openTaskLearning} todayISO={todayDate} onPostpone={handlePostponeTask} onSkip={handleSkipTask} />
                  </div>
                );
              })}
              {assignedPlanTasks.length > 3 && (
                <button onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                  className="w-full py-2 text-xs font-medium text-[#8E98A8] hover:text-[#F1F5F9] bg-[#14171D] hover:bg-[#1B2028] border border-[#262D38] rounded-md flex items-center justify-center gap-1.5 transition-colors">
                  {isPlanExpanded ? <><span>Collapse List</span><ChevronUp className="size-3.5" /></> : <><span>Show All ({assignedPlanTasks.length} Tasks)</span><ChevronDown className="size-3.5" /></>}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 7. THIS WEEK PROGRESS SUMMARY */}
      <section ref={setScrollRef('progress')} className={`scroll-reveal ${revealedSections.has('progress') ? 'visible' : ''}`}>
        <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 flex-1 w-full">
            <div className="flex justify-between text-xs text-[#8E98A8] font-medium">
              <span>Overall Roadmap Progress</span>
              <span className="text-[#FFC665]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#0D0F12] rounded-full h-2 overflow-hidden border border-[#262D38]">
              <div className="bg-[#E5A93C] h-full transition-all duration-500 rounded-full phase-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-[#8E98A8] pt-1">{completedCount} of {totalTasks} roadmap tasks completed</p>
          </div>
        </div>
      </section>

      {/* 8. SYSTEM TELEMETRY */}
      <section ref={setScrollRef('telemetry')} className={`scroll-reveal ${revealedSections.has('telemetry') ? 'visible' : ''}`} data-reveal="telemetry" data-guide-target="today-telemetry">
        <button onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
          className="w-full py-2.5 px-4 bg-[#14171D]/60 hover:bg-[#14171D] border border-[#262D38] rounded-lg text-xs font-semibold text-[#8E98A8] hover:text-[#F1F5F9] flex items-center justify-between transition-colors">
          <span className="flex items-center gap-2"><BarChart3 className="size-3.5 text-[#E5A93C]" /> System Telemetry & Placement Signals</span>
          <span className="flex items-center gap-1 text-[#5C6675]">
            {showTelemetryDetails ? 'Hide' : 'Inspect'} {showTelemetryDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </span>
        </button>
        {showTelemetryDetails && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2"><AlertCircle className="size-3.5 text-[#F59E0B]" /> Skill Status</h4>
              <div className="space-y-2 text-xs">
                {Object.values(skillStates).slice(0, 4).map((sk) => (
                  <div key={sk.topicId} className="flex items-center justify-between text-[#8E98A8]">
                    <span className="text-[#F1F5F9] truncate max-w-[160px]">{sk.topicId.replace('topic-', '')}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium ${sk.freshness === 'fresh' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : sk.freshness === 'aging' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'}`}>{sk.freshness}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2"><Building2 className="size-3.5 text-[#10B981]" /> Target Companies</h4>
              <div className="space-y-2 text-xs">
                {companyOverlays.slice(0, 3).map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between text-[#8E98A8]">
                    <span className="text-[#F1F5F9] font-medium">{comp.companyName}</span>
                    <span className="text-[11px] text-[#FFC665]">{comp.eventDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

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
