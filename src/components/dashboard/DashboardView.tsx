import React, { useState, useEffect } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskCard } from '../common/TaskCard';
import { MorningPlanningModal } from '../daily/MorningPlanningModal';
import { EveningReflectionModal } from '../daily/EveningReflectionModal';
import { FocusModeModal } from '../daily/FocusModeModal';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import { PracticeRunnerModal } from '../practice/PracticeRunnerModal';
import { getEvaluatedCandidates, type CandidateTask } from '../../engine/adaptiveEngine';
import { getRecommendedPracticeSession } from '../../engine/practiceEngine';
import type { TaskProgress, TaskDefinition, PracticeSessionDefinition } from '../../types';
import {
  Sun,
  Moon,
  Building2,
  BarChart3,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  BookOpen,
  RotateCcw,
  X,
  CheckCircle2,
  Sparkles,
  Compass,
  Target,
  Play,
} from 'lucide-react';
import { Button } from '../ui/button';

export const DashboardView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    domains,
    activePhase,
    currentMode,
    todayDate,
    updateTaskState,
    setRoute,
    companyOverlays,
    skillStates,
    dailyCheckIns,
    dailyTaskAssignments,
    commitDailyPlan,
    sealDayExecution,
    decomposeTask,
    practiceSessions,
    practiceAttempts,
    recordPracticeAttempt,
  } = usePlacement();

  const [isMorningModalOpen, setIsMorningModalOpen] = useState(false);
  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [activePracticeSession, setActivePracticeSession] = useState<PracticeSessionDefinition | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
  const [workspaceTask, setWorkspaceTask] = useState<{ task: TaskDefinition; candidate?: CandidateTask } | null>(null);

  // Completion Toast State
  const [toastInfo, setToastInfo] = useState<{
    taskId: string;
    taskTitle: string;
    previousState: TaskProgress['state'];
  } | null>(null);

  useEffect(() => {
    if (toastInfo) {
      const timer = setTimeout(() => setToastInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastInfo]);

  const todayCheckIn = dailyCheckIns.find((c) => c.date === todayDate);
  const isDaySealed = todayCheckIn?.isSealed ?? false;
  const todayAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);
  const isPlanCommitted = todayAssignments.length > 0;

  // Authoritative Recommendation Engine Call
  const evaluatedCandidates = getEvaluatedCandidates(
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    currentMode,
    todayDate
  );

  const nextBestActionCandidate = evaluatedCandidates[0];
  const nextBestActionTask = nextBestActionCandidate?.task;
  const nextActionState = nextBestActionTask ? taskProgress[nextBestActionTask.id]?.state || 'not_started' : 'not_started';

  // Practice recommendation call for Today page
  const practiceRecommendation = getRecommendedPracticeSession(
    practiceSessions,
    practiceAttempts,
    skillStates,
    companyOverlays
  );

  const completedCount = Object.values(taskProgress).filter((tp) => tp.state === 'completed').length;
  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  // Format today's date into friendly human format (e.g. "Friday, September 25")
  const formattedDate = React.useMemo(() => {
    try {
      const [year, month, day] = todayDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return todayDate;
    }
  }, [todayDate]);

  // Task Completion Handler with Safety Toast & Undo
  const handleUpdateTaskStateWithToast = (taskId: string, newState: TaskProgress['state']) => {
    const targetTask = taskDefinitions.find((t) => t.id === taskId);
    const prevState = taskProgress[taskId]?.state || 'not_started';

    updateTaskState(taskId, newState);

    if (newState === 'completed' && targetTask) {
      setToastInfo({
        taskId,
        taskTitle: targetTask.title,
        previousState: prevState,
      });
    } else if (toastInfo?.taskId === taskId && newState !== 'completed') {
      setToastInfo(null);
    }
  };

  const handleUndoCompletion = () => {
    if (!toastInfo) return;
    updateTaskState(toastInfo.taskId, toastInfo.previousState);
    setToastInfo(null);
  };

  // Build assigned tasks for today's plan if committed
  const assignedPlanTasks: { assignmentId: string; task: TaskDefinition; progress?: TaskProgress }[] = [];
  if (isPlanCommitted) {
    todayAssignments.forEach((assign) => {
      const task = taskDefinitions.find((t) => t.id === assign.referenceId);
      if (task) {
        assignedPlanTasks.push({
          assignmentId: assign.id,
          task,
          progress: taskProgress[task.id],
        });
      }
    });
  }

  const visiblePlanTasks = isPlanExpanded ? assignedPlanTasks : assignedPlanTasks.slice(0, 3);

  return (
    <div className="space-y-8 max-w-6xl xl:max-w-[1350px] mx-auto font-sans">
      {/* Toast Notification for Task Completion */}
      {toastInfo && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1B2028] border border-[#10B981]/50 text-[#F1F5F9] p-3.5 rounded-lg shadow-2xl flex items-center gap-4 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-[#10B981]">
            <CheckCircle2 className="size-4" />
            <span>Task completed: <strong>{toastInfo.taskTitle}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoCompletion}
              className="px-2.5 py-1 rounded-md bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] font-semibold transition-colors flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Undo
            </button>
            <button
              onClick={() => setToastInfo(null)}
              className="text-[#8E98A8] hover:text-[#F1F5F9] p-0.5"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. CALM RITUAL HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262D38]/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8E98A8]">
            <Compass className="size-3.5 text-[#E5A93C]" />
            <span>{activePhase.name}</span>
            <span>·</span>
            <span className="capitalize text-[#FFC665]">{currentMode.replace('_', ' ')} Mode</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9] mt-1">
            {formattedDate}
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Budget: <strong className="text-[#F1F5F9]">{todayCheckIn?.availableMinutes ? Math.round(todayCheckIn.availableMinutes / 60) : 3} hours available today</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsMorningModalOpen(true)}
            className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] rounded-md h-9 px-3.5"
          >
            <Sun className="size-3.5 mr-2 text-[#F59E0B]" /> Plan Today
          </Button>

          {isPlanCommitted && (
            <Button
              size="sm"
              disabled={isDaySealed}
              onClick={() => setIsEveningModalOpen(true)}
              className={`text-xs font-semibold rounded-md h-9 px-3.5 border ${
                isDaySealed
                  ? 'bg-[#14171D] text-[#5C6675] border-[#262D38]'
                  : 'bg-[#1B2028] text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/10'
              }`}
            >
              <Moon className="size-3.5 mr-2 text-[#10B981]" />{' '}
              {isDaySealed ? 'Day Sealed' : 'Reflect & Seal'}
            </Button>
          )}
        </div>
      </div>

      {/* 2. PRIMARY ACTION FOCUS CARD */}
      {nextBestActionTask ? (
        <section className="bg-gradient-to-br from-[#1B2028] to-[#14171D] p-6 sm:p-7 border border-[#E5A93C]/40 rounded-xl space-y-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/15 border border-[#E5A93C]/30 text-xs font-bold text-[#FFC665]">
                <Zap className="size-3.5 text-[#E5A93C]" /> PRIMARY ACTION
              </span>
              <span className="text-xs text-[#8E98A8]">
                {nextBestActionTask.estimatedMinutes} mins
              </span>
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
            <p className="text-sm text-[#8E98A8] leading-relaxed max-w-2xl">
              {nextBestActionTask.description}
            </p>
          </div>

          {/* Human Reasoning ("Why this?") */}
          {nextBestActionCandidate?.breakdown && (
            <div className="pt-3 border-t border-[#262D38]/80 flex items-start gap-2 text-xs">
              <HelpCircle className="size-4 text-[#E5A93C] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#FFC665]">Why this task? </span>
                <span className="text-[#8E98A8]">
                  {nextBestActionCandidate.breakdown.explanation}
                </span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-[#262D38]/80 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setWorkspaceTask({ task: nextBestActionTask, candidate: nextBestActionCandidate })}
              className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] font-medium flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="size-3.5 text-[#E5A93C]" /> Open Learning Workspace
            </button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsFocusModalOpen(true)}
                className="h-10 px-5 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md shadow-md transition-all active:scale-95"
              >
                <Sparkles className="size-4 mr-1.5 text-[#432C00]" /> Start Focus Mode
              </Button>

              {nextActionState === 'completed' ? (
                <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1 px-3 py-2 bg-[#10B981]/10 rounded-md border border-[#10B981]/30">
                  <Check className="size-4" /> Completed
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed')}
                  className="h-10 px-4 text-xs font-semibold border-[#262D38] bg-[#14171D] text-[#F1F5F9] hover:bg-[#1B2028] rounded-md"
                >
                  <Check className="size-4 mr-1 text-[#10B981]" /> Complete
                </Button>
              )}
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

      {/* 3. PRIMARY PRACTICE DRILL RECOMMENDATION (At most ONE callout) */}
      {practiceRecommendation && (
        <section className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3">
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

          <div className="flex items-center justify-between pt-2 border-t border-[#262D38]">
            <button
              onClick={() => setRoute('practice')}
              className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] font-medium flex items-center gap-1"
            >
              Explore All Practice Drills <ArrowRight className="size-3" />
            </button>

            <Button
              size="xs"
              onClick={() => setActivePracticeSession(practiceRecommendation.session)}
              className="h-8 text-xs font-bold bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md px-3"
            >
              <Play className="size-3 mr-1" /> Start Drill
            </Button>
          </div>
        </section>
      )}

      {/* 4. UP NEXT / TODAY'S PLAN */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">
            {isPlanCommitted ? `Today's Plan (${assignedPlanTasks.length} assigned)` : "Up Next"}
          </h3>
          <button
            onClick={() => setRoute('roadmap')}
            className="text-xs text-[#E5A93C] hover:text-[#FFC665] font-medium flex items-center gap-1 transition-colors"
          >
            View Roadmap <ArrowRight className="size-3.5" />
          </button>
        </div>

        {!isPlanCommitted ? (
          <div className="p-5 rounded-lg bg-[#14171D] border border-[#262D38] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9]">Plan today's focus session</h4>
              <p className="text-xs text-[#8E98A8] mt-0.5">
                Set your time budget and select targets for today.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsMorningModalOpen(true)}
              className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md h-8 px-3.5 shrink-0"
            >
              <Sun className="size-3.5 mr-1.5 text-[#F59E0B]" /> Commit Morning Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePlanTasks.map(({ assignmentId, task, progress }) => (
              <TaskCard
                key={assignmentId}
                task={task}
                progress={progress}
                domain={getDomain(task.domainId)}
                onUpdateState={handleUpdateTaskStateWithToast}
                onDecomposeTask={decomposeTask}
              />
            ))}

            {assignedPlanTasks.length > 3 && (
              <button
                onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                className="w-full py-2 text-xs font-medium text-[#8E98A8] hover:text-[#F1F5F9] bg-[#14171D] hover:bg-[#1B2028] border border-[#262D38] rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                {isPlanExpanded ? (
                  <>
                    <span>Collapse List</span>
                    <ChevronUp className="size-3.5" />
                  </>
                ) : (
                  <>
                    <span>Show All ({assignedPlanTasks.length} Tasks)</span>
                    <ChevronDown className="size-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 5. THIS WEEK PROGRESS SUMMARY */}
      <section className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 w-full">
          <div className="flex justify-between text-xs text-[#8E98A8] font-medium">
            <span>Overall Roadmap Progress</span>
            <span className="text-[#FFC665]">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#0D0F12] rounded-full h-2 overflow-hidden border border-[#262D38]">
            <div
              className="bg-[#E5A93C] h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-[#8E98A8] pt-1">
            {completedCount} of {totalTasks} roadmap tasks completed
          </p>
        </div>
      </section>

      {/* 6. PROGRESSIVE DISCLOSURE: SYSTEM INSIGHTS & TELEMETRY */}
      <section className="pt-2">
        <button
          onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
          className="w-full py-2.5 px-4 bg-[#14171D]/60 hover:bg-[#14171D] border border-[#262D38] rounded-lg text-xs font-semibold text-[#8E98A8] hover:text-[#F1F5F9] flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="size-3.5 text-[#E5A93C]" />
            System Telemetry & Placement Signals
          </span>
          <span className="flex items-center gap-1 text-[#5C6675]">
            {showTelemetryDetails ? 'Hide' : 'Inspect'}
            {showTelemetryDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </span>
        </button>

        {showTelemetryDetails && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {/* Skill Signals */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="size-3.5 text-[#F59E0B]" /> Skill Status
              </h4>
              <div className="space-y-2 text-xs">
                {Object.values(skillStates)
                  .slice(0, 4)
                  .map((sk) => (
                    <div key={sk.topicId} className="flex items-center justify-between text-[#8E98A8]">
                      <span className="text-[#F1F5F9] truncate max-w-[160px]">
                        {sk.topicId.replace('topic-', '')}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium ${
                        sk.freshness === 'fresh'
                          ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                          : sk.freshness === 'aging'
                          ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                          : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                      }`}>
                        {sk.freshness}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Target Companies */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="size-3.5 text-[#10B981]" /> Target Companies
              </h4>
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

      {/* Practice Runner Modal for Today Page */}
      <PracticeRunnerModal
        session={activePracticeSession}
        isOpen={!!activePracticeSession}
        todayISO={todayDate}
        onClose={() => setActivePracticeSession(null)}
        onCompleteSession={(attempt, evidenceLog) => {
          recordPracticeAttempt(attempt, evidenceLog);
        }}
      />

      {/* Focus Mode Overlay */}
      <FocusModeModal
        task={nextBestActionTask}
        domain={nextBestActionTask ? getDomain(nextBestActionTask.domainId) : undefined}
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        onComplete={() => {
          if (nextBestActionTask) {
            handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed');
          }
        }}
      />

      {/* Task Learning Workspace Drawer */}
      <TaskLearningWorkspaceDrawer
        task={workspaceTask?.task || null}
        progress={workspaceTask?.task ? taskProgress[workspaceTask.task.id] : undefined}
        domain={workspaceTask?.task ? getDomain(workspaceTask.task.domainId) : undefined}
        breakdown={workspaceTask?.candidate?.breakdown}
        isOpen={!!workspaceTask}
        onClose={() => setWorkspaceTask(null)}
        onUpdateState={handleUpdateTaskStateWithToast}
      />

      {/* Modals */}
      <MorningPlanningModal
        isOpen={isMorningModalOpen}
        onClose={() => setIsMorningModalOpen(false)}
        onCommitPlan={(checkIn, assignments) => commitDailyPlan(checkIn, assignments)}
      />

      <EveningReflectionModal
        isOpen={isEveningModalOpen}
        onClose={() => setIsEveningModalOpen(false)}
        onSealDay={(
          updatedCheckIn,
          updatedAssignments,
          newEvidenceLogs,
          updatedTaskProgressMap,
          updatedDsaProgressMap,
          updatedSkillStatesMap
        ) =>
          sealDayExecution(
            updatedCheckIn,
            updatedAssignments,
            newEvidenceLogs,
            updatedTaskProgressMap,
            updatedDsaProgressMap,
            updatedSkillStatesMap
          )
        }
      />
    </div>
  );
};
