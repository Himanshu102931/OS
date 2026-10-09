import React, { useState, useEffect, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  getEvaluatedCandidates,
  getTimeBudget,
} from '../../engine/adaptiveEngine';
import { isProblemUnlocked } from '../../engine/dsaEngine';
import type {
  PlacementMode,
  DailyTaskAssignment,
  DailyCheckIn,
  DSAProblem,
  TaskDefinition,
} from '../../types';
import {
  Clock,
  Zap,
  Target,
  CheckCircle2,
  X,
  AlertCircle,
  Code2,
  BookOpen,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitPlan: (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => void;
  targetCompanyId?: string;
}

interface MorningTaskPlanItem {
  kind: 'task';
  id: string; // task.id
  title: string;
  domainShortName: string;
  estimatedMinutes: number;
  priorityScore: number;
  explanation: string;
  task: TaskDefinition;
  taskType: 'catalog_task';
}

interface MorningDSAPlanItem {
  kind: 'dsa';
  id: string; // problem.id
  title: string;
  domainShortName: string;
  estimatedMinutes: number;
  priorityScore: number;
  explanation: string;
  problem: DSAProblem;
  taskType: 'dsa_review' | 'dsa_new';
  currentBox: number;
  isDue: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  patternName: string;
}

type MorningPlanItem = MorningTaskPlanItem | MorningDSAPlanItem;

function getDaysDifference(targetDateStr: string, todayStr: string): number {
  const target = new Date(targetDateStr);
  const today = new Date(todayStr);
  const diffTime = today.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export const MorningPlanningModal: React.FC<MorningPlanningModalProps> = ({
  isOpen,
  onClose,
  onCommitPlan,
  targetCompanyId,
}) => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    currentMode,
    todayDate,
    domains,
    activePhase,
    dailyCheckIns,
    dailyTaskAssignments,
  } = usePlacement();

  const [availableMinutes, setAvailableMinutes] = useState<number>(180);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [mode, setMode] = useState<PlacementMode>(currentMode);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Is today already sealed?
  const isDaySealed = useMemo(() => {
    return (dailyCheckIns || []).find((c) => c.date === todayDate)?.isSealed ?? false;
  }, [dailyCheckIns, todayDate]);

  // Committed target IDs for today to prevent duplicate commitments
  const committedTodayTargetIds = useMemo(() => {
    return new Set(
      (dailyTaskAssignments || [])
        .filter((a) => a.date === todayDate)
        .map((a) => a.referenceId)
    );
  }, [dailyTaskAssignments, todayDate]);

  // 1. Gather Roadmap task candidates
  const roadmapCandidates: MorningTaskPlanItem[] = useMemo(() => {
    const rawCandidates = getEvaluatedCandidates(
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      skillStates,
      companyOverlays,
      mode,
      todayDate,
      targetCompanyId
    );
    return rawCandidates
      .filter((c) => !committedTodayTargetIds.has(c.task.id))
      .map((c) => {
        const domain = domains.find((d) => d.id === c.task.domainId);
        return {
          kind: 'task' as const,
          id: c.task.id,
          title: c.task.title,
          domainShortName: domain?.shortName || 'Roadmap',
          estimatedMinutes: c.task.estimatedMinutes,
          priorityScore: c.breakdown.finalScore,
          explanation: c.breakdown.explanation,
          task: c.task,
          taskType: 'catalog_task' as const,
        };
      });
  }, [
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    mode,
    todayDate,
    targetCompanyId,
    committedTodayTargetIds,
    domains,
  ]);

  // 2. Gather Eligible DSA candidates (Due Leitner reviews + newly unlocked problems)
  const { dueDsaCandidates, newDsaCandidates } = useMemo(() => {
    const currentPhaseNum = activePhase?.order ?? 1;
    const dueReviews: MorningDSAPlanItem[] = [];
    const newProblems: MorningDSAPlanItem[] = [];

    for (const prob of dsaProblems) {
      if (committedTodayTargetIds.has(prob.id)) continue;
      const prog = dsaProgress[prob.id];

      // Exclude if already completed today
      if (prog?.lastAttemptAt && prog.lastAttemptAt.startsWith(todayDate)) {
        continue;
      }

      const unlockStatus = isProblemUnlocked(prob, dsaProgress, currentPhaseNum);
      if (!unlockStatus.isUnlocked) continue;

      const domain = domains.find((d) => d.id === prob.domainId);
      const domainShortName = domain?.shortName || 'DSA';

      if (prog?.nextReviewAt && prog.nextReviewAt <= todayDate) {
        // Due Leitner Review
        const daysOverdue = getDaysDifference(prog.nextReviewAt, todayDate);
        const priorityScore = Math.min(100, 85 + daysOverdue * 3);
        dueReviews.push({
          kind: 'dsa' as const,
          id: prob.id,
          title: prob.title,
          domainShortName,
          estimatedMinutes: prob.estimatedTimeMinutes || 20,
          priorityScore,
          explanation: `Leitner Box ${prog.currentBox || 1} review due ${
            daysOverdue > 0 ? `(${daysOverdue}d overdue)` : 'today'
          }`,
          problem: prob,
          taskType: 'dsa_review' as const,
          currentBox: prog.currentBox || 1,
          isDue: true,
          difficulty: prob.difficulty,
          patternName: prob.primaryPattern,
        });
      } else if (!prog || prog.attemptCount === 0) {
        // Newly Unlocked Problem
        newProblems.push({
          kind: 'dsa' as const,
          id: prob.id,
          title: prob.title,
          domainShortName,
          estimatedMinutes: prob.estimatedTimeMinutes || 20,
          priorityScore: prob.isAnchor ? 85 : 75,
          explanation: `Newly unlocked ${prob.difficulty} problem in ${prob.primaryPattern}`,
          problem: prob,
          taskType: 'dsa_new' as const,
          currentBox: 0,
          isDue: false,
          difficulty: prob.difficulty,
          patternName: prob.primaryPattern,
        });
      }
    }

    // Sort due reviews: most overdue first, then box ascending, then id
    dueReviews.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return a.id.localeCompare(b.id);
    });

    // Sort new problems: anchors first, then phase, then id
    newProblems.sort((a, b) => {
      if (a.problem.isAnchor !== b.problem.isAnchor) return a.problem.isAnchor ? -1 : 1;
      if (a.problem.recommendedPhase !== b.problem.recommendedPhase) {
        return a.problem.recommendedPhase - b.problem.recommendedPhase;
      }
      return a.id.localeCompare(b.id);
    });

    return { dueDsaCandidates: dueReviews, newDsaCandidates: newProblems };
  }, [dsaProblems, dsaProgress, activePhase, todayDate, committedTodayTargetIds, domains]);

  const timeBudget = useMemo(() => getTimeBudget(mode, availableMinutes), [mode, availableMinutes]);

  // Deterministic automatic selection of plan items within time budget:
  // 1. Due Leitner reviews take precedence (time-critical spaced repetition obligations)
  // 2. High-priority roadmap tasks fill the remaining budget
  // 3. Fallback ensures plan is non-empty when timeBudget > 0
  const defaultSelectedIds = useMemo(() => {
    const selected = new Set<string>();
    let remainingBudget = timeBudget;

    // 1. Pack due Leitner DSA reviews first (up to 2 reviews or within budget)
    let dsaReviewsCount = 0;
    for (const dsaItem of dueDsaCandidates) {
      if (dsaReviewsCount >= 2 && remainingBudget < 60) break;
      if (dsaItem.estimatedMinutes <= remainingBudget) {
        selected.add(dsaItem.id);
        remainingBudget -= dsaItem.estimatedMinutes;
        dsaReviewsCount++;
      }
    }

    // 2. Pack top roadmap tasks into remaining budget
    for (const taskItem of roadmapCandidates) {
      if (taskItem.estimatedMinutes <= remainingBudget) {
        selected.add(taskItem.id);
        remainingBudget -= taskItem.estimatedMinutes;
      }
    }

    // 3. If budget permits and no due reviews were present, pack top new DSA problem
    if (dueDsaCandidates.length === 0) {
      for (const dsaItem of newDsaCandidates) {
        if (dsaItem.estimatedMinutes <= remainingBudget) {
          selected.add(dsaItem.id);
          break; // At most 1 new DSA problem in default auto-pack
        }
      }
    }

    // Over-budget exception rule: if plan is empty and budget > 0, pick top candidate
    if (selected.size === 0 && timeBudget > 0) {
      if (dueDsaCandidates.length > 0) {
        selected.add(dueDsaCandidates[0].id);
      } else if (roadmapCandidates.length > 0) {
        selected.add(roadmapCandidates[0].id);
      } else if (newDsaCandidates.length > 0) {
        selected.add(newDsaCandidates[0].id);
      }
    }

    return selected;
  }, [timeBudget, dueDsaCandidates, roadmapCandidates, newDsaCandidates]);

  // User selection override state (null uses deterministic defaultSelectedIds, Set when explicitly toggled)
  const [selectedIdsOverride, setSelectedIdsOverride] = useState<Set<string> | null>(null);

  const selectedIds = selectedIdsOverride ?? defaultSelectedIds;

  const toggleItem = (id: string) => {
    setSelectedIdsOverride((prev) => {
      const current = prev ?? new Set(defaultSelectedIds);
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allCandidateItems: MorningPlanItem[] = useMemo(() => {
    return [...dueDsaCandidates, ...roadmapCandidates, ...newDsaCandidates];
  }, [dueDsaCandidates, roadmapCandidates, newDsaCandidates]);

  const selectedItems: MorningPlanItem[] = useMemo(() => {
    return allCandidateItems.filter((item) => selectedIds.has(item.id));
  }, [allCandidateItems, selectedIds]);

  const totalSelectedMinutes = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  }, [selectedItems]);

  const selectedDsaCount = selectedItems.filter((i) => i.kind === 'dsa').length;
  const selectedRoadmapCount = selectedItems.filter((i) => i.kind === 'task').length;

  const handleCommit = () => {
    if (isDaySealed || selectedItems.length === 0) return;

    const checkInId = `checkin-${todayDate}`;
    const assignmentIds: string[] = [];

    const assignments: DailyTaskAssignment[] = selectedItems.map((item, index) => {
      const id = `assign-${todayDate}-${item.id}-${index}`;
      assignmentIds.push(id);
      if (item.kind === 'dsa') {
        return {
          id,
          date: todayDate,
          taskType: item.taskType,
          referenceId: item.problem.id,
          allocatedMinutes: item.estimatedMinutes,
          completed: false,
          sourceProblemId: item.problem.id,
        };
      } else {
        return {
          id,
          date: todayDate,
          taskType: 'catalog_task',
          referenceId: item.task.id,
          allocatedMinutes: item.task.estimatedMinutes,
          completed: false,
        };
      }
    });

    const checkIn: DailyCheckIn = {
      id: checkInId,
      date: todayDate,
      mode,
      availableMinutes,
      energyLevel,
      assignmentIds,
      totalActualMinutes: 0,
      isSealed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCommitPlan(checkIn, assignments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-surface-panel border border-border-default rounded-[4px] max-w-3xl w-full p-6 sm:p-7 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-default pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <Target className="size-3.5" />
              <span>Morning Planning Protocol</span>
            </div>
            <h2 id="morning-modal-title" className="text-xl font-bold text-text-primary mt-0.5 font-mono">
              Plan Today's Execution ({todayDate})
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Morning Planning modal"
            className="p-1 rounded-[4px] text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-1 focus:ring-accent-amber"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          {/* Input 1: Available Time */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-surface-elevated border border-border-default">
            <label htmlFor="morning-available-time" className="text-text-secondary font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Clock className="size-3.5 text-accent-amber" /> Available Time
            </label>
            <select
              id="morning-available-time"
              value={availableMinutes}
              onChange={(e) => {
                setAvailableMinutes(Number(e.target.value));
                setSelectedIdsOverride(null);
              }}
              className="w-full bg-surface-panel text-text-primary font-bold p-2 rounded-[4px] border border-border-default focus:outline-none focus:border-border-active"
            >
              <option value={60}>60 minutes (1 hr)</option>
              <option value={120}>120 minutes (2 hrs)</option>
              <option value={180}>180 minutes (3 hrs)</option>
              <option value={240}>240 minutes (4 hrs)</option>
              <option value={300}>300 minutes (5 hrs)</option>
            </select>
          </div>

          {/* Input 2: Energy Level */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-surface-elevated border border-border-default">
            <label htmlFor="morning-energy-level" className="text-text-secondary font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Zap className="size-3.5 text-amber-400" /> Energy Level
            </label>
            <select
              id="morning-energy-level"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full bg-surface-panel text-text-primary font-bold p-2 rounded-[4px] border border-border-default focus:outline-none focus:border-border-active capitalize"
            >
              <option value="low">Low Energy</option>
              <option value="medium">Medium Energy</option>
              <option value="high">High Energy</option>
            </select>
          </div>

          {/* Input 3: Placement Mode */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-surface-elevated border border-border-default">
            <label htmlFor="morning-placement-mode" className="text-text-secondary font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Target className="size-3.5 text-accent-amber" /> Workload Mode
            </label>
            <select
              id="morning-placement-mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as PlacementMode);
                setSelectedIdsOverride(null);
              }}
              className="w-full bg-surface-panel text-text-primary font-bold p-2 rounded-[4px] border border-border-default focus:outline-none focus:border-border-active"
            >
              <option value="normal">Normal Workload</option>
              <option value="reduced">Reduced Workload</option>
              <option value="exam">Exam Mode</option>
              <option value="placement_sprint">Placement Sprint</option>
            </select>
          </div>
        </div>

        {/* Calculated Time Budget Banner */}
        <div className="p-3 rounded-[4px] bg-surface-elevated border border-border-default text-xs flex flex-wrap items-center justify-between gap-2 text-text-secondary font-mono">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-accent-amber" />
            <span>
              Calculated Budget for <strong className="text-text-primary">{mode}</strong> mode:
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-secondary">
              {selectedDsaCount} DSA · {selectedRoadmapCount} Roadmap
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                totalSelectedMinutes > timeBudget ? 'text-status-warning' : 'text-accent-amber'
              }`}
            >
              {totalSelectedMinutes}m / {timeBudget}m allocated
            </span>
          </div>
        </div>

        {/* Section 1: Leitner DSA Reviews & Algorithmic Practice */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Code2 className="size-3.5 text-accent" />
              <span>Leitner DSA Reviews & Algorithmic Practice</span>
              {dueDsaCandidates.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-medium">
                  {dueDsaCandidates.length} Due
                </span>
              )}
            </h4>
            <span className="text-[11px] text-secondary font-mono">
              Click item to toggle commitment
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {dueDsaCandidates.length === 0 && (
              <div className="p-3 rounded-[4px] bg-surface-elevated/60 border border-border text-center text-xs text-foreground-muted">
                No DSA reviews due today. Focus on curriculum roadmap tasks.
              </div>
            )}
            {/* Due Reviews First */}
                {dueDsaCandidates.map((dsa) => {
                  const isSelected = selectedIds.has(dsa.id);
                  return (
                    <div
                      key={dsa.id}
                      onClick={() => toggleItem(dsa.id)}
                      data-testid={`morning-dsa-item-${dsa.id}`}
                      className={`p-3 rounded-[4px] border cursor-pointer transition-all space-y-1.5 text-xs ${
                        isSelected
                          ? 'bg-surface-elevated border-accent/50 hover:border-accent'
                          : 'bg-surface border border-border hover:border-border-active opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            aria-label={isSelected ? `Deselect ${dsa.title}` : `Select ${dsa.title}`}
                            className="mt-0.5 text-accent focus:outline-none"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4" />
                            ) : (
                              <Square className="size-4 text-secondary" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-[4px] bg-accent/15 text-accent border border-accent/30">
                                Box {dsa.currentBox} Review
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface text-foreground-muted border border-border">
                                {dsa.patternName}
                              </span>
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border capitalize ${
                                  dsa.difficulty === 'easy'
                                    ? 'bg-status-success/10 text-status-success border-status-success/30'
                                    : dsa.difficulty === 'medium'
                                    ? 'bg-status-warning/10 text-status-warning border-status-warning/30'
                                    : 'bg-status-danger/10 text-status-danger border-status-danger/30'
                                }`}
                              >
                                {dsa.difficulty}
                              </span>
                              <span className="font-semibold text-foreground">{dsa.title}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-accent">
                            Score: {dsa.priorityScore}/100
                          </span>
                          <span className="block text-[11px] text-foreground-muted font-mono">
                            {dsa.estimatedMinutes} mins
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-foreground-muted flex items-center gap-1 italic pl-6.5">
                        <AlertCircle className="size-3 text-accent shrink-0" />
                        <span>{dsa.explanation}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Newly Unlocked DSA Problems (if available and no due reviews) */}
                {dueDsaCandidates.length === 0 &&
                  newDsaCandidates.slice(0, 3).map((dsa) => {
                    const isSelected = selectedIds.has(dsa.id);
                    return (
                      <div
                        key={dsa.id}
                        onClick={() => toggleItem(dsa.id)}
                        data-testid={`morning-dsa-item-${dsa.id}`}
                        className={`p-3 rounded-[4px] border cursor-pointer transition-all space-y-1.5 text-xs ${
                          isSelected
                            ? 'bg-surface-elevated border-[#3B82F6]/50 hover:border-[#3B82F6]'
                            : 'bg-surface border border-border hover:border-border-active opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              aria-label={isSelected ? `Deselect ${dsa.title}` : `Select ${dsa.title}`}
                              className="mt-0.5 text-[#3B82F6] focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="size-4" />
                              ) : (
                                <Square className="size-4 text-secondary" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#3B82F6]/15 text-[#93C5FD] border border-[#3B82F6]/30">
                                  New Problem
                                </span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface text-foreground-muted border border-border">
                                  {dsa.patternName}
                                </span>
                                <span className="font-semibold text-foreground">{dsa.title}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-[#93C5FD]">
                              Score: {dsa.priorityScore}/100
                            </span>
                            <span className="block text-[11px] text-foreground-muted font-mono">
                              {dsa.estimatedMinutes} mins
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-foreground-muted flex items-center gap-1 italic pl-6.5">
                          <Sparkles className="size-3 text-[#3B82F6] shrink-0" />
                          <span>{dsa.explanation}</span>
                        </div>
                      </div>
                    );
                  })}
          </div>
        </div>

        {/* Section 2: Roadmap Curriculum Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider font-mono flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-[#3B82F6]" />
              <span>Curriculum Roadmap Tasks ({roadmapCandidates.length} Available)</span>
            </h4>
            <span className="text-[11px] text-secondary font-mono">
              Deterministic priority
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {roadmapCandidates.length === 0 ? (
              <div className="p-3 rounded-[4px] bg-surface-elevated/60 border border-border text-center text-xs text-foreground-muted">
                No pending roadmap tasks available for planning.
              </div>
            ) : (
              roadmapCandidates.map((c) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleItem(c.id)}
                    data-testid={`morning-task-item-${c.id}`}
                    className={`p-3 rounded-[4px] border cursor-pointer transition-all space-y-1.5 text-xs ${
                      isSelected
                        ? 'bg-surface-elevated border-accent/50 hover:border-accent'
                        : 'bg-surface border border-border hover:border-border-active opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          aria-label={isSelected ? `Deselect ${c.title}` : `Select ${c.title}`}
                          className="mt-0.5 text-accent focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4" />
                          ) : (
                            <Square className="size-4 text-secondary" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface text-foreground-muted border border-border">
                              {c.domainShortName}
                            </span>
                            <span className="font-semibold text-foreground">{c.title}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-accent">
                          Score: {c.priorityScore}/100
                        </span>
                        <span className="block text-[11px] text-foreground-muted font-mono">
                          {c.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-foreground-muted flex items-center gap-1 italic pl-6.5">
                      <AlertCircle className="size-3 text-secondary shrink-0" />
                      <span>{c.explanation}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-foreground-muted font-mono">
            {isDaySealed && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Day is sealed. Further commitments locked.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-foreground-muted hover:text-foreground rounded-[4px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={selectedItems.length === 0 || isDaySealed}
              data-testid="commit-morning-plan-button"
              className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-mono font-bold rounded-[4px]"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Commit Today's Plan ({selectedItems.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
