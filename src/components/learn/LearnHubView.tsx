import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  Map,
  Target,
  Code2,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const LearnHubView: React.FC = () => {
  const { currentRoute, setRoute, activePhase, preparationTopicProgress, dsaProgress } = usePlacement();

  const isRetired = currentRoute === 'project' || currentRoute === 'companies' || currentRoute === 'interview';
  const retiredModuleName =
    currentRoute === 'project'
      ? 'Project Lab'
      : currentRoute === 'companies'
        ? 'Companies'
        : 'Interview Readiness';

  // Progress metrics for plain-language badges
  const completedPrepTopics = Object.values(preparationTopicProgress).filter(
    (p) => (p.completedStages?.length ?? 0) >= 2
  ).length;

  const solvedDSACount = Object.values(dsaProgress).filter(
    (p) => (p.currentBox ?? 1) >= 2 || (p.attemptCount ?? 0) > 0
  ).length;

  const categories = [
    {
      id: 'roadmap',
      title: 'Learning Path',
      tagline: 'Step-by-step curriculum',
      description:
        'Follow your systematic 4-phase placement plan from core fundamentals through technical interview preparation.',
      statBadge: `${activePhase.name} • 4 Phases Total`,
      actionLabel: 'Open Learning Path',
      icon: Map,
      onClick: () => setRoute('roadmap'),
      testId: 'learn-card-roadmap',
    },
    {
      id: 'preparation',
      title: 'Programming & Core Subjects',
      tagline: 'Computer science foundations',
      description:
        'Master Python, SQL, Operating Systems, Database Management, and Computer Networks with guided learning cards.',
      statBadge: `${completedPrepTopics} of 11 Subjects In Progress`,
      actionLabel: 'Explore Core Subjects',
      icon: Target,
      onClick: () => setRoute('preparation'),
      testId: 'learn-card-preparation',
    },
    {
      id: 'dsa',
      title: 'DSA Concepts & Lessons',
      tagline: 'Data structures & algorithms',
      description:
        'Understand essential problem-solving patterns through guided lessons and the interactive 8-Day DSA Challenge.',
      statBadge: `${solvedDSACount} Problems Explored`,
      actionLabel: 'Open DSA Lessons',
      icon: Code2,
      onClick: () => setRoute('dsa'),
      testId: 'learn-card-dsa',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="learn-hub-view">
      {/* Header Banner */}
      <header className="space-y-1.5 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Learn</h1>
        </div>
        <p className="text-sm text-foreground-muted">
          Understand concepts and follow a guided learning path tailored to your placement goals.
        </p>
      </header>

      {/* Retired Module Notice */}
      {isRetired && (
        <div
          data-testid="retired-module-notice"
          className="bg-surface-elevated border border-accent/40 rounded-xl p-4 flex items-center justify-between gap-3 text-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-accent shrink-0" />
            <span className="text-foreground">
              <strong>{retiredModuleName}</strong> has been retired from the simplified experience.
              You have been brought to <strong>Learn</strong>.
            </span>
          </div>
          <button
            onClick={() => setRoute('learn')}
            data-testid="dismiss-retired-notice"
            className="px-2.5 py-1 text-[11px] font-medium bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground border border-border rounded transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3 Primary Learning Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              data-testid={cat.testId}
              className="bg-surface border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border-active transition-all group shadow-sm hover:shadow-md"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-foreground-muted border border-border">
                    {cat.statBadge}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
                    {cat.tagline}
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {cat.title}
                  </h2>
                </div>

                <p className="text-xs text-foreground-muted leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="pt-6 mt-auto">
                <button
                  onClick={cat.onClick}
                  data-testid={`${cat.testId}-btn`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-surface-muted text-foreground border border-border hover:border-accent/40 rounded-lg text-xs font-semibold transition-all group-hover:border-accent"
                >
                  <span>{cat.actionLabel}</span>
                  <ArrowRight className="size-3.5 text-accent group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple Helpful Tips */}
      <div className="bg-surface-elevated/50 border border-border/80 rounded-xl p-4.5 flex items-start gap-3 text-xs text-foreground-muted">
        <Sparkles className="size-4.5 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground">How should I learn?</span>
          <p className="leading-relaxed">
            Begin with <strong>Core Subjects</strong> to build your foundation in Python and CS basics. Move to <strong>DSA Concepts</strong> to master pattern-based problem solving, and track your overall placement trajectory on the <strong>Learning Path</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
