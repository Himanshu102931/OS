import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PracticeSessionDefinition,
  PracticeUserAnswer,
  PracticeAttempt,
  EvidenceLog,
} from '../../types';
import { evaluatePracticeAttempt, isObjectiveQuestionType, getSessionTimeLimitSeconds } from '../../engine/practiceEngine';
import { resolvePracticeContinuation } from '../../engine/practiceContinuation';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Award,
  Zap,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';

interface PracticeRunnerModalProps {
  session: PracticeSessionDefinition | null;
  isOpen: boolean;
  todayISO: string;
  onClose: () => void;
  onCompleteSession: (attempt: PracticeAttempt, evidenceLog: EvidenceLog) => void;
  onContinuationAction?: (target: { route: RoutePath; targetId: string }) => void;
}

export const PracticeRunnerModal: React.FC<PracticeRunnerModalProps> = ({
  session,
  isOpen,
  todayISO,
  onClose,
  onCompleteSession,
  onContinuationAction,
}) => {
  if (!isOpen || !session) return null;

  return (
    <PracticeRunnerModalContent
      key={`${session.id}-${isOpen}`}
      session={session}
      todayISO={todayISO}
      onClose={onClose}
      onCompleteSession={onCompleteSession}
      onContinuationAction={onContinuationAction}
    />
  );
};

interface InnerContentProps {
  session: PracticeSessionDefinition;
  todayISO: string;
  onClose: () => void;
  onCompleteSession: (attempt: PracticeAttempt, evidenceLog: EvidenceLog) => void;
  onContinuationAction?: (target: { route: RoutePath; targetId: string }) => void;
}

const PracticeRunnerModalContent: React.FC<InnerContentProps> = ({
  session,
  todayISO,
  onClose,
  onCompleteSession,
  onContinuationAction,
}) => {
  const {
    practiceAttempts,
    practiceSessions: allPracticeSessions,
    skillStates,
    companyOverlays,
    dsaProblems,
    dsaProgress,
    taskDefinitions,
    taskProgress,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase,
  } = usePlacement();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, PracticeUserAnswer>>({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [resultSummary, setResultSummary] = useState<{ attempt: PracticeAttempt; evidenceLog: EvidenceLog } | null>(null);
  const [continuation, setContinuation] = useState<ReturnType<typeof resolvePracticeContinuation> | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const timeLimitSeconds = getSessionTimeLimitSeconds(session);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!resultSummary) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resultSummary]);

  const currentQuestion = session.questions[currentIdx];

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(Math.max(0, totalSecs) / 60);
    const secs = Math.max(0, totalSecs) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectOption = useCallback((qId: string, optionIdx: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        selectedOption: optionIdx,
      },
    }));
  }, []);

  const handleTextResponse = useCallback((qId: string, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        userResponse: text,
      },
    }));
  }, []);

  const handleSelfCertification = useCallback((qId: string, isCertified: boolean) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        isCorrect: isCertified,
      },
    }));
  }, []);

  const handleConfidenceRating = useCallback((qId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        confidence: rating,
      },
    }));
  }, []);

  const toggleHint = useCallback((qId: string) => {
    setShowHint((prev) => ({ ...prev, [qId]: !prev[qId] }));
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        usedHint: true,
      },
    }));
  }, []);

  const handleSubmitSession = useCallback(() => {
    const answersArray: PracticeUserAnswer[] = session.questions.map((q) => {
      return userAnswers[q.id] || { questionId: q.id, isCorrect: false };
    });

    const evaluated = evaluatePracticeAttempt(session, answersArray, secondsElapsed, todayISO);
    setResultSummary(evaluated);
    onCompleteSession(evaluated.attempt, evaluated.evidenceLog);

    // Resolve practice continuation (pure, deterministic)
    const contResult = resolvePracticeContinuation({
      completedAttempt: evaluated.attempt,
      completedSession: session,
      practiceAttempts,
      practiceSessions: allPracticeSessions,
      skillStates,
      companyOverlays,
      dsaProblems,
      dsaProgressMap: dsaProgress,
      tasks: taskDefinitions,
      taskProgressMap: taskProgress,
      topics,
      domains,
      preparationTopics,
      preparationTopicProgress,
      activePhase,
      todayStr: todayISO,
    });
    setContinuation(contResult);
  }, [
    session,
    userAnswers,
    secondsElapsed,
    todayISO,
    onCompleteSession,
    practiceAttempts,
    allPracticeSessions,
    skillStates,
    companyOverlays,
    dsaProblems,
    dsaProgress,
    taskDefinitions,
    taskProgress,
    topics,
    domains,
    preparationTopics,
    preparationTopicProgress,
    activePhase,
  ]);

  const handleNext = useCallback(() => {
    if (currentIdx < session.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleSubmitSession();
    }
  }, [currentIdx, session.questions.length, handleSubmitSession]);

  const handleRetake = () => {
    setCurrentIdx(0);
    setUserAnswers({});
    setSecondsElapsed(0);
    setShowHint({});
    setResultSummary(null);
    setContinuation(null);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (resultSummary) {
        if (e.key === 'Escape') {
          onClose();
        }
        return;
      }

      // Escape requests close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Cmd+Enter or Ctrl+Enter to advance / submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
        return;
      }

      // Number keys 1-4 for MCQ options if active element is not a textarea or text input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';
      if (!isInput && currentQuestion && isObjectiveQuestionType(currentQuestion.questionType)) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const optIdx = parseInt(e.key, 10) - 1;
          if (currentQuestion.options && optIdx < currentQuestion.options.length) {
            e.preventDefault();
            handleSelectOption(currentQuestion.id, optIdx);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resultSummary, currentQuestion, handleNext, handleSelectOption, onClose]);

  const isObjective = currentQuestion ? isObjectiveQuestionType(currentQuestion.questionType) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Practice Assessment Runner"
      aria-labelledby="practice-runner-title"
      data-testid="practice-runner-modal"
      className="fixed inset-0 z-50 bg-[#09090B]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans transition-all"
    >
      <div
        ref={modalRef}
        className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden max-h-[92vh] flex flex-col justify-between"
      >
        {/* Diagnostic motion pulse rail for active runner mode */}
        {!resultSummary && (
          <div
            data-testid="diagnostic-pulse-rail"
            className="diagnostic-pulse-track absolute top-0 left-0 right-0 h-[2px] bg-border overflow-hidden pointer-events-none"
          >
            <div className="diagnostic-pulse-beam" />
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-xs font-semibold text-[#60A5FA]">
              <Sparkles className="size-3.5 text-[#3B82F6]" /> {session.category.replace('_', ' ').toUpperCase()}
            </span>
            <h2 id="practice-runner-title" className="text-xs text-foreground-muted font-medium truncate max-w-[200px] sm:max-w-md">
              {session.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-foreground flex items-center gap-1 bg-surface-elevated px-2 py-0.5 rounded border border-border">
              <Clock className="size-3 text-primary" />
              {timeLimitSeconds
                ? `${formatTime(timeLimitSeconds - secondsElapsed)} remaining`
                : formatTime(secondsElapsed)}
            </span>
            <button
              onClick={onClose}
              aria-label="Close runner"
              className="text-foreground-muted hover:text-foreground p-1 rounded-md hover:bg-surface-elevated transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {resultSummary ? (
          /* RESULT SUMMARY SCREEN */
          <div className="py-4 space-y-5 overflow-y-auto drill-result-reveal">
            <div className="text-center space-y-2">
              <div
                className={`size-12 rounded-full border flex items-center justify-center mx-auto ${
                  resultSummary.attempt.passed
                    ? 'bg-success/20 border-success/40 text-success'
                    : 'bg-warning/20 border-warning/40 text-warning'
                }`}
              >
                {resultSummary.attempt.passed ? (
                  <Award className="size-6" />
                ) : (
                  <AlertTriangle className="size-6" />
                )}
              </div>
              <h2 data-testid="result-verdict" className="text-lg font-bold text-foreground">
                {resultSummary.attempt.passed ? 'Session Passed!' : 'Session Completed — Needs Work'}
              </h2>
              <p className="text-xs text-foreground-muted">
                Evidence strength updated in Skills Matrix for domain{' '}
                <strong className="text-foreground">{session.domainId.toUpperCase()}</strong>.
              </p>
            </div>

            {/* Metric Triad */}
            <div className="grid grid-cols-3 gap-3 text-center bg-surface-elevated p-3.5 rounded-lg border border-border">
              <div>
                <span className="text-[10px] text-foreground-muted uppercase font-semibold">Accuracy</span>
                <div data-testid="result-score" className="text-xl font-bold font-mono text-foreground">
                  {resultSummary.attempt.accuracyPct}%
                </div>
              </div>
              <div>
                <span className="text-[10px] text-foreground-muted uppercase font-semibold">Score</span>
                <div className={`text-xl font-bold font-mono ${resultSummary.attempt.passed ? 'text-success' : 'text-warning'}`}>
                  {resultSummary.attempt.correctCount} / {resultSummary.attempt.totalQuestions}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-foreground-muted uppercase font-semibold">Time Spent</span>
                <div className="text-xl font-bold text-foreground font-mono">
                  {formatTime(resultSummary.attempt.totalTimeSeconds)}
                </div>
              </div>
            </div>

            {/* Evidence Log Integration Box */}
            <div className="space-y-1.5 text-xs text-foreground-muted bg-surface-elevated p-3.5 rounded-lg border border-border">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-success" /> Evidence Log Integration
              </div>
              <p className="text-foreground-muted">
                Recorded {resultSummary.evidenceLog.score}% score evidence in Skills Matrix for{' '}
                <strong className="text-foreground">{resultSummary.evidenceLog.topicId}</strong>.
              </p>
            </div>

            {/* Continuation Card */}
            {continuation?.continuation && !continuation.continuation.isBlocked && (
              <div className="bg-surface-elevated border border-[#3B82F6]/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA]">
                  <Zap className="size-3.5 text-[#3B82F6]" />
                  <span className="uppercase tracking-wider">
                    {continuation.continuation.kind === 'remediation'
                      ? 'Remediation Recommended'
                      : continuation.continuation.kind === 'retrieval'
                      ? 'Retrieval Practice Available'
                      : 'Next Practice Available'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  {continuation.summary}
                </p>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border text-xs">
                  <div className="flex items-center gap-2 text-foreground-muted font-mono">
                    <span>{continuation.continuation.estimatedMinutes} min</span>
                    <span>•</span>
                    <span className="capitalize">{continuation.continuation.domainId}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onContinuationAction?.({
                        route: continuation.continuation!.route,
                        targetId: continuation.continuation!.targetId,
                      });
                      onClose();
                    }}
                    className="h-8 px-4 font-bold text-xs bg-[#3B82F6] hover:bg-[#60A5FA] text-[#0B100D] rounded-md shrink-0 transition-all active:scale-[0.98]"
                  >
                    <ArrowRight className="size-3.5 mr-1.5" />
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Blocked Continuation Notice */}
            {continuation?.continuation && continuation.continuation.isBlocked && (
              <div className="bg-surface-elevated border border-warning/40 rounded-lg p-3 text-xs text-warning">
                <div className="flex items-center gap-1.5 font-semibold text-warning">
                  <HelpCircle className="size-3.5" />
                  Next step is blocked
                </div>
                <p className="mt-1 text-foreground-muted">
                  {continuation.continuation.blockingReason || 'Prerequisites not yet satisfied.'}
                </p>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="h-9 px-4 text-xs font-semibold border-border text-foreground hover:bg-surface-elevated"
              >
                <RotateCcw className="size-3.5 mr-1.5" /> Retake Session
              </Button>

              <Button
                size="sm"
                onClick={onClose}
                className="h-9 px-5 font-bold text-xs bg-surface-elevated hover:bg-surface-elevated/80 text-foreground border border-border rounded-md"
              >
                Close & Return
              </Button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION RUNNER */
          <div className="space-y-4 overflow-y-auto flex-1 drill-question-enter">
            {/* Progress & Navigator Rail */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span data-testid="question-step-counter" className="font-medium">
                  Question {currentIdx + 1} of {session.questions.length}
                </span>
                {currentQuestion?.categoryTag && (
                  <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-foreground-muted font-mono text-[11px]">
                    {currentQuestion.categoryTag}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={currentIdx + 1}
                aria-valuemin={1}
                aria-valuemax={session.questions.length}
                className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border"
              >
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{
                    width: `${Math.round(((currentIdx + 1) / session.questions.length) * 100)}%`,
                  }}
                />
              </div>

              {/* Question Navigator Step Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                {session.questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const ans = userAnswers[q.id];
                  const isAnswered =
                    ans &&
                    (typeof ans.selectedOption === 'number' ||
                      (typeof ans.userResponse === 'string' && ans.userResponse.trim().length > 0) ||
                      ans.isCorrect !== undefined);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      aria-label={`Jump to question ${idx + 1}`}
                      className={`size-6 rounded text-[11px] font-mono font-semibold flex items-center justify-center transition-all shrink-0 border ${
                        isCurrent
                          ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-[#60A5FA] ring-1 ring-[#3B82F6]'
                          : isAnswered
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-surface-elevated text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-1.5 pt-1">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                {currentQuestion.prompt}
              </h3>
            </div>

            {/* MCQ Options */}
            {isObjective && currentQuestion.options && (
              <div className="space-y-2 pt-1">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = userAnswers[currentQuestion.id]?.selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, idx)}
                      className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between active:scale-[0.99] ${
                        isSelected
                          ? 'bg-surface-elevated border-[#3B82F6] text-foreground font-medium shadow-sm'
                          : 'bg-surface-elevated/40 border-border text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`size-5 rounded text-[10px] font-mono font-bold flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#3B82F6] text-[#0B100D] border-[#3B82F6]'
                              : 'bg-surface border-border text-foreground-muted'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                      <span
                        className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'border-[#3B82F6] bg-[#3B82F6] text-[#0B100D]'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Non-MCQ Text/Response Scratchpad & Self-Certification */}
            {!isObjective && (
              <div className="space-y-3 pt-1">
                <textarea
                  value={userAnswers[currentQuestion.id]?.userResponse || ''}
                  onChange={(e) => handleTextResponse(currentQuestion.id, e.target.value)}
                  placeholder={
                    currentQuestion.questionType === 'sql_scenario'
                      ? 'Type your SQL query or reasoning approach here...'
                      : 'Draft your answer, solution approach, or bullet points here...'
                  }
                  className="w-full h-24 bg-surface-elevated border border-border rounded-lg p-3 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary resize-none font-mono"
                />

                {/* Hint / Expected Solution Toggle */}
                {currentQuestion.explanation && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleHint(currentQuestion.id)}
                      className="text-xs text-[#60A5FA] hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="size-3.5" />
                      {showHint[currentQuestion.id]
                        ? 'Hide Expected Answer & Solution'
                        : 'Show Expected Solution / Reasoning'}
                    </button>

                    {showHint[currentQuestion.id] && (
                      <div className="mt-2 p-3 bg-surface-elevated border border-border rounded-lg text-xs text-foreground font-mono leading-relaxed drill-question-enter">
                        {currentQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Honest Self-Certification Checkbox */}
                <div
                  data-testid="self-certification"
                  className="flex items-center gap-2 text-xs text-foreground-muted pt-1"
                >
                  <input
                    type="checkbox"
                    id={`self-cert-${currentQuestion.id}`}
                    checked={userAnswers[currentQuestion.id]?.isCorrect === true}
                    onChange={(e) => handleSelfCertification(currentQuestion.id, e.target.checked)}
                    className="size-4 rounded border-border bg-surface text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor={`self-cert-${currentQuestion.id}`} className="cursor-pointer select-none">
                    I certify that my response satisfies the expected solution.
                  </label>
                </div>

                {/* Self-Rating / Confidence */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-[11px] font-semibold text-foreground-muted block uppercase tracking-wider">
                    Confidence / Self-Assessment:
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([1, 2, 3, 4, 5] as const).map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleConfidenceRating(currentQuestion.id, star)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                          userAnswers[currentQuestion.id]?.confidence === star
                            ? 'bg-[#3B82F6] text-[#0B100D] border-[#3B82F6]'
                            : 'bg-surface-elevated border-border text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        {star} {star === 5 ? '★ Expert' : star === 4 ? '★ Strong' : star === 3 ? '★ Adequate' : star === 2 ? '★ Needs Work' : '★ Weak'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                className="h-8 px-3 text-xs text-foreground-muted hover:text-foreground border-border disabled:opacity-30"
              >
                Previous
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 px-4 font-bold text-xs bg-[#3B82F6] hover:bg-[#60A5FA] text-[#0B100D] rounded-md shadow-sm transition-all active:scale-[0.98]"
              >
                {currentIdx < session.questions.length - 1 ? 'Next Question' : 'Finish & Submit'}
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
