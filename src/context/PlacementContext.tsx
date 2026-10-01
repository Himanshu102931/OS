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
  PreparationTopicProgress,
  AssessmentState,
  AssessmentAttempt,
  AssessmentResponse,
  AssessmentConfidence,
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
import { getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { applyTaskStateUpdate, applyTaskStateRestore, type TaskStateAction, type TaskStateRestore } from '../engine/taskStateEngine';
import { applyPracticeAttempt } from '../engine/practiceEngine';
import {
  buildBaselineAttempt,
  evaluateItemResponse,
  scoreAssessmentAttempt,
  transitionAttempt,
  type AssessmentScoringResult,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import { BASELINE_ASSESSMENT_DEFINITION } from '../data/assessment/definitions';

export type RoutePath = 'dashboard' | 'roadmap' | 'dsa' | 'skills' | 'practice' | 'preparation' | 'project' | 'companies' | 'analytics' | 'settings' | 'assessment';

/** Optional target identifier for route-specific deep links.
 *  - preparation: topicId (existing)
 *  - skills: topicId (for topic detail)
 *  - dsa: problemId (for problem detail)
 *  - roadmap: taskId (for task detail)
 *  - practice: sessionId (for session detail) */
interface RouteState {
  route: RoutePath;
  targetId?: string;
  /** @deprecated use targetId; kept for backward compatibility */
  preparationTopicId?: string;
}


interface AppExtendedStorageState extends AppStorageState {
  customTaskDefinitions?: TaskDefinition[];
  dsaAttempts: DSAAttempt[];
  evidenceLogs: EvidenceLog[];
  assessmentState?: AssessmentState;
}

interface PlacementContextType {
  currentRoute: RoutePath;
  routeState: RouteState;
  setRoute: (route: RoutePath, preparationTopicId?: string) => void;
  todayDate: string;
  currentMode: PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;
  userSettings: UserSettings;
  assessmentState?: AssessmentState;
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
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
  activePhase: Phase;
  updateTaskState: (taskId: string, newState: TaskProgress['state'], action?: TaskStateAction) => void;
  /**
   * Reverses ONE captured Today transaction (completion, postpone or skip)
   * exactly as it was before. Writes task progress, the completion's skill
   * snapshot and the completion's evidence in a single state transaction —
   * it never recomputes, never appends evidence and never touches anything
   * the capture did not name.
   */
  restoreTaskTransaction: (restore: TaskStateRestore) => void;
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
  updatePreparationTopicProgress: (updatedProgress: PreparationTopicProgress) => void;
  saveCompanyOverlay: (company: CompanyOverlay) => void;
  deleteCompanyOverlay: (companyId: string) => void;
  decomposeTask: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
  resetApplicationData: () => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => { success: boolean; error?: string };
  storageBytes: number;
  startBaselineAssessment: () => AssessmentAttempt;
  recordAssessmentResponse: (
    attemptId: string,
    itemId: string,
    userResponse: number | string | null | undefined,
    confidence?: AssessmentConfidence,
    timeSpentSeconds?: number
  ) => void;
  submitAssessmentAttempt: (attemptId: string, isAuto?: boolean) => AssessmentScoringResult;
  activeAssessmentAttempt?: AssessmentAttempt;
}

function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type { PlacementContextType };
export const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

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
      preparationTopicProgress: loaded.preparationTopicProgress || {},
      assessmentState: loaded.assessmentState,
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
      
      if (['dashboard', 'roadmap', 'dsa', 'skills', 'practice', 'preparation', 'project', 'companies', 'analytics', 'settings', 'assessment'].includes(route)) {
        const targetId = parts[1];
        setRouteState({ route, targetId });
      } else {
        setRouteState({ route: 'dashboard' });
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setRoute = (route: RoutePath, targetId?: string) => {
    const hash = targetId ? `#/${route}/${targetId}` : `#/${route}`;
    window.location.hash = hash;
    setRouteState({ route, targetId });
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

  const activePhase = PHASES[0];

  const allTaskDefinitions = [
    ...TASK_DEFINITIONS,
    ...(appState.customTaskDefinitions || []),
  ];

  const updateTaskState = (taskId: string, newState: TaskProgress['state'], action?: TaskStateAction) => {
    setAppState((prev) => {
      const taskDef = allTaskDefinitions.find((t) => t.id === taskId);

      // Preparation → roadmap bridge seed: consulted only when the roadmap
      // topic has no skill state of its own (enforced by the EMA seed
      // precedence inside applyTaskStateUpdate).
      const bridgedPrepTopicId = taskDef
        ? getPreparationTopicIdByRoadmapId(taskDef.topicId)
        : undefined;
      const ownSkill = taskDef ? prev.skillStates[taskDef.topicId] : undefined;
      const bridgedPrepStrength =
        !ownSkill && bridgedPrepTopicId
          ? prev.skillStates[bridgedPrepTopicId]?.evidenceStrength
          : undefined;

      const { progress, evidence, skillUpdate } = applyTaskStateUpdate({
        taskId,
        newState,
        action,
        existing: prev.taskProgress[taskId],
        taskDef,
        existingSkill: ownSkill,
        bridgedPrepStrength,
        now: Date.now(),
        todayISO: getTodayISO(),
      });

      // One transaction: progress + the single evidence event + (on
      // completion) the skill update derived from that same event.
      return {
        ...prev,
        taskProgress: {
          ...prev.taskProgress,
          [taskId]: progress,
        },
        evidenceLogs: evidence ? [...(prev.evidenceLogs || []), evidence] : prev.evidenceLogs || [],
        ...(skillUpdate
          ? { skillStates: { ...prev.skillStates, [skillUpdate.topicId]: skillUpdate } }
          : {}),
      };
    });
  };

  /**
   * Single write transaction for every Today Undo. The snapshot is applied
   * verbatim — no evidence is created, no skill value is recalculated, and
   * only the task, skill topic and completion evidence named by the capture
   * are touched.
   */
  const restoreTaskTransaction = (restore: TaskStateRestore) => {
    setAppState((prev) => {
      const restored = applyTaskStateRestore(restore, {
        taskProgress: prev.taskProgress,
        skillStates: prev.skillStates,
        evidenceLogs: prev.evidenceLogs || [],
      });

      return {
        ...prev,
        taskProgress: restored.taskProgress,
        skillStates: restored.skillStates,
        evidenceLogs: restored.evidenceLogs,
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
    setAppState((prev) => ({
      ...prev,
      // The evaluator's scorePct / passed are persisted verbatim — this
      // transaction only decides where they land, it never recomputes them.
      ...applyPracticeAttempt(
        {
          practiceAttempts: prev.practiceAttempts || [],
          skillStates: prev.skillStates,
          evidenceLogs: prev.evidenceLogs || [],
        },
        attempt,
        evidenceLog
      ),
    }));
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
        [updatedSkillState.topicId]: {
          ...updatedSkillState,
          // This is the only manual writer (sole caller: SkillOverrideModal via
          // SkillsView). Stamping provenance here — rather than inferring it
          // later from `evidenceStrength > 0` — is what keeps a user rating
          // identifiable no matter what automatic evidence lands on the topic.
          manualOverride: {
            evidenceStrength: updatedSkillState.evidenceStrength,
            freshness: updatedSkillState.freshness,
            updatedAt:
              updatedSkillState.lastPracticedAt || new Date().toISOString(),
          },
        },
      },
    }));
  };

  const updatePreparationTopicProgress = (updatedProgress: PreparationTopicProgress) => {
    setAppState((prev) => ({
      ...prev,
      preparationTopicProgress: {
        ...prev.preparationTopicProgress,
        [updatedProgress.topicId]: updatedProgress,
      },
    }));
  };

  const saveCompanyOverlay = (company: CompanyOverlay) => {
    setAppState((prev) => {
      const index = prev.companyOverlays.findIndex((c) => c.id === company.id);
      // Update in place so an edit changes only the intended record and does
      // not silently reorder the list; a new id appends.
      if (index === -1) {
        return {
          ...prev,
          companyOverlays: [...prev.companyOverlays, company],
        };
      }
      const next = [...prev.companyOverlays];
      next[index] = company;
      return {
        ...prev,
        companyOverlays: next,
      };
    });
  };

  const deleteCompanyOverlay = (companyId: string) => {
    setAppState((prev) => ({
      ...prev,
      companyOverlays: prev.companyOverlays.filter((c) => c.id !== companyId),
    }));
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
      assessmentState: undefined,
    });
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(appState, null, 2);
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const result = StorageAdapter.importJSON(jsonStr);
      if (result.success && result.state) {
        setAppState({
          ...result.state,
          customTaskDefinitions: result.state.customTaskDefinitions || [],
          dsaAttempts: result.state.dsaAttempts || [],
          evidenceLogs: result.state.evidenceLogs || [],
          practiceAttempts: result.state.practiceAttempts || [],
          preparationTopicProgress: result.state.preparationTopicProgress || {},
          assessmentState: result.state.assessmentState,
        });
        return { success: true };
      }
      return { success: false, error: result.error || 'Import validation failed.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      return { success: false, error: msg };
    }
  };

  const startBaselineAssessment = (): AssessmentAttempt => {
    const newAttempt = buildBaselineAttempt();
    setAppState((prev) => {
      const existingState = prev.assessmentState ?? {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
      };
      const updatedAttempts = existingState.attempts.map((a) =>
        a.status === 'in_progress'
          ? { ...a, status: 'abandoned' as const, endedAt: new Date().toISOString() }
          : a
      );
      return {
        ...prev,
        assessmentState: {
          ...existingState,
          attempts: [...updatedAttempts, newAttempt],
        },
      };
    });
    return newAttempt;
  };

  const recordAssessmentResponse = (
    attemptId: string,
    itemId: string,
    userResponse: number | string | null | undefined,
    confidence?: AssessmentConfidence,
    timeSpentSeconds: number = 0
  ) => {
    const item = BASELINE_ASSESSMENT_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    const evaluated = evaluateItemResponse(item, userResponse, confidence, timeSpentSeconds);

    setAppState((prev) => {
      const existingState = prev.assessmentState;
      if (!existingState) return prev;

      const newResp: AssessmentResponse = {
        id: `resp-${attemptId}-${itemId}`,
        attemptId,
        itemId,
        response: userResponse !== null && userResponse !== undefined ? userResponse : 'unanswered',
        result: evaluated.result,
        timeSpentSeconds,
        errorCategories: evaluated.errorCategories,
        scoredCredit: evaluated.scoredCredit,
        weightApplied: evaluated.weightApplied,
        responseConfidence: confidence,
      };

      const otherResponses = existingState.responses.filter(
        (r) => !(r.attemptId === attemptId && r.itemId === itemId)
      );

      return {
        ...prev,
        assessmentState: {
          ...existingState,
          responses: [...otherResponses, newResp],
        },
      };
    });
  };

  const submitAssessmentAttempt = (attemptId: string, isAuto: boolean = false): AssessmentScoringResult => {
    const existingState = appState.assessmentState;
    const attempt = existingState?.attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw new Error(`Assessment attempt ${attemptId} not found`);
    }

    const terminalStatus = isAuto ? 'auto_submitted' : 'submitted';
    const attemptResponses = (existingState?.responses || []).filter((r) => r.attemptId === attemptId);

    const scoringResult = scoreAssessmentAttempt(
      attempt.status === 'in_progress' ? transitionAttempt(attempt, terminalStatus) : attempt,
      attemptResponses,
      BASELINE_ASSESSMENT_ITEMS,
      BASELINE_ASSESSMENT_DEFINITION
    );

    setAppState((prev) => {
      const curr = prev.assessmentState ?? {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [],
        snapshots: [],
        weaknessSignals: [],
        profile: { pendingSunday: false },
      };

      const updatedAttempts = curr.attempts.map((a) =>
        a.id === attemptId ? scoringResult.attempt : a
      );

      const updatedExposures = {
        ...curr.exposures,
        ...scoringResult.exposures,
      };

      const otherDomainResults = curr.domainResults.filter((dr) => dr.attemptId !== attemptId);
      const otherWeaknesses = curr.weaknessSignals.filter((ws) => !ws.sourceAttemptIds.includes(attemptId));
      const otherSnapshots = curr.snapshots.filter((s) => s.id !== scoringResult.snapshot.id);

      return {
        ...prev,
        evidenceLogs: [
          ...(prev.evidenceLogs || []),
          ...scoringResult.evidenceLogs,
        ],
        assessmentState: {
          ...curr,
          attempts: updatedAttempts,
          exposures: updatedExposures,
          domainResults: [...otherDomainResults, ...scoringResult.domainResults],
          snapshots: [...otherSnapshots, scoringResult.snapshot],
          weaknessSignals: [...otherWeaknesses, ...scoringResult.weaknessSignals],
          profile: {
            ...curr.profile,
            baselineCompletedAt: scoringResult.attempt.endedAt,
          },
        },
      };
    });

    return scoringResult;
  };

  const activeAssessmentAttempt = appState.assessmentState?.attempts.find(
    (a) => a.status === 'in_progress'
  );

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
        preparationTopicProgress: appState.preparationTopicProgress || {},
        assessmentState: appState.assessmentState,
        activePhase,
        updateTaskState,
        restoreTaskTransaction,
        commitDailyPlan,
        sealDayExecution,
        logDSAAttempt,
        recordPracticeAttempt,
        updateDSAProgress,
        updateSkillState,
        updatePreparationTopicProgress,
        saveCompanyOverlay,
        deleteCompanyOverlay,
        decomposeTask,
        resetApplicationData,
        exportBackupJSON,
        importBackupJSON,
        storageBytes: StorageAdapter.getStorageBytes(),
        startBaselineAssessment,
        recordAssessmentResponse,
        submitAssessmentAttempt,
        activeAssessmentAttempt,
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
