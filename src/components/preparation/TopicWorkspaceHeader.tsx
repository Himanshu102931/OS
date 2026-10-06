import React from 'react';
import type {
  PreparationTopic,
  TopicSkillState,
  TopicPreparedness,
  PracticeSessionDefinition,
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
} from 'lucide-react';

interface TopicWorkspaceHeaderProps {
  topic: PreparationTopic;
  topicSkill: TopicSkillState;
  preparedness: TopicPreparedness;
  progression: TopicProgressionResult;
  prerequisiteStatus: PrerequisiteStatus;
  unmetPrerequisiteTopics: PreparationTopic[];
  isDeepLinked: boolean;
  matchingSessions: PracticeSessionDefinition[];
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
  progression,
  prerequisiteStatus,
  unmetPrerequisiteTopics,
  isDeepLinked,
  matchingSessions,
  onBack,
  onNavigateRoadmap,
  onDismissDeepLink,
  onCompleteActivity,
  onStartSession,
}) => {
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

  return (
    <header className="space-y-4" data-testid="topic-workspace-header">
      {/* Active Session Deep Link Banner */}
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
              className="px-3 py-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
            >
              Return to Session
            </button>
            <button
              onClick={onCompleteActivity}
              data-testid="workspace-defining-action"
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--action-accent-foreground)] bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] rounded-lg transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-active)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface-muted)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
          >
            <Layers className="size-3.5" />
            <span>View in Roadmap</span>
          </button>
        )}
      </div>

      {/* Main Topic Card & Preparedness Strip */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
                {topic.title}
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded-md border uppercase font-medium bg-[var(--surface-elevated)] text-[var(--accent)] border-[var(--border)]">
                {preparedness.readiness.replace('_', ' ')}
              </span>
              {progression.state === 'learned_unproven' && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-md border uppercase font-medium bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30">
                  Proof Needed
                </span>
              )}
              {progression.state === 'ready_to_progress' && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-md border uppercase font-medium bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30">
                  Evidenced
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-[11px] font-mono rounded-md border uppercase font-medium ${getFreshnessBadgeClass(
                  topicSkill.freshness
                )}`}
              >
                {topicSkill.freshness}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[var(--foreground-muted)]">
              <span className={topic.priority === 'high' ? 'text-[var(--warning)] font-semibold' : ''}>
                {topic.priority.toUpperCase()} PRIORITY
              </span>
              <span className="text-[var(--border)]">•</span>
              <span>{recommendedPhase?.name || topic.recommendedPhase}</span>
              <span className="text-[var(--border)]">•</span>
              <span>~{topic.estimatedMinutes} min</span>
              <span className="text-[var(--border)]">•</span>
              <span>
                Level {preparedness.currentLevel} / {preparedness.targetLevel} target
              </span>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed max-w-3xl pt-1">
              {topic.description}
            </p>
          </div>

          <div className="shrink-0 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-3.5 text-right min-w-[140px]">
            <span className="block text-[11px] text-[var(--foreground-muted)] uppercase font-mono tracking-wider">
              Evidence Score
            </span>
            <span className="text-2xl font-bold font-mono text-[var(--accent)]">
              {topicSkill.evidenceStrength} / 100
            </span>
          </div>
        </div>

        {/* 4-Pillar Preparedness Model */}
        <div className="pt-3 border-t border-[var(--border)] space-y-3">
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

        {/* Current Primary Action Bar */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-muted)] -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-xl">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="size-4 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--foreground-muted)]">Next Recommended Action:</span>
            <span className="text-[var(--foreground)] font-medium">
              {prerequisiteStatus.isLocked
                ? `Complete ${unmetPrerequisiteTopics.map((t) => t.title).join(', ')} first to unlock this topic`
                : progression.state === 'learned_unproven'
                ? `Demonstrate competence: attempt a practice session for ${topic.title}`
                : preparedness.nextAction}
            </span>
          </div>

          {!prerequisiteStatus.isLocked && onStartSession && matchingSessions.length > 0 && (
            <button
              onClick={() => onStartSession(matchingSessions[0]?.id)}
              data-testid="workspace-defining-action"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-accent)] hover:bg-[var(--action-accent-hover)] text-[var(--action-accent-foreground)] font-semibold text-xs transition-all shadow-sm shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--focus)] outline-none"
            >
              <span>
                {progression.state === 'learned_unproven'
                  ? 'Prove Readiness (Drill)'
                  : 'Start Assessment Drill'}
              </span>
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
