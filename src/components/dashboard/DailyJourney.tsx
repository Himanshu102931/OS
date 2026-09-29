import React, { useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { CandidateTask } from '../../engine/adaptiveEngine';
import type { RoutePath } from '../../context/PlacementContext';
import {
  Compass, BookOpen, Target, Zap, ShieldCheck,
} from 'lucide-react';

export interface DailyJourneyProps {
  /**
   * C6 — the ONE canonical candidate evaluation for Today, computed by the
   * parent (DashboardView) from the full live application state. DailyJourney
   * must never re-run `getEvaluatedCandidates` with shadow defaults, otherwise
   * the journey can describe a different task than the primary action above it.
   */
  candidates: CandidateTask[];
}

const JOURNEY_STAGES = [
  { id: 'focus', label: 'FOCUS', icon: Compass, desc: 'Set your intention' },
  { id: 'learn', label: 'LEARN', icon: BookOpen, desc: 'Study core material' },
  { id: 'practice', label: 'PRACTICE', icon: Target, desc: 'Apply with drills' },
  { id: 'prove', label: 'PROVE', icon: Zap, desc: 'Demonstrate mastery' },
  { id: 'adapt', label: 'ADAPT', icon: ShieldCheck, desc: 'Adjust strategy' },
];

export const DailyJourney: React.FC<DailyJourneyProps> = ({ candidates }) => {
  const { taskProgress, setRoute } = usePlacement();

  // Canonical primary candidate — shared with DashboardView's primary action
  // and TodayHeroVisual, so all three sections describe the same task.
  const primary = candidates[0];

  const currentStageIndex = useMemo(() => {
    if (!primary) return 4;
    const state = taskProgress[primary.task.id]?.state;
    if (state === 'completed') return 3;
    if (state === 'in_progress') return 2;
    return 0;
  }, [primary, taskProgress]);

  const progress = ((currentStageIndex + 1) / JOURNEY_STAGES.length) * 100;

  return (
    <section
      className="space-y-4"
      data-testid="daily-journey"
      data-candidate-task-id={primary?.task.id ?? ''}
      data-candidate-task-title={primary?.task.title ?? ''}
      data-candidate-score={primary?.breakdown?.finalScore ?? ''}
      data-candidate-reason={primary?.breakdown?.explanation ?? ''}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
          <Compass className="size-4 text-[#E5A93C]" /> Daily Journey
        </h3>
        <span className="text-[10px] font-mono text-[#5C6675]">Stage {currentStageIndex + 1} of {JOURNEY_STAGES.length}</span>
      </div>

      <div className="relative bg-[#14171D] border border-[#262D38] rounded-xl p-5">
        <div className="absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2 bg-[#262D38] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, background: 'linear-gradient(to right, #E5A93C, #FFC665)' }} />
        </div>
        <div className="relative flex items-center justify-between">
          {JOURNEY_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isUpcoming = index > currentStageIndex;
            return (
              <div key={stage.id} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${isActive ? 'bg-[#E5A93C] shadow-lg shadow-[#E5A93C]/30 scale-110' : ''} ${isCompleted ? 'bg-[#10B981] shadow-md shadow-[#10B981]/20' : ''} ${isUpcoming ? 'bg-[#1B2028] border-2 border-[#262D38]' : ''}`}
                  onClick={() => {
                    if (isCompleted || isActive) {
                      const stageRoutes: Record<string, RoutePath> = { focus: 'preparation', learn: 'preparation', practice: 'practice', prove: 'dsa', adapt: 'skills' };
                      setRoute(stageRoutes[stage.id] || 'dashboard');
                    }
                  }}
                  role="button" aria-label={`${stage.label}: ${stage.desc}`} tabIndex={0}
                >
                  {isCompleted ? <CheckIcon /> : <Icon className={`size-5 ${isActive ? 'text-[#432C00]' : 'text-[#8E98A8]'}`} />}
                </div>
                <span className={`text-[9px] font-bold tracking-widest mt-2 ${isActive ? 'text-[#FFC665]' : isCompleted ? 'text-[#10B981]' : 'text-[#5C6675]'}`}>{stage.label}</span>
                <span className="text-[8px] text-[#5C6675] mt-0.5 hidden sm:block">{stage.desc}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-[#262D38]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9]">{JOURNEY_STAGES[currentStageIndex].label}</h4>
              <p className="text-xs text-[#8E98A8] mt-0.5">{JOURNEY_STAGES[currentStageIndex].desc}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-[#E5A93C]">{currentStageIndex + 1}/{JOURNEY_STAGES.length}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
