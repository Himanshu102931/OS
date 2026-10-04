import React, { useState, useMemo, useCallback } from 'react';
import { SessionContext } from './SessionContext';
import {
  composeAdaptiveSession,
  createSessionState,
  advanceSession,
  recoverSession,
  getCurrentActivity,
  getRemainingTime,
  getSessionProgress,
} from '../../engine/sessionComposer';
import type { SessionState, SessionComposerMode, EnergyLevel } from '../../engine/sessionComposer';
import type { PlacementMode } from '../../types';

interface SessionProviderProps {
  children: React.ReactNode;
  availableMinutes: number;
  todayStr: string;
  mode: PlacementMode;
  selectedCompanyId?: string;
  energyLevel?: EnergyLevel;
  tasks: unknown[];
  taskProgressMap: Record<string, unknown>;
  dsaProblems: unknown[];
  dsaProgressMap: Record<string, unknown>;
  topics: unknown[];
  domains: unknown[];
  skillStates: Record<string, unknown>;
  companyOverlays: unknown[];
  practiceSessions: unknown[];
  practiceAttempts: unknown[];
  preparationTopics: unknown[];
  preparationTopicProgress: Record<string, unknown>;
  domainResults: unknown[];
  weaknessSignals: unknown[];
  assessmentProfileReadout: unknown;
  activePhase: number;
  todayAssignments: unknown[];
  dsaAttempts: unknown[];
  evidenceLogs: unknown[];
}

export function SessionProvider({
  children,
  availableMinutes,
  todayStr,
  mode,
  selectedCompanyId,
  energyLevel = 'medium',
  tasks,
  taskProgressMap,
  dsaProblems,
  dsaProgressMap,
  topics,
  domains,
  skillStates,
  companyOverlays,
  practiceSessions,
  practiceAttempts,
  preparationTopics,
  preparationTopicProgress,
  domainResults,
  weaknessSignals,
  assessmentProfileReadout,
  activePhase,
  todayAssignments,
  dsaAttempts,
  evidenceLogs,
}: SessionProviderProps) {
  const [userDuration, setUserDuration] = useState<number | null>(null);
  const selectedDuration = userDuration ?? (availableMinutes > 0 ? availableMinutes : 60);
  const [sessionMode, setSessionModeState] = useState<SessionComposerMode>('balanced');

  const [sessionState, setSessionState] = useState<SessionState | null>(() => {
    const initDuration = availableMinutes > 0 ? availableMinutes : 60;
    const initialPlan = composeAdaptiveSession({
      availableMinutes: initDuration,
      todayStr,
      mode,
      sessionMode: 'balanced',
      energyLevel,
      selectedCompanyId,
      tasks,
      taskProgressMap,
      dsaProblems,
      dsaProgressMap,
      topics,
      domains,
      skillStates,
      companyOverlays,
      practiceSessions,
      practiceAttempts,
      preparationTopics,
      preparationTopicProgress,
      domainResults,
      weaknessSignals,
      assessmentProfileReadout,
      activePhase,
      todayAssignments,
      dsaAttempts,
      evidenceLogs,
    });
    return createSessionState(initialPlan);
  });

  // Re-compose when availableMinutes changes externally and user hasn't overridden
  const [prevAvailableMinutes, setPrevAvailableMinutes] = useState(availableMinutes);
  if (availableMinutes !== prevAvailableMinutes) {
    setPrevAvailableMinutes(availableMinutes);
    if (availableMinutes > 0 && userDuration === null) {
      const plan = composeAdaptiveSession({
        availableMinutes,
        todayStr,
        mode,
        sessionMode,
        energyLevel,
        selectedCompanyId,
        tasks,
        taskProgressMap,
        dsaProblems,
        dsaProgressMap,
        topics,
        domains,
        skillStates,
        companyOverlays,
        practiceSessions,
        practiceAttempts,
        preparationTopics,
        preparationTopicProgress,
        domainResults,
        weaknessSignals,
        assessmentProfileReadout,
        activePhase,
        todayAssignments,
        dsaAttempts,
        evidenceLogs,
      });
      setSessionState(createSessionState(plan));
    }
  }

  const composeSession = useCallback(
    (minutes?: number, modeOverride?: SessionComposerMode) => {
      const durationToUse = minutes ?? selectedDuration;
      const modeToUse = modeOverride ?? sessionMode;

      const plan = composeAdaptiveSession({
        availableMinutes: durationToUse,
        todayStr,
        mode,
        sessionMode: modeToUse,
        energyLevel,
        selectedCompanyId,
        tasks,
        taskProgressMap,
        dsaProblems,
        dsaProgressMap,
        topics,
        domains,
        skillStates,
        companyOverlays,
        practiceSessions,
        practiceAttempts,
        preparationTopics,
        preparationTopicProgress,
        domainResults,
        weaknessSignals,
        assessmentProfileReadout,
        activePhase,
        todayAssignments,
        dsaAttempts,
        evidenceLogs,
      });

      setSessionState(createSessionState(plan));
    },
    [
      selectedDuration,
      sessionMode,
      todayStr,
      mode,
      energyLevel,
      selectedCompanyId,
      tasks,
      taskProgressMap,
      dsaProblems,
      dsaProgressMap,
      topics,
      domains,
      skillStates,
      companyOverlays,
      practiceSessions,
      practiceAttempts,
      preparationTopics,
      preparationTopicProgress,
      domainResults,
      weaknessSignals,
      assessmentProfileReadout,
      activePhase,
      todayAssignments,
      dsaAttempts,
      evidenceLogs,
    ]
  );

  const setSelectedDuration = useCallback(
    (duration: number) => {
      setUserDuration(duration);
      composeSession(duration, sessionMode);
    },
    [composeSession, sessionMode]
  );

  const setSessionMode = useCallback(
    (newMode: SessionComposerMode) => {
      setSessionModeState(newMode);
      composeSession(selectedDuration, newMode);
    },
    [composeSession, selectedDuration]
  );

  const advanceActivity = useCallback((outcome: 'completed' | 'skipped' | 'failed' | 'postponed') => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const { newState } = advanceSession(prev, outcome);
      return newState;
    });
  }, []);

  const recoverActivity = useCallback((minutes: number) => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const { newState } = recoverSession(prev, minutes);
      return newState;
    });
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  const currentActivity = useMemo(
    () => (sessionState ? getCurrentActivity(sessionState) : null),
    [sessionState]
  );
  const remainingTime = useMemo(
    () => (sessionState ? getRemainingTime(sessionState) : 0),
    [sessionState]
  );
  const sessionProgress = useMemo(
    () =>
      sessionState
        ? getSessionProgress(sessionState)
        : { completed: 0, total: 0, percent: 0 },
    [sessionState]
  );
  const isSessionActive = useMemo(
    () =>
      sessionState !== null &&
      sessionState.currentActivityIndex < sessionState.plan.activities.length,
    [sessionState]
  );

  const value = {
    sessionState,
    composeSession,
    advanceActivity,
    recoverActivity,
    clearSession,
    currentActivity,
    remainingTime,
    sessionProgress,
    isSessionActive,
    selectedDuration,
    setSelectedDuration,
    sessionMode,
    setSessionMode,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
