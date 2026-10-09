import React from 'react';
import type { UserSettings, PlacementMode, Phase } from '../../types';
import { Target, Calendar, Activity, Clock, Code2, Layers, Sparkles } from 'lucide-react';

interface StudyParametersSectionProps {
  userSettings: UserSettings;
  phases: Phase[];
  onUpdate: (partial: Partial<UserSettings>, notifyMessage?: string) => void;
}

export const StudyParametersSection: React.FC<StudyParametersSectionProps> = ({
  userSettings,
  phases,
  onUpdate,
}) => {
  const modeDescriptions: Record<PlacementMode, string> = {
    normal: 'Standard balanced daily workload across roadmap milestones, DSA reviews, and practice drills.',
    reduced: 'Lightened study budget and lower urgency pace for busy academic periods or recovery.',
    exam: 'Pauses non-essential long-horizon topics to prioritize immediate academic course exams.',
    placement_sprint: 'High-intensity sprint mode prioritizing target company requirements and core weaknesses.',
  };

  return (
    <section
      aria-labelledby="study-parameters-heading"
      className="bg-surface-panel border border-border-default rounded-[4px] p-5 sm:p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-[4px] bg-surface-subtle border border-border-default flex items-center justify-center text-info">
            <Target className="size-4" />
          </div>
          <div>
            <h2 id="study-parameters-heading" className="text-sm font-semibold text-text-primary flex items-center gap-2">
              Study Horizon & Operational Parameters
            </h2>
            <p className="text-[11px] text-text-secondary">
              Directly influences candidate task ranking, daily capacities, and adaptive scoring weights.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-[4px] bg-info/10 border border-info/30 text-info text-[11px] font-medium">
          <Sparkles className="size-3" />
          <span>Affects Adaptive Engine</span>
        </div>
      </div>

      {/* Grid of Primary Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Target Placement Goal (Fixes C9 Regression) */}
        <div className="space-y-1.5">
          <label htmlFor="targetPlacementGoal" className="block text-xs font-medium text-text-primary">
            Target Career Goal / Objective
          </label>
          <div className="relative">
            <input
              id="targetPlacementGoal"
              type="text"
              value={userSettings.targetPlacementGoal || ''}
              onChange={(e) => onUpdate({ targetPlacementGoal: e.target.value })}
              onBlur={() => onUpdate({ targetPlacementGoal: userSettings.targetPlacementGoal }, 'Target career goal updated')}
              placeholder="e.g. Software Engineer (SDE-1)"
              className="w-full bg-surface-subtle border border-border-default focus:border-info rounded-[4px] px-3 py-2 text-xs text-text-primary font-mono placeholder-text-tertiary focus:outline-none transition-colors"
              aria-describedby="target-goal-helper"
            />
          </div>
          <p id="target-goal-helper" className="text-[10px] text-text-tertiary">
            Primary engineering role or placement ambition tracked across telemetry and defense consoles.
          </p>
        </div>

        {/* Placement Horizon Target Date */}
        <div className="space-y-1.5">
          <label htmlFor="placementHorizonDate" className="block text-xs font-medium text-text-primary flex items-center gap-1.5">
            <Calendar className="size-3.5 text-info" />
            <span>Placement Horizon Target Date</span>
          </label>
          <input
            id="placementHorizonDate"
            type="date"
            value={userSettings.placementHorizonDate || '2027-05-31'}
            onChange={(e) => {
              onUpdate({ placementHorizonDate: e.target.value }, 'Placement horizon date updated');
            }}
            className="w-full bg-surface-subtle border border-border-default focus:border-info rounded-[4px] px-3 py-2 text-xs text-text-primary font-mono focus:outline-none transition-colors"
            aria-describedby="horizon-date-helper"
          />
          <p id="horizon-date-helper" className="text-[10px] text-text-tertiary">
            Governs the dynamic Urgency Multiplier in the 6-factor adaptive scoring engine.
          </p>
        </div>

        {/* Target Phase Selection */}
        <div className="space-y-1.5">
          <label htmlFor="targetPhaseId" className="block text-xs font-medium text-text-primary flex items-center gap-1.5">
            <Layers className="size-3.5 text-info" />
            <span>Active Target Phase</span>
          </label>
          <select
            id="targetPhaseId"
            value={userSettings.targetPhaseId || 'phase-1'}
            onChange={(e) => {
              onUpdate({ targetPhaseId: e.target.value }, 'Target phase updated');
            }}
            className="w-full bg-surface-subtle border border-border-default focus:border-info rounded-[4px] px-3 py-2 text-xs text-text-primary focus:outline-none transition-colors cursor-pointer"
            aria-describedby="target-phase-helper"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface-panel text-text-primary">
                {p.name} ({p.startDate} to {p.endDate})
              </option>
            ))}
          </select>
          <p id="target-phase-helper" className="text-[10px] text-text-tertiary">
            Determines active milestone filtering and roadmap progression pacing.
          </p>
        </div>

        {/* Placement Operating Mode */}
        <div className="space-y-1.5">
          <label htmlFor="placementMode" className="block text-xs font-medium text-text-primary flex items-center gap-1.5">
            <Activity className="size-3.5 text-info" />
            <span>Placement Operating Mode</span>
          </label>
          <select
            id="placementMode"
            value={userSettings.placementMode || 'normal'}
            onChange={(e) => {
              onUpdate({ placementMode: e.target.value as PlacementMode }, 'Placement operating mode updated');
            }}
            className="w-full bg-surface-subtle border border-border-default focus:border-info rounded-[4px] px-3 py-2 text-xs text-info font-semibold focus:outline-none transition-colors cursor-pointer"
            aria-describedby="placement-mode-helper"
          >
            <option value="normal" className="bg-surface-panel text-text-primary">Normal Mode (Standard daily load)</option>
            <option value="reduced" className="bg-surface-panel text-text-primary">Reduced Mode (Light work schedule)</option>
            <option value="exam" className="bg-surface-panel text-text-primary">Exam Mode (Pause non-essential topics)</option>
            <option value="placement_sprint" className="bg-surface-panel text-text-primary">Placement Sprint (High priority sprint)</option>
          </select>
          <p id="placement-mode-helper" className="text-[10px] text-text-tertiary">
            {modeDescriptions[userSettings.placementMode || 'normal']}
          </p>
        </div>
      </div>

      {/* Capacity & Quota Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border-default">
        {/* Daily Study Budget Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="dailyStudyMinutes" className="text-xs font-medium text-text-primary flex items-center gap-1.5">
              <Clock className="size-3.5 text-info" />
              <span>Daily Study Time Budget</span>
            </label>
            <span className="font-mono text-xs font-bold text-info bg-surface-subtle px-2 py-0.5 rounded border border-border-default">
              {userSettings.dailyStudyMinutes} min ({(userSettings.dailyStudyMinutes / 60).toFixed(1)} hrs)
            </span>
          </div>
          <input
            id="dailyStudyMinutes"
            type="range"
            min={30}
            max={480}
            step={15}
            value={userSettings.dailyStudyMinutes || 120}
            onChange={(e) => onUpdate({ dailyStudyMinutes: Number(e.target.value) })}
            onMouseUp={() => onUpdate({ dailyStudyMinutes: userSettings.dailyStudyMinutes }, 'Daily study budget updated')}
            onTouchEnd={() => onUpdate({ dailyStudyMinutes: userSettings.dailyStudyMinutes }, 'Daily study budget updated')}
            className="w-full h-1.5 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-info"
            aria-describedby="study-minutes-helper"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
            <span>30m</span>
            <span>120m (Default)</span>
            <span>240m</span>
            <span>480m (8h)</span>
          </div>
          <p id="study-minutes-helper" className="text-[10px] text-text-tertiary">
            Total daily study time capacity allocated when assembling the morning plan on Today.
          </p>
        </div>

        {/* DSA Daily Problem Cap Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="dsaDailyCap" className="text-xs font-medium text-text-primary flex items-center gap-1.5">
              <Code2 className="size-3.5 text-info" />
              <span>Daily DSA Problem Quota</span>
            </label>
            <span className="font-mono text-xs font-bold text-info bg-surface-subtle px-2 py-0.5 rounded border border-border-default">
              {userSettings.dsaDailyCap} problems / day
            </span>
          </div>
          <input
            id="dsaDailyCap"
            type="range"
            min={1}
            max={15}
            step={1}
            value={userSettings.dsaDailyCap || 5}
            onChange={(e) => onUpdate({ dsaDailyCap: Number(e.target.value) })}
            onMouseUp={() => onUpdate({ dsaDailyCap: userSettings.dsaDailyCap }, 'DSA daily problem cap updated')}
            onTouchEnd={() => onUpdate({ dsaDailyCap: userSettings.dsaDailyCap }, 'DSA daily problem cap updated')}
            className="w-full h-1.5 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-info"
            aria-describedby="dsa-cap-helper"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
            <span>1 problem</span>
            <span>5 (Default)</span>
            <span>10</span>
            <span>15 max</span>
          </div>
          <p id="dsa-cap-helper" className="text-[10px] text-text-tertiary">
            Maximum number of active Leitner review and new DSA challenges recommended daily.
          </p>
        </div>
      </div>
    </section>
  );
};
