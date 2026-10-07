import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  evaluateAnalyticsTelemetry,
  type TimeWindow,
} from '../../engine/analyticsEngine';
import { buildAnalyticsPromptTrace } from '../../engine/evidenceTrace';
import { AnalyticsHeader } from './AnalyticsHeader';
import { AnalyticsHealthStrip } from './AnalyticsHealthStrip';
import { AnalyticsObservatory } from './AnalyticsObservatory';
import { AnalyticsReviewGrid } from './AnalyticsReviewGrid';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { TelemetryTraceabilityModal } from './TelemetryTraceabilityModal';

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
    companyOverlays,
    activePhase,
    evidenceLogs,
    todayDate,
    setRoute,
  } = usePlacement();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);
  const catalog = useEvidenceCatalog();

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
      companyOverlays,
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
    companyOverlays,
    activePhase,
    evidenceLogs,
  ]);

  const handlePromptAction = (route: 'dsa' | 'roadmap' | 'skills', targetId?: string) => {
    setRoute(route, targetId);
  };

  /** SIGNAL → evidence/source trace for each review recommendation. */
  const promptTraces = useMemo(
    () => summary.reviewPrompts.map((p) => buildAnalyticsPromptTrace(p, catalog)),
    [summary.reviewPrompts, catalog]
  );

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans telemetry-sweep">
      {/* Zone 1: Telemetry Command Header & Time-Window Scope */}
      <AnalyticsHeader
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        startDateISO={summary.startDateISO}
        endDateISO={summary.endDateISO}
        totalDaysInWindow={summary.activity.totalDaysInWindow}
        onOpenRawLogs={() => setIsTraceabilityModalOpen(true)}
      />

      {/* Zone 2: Operational Health & Velocity Strip */}
      <AnalyticsHealthStrip
        activity={summary.activity}
        quality={summary.quality}
        progress={summary.progress}
        gaps={summary.gaps}
      />

      {/* Zone 3: Telemetry Observatory (Dual-Panel Memory & Progression Radar) */}
      <AnalyticsObservatory
        quality={summary.quality}
        progress={summary.progress}
        gaps={summary.gaps}
      />

      {/* Zone 4: Evidence-Backed Operational Review Recommendations */}
      <AnalyticsReviewGrid
        reviewPrompts={summary.reviewPrompts}
        promptTraces={promptTraces}
        catalog={catalog}
        onAction={handlePromptAction}
      />

      {/* Zone 5 Raw Traceability Modal (Detail Layer) */}
      <TelemetryTraceabilityModal
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
        summary={summary}
      />
    </div>
  );
};
