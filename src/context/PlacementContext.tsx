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
  PlacementMode,
} from '../types';
import {
  DOMAINS,
  PHASES,
  MODULES,
  TOPICS,
  TASK_DEFINITIONS,
  TASK_PROGRESS,
  DSA_PROBLEMS,
  INITIAL_DSA_PROGRESS,
  INITIAL_SKILL_STATES,
  COMPANY_OVERLAYS,
} from '../data/seedData';

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
  activePhase: Phase;
  updateTaskState: (taskId: string, newState: TaskProgress['state']) => void;
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

  const [currentMode, setPlacementMode] = useState<PlacementMode>('normal');

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

  const [taskProgressMap, setTaskProgressMap] = useState<Record<string, TaskProgress>>(() => {
    const map: Record<string, TaskProgress> = {};
    TASK_PROGRESS.forEach((tp) => {
      map[tp.taskId] = tp;
    });
    return map;
  });

  const [dsaProgressMap] = useState<Record<string, DSAProgress>>(() => {
    const map: Record<string, DSAProgress> = {};
    INITIAL_DSA_PROGRESS.forEach((dp) => {
      map[dp.problemId] = dp;
    });
    return map;
  });

  const [skillStateMap] = useState<Record<string, TopicSkillState>>(() => {
    const map: Record<string, TopicSkillState> = {};
    INITIAL_SKILL_STATES.forEach((sk) => {
      map[sk.topicId] = sk;
    });
    return map;
  });

  const activePhase = PHASES[0];

  const updateTaskState = (taskId: string, newState: TaskProgress['state']) => {
    setTaskProgressMap((prev) => {
      const existing = prev[taskId] || {
        taskId,
        state: 'not_started',
        postponeCount: 0,
        skipCount: 0,
        timeSpentMinutes: 0,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        [taskId]: {
          ...existing,
          state: newState,
          lastCompletedAt: newState === 'completed' ? new Date().toISOString() : existing.lastCompletedAt,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  return (
    <PlacementContext.Provider
      value={{
        currentRoute,
        setRoute,
        todayDate,
        currentMode,
        setPlacementMode,
        phases: PHASES,
        modules: MODULES,
        topics: TOPICS,
        domains: DOMAINS,
        taskDefinitions: TASK_DEFINITIONS,
        taskProgress: taskProgressMap,
        dsaProblems: DSA_PROBLEMS,
        dsaProgress: dsaProgressMap,
        skillStates: skillStateMap,
        companyOverlays: COMPANY_OVERLAYS,
        activePhase,
        updateTaskState,
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
