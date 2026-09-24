import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CheckCircle2, Circle, Clock, Filter, ChevronRight } from 'lucide-react';

export const RoadmapView: React.FC = () => {
  const { phases, modules, topics, taskDefinitions, taskProgress, domains } = usePlacement();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('phase-1');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Master Roadmap
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Curriculum timeline (Sep 2026 – May 2027) spanning 11 core placement domains
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs">
          <Filter className="size-3.5 text-zinc-400" />
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-zinc-900">All Domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id} className="bg-zinc-900">
                {d.shortName}
              </option>
            ))}
          </select>
          <span className="text-zinc-700">|</span>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-zinc-900">All Statuses</option>
            <option value="not_started" className="bg-zinc-900">To Do</option>
            <option value="in_progress" className="bg-zinc-900">In Progress</option>
            <option value="completed" className="bg-zinc-900">Completed</option>
          </select>
        </div>
      </div>

      {/* Phase Timeline Tabs (Clean List) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {phases.map((phase) => {
          const isActive = phase.id === selectedPhaseId;
          const pTasks = taskDefinitions.filter((t) => t.phaseId === phase.id);
          const pDone = pTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
          const pPercent = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

          return (
            <button
              key={phase.id}
              onClick={() => setSelectedPhaseId(phase.id)}
              className={`p-3 rounded-md border text-left transition-colors ${
                isActive
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-medium'
                  : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-zinc-500">PHASE {phase.order}</span>
                <span className="font-mono font-medium text-indigo-400">{pPercent}%</span>
              </div>
              <div className="font-semibold text-xs text-zinc-200 truncate mt-1">
                {phase.name.split(':')[1] || phase.name}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                {phase.startDate} → {phase.endDate}
              </div>
            </button>
          );
        })}
      </div>

      {/* Phase Content Section */}
      <div className="app-surface p-5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">{selectedPhase.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{selectedPhase.description}</p>
          </div>
          <div className="text-right text-xs">
            <span className="text-zinc-500">Phase Completion: </span>
            <span className="font-mono font-medium text-indigo-400">
              {completedPhaseTasks.length} / {totalPhaseTasks.length} ({phaseProgressPercent}%)
            </span>
          </div>
        </div>

        {/* Modules Timeline / Tree View */}
        <div className="space-y-5">
          {phaseModules.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs">
              No modules match the selected filter.
            </div>
          ) : (
            phaseModules.map((mod) => {
              const modTopics = topics.filter((t) => t.moduleId === mod.id);
              const domain = domains.find((d) => d.id === mod.domainId);

              return (
                <div key={mod.id} className="space-y-3">
                  {/* Module Title Row */}
                  <div className="flex items-center justify-between bg-zinc-900/80 px-3 py-2 rounded border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="size-3.5 text-zinc-500" />
                      {domain && (
                        <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800">
                          {domain.shortName}
                        </span>
                      )}
                      <span className="font-semibold text-xs text-zinc-200">{mod.name}</span>
                    </div>
                    {mod.targetDate && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        Target: {mod.targetDate}
                      </span>
                    )}
                  </div>

                  {/* Topics Indented List */}
                  <div className="pl-4 space-y-2 border-l border-zinc-800">
                    {modTopics.map((top) => {
                      let topTasks = taskDefinitions.filter((t) => t.topicId === top.id);

                      if (filterState !== 'all') {
                        topTasks = topTasks.filter(
                          (t) => (taskProgress[t.id]?.state || 'not_started') === filterState
                        );
                      }

                      if (topTasks.length === 0 && filterState !== 'all') return null;

                      return (
                        <div key={top.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs py-1 px-2 text-zinc-400 font-medium">
                            <span>{top.name}</span>
                            <span className="text-[11px] text-zinc-500">
                              Importance: <span className="font-mono text-zinc-300">{top.importance}/10</span>
                            </span>
                          </div>

                          {/* Task rows */}
                          <div className="space-y-1 pl-2">
                            {topTasks.map((t) => {
                              const state = taskProgress[t.id]?.state || 'not_started';
                              return (
                                <div
                                  key={t.id}
                                  className="app-table-row flex items-center justify-between text-xs py-1.5 px-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    {state === 'completed' ? (
                                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                                    ) : (
                                      <Circle className="size-3.5 text-zinc-600" />
                                    )}
                                    <span
                                      className={`font-medium ${
                                        state === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'
                                      }`}
                                    >
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                                    <span className="flex items-center gap-1 font-mono">
                                      <Clock className="size-3" /> {t.estimatedMinutes}m
                                    </span>
                                    <span className="capitalize">{t.taskType}</span>
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
    </div>
  );
};
