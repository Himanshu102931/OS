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
  Zap,
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Daily Protocol Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
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
            className="text-xs font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] hover:border-[#3B4556] rounded-[4px] h-8 px-3"
          >
            <Sun className="size-3.5 mr-1.5 text-[#F59E0B]" /> Morning Planning
          </Button>

          <Button
            size="sm"
            disabled={isDaySealed || dailyTaskAssignments.length === 0}
            onClick={() => setIsEveningModalOpen(true)}
            className={`text-xs font-semibold rounded-[4px] h-8 px-3 border ${
              isDaySealed
                ? 'bg-[#14171D] text-[#5C6675] border-[#262D38]'
                : 'bg-[#1B2028] text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/10'
            }`}
          >
            <Moon className="size-3.5 mr-1.5 text-[#59E8AB]" />{' '}
            {isDaySealed ? 'Day Sealed' : 'Evening Reflection'}
          </Button>
        </div>
      </div>

      {/* Hero Section: NEXT ACTION */}
      {nextBestActionTask && (
        <section className="app-surface p-5 border-l-4 border-l-[#E5A93C] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#E5A93C] uppercase tracking-wider flex items-center gap-1">
                <Zap className="size-3.5" /> NEXT ACTION
              </span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs font-mono text-[#8E98A8]">
                {nextBestActionTask.estimatedMinutes} mins
              </span>
            </div>
            <span className="tech-chip tech-chip-primary font-semibold">
              {getDomain(nextBestActionTask.domainId)?.name || 'General'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#F1F5F9] tracking-tight">{nextBestActionTask.title}</h2>
            <p className="text-xs text-[#8E98A8] mt-1 leading-relaxed">{nextBestActionTask.description}</p>
          </div>

          {/* Human Readable Adaptive Reasons */}
          <div className="pt-3 border-t border-[#262D38] space-y-1.5">
            <span className="text-[11px] font-medium text-[#8E98A8] flex items-center gap-1">
              <HelpCircle className="size-3 text-[#E5A93C]" /> Adaptive recommendation drivers:
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {getAdaptiveReasons(nextBestActionTask).map((reason, idx) => (
                <span
                  key={idx}
                  className="tech-chip text-[11px]"
                >
                  • {reason}
                </span>
              ))}
            </div>
          </div>

          {/* Action Execution Row */}
          <div className="pt-3 border-t border-[#262D38] flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-[#8E98A8] font-mono">
              <span>Importance: <span className="text-[#F1F5F9] font-semibold">{nextBestActionTask.importance}/10</span></span>
              {nextBestActionTask.dueDate && <span>Due: <span className="text-[#FFC665]">{nextBestActionTask.dueDate}</span></span>}
            </div>

            <div className="flex items-center gap-2">
              {nextActionState === 'not_started' && (
                <Button
                  size="sm"
                  onClick={() => updateTaskState(nextBestActionTask.id, 'in_progress')}
                  className="h-8 text-xs font-semibold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-4 shadow-sm"
                >
                  <Play className="size-3.5 mr-1.5" /> Start Next Action
                </Button>
              )}

              {nextActionState === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => updateTaskState(nextBestActionTask.id, 'completed')}
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

      {/* TODAY'S PLAN / SCHEDULE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider">
            Today's Plan ({sortedTasks.length} Tasks)
          </h3>
          <button
            onClick={() => setRoute('roadmap')}
            className="text-xs text-[#E5A93C] hover:text-[#FFC665] font-medium flex items-center gap-1 transition-colors"
          >
            View Roadmap <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Task Cards List */}
        <div className="space-y-2.5">
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
            className="w-full py-2.5 text-xs font-mono font-medium text-[#8E98A8] hover:text-[#F1F5F9] bg-[#14171D] hover:bg-[#1B2028] border border-[#262D38] hover:border-[#3B4556] rounded-[4px] flex items-center justify-center gap-1.5 transition-all"
          >
            {isPlanExpanded ? (
              <>
                <span>Collapse List</span>
                <ChevronUp className="size-3.5 text-[#8E98A8]" />
              </>
            ) : (
              <>
                <span>Show All ({sortedTasks.length} Tasks)</span>
                <ChevronDown className="size-3.5 text-[#8E98A8]" />
              </>
            )}
          </button>
        )}
      </section>

      {/* SUMMARY GRID: PROGRESS, SKILL SIGNALS & TARGET COMPANIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#262D38]">
        {/* Progress & Metrics */}
        <div className="app-surface p-4 space-y-3">
          <h4 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="size-3.5 text-[#E5A93C]" /> Progress Telemetry
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8E98A8] font-mono">
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
            <div className="flex justify-between text-[#8E98A8] font-mono pt-1">
              <span>Roadmap Mastered</span>
              <span className="text-[#FFC665] font-semibold">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Skill Signals */}
        <div className="app-surface p-4 space-y-3">
          <h4 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="size-3.5 text-[#F59E0B]" /> Skill Signals
          </h4>
          <div className="space-y-1.5 text-xs font-mono">
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
        <div className="app-surface p-4 space-y-3">
          <h4 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
            <Building2 className="size-3.5 text-[#59E8AB]" /> Target Companies
          </h4>
          <div className="space-y-1.5 text-xs font-mono">
            {companyOverlays.slice(0, 2).map((comp) => (
              <div key={comp.id} className="flex items-center justify-between text-[#8E98A8]">
                <span className="text-[#F1F5F9] font-medium">{comp.companyName}</span>
                <span className="text-[10px] text-[#FFC665]">{comp.eventDate}</span>
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
