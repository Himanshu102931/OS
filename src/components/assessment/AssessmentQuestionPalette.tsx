import React from 'react';
import { Info } from 'lucide-react';
import type { AssessmentItem } from '../../types';

interface AssessmentQuestionPaletteProps {
  orderedItems: AssessmentItem[];
  currentIndex: number;
  answeredCount: number;
  totalCount: number;
  responseMap: Map<
    string,
    {
      response: number | string;
      confidence?: string;
      result: string;
    }
  >;
  onSelectIndex: (index: number) => void;
}

export const AssessmentQuestionPalette: React.FC<AssessmentQuestionPaletteProps> = ({
  orderedItems,
  currentIndex,
  answeredCount,
  totalCount,
  responseMap,
  onSelectIndex,
}) => {
  return (
    <aside aria-label="Question Palette" className="space-y-4">
      <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-4">
        {/* Header Count */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#CBD5E1]">
            Question Palette
          </h3>
          <span className="text-[11px] font-mono text-[#8E98A8]">
            <strong className="text-[#F1F5F9]">{answeredCount}</strong> / {totalCount}
          </span>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#8E98A8] pb-2 border-b border-[#262D38]">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-[#10B981]/20 border border-[#10B981]" aria-hidden="true" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-amber-950/40 border border-amber-500" aria-hidden="true" />
            <span>Don&apos;t know</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-[#1B2028] border border-[#3B4556]" aria-hidden="true" />
            <span>Unanswered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm border-2 border-[#EAB308]" aria-hidden="true" />
            <span>Current</span>
          </div>
        </div>

        {/* Items Grid */}
        <div
          role="navigation"
          aria-label="Questions list"
          className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5 max-h-[460px] overflow-y-auto pr-1"
        >
          {orderedItems.map((item, idx) => {
            const resp = responseMap.get(item.id);
            const isCurrent = idx === currentIndex;
            const isAnswered = resp && resp.response !== 'unanswered' && resp.response !== 'dont_know';
            const isDk = resp && resp.response === 'dont_know';

            let btnColor = 'bg-[#1B2028] text-[#8E98A8] border-[#262D38] hover:border-[#3B4556]';
            if (isAnswered) {
              btnColor = 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/60 font-semibold';
            } else if (isDk) {
              btnColor = 'bg-amber-950/40 text-amber-400 border-amber-600/60 font-medium';
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`h-7 rounded text-[11px] font-mono transition-all border flex items-center justify-center cursor-pointer ${btnColor} ${
                  isCurrent ? 'ring-2 ring-[#EAB308] border-[#EAB308] font-bold text-[#F1F5F9]' : ''
                }`}
                title={`Q${idx + 1}: ${item.domainId.toUpperCase()} · ${item.competency}${
                  isAnswered ? ' (Answered)' : isDk ? ' (Marked Unknown)' : ' (Unanswered)'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invariants Notice */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 space-y-2 text-[11px] text-[#8E98A8]">
        <div className="flex items-center gap-1.5 text-[#EAB308] font-medium">
          <Info className="size-3.5" aria-hidden="true" />
          <span>Deterministic Invariants</span>
        </div>
        <p className="leading-relaxed text-[#CBD5E1]">
          Scoring applies authored weights, chance correction, and module caps. Diagnostic testing never mutates normal DSA Leitner intervals or practice rungs.
        </p>
      </div>
    </aside>
  );
};
