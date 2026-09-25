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
import type { TopicSkillState, Topic } from '../../types';
import {
  Filter,
  SlidersHorizontal,
  Search,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Info,
  ArrowRight,
  Sparkles,
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
    setRoute,
  } = usePlacement();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedReadiness, setSelectedReadiness] = useState<TopicReadiness | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);

  // Filters & Views
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvidenceType, setFilterEvidenceType] = useState<string>('all');
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
  const baselineNeededCount = useMemo(
    () => topicReadinessList.filter((t) => t.readinessStatus === 'needs_baseline').length,
    [topicReadinessList]
  );

  // Filtered topics
  const filteredReadinessList = useMemo(() => {
    return topicReadinessList.filter((tr) => {
      if (filterDomain !== 'all' && tr.domainId !== filterDomain) return false;
      if (filterStatus !== 'all' && tr.readinessStatus !== filterStatus) return false;
      if (filterEvidenceType !== 'all' && tr.evidenceClassification !== filterEvidenceType)
        return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = tr.topicName.toLowerCase().includes(q);
        const matchDomain = tr.domainName.toLowerCase().includes(q);
        if (!matchName && !matchDomain) return false;
      }
      return true;
    });
  }, [topicReadinessList, filterDomain, filterStatus, filterEvidenceType, searchQuery]);

  const handleOpenTraceability = (tr: TopicReadiness) => {
    setSelectedReadiness(tr);
    const top = topics.find((t) => t.id === tr.topicId) || null;
    setSelectedTopic(top);
    setIsTraceabilityModalOpen(true);
  };

  const handleOpenOverride = (tr: TopicReadiness) => {
    const top = topics.find((t) => t.id === tr.topicId) || null;
    setSelectedTopic(top);
    setSelectedReadiness(tr);
    setIsOverrideModalOpen(true);
  };

  const handleSubmitOverride = (updated: TopicSkillState) => {
    updateSkillState(updated);
  };

  const handleExecuteAction = (tr: TopicReadiness) => {
    if (tr.recommendedAction.route === 'dsa') {
      setRoute('dsa');
    } else if (tr.recommendedAction.route === 'roadmap') {
      setRoute('roadmap');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2 font-mono">
            <Sparkles className="size-5 text-[#FFC665]" />
            Skills Matrix & Readiness Assessment
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Evidence-based readiness tracking across all 11 placement domains & skill areas
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#14171D] p-1 border border-[#262D38] rounded-[4px]">
          <Button
            size="xs"
            variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('matrix')}
            className={`text-xs font-mono rounded-[4px] ${
              viewMode === 'matrix' ? 'bg-[#1B2028] text-[#F1F5F9]' : 'text-[#8E98A8]'
            }`}
          >
            <List className="size-3.5 mr-1" /> Matrix View
          </Button>
          <Button
            size="xs"
            variant={viewMode === 'domains' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('domains')}
            className={`text-xs font-mono rounded-[4px] ${
              viewMode === 'domains' ? 'bg-[#1B2028] text-[#F1F5F9]' : 'text-[#8E98A8]'
            }`}
          >
            <LayoutGrid className="size-3.5 mr-1" /> Domain View
          </Button>
        </div>
      </div>

      {/* High-Level Overall Readiness Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#14171D] border border-[#262D38] rounded-[4px] font-mono text-xs shadow-md">
        <div className="col-span-2 sm:col-span-1 p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex flex-col justify-between">
          <span className="text-[#8E98A8] text-[11px] block uppercase font-bold tracking-wider">Overall Placement Readiness</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#FFC665]">{overallPlacementReadiness}%</span>
            <span className="text-[10px] text-[#8E98A8]">Weighted</span>
          </div>
        </div>

        <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
          <span className="text-[#4EAE79] font-semibold flex items-center gap-1 text-[11px]">
            <ShieldCheck className="size-3.5" /> Placement Ready
          </span>
          <span className="text-xl font-bold text-[#F1F5F9]">{readyCount}</span>
          <span className="text-[10px] text-[#8E98A8] block">Target Level Met</span>
        </div>

        <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
          <span className="text-[#FFC665] font-semibold flex items-center gap-1 text-[11px]">
            <TrendingUp className="size-3.5" /> On Track
          </span>
          <span className="text-xl font-bold text-[#F1F5F9]">{onTrackCount}</span>
          <span className="text-[10px] text-[#8E98A8] block">Making Progress</span>
        </div>

        <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
          <span className="text-[#E55353] font-semibold flex items-center gap-1 text-[11px]">
            <AlertTriangle className="size-3.5" /> At Risk / Aging
          </span>
          <span className="text-xl font-bold text-[#F1F5F9]">{atRiskCount}</span>
          <span className="text-[10px] text-[#8E98A8] block">Review Required</span>
        </div>

        <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
          <span className="text-[#8E98A8] font-semibold flex items-center gap-1 text-[11px]">
            <HelpCircle className="size-3.5" /> Baseline Needed
          </span>
          <span className="text-xl font-bold text-[#F1F5F9]">{baselineNeededCount}</span>
          <span className="text-[10px] text-[#8E98A8] block">No Evidence Yet</span>
        </div>
      </div>

      {/* Domain Summary Cards View (when active or toggled) */}
      {viewMode === 'domains' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-[#F1F5F9] uppercase tracking-wider">
              11 Placement Domains Overview
            </h2>
            <span className="text-xs text-[#8E98A8] font-mono">
              Click any domain card to filter table below
            </span>
          </div>
          <DomainSummaryCards
            domainReadinessList={domainReadinessList}
            selectedDomainId={filterDomain}
            onSelectDomain={(id) => setFilterDomain(id)}
          />
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#14171D] p-3 border border-[#262D38] rounded-[4px] text-xs font-mono">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8E98A8]" />
          <input
            type="text"
            placeholder="Search skill or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] text-[#F1F5F9] placeholder-[#8E98A8] focus:outline-none focus:border-[#3B4556]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Filter */}
          <div className="flex items-center gap-1 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1.5">
            <Filter className="size-3 text-[#FFC665]" />
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="bg-transparent text-[#F1F5F9] focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className="bg-[#14171D]">All 11 Domains</option>
              {domains.map((dom) => (
                <option key={dom.id} value={dom.id} className="bg-[#14171D]">
                  {dom.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Readiness Status Filter */}
          <div className="flex items-center gap-1 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1.5">
            <span className="text-[#8E98A8]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[#F1F5F9] focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className="bg-[#14171D]">All Statuses</option>
              <option value="ready" className="bg-[#14171D]">Placement Ready</option>
              <option value="on_track" className="bg-[#14171D]">On Track</option>
              <option value="at_risk" className="bg-[#14171D]">At Risk / Aging</option>
              <option value="needs_baseline" className="bg-[#14171D]">Needs Baseline</option>
            </select>
          </div>

          {/* Evidence Type Filter */}
          <div className="flex items-center gap-1 bg-[#1B2028] border border-[#262D38] rounded-[4px] px-2.5 py-1.5">
            <span className="text-[#8E98A8]">Evidence:</span>
            <select
              value={filterEvidenceType}
              onChange={(e) => setFilterEvidenceType(e.target.value)}
              className="bg-transparent text-[#F1F5F9] focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className="bg-[#14171D]">All Evidence Types</option>
              <option value="demonstrated" className="bg-[#14171D]">Demonstrated</option>
              <option value="inferred" className="bg-[#14171D]">Inferred</option>
              <option value="insufficient" className="bg-[#14171D]">Insufficient</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Skills Matrix Table */}
      <div className="app-surface overflow-hidden">
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028] border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
          <div className="col-span-3">Topic / Skill Area</div>
          <div className="col-span-2">Domain</div>
          <div className="col-span-2">Evidence & Level</div>
          <div className="col-span-2">Evidence Type</div>
          <div className="col-span-2">Readiness Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rows */}
        {filteredReadinessList.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#8E98A8] space-y-2">
            <HelpCircle className="size-6 mx-auto text-[#FFC665]" />
            <p>No skills or topics match the selected search & filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#262D38]">
            {filteredReadinessList.map((tr) => {
              return (
                <div
                  key={tr.topicId}
                  className="app-table-row p-4 space-y-3 lg:space-y-0 text-xs font-mono hover:bg-[#1B2028]/70 transition-colors"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
                    {/* Topic / Skill Name & Importance */}
                    <div className="lg:col-span-3 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F1F5F9] text-sm">{tr.topicName}</span>
                        <span className="text-[#FFC665] text-[11px] font-semibold">({tr.importance}/10)</span>
                      </div>
                      <span className="text-[#8E98A8] text-[11px] block">
                        {tr.dsaEvidenceCount.total > 0
                          ? `${tr.dsaEvidenceCount.mastered} Mastered DSA`
                          : `${tr.taskEvidenceCount.completed}/${tr.taskEvidenceCount.total} Tasks Completed`}
                      </span>
                    </div>

                    {/* Domain Name */}
                    <div className="lg:col-span-2 text-[#FFC665] font-semibold">
                      {tr.domainName}
                    </div>

                    {/* Evidence Strength & Level Progress */}
                    <div className="lg:col-span-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#F1F5F9]">{tr.evidenceStrength}%</span>
                        <span className="text-[11px] text-[#FFC665] font-bold">
                          L{tr.currentLevel} / <span className="text-[#8E98A8]">L{tr.targetLevel}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#14171D] rounded-full overflow-hidden border border-[#262D38]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            tr.evidenceStrength >= 75
                              ? 'bg-[#4EAE79]'
                              : tr.evidenceStrength >= 50
                              ? 'bg-[#FFC665]'
                              : 'bg-[#E55353]'
                          }`}
                          style={{ width: `${Math.max(4, tr.evidenceStrength)}%` }}
                        />
                      </div>
                    </div>

                    {/* Evidence Type */}
                    <div className="lg:col-span-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-[4px] font-semibold capitalize ${
                          tr.evidenceClassification === 'demonstrated'
                            ? 'bg-[#4EAE79]/15 text-[#4EAE79] border border-[#4EAE79]/30'
                            : tr.evidenceClassification === 'inferred'
                            ? 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30'
                            : 'bg-[#1B2028] text-[#8E98A8] border border-[#262D38]'
                        }`}
                      >
                        {tr.evidenceClassification}
                      </span>
                    </div>

                    {/* Readiness Status */}
                    <div className="lg:col-span-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-[4px] font-semibold uppercase flex items-center gap-1 ${
                          tr.readinessStatus === 'ready'
                            ? 'bg-[#4EAE79]/15 text-[#4EAE79] border border-[#4EAE79]/30'
                            : tr.readinessStatus === 'on_track'
                            ? 'bg-[#FFC665]/15 text-[#FFC665] border border-[#FFC665]/30'
                            : tr.readinessStatus === 'at_risk'
                            ? 'bg-[#E55353]/15 text-[#E55353] border border-[#E55353]/30'
                            : 'bg-[#1B2028] text-[#8E98A8] border border-[#262D38]'
                        }`}
                      >
                        {tr.readinessStatus.replace('_', ' ')}
                      </span>

                      {tr.freshness === 'stale' && (
                        <span className="text-[9px] text-[#E55353] font-bold px-1.5 py-0.5 rounded bg-[#E55353]/10">
                          STALE
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="lg:col-span-1 flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleOpenTraceability(tr)}
                        className="h-7 px-2 text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
                        title="Inspect Evidence (What caused this?)"
                      >
                        <Info className="size-3.5 text-[#FFC665]" />
                      </Button>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleOpenOverride(tr)}
                        className="h-7 px-2 text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
                        title="Manual Rating Override"
                      >
                        <SlidersHorizontal className="size-3.5" />
                      </Button>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleExecuteAction(tr)}
                        className="h-7 px-2 text-[#E5A93C] hover:text-[#FFC665] hover:bg-[#E5A93C]/10"
                        title={tr.recommendedAction.label}
                      >
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <EvidenceTraceabilityModal
        readiness={selectedReadiness}
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
        onOpenOverride={() => selectedReadiness && handleOpenOverride(selectedReadiness)}
      />

      <SkillOverrideModal
        topic={selectedTopic}
        skillState={selectedTopic ? skillStates[selectedTopic.id] : undefined}
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onSubmitOverride={handleSubmitOverride}
      />
    </div>
  );
};
