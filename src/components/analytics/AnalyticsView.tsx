import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  evaluateAnalyticsTelemetry,
  type TimeWindow,
} from '../../engine/analyticsEngine';
import { TelemetryTraceabilityModal } from './TelemetryTraceabilityModal';
import {
  CheckCircle2,
  Clock,
  Code2,
  ArrowRight,
  Calendar,
  Sparkles,
  Info,
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
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header & Window Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Analytics & Operational Review
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Weekly telemetry summary, learning velocity, and evidence-backed focus recommendations.
          </p>
        </div>

        {/* Time Window Tabs */}
        <div className="flex items-center gap-1 bg-[#14171D] p-1 border border-[#262D38] rounded-lg">
          {(['7d', '30d', 'phase', 'all'] as TimeWindow[]).map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                timeWindow === w
                  ? 'bg-[#E5A93C] text-[#432C00]'
                  : 'text-[#8E98A8] hover:text-[#F1F5F9]'
              }`}
            >
              {w === '7d' ? '7 Days' : w === '30d' ? '30 Days' : w === 'phase' ? 'Phase' : 'Horizon'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-[#14171D] border border-[#262D38] rounded-xl text-xs text-[#8E98A8]">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-[#E5A93C]" />
          <span>
            Period: <strong className="text-[#F1F5F9]">{summary.startDateISO}</strong> to{' '}
            <strong className="text-[#F1F5F9]">{summary.endDateISO}</strong> ({summary.activity.totalDaysInWindow} days)
          </span>
        </div>

        <button
          onClick={() => setIsTraceabilityModalOpen(true)}
          className="text-xs text-[#E5A93C] hover:underline font-semibold flex items-center gap-1"
        >
          <Info className="size-3.5" /> Raw Telemetry Logs
        </button>
      </div>

      {/* 1. WHAT HAPPENED (Activity Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
            <Clock className="size-3.5 text-[#E5A93C]" /> Hours Logged
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            {summary.activity.studyHours}h
          </div>
          <p className="text-[11px] text-[#8E98A8]">Across {summary.activity.sealedDaysCount} sealed days</p>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
            <CheckCircle2 className="size-3.5 text-[#10B981]" /> Tasks Completed
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            {summary.activity.completedTasksCount}
          </div>
          <p className="text-[11px] text-[#8E98A8]">Roadmap task completions</p>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8E98A8] uppercase tracking-wider">
            <Code2 className="size-3.5 text-[#FFC665]" /> DSA Solved
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            {summary.activity.dsaPassedCount}
          </div>
          <p className="text-[11px] text-[#8E98A8]">
            {summary.quality.independentSolveRatio}% independent solves
          </p>
        </div>
      </div>

      {/* 2. EVIDENCE-BACKED PLANNING DECISIONS */}
      {summary.reviewPrompts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
            <Sparkles className="size-4 text-[#E5A93C]" /> Key Review Recommendations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.reviewPrompts.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border bg-[#14171D] border-[#262D38] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F1F5F9]">{p.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                      p.severity === 'high'
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                        : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                    }`}>
                      {p.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#8E98A8] leading-relaxed">{p.description}</p>
                </div>

                <div className="pt-2 border-t border-[#262D38] flex justify-end">
                  <Button
                    size="xs"
                    onClick={() => handlePromptAction(p.route)}
                    className="h-7 text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md font-semibold"
                  >
                    {p.actionLabel} <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Traceability Modal */}
      <TelemetryTraceabilityModal
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
        summary={summary}
      />
    </div>
  );
};
