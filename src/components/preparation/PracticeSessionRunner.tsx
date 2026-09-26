import React, { useState, useEffect } from 'react';
import type { PracticeSessionDefinition, PracticeUserAnswer } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { evaluatePracticeAttempt } from '../../engine/practiceEngine';
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
} from 'lucide-react';


interface PracticeSessionRunnerProps {
  session: PracticeSessionDefinition;
  onClose: () => void;
}

type RunnerStep = 'intro' | 'active' | 'result';

export const PracticeSessionRunner: React.FC<PracticeSessionRunnerProps> = ({ session, onClose }) => {
  const { todayDate, recordPracticeAttempt } = usePlacement();
  const [step, setStep] = useState<RunnerStep>('intro');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<PracticeUserAnswer[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Form states for current question
  const [selectedOption, setSelectedOption] = useState<number | undefined>(undefined);
  const [textResponse, setTextResponse] = useState<string>('');
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);

  // Timer effect during active work
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'active') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const currentQuestion = session.questions[currentIndex];

  const handleStart = () => {
    setStep('active');
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setUserAnswers([]);
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setSelectedOption(undefined);
    setTextResponse('');
    setConfidence(3);
    setShowHint(false);
  };

  const recordCurrentAnswer = () => {
    if (!currentQuestion) return;

    const answer: PracticeUserAnswer = {
      questionId: currentQuestion.id,
      selectedOption,
      userResponse: textResponse,
      usedHint: showHint,
      confidence,
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
      finishSession(updatedAnswers || userAnswers);
    }
  };

  const finishSession = (finalAnswers: PracticeUserAnswer[]) => {
    const evaluation = evaluatePracticeAttempt(session, finalAnswers, elapsedSeconds, todayDate);
    recordPracticeAttempt(evaluation.attempt, evaluation.evidenceLog);
    setStep('result');
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalQuestions = session.questions.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0F12]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#14171D] border border-[#262D38] rounded-[8px] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#262D38] flex items-center justify-between bg-[#1B2028]">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-[#E5A93C]/15 text-[#E5A93C] rounded border border-[#E5A93C]/30">
              {session.category}
            </span>
            <h2 className="text-sm sm:text-base font-semibold text-[#F1F5F9] truncate max-w-md">{session.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#262D38] transition-all"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F1F5F9] tracking-tight">{session.title}</h3>
              <p className="text-xs text-[#8E98A8] leading-relaxed">{session.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-[#1B2028] border border-[#262D38] rounded-[6px] text-center font-mono">
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase block">Questions</span>
                <span className="text-base font-bold text-[#F1F5F9] mt-0.5 block">{session.questionCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase block">Est. Duration</span>
                <span className="text-base font-bold text-[#F1F5F9] mt-0.5 block">{session.estimatedMinutes} mins</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase block">Pass Threshold</span>
                <span className="text-base font-bold text-[#E5A93C] mt-0.5 block">{session.passingScorePct}%</span>
              </div>
            </div>

            <div className="p-3 bg-[#1B2028]/60 border border-[#262D38] rounded text-xs text-[#8E98A8] flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#10B981] shrink-0" />
              <span>Completion logs canonical evidence to your Skills Matrix & Analytics without double-counting.</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#8E98A8] hover:text-[#F1F5F9] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-5 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
              >
                <span>Start Assessment</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ACTIVE SESSION WORK (Hides telemetry) */}
        {step === 'active' && currentQuestion && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Top Progress & Timer Bar */}
            <div className="flex items-center justify-between text-xs font-mono border-b border-[#262D38] pb-3">
              <span className="text-[#8E98A8]">
                Question <strong className="text-[#F1F5F9]">{currentIndex + 1}</strong> of <strong className="text-[#F1F5F9]">{totalQuestions}</strong>
              </span>
              <div className="flex items-center gap-1.5 text-[#E5A93C]">
                <Clock className="size-3.5" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            {/* Question Prompt */}
            <div className="space-y-2">
              {currentQuestion.categoryTag && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1B2028] text-[#8E98A8] rounded border border-[#262D38] uppercase">
                  {currentQuestion.categoryTag}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-medium text-[#F1F5F9] leading-relaxed">
                {currentQuestion.prompt}
              </h3>
            </div>

            {/* Input Controls Based on Question Type */}
            <div className="space-y-3 pt-2">
              {/* Type: MCQ / Multiple Choice */}
              {(currentQuestion.questionType === 'mcq' || currentQuestion.questionType === 'multiple_choice') && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((optionText, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => setSelectedOption(optIdx)}
                      className={`w-full p-3.5 rounded-[4px] border text-left text-xs transition-all flex items-center gap-3 ${
                        selectedOption === optIdx
                          ? 'bg-[#1B2028] border-[#E5A93C] text-[#F1F5F9] font-medium shadow-xs'
                          : 'bg-[#14171D] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/50'
                      }`}
                    >
                      <span className={`size-5 rounded-full border flex items-center justify-center text-[10px] font-mono ${
                        selectedOption === optIdx ? 'border-[#E5A93C] text-[#E5A93C] bg-[#E5A93C]/10 font-bold' : 'border-[#3B4556] text-[#5C6675]'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{optionText}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Type: Short Answer / SQL Query / Explanation / Defense / Interview */}
              {currentQuestion.questionType !== 'mcq' && currentQuestion.questionType !== 'multiple_choice' && (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder={
                      currentQuestion.questionType === 'query' || currentQuestion.questionType === 'sql_scenario'
                        ? 'Type your SQL query here...'
                        : 'Write your response or defense notes here...'
                    }
                    className="w-full p-3 bg-[#1B2028] border border-[#262D38] rounded text-xs text-[#F1F5F9] font-mono focus:outline-none focus:border-[#E5A93C] placeholder-[#5C6675]"
                  />

                  {/* Self-Rating Confidence Bar */}
                  <div className="p-3 bg-[#1B2028]/50 border border-[#262D38] rounded space-y-2">
                    <span className="text-[11px] text-[#8E98A8] font-mono block">Self Confidence Rating (1 = Unsure, 5 = Confident)</span>
                    <div className="flex gap-2">
                      {([1, 2, 3, 4, 5] as const).map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setConfidence(rating)}
                          className={`flex-1 py-1.5 rounded text-xs font-mono border transition-all ${
                            confidence === rating
                              ? 'bg-[#E5A93C] text-[#0D0F12] border-[#E5A93C] font-bold'
                              : 'bg-[#14171D] text-[#8E98A8] border-[#262D38] hover:bg-[#1B2028]'
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
                      className="text-[11px] text-[#8E98A8] hover:text-[#E5A93C] flex items-center gap-1 font-mono transition-all"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Show Hint</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-[#1B2028] border border-[#E5A93C]/30 rounded text-xs text-[#E5A93C] flex items-start gap-2">
                      <Sparkles className="size-4 shrink-0 mt-0.5" />
                      <span>{currentQuestion.hint}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-[#262D38]">
              <span className="text-[11px] text-[#5C6675] font-mono">
                {currentIndex + 1} / {totalQuestions}
              </span>

              <button
                onClick={handleNext}
                className="px-5 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
              >
                <span>{currentIndex < totalQuestions - 1 ? 'Next Question' : 'Submit Assessment'}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT STATE */}
        {step === 'result' && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="size-12 rounded-full bg-[#E5A93C]/15 border border-[#E5A93C]/30 text-[#E5A93C] flex items-center justify-center mx-auto">
              <Award className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#F1F5F9]">Assessment Completed</h3>
              <p className="text-xs text-[#8E98A8]">Evidence event recorded in PlacementOS telemetry engine.</p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#1B2028] border border-[#262D38] rounded font-mono text-center">
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase block">Accuracy Score</span>
                <span className="text-2xl font-bold text-[#E5A93C] mt-1 block">
                  {evaluatePracticeAttempt(session, userAnswers, elapsedSeconds, todayDate).attempt.accuracyPct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E98A8] uppercase block">Completion Time</span>
                <span className="text-2xl font-bold text-[#F1F5F9] mt-1 block">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded text-xs text-[#10B981] flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Evidence log generated. Skills Matrix freshness updated.</span>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded bg-[#1B2028] border border-[#262D38] text-xs font-medium text-[#8E98A8] hover:text-[#F1F5F9] transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>Retake Session</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all shadow-sm"
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
