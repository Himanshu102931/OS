import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import type { Topic, TaskDefinition } from '../../types';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';
import { explainTaskLock, resolveRoadmapTarget } from '../../engine/prerequisiteNavigation';
import { buildRoadmapLockTrace } from '../../engine/evidenceTrace';
import { EvidenceTracePanel } from '../evidence/EvidenceTracePanel';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { RoadmapHeader } from './RoadmapHeader';
import { RoadmapPositionStrip } from './RoadmapPositionStrip';
import { RoadmapTrajectoryRail } from './RoadmapTrajectoryRail';
import { RoadmapPhaseWorkspace } from './RoadmapPhaseWorkspace';
import { RoadmapUnblockedFocus } from './RoadmapUnblockedFocus';
import { RoadmapMilestones } from './RoadmapMilestones';
import {
  Clock,
  CornerUpLeft,
  X,
  Target,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/button';

export const RoadmapView: React.FC = () => {
  const {
    phases,
    modules,
    topics,
    taskDefinitions,
    taskProgress,
    domains,
    skillStates,
    updateTaskState,
    setRoute,
    routeState,
    activePhase,
    todayDate,
  } = usePlacement();
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

  // Keyboard accessibility: dismiss drawer on Escape key
  React.useEffect(() => {
    if (!activeTopic) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTopic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTopic]);

  // Phase modules for domain calculation
  const phaseModulesAllDomains = modules.filter((m) => m.phaseId === selectedPhaseId);
  const availableDomainIds = Array.from(new Set(phaseModulesAllDomains.map((m) => m.domainId)));

  // Filtered phase modules according to active domain filter
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

  const completedAllTasksCount = taskDefinitions.filter(
    (t) => taskProgress[t.id]?.state === 'completed'
  ).length;

  const isSelectedActive = selectedPhase.id === activePhase.id;

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
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans pb-12">
      {/* Zone 1: Global Roadmap Header */}
      <RoadmapHeader
        totalPhases={phases.length}
        totalModules={modules.length}
      />

      {/* Zone 2: Current Position / Timeline Strip */}
      <RoadmapPositionStrip
        activePhase={activePhase}
        todayDate={todayDate}
        totalTasksCount={taskDefinitions.length}
        completedTasksCount={completedAllTasksCount}
      />

      {/* Zone 3: Trajectory Rail (4 Connected Phases) */}
      <RoadmapTrajectoryRail
        phases={phases}
        activePhase={activePhase}
        selectedPhaseId={selectedPhaseId}
        taskDefinitions={taskDefinitions}
        taskProgress={taskProgress}
        onSelectPhase={(phaseId) => setSelectedPhaseId(phaseId)}
      />

      {/* Zone 4: Phase Workspace Controller */}
      <RoadmapPhaseWorkspace
        selectedPhase={selectedPhase}
        activePhase={activePhase}
        isSelectedActive={isSelectedActive}
        phaseProgressPercent={phaseProgressPercent}
        completedTasksCount={completedPhaseTasks.length}
        totalTasksCount={totalPhaseTasks.length}
        domains={domains}
        filterDomain={filterDomain}
        onSelectFilterDomain={setFilterDomain}
        onResetFilter={resetFilters}
        onReturnToActivePhase={() => setSelectedPhaseId(activePhase.id)}
        availableDomainIds={availableDomainIds}
      />

      {/* Zone 5: Immediate Unblocked Focus (Rendered when drawer is closed) */}
      {!activeTopic && (
        <RoadmapUnblockedFocus
          selectedPhase={selectedPhase}
          activePhase={activePhase}
          isSelectedActive={isSelectedActive}
          taskDefinitions={taskDefinitions}
          taskProgress={taskProgress}
          topics={topics}
          domains={domains}
          onOpenTask={(taskId) => openRoadmapTarget(taskId)}
          onOpenWorkspace={(task) => setSelectedWorkspaceTask(task)}
          onReturnToActivePhase={() => setSelectedPhaseId(activePhase.id)}
        />
      )}

      {/* Zone 6: Curriculum Milestones */}
      <RoadmapMilestones
        modules={phaseModules}
        topics={topics}
        taskDefinitions={taskDefinitions}
        taskProgress={taskProgress}
        skillStates={skillStates}
        domains={domains}
        expandedModuleIds={expandedModuleIds}
        onToggleModule={toggleModuleExpanded}
        onOpenTopic={(topicId) => openRoadmapTarget(topicId)}
        activePhase={activePhase}
      />

      {/* Topic Detail Drawer */}
      {activeTopic && (
        <div
          className="fixed inset-0 z-50 bg-[var(--background)]/80 backdrop-blur-xs flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeTopic();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-detail-title"
            className="w-full max-w-lg bg-[var(--surface-elevated)] border-l border-[var(--border)] p-5 sm:p-6 overflow-y-auto space-y-6 shadow-2xl roadmap-drawer-slide"
            data-testid="topic-detail-drawer"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-xs text-[var(--accent)] font-semibold font-mono">
                  {topicModule?.name}
                </span>
                <h3
                  id="topic-detail-title"
                  className="text-lg font-bold text-[var(--foreground)] mt-0.5 tracking-tight"
                >
                  {activeTopic.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {returnStack.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReturn}
                    className="px-2.5 py-1 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--warning)] rounded hover:bg-[var(--surface)] hover:border-[var(--border-active)] font-medium flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer"
                    data-testid="return-to-target"
                    aria-label={`Return to ${returnStack[returnStack.length - 1].label}`}
                  >
                    <CornerUpLeft className="size-3.5" aria-hidden="true" />
                    <span>Back to {returnStack[returnStack.length - 1].label}</span>
                  </button>
                )}
                {linkedPrepTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      closeTopic();
                      setRoute('preparation', linkedPrepTopic.id);
                    }}
                    title={`Open ${linkedPrepTopic.title} in Preparation`}
                    className="px-2.5 py-1 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--accent)] rounded hover:bg-[var(--surface)] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Target className="size-3.5" aria-hidden="true" />
                    <span>Open Preparation</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeTopic}
                  aria-label="Close topic detail"
                  className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              {activeTopic.description}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider font-mono">
                Topic Tasks ({topicTasks.length})
              </h4>

              <div className="space-y-2.5">
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
                      className={`p-3 bg-[var(--surface)] border rounded-lg space-y-2 transition-colors ${
                        isBlocked
                          ? 'border-[var(--border)]/80 bg-[var(--surface)]/70'
                          : 'border-[var(--border)]'
                      }${isHighlighted ? ' ring-1 ring-[var(--focus)] border-[var(--border-active)]' : ''}`}
                      data-testid={`task-card-${t.id}`}
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-semibold text-[var(--foreground)]">
                              {t.title}
                            </h5>
                            {isBlocked && (
                              <Lock
                                className="size-3 text-[var(--warning)] shrink-0"
                                aria-label="Prerequisites required"
                              />
                            )}
                            {!isBlocked && showLock && lock.isPhaseLocked && (
                              <Clock
                                className="size-3 text-[var(--info)] shrink-0"
                                aria-label="Phase gate applies"
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                            {t.description}
                          </p>
                          {isBlocked && (
                            <p
                              className="text-[11px] text-[var(--warning)] flex items-start gap-1.5 mt-1 font-medium"
                              data-testid={`prereq-warning-${t.id}`}
                            >
                              <Lock className="size-3 text-[var(--warning)] shrink-0 mt-0.5" />
                              <span>Prerequisites must be completed first:</span>
                              <span className="font-semibold text-[var(--warning)]">
                                {unmetTitles}
                              </span>
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border capitalize font-semibold shrink-0 font-mono ${
                            state === 'completed'
                              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
                              : isBlocked
                              ? 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]'
                              : state === 'in_progress'
                              ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30'
                              : 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]'
                          }`}
                        >
                          {state.replace('_', ' ')}
                        </span>
                      </div>

                      {/* ── WHAT / WHY / NEXT for a locked task ────────────── */}
                      {showLock && (
                        <div
                          className={`space-y-2 rounded-md border p-2.5 ${
                            lock.isPrerequisiteBlocked
                              ? 'border-[var(--warning)]/30 bg-[var(--warning)]/5'
                              : 'border-[var(--info)]/30 bg-[var(--info)]/5'
                          }`}
                          data-testid={`task-lock-${t.id}`}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)] font-mono">
                              Why this is locked
                            </span>
                            <ul className="space-y-1">
                              {lock.blockers.map((b, i) => (
                                <li
                                  key={`${t.id}-blocker-${i}`}
                                  data-testid={`lock-blocker-${t.id}-${i}`}
                                  data-category={b.category}
                                  className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1.5"
                                >
                                  <span
                                    className={`mt-1.5 size-1 rounded-full shrink-0 ${
                                      b.category === 'phase_locked'
                                        ? 'bg-[var(--info)]'
                                        : 'bg-[var(--warning)]'
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
                              <span className="text-[var(--foreground-subtle)] uppercase tracking-wider mr-0.5 font-mono">
                                Chain
                              </span>
                              {lock.dependencyTrail.map((step, i) => (
                                <React.Fragment key={`trail-${t.id}-${step.taskId}`}>
                                  {i > 0 && <span className="text-[var(--foreground-subtle)]">→</span>}
                                  {step.resolvable ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRoadmapTarget(step.taskId, {
                                          targetId: t.id,
                                          label: t.title,
                                        })
                                      }
                                      className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--warning)] hover:border-[var(--border-active)] focus-visible:ring-2 focus-visible:ring-[var(--focus)] transition-colors cursor-pointer"
                                      data-testid={`trail-step-${t.id}-${step.taskId}`}
                                      aria-label={`Open prerequisite ${step.title}`}
                                    >
                                      {step.title}
                                    </button>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-subtle)]">
                                      {step.title}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                              <span className="text-[var(--foreground-subtle)]">→</span>
                              <span className="text-[var(--foreground)] font-medium">{t.title}</span>
                            </div>
                          )}

                          <p
                            className="text-[11px] text-[var(--foreground-muted)] italic"
                            data-testid={`lock-why-${t.id}`}
                          >
                            {lock.whyCannotStart}
                          </p>

                          {/* NEXT — only ever a real, resolvable target */}
                          <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[var(--border)]/60">
                            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] font-mono">
                              Next
                            </span>
                            {lock.prerequisiteActions.map((a) => (
                              <Button
                                key={a.targetId}
                                size="xs"
                                onClick={() =>
                                  openRoadmapTarget(a.targetId, { targetId: t.id, label: t.title })
                                }
                                data-testid={`open-prereq-${t.id}-${a.targetId}`}
                                aria-label={`Open prerequisite ${a.label} for ${t.title}`}
                                className="h-7 text-[11px] bg-[var(--surface-muted)] hover:bg-[var(--surface)] text-[var(--warning)] border border-[var(--warning)]/40 rounded-md px-2.5 font-semibold cursor-pointer"
                              >
                                Open prerequisite: {a.label}
                              </Button>
                            ))}
                            {lock.isPrerequisiteBlocked && lock.prerequisiteActions.length === 0 && (
                              <span
                                className="text-[10px] text-[var(--foreground-subtle)]"
                                data-testid={`prereq-unopenable-${t.id}`}
                              >
                                The prerequisite has no openable roadmap target.
                              </span>
                            )}
                            {!lock.isPrerequisiteBlocked && lock.isPhaseLocked && (
                              <span
                                className="text-[10px] text-[var(--foreground-subtle)]"
                                data-testid={`phase-no-action-${t.id}`}
                              >
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

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60 text-xs">
                        <span className="text-[var(--foreground-muted)] text-[11px] flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-[var(--accent)]" /> {t.estimatedMinutes} mins
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedWorkspaceTask(t);
                            }}
                            className="h-7 text-[11px] border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface)] rounded-md px-2.5 cursor-pointer"
                          >
                            Learning Workspace
                          </Button>
                          {state !== 'completed' &&
                            (isBlocked ? (
                              <Button
                                size="xs"
                                disabled
                                title={`Prerequisites must be completed first: ${unmetTitles}`}
                                data-testid={`complete-btn-${t.id}`}
                                className="h-7 text-[11px] bg-[var(--surface-muted)] text-[var(--foreground-subtle)] border border-[var(--border)] rounded-md px-2.5 font-semibold cursor-not-allowed flex items-center gap-1 opacity-70"
                              >
                                <Lock className="size-3 text-[var(--foreground-subtle)]" />
                                <span>Locked</span>
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                onClick={() => updateTaskState(t.id, 'completed')}
                                data-testid={`complete-btn-${t.id}`}
                                className="h-7 text-[11px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-md px-2.5 font-semibold cursor-pointer shadow-xs"
                              >
                                Complete
                              </Button>
                            ))}
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
