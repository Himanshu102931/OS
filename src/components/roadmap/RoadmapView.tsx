import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import type { Topic, TaskDefinition } from '../../types';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';
import { GuideTrigger } from '../guide/GuideTrigger';
import { explainTaskLock, resolveRoadmapTarget } from '../../engine/prerequisiteNavigation';
import { buildRoadmapLockTrace } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import {
  Clock,
  Filter,
  ChevronRight,
  ChevronDown,
  CornerUpLeft,
  X,
  Target,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/button';

export const RoadmapView: React.FC = () => {
  const { phases, modules, topics, taskDefinitions, taskProgress, domains, skillStates, updateTaskState, setRoute, routeState, activePhase } = usePlacement();
  const evidenceCatalog = useEvidenceCatalog();

  // Deep link support: '#/roadmap/<id>'. The segment resolves as a topic id
  // (Preparation → Roadmap) or as a task id (Today / review-candidate links and
  // the prerequisite navigation below) — one route, one segment, no new params.
  // Read once at mount, exactly as this view has always done: the hash seeds the
  // drawer, and from then on navigation happens in event handlers below.
  const routeTargetId = routeState.route === 'roadmap' ? routeState.targetId : undefined;
  const resolvedTarget = resolveRoadmapTarget(routeTargetId, topics, taskDefinitions);
  const linkedTopic = resolvedTarget.topic;
  const linkedTopicPhaseId = linkedTopic
    ? modules.find((m) => m.id === linkedTopic.moduleId)?.phaseId
    : undefined;

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(linkedTopicPhaseId || 'phase-1');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(linkedTopic || null);
  const [selectedWorkspaceTask, setSelectedWorkspaceTask] = useState<TaskDefinition | null>(null);

  // Prerequisite drill-down context. Component state only — remembering where
  // the user came from must never add persistence.
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(
    resolvedTarget.taskId ?? null
  );
  const [returnStack, setReturnStack] = useState<Array<{ targetId: string; label: string }>>([]);

  // Module Collapsible State
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach((m, idx) => {
      initial[m.id] = idx === 0 || m.phaseId === 'phase-1';
    });
    return initial;
  });

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) || phases[0];

  const hasActiveFilters = filterDomain !== 'all';

  const resetFilters = () => {
    setFilterDomain('all');
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  /**
   * The one navigation path into a roadmap target: local state keeps the click
   * responsive, the hash keeps it shareable and restorable. An id that resolves
   * to nothing is refused outright so no phantom route is ever written.
   *
   * `returnFrom` records the target being drilled OUT of, which is what makes
   * "back to where I started" possible without any persisted navigation state.
   */
  const openRoadmapTarget = (
    targetId: string,
    returnFrom?: { targetId: string; label: string }
  ) => {
    const target = resolveRoadmapTarget(targetId, topics, taskDefinitions);
    // No resolvable topic → nothing to open; never navigate to a phantom id.
    if (!target.topic) return;

    if (returnFrom) setReturnStack((prev) => [...prev, returnFrom]);

    const targetTopic = target.topic;
    setActiveTopic(targetTopic);
    setHighlightedTaskId(target.taskId ?? null);

    const mod = modules.find((m) => m.id === targetTopic.moduleId);
    if (mod) {
      setSelectedPhaseId(mod.phaseId);
      setExpandedModuleIds((prev) => (prev[mod.id] ? prev : { ...prev, [mod.id]: true }));
    }

    setRoute('roadmap', targetId);
  };

  const handleReturn = () => {
    const target = returnStack[returnStack.length - 1];
    if (!target) return;
    setReturnStack((prev) => prev.slice(0, -1));
    openRoadmapTarget(target.targetId);
  };

  const closeTopic = () => {
    setActiveTopic(null);
    setHighlightedTaskId(null);
    setReturnStack([]);
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

  const getDomain = (domainId: string) => domains.find((d) => d.id === domainId);

  const topicTasks: TaskDefinition[] = activeTopic
    ? taskDefinitions.filter((t) => t.topicId === activeTopic.id)
    : [];

  const topicModule = activeTopic
    ? modules.find((m) => m.id === activeTopic.moduleId)
    : undefined;

  // Bidirectional Roadmap ↔ Preparation link for the active topic
  const linkedPrepTopic = activeTopic
    ? PREPARATION_TOPICS.find((pt) => pt.roadmapTopicId === activeTopic.id)
    : undefined;

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
      {/* Header & Phase Switcher */}
      <div className="space-y-4 pb-4 border-b border-[#262D38]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
              Master Roadmap & Trajectory
            </h1>
            <p className="text-xs text-[#8E98A8] mt-1">
              Progressive placement curriculum broken down into clear phases, modules, and actionable tasks.
            </p>
          </div>
          <GuideTrigger route="roadmap" />
        </div>

        {/* Phase Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {phases.map((ph) => {
            const isSelected = ph.id === selectedPhaseId;
            const phTasks = taskDefinitions.filter((t) => t.phaseId === ph.id);
            const phDone = phTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
            const pct = phTasks.length > 0 ? Math.round((phDone / phTasks.length) * 100) : 0;

            return (
              <button
                key={ph.id}
                onClick={() => setSelectedPhaseId(ph.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 border text-left ${
                  isSelected
                    ? 'bg-[#1B2028] border-[#E5A93C]/50 text-[#F1F5F9] shadow-sm'
                    : 'bg-[#14171D] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{ph.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-[#E5A93C]/20 text-[#FFC665]' : 'bg-[#14171D] text-[#8E98A8]'}`}>
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Phase Summary Header */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#E5A93C] uppercase tracking-wider">
              Current Target Phase
            </span>
            <h2 className="text-lg font-bold text-[#F1F5F9] mt-0.5">{selectedPhase.name}</h2>
            <p className="text-xs text-[#8E98A8] mt-1">{selectedPhase.description}</p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-2xl font-bold text-[#FFC665]">{phaseProgressPercent}%</span>
            <p className="text-xs text-[#8E98A8]">
              {completedPhaseTasks.length} of {totalPhaseTasks.length} tasks completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#0D0F12] rounded-full h-2 overflow-hidden border border-[#262D38]">
          <div
            className="bg-[#E5A93C] h-full transition-all duration-500 rounded-full phase-progress-bar"
            style={{ width: `${phaseProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171D] p-3 border border-[#262D38] rounded-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8E98A8] font-medium flex items-center gap-1">
            <Filter className="size-3.5 text-[#E5A93C]" /> Filter Domain:
          </span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-[#1B2028] border border-[#262D38] rounded-md px-2.5 py-1 text-xs text-[#F1F5F9] focus:outline-none"
          >
            <option value="all">All Domains ({domains.length})</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-[#E5A93C] hover:underline flex items-center gap-1 font-medium"
          >
            <X className="size-3" /> Clear Filters
          </button>
        )}
      </div>

      {/* Modules List */}
      <div className="space-y-4 stagger-in">
        {phaseModules.length === 0 ? (
          <div className="p-8 text-center bg-[#14171D] border border-[#262D38] rounded-xl text-xs text-[#8E98A8]">
            No modules match your current filter.
          </div>
        ) : (
          phaseModules.map((mod) => {
            const isExpanded = expandedModuleIds[mod.id] ?? false;
            const modTopics = topics.filter((t) => t.moduleId === mod.id);
            const topicIds = modTopics.map((t) => t.id);
            const modTasks = taskDefinitions.filter((t) => topicIds.includes(t.topicId));
            const modDone = modTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
            const modPct = modTasks.length > 0 ? Math.round((modDone / modTasks.length) * 100) : 0;
            const domain = getDomain(mod.domainId);

            return (
              <div
                key={mod.id}
                className="bg-[#14171D] border border-[#262D38] rounded-xl overflow-hidden transition-all"
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleModuleExpanded(mod.id)}
                  className="w-full p-4 bg-[#14171D] hover:bg-[#1B2028]/60 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#8E98A8] hover:text-[#F1F5F9]">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F1F5F9]">{mod.name}</span>
                        {domain && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] border border-[#262D38] text-[#FFC665] font-medium">
                            {domain.shortName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8E98A8] mt-0.5 line-clamp-1">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-[#8E98A8] font-mono">{modDone}/{modTasks.length} Done</span>
                    <span className="font-semibold text-[#FFC665]">{modPct}%</span>
                  </div>
                </button>

                {/* Module Topics & Tasks */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#262D38]/60 space-y-3">
                    <div className="grid grid-cols-1 gap-2 pt-3">
                      {modTopics.map((top) => {
                        const topTasks = taskDefinitions.filter((t) => t.topicId === top.id);
                        const topDone = topTasks.filter((t) => taskProgress[t.id]?.state === 'completed').length;
                        const skState = skillStates[top.id];

                        return (
                          <div
                            key={top.id}
                            onClick={() => openRoadmapTarget(top.id)}
                            className="p-3 bg-[#0D0F12] hover:bg-[#1B2028]/80 border border-[#262D38] hover:border-[#E5A93C]/40 rounded-lg flex items-center justify-between cursor-pointer transition-all"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#F1F5F9]">{top.name}</span>
                                {skState && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded border capitalize ${
                                    skState.freshness === 'fresh' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                                  }`}>
                                    {skState.freshness}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#8E98A8] line-clamp-1">{top.description}</p>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[#8E98A8] text-[11px]">{topDone}/{topTasks.length} Tasks</span>
                              <ChevronRight className="size-3.5 text-[#5C6675]" />
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

      {/* Topic Detail Drawer */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/80 backdrop-blur-sm flex justify-end">
          <div
            className="w-full max-w-lg bg-[#14171D] border-l border-[#262D38] p-6 overflow-y-auto space-y-6"
            data-testid="topic-detail-drawer"
          >
            <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
              <div>
                <span className="text-xs text-[#E5A93C] font-semibold">{topicModule?.name}</span>
                <h3 className="text-lg font-bold text-[#F1F5F9] mt-0.5">{activeTopic.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {returnStack.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReturn}
                    className="px-2.5 py-1 text-xs bg-[#1B2028] border border-[#262D38] text-[#FFC665] rounded hover:bg-[#262D38] hover:border-[#E5A93C]/40 font-medium flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#E5A93C]/60"
                    data-testid="return-to-target"
                    aria-label={`Return to ${returnStack[returnStack.length - 1].label}`}
                  >
                    <CornerUpLeft className="size-3.5" />
                    <span>Back to {returnStack[returnStack.length - 1].label}</span>
                  </button>
                )}
                {linkedPrepTopic && (
                  <button
                    onClick={() => {
                      closeTopic();
                      setRoute('preparation', linkedPrepTopic.id);
                    }}
                    title={`Open ${linkedPrepTopic.title} in Preparation`}
                    className="px-2.5 py-1 text-xs bg-[#1B2028] border border-[#262D38] text-[#E5A93C] rounded hover:bg-[#262D38] font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Target className="size-3.5" />
                    <span>Open Preparation</span>
                  </button>
                )}
                <button
                  onClick={closeTopic}
                  aria-label="Close topic detail"
                  className="text-[#8E98A8] hover:text-[#F1F5F9] p-1 rounded-md"
                >
                  <X className="size-5" />
                </button>
              </div>

            </div>

            <p className="text-xs text-[#8E98A8] leading-relaxed">{activeTopic.description}</p>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#F1F5F9] uppercase tracking-wider">
                Topic Tasks ({topicTasks.length})
              </h4>

              <div className="space-y-2">
                {topicTasks.map((t) => {
                  const state = taskProgress[t.id]?.state || 'not_started';
                  // WHY — canonical gates only; this module adds no logic of its own.
                  const lock = explainTaskLock({
                    task: t,
                    taskProgress,
                    taskDefinitions,
                    topics,
                    activePhase,
                  });
                  const isBlocked = lock.isPrerequisiteBlocked && state !== 'completed';
                  const showLock = lock.isLocked && state !== 'completed';
                  const unmetTitles = isBlocked
                    ? lock.blockers
                        .filter((b) => b.category !== 'phase_locked')
                        .map((b) => b.prerequisiteTitle)
                        .join(', ')
                    : '';
                  const isHighlighted = highlightedTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`p-3 bg-[#0D0F12] border rounded-lg space-y-2 transition-colors ${
                        isBlocked ? 'border-[#262D38]/80 bg-[#0D0F12]/60' : 'border-[#262D38]'
                      }${isHighlighted ? ' ring-1 ring-[#E5A93C]/70' : ''}`}
                      data-testid={`task-card-${t.id}`}
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-semibold text-[#F1F5F9]">{t.title}</h5>
                            {isBlocked && (
                              <Lock className="size-3 text-[#F59E0B] shrink-0" aria-label="Prerequisites required" />
                            )}
                            {!isBlocked && showLock && lock.isPhaseLocked && (
                              <Clock className="size-3 text-[#38BDF8] shrink-0" aria-label="Phase gate applies" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#8E98A8] mt-0.5">{t.description}</p>
                          {isBlocked && (
                            <p
                              className="text-[11px] text-[#F59E0B] flex items-start gap-1.5 mt-1 font-medium"
                              data-testid={`prereq-warning-${t.id}`}
                            >
                              <Lock className="size-3 text-[#F59E0B] shrink-0 mt-0.5" />
                              <span>Prerequisites must be completed first:</span>
                              <span className="font-semibold text-[#FCD34D]">{unmetTitles}</span>
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize font-semibold shrink-0 ${
                          state === 'completed'
                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                            : isBlocked
                            ? 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                            : state === 'in_progress'
                            ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                            : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                        }`}>
                          {state.replace('_', ' ')}
                        </span>
                      </div>

                      {/* ── WHAT / WHY / NEXT for a locked task ────────────── */}
                      {showLock && (
                        <div
                          className={`space-y-2 rounded-md border p-2.5 ${
                            lock.isPrerequisiteBlocked
                              ? 'border-[#F59E0B]/25 bg-[#F59E0B]/5'
                              : 'border-[#38BDF8]/25 bg-[#38BDF8]/5'
                          }`}
                          data-testid={`task-lock-${t.id}`}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E98A8]">
                              Why this is locked
                            </span>
                            <ul className="space-y-1">
                              {lock.blockers.map((b, i) => (
                                <li
                                  key={`${t.id}-blocker-${i}`}
                                  data-testid={`lock-blocker-${t.id}-${i}`}
                                  data-category={b.category}
                                  className="text-[11px] text-[#8E98A8] flex items-start gap-1.5"
                                >
                                  <span
                                    className={`mt-1.5 size-1 rounded-full shrink-0 ${
                                      b.category === 'phase_locked' ? 'bg-[#38BDF8]' : 'bg-[#F59E0B]'
                                    }`}
                                  />
                                  <span>{b.reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Compact dependency trail — the chain walked backwards */}
                          {lock.dependencyTrail.length > 0 && (
                            <div
                              className="flex flex-wrap items-center gap-1 text-[10px]"
                              data-testid={`prereq-trail-${t.id}`}
                            >
                              <span className="text-[#5C6675] uppercase tracking-wider mr-0.5">Chain</span>
                              {lock.dependencyTrail.map((step, i) => (
                                <React.Fragment key={`trail-${t.id}-${step.taskId}`}>
                                  {i > 0 && <span className="text-[#5C6675]">→</span>}
                                  {step.resolvable ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRoadmapTarget(step.taskId, {
                                          targetId: t.id,
                                          label: t.title,
                                        })
                                      }
                                      className="px-1.5 py-0.5 rounded border border-[#262D38] bg-[#1B2028] text-[#FFC665] hover:border-[#E5A93C]/50 focus-visible:ring-2 focus-visible:ring-[#E5A93C]/60 transition-colors"
                                      data-testid={`trail-step-${t.id}-${step.taskId}`}
                                      aria-label={`Open prerequisite ${step.title}`}
                                    >
                                      {step.title}
                                    </button>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded border border-[#262D38] bg-[#14171D] text-[#5C6675]">
                                      {step.title}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                              <span className="text-[#5C6675]">→</span>
                              <span className="text-[#F1F5F9] font-medium">{t.title}</span>
                            </div>
                          )}

                          <p className="text-[11px] text-[#8E98A8] italic" data-testid={`lock-why-${t.id}`}>
                            {lock.whyCannotStart}
                          </p>

                          {/* NEXT — only ever a real, resolvable target */}
                          <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[#262D38]/60">
                            <span className="text-[10px] uppercase tracking-wider text-[#8E98A8]">Next</span>
                            {lock.prerequisiteActions.map((a) => (
                              <Button
                                key={a.targetId}
                                size="xs"
                                onClick={() =>
                                  openRoadmapTarget(a.targetId, { targetId: t.id, label: t.title })
                                }
                                data-testid={`open-prereq-${t.id}-${a.targetId}`}
                                aria-label={`Open prerequisite ${a.label} for ${t.title}`}
                                className="h-7 text-[11px] bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md px-2.5 font-semibold"
                              >
                                Open prerequisite: {a.label}
                              </Button>
                            ))}
                            {lock.isPrerequisiteBlocked && lock.prerequisiteActions.length === 0 && (
                              <span
                                className="text-[10px] text-[#5C6675]"
                                data-testid={`prereq-unopenable-${t.id}`}
                              >
                                The prerequisite has no openable roadmap target.
                              </span>
                            )}
                            {!lock.isPrerequisiteBlocked && lock.isPhaseLocked && (
                              <span className="text-[10px] text-[#5C6675]" data-testid={`phase-no-action-${t.id}`}>
                                Phase gate only — no prerequisite is missing. Planning holds this
                                task; manual completion stays available.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* EVIDENCE / SOURCE for the lock itself — the canonical
                          task-progress rows behind "incomplete". */}
                      {showLock &&
                        (() => {
                          const lockTrace = buildRoadmapLockTrace(lock, t.id, t.title, evidenceCatalog);
                          return lockTrace ? (
                            <EvidenceTracePanel
                              trace={lockTrace}
                              catalog={evidenceCatalog}
                              idPrefix={`lock-${t.id}`}
                              title="Evidence trace"
                            />
                          ) : null;
                        })()}

                      <div className="flex items-center justify-between pt-2 border-t border-[#262D38]/60 text-xs">
                        <span className="text-[#8E98A8] text-[11px] flex items-center gap-1">
                          <Clock className="size-3 text-[#E5A93C]" /> {t.estimatedMinutes} mins
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedWorkspaceTask(t);
                            }}
                            className="h-7 text-[11px] border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md px-2.5"
                          >
                            Learning Workspace
                          </Button>
                          {state !== 'completed' && (
                            isBlocked ? (
                              <Button
                                size="xs"
                                disabled
                                title={`Prerequisites must be completed first: ${unmetTitles}`}
                                data-testid={`complete-btn-${t.id}`}
                                className="h-7 text-[11px] bg-[#1B2028] text-[#5C6675] border border-[#262D38] rounded-md px-2.5 font-semibold cursor-not-allowed flex items-center gap-1 opacity-70"
                              >
                                <Lock className="size-3 text-[#5C6675]" />
                                <span>Locked</span>
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                onClick={() => updateTaskState(t.id, 'completed')}
                                data-testid={`complete-btn-${t.id}`}
                                className="h-7 text-[11px] bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-md px-2.5 font-semibold"
                              >
                                Complete
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Learning Workspace Drawer */}
      <TaskLearningWorkspaceDrawer
        task={selectedWorkspaceTask}
        progress={selectedWorkspaceTask ? taskProgress[selectedWorkspaceTask.id] : undefined}
        domain={selectedWorkspaceTask ? getDomain(selectedWorkspaceTask.domainId) : undefined}
        isOpen={!!selectedWorkspaceTask}
        onClose={() => setSelectedWorkspaceTask(null)}
        onUpdateState={(id, st) => updateTaskState(id, st)}
      />
    </div>
  );
};
