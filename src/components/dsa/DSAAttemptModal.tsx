import React, { useState } from 'react';
import type {
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  SelfCheckRating,
  PatternSelfCheckEvidence,
} from '../../types';
import {
  calculateNextLeitnerBox,
  calculateNextReviewDate,
  calculateAttemptScore,
  updateEvidenceStrength,
  processAttemptForRemediation,
} from '../../engine/dsaEngine';
import { Code2, CheckCircle2, X, Clock, HelpCircle, FileText, Sparkles } from 'lucide-react';
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

  // 3-State Self Check State
  const [patternRecognition, setPatternRecognition] = useState<SelfCheckRating>('correct');
  const [timeComplexity, setTimeComplexity] = useState<SelfCheckRating>('correct');
  const [spaceComplexity, setSpaceComplexity] = useState<SelfCheckRating>('correct');

  if (!isOpen || !problem) return null;

  const currentBox = progress?.currentBox || 1;
  const nextBox = calculateNextLeitnerBox(currentBox, result, assistanceLevel);
  const nextReviewDate = calculateNextReviewDate(nextBox);

  const selfCheckEvidence: PatternSelfCheckEvidence = {
    patternRecognition,
    timeComplexity,
    spaceComplexity,
  };

  const scoreDetails = calculateAttemptScore(result, assistanceLevel, selfCheckEvidence);
  const currentEvidence = progress?.evidenceStrength || 0;
  const newEvidence = updateEvidenceStrength(currentEvidence, scoreDetails.totalEventScore);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const todayStr = new Date().toISOString().split('T')[0];
    const attemptId = `attempt-${new Date().getTime()}-${problem.id}`;

    const attempt: DSAAttempt = {
      id: attemptId,
      problemId: problem.id,
      date: todayStr,
      result,
      assistanceLevel,
      timeTakenMinutes,
      notes: notes.trim() || undefined,
      selfCheck: selfCheckEvidence,
      createdAt: new Date().toISOString(),
    };

    // Calculate updated remediation and anti-lockout states
    const remDetails = processAttemptForRemediation(progress, result);

    const isPassedIndependently = result === 'pass' && assistanceLevel === 'none';
    let consecutiveAssisted = progress?.consecutiveAssistedPasses || 0;
    let isAssistedProvisional = progress?.assistedProvisional || false;

    if (result === 'pass') {
      if (assistanceLevel !== 'none') {
        consecutiveAssisted += 1;
        isAssistedProvisional = true;
      } else {
        consecutiveAssisted = 0;
        isAssistedProvisional = false;
      }
    } else {
      consecutiveAssisted = 0;
    }

    const updatedProgress: DSAProgress = {
      problemId: problem.id,
      currentBox: nextBox,
      nextReviewAt: nextReviewDate,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: (progress?.attemptCount || 0) + 1,
      passedIndependently: isPassedIndependently || (progress?.passedIndependently ?? false),
      consecutiveAssistedPasses: consecutiveAssisted,
      assistedProvisional: isAssistedProvisional,
      consecutiveFailures: remDetails.consecutiveFailures,
      remediationRequired: remDetails.remediationRequired,
      patternLessonViewed: progress?.patternLessonViewed ?? false,
      patternLessonCompleted: progress?.patternLessonCompleted ?? false,
      remediationSelfCheckPassed: progress?.remediationSelfCheckPassed ?? false,
      evidenceStrength: newEvidence,
      notes: notes.trim() || progress?.notes,
      createdAt: progress?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmitAttempt(attempt, updatedProgress, scoreDetails.totalEventScore);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
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
              <strong className="text-[#F1F5F9]">{problem.primaryPattern}</strong>
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
            <label className="text-[#8E98A8] font-semibold block uppercase text-[11px]">
              Attempt Result
            </label>
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
                    result === opt.id
                      ? opt.color + ' ring-1 ring-[#E5A93C]'
                      : 'border-[#262D38] bg-[#1B2028] text-[#8E98A8] hover:bg-[#222833]'
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
              <option value="hint">Required Conceptual Hint (Base Score 0.6)</option>
              <option value="solution">Viewed Full Solution (Base Score 0.3)</option>
            </select>
          </div>

          {/* Input 3: 3-State Self Check */}
          <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#E5A93C] flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Pattern Self-Check (+0.05 per correct answer)
              </span>
              <span className="text-xs font-bold text-[#FFC665]">
                Bonus: +{scoreDetails.selfCheckBonus.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Pattern Recognition */}
              <div className="flex items-center justify-between">
                <span className="text-[#C5CEDB]">Pattern Recognition</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setPatternRecognition(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        patternRecognition === st
                          ? st === 'correct'
                            ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                            : st === 'incorrect'
                            ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]'
                            : 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                          : 'border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Complexity */}
              <div className="flex items-center justify-between">
                <span className="text-[#C5CEDB]">Time Complexity Analysis</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setTimeComplexity(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        timeComplexity === st
                          ? st === 'correct'
                            ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                            : st === 'incorrect'
                            ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]'
                            : 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                          : 'border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space Complexity */}
              <div className="flex items-center justify-between">
                <span className="text-[#C5CEDB]">Space Complexity Analysis</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setSpaceComplexity(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        spaceComplexity === st
                          ? st === 'correct'
                            ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                            : st === 'incorrect'
                            ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]'
                            : 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                          : 'border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Input 4: Time Taken */}
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

          {/* Input 5: Notes */}
          <div className="space-y-1.5">
            <label className="text-[#8E98A8] font-semibold flex items-center gap-1 uppercase text-[11px]">
              <FileText className="size-3.5 text-[#59E8AB]" /> Solution Notes & Complexity
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. O(N) time complexity using sliding window algorithm..."
              className="w-full bg-[#1B2028] text-[#F1F5F9] p-2.5 rounded-[4px] border border-[#262D38] focus:outline-none leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Live Calculated Transition & Score Preview */}
          <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-[#8E98A8]">
              <span>Leitner Transition:</span>
              <span className="font-bold text-[#F1F5F9]">
                Box {currentBox} <span className="text-[#E5A93C]">→</span> Box {nextBox} (Review in{' '}
                {nextReviewDate})
              </span>
            </div>
            <div className="flex items-center justify-between text-[#8E98A8]">
              <span>Evidence Strength Impact:</span>
              <span className="font-bold text-[#10B981]">
                Math: {Math.round(currentEvidence * 100)}% → {Math.round(newEvidence * 100)}% (Event Score: {scoreDetails.totalEventScore.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262D38]">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              className="text-xs text-[#8E98A8] hover:text-[#F1F5F9]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] font-semibold rounded-[4px] px-4"
            >
              <CheckCircle2 className="size-3.5 mr-1.5" /> Log Attempt & Record Evidence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
