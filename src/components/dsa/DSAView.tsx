import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { isProblemUnlocked } from '../../engine/dsaEngine';
import { PATTERN_LESSONS } from '../../data/dsaDataset';
import {
  Code2,
  BookOpen,
  Search,
  Sparkles,
  Award,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';

export const DSAView: React.FC = () => {
  const { dsaProblems, dsaProgress, logDSAAttempt, activePhase } =
    usePlacement();

  const [activeTab, setActiveTab] = useState<'journey' | 'bank' | 'patterns'>('journey');
  const [selectedProblemForAttempt, setSelectedProblemForAttempt] = useState<DSAProblem | null>(
    null
  );
  const [selectedProblemForWorkspace, setSelectedProblemForWorkspace] =
    useState<DSAProblem | null>(null);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState<boolean>(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const currentPhaseIndex = activePhase ? activePhase.order : 1;
  const todayISO = new Date().toISOString().split('T')[0];

  // Helper for status
  const getProblemStatus = (p: DSAProblem) => {
    const prog = dsaProgress[p.id];
    const unlockStatus = isProblemUnlocked(p, dsaProgress, currentPhaseIndex);

    if (!unlockStatus.isUnlocked) {
      return { label: 'Locked', color: 'bg-[#1B2028] text-[#5C6675] border-[#262D38]', isLocked: true };
    }
    if (prog?.passedIndependently) {
      return { label: 'Mastered', color: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30', isLocked: false };
    }
    if (prog?.nextReviewAt && prog.nextReviewAt <= todayISO) {
      return { label: 'Review Due', color: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30', isLocked: false };
    }
    if (prog?.assistedProvisional) {
      return { label: 'Assisted', color: 'bg-[#E5A93C]/10 text-[#FFC665] border-[#E5A93C]/30', isLocked: false };
    }
    return { label: 'Unlocked', color: 'bg-[#14171D] text-[#8E98A8] border-[#262D38]', isLocked: false };
  };

  // Recommended next problem
  const recommendedProblem = dsaProblems.find((p) => {
    const status = getProblemStatus(p);
    return !status.isLocked && !dsaProgress[p.id]?.passedIndependently;
  }) || dsaProblems[0];

  // Reviews due today
  const reviewsDue = dsaProblems.filter((p) => {
    const prog = dsaProgress[p.id];
    return prog?.nextReviewAt && prog.nextReviewAt <= todayISO;
  });

  // Filtered problems list
  const filteredProblems = dsaProblems.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchPattern = p.primaryPattern.toLowerCase().includes(q);
      const matchLC = String(p.leetcodeNumber).includes(q);
      if (!matchTitle && !matchPattern && !matchLC) return false;
    }

    if (filterDifficulty !== 'all' && p.difficulty !== filterDifficulty) return false;

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
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            DSA Progression Engine
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Curated 150-problem journey • Pattern Mastery DAG • Leitner Spaced Repetition
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#14171D] p-1 border border-[#262D38] rounded-lg">
          <button
            onClick={() => setActiveTab('journey')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'journey'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <Sparkles className="size-3.5" /> Progression Journey
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'bank'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <Code2 className="size-3.5" /> Full Catalog ({dsaProblems.length})
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'bg-[#E5A93C] text-[#432C00]'
                : 'text-[#8E98A8] hover:text-[#F1F5F9]'
            }`}
          >
            <Award className="size-3.5" /> Patterns ({PATTERN_LESSONS.length})
          </button>
        </div>
      </div>

      {/* 1. PROGRESSION JOURNEY VIEW */}
      {activeTab === 'journey' && (
        <div className="space-y-6">
          {/* Recommended Problem Hero Card */}
          {recommendedProblem && (
            <div className="bg-gradient-to-br from-[#1B2028] to-[#14171D] p-6 border border-[#E5A93C]/40 rounded-xl space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/15 text-xs font-bold text-[#FFC665]">
                  <Zap className="size-3.5 text-[#E5A93C]" /> RECOMMENDED PROBLEM
                </span>
                <span className="text-xs text-[#8E98A8] font-mono">
                  LC #{recommendedProblem.leetcodeNumber}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9]">{recommendedProblem.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#8E98A8]">
                  <span className="text-[#FFC665] font-medium">{recommendedProblem.primaryPattern}</span>
                  <span>·</span>
                  <span className="capitalize">{recommendedProblem.difficulty}</span>
                  <span>·</span>
                  <span>~{recommendedProblem.estimatedTimeMinutes} mins</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#262D38] flex items-center justify-between">
                <button
                  onClick={() => handleOpenWorkspace(recommendedProblem)}
                  className="text-xs text-[#8E98A8] hover:text-[#F1F5F9] font-medium flex items-center gap-1.5"
                >
                  <BookOpen className="size-3.5 text-[#E5A93C]" /> Open Workspace
                </button>

                <Button
                  size="sm"
                  onClick={() => handleOpenAttempt(recommendedProblem)}
                  className="h-9 px-4 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md shadow-sm"
                >
                  <Play className="size-3.5 mr-1.5" /> Log Attempt
                </Button>
              </div>
            </div>
          )}

          {/* Reviews Due Section */}
          {reviewsDue.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
                <RotateCcw className="size-4 text-[#F59E0B]" />
                Spaced Reviews Due Today ({reviewsDue.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewsDue.map((prob) => (
                  <div
                    key={prob.id}
                    className="bg-[#14171D] border border-[#262D38] rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-[#F1F5F9]">{prob.title}</h4>
                      <p className="text-[11px] text-[#8E98A8] mt-0.5">{prob.primaryPattern}</p>
                    </div>
                    <Button
                      size="xs"
                      onClick={() => handleOpenAttempt(prob)}
                      className="h-7 text-xs bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/40 rounded-md font-semibold"
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unlocked Active Progression Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">
              Active Problem Track ({filteredProblems.slice(0, 6).length} available)
            </h3>
            <div className="space-y-2">
              {filteredProblems.slice(0, 8).map((prob) => {
                const status = getProblemStatus(prob);
                return (
                  <div
                    key={prob.id}
                    className="p-3.5 bg-[#14171D] hover:bg-[#1B2028]/60 border border-[#262D38] rounded-lg flex items-center justify-between transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F1F5F9]">{prob.title}</span>
                        <span className="text-[10px] text-[#8E98A8] font-mono">#{prob.leetcodeNumber}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded border font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#8E98A8]">
                        <span className="text-[#FFC665]">{prob.primaryPattern}</span>
                        <span>·</span>
                        <span className="capitalize">{prob.difficulty}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenWorkspace(prob)}
                        className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
                      >
                        Workspace
                      </Button>
                      {!status.isLocked && (
                        <Button
                          size="xs"
                          onClick={() => handleOpenAttempt(prob)}
                          className="h-7 text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md font-semibold"
                        >
                          Attempt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL CATALOG VIEW */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          {/* Search & Filter controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171D] p-3 border border-[#262D38] rounded-lg">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-3.5 text-[#8E98A8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search problem title, pattern, or LeetCode #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1B2028] border border-[#262D38] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#5C6675] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="bg-[#1B2028] border border-[#262D38] rounded-md px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Problem List */}
          <div className="space-y-2">
            {filteredProblems.map((prob) => {
              const status = getProblemStatus(prob);
              return (
                <div
                  key={prob.id || prob.title}
                  className="p-3 bg-[#14171D] hover:bg-[#1B2028]/60 border border-[#262D38] rounded-lg flex items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F1F5F9]">{prob.title}</span>
                      <span className="text-[10px] text-[#8E98A8] font-mono">#{prob.leetcodeNumber}</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E98A8]">
                      <span className="text-[#FFC665] font-medium">{prob.primaryPattern}</span> · <span className="capitalize">{prob.difficulty}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleOpenWorkspace(prob)}
                      className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#F1F5F9] rounded-md"
                    >
                      Inspect
                    </Button>
                    {!status.isLocked && (
                      <Button
                        size="xs"
                        onClick={() => handleOpenAttempt(prob)}
                        className="h-7 text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md font-semibold"
                      >
                        Log Attempt
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PATTERNS VIEW */}
      {activeTab === 'patterns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PATTERN_LESSONS.map((pat) => (
            <div key={pat.patternId} className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-3">
              <div>
                <h3 className="text-base font-bold text-[#F1F5F9]">{pat.name}</h3>
                <p className="text-xs text-[#8E98A8] mt-1 leading-relaxed">{pat.overview}</p>
              </div>

              <div className="pt-3 border-t border-[#262D38] space-y-1.5 text-xs text-[#8E98A8]">
                <div><strong className="text-[#F1F5F9]">Why It Matters:</strong> {pat.whyItMatters}</div>
                <div><strong className="text-[#FFC665]">Expected Complexity:</strong> <span className="font-mono">{pat.expectedTimeComplexity}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals & Drawers */}
      {selectedProblemForAttempt && (
        <DSAAttemptModal
          problem={selectedProblemForAttempt}
          progress={dsaProgress[selectedProblemForAttempt.id]}
          isOpen={isAttemptModalOpen}
          onClose={() => {
            setIsAttemptModalOpen(false);
            setSelectedProblemForAttempt(null);
          }}
          onSubmitAttempt={handleSubmitAttempt}
        />
      )}

      <TaskLearningWorkspaceDrawer
        dsaProblem={selectedProblemForWorkspace || undefined}
        dsaProgress={selectedProblemForWorkspace ? dsaProgress[selectedProblemForWorkspace.id] : undefined}
        isOpen={isWorkspaceOpen}
        onClose={() => {
          setIsWorkspaceOpen(false);
          setSelectedProblemForWorkspace(null);
        }}
      />
    </div>
  );
};
