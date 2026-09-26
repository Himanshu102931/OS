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
} from '../types';
import {
  TASK_PROGRESS,
  INITIAL_DSA_PROGRESS,
  INITIAL_SKILL_STATES,
  COMPANY_OVERLAYS,
} from '../data/seedData';

export const STORAGE_KEY = 'placementos_v1_state';
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const CURRENT_APP_VERSION = '1.0.0';

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
 * Validates data integrity of hydrated storage object.
 */
export function validateStorageState(data: unknown): data is AppStorageState {
  if (!data || typeof data !== 'object') return false;
  const state = data as Partial<AppStorageState>;

  if (typeof state.schemaVersion !== 'string') return false;
  if (!state.taskProgress || typeof state.taskProgress !== 'object') return false;
  if (!state.dsaProgress || typeof state.dsaProgress !== 'object') return false;
  if (!state.skillStates || typeof state.skillStates !== 'object') return false;
  if (!Array.isArray(state.companyOverlays)) return false;
  if (state.preparationTopicProgress && typeof state.preparationTopicProgress !== 'object') return false;

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

        const mergedDsaProgress: Record<string, DSAProgress> = {};
        Object.keys(defaults.dsaProgress).forEach((probId) => {
          const defaultItem = defaults.dsaProgress[probId];
          const userItem = parsed.dsaProgress[probId];
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

        const migratedState: AppStorageState = {
          ...parsed,
          userSettings: {
            ...DEFAULT_USER_SETTINGS,
            ...(parsed.userSettings || {}),
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
   * Imports state from JSON string with validation.
   */
  importJSON(jsonString: string): { success: boolean; state?: AppStorageState; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (validateStorageState(parsed)) {
        const migratedState: AppStorageState = {
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
};
