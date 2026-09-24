import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { Code2, ExternalLink, Calendar, RotateCcw, PlusCircle, History } from 'lucide-react';
import { Button } from '../ui/button';

export const DSAView: React.FC = () => {
  const { dsaProblems, dsaProgress, dsaAttempts, logDSAAttempt } = usePlacement();
  const [selectedProblem, setSelectedProblem] = useState<DSAProblem | null>(null);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState<boolean>(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [showHistoryForId, setShowHistoryForId] = useState<string | null>(null);

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

  const filteredProblems = dsaProblems.filter((p) => {
    if (filterDifficulty !== 'all' && p.difficulty !== filterDifficulty) return false;
    return true;
  });

  const handleOpenAttempt = (prob: DSAProblem) => {
    setSelectedProblem(prob);
    setIsAttemptModalOpen(true);
  };

  const handleSubmitAttempt = (
    attempt: DSAAttempt,
    updatedProgress: DSAProgress,
    evidenceScore: number
  ) => {
    logDSAAttempt(attempt, updatedProgress, evidenceScore);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs">
          <span className="text-slate-400 font-medium px-2">Difficulty:</span>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold p-1 rounded border border-slate-800 focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
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
          <span className="text-xs text-slate-400 font-mono">{filteredProblems.length} Problems</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredProblems.map((prob) => {
            const prog = dsaProgress[prob.id];
            const currentBox = prog?.currentBox || 1;
            const attempts = dsaAttempts.filter((a) => a.problemId === prob.id);
            const isShowingHistory = showHistoryForId === prob.id;

            return (
              <div key={prob.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-900/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                  <div className="flex items-center gap-3 text-xs">
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

                    <div className="flex items-center gap-2">
                      {attempts.length > 0 && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setShowHistoryForId(isShowingHistory ? null : prob.id)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          <History className="size-3 mr-1" /> {attempts.length} Attempts
                        </Button>
                      )}

                      <Button
                        size="xs"
                        onClick={() => handleOpenAttempt(prob)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                      >
                        <PlusCircle className="size-3 mr-1" /> Log Attempt
                      </Button>
                    </div>
                  </div>
                </div>

                {/* History Drawer */}
                {isShowingHistory && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="font-semibold text-slate-300 flex items-center gap-1">
                      <History className="size-3.5 text-indigo-400" /> Attempt History Log
                    </div>
                    <div className="space-y-1.5">
                      {attempts.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold uppercase px-1.5 py-0.5 rounded text-[10px] ${
                                att.result === 'pass'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : att.result === 'partial'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {att.result}
                            </span>
                            <span className="text-slate-400">Assistance: <strong>{att.assistanceLevel}</strong></span>
                            {att.notes && <span className="text-slate-300 italic max-w-xs truncate">"{att.notes}"</span>}
                          </div>

                          <div className="text-right text-slate-400 font-mono">
                            {att.timeTakenMinutes}m • {att.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt Logger Modal */}
      <DSAAttemptModal
        problem={selectedProblem}
        progress={selectedProblem ? dsaProgress[selectedProblem.id] : undefined}
        isOpen={isAttemptModalOpen}
        onClose={() => setIsAttemptModalOpen(false)}
        onSubmitAttempt={handleSubmitAttempt}
      />
    </div>
  );
};
