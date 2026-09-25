import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { getDaysDifference } from '../../engine/adaptiveEngine';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import type { Topic, TaskDefinition } from '../../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  ChevronRight,
  ChevronDown,
  X,
  Target,
  Lock,
  HelpCircle,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';

export const RoadmapView: React.FC = () => {
  const { phases, modules, topics, taskDefinitions, taskProgress, domains, skillStates, todayDate, setRoute, updateTaskState } = usePlacement();

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('phase-1');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [selectedWorkspaceTask, setSelectedWorkspaceTask] = useState<TaskDefinition | null>(null);

  // Module Collapsible State
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach((m, idx) => {
      // Expand first module or module containing incomplete tasks by default
      initial[m.id] = idx === 0 || m.phaseId === 'phase-1';
    });
    return initial;
  });

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) || phases[0];

  const hasActiveFilters = filterDomain !== 'all' || filterState !== 'all';

  const resetFilters = () => {
    setFilterDomain('all');
    setFilterState('all');
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const expandAllModules = () => {
    const updated: Record<string, boolean> = {};
    modules.forEach((m) => (updated[m.id] = true));
    setExpandedModuleIds(updated);
  };

  const collapseAllModules = () => {
    const updated: Record<string, boolean> = {};
    modules.forEach((m) => (updated[m.id] = false));
    setExpandedModuleIds(updated);
  };

  const phaseModules = modules.filter((m) => {
    if (m.phaseId !== selectedPhaseId) return false;
    if (filterDomain !== 'all' && m.domainId !== filterDomain) return false;
    return true;
  });

  // Phase Tasks & Progress Calculation
  const totalPhaseTasks = taskDefinitions.filter((t) => t.phaseId === selectedPhaseId);
  const completedPhaseTasks = totalPhaseTasks.filter(
    (t) => taskProgress[t.id]?.state === 'completed'
  );
  const phaseProgressPercent =
    totalPhaseTasks.length > 0
      ? Math.round((completedPhaseTasks.length / totalPhaseTasks.length) * 100)
      : 0;

  // Phase Date Formatting & Status Helper
  const formatPhaseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPhaseStatus = (phase: typeof selectedPhase) => {
    if (todayDate < phase.startDate) {
      const days = getDaysDifference(phase.startDate, todayDate);
      return { label: `Starts in ${days}d`, isCurrent: false, isCompleted: false };
    } else if (todayDate >= phase.startDate && todayDate <= phase.endDate) {
      const remaining = getDaysDifference(phase.endDate, todayDate);
      return { label: `Active Phase (${remaining}d left)`, isCurrent: true, isCompleted: false };
    } else {
      return { label: 'Phase Completed', isCurrent: false, isCompleted: true };
    }
  };

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  // Helper for Relative Deadlines
  const formatRelativeDeadline = (targetDateStr?: string) => {
    if (!targetDateStr) return null;
    const diff = getDaysDifference(targetDateStr, todayDate);
    const dateFormatted = new Date(targetDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (diff < 0) {
      return <span className="text-rose-400 font-bold">{dateFormatted} (Overdue by {Math.abs(diff)}d)</span>;
    } else if (diff === 0) {
      return <span className="text-[#FFC665] font-bold">{dateFormatted} (Due Today)</span>;
    } else {
      return <span className="text-[#8E98A8]">{dateFormatted} ({diff}d left)</span>;
    }
  };

  // Check Task Prerequisite Lock Status
  const getTaskLockStatus = (task: TaskDefinition) => {
    const state = taskProgress[task.id]?.state || 'not_started';
    if (state === 'completed') {
      return { status: 'completed', isLocked: false, unmetPrereqs: [] };
    }

    const prereqIds = task.prerequisiteTaskDefinitionIds || [];
    if (prereqIds.length === 0) {
      return { status: 'available', isLocked: false, unmetPrereqs: [] };
    }

    const unmet = prereqIds
      .map((id) => taskDefinitions.find((t) => t.id === id))
      .filter((t): t is TaskDefinition => t !== undefined && taskProgress[t.id]?.state !== 'completed');

    if (unmet.length > 0) {
      return { status: 'locked', isLocked: true, unmetPrereqs: unmet };
    }

    return { status: 'available', isLocked: false, unmetPrereqs: [] };
  };

  // Topic Drawer Data Helpers
  const topicTasks: TaskDefinition[] = activeTopic
    ? taskDefinitions.filter((t) => t.topicId === activeTopic.id)
    : [];

  const topicModule = activeTopic
    ? modules.find((m) => m.id === activeTopic.moduleId)
    : null;

  const topicSkill = activeTopic ? skillStates[activeTopic.id] : null;

  // Primary domains featured in selected phase
  const primaryPhaseDomainIds = Array.from(new Set(totalPhaseTasks.map((t) => t.domainId)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative font-sans">
      {/* Header Bar & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2 font-mono">
            Master Roadmap & Trajectory
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Long-term curriculum graph (Sep 2026 – May 2027) spanning 11 placement domains
          </p>
        </div>

        {/* Filter Toolbar & Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#14171D] border border-[#262D38] rounded-[4px] px-3 py-1.5">
            <Filter className="size-3.5 text-[#E5A93C]" />
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="bg-transparent text-[#F1F5F9] font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#14171D]">All Domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#14171D]">
                  {d.shortName}
                </option>
              ))}
            </select>
            <span className="text-[#3B4556]">|</span>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="bg-transparent text-[#F1F5F9] font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#14171D]">All Statuses</option>
              <option value="not_started" className="bg-[#14171D]">To Do</option>
              <option value="in_progress" className="bg-[#14171D]">In Progress</option>
              <option value="completed" className="bg-[#14171D]">Completed</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              size="xs"
              variant="outline"
              onClick={resetFilters}
              className="h-8 text-xs border-[#262D38] bg-[#14171D] text-[#FFC665] hover:bg-[#1B2028] rounded-[4px]"
            >
              <RotateCcw className="size-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Phase Timeline Tabs (Chiseled Design with Current Location Marker) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        {phases.map((phase) => {
          const isActive = phase.id === selectedPhaseId;
          const statusInfo = getPhaseStatus(phase);
          const pTasks = taskDefinitions.filter((t) => t.phaseId === phase.id);
          const pDone = pTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
          const pPercent = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

          return (
            <button
              key={phase.id}
              onClick={() => setSelectedPhaseId(phase.id)}
              className={`p-3.5 rounded-[4px] border text-left transition-all ${
                isActive
                  ? 'bg-[#1B2028] border-[#E5A93C] text-[#F1F5F9] font-semibold shadow-sm'
                  : 'bg-[#14171D] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:border-[#3B4556]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#8E98A8] flex items-center gap-1">
                  PHASE {phase.order}
                  {statusInfo.isCurrent && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#E5A93C]/20 text-[#FFC665] font-bold border border-[#E5A93C]/40">
                      ACTIVE
                    </span>
                  )}
                </span>
                <span className="font-semibold text-[#FFC665]">{pPercent}%</span>
              </div>
              <div className="font-semibold text-xs text-[#F1F5F9] truncate mt-1.5 font-sans">
                {phase.name.split(':')[1] || phase.name}
              </div>
              <div className="text-[10px] text-[#5C6675] mt-1 flex items-center justify-between">
                <span>{formatPhaseDate(phase.startDate)} – {formatPhaseDate(phase.endDate)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Phase Overview Banner */}
      <div className="bg-[#14171D] p-5 border border-[#262D38] rounded-[4px] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#262D38]">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-bold text-[#E5A93C] uppercase tracking-wider flex items-center gap-1">
                <Layers className="size-3.5" /> {selectedPhase.name}
              </span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs font-mono text-[#FFC665]">
                {getPhaseStatus(selectedPhase).label}
              </span>
            </div>
            <p className="text-xs text-[#8E98A8] leading-relaxed max-w-3xl">{selectedPhase.description}</p>
          </div>

          <div className="text-right text-xs font-mono shrink-0">
            <span className="text-[#8E98A8]">Phase Completion: </span>
            <span className="font-bold text-sm text-[#FFC665] block mt-0.5">
              {completedPhaseTasks.length} / {totalPhaseTasks.length} tasks ({phaseProgressPercent}%)
            </span>
          </div>
        </div>

        {/* Primary Domains in this Phase */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#8E98A8] text-[11px] uppercase tracking-wider">Primary Domains:</span>
          <div className="flex flex-wrap gap-1.5">
            {primaryPhaseDomainIds.map((domId) => {
              const d = getDomain(domId);
              if (!d) return null;
              return (
                <span key={domId} className="tech-chip text-[10px]">
                  {d.shortName}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modules Timeline & Hierarchy Tree */}
      <div className="bg-[#14171D] p-5 border border-[#262D38] rounded-[4px] space-y-4">
        {/* Module Controls Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262D38] font-mono text-xs">
          <span className="font-bold text-[#8E98A8] uppercase tracking-wider">
            Curriculum Modules ({phaseModules.length})
          </span>

          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={expandAllModules}
              className="text-[#8E98A8] hover:text-[#F1F5F9] underline"
            >
              Expand All
            </button>
            <span className="text-[#3B4556]">|</span>
            <button
              onClick={collapseAllModules}
              className="text-[#8E98A8] hover:text-[#F1F5F9] underline"
            >
              Collapse All
            </button>
          </div>
        </div>

        {phaseModules.length === 0 ? (
          <div className="p-8 text-center bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-3 font-mono">
            <Filter className="size-6 text-[#5C6675] mx-auto" />
            <p className="text-xs text-[#8E98A8]">No modules match the selected filter criteria.</p>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={resetFilters}
                className="text-xs border-[#262D38] text-[#FFC665] hover:bg-[#262D38] rounded-[4px]"
              >
                Reset Domain & Status Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {phaseModules.map((mod) => {
              const isExpanded = expandedModuleIds[mod.id] ?? true;
              const modTopics = topics.filter((t) => t.moduleId === mod.id);
              const modTasks = taskDefinitions.filter((t) => t.topicId && modTopics.some((top) => top.id === t.topicId));
              const modCompleted = modTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
              const modPercent = modTasks.length > 0 ? Math.round((modCompleted / modTasks.length) * 100) : 0;
              const domain = getDomain(mod.domainId);
              const isCurrentFocus = modTasks.some((t) => (taskProgress[t.id]?.state || 'not_started') === 'in_progress');

              return (
                <div key={mod.id} className="border border-[#262D38] rounded-[4px] bg-[#1B2028] overflow-hidden">
                  {/* Module Header Bar - Collapsible Trigger */}
                  <div
                    onClick={() => toggleModuleExpanded(mod.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#222833] transition-colors border-b border-[#262D38]"
                  >
                    <div className="flex items-center gap-3">
                      <button aria-label="Toggle module" className="text-[#E5A93C] p-0.5">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>

                      {domain && (
                        <span className="tech-chip tech-chip-primary text-[10px] font-mono font-bold">
                          {domain.shortName}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#F1F5F9]">{mod.name}</span>
                          {isCurrentFocus && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#E5A93C]/20 text-[#FFC665] border border-[#E5A93C]/40">
                              CURRENT FOCUS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8E98A8] mt-0.5">{mod.description}</p>
                      </div>
                    </div>

                    {/* Module Progress & Relative Target Date */}
                    <div className="text-right font-mono text-xs shrink-0 pl-3">
                      <span className="font-bold text-[#FFC665]">{modPercent}%</span>
                      <span className="text-[#8E98A8] block text-[11px]">
                        {modCompleted}/{modTasks.length} tasks
                      </span>
                      {mod.targetDate && (
                        <span className="block text-[10px] mt-0.5">
                          {formatRelativeDeadline(mod.targetDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Module Body: Topics & Tasks */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-[#14171D]">
                      {modTopics.map((top) => {
                        let topTasks = taskDefinitions.filter((t) => t.topicId === top.id);

                        if (filterState !== 'all') {
                          topTasks = topTasks.filter(
                            (t) => (taskProgress[t.id]?.state || 'not_started') === filterState
                          );
                        }

                        if (topTasks.length === 0 && filterState !== 'all') return null;

                        return (
                          <div key={top.id} className="space-y-2 pl-2 border-l-2 border-l-[#262D38]">
                            {/* Topic Row - Click to open Topic Drawer */}
                            <div
                              onClick={() => setActiveTopic(top)}
                              className="flex items-center justify-between p-2 rounded-[4px] bg-[#1B2028] hover:bg-[#222833] border border-[#262D38] hover:border-[#3B4556] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 font-semibold text-xs text-[#F1F5F9]">
                                <span className="text-[#FFC665]">#</span>
                                <span>{top.name}</span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] font-mono text-[#8E98A8]">
                                <span>Importance: <span className="text-[#FFC665]">{top.importance}/10</span></span>
                                <span className="text-[#E5A93C] font-semibold hover:underline">
                                  Inspect Drawer →
                                </span>
                              </div>
                            </div>

                            {/* Task List under Topic */}
                            <div className="space-y-1.5 pl-3">
                              {topTasks.map((t) => {
                                const lockInfo = getTaskLockStatus(t);
                                const state = taskProgress[t.id]?.state || 'not_started';

                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => setSelectedWorkspaceTask(t)}
                                    className="p-2.5 rounded-[4px] bg-[#1B2028] hover:bg-[#222833] border border-[#262D38] hover:border-[#3B4556] cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs font-mono"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {state === 'completed' ? (
                                        <CheckCircle2 className="size-4 text-[#10B981] shrink-0" />
                                      ) : lockInfo.isLocked ? (
                                        <Lock className="size-3.5 text-amber-400 shrink-0" />
                                      ) : (
                                        <Circle className="size-4 text-[#5C6675] shrink-0" />
                                      )}

                                      <div className="min-w-0">
                                        <span className={`font-semibold block truncate ${state === 'completed' ? 'line-through text-[#5C6675]' : 'text-[#F1F5F9]'}`}>
                                          {t.title}
                                        </span>

                                        {lockInfo.isLocked && (
                                          <span className="text-[10px] text-amber-400 block mt-0.5">
                                            Locked: Requires {lockInfo.unmetPrereqs.map((u) => u.title).join(', ')}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-[#8E98A8]">
                                      <span className="flex items-center gap-1">
                                        <Clock className="size-3 text-[#E5A93C]" /> {t.estimatedMinutes}m
                                      </span>
                                      <span className="capitalize">{t.taskType}</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded border capitalize ${
                                        state === 'completed'
                                          ? 'tech-chip-success'
                                          : lockInfo.isLocked
                                          ? 'tech-chip-warning'
                                          : 'tech-chip'
                                      }`}>
                                        {state === 'completed' ? 'Completed' : lockInfo.isLocked ? 'Locked' : 'Available'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOPIC OVERVIEW DRAWER (400px Slide-Over Inspector) */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#14171D] border-l border-[#262D38] h-full flex flex-col p-6 space-y-6 shadow-2xl overflow-hidden font-mono">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#262D38]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="tech-chip tech-chip-primary font-semibold text-[10px]">
                    {getDomain(activeTopic.domainId)?.name || 'Domain Topic'}
                  </span>
                  <span className="text-xs text-[#8E98A8]">Importance: {activeTopic.importance}/10</span>
                </div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">{activeTopic.name}</h3>
                {topicModule && (
                  <p className="text-xs text-[#8E98A8] mt-1">Module: {topicModule.name}</p>
                )}
              </div>
              <button
                onClick={() => setActiveTopic(null)}
                className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Topic Readiness Context */}
            {topicSkill && (
              <div className="bg-[#1B2028] p-4 rounded-[4px] border border-[#262D38] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8E98A8]">
                  <span>Skill Freshness:</span>
                  <span className={`capitalize font-semibold ${
                    topicSkill.freshness === 'fresh' ? 'text-[#10B981]' : 'text-[#F59E0B]'
                  }`}>
                    {topicSkill.freshness}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8E98A8]">
                  <span>Evidence Strength:</span>
                  <span className="text-[#FFC665] font-semibold">{topicSkill.evidenceStrength}/100</span>
                </div>
              </div>
            )}

            {/* Educational Context (Authoritative Only) */}
            <div className="bg-[#1B2028] p-4 rounded-[4px] border border-[#262D38] space-y-2 text-xs">
              <h4 className="text-[11px] font-bold text-[#FFC665] uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="size-3.5" /> Learning Context & Overview
              </h4>
              {activeTopic.educationalMetadata?.overview ? (
                <p className="text-[#F1F5F9] leading-relaxed">{activeTopic.educationalMetadata.overview}</p>
              ) : (
                <p className="text-[#8E98A8] italic">
                  Learning context not yet defined. Complete associated tasks to build skill evidence.
                </p>
              )}
            </div>

            {/* Topic Linked Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-3.5 text-[#E5A93C]" /> Connected Curriculum Tasks ({topicTasks.length})
              </h4>

              {topicTasks.map((task) => {
                const state = taskProgress[task.id]?.state || 'not_started';
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setActiveTopic(null);
                      setSelectedWorkspaceTask(task);
                    }}
                    className="p-3 rounded-[4px] bg-[#1B2028] hover:bg-[#222833] border border-[#262D38] cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#F1F5F9]">{task.title}</span>
                      <span className={`text-[10px] capitalize px-1.5 py-0.2 rounded border ${
                        state === 'completed'
                          ? 'tech-chip-success'
                          : state === 'in_progress'
                          ? 'tech-chip-warning'
                          : 'tech-chip'
                      }`}>
                        {state.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#8E98A8] line-clamp-2">{task.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#8E98A8] pt-1">
                      <span>{task.estimatedMinutes} mins</span>
                      <span className="text-[#FFC665] hover:underline flex items-center gap-1">
                        Open Workspace <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Actions & Execution Bridge */}
            <div className="pt-4 border-t border-[#262D38] flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setActiveTopic(null);
                  setRoute('dashboard');
                }}
                className="flex-1 bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold h-9 text-xs rounded-[4px]"
              >
                <ArrowRight className="size-3.5 mr-1" /> View Daily Execution
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTopic(null)}
                className="border-[#262D38] bg-[#1B2028] text-[#8E98A8] hover:text-[#F1F5F9] h-9 text-xs rounded-[4px]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Learning Workspace Drawer Trigger */}
      <TaskLearningWorkspaceDrawer
        task={selectedWorkspaceTask}
        progress={selectedWorkspaceTask ? taskProgress[selectedWorkspaceTask.id] : undefined}
        domain={selectedWorkspaceTask ? getDomain(selectedWorkspaceTask.domainId) : undefined}
        isOpen={!!selectedWorkspaceTask}
        onClose={() => setSelectedWorkspaceTask(null)}
        onUpdateState={updateTaskState}
      />
    </div>
  );
};
