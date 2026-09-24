import React, { useState, useEffect } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskCard } from '../common/TaskCard';
import { MorningPlanningModal } from '../daily/MorningPlanningModal';
import { EveningReflectionModal } from '../daily/EveningReflectionModal';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import { getEvaluatedCandidates, type CandidateTask } from '../../engine/adaptiveEngine';
import type { TaskProgress, TaskDefinition } from '../../types';
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
  Play,
  Check,
  Zap,
  BookOpen,
  RotateCcw,
  X,
  CheckCircle2,
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
  } = usePlacement();

  const [isMorningModalOpen, setIsMorningModalOpen] = useState(false);
  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
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

  const completedCount = Object.values(taskProgress).filter((tp) => tp.state === 'completed').length;
  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

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
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Toast Notification for Task Completion */}
      {toastInfo && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1B2028] border border-[#10B981]/50 text-[#F1F5F9] p-3.5 rounded-[4px] shadow-2xl flex items-center gap-4 font-mono text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-[#10B981]">
            <CheckCircle2 className="size-4" />
            <span>Task completed: <strong>{toastInfo.taskTitle}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoCompletion}
              className="px-2.5 py-1 rounded-[4px] bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] font-bold transition-colors flex items-center gap-1"
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

      {/* Top Header & Daily Protocol Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2 font-mono">
            Today / Operational Workspace
            <span className="text-xs font-mono font-medium text-[#E5A93C] bg-[#E5A93C]/10 border border-[#E5A93C]/30 px-2 py-0.5 rounded-[4px]">
              {todayDate}
            </span>
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            <span className="capitalize text-[#FFC665] font-semibold">{currentMode.replace('_', ' ')} Mode</span> ·{' '}
            <span>{todayCheckIn?.availableMinutes ? Math.round(todayCheckIn.availableMinutes / 60) : 3}h 00m target budget</span> · Phase:{' '}
            <span className="text-[#F1F5F9]">{activePhase.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsMorningModalOpen(true)}
            className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] hover:border-[#3B4556] rounded-[4px] h-8 px-3 font-mono"
          >
            <Sun className="size-3.5 mr-1.5 text-[#F59E0B]" /> Morning Planning
          </Button>

          {isPlanCommitted ? (
            <Button
              size="sm"
              disabled={isDaySealed}
              onClick={() => setIsEveningModalOpen(true)}
              className={`text-xs font-semibold rounded-[4px] h-8 px-3 border font-mono ${
                isDaySealed
                  ? 'bg-[#14171D] text-[#5C6675] border-[#262D38]'
                  : 'bg-[#1B2028] text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/10'
              }`}
            >
              <Moon className="size-3.5 mr-1.5 text-[#10B981]" />{' '}
              {isDaySealed ? 'Day Sealed' : 'Evening Reflection'}
            </Button>
          ) : (
            <div className="relative group">
              <Button
                size="sm"
                onClick={() => setIsMorningModalOpen(true)}
                className="text-xs font-semibold rounded-[4px] h-8 px-3 bg-[#1B2028] text-[#8E98A8] border border-[#262D38] hover:border-[#FFC665] hover:text-[#FFC665] font-mono"
              >
                <Moon className="size-3.5 mr-1.5 text-[#5C6675]" /> Evening Reflection
              </Button>
              <div className="absolute right-0 top-10 hidden group-hover:block z-30 w-64 p-2 bg-[#1B2028] border border-[#262D38] rounded-[4px] text-[11px] text-[#FFC665] font-mono shadow-xl">
                Create today's plan before starting Evening Reflection.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section: NEXT ACTION (Authoritative Adaptive Engine Driven) */}
      {nextBestActionTask && (
        <section className="bg-[#14171D] p-5 border-l-4 border-l-[#E5A93C] border border-[#262D38] rounded-[4px] space-y-4 shadow-sm font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider flex items-center gap-1">
                <Zap className="size-3.5" /> NEXT ACTION
              </span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs text-[#8E98A8]">
                {nextBestActionTask.estimatedMinutes} mins
              </span>
            </div>
            <span className="tech-chip tech-chip-primary font-semibold">
              {getDomain(nextBestActionTask.domainId)?.name || 'General'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#F1F5F9] tracking-tight">{nextBestActionTask.title}</h2>
            <p className="text-xs text-[#8E98A8] mt-1 leading-relaxed">{nextBestActionTask.description}</p>
          </div>

          {/* Authoritative Adaptive Drivers */}
          {nextBestActionCandidate?.breakdown && (
            <div className="pt-3 border-t border-[#262D38] space-y-1.5">
              <span className="text-[11px] font-medium text-[#8E98A8] flex items-center gap-1">
                <HelpCircle className="size-3 text-[#E5A93C]" /> Adaptive recommendation drivers:
              </span>
              <p className="text-xs text-[#FFC665] font-mono italic">
                {nextBestActionCandidate.breakdown.explanation}
              </p>
            </div>
          )}

          {/* Action Execution & Workspace Trigger Row */}
          <div className="pt-3 border-t border-[#262D38] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-[#8E98A8]">
              <span>Importance: <span className="text-[#F1F5F9] font-semibold">{nextBestActionTask.importance}/10</span></span>
              {nextBestActionTask.dueDate && <span>Due: <span className="text-[#FFC665]">{nextBestActionTask.dueDate}</span></span>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWorkspaceTask({ task: nextBestActionTask, candidate: nextBestActionCandidate })}
                className="h-8 text-xs font-semibold border-[#262D38] bg-[#1B2028] text-[#F1F5F9] hover:bg-[#262D38] rounded-[4px] px-3"
              >
                <BookOpen className="size-3.5 mr-1.5 text-[#FFC665]" /> Open Learning Workspace
              </Button>

              {nextActionState === 'not_started' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateTaskStateWithToast(nextBestActionTask.id, 'in_progress')}
                  className="h-8 text-xs font-semibold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-4 shadow-sm"
                >
                  <Play className="size-3.5 mr-1.5" /> Start Next Action
                </Button>
              )}

              {nextActionState === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed')}
                  className="h-8 text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-[4px] px-4 shadow-sm"
                >
                  <Check className="size-3.5 mr-1.5" /> Complete Action
                </Button>
              )}

              {nextActionState === 'completed' && (
                <span className="text-xs text-[#10B981] font-semibold font-mono flex items-center gap-1">
                  <Check className="size-4" /> Action Completed
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TODAY'S PLAN / COMMITTED SESSION */}
      <section className="space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
            {isPlanCommitted ? `Today's Plan (${assignedPlanTasks.length} Assigned Tasks)` : "Today's Plan"}
          </h3>
          <button
            onClick={() => setRoute('roadmap')}
            className="text-xs text-[#E5A93C] hover:text-[#FFC665] font-medium flex items-center gap-1 transition-colors"
          >
            View Master Roadmap <ArrowRight className="size-3.5" />
          </button>
        </div>

        {!isPlanCommitted ? (
          <div className="p-5 rounded-[4px] bg-[#14171D] border border-[#262D38] space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#FFC665] uppercase tracking-wider block">
                Plan Not Created
              </span>
              <p className="text-xs text-[#8E98A8]">
                No daily plan has been committed for today's session. Commit your morning budget to structure today's targets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#262D38]">
              <Button
                size="sm"
                onClick={() => setIsMorningModalOpen(true)}
                className="text-xs font-bold bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] rounded-[4px] px-4"
              >
                <Sun className="size-3.5 mr-1.5 text-[#0D0F12]" /> Plan Today's Session
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setRoute('roadmap')}
                className="text-xs font-semibold border-[#262D38] bg-[#1B2028] text-[#F1F5F9] hover:bg-[#262D38] rounded-[4px]"
              >
                Inspect Master Roadmap
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
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
                className="w-full py-2.5 text-xs font-mono font-medium text-[#8E98A8] hover:text-[#F1F5F9] bg-[#14171D] hover:bg-[#1B2028] border border-[#262D38] hover:border-[#3B4556] rounded-[4px] flex items-center justify-center gap-1.5 transition-all"
              >
                {isPlanExpanded ? (
                  <>
                    <span>Collapse Assigned List</span>
                    <ChevronUp className="size-3.5 text-[#8E98A8]" />
                  </>
                ) : (
                  <>
                    <span>Show All ({assignedPlanTasks.length} Assigned Tasks)</span>
                    <ChevronDown className="size-3.5 text-[#8E98A8]" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>

      {/* SUMMARY GRID: PROGRESS, SKILL SIGNALS & TARGET COMPANIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#262D38] font-mono">
        {/* Progress & Metrics */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="size-3.5 text-[#E5A93C]" /> Progress Telemetry
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8E98A8]">
              <span>Completed Tasks</span>
              <span className="text-[#F1F5F9] font-semibold">
                {completedCount} / {totalTasks}
              </span>
            </div>
            <div className="w-full bg-[#1B2028] rounded-[2px] h-1.5 overflow-hidden border border-[#262D38]">
              <div
                className="bg-[#E5A93C] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[#8E98A8] pt-1">
              <span>Roadmap Mastered</span>
              <span className="text-[#FFC665] font-semibold">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Skill Signals */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="size-3.5 text-[#F59E0B]" /> Skill Signals
          </h4>
          <div className="space-y-1.5 text-xs">
            {Object.values(skillStates)
              .slice(0, 3)
              .map((sk) => (
                <div key={sk.topicId} className="flex items-center justify-between text-[#8E98A8]">
                  <span className="text-[#F1F5F9] truncate max-w-[130px]">
                    {sk.topicId.replace('topic-', '')}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] border capitalize ${
                    sk.freshness === 'fresh'
                      ? 'tech-chip-success'
                      : sk.freshness === 'aging'
                      ? 'tech-chip-warning'
                      : 'tech-chip'
                  }`}>
                    {sk.freshness}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Target Companies */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <Building2 className="size-3.5 text-[#10B981]" /> Target Companies
          </h4>
          <div className="space-y-1.5 text-xs">
            {companyOverlays.slice(0, 2).map((comp) => (
              <div key={comp.id} className="flex items-center justify-between text-[#8E98A8]">
                <span className="text-[#F1F5F9] font-medium">{comp.companyName}</span>
                <span className="text-[10px] text-[#FFC665]">{comp.eventDate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
