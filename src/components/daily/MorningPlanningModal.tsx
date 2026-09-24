import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  getEvaluatedCandidates,
  getTimeBudget,
  selectDailyPlan,
} from '../../engine/adaptiveEngine';
import type { PlacementMode, DailyTaskAssignment, DailyCheckIn } from '../../types';
import { Clock, Zap, Target, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitPlan: (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => void;
}

export const MorningPlanningModal: React.FC<MorningPlanningModalProps> = ({
  isOpen,
  onClose,
  onCommitPlan,
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
  } = usePlacement();

  const [availableMinutes, setAvailableMinutes] = useState<number>(180);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [mode, setMode] = useState<PlacementMode>(currentMode);

  if (!isOpen) return null;

  // 1. Gather & evaluate candidates deterministically
  const candidates = getEvaluatedCandidates(
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    companyOverlays,
    mode,
    todayDate
  );

  // 2. Calculate time budget and select daily plan
  const timeBudget = getTimeBudget(mode, availableMinutes);
  const selectedCandidates = selectDailyPlan(candidates, timeBudget);

  const totalSelectedMinutes = selectedCandidates.reduce(
    (sum, c) => sum + c.task.estimatedMinutes,
    0
  );

  const handleCommit = () => {
    const checkInId = `checkin-${todayDate}`;
    const assignmentIds: string[] = [];

    const assignments: DailyTaskAssignment[] = selectedCandidates.map((c, index) => {
      const id = `assign-${todayDate}-${c.task.id}-${index}`;
      assignmentIds.push(id);
      return {
        id,
        date: todayDate,
        taskType: 'catalog_task',
        referenceId: c.task.id,
        allocatedMinutes: c.task.estimatedMinutes,
        completed: false,
      };
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <Target className="size-3.5" />
              <span>Morning Planning Protocol</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Plan Today's Execution ({todayDate})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Input 1: Available Time */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="size-3.5 text-blue-400" /> Available Time
            </label>
            <select
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(Number(e.target.value))}
              className="w-full bg-slate-900 text-slate-100 font-bold p-2 rounded border border-slate-800 focus:outline-none"
            >
              <option value={60}>60 minutes (1 hr)</option>
              <option value={120}>120 minutes (2 hrs)</option>
              <option value={180}>180 minutes (3 hrs)</option>
              <option value={240}>240 minutes (4 hrs)</option>
              <option value={300}>300 minutes (5 hrs)</option>
            </select>
          </div>

          {/* Input 2: Energy Level */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Zap className="size-3.5 text-amber-400" /> Energy Level
            </label>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full bg-slate-900 text-slate-100 font-bold p-2 rounded border border-slate-800 focus:outline-none capitalize"
            >
              <option value="low">Low Energy</option>
              <option value="medium">Medium Energy</option>
              <option value="high">High Energy</option>
            </select>
          </div>

          {/* Input 3: Placement Mode */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Target className="size-3.5 text-indigo-400" /> Workload Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PlacementMode)}
              className="w-full bg-slate-900 text-slate-100 font-bold p-2 rounded border border-slate-800 focus:outline-none"
            >
              <option value="normal">Normal Workload</option>
              <option value="reduced">Reduced Workload</option>
              <option value="exam">Exam Mode</option>
              <option value="placement_sprint">Placement Sprint</option>
            </select>
          </div>
        </div>

        {/* Calculated Time Budget Banner */}
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs flex items-center justify-between text-blue-300">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-blue-400" />
            <span>
              Calculated Budget for <strong>{mode}</strong> mode:
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-blue-200">
            {totalSelectedMinutes}m / {timeBudget}m allocated
          </span>
        </div>

        {/* Selected Tasks List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Deterministic Recommended Plan ({selectedCandidates.length} Tasks)
          </h4>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {selectedCandidates.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                No tasks selected for this time budget. Increase available time or adjust mode.
              </div>
            ) : (
              selectedCandidates.map((c) => {
                const domain = domains.find((d) => d.id === c.task.domainId);
                return (
                  <div
                    key={c.task.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {domain && (
                            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {domain.shortName}
                            </span>
                          )}
                          <span className="font-semibold text-slate-100">{c.task.title}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-blue-400">
                          Score: {c.breakdown.finalScore}/100
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {c.task.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 italic">
                      <AlertCircle className="size-3 text-slate-500 shrink-0" />
                      <span>{c.breakdown.explanation}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-400">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={selectedCandidates.length === 0}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            <CheckCircle2 className="size-3.5 mr-1" /> Commit Today's Plan
          </Button>
        </div>
      </div>
    </div>
  );
};
