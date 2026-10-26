import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { useSession } from '../dashboard/SessionContext';
import { DSAAttemptModal } from './DSAAttemptModal';
import { TaskLearningWorkspaceDrawer } from '../common/TaskLearningWorkspaceDrawer';
import { DSAHeader } from './DSAHeader';
import { DSAMasteryStrip } from './DSAMasteryStrip';
import { DSAActiveFocus } from './DSAActiveFocus';
import { DSAReviewQueue } from './DSAReviewQueue';
import { DSAPatternMatrix } from './DSAPatternMatrix';
import { DSAProblemWorkbench } from './DSAProblemWorkbench';
import { DSAAlgorithmTrace } from './DSAAlgorithmTrace';
import { DSAChallengeWorkspace } from './DSAChallengeWorkspace';
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { getDSASignals } from '../../engine/dsaEngine';
import { Layers, Sparkles } from 'lucide-react';

function useSafeSession() {
  try {
    return useSession();
  } catch {
    return null;
  }
}

export const DSAView: React.FC = () => {
  const {
    dsaProblems,
    dsaProgress,
    logDSAAttempt,
    activePhase,
    updateDSAProgress,
    todayDate,
    routeState,
    setRoute,
  } = usePlacement();
  const session = useSafeSession();

  const [viewMode, setViewMode] = useState<'catalog' | 'challenge'>('catalog');
  const [dismissedTargetId, setDismissedTargetId] = useState<string | null>(null);
  const [selectedProblemForAttempt, setSelectedProblemForAttempt] = useState<DSAProblem | null>(
    null
  );
  const [selectedProblemForWorkspace, setSelectedProblemForWorkspace] =
    useState<DSAProblem | null>(null);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState<boolean>(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);

  // Unified Filter State (Zones 4 & 5)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const isChallengeView = routeState.targetId === 'challenge' || viewMode === 'challenge';

  // Derive deep-linked problem directly from canonical route state
  const isDeepLinked =
    routeState.route === 'dsa' &&
    Boolean(routeState.targetId) &&
    routeState.targetId !== 'challenge' &&
    routeState.targetId !== dismissedTargetId;

  const deepLinkedProblem = isDeepLinked
    ? dsaProblems.find((p) => p.id === routeState.targetId) ?? null
    : null;

  const isDeepLinkedRemediation = Boolean(
    deepLinkedProblem && dsaProgress[deepLinkedProblem.id]?.remediationRequired
  );

  const effectiveAttemptProblem =
    selectedProblemForAttempt ?? (deepLinkedProblem && !isDeepLinkedRemediation ? deepLinkedProblem : null);
  const isAttemptVisible = isAttemptModalOpen || Boolean(deepLinkedProblem && !isDeepLinkedRemediation);

  const effectiveWorkspaceProblem =
    selectedProblemForWorkspace ?? (deepLinkedProblem && isDeepLinkedRemediation ? deepLinkedProblem : null);
  const isWorkspaceVisible = isWorkspaceOpen || Boolean(deepLinkedProblem && isDeepLinkedRemediation);

  const currentPhaseIndex = activePhase ? activePhase.order : 1;

  // Mastered count for header
  const totalMasteredCount = useMemo(() => {
    return dsaProblems.filter((p) => dsaProgress[p.id]?.passedIndependently).length;
  }, [dsaProblems, dsaProgress]);

  // Canonical DSA Signals for Active Focus
  const dsaSignals = useMemo(() => {
    return getDSASignals(dsaProblems, dsaProgress, currentPhaseIndex, todayDate);
  }, [dsaProblems, dsaProgress, currentPhaseIndex, todayDate]);

  const activeFocusSignal = dsaSignals.length > 0 ? dsaSignals[0] : null;

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
    if (deepLinkedProblem) {
      setDismissedTargetId(routeState.targetId ?? null);
      session?.advanceActivity('completed');
      setRoute('dashboard');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
      {/* ZONE 1: DSA Header */}
      <DSAHeader
        totalProblemsCount={dsaProblems.length}
        masteredCount={totalMasteredCount}
      />

      {/* Track View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode('catalog');
              if (routeState.targetId === 'challenge') {
                setRoute('dsa');
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              !isChallengeView
                ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] shadow-sm ring-1 ring-white/10'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-[var(--accent)]" />
            <span>150-Problem Catalog</span>
          </button>

          <button
            onClick={() => setViewMode('challenge')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              isChallengeView
                ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--accent)]/40 shadow-sm ring-1 ring-[var(--accent)]/20'
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>8-Day DSA Challenge</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
              Teacher Series
            </span>
          </button>
        </div>

        <div className="text-xs text-[var(--foreground-subtle)] font-mono hidden sm:block pr-2">
          {isChallengeView ? '8 Modules · 80 Scaffolds & Problems' : 'Leitner 4-Box · Curated Progression'}
        </div>
      </div>

      {isChallengeView ? (
        <DSAChallengeWorkspace
          onOpenCanonicalAttempt={(problemId) => {
            const prob = dsaProblems.find((p) => p.id === problemId);
            if (prob) handleOpenAttempt(prob);
          }}
        />
      ) : (
        <>
          <DSAMasteryStrip
            problems={dsaProblems}
            progressMap={dsaProgress}
            todayDate={todayDate}
          />

          {/* SIGNATURE MOTION: Algorithmic Problem Laboratory Flow Trace */}
          <DSAAlgorithmTrace
            activeSignal={activeFocusSignal}
            hasRemediation={Boolean(dsaProblems.some((p) => dsaProgress[p.id]?.remediationRequired))}
          />

          {/* ZONE 2: Active Focus / Dominant Next Mission */}
          <DSAActiveFocus
            activeSignal={activeFocusSignal}
            onOpenAttempt={handleOpenAttempt}
            onOpenWorkspace={handleOpenWorkspace}
          />

          {/* ZONE 3: Spaced Review Queue */}
          <DSAReviewQueue
            problems={dsaProblems}
            progressMap={dsaProgress}
            todayDate={todayDate}
            onOpenAttempt={handleOpenAttempt}
            onOpenWorkspace={handleOpenWorkspace}
          />

          {/* ZONE 4: Pattern Mastery Matrix & Filter Controller */}
          <DSAPatternMatrix
            problems={dsaProblems}
            progressMap={dsaProgress}
            selectedPattern={selectedPattern}
            onSelectPattern={setSelectedPattern}
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* ZONE 5: Curated 150-Problem Workbench */}
          <DSAProblemWorkbench
            problems={dsaProblems}
            progressMap={dsaProgress}
            currentPhaseIndex={currentPhaseIndex}
            todayDate={todayDate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            selectedPattern={selectedPattern}
            onSelectPattern={setSelectedPattern}
            onOpenAttempt={handleOpenAttempt}
            onOpenWorkspace={handleOpenWorkspace}
          />
        </>
      )}

      {/* Modals & Drawers */}
      {effectiveAttemptProblem && (
        <DSAAttemptModal
          problem={effectiveAttemptProblem}
          progress={dsaProgress[effectiveAttemptProblem.id]}
          isOpen={isAttemptVisible}
          onClose={() => {
            setIsAttemptModalOpen(false);
            setSelectedProblemForAttempt(null);
            if (deepLinkedProblem) {
              setDismissedTargetId(routeState.targetId ?? null);
              setRoute('dashboard');
            }
          }}
          onSubmitAttempt={handleSubmitAttempt}
        />
      )}

      <TaskLearningWorkspaceDrawer
        dsaProblem={effectiveWorkspaceProblem || undefined}
        dsaProgress={effectiveWorkspaceProblem ? dsaProgress[effectiveWorkspaceProblem.id] : undefined}
        isOpen={isWorkspaceVisible}
        onClose={() => {
          setIsWorkspaceOpen(false);
          setSelectedProblemForWorkspace(null);
          if (deepLinkedProblem) {
            setDismissedTargetId(routeState.targetId ?? null);
            setRoute('dashboard');
          }
        }}
        onOpenAttemptModal={(problem) => {
          setIsWorkspaceOpen(false);
          setSelectedProblemForWorkspace(null);
          setSelectedProblemForAttempt(problem);
          setIsAttemptModalOpen(true);
        }}
        onUpdateDSAProgress={updateDSAProgress}
      />
    </div>
  );
};
