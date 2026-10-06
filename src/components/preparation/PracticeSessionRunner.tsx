import React, { useState, useEffect, useRef } from 'react';
import type { PracticeSessionDefinition, PracticeUserAnswer } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import {
  evaluatePracticeAttempt,
  getSessionTimeLimitSeconds,
  isObjectiveQuestionType,
  summarizePracticeAnswers,
  type PracticeEvaluationResult,
} from '../../engine/practiceEngine';
import {
  X,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Award,
  AlertTriangle,
  Play,
  Activity,
} from 'lucide-react';

interface PracticeSessionRunnerProps {
  session: PracticeSessionDefinition;
  onClose: () => void;
}

type RunnerStep = 'intro' | 'active' | 'result';

export const PracticeSessionRunner: React.FC<PracticeSessionRunnerProps> = ({ session, onClose }) => {
  const { todayDate, recordPracticeAttempt, setRoute } = usePlacement();
  const [step, setStep] = useState<RunnerStep>('intro');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<PracticeUserAnswer[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  // The ONE stored result of this run — every number on the result screen is
  // read from it, never recomputed by the UI.
  const [evaluation, setEvaluation] = useState<PracticeEvaluationResult | null>(null);
  const finishedRef = useRef<boolean>(false);

  // Form states for current question
  const [selectedOption, setSelectedOption] = useState<number | undefined>(undefined);
  const [textResponse, setTextResponse] = useState<string>('');
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  // Explicit self-certification for questions with no objective answer key.
  const [selfCertified, setSelfCertified] = useState<boolean>(false);

  // Configured limit for timed sets only (null = untimed, count-up display).
  const timeLimitSeconds = getSessionTimeLimitSeconds(session);

  const currentQuestion = session.questions[currentIndex];
  const isObjective = currentQuestion
    ? isObjectiveQuestionType(currentQuestion.questionType)
    : false;

  // Timer effect during active work — never runs past a configured limit.
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'active') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (timeLimitSeconds !== null && prev >= timeLimitSeconds) return prev;
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timeLimitSeconds]);

  const handleStart = () => {
    setStep('active');
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setUserAnswers([]);
    setEvaluation(null);
    finishedRef.current = false;
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setSelectedOption(undefined);
    setTextResponse('');
    setConfidence(3);
    setSelfCertified(false);
    setShowHint(false);
  };

  const recordCurrentAnswer = () => {
    if (!currentQuestion) return userAnswers;

    const answer: PracticeUserAnswer = {
      questionId: currentQuestion.id,
      selectedOption,
      userResponse: textResponse,
      usedHint: showHint,
      confidence,
      // Response and certification are stored separately: the text is what the
      // user wrote, `isCorrect` is only their own explicit certification of it.
      ...(isObjective ? {} : { isCorrect: selfCertified }),
    };

    const updated = [...userAnswers.filter((a) => a.questionId !== currentQuestion.id), answer];
    setUserAnswers(updated);
    return updated;
  };

  const handleNext = () => {
    const updatedAnswers = recordCurrentAnswer();
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    } else {
      // Complete Session
      finishSession(updatedAnswers);
    }
  };

  const finishSession = (finalAnswers: PracticeUserAnswer[], totalSeconds?: number) => {
    // One submission ⇒ one attempt and one evidence row, ever.
    if (finishedRef.current) return;
    finishedRef.current = true;

    const seconds = totalSeconds ?? elapsedSeconds;
    const cappedSeconds =
      timeLimitSeconds !== null ? Math.min(seconds, timeLimitSeconds) : seconds;
    const result = evaluatePracticeAttempt(session, finalAnswers, cappedSeconds, todayDate);
    recordPracticeAttempt(result.attempt, result.evidenceLog);
    setEvaluation(result);
    setStep('result');
  };

  // Time-limited sets submit themselves the moment the limit is reached, with
  // whatever has actually been answered — blank items stay blank and unscored.
  const autoSubmittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (step !== 'active' || timeLimitSeconds === null) return;
    if (elapsedSeconds < timeLimitSeconds) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    finishSession(recordCurrentAnswer(), timeLimitSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, elapsedSeconds, timeLimitSeconds]);

  const formatTimer = (secs: number) => {
    const safe = Math.max(0, secs);
    const mins = Math.floor(safe / 60);
    const s = safe % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalQuestions = session.questions.length;

  // Everything on the result screen is read from the stored evaluation.
  const resultAttempt = evaluation?.attempt ?? null;
  const resultSummary = evaluation ? summarizePracticeAnswers(session, evaluation.attempt) : null;
  const hasVerdict = resultAttempt?.passingScorePct !== undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-runner-title"
      className="fixed inset-0 z-50 bg-[var(--background)]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto relative">
        {/* Active Session Diagnostic Pulse Track */}
        {step === 'active' && (
          <div
            className="diagnostic-pulse-track absolute top-0 left-0 right-0 h-[2px] bg-[var(--border)]"
            aria-hidden="true"
            data-testid="diagnostic-pulse-rail"
          >
            <div className="diagnostic-pulse-beam" />
          </div>
        )}

        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-elevated)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold bg-[var(--accent)]/10 text-[var(--accent)] rounded border border-[var(--accent)]/20 shrink-0">
              {session.category}
            </span>
            <h2
              id="practice-runner-title"
              className="text-xs sm:text-sm font-semibold text-[var(--foreground)] truncate max-w-md"
            >
              {session.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close session runner"
            className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--accent)]">
                <Activity className="size-3.5" />
                <span>Diagnostic Assessment Protocol</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                {session.title}
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                {session.description}
              </p>
            </div>

            {/* Canonical Metadata Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-center font-mono">
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Questions</span>
                <span className="text-base font-bold text-[var(--foreground)] mt-0.5 block">
                  {session.questionCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">
                  {timeLimitSeconds !== null ? 'Time Limit' : 'Est. Duration'}
                </span>
                <span className="text-base font-bold text-[var(--foreground)] mt-0.5 block">
                  {session.estimatedMinutes} mins
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Pass Threshold</span>
                <span className="text-base font-bold text-[var(--accent)] mt-0.5 block">
                  {session.passingScorePct}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg text-xs text-[var(--success)] flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0" />
              <span>Completion logs canonical evidence to your Skills Matrix & Analytics without double-counting.</span>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2 border-t border-[var(--border)]">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <Play className="size-3.5 fill-current" />
                <span>Start Assessment</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ACTIVE SESSION WORK */}
        {step === 'active' && currentQuestion && (
          <div className="p-5 sm:p-7 space-y-5">
            {/* Top Progress & Timer Bar */}
            <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[var(--foreground-muted)]"
                  data-testid="question-step-counter"
                >
                  Question <strong className="text-[var(--foreground)]">{currentIndex + 1}</strong> of{' '}
                  <strong className="text-[var(--foreground)]">{totalQuestions}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--accent)]">
                <Clock className="size-3.5" />
                <span data-testid={timeLimitSeconds !== null ? 'session-countdown' : 'session-elapsed'}>
                  {timeLimitSeconds !== null
                    ? `${formatTimer(timeLimitSeconds - elapsedSeconds)} left`
                    : formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--surface-elevated)] h-1 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                role="progressbar"
                aria-valuenow={currentIndex + 1}
                aria-valuemin={1}
                aria-valuemax={totalQuestions}
              />
            </div>

            {/* Question Prompt */}
            <div className="space-y-2">
              {currentQuestion.categoryTag && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[var(--surface-elevated)] text-[var(--foreground-muted)] rounded border border-[var(--border)] uppercase">
                  {currentQuestion.categoryTag}
                </span>
              )}
              <h3 className="text-xs sm:text-sm font-medium text-[var(--foreground)] leading-relaxed">
                {currentQuestion.prompt}
              </h3>
            </div>

            {/* Input Controls Based on Question Type */}
            <div className="space-y-3 pt-1">
              {/* Type: MCQ / Multiple Choice */}
              {isObjective && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((optionText, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => setSelectedOption(optIdx)}
                      className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none ${
                        selectedOption === optIdx
                          ? 'bg-[var(--surface-elevated)] border-[var(--accent)] text-[var(--foreground)] font-medium shadow-xs'
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]/50'
                      }`}
                    >
                      <span
                        className={`size-5 rounded-md border flex items-center justify-center text-[10px] font-mono shrink-0 ${
                          selectedOption === optIdx
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/15 font-bold'
                            : 'border-[var(--border)] text-[var(--foreground-subtle)]'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{optionText}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Type: Short Answer / SQL Query / Explanation / Defense / Interview */}
              {!isObjective && (
                <div className="space-y-3">
                  <span className="text-[11px] text-[var(--foreground-muted)] font-mono block">
                    Your response (recorded exactly as written)
                  </span>
                  <textarea
                    rows={4}
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder={
                      currentQuestion.questionType === 'query' || currentQuestion.questionType === 'sql_scenario'
                        ? 'Type your SQL query here...'
                        : 'Write your response or defense notes here...'
                    }
                    className="w-full p-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] font-mono focus:outline-none focus:border-[var(--accent)] placeholder-[var(--foreground-subtle)]"
                  />

                  {/* Self-certification */}
                  <div
                    className="p-3 bg-[var(--surface-elevated)]/60 border border-[var(--border)] rounded-lg space-y-1.5"
                    data-testid="self-certification"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selfCertified}
                        onChange={(e) => setSelfCertified(e.target.checked)}
                        className="mt-0.5 size-4 accent-[var(--accent)] shrink-0 rounded"
                      />
                      <span className="text-xs text-[var(--foreground)] font-medium">
                        I can verify this response is correct (self-certified)
                      </span>
                    </label>
                    <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                      This question type has no answer key, so nothing is graded automatically.
                      Writing a response records completion — it counts as correct only when certified against the model answer.
                    </p>
                  </div>

                  {/* Self-Rating Confidence Bar */}
                  <div className="p-3 bg-[var(--surface-elevated)]/40 border border-[var(--border)] rounded-lg space-y-2">
                    <span className="text-[10px] text-[var(--foreground-muted)] font-mono uppercase tracking-wider block">
                      Confidence Rating (1 = Unsure, 5 = Confident)
                    </span>
                    <div className="flex gap-2">
                      {([1, 2, 3, 4, 5] as const).map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setConfidence(rating)}
                          className={`flex-1 py-1.5 rounded-md text-xs font-mono border transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none ${
                            confidence === rating
                              ? 'bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)] font-bold'
                              : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:bg-[var(--surface-elevated)]'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Hint Button */}
              {currentQuestion.hint && (
                <div>
                  {!showHint ? (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="text-[11px] text-[var(--foreground-muted)] hover:text-[var(--accent)] flex items-center gap-1.5 font-mono transition-colors"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Show Hint</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--accent)]/30 rounded-lg text-xs text-[var(--accent)] flex items-start gap-2">
                      <Sparkles className="size-4 shrink-0 mt-0.5" />
                      <span>{currentQuestion.hint}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--foreground-muted)] font-mono">
                {currentIndex + 1} / {totalQuestions}
              </span>

              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <span>{currentIndex < totalQuestions - 1 ? 'Next Question' : 'Submit Assessment'}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT STATE */}
        {step === 'result' && resultAttempt && resultSummary && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div
              className={`size-12 rounded-full border flex items-center justify-center mx-auto ${
                hasVerdict && !resultAttempt.passed
                  ? 'bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]'
                  : 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
              }`}
            >
              {hasVerdict && !resultAttempt.passed ? (
                <AlertTriangle className="size-6" />
              ) : (
                <Award className="size-6" />
              )}
            </div>

            <div className="space-y-1">
              <h3
                className={`text-lg sm:text-xl font-bold ${
                  hasVerdict && !resultAttempt.passed ? 'text-[var(--error)]' : 'text-[var(--foreground)]'
                }`}
                data-testid="result-verdict"
              >
                {hasVerdict ? (resultAttempt.passed ? 'PASS' : 'FAIL') : 'Assessment Completed'}
              </h3>
              {hasVerdict && (
                <p className="text-xs text-[var(--foreground-muted)]">
                  {resultAttempt.scorePct}% against a {resultAttempt.passingScorePct}% pass threshold
                </p>
              )}
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg font-mono text-center">
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Score</span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--accent)] mt-1 block" data-testid="result-score">
                  {resultAttempt.scorePct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Correct</span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mt-1 block">
                  {resultAttempt.correctCount} / {resultAttempt.totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Time</span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mt-1 block">
                  {formatTimer(resultAttempt.totalTimeSeconds)}
                </span>
              </div>
            </div>

            {resultSummary.unansweredCount > 0 && (
              <div
                className="p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg text-xs text-[var(--warning)] flex items-center justify-center gap-2"
                data-testid="result-unanswered"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  {resultSummary.unansweredCount} of {session.questions.length} items were left
                  unanswered and were not scored.
                </span>
              </div>
            )}

            <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg text-xs text-[var(--success)] flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>One attempt and one evidence event recorded for this session.</span>
            </div>

            <p className="text-xs text-[var(--foreground-muted)]" data-testid="result-next-action">
              {hasVerdict && !resultAttempt.passed
                ? 'Next: review what you missed, then retake this session.'
                : resultSummary.unansweredCount > 0
                  ? 'Next: unanswered items were left blank — retake if you want them scored.'
                  : 'Next: continue to your next stage, or retake to improve the score.'}
            </p>

            <div className="flex justify-center items-center gap-3 pt-2">
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <RotateCcw className="size-3.5" />
                <span>Retake Session</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  setRoute('preparation');
                }}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                Return to Preparation Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
