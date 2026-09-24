import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CheckCircle2, Circle, Clock, Filter, ChevronRight, X, Target } from 'lucide-react';
import type { Topic, TaskDefinition } from '../../types';
import { Button } from '../ui/button';

export const RoadmapView: React.FC = () => {
  const { phases, modules, topics, taskDefinitions, taskProgress, domains, skillStates } = usePlacement();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('phase-1');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) || phases[0];

  const phaseModules = modules.filter((m) => {
    if (m.phaseId !== selectedPhaseId) return false;
    if (filterDomain !== 'all' && m.domainId !== filterDomain) return false;
    return true;
  });

  const totalPhaseTasks = taskDefinitions.filter((t) => t.phaseId === selectedPhaseId);
  const completedPhaseTasks = totalPhaseTasks.filter(
    (t) => taskProgress[t.id]?.state === 'completed'
  );
  const phaseProgressPercent =
    totalPhaseTasks.length > 0
      ? Math.round((completedPhaseTasks.length / totalPhaseTasks.length) * 100)
      : 0;

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  // Topic Drawer Data Helpers
  const topicTasks: TaskDefinition[] = activeTopic
    ? taskDefinitions.filter((t) => t.topicId === activeTopic.id)
    : [];

  const topicModule = activeTopic
    ? modules.find((m) => m.id === activeTopic.moduleId)
    : null;

  const topicSkill = activeTopic ? skillStates[activeTopic.id] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            Master Roadmap & Trajectory
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Curriculum timeline (Sep 2026 – May 2027) spanning 11 core placement domains
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2.5 bg-[#14171D] border border-[#262D38] rounded-[4px] px-3 py-1.5 text-xs font-mono">
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
      </div>

      {/* Phase Timeline Tabs (Chiseled Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {phases.map((phase) => {
          const isActive = phase.id === selectedPhaseId;
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
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-[#8E98A8]">PHASE {phase.order}</span>
                <span className="font-semibold text-[#FFC665]">{pPercent}%</span>
              </div>
              <div className="font-semibold text-xs text-[#F1F5F9] truncate mt-1.5">
                {phase.name.split(':')[1] || phase.name}
              </div>
              <div className="text-[10px] text-[#5C6675] mt-1 font-mono">
                {phase.startDate} → {phase.endDate}
              </div>
            </button>
          );
        })}
      </div>

      {/* Phase Content Section */}
      <div className="app-surface p-5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#262D38]">
          <div>
            <h2 className="text-base font-semibold text-[#F1F5F9] tracking-tight">{selectedPhase.name}</h2>
            <p className="text-xs text-[#8E98A8] mt-0.5">{selectedPhase.description}</p>
          </div>
          <div className="text-right text-xs font-mono">
            <span className="text-[#8E98A8]">Phase Progress: </span>
            <span className="font-semibold text-[#FFC665]">
              {completedPhaseTasks.length} / {totalPhaseTasks.length} ({phaseProgressPercent}%)
            </span>
          </div>
        </div>

        {/* Modules Timeline / Tree View */}
        <div className="space-y-5">
          {phaseModules.length === 0 ? (
            <div className="text-center py-6 text-[#5C6675] text-xs font-mono">
              No modules match the selected filter criteria.
            </div>
          ) : (
            phaseModules.map((mod) => {
              const modTopics = topics.filter((t) => t.moduleId === mod.id);
              const domain = getDomain(mod.domainId);

              return (
                <div key={mod.id} className="space-y-3">
                  {/* Module Title Row */}
                  <div className="flex items-center justify-between bg-[#1B2028] px-3.5 py-2.5 rounded-[4px] border border-[#262D38]">
                    <div className="flex items-center gap-2.5">
                      <ChevronRight className="size-3.5 text-[#E5A93C]" />
                      {domain && (
                        <span className="tech-chip tech-chip-primary text-[10px]">
                          {domain.shortName}
                        </span>
                      )}
                      <span className="font-semibold text-xs text-[#F1F5F9]">{mod.name}</span>
                    </div>
                    {mod.targetDate && (
                      <span className="text-[11px] font-mono text-[#8E98A8]">
                        Target: {mod.targetDate}
                      </span>
                    )}
                  </div>

                  {/* Topics Indented List */}
                  <div className="pl-4 space-y-2.5 border-l border-[#262D38]">
                    {modTopics.map((top) => {
                      let topTasks = taskDefinitions.filter((t) => t.topicId === top.id);

                      if (filterState !== 'all') {
                        topTasks = topTasks.filter(
                          (t) => (taskProgress[t.id]?.state || 'not_started') === filterState
                        );
                      }

                      if (topTasks.length === 0 && filterState !== 'all') return null;

                      return (
                        <div key={top.id} className="space-y-1.5">
                          {/* Topic Bar - Clickable to open Drawer */}
                          <div
                            onClick={() => setActiveTopic(top)}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 text-[#F1F5F9] font-medium hover:bg-[#1B2028] rounded-[4px] cursor-pointer transition-colors border border-transparent hover:border-[#3B4556]"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-[#FFC665] font-semibold">#</span>
                              <span>{top.name}</span>
                            </span>
                            <div className="flex items-center gap-3 font-mono text-[11px] text-[#8E98A8]">
                              <span>Importance: <span className="text-[#FFC665]">{top.importance}/10</span></span>
                              <span className="text-[#E5A93C] hover:underline">Inspect Drawer →</span>
                            </div>
                          </div>

                          {/* Task rows */}
                          <div className="space-y-1 pl-3">
                            {topTasks.map((t) => {
                              const state = taskProgress[t.id]?.state || 'not_started';
                              return (
                                <div
                                  key={t.id}
                                  className="app-table-row flex items-center justify-between text-xs py-2 px-3 rounded-[4px]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    {state === 'completed' ? (
                                      <CheckCircle2 className="size-3.5 text-[#10B981]" />
                                    ) : (
                                      <Circle className="size-3.5 text-[#5C6675]" />
                                    )}
                                    <span
                                      className={`font-medium ${
                                        state === 'completed' ? 'line-through text-[#5C6675]' : 'text-[#F1F5F9]'
                                      }`}
                                    >
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#8E98A8]">
                                    <span className="flex items-center gap-1">
                                      <Clock className="size-3 text-[#E5A93C]" /> {t.estimatedMinutes}m
                                    </span>
                                    <span className="capitalize text-[#8E98A8]">{t.taskType}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* STITCH TOPIC OVERVIEW DRAWER (400px Slide-Over Inspector) */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#14171D] border-l border-[#262D38] h-full flex flex-col p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#262D38]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="tech-chip tech-chip-primary font-semibold">
                    {getDomain(activeTopic.domainId)?.name || 'Domain Topic'}
                  </span>
                  <span className="text-xs font-mono text-[#8E98A8]">Importance: {activeTopic.importance}/10</span>
                </div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">{activeTopic.name}</h3>
                {topicModule && (
                  <p className="text-xs font-mono text-[#8E98A8] mt-1">Module: {topicModule.name}</p>
                )}
              </div>
              <button
                onClick={() => setActiveTopic(null)}
                className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Skill Matrix Readiness Context */}
            {topicSkill && (
              <div className="app-surface-elevated p-4 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[#8E98A8]">
                  <span>Skills Freshness:</span>
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

            {/* Topic Linked Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-3.5 text-[#E5A93C]" /> Curriculum Tasks ({topicTasks.length})
              </h4>

              {topicTasks.map((task) => {
                const state = taskProgress[task.id]?.state || 'not_started';
                return (
                  <div key={task.id} className="app-surface p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#F1F5F9]">{task.title}</span>
                      <span className={`text-[10px] font-mono capitalize px-1.5 py-0.2 rounded border ${
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
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8E98A8] pt-1">
                      <span>{task.estimatedMinutes} mins</span>
                      <span>Importance: {task.importance}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer Action */}
            <div className="pt-4 border-t border-[#262D38]">
              <Button
                onClick={() => setActiveTopic(null)}
                className="w-full bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] font-semibold h-9 text-xs rounded-[4px]"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
