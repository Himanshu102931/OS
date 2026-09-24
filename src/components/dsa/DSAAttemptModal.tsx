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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Code2 className="size-3.5" />
              <span>DSA Attempt Protocol</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">{problem.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Box: <strong className="text-slate-200">Box {currentBox}</strong> • Pattern:{' '}
              <strong className="text-blue-400">{problem.pattern}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Input 1: Attempt Result */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold block">Attempt Result</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pass', label: 'Pass (Solved)', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' },
                { id: 'partial', label: 'Partial', color: 'border-amber-500/50 bg-amber-950/30 text-amber-300' },
                { id: 'fail', label: 'Fail (Unsolved)', color: 'border-rose-500/50 bg-rose-950/30 text-rose-300' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setResult(opt.id as 'pass' | 'partial' | 'fail')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    result === opt.id ? opt.color + ' ring-2 ring-offset-2 ring-offset-slate-900' : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Assistance Level */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <HelpCircle className="size-3.5 text-blue-400" /> Assistance Required
            </label>
            <select
              value={assistanceLevel}
              onChange={(e) => setAssistanceLevel(e.target.value as 'none' | 'hint' | 'solution')}
              className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
            >
              <option value="none">Independent (No Hints / Solved Alone)</option>
              <option value="hint">Required Conceptual Hint</option>
              <option value="solution">Viewed Full Solution / Code Walkthrough</option>
            </select>
          </div>

          {/* Input 3: Time Taken */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="size-3.5 text-amber-400" /> Time Taken (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={timeTakenMinutes}
              onChange={(e) => setTimeTakenMinutes(Number(e.target.value))}
              className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
            />
          </div>

          {/* Input 4: Notes */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <FileText className="size-3.5 text-purple-400" /> Solution Notes & Complexity
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. O(N) time using two pointers. Remember to handle edge case when left >= right..."
              className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none leading-relaxed resize-none"
            />
          </div>

          {/* Live Calculated Transition Preview */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Next Leitner State:</span>
            <div className="font-mono font-bold text-slate-200">
              Box {currentBox} <span className="text-blue-400 font-sans">→</span> Box {nextLeitner.nextBox}{' '}
              <span className="text-amber-400 font-normal">({nextLeitner.intervalDays}d interval)</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Log Attempt & Advance Box
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
