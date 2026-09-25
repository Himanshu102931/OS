import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  DomainDefinition,
  Phase,
  Module,
  Topic,
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  DSAAttempt,
  TopicSkillState,
  CompanyOverlay,
  DailyCheckIn,
  DailyTaskAssignment,
  EvidenceLog,
  PlacementMode,
  UserSettings,
} from '../types';
import {
  DOMAINS,
  PHASES,
  MODULES,
  TOPICS,
  TASK_DEFINITIONS,
  DSA_PROBLEMS,
} from '../data/seedData';
import { StorageAdapter, DEFAULT_USER_SETTINGS, type AppStorageState } from '../storage/storageAdapter';

export type RoutePath = 'dashboard' | 'roadmap' | 'dsa' | 'skills' | 'companies' | 'analytics' | 'settings';

interface AppExtendedStorageState extends AppStorageState {
  customTaskDefinitions?: TaskDefinition[];
  dsaAttempts: DSAAttempt[];
  evidenceLogs: EvidenceLog[];
}

interface PlacementContextType {
  currentRoute: RoutePath;
  setRoute: (route: RoutePath) => void;
  todayDate: string;
  currentMode: PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;
  userSettings: UserSettings;
  updateUserSettings: (newSettings: Partial<UserSettings>) => void;
  resetUserSettingsOnly: () => void;
  phases: Phase[];
  modules: Module[];
  topics: Topic[];
  domains: DomainDefinition[];
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgress: Record<string, DSAProgress>;
  dsaAttempts: DSAAttempt[];
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  dailyCheckIns: DailyCheckIn[];
  dailyTaskAssignments: DailyTaskAssignment[];
  evidenceLogs: EvidenceLog[];
  activePhase: Phase;
  updateTaskState: (taskId: string, newState: TaskProgress['state']) => void;
  commitDailyPlan: (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => void;
  sealDayExecution: (
    updatedCheckIn: DailyCheckIn,
    updatedAssignments: DailyTaskAssignment[],
    newEvidenceLogs: EvidenceLog[],
    updatedTaskProgressMap: Record<string, TaskProgress>,
    updatedDsaProgressMap: Record<string, DSAProgress>,
    updatedSkillStatesMap: Record<string, TopicSkillState>
  ) => void;
  logDSAAttempt: (
    attempt: DSAAttempt,
    updatedProgress: DSAProgress,
    evidenceScore: number
  ) => void;
  updateDSAProgress: (updatedProgress: DSAProgress) => void;
  updateSkillState: (updatedSkillState: TopicSkillState) => void;
  saveCompanyOverlay: (company: CompanyOverlay) => void;
  decomposeTask: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
  resetApplicationData: () => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => { success: boolean; error?: string };
  storageBytes: number;
}

function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export const PlacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>('dashboard');
  const [todayDate, setTodayDate] = useState<string>(getTodayISO);

  // Periodically check local calendar date rollover (e.g. crossing midnight)
  useEffect(() => {
    const checkDateRollover = () => {
      const current = getTodayISO();
      setTodayDate((prev) => (prev !== current ? current : prev));
    };

    const interval = setInterval(checkDateRollover, 60000);
    window.addEventListener('focus', checkDateRollover);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDateRollover);
    };
  }, []);

  // Hydrate state safely from StorageAdapter
  const [appState, setAppState] = useState<AppExtendedStorageState>(() => {
    const loaded = StorageAdapter.loadState() as AppExtendedStorageState;
    const initialToday = getTodayISO();
    const updatedCheckIns = (loaded.dailyCheckIns || []).map((ci) => {
      if (ci.date < initialToday && !ci.isSealed) {
        return {
          ...ci,
          isSealed: true,
          sealedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return ci;
    });

    return {
      ...loaded,
      dailyCheckIns: updatedCheckIns,
      customTaskDefinitions: loaded.customTaskDefinitions || [],
      dsaAttempts: loaded.dsaAttempts || [],
      evidenceLogs: loaded.evidenceLogs || [],
    };
  });

  useEffect(() => {
    StorageAdapter.saveState(appState);
  }, [appState]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').toLowerCase();
      if (['dashboard', 'roadmap', 'dsa', 'skills', 'companies', 'analytics', 'settings'].includes(hash)) {
        setCurrentRoute(hash as RoutePath);
      } else {
        setCurrentRoute('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setRoute = (route: RoutePath) => {
    window.location.hash = `#/${route}`;
    setCurrentRoute(route);
  };

  const setPlacementMode = (mode: PlacementMode) => {
    setAppState((prev) => ({
      ...prev,
      currentMode: mode,
      userSettings: {
        ...prev.userSettings,
        placementMode: mode,
      },
    }));
  };

  const updateUserSettings = (newSettings: Partial<UserSettings>) => {
    setAppState((prev) => ({
      ...prev,
      currentMode: newSettings.placementMode ?? prev.currentMode,
      userSettings: {
        ...(prev.userSettings || DEFAULT_USER_SETTINGS),
        ...newSettings,
      },
    }));
  };

  const resetUserSettingsOnly = () => {
    setAppState((prev) => ({
      ...prev,
      currentMode: DEFAULT_USER_SETTINGS.placementMode,
      userSettings: DEFAULT_USER_SETTINGS,
    }));
  };

  useEffect(() => {
    const root = document.documentElement;
    const settings = appState.userSettings || DEFAULT_USER_SETTINGS;
    if (settings.theme) {
      root.setAttribute('data-theme', settings.theme);
    }
    if (settings.densityMode) {
      root.setAttribute('data-density', settings.densityMode);
    }
  }, [appState.userSettings]);

  const activePhase = PHASES[0];

  const allTaskDefinitions = [
    ...TASK_DEFINITIONS,
    ...(appState.customTaskDefinitions || []),
  ];

  const updateTaskState = (taskId: string, newState: TaskProgress['state']) => {
    setAppState((prev) => {
      const existing = prev.taskProgress[taskId] || {
        taskId,
        state: 'not_started',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: new Date().toISOString(),
      };

      const updatedProgress: TaskProgress = {
        ...existing,
        state: newState,
        lastCompletedAt: newState === 'completed' ? new Date().toISOString() : existing.lastCompletedAt,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        taskProgress: {
          ...prev.taskProgress,
          [taskId]: updatedProgress,
        },
      };
    });
  };

  const commitDailyPlan = (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => {
    setAppState((prev) => {
      const filteredCheckIns = prev.dailyCheckIns.filter((c) => c.date !== checkIn.date);
      const filteredAssignments = prev.dailyTaskAssignments.filter((a) => a.date !== checkIn.date);

      return {
        ...prev,
        currentMode: checkIn.mode,
        dailyCheckIns: [...filteredCheckIns, checkIn],
        dailyTaskAssignments: [...filteredAssignments, ...assignments],
      };
    });
  };

  const sealDayExecution = (
    updatedCheckIn: DailyCheckIn,
    updatedAssignments: DailyTaskAssignment[],
    newEvidenceLogs: EvidenceLog[],
    updatedTaskProgressMap: Record<string, TaskProgress>,
    updatedDsaProgressMap: Record<string, DSAProgress>,
    updatedSkillStatesMap: Record<string, TopicSkillState>
  ) => {
    setAppState((prev) => {
      const filteredCheckIns = prev.dailyCheckIns.filter((c) => c.id !== updatedCheckIn.id);
      const otherAssignments = prev.dailyTaskAssignments.filter((a) => a.date !== updatedCheckIn.date);

      return {
        ...prev,
        taskProgress: updatedTaskProgressMap,
        dsaProgress: updatedDsaProgressMap,
        skillStates: updatedSkillStatesMap,
        dailyCheckIns: [...filteredCheckIns, updatedCheckIn],
        dailyTaskAssignments: [...otherAssignments, ...updatedAssignments],
        evidenceLogs: [...(prev.evidenceLogs || []), ...newEvidenceLogs],
      };
    });
  };

  const logDSAAttempt = (
    attempt: DSAAttempt,
    updatedProgress: DSAProgress,
    evidenceScore: number
  ) => {
    setAppState((prev) => {
      const prob = DSA_PROBLEMS.find((p) => p.id === attempt.problemId);
      const topicId = prob?.topicId || 'topic-dsa-arrays';
      const domainId = prob?.domainId || 'dsa';

      const existingSkill = prev.skillStates[topicId] || {
        topicId,
        domainId,
        freshness: 'untested',
        evidenceStrength: 0,
      };

      const newEvidenceStrength = Math.min(
        100,
        Math.max(0, Math.round(existingSkill.evidenceStrength * 0.7 + evidenceScore * 0.3))
      );

      const newEvidence: EvidenceLog = {
        id: `evidence-dsa-${Date.now()}`,
        topicId,
        domainId,
        score: evidenceScore,
        confidence: 4,
        timestamp: new Date().toISOString(),
        sourceType: 'dsa_attempt',
        sourceId: attempt.id,
      };

      return {
        ...prev,
        dsaAttempts: [attempt, ...(prev.dsaAttempts || [])],
        dsaProgress: {
          ...prev.dsaProgress,
          [attempt.problemId]: updatedProgress,
        },
        skillStates: {
          ...prev.skillStates,
          [topicId]: {
            ...existingSkill,
            lastPracticedAt: new Date().toISOString(),
            freshness: 'fresh',
            evidenceStrength: newEvidenceStrength,
          },
        },
        evidenceLogs: [...(prev.evidenceLogs || []), newEvidence],
      };
    });
  };

  const updateDSAProgress = (updatedProgress: DSAProgress) => {
    setAppState((prev) => ({
      ...prev,
      dsaProgress: {
        ...prev.dsaProgress,
        [updatedProgress.problemId]: updatedProgress,
      },
    }));
  };

  const updateSkillState = (updatedSkillState: TopicSkillState) => {
    setAppState((prev) => ({
      ...prev,
      skillStates: {
        ...prev.skillStates,
        [updatedSkillState.topicId]: updatedSkillState,
      },
    }));
  };

  const saveCompanyOverlay = (company: CompanyOverlay) => {
    setAppState((prev) => {
      const filtered = prev.companyOverlays.filter((c) => c.id !== company.id);
      return {
        ...prev,
        companyOverlays: [...filtered, company],
      };
    });
  };

  const decomposeTask = (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => {
    setAppState((prev) => {
      const parentProg = prev.taskProgress[parentTask.id] || {
        taskId: parentTask.id,
        state: 'not_started',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: new Date().toISOString(),
      };

      const updatedProgress: Record<string, TaskProgress> = {
        ...prev.taskProgress,
        [parentTask.id]: {
          ...parentProg,
          state: 'archived',
          updatedAt: new Date().toISOString(),
        },
      };

      subtasks.forEach((st) => {
        updatedProgress[st.id] = {
          taskId: st.id,
          state: 'not_started',
          postponeCount: 0,
          skipCount: 0,
          timeSpentMinutes: 0,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        customTaskDefinitions: [...(prev.customTaskDefinitions || []), ...subtasks],
        taskProgress: updatedProgress,
      };
    });
  };

  const resetApplicationData = () => {
    const defaults = StorageAdapter.resetState() as AppExtendedStorageState;
    setAppState({
      ...defaults,
      customTaskDefinitions: [],
      dsaAttempts: [],
      evidenceLogs: [],
    });
  };

  const exportBackupJSON = (): string => {
    return StorageAdapter.exportJSON(appState);
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    const result = StorageAdapter.importJSON(jsonStr);
    if (result.success && result.state) {
      const loaded = result.state as AppExtendedStorageState;
      setAppState({
        ...loaded,
        customTaskDefinitions: loaded.customTaskDefinitions || [],
        dsaAttempts: loaded.dsaAttempts || [],
        evidenceLogs: loaded.evidenceLogs || [],
      });
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const storageBytes = StorageAdapter.getStorageBytes();

  return (
    <PlacementContext.Provider
      value={{
        currentRoute,
        setRoute,
        todayDate,
        currentMode: appState.currentMode,
        setPlacementMode,
        userSettings: appState.userSettings || DEFAULT_USER_SETTINGS,
        updateUserSettings,
        resetUserSettingsOnly,
        phases: PHASES,
        modules: MODULES,
        topics: TOPICS,
        domains: DOMAINS,
        taskDefinitions: allTaskDefinitions,
        taskProgress: appState.taskProgress,
        dsaProblems: DSA_PROBLEMS,
        dsaProgress: appState.dsaProgress,
        dsaAttempts: appState.dsaAttempts || [],
        skillStates: appState.skillStates,
        companyOverlays: appState.companyOverlays,
        dailyCheckIns: appState.dailyCheckIns,
        dailyTaskAssignments: appState.dailyTaskAssignments,
        evidenceLogs: appState.evidenceLogs || [],
        activePhase,
        updateTaskState,
        commitDailyPlan,
        sealDayExecution,
        logDSAAttempt,
        updateDSAProgress,
        updateSkillState,
        saveCompanyOverlay,
        decomposeTask,
        resetApplicationData,
        exportBackupJSON,
        importBackupJSON,
        storageBytes,
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
};

export const usePlacement = (): PlacementContextType => {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
};
