import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { ExternalLink, Filter, PlusCircle, History } from 'lucide-react';
import { Button } from '../ui/button';

export const DSAView: React.FC = () => {
  const { dsaProblems, dsaProgress, dsaAttempts, logDSAAttempt } = usePlacement();
  const [selectedProblem, setSelectedProblem] = useState<DSAProblem | null>(null);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState<boolean>(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [showHistoryForId, setShowHistoryForId] = useState<string | null>(null);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            DSA Problem Tracker
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Algorithmic practice backed by a deterministic 4-box Leitner spaced repetition system (1, 3, 7, 14 days)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs">
          <Filter className="size-3.5 text-zinc-400" />
          <span className="text-zinc-500 font-medium">Difficulty:</span>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-zinc-900">All</option>
            <option value="easy" className="bg-zinc-900">Easy</option>
            <option value="medium" className="bg-zinc-900">Medium</option>
            <option value="hard" className="bg-zinc-900">Hard</option>
          </select>
        </div>
      </div>

      {/* Leitner System Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="app-surface p-2.5">
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Box 1</span>
            <span className="font-mono text-zinc-300">1 Day</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Daily practice / new</p>
        </div>
        <div className="app-surface p-2.5">
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Box 2</span>
            <span className="font-mono text-zinc-300">3 Days</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Review every 3d</p>
        </div>
        <div className="app-surface p-2.5">
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Box 3</span>
            <span className="font-mono text-zinc-300">7 Days</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Review weekly</p>
        </div>
        <div className="app-surface p-2.5">
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Box 4</span>
            <span className="font-mono text-zinc-300">14 Days</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Mastered</p>
        </div>
      </div>

      {/* Problem Catalog Table */}
      <div className="app-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300">
          <span>Problem Catalog</span>
          <span className="font-mono text-zinc-400 font-normal">{filteredProblems.length} Problems</span>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-5">Problem</div>
          <div className="col-span-3">Pattern</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2 text-right">Box / Action</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-zinc-800/60">
          {filteredProblems.map((prob) => {
            const prog = dsaProgress[prob.id];
            const currentBox = prog?.currentBox || 1;
            const attempts = dsaAttempts.filter((a) => a.problemId === prob.id);
            const isShowingHistory = showHistoryForId === prob.id;

            return (
              <div key={prob.id} className="app-table-row p-3 sm:px-4 sm:py-2.5 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                  {/* Problem Name & Link */}
                  <div className="sm:col-span-5 flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-100">{prob.title}</span>
                    {prob.leetcodeUrl && (
                      <a
                        href={prob.leetcodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-indigo-400 transition-colors"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  {/* Pattern */}
                  <div className="sm:col-span-3 text-xs text-zinc-400">
                    {prob.pattern}
                  </div>

                  {/* Difficulty */}
                  <div className="sm:col-span-2 text-xs">
                    <span
                      className={`capitalize text-[11px] font-medium px-1.5 py-0.2 rounded border ${
                        prob.difficulty === 'easy'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          : prob.difficulty === 'medium'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </div>

                  {/* Box / Next Review & Action */}
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    {prog ? (
                      <span className="text-[11px] font-mono text-zinc-400">
                        Box {currentBox}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-600 font-mono">New</span>
                    )}

                    {attempts.length > 0 && (
                      <button
                        onClick={() => setShowHistoryForId(isShowingHistory ? null : prob.id)}
                        className="text-zinc-500 hover:text-zinc-300 p-1"
                        title="View Attempt History"
                      >
                        <History className="size-3.5" />
                      </button>
                    )}

                    <Button
                      size="xs"
                      onClick={() => handleOpenAttempt(prob)}
                      className="h-6 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/80 px-2"
                    >
                      <PlusCircle className="size-3 mr-1" /> Log
                    </Button>
                  </div>
                </div>

                {/* Inline History Log */}
                {isShowingHistory && (
                  <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
                    <div className="font-medium text-zinc-300 text-[11px]">Attempt History Log</div>
                    <div className="space-y-1">
                      {attempts.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-1.5 rounded bg-zinc-950 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-300 uppercase">{att.result}</span>
                            <span className="text-zinc-500">· Assistance: {att.assistanceLevel}</span>
                          </div>
                          <span className="font-mono text-zinc-500">{att.timeTakenMinutes}m · {att.date}</span>
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
