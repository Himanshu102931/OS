import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskCard } from '../common/TaskCard';
import { MorningPlanningModal } from '../daily/MorningPlanningModal';
import { EveningReflectionModal } from '../daily/EveningReflectionModal';
import {
  Sparkles,
  Target,
  Building2,
  AlertCircle,
  BarChart3,
  Layers,
  ArrowRight,
  Sun,
  Moon,
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
  } = usePlacement();

  const [isMorningModalOpen, setIsMorningModalOpen] = useState(false);
  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);

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

  const completedCount = Object.values(taskProgress).filter(
    (tp) => tp.state === 'completed'
  ).length;

  const totalTasks = taskDefinitions.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            <span>Placement Preparation Control Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Focus Dashboard for {todayDate}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Active Phase: <strong className="text-slate-200">{activePhase.name}</strong> • Mode:{' '}
            <strong className="text-blue-400 uppercase">{currentMode}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsMorningModalOpen(true)}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            <Sun className="size-3.5 mr-1" /> Morning Planning
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isDaySealed || dailyTaskAssignments.length === 0}
            onClick={() => setIsEveningModalOpen(true)}
            className={`text-xs border-slate-700 ${
              isDaySealed
                ? 'bg-slate-900 text-slate-500 border-slate-800'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <Moon className="size-3.5 mr-1" /> {isDaySealed ? 'Day Sealed' : 'Evening Reflection'}
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Primary Actionable Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Next Best Action Card */}
          {nextBestActionTask && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="size-4 text-blue-400" />
                  Primary Actionable Recommendation
                </h3>
              </div>

              <div className="bg-slate-900/80 border border-blue-500/30 rounded-2xl p-1">
                <div className="bg-blue-950/20 border-b border-blue-900/30 px-4 py-2 rounded-t-xl text-xs text-blue-300 flex items-center gap-2">
                  <AlertCircle className="size-3.5 text-blue-400 shrink-0" />
                  <span>
                    <strong>Why Recommended:</strong> Core Phase 1 importance ({nextBestActionTask.importance}/10) with upcoming assessment alignment.
                  </span>
                </div>
                <div className="p-3">
                  <TaskCard
                    task={nextBestActionTask}
                    progress={taskProgress[nextBestActionTask.id]}
                    domain={getDomain(nextBestActionTask.domainId)}
                    isNextBestAction={true}
                    onUpdateState={updateTaskState}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Active Task Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-4 text-indigo-400" />
                Active Task Queue ({taskDefinitions.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoute('roadmap')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View Master Roadmap <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>

            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  progress={taskProgress[task.id]}
                  domain={getDomain(task.domainId)}
                  onUpdateState={updateTaskState}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Secondary Monitoring Widgets */}
        <div className="space-y-6">
          {/* Widget 1: Roadmap Progress Overview */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="size-4 text-emerald-400" />
                Roadmap Progress
              </h3>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-xs text-slate-400 space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between">
                <span>Phase 1 Tasks</span>
                <span className="text-slate-200 font-medium">
                  {completedCount} of {totalTasks} completed
                </span>
              </div>
              <div className="flex justify-between">
                <span>Timeline Span</span>
                <span className="text-slate-300">Sep 2026 – May 2027</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Target Company Events */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Building2 className="size-4 text-amber-400" />
              Target Company Events
            </h3>

            <div className="space-y-2">
              {companyOverlays.map((comp) => (
                <div
                  key={comp.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{comp.companyName}</div>
                    <div className="text-slate-400 text-[11px]">{comp.targetRole}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-950 text-amber-300 border border-amber-800/60 block">
                      {comp.applicationStatus}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{comp.eventDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Skill Freshness Signals */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <AlertCircle className="size-4 text-rose-400" />
              Skill Freshness Signals
            </h3>

            <div className="space-y-2 text-xs">
              {Object.values(skillStates).map((sk) => (
                <div
                  key={sk.topicId}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <span className="text-slate-300 font-medium">{sk.topicId.replace('topic-', '')}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      sk.freshness === 'untested'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        : sk.freshness === 'aging'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    }`}
                  >
                    {sk.freshness}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Morning Planning Modal */}
      <MorningPlanningModal
        isOpen={isMorningModalOpen}
        onClose={() => setIsMorningModalOpen(false)}
        onCommitPlan={(checkIn, assignments) => commitDailyPlan(checkIn, assignments)}
      />

      {/* Evening Reflection Modal */}
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
