import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { isBaselineCompleted } from '../../engine/assessmentEngine';
import {
  TrendingUp,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { SkillsView } from '../skills/SkillsView';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { AssessmentRunnerView } from '../assessment/AssessmentRunnerView';

export type ProgressSubTab = 'overview' | 'skills' | 'diagnostic' | 'analytics';

interface ProgressHubViewProps {
  initialTab?: ProgressSubTab;
}

export const ProgressHubView: React.FC<ProgressHubViewProps> = ({ initialTab = 'overview' }) => {
  const {
    taskProgress,
    dsaProgress,
    skillStates,
    assessmentState,
    activePhase,
  } = usePlacement();

  const [activeTab, setActiveTab] = useState<ProgressSubTab>(initialTab);

  const baselineDone = isBaselineCompleted(assessmentState);

  // Quick stats
  const completedTasks = Object.values(taskProgress).filter(
    (t) => t.state === 'completed'
  ).length;

  const masteredDSA = Object.values(dsaProgress).filter(
    (p) => (p.currentBox ?? 1) >= 4
  ).length;

  const practicedDSA = Object.values(dsaProgress).filter(
    (p) => (p.attemptCount ?? 0) > 0
  ).length;

  const verifiedSkills = Object.values(skillStates).filter(
    (s) => (s.evidenceStrength ?? 0) >= 70
  ).length;

  const tabs: { id: ProgressSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'skills', label: 'Skills Matrix', icon: GraduationCap },
    { id: 'diagnostic', label: 'Diagnostic Results', icon: ClipboardCheck },
    { id: 'analytics', label: 'Review & Stats', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="progress-hub-view">
      {/* Header & Sub-navigation */}
      <header className="space-y-4 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-accent" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Progress</h1>
            </div>
            <p className="text-sm text-foreground-muted">
              Review learning achievements, diagnostic evaluations, and verified skill mastery.
            </p>
          </div>

          {activeTab !== 'overview' && (
            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground-muted hover:text-foreground transition-colors self-start sm:self-auto"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Overview</span>
            </button>
          )}
        </div>

        {/* Secondary Sub-navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border/80 overflow-x-auto pb-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                data-testid={`progress-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-accent text-foreground font-semibold bg-surface-elevated/40'
                    : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-elevated/20'
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? 'text-accent' : 'text-foreground-muted'}`} />
                <span>{tab.label}</span>
                {tab.id === 'diagnostic' && !baselineDone && (
                  <span
                    className="size-1.5 rounded-full bg-danger animate-pulse"
                    title="Diagnostic Pending"
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6" data-testid="progress-overview-section">
          {/* High-level Achievement Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4.5 space-y-2 shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center justify-between">
                <span>Phase Progress</span>
                <Layers className="size-3.5" />
              </div>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {activePhase.name}
              </div>
              <p className="text-xs text-foreground-muted">
                {completedTasks} tasks completed across curriculum
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4.5 space-y-2 shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center justify-between">
                <span>Verified Skills</span>
                <GraduationCap className="size-3.5" />
              </div>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {verifiedSkills} Topics
              </div>
              <p className="text-xs text-foreground-muted">
                Showing strong demonstrated proficiency (≥ 70%)
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4.5 space-y-2 shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center justify-between">
                <span>DSA Solved</span>
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {practicedDSA} Problems
              </div>
              <p className="text-xs text-foreground-muted">
                {masteredDSA} mastered in Leitner Box 4
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4.5 space-y-2 shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center justify-between">
                <span>Diagnostic Baseline</span>
                <ClipboardCheck className="size-3.5" />
              </div>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {baselineDone ? 'Complete' : 'Pending'}
              </div>
              <p className="text-xs text-foreground-muted">
                {baselineDone
                  ? 'Baseline evaluated and readiness scored'
                  : 'Complete diagnostic to calibrate recommendations'}
              </p>
            </div>
          </div>

          {/* Deep Exploration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="size-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-accent">
                  <GraduationCap className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-foreground">Skills Matrix</h2>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Inspect detailed proficiency, evidence scores, and freshness across all 11 core computer science domains.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('skills')}
                data-testid="view-skills-matrix-btn"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface-muted text-foreground border border-border rounded-lg text-xs font-semibold transition-colors mt-2"
              >
                <span>View Skills Matrix</span>
                <ArrowRight className="size-3.5 text-accent" />
              </button>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="size-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-accent">
                  <ClipboardCheck className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-foreground">Diagnostic Assessment</h2>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Review baseline diagnostic performance, domain-by-domain precision, and identified weakness signals.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('diagnostic')}
                data-testid="view-diagnostic-results-btn"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface-muted text-foreground border border-border rounded-lg text-xs font-semibold transition-colors mt-2"
              >
                <span>{baselineDone ? 'View Diagnostic Results' : 'Take Diagnostic'}</span>
                <ArrowRight className="size-3.5 text-accent" />
              </button>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="size-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-accent">
                  <BarChart3 className="size-4.5" />
                </div>
                <h2 className="text-base font-bold text-foreground">Review & Study Stats</h2>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Analyze Leitner spaced-repetition distribution, daily study time, consistency streaks, and evidence growth.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('analytics')}
                data-testid="view-analytics-btn"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface-muted text-foreground border border-border rounded-lg text-xs font-semibold transition-colors mt-2"
              >
                <span>View Study Analytics</span>
                <ArrowRight className="size-3.5 text-accent" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Sub-views */}
      {activeTab === 'skills' && (
        <div className="pt-2">
          <SkillsView />
        </div>
      )}

      {activeTab === 'diagnostic' && (
        <div className="pt-2">
          <AssessmentRunnerView />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="pt-2">
          <AnalyticsView />
        </div>
      )}
    </div>
  );
};
