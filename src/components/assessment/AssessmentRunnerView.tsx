import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { BASELINE_ASSESSMENT_DEFINITION } from '../../data/assessment/definitions';
import { BASELINE_ASSESSMENT_ITEMS } from '../../data/assessment/items';
import {
  isAttemptExpired,
  deriveWeeklyAssessmentReadout,
} from '../../engine/assessmentEngine';
import type {
  AssessmentConfidence,
  AssessmentItem,
} from '../../types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Target,
  Info,
  BookOpen,
  Compass,
  ListOrdered,
  Activity,
  Layers,
  TrendingUp,
  Calendar,
  Briefcase,
} from 'lucide-react';

export const AssessmentRunnerView: React.FC = () => {
  const {
    assessmentState,
    startBaselineAssessment,
    startSundayAssessment,
    startFullReassessment,
    pendingSundayObligation,

    recordAssessmentResponse,
    submitAssessmentAttempt,
    activeAssessmentAttempt,
    assessmentProfileReadout,
    setRoute,
    companyOverlays,
    selectedCompanyOverlayId,
    setSelectedCompanyOverlayId,
    companyAssessmentOverlayResult,
  } = usePlacement();

  // Active question index
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  // Show submission confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  // Current user draft input for SQL or rubric text
  const [textInput, setTextInput] = useState<string>('');
  // Wall-clock remaining seconds
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(180 * 60);
  // Readout sub-tab
  const [readoutTab, setReadoutTab] = useState<'baseline' | 'weekly'>('baseline');
  const [selectedWeeklyAttemptId, setSelectedWeeklyAttemptId] = useState<string | null>(null);

  // Selected item sequence based on active attempt or default definition
  const orderedItems: AssessmentItem[] = useMemo(() => {
    if (activeAssessmentAttempt && activeAssessmentAttempt.selectedItemIds.length > 0) {
      const itemMap = new Map(BASELINE_ASSESSMENT_ITEMS.map((i) => [i.id, i]));
      return activeAssessmentAttempt.selectedItemIds
        .map((id) => itemMap.get(id))
        .filter((i): i is AssessmentItem => Boolean(i));
    }

    // Default: order items per module definitions
    const items: AssessmentItem[] = [];
    for (const mod of BASELINE_ASSESSMENT_DEFINITION.modules) {
      const modItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === mod.domainId);
      items.push(...modItems);
    }
    return items;
  }, [activeAssessmentAttempt]);

  const currentItem: AssessmentItem | undefined = orderedItems[currentIdx];

  // Responses map for active attempt
  const responseMap = useMemo(() => {
    const map = new Map<string, { response: number | string; confidence?: AssessmentConfidence; result: string }>();
    if (!activeAssessmentAttempt || !assessmentState) return map;

    for (const resp of assessmentState.responses) {
      if (resp.attemptId === activeAssessmentAttempt.id) {
        map.set(resp.itemId, {
          response: resp.response,
          confidence: resp.responseConfidence,
          result: resp.result,
        });
      }
    }
    return map;
  }, [activeAssessmentAttempt, assessmentState]);

  // Keep draft text synchronized with recorded response when navigating
  useEffect(() => {
    if (!currentItem) return;
    const recorded = responseMap.get(currentItem.id);
    if (recorded && typeof recorded.response === 'string' && recorded.response !== 'unanswered' && recorded.response !== 'dont_know') {
      setTextInput(recorded.response);
    } else {
      setTextInput('');
    }
  }, [currentIdx, currentItem, responseMap]);

  // Hard wall-clock timer & auto-submission
  const hasAutoSubmittedRef = useRef(false);

  const handleAutoSubmit = useCallback(() => {
    if (hasAutoSubmittedRef.current || !activeAssessmentAttempt) return;
    hasAutoSubmittedRef.current = true;
    submitAssessmentAttempt(activeAssessmentAttempt.id, true);
  }, [activeAssessmentAttempt, submitAssessmentAttempt]);

  useEffect(() => {
    if (!activeAssessmentAttempt || activeAssessmentAttempt.status !== 'in_progress') {
      return;
    }

    const checkTimer = () => {
      const startedAtMs = new Date(activeAssessmentAttempt.startedAt).getTime();
      const elapsedSec = Math.floor((Date.now() - startedAtMs) / 1000);
      const remainingSec = Math.max(0, activeAssessmentAttempt.timeLimitSeconds - elapsedSec);

      setTimeRemainingSeconds(remainingSec);

      if (remainingSec <= 0 || isAttemptExpired(activeAssessmentAttempt)) {
        handleAutoSubmit();
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [activeAssessmentAttempt, handleAutoSubmit]);

  // Handle answering an item
  const handleAnswerChange = (userResponse: number | string | null, confidence?: AssessmentConfidence) => {
    if (!activeAssessmentAttempt || !currentItem) return;
    const existing = responseMap.get(currentItem.id);
    const conf = confidence !== undefined ? confidence : existing?.confidence;
    recordAssessmentResponse(activeAssessmentAttempt.id, currentItem.id, userResponse, conf);
  };

  const handleConfidenceChange = (conf: AssessmentConfidence) => {
    if (!activeAssessmentAttempt || !currentItem) return;
    const existing = responseMap.get(currentItem.id);
    if (existing) {
      recordAssessmentResponse(activeAssessmentAttempt.id, currentItem.id, existing.response, conf);
    }
  };

  // Find completed baseline and weekly attempts for metadata
  const completedBaselineAttempts = useMemo(() => {
    if (!assessmentState?.attempts) return [];
    return assessmentState.attempts.filter(
      (a) => a.kind === 'diagnostic_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
    );
  }, [assessmentState]);

  const completedWeeklyAttempts = useMemo(() => {
    if (!assessmentState?.attempts) return [];
    return assessmentState.attempts.filter(
      (a) => a.kind === 'weekly_assessment' && (a.status === 'submitted' || a.status === 'auto_submitted')
    );
  }, [assessmentState]);

  const latestCompletedAttempt = completedBaselineAttempts[completedBaselineAttempts.length - 1];
  const latestWeeklyAttempt = completedWeeklyAttempts[completedWeeklyAttempts.length - 1];

  const activeWeeklyAttempt = useMemo(() => {
    if (selectedWeeklyAttemptId) {
      return completedWeeklyAttempts.find((a) => a.id === selectedWeeklyAttemptId) || latestWeeklyAttempt;
    }
    return latestWeeklyAttempt;
  }, [completedWeeklyAttempts, selectedWeeklyAttemptId, latestWeeklyAttempt]);

  const weeklyReadout = useMemo(() => {
    if (!activeWeeklyAttempt || !assessmentState) return null;
    return deriveWeeklyAssessmentReadout(
      activeWeeklyAttempt,
      assessmentState.responses || [],
      assessmentState,
      BASELINE_ASSESSMENT_ITEMS
    );
  }, [activeWeeklyAttempt, assessmentState]);

  // ---------------------------------------------------------------------------
  // View 1: Active Assessment Runner
  // ---------------------------------------------------------------------------
  if (activeAssessmentAttempt && activeAssessmentAttempt.status === 'in_progress') {
    const recordedCurrent = currentItem ? responseMap.get(currentItem.id) : undefined;
    const answeredCount = responseMap.size;
    const totalCount = orderedItems.length;
    const formatTime = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const isTimerUrgent = timeRemainingSeconds < 15 * 60;
    const isTimerCritical = timeRemainingSeconds < 5 * 60;

    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-12">
        {/* Top Sticky Bar */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 sticky top-16 z-30 shadow-lg backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#1B2028] text-[#E5A93C] border border-[#3B4556]">
                {activeAssessmentAttempt.kind === 'weekly_assessment'
                  ? 'Sunday Adaptive Mini Test'
                  : activeAssessmentAttempt.kind === 'full_reassessment'
                  ? 'Full Diagnostic Reassessment'
                  : 'Baseline Diagnostic'}
              </span>
              <span className="text-sm font-semibold text-[#F1F5F9]">
                Question {currentIdx + 1} of {totalCount}
              </span>
              <span className="text-xs text-[#8E98A8]">
                ({answeredCount} answered, {totalCount - answeredCount} remaining)
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-sm font-semibold border ${
                  isTimerCritical
                    ? 'bg-red-950/40 text-red-400 border-red-800 animate-pulse'
                    : isTimerUrgent
                    ? 'bg-amber-950/40 text-amber-400 border-amber-800'
                    : 'bg-[#1B2028] text-[#F1F5F9] border-[#262D38]'
                }`}
                title="Hard wall-clock time limit (180 minutes). Auto-submits when expired."
              >
                <Clock className="size-4 text-[#E5A93C]" />
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] hover:bg-[#262D38] text-[#F1F5F9] border border-[#3B4556] transition-colors"
              >
                Finish & Submit
              </button>
            </div>
          </div>

          {/* Module Progress Strip */}
          <div className="mt-3 pt-3 border-t border-[#262D38]/60 flex items-center justify-between text-xs text-[#8E98A8]">
            <div className="flex items-center gap-2">
              <span className="text-[#E5A93C] font-medium uppercase tracking-wide">
                Domain: {currentItem?.domainId.toUpperCase()}
              </span>
              <span>·</span>
              <span className="text-[#CBD5E1]">{currentItem?.competency}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="capitalize px-2 py-0.5 rounded bg-[#1B2028] text-[11px] border border-[#262D38]">
                Difficulty: {currentItem?.difficulty === 1 ? 'Easy (0.8x)' : currentItem?.difficulty === 2 ? 'Medium (1.0x)' : currentItem?.difficulty === 3 ? 'Hard (1.3x)' : 'Very Hard (1.7x)'}
              </span>
              <span>Est: ~{currentItem?.estimatedMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Main Workspace: Question Area + Question Grid Navigator */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel (3 cols) */}
          <div className="lg:col-span-3 bg-[#14171D] border border-[#262D38] rounded-md p-6 space-y-6">
            {currentItem ? (
              <>
                {/* Question Prompt */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8E98A8]">ID: {currentItem.id}</span>
                    <span className="text-xs text-[#5C6675] font-mono">{currentItem.assessmentRole} stage</span>
                  </div>

                  <div className="text-base text-[#F1F5F9] leading-relaxed whitespace-pre-wrap font-sans bg-[#0D0F12]/60 p-4 rounded border border-[#262D38]/60">
                    {currentItem.prompt}
                  </div>
                </div>

                {/* Answer Input Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
                    Your Response
                  </h4>

                  {/* 1. Multiple Choice Options */}
                  {currentItem.options && currentItem.options.length > 0 && (
                    <div className="space-y-2.5">
                      {currentItem.options.map((opt, oIdx) => {
                        const isSelected = recordedCurrent?.response === oIdx;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswerChange(oIdx)}
                            className={`w-full text-left p-3.5 rounded text-sm transition-all border flex items-start gap-3 ${
                              isSelected
                                ? 'bg-[#E5A93C]/10 border-[#E5A93C] text-[#F1F5F9] font-medium ring-1 ring-[#E5A93C]'
                                : 'bg-[#1B2028]/60 border-[#262D38] text-[#CBD5E1] hover:bg-[#1B2028] hover:border-[#3B4556]'
                            }`}
                          >
                            <span
                              className={`size-5 rounded flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${
                                isSelected ? 'bg-[#E5A93C] text-[#0D0F12] font-bold' : 'bg-[#262D38] text-[#8E98A8]'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. SQL Query Input */}
                  {currentItem.scoring.kind === 'normalized_match' && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#8E98A8]">
                        Enter standard SQL query. Scoring evaluates exact syntactic normalization against acceptable forms.
                      </p>
                      <textarea
                        value={textInput}
                        onChange={(e) => {
                          setTextInput(e.target.value);
                          handleAnswerChange(e.target.value);
                        }}
                        placeholder="SELECT ... FROM ... WHERE ..."
                        rows={5}
                        className="w-full bg-[#0D0F12] text-[#F1F5F9] font-mono text-xs p-3.5 rounded border border-[#262D38] focus:border-[#E5A93C] focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* 3. Written / Rubric Input */}
                  {currentItem.scoring.kind === 'rubric' && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#8E98A8]">
                        Provide your written response below. (Evaluated deterministically according to authored rubric criteria).
                      </p>
                      <textarea
                        value={textInput}
                        onChange={(e) => {
                          setTextInput(e.target.value);
                          handleAnswerChange(e.target.value);
                        }}
                        placeholder="Write your explanation or reasoning..."
                        rows={6}
                        className="w-full bg-[#0D0F12] text-[#F1F5F9] font-sans text-xs p-3.5 rounded border border-[#262D38] focus:border-[#E5A93C] focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Honest "I Don't Know" Button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleAnswerChange('dont_know')}
                      className={`px-3 py-1.5 rounded text-xs transition-colors border flex items-center gap-1.5 ${
                        recordedCurrent?.response === 'dont_know'
                          ? 'bg-amber-950/30 border-amber-600/70 text-amber-300 font-medium'
                          : 'bg-transparent border-[#262D38] text-[#8E98A8] hover:text-[#CBD5E1] hover:border-[#3B4556]'
                      }`}
                      title="Flag as 'I don't know' without guessing. This separates lack of knowledge from unlucky guessing."
                    >
                      <HelpCircle className="size-3.5" />
                      <span>I don&apos;t know this concept</span>
                    </button>

                    {recordedCurrent && (
                      <button
                        onClick={() => handleAnswerChange(null)}
                        className="text-xs text-[#8E98A8] hover:text-red-400 transition-colors"
                      >
                        Clear response
                      </button>
                    )}
                  </div>
                </div>

                {/* Confidence Self-Reporting */}
                <div className="pt-4 border-t border-[#262D38] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#8E98A8] flex items-center gap-1.5">
                      <span>How confident are you in this answer?</span>
                      <span className="text-[11px] text-[#5C6675]">(Used for error diagnosis only; never alters points)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['guessing', 'somewhat', 'confident'] as const).map((conf) => {
                      const isConfSelected = recordedCurrent?.confidence === conf;
                      return (
                        <button
                          key={conf}
                          onClick={() => handleConfidenceChange(conf)}
                          className={`py-1.5 px-3 rounded text-xs capitalize transition-all border ${
                            isConfSelected
                              ? 'bg-[#1B2028] border-[#E5A93C] text-[#E5A93C] font-medium'
                              : 'bg-[#0D0F12]/60 border-[#262D38] text-[#8E98A8] hover:text-[#CBD5E1]'
                          }`}
                        >
                          {conf === 'somewhat' ? 'Somewhat confident' : conf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-[#262D38]">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#262D38] transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                    <span>Previous Question</span>
                  </button>

                  <div className="text-xs font-mono text-[#8E98A8]">
                    {currentIdx + 1} / {totalCount}
                  </div>

                  {currentIdx < totalCount - 1 ? (
                    <button
                      onClick={() => setCurrentIdx((prev) => Math.min(totalCount - 1, prev + 1))}
                      className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[#E5A93C] text-[#0D0F12] font-semibold hover:bg-[#D4982B] transition-colors"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[#10B981] text-[#0D0F12] font-bold hover:bg-[#059669] transition-colors"
                    >
                      <span>Finish & Submit</span>
                      <CheckCircle2 className="size-4" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#8E98A8]">No question found.</div>
            )}
          </div>

          {/* Question Palette Sidebar (1 col) */}
          <div className="space-y-4">
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#CBD5E1]">
                  Question Palette
                </h3>
                <span className="text-[11px] font-mono text-[#8E98A8]">
                  {answeredCount}/{totalCount}
                </span>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#8E98A8] pb-2 border-b border-[#262D38]">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm bg-[#10B981]/20 border border-[#10B981]" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm bg-amber-950/40 border border-amber-500" />
                  <span>Don&apos;t know</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm bg-[#1B2028] border border-[#3B4556]" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm border-2 border-[#E5A93C]" />
                  <span>Current</span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5 max-h-[460px] overflow-y-auto pr-1">
                {orderedItems.map((item, idx) => {
                  const resp = responseMap.get(item.id);
                  const isCurrent = idx === currentIdx;
                  const isAnswered = resp && resp.response !== 'unanswered' && resp.response !== 'dont_know';
                  const isDk = resp && resp.response === 'dont_know';

                  let btnColor = 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]';
                  if (isAnswered) {
                    btnColor = 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/60 font-semibold';
                  } else if (isDk) {
                    btnColor = 'bg-amber-950/40 text-amber-400 border-amber-600/60 font-medium';
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-7 rounded text-[11px] font-mono transition-all border flex items-center justify-center ${btnColor} ${
                        isCurrent ? 'ring-2 ring-[#E5A93C] border-[#E5A93C]' : ''
                      }`}
                      title={`Q${idx + 1}: ${item.domainId} · ${item.competency}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assessment Invariants Notice */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 space-y-2 text-[11px] text-[#8E98A8]">
              <div className="flex items-center gap-1.5 text-[#E5A93C] font-medium">
                <Info className="size-3.5" />
                <span>Deterministic Rules</span>
              </div>
              <p className="leading-relaxed">
                Scoring applies authored weights, chance correction (c&apos; = (c - 1/k) / (1 - 1/k)), and module caps. Diagnostic scoring never mutates normal DSA mastery or ordinary practice rungs.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3 text-[#E5A93C]">
                <AlertTriangle className="size-6" />
                <h3 className="text-base font-semibold text-[#F1F5F9]">Submit Baseline Assessment?</h3>
              </div>

              <div className="space-y-3 text-xs text-[#CBD5E1]">
                <p>
                  You have answered <span className="font-semibold text-[#10B981]">{answeredCount}</span> of{' '}
                  <span className="font-semibold">{totalCount}</span> questions.
                </p>
                {totalCount - answeredCount > 0 && (
                  <p className="text-amber-400">
                    Warning: {totalCount - answeredCount} questions are still unanswered. Unanswered questions will receive 0 credit and be marked as timing/speed signals.
                  </p>
                )}
                <p className="text-[#8E98A8]">
                  {activeAssessmentAttempt?.kind === 'weekly_assessment'
                    ? 'Once submitted, your Sunday calibration results and weakness signal updates will be saved permanently to storage.'
                    : 'Once submitted, your baseline capability profile will be computed and saved permanently to storage.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded text-xs font-medium bg-[#1B2028] text-[#CBD5E1] border border-[#262D38] hover:bg-[#262D38]"
                >
                  Continue Assessment
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    submitAssessmentAttempt(activeAssessmentAttempt.id, false);
                  }}
                  className="px-4 py-2 rounded text-xs font-semibold bg-[#E5A93C] text-[#0D0F12] hover:bg-[#D4982B]"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: Phase D Profile & Plan Readout View
  // ---------------------------------------------------------------------------
  if (assessmentProfileReadout.isAssessed) {
    const { domainProfiles, strengths, weaknesses, overallAbility, assessedDomainsCount, planInputs } = assessmentProfileReadout;
    const dateFormatted = latestCompletedAttempt
      ? new Date(latestCompletedAttempt.endedAt || latestCompletedAttempt.startedAt).toLocaleString()
      : 'Authoritative Baseline';

    const classAProfiles = domainProfiles.filter((d) => d.category === 'Class A');
    const classBProfiles = domainProfiles.filter((d) => d.category === 'Class B');
    const classCProfile = domainProfiles.find((d) => d.category === 'Class C');

    return (
      <div className="max-w-[1280px] mx-auto space-y-8 pb-16">
        {/* Navigation Tabs between Baseline Profile and Sunday Tests */}
        <div className="flex items-center gap-2 border-b border-[#262D38] pb-2">
          <button
            onClick={() => setReadoutTab('baseline')}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${
              readoutTab === 'baseline'
                ? 'bg-[#E5A93C] text-[#0D0F12]'
                : 'bg-[#14171D] text-[#8E98A8] hover:text-[#F1F5F9] border border-[#262D38]'
            }`}
          >
            <Target className="size-3.5" />
            <span>Baseline Diagnostic Profile</span>
          </button>

          <button
            onClick={() => setReadoutTab('weekly')}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${
              readoutTab === 'weekly'
                ? 'bg-[#E5A93C] text-[#0D0F12]'
                : 'bg-[#14171D] text-[#8E98A8] hover:text-[#F1F5F9] border border-[#262D38]'
            }`}
          >
            <Clock className="size-3.5" />
            <span>Sunday Adaptive Mini-Tests ({completedWeeklyAttempts.length})</span>
            {pendingSundayObligation && (
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {readoutTab === 'baseline' ? (
          <>
            {/* Readout Header Banner */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                      {latestCompletedAttempt?.status === 'auto_submitted' ? 'Auto-Submitted (180m Limit)' : 'Completed & Sealed'}
                    </span>
                    <span className="text-xs text-[#8E98A8] font-mono">Attempt: {latestCompletedAttempt?.id || 'baseline'}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight">
                    Baseline Diagnostic Capability Readout
                  </h1>
                  <p className="text-xs sm:text-sm text-[#8E98A8] mt-1">
                    Completed on {dateFormatted} · {assessedDomainsCount} Assessed Domains · Authoritative Placement Baseline (Phase D)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRoute('dashboard')}
                    className="px-4 py-2 rounded text-xs font-medium bg-[#E5A93C] text-[#0D0F12] font-semibold hover:bg-[#D4982B] flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Today Plan</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#262D38]/80 text-xs">
                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Domains Assessed</div>
                  <div className="text-base font-bold text-[#F1F5F9] mt-0.5">{assessedDomainsCount} / 11</div>
                  <div className="text-[10px] text-[#5C6675]">Projects excluded</div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Average Ability Score</div>
                  <div className="text-base font-bold text-[#E5A93C] mt-0.5">
                    {overallAbility}
                    <span className="text-xs text-[#8E98A8]">/100</span>
                  </div>
                  <div className="text-[10px] text-[#5C6675]">Chance-corrected</div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Identified Weaknesses</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{weaknesses.length}</div>
                  <div className="text-[10px] text-[#5C6675]">Signals for planner</div>
                </div>

                <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                  <div className="text-[#8E98A8] text-[11px]">Evidence Source</div>
                  <div className="text-base font-bold text-[#38BDF8] mt-0.5 font-mono">sourceType: &apos;test&apos;</div>
                  <div className="text-[10px] text-[#5C6675]">Deterministic rungs</div>
                </div>
              </div>
            </div>

            {/* Sunday Mini Test Integration Card (§15, §18) */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E5A93C] flex items-center gap-1.5">
                    <Clock className="size-4" />
                    <span>Weekly Calibration</span>
                  </span>
                  {pendingSundayObligation ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Obligation Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                      Eligible (Baseline Completed)
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#F1F5F9]">
                  Sunday Adaptive Mini Test (90 Minutes)
                </h3>
                <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
                  Targeted weekly calibration under a 90-minute hard wall-clock limit (&le; 78 min item budget + 12 min buffer). Composed of 60% diagnosed weaknesses, 20% recent curriculum topics, and 20% retention checks across &ge; 6 domains.
                </p>
              </div>

              <button
                onClick={() => {
                  startSundayAssessment();
                  setCurrentIdx(0);
                }}
                className="px-5 py-2.5 rounded text-xs font-semibold bg-[#E5A93C] text-[#0D0F12] hover:bg-[#D4982B] transition-colors whitespace-nowrap shadow-sm shrink-0"
              >
                Start Sunday Mini Test
              </button>
            </div>

            {/* Phase F: Full Diagnostic Reassessment Card (§19) */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8] font-bold">
                    Authoritative Longitudinal Calibration
                  </span>
                  {assessmentProfileReadout.isReassessmentRecommended && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      Recommended (&ge; 6 Weeks Elapsed)
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#F1F5F9]">
                  Full Diagnostic Reassessment (180 Minutes)
                </h3>
                <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
                  Full 10-module comprehensive assessment across 84 items. Evaluates longitudinal capability, confirms provisional levels (&ge; 2 consistent observations), and applies conservative regression gates (§17). Always manually initiated.
                </p>
              </div>

              <button
                onClick={() => {
                  startFullReassessment();
                  setCurrentIdx(0);
                }}
                className="px-5 py-2.5 rounded text-xs font-semibold bg-[#1B2028] text-[#38BDF8] hover:bg-[#262D38] border border-[#38BDF8]/40 transition-colors whitespace-nowrap shadow-sm shrink-0"
              >
                Run Full Diagnostic Again
              </button>
            </div>

            {/* Phase G: Target Company / Role Overlay (§28) */}
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8] font-bold flex items-center gap-1.5">
                      <Briefcase className="size-4" />
                      <span>Company / Role Overlay (§28)</span>
                    </span>
                    {companyAssessmentOverlayResult ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
                        Overlay Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                        General Profile (Authoritative)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
                    Evaluate readiness against target role requirements without forking or replacing your authoritative capability profile.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="company-overlay-select" className="text-xs text-[#8E98A8] whitespace-nowrap">Target Role:</label>
                  <select
                    id="company-overlay-select"
                    value={selectedCompanyOverlayId ?? ''}
                    onChange={(e) => setSelectedCompanyOverlayId(e.target.value ? e.target.value : null)}
                    className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#38BDF8]"
                  >
                    <option value="">None (General Capability Profile)</option>
                    {(companyOverlays || []).map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.companyName} — {comp.targetRole}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {companyAssessmentOverlayResult && (
                <div className="pt-2 border-t border-[#262D38]/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F1F5F9]">
                        {companyAssessmentOverlayResult.companyName}
                      </span>
                      <span className="text-[#8E98A8]">·</span>
                      <span className="text-[#CBD5E1]">{companyAssessmentOverlayResult.targetRole}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                        v{companyAssessmentOverlayResult.overlayVersion}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#5C6675]">
                      Provenance: {companyAssessmentOverlayResult.provenance}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                      <div className="text-[#8E98A8] text-[10px]">Role Readiness</div>
                      <div className="text-base font-bold text-[#38BDF8] mt-0.5">
                        {companyAssessmentOverlayResult.rolePreparationScore}%
                      </div>
                      <div className="text-[10px] text-[#5C6675]">Weighted required domains</div>
                    </div>
                    <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                      <div className="text-[#8E98A8] text-[10px]">Required Domains</div>
                      <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                        {companyAssessmentOverlayResult.metDomainsCount} / {companyAssessmentOverlayResult.requiredDomainsCount} Met
                      </div>
                      <div className="text-[10px] text-[#5C6675]">Target levels reached</div>
                    </div>
                    <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                      <div className="text-[#8E98A8] text-[10px]">Open Gaps</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        {companyAssessmentOverlayResult.gapDomainsCount} Domains
                      </div>
                      <div className="text-[10px] text-[#5C6675]">Below role threshold</div>
                    </div>
                    <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                      <div className="text-[#8E98A8] text-[10px]">General Ability</div>
                      <div className="text-base font-bold text-[#10B981] mt-0.5">
                        {companyAssessmentOverlayResult.generalOverallAbility} / 100
                      </div>
                      <div className="text-[10px] text-[#5C6675]">Authoritative base</div>
                    </div>
                  </div>

                  {companyAssessmentOverlayResult.topRoleGaps.length > 0 && (
                    <div className="bg-[#1B2028] p-3 rounded border border-amber-900/30 p-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-amber-300">
                        Top Role Priority Gaps for {companyAssessmentOverlayResult.companyName}:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {companyAssessmentOverlayResult.topRoleGaps.map((gap: { domainId: string; domainName: string; currentLevel: number; targetLevel: number; gap: number }) => (
                          <span
                            key={gap.domainId}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40"
                          >
                            {gap.domainName}: Level {gap.currentLevel} &rarr; Target L{gap.targetLevel} (Gap: {gap.gap})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-[#5C6675] italic">
                    Note: General capability profile remains authoritative. Role overlays never overwrite stored levels or evidence logs.
                  </div>
                </div>
              )}
            </div>

        {/* 11-Domain Capability Matrix */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Target className="size-4 text-[#E5A93C]" />
              <span>Domain Capability Matrix (All 11 Domains)</span>
            </h2>
            <span className="text-xs text-[#8E98A8]">Provisional Levels (0 to 5) · Ability (0–100)</span>
          </div>

          {/* Class A: Core Technical Domains */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8] flex items-center gap-2">
              <span>Class A: Full Construct Assessment</span>
              <span className="text-[10px] text-[#5C6675] font-normal">(Objective + algorithmic + theoretical)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {classAProfiles.map((dp) => (
                <div key={dp.domainId} className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
                        {dp.domainId.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-[#8E98A8] mt-0.5">{dp.levelLabel}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {dp.recentSignal === 'regression' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/40" title={dp.recentSignalReason}>
                          Regressed
                        </span>
                      )}
                      {dp.recentSignal === 'confirmation' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" title={dp.recentSignalReason}>
                          Confirmed
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          dp.provisional
                            ? 'bg-amber-950/20 text-amber-400 border-amber-800/40'
                            : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
                        }`}
                        title={dp.provisional ? 'Provisional: requires >= 2 consistent subsequent assessments' : 'Confirmed level'}
                      >
                        {dp.provisional ? 'Provisional' : 'Confirmed'}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          dp.confidence === 'high'
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                            : dp.confidence === 'medium'
                            ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40'
                            : 'bg-amber-950/20 text-amber-400 border-amber-800/40'
                        }`}
                      >
                        {dp.confidence} conf
                      </span>
                    </div>
                  </div>

                  {/* Ability Score Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#8E98A8]">Demonstrated Ability</span>
                      <span className="text-[#E5A93C] font-semibold">{dp.abilityScore}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#1B2028] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E5A93C] rounded-full transition-all duration-500"
                        style={{ width: `${dp.abilityScore}%` }}
                      />
                    </div>
                  </div>

                  {companyAssessmentOverlayResult && (
                    (() => {
                      const dr = companyAssessmentOverlayResult.domainReadiness.find((d: { domainId: string }) => d.domainId === dp.domainId);
                      if (!dr || !dr.isRoleRequired) return null;
                      return (
                        <div className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-[#1B2028] border border-[#262D38]">
                          <span className="text-[#8E98A8]">Role Target:</span>
                          <span className={dr.status === 'met' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {dr.status === 'met' ? `Met (L${dr.roleTargetLevel})` : `Target L${dr.roleTargetLevel} (Gap: -${dr.gap})`}
                          </span>
                        </div>
                      );
                    })()
                  )}

                  <div className="text-[11px] text-[#5C6675] flex items-center justify-between pt-1 border-t border-[#262D38]/60">
                    <span>
                      {dp.latestAssessmentKind
                        ? `${dp.latestAssessmentKind === 'full_reassessment' ? 'Reassessment' : dp.latestAssessmentKind === 'weekly_assessment' ? 'Sunday Mini' : 'Baseline'} (${dp.latestAssessmentDate?.slice(0, 10)})`
                        : `Status: ${dp.status}`}
                    </span>
                    <span className="font-mono text-[#8E98A8]">Level {dp.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class B: Partial Construct Domains */}
          <div className="space-y-3 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8] flex items-center gap-2">
              <span>Class B: Partial Construct Measurements</span>
              <span className="text-[10px] text-[#5C6675] font-normal">(Reasoning / written / knowledge proxies)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {classBProfiles.map((dp) => (
                <div key={dp.domainId} className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">
                        {dp.domainId.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-[#8E98A8] mt-0.5">{dp.levelLabel}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {dp.recentSignal === 'regression' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/40" title={dp.recentSignalReason}>
                          Regressed
                        </span>
                      )}
                      {dp.recentSignal === 'confirmation' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" title={dp.recentSignalReason}>
                          Confirmed
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          dp.provisional
                            ? 'bg-amber-950/20 text-amber-400 border-amber-800/40'
                            : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
                        }`}
                        title={dp.provisional ? 'Provisional: requires >= 2 consistent subsequent assessments' : 'Confirmed level'}
                      >
                        {dp.provisional ? 'Provisional' : 'Confirmed'}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40">
                        {dp.confidence} conf
                      </span>
                    </div>
                  </div>

                  {/* Ability Score Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#8E98A8]">Demonstrated Ability</span>
                      <span className="text-[#E5A93C] font-semibold">{dp.abilityScore}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#1B2028] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E5A93C] rounded-full transition-all duration-500"
                        style={{ width: `${dp.abilityScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-[#38BDF8] pt-1 border-t border-[#262D38]/60 leading-tight">
                    <span className="font-semibold">Construct Limitation: </span>
                    {dp.constructScopeNote || dp.constructScope}
                  </div>

                  {companyAssessmentOverlayResult && (
                    (() => {
                      const dr = companyAssessmentOverlayResult.domainReadiness.find((d: { domainId: string }) => d.domainId === dp.domainId);
                      if (!dr || !dr.isRoleRequired) return null;
                      return (
                        <div className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-[#1B2028] border border-[#262D38]">
                          <span className="text-[#8E98A8]">Role Target:</span>
                          <span className={dr.status === 'met' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {dr.status === 'met' ? `Met (L${dr.roleTargetLevel})` : `Target L${dr.roleTargetLevel} (Gap: -${dr.gap})`}
                          </span>
                        </div>
                      );
                    })()
                  )}

                  <div className="text-[11px] text-[#5C6675] flex items-center justify-between pt-1 border-t border-[#262D38]/60">
                    <span>
                      {dp.latestAssessmentKind
                        ? `${dp.latestAssessmentKind === 'full_reassessment' ? 'Reassessment' : dp.latestAssessmentKind === 'weekly_assessment' ? 'Sunday Mini' : 'Baseline'} (${dp.latestAssessmentDate?.slice(0, 10)})`
                        : `Status: ${dp.status}`}
                    </span>
                    <span className="font-mono text-[#8E98A8]">Level {dp.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class C: Projects (Excluded from automated baseline) */}
          {classCProfile && (
            <div className="space-y-3 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8]">
                Class C: Project Portfolio
              </div>

              <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F5F9]">PROJECTS</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                      Level 0 · Unassessed · Confidence: None
                    </span>
                  </div>
                  <p className="text-xs text-[#8E98A8] max-w-2xl">
                    {classCProfile.constructScopeNote}
                  </p>
                </div>

                <button
                  onClick={() => setRoute('project')}
                  className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] text-[#CBD5E1] hover:text-[#F1F5F9] border border-[#3B4556] whitespace-nowrap transition-colors"
                >
                  Open Project Lab
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* Phase D: Initial Adaptive Plan Inputs (§26.1)                    */}
        {/* ================================================================= */}
        <div className="space-y-6 pt-4 border-t border-[#262D38]/80">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Compass className="size-4 text-[#E5A93C]" />
              <span>Initial Adaptive Plan Inputs (§26.1)</span>
            </h2>
            <span className="text-xs text-[#8E98A8]">Personalized Starting Points &amp; Multipliers</span>
          </div>

          {/* Starting Points Table */}
          <div className="bg-[#14171D] border border-[#262D38] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#1B2028]/60 border-b border-[#262D38] flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5">
                <ListOrdered className="size-3.5 text-[#E5A93C]" />
                Recommended Starting Sequence (Priority Ranked)
              </span>
              <span className="text-[#8E98A8] font-mono">11 Domains</span>
            </div>

            <div className="divide-y divide-[#262D38]/60 text-xs">
              {planInputs.startingPoints.map((sp) => (
                <div key={sp.domainId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1B2028]/30">
                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded flex items-center justify-center font-mono text-[11px] bg-[#1B2028] text-[#E5A93C] border border-[#262D38] shrink-0 mt-0.5">
                      #{sp.priorityRank}
                    </span>
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-[#F1F5F9]">
                        {sp.domainId} · <span className="text-[#CBD5E1] font-normal">{sp.topicName}</span>
                      </div>
                      <div className="text-[11px] text-[#8E98A8] mt-0.5">{sp.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#1B2028] border border-[#262D38] text-[#CBD5E1] capitalize">
                      Ladder: {sp.recommendedDifficulty}
                    </span>
                    <span className="text-[#8E98A8]">
                      {planInputs.domainEmphases[sp.domainId]?.reviewFrequencyMultiplier > 1.0 ? '1.5x review density' : '1.0x standard'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Frequency & Priority Adjustments Card */}
          <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#E5A93C]">
              <Layers className="size-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Strategic Plan Emphasis Multipliers (§26.1)
              </h3>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              The diagnostic assessment adjusts topic priority and review frequency multipliers within the existing curriculum without rewriting master phases or tasks:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 font-mono">
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
                <div className="text-[#E55353] font-semibold">Weak Domains (&lt;40 or errors)</div>
                <div className="text-[#F1F5F9] font-bold">1.5× Review Frequency</div>
                <div className="text-[11px] text-[#8E98A8]">1.3× Task Priority Multiplier</div>
              </div>
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
                <div className="text-[#FFC665] font-semibold">Intermediate (Level 3)</div>
                <div className="text-[#F1F5F9] font-bold">1.2× Review Frequency</div>
                <div className="text-[11px] text-[#8E98A8]">1.1× Task Priority Multiplier</div>
              </div>
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
                <div className="text-[#4EAE79] font-semibold">Mastered (Level 4–5)</div>
                <div className="text-[#F1F5F9] font-bold">1.0× Routine Spaced Repetition</div>
                <div className="text-[11px] text-[#8E98A8]">0.85× Normal Retention Priority</div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosed Weaknesses & Strengths */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Weakness Signals */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-400" />
              <span>Diagnosed Weakness Signals ({weaknesses.length})</span>
            </h2>

            {weaknesses.length > 0 ? (
              <div className="space-y-2.5">
                {weaknesses.map((ws) => (
                  <div
                    key={ws.id}
                    className="bg-[#14171D] border border-amber-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-amber-300">
                        {ws.domainId} · {ws.competency}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        Taxonomy: {ws.errorCategory}
                      </span>
                    </div>
                    <div className="text-[#CBD5E1] text-[11px]">
                      {ws.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 text-xs text-[#8E98A8]">
                No critical weakness signals detected.
              </div>
            )}
          </div>

          {/* Confirmed Strengths */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <TrendingUp className="size-4 text-[#10B981]" />
              <span>Demonstrated Strengths ({strengths.length})</span>
            </h2>

            {strengths.length > 0 ? (
              <div className="space-y-2.5">
                {strengths.map((st) => (
                  <div
                    key={st.domainId}
                    className="bg-[#14171D] border border-emerald-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-emerald-300">
                        {st.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        Level {st.level} · {st.abilityScore}/100
                      </span>
                    </div>
                    <div className="text-[#CBD5E1] text-[11px]">
                      {st.summary}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 text-xs text-[#8E98A8]">
                No domains reached Job Ready (Level 4) or Strong (Level 5) in this baseline. Focus on the starting sequence to build core capabilities.
              </div>
            )}
          </div>
        </div>

        {/* Skills Subsystem Integration & Dual Readiness Notice (§24) */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-2.5 text-xs text-[#8E98A8]">
          <div className="flex items-center gap-2 text-[#38BDF8] font-medium">
            <Activity className="size-4" />
            <span>Dual Readiness Integration (§24 Precedence &amp; Conflict Rules)</span>
          </div>
          <p className="leading-relaxed text-[#CBD5E1]">
            PlacementOS maintains a strict separation between <strong>Standardized Diagnostic Capability</strong> (this baseline profile) and <strong>Longitudinal Working Readiness</strong> (from daily practice and task completions in the Skills Matrix). Downstream scheduling conservatively respects the more conservative of the two so that fundamental concepts are never skipped. Diagnostic evidence is logged with <code className="font-mono text-[#38BDF8]">sourceType: &apos;test&apos;</code> and never mutates DSA-150 mastery or Leitner intervals.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setRoute('skills')}
              className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] hover:bg-[#262D38] transition-colors"
            >
              Inspect Skills Matrix
            </button>
            <button
              onClick={() => setRoute('preparation')}
              className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] hover:bg-[#262D38] transition-colors"
            >
              Go to Preparation Hub
            </button>
          </div>
        </div>

        {/* Phase G: Calibration Instrumentation Informational Card (§9.4 / DECIDED 6) */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-3 text-xs text-[#8E98A8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#E5A93C] font-semibold">
              <Compass className="size-4" />
              <span>Calibration Instrumentation (§9.4 / DECIDED 6 Groundwork)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
              Empirical Calibration: Inactive (V1 Deterministic)
            </span>
          </div>
          <p className="leading-relaxed text-[#CBD5E1]">
            PlacementOS records granular item response latency, accuracy, and error categories for prospective psychometric calibration. In accordance with DECIDED 6, empirical calibration remains inactive until single-item sample volumes reach &ge; 200 responses across &ge; 50 distinct attempts. <strong>Authored difficulty weights remain strictly authoritative.</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono pt-1">
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-[10px] text-[#8E98A8]">Recorded Observations</div>
              <div className="text-sm font-bold text-[#38BDF8] mt-0.5">
                {assessmentState?.calibrationObservations?.length ?? 0}
              </div>
              <div className="text-[10px] text-[#5C6675]">Item response records</div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-[10px] text-[#8E98A8]">Scoring Engine</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                Authored Difficulty (100%)
              </div>
              <div className="text-[10px] text-[#5C6675]">Deterministic rungs</div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-[10px] text-[#8E98A8]">Calibration Status</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                Insufficient Data
              </div>
              <div className="text-[10px] text-[#5C6675]">Threshold: &ge;200 responses / 50 attempts</div>
            </div>
          </div>
        </div>
      </>
    ) : (
      /* Sunday Mini-Tests View */
      <div className="space-y-6">
        {/* Sunday Launcher Card */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#E5A93C] flex items-center gap-1.5">
                  <Clock className="size-4" />
                  <span>Sunday Adaptive Mini Test</span>
                </span>
                {pendingSundayObligation ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Pending Calibration
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                    Eligible
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[#F1F5F9]">
                90-Minute Weekly Calibration System (&sect;15)
              </h2>
              <p className="text-xs text-[#8E98A8] mt-1 max-w-2xl leading-relaxed">
                Deterministic mini-test calibrated to your diagnosed weaknesses (60%), recent curriculum topics (20%), and retention checks (20%). Hard 90-minute limit (5400s) with &le; 78 minutes item budget (+12m buffer).
              </p>
            </div>

            <button
              onClick={() => {
                startSundayAssessment();
                setCurrentIdx(0);
              }}
              className="px-5 py-2.5 rounded text-xs font-semibold bg-[#E5A93C] text-[#0D0F12] hover:bg-[#D4982B] transition-colors whitespace-nowrap shadow-sm shrink-0"
            >
              Start Sunday Mini Test
            </button>
          </div>

          {/* Sunday Test Composition Spec */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#262D38]/80 text-xs">
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-amber-400 font-semibold">60% Prior Weaknesses</div>
              <div className="text-[11px] text-[#8E98A8] mt-0.5">
                Reinforces unresolved errors (&ge; 2 items/weak domain)
              </div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-[#38BDF8] font-semibold">20% Recent Material</div>
              <div className="text-[11px] text-[#8E98A8] mt-0.5">
                Validates recent 14-day study &amp; task topics
              </div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
              <div className="text-[#10B981] font-semibold">20% Retention Checks</div>
              <div className="text-[11px] text-[#8E98A8] mt-0.5">
                Checks mastered domains to guard against drift
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Readout Section */}
        {completedWeeklyAttempts.length > 0 && weeklyReadout ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <Calendar className="size-4 text-[#E5A93C]" />
                <span>Weekly Calibration Report</span>
              </h3>

              {completedWeeklyAttempts.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#8E98A8]">Test Date:</span>
                  <select
                    value={activeWeeklyAttempt?.id}
                    onChange={(e) => setSelectedWeeklyAttemptId(e.target.value)}
                    className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] rounded px-2.5 py-1 text-xs"
                  >
                    {completedWeeklyAttempts.map((a, idx) => (
                      <option key={a.id} value={a.id}>
                        Sunday Test #{idx + 1} — {new Date(a.endedAt || a.startedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Report Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[11px]">Accuracy</div>
                <div className="text-base font-bold text-[#10B981] mt-0.5">
                  {weeklyReadout.accuracyPct}%
                </div>
                <div className="text-[10px] text-[#5C6675]">
                  {weeklyReadout.correctCount} / {weeklyReadout.totalItems} items
                </div>
              </div>

              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[11px]">Time Spent</div>
                <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                  {weeklyReadout.totalTimeMinutes}m
                </div>
                <div className="text-[10px] text-[#5C6675]">90 min hard limit</div>
              </div>

              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[11px]">Weaknesses Targeted</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {weeklyReadout.weaknessesTargeted.length}
                </div>
                <div className="text-[10px] text-[#5C6675]">Signals evaluated</div>
              </div>

              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[11px]">Retention Checks</div>
                <div className="text-base font-bold text-[#38BDF8] mt-0.5">
                  {weeklyReadout.retentionChecks.length}
                </div>
                <div className="text-[10px] text-[#5C6675]">Level &ge; 3 domains</div>
              </div>
            </div>

            {/* Weaknesses Targeted Detail */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8]">
                Weakness Signals Targeted in this Calibration
              </h4>
              {weeklyReadout.weaknessesTargeted.length > 0 ? (
                <div className="space-y-2.5">
                  {weeklyReadout.weaknessesTargeted.map((wt, idx) => (
                    <div
                      key={`${wt.domainId}-${wt.competency}-${idx}`}
                      className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-[#F1F5F9]">
                          {wt.domainId} &middot; {wt.competency}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            wt.status === 'resolved'
                              ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                              : wt.status === 'reinforced'
                              ? 'bg-[#E55353]/20 text-[#E55353] border-[#E55353]/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {wt.status === 'resolved'
                            ? 'Resolved (Level Advanced)'
                            : wt.status === 'reinforced'
                            ? 'Reinforced (Persists)'
                            : 'Open'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8E98A8]">
                        Remediation: {wt.remediationAction}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 text-xs text-[#8E98A8]">
                  No active weakness signals were targeted in this test.
                </div>
              )}
            </div>

            {/* Domain Results Snapshot */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E98A8]">
                Domain Results Snapshot
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weeklyReadout.domainResults.map((dr) => (
                  <div key={dr.domainId} className="bg-[#14171D] border border-[#262D38] rounded-md p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase text-[#F1F5F9]">{dr.domainId}</span>
                      <span className="font-mono text-[#E5A93C]">Level {dr.level} / 5</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#8E98A8]">
                      <span>Ability: {dr.abilityScore}/100</span>
                      <span>{dr.coverage.topicsCovered}/{dr.coverage.topicsTotal} topics</span>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#14171D] border border-[#262D38] rounded-lg p-8 text-center space-y-2">
            <Clock className="size-8 text-[#5C6675] mx-auto" />
            <h3 className="text-sm font-semibold text-[#F1F5F9]">No Sunday mini-tests completed yet</h3>
            <p className="text-xs text-[#8E98A8] max-w-md mx-auto">
              Click &quot;Start Sunday Mini Test&quot; above when you are ready to begin your weekly 90-minute adaptive calibration.
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);
  }

  // ---------------------------------------------------------------------------
  // View 3: Assessment Introduction / Launch Screen
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-[1000px] mx-auto space-y-8 pb-16">
      {/* Intro Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1B2028] border border-[#262D38] text-xs font-mono text-[#E5A93C]">
          <BookOpen className="size-3.5" />
          <span>Assessment Specification v1.0 · Phase D: Profile &amp; Plan Readout</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">
          Baseline Diagnostic Assessment
        </h1>
        <p className="text-sm text-[#8E98A8] max-w-2xl leading-relaxed">
          The baseline diagnostic establishes your starting placement capability profile across 10 engineering and aptitude domains. It provides deterministic calibration for your daily roadmap and study plan.
        </p>
      </div>

      {/* Rules & Structure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#E5A93C] flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>Time Budget</span>
          </div>
          <div className="text-xl font-bold text-[#F1F5F9] font-mono">180 Minutes</div>
          <p className="text-xs text-[#8E98A8] leading-relaxed">
            Hard wall-clock limit (160m assessed content + 20m buffer). Cannot be paused. Auto-submits on expiration.
          </p>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
            <Target className="size-4" />
            <span>Scope &amp; Items</span>
          </div>
          <div className="text-xl font-bold text-[#F1F5F9] font-mono">84 Questions</div>
          <p className="text-xs text-[#8E98A8] leading-relaxed">
            10 modules covering Aptitude, DSA, Core CS, SQL, and Communication. Multistage anchor $\to$ branch ordering.
          </p>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            <span>Deterministic Scoring</span>
          </div>
          <div className="text-xl font-bold text-[#F1F5F9] font-mono">Zero LLM Grading</div>
          <p className="text-xs text-[#8E98A8] leading-relaxed">
            Objective keys, normalized SQL matching, and rubric constraints. Chance correction and difficulty weights.
          </p>
        </div>
      </div>

      {/* Domain Breakdown Table */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#262D38] bg-[#1B2028]/60 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
            Assessment Modules &amp; Blueprint
          </h3>
          <span className="text-xs text-[#8E98A8] font-mono">10 Modules · 180 min</span>
        </div>

        <div className="divide-y divide-[#262D38]/60 text-xs">
          {BASELINE_ASSESSMENT_DEFINITION.modules.map((mod, idx) => (
            <div key={mod.domainId} className="px-5 py-3 flex items-center justify-between hover:bg-[#1B2028]/30">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[#5C6675] w-6">M{idx + 1}</span>
                <span className="font-semibold text-[#F1F5F9] uppercase tracking-wider">{mod.domainId}</span>
              </div>
              <div className="flex items-center gap-6 text-[#8E98A8] font-mono">
                <span>{mod.itemCount} items</span>
                <span>~{mod.timeBudget} min</span>
              </div>
            </div>
          ))}

          <div className="px-5 py-3 flex items-center justify-between bg-[#1B2028]/20 text-[#5C6675]">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[#5C6675] w-6">—</span>
              <span className="font-semibold uppercase tracking-wider text-[#8E98A8]">Projects</span>
            </div>
            <span className="italic text-[11px]">Excluded from baseline (evaluated via Project Lab)</span>
          </div>
        </div>
      </div>

      {/* Start Call to Action */}
      <div className="bg-[#1B2028] border border-[#262D38] rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Ready to begin?</h3>
          <p className="text-xs text-[#8E98A8]">
            Ensure you have an uninterrupted 3-hour window. Your timer will start immediately upon clicking below.
          </p>
        </div>

        <button
          onClick={() => {
            startBaselineAssessment();
            setCurrentIdx(0);
          }}
          className="px-6 py-2.5 rounded text-xs font-semibold bg-[#E5A93C] text-[#0D0F12] hover:bg-[#D4982B] transition-colors whitespace-nowrap shadow-sm"
        >
          Start Baseline Assessment
        </button>
      </div>
    </div>
  );
};
