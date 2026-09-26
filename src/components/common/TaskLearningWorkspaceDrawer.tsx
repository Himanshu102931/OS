import React, { useState } from 'react';
import type {
  TaskDefinition,
  TaskProgress,
  DomainDefinition,
  DSAProblem,
  DSAProgress,
} from '../../types';
import type { PriorityBreakdown } from '../../engine/adaptiveEngine';
import { PATTERN_LESSONS, LEARNING_RESOURCES } from '../../data/dsaDataset';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Play,
  ShieldCheck,
  Target,
  X,
  Zap,
  Code2,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { Button } from '../ui/button';

interface TaskLearningWorkspaceDrawerProps {
  task?: TaskDefinition | null;
  progress?: TaskProgress;
  dsaProblem?: DSAProblem | null;
  dsaProgress?: DSAProgress;
  domain?: DomainDefinition;
  breakdown?: PriorityBreakdown;
  isOpen: boolean;
  onClose: () => void;
  onUpdateState?: (taskId: string, newState: TaskProgress['state']) => void;
  onUpdateDSAProgress?: (updatedProgress: DSAProgress) => void;
  onOpenAttemptModal?: (problem: DSAProblem) => void;
}

export const TaskLearningWorkspaceDrawer: React.FC<TaskLearningWorkspaceDrawerProps> = ({
  task,
  progress,
  dsaProblem,
  dsaProgress,
  domain,
  breakdown,
  isOpen,
  onClose,
  onUpdateState,
  onUpdateDSAProgress,
  onOpenAttemptModal,
}) => {
  // Quiz state for Remediation self-check
  const [q1, setQ1] = useState<number | null>(null);
  const [q2, setQ2] = useState<number | null>(null);
  const [q3, setQ3] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  if (!isOpen || (!task && !dsaProblem)) return null;

  // Render DSA Mode Learning Workspace
  if (dsaProblem) {
    const pProg = dsaProgress || {
      problemId: dsaProblem.id,
      currentBox: 1,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const patternLesson = PATTERN_LESSONS.find((p) => p.id === dsaProblem.primaryPattern);
    const primaryResource = LEARNING_RESOURCES.find((r) => r.id === patternLesson?.primaryResourceId);
    const secondaryResource = LEARNING_RESOURCES.find(
      (r) => r.id === patternLesson?.secondaryResourceId
    );

    const handleMarkLessonComplete = () => {
      if (!onUpdateDSAProgress) return;
      const updated: DSAProgress = {
        ...pProg,
        patternLessonViewed: true,
        patternLessonCompleted: true,
        updatedAt: new Date().toISOString(),
      };
      onUpdateDSAProgress(updated);
    };

    const handleClearRemediation = () => {
      if (!pProg.patternLessonCompleted) {
        setQuizError('You must view the Pattern Lesson and click "Mark Lesson Complete" first.');
        return;
      }
      let correctCount = 0;
      if (q1 === 0) correctCount++;
      if (q2 === 0) correctCount++;
      if (q3 === 0) correctCount++;

      if (correctCount < 2) {
        setQuizError(`Quiz score: ${correctCount}/3. You need at least 2/3 to clear remediation.`);
        return;
      }

      setQuizError(null);
      if (onUpdateDSAProgress) {
        const updated: DSAProgress = {
          ...pProg,
          remediationRequired: false,
          consecutiveFailures: 0,
          remediationSelfCheckPassed: true,
          updatedAt: new Date().toISOString(),
        };
        onUpdateDSAProgress(updated);
      }
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-workspace-title"
        className="fixed inset-0 z-50 flex justify-end bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in"
      >
        <div className="bg-[#14171D] border-l border-[#262D38] w-full max-w-3xl lg:max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden font-mono">
          {/* Header */}
          <div className="p-5 border-b border-[#262D38] flex items-start justify-between gap-4 bg-[#1B2028]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-[#E5A93C]/10 text-[#FFC665] border border-[#E5A93C]/30">
                  DSA Problem • #{dsaProblem.leetcodeNumber}
                </span>
                <span className="text-[#5C6675]">·</span>
                <span className="text-xs text-[#8E98A8] uppercase font-bold">{dsaProblem.difficulty}</span>
                <span className="text-[#5C6675]">·</span>
                <span className="text-xs text-[#FFC665] flex items-center gap-1">
                  <Clock className="size-3" /> {dsaProblem.estimatedTimeMinutes} mins
                </span>
                <span className="text-[#5C6675]">·</span>
                <span className="text-xs text-[#10B981] font-semibold">
                  Box {pProg.currentBox}
                </span>
              </div>
              <h2 id="learning-workspace-title" className="text-lg font-bold text-[#F1F5F9] leading-snug">
                {dsaProblem.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Learning Workspace"
              className="p-1.5 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#262D38] transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#8E98A8]">
            {/* Remediation Warning & Quiz Banner */}
            {pProg.remediationRequired && (
              <section className="p-4 rounded-[4px] bg-[#F43F5E]/10 border border-[#F43F5E]/30 space-y-3">
                <div className="flex items-center gap-2 text-[#F43F5E] font-bold text-xs uppercase">
                  <AlertTriangle className="size-4" /> Remediation Required (3 Consecutive Failures)
                </div>
                <p className="text-[#C5CEDB]">
                  To unblock this problem, you must study the pattern lesson below, mark it completed, and pass this self-check quiz with at least 2/3 correct.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <p className="text-[#F1F5F9] font-semibold">1. Primary Recognition Signal for this pattern:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {['Look for contiguous subarrays or target sum conditions', 'Always sort array and construct BST'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ1(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q1 === idx ? 'bg-[#E5A93C]/20 border-[#E5A93C] text-[#FFC665]' : 'bg-[#14171D] border-[#262D38] text-[#8E98A8]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[#F1F5F9] font-semibold">2. Expected Optimal Time Complexity:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[`${patternLesson?.expectedTimeComplexity || 'O(N)'}`, 'O(2^N) exponential complexity'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ2(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q2 === idx ? 'bg-[#E5A93C]/20 border-[#E5A93C] text-[#FFC665]' : 'bg-[#14171D] border-[#262D38] text-[#8E98A8]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[#F1F5F9] font-semibold">3. Common Pitfall to Avoid:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[`${patternLesson?.commonMistakes[0] || 'Off-by-one errors or invalid bounds checks'}`, 'Ignore boundary conditions entirely'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ3(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q3 === idx ? 'bg-[#E5A93C]/20 border-[#E5A93C] text-[#FFC665]' : 'bg-[#14171D] border-[#262D38] text-[#8E98A8]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {quizError && <p className="text-[#F43F5E] text-[11px] font-bold">{quizError}</p>}

                  <Button
                    size="sm"
                    onClick={handleClearRemediation}
                    className="w-full bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-[4px]"
                  >
                    Submit Quiz & Clear Remediation
                  </Button>
                </div>
              </section>
            )}

            {/* Section 1: Pattern Lesson */}
            {patternLesson && (
              <section className="space-y-3 p-4 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#FFC665] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="size-4" /> PATTERN LESSON: {patternLesson.title}
                  </h3>
                  {pProg.patternLessonCompleted ? (
                    <span className="text-[10px] text-[#10B981] font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkLessonComplete}
                      className="text-[10px] h-6 px-2 border-[#E5A93C] text-[#FFC665] hover:bg-[#E5A93C]/10"
                    >
                      Mark Lesson Complete
                    </Button>
                  )}
                </div>

                <p className="text-[#F1F5F9] leading-relaxed">{patternLesson.overview}</p>

                <div className="space-y-2 pt-2 border-t border-[#262D38] text-[11px]">
                  <div>
                    <strong className="text-[#E5A93C] uppercase text-[10px]">Why It Matters:</strong>
                    <p className="text-[#C5CEDB]">{patternLesson.whyItMatters}</p>
                  </div>
                  <div>
                    <strong className="text-[#E5A93C] uppercase text-[10px]">Core Intuition:</strong>
                    <p className="text-[#C5CEDB]">{patternLesson.coreIntuition}</p>
                  </div>
                  {patternLesson.recognitionSignals.length > 0 && (
                    <div>
                      <strong className="text-[#E5A93C] uppercase text-[10px]">Recognition Signals:</strong>
                      <ul className="list-disc pl-4 text-[#C5CEDB] space-y-0.5">
                        {patternLesson.recognitionSignals.map((sig, idx) => (
                          <li key={idx}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Code Template */}
                <div className="space-y-1 pt-2">
                  <span className="text-[10px] uppercase font-bold text-[#8E98A8] flex items-center gap-1">
                    <FileCode className="size-3.5 text-[#10B981]" /> Code Template
                  </span>
                  <pre className="p-3 bg-[#14171D] rounded-[4px] border border-[#262D38] text-[#10B981] overflow-x-auto text-[11px] leading-relaxed font-mono">
                    {patternLesson.codeTemplate}
                  </pre>
                </div>
              </section>
            )}

            {/* Section 2: Problem Learning Hint */}
            {dsaProblem.learningHint && (
              <section className="p-4 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-2">
                <h3 className="text-xs font-bold text-[#E5A93C] uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="size-4" /> LEARNING HINT (RECOGNITION FIRST)
                </h3>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <strong className="text-[#F1F5F9]">What to Recognize:</strong>
                    <p className="text-[#C5CEDB]">{dsaProblem.learningHint.whatToRecognize}</p>
                  </div>
                  <div>
                    <strong className="text-[#F1F5F9]">Key Idea:</strong>
                    <p className="text-[#C5CEDB]">{dsaProblem.learningHint.keyIdea}</p>
                  </div>
                  <div>
                    <strong className="text-[#F1F5F9]">Common Trap:</strong>
                    <p className="text-[#F43F5E]">{dsaProblem.learningHint.commonTrap}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Authoritative Resources */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-4 text-[#E5A93C]" /> RECOMMENDED LEARNING RESOURCES
              </h3>
              <div className="space-y-2">
                {[primaryResource, secondaryResource].filter(Boolean).map((res) => (
                  <div
                    key={res!.id}
                    className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-[#FFC665] uppercase">{res!.provider}</span>
                        <span className="text-[#5C6675]">·</span>
                        <span className="text-[#8E98A8] capitalize">{res!.type}</span>
                        <span className="text-[#5C6675]">·</span>
                        <span
                          className={`font-bold uppercase ${
                            res!.accessTier === 'FREE' ? 'text-[#10B981]' : 'text-[#F59E0B]'
                          }`}
                        >
                          {res!.accessTier}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#F1F5F9] mt-0.5">{res!.title}</h4>
                    </div>
                    {res!.url && (
                      <a
                        href={res!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-[#14171D] hover:bg-[#262D38] text-[#FFC665] border border-[#262D38] rounded-[4px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                ))}

                {dsaProblem.alternativeResourceUrl && (
                  <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#10B981] uppercase">Free Alternative Resource</span>
                      <h4 className="text-xs font-bold text-[#F1F5F9]">Alternative Free Walkthrough / Solution</h4>
                    </div>
                    <a
                      href={dsaProblem.alternativeResourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#14171D] hover:bg-[#262D38] text-[#10B981] border border-[#262D38] rounded-[4px] flex items-center gap-1"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#262D38] bg-[#1B2028] flex items-center justify-between gap-3">
            <a
              href={dsaProblem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#14171D] hover:bg-[#262D38] text-[#F1F5F9] border border-[#262D38] rounded-[4px] font-bold text-xs flex items-center gap-2"
            >
              <Code2 className="size-4 text-[#E5A93C]" /> Solve on LeetCode #{dsaProblem.leetcodeNumber} <ExternalLink className="size-3" />
            </a>

            {onOpenAttemptModal && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAttemptModal(dsaProblem);
                }}
                className="text-xs font-bold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-4"
              >
                <CheckCircle2 className="size-3.5 mr-1.5" /> Log Attempt
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Roadmap Task Mode Learning Workspace
  const state = progress?.state || 'not_started';
  const meta = task!.learningMetadata;

  const learningSteps = meta?.learningSteps || [
    `Review core theory & definitions for ${task!.title}.`,
    `Analyze standard implementation patterns and code structures.`,
    `Work through practice examples step-by-step.`,
  ];

  const practiceItems = meta?.practiceItems || [
    `Implement or write out the baseline solution for ${task!.title}.`,
    `Verify edge cases and time/space complexity constraints.`,
  ];

  const selfCheckQuestions = meta?.selfCheckQuestions || [
    `Can you explain the core concepts of this topic without looking at notes?`,
    `Do you understand when to apply this technique versus alternatives?`,
  ];

  const completionCriteria = meta?.completionCriteria || [
    `Concept studied and key notes reviewed.`,
    `Baseline practice problem or exercise completed.`,
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-workspace-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#14171D] border-l border-[#262D38] w-full max-w-3xl lg:max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#262D38] flex items-start justify-between gap-4 bg-[#1B2028]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-[#E5A93C]/10 text-[#FFC665] border border-[#E5A93C]/30">
                {domain?.name || 'General'}
              </span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs text-[#8E98A8] capitalize">{task!.taskType}</span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs text-[#FFC665] flex items-center gap-1">
                <Clock className="size-3" /> {task!.estimatedMinutes} mins
              </span>
            </div>
            <h2 id="learning-workspace-title" className="text-lg font-bold text-[#F1F5F9] leading-snug">
              {task!.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Learning Workspace"
            className="p-1.5 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#262D38] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#8E98A8]">
          {/* Section 1: WHY */}
          <section className="space-y-2 p-3.5 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <h3 className="text-xs font-bold text-[#FFC665] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-4" /> 1. WHY THIS TASK MATTERS
            </h3>
            <p className="text-[#F1F5F9] leading-relaxed">{task!.description}</p>
            {breakdown && (
              <div className="pt-2 border-t border-[#262D38] space-y-1 text-[11px]">
                <span className="text-[#8E98A8] block font-semibold">Recommendation Rationale:</span>
                <p className="text-[#FFC665] italic">{breakdown.explanation}</p>
                <div className="flex gap-4 pt-1 text-[10px] text-[#8E98A8]">
                  <span>Urgency: <strong className="text-[#F1F5F9]">{breakdown.urgency}</strong></span>
                  <span>Weakness: <strong className="text-[#F1F5F9]">{breakdown.weakness}</strong></span>
                  <span>Importance: <strong className="text-[#F1F5F9]">{task!.importance}/10</strong></span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: LEARN */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="size-4 text-[#E5A93C]" /> 2. CONCEPT & LEARNING STEPS
            </h3>

            <div className="space-y-2">
              {learningSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
                  <span className="size-5 rounded-[4px] bg-[#14171D] text-[#FFC665] font-bold flex items-center justify-center shrink-0 text-[10px] border border-[#262D38]">
                    {idx + 1}
                  </span>
                  <span className="text-[#F1F5F9] font-medium leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            {meta?.primaryResource && (
              <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1">
                <span className="text-[10px] text-[#8E98A8] uppercase font-bold block">Primary Resource</span>
                {meta.primaryResource.url ? (
                  <a
                    href={meta.primaryResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFC665] hover:underline font-semibold flex items-center gap-1 text-xs"
                  >
                    {meta.primaryResource.title} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-[#F1F5F9] font-semibold">{meta.primaryResource.title}</span>
                )}
              </div>
            )}
          </section>

          {/* Section 3: PRACTICE */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <Target className="size-4 text-[#E5A93C]" /> 3. REQUIRED PRACTICE ITEMS
            </h3>
            <div className="space-y-1.5">
              {practiceItems.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
                  • {item}
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: SELF-CHECK */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="size-4 text-amber-400" /> 4. SELF-CHECK VERIFICATION
            </h3>
            <div className="space-y-1.5">
              {selfCheckQuestions.map((q, idx) => (
                <div key={idx} className="p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#8E98A8] flex items-start gap-2">
                  <HelpCircle className="size-3.5 text-[#FFC665] shrink-0 mt-0.5" />
                  <span className="text-[#F1F5F9]">{q}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: COMPLETION CRITERIA */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" /> 5. COMPLETION CRITERIA
            </h3>
            <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1 text-[#F1F5F9]">
              {completionCriteria.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#262D38] bg-[#1B2028] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#8E98A8]">
            Status: <span className="font-bold capitalize text-[#F1F5F9]">{state.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            {state === 'not_started' && onUpdateState && (
              <Button
                size="sm"
                onClick={() => onUpdateState(task!.id, 'in_progress')}
                className="text-xs font-bold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-4"
              >
                <Play className="size-3.5 mr-1.5" /> Start Task
              </Button>
            )}

            {state === 'in_progress' && onUpdateState && (
              <Button
                size="sm"
                onClick={() => {
                  onUpdateState(task!.id, 'completed');
                  onClose();
                }}
                className="text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-[4px] px-4"
              >
                <CheckCircle2 className="size-3.5 mr-1.5" /> Complete Task
              </Button>
            )}

            {state === 'completed' && onUpdateState && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateState(task!.id, 'not_started')}
                className="text-xs font-bold border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]"
              >
                Reopen Task
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
