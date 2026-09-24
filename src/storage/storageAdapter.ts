import type {
  TaskProgress,
  DSAProgress,
  TopicSkillState,
  CompanyOverlay,
  DailyCheckIn,
  DailyTaskAssignment,
  PlacementMode,
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

export interface AppStorageState {
  schemaVersion: string;
  appVersion: string;
  lastSavedAt: string;
  currentMode: PlacementMode;
  taskProgress: Record<string, TaskProgress>;
  dsaProgress: Record<string, DSAProgress>;
  skillStates: Record<string, TopicSkillState>;
  companyOverlays: CompanyOverlay[];
  dailyCheckIns: DailyCheckIn[];
  dailyTaskAssignments: DailyTaskAssignment[];
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
    taskProgress: taskProgressMap,
    dsaProgress: dsaProgressMap,
    skillStates: skillStateMap,
    companyOverlays: COMPANY_OVERLAYS,
    dailyCheckIns: [],
    dailyTaskAssignments: [],
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
        // Idempotent migration: Merge default task progress & skills for newly added curriculum items
        const defaults = getDefaultStorageState();
        const mergedTaskProgress = { ...defaults.taskProgress, ...parsed.taskProgress };
        const mergedSkillStates = { ...defaults.skillStates, ...parsed.skillStates };
        const mergedDsaProgress = { ...defaults.dsaProgress, ...parsed.dsaProgress };

        const migratedState: AppStorageState = {
          ...parsed,
          taskProgress: mergedTaskProgress,
          skillStates: mergedSkillStates,
          dsaProgress: mergedDsaProgress,
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
   * Clears state from localStorage and resets application state to defaults.
   */
  resetState(): AppStorageState {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('[PlacementOS] Error clearing localStorage:', err);
    }
    const defaults = getDefaultStorageState();
    this.saveState(defaults);
    return defaults;
  },

  /**
   * Exports full state object as a formatted JSON backup string.
   */
  exportJSON(state: AppStorageState): string {
    return JSON.stringify(state, null, 2);
  },

  /**
   * Imports state from a JSON string backup with schema validation.
   */
  importJSON(jsonString: string): { success: boolean; state?: AppStorageState; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!validateStorageState(parsed)) {
        return { success: false, error: 'Invalid backup file structure or missing required schema fields.' };
      }
      this.saveState(parsed);
      return { success: true, state: parsed };
    } catch (err) {
      return { success: false, error: `JSON Parse Error: ${err instanceof Error ? err.message : String(err)}` };
    }
  },

  /**
   * Returns estimated total byte size of stored PlacementOS data in localStorage.
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
};
