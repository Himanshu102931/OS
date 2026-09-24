import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { ExternalLink, Filter, PlusCircle, History, Code2 } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            DSA Bank & Spaced Repetition
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Algorithmic practice backed by a deterministic 4-box Leitner spaced repetition system (1, 3, 7, 14 days)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 bg-[#14171D] border border-[#262D38] rounded-[4px] px-3 py-1.5 text-xs font-mono">
          <Filter className="size-3.5 text-[#E5A93C]" />
          <span className="text-[#8E98A8] font-medium">Difficulty:</span>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-transparent text-[#F1F5F9] font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-[#14171D]">All</option>
            <option value="easy" className="bg-[#14171D]">Easy</option>
            <option value="medium" className="bg-[#14171D]">Medium</option>
            <option value="hard" className="bg-[#14171D]">Hard</option>
          </select>
        </div>
      </div>

      {/* Leitner System 4-Box Segmented Rail (Stitch Design Reference) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="app-surface p-3 border-t-2 border-t-[#E5A93C]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#F1F5F9]">BOX 1</span>
            <span className="text-[10px] text-[#FFC665] bg-[#E5A93C]/10 border border-[#E5A93C]/30 px-1.5 py-0.2 rounded">1 Day</span>
          </div>
          <p className="text-[11px] text-[#8E98A8] mt-1">Daily review / New problems</p>
        </div>
        <div className="app-surface p-3 border-t-2 border-t-[#F59E0B]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#F1F5F9]">BOX 2</span>
            <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-1.5 py-0.2 rounded">3 Days</span>
          </div>
          <p className="text-[11px] text-[#8E98A8] mt-1">Short-term retention</p>
        </div>
        <div className="app-surface p-3 border-t-2 border-t-[#59E8AB]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#F1F5F9]">BOX 3</span>
            <span className="text-[10px] text-[#59E8AB] bg-[#59E8AB]/10 border border-[#59E8AB]/30 px-1.5 py-0.2 rounded">7 Days</span>
          </div>
          <p className="text-[11px] text-[#8E98A8] mt-1">Weekly review cadence</p>
        </div>
        <div className="app-surface p-3 border-t-2 border-t-[#10B981]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#F1F5F9]">BOX 4</span>
            <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-1.5 py-0.2 rounded">14 Days</span>
          </div>
          <p className="text-[11px] text-[#8E98A8] mt-1">Mastered algorithms</p>
        </div>
      </div>

      {/* Problem Catalog Table */}
      <div className="app-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-[#262D38] flex items-center justify-between text-xs font-semibold text-[#F1F5F9]">
          <span className="flex items-center gap-2 font-mono uppercase text-[#8E98A8]">
            <Code2 className="size-4 text-[#E5A93C]" /> Problem Catalog
          </span>
          <span className="font-mono text-[#FFC665] font-semibold">{filteredProblems.length} Problems</span>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028] border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
          <div className="col-span-5">Problem</div>
          <div className="col-span-3">Pattern</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2 text-right">Box / Action</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[#262D38]">
          {filteredProblems.map((prob) => {
            const prog = dsaProgress[prob.id];
            const currentBox = prog?.currentBox || 1;
            const attempts = dsaAttempts.filter((a) => a.problemId === prob.id);
            const isShowingHistory = showHistoryForId === prob.id;

            return (
              <div key={prob.id} className="app-table-row p-3.5 sm:px-4 sm:py-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2.5">
                  {/* Problem Name & Link */}
                  <div className="sm:col-span-5 flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#F1F5F9]">{prob.title}</span>
                    {prob.leetcodeUrl && (
                      <a
                        href={prob.leetcodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8E98A8] hover:text-[#FFC665] transition-colors"
                        title="Open LeetCode link"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  {/* Pattern */}
                  <div className="sm:col-span-3 text-xs text-[#8E98A8] font-mono">
                    {prob.pattern}
                  </div>

                  {/* Difficulty */}
                  <div className="sm:col-span-2 text-xs">
                    <span
                      className={`capitalize text-[11px] font-mono px-2 py-0.5 rounded-[4px] ${
                        prob.difficulty === 'easy'
                          ? 'tech-chip-success'
                          : prob.difficulty === 'medium'
                          ? 'tech-chip-warning'
                          : 'tech-chip-danger'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </div>

                  {/* Box / Next Review & Action */}
                  <div className="sm:col-span-2 flex items-center justify-end gap-2 font-mono">
                    {prog ? (
                      <span className="text-[11px] text-[#FFC665] font-semibold">
                        Box {currentBox}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#5C6675]">New</span>
                    )}

                    {attempts.length > 0 && (
                      <button
                        onClick={() => setShowHistoryForId(isShowingHistory ? null : prob.id)}
                        className="text-[#8E98A8] hover:text-[#F1F5F9] p-1 rounded-[4px] hover:bg-[#1B2028]"
                        title="View Attempt History"
                      >
                        <History className="size-3.5" />
                      </button>
                    )}

                    <Button
                      size="xs"
                      onClick={() => handleOpenAttempt(prob)}
                      className="h-6 text-[11px] font-semibold bg-[#1B2028] hover:bg-[#222833] text-[#F1F5F9] border border-[#262D38] px-2.5 rounded-[4px]"
                    >
                      <PlusCircle className="size-3 mr-1 text-[#E5A93C]" /> Log
                    </Button>
                  </div>
                </div>

                {/* Inline History Log */}
                {isShowingHistory && (
                  <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-2 text-xs font-mono">
                    <div className="font-semibold text-[#FFC665] text-[11px] flex items-center gap-1.5">
                      <History className="size-3" /> Attempt History Log
                    </div>
                    <div className="space-y-1">
                      {attempts.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-[4px] bg-[#14171D] border border-[#262D38] text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`uppercase font-bold ${
                              att.result === 'pass' ? 'text-[#10B981]' : att.result === 'partial' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'
                            }`}>{att.result}</span>
                            <span className="text-[#8E98A8]">· Assistance: {att.assistanceLevel}</span>
                          </div>
                          <span className="text-[#8E98A8]">{att.timeTakenMinutes}m · {att.date}</span>
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
