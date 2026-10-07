import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  calculateTopicReadiness,
  calculateDomainReadinessList,
  explainSkillFreshness,
  type TopicReadiness,
} from '../../engine/skillsEngine';
import { resolveTraceDestination } from '../../engine/evidenceTrace';
import { useEvidenceCatalog } from '../evidence/useEvidenceCatalog';
import { SkillsHeader } from './SkillsHeader';
import { SkillsProvingStrip } from './SkillsProvingStrip';
import { PrimaryGapHero } from './PrimaryGapHero';
import { DomainMatrixGrid } from './DomainMatrixGrid';
import { TopicEvidenceLedger } from './TopicEvidenceLedger';
import { EvidenceTraceabilityModal } from './EvidenceTraceabilityModal';
import { SkillOverrideModal } from './SkillOverrideModal';
import type { Topic } from '../../types';

export const SkillsView: React.FC = () => {
  const {
    domains,
    topics,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    companyOverlays,
    todayDate,
    updateSkillState,
    routeState,
    setRoute,
  } = usePlacement();

  const catalog = useEvidenceCatalog();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedReadiness, setSelectedReadiness] = useState<TopicReadiness | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);

  // Filters & Views
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFreshness, setFilterFreshness] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'matrix' | 'domains'>('matrix');

  // Compute live readiness for all topics using skillsEngine
  const topicReadinessList = useMemo(() => {
    return topics.map((top) => {
      const dom = domains.find((d) => d.id === top.domainId);
      const readiness = calculateTopicReadiness(
        top,
        dom,
        taskDefinitions,
        taskProgress,
        dsaProblems,
        dsaProgress,
        dsaAttempts,
        evidenceLogs,
        skillStates,
        companyOverlays,
        todayDate
      );
      const skillState = skillStates[top.id];
      const explanation = skillState
        ? explainSkillFreshness(skillState, todayDate)
        : {
            freshness: 'untested' as const,
            explanation: 'Untested because there is insufficient demonstrated evidence. No practice or assessment records found.',
            latestEvidence: {
              sourceType: 'none',
              timestamp: '',
              daysAgo: 0,
              details: 'No practice or assessment records found',
            },
            daysSinceLastPractice: undefined,
          };
      return {
        ...readiness,
        freshnessExplanation: explanation.explanation,
        latestEvidence: explanation.latestEvidence,
        daysSinceLastPractice: explanation.daysSinceLastPractice,
      };
    });
  }, [
    topics,
    domains,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    companyOverlays,
    todayDate,
  ]);

  // Aggregate domain readiness list
  const domainReadinessList = useMemo(() => {
    return calculateDomainReadinessList(domains, topics, topicReadinessList);
  }, [domains, topics, topicReadinessList]);

  // Overall Placement Readiness Score
  const overallPlacementReadiness = useMemo(() => {
    if (topicReadinessList.length === 0) return 0;
    const totalImportance = topicReadinessList.reduce((acc, t) => acc + t.importance, 0);
    const weightedSum = topicReadinessList.reduce(
      (acc, t) => acc + t.evidenceStrength * t.importance,
      0
    );
    return Math.round(weightedSum / Math.max(1, totalImportance));
  }, [topicReadinessList]);

  // Metric counts
  const readyCount = useMemo(
    () => topicReadinessList.filter((t) => t.readinessStatus === 'ready').length,
    [topicReadinessList]
  );
  const onTrackCount = useMemo(
    () => topicReadinessList.filter((t) => t.readinessStatus === 'on_track').length,
    [topicReadinessList]
  );
  const atRiskCount = useMemo(
    () => topicReadinessList.filter((t) => t.readinessStatus === 'at_risk' || t.freshness === 'stale').length,
    [topicReadinessList]
  );

  const totalEvidenceCount = useMemo(() => {
    return topicReadinessList.reduce((sum, tr) => sum + tr.supportingEvidence.length, 0);
  }, [topicReadinessList]);

  // Primary Gap Candidate Selection:
  // Deterministically selects the #1 highest priority topic:
  // 1. Topics with importance >= 7 and (at_risk OR stale OR lowest evidence strength)
  // 2. Fallback to lowest evidence strength overall
  const primaryGap = useMemo(() => {
    if (topicReadinessList.length === 0) return null;

    // Filter at-risk or stale high-importance topics first
    const criticalAtRisk = topicReadinessList
      .filter((t) => t.importance >= 7 && (t.readinessStatus === 'at_risk' || t.freshness === 'stale'))
      .sort((a, b) => b.importance - a.importance || a.evidenceStrength - b.evidenceStrength);

    if (criticalAtRisk.length > 0) return criticalAtRisk[0];

    // Otherwise find lowest readiness with highest importance
    const unmastered = topicReadinessList
      .filter((t) => t.readinessStatus !== 'ready')
      .sort((a, b) => b.importance - a.importance || a.evidenceStrength - b.evidenceStrength);

    if (unmastered.length > 0) return unmastered[0];

    return null;
  }, [topicReadinessList]);

  const [dismissedTargetId, setDismissedTargetId] = useState<string | null>(null);

  // Deep Link Handling: Pure derived state without setState in useEffect
  const activeDeepLinkReadiness = useMemo(() => {
    if (!routeState.targetId || routeState.targetId === dismissedTargetId) return null;
    return (
      topicReadinessList.find(
        (t) => t.topicId === routeState.targetId || t.domainId === routeState.targetId
      ) ?? null
    );
  }, [routeState.targetId, dismissedTargetId, topicReadinessList]);

  const effectiveSelectedReadiness = selectedReadiness ?? activeDeepLinkReadiness;
  const isDrawerOpen = isTraceabilityModalOpen || Boolean(activeDeepLinkReadiness);

  // Filtered topics for ledger
  const filteredReadinessList = useMemo(() => {
    return topicReadinessList.filter((tr) => {
      if (filterDomain !== 'all' && tr.domainId !== filterDomain) return false;
      if (filterStatus !== 'all' && tr.readinessStatus !== filterStatus) return false;
      if (filterFreshness !== 'all' && tr.freshness !== filterFreshness) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = tr.topicName.toLowerCase().includes(q);
        const matchDomain = tr.domainName.toLowerCase().includes(q);
        if (!matchName && !matchDomain) return false;
      }
      return true;
    });
  }, [topicReadinessList, filterDomain, filterStatus, filterFreshness, searchQuery]);

  const handleOpenTraceability = (tr: TopicReadiness) => {
    setSelectedReadiness(tr);
    setIsTraceabilityModalOpen(true);
  };

  const handleOpenOverride = (tr: TopicReadiness) => {
    const top = topics.find((t) => t.id === tr.topicId) || null;
    setSelectedTopic(top);
    setSelectedReadiness(tr);
    setIsOverrideModalOpen(true);
  };

  const handleExecuteAction = (tr: TopicReadiness) => {
    const destination = resolveTraceDestination(
      tr.recommendedAction.route,
      tr.recommendedAction.targetId,
      catalog
    );
    setRoute(destination.route, destination.targetId);
  };

  return (
    <div
      data-testid="skills-view"
      className="skills-view-container space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans text-foreground"
    >
      {/* Zone 1: Skills Header */}
      <SkillsHeader viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Zone 1: Proving Strip */}
      <SkillsProvingStrip
        overallPlacementReadiness={overallPlacementReadiness}
        readyCount={readyCount}
        totalTopicsCount={topics.length}
        onTrackCount={onTrackCount}
        atRiskCount={atRiskCount}
        totalEvidenceCount={totalEvidenceCount}
      />

      {/* Zone 2: Primary Skill Gap Focus Hero */}
      <PrimaryGapHero
        primaryGap={primaryGap}
        onExecuteAction={handleExecuteAction}
        onOpenTraceability={handleOpenTraceability}
      />

      {/* Zone 3: 11-Domain Competence Radar */}
      <DomainMatrixGrid
        domainReadinessList={domainReadinessList}
        selectedDomainId={filterDomain}
        onSelectDomain={(domId) => setFilterDomain(domId)}
      />

      {/* Zone 4: Topic Evidence Ledger */}
      {viewMode === 'matrix' && (
        <TopicEvidenceLedger
          topics={filteredReadinessList}
          domains={domains}
          filterDomain={filterDomain}
          onFilterDomainChange={setFilterDomain}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterFreshness={filterFreshness}
          onFilterFreshnessChange={setFilterFreshness}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onOpenTraceability={handleOpenTraceability}
          onOpenOverride={handleOpenOverride}
          onExecuteAction={handleExecuteAction}
        />
      )}

      {/* Zone 5: Traceability Drawer */}
      {effectiveSelectedReadiness && (
        <EvidenceTraceabilityModal
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsTraceabilityModalOpen(false);
            setSelectedReadiness(null);
            if (routeState.targetId) {
              setDismissedTargetId(routeState.targetId);
            }
          }}
          onOpenOverride={() => {
            const top = topics.find((t) => t.id === effectiveSelectedReadiness.topicId) || null;
            setSelectedTopic(top);
            setIsOverrideModalOpen(true);
          }}
          readiness={effectiveSelectedReadiness}
        />
      )}

      {/* Zone 5: Manual Override Modal */}
      {selectedTopic && (
        <SkillOverrideModal
          isOpen={isOverrideModalOpen}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setSelectedTopic(null);
          }}
          topic={selectedTopic}
          skillState={skillStates[selectedTopic.id]}
          onSubmitOverride={(updated) => {
            updateSkillState(updated);
            setIsOverrideModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
