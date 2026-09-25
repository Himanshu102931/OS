import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { isProblemUnlocked, calculatePatternMastery } from '../../engine/dsaEngine';
import { PATTERN_LESSONS } from '../../data/dsaDataset';
import {
  Filter,
  PlusCircle,
  History,
  Code2,
  Lock,
  CheckCircle2,
  BookOpen,
  Search,
  Sparkles,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Button } from '../ui/button';

export const DSAView: React.FC = () => {
  const { dsaProblems, dsaProgress, dsaAttempts, logDSAAttempt, updateDSAProgress, activePhase } =
    usePlacement();

  const [activeTab, setActiveTab] = useState<'bank' | 'patterns'>('bank');
  const [selectedProblemForAttempt, setSelectedProblemForAttempt] = useState<DSAProblem | null>(
    null
  );
  const [selectedProblemForWorkspace, setSelectedProblemForWorkspace] =
    useState<DSAProblem | null>(null);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState<boolean>(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterPattern, setFilterPattern] = useState<string>('all');
  const [showHistoryForId, setShowHistoryForId] = useState<string | null>(null);

  const currentPhaseIndex = activePhase ? activePhase.order : 1;
  const todayISO = new Date().toISOString().split('T')[0];

  const filteredProblems = dsaProblems.filter((p) => {
    const prog = dsaProgress[p.id];
    const unlockStatus = isProblemUnlocked(p, dsaProgress, currentPhaseIndex);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      const matchLC = String(p.leetcodeNumber).includes(q);
      const matchPattern = p.primaryPattern.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchLC && !matchPattern) return false;
    }

    // Difficulty filter
    if (filterDifficulty !== 'all' && p.difficulty !== filterDifficulty) return false;

    // Progression Tier filter
    if (filterTier !== 'all' && p.progressionTier !== filterTier) return false;

    // Pattern filter
    if (filterPattern !== 'all' && p.primaryPattern !== filterPattern) return false;

    // State filter
    if (filterState === 'actionable') {
      if (!unlockStatus.isUnlocked) return false;
    } else if (filterState === 'locked') {
      if (unlockStatus.isUnlocked) return false;
    } else if (filterState === 'review_due') {
      if (!prog || !prog.nextReviewAt || prog.nextReviewAt > todayISO) return false;
    } else if (filterState === 'remediation') {
      if (!prog?.remediationRequired) return false;
    } else if (filterState === 'passed_independent') {
      if (!prog?.passedIndependently) return false;
    } else if (filterState === 'assisted') {
      if (!prog?.assistedProvisional) return false;
    }

    return true;
  });

  const handleOpenAttempt = (prob: DSAProblem) => {
    setSelectedProblemForAttempt(prob);
    setIsAttemptModalOpen(true);
  };

  const handleOpenWorkspace = (prob: DSAProblem) => {
    setSelectedProblemForWorkspace(prob);
    setIsWorkspaceOpen(true);
  };

  const handleSubmitAttempt = (
    attempt: DSAAttempt,
    updatedProgress: DSAProgress,
    evidenceScore: number
  ) => {
    logDSAAttempt(attempt, updatedProgress, evidenceScore);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            PlacementOS — DSA Progression Engine
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Authoritative 150-Problem Catalog • Spaced Repetition (Boxes 1..4) • Pattern Mastery DAG
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#14171D] p-1 border border-[#262D38] rounded-[4px]">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'bank'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <Code2 className="size-3.5" /> DSA Bank ({dsaProblems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <Award className="size-3.5" /> Pattern Mastery ({PATTERN_LESSONS.length})
          </button>
        </div>
      </div>

      {activeTab === 'bank' ? (
        <>
          {/* Leitner System Rail */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="app-surface p-3 border-t-2 border-t-[#E5A93C]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#F1F5F9]">BOX 1</span>
                <span className="text-[10px] text-[#FFC665] bg-[#E5A93C]/10 border border-[#E5A93C]/30 px-1.5 py-0.2 rounded">
                  1 Day Interval
                </span>
              </div>
              <p className="text-[11px] text-[#8E98A8] mt-1">Daily review / New problems</p>
            </div>
            <div className="app-surface p-3 border-t-2 border-t-[#F59E0B]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#F1F5F9]">BOX 2</span>
                <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-1.5 py-0.2 rounded">
                  3 Days Interval
                </span>
              </div>
              <p className="text-[11px] text-[#8E98A8] mt-1">Short-term retention</p>
            </div>
            <div className="app-surface p-3 border-t-2 border-t-[#59E8AB]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#F1F5F9]">BOX 3</span>
                <span className="text-[10px] text-[#59E8AB] bg-[#59E8AB]/10 border border-[#59E8AB]/30 px-1.5 py-0.2 rounded">
                  7 Days Interval
                </span>
              </div>
              <p className="text-[11px] text-[#8E98A8] mt-1">Weekly review cadence</p>
            </div>
            <div className="app-surface p-3 border-t-2 border-t-[#10B981]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#F1F5F9]">BOX 4</span>
                <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-1.5 py-0.2 rounded">
                  14 Days Interval
                </span>
              </div>
              <p className="text-[11px] text-[#8E98A8] mt-1">Mastered algorithms</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-3.5 bg-[#14171D] border border-[#262D38] rounded-[4px] space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#8E98A8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search problem title, #number, or pattern..."
                  className="w-full bg-[#1B2028] text-[#F1F5F9] pl-8 pr-3 py-1.5 rounded-[4px] border border-[#262D38] focus:outline-none text-xs"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
                <Filter className="size-3.5 text-[#E5A93C]" />
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="bg-[#1B2028] text-[#F1F5F9] p-1.5 rounded-[4px] border border-[#262D38] focus:outline-none text-xs"
                >
                  <option value="all">All States</option>
                  <option value="actionable">Actionable / Unlocked</option>
                  <option value="locked">Locked</option>
                  <option value="review_due">Review Due</option>
                  <option value="remediation">Remediation Required</option>
                  <option value="passed_independent">Passed (Independent)</option>
                  <option value="assisted">Assisted / Provisional</option>
                </select>
              </div>

              {/* Tier Filter */}
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-[#1B2028] text-[#F1F5F9] p-1.5 rounded-[4px] border border-[#262D38] focus:outline-none text-xs"
              >
                <option value="all">All Tiers</option>
                <option value="starter">Starter</option>
                <option value="core">Core</option>
                <option value="challenge">Challenge</option>
              </select>

              {/* Difficulty Filter */}
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="bg-[#1B2028] text-[#F1F5F9] p-1.5 rounded-[4px] border border-[#262D38] focus:outline-none text-xs"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Pattern Filter */}
              <select
                value={filterPattern}
                onChange={(e) => setFilterPattern(e.target.value)}
                className="bg-[#1B2028] text-[#F1F5F9] p-1.5 rounded-[4px] border border-[#262D38] focus:outline-none text-xs max-w-[160px]"
              >
                <option value="all">All Patterns</option>
                {PATTERN_LESSONS.map((p) => (
                  <option key={p.id || p.patternId} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem Catalog Table */}
          <div className="app-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[#262D38] flex items-center justify-between text-xs font-semibold text-[#F1F5F9]">
              <span className="flex items-center gap-2 font-mono uppercase text-[#8E98A8]">
                <Code2 className="size-4 text-[#E5A93C]" /> Problem Catalog DAG ({filteredProblems.length} / {dsaProblems.length})
              </span>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028] border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
              <div className="col-span-4">Problem</div>
              <div className="col-span-3">Pattern & Tier</div>
              <div className="col-span-2">State / Box</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#262D38]">
              {filteredProblems.map((prob) => {
                const prog = dsaProgress[prob.id];
                const unlockStatus = isProblemUnlocked(prob, dsaProgress, currentPhaseIndex);
                const currentBox = prog?.currentBox || 1;
                const attempts = dsaAttempts.filter((a) => a.problemId === prob.id);
                const isShowingHistory = showHistoryForId === prob.id;

                return (
                  <div key={prob.id} className="app-table-row p-3.5 sm:px-4 sm:py-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-2.5 text-xs">
                      {/* Title & LC # */}
                      <div className="md:col-span-4 flex items-center gap-2">
                        {!unlockStatus.isUnlocked ? (
                          <span title={unlockStatus.reason}>
                            <Lock className="size-3.5 text-[#5C6675] shrink-0" />
                          </span>
                        ) : (
                          <Sparkles className="size-3.5 text-[#E5A93C] shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-[#F1F5F9]">
                            {prob.title}
                          </span>
                          <span className="text-[#8E98A8] ml-1.5 text-[11px]">
                            #{prob.leetcodeNumber}
                          </span>
                          {!unlockStatus.isUnlocked && (
                            <p className="text-[10px] text-[#F43F5E] italic mt-0.5">
                              {unlockStatus.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Pattern & Tier */}
                      <div className="md:col-span-3 text-[#8E98A8] text-[11px]">
                        <span className="text-[#C5CEDB] block font-medium truncate">{prob.primaryPattern}</span>
                        <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-[#1B2028] border border-[#262D38] text-[#8E98A8]">
                          {prob.progressionTier} • P{prob.recommendedPhase}
                        </span>
                      </div>

                      {/* State Badges & Leitner Box */}
                      <div className="md:col-span-2 flex items-center gap-1.5 flex-wrap">
                        {prog?.remediationRequired ? (
                          <span className="text-[10px] font-bold text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="size-3" /> Remediation
                          </span>
                        ) : prog?.passedIndependently ? (
                          <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Passed
                          </span>
                        ) : prog?.assistedProvisional ? (
                          <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-1.5 py-0.5 rounded">
                            Assisted
                          </span>
                        ) : unlockStatus.isUnlocked ? (
                          <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-1.5 py-0.5 rounded">
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#5C6675] bg-[#1B2028] border border-[#262D38] px-1.5 py-0.5 rounded">
                            Locked
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-[#FFC665]">Box {currentBox}</span>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-3 flex items-center justify-end gap-2">
                        {attempts.length > 0 && (
                          <button
                            onClick={() => setShowHistoryForId(isShowingHistory ? null : prob.id)}
                            className="text-[#8E98A8] hover:text-[#F1F5F9] p-1 rounded-[4px] hover:bg-[#1B2028]"
                            title="View Attempt History"
                          >
                            <History className="size-3.5" />
                          </button>
                        )}

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenWorkspace(prob)}
                          className="h-6 text-[10px] border-[#262D38] text-[#FFC665] hover:bg-[#E5A93C]/10"
                        >
                          <BookOpen className="size-3 mr-1" /> Lesson
                        </Button>

                        <Button
                          size="xs"
                          disabled={!unlockStatus.isUnlocked && !prog?.remediationRequired}
                          onClick={() => handleOpenAttempt(prob)}
                          className={`h-6 text-[10px] font-semibold rounded-[4px] ${
                            unlockStatus.isUnlocked || prog?.remediationRequired
                              ? 'bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00]'
                              : 'bg-[#1B2028] text-[#5C6675] cursor-not-allowed'
                          }`}
                        >
                          <PlusCircle className="size-3 mr-1" /> Log
                        </Button>
                      </div>
                    </div>

                    {/* Inline History Log */}
                    {isShowingHistory && (
                      <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-2 text-xs font-mono">
                        <div className="font-semibold text-[#FFC665] text-[11px] flex items-center gap-1.5">
                          <History className="size-3" /> Attempt History Log
                        </div>
                        <div className="space-y-1">
                          {attempts.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-2 rounded-[4px] bg-[#14171D] border border-[#262D38] text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`uppercase font-bold ${
                                    att.result === 'pass'
                                      ? 'text-[#10B981]'
                                      : att.result === 'partial'
                                      ? 'text-[#F59E0B]'
                                      : 'text-[#F43F5E]'
                                  }`}
                                >
                                  {att.result}
                                </span>
                                <span className="text-[#8E98A8]">· Assistance: {att.assistanceLevel}</span>
                              </div>
                              <span className="text-[#8E98A8]">{att.timeTakenMinutes}m · {att.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Pattern Progression Tab */
        <div className="space-y-4">
          <div className="p-4 bg-[#14171D] border border-[#262D38] rounded-[4px] space-y-1">
            <h3 className="text-sm font-bold text-[#F1F5F9] uppercase flex items-center gap-2">
              <Award className="size-4 text-[#E5A93C]" /> Pattern Mastery Matrix (17 Core Patterns)
            </h3>
            <p className="text-xs text-[#8E98A8]">
              Mastery requires: Independent Solves ≥ threshold + Best Mastery Ratio ≥ 60% + At least 1 problem in Leitner Box 3/4 with no active remediation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PATTERN_LESSONS.map((pattern) => {
              const mastery = calculatePatternMastery(pattern.name, dsaProblems, dsaProgress);

              return (
                <div
                  key={pattern.id || pattern.patternId}
                  className="p-4 rounded-[4px] bg-[#14171D] border border-[#262D38] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-[#E5A93C] uppercase font-bold tracking-wider">
                        {pattern.id || pattern.patternId}
                      </span>
                      <h4 className="text-sm font-bold text-[#F1F5F9]">{pattern.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-[4px] border ${
                        mastery.state === 'mastered'
                          ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                          : mastery.state === 'in_progress'
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                          : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                      }`}
                    >
                      {mastery.state.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#8E98A8] line-clamp-2">{pattern.overview}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#262D38]">
                    <div>
                      <span className="text-[#8E98A8] block">Independent Solves:</span>
                      <strong className="text-[#F1F5F9]">
                        {mastery.independentSolves} / {mastery.requiredIndependentSolves} required
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8E98A8] block">Mastery Evidence Ratio:</span>
                      <strong className="text-[#FFC665]">{mastery.masteryRatio}%</strong>
                    </div>
                    <div>
                      <span className="text-[#8E98A8] block">Retention Threshold:</span>
                      <strong className={mastery.hasBox3Or4 ? 'text-[#10B981]' : 'text-[#8E98A8]'}>
                        {mastery.hasBox3Or4 ? 'Box 3/4 Reached' : 'Pending Box 3+'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8E98A8] block">Pattern Problems:</span>
                      <strong className="text-[#F1F5F9]">{mastery.totalProblems} Catalog Entries</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attempt Modal */}
      <DSAAttemptModal
        problem={selectedProblemForAttempt}
        progress={selectedProblemForAttempt ? dsaProgress[selectedProblemForAttempt.id] : undefined}
        isOpen={isAttemptModalOpen}
        onClose={() => setIsAttemptModalOpen(false)}
        onSubmitAttempt={handleSubmitAttempt}
      />

      {/* Learning Workspace Drawer */}
      <TaskLearningWorkspaceDrawer
        dsaProblem={selectedProblemForWorkspace}
        dsaProgress={
          selectedProblemForWorkspace ? dsaProgress[selectedProblemForWorkspace.id] : undefined
        }
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onUpdateDSAProgress={updateDSAProgress}
        onOpenAttemptModal={handleOpenAttempt}
      />
    </div>
  );
};
