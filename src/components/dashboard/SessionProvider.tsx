import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SessionContext } from './SessionContext';
import {
  composeSessionPlan,
  createSessionState,
  advanceSession,
  recoverSession,
  getCurrentActivity,
  getRemainingTime,
  getSessionProgress
} from '../../engine/sessionComposer';
import type { SessionState } from '../../engine/sessionComposer';
import type { PlacementMode } from '../../types';

interface SessionProviderProps {
  children: React.ReactNode;
  availableMinutes: number;
  todayStr: string;
  mode: PlacementMode;
  selectedCompanyId?: string;
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
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const initializedRef = useRef(false);

  const composeSession = useCallback((minutes: number) => {
    const plan = composeSessionPlan({
      availableMinutes: minutes,
      todayStr,
      mode,
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
  }, [
    todayStr, mode, selectedCompanyId, tasks, taskProgressMap, dsaProblems,
    dsaProgressMap, topics, domains, skillStates, companyOverlays,
    practiceSessions, practiceAttempts, preparationTopics, preparationTopicProgress,
    domainResults, weaknessSignals, assessmentProfileReadout, activePhase,
    todayAssignments, dsaAttempts, evidenceLogs
  ]);

  useEffect(() => {
    if (availableMinutes > 0 && !initializedRef.current) {
      initializedRef.current = true;
      composeSession(availableMinutes);
    } else if (availableMinutes > 0 && initializedRef.current) {
      composeSession(availableMinutes);
    }
  }, [availableMinutes, composeSession]);

  const advanceActivity = useCallback((outcome: 'completed' | 'skipped' | 'failed' | 'postponed') => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const { newState } = advanceSession(prev, outcome);
      return newState;
    });
  }, []);

  const recoverActivity = useCallback((availableMinutes: number) => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const { newState } = recoverSession(prev, availableMinutes);
      return newState;
    });
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  const currentActivity = useMemo(() => sessionState ? getCurrentActivity(sessionState) : null, [sessionState]);
  const remainingTime = useMemo(() => sessionState ? getRemainingTime(sessionState) : 0, [sessionState]);
  const sessionProgress = useMemo(() => sessionState ? getSessionProgress(sessionState) : { completed: 0, total: 0, percent: 0 }, [sessionState]);
  const isSessionActive = useMemo(() => sessionState !== null && sessionState.currentActivityIndex < sessionState.plan.activities.length, [sessionState]);

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
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
