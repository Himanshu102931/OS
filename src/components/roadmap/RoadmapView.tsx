import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { Layers, CheckCircle2, Circle, Clock, BookOpen, Filter } from 'lucide-react';

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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Layers className="size-3.5" />
            <span>Placement Curriculum Timeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Master Placement Roadmap</h2>
          <p className="text-sm text-slate-400 mt-1">
            Structured curriculum spanning September 2026 to May 2027 across 11 core placement domains.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs flex-wrap">
          <div className="flex items-center gap-1 text-slate-400 font-medium px-1">
            <Filter className="size-3.5 text-blue-400" /> Filter:
          </div>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold p-1 rounded border border-slate-800 focus:outline-none"
          >
            <option value="all">All Domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortName}
              </option>
            ))}
          </select>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold p-1 rounded border border-slate-800 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Phase Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {phases.map((phase) => {
          const isActive = phase.id === selectedPhaseId;
          const pTasks = taskDefinitions.filter((t) => t.phaseId === phase.id);
          const pDone = pTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
          const pPercent = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

          return (
            <button
              key={phase.id}
              onClick={() => setSelectedPhaseId(phase.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500/60 ring-2 ring-blue-500/20 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Phase {phase.order}
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400">{pPercent}%</span>
              </div>
              <div className="font-semibold text-sm text-slate-100 line-clamp-1 mt-1">
                {phase.name.split(':')[1] || phase.name}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                {phase.startDate} → {phase.endDate}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Phase Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">{selectedPhase.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{selectedPhase.description}</p>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shrink-0 text-right text-xs">
            <div className="text-slate-400">Phase Completion</div>
            <div className="font-mono font-bold text-base text-emerald-400">
              {completedPhaseTasks.length} / {totalPhaseTasks.length} ({phaseProgressPercent}%)
            </div>
          </div>
        </div>

        {/* Modules in Phase */}
        <div className="space-y-6">
          {phaseModules.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No modules match the selected filter. Change filters to view curriculum details.
            </div>
          ) : (
            phaseModules.map((mod) => {
              const modTopics = topics.filter((t) => t.moduleId === mod.id);
              const domain = domains.find((d) => d.id === mod.domainId);

              return (
                <div key={mod.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {domain && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                            {domain.shortName}
                          </span>
                        )}
                        <h4 className="font-bold text-base text-slate-100">{mod.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{mod.description}</p>
                    </div>

                    {mod.targetDate && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                        Target: {mod.targetDate}
                      </span>
                    )}
                  </div>

                  {/* Topics List */}
                  <div className="space-y-3 pt-2">
                    {modTopics.map((top) => {
                      let topTasks = taskDefinitions.filter((t) => t.topicId === top.id);

                      if (filterState !== 'all') {
                        topTasks = topTasks.filter(
                          (t) => (taskProgress[t.id]?.state || 'not_started') === filterState
                        );
                      }

                      if (topTasks.length === 0 && filterState !== 'all') return null;

                      return (
                        <div key={top.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <BookOpen className="size-3.5 text-indigo-400" />
                              {top.name}
                            </span>
                            <span className="text-slate-400">
                              Importance: <strong className="text-slate-200">{top.importance}/10</strong>
                            </span>
                          </div>

                          {/* Tasks under topic */}
                          <div className="space-y-1.5 pt-1">
                            {topTasks.map((t) => {
                              const state = taskProgress[t.id]?.state || 'not_started';
                              return (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between text-xs p-2 rounded bg-slate-950 border border-slate-800/60"
                                >
                                  <div className="flex items-center gap-2">
                                    {state === 'completed' ? (
                                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                                    ) : (
                                      <Circle className="size-3.5 text-slate-600" />
                                    )}
                                    <span
                                      className={`font-medium ${
                                        state === 'completed' ? 'line-through text-slate-400' : 'text-slate-200'
                                      }`}
                                    >
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-slate-400">
                                    <span className="flex items-center gap-1 font-mono text-[11px]">
                                      <Clock className="size-3" /> {t.estimatedMinutes}m
                                    </span>
                                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                      {t.taskType}
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
