import { useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { EvidenceCatalog } from '../../engine/evidenceTrace';

/**
 * Assembles the read-only canonical record set every evidence trace resolves
 * against. Built once per view from the same context values the engines read,
 * so a trace can never disagree with the surface that produced the signal.
 */
export function useEvidenceCatalog(): EvidenceCatalog {
  const {
    topics,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    evidenceLogs,
    practiceSessions,
    practiceAttempts,
    skillStates,
    todayDate,
    preparationTopicProgress,
    assessmentState,
  } = usePlacement();

  return useMemo(
    () => ({
      topics,
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      evidenceLogs,
      practiceSessions,
      practiceAttempts,
      skillStates,
      todayISO: todayDate,
      preparationTopicProgress,
      assessmentState,
    }),
    [
      topics,
      taskDefinitions,
      taskProgress,
      dsaProblems,
      dsaProgress,
      dsaAttempts,
      evidenceLogs,
      practiceSessions,
      practiceAttempts,
      skillStates,
      todayDate,
      preparationTopicProgress,
      assessmentState,
    ]
  );
}
