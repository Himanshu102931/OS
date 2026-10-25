import React, { useState } from 'react';
import type { TeacherChallengeProblem } from '../../data/teacherEightDayDSAChallenge';
import {
  X,
  CheckCircle2,
  ExternalLink,
  Brain,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';

interface DSAExternalAttemptModalProps {
  problem: TeacherChallengeProblem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitAttempt: (
    leetcodeNumber: number,
    result: 'pass' | 'partial' | 'fail',
    passedIndependently: boolean,
    notes?: string
  ) => void;
}

export const DSAExternalAttemptModal: React.FC<DSAExternalAttemptModalProps> = ({
  problem,
  isOpen,
  onClose,
  onSubmitAttempt,
}) => {
  const [result, setResult] = useState<'pass' | 'partial' | 'fail'>('pass');
  const [passedIndependently, setPassedIndependently] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !problem) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAttempt(problem.leetcodeNumber, result, passedIndependently, notes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-attempt-title"
    >
      <div className="bg-[#131722] border border-[#2A2F3D] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in-0 zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#2A2F3D] flex items-start justify-between gap-4 bg-[#181D2B]/50">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  External Practice
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                  {problem.primaryPattern}
                </span>
              </div>
              <h2 id="external-attempt-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                LeetCode #{problem.leetcodeNumber}: {problem.title}
              </h2>
              <p className="text-xs text-slate-400">
                Teacher Focus: {problem.teachingFocus}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* LeetCode link banner */}
            <div className="bg-[#181D2B] p-3 rounded-lg border border-[#2A2F3D] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-slate-200 font-medium">Solve on LeetCode</div>
                <div className="text-slate-400 text-[11px]">Free public problem; open in new tab to submit code.</div>
              </div>
              <a
                href={problem.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-[var(--accent)] border border-[var(--accent)]/30 transition-colors font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open LeetCode</span>
              </a>
            </div>

            {/* Result Selection */}
            <div className="space-y-2">
              <label className="block text-slate-200 font-semibold">
                Attempt Result:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResult('pass')}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    result === 'pass'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-[#181D2B] border-[#2A2F3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <span>Pass (All Cases)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResult('partial')}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    result === 'partial'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-[#181D2B] border-[#2A2F3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <span>Partial (Timeout/Edge)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResult('fail')}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    result === 'fail'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-[#181D2B] border-[#2A2F3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <X className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                  <span>Could Not Solve</span>
                </button>
              </div>
            </div>

            {/* Assistance Level / Independence */}
            <div className="space-y-2">
              <label className="block text-slate-200 font-semibold">
                Assistance Level:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPassedIndependently(true)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    passedIndependently
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#181D2B] border-[#2A2F3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-emerald-400">External Independent Pass (Self-Reported)</div>
                  <div className="text-[11px] text-slate-400">Solved on LeetCode without editorial or external hints</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPassedIndependently(false)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    !passedIndependently
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-[#181D2B] border-[#2A2F3D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-amber-400">External Assisted Pass (Self-Reported)</div>
                  <div className="text-[11px] text-slate-400">Used hints, discussion, or solution guide</div>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-slate-200 font-semibold">
                Practice Notes / Key Invariant:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was the core takeaway, time complexity, or tricky edge case?"
                className="w-full bg-[#181D2B] border border-[#2A2F3D] rounded p-2 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Pedagogical Integrity Note */}
            <div className="bg-[#181D2B]/60 p-2.5 rounded border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <Brain className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                Self-reported external practice tracks challenge curriculum progression truthfully without mutating your 150-problem canonical placement readiness benchmark or granting unverified Leitner box promotion.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[#2A2F3D] bg-[#141824] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 px-3 border-[#2A2F3D] text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-4 font-semibold"
            >
              Save Challenge Attempt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
