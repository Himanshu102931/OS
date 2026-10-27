import React, { useState } from 'react';
import type {
  PreparationTopic,
  TopicSkillState,
  TopicPreparedness,
  PracticeSessionDefinition,
  ContinuousLearningStep,
} from '../../types';
import type {
  TopicProgressionResult,
  PrerequisiteStatus,
} from '../../engine/preparationEngine';
import { PHASES } from '../../data/seedData';
import {
  ArrowLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowRight,
  BookOpen,
  Target,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface TopicWorkspaceHeaderProps {
  topic: PreparationTopic;
  topicSkill: TopicSkillState;
  preparedness: TopicPreparedness;
  progression: TopicProgressionResult;
  prerequisiteStatus: PrerequisiteStatus;
  unmetPrerequisiteTopics: PreparationTopic[];
  isDeepLinked: boolean;
  matchingSessions: PracticeSessionDefinition[];
  activeStep?: ContinuousLearningStep;
  onSelectStep?: (step: ContinuousLearningStep) => void;
  onBack: () => void;
  onNavigateRoadmap: () => void;
  onDismissDeepLink: () => void;
  onCompleteActivity: () => void;
  onStartSession?: (sessionId?: string) => void;
}

export const TopicWorkspaceHeader: React.FC<TopicWorkspaceHeaderProps> = ({
  topic,
  topicSkill,
  preparedness,
  progression: _progression,
  prerequisiteStatus,
  unmetPrerequisiteTopics,
  isDeepLinked,
  matchingSessions,
  activeStep = 'learn',
  onSelectStep,
  onBack,
  onNavigateRoadmap,
  onDismissDeepLink,
  onCompleteActivity,
  onStartSession,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const recommendedPhase = PHASES.find((p) => p.id === topic.recommendedPhase);

  const getFreshnessBadgeClass = (freshness: string) => {
    switch (freshness) {
      case 'fresh':
        return 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30';
      case 'aging':
        return 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30';
      case 'stale':
        return 'bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30';
      case 'untested':
      default:
        return 'bg-[var(--foreground-muted)]/15 text-[var(--foreground-muted)] border-[var(--border)]';
    }
  };

  const steps: { id: ContinuousLearningStep; label: string; desc: string; icon: React.FC<{ className?: string }>; isDone: boolean }[] = [
    {
      id: 'learn',
      label: '1. Learn',
      desc: 'Read core lessons',
      icon: BookOpen,
      isDone: preparedness.covered,
    },
    {
      id: 'practice',
      label: '2. Practice',
      desc: 'Hands-on drills',
      icon: Target,
      isDone: preparedness.practiced,
    },
    {
      id: 'check',
      label: '3. Check',
      desc: 'Review understanding',
      icon: ShieldCheck,
      isDone: preparedness.currentLevel >= topic.targetLevel || preparedness.readiness === 'ready',
    },
  ];

  return (
    <header className="space-y-4" data-testid="topic-workspace-header">
      {/* Active Session Deep Link Banner — only shown in verified session deep-link */}
      {isDeepLinked && (
        <div
          data-testid="session-deep-link-banner"
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--action-accent-subtle)] border border-[var(--action-accent-border)] rounded-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Active Adaptive Session Activity
              </div>
              <div className="text-[11px] text-[var(--foreground-muted)]">
                Reviewing foundational concept for {topic.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDismissDeepLink}
              className="px-3 py-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none cursor-pointer"
            >
              Return to Session
            </button>
            <button
              onClick={onCompleteActivity}
              data-testid="workspace-defining-action"
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--action-accent-foreground)] bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] rounded-lg transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none cursor-pointer"
            >
              Complete Activity & Advance
            </button>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-active)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>{isDeepLinked ? 'Back to Today' : 'Preparation Hub'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] font-mono">
            <span className="uppercase tracking-wider font-semibold text-[var(--accent)]">
              {topic.domainId}
            </span>
            <ChevronRight className="size-3.5 text-[var(--foreground-subtle)]" />
            <span className="text-[var(--foreground)] font-medium truncate max-w-[200px] sm:max-w-md">
              {topic.title}
            </span>
          </div>
        </div>

        {topic.roadmapTopicId && (
          <button
            onClick={onNavigateRoadmap}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface-muted)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none cursor-pointer"
          >
            <Layers className="size-3.5" />
            <span>View in Roadmap</span>
          </button>
        )}
      </div>

      {/* Main Topic Header Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
        {/* Title and Short Description */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
            {topic.title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--foreground-muted)] leading-relaxed max-w-3xl">
            {topic.description}
          </p>
        </div>

        {/* 3-Step Continuous Learning Navigation: Learn -> Practice -> Check */}
        <nav
          aria-label="Continuous Learning Stages"
          data-testid="continuous-learning-steps"
          className="grid grid-cols-3 gap-2 sm:gap-3 pt-2"
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                id={`step-tab-${s.id}`}
                aria-label={s.label}
                aria-selected={isActive}
                onClick={() => onSelectStep && onSelectStep(s.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-elevated)] border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--surface-muted)]/70 hover:bg-[var(--surface-elevated)] border-[var(--border)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex items-center justify-center size-6 rounded-lg text-xs font-mono shrink-0 transition-colors ${
                      s.isDone
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : isActive
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'bg-[var(--surface-elevated)] text-[var(--foreground-muted)]'
                    }`}
                  >
                    {s.isDone ? <CheckCircle2 className="size-4" /> : idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span
                      className={`block text-xs font-semibold truncate ${
                        isActive ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="hidden sm:block text-[11px] text-[var(--foreground-subtle)] truncate">
                      {s.desc}
                    </span>
                  </div>
                </div>
                <Icon
                  className={`size-4 shrink-0 hidden sm:block ${
                    isActive
                      ? 'text-[var(--accent)]'
                      : s.isDone
                      ? 'text-[var(--success)]'
                      : 'text-[var(--foreground-subtle)]'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Collapsible More Details Disclosure */}
        <div className="pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-mono transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus)]"
          >
            <span>{showDetails ? 'Hide details' : 'More details & evidence'}</span>
            {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-3 p-4 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl space-y-4 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded border uppercase font-medium bg-[var(--surface-elevated)] text-[var(--accent)] border-[var(--border)]">
                    {preparedness.readiness.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border uppercase font-medium ${getFreshnessBadgeClass(
                      topicSkill.freshness
                    )}`}
                  >
                    {topicSkill.freshness}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--foreground-muted)]">
                    {topic.priority.toUpperCase()} PRIORITY · {recommendedPhase?.name || topic.recommendedPhase} · ~{topic.estimatedMinutes} min
                  </span>
                </div>
                <div className="font-mono text-xs">
                  <span className="text-[var(--foreground-muted)]">Evidence: </span>
                  <span className="font-bold text-[var(--accent)]">{topicSkill.evidenceStrength}/100</span>
                </div>
              </div>

              {/* 4-Pillar Preparedness Model */}
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  {[
                    { label: 'Covered', ok: preparedness.covered, detail: `${preparedness.coveragePct}%` },
                    {
                      label: 'Practiced',
                      ok: preparedness.practiced,
                      detail: `${preparedness.attemptCount} attempts`,
                    },
                    {
                      label: 'Assessed',
                      ok:
                        preparedness.assessmentPerformance !== null &&
                        preparedness.assessmentPerformance >= 70,
                      detail:
                        preparedness.assessmentPerformance !== null
                          ? `${preparedness.assessmentPerformance}% best`
                          : 'no attempt',
                    },
                    {
                      label: 'Retained',
                      ok:
                        preparedness.evidenceStrength >= 60 &&
                        preparedness.evidenceFreshness !== 'stale' &&
                        preparedness.evidenceFreshness !== 'untested',
                      detail: `${preparedness.evidenceStrength}/100`,
                    },
                    ...(topic.stages.includes('interview')
                      ? [
                          {
                            label: 'Interview',
                            ok: preparedness.interviewProof,
                            detail: preparedness.interviewProof ? 'proven' : 'missing',
                          },
                        ]
                      : []),
                  ].map((pillar) => (
                    <span
                      key={pillar.label}
                      className={`px-2.5 py-1 rounded-lg border ${
                        pillar.ok
                          ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
                          : 'bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)]'
                      }`}
                    >
                      {pillar.ok ? '✓' : '○'} {pillar.label}
                      <span className="text-[var(--foreground-subtle)] ml-1">{pillar.detail}</span>
                    </span>
                  ))}
                </div>

                {preparedness.missingProof.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {preparedness.missingProof.map((gap, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1.5"
                      >
                        <span className="text-[var(--warning)] shrink-0">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Prompt Strip if locked or unproven */}
        {prerequisiteStatus.isLocked ? (
          <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--warning)]">
            <Sparkles className="size-4 shrink-0" />
            <span>Complete prerequisite ({unmetPrerequisiteTopics.map((t) => t.title).join(', ')}) first to unlock this topic.</span>
          </div>
        ) : !isDeepLinked && activeStep === 'practice' && onStartSession && matchingSessions.length > 0 ? (
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--foreground-muted)]">Ready to test your understanding?</span>
            <button
              onClick={() => onStartSession(matchingSessions[0]?.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold text-xs transition-all shadow-xs cursor-pointer"
            >
              <span>Start Assessment Drill</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
