import React, { useState, useMemo, useCallback, useContext } from 'react';
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
import { usePlacement } from '../../context/PlacementContext';
import { PREPARATION_TOPICS } from '../../data/preparationDataset';

export interface SessionProviderProps {
  children: React.ReactNode;
  availableMinutes?: number;
  todayStr?: string;
  mode?: PlacementMode;
  selectedCompanyId?: string;
  energyLevel?: EnergyLevel;
  tasks?: unknown[];
  taskProgressMap?: Record<string, unknown>;
  dsaProblems?: unknown[];
  dsaProgressMap?: Record<string, unknown>;
  topics?: unknown[];
  domains?: unknown[];
  skillStates?: Record<string, unknown>;
  companyOverlays?: unknown[];
  practiceSessions?: unknown[];
  practiceAttempts?: unknown[];
  preparationTopics?: unknown[];
  preparationTopicProgress?: Record<string, unknown>;
  domainResults?: unknown[];
  weaknessSignals?: unknown[];
  assessmentProfileReadout?: unknown;
  activePhase?: number;
  todayAssignments?: unknown[];
  dsaAttempts?: unknown[];
  evidenceLogs?: unknown[];
}

function useSafePlacement() {
  try {
    return usePlacement();
  } catch {
    return null;
  }
}

export function SessionProvider(props: SessionProviderProps) {
  const existingContext = useContext(SessionContext);
  if (existingContext) {
    return <>{props.children}</>;
  }

  return <SessionProviderInner {...props} />;
}

function SessionProviderInner({
  children,
  availableMinutes: propAvailableMinutes,
  todayStr: propTodayStr,
  mode: propMode,
  selectedCompanyId: propSelectedCompanyId,
  energyLevel: propEnergyLevel,
  tasks: propTasks,
  taskProgressMap: propTaskProgressMap,
  dsaProblems: propDsaProblems,
  dsaProgressMap: propDsaProgressMap,
  topics: propTopics,
  domains: propDomains,
  skillStates: propSkillStates,
  companyOverlays: propCompanyOverlays,
  practiceSessions: propPracticeSessions,
  practiceAttempts: propPracticeAttempts,
  preparationTopics: propPreparationTopics,
  preparationTopicProgress: propPreparationTopicProgress,
  domainResults: propDomainResults,
  weaknessSignals: propWeaknessSignals,
  assessmentProfileReadout: propAssessmentProfileReadout,
  activePhase: propActivePhase,
  todayAssignments: propTodayAssignments,
  dsaAttempts: propDsaAttempts,
  evidenceLogs: propEvidenceLogs,
}: SessionProviderProps) {
  const placement = useSafePlacement();
  const todayCheckIn = placement?.dailyCheckIns.find((c) => c.date === placement.todayDate);

  const availableMinutes =
    propAvailableMinutes ?? (todayCheckIn?.availableMinutes || 0);
  const todayStr = propTodayStr ?? (placement?.todayDate || '');
  const mode = propMode ?? (placement?.currentMode || 'normal');
  const selectedCompanyId =
    propSelectedCompanyId ?? (placement?.selectedCompanyOverlayId || undefined);
  const energyLevel =
    propEnergyLevel ?? (todayCheckIn?.energyLevel || 'medium');
  const tasks = propTasks ?? (placement?.taskDefinitions || []);
  const taskProgressMap = propTaskProgressMap ?? (placement?.taskProgress || {});
  const dsaProblems = propDsaProblems ?? (placement?.dsaProblems || []);
  const dsaProgressMap = propDsaProgressMap ?? (placement?.dsaProgress || {});
  const topics = propTopics ?? (placement?.topics || []);
  const domains = propDomains ?? (placement?.domains || []);
  const skillStates = propSkillStates ?? (placement?.skillStates || {});
  const companyOverlays = propCompanyOverlays ?? (placement?.companyOverlays || []);
  const practiceSessions = propPracticeSessions ?? (placement?.practiceSessions || []);
  const practiceAttempts = propPracticeAttempts ?? (placement?.practiceAttempts || []);
  const preparationTopics = propPreparationTopics ?? PREPARATION_TOPICS;
  const preparationTopicProgress =
    propPreparationTopicProgress ?? (placement?.preparationTopicProgress || {});
  const domainResults =
    propDomainResults ?? (placement?.assessmentState?.domainResults || []);
  const weaknessSignals =
    propWeaknessSignals ?? (placement?.assessmentState?.weaknessSignals || []);
  const assessmentProfileReadout =
    propAssessmentProfileReadout ?? placement?.assessmentProfileReadout;
  const activePhase = propActivePhase ?? (placement?.activePhase.order || 1);
  const todayAssignments =
    propTodayAssignments ??
    (placement?.dailyTaskAssignments.filter((a) => a.date === placement.todayDate) || []);
  const dsaAttempts = propDsaAttempts ?? (placement?.dsaAttempts || []);
  const evidenceLogs = propEvidenceLogs ?? (placement?.evidenceLogs || []);

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
  // and no session is actively in progress
  const [prevAvailableMinutes, setPrevAvailableMinutes] = useState(availableMinutes);
  if (availableMinutes !== prevAvailableMinutes) {
    setPrevAvailableMinutes(availableMinutes);
    const isSessionInProgress =
      sessionState !== null &&
      (sessionState.completedActivityIds.length > 0 ||
        sessionState.skippedActivityIds.length > 0 ||
        sessionState.currentActivityIndex > 0);

    if (availableMinutes > 0 && userDuration === null && !isSessionInProgress) {
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
