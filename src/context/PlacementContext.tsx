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
  PracticeSessionDefinition,
  PracticeAttempt,
} from '../types';
import {
  DOMAINS,
  PHASES,
  MODULES,
  TOPICS,
  TASK_DEFINITIONS,
  DSA_PROBLEMS,
} from '../data/seedData';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { StorageAdapter, DEFAULT_USER_SETTINGS, type AppStorageState } from '../storage/storageAdapter';

export type RoutePath = 'dashboard' | 'roadmap' | 'dsa' | 'skills' | 'practice' | 'preparation' | 'project' | 'companies' | 'analytics' | 'settings';

export interface RouteState {
  route: RoutePath;
  preparationTopicId?: string;
}


interface AppExtendedStorageState extends AppStorageState {
  customTaskDefinitions?: TaskDefinition[];
  dsaAttempts: DSAAttempt[];
  evidenceLogs: EvidenceLog[];
}

interface PlacementContextType {
  currentRoute: RoutePath;
  routeState: RouteState;
  setRoute: (route: RoutePath, preparationTopicId?: string) => void;
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
  practiceSessions: PracticeSessionDefinition[];
  practiceAttempts: PracticeAttempt[];
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
  recordPracticeAttempt: (
    attempt: PracticeAttempt,
    evidenceLog: EvidenceLog
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
  const [routeState, setRouteState] = useState<RouteState>({ route: 'dashboard' });
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
      practiceAttempts: loaded.practiceAttempts || [],
    };
  });

  useEffect(() => {
    StorageAdapter.saveState(appState);
  }, [appState]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').toLowerCase();
      const parts = hash.split('/');
      const route = parts[0] as RoutePath;
      
      if (['dashboard', 'roadmap', 'dsa', 'skills', 'practice', 'preparation', 'project', 'companies', 'analytics', 'settings'].includes(route)) {
        const preparationTopicId = parts[1];
        setRouteState({ route, preparationTopicId });
      } else {
        setRouteState({ route: 'dashboard' });
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setRoute = (route: RoutePath, preparationTopicId?: string) => {
    const hash = preparationTopicId ? `#/${route}/${preparationTopicId}` : `#/${route}`;
    window.location.hash = hash;
    setRouteState({ route, preparationTopicId });
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
      root.setAttribute('data-[#theme]', settings.theme);
    }
    if (settings.densityMode) {
      root.setAttribute('data-[#density]', settings.densityMode);
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

      const isCompleting = newState === 'completed';
      const updatedItem: TaskProgress = {
        ...existing,
        state: newState,
        lastCompletedAt: isCompleting ? new Date().toISOString() : existing.lastCompletedAt,
        updatedAt: new Date().toISOString(),
      };

      let newEvidenceLogs = prev.evidenceLogs || [];
      if (isCompleting) {
        const taskDef = allTaskDefinitions.find((t) => t.id === taskId);
        if (taskDef) {
          const newEvidence: EvidenceLog = {
            id: `evidence-task-${Date.now()}`,
            topicId: taskDef.topicId,
            domainId: taskDef.domainId,
            score: 80,
            confidence: 4,
            timestamp: new Date().toISOString(),
            sourceType: 'daily_assignment',
            sourceId: taskId,
          };
          newEvidenceLogs = [...newEvidenceLogs, newEvidence];
        }
      }

      return {
        ...prev,
        taskProgress: {
          ...prev.taskProgress,
          [taskId]: updatedItem,
        },
        evidenceLogs: newEvidenceLogs,
      };
    });
  };

  const commitDailyPlan = (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => {
    setAppState((prev) => {
      const otherCheckIns = prev.dailyCheckIns.filter((c) => c.date !== checkIn.date);
      const otherAssignments = prev.dailyTaskAssignments.filter((a) => a.date !== checkIn.date);

      return {
        ...prev,
        dailyCheckIns: [...otherCheckIns, checkIn],
        dailyTaskAssignments: [...otherAssignments, ...assignments],
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
      const otherCheckIns = prev.dailyCheckIns.filter((c) => c.date !== updatedCheckIn.date);
      const otherAssignments = prev.dailyTaskAssignments.filter((a) => a.date !== updatedCheckIn.date);

      return {
        ...prev,
        dailyCheckIns: [...otherCheckIns, updatedCheckIn],
        dailyTaskAssignments: [...otherAssignments, ...updatedAssignments],
        evidenceLogs: [...(prev.evidenceLogs || []), ...newEvidenceLogs],
        taskProgress: {
          ...prev.taskProgress,
          ...updatedTaskProgressMap,
        },
        dsaProgress: {
          ...prev.dsaProgress,
          ...updatedDsaProgressMap,
        },
        skillStates: {
          ...prev.skillStates,
          ...updatedSkillStatesMap,
        },
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
        Math.max(0, existingSkill.evidenceStrength + Math.round(evidenceScore * 0.15))
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

  const recordPracticeAttempt = (
    attempt: PracticeAttempt,
    evidenceLog: EvidenceLog
  ) => {
    setAppState((prev) => {
      const topicId = evidenceLog.topicId;
      const domainId = evidenceLog.domainId;

      const existingSkill = prev.skillStates[topicId] || {
        topicId,
        domainId,
        freshness: 'untested',
        evidenceStrength: 0,
      };

      const newEvidenceStrength = Math.min(
        100,
        Math.max(0, existingSkill.evidenceStrength + Math.round(evidenceLog.score * 0.2))
      );

      return {
        ...prev,
        practiceAttempts: [attempt, ...(prev.practiceAttempts || [])],
        skillStates: {
          ...prev.skillStates,
          [topicId]: {
            ...existingSkill,
            lastPracticedAt: new Date().toISOString(),
            freshness: 'fresh',
            evidenceStrength: newEvidenceStrength,
          },
        },
        evidenceLogs: [...(prev.evidenceLogs || []), evidenceLog],
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
    StorageAdapter.clearState();
    const defaults = StorageAdapter.loadState() as AppExtendedStorageState;
    setAppState({
      ...defaults,
      customTaskDefinitions: [],
      dsaAttempts: [],
      evidenceLogs: [],
      practiceAttempts: [],
    });
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(appState, null, 2);
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (StorageAdapter.saveState(parsed)) {
        setAppState({
          ...parsed,
          customTaskDefinitions: parsed.customTaskDefinitions || [],
          dsaAttempts: parsed.dsaAttempts || [],
          evidenceLogs: parsed.evidenceLogs || [],
          practiceAttempts: parsed.practiceAttempts || [],
        });
        return { success: true };
      }
      return { success: false, error: 'Failed to write imported state to storage.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      return { success: false, error: msg };
    }
  };

  return (
    <PlacementContext.Provider
      value={{
        currentRoute: routeState.route,
        routeState,
        setRoute,
        todayDate,
        currentMode: appState.currentMode,
        setPlacementMode,
        userSettings: appState.userSettings,
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
        practiceSessions: PRACTICE_SESSIONS,
        practiceAttempts: appState.practiceAttempts || [],
        activePhase,
        updateTaskState,
        commitDailyPlan,
        sealDayExecution,
        logDSAAttempt,
        recordPracticeAttempt,
        updateDSAProgress,
        updateSkillState,
        saveCompanyOverlay,
        decomposeTask,
        resetApplicationData,
        exportBackupJSON,
        importBackupJSON,
        storageBytes: StorageAdapter.getStorageBytes(),
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
};

export const usePlacement = () => {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
};
