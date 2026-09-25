import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  calculateNextLeitnerBox,
  calculateEvidenceScore,
} from '../../engine/adaptiveEngine';
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

  const activeAssignments = dailyTaskAssignments.filter((a) => a.date === todayDate);

  const [reflections, setReflections] = useState<Record<string, AssignmentReflection>>(() => {
    const map: Record<string, AssignmentReflection> = {};
    activeAssignments.forEach((a) => {
      map[a.id] = {
        assignmentId: a.id,
        taskId: a.referenceId,
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
    setReflections((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value,
      },
    }));
  };

  const handleSeal = () => {
    let totalActualMinutes = 0;
    const updatedAssignments: DailyTaskAssignment[] = [];
    const newEvidenceLogs: EvidenceLog[] = [];

    const updatedTaskProgressMap = { ...taskProgress };
    const updatedDsaProgressMap = { ...dsaProgress };
    const updatedSkillStatesMap = { ...skillStates };

    for (const assign of activeAssignments) {
      const ref = reflections[assign.id];
      if (!ref) continue;

      totalActualMinutes += ref.actualMinutes;

      updatedAssignments.push({
        ...assign,
        completed: ref.completed,
        actualMinutes: ref.actualMinutes,
      });

      const task = taskDefinitions.find((t) => t.id === assign.referenceId);
      if (task) {
        // 1. Update TaskProgress
        const existingProgress = updatedTaskProgressMap[task.id] || {
          taskId: task.id,
          state: 'not_started',
          postponeCount: 0,
          skipCount: 0,
          timeSpentMinutes: 0,
          updatedAt: new Date().toISOString(),
        };

        updatedTaskProgressMap[task.id] = {
          ...existingProgress,
          state: ref.completed ? 'completed' : 'not_started',
          lastCompletedAt: ref.completed ? new Date().toISOString() : existingProgress.lastCompletedAt,
          timeSpentMinutes: existingProgress.timeSpentMinutes + ref.actualMinutes,
          updatedAt: new Date().toISOString(),
        };

        // 2. Generate EvidenceLog
        const score = calculateEvidenceScore(
          ref.dsaResult,
          ref.assistanceLevel,
          ref.confidence
        );

        const evidenceId = `evidence-${Date.now()}-${task.id}`;
        const evidence: EvidenceLog = {
          id: evidenceId,
          topicId: task.topicId,
          domainId: task.domainId,
          score,
          confidence: ref.confidence,
          timestamp: new Date().toISOString(),
          sourceType: 'daily_assignment',
          sourceId: assign.id,
        };
        newEvidenceLogs.push(evidence);

        // 3. Update SkillState
        const existingSkill = updatedSkillStatesMap[task.topicId] || {
          topicId: task.topicId,
          domainId: task.domainId,
          freshness: 'untested',
          evidenceStrength: 0,
        };

        const newEvidenceStrength = Math.min(
          100,
          Math.max(0, Math.round((existingSkill.evidenceStrength * 0.7) + (score * 0.3)))
        );

        updatedSkillStatesMap[task.topicId] = {
          ...existingSkill,
          lastPracticedAt: new Date().toISOString(),
          freshness: 'fresh',
          evidenceStrength: newEvidenceStrength,
        };

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

          const transition = calculateNextLeitnerBox(
            existingDsaProg.currentBox,
            ref.dsaResult,
            ref.assistanceLevel
          );

          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + transition.intervalDays);
          const nextReviewStr = nextReviewDate.toISOString().split('T')[0];

          updatedDsaProgressMap[dsaProblem.id] = {
            ...existingDsaProg,
            currentBox: transition.nextBox,
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
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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
              const task = taskDefinitions.find((t) => t.id === assign.referenceId);
              const ref = reflections[assign.id];
              if (!task || !ref) return null;

              return (
                <div key={assign.id} className="p-4 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F1F5F9]">{task.title}</span>
                    <label className="flex items-center gap-1.5 text-xs text-[#F1F5F9] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ref.completed}
                        onChange={(e) => handleFieldChange(assign.id, 'completed', e.target.checked)}
                        className="rounded-[4px] border-[#262D38] bg-[#14171D] text-emerald-500 focus:ring-emerald-500"
                      />
                      Completed
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Field 1: Actual Minutes */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">Actual Time (mins)</label>
                      <input
                        type="number"
                        min={1}
                        value={ref.actualMinutes}
                        onChange={(e) => handleFieldChange(assign.id, 'actualMinutes', Number(e.target.value))}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556]"
                      />
                    </div>

                    {/* Field 2: Assistance Level */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">Assistance Required</label>
                      <select
                        value={ref.assistanceLevel}
                        onChange={(e) => handleFieldChange(assign.id, 'assistanceLevel', e.target.value)}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556]"
                      >
                        <option value="none">Independent (No Hints)</option>
                        <option value="hint">Required Hints</option>
                        <option value="solution">Viewed Solution</option>
                      </select>
                    </div>

                    {/* Field 3: Confidence Rating */}
                    <div className="space-y-1">
                      <label className="text-[#8E98A8] font-medium block text-[11px] uppercase tracking-wider">Confidence (1 - 5)</label>
                      <select
                        value={ref.confidence}
                        onChange={(e) => handleFieldChange(assign.id, 'confidence', Number(e.target.value))}
                        className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-1.5 rounded-[4px] border border-[#262D38] focus:border-[#3B4556]"
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262D38]">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSeal}
            disabled={activeAssignments.length === 0}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-[4px]"
          >
            <CheckCircle2 className="size-3.5 mr-1" /> Seal Day & Update Skill State
          </Button>
        </div>
      </div>
    </div>
  );
};
