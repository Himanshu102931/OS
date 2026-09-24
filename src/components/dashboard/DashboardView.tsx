import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskCard } from '../common/TaskCard';
import { MorningPlanningModal } from '../daily/MorningPlanningModal';
import { EveningReflectionModal } from '../daily/EveningReflectionModal';
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
} from 'lucide-react';
import { Button } from '../ui/button';

export const DashboardView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
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

  const todayCheckIn = dailyCheckIns.find((c) => c.date === todayDate);
  const isDaySealed = todayCheckIn?.isSealed ?? false;

  // Find next best action (highest importance non-completed task)
  const sortedTasks = [...taskDefinitions].sort((a, b) => {
    const stateA = taskProgress[a.id]?.state || 'not_started';
    const stateB = taskProgress[b.id]?.state || 'not_started';
    if (stateA === 'completed' && stateB !== 'completed') return 1;
    if (stateA !== 'completed' && stateB === 'completed') return -1;
    return b.importance - a.importance;
  });

  const nextBestActionTask = sortedTasks.find(
    (t) => (taskProgress[t.id]?.state || 'not_started') !== 'completed'
  ) || sortedTasks[0];

  const nextActionState = taskProgress[nextBestActionTask?.id]?.state || 'not_started';

  const completedCount = Object.values(taskProgress).filter(
    (tp) => tp.state === 'completed'
  ).length;

  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  // Human readable adaptive reasons generator
  const getAdaptiveReasons = (task: typeof nextBestActionTask) => {
    const reasons: string[] = [];
    if (task.importance >= 8) reasons.push('High importance core topic');
    if (task.estimatedMinutes <= (todayCheckIn?.availableMinutes || 180)) {
      reasons.push("Fits today's available time budget");
    }
    const skill = skillStates[task.topicId];
    if (skill?.freshness === 'untested' || skill?.freshness === 'stale' || skill?.freshness === 'aging') {
      reasons.push(`Skill state: ${skill.freshness}`);
    } else {
      reasons.push('Scheduled practice');
    }
    if (task.domainId === 'dsa') reasons.push('Core placement DSA practice');
    return reasons;
  };

  // Determine tasks to render in Today's Plan (2-3 default or all if expanded)
  const visiblePlanTasks = isPlanExpanded ? sortedTasks : sortedTasks.slice(0, 3);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Header & Daily Protocol Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Today
            <span className="text-xs font-mono font-normal text-zinc-400">· {todayDate}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            <span className="capitalize font-medium text-zinc-300">{currentMode.replace('_', ' ')} Mode</span> ·{' '}
            <span className="text-zinc-400">{todayCheckIn?.availableMinutes ? Math.round(todayCheckIn.availableMinutes / 60) : 3}h 00m available budget</span> · Phase:{' '}
            <span className="text-zinc-300 font-medium">{activePhase.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsMorningModalOpen(true)}
            className="text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 rounded h-7 px-2.5"
          >
            <Sun className="size-3.5 mr-1 text-amber-400" /> Morning Planning
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isDaySealed || dailyTaskAssignments.length === 0}
            onClick={() => setIsEveningModalOpen(true)}
            className={`text-xs font-medium rounded h-7 px-2.5 border-zinc-800 ${
              isDaySealed
                ? 'bg-zinc-900 text-zinc-600'
                : 'bg-zinc-900 text-emerald-400 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Moon className="size-3.5 mr-1 text-indigo-400" />{' '}
            {isDaySealed ? 'Day Sealed' : 'Evening Reflection'}
          </Button>
        </div>
      </div>

      {/* Hero Section: NEXT ACTION */}
      {nextBestActionTask && (
        <section className="app-surface p-4 border-l-4 border-l-indigo-500 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                NEXT ACTION
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs font-mono text-zinc-400">
                {nextBestActionTask.estimatedMinutes} mins
              </span>
            </div>
            <span className="text-xs font-medium text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              {getDomain(nextBestActionTask.domainId)?.name || 'General'}
            </span>
          </div>

          <div>
            <h2 className="text-base font-semibold text-zinc-100">{nextBestActionTask.title}</h2>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{nextBestActionTask.description}</p>
          </div>

          {/* Human Readable Adaptive Reasons */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
              <HelpCircle className="size-3 text-zinc-400" /> Why this task is recommended:
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {getAdaptiveReasons(nextBestActionTask).map((reason, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                >
                  • {reason}
                </span>
              ))}
            </div>
          </div>

          {/* Action Execution Row */}
          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>Importance: <span className="font-mono text-zinc-200">{nextBestActionTask.importance}/10</span></span>
              {nextBestActionTask.dueDate && <span>Due: <span className="font-mono text-zinc-200">{nextBestActionTask.dueDate}</span></span>}
            </div>

            <div className="flex items-center gap-2">
              {nextActionState === 'not_started' && (
                <Button
                  size="sm"
                  onClick={() => updateTaskState(nextBestActionTask.id, 'in_progress')}
                  className="h-7 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3"
                >
                  <Play className="size-3 mr-1" /> Start Next Action
                </Button>
              )}

              {nextActionState === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => updateTaskState(nextBestActionTask.id, 'completed')}
                  className="h-7 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded px-3"
                >
                  <Check className="size-3 mr-1" /> Complete Action
                </Button>
              )}

              {nextActionState === 'completed' && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="size-3.5" /> Action Completed
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TODAY'S PLAN / SCHEDULE (COLLAPSIBLE) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Today's Plan ({sortedTasks.length} Tasks)
          </h3>
          <button
            onClick={() => setRoute('roadmap')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View Roadmap <ArrowRight className="size-3" />
          </button>
        </div>

        {/* Task Cards List (Initial 3 or Expanded) */}
        <div className="space-y-2">
          {visiblePlanTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              progress={taskProgress[task.id]}
              domain={getDomain(task.domainId)}
              onUpdateState={updateTaskState}
              onDecomposeTask={decomposeTask}
            />
          ))}
        </div>

        {/* Collapse / Expand Toggle Button */}
        {sortedTasks.length > 3 && (
          <button
            onClick={() => setIsPlanExpanded(!isPlanExpanded)}
            className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-md flex items-center justify-center gap-1.5 transition-colors"
          >
            {isPlanExpanded ? (
              <>
                <span>Collapse List</span>
                <ChevronUp className="size-3.5 text-zinc-400" />
              </>
            ) : (
              <>
                <span>Show All ({sortedTasks.length} Tasks)</span>
                <ChevronDown className="size-3.5 text-zinc-400" />
              </>
            )}
          </button>
        )}
      </section>

      {/* SUMMARY GRID: PROGRESS, WEAK AREAS & UPCOMING */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
        {/* Progress & Metrics */}
        <div className="app-surface p-3.5 space-y-2.5">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="size-3.5 text-indigo-400" /> Progress
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Completed Tasks</span>
              <span className="font-mono text-zinc-200 font-medium">
                {completedCount} / {totalTasks}
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-zinc-400 pt-0.5">
              <span>Roadmap Completion</span>
              <span className="font-mono text-indigo-400 font-medium">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Weak Areas */}
        <div className="app-surface p-3.5 space-y-2.5">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-amber-400" /> Skill Signals
          </h4>
          <div className="space-y-1 text-xs">
            {Object.values(skillStates)
              .slice(0, 3)
              .map((sk) => (
                <div key={sk.topicId} className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-300 truncate max-w-[120px]">
                    {sk.topicId.replace('topic-', '')}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                    {sk.freshness}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Upcoming Targets */}
        <div className="app-surface p-3.5 space-y-2.5">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="size-3.5 text-emerald-400" /> Target Companies
          </h4>
          <div className="space-y-1 text-xs">
            {companyOverlays.slice(0, 2).map((comp) => (
              <div key={comp.id} className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-200 font-medium">{comp.companyName}</span>
                <span className="text-[10px] text-zinc-400 font-mono">{comp.eventDate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
