import React, { useMemo, useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { generateInterviewReadinessScorecard } from '../../engine/interviewReadinessEngine';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';
import { buildInterviewDimensionTrace } from '../../engine/evidenceTrace';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { InterviewReadinessStrip } from './InterviewReadinessStrip';
import { InterviewHeroSpotlight } from './InterviewHeroSpotlight';
import { InterviewDimensionMatrix } from './InterviewDimensionMatrix';
import { InterviewSignalHub } from './InterviewSignalHub';
import { InterviewCompanyAndTraceLedger } from './InterviewCompanyAndTraceLedger';

export const InterviewReadinessView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    topics,
    domains,
    skillStates,
    companyOverlays,
    practiceAttempts,
    practiceSessions,
    evidenceLogs,
    assessmentState,
    preparationTopicProgress,
    dailyTaskAssignments,
    todayDate,
    currentMode,
    activePhase,
    selectedCompanyOverlayId,
    setSelectedCompanyOverlayId,
    setRoute,
  } = usePlacement();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const catalog = useEvidenceCatalog();

  const todayAssignments = useMemo(
    () => dailyTaskAssignments.filter((a) => a.date === todayDate),
    [dailyTaskAssignments, todayDate]
  );

  const scorecard = useMemo(
    () =>
      generateInterviewReadinessScorecard({
        tasks: taskDefinitions,
        taskProgress,
        dsaProblems,
        dsaProgress,
        dsaAttempts,
        topics,
        domains,
        skillStates,
        companyOverlays,
        practiceAttempts,
        practiceSessions,
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress,
        domainResults: assessmentState?.domainResults ?? [],
        weaknessSignals: assessmentState?.weaknessSignals ?? [],
        evidenceLogs,
        assessmentState,
        todayStr: todayDate,
        selectedCompanyId: selectedCompanyOverlayId ?? undefined,
        currentMode,
        todayAssignments,
        activePhase,
      }),
    [
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      topics,
      domains,
      skillStates,
      companyOverlays,
      practiceAttempts,
      practiceSessions,
      preparationTopicProgress,
      assessmentState,
      evidenceLogs,
      todayDate,
      selectedCompanyOverlayId,
      currentMode,
      todayAssignments,
      activePhase,
    ]
  );

  const { dimensions, companyOverlay } = scorecard;

  /** SIGNAL → WHY → EVIDENCE → SOURCE for each readiness dimension. */
  const dimensionTraces = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dim) => [dim.id, buildInterviewDimensionTrace(dim, catalog)])
      ),
    [dimensions, catalog]
  );

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
      {/* ── Zone 1: Header & Readiness Telemetry Strip ───────────── */}
      <InterviewReadinessStrip
        scorecard={scorecard}
        companyOverlays={companyOverlays}
        selectedCompanyOverlayId={selectedCompanyOverlayId}
        onSelectCompany={setSelectedCompanyOverlayId}
      />

      {/* ── Zone 2: Primary Readiness Mission Spotlight ──────────── */}
      <InterviewHeroSpotlight scorecard={scorecard} onAction={setRoute} />

      {/* ── Zone 3: 6-Vector Readiness Dimension Matrix ─────────── */}
      <InterviewDimensionMatrix
        dimensions={dimensions}
        companyOverlay={companyOverlay}
        dimensionTraces={dimensionTraces}
        catalog={catalog}
        expandedId={expandedId}
        onToggleExpand={setExpandedId}
        onAction={setRoute}
      />

      {/* ── Zone 4: Subsystem Cross-Readiness & Signal Hub ───────── */}
      <InterviewSignalHub scorecard={scorecard} onAction={setRoute} />

      {/* ── Zone 5: Target Company Alignment Radar & Ledger ─────── */}
      <InterviewCompanyAndTraceLedger
        scorecard={scorecard}
        companyOverlays={companyOverlays}
        todayDate={todayDate}
        onAction={setRoute}
      />
    </div>
  );
};
