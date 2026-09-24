import React, { useState } from 'react';
import type { DSAProblem, DSAProgress, DSAAttempt } from '../../types';
import { calculateNextLeitnerBox, calculateEvidenceScore } from '../../engine/adaptiveEngine';
import { Code2, CheckCircle2, X, Clock, HelpCircle, FileText } from 'lucide-react';
import { Button } from '../ui/button';

interface DSAAttemptModalProps {
  problem: DSAProblem | null;
  progress: DSAProgress | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSubmitAttempt: (
    attempt: DSAAttempt,
    updatedProgress: DSAProgress,
    evidenceScore: number
  ) => void;
}

export const DSAAttemptModal: React.FC<DSAAttemptModalProps> = ({
  problem,
  progress,
  isOpen,
  onClose,
  onSubmitAttempt,
}) => {
  const [result, setResult] = useState<'pass' | 'partial' | 'fail'>('pass');
  const [assistanceLevel, setAssistanceLevel] = useState<'none' | 'hint' | 'solution'>('none');
  const [timeTakenMinutes, setTimeTakenMinutes] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !problem) return null;

  const currentBox = progress?.currentBox || 1;
  const nextLeitner = calculateNextLeitnerBox(currentBox, result, assistanceLevel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const todayStr = new Date().toISOString().split('T')[0];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextLeitner.intervalDays);
    const nextReviewStr = nextReviewDate.toISOString().split('T')[0];

    const attemptId = `attempt-${Date.now()}-${problem.id}`;
    const attempt: DSAAttempt = {
      id: attemptId,
      problemId: problem.id,
      date: todayStr,
      result,
      assistanceLevel,
      timeTakenMinutes,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedProgress: DSAProgress = {
      problemId: problem.id,
      currentBox: nextLeitner.nextBox,
      nextReviewAt: nextReviewStr,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: (progress?.attemptCount || 0) + 1,
      createdAt: progress?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evidenceScore = calculateEvidenceScore(result, assistanceLevel, 4);

    onSubmitAttempt(attempt, updatedProgress, evidenceScore);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#E5A93C] uppercase tracking-wider">
              <Code2 className="size-3.5" />
              <span>DSA Attempt Protocol</span>
            </div>
            <h2 className="text-lg font-bold text-[#F1F5F9] mt-1">{problem.title}</h2>
            <p className="text-xs font-mono text-[#8E98A8] mt-1">
              Current Box: <strong className="text-[#FFC665]">Box {currentBox}</strong> • Pattern:{' '}
              <strong className="text-[#F1F5F9]">{problem.pattern}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Input 1: Attempt Result */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] font-semibold block uppercase text-[11px]">Attempt Result</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pass', label: 'Pass (Solved)', color: 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]' },
                { id: 'partial', label: 'Partial', color: 'border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]' },
                { id: 'fail', label: 'Fail (Unsolved)', color: 'border-[#F43F5E]/50 bg-[#F43F5E]/10 text-[#F43F5E]' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setResult(opt.id as 'pass' | 'partial' | 'fail')}
                  className={`p-2.5 rounded-[4px] border text-center font-bold text-xs transition-all ${
                    result === opt.id ? opt.color + ' ring-1 ring-[#E5A93C]' : 'border-[#262D38] bg-[#1B2028] text-[#8E98A8] hover:bg-[#222833]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Assistance Level */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] font-semibold flex items-center gap-1 uppercase text-[11px]">
              <HelpCircle className="size-3.5 text-[#E5A93C]" /> Assistance Required
            </label>
            <select
              value={assistanceLevel}
              onChange={(e) => setAssistanceLevel(e.target.value as 'none' | 'hint' | 'solution')}
              className="w-full bg-[#1B2028] text-[#F1F5F9] font-medium p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none cursor-pointer"
            >
              <option value="none">Independent (No Hints / Solved Alone)</option>
              <option value="hint">Required Conceptual Hint</option>
              <option value="solution">Viewed Full Solution / Code Walkthrough</option>
            </select>
          </div>

          {/* Input 3: Time Taken */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] font-semibold flex items-center gap-1 uppercase text-[11px]">
              <Clock className="size-3.5 text-[#F59E0B]" /> Time Taken (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={timeTakenMinutes}
              onChange={(e) => setTimeTakenMinutes(Number(e.target.value))}
              className="w-full bg-[#1B2028] text-[#F1F5F9] font-medium p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none"
            />
          </div>

          {/* Input 4: Notes */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] font-semibold flex items-center gap-1 uppercase text-[11px]">
              <FileText className="size-3.5 text-[#59E8AB]" /> Solution Notes & Complexity
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. O(N) time complexity using sliding window algorithm. Edge case: empty string input..."
              className="w-full bg-[#1B2028] text-[#F1F5F9] p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Live Calculated Transition Preview */}
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] flex items-center justify-between text-xs font-mono">
            <span className="text-[#8E98A8]">Next Leitner Transition:</span>
            <div className="font-semibold text-[#F1F5F9]">
              Box {currentBox} <span className="text-[#E5A93C]">→</span> Box {nextLeitner.nextBox}{' '}
              <span className="text-[#FFC665]">({nextLeitner.intervalDays}d interval)</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262D38]">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-[#8E98A8] hover:text-[#F1F5F9]">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] font-semibold rounded-[4px] px-4"
            >
              <CheckCircle2 className="size-3.5 mr-1.5" /> Log Attempt & Advance Box
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
