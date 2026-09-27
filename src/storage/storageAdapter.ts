import type {
  TaskProgress,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  DailyCheckIn,
  DailyTaskAssignment,
  PlacementMode,
  UserSettings,
  PracticeAttempt,
  PreparationTopicProgress,
  DSAAttempt,
  EvidenceLog,
  TaskDefinition,
} from '../types';
import {
  TASK_PROGRESS,
  INITIAL_DSA_PROGRESS,
  INITIAL_SKILL_STATES,
  COMPANY_OVERLAYS,
} from '../data/seedData';

const STORAGE_KEY = 'placementos_v1_state';
const CURRENT_SCHEMA_VERSION = '1.0.0';
const CURRENT_APP_VERSION = '1.0.0';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  placementHorizonDate: '2027-05-31',
  targetPlacementGoal: 'Software Engineer (SDE-1)',
  targetPhaseId: 'phase-1',
  dailyStudyMinutes: 120,
  dsaDailyCap: 5,
  placementMode: 'normal',
  theme: 'dark',
  densityMode: 'compact',
  showExplanationTooltips: true,
  dailyCheckInReminder: true,
  reminderTime: '20:00',
};

export interface AppStorageState {
  schemaVersion: string;
  appVersion: string;
  lastSavedAt: string;
  currentMode: PlacementMode;
  userSettings: UserSettings;
  taskProgress: Record<string, TaskProgress>;
  dsaProgress: Record<string, DSAProgress>;
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  dailyCheckIns: DailyCheckIn[];
  dailyTaskAssignments: DailyTaskAssignment[];
  practiceAttempts?: PracticeAttempt[];
  preparationTopicProgress: Record<string, PreparationTopicProgress>;
}

/** Extended state with additional runtime fields */
export interface AppExtendedStorageState extends AppStorageState {
  customTaskDefinitions?: TaskDefinition[];
  dsaAttempts?: DSAAttempt[];
  evidenceLogs?: EvidenceLog[];
}

/**
 * Creates default seed state object when no local storage state exists.
 */
export function getDefaultStorageState(): AppStorageState {
  const taskProgressMap: Record<string, TaskProgress> = {};
  TASK_PROGRESS.forEach((tp) => {
    taskProgressMap[tp.taskId] = tp;
  });

  const dsaProgressMap: Record<string, DSAProgress> = {};
  INITIAL_DSA_PROGRESS.forEach((dp) => {
    dsaProgressMap[dp.problemId] = dp;
  });

  const skillStateMap: Record<string, TopicSkillState> = {};
  INITIAL_SKILL_STATES.forEach((sk) => {
    skillStateMap[sk.topicId] = sk;
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: CURRENT_APP_VERSION,
    lastSavedAt: new Date().toISOString(),
    currentMode: 'normal',
    userSettings: DEFAULT_USER_SETTINGS,
    taskProgress: taskProgressMap,
    dsaProgress: dsaProgressMap,
    skillStates: skillStateMap,
    companyOverlays: COMPANY_OVERLAYS,
    dailyCheckIns: [],
    dailyTaskAssignments: [],
    practiceAttempts: [],
    preparationTopicProgress: {},
  };
}

/**
 * Lenient validation for loadState - allows missing optional fields,
 * only checks bare minimum required for safe merging with defaults.
 */
export function validateStorageState(data: unknown): data is Partial<AppExtendedStorageState> {
  if (!data || typeof data !== 'object') return false;
  const state = data as Partial<AppExtendedStorageState>;

  // Required top-level fields for safe merging
  if (typeof state.schemaVersion !== 'string') return false;
  // Accept current or older schema versions for backward compatibility

  if (!state.taskProgress || typeof state.taskProgress !== 'object') return false;
  if (!state.dsaProgress || typeof state.dsaProgress !== 'object') return false;
  if (!state.skillStates || typeof state.skillStates !== 'object') return false;
  if (!Array.isArray(state.companyOverlays)) return false;

  // Optional arrays/objects - if present, must be correct type
  if (state.dailyCheckIns !== undefined && !Array.isArray(state.dailyCheckIns)) return false;
  if (state.dailyTaskAssignments !== undefined && !Array.isArray(state.dailyTaskAssignments)) return false;
  if (state.preparationTopicProgress !== undefined && typeof state.preparationTopicProgress !== 'object') return false;
  if (state.practiceAttempts !== undefined && !Array.isArray(state.practiceAttempts)) return false;
  if (state.dsaAttempts !== undefined && !Array.isArray(state.dsaAttempts)) return false;
  if (state.evidenceLogs !== undefined && !Array.isArray(state.evidenceLogs)) return false;
  if (state.customTaskDefinitions !== undefined && !Array.isArray(state.customTaskDefinitions)) return false;

  // userSettings is optional for lenient validation - will be merged with defaults
  if (state.userSettings !== undefined && typeof state.userSettings !== 'object') return false;

  // appVersion, lastSavedAt, currentMode - if present, must be string
  if (state.appVersion !== undefined && typeof state.appVersion !== 'string') return false;
  if (state.lastSavedAt !== undefined && typeof state.lastSavedAt !== 'string') return false;
  if (state.currentMode !== undefined && typeof state.currentMode !== 'string') return false;

  return true;
}

/**
 * Strict validation for imports - requires all AppStorageState fields,
 * validates nested structures and field types thoroughly.
 */
export function validateImportState(data: unknown): data is AppExtendedStorageState {
  if (!data || typeof data !== 'object') return false;
  const state = data as Partial<AppExtendedStorageState>;

  // Required top-level fields
  if (typeof state.schemaVersion !== 'string') return false;
  if (state.schemaVersion !== CURRENT_SCHEMA_VERSION) return false; // Only accept current version

  if (!state.userSettings || typeof state.userSettings !== 'object') return false;
  if (!validateUserSettings(state.userSettings)) return false;

  if (!state.taskProgress || typeof state.taskProgress !== 'object') return false;
  if (!validateTaskProgress(state.taskProgress)) return false;

  if (!state.dsaProgress || typeof state.dsaProgress !== 'object') return false;
  if (!validateDSAProgress(state.dsaProgress)) return false;

  if (!state.skillStates || typeof state.skillStates !== 'object') return false;
  if (!validateSkillStates(state.skillStates)) return false;

  if (!Array.isArray(state.companyOverlays)) return false;
  if (!validateCompanyOverlays(state.companyOverlays)) return false;

  if (!Array.isArray(state.dailyCheckIns)) return false;
  if (!validateDailyCheckIns(state.dailyCheckIns)) return false;

  if (!Array.isArray(state.dailyTaskAssignments)) return false;
  if (!validateDailyTaskAssignments(state.dailyTaskAssignments)) return false;

  if (state.preparationTopicProgress !== undefined) {
    if (typeof state.preparationTopicProgress !== 'object') return false;
    if (!validatePreparationTopicProgress(state.preparationTopicProgress)) return false;
  }

  if (state.practiceAttempts !== undefined) {
    if (!Array.isArray(state.practiceAttempts)) return false;
    for (const attempt of state.practiceAttempts) {
      if (!attempt || typeof attempt !== 'object') return false;
      if (typeof attempt.id !== 'string') return false;
      if (typeof attempt.sessionId !== 'string') return false;
      if (typeof attempt.date !== 'string') return false;
      if (typeof attempt.completedAt !== 'string') return false;
    }
  }

  if (state.dsaAttempts !== undefined) {
    if (!Array.isArray(state.dsaAttempts)) return false;
    for (const attempt of state.dsaAttempts) {
      if (!attempt || typeof attempt !== 'object') return false;
      if (typeof attempt.id !== 'string') return false;
      if (typeof attempt.problemId !== 'string') return false;
      if (typeof attempt.date !== 'string') return false;
      if (typeof attempt.result !== 'string') return false;
      if (typeof attempt.assistanceLevel !== 'string') return false;
      if (typeof attempt.timeTakenMinutes !== 'number') return false;
    }
  }

  if (state.evidenceLogs !== undefined) {
    if (!Array.isArray(state.evidenceLogs)) return false;
    for (const log of state.evidenceLogs) {
      if (!log || typeof log !== 'object') return false;
      if (typeof log.id !== 'string') return false;
      if (typeof log.topicId !== 'string') return false;
      if (typeof log.domainId !== 'string') return false;
      if (typeof log.score !== 'number') return false;
      if (typeof log.confidence !== 'number') return false;
      if (typeof log.timestamp !== 'string') return false;
      if (typeof log.sourceType !== 'string') return false;
      if (typeof log.sourceId !== 'string') return false;
    }
  }

  if (state.customTaskDefinitions !== undefined) {
    if (!Array.isArray(state.customTaskDefinitions)) return false;
    for (const task of state.customTaskDefinitions) {
      if (!task || typeof task !== 'object') return false;
      if (typeof task.id !== 'string') return false;
      if (typeof task.title !== 'string') return false;
      if (typeof task.domainId !== 'string') return false;
      if (typeof task.topicId !== 'string') return false;
      if (typeof task.phaseId !== 'string') return false;
      if (typeof task.estimatedMinutes !== 'number') return false;
      if (typeof task.importance !== 'number') return false;
      if (typeof task.taskType !== 'string') return false;
      if (typeof task.createdAt !== 'string') return false;
    }
  }

  // appVersion and lastSavedAt are validated as strings if present
  if (state.appVersion !== undefined && typeof state.appVersion !== 'string') return false;
  if (state.lastSavedAt !== undefined && typeof state.lastSavedAt !== 'string') return false;
  if (state.currentMode !== undefined && typeof state.currentMode !== 'string') return false;

  return true;
}

function validateUserSettings(settings: unknown): settings is UserSettings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Partial<UserSettings>;
  return (
    typeof s.placementHorizonDate === 'string' &&
    typeof s.targetPlacementGoal === 'string' &&
    typeof s.targetPhaseId === 'string' &&
    typeof s.dailyStudyMinutes === 'number' &&
    typeof s.dsaDailyCap === 'number' &&
    typeof s.placementMode === 'string' &&
    typeof s.theme === 'string' &&
    typeof s.densityMode === 'string' &&
    typeof s.showExplanationTooltips === 'boolean' &&
    typeof s.dailyCheckInReminder === 'boolean' &&
    typeof s.reminderTime === 'string'
  );
}

function validateTaskProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const tp = value as Partial<TaskProgress>;
    if (typeof tp.taskId !== 'string') return false;
    if (typeof tp.state !== 'string') return false;
    if (!['not_started', 'in_progress', 'completed', 'archived'].includes(tp.state)) return false;
    if (typeof tp.postponeCount !== 'number') return false;
    if (typeof tp.skipCount !== 'number') return false;
    if (typeof tp.timeSpentMinutes !== 'number') return false;
    if (typeof tp.updatedAt !== 'string') return false;
    if (tp.postponedUntil !== undefined && typeof tp.postponedUntil !== 'string') return false;
    if (tp.lastCompletedAt !== undefined && typeof tp.lastCompletedAt !== 'string') return false;
  }
  return true;
}

function validateDSAProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const dp = value as Partial<DSAProgress>;
    if (typeof dp.problemId !== 'string') return false;
    if (typeof dp.currentBox !== 'number') return false;
    if (dp.currentBox < 1 || dp.currentBox > 4) return false;
    if (typeof dp.attemptCount !== 'number') return false;
    if (typeof dp.createdAt !== 'string') return false;
    if (typeof dp.updatedAt !== 'string') return false;
    // Optional fields - just check types if present
    if (dp.nextReviewAt !== undefined && typeof dp.nextReviewAt !== 'string') return false;
    if (dp.lastAttemptAt !== undefined && typeof dp.lastAttemptAt !== 'string') return false;
    if (dp.totalAttempts !== undefined && typeof dp.totalAttempts !== 'number') return false;
    if (dp.successfulAttempts !== undefined && typeof dp.successfulAttempts !== 'number') return false;
    if (dp.passedIndependently !== undefined && typeof dp.passedIndependently !== 'boolean') return false;
    if (dp.consecutiveAssistedPasses !== undefined && typeof dp.consecutiveAssistedPasses !== 'number') return false;
    if (dp.assistedProvisional !== undefined && typeof dp.assistedProvisional !== 'boolean') return false;
    if (dp.consecutiveFailures !== undefined && typeof dp.consecutiveFailures !== 'number') return false;
    if (dp.remediationRequired !== undefined && typeof dp.remediationRequired !== 'boolean') return false;
    if (dp.patternLessonViewed !== undefined && typeof dp.patternLessonViewed !== 'boolean') return false;
    if (dp.patternLessonCompleted !== undefined && typeof dp.patternLessonCompleted !== 'boolean') return false;
    if (dp.remediationSelfCheckPassed !== undefined && typeof dp.remediationSelfCheckPassed !== 'boolean') return false;
    if (dp.evidenceStrength !== undefined && typeof dp.evidenceStrength !== 'number') return false;
    if (dp.notes !== undefined && typeof dp.notes !== 'string') return false;
  }
  return true;
}

function validateSkillStates(states: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(states)) {
    if (!value || typeof value !== 'object') return false;
    const ss = value as Partial<TopicSkillState>;
    if (typeof ss.topicId !== 'string') return false;
    if (typeof ss.domainId !== 'string') return false;
    if (typeof ss.freshness !== 'string') return false;
    if (!['untested', 'fresh', 'aging', 'stale'].includes(ss.freshness)) return false;
    if (typeof ss.evidenceStrength !== 'number') return false;
    if (ss.lastPracticedAt !== undefined && typeof ss.lastPracticedAt !== 'string') return false;
  }
  return true;
}

function validateCompanyOverlays(overlays: unknown[]): boolean {
  for (const overlay of overlays) {
    if (!overlay || typeof overlay !== 'object') return false;
    const co = overlay as Partial<CompanyOverlay>;
    if (typeof co.id !== 'string') return false;
    if (typeof co.companyName !== 'string') return false;
    if (typeof co.targetRole !== 'string') return false;
    if (typeof co.applicationStatus !== 'string') return false;
    if (!['target', 'applied', 'oa_scheduled', 'interview_scheduled', 'rejected', 'offered', 'archived'].includes(co.applicationStatus)) return false;
    if (!Array.isArray(co.requiredDomains)) return false;
    if (!Array.isArray(co.requiredTopics)) return false;
    if (!Array.isArray(co.requiredLanguages)) return false;
    if (co.eventDate !== undefined && typeof co.eventDate !== 'string') return false;
  }
  return true;
}

function validateDailyCheckIns(checkIns: unknown[]): boolean {
  for (const ci of checkIns) {
    if (!ci || typeof ci !== 'object') return false;
    const dci = ci as Partial<DailyCheckIn>;
    if (typeof dci.id !== 'string') return false;
    if (typeof dci.date !== 'string') return false;
    if (typeof dci.mode !== 'string') return false;
    if (typeof dci.availableMinutes !== 'number') return false;
    if (typeof dci.energyLevel !== 'string') return false;
    if (!['low', 'medium', 'high'].includes(dci.energyLevel)) return false;
    if (!Array.isArray(dci.assignmentIds)) return false;
    if (typeof dci.totalActualMinutes !== 'number') return false;
    if (typeof dci.isSealed !== 'boolean') return false;
    if (typeof dci.createdAt !== 'string') return false;
    if (typeof dci.updatedAt !== 'string') return false;
    if (dci.notes !== undefined && typeof dci.notes !== 'string') return false;
    if (dci.sealedAt !== undefined && typeof dci.sealedAt !== 'string') return false;
  }
  return true;
}

function validateDailyTaskAssignments(assignments: unknown[]): boolean {
  for (const a of assignments) {
    if (!a || typeof a !== 'object') return false;
    const dta = a as Partial<DailyTaskAssignment>;
    if (typeof dta.id !== 'string') return false;
    if (typeof dta.date !== 'string') return false;
    if (typeof dta.taskType !== 'string') return false;
    if (!['catalog_task', 'dsa_review', 'dsa_new'].includes(dta.taskType)) return false;
    if (typeof dta.referenceId !== 'string') return false;
    if (typeof dta.allocatedMinutes !== 'number') return false;
    if (typeof dta.completed !== 'boolean') return false;
    if (dta.actualMinutes !== undefined && typeof dta.actualMinutes !== 'number') return false;
  }
  return true;
}

function validatePreparationTopicProgress(progress: Record<string, unknown>): boolean {
  for (const [, value] of Object.entries(progress)) {
    if (!value || typeof value !== 'object') return false;
    const ptp = value as Partial<PreparationTopicProgress>;
    if (typeof ptp.topicId !== 'string') return false;
    if (typeof ptp.sectionId !== 'string') return false;
    if (typeof ptp.domainId !== 'string') return false;
    if (typeof ptp.currentStage !== 'string') return false;
    if (!Array.isArray(ptp.completedStages)) return false;
    if (typeof ptp.stageProgress !== 'object') return false;
    if (typeof ptp.lastAccessedAt !== 'string') return false;
    if (typeof ptp.totalTimeSpentMinutes !== 'number') return false;
    if (typeof ptp.evidenceStrength !== 'number') return false;
    if (typeof ptp.freshness !== 'string') return false;
    if (typeof ptp.createdAt !== 'string') return false;
    if (typeof ptp.updatedAt !== 'string') return false;
  }
  return true;
}

/**
 * LocalStorage Adapter offering safe serialization, hydration, export, and reset capabilities.
 */
export const StorageAdapter = {
  /**
   * Reads and hydrates user state from browser localStorage.
   * Falls back gracefully to baseline seed defaults if corrupted or missing.
   */
  loadState(): AppStorageState {
    try {
      if (typeof localStorage === 'undefined') {
        return getDefaultStorageState();
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = getDefaultStorageState();
        this.saveState(defaults);
        return defaults;
      }

      const parsed = JSON.parse(raw);

      if (validateStorageState(parsed)) {
        const defaults = getDefaultStorageState();
        const mergedTaskProgress = { ...defaults.taskProgress, ...parsed.taskProgress };
        const mergedSkillStates = { ...defaults.skillStates, ...parsed.skillStates };

        // parsed.dsaProgress is guaranteed to exist by validateStorageState
        const userDsaProgress = parsed.dsaProgress as Record<string, DSAProgress>;

        const mergedDsaProgress: Record<string, DSAProgress> = {};
        Object.keys(defaults.dsaProgress).forEach((probId) => {
          const defaultItem = defaults.dsaProgress[probId];
          const userItem = userDsaProgress[probId];
          if (userItem) {
            mergedDsaProgress[probId] = {
              ...defaultItem,
              ...userItem,
              currentBox: userItem.currentBox ?? defaultItem.currentBox,
              attemptCount: userItem.attemptCount ?? defaultItem.attemptCount,
              passedIndependently: userItem.passedIndependently ?? defaultItem.passedIndependently ?? false,
              consecutiveAssistedPasses: userItem.consecutiveAssistedPasses ?? defaultItem.consecutiveAssistedPasses ?? 0,
              assistedProvisional: userItem.assistedProvisional ?? defaultItem.assistedProvisional ?? false,
              consecutiveFailures: userItem.consecutiveFailures ?? defaultItem.consecutiveFailures ?? 0,
              remediationRequired: userItem.remediationRequired ?? defaultItem.remediationRequired ?? false,
              patternLessonViewed: userItem.patternLessonViewed ?? defaultItem.patternLessonViewed ?? false,
              patternLessonCompleted: userItem.patternLessonCompleted ?? defaultItem.patternLessonCompleted ?? false,
              remediationSelfCheckPassed: userItem.remediationSelfCheckPassed ?? defaultItem.remediationSelfCheckPassed ?? false,
            };
          } else {
            mergedDsaProgress[probId] = defaultItem;
          }
        });

        // parsed is guaranteed to have required fields by validateStorageState
        const validatedParsed = parsed as AppExtendedStorageState;

        const migratedState: AppExtendedStorageState = {
          ...validatedParsed,
          userSettings: {
            ...DEFAULT_USER_SETTINGS,
            ...(validatedParsed.userSettings || {}),
          },
          taskProgress: mergedTaskProgress,
          skillStates: mergedSkillStates,
          dsaProgress: mergedDsaProgress,
          practiceAttempts: parsed.practiceAttempts || [],
          preparationTopicProgress: parsed.preparationTopicProgress || {},
        };
        this.saveState(migratedState);
        return migratedState;
      } else {
        console.warn('[PlacementOS] Local storage data failed integrity check. Reverting to baseline default state.');
        const defaults = getDefaultStorageState();
        this.saveState(defaults);
        return defaults;
      }
    } catch (err) {
      console.error('[PlacementOS] Failed to read from localStorage:', err);
      return getDefaultStorageState();
    }
  },

  /**
   * Persists current state object to localStorage safely.
   */
  saveState(state: AppStorageState): boolean {
    try {
      if (typeof localStorage === 'undefined') return true;

      const payload: AppStorageState = {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        appVersion: CURRENT_APP_VERSION,
        lastSavedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('[PlacementOS] Failed to save state to localStorage:', err);
      return false;
    }
  },

  /**
   * Calculates size of stored JSON string in bytes.
   */
  getStorageBytes(): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Blob([raw]).size : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Clears stored JSON state in localStorage.
   */
  clearState(): boolean {
    try {
      if (typeof localStorage === 'undefined') return true;
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('[PlacementOS] Failed to clear localStorage state:', err);
      return false;
    }
  },

  /**
   * Exports state object to formatted JSON string.
   */
  exportJSON(state: AppStorageState): string {
    return JSON.stringify(state, null, 2);
  },

  /**
   * Imports state from JSON string with strict validation.
   */
  importJSON(jsonString: string): { success: boolean; state?: AppExtendedStorageState; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (validateImportState(parsed)) {
        const migratedState: AppExtendedStorageState = {
          ...parsed,
          userSettings: {
            ...DEFAULT_USER_SETTINGS,
            ...(parsed.userSettings || {}),
          },
          practiceAttempts: parsed.practiceAttempts || [],
          preparationTopicProgress: parsed.preparationTopicProgress || {},
        };
        this.saveState(migratedState);
        return { success: true, state: migratedState };
      }
      return { success: false, error: 'Invalid backup format or missing schema properties' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse JSON string';
      return { success: false, error: msg };
    }
  },

  /**
   * Resets local storage state to defaults.
   */
  resetState(): AppStorageState {
    const defaults = getDefaultStorageState();
    this.saveState(defaults);
    return defaults;
  },

  /**
   * Validates storage state (exported for testing).
   */
  validateStorageState,

  /**
   * Validates import state strictly (exported for testing).
   */
  validateImportState,
};
