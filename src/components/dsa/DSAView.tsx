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
    1: 'bg-rose-500/10 text-rose-300 border-rose-500/30 glow-rose',
    2: 'bg-amber-500/10 text-amber-300 border-amber-500/30 glow-amber',
    3: 'bg-blue-500/10 text-blue-300 border-blue-500/30 glow-blue',
    4: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 glow-emerald',
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
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Code2 className="size-3.5" />
            <span>Spaced Repetition & Practice</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            DSA Problem Bank & Leitner Boxes
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-1">
            Algorithmic problems backed by a deterministic 4-box Leitner spaced repetition system.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 text-xs shadow-inner">
          <span className="text-slate-400 font-medium px-2">Difficulty:</span>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-slate-950 text-slate-100 font-bold p-1.5 rounded-xl border border-slate-800 focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Leitner Box Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((boxNum) => (
          <div key={boxNum} className="glass-card p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between font-bold text-white text-sm">
              <span>Box {boxNum}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${boxColors[boxNum]}`}>
                {boxIntervals[boxNum]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-snug">
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
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">Problem Catalog</h3>
          <span className="text-xs text-slate-400 font-mono font-semibold">{filteredProblems.length} Problems</span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredProblems.map((prob) => {
            const prog = dsaProgress[prob.id];
            const currentBox = prog?.currentBox || 1;
            const attempts = dsaAttempts.filter((a) => a.problemId === prob.id);
            const isShowingHistory = showHistoryForId === prob.id;

            return (
              <div key={prob.id} className="p-5 space-y-3 hover:bg-slate-900/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                          prob.difficulty === 'easy'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : prob.difficulty === 'medium'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {prob.difficulty}
                      </span>
                      <span className="text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-xl border border-slate-800">
                        {prob.pattern}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                      {prob.title}
                      {prob.leetcodeUrl && (
                        <a
                          href={prob.leetcodeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {prog ? (
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-slate-400 font-medium">Leitner:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${boxColors[currentBox]}`}>
                            Box {currentBox}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 justify-end font-semibold">
                          <Calendar className="size-3.5 text-amber-400" />
                          Next: {prog.nextReviewAt}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic font-medium flex items-center gap-1">
                        <RotateCcw className="size-3.5" /> Unpracticed
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      {attempts.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowHistoryForId(isShowingHistory ? null : prob.id)}
                          className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                        >
                          <History className="size-3.5 mr-1 text-indigo-400" /> {attempts.length} Attempts
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleOpenAttempt(prob)}
                        className="text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20"
                      >
                        <PlusCircle className="size-3.5 mr-1" /> Log Attempt
                      </Button>
                    </div>
                  </div>
                </div>

                {/* History Drawer */}
                {isShowingHistory && (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/5 space-y-2.5 text-xs">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <History className="size-4 text-indigo-400" /> Attempt History Log
                    </div>
                    <div className="space-y-2">
                      {attempts.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`font-bold uppercase px-2 py-0.5 rounded-full text-[10px] ${
                                att.result === 'pass'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  : att.result === 'partial'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {att.result}
                            </span>
                            <span className="text-slate-300">Assistance: <strong className="text-white">{att.assistanceLevel}</strong></span>
                            {att.notes && <span className="text-slate-400 italic max-w-xs truncate font-serif">"{att.notes}"</span>}
                          </div>

                          <div className="text-right text-slate-400 font-mono text-[11px]">
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
