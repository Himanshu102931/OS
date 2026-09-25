import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  calculateTopicReadiness,
  calculateDomainReadinessList,
  type TopicReadiness,
} from '../../engine/skillsEngine';
import { SkillOverrideModal } from './SkillOverrideModal';
import { EvidenceTraceabilityModal } from './EvidenceTraceabilityModal';
import { DomainSummaryCards } from './DomainSummaryCards';
import type { Topic } from '../../types';
import {
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '../ui/button';

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
  } = usePlacement();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedReadiness, setSelectedReadiness] = useState<TopicReadiness | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);

  // Filters & Views
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'matrix' | 'domains'>('matrix');

  // Compute live readiness for all topics using skillsEngine
  const topicReadinessList = useMemo(() => {
    return topics.map((top) => {
      const dom = domains.find((d) => d.id === top.domainId);
      return calculateTopicReadiness(
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
    () => topicReadinessList.filter((t) => t.readinessStatus === 'at_risk').length,
    [topicReadinessList]
  );

  // Filtered topics
  const filteredReadinessList = useMemo(() => {
    return topicReadinessList.filter((tr) => {
      if (filterDomain !== 'all' && tr.domainId !== filterDomain) return false;
      if (filterStatus !== 'all' && tr.readinessStatus !== filterStatus) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = tr.topicName.toLowerCase().includes(q);
        const matchDomain = tr.domainName.toLowerCase().includes(q);
        if (!matchName && !matchDomain) return false;
      }
      return true;
    });
  }, [topicReadinessList, filterDomain, filterStatus, searchQuery]);

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Skills Matrix & Evidence Readiness
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Authoritative topic evidence strength calculated from completed tasks, DSA attempts, and freshness decay.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#14171D] p-1 border border-[#262D38] rounded-lg">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'matrix'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <List className="size-3.5" /> Topics Matrix
          </button>
          <button
            onClick={() => setViewMode('domains')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'domains'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <LayoutGrid className="size-3.5" /> Domains Breakdown
          </button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#E5A93C] uppercase tracking-wider">
              Overall Placement Readiness
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-[#F1F5F9]">{overallPlacementReadiness}%</span>
              <span className="text-xs text-[#8E98A8]">weighted evidence confidence score</span>
            </div>
          </div>

          {/* Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-medium">
              Ready: <strong>{readyCount}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-[#FFC665] font-medium">
              On Track: <strong>{onTrackCount}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] font-medium">
              At Risk: <strong>{atRiskCount}</strong>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#0D0F12] rounded-full h-2 overflow-hidden border border-[#262D38]">
          <div
            className="bg-[#E5A93C] h-full transition-all duration-500 rounded-full"
            style={{ width: `${overallPlacementReadiness}%` }}
          />
        </div>
      </div>

      {viewMode === 'domains' ? (
        <DomainSummaryCards
          domainReadinessList={domainReadinessList}
          selectedDomainId={filterDomain}
          onSelectDomain={(domId) => {
            setFilterDomain(domId);
            setViewMode('matrix');
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171D] p-3 border border-[#262D38] rounded-lg">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-3.5 text-[#8E98A8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search topic or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1B2028] border border-[#262D38] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#5C6675] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="bg-[#1B2028] border border-[#262D38] rounded-md px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none"
              >
                <option value="all">All Domains ({domains.length})</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1B2028] border border-[#262D38] rounded-md px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="needs_baseline">Needs Baseline</option>
              </select>
            </div>
          </div>

          {/* Topics List */}
          <div className="space-y-2">
            {filteredReadinessList.map((tr) => {
              const statusColor =
                tr.readinessStatus === 'ready'
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                  : tr.readinessStatus === 'on_track'
                  ? 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30'
                  : tr.readinessStatus === 'at_risk'
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                  : 'bg-[#14171D] text-[#8E98A8] border-[#262D38]';

              return (
                <div
                  key={tr.topicId}
                  className="p-3.5 bg-[#14171D] hover:bg-[#1B2028]/60 border border-[#262D38] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F1F5F9]">{tr.topicName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded border text-[#FFC665] bg-[#1B2028]">
                        {tr.domainName}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border capitalize font-medium ${statusColor}`}>
                        {tr.readinessStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E98A8]">
                      Evidence Confidence: <strong className="text-[#F1F5F9]">{tr.evidenceStrength}%</strong> · Freshness: <span className="capitalize">{tr.freshness}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleOpenTraceability(tr)}
                      className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
                    >
                      Traceability
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => handleOpenOverride(tr)}
                      className="h-7 text-xs bg-[#1B2028] hover:bg-[#222833] text-[#FFC665] border border-[#E5A93C]/40 rounded-md"
                    >
                      Override
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Traceability Modal */}
      {selectedReadiness && (
        <EvidenceTraceabilityModal
          isOpen={isTraceabilityModalOpen}
          onClose={() => {
            setIsTraceabilityModalOpen(false);
            setSelectedReadiness(null);
          }}
          readiness={selectedReadiness}
        />
      )}

      {/* Override Modal */}
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
