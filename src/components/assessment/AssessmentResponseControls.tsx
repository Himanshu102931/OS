import React from 'react';
import { HelpCircle, RefreshCw } from 'lucide-react';
import type { AssessmentConfidence } from '../../types';

interface AssessmentResponseControlsProps {
  currentResponse: {
    response: number | string;
    confidence?: AssessmentConfidence;
    result: string;
    unfamiliarTopic?: boolean;
  } | undefined;
  onAnswerChange: (userResponse: number | string | null, confidence?: AssessmentConfidence, unfamiliarTopic?: boolean) => void;
  onConfidenceChange: (confidence: AssessmentConfidence) => void;
  onUnfamiliarityChange?: (unfamiliar: boolean) => void;
}

export const AssessmentResponseControls: React.FC<AssessmentResponseControlsProps> = ({
  currentResponse,
  onAnswerChange,
  onConfidenceChange,
  onUnfamiliarityChange,
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
            onClick={() => onAnswerChange(null, undefined, currentResponse?.unfamiliarTopic)}
            className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            <span>Clear response</span>
          </button>
        )}
      </div>

      {/* Optional Unfamiliarity / Learning Gap Flag (Phase 4) */}
      <div className="pt-1">
        <label
          data-testid="unfamiliar-topic-control"
          className="flex items-start gap-2.5 p-2.5 rounded-md border border-border/80 bg-surface-subtle/40 hover:bg-surface-subtle transition-colors cursor-pointer select-none"
        >
          <input
            type="checkbox"
            name="unfamiliarTopic"
            id="unfamiliar-topic-checkbox"
            data-testid="unfamiliar-topic-checkbox"
            checked={Boolean(currentResponse?.unfamiliarTopic)}
            onChange={(e) => {
              if (onUnfamiliarityChange) {
                onUnfamiliarityChange(e.target.checked);
              } else {
                onAnswerChange(currentResponse ? currentResponse.response : null, currentResponse?.confidence, e.target.checked);
              }
            }}
            className="size-4 mt-0.5 rounded border-border text-accent focus:ring-accent cursor-pointer accent-accent"
          />
          <div className="flex-1 text-xs space-y-0.5">
            <span className="font-medium text-foreground block">
              I haven&apos;t properly learned this topic / I need to study it
            </span>
            <span className="text-[11px] text-text-tertiary block leading-relaxed">
              Flags this topic for targeted review and proof-building practice without lowering your test points.
            </span>
          </div>
        </label>
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
