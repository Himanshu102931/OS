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
  Clock,
  CheckCircle2,
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
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-blue-950/50 to-indigo-950/60 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="size-3.5" />
              <span>Placement Preparation Control Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Focus Dashboard for <span className="gradient-text-blue">{todayDate}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Active Phase: <strong className="text-white">{activePhase.name}</strong> • Mode:{' '}
              <strong className="text-blue-400 uppercase tracking-wide">{currentMode}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="lg"
              onClick={() => setIsMorningModalOpen(true)}
              className="text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-blue-500/25 rounded-2xl px-5 h-11"
            >
              <Sun className="size-4 mr-2 text-amber-300" /> Morning Planning Protocol
            </Button>

            <Button
              size="lg"
              variant="outline"
              disabled={isDaySealed || dailyTaskAssignments.length === 0}
              onClick={() => setIsEveningModalOpen(true)}
              className={`text-xs font-bold rounded-2xl px-5 h-11 border-slate-700 ${
                isDaySealed
                  ? 'bg-slate-900 text-slate-500 border-slate-800'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 shadow-lg shadow-emerald-500/10'
              }`}
            >
              <Moon className="size-4 mr-2 text-indigo-300" />{' '}
              {isDaySealed ? 'Day Sealed' : 'Evening Reflection & Seal'}
            </Button>
          </div>
        </div>

        {/* Quick Stat Pill Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock className="size-4" />
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Time Budget</span>
              <span className="font-mono font-bold text-white text-sm">180 mins</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Completed</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {completedCount} / {totalTasks} Tasks
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Building2 className="size-4" />
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Active Targets</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {companyOverlays.length} Companies
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="size-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Overall Progress</span>
              <span className="font-mono font-bold text-purple-300 text-sm">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Primary Actionable Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Next Best Action Card */}
          {nextBestActionTask && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Target className="size-4 text-blue-400" />
                Primary Actionable Recommendation
              </h3>

              <div className="glass-card rounded-3xl p-1 glow-blue border-blue-500/40">
                <div className="bg-blue-950/40 border-b border-blue-900/40 px-5 py-2.5 rounded-t-2xl text-xs text-blue-300 flex items-center gap-2 font-medium">
                  <AlertCircle className="size-4 text-blue-400 shrink-0" />
                  <span>
                    <strong>Why Recommended:</strong> Core Phase 1 importance ({nextBestActionTask.importance}/10) with upcoming assessment alignment.
                  </span>
                </div>
                <div className="p-4">
                  <TaskCard
                    task={nextBestActionTask}
                    progress={taskProgress[nextBestActionTask.id]}
                    domain={getDomain(nextBestActionTask.domainId)}
                    isNextBestAction={true}
                    onUpdateState={updateTaskState}
                    onDecomposeTask={decomposeTask}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Active Task Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Layers className="size-4 text-indigo-400" />
                Active Task Queue ({taskDefinitions.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoute('roadmap')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                View Master Roadmap <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-3.5">
              {sortedTasks.map((task) => (
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
          </div>
        </div>

        {/* Right 1 Column: Secondary Monitoring Widgets */}
        <div className="space-y-6">
          {/* Widget 1: Roadmap Progress Overview */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-400" />
                Roadmap Completion
              </h3>
              <span className="text-sm font-mono font-bold text-emerald-400">{progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-xs text-slate-400 space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span>Phase 1 Tasks</span>
                <span className="text-slate-200 font-medium font-mono">
                  {completedCount} / {totalTasks} Done
                </span>
              </div>
              <div className="flex justify-between">
                <span>Curriculum Span</span>
                <span className="text-slate-300 font-mono text-[11px]">Sep 2026 – May 2027</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Target Company Events */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="size-4 text-amber-400" />
              Target Company Events
            </h3>

            <div className="space-y-2.5">
              {companyOverlays.map((comp) => (
                <div
                  key={comp.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-100">{comp.companyName}</div>
                    <div className="text-slate-400 text-[11px] font-medium">{comp.targetRole}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-block mb-1">
                      {comp.applicationStatus.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">{comp.eventDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Skill Freshness Signals */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="size-4 text-rose-400" />
              Skill Freshness Signals
            </h3>

            <div className="space-y-2 text-xs">
              {Object.values(skillStates).map((sk) => (
                <div
                  key={sk.topicId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-white/5"
                >
                  <span className="text-slate-200 font-medium">{sk.topicId.replace('topic-', '')}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      sk.freshness === 'untested'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : sk.freshness === 'aging'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
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
