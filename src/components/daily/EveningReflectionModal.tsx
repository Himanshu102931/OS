import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { calculateEvidenceScore } from '../../engine/adaptiveEngine';
import {
  calculateNextLeitnerBox,
  getLeitnerIntervalDays,
} from '../../engine/dsaEngine';
import { applySealAssignmentCompletion } from '../../engine/taskStateEngine';
import type {
  DailyTaskAssignment,
  DailyCheckIn,
  EvidenceLog,
  TaskProgress,
  DSAProgress,
  TopicSkillState,
} from '../../types';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface AssignmentReflection {
  assignmentId: string;
  taskId: string;
  completed: boolean;
  actualMinutes: number;
  assistanceLevel: 'none' | 'hint' | 'solution';
  confidence: 1 | 2 | 3 | 4 | 5;
  dsaResult: 'pass' | 'partial' | 'fail';
}

interface EveningReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSealDay: (
    updatedCheckIn: DailyCheckIn,
    updatedAssignments: DailyTaskAssignment[],
    newEvidenceLogs: EvidenceLog[],
    updatedTaskProgressMap: Record<string, TaskProgress>,
    updatedDsaProgressMap: Record<string, DSAProgress>,
    updatedSkillStatesMap: Record<string, TopicSkillState>
  ) => void;
}

export const EveningReflectionModal: React.FC<EveningReflectionModalProps> = ({
  isOpen,
  onClose,
  onSealDay,
}) => {
  const {
    dailyCheckIns,
    dailyTaskAssignments,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    todayDate,
    domains,
  } = usePlacement();

  const currentCheckIn = dailyCheckIns.find((c) => c.date === todayDate) || {
    id: `checkin-${todayDate}`,
    date: todayDate,
    mode: 'normal',
    availableMinutes: 180,
    energyLevel: 'medium',
    assignmentIds: dailyTaskAssignments.map((a) => a.id),
    totalActualMinutes: 0,
    isSealed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const isDaySealed = currentCheckIn?.isSealed ?? false;
  const activeAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);

  const [reflections, setReflections] = useState<Record<string, AssignmentReflection>>(() => {
    const map: Record<string, AssignmentReflection> = {};
    activeAssignments.forEach((a) => {
      map[a.id] = {
        assignmentId: a.id,
        taskId: a.sourceProblemId || a.referenceId,
        completed: a.completed || true,
        actualMinutes: a.actualMinutes || a.allocatedMinutes || 30,
        assistanceLevel: 'none',
        confidence: 4,
        dsaResult: 'pass',
      };
    });
    return map;
  });

  if (!isOpen) return null;

  const handleFieldChange = (
    assignmentId: string,
    field: keyof AssignmentReflection,
    value: string | number | boolean
  ) => {
    if (isDaySealed) return;
    setReflections((prev) => {
      const existing = prev[assignmentId] || {
        assignmentId,
        taskId: activeAssignments.find((a) => a.id === assignmentId)?.sourceProblemId || activeAssignments.find((a) => a.id === assignmentId)?.referenceId || '',
        completed: activeAssignments.find((a) => a.id === assignmentId)?.completed || true,
        actualMinutes: activeAssignments.find((a) => a.id === assignmentId)?.actualMinutes || activeAssignments.find((a) => a.id === assignmentId)?.allocatedMinutes || 30,
        assistanceLevel: 'none',
        confidence: 4,
        dsaResult: 'pass',
      };
      return {
        ...prev,
        [assignmentId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSeal = () => {
    if (isDaySealed) return;

    let totalActualMinutes = 0;
    const updatedAssignments: DailyTaskAssignment[] = [];
    const newEvidenceLogs: EvidenceLog[] = [];

    const updatedTaskProgressMap = { ...taskProgress };
    const updatedDsaProgressMap = { ...dsaProgress };
    const updatedSkillStatesMap = { ...skillStates };

    for (const assign of activeAssignments) {
      const ref = reflections[assign.id] || {
        assignmentId: assign.id,
        taskId: assign.sourceProblemId || assign.referenceId,
        completed: assign.completed || true,
        actualMinutes: assign.actualMinutes || assign.allocatedMinutes || 30,
        assistanceLevel: 'none' as const,
        confidence: 4 as const,
        dsaResult: 'pass' as const,
      };

      totalActualMinutes += ref.actualMinutes;

      updatedAssignments.push({
        ...assign,
        completed: ref.completed,
        actualMinutes: ref.actualMinutes,
      });

      const isDsa = assign.taskType === 'dsa_review' || assign.taskType === 'dsa_new';
      const task = !isDsa ? taskDefinitions.find((t) => t.id === assign.referenceId) : undefined;
      if (task) {
        // 1.-3. Progress + evidence + skill record for this reflection — pure.
        // Duplicate guard: a task already completed through Today (progress
        // state 'completed') already produced its single daily_assignment
        // evidence event and skill EMA at completion time, so the seal skips
        // both for that completion. Assignments not completed through Today
        // keep the existing seal behaviour exactly (evidence + skill emitted).
        const score = calculateEvidenceScore(
          ref.dsaResult,
          ref.assistanceLevel,
          ref.confidence
        );

        const seal = applySealAssignmentCompletion({
          reflection: {
            assignmentId: assign.id,
            completed: ref.completed,
            actualMinutes: ref.actualMinutes,
            score,
            confidence: ref.confidence,
          },
          task,
          existingProgress: updatedTaskProgressMap[task.id],
          existingSkill: updatedSkillStatesMap[task.topicId],
          now: Date.now(),
        });

        updatedTaskProgressMap[task.id] = seal.progress;
        if (seal.evidence) {
          newEvidenceLogs.push(seal.evidence);
        }
        if (seal.skillUpdate) {
          updatedSkillStatesMap[task.topicId] = seal.skillUpdate;
        }

        // 4. If DSA problem, update DSAProgress using Leitner 4-box rules
        const dsaProblem = dsaProblems.find((p) => p.topicId === task.topicId);
        if (dsaProblem) {
          const existingDsaProg = updatedDsaProgressMap[dsaProblem.id] || {
            problemId: dsaProblem.id,
            currentBox: 1,
            nextReviewAt: todayDate,
            attemptCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const nextBox = calculateNextLeitnerBox(
            existingDsaProg.currentBox,
            ref.dsaResult,
            ref.assistanceLevel
          );

          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + getLeitnerIntervalDays(nextBox));
          const nextReviewStr = nextReviewDate.toISOString().split('T')[0];

          updatedDsaProgressMap[dsaProblem.id] = {
            ...existingDsaProg,
            currentBox: nextBox,
            nextReviewAt: nextReviewStr,
            lastAttemptAt: new Date().toISOString(),
            attemptCount: (existingDsaProg?.attemptCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }

    const updatedCheckIn: DailyCheckIn = {
      ...(currentCheckIn as DailyCheckIn),
      totalActualMinutes,
      isSealed: true,
      sealedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSealDay(
      updatedCheckIn,
      updatedAssignments,
      newEvidenceLogs,
      updatedTaskProgressMap,
      updatedDsaProgressMap,
      updatedSkillStatesMap
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-3xl w-full p-6 sm:p-7 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <CheckCircle2 className="size-3.5" />
              <span>Evening Reflection & Daily Sealing</span>
            </div>
            <h2 className="text-xl font-bold text-[#F1F5F9] mt-0.5 font-mono">Seal Day Execution ({todayDate})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {activeAssignments.length === 0 ? (
          <div className="p-6 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-center text-xs text-[#8E98A8] space-y-2 font-mono">
            <AlertCircle className="size-6 text-[#5C6675] mx-auto" />
            <p>No active assignments found for today. Plan your morning session first!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {activeAssignments.map((assign) => {
              const isDsa = assign.taskType === 'dsa_review' || assign.taskType === 'dsa_new';
              const dsaProblemId = assign.sourceProblemId || assign.referenceId;
              const task = !isDsa ? taskDefinitions.find((t) => t.id === assign.referenceId) : undefined;
              const dsaProblem = isDsa || !task ? dsaProblems.find((p) => p.id === dsaProblemId) : undefined;

              if (!task && !dsaProblem) return null;

              const ref = reflections[assign.id] || {
                assignmentId: assign.id,
                taskId: dsaProblem ? dsaProblem.id : task!.id,
                completed: assign.completed || true,
                actualMinutes: assign.actualMinutes || assign.allocatedMinutes || 30,
                assistanceLevel: 'none' as const,
                confidence: 4 as const,
                dsaResult: 'pass' as const,
              };

              const domain = task ? domains.find((d) => d.id === task.domainId) : undefined;

              return (
                <div
                  key={assign.id}
                  data-testid={`reflection-item-${assign.id}`}
                  className="p-4 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-3 font-mono"
                >
                  <div className="flex items-center justify-between gap-3">
                    {task ? (
                      <div className="flex items-center gap-2">
                        {domain && (
                          <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#14171D] text-[#8E98A8] border border-[#262D38]">
                            {domain.shortName}
                          </span>
                        )}
                        <span className="font-bold text-sm text-[#F1F5F9]">{task.title}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#E5A93C]/10 border border-[#E5A93C]/30 font-semibold">
                          DSA {assign.taskType === 'dsa_review' ? 'Review' : 'New'}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#14171D] text-[#8E98A8] border border-[#262D38]">
                          {dsaProblem!.primaryPattern} · {dsaProblem!.difficulty}
                        </span>
                        <span className="font-bold text-sm text-[#F1F5F9]">{dsaProblem!.title}</span>
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-[#F1F5F9] font-semibold cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={ref.completed}
                        disabled={isDaySealed}
                        onChange={(e) => handleFieldChange(assign.id, 'completed', e.target.checked)}
                        data-testid={`reflection-completed-${assign.id}`}
                        className="rounded-[4px] border-[#262D38] bg-[#14171D] text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                      />
                      Completed
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Field 1: Actual Minutes */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">
                        Actual Time (mins)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={ref.actualMinutes}
                        disabled={isDaySealed}
                        onChange={(e) => handleFieldChange(assign.id, 'actualMinutes', Number(e.target.value))}
                        data-testid={`reflection-minutes-${assign.id}`}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556] disabled:opacity-50"
                      />
                    </div>

                    {/* Field 2: Assistance Level */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">
                        Assistance Required
                      </label>
                      <select
                        value={ref.assistanceLevel}
                        disabled={isDaySealed}
                        onChange={(e) => handleFieldChange(assign.id, 'assistanceLevel', e.target.value as 'none' | 'hint' | 'solution')}
                        data-testid={`reflection-assistance-${assign.id}`}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556] disabled:opacity-50"
                      >
                        <option value="none">Independent (No Hints)</option>
                        <option value="hint">Required Hints</option>
                        <option value="solution">Viewed Solution</option>
                      </select>
                    </div>

                    {/* Field 3: Confidence Rating */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">
                        Confidence (1 - 5)
                      </label>
                      <select
                        value={ref.confidence}
                        disabled={isDaySealed}
                        onChange={(e) => handleFieldChange(assign.id, 'confidence', Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                        data-testid={`reflection-confidence-${assign.id}`}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556] disabled:opacity-50"
                      >
                        <option value={1}>1 - Low Confidence</option>
                        <option value={2}>2 - Below Average</option>
                        <option value={3}>3 - Moderate</option>
                        <option value={4}>4 - High Confidence</option>
                        <option value={5}>5 - Mastered</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#262D38]">
          <div className="text-xs text-[#8E98A8] font-mono">
            {isDaySealed && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Day is sealed. Reflections are locked.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSeal}
              disabled={activeAssignments.length === 0 || isDaySealed}
              data-testid="seal-day-button"
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-[4px] disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Seal Day & Update Skill State
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
