import React from 'react';
import type { Module, Topic, TaskDefinition, TaskProgress, TopicSkillState, DomainDefinition, Phase } from '../../types';
import { explainTaskLock } from '../../engine/prerequisiteNavigation';
import {
  ChevronRight,
  ChevronDown,
  Lock,
  CheckCircle2,
  Layers,
  Award,
} from 'lucide-react';

interface RoadmapMilestonesProps {
  modules: Module[];
  topics: Topic[];
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  skillStates: Record<string, TopicSkillState>;
  domains: DomainDefinition[];
  expandedModuleIds: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  onOpenTopic: (topicId: string) => void;
  activePhase: Phase;
}

export const RoadmapMilestones: React.FC<RoadmapMilestonesProps> = ({
  modules,
  topics,
  taskDefinitions,
  taskProgress,
  skillStates,
  domains,
  expandedModuleIds,
  onToggleModule,
  onOpenTopic,
  activePhase,
}) => {
  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  return (
    <div className="space-y-3.5" data-testid="roadmap-milestones-list">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-[var(--accent)]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
            Curriculum Milestones & Modules
          </h3>
        </div>
        <span className="text-xs font-mono text-[var(--foreground-subtle)]">
          {modules.length} Milestone{modules.length === 1 ? '' : 's'}
        </span>
      </div>

      {modules.length === 0 ? (
        <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground-muted)]">
          No curriculum modules match your current domain filter.
        </div>
      ) : (
        modules.map((mod) => {
          const isExpanded = expandedModuleIds[mod.id] ?? false;
          const modTopics = topics.filter((t) => t.moduleId === mod.id);
          const topicIds = modTopics.map((t) => t.id);
          const modTasks = taskDefinitions.filter((t) => topicIds.includes(t.topicId));
          const modDone = modTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
          const modPct = modTasks.length > 0 ? Math.round((modDone / modTasks.length) * 100) : 0;
          const domain = getDomain(mod.domainId);
          const isComplete = modTasks.length > 0 && modDone === modTasks.length;
          const isInProgress = modDone > 0 && !isComplete;

          return (
            <div
              key={mod.id}
              data-testid={`milestone-card-${mod.id}`}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden transition-all shadow-sm"
            >
              {/* Milestone Module Header */}
              <button
                type="button"
                onClick={() => onToggleModule(mod.id)}
                aria-expanded={isExpanded}
                aria-controls={`module-topics-${mod.id}`}
                data-testid={`milestone-toggle-${mod.id}`}
                className="w-full p-4 bg-[var(--surface)] hover:bg-[var(--surface-elevated)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] mt-0.5 sm:mt-0 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="size-4 text-[var(--accent)]" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    )}
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border border-[var(--border)]">
                        M-{String(mod.order).padStart(2, '0')}
                      </span>

                      <span className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                        {mod.name}
                      </span>

                      {domain && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--accent)] font-medium font-mono">
                          {domain.shortName}
                        </span>
                      )}

                      {isComplete && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="size-2.5" aria-hidden="true" />
                          Mastered
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30 font-semibold">
                          In Progress
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--foreground-muted)] line-clamp-1">
                      {mod.description}
                    </p>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--foreground-muted)] font-mono">
                        {modDone}/{modTasks.length} Done
                      </span>
                      <span className="font-bold font-mono text-[var(--foreground)]">
                        {modPct}%
                      </span>
                    </div>

                    <div
                      className="w-20 bg-[var(--surface-muted)] rounded-full h-1.5 overflow-hidden border border-[var(--border)] mt-1"
                      role="progressbar"
                      aria-valuenow={modPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${mod.name} progress`}
                    >
                      <div
                        className="bg-[var(--primary)] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${modPct}%` }}
                      />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--foreground-subtle)] hidden sm:inline">
                    {modTopics.length} topic{modTopics.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>

              {/* Module Topics List */}
              {isExpanded && (
                <div
                  id={`module-topics-${mod.id}`}
                  className="p-4 pt-1 border-t border-[var(--border)]/60 bg-[var(--surface-muted)]/40 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {modTopics.map((top) => {
                      const topTasks = taskDefinitions.filter((t) => t.topicId === top.id);
                      const topDone = topTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
                      const isTopComplete = topTasks.length > 0 && topDone === topTasks.length;
                      const skState = skillStates[top.id];

                      // Check for prerequisite locks on uncompleted tasks
                      const hasBlockedTasks = topTasks.some((t) => {
                        if (taskProgress[t.id]?.state === 'completed') return false;
                        const lock = explainTaskLock({
                          task: t,
                          taskProgress,
                          taskDefinitions,
                          topics,
                          activePhase,
                        });
                        return lock.isPrerequisiteBlocked;
                      });

                      return (
                        <div
                          key={top.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open topic ${top.name}`}
                          data-testid={`topic-row-${top.id}`}
                          onClick={() => onOpenTopic(top.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onOpenTopic(top.id);
                            }
                          }}
                          className="group p-3 bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--border-active)] rounded-lg flex items-center justify-between cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:outline-none"
                        >
                          <div className="space-y-1 max-w-xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                                {top.name}
                              </span>

                              {/* Freshness Badge */}
                              {skState && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded border capitalize font-mono ${
                                    skState.freshness === 'fresh'
                                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                                      : skState.freshness === 'aging'
                                      ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'
                                      : skState.freshness === 'stale'
                                      ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30'
                                      : 'bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border-[var(--border)]'
                                  }`}
                                >
                                  {skState.freshness}
                                </span>
                              )}

                              {/* Evidence Score Indicator if present */}
                              {skState && skState.evidenceStrength > 0 && (
                                <span className="text-[10px] text-[var(--accent)] font-mono flex items-center gap-0.5">
                                  <Award className="size-2.5" aria-hidden="true" />
                                  <span>{skState.evidenceStrength}% Ev</span>
                                </span>
                              )}

                              {/* Prerequisite warning indicator */}
                              {hasBlockedTasks && (
                                <span className="text-[10px] text-[var(--warning)] flex items-center gap-1 font-mono">
                                  <Lock className="size-2.5" aria-hidden="true" />
                                  <span>Prereqs Required</span>
                                </span>
                              )}

                              {/* Topic Completed Status */}
                              {isTopComplete && (
                                <span className="text-[10px] text-[var(--success)] flex items-center gap-0.5 font-medium">
                                  <CheckCircle2 className="size-2.5" aria-hidden="true" />
                                  <span>Complete</span>
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-1">
                              {top.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs shrink-0 ml-3">
                            <span className="text-[11px] font-mono text-[var(--foreground-muted)]">
                              {topDone}/{topTasks.length} Tasks
                            </span>
                            <ChevronRight className="size-3.5 text-[var(--foreground-subtle)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
