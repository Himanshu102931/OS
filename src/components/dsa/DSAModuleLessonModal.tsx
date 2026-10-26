import React, { useState } from 'react';
import type {
  ModuleLessonData,
  TeacherChallengeProblem,
} from '../../data/teacherEightDayDSAChallenge';
import {
  X,
  BookOpen,
  CheckCircle2,
  Brain,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';

interface DSAModuleLessonModalProps {
  lesson: ModuleLessonData;
  guidedProblems: readonly TeacherChallengeProblem[];
  isOpen: boolean;
  onClose: () => void;
  onOpenGuidedProblem: (problem: TeacherChallengeProblem) => void;
  savedPreCheckScore?: number;
  savedExitCheckScore?: number;
  onSaveProgress?: (progress: {
    preCheckAttempted?: boolean;
    preCheckScore?: number;
    coreConceptsViewed?: boolean;
    patternGuideViewed?: boolean;
    exitCheckAttempted?: boolean;
    exitCheckScore?: number;
  }) => void;
}

export const DSAModuleLessonModal: React.FC<DSAModuleLessonModalProps> = ({
  lesson,
  guidedProblems,
  isOpen,
  onClose,
  onOpenGuidedProblem,
  savedPreCheckScore,
  savedExitCheckScore,
  onSaveProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'precheck' | 'concepts' | 'patterns' | 'scaffolds' | 'exitcheck'>('precheck');

  // Pre-check state
  const [preCheckAnswers, setPreCheckAnswers] = useState<Record<string, number>>({});
  const [preCheckSubmitted, setPreCheckSubmitted] = useState<boolean>(savedPreCheckScore !== undefined);

  // Exit check state
  const [exitCheckAnswers, setExitCheckAnswers] = useState<Record<string, number>>({});
  const [exitCheckSubmitted, setExitCheckSubmitted] = useState<boolean>(savedExitCheckScore !== undefined);

  // Handle pre-check answer selection
  const handleSelectPreCheckAnswer = (questionId: string, optionIdx: number) => {
    if (preCheckSubmitted) return;
    setPreCheckAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitPreCheck = () => {
    setPreCheckSubmitted(true);
    let correct = 0;
    for (const q of lesson.startingKnowledgeCheck) {
      if (preCheckAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    }
    if (onSaveProgress) {
      onSaveProgress({
        preCheckAttempted: true,
        preCheckScore: correct,
      });
    }
  };

  const handleResetPreCheck = () => {
    setPreCheckAnswers({});
    setPreCheckSubmitted(false);
  };

  // Handle exit check answer selection
  const handleSelectExitCheckAnswer = (questionId: string, optionIdx: number) => {
    if (exitCheckSubmitted) return;
    setExitCheckAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitExitCheck = () => {
    setExitCheckSubmitted(true);
    let correct = 0;
    for (const q of lesson.exitCheck) {
      if (exitCheckAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    }
    if (onSaveProgress) {
      onSaveProgress({
        exitCheckAttempted: true,
        exitCheckScore: correct,
      });
    }
  };

  const handleResetExitCheck = () => {
    setExitCheckAnswers({});
    setExitCheckSubmitted(false);
  };

  // Calculate pre-check score
  let preCheckCorrectCount = 0;
  for (const q of lesson.startingKnowledgeCheck) {
    if (preCheckAnswers[q.id] === q.correctIndex) preCheckCorrectCount++;
  }

  // Calculate exit check score
  let exitCheckCorrectCount = 0;
  for (const q of lesson.exitCheck) {
    if (exitCheckAnswers[q.id] === q.correctIndex) exitCheckCorrectCount++;
  }

  // Effective pre-check score (calculated if user interacted in current session, else fallback to saved)
  const hasPreCheckInteraction = Object.keys(preCheckAnswers).length > 0;
  const effectivePreCheckScore = hasPreCheckInteraction
    ? preCheckCorrectCount
    : (savedPreCheckScore ?? preCheckCorrectCount);

  // Effective exit check score (calculated if user interacted in current session, else fallback to saved)
  const hasExitCheckInteraction = Object.keys(exitCheckAnswers).length > 0;
  const effectiveExitCheckScore = hasExitCheckInteraction
    ? exitCheckCorrectCount
    : (savedExitCheckScore ?? exitCheckCorrectCount);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
    >
      <div className="bg-[#131722] border border-[#2A2F3D] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A2F3D] flex items-start justify-between gap-4 bg-[#181D2B]/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                DAY {lesson.day} INTERACTIVE LESSON
              </span>
              <span className="text-xs text-slate-400">
                Placement Series Trainer Deck Standard · ~{lesson.estimatedMinutes} min
              </span>
            </div>
            <h2 id="lesson-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {lesson.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2A2F3D] px-4 sm:px-5 bg-[#141824] overflow-x-auto text-xs sm:text-sm font-medium">
          <button
            onClick={() => {
              setActiveTab('precheck');
              if (onSaveProgress) onSaveProgress({});
            }}
            className={`py-2.5 px-3 sm:px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'precheck'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>A. Pre-Check</span>
            {preCheckSubmitted && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {effectivePreCheckScore}/{lesson.startingKnowledgeCheck.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('concepts');
              if (onSaveProgress) onSaveProgress({ coreConceptsViewed: true });
            }}
            className={`py-2.5 px-3 sm:px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'concepts'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>B. Core Concepts</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('patterns');
              if (onSaveProgress) onSaveProgress({ patternGuideViewed: true });
            }}
            className={`py-2.5 px-3 sm:px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>C. Pattern Recognition</span>
          </button>

          <button
            onClick={() => setActiveTab('scaffolds')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'scaffolds'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>D. Guided Scaffolds ({guidedProblems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('exitcheck')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'exitcheck'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>E. Exit Check</span>
            {exitCheckSubmitted && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {effectiveExitCheckScore}/{lesson.exitCheck.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm leading-relaxed">
          {/* TAB 1: Starting Knowledge Check */}
          {activeTab === 'precheck' && (
            <div className="space-y-5">
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
                  <h3>Starting Knowledge Check (Diagnostic Prior Knowledge)</h3>
                </div>
                <p className="text-xs text-slate-300">
                  Quick concept check before writing code. There is <strong>no penalty for incorrect answers</strong> and this quiz is completely separate from verified algorithm mastery. Answers reveal beginner explanations immediately.
                </p>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {lesson.startingKnowledgeCheck.map((q, qIdx) => {
                  const selected = preCheckAnswers[q.id];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--accent)]">
                          Question {qIdx + 1} of {lesson.startingKnowledgeCheck.length}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          {q.topicHint}
                        </span>
                      </div>
                      <p className="font-medium text-white text-sm">{q.question}</p>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selected === optIdx;
                          let optStyle = 'bg-[#131722] border-white/10 text-slate-300 hover:border-slate-500';

                          if (preCheckSubmitted) {
                            if (optIdx === q.correctIndex) {
                              optStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium';
                            } else if (isSelected && !isCorrect) {
                              optStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-300';
                            } else {
                              optStyle = 'bg-[#131722] border-white/5 text-slate-500 opacity-60';
                            }
                          } else if (isSelected) {
                            optStyle = 'bg-[var(--accent)]/15 border-[var(--accent)] text-white font-medium';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={preCheckSubmitted}
                              onClick={() => handleSelectPreCheckAnswer(q.id, optIdx)}
                              className={`w-full text-left p-2.5 rounded border text-xs transition-colors flex items-center justify-between gap-2 ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {preCheckSubmitted && optIdx === q.correctIndex && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {preCheckSubmitted && (
                        <div
                          className={`p-3 rounded border text-xs space-y-1 animate-in fade-in-0 duration-150 ${
                            isCorrect
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                              : 'bg-amber-500/5 border-amber-500/20 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            {isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct!
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5" /> Learning Explanation:
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit or Reset button */}
              <div className="flex items-center justify-between pt-2">
                {!preCheckSubmitted ? (
                  <Button
                    size="sm"
                    onClick={handleSubmitPreCheck}
                    disabled={Object.keys(preCheckAnswers).length < lesson.startingKnowledgeCheck.length}
                    className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] font-semibold text-xs h-8 px-4"
                  >
                    Check Answers ({Object.keys(preCheckAnswers).length}/{lesson.startingKnowledgeCheck.length})
                  </Button>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-slate-300">
                      Score: <strong className="text-emerald-400 font-mono text-sm">{effectivePreCheckScore}</strong> / {lesson.startingKnowledgeCheck.length} correct
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetPreCheck}
                        className="text-xs h-8 border-[#2A2F3D] text-slate-400 hover:text-white flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Pre-Check
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab('concepts');
                          if (onSaveProgress) onSaveProgress({ coreConceptsViewed: true });
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-4 flex items-center gap-1.5"
                      >
                        <span>Explore Core Concepts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Core Concepts */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              {/* Learning Outcomes Banner */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Award className="w-4 h-4 text-[var(--accent)]" />
                  <h3>Module Learning Outcomes</h3>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
                  {lesson.learningOutcomes.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Core Concepts List */}
              <div className="space-y-5">
                {lesson.coreConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="bg-[#181D2B] rounded-lg p-5 border border-[#2A2F3D] space-y-3"
                  >
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-base text-white">{concept.title}</h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {concept.plainLanguageDefinition}
                    </p>

                    <div className="bg-[#131722] p-3 rounded border border-white/5 text-xs space-y-1 text-slate-300">
                      <span className="font-semibold text-indigo-300 block">Why It Matters:</span>
                      <p>{concept.whyItMatters}</p>
                    </div>

                    {concept.visualRepresentation && (
                      <div className="bg-[#0D1117] p-3.5 rounded border border-[#2A2F3D] font-mono text-[11px] overflow-x-auto text-slate-200">
                        <pre className="whitespace-pre">{concept.visualRepresentation}</pre>
                      </div>
                    )}

                    {concept.codeTemplate && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-slate-400">Syntax & Implementation Template:</span>
                        <div className="bg-[#0D1117] p-3 rounded border border-[#2A2F3D] font-mono text-xs overflow-x-auto text-slate-200">
                          <pre className="whitespace-pre">{concept.codeTemplate}</pre>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
                      <div className="bg-[#131722] p-2 rounded border border-white/5">
                        <span className="text-slate-500 block">Time Complexity:</span>
                        <span className="text-emerald-400 font-medium">{concept.complexityAnalysis.time}</span>
                      </div>
                      <div className="bg-[#131722] p-2 rounded border border-white/5">
                        <span className="text-slate-500 block">Auxiliary Space:</span>
                        <span className="text-teal-400 font-medium">{concept.complexityAnalysis.space}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveTab('patterns');
                    if (onSaveProgress) onSaveProgress({ patternGuideViewed: true });
                  }}
                  className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-4 font-semibold flex items-center gap-1.5"
                >
                  <span>Study Pattern Recognition</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: Pattern Recognition Guide */}
          {activeTab === 'patterns' && (
            <div className="space-y-5">
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3>Pattern Recognition & Decision Framework</h3>
                </div>
                <p className="text-xs text-slate-300">
                  How to inspect interview problem wording, identify the optimal algorithmic pattern, verify preconditions, and avoid anti-patterns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* How to identify */}
                <div className="bg-[#181D2B] rounded-lg p-4 border border-emerald-500/20 space-y-2.5">
                  <span className="text-xs font-semibold text-emerald-400 block uppercase tracking-wider">
                    How to Identify from Problem Cues:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {lesson.patternGuide.howToIdentify.map((cue, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preconditions */}
                <div className="bg-[#181D2B] rounded-lg p-4 border border-indigo-500/20 space-y-2.5">
                  <span className="text-xs font-semibold text-indigo-400 block uppercase tracking-wider">
                    Required Preconditions:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {lesson.patternGuide.preconditions.map((prec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{prec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Anti-Patterns */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-rose-500/20 space-y-2.5">
                <span className="text-xs font-semibold text-rose-400 block uppercase tracking-wider">
                  When NOT to Use (Common Anti-Patterns):
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {lesson.patternGuide.whenNotToUse.map((anti, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{anti}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comparison Matrix */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-3">
                <span className="text-xs font-semibold text-white block">
                  Pattern Selection Comparison Matrix:
                </span>
                <div className="space-y-2">
                  {lesson.patternGuide.comparisonMatrix.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#131722] p-3 rounded border border-white/5 text-xs space-y-1"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-white">{item.problemOrQuery}</span>
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                          {item.recommendedPattern}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-white/5">
                        <strong className="text-slate-300">Rationale:</strong> {item.why}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('scaffolds')}
                  className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-4 font-semibold flex items-center gap-1.5"
                >
                  <span>Launch Guided Scaffolds</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: Guided Scaffolds List */}
          {activeTab === 'scaffolds' && (
            <div className="space-y-5">
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h3>Module Guided Scaffolds (5 Worked Examples)</h3>
                </div>
                <p className="text-xs text-slate-300">
                  Each scaffold delivers step-by-step state predictions, complete Python reference code, mathematical invariant reasoning, and test cases.
                </p>
              </div>

              {/* Optional Warm-up Problems (e.g. Day 1 #1480 & #217) */}
              {lesson.warmUpProblems && lesson.warmUpProblems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Prerequisite Warm-Up Problems (Trainer Deck):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lesson.warmUpProblems.map((warm) => (
                      <div
                        key={warm.leetcodeNumber}
                        className="bg-[#181D2B] p-3 rounded-lg border border-[#2A2F3D] text-xs space-y-1.5 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">
                              LC #{warm.leetcodeNumber}: {warm.title}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                              Warm-Up
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{warm.note}</p>
                        </div>
                        <a
                          href={warm.leetcodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit pt-1"
                        >
                          <span>Open on LeetCode</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5 Guided Problems */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-white">Official 5 Guided Problems:</div>
                {guidedProblems.map((p, idx) => (
                  <div
                    key={p.leetcodeNumber}
                    className="bg-[#181D2B] p-3.5 rounded-lg border border-[#2A2F3D] hover:border-slate-600 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-slate-500">#{idx + 1}</span>
                        <span className="font-semibold text-white">
                          LeetCode #{p.leetcodeNumber}: {p.title}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {p.primaryPattern}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">
                        <strong className="text-slate-300">Focus:</strong> {p.teachingFocus}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenGuidedProblem(p);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3 flex items-center gap-1.5 shrink-0"
                    >
                      <span>Study Walkthrough</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('exitcheck')}
                  className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-4 font-semibold flex items-center gap-1.5"
                >
                  <span>Take Module Exit Check</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 5: Module Exit Check */}
          {activeTab === 'exitcheck' && (
            <div className="space-y-5">
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3>Module Exit Check (Summative Concept & Pattern Quiz)</h3>
                </div>
                <p className="text-xs text-slate-300">
                  Assess your understanding of time/space complexity, pattern choice, loop invariants, and boundary conditions. Identifies specific areas to review.
                </p>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {lesson.exitCheck.map((q, qIdx) => {
                  const selected = exitCheckAnswers[q.id];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          Exit Question {qIdx + 1} of {lesson.exitCheck.length}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          {q.topicHint}
                        </span>
                      </div>
                      <p className="font-medium text-white text-sm">{q.question}</p>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selected === optIdx;
                          let optStyle = 'bg-[#131722] border-white/10 text-slate-300 hover:border-slate-500';

                          if (exitCheckSubmitted) {
                            if (optIdx === q.correctIndex) {
                              optStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium';
                            } else if (isSelected && !isCorrect) {
                              optStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-300';
                            } else {
                              optStyle = 'bg-[#131722] border-white/5 text-slate-500 opacity-60';
                            }
                          } else if (isSelected) {
                            optStyle = 'bg-emerald-500/15 border-emerald-500 text-white font-medium';
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={exitCheckSubmitted}
                              onClick={() => handleSelectExitCheckAnswer(q.id, optIdx)}
                              className={`w-full text-left p-2.5 rounded border text-xs transition-colors flex items-center justify-between gap-2 ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {exitCheckSubmitted && optIdx === q.correctIndex && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {exitCheckSubmitted && (
                        <div
                          className={`p-3 rounded border text-xs space-y-1 animate-in fade-in-0 duration-150 ${
                            isCorrect
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                              : 'bg-amber-500/5 border-amber-500/20 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            {isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Concept Mastered!
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5" /> Revision Recommendation:
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit / Results */}
              <div className="flex items-center justify-between pt-2">
                {!exitCheckSubmitted ? (
                  <Button
                    size="sm"
                    onClick={handleSubmitExitCheck}
                    disabled={Object.keys(exitCheckAnswers).length < lesson.exitCheck.length}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-4"
                  >
                    Submit Exit Check ({Object.keys(exitCheckAnswers).length}/{lesson.exitCheck.length})
                  </Button>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-slate-300">
                      Exit Score: <strong className="text-emerald-400 font-mono text-sm">{effectiveExitCheckScore}</strong> / {lesson.exitCheck.length} correct
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetExitCheck}
                        className="text-xs h-8 border-[#2A2F3D] text-slate-400 hover:text-white flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Exit Check
                      </Button>
                      <Button
                        size="sm"
                        onClick={onClose}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-4"
                      >
                        Complete Lesson & Return
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#2A2F3D] bg-[#141824] flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Interactive lessons build conceptual foundations without conferring unearned mastery.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-3 border-[#2A2F3D] text-slate-400 hover:text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
