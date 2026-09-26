import React, { useState, useEffect } from 'react';
import type {
  PracticeSessionDefinition,
  PracticeUserAnswer,
  PracticeAttempt,
  EvidenceLog,
} from '../../types';
import { evaluatePracticeAttempt } from '../../engine/practiceEngine';
import {
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Award,
} from 'lucide-react';
import { Button } from '../ui/button';

interface PracticeRunnerModalProps {
  session: PracticeSessionDefinition | null;
  isOpen: boolean;
  todayISO: string;
  onClose: () => void;
  onCompleteSession: (attempt: PracticeAttempt, evidenceLog: EvidenceLog) => void;
}

export const PracticeRunnerModal: React.FC<PracticeRunnerModalProps> = ({
  session,
  isOpen,
  todayISO,
  onClose,
  onCompleteSession,
}) => {
  if (!isOpen || !session) return null;

  return (
    <PracticeRunnerModalContent
      key={`${session.id}-${isOpen}`}
      session={session}
      todayISO={todayISO}
      onClose={onClose}
      onCompleteSession={onCompleteSession}
    />
  );
};

interface InnerContentProps {
  session: PracticeSessionDefinition;
  todayISO: string;
  onClose: () => void;
  onCompleteSession: (attempt: PracticeAttempt, evidenceLog: EvidenceLog) => void;
}

const PracticeRunnerModalContent: React.FC<InnerContentProps> = ({
  session,
  todayISO,
  onClose,
  onCompleteSession,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, PracticeUserAnswer>>({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [resultSummary, setResultSummary] = useState<{ attempt: PracticeAttempt; evidenceLog: EvidenceLog } | null>(null);

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
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectOption = (qId: string, optionIdx: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        selectedOption: optionIdx,
      },
    }));
  };

  const handleTextResponse = (qId: string, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        userResponse: text,
      },
    }));
  };

  const handleConfidenceRating = (qId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        confidence: rating,
        isCorrect: rating >= 3,
      },
    }));
  };

  const toggleHint = (qId: string) => {
    setShowHint((prev) => ({ ...prev, [qId]: !prev[qId] }));
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        usedHint: true,
      },
    }));
  };

  const handleNext = () => {
    if (currentIdx < session.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleSubmitSession();
    }
  };

  const handleSubmitSession = () => {
    const answersArray: PracticeUserAnswer[] = session.questions.map((q) => {
      return userAnswers[q.id] || { questionId: q.id, isCorrect: false };
    });

    const evaluated = evaluatePracticeAttempt(session, answersArray, secondsElapsed, todayISO);
    setResultSummary(evaluated);
    onCompleteSession(evaluated.attempt, evaluated.evidenceLog);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-md flex items-center justify-center p-4 font-sans transition-all">
      <div className="w-full max-w-3xl bg-[#14171D] border border-[#262D38] rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden max-h-[92vh] flex flex-col justify-between">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-xs font-semibold text-[#FFC665]">
              <Sparkles className="size-3.5 text-[#E5A93C]" /> {session.category.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-xs text-[#8E98A8] font-medium">{session.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#FFC665] flex items-center gap-1">
              <Clock className="size-3.5 text-[#E5A93C]" /> {formatTime(secondsElapsed)}
            </span>
            <button
              onClick={onClose}
              className="text-[#8E98A8] hover:text-[#F1F5F9] p-1 rounded-md hover:bg-[#1B2028]"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {resultSummary ? (
          /* RESULT SUMMARY SCREEN */
          <div className="py-6 space-y-6 overflow-y-auto animate-fade-in">
            <div className="text-center space-y-2">
              <div className="size-14 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] mx-auto">
                <Award className="size-8" />
              </div>
              <h2 className="text-xl font-bold text-[#F1F5F9]">Session Completed!</h2>
              <p className="text-xs text-[#8E98A8]">
                Evidence strength captured for domain <strong className="text-[#FFC665]">{session.domainId.toUpperCase()}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-[#0D0F12] p-4 rounded-lg border border-[#262D38]">
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase">Accuracy</span>
                <div className="text-xl font-bold text-[#FFC665]">{resultSummary.attempt.accuracyPct}%</div>
              </div>
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase">Score</span>
                <div className="text-xl font-bold text-[#10B981]">{resultSummary.attempt.correctCount} / {resultSummary.attempt.totalQuestions}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase">Time Spent</span>
                <div className="text-xl font-bold text-[#F1F5F9] font-mono">{formatTime(resultSummary.attempt.totalTimeSeconds)}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#8E98A8] bg-[#1B2028] p-4 rounded-lg border border-[#262D38]">
              <div className="flex items-center gap-1.5 font-semibold text-[#F1F5F9]">
                <CheckCircle2 className="size-4 text-[#10B981]" /> Evidence Log Integration
              </div>
              <p>
                Recorded {resultSummary.evidenceLog.score}% score evidence in Skills Matrix for <strong>{resultSummary.evidenceLog.topicId}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={onClose}
                className="h-9 px-5 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md"
              >
                Close & Return
              </Button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION RUNNER */
          <div className="space-y-5 overflow-y-auto flex-1">
            <div className="flex items-center justify-between text-xs text-[#8E98A8]">
              <span>Question {currentIdx + 1} of {session.questions.length}</span>
              {currentQuestion.categoryTag && (
                <span className="px-2 py-0.5 rounded bg-[#1B2028] border border-[#262D38] text-[#FFC665]">
                  {currentQuestion.categoryTag}
                </span>
              )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#F1F5F9] leading-relaxed">
                {currentQuestion.prompt}
              </h3>
            </div>

            {/* MCQ Options */}
            {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
              <div className="space-y-2 pt-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = userAnswers[currentQuestion.id]?.selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(currentQuestion.id, idx)}
                      className={`w-full p-3.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#1B2028] border-[#E5A93C] text-[#F1F5F9] font-medium'
                          : 'bg-[#0D0F12] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/60'
                      }`}
                    >
                      <span>{opt}</span>
                      <span className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${isSelected ? 'border-[#E5A93C] bg-[#E5A93C] text-[#432C00]' : 'border-[#5C6675]'}`}>
                        {isSelected && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Non-MCQ Text/Response Scratchpad & Self-Rating */}
            {currentQuestion.questionType !== 'mcq' && (
              <div className="space-y-4 pt-2">
                <textarea
                  value={userAnswers[currentQuestion.id]?.userResponse || ''}
                  onChange={(e) => handleTextResponse(currentQuestion.id, e.target.value)}
                  placeholder={
                    currentQuestion.questionType === 'sql_scenario'
                      ? 'Type your SQL query or reasoning approach here...'
                      : 'Draft your verbal answer or bullet points here...'
                  }
                  className="w-full h-28 bg-[#0D0F12] border border-[#262D38] rounded-lg p-3 text-xs text-[#F1F5F9] placeholder-[#5C6675] focus:outline-none focus:border-[#E5A93C] resize-none"
                />

                {/* Hint / Expected Solution Toggle */}
                {currentQuestion.explanation && (
                  <div>
                    <button
                      onClick={() => toggleHint(currentQuestion.id)}
                      className="text-xs text-[#E5A93C] hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="size-3.5" />
                      {showHint[currentQuestion.id] ? 'Hide Expected Answer & Solution' : 'Show Expected Solution / Reasoning'}
                    </button>

                    {showHint[currentQuestion.id] && (
                      <div className="mt-2 p-3 bg-[#0D0F12] border border-[#E5A93C]/30 rounded-lg text-xs text-[#FFC665] font-mono leading-relaxed animate-fade-in">
                        {currentQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Self-Rating */}
                <div className="space-y-1.5 pt-2 border-t border-[#262D38]">
                  <label className="text-xs font-semibold text-[#8E98A8] block">
                    Self-Rating / Defense Confidence:
                  </label>
                  <div className="flex items-center gap-2">
                    {([1, 2, 3, 4, 5] as const).map((star) => (
                      <button
                        key={star}
                        onClick={() => handleConfidenceRating(currentQuestion.id, star)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                          userAnswers[currentQuestion.id]?.confidence === star
                            ? 'bg-[#E5A93C] text-[#432C00] border-[#E5A93C]'
                            : 'bg-[#1B2028] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9]'
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
            <div className="pt-4 border-t border-[#262D38] flex items-center justify-between">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] disabled:opacity-30 disabled:pointer-events-none font-medium"
              >
                Previous
              </button>

              <Button
                onClick={handleNext}
                className="h-9 px-5 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md"
              >
                {currentIdx < session.questions.length - 1 ? 'Next Question' : 'Finish & Submit'} <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
