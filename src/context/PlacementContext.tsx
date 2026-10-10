import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
  PreparationTopic,
  PreparationTopicProgress,
  TopicStageId,
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
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import {
  StorageAdapter,
  StorageCoordinator,
  DEFAULT_USER_SETTINGS,
  type AppStorageState,
  type StorageSaveResult,
} from '../storage/storageAdapter';
import { getPreparationTopicIdByRoadmapId } from '../data/preparationDataset';
import { applyTaskStateUpdate, applyTaskStateRestore, type TaskStateAction, type TaskStateRestore } from '../engine/taskStateEngine';
import { applyPracticeAttempt } from '../engine/practiceEngine';
import { applyPreparationStageCompletion } from '../engine/preparationEngine';
import {
  buildBaselineAttempt,
  buildSundayMiniTestAttempt,
  buildFullReassessmentAttempt,
  isSundayTestEligible,
  checkSundayObligation,
  getLocalDayOfWeek,
  evaluateItemResponse,
  scoreAssessmentAttempt,
  transitionAttempt,
  isAttemptExpired,
  resetAssessmentProfileOnly as resetAssessmentProfileOnlyEngine,
  resetAssessmentHistoryOnly as resetAssessmentHistoryOnlyEngine,
  deriveAssessmentProfileReadout,
  createCompanyAssessmentOverlay,
  applyCompanyAssessmentOverlay,
  type AssessmentScoringResult,
  type AssessmentProfileReadout,
  type SundaySelectionOptions,
  type CompanyAssessmentOverlayResult,
} from '../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../data/assessment/items';
import {
  BASELINE_ASSESSMENT_DEFINITION,
  SUNDAY_MINI_TEST_DEFINITION,
  FULL_REASSESSMENT_DEFINITION,
} from '../data/assessment/definitions';

export type RoutePath = 'dashboard' | 'roadmap' | 'dsa' | 'skills' | 'practice' | 'preparation' | 'project' | 'companies' | 'analytics' | 'settings' | 'assessment' | 'interview';

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
  preparationTopics: PreparationTopic[];
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
  completePreparationStage: (topic: PreparationTopic, stage: TopicStageId) => void;
  saveCompanyOverlay: (company: CompanyOverlay) => void;
  deleteCompanyOverlay: (companyId: string) => void;
  decomposeTask: (parentTask: TaskDefinition, subtasks: TaskDefinition[]) => void;
  resetApplicationData: () => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => { success: boolean; error?: string };
  storageBytes: number;
  startBaselineAssessment: () => AssessmentAttempt;
  startSundayAssessment: (options?: Partial<SundaySelectionOptions>) => AssessmentAttempt;
  startFullReassessment: () => AssessmentAttempt;
  isSundayEligible: boolean;
  pendingSundayObligation: boolean;
  recordAssessmentResponse: (
    attemptId: string,
    itemId: string,
    userResponse: number | string | null | undefined,
    confidence?: AssessmentConfidence,
    timeSpentSeconds?: number
  ) => void;
  submitAssessmentAttempt: (attemptId: string, isAuto?: boolean) => AssessmentScoringResult;
  cancelAssessmentAttempt: (attemptId: string) => void;
  activeAssessmentAttempt?: AssessmentAttempt;
  assessmentProfileReadout: AssessmentProfileReadout;
  selectedCompanyOverlayId: string | null;
  setSelectedCompanyOverlayId: (id: string | null) => void;
  companyAssessmentOverlayResult?: CompanyAssessmentOverlayResult;
  resetAssessmentProfileOnly: () => void;
  resetAssessmentHistoryOnly: () => void;
  syncDailyAssignmentCompletion: (assignmentId: string, completed?: boolean) => void;
  persistenceError: boolean;
  storageConflict: boolean;
  resolveStorageConflict: () => void;
}

function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Seals every check-in belonging to a local calendar day strictly earlier than
 * `todayISO`.
 *
 * This is the single definition of "that day is over", shared by hydration
 * (reload) and the in-session midnight rollover, so an app left open across
 * local midnight ends in exactly the state a reload would have produced.
 *
 * Idempotent by construction:
 * - an already-sealed check-in is returned untouched (never re-stamped),
 * - no record is ever added, removed or duplicated, and
 * - when nothing qualifies the *same array reference* comes back, so callers
 *   can bail out of the state update entirely. Repeated interval ticks
 *   therefore neither re-seal nor write to storage.
 *
 * Both timestamps are stamped from the same clock reads the reload path has
 * always used; only `todayISO` (a local `YYYY-MM-DD` string) decides eligibility.
 */
function sealStaleCheckIns(checkIns: DailyCheckIn[], todayISO: string): DailyCheckIn[] {
  let changed = false;
  const next = checkIns.map((ci) => {
    if (ci.date >= todayISO || ci.isSealed) return ci;
    changed = true;
    return {
      ...ci,
      isSealed: true,
      sealedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  return changed ? next : checkIns;
}

export type { PlacementContextType };
export const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export const PlacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routeState, setRouteState] = useState<RouteState>({ route: 'dashboard' });
  const [todayDate, setTodayDate] = useState<string>(getTodayISO);

  // Hydrate state safely from StorageAdapter
  const [appState, setAppState] = useState<AppExtendedStorageState>(() => {
    const loaded = StorageAdapter.loadState() as AppExtendedStorageState;
    const initialToday = getTodayISO();
    // Same rule the in-session rollover uses, so a reload and an open app
    // crossing local midnight seal exactly the same records.
    const updatedCheckIns = sealStaleCheckIns(loaded.dailyCheckIns || [], initialToday);

    let updatedAssessmentState = loaded.assessmentState;
    if (updatedAssessmentState && updatedAssessmentState.attempts) {
      let hasModified = false;
      const updatedAttempts = updatedAssessmentState.attempts.map((att) => {
        if (att.status === 'in_progress' && isAttemptExpired(att)) {
          hasModified = true;
          return transitionAttempt(att, 'abandoned');
        }
        return att;
      });
      if (hasModified) {
        updatedAssessmentState = { ...updatedAssessmentState, attempts: updatedAttempts };
      }
    }

    return {
      ...loaded,
      dailyCheckIns: updatedCheckIns,
      customTaskDefinitions: loaded.customTaskDefinitions || [],
      dsaAttempts: loaded.dsaAttempts || [],
      evidenceLogs: loaded.evidenceLogs || [],
      practiceAttempts: loaded.practiceAttempts || [],
      preparationTopicProgress: loaded.preparationTopicProgress || {},
      assessmentState: updatedAssessmentState,
    };
  });

  const [persistenceError, setPersistenceError] = useState<boolean>(false);
  const [storageConflict, setStorageConflict] = useState<boolean>(false);
  const currentRevisionRef = useRef<number>(appState.storageRevision ?? 1);

  // Cross-tab storage conflict detection via native StorageEvent
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== 'placementos_v1_state' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        const incomingRevision = typeof parsed.storageRevision === 'number' ? parsed.storageRevision : undefined;
        if (incomingRevision !== undefined) {
          if (incomingRevision > currentRevisionRef.current) {
            setStorageConflict(true);
          }
        } else {
          // Legacy external write from another tab
          setStorageConflict(true);
        }
      } catch {
        setStorageConflict(true);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  useEffect(() => {
    if (storageConflict) {
      // Tab is known to be stale: do NOT overwrite newer data in storage
      return;
    }

    const handleSaveResult = (result: StorageSaveResult) => {
      if (!result.success) {
        if (result.conflict) {
          setStorageConflict(true);
          setPersistenceError(false);
        } else {
          setPersistenceError(true);
        }
      } else {
        if (result.persistedRevision !== undefined) {
          currentRevisionRef.current = result.persistedRevision;
        }
        setPersistenceError(false);
        setStorageConflict((prev) => (prev ? true : false));
      }
    };

    if (StorageCoordinator.isWebLocksSupported()) {
      let isCurrent = true;
      StorageAdapter.saveStateCoordinated(appState, {
        expectedRevision: currentRevisionRef.current,
      })
        .then((result) => {
          if (isCurrent) {
            handleSaveResult(result);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setPersistenceError(true);
          }
        });
      return () => {
        isCurrent = false;
      };
    } else {
      try {
        const result = StorageAdapter.saveStateDetailed(appState, {
          expectedRevision: currentRevisionRef.current,
        });
        if (result.persistedRevision !== undefined) {
          currentRevisionRef.current = result.persistedRevision;
        }
        if (result.success) {
          queueMicrotask(() => {
            setPersistenceError(false);
            setStorageConflict((prev) => (prev ? true : false));
          });
        } else {
          queueMicrotask(() => {
            if (result.conflict) {
              setStorageConflict(true);
              setPersistenceError(false);
            } else {
              setPersistenceError(true);
            }
          });
        }
      } catch {
        queueMicrotask(() => {
          setPersistenceError(true);
        });
      }
    }
  }, [appState, storageConflict]);





  // Periodically check local calendar date rollover (e.g. crossing midnight)
  useEffect(() => {
    const checkDateRollover = () => {
      const current = getTodayISO();

      // Guard against stale write if storage was modified externally while idle
      const persistedRev = StorageAdapter.getPersistedRevision();
      if (persistedRev !== null && persistedRev > currentRevisionRef.current) {
        setStorageConflict(true);
        return;
      }

      if (storageConflict) {
        return;
      }

      // F-INTEG-MIDNIGHT-SEAL: seal the previous local day's check-in *before*
      // "today" advances, so an app left open across local midnight persists the
      // same sealed state a reload would have produced, instead of waiting for
      // the next reload to run the hydration pass above.
      setAppState((prev) => {
        const dailyCheckIns = sealStaleCheckIns(prev.dailyCheckIns, current);
        if (dailyCheckIns === prev.dailyCheckIns) return prev;
        return { ...prev, dailyCheckIns };
      });

      setTodayDate((prev) => (prev !== current ? current : prev));
    };

    const interval = setInterval(checkDateRollover, 60000);
    window.addEventListener('focus', checkDateRollover);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDateRollover);
    };
  }, [storageConflict]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').toLowerCase();
      const parts = hash.split('/');
      const route = parts[0] as RoutePath;
      
      if (['dashboard', 'roadmap', 'dsa', 'skills', 'practice', 'preparation', 'project', 'companies', 'analytics', 'settings', 'assessment', 'interview'].includes(route)) {
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

      // Update daily task assignments if mapped to this task and day is unsealed
      const todayISO = getTodayISO();
      const todayCheckIn = prev.dailyCheckIns.find((c) => c.date === todayISO);
      const isSealed = todayCheckIn?.isSealed ?? false;

      let updatedAssignments = prev.dailyTaskAssignments;
      if (!isSealed && newState === 'completed') {
        let hasChanges = false;
        const nextAssignments = prev.dailyTaskAssignments.map((a) => {
          if (a.date === todayISO && a.referenceId === taskId && !a.completed) {
            hasChanges = true;
            return { ...a, completed: true };
          }
          return a;
        });
        if (hasChanges) {
          updatedAssignments = nextAssignments;
        }
      }

      // One transaction: progress + the single evidence event + (on
      // completion) the skill update derived from that same event + assignment synchronization.
      return {
        ...prev,
        taskProgress: {
          ...prev.taskProgress,
          [taskId]: progress,
        },
        dailyTaskAssignments: updatedAssignments,
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

      const todayISO = getTodayISO();
      const todayCheckIn = prev.dailyCheckIns.find((c) => c.date === todayISO);
      const isSealed = todayCheckIn?.isSealed ?? false;

      let updatedAssignments = prev.dailyTaskAssignments;
      if (!isSealed && restore.taskId) {
        let hasChanges = false;
        const nextAssignments = prev.dailyTaskAssignments.map((a) => {
          if (a.date === todayISO && a.referenceId === restore.taskId && a.completed) {
            hasChanges = true;
            return { ...a, completed: false };
          }
          return a;
        });
        if (hasChanges) {
          updatedAssignments = nextAssignments;
        }
      }

      return {
        ...prev,
        taskProgress: restored.taskProgress,
        dailyTaskAssignments: updatedAssignments,
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

      const todayISO = getTodayISO();
      const todayCheckIn = prev.dailyCheckIns.find((c) => c.date === todayISO);
      const isSealed = todayCheckIn?.isSealed ?? false;

      let updatedAssignments = prev.dailyTaskAssignments;
      if (!isSealed) {
        let hasChanges = false;
        const nextAssignments = prev.dailyTaskAssignments.map((a) => {
          if (a.date === todayISO && a.referenceId === attempt.problemId && !a.completed) {
            hasChanges = true;
            return { ...a, completed: true };
          }
          return a;
        });
        if (hasChanges) {
          updatedAssignments = nextAssignments;
        }
      }

      return {
        ...prev,
        dsaAttempts: [attempt, ...(prev.dsaAttempts || [])],
        dailyTaskAssignments: updatedAssignments,
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

  const completePreparationStage = (topic: PreparationTopic, stage: TopicStageId) => {
    setAppState((prev) => {
      const existingProg = prev.preparationTopicProgress[topic.id];
      const existingSkill = prev.skillStates[topic.id];
      const nowISO = new Date().toISOString();

      const { progress, evidence, skillUpdate } = applyPreparationStageCompletion({
        topic,
        stage,
        existingProgress: existingProg,
        existingSkill,
        nowISO,
      });

      if (!evidence) {
        return prev;
      }

      return {
        ...prev,
        preparationTopicProgress: {
          ...prev.preparationTopicProgress,
          [topic.id]: progress,
        },
        evidenceLogs: [...(prev.evidenceLogs || []), evidence],
        ...(skillUpdate
          ? {
              skillStates: {
                ...prev.skillStates,
                [topic.id]: skillUpdate,
              },
            }
          : {}),
      };
    });
  };

  const syncDailyAssignmentCompletion = (assignmentId: string, completed: boolean = true) => {
    setAppState((prev) => {
      const targetAssign = prev.dailyTaskAssignments.find((a) => a.id === assignmentId);
      if (!targetAssign) return prev;
      const targetCheckIn = prev.dailyCheckIns.find((c) => c.date === targetAssign.date);
      if (targetCheckIn?.isSealed) return prev; // IMMUTABILITY: Never mutate sealed day!
      if (targetAssign.completed === completed) return prev;

      return {
        ...prev,
        dailyTaskAssignments: prev.dailyTaskAssignments.map((a) =>
          a.id === assignmentId ? { ...a, completed } : a
        ),
      };
    });
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
    currentRevisionRef.current = defaults.storageRevision ?? 1;
    setAppState({
      ...defaults,
      customTaskDefinitions: [],
      dsaAttempts: [],
      evidenceLogs: [],
      practiceAttempts: [],
      assessmentState: undefined,
    });
    setStorageConflict(false);
    setPersistenceError(false);
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(appState, null, 2);
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const result = StorageAdapter.importJSON(jsonStr);
      if (result.success && result.state) {
        currentRevisionRef.current = result.state.storageRevision ?? 1;
        setAppState({
          ...result.state,
          customTaskDefinitions: result.state.customTaskDefinitions || [],
          dsaAttempts: result.state.dsaAttempts || [],
          evidenceLogs: result.state.evidenceLogs || [],
          practiceAttempts: result.state.practiceAttempts || [],
          preparationTopicProgress: result.state.preparationTopicProgress || {},
          assessmentState: result.state.assessmentState,
        });
        setStorageConflict(false);
        setPersistenceError(false);
        return { success: true };
      }
      return { success: false, error: result.error || 'Import validation failed.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      return { success: false, error: msg };
    }
  };

  const resolveStorageConflict = () => {
    const freshState = StorageAdapter.loadState() as AppExtendedStorageState;
    currentRevisionRef.current = freshState.storageRevision ?? 1;
    setAppState({
      ...freshState,
      customTaskDefinitions: freshState.customTaskDefinitions || [],
      dsaAttempts: freshState.dsaAttempts || [],
      evidenceLogs: freshState.evidenceLogs || [],
      practiceAttempts: freshState.practiceAttempts || [],
      preparationTopicProgress: freshState.preparationTopicProgress || {},
      assessmentState: freshState.assessmentState,
    });
    setStorageConflict(false);
    setPersistenceError(false);
  };

  const startBaselineAssessment = (seed: string = 'baseline-diagnostic-attempt'): AssessmentAttempt => {
    const newAttempt = buildBaselineAttempt(BASELINE_ASSESSMENT_DEFINITION, seed);
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

  const startSundayAssessment = (options?: Partial<SundaySelectionOptions>): AssessmentAttempt => {
    if (!isSundayTestEligible(appState.assessmentState)) {
      throw new Error('Baseline diagnostic assessment must be completed before starting Sunday mini test.');
    }
    const { attempt } = buildSundayMiniTestAttempt(appState.assessmentState!, options);
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
          attempts: [...updatedAttempts, attempt],
        },
      };
    });
    return attempt;
  };

  const startFullReassessment = (seed: string = 'full-reassessment-diagnostic-attempt'): AssessmentAttempt => {
    const attempt = buildFullReassessmentAttempt(appState.assessmentState, seed);
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
          attempts: [...updatedAttempts, attempt],
        },
      };
    });
    return attempt;
  };

  const recordAssessmentResponse = (
    attemptId: string,
    itemId: string,
    userResponse: number | string | null | undefined,
    confidence?: AssessmentConfidence,
    timeSpentSeconds: number = 0
  ) => {
    const activeAttempt = appState.assessmentState?.attempts.find((a) => a.id === attemptId);
    if (!activeAttempt || activeAttempt.status !== 'in_progress') {
      return;
    }

    const item = BASELINE_ASSESSMENT_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    const evaluated = evaluateItemResponse(item, userResponse, confidence, timeSpentSeconds);

    setAppState((prev) => {
      const existingState = prev.assessmentState;
      if (!existingState) return prev;

      const attempt = existingState.attempts.find((a) => a.id === attemptId);
      if (!attempt || attempt.status !== 'in_progress') {
        return prev;
      }

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
        executionResult: evaluated.executionResult,
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
    if (attempt.status !== 'in_progress') {
      throw new Error(`Cannot submit assessment attempt ${attemptId} with status "${attempt.status}"`);
    }

    const terminalStatus = isAuto ? 'auto_submitted' : 'submitted';
    const attemptResponses = (existingState?.responses || []).filter((r) => r.attemptId === attemptId);

    const isWeekly = attempt.kind === 'weekly_assessment';
    const isFullReassessment = attempt.kind === 'full_reassessment';
    const definition = isWeekly
      ? SUNDAY_MINI_TEST_DEFINITION
      : isFullReassessment
      ? FULL_REASSESSMENT_DEFINITION
      : BASELINE_ASSESSMENT_DEFINITION;

    const scoringResult = scoreAssessmentAttempt(
      attempt.status === 'in_progress' ? transitionAttempt(attempt, terminalStatus) : attempt,
      attemptResponses,
      BASELINE_ASSESSMENT_ITEMS,
      definition,
      existingState?.exposures,
      existingState?.weaknessSignals,
      existingState?.domainResults,
      appState.evidenceLogs
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
          calibrationObservations: [
            ...(curr.calibrationObservations || []),
            ...(scoringResult.calibrationObservations || []),
          ],
          executionRecords: [
            ...(curr.executionRecords || []),
            ...(scoringResult.executionRecords || []),
          ],
          profile: {
            ...curr.profile,
            baselineCompletedAt: scoringResult.attempt.kind === 'diagnostic_assessment' ? scoringResult.attempt.endedAt : curr.profile.baselineCompletedAt,
            lastSundayAt: scoringResult.attempt.kind === 'weekly_assessment' ? scoringResult.attempt.endedAt : curr.profile.lastSundayAt,
            pendingSunday: scoringResult.attempt.kind === 'weekly_assessment' ? false : curr.profile.pendingSunday,
            nextReassessmentSuggestedAt:
              scoringResult.attempt.kind === 'full_reassessment' || scoringResult.attempt.kind === 'diagnostic_assessment'
                ? new Date(new Date(scoringResult.attempt.endedAt || Date.now()).getTime() + 42 * 24 * 60 * 60 * 1000).toISOString()
                : curr.profile.nextReassessmentSuggestedAt,
          },
        },
      };
    });

    return scoringResult;
  };

  const cancelAssessmentAttempt = (attemptId: string) => {
    setAppState((prev) => {
      const curr = prev.assessmentState;
      if (!curr) return prev;

      const attempt = curr.attempts.find((a) => a.id === attemptId);
      if (!attempt || attempt.status !== 'in_progress') return prev;

      // Remove all responses for this attempt
      const otherResponses = curr.responses.filter((r) => r.attemptId !== attemptId);

      // Remove the attempt from the attempts array (discard it entirely)
      const otherAttempts = curr.attempts.filter((a) => a.id !== attemptId);

      return {
        ...prev,
        assessmentState: {
          ...curr,
          attempts: otherAttempts,
          responses: otherResponses,
        },
      };
    });
  };

  const activeAssessmentAttempt = appState.assessmentState?.attempts.find(
    (a) => a.status === 'in_progress'
  );

  const isSundayEligible = useMemo(() => {
    return isSundayTestEligible(appState.assessmentState);
  }, [appState.assessmentState]);

  const pendingSundayObligation = useMemo(() => {
    return checkSundayObligation(appState.assessmentState, todayDate).pendingSunday;
  }, [appState.assessmentState, todayDate]);

  // Persist the Sunday obligation latch (§18: a missed Sunday rolls forward as a
  // single obligation) instead of writing it from an effect.
  //
  // The condition is derived entirely from values already in scope for this
  // render, and the update is applied during render guarded so it happens
  // exactly once: `profile.pendingSunday` flips to true, the guard goes false,
  // and the render settles. Same inputs and same result as the former
  // setState-in-effect, but without a cascading post-commit render.
  const isSundayToday = getLocalDayOfWeek(todayDate) === 0;
  const completedWeeklyToday = (appState.assessmentState?.attempts || []).some(
    (a) =>
      a.kind === 'weekly_assessment' &&
      (a.status === 'submitted' || a.status === 'auto_submitted') &&
      a.endedAt?.startsWith(todayDate)
  );
  const needsSundayLatch =
    isSundayEligible &&
    Boolean(appState.assessmentState) &&
    !appState.assessmentState?.profile?.pendingSunday &&
    isSundayToday &&
    !completedWeeklyToday;

  if (needsSundayLatch) {
    setAppState((prev) => {
      if (!prev.assessmentState || prev.assessmentState.profile?.pendingSunday) return prev;
      return {
        ...prev,
        assessmentState: {
          ...prev.assessmentState,
          profile: {
            ...prev.assessmentState.profile,
            pendingSunday: true,
          },
        },
      };
    });
  }

  const assessmentProfileReadout = useMemo(() => {
    return deriveAssessmentProfileReadout(appState.assessmentState);
  }, [appState.assessmentState]);

  const [selectedCompanyOverlayId, setSelectedCompanyOverlayId] = useState<string | null>(null);

  const companyAssessmentOverlayResult = useMemo(() => {
    if (!selectedCompanyOverlayId) return undefined;
    const comp = (appState.companyOverlays || []).find((c) => c.id === selectedCompanyOverlayId);
    if (!comp) return undefined;
    try {
      const overlay = createCompanyAssessmentOverlay(comp);
      return applyCompanyAssessmentOverlay(assessmentProfileReadout, overlay);
    } catch {
      return undefined;
    }
  }, [selectedCompanyOverlayId, appState.companyOverlays, assessmentProfileReadout]);

  const resetAssessmentProfileOnly = () => {
    setAppState((prev) => ({
      ...prev,
      assessmentState: resetAssessmentProfileOnlyEngine(prev.assessmentState),
    }));
  };

  const resetAssessmentHistoryOnly = () => {
    setAppState((prev) => ({
      ...prev,
      assessmentState: resetAssessmentHistoryOnlyEngine(),
    }));
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
        preparationTopics: PREPARATION_TOPICS,
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
        completePreparationStage,
        saveCompanyOverlay,
        deleteCompanyOverlay,
        decomposeTask,
        resetApplicationData,
        exportBackupJSON,
        importBackupJSON,
        storageBytes: StorageAdapter.getStorageBytes(),
        startBaselineAssessment,
        startSundayAssessment,
        startFullReassessment,
        isSundayEligible,
        pendingSundayObligation,
        recordAssessmentResponse,
        submitAssessmentAttempt,
        cancelAssessmentAttempt,
        activeAssessmentAttempt,
        assessmentProfileReadout,
        selectedCompanyOverlayId,
        setSelectedCompanyOverlayId,
        companyAssessmentOverlayResult,
        resetAssessmentProfileOnly,
        resetAssessmentHistoryOnly,
        syncDailyAssignmentCompletion,
        persistenceError,
        storageConflict,
        resolveStorageConflict,
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
