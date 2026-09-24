import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { Code2, ExternalLink, Calendar, RotateCcw } from 'lucide-react';

export const DSAView: React.FC = () => {
  const { dsaProblems, dsaProgress } = usePlacement();

  const boxColors: Record<number, string> = {
    1: 'bg-rose-950 text-rose-300 border-rose-800/60',
    2: 'bg-amber-950 text-amber-300 border-amber-800/60',
    3: 'bg-blue-950 text-blue-300 border-blue-800/60',
    4: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
  };

  const boxIntervals: Record<number, string> = {
    1: '1 day interval',
    2: '3 days interval',
    3: '7 days interval',
    4: '14 days interval',
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          <Code2 className="size-3.5" />
          <span>Spaced Repetition & Practice</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-1">DSA Problem Bank & Leitner Boxes</h2>
        <p className="text-sm text-slate-400 mt-1">
          Algorithmic problems backed by a deterministic 4-box Leitner spaced repetition system.
        </p>
      </div>

      {/* Leitner Box Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((boxNum) => (
          <div key={boxNum} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span>Box {boxNum}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${boxColors[boxNum]}`}>
                {boxIntervals[boxNum]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {boxNum === 1
                ? 'Daily review for weak / new problems.'
                : boxNum === 2
                ? 'Review every 3 days.'
                : boxNum === 3
                ? 'Review every week.'
                : 'Mastered (review bi-weekly).'}
            </p>
          </div>
        ))}
      </div>

      {/* Problem Catalog Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">Problem Catalog</h3>
          <span className="text-xs text-slate-400 font-mono">{dsaProblems.length} Problems Seeded</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {dsaProblems.map((prob) => {
            const prog = dsaProgress[prob.id];
            const currentBox = prog?.currentBox || 1;

            return (
              <div
                key={prob.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        prob.difficulty === 'easy'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : prob.difficulty === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {prob.pattern}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    {prob.title}
                    {prob.leetcodeUrl && (
                      <a
                        href={prob.leetcodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </h4>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {prog ? (
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-slate-400 font-medium">Leitner:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${boxColors[currentBox]}`}>
                          Box {currentBox}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                        <Calendar className="size-3 text-amber-400" />
                        Next: {prog.nextReviewAt}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic flex items-center gap-1">
                      <RotateCcw className="size-3" /> Unpracticed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
