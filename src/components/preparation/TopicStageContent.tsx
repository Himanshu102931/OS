import React, { useState } from 'react';
import type {
  PreparationTopic,
  TopicStageId,
  PreparationTopicProgress,
  TopicSkillState,
  PracticeAttempt,
  EvidenceLog,
  PracticeSessionDefinition,
  ContinuousLearningStep,
} from '../../types';
import {
  BookOpen,
  Target,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
  Award,
  List,
} from 'lucide-react';

export interface TopicStageContentProps {
  topic: PreparationTopic;
  activeStep?: ContinuousLearningStep;
  subtopicIndex?: number;
  onSelectStep?: (step: ContinuousLearningStep) => void;
  onSelectSubtopic?: (index: number) => void;
  activeStage?: TopicStageId;
  topicProgress?: PreparationTopicProgress;
  topicSkill: TopicSkillState;
  topicAttempts: PracticeAttempt[];
  topicEvidence: EvidenceLog[];
  matchingSessions: PracticeSessionDefinition[];
  coveragePct: number;
  onSelectStage?: (stage: TopicStageId) => void;
  onMarkStageComplete: (stage?: TopicStageId) => void;
  onNavigateTopic: (topicId: string) => void;
  onStartSession?: (sessionId?: string) => void;
  onBackToHub?: () => void;
}

export const TopicStageContent: React.FC<TopicStageContentProps> = ({
  topic,
  activeStep = 'learn',
  subtopicIndex = 0,
  onSelectStep,
  onSelectSubtopic,
  topicProgress,
  topicSkill,
  topicAttempts,
  topicEvidence,
  matchingSessions,
  coveragePct: _coveragePct,
  onMarkStageComplete,
  onNavigateTopic: _onNavigateTopic,
  onStartSession,
  onBackToHub,
}) => {
  const [showOutline, setShowOutline] = useState<boolean>(false);

  const totalSubtopics = topic.subtopics.length || 1;
  const currentSubtopicTitle = topic.subtopics[subtopicIndex] || topic.title;
  const currentCard = topic.subtopicCards[subtopicIndex] || {
    what: topic.description,
    why: topic.whyItMatters,
    example: 'No specific code snippet required for this introductory subtopic.',
    practice: 'Review the learning objectives above and ensure core terminology is understood.',
    proof: 'Explain the core definition in your own words with zero ambiguity.',
  };

  const isOrientDone = topicProgress?.completedStages.includes('orient') ?? false;
  const isLearnDone = topicProgress?.completedStages.includes('learn') ?? false;
  const isApplyDone = topicProgress?.completedStages.includes('apply') ?? false;
  const isInterviewDone = topicProgress?.completedStages.includes('interview') ?? false;

  const handlePrevSubtopic = () => {
    if (subtopicIndex > 0 && onSelectSubtopic) {
      onSelectSubtopic(subtopicIndex - 1);
    }
  };

  const handleNextSubtopic = () => {
    if (subtopicIndex < totalSubtopics - 1 && onSelectSubtopic) {
      onSelectSubtopic(subtopicIndex + 1);
    }
  };

  const handleFinishLearn = () => {
    // Deliberate confirmation: completes orient & learn canonical stages
    if (!isOrientDone) {
      onMarkStageComplete('orient');
    }
    if (!isLearnDone) {
      onMarkStageComplete('learn');
    }
    if (onSelectStep) {
      onSelectStep('practice');
    }
  };

  return (
    <div className="space-y-6" data-testid="topic-stage-progression">
      {/* ============================================================== */}
      {/* 1. LEARN STEP: ONE SUBTOPIC AT A TIME                           */}
      {/* ============================================================== */}
      {activeStep === 'learn' && (
        <section
          aria-label="Learn Content"
          data-testid="learn-section"
          className="space-y-5"
        >
          {/* Subtopic Header & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                  Lesson {subtopicIndex + 1} of {totalSubtopics}
                </span>
                {isLearnDone && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                    <CheckCircle2 className="size-3" /> Learned
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate">
                {currentSubtopicTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowOutline((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg transition-colors cursor-pointer"
              >
                <List className="size-3.5" />
                <span>Outline ({totalSubtopics})</span>
              </button>

              <button
                type="button"
                onClick={handlePrevSubtopic}
                disabled={subtopicIndex === 0}
                aria-label="Previous lesson"
                data-testid="chevron-prev-subtopic"
                className="p-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>

              <span className="font-mono text-xs text-[var(--foreground-muted)] px-1">
                {subtopicIndex + 1}/{totalSubtopics}
              </span>

              <button
                type="button"
                onClick={handleNextSubtopic}
                disabled={subtopicIndex === totalSubtopics - 1}
                aria-label="Next lesson"
                data-testid="chevron-next-subtopic"
                className="p-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Quick Outline Dropdown Drawer */}
          {showOutline && (
            <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs font-semibold text-[var(--foreground)]">
                <span>Subtopics in {topic.title}</span>
                <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{totalSubtopics} parts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-60 overflow-y-auto">
                {topic.subtopics.map((sub, idx) => {
                  const isCurrent = idx === subtopicIndex;
                  return (
                    <button
                      key={idx}
                      data-testid={`outline-subtopic-${idx}`}
                      type="button"
                      onClick={() => {
                        if (onSelectSubtopic) onSelectSubtopic(idx);
                        setShowOutline(false);
                      }}
                      className={`flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                        isCurrent
                          ? 'bg-[var(--surface-elevated)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-[var(--foreground-subtle)] shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Subtopic Card: Understand, Example, Try it */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
            {/* Understand Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                <BookOpen className="size-3.5" />
                <span>Understand</span>
              </h3>
              <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-3">
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-1">
                    What it is
                  </h4>
                  <p className="text-xs sm:text-sm text-[var(--foreground)] leading-relaxed">
                    {currentCard.what}
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-1">
                    Why it matters
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                    {currentCard.why}
                  </p>
                </div>
              </div>
            </div>

            {/* Example Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--success)] flex items-center gap-1.5">
                <Target className="size-3.5" />
                <span>Example</span>
              </h3>
              <div className="p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--foreground)] overflow-x-auto leading-relaxed">
                <code>{currentCard.example}</code>
              </div>
            </div>

            {/* Try it Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--warning)] flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                <span>Try It & Proof</span>
              </h3>
              <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-[var(--foreground)] block mb-0.5">Practice prompt:</span>
                  <span className="text-[var(--foreground-muted)] leading-relaxed">{currentCard.practice}</span>
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="font-semibold text-[var(--foreground)] block mb-0.5">Ready standard:</span>
                  <span className="text-[var(--foreground-subtle)] leading-relaxed">{currentCard.proof}</span>
                </div>
              </div>
            </div>

            {/* Next / Prev / Complete Controls */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="prev-subtopic-btn"
                  onClick={handlePrevSubtopic}
                  disabled={subtopicIndex === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Previous</span>
                </button>

                {/* Orient completion button */}
                {!isOrientDone && (
                  <button
                    type="button"
                    data-testid="mark-orient-complete"
                    onClick={() => onMarkStageComplete('orient')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    <span>Mark Orient complete</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {subtopicIndex < totalSubtopics - 1 ? (
                  <button
                    type="button"
                    data-testid="next-subtopic-btn"
                    onClick={handleNextSubtopic}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold text-xs transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                  >
                    <span>Next Subtopic</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="mark-learn-complete"
                    onClick={handleFinishLearn}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--success)]/20 hover:bg-[var(--success)]/30 border border-[var(--success)]/40 text-[var(--success)] font-semibold text-xs transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Finish Learning & Go to Practice</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Resources & Objectives (Clean Footnote Section) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                <BookOpen className="size-3.5" />
                <span>Core Objectives</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--foreground-muted)]">
                {topic.learningObjectives.slice(0, 4).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                <ExternalLink className="size-3.5" />
                <span>Recommended Resources</span>
              </h4>
              <div className="space-y-2">
                {topic.recommendedResources.map((res, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--foreground)] truncate">{res.title}</span>
                    {res.url ? (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-[var(--foreground-subtle)] font-mono">Reference</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. PRACTICE STEP: CONNECT LEARNING TO ACTUAL EXERCISES         */}
      {/* ============================================================== */}
      {activeStep === 'practice' && (
        <section
          aria-label="Practice Drills"
          data-testid="practice-section"
          className="space-y-5"
        >
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Practice: {topic.title}
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Apply what you learned with hands-on exercises and interactive drills.
                </p>
              </div>

              {onSelectStep && (
                <button
                  type="button"
                  onClick={() => onSelectStep('learn')}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Return to Lessons</span>
                </button>
              )}
            </div>

            {/* Hands-on Practice Activities from Curriculum */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Hands-on Practice Activities
              </h3>
              <ul className="space-y-2">
                {topic.practiceActivities.map((act, i) => (
                  <li
                    key={i}
                    className="p-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--foreground)]"
                  >
                    <CheckCircle2 className="size-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Matching Runnable Practice Session */}
            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Interactive Practice Assessment
              </h3>

              {matchingSessions.length > 0 ? (
                <div className="space-y-3">
                  {matchingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">
                          {session.title}
                        </h4>
                        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--foreground-subtle)] font-mono pt-1">
                          <span>~{session.estimatedMinutes} mins</span>
                          <span>•</span>
                          <span>{session.questionCount} Questions</span>
                          <span>•</span>
                          <span>{session.category}</span>
                        </div>
                      </div>

                      {onStartSession && (
                        <button
                          type="button"
                          onClick={() => onStartSession(session.id)}
                          data-testid="start-practice-btn"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-bold text-xs rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          <span>Start Practice Drill</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-2">
                  <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                    No interactive drill quiz is defined for this specific topic yet. Complete the self-directed practice activities above to build practical competence.
                  </p>
                  <button
                    type="button"
                    data-testid="mark-apply-complete"
                    onClick={() => onMarkStageComplete('apply')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-active)] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    <span>{isApplyDone ? 'Practice Marked Complete' : 'Mark Practice Activities Done'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Historical Recorded Attempts if any */}
            {topicAttempts.length > 0 && (
              <div
                className="space-y-2 pt-2 border-t border-[var(--border)]"
                data-testid="recorded-practice-attempts"
              >
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Recorded Practice Attempts ({topicAttempts.length})
                </h3>
                <div className="space-y-2">
                  {topicAttempts.slice(-3).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="p-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[var(--foreground)]">{attempt.sessionTitle}</span>
                        <span className="text-[10px] text-[var(--foreground-muted)] block font-mono">
                          {attempt.date} · {Math.round(attempt.totalTimeSeconds / 60)}m
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`font-bold block ${
                            attempt.passed ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {attempt.accuracyPct}% {attempt.passed ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="text-[10px] text-[var(--foreground-subtle)]">
                          {attempt.correctCount}/{attempt.totalQuestions} correct
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={() => onSelectStep && onSelectStep('learn')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Learn</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectStep && onSelectStep('check')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-active)] text-[var(--foreground)] font-semibold text-xs hover:text-[var(--accent)] transition-all shadow-xs cursor-pointer"
              >
                <span>Proceed to Check</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. CHECK STEP: REVIEW UNDERSTANDING WITHOUT COMPLEXITY          */}
      {/* ============================================================== */}
      {activeStep === 'check' && (
        <section
          aria-label="Check Understanding"
          data-testid="check-section"
          className="space-y-5"
        >
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Check Understanding: {topic.title}
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Verify your comprehension and confirm readiness for the next topic.
                </p>
              </div>

              {onSelectStep && (
                <button
                  type="button"
                  onClick={() => onSelectStep('practice')}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Return to Practice</span>
                </button>
              )}
            </div>

            {/* Grounded Status Indicators: Clearly separated */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] block">
                  Lesson Finished
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                  {isOrientDone && isLearnDone ? (
                    <>
                      <CheckCircle2 className="size-4 text-[var(--success)]" />
                      <span>Material Studied</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="size-4 text-[var(--warning)]" />
                      <span>Incomplete</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] block">
                  Practice Recorded
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                  {topicAttempts.length > 0 || isApplyDone ? (
                    <>
                      <CheckCircle2 className="size-4 text-[var(--success)]" />
                      <span>{topicAttempts.length} attempt(s)</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="size-4 text-[var(--foreground-subtle)]" />
                      <span>Not attempted</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] block">
                  Skill Demonstrated
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                  {topicSkill.evidenceStrength >= 40 && topicAttempts.some((a) => a.passed) ? (
                    <>
                      <Award className="size-4 text-[var(--success)]" />
                      <span>Verified ({topicSkill.evidenceStrength}/100)</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="size-4 text-[var(--foreground-subtle)]" />
                      <span>{topicSkill.evidenceStrength > 0 ? `${topicSkill.evidenceStrength}/100 recorded` : 'Needs demonstration'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Explain It Back (Conceptual Checkpoint) */}
            {topic.stages.includes('interview') && (
              <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-[var(--accent)]" />
                    <span>Explain it back (Conceptual Self-Check)</span>
                  </h3>
                  {isInterviewDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                      <CheckCircle2 className="size-3" /> Proven
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Practice explaining this concept out loud or in notes without consulting documentation. Be ready to explain:
                </p>

                <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] italic">
                  "Explain the core trade-offs and edge cases when working with {topic.title}."
                </div>

                {topic.interviewCheckpoints.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {topic.interviewCheckpoints.map((cp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                        <CheckCircle2 className="size-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                        <span>{cp}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!isInterviewDone && (
                  <div className="pt-2">
                    <button
                      type="button"
                      data-testid="mark-interview-complete"
                      onClick={() => onMarkStageComplete('interview')}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      Confirm Conceptual Understanding
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Historical Review & Telemetry Log Summary */}
            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-[var(--foreground-subtle)]">
                  Evidence events: {topicEvidence.length}
                </span>
                <span className="font-mono text-[var(--foreground-muted)]">
                  Evidence score: {topicSkill.evidenceStrength}/100 ({topicSkill.freshness})
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onSelectStep && onSelectStep('practice')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Practice</span>
              </button>

              {onBackToHub && (
                <button
                  type="button"
                  onClick={onBackToHub}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <span>Finish & Return to Hub</span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
