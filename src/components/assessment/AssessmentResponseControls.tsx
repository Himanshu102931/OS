import React from 'react';
import { HelpCircle, RefreshCw } from 'lucide-react';
import type { AssessmentConfidence } from '../../types';

interface AssessmentResponseControlsProps {
  currentResponse: {
    response: number | string;
    confidence?: AssessmentConfidence;
    result: string;
  } | undefined;
  onAnswerChange: (userResponse: number | string | null, confidence?: AssessmentConfidence) => void;
  onConfidenceChange: (confidence: AssessmentConfidence) => void;
}

export const AssessmentResponseControls: React.FC<AssessmentResponseControlsProps> = ({
  currentResponse,
  onAnswerChange,
  onConfidenceChange,
}) => {
  const isDontKnow = currentResponse?.response === 'dont_know';
  const hasResponse = currentResponse && currentResponse.response !== 'unanswered';

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      {/* Honesty Action & Clear Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onAnswerChange('dont_know')}
          className={`px-3 py-1.5 rounded text-xs transition-colors border flex items-center gap-1.5 cursor-pointer ${
            isDontKnow
              ? 'bg-amber-950/30 border-amber-600/70 text-amber-300 font-medium'
              : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-border-active'
          }`}
          title="Flag as 'I don't know' without guessing. This separates lack of knowledge from unlucky guessing and prevents chance-correction penalties."
        >
          <HelpCircle className="size-3.5 text-amber-400" aria-hidden="true" />
          <span>I don&apos;t know this concept</span>
        </button>

        {hasResponse && (
          <button
            type="button"
            onClick={() => onAnswerChange(null)}
            className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            <span>Clear response</span>
          </button>
        )}
      </div>

      {/* Confidence Self-Reporting (3-Tier) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-medium text-foreground">How confident are you in this answer?</span>
            <span className="text-[11px] text-secondary">(Used for error diagnosis only; never alters points)</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['guessing', 'somewhat', 'confident'] as const).map((conf) => {
            const isConfSelected = currentResponse?.confidence === conf;
            return (
              <button
                key={conf}
                type="button"
                onClick={() => onConfidenceChange(conf)}
                className={`py-1.5 px-3 rounded text-xs capitalize transition-all border cursor-pointer ${
                  isConfSelected
                    ? 'bg-surface-elevated border-action-accent text-action-accent font-semibold ring-1 ring-action-accent'
                    : 'bg-background/60 border-border text-muted-foreground hover:text-foreground hover:bg-surface-elevated/40'
                }`}
              >
                {conf === 'somewhat' ? 'Somewhat confident' : conf}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
