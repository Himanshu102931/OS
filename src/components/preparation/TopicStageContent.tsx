import React, { useState } from 'react';
import type {
  PreparationTopic,
  TopicStageId,
  PreparationTopicProgress,
  TopicSkillState,
  PracticeAttempt,
  EvidenceLog,
  PracticeSessionDefinition,
} from '../../types';
import { getPreparationTopic } from '../../data/preparationDataset';
import { summarizePracticeAnswers } from '../../engine/practiceEngine';
import {
  Compass,
  BookOpen,
  Layers,
  Target,
  History,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface TopicStageContentProps {
  topic: PreparationTopic;
  activeStage: TopicStageId;
  topicProgress?: PreparationTopicProgress;
  topicSkill: TopicSkillState;
  topicAttempts: PracticeAttempt[];
  topicEvidence: EvidenceLog[];
  matchingSessions: PracticeSessionDefinition[];
  coveragePct: number;
  onSelectStage: (stage: TopicStageId) => void;
  onMarkStageComplete: () => void;
  onNavigateTopic: (topicId: string) => void;
  onStartSession?: (sessionId?: string) => void;
}

export const TopicStageContent: React.FC<TopicStageContentProps> = ({
  topic,
  activeStage,
  topicProgress,
  topicSkill,
  topicAttempts,
  topicEvidence,
  matchingSessions,
  coveragePct,
  onSelectStage,
  onMarkStageComplete,
  onNavigateTopic,
  onStartSession,
}) => {
  const [openCardKey, setOpenCardKey] = useState<string | null>(null);

  const stageIcons: Record<TopicStageId, React.FC<{ className?: string }>> = {
    orient: Compass,
    learn: BookOpen,
    apply: Layers,
    assess: Target,
    review: History,
    interview: MessageSquare,
    evidence: ShieldCheck,
  };

  const stageLabels: Record<TopicStageId, string> = {
    orient: 'Orient',
    learn: 'Learn',
    apply: 'Apply',
    assess: 'Assess',
    review: 'Review',
    interview: 'Interview',
    evidence: 'Evidence',
  };

  const isStageCompleted = (stage: TopicStageId) =>
    topicProgress?.completedStages.includes(stage) ?? false;

  const canonicalCurrentStage =
    topic.stages.find((s) => !topicProgress?.completedStages.includes(s)) ??
    topic.stages[topic.stages.length - 1];

  return (
    <div className="space-y-4" data-testid="topic-stage-progression">
      {/* 7-Stage Progression Rail / Knowledge Flow System */}
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2.5 sm:p-3 overflow-hidden shadow-xs"
        data-testid="knowledge-flow-rail"
      >
        {/* Knowledge Flow Track with Travelling Energy Beam */}
        <div
          className="knowledge-flow-track absolute top-0 left-0 right-0 h-[2px] bg-[var(--border)]"
          aria-hidden="true"
        >
          <div className="knowledge-flow-beam" />
        </div>

        {/* 7-Stage Progression Rail / Tabs */}
        <nav
          aria-label="Topic Learning Progression Stages"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-1 pb-1 scrollbar-thin"
        >
          {topic.stages.map((stageId, index) => {
            const Icon = stageIcons[stageId] || Compass;
            const isActive = activeStage === stageId;
            const isDone = isStageCompleted(stageId);
            const isCurrent = stageId === canonicalCurrentStage;

            return (
              <React.Fragment key={stageId}>
                <button
                  id={`stage-tab-${stageId}`}
                  aria-label={stageLabels[stageId]}
                  aria-selected={isActive}
                  aria-controls={`stage-panel-${stageId}`}
                  onClick={() => onSelectStage(stageId)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none ${
                    isActive
                      ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-active)] font-semibold shadow-xs'
                      : isCurrent
                      ? 'text-[var(--foreground)] bg-[var(--surface-elevated)]/60 border border-[var(--accent)]/40 hover:bg-[var(--surface-elevated)]'
                      : isDone
                      ? 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]/40 border border-transparent'
                      : 'text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]/30 border border-transparent'
                  } ${isCurrent ? 'stage-current-breath' : ''}`}
                >
                  <span
                    className={`flex items-center justify-center size-5 rounded-md text-[10px] font-mono shrink-0 transition-colors ${
                      isDone
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : isCurrent
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'bg-[var(--surface-elevated)] text-[var(--foreground-subtle)]'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon
                      className={`size-3.5 shrink-0 ${
                        isDone
                          ? 'text-[var(--success)]'
                          : isActive || isCurrent
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--foreground-subtle)]'
                      }`}
                    />
                    <span>{stageLabels[stageId]}</span>
                  </span>
                  {isCurrent && (
                    <span
                      className="ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
                    >
                      Current
                    </span>
                  )}
                </button>
                {index < topic.stages.length - 1 && (
                  <div
                    className="hidden sm:flex items-center text-[var(--border)] shrink-0 px-0.5"
                    aria-hidden="true"
                  >
                    <ChevronRight className="size-3 text-[var(--foreground-subtle)]/40" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Stage Panel Card with smooth transition on stage change */}
      <section
        key={activeStage}
        id={`stage-panel-${activeStage}`}
        aria-labelledby={`stage-tab-${activeStage}`}
        className="stage-panel-enter bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6"
      >
        {/* Stage Completion Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--border)]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
            Stage: {stageLabels[activeStage]} · Curriculum {coveragePct}% covered
          </span>
          {isStageCompleted(activeStage) ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30">
              <CheckCircle2 className="size-3.5" /> Stage completed
            </span>
          ) : (
            <button
              onClick={onMarkStageComplete}
              data-testid={`mark-${activeStage}-complete`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-active)] hover:text-[var(--accent)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Mark {stageLabels[activeStage]} complete</span>
            </button>
          )}
        </div>

        {/* STAGE 1: ORIENT */}
        {activeStage === 'orient' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Compass className="size-4 text-[var(--accent)]" />
                <span>Why This Topic Matters</span>
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed bg-[var(--surface-muted)] p-3.5 rounded-lg border border-[var(--border)]">
                {topic.whyItMatters}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">
                Prerequisites
              </h3>
              <div className="flex flex-wrap gap-2">
                {topic.prerequisites.map((prereq, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg text-[var(--foreground-muted)] font-mono"
                  >
                    • {prereq}
                  </span>
                ))}
              </div>
              {topic.prerequisiteTopicIds.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1.5">
                    Prerequisites in Curriculum
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {topic.prerequisiteTopicIds.map((prereqId) => {
                      const prereqTopic = getPreparationTopic(prereqId);
                      if (!prereqTopic) return null;
                      return (
                        <button
                          key={prereqId}
                          onClick={() => onNavigateTopic(prereqId)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-[var(--accent)] hover:border-[var(--border-active)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                        >
                          <span>{prereqTopic.title}</span>
                          <ArrowRight className="size-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">
                  What "Ready" Means
                </h3>
                <ul className="space-y-1.5">
                  {topic.completionCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                      <CheckCircle2 className="size-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">
                  Evidence Required
                </h3>
                <ul className="space-y-1.5">
                  {topic.evidenceCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                      <ShieldCheck className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: LEARN */}
        {activeStage === 'learn' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">
                Curriculum Subtopics
              </h3>
              <p className="text-[11px] text-[var(--foreground-muted)] mb-3">
                Open any subtopic for its structured knowledge card: what it is, why it matters, an example, practice, and proof.
              </p>
              <ul className="space-y-2">
                {topic.subtopics.map((sub, i) => {
                  const card = topic.subtopicCards[i];
                  const cardKey = `${topic.id}:${i}`;
                  const isOpen = openCardKey === cardKey && Boolean(card);
                  return (
                    <li key={i} className="border border-[var(--border)] rounded-lg bg-[var(--surface-muted)] overflow-hidden">
                      <button
                        onClick={() => setOpenCardKey(isOpen ? null : cardKey)}
                        className={`w-full flex items-start gap-2 px-3.5 py-2.5 text-left text-xs transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none ${
                          isOpen ? 'text-[var(--accent)] font-medium' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        <span className="text-[var(--foreground-subtle)] font-mono shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1">{sub}</span>
                        <ChevronRight
                          className={`size-3.5 shrink-0 mt-0.5 transition-transform ${
                            isOpen ? 'rotate-90 text-[var(--accent)]' : 'text-[var(--foreground-subtle)]'
                          }`}
                        />
                      </button>
                      {isOpen && card && (
                        <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--border)] space-y-2 bg-[var(--surface)]">
                          {[
                            { label: 'What', text: card.what, color: 'text-[var(--accent)]' },
                            { label: 'Why', text: card.why, color: 'text-[var(--accent)]' },
                            { label: 'Example', text: card.example, color: 'text-[var(--success)]' },
                            { label: 'Practice', text: card.practice, color: 'text-[var(--warning)]' },
                            { label: 'Proof', text: card.proof, color: 'text-[var(--success)]' },
                          ].map((field) => (
                            <div key={field.label} className="flex items-start gap-2 text-xs">
                              <span
                                className={`font-mono text-[10px] uppercase tracking-wider w-16 shrink-0 pt-0.5 ${field.color}`}
                              >
                                {field.label}
                              </span>
                              <span className="text-[var(--foreground-muted)] leading-relaxed">
                                {field.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="size-4 text-[var(--accent)]" />
                <span>Core Learning Objectives</span>
              </h3>
              <ul className="space-y-2">
                {topic.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--foreground-muted)]">
                    <CheckCircle2 className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
                Recommended Resources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topic.recommendedResources.map((res, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex flex-col justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[var(--surface-elevated)] text-[var(--foreground-muted)] rounded inline-block mb-1 border border-[var(--border)]">
                        {res.type}
                      </span>
                      <h4 className="text-xs font-medium text-[var(--foreground)]">{res.title}</h4>
                    </div>
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium mt-1 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: APPLY */}
        {activeStage === 'apply' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers className="size-4 text-[var(--accent)]" />
                <span>Practice Activities</span>
              </h3>
              <ul className="space-y-1.5">
                {topic.practiceActivities.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                    <CheckCircle2 className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2">
                Available Practice & Execution Modules
              </h3>
              {matchingSessions.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)]">
                  No dedicated practice module defined yet for this topic.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {matchingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--foreground)]">
                          {session.title}
                        </h4>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--foreground-subtle)] font-mono mt-2">
                          <span>{session.estimatedMinutes} mins</span>
                          <span>•</span>
                          <span>{session.questionCount} Questions</span>
                          <span>•</span>
                          <span>{session.category}</span>
                        </div>
                      </div>
                      {onStartSession && (
                        <button
                          onClick={() => onStartSession(session.id)}
                          className="px-3.5 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-active)] border border-[var(--border)] text-[var(--accent)] font-semibold text-xs rounded-lg transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
                        >
                          Start Drill
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAGE 4: ASSESS */}
        {activeStage === 'assess' && (
          <div className="space-y-4 text-center py-4">
            <Target className="size-8 text-[var(--accent)] mx-auto" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              Deterministic Practice Assessment Engine
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
              Test your proficiency with timed questions. Successful completion logs objective evidence into PlacementOS.
            </p>
            {onStartSession && matchingSessions.length > 0 ? (
              <button
                onClick={() => onStartSession(matchingSessions[0]?.id)}
                className="px-5 py-2.5 bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-bold text-xs rounded-lg shadow transition-all inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
              >
                <span>Launch Assessment Session</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)]">
                No assessment session is defined for this topic yet.
              </p>
            )}
            <div className="text-left max-w-md mx-auto pt-3 border-t border-[var(--border)]">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-2">
                Assessment Types
              </h4>
              <ul className="space-y-1.5">
                {topic.assessmentTypes.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                    <Target className="size-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* STAGE 5: REVIEW */}
        {activeStage === 'review' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <History className="size-4 text-[var(--accent)]" />
              <span>Historical Practice Attempts</span>
            </h3>
            {topicAttempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--foreground-muted)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg">
                No recorded attempts yet for this topic.
              </div>
            ) : (
              <div className="space-y-2">
                {topicAttempts.map((attempt) => {
                  const attemptSession = matchingSessions.find((s) => s.id === attempt.sessionId);
                  const summary = attemptSession
                    ? summarizePracticeAnswers(attemptSession, attempt)
                    : null;
                  return (
                    <div
                      key={attempt.id}
                      className="p-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-medium text-[var(--foreground)]">{attempt.sessionTitle}</span>
                        <span className="text-[10px] text-[var(--foreground-muted)] block">
                          {attempt.date} • {Math.round(attempt.totalTimeSeconds / 60)} mins
                        </span>
                        {summary && summary.unansweredCount > 0 && (
                          <span className="text-[10px] text-[var(--warning)] block">
                            {summary.unansweredCount} unanswered
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[var(--accent)] font-bold">{attempt.accuracyPct}% Accuracy</span>
                        <span className="text-[10px] text-[var(--foreground-muted)] block">
                          {attempt.correctCount}/{attempt.totalQuestions} correct
                        </span>
                        {attempt.passingScorePct !== undefined && (
                          <span
                            className={`text-[10px] font-bold block ${
                              attempt.passed ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                            }`}
                          >
                            {attempt.passed ? 'PASS' : 'FAIL'} · needs {attempt.passingScorePct}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STAGE 6: INTERVIEW */}
        {activeStage === 'interview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="size-4 text-[var(--accent)]" />
              <span>Technical Interview & Viva Prompts</span>
            </h3>
            <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg space-y-3">
              <p className="text-xs text-[var(--foreground-muted)]">
                Practice explaining concepts out loud or writing defense notes. Interview viva evaluates conceptual clarity and trade-off justification.
              </p>
              <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)]">
                <strong className="text-[var(--accent)] block mb-1">Common Interview Question:</strong>
                "Explain the core trade-offs and edge cases when working with {topic.title}."
              </div>
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-2">
                  Interview Checkpoints
                </h4>
                <ul className="space-y-1.5">
                  {topic.interviewCheckpoints.map((cp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
                      <MessageSquare className="size-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>{cp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 7: EVIDENCE */}
        {activeStage === 'evidence' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--accent)]" />
              <span>Evidence Trail & Telemetry</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg">
                <span className="text-[11px] text-[var(--foreground-muted)] font-mono block">
                  Calculated Evidence Score
                </span>
                <span className="text-3xl font-bold font-mono text-[var(--accent)] mt-1 block">
                  {topicSkill.evidenceStrength} / 100
                </span>
                <span className="text-[11px] text-[var(--foreground-subtle)] mt-1 block">
                  Freshness: {topicSkill.freshness}
                </span>
              </div>
              <div className="p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg">
                <span className="text-[11px] text-[var(--foreground-muted)] font-mono block">
                  Recorded Evidence Events
                </span>
                <span className="text-3xl font-bold font-mono text-[var(--foreground)] mt-1 block">
                  {topicEvidence.length}
                </span>
                <span className="text-[11px] text-[var(--foreground-subtle)] mt-1 block">
                  Canonical log events
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
