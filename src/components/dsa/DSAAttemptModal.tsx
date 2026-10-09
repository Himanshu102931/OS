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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="DSA Attempt Protocol"
      data-testid="dsa-attempt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-surface border border-border rounded-[4px] max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent uppercase tracking-wider">
              <Code2 className="size-3.5" />
              <span>DSA Attempt Protocol</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mt-1">{problem.title}</h2>
            <p className="text-xs font-mono text-foreground-muted mt-1">
              Current Box: <strong className="text-accent">Box {currentBox}</strong> • Pattern:{' '}
              <strong className="text-foreground">{problem.primaryPattern}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Input 1: Attempt Result */}
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-semibold block uppercase text-[11px]">
              Attempt Result
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pass', label: 'Pass (Solved)', color: 'border-status-success/50 bg-status-success/10 text-status-success' },
                { id: 'partial', label: 'Partial', color: 'border-status-warning/50 bg-status-warning/10 text-status-warning' },
                { id: 'fail', label: 'Fail (Unsolved)', color: 'border-status-danger/50 bg-status-danger/10 text-status-danger' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setResult(opt.id as 'pass' | 'partial' | 'fail')}
                  className={`p-2.5 rounded-[4px] border text-center font-bold text-xs transition-all ${
                    result === opt.id
                      ? opt.color + ' ring-1 ring-accent'
                      : 'border-border bg-surface-elevated text-foreground-muted hover:bg-surface-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Assistance Level */}
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-semibold flex items-center gap-1 uppercase text-[11px]">
              <HelpCircle className="size-3.5 text-accent" /> Assistance Required
            </label>
            <select
              value={assistanceLevel}
              onChange={(e) => setAssistanceLevel(e.target.value as 'none' | 'hint' | 'solution')}
              className="w-full bg-surface-elevated text-foreground font-medium p-2.5 rounded-[4px] border border-border focus:outline-none cursor-pointer"
            >
              <option value="none">Independent (No Hints / Solved Alone)</option>
              <option value="hint">Required Conceptual Hint (Base Score 0.6)</option>
              <option value="solution">Viewed Full Solution (Base Score 0.3)</option>
            </select>
          </div>

          {/* Input 3: 3-State Self Check */}
          <div className="p-3 bg-surface-elevated border border-border rounded-[4px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-accent flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Pattern Self-Check (+0.05 per correct answer)
              </span>
              <span className="text-xs font-bold text-accent">
                Bonus: +{scoreDetails.selfCheckBonus.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Pattern Recognition */}
              <div className="flex items-center justify-between">
                <span className="text-foreground">Pattern Recognition</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setPatternRecognition(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        patternRecognition === st
                          ? st === 'correct'
                            ? 'bg-status-success/20 border-status-success text-status-success'
                            : st === 'incorrect'
                            ? 'bg-status-danger/20 border-status-danger text-status-danger'
                            : 'bg-status-warning/20 border-status-warning text-status-warning'
                          : 'border-border text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Complexity */}
              <div className="flex items-center justify-between">
                <span className="text-foreground">Time Complexity Analysis</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setTimeComplexity(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        timeComplexity === st
                          ? st === 'correct'
                            ? 'bg-status-success/20 border-status-success text-status-success'
                            : st === 'incorrect'
                            ? 'bg-status-danger/20 border-status-danger text-status-danger'
                            : 'bg-status-warning/20 border-status-warning text-status-warning'
                          : 'border-border text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space Complexity */}
              <div className="flex items-center justify-between">
                <span className="text-foreground">Space Complexity Analysis</span>
                <div className="flex items-center gap-1">
                  {(['correct', 'incorrect', 'unsure'] as SelfCheckRating[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setSpaceComplexity(st)}
                      className={`px-2 py-1 text-[10px] rounded-[3px] border font-bold uppercase transition-colors ${
                        spaceComplexity === st
                          ? st === 'correct'
                            ? 'bg-status-success/20 border-status-success text-status-success'
                            : st === 'incorrect'
                            ? 'bg-status-danger/20 border-status-danger text-status-danger'
                            : 'bg-status-warning/20 border-status-warning text-status-warning'
                          : 'border-border text-foreground-muted hover:text-foreground'
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
            <label className="text-foreground-muted font-semibold flex items-center gap-1 uppercase text-[11px]">
              <Clock className="size-3.5 text-status-warning" /> Time Taken (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={timeTakenMinutes}
              onChange={(e) => setTimeTakenMinutes(Number(e.target.value))}
              className="w-full bg-surface-elevated text-foreground font-medium p-2.5 rounded-[4px] border border-border focus:outline-none"
            />
          </div>

          {/* Input 5: Notes */}
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-semibold flex items-center gap-1 uppercase text-[11px]">
              <FileText className="size-3.5 text-status-success" /> Solution Notes & Complexity
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. O(N) time complexity using sliding window algorithm..."
              className="w-full bg-surface-elevated text-foreground p-2.5 rounded-[4px] border border-border focus:outline-none leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Live Calculated Transition & Score Preview */}
          <div className="p-3 rounded-[4px] bg-surface-elevated border border-border space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-foreground-muted">
              <span>Leitner Transition:</span>
              <span className="font-bold text-foreground">
                Box {currentBox} <span className="text-accent">→</span> Box {nextBox} (Review in{' '}
                {nextReviewDate})
              </span>
            </div>
            <div className="flex items-center justify-between text-foreground-muted">
              <span>Evidence Strength Impact:</span>
              <span className="font-bold text-status-success">
                Math: {Math.round(currentEvidence * 100)}% → {Math.round(newEvidence * 100)}% (Event Score: {scoreDetails.totalEventScore.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              className="text-xs text-foreground-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-[4px] px-4"
            >
              <CheckCircle2 className="size-3.5 mr-1.5" /> Log Attempt & Record Evidence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
