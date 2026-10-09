import React from 'react';
import type {
  PracticeSessionDefinition,
  PracticeAttempt,
  PreparationTopic,
  PreparationTopicProgress,
  TopicSkillState,
} from '../../types';
import { resolveProjectDefenseRemediation } from '../../engine/remediationRouter';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Sparkles,
  HelpCircle,
  Cpu,
} from 'lucide-react';

interface ProjectDefenseHeroProps {
  defenseSession?: PracticeSessionDefinition;
  practiceAttempts: PracticeAttempt[];
  practiceSessions: PracticeSessionDefinition[];
  preparationTopics: PreparationTopic[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  skillStates: Record<string, TopicSkillState>;
  onLaunchDefense: () => void;
  onNavigateToRemediation?: (route: string, targetId?: string) => void;
}

export const ProjectDefenseHero: React.FC<ProjectDefenseHeroProps> = ({
  defenseSession,
  practiceAttempts,
  practiceSessions,
  preparationTopics,
  preparationTopicProgress,
  skillStates,
  onLaunchDefense,
  onNavigateToRemediation,
}) => {
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const latestAttempt = projectAttempts[0] ?? null;

  // Derive canonical remediation route if defense was attempted but failed
  const remediationRoutes = resolveProjectDefenseRemediation({
    practiceAttempts,
    practiceSessions,
    preparationTopics,
    preparationTopicProgress,
    skillStates,
  });
  const activeRemediation = remediationRoutes[0] ?? null;

  const sessionPromptCount = defenseSession?.questions.length ?? 4;
  const passThreshold = defenseSession?.passingScorePct ?? 80;

  const categories = [
    'Architecture & Data Flow',
    'Trade-offs & Tech Choices',
    'Scalability & Failure Recovery',
    'Security & Auth',
  ];

  return (
    <div
      className="bg-[#111713] border border-[#0D9488]/35 hover:border-[#0D9488]/55 rounded-[6px] p-5 sm:p-6 transition-all shadow-sm space-y-4 relative overflow-hidden"
      data-testid="project-defense-hero"
      role="region"
      aria-label="Viva Defense Simulator Spotlight"
    >
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 bg-[#0D9488]/15 text-[#2DD4BF] rounded border border-[#0D9488]/40 font-bold">
              <Sparkles className="size-3" />
              <span>Viva Interrogation Simulator</span>
            </span>
            <span className="text-[10px] font-mono text-foreground-muted">
              practice-project-defense-01
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Cpu className="size-5 text-[#0D9488]" />
            <span>System & Project Architecture Defense</span>
          </h2>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            High-pressure technical viva drill evaluating your ability to articulate system data flow,
            justify technical trade-offs against alternatives, identify performance bottlenecks at 100x traffic,
            and explain authorization models.
          </p>

          {/* Session Specs Pills */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[11px] font-mono px-2 py-0.5 bg-[#161E19] text-foreground rounded border border-[#28352D]">
              <strong>{sessionPromptCount}</strong> Defense Prompts
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-[#161E19] text-[#0D9488] rounded border border-[#0D9488]/30 font-semibold">
              <strong>{passThreshold}%</strong> Passing Threshold
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-[#161E19] text-foreground-muted rounded border border-[#28352D]">
              ~20 Min Session
            </span>
          </div>
        </div>

        {/* Primary Defining Action CTA */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2">
          <button
            type="button"
            onClick={onLaunchDefense}
            data-testid="launch-project-defense-btn"
            className="w-full sm:w-auto px-6 py-3 rounded bg-[#0D9488] hover:bg-[#14B8A6] active:bg-[#0F766E] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover-lift min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden cursor-pointer"
          >
            <span>Launch Project Defense</span>
            <ArrowRight className="size-4" />
          </button>
          <span className="text-[10px] text-secondary font-mono text-center sm:text-right">
            Appends verifiable evidence log
          </span>
        </div>
      </div>

      {/* Categories Checked in Simulation */}
      <div className="pt-2 border-t border-[#28352D]/60 flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="text-secondary font-mono text-[10px] uppercase tracking-wider mr-1">
          Covers:
        </span>
        {categories.map((cat) => (
          <span
            key={cat}
            className="px-2 py-0.5 bg-[#161E19] text-foreground-muted rounded border border-[#28352D] text-[10px] font-mono"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Latest Attempt State & Remediation Strip */}
      <div className="pt-1">
        {latestAttempt ? (
          <div
            className={`p-3.5 sm:p-4 rounded border text-xs space-y-2 ${
              latestAttempt.passed
                ? 'bg-status-success/10 border-status-success/30 text-foreground'
                : 'bg-status-warning/10 border-status-warning/30 text-foreground'
            }`}
            data-testid="latest-attempt-status-banner"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2">
                {latestAttempt.passed ? (
                  <ShieldCheck className="size-4 text-status-success shrink-0 mt-0.5 sm:mt-0" />
                ) : (
                  <ShieldAlert className="size-4 text-status-warning shrink-0 mt-0.5 sm:mt-0" />
                )}
                <div>
                  <span className="font-semibold text-sm">
                    {latestAttempt.passed
                      ? `Defense Passed — Score ${latestAttempt.scorePct}% meets the ${passThreshold}% requirement.`
                      : `Defense Not Passed — Score ${latestAttempt.scorePct}% is below the ${passThreshold}% threshold.`}
                  </span>
                  <span className="text-[11px] text-foreground-muted block mt-0.5 font-mono">
                    Status:{' '}
                    <strong
                      className={latestAttempt.passed ? 'text-status-success' : 'text-status-danger'}
                      data-testid="attempt-status-text"
                    >
                      {latestAttempt.passed ? 'PASS' : 'FAIL'}
                    </strong>{' '}
                    · {latestAttempt.correctCount}/{latestAttempt.totalQuestions} correct prompts ·
                    Recorded {latestAttempt.completedAt || latestAttempt.date}
                  </span>
                </div>
              </div>

              {/* Score pill */}
              <div className="shrink-0 font-mono text-right">
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded border ${
                    latestAttempt.passed
                      ? 'bg-status-success/20 text-status-success border-status-success/40'
                      : 'bg-status-warning/20 text-status-warning border-status-warning/40'
                  }`}
                >
                  {latestAttempt.scorePct}%
                </span>
              </div>
            </div>

            {/* Next Step / Guidance */}
            <div className="pt-2 border-t border-current/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-foreground-muted leading-relaxed">
                {latestAttempt.passed
                  ? 'Your viva defense record is active. To maintain readiness, rehearse periodically before upcoming company drives.'
                  : 'Review the canonical architecture answers and data flow patterns before retrying the defense simulation.'}
              </p>

              {/* Remediation CTA if not passed */}
              {!latestAttempt.passed && activeRemediation && onNavigateToRemediation && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToRemediation(activeRemediation.route, activeRemediation.targetId)
                  }
                  data-testid="defense-remediation-btn"
                  className="px-3.5 py-1.5 rounded bg-status-warning/20 hover:bg-status-warning/30 text-status-warning border border-status-warning/40 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="size-3.5" />
                  <span>Review Defense Notes in Preparation</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="p-3.5 sm:p-4 bg-[#161E19] border border-[#28352D] rounded text-xs text-foreground-muted flex items-start gap-2.5"
            data-testid="no-attempt-status-banner"
          >
            <HelpCircle className="size-4 text-[#0D9488] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-foreground font-medium block">
                No defense attempts recorded yet.
              </span>
              <p className="text-[11px] leading-relaxed">
                Launch your first viva simulation to establish an authentic baseline for portfolio architecture defense.
                Passing score (≥80%) awards verified skill credit on career and interview topics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
