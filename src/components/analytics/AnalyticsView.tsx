import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  evaluateAnalyticsTelemetry,
  type TimeWindow,
} from '../../engine/analyticsEngine';
import { TelemetryTraceabilityModal } from './TelemetryTraceabilityModal';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Code2,
  Layers,
  Award,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Brain,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';

export const AnalyticsView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    topics,
    domains,
    skillStates,
    dailyCheckIns,
    activePhase,
    evidenceLogs,
    todayDate,
    userSettings,
    setRoute,
  } = usePlacement();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);

  // Compute telemetry summary dynamically via analyticsEngine
  const summary = useMemo(() => {
    return evaluateAnalyticsTelemetry(
      timeWindow,
      todayDate,
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      topics,
      domains,
      skillStates,
      dailyCheckIns,
      activePhase,
      evidenceLogs
    );
  }, [
    timeWindow,
    todayDate,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    topics,
    domains,
    skillStates,
    dailyCheckIns,
    activePhase,
    evidenceLogs,
  ]);

  const handlePromptAction = (route: 'dsa' | 'roadmap' | 'skills') => {
    setRoute(route);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header & Window Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <BarChart3 className="size-5 text-[#FFC665]" />
            ANALYTICS & OPERATIONAL REVIEW
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Decision telemetry, learning quality, curriculum progress, and factual gap analysis
          </p>
        </div>

        {/* Time Window Tabs */}
        <div className="flex items-center gap-1 bg-[#14171D] p-1 border border-[#262D38] rounded-[4px]">
          {(['7d', '30d', 'phase', 'all'] as TimeWindow[]).map((w) => (
            <Button
              key={w}
              size="xs"
              variant={timeWindow === w ? 'secondary' : 'ghost'}
              onClick={() => setTimeWindow(w)}
              className={`text-xs uppercase font-mono rounded-[4px] ${
                timeWindow === w ? 'bg-[#1B2028] text-[#F1F5F9] font-bold' : 'text-[#8E98A8]'
              }`}
            >
              {w === '7d' ? '7 Days' : w === '30d' ? '30 Days' : w === 'phase' ? 'Phase' : 'Horizon'}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range & Horizon Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#14171D] border border-[#262D38] rounded-[4px] text-xs text-[#8E98A8]">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-[#FFC665]" />
          <span>
            Review Period: <strong className="text-[#F1F5F9]">{summary.startDateISO}</strong> to{' '}
            <strong className="text-[#F1F5F9]">{summary.endDateISO}</strong> ({summary.activity.totalDaysInWindow} days)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>Target Goal: <strong className="text-[#FFC665]">{userSettings.targetPlacementGoal}</strong></span>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setIsTraceabilityModalOpen(true)}
            className="h-6 text-[11px] text-[#FFC665] hover:bg-[#1B2028] px-2 rounded-[4px]"
          >
            <Info className="size-3.5 mr-1" /> Inspect Telemetry Data
          </Button>
        </div>
      </div>

      {/* Section 1: Evidence-Backed Review Decisions & Prompts */}
      {summary.reviewPrompts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-4 text-[#FFC665]" /> Evidence-Backed Planning Decisions ({summary.reviewPrompts.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.reviewPrompts.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-[4px] border space-y-2.5 transition-colors ${
                  p.severity === 'high'
                    ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                    : p.severity === 'medium'
                    ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                    : 'bg-[#1B2028] border-[#262D38] text-[#F1F5F9]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`size-4 shrink-0 ${
                        p.severity === 'high'
                          ? 'text-rose-400'
                          : p.severity === 'medium'
                          ? 'text-amber-400'
                          : 'text-[#3B82F6]'
                      }`}
                    />
                    <h3 className="text-xs font-bold font-mono">{p.title}</h3>
                  </div>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      p.severity === 'high'
                        ? 'bg-rose-900/60 text-rose-300'
                        : p.severity === 'medium'
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-[#262D38] text-[#8E98A8]'
                    }`}
                  >
                    {p.severity}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-[#8E98A8]">{p.description}</p>

                <div className="pt-1 flex items-center justify-end">
                  <Button
                    size="xs"
                    onClick={() => handlePromptAction(p.route)}
                    className="h-7 text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold rounded-[4px]"
                  >
                    {p.actionLabel} <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Activity & Volume Telemetry */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="size-4 text-[#FFC665]" /> Activity & Practice Telemetry
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="app-surface p-4 space-y-1.5 border-t-2 border-t-[#E5A93C]">
            <span className="text-[#8E98A8] text-[11px] uppercase flex items-center justify-between">
              Completed Tasks <CheckCircle2 className="size-3.5 text-[#E5A93C]" />
            </span>
            <div className="text-2xl font-bold text-[#F1F5F9]">{summary.activity.completedTasksCount}</div>
            <div className="text-[10px] text-[#8E98A8]">Tasks completed in window</div>
          </div>

          <div className="app-surface p-4 space-y-1.5 border-t-2 border-t-[#FFC665]">
            <span className="text-[#8E98A8] text-[11px] uppercase flex items-center justify-between">
              DSA Solves <Code2 className="size-3.5 text-[#FFC665]" />
            </span>
            <div className="text-2xl font-bold text-[#F1F5F9]">{summary.activity.dsaPassedCount}</div>
            <div className="text-[10px] text-[#8E98A8]">Out of {summary.activity.dsaAttemptsCount} total attempts</div>
          </div>

          <div className="app-surface p-4 space-y-1.5 border-t-2 border-t-[#4EAE79]">
            <span className="text-[#8E98A8] text-[11px] uppercase flex items-center justify-between">
              Study Time <Clock className="size-3.5 text-[#4EAE79]" />
            </span>
            <div className="text-2xl font-bold text-[#F1F5F9]">{summary.activity.studyHours}h</div>
            <div className="text-[10px] text-[#8E98A8]">{summary.activity.studyMinutes} actual mins</div>
          </div>

          <div className="app-surface p-4 space-y-1.5 border-t-2 border-t-[#3B82F6]">
            <span className="text-[#8E98A8] text-[11px] uppercase flex items-center justify-between">
              Sealing Rate <TrendingUp className="size-3.5 text-[#3B82F6]" />
            </span>
            <div className="text-2xl font-bold text-[#F1F5F9]">{summary.activity.consistencyRate}%</div>
            <div className="text-[10px] text-[#8E98A8]">{summary.activity.sealedDaysCount} of {summary.activity.totalDaysInWindow} days sealed</div>
          </div>
        </div>
      </div>

      {/* Section 3: Learning Quality & Retention Signals */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="size-4 text-[#FFC665]" /> Learning Quality & Retention Signals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Independence Ratio Card */}
          <div className="app-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F1F5F9] uppercase">Solve Independence Ratio</span>
              <span className="text-xs font-bold text-[#FFC665]">{summary.quality.independentSolveRatio}% Independent</span>
            </div>

            <div className="w-full h-2 bg-[#1B2028] rounded-full overflow-hidden border border-[#262D38] flex">
              <div
                className="h-full bg-[#4EAE79] transition-all duration-300"
                style={{ width: `${summary.quality.independentSolveRatio}%` }}
                title="Independent Solves"
              />
              <div
                className="h-full bg-[#3B82F6] transition-all duration-300"
                style={{ width: `${summary.quality.assistedSolveRatio}%` }}
                title="Assisted Solves"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8E98A8] pt-1">
              <span className="text-[#4EAE79] font-semibold">{summary.activity.dsaIndependentPassedCount} Unassisted</span>
              <span className="text-[#3B82F6] font-semibold">{summary.activity.dsaAssistedPassedCount} Assisted (Hint/Solution)</span>
            </div>
          </div>

          {/* Retention & Remediation Card */}
          <div className="app-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F1F5F9] uppercase">Review Retention Rate</span>
              <span className="text-xs font-bold text-[#4EAE79]">{summary.quality.reviewRetentionRate}% Pass Rate</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
                <span className="text-[#8E98A8] text-[10px] block">Remediation Events</span>
                <span className="font-bold text-rose-400">{summary.quality.remediationCount}</span>
              </div>
              <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
                <span className="text-[#8E98A8] text-[10px] block">Box 4 Mastered</span>
                <span className="font-bold text-[#4EAE79]">{summary.quality.boxDistribution[4]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Spaced Repetition Box Distribution */}
      <div className="app-surface p-5 space-y-4">
        <h2 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
          <Award className="size-4 text-[#FFC665]" /> Spaced Repetition Leitner Box Distribution
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[1, 2, 3, 4].map((boxNum) => {
            const count = summary.quality.boxDistribution[boxNum as 1 | 2 | 3 | 4] || 0;
            const totalProbs = dsaProblems.length;
            const pct = totalProbs > 0 ? Math.round((count / totalProbs) * 100) : 0;
            return (
              <div key={boxNum} className="p-3.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1">
                <div className="flex justify-between text-[#8E98A8] text-[11px]">
                  <span>Box {boxNum}</span>
                  <span className="text-[#FFC665] font-semibold">{pct}%</span>
                </div>
                <div className="text-xl font-bold text-[#F1F5F9]">{count} problems</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Curriculum Progress & Domain Readiness Telemetry */}
      <div className="app-surface p-5 space-y-4">
        <h2 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
          <Layers className="size-4 text-[#4EAE79]" /> Domain Readiness & Curriculum Progress
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Overall Domain Readiness</span>
            <span className="text-xl font-bold text-[#FFC665]">{summary.progress.overallDomainReadiness}%</span>
            <span className="text-[10px] text-[#8E98A8] block">Weighted across 11 domains</span>
          </div>

          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Active Phase Progress</span>
            <span className="text-xl font-bold text-[#F1F5F9]">{summary.progress.activePhaseCompletionRate}%</span>
            <span className="text-[10px] text-[#8E98A8] block">{activePhase?.name || 'Phase 1'}</span>
          </div>

          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Pattern Coverage</span>
            <span className="text-xl font-bold text-[#4EAE79]">
              {summary.progress.patternsAttemptedCount} / {summary.progress.totalPatternsCount}
            </span>
            <span className="text-[10px] text-[#8E98A8] block">DSA algorithmic patterns</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-[#F1F5F9] uppercase">Domain Telemetry Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {domains.map((dom) => {
              const domSkills = Object.values(skillStates).filter((sk) => sk.domainId === dom.id);
              const avgStrength =
                domSkills.length > 0
                  ? Math.round(domSkills.reduce((sum, sk) => sum + sk.evidenceStrength, 0) / domSkills.length)
                  : 0;

              return (
                <div key={dom.id} className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between">
                  <span className="text-[#F1F5F9] font-medium">{dom.shortName}</span>
                  <span className="font-bold text-[#FFC665]">{avgStrength}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 6: Factual Gaps & Neglect Inspection */}
      <div className="app-surface p-5 space-y-4">
        <h2 className="text-xs font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-400" /> Factual Gaps & Neglect Telemetry
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Overdue DSA Reviews</span>
            <span className="text-xl font-bold text-rose-400">{summary.gaps.overdueDsaCount}</span>
          </div>

          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Stale Evidence Topics</span>
            <span className="text-xl font-bold text-[#FFC665]">{summary.gaps.staleEvidenceTopicsCount}</span>
          </div>

          <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
            <span className="text-[#8E98A8] text-[11px] block uppercase">Repeatedly Postponed Tasks</span>
            <span className="text-xl font-bold text-[#3B82F6]">{summary.gaps.repeatedlyPostponedTasksCount}</span>
          </div>
        </div>
      </div>

      {/* Traceability Modal */}
      <TelemetryTraceabilityModal
        summary={summary}
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
      />
    </div>
  );
};
