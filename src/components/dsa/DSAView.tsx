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
import type { DSAProblem, DSAAttempt, DSAProgress } from '../../types';
import { getDSASignals } from '../../engine/dsaEngine';

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

  // Derive deep-linked problem directly from canonical route state
  const isDeepLinked =
    routeState.route === 'dsa' &&
    Boolean(routeState.targetId) &&
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
      {/* ZONE 1: DSA Header & Macro Mastery Strip */}
      <DSAHeader
        totalProblemsCount={dsaProblems.length}
        masteredCount={totalMasteredCount}
      />

      <DSAMasteryStrip
        problems={dsaProblems}
        progressMap={dsaProgress}
        todayDate={todayDate}
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
