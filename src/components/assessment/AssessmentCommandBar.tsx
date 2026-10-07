import React from 'react';
import { Clock } from 'lucide-react';
import type { AssessmentAttempt, AssessmentItem } from '../../types';

interface AssessmentCommandBarProps {
  attempt: AssessmentAttempt;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  timeRemainingSeconds: number;
  currentItem?: AssessmentItem;
  onSubmitClick: () => void;
  onCancelClick: () => void;
}

export const AssessmentCommandBar: React.FC<AssessmentCommandBarProps> = ({
  attempt,
  currentIndex,
  totalCount,
  answeredCount,
  timeRemainingSeconds,
  currentItem,
  onSubmitClick,
  onCancelClick,
}) => {
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isTimerUrgent = timeRemainingSeconds < 15 * 60;
  const isTimerCritical = timeRemainingSeconds < 5 * 60;

  const getDifficultyLabel = (diff?: number) => {
    switch (diff) {
      case 1: return 'Easy (0.8x)';
      case 2: return 'Medium (1.0x)';
      case 3: return 'Hard (1.3x)';
      case 4: return 'Very Hard (1.7x)';
      default: return 'Standard (1.0x)';
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'weekly_assessment': return 'Sunday Adaptive Mini Test';
      case 'full_reassessment': return 'Full Diagnostic Reassessment';
      default: return 'Baseline Diagnostic';
    }
  };

  return (
    <div
      data-testid="assessment-command-bar"
      className="bg-[#14171D] border border-[#262D38] rounded-md p-4 sticky top-16 z-30 shadow-lg backdrop-blur-md space-y-3"
      aria-label="Assessment Control Bar"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Test Identity & Question Count */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#1B2028] text-[#EAB308] border border-[#3B4556]">
            {getKindLabel(attempt.kind)}
          </span>

          <span className="text-sm font-semibold text-[#F1F5F9]">
            Question {currentIndex + 1} of {totalCount}
          </span>

          <span className="text-xs text-[#8E98A8]">
            ({answeredCount} answered, {totalCount - answeredCount} remaining)
          </span>
        </div>

        {/* Right: Countdown Timer & Submission Trigger */}
        <div className="flex items-center gap-4">
          {/* Authoritative Wall-Clock Timer */}
          <div
            data-testid="assessment-timer"
            aria-live="polite"
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-sm font-semibold border transition-colors ${
              isTimerCritical
                ? 'bg-red-950/40 text-red-400 border-red-800 animate-pulse'
                : isTimerUrgent
                ? 'bg-amber-950/40 text-amber-400 border-amber-800'
                : 'bg-[#1B2028] text-[#F1F5F9] border-[#262D38]'
            }`}
            title="Authoritative wall-clock time limit. Auto-submits upon expiration."
          >
            <Clock className="size-4 text-[#EAB308]" aria-hidden="true" />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          {/* Cancel Assessment (Secondary) */}
          <button
            data-testid="assessment-cancel-btn"
            onClick={onCancelClick}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] hover:bg-[#262D38] text-[#D05A52] border border-[#D05A52]/40 transition-colors cursor-pointer"
            title="Cancel and discard this assessment attempt"
          >
            Cancel Assessment
          </button>

          {/* Submit Action (Primary) */}
          <button
            data-testid="assessment-finish-btn"
            onClick={onSubmitClick}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#EAB308] hover:bg-[#CA8A04] text-[#0D0F12] border border-[#EAB308]/40 transition-colors cursor-pointer"
          >
            Finish & Submit
          </button>
        </div>
      </div>

      {/* Module Context Strip */}
      <div className="pt-3 border-t border-[#262D38]/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8E98A8]">
        <div className="flex items-center gap-2">
          <span className="text-[#EAB308] font-medium uppercase tracking-wide">
            Domain: {currentItem?.domainId.toUpperCase()}
          </span>
          <span>·</span>
          <span className="text-[#CBD5E1]">{currentItem?.competency}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="capitalize px-2 py-0.5 rounded bg-[#1B2028] text-[11px] border border-[#262D38]">
            Difficulty: {getDifficultyLabel(currentItem?.difficulty)}
          </span>
          <span>Est: ~{currentItem?.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  );
};