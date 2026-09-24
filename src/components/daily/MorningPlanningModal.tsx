import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFC665] uppercase tracking-wider font-mono">
              <Target className="size-3.5" />
              <span>Morning Planning Protocol</span>
            </div>
            <h2 id="morning-modal-title" className="text-xl font-bold text-[#F1F5F9] mt-0.5 font-mono">
              Plan Today's Execution ({todayDate})
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Morning Planning modal"
            className="p-1 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors focus:outline-none focus:ring-1 focus:ring-[#FFC665]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          {/* Input 1: Available Time */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <label htmlFor="morning-available-time" className="text-[#8E98A8] font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Clock className="size-3.5 text-[#FFC665]" /> Available Time
            </label>
            <select
              id="morning-available-time"
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(Number(e.target.value))}
              className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-2 rounded-[4px] border border-[#262D38] focus:outline-none focus:border-[#3B4556]"
            >
              <option value={60}>60 minutes (1 hr)</option>
              <option value={120}>120 minutes (2 hrs)</option>
              <option value={180}>180 minutes (3 hrs)</option>
              <option value={240}>240 minutes (4 hrs)</option>
              <option value={300}>300 minutes (5 hrs)</option>
            </select>
          </div>

          {/* Input 2: Energy Level */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <label htmlFor="morning-energy-level" className="text-[#8E98A8] font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Zap className="size-3.5 text-amber-400" /> Energy Level
            </label>
            <select
              id="morning-energy-level"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-2 rounded-[4px] border border-[#262D38] focus:outline-none focus:border-[#3B4556] capitalize"
            >
              <option value="low">Low Energy</option>
              <option value="medium">Medium Energy</option>
              <option value="high">High Energy</option>
            </select>
          </div>

          {/* Input 3: Placement Mode */}
          <div className="space-y-1.5 p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <label htmlFor="morning-placement-mode" className="text-[#8E98A8] font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Target className="size-3.5 text-[#FFC665]" /> Workload Mode
            </label>
            <select
              id="morning-placement-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as PlacementMode)}
              className="w-full bg-[#14171D] text-[#F1F5F9] font-bold p-2 rounded-[4px] border border-[#262D38] focus:outline-none focus:border-[#3B4556]"
            >
              <option value="normal">Normal Workload</option>
              <option value="reduced">Reduced Workload</option>
              <option value="exam">Exam Mode</option>
              <option value="placement_sprint">Placement Sprint</option>
            </select>
          </div>
        </div>

        {/* Calculated Time Budget Banner */}
        <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-xs flex items-center justify-between text-[#8E98A8] font-mono">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#FFC665]" />
            <span>
              Calculated Budget for <strong className="text-[#F1F5F9]">{mode}</strong> mode:
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-[#FFC665]">
            {totalSelectedMinutes}m / {timeBudget}m allocated
          </span>
        </div>

        {/* Selected Tasks List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider font-mono">
            Deterministic Recommended Plan ({selectedCandidates.length} Tasks)
          </h4>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {selectedCandidates.length === 0 ? (
              <div className="p-4 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-center text-xs text-[#8E98A8]">
                No tasks selected for this time budget. Increase available time or adjust mode.
              </div>
            ) : (
              selectedCandidates.map((c) => {
                const domain = domains.find((d) => d.id === c.task.domainId);
                return (
                  <div
                    key={c.task.id}
                    className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {domain && (
                            <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#14171D] text-[#8E98A8] border border-[#262D38]">
                              {domain.shortName}
                            </span>
                          )}
                          <span className="font-semibold text-[#F1F5F9]">{c.task.title}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[#FFC665]">
                          Score: {c.breakdown.finalScore}/100
                        </span>
                        <span className="block text-[11px] text-[#8E98A8] font-mono">
                          {c.task.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#8E98A8] flex items-center gap-1 italic">
                      <AlertCircle className="size-3 text-[#5C6675] shrink-0" />
                      <span>{c.breakdown.explanation}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262D38]">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={selectedCandidates.length === 0}
            className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-mono font-bold rounded-[4px]"
          >
            <CheckCircle2 className="size-3.5 mr-1" /> Commit Today's Plan
          </Button>
        </div>
      </div>
    </div>
  );
};
