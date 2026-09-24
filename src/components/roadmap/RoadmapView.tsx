import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { Layers, CheckCircle2, Circle, Clock, BookOpen } from 'lucide-react';

export const RoadmapView: React.FC = () => {
  const { phases, modules, topics, taskDefinitions, taskProgress, domains } = usePlacement();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('phase-1');

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) || phases[0];
  const phaseModules = modules.filter((m) => m.phaseId === selectedPhaseId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
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

      {/* Phase Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {phases.map((phase) => {
          const isActive = phase.id === selectedPhaseId;
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
              <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                Phase {phase.order}
              </div>
              <div className="font-semibold text-sm text-slate-100 line-clamp-1">{phase.name.split(':')[1] || phase.name}</div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                {phase.startDate} → {phase.endDate}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Phase Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h3 className="text-lg font-bold text-white">{selectedPhase.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{selectedPhase.description}</p>
        </div>

        {/* Modules in Phase */}
        <div className="space-y-6">
          {phaseModules.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Phase {selectedPhase.order} detailed modules will unlock as you progress through Phase 1.
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
                      const topTasks = taskDefinitions.filter((t) => t.topicId === top.id);

                      return (
                        <div key={top.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <BookOpen className="size-3.5 text-indigo-400" />
                              {top.name}
                            </span>
                            <span className="text-slate-400">Importance: <strong className="text-slate-200">{top.importance}/10</strong></span>
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
                                    <span className={`font-medium ${state === 'completed' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
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
