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
  TopicSkillState,
  CompanyOverlay,
  DailyCheckIn,
  DailyTaskAssignment,
  EvidenceLog,
  PlacementMode,
} from '../types';
import {
  DOMAINS,
  PHASES,
  MODULES,
  TOPICS,
  TASK_DEFINITIONS,
  DSA_PROBLEMS,
} from '../data/seedData';
import { StorageAdapter, type AppStorageState } from '../storage/storageAdapter';

export type RoutePath = 'dashboard' | 'roadmap' | 'dsa' | 'skills' | 'companies' | 'settings';

interface PlacementContextType {
  currentRoute: RoutePath;
  setRoute: (route: RoutePath) => void;
  todayDate: string;
  currentMode: PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;
  phases: Phase[];
  modules: Module[];
  topics: Topic[];
  domains: DomainDefinition[];
  taskDefinitions: TaskDefinition[];
  taskProgress: Record<string, TaskProgress>;
  dsaProblems: DSAProblem[];
  dsaProgress: Record<string, DSAProgress>;
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  dailyCheckIns: DailyCheckIn[];
  dailyTaskAssignments: DailyTaskAssignment[];
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
  resetApplicationData: () => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => { success: boolean; error?: string };
  storageBytes: number;
}

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export const PlacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>('dashboard');
  const [todayDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Hydrate initial state safely from StorageAdapter
  const [appState, setAppState] = useState<AppStorageState>(() => {
    const loaded = StorageAdapter.loadState();
    // Auto-seal past unsealed calendar days on launch
    const updatedCheckIns = loaded.dailyCheckIns.map((ci) => {
      if (ci.date < todayDate && !ci.isSealed) {
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
    };
  });

  // Automatically save to localStorage whenever appState updates
  useEffect(() => {
    StorageAdapter.saveState(appState);
  }, [appState]);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').toLowerCase();
      if (['dashboard', 'roadmap', 'dsa', 'skills', 'companies', 'settings'].includes(hash)) {
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
    }));
  };

  const activePhase = PHASES[0];

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
    _newEvidenceLogs: EvidenceLog[],
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
      };
    });
  };

  const resetApplicationData = () => {
    const defaults = StorageAdapter.resetState();
    setAppState(defaults);
  };

  const exportBackupJSON = (): string => {
    return StorageAdapter.exportJSON(appState);
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    const result = StorageAdapter.importJSON(jsonStr);
    if (result.success && result.state) {
      setAppState(result.state);
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
        phases: PHASES,
        modules: MODULES,
        topics: TOPICS,
        domains: DOMAINS,
        taskDefinitions: TASK_DEFINITIONS,
        taskProgress: appState.taskProgress,
        dsaProblems: DSA_PROBLEMS,
        dsaProgress: appState.dsaProgress,
        skillStates: appState.skillStates,
        companyOverlays: appState.companyOverlays,
        dailyCheckIns: appState.dailyCheckIns,
        dailyTaskAssignments: appState.dailyTaskAssignments,
        activePhase,
        updateTaskState,
        commitDailyPlan,
        sealDayExecution,
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
