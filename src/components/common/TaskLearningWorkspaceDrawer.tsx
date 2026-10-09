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
import { getTaskLearningRoute } from '../../engine/taskFlowEngine';
import { usePlacement } from '../../context/PlacementContext';
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
  ArrowRight,
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

  const { setRoute } = usePlacement();

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

    // Match by pattern name (e.g., "Arrays & Hashing") which is the primaryPattern on DSAProblem
    const patternLesson = PATTERN_LESSONS.find((p) => p.name === dsaProblem.primaryPattern);
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
        className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-fade-in"
      >
        <div className="bg-surface-panel border-l border-border-default w-full max-w-3xl lg:max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden font-mono">
          {/* Header */}
          <div className="p-5 border-b border-border-default flex items-start justify-between gap-4 bg-surface-elevated">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-accent-amber/10 text-accent-amber border border-accent-amber/30">
                  DSA Problem • #{dsaProblem.leetcodeNumber}
                </span>
                <span className="text-text-secondary">·</span>
                <span className="text-xs text-text-secondary uppercase font-bold">{dsaProblem.difficulty}</span>
                <span className="text-text-secondary">·</span>
                <span className="text-xs text-accent-amber flex items-center gap-1">
                  <Clock className="size-3" /> {dsaProblem.estimatedTimeMinutes} mins
                </span>
                <span className="text-text-secondary">·</span>
                <span className="text-xs text-status-success font-semibold">
                  Box {pProg.currentBox}
                </span>
              </div>
              <h2 id="learning-workspace-title" className="text-lg font-bold text-text-primary leading-snug">
                {dsaProblem.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Learning Workspace"
              className="p-1.5 rounded-[4px] text-text-secondary hover:text-text-primary hover:bg-border-default transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-text-secondary">
            {/* Remediation Warning & Quiz Banner */}
            {pProg.remediationRequired && (
              <section className="p-4 rounded-[4px] bg-status-danger/10 border border-status-danger/30 space-y-3">
                <div className="flex items-center gap-2 text-status-danger font-bold text-xs uppercase">
                  <AlertTriangle className="size-4" /> Remediation Required (3 Consecutive Failures)
                </div>
                <p className="text-text-muted">
                  To unblock this problem, you must study the pattern lesson below, mark it completed, and pass this self-check quiz with at least 2/3 correct.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <p className="text-text-primary font-semibold">1. Primary Recognition Signal for this pattern:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {['Look for contiguous subarrays or target sum conditions', 'Always sort array and construct BST'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ1(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q1 === idx ? 'bg-accent-amber/20 border-accent-amber text-accent-amber' : 'bg-surface-panel border-border-default text-text-secondary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-text-primary font-semibold">2. Expected Optimal Time Complexity:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[`${patternLesson?.expectedTimeComplexity || 'O(N)'}`, 'O(2^N) exponential complexity'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ2(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q2 === idx ? 'bg-accent-amber/20 border-accent-amber text-accent-amber' : 'bg-surface-panel border-border-default text-text-secondary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-text-primary font-semibold">3. Common Pitfall to Avoid:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[`${patternLesson?.commonMistakes[0] || 'Off-by-one errors or invalid bounds checks'}`, 'Ignore boundary conditions entirely'].map((opt, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setQ3(idx)}
                          className={`p-2 rounded-[4px] border text-left text-[11px] transition-colors ${
                            q3 === idx ? 'bg-accent-amber/20 border-accent-amber text-accent-amber' : 'bg-surface-panel border-border-default text-text-secondary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {quizError && <p className="text-status-danger text-[11px] font-bold">{quizError}</p>}

                  <Button
                    size="sm"
                    onClick={handleClearRemediation}
                    className="w-full bg-status-danger hover:bg-status-danger/90 text-white font-bold rounded-[4px]"
                  >
                    Submit Quiz & Clear Remediation
                  </Button>
                </div>
              </section>
            )}

            {/* Section 1: Pattern Lesson */}
            {patternLesson && (
              <section className="space-y-3 p-4 rounded-[4px] bg-surface-elevated border border-border-default">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-accent-amber uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="size-4" /> PATTERN LESSON: {patternLesson.title}
                  </h3>
                  {pProg.patternLessonCompleted ? (
                    <span className="text-[10px] text-status-success font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkLessonComplete}
                      className="text-[10px] h-6 px-2 border-accent-amber text-accent-amber hover:bg-accent-amber/10"
                    >
                      Mark Lesson Complete
                    </Button>
                  )}
                </div>

                <p className="text-text-primary leading-relaxed">{patternLesson.overview}</p>

                <div className="space-y-2 pt-2 border-t border-border-default text-[11px]">
                  <div>
                    <strong className="text-accent-amber uppercase text-[10px]">Why It Matters:</strong>
                    <p className="text-text-muted">{patternLesson.whyItMatters}</p>
                  </div>
                  <div>
                    <strong className="text-accent-amber uppercase text-[10px]">Core Intuition:</strong>
                    <p className="text-text-muted">{patternLesson.coreIntuition}</p>
                  </div>
                  {patternLesson.recognitionSignals.length > 0 && (
                    <div>
                      <strong className="text-accent-amber uppercase text-[10px]">Recognition Signals:</strong>
                      <ul className="list-disc pl-4 text-text-muted space-y-0.5">
                        {patternLesson.recognitionSignals.map((sig, idx) => (
                          <li key={idx}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Code Template */}
                <div className="space-y-1 pt-2">
                  <span className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1">
                    <FileCode className="size-3.5 text-status-success" /> Code Template
                  </span>
                  <pre className="p-3 bg-surface-panel rounded-[4px] border border-border-default text-status-success overflow-x-auto text-[11px] leading-relaxed font-mono">
                    {patternLesson.codeTemplate}
                  </pre>
                </div>
              </section>
            )}

            {/* Section 2: Problem Learning Hint */}
            {dsaProblem.learningHint && (
              <section className="p-4 rounded-[4px] bg-surface-elevated border border-border-default space-y-2">
                <h3 className="text-xs font-bold text-accent-amber uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="size-4" /> LEARNING HINT (RECOGNITION FIRST)
                </h3>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <strong className="text-text-primary">What to Recognize:</strong>
                    <p className="text-text-muted">{dsaProblem.learningHint.whatToRecognize}</p>
                  </div>
                  <div>
                    <strong className="text-text-primary">Key Idea:</strong>
                    <p className="text-text-muted">{dsaProblem.learningHint.keyIdea}</p>
                  </div>
                  <div>
                    <strong className="text-text-primary">Common Trap:</strong>
                    <p className="text-status-danger">{dsaProblem.learningHint.commonTrap}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: Authoritative Resources */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-4 text-accent-amber" /> RECOMMENDED LEARNING RESOURCES
              </h3>
              <div className="space-y-2">
                {[primaryResource, secondaryResource].filter(Boolean).map((res) => (
                  <div
                    key={res!.id}
                    className="p-3 rounded-[4px] bg-surface-elevated border border-border-default flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-accent-amber uppercase">{res!.provider}</span>
                        <span className="text-text-secondary">·</span>
                        <span className="text-text-secondary capitalize">{res!.type}</span>
                        <span className="text-text-secondary">·</span>
                        <span
                          className={`font-bold uppercase ${
                            res!.accessTier === 'FREE' ? 'text-status-success' : 'text-status-warning'
                          }`}
                        >
                          {res!.accessTier}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-text-primary mt-0.5">{res!.title}</h4>
                    </div>
                    {res!.url && (
                      <a
                        href={res!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-surface-panel hover:bg-border-default text-accent-amber border border-border-default rounded-[4px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                ))}

                {dsaProblem.alternativeResourceUrl && (
                  <div className="p-3 rounded-[4px] bg-surface-elevated border border-border-default flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-status-success uppercase">Free Alternative Resource</span>
                      <h4 className="text-xs font-bold text-text-primary">Alternative Free Walkthrough / Solution</h4>
                    </div>
                    <a
                      href={dsaProblem.alternativeResourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-surface-panel hover:bg-border-default text-status-success border border-border-default rounded-[4px] flex items-center gap-1"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border-default bg-surface-elevated flex items-center justify-between gap-3">
            <a
              href={dsaProblem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-surface-panel hover:bg-border-default text-text-primary border border-border-default rounded-[4px] font-bold text-xs flex items-center gap-2"
            >
              <Code2 className="size-4 text-accent-amber" /> Solve on LeetCode #{dsaProblem.leetcodeNumber} <ExternalLink className="size-3" />
            </a>

            {onOpenAttemptModal && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAttemptModal(dsaProblem);
                }}
                className="text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] px-4"
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

  // Learning destination for this task: the Preparation workspace when the
  // topic has a curriculum bridge, otherwise the roadmap topic that owns it.
  const taskRoute = getTaskLearningRoute(task!);
  const preparationTitle = taskRoute.preparationTopicTitle || 'Preparation';

  const handleOpenLearningDestination = () => {
    const route = getTaskLearningRoute(task!);
    onClose();
    setRoute(route.route, route.linkedTopicId);
  };

  // Real curriculum only — never fabricated fallback content.
  const learningSteps = meta?.learningSteps ?? [];
  const practiceItems = meta?.practiceItems ?? [];
  const selfCheckQuestions = meta?.selfCheckQuestions ?? [];
  const completionCriteria = meta?.completionCriteria ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-workspace-title"
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-surface-panel border-l border-border-default w-full max-w-3xl lg:max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border-default flex items-start justify-between gap-4 bg-surface-elevated">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-accent-amber/10 text-accent-amber border border-accent-amber/30">
                {domain?.name || 'General'}
              </span>
              <span className="text-text-secondary">·</span>
              <span className="text-xs text-text-secondary capitalize">{task!.taskType}</span>
              <span className="text-text-secondary">·</span>
              <span className="text-xs text-accent-amber flex items-center gap-1">
                <Clock className="size-3" /> {task!.estimatedMinutes} mins
              </span>
            </div>
            <h2 id="learning-workspace-title" className="text-lg font-bold text-text-primary leading-snug">
              {task!.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Learning Workspace"
            className="p-1.5 rounded-[4px] text-text-secondary hover:text-text-primary hover:bg-border-default transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-text-secondary">
          {/* Section 1: WHY */}
          <section className="space-y-2 p-3.5 rounded-[4px] bg-surface-elevated border border-border-default">
            <h3 className="text-xs font-bold text-accent-amber uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-4" /> 1. WHY THIS TASK MATTERS
            </h3>
            <p className="text-text-primary leading-relaxed">{task!.description}</p>
            {breakdown && (
              <div className="pt-2 border-t border-border-default space-y-1 text-[11px]">
                <span className="text-text-secondary block font-semibold">Recommendation Rationale:</span>
                <p className="text-accent-amber italic">{breakdown.explanation}</p>
                <div className="flex gap-4 pt-1 text-[10px] text-text-secondary">
                  <span>Urgency: <strong className="text-text-primary">{breakdown.urgency}</strong></span>
                  <span>Weakness: <strong className="text-text-primary">{breakdown.weakness}</strong></span>
                  <span>Importance: <strong className="text-text-primary">{task!.importance}/10</strong></span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: WHERE TO LEARN (real destination — never invented content) */}
          <section className="space-y-3 p-4 rounded-[4px] bg-surface-elevated border border-accent-amber/30">
            <h3 className="text-xs font-bold text-accent-amber uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="size-4" /> 2. WHERE TO LEARN THIS
            </h3>
            <p className="text-text-muted leading-relaxed">
              {taskRoute.route === 'preparation'
                ? `The curriculum for this topic — learning cards, practice drills and assessments — lives in the ${preparationTitle} workspace in Preparation.`
                : 'No Preparation curriculum is mapped to this topic yet. Follow its tasks and progress in the Roadmap.'}
            </p>
            <Button
              size="sm"
              onClick={handleOpenLearningDestination}
              className="text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] px-4"
            >
              {taskRoute.route === 'preparation'
                ? `Open ${preparationTitle} Workspace`
                : 'View Topic in Roadmap'}{' '}
              <ArrowRight className="size-3.5 ml-1.5 inline-block" />
            </Button>
          </section>

          {/* Optional authored curriculum (only when real learning metadata exists) */}
          {(learningSteps.length > 0 || meta?.primaryResource) && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="size-4 text-accent-amber" /> 3. CONCEPT & LEARNING STEPS
              </h3>

              <div className="space-y-2">
                {learningSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-[4px] bg-surface-elevated border border-border-default">
                    <span className="size-5 rounded-[4px] bg-surface-panel text-accent-amber font-bold flex items-center justify-center shrink-0 text-[10px] border border-border-default">
                      {idx + 1}
                    </span>
                    <span className="text-text-primary font-medium leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              {meta?.primaryResource && (
                <div className="p-3 rounded-[4px] bg-surface-elevated border border-border-default space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase font-bold block">Primary Resource</span>
                  {meta.primaryResource.url ? (
                    <a
                      href={meta.primaryResource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-amber hover:underline font-semibold flex items-center gap-1 text-xs"
                    >
                      {meta.primaryResource.title} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-text-primary font-semibold">{meta.primaryResource.title}</span>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Section 4: PRACTICE */}
          {practiceItems.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Target className="size-4 text-accent-amber" /> 4. REQUIRED PRACTICE ITEMS
              </h3>
              <div className="space-y-1.5">
                {practiceItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-[4px] bg-surface-elevated border border-border-default text-text-primary">
                    • {item}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: SELF-CHECK */}
          {selfCheckQuestions.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="size-4 text-warning" /> 5. SELF-CHECK VERIFICATION
              </h3>
              <div className="space-y-1.5">
                {selfCheckQuestions.map((q, idx) => (
                  <div key={idx} className="p-2.5 rounded-[4px] bg-surface-elevated border border-border-default text-text-secondary flex items-start gap-2">
                    <HelpCircle className="size-3.5 text-accent-amber shrink-0 mt-0.5" />
                    <span className="text-text-primary">{q}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: COMPLETION CRITERIA */}
          {completionCriteria.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-status-success" /> 6. COMPLETION CRITERIA
              </h3>
              <div className="p-3 rounded-[4px] bg-surface-elevated border border-border-default space-y-1 text-text-primary">
                {completionCriteria.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-status-success shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-default bg-surface-elevated flex items-center justify-between gap-3">
          <div className="text-[11px] text-text-secondary">
            Status: <span className="font-bold capitalize text-text-primary">{state.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            {state === 'not_started' && onUpdateState && (
              <Button
                size="sm"
                onClick={() => onUpdateState(task!.id, 'in_progress')}
                className="text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] px-4"
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
                className="text-xs font-bold bg-status-success hover:bg-status-success/90 text-primary-foreground rounded-[4px] px-4"
              >
                <CheckCircle2 className="size-3.5 mr-1.5" /> Complete Task
              </Button>
            )}

            {state === 'completed' && onUpdateState && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateState(task!.id, 'not_started')}
                className="text-xs font-bold border-border-default text-text-secondary hover:text-text-primary rounded-[4px]"
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
