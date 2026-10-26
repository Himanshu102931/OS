import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  TEACHER_EIGHT_DAY_DSA_CHALLENGE,
  type TeacherChallengeModule,
} from '../../data/teacherEightDayDSAChallenge';
import { isBaselineCompleted } from '../../engine/assessmentEngine';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';

interface DSAChallengeTodayCardProps {
  onNavigateToChallenge: () => void;
}

export const DSAChallengeTodayCard: React.FC<DSAChallengeTodayCardProps> = ({
  onNavigateToChallenge,
}) => {
  const { dsaChallengeState, dsaProgress, assessmentState } = usePlacement();

  const isAssessed = isBaselineCompleted(assessmentState);
  const currentDay = dsaChallengeState.currentDay || 1;

  const currentModule: TeacherChallengeModule =
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === currentDay) ||
    TEACHER_EIGHT_DAY_DSA_CHALLENGE[0];

  // Find next best step in current module
  let nextStep: {
    type: 'guided' | 'independent' | 'completed';
    problem: (typeof currentModule.guided)[0] | (typeof currentModule.independent)[0] | null;
    label: string;
    focus: string;
  };

  // 1. Look for uncompleted guided walkthrough
  const uncompletedGuided = currentModule.guided.find(
    (p) => !dsaChallengeState.itemProgress[p.leetcodeNumber]?.guidedCompleted
  );

  if (uncompletedGuided) {
    nextStep = {
      type: 'guided',
      problem: uncompletedGuided,
      label: `Guided Walkthrough: #${uncompletedGuided.leetcodeNumber} ${uncompletedGuided.title}`,
      focus: uncompletedGuided.teachingFocus,
    };
  } else {
    // 2. Look for unpassed independent problem
    const unpassedIndependent = currentModule.independent.find((p) => {
      const isIndepPassed = p.canonicalProblemId
        ? Boolean(dsaProgress[p.canonicalProblemId]?.passedIndependently)
        : Boolean(dsaChallengeState.itemProgress[p.leetcodeNumber]?.externalPassedIndependently);
      return !isIndepPassed;
    });

    if (unpassedIndependent) {
      nextStep = {
        type: 'independent',
        problem: unpassedIndependent,
        label: `Independent Practice: #${unpassedIndependent.leetcodeNumber} ${unpassedIndependent.title}`,
        focus: unpassedIndependent.teachingFocus,
      };
    } else {
      // 3. Module completed!
      nextStep = {
        type: 'completed',
        problem: null,
        label: `Module ${currentDay} Fully Mastered`,
        focus: 'Advance to next module when ready.',
      };
    }
  }

  // Calculate module completion stats
  let completedCount = 0;
  for (const p of [...currentModule.guided, ...currentModule.independent]) {
    const isPassed = p.canonicalProblemId
      ? Boolean(dsaProgress[p.canonicalProblemId]?.passedIndependently)
      : Boolean(dsaChallengeState.itemProgress[p.leetcodeNumber]?.externalPassedIndependently);
    if (isPassed) completedCount++;
  }
  const moduleProgress = { completed: completedCount, total: 10 };

  return (
    <div
      data-testid="dsa-challenge-today-card"
      className="bg-surface-panel border border-border-default hover:border-border-active rounded-xl p-4 sm:p-5 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-accent/10 text-accent border border-accent/30 flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            8-Day DSA Challenge
          </span>

          {!isAssessed ? (
            <span
              data-testid="challenge-exploratory-badge"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-info/10 text-info border border-info/20 flex items-center gap-1"
              title="Baseline diagnostic is pending. Challenge recommendations provide foundational practice."
            >
              Exploratory · Challenge Foundation
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-success/10 text-success border border-success/20 flex items-center gap-1">
              Active Track · Module {currentDay} of 8
            </span>
          )}

          <span className="text-xs text-text-tertiary font-mono">
            {moduleProgress.completed}/10 solved in Day {currentDay}
          </span>
        </div>

        <div>
          <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span>Day {currentDay}: {currentModule.title}</span>
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            <span className="text-text-primary font-medium">Next Step: </span>
            <span className="text-text-primary">{nextStep.label}</span>
            <span className="text-text-tertiary"> — {nextStep.focus}</span>
          </p>
        </div>

        {!isAssessed && (
          <div className="text-[11px] text-text-secondary flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="size-3.5 text-info shrink-0" />
            <span>
              Foundational problem sequence. Personalized ability calibration will activate after completing the baseline assessment.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        <Button
          size="sm"
          onClick={onNavigateToChallenge}
          data-testid="continue-challenge-button"
          className="bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold h-8 px-3.5 flex items-center gap-1.5 shadow-sm"
        >
          <span>Continue Challenge</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
