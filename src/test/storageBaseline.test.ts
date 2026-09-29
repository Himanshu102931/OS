import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageAdapter,
  getDefaultStorageState,
  DEFAULT_USER_SETTINGS,
} from '../storage/storageAdapter';
import type { AppExtendedStorageState } from '../storage/storageAdapter';
import {
  PHASES,
  MODULES,
  TOPICS,
  TASK_DEFINITIONS,
  TASK_PROGRESS,
  INITIAL_DSA_PROGRESS,
  INITIAL_SKILL_STATES,
} from '../data/seedData';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { PREPARATION_SECTIONS, PREPARATION_TOPICS } from '../data/preparationDataset';

/* Vitest runs in a node environment — install a localStorage stand-in so the
   adapter's persistence paths are exercised for real. */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

const STORAGE_KEY = 'placementos_v1_state';
const QUARANTINE_KEY = 'placementos_v1_state_quarantine';

/** Builds a state that represents genuine pre-change user progress. */
function buildLegacyBackup(): AppExtendedStorageState {
  const base = getDefaultStorageState() as AppExtendedStorageState;

  // A task the user actually completed.
  const someTaskId = TASK_PROGRESS[0]?.taskId ?? 'task-1';
  // A DSA problem the user actually solved.
  const someProblemId = INITIAL_DSA_PROGRESS[0]?.problemId ?? DSA_PROBLEMS[0]?.id ?? 'prob-1';
  // A skill the user actually practised.
  const someTopicId = INITIAL_SKILL_STATES[0]?.topicId ?? TOPICS[0]?.id ?? 'topic-1';

  return {
    ...base,
    taskProgress: {
      ...base.taskProgress,
      [someTaskId]: {
        ...base.taskProgress[someTaskId],
        state: 'completed',
        timeSpentMinutes: 45,
        lastCompletedAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
    },
    dsaProgress: {
      ...base.dsaProgress,
      [someProblemId]: {
        ...base.dsaProgress[someProblemId],
        currentBox: 3,
        attemptCount: 6,
        passedIndependently: true,
        nextReviewAt: '2026-10-05',
        updatedAt: '2026-09-02T10:00:00.000Z',
      },
    },
    skillStates: {
      ...base.skillStates,
      [someTopicId]: {
        ...base.skillStates[someTopicId],
        freshness: 'fresh',
        evidenceStrength: 72,
        lastPracticedAt: '2026-09-02T10:00:00.000Z',
      },
    },
    // Pre-change backups contain the demo company overlay seed.
    companyOverlays: [
      {
        id: 'demo-company-1',
        companyName: 'Legacy Demo Corp',
        targetRole: 'SDE-1',
        applicationStatus: 'target',
        requiredDomains: ['dsa'],
        requiredTopics: ['topic-dsa-arrays'],
        requiredLanguages: ['English'],
      },
    ],
    dailyCheckIns: [],
    dailyTaskAssignments: [],
    practiceAttempts: [],
  };
}

function storedRaw(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

describe('C1 — clean first-run baseline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fresh default has zero progress, zero evidence and no demo companies', () => {
    const state = getDefaultStorageState();

    expect(state.companyOverlays).toEqual([]);

    // Task progress: every curriculum task present, none started, no activity.
    expect(Object.keys(state.taskProgress).length).toBe(TASK_PROGRESS.length);
    for (const tp of Object.values(state.taskProgress)) {
      expect(tp.state).toBe('not_started');
      expect(tp.postponeCount).toBe(0);
      expect(tp.skipCount).toBe(0);
      expect(tp.timeSpentMinutes).toBe(0);
      expect(tp.lastCompletedAt).toBeUndefined();
      expect(tp.postponedUntil).toBeUndefined();
    }

    // DSA progress: every problem present, Box 1, no attempts, no evidence.
    expect(Object.keys(state.dsaProgress).length).toBe(INITIAL_DSA_PROGRESS.length);
    for (const dp of Object.values(state.dsaProgress)) {
      expect(dp.currentBox).toBe(1);
      expect(dp.attemptCount).toBe(0);
      expect(dp.evidenceStrength).toBe(0);
      expect(dp.passedIndependently).toBe(false);
      expect(dp.remediationRequired).toBe(false);
      expect(dp.nextReviewAt).toBeUndefined();
      expect(dp.lastAttemptAt).toBeUndefined();
    }

    // Skill states: untested with no evidence anywhere.
    expect(Object.keys(state.skillStates).length).toBe(INITIAL_SKILL_STATES.length);
    for (const ss of Object.values(state.skillStates)) {
      expect(ss.freshness).toBe('untested');
      expect(ss.evidenceStrength).toBe(0);
      expect(ss.lastPracticedAt).toBeUndefined();
    }

    // No evidence / attempts / check-ins exist on a fresh install.
    expect(state.dailyCheckIns).toEqual([]);
    expect(state.dailyTaskAssignments).toEqual([]);
    expect(state.practiceAttempts).toEqual([]);
    expect(state.preparationTopicProgress).toEqual({});
    expect((state as AppExtendedStorageState).evidenceLogs).toBeUndefined();
    expect((state as AppExtendedStorageState).dsaAttempts).toBeUndefined();
  });

  it('fresh default preserves the entire curriculum', () => {
    const state = getDefaultStorageState();

    // Curriculum lives outside storage — assert the baseline still covers it.
    expect(PHASES.length).toBeGreaterThan(0);
    expect(MODULES.length).toBeGreaterThan(0);
    expect(TOPICS.length).toBeGreaterThan(0);
    expect(TASK_DEFINITIONS.length).toBeGreaterThan(0);
    expect(DSA_PROBLEMS.length).toBeGreaterThan(0);
    expect(PREPARATION_SECTIONS.length).toBeGreaterThan(0);
    expect(PREPARATION_TOPICS.length).toBeGreaterThan(0);

    // The baseline keeps the SAME key set as the pre-change seed and only
    // zeroes the values — that is what makes this a value-only change rather
    // than a schema change (hence no version bump).
    for (const tp of TASK_PROGRESS) {
      expect(state.taskProgress[tp.taskId]).toBeDefined();
    }

    // No curriculum task reads as started, whether or not it has a slot yet
    // (slots without a seed entry are created lazily on first update).
    for (const task of TASK_DEFINITIONS) {
      expect(state.taskProgress[task.id]?.state ?? 'not_started').toBe('not_started');
      expect(state.taskProgress[task.id]?.timeSpentMinutes ?? 0).toBe(0);
    }

    // Every DSA problem has a clean slot.
    for (const problem of DSA_PROBLEMS) {
      expect(state.dsaProgress[problem.id]).toBeDefined();
    }

    // No curriculum topic carries any evidence.
    for (const topic of TOPICS) {
      expect(state.skillStates[topic.id]?.evidenceStrength ?? 0).toBe(0);
      expect(state.skillStates[topic.id]?.freshness ?? 'untested').toBe('untested');
    }

    // Defaults remain structurally valid for hydration.
    expect(StorageAdapter.validateStorageState(state)).toBe(true);
  });

  it('fresh default settings are the documented defaults', () => {
    const state = getDefaultStorageState();
    expect(state.userSettings).toEqual(DEFAULT_USER_SETTINGS);
    expect(state.currentMode).toBe('normal');
    expect(state.schemaVersion).toBe('1.0.0');
  });
});

describe('C1 — export/import round-tripping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fresh default → export → import is deep-equal', () => {
    const original = getDefaultStorageState();
    const json = StorageAdapter.exportJSON(original);
    const result = StorageAdapter.importJSON(json);

    expect(result.success).toBe(true);
    expect(result.state).toBeDefined();
    expect(result.state).toEqual(original);
  });

  it('legacy backup with real progress → export → import is deep-equal', () => {
    const original = buildLegacyBackup();
    const json = StorageAdapter.exportJSON(original);
    const result = StorageAdapter.importJSON(json);

    expect(result.success).toBe(true);
    expect(result.state).toEqual(original);
  });
});

describe('C1 — compatibility with pre-existing state and old backups', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a pre-change backup imports without crash and keeps its progress', () => {
    const legacy = buildLegacyBackup();
    const result = StorageAdapter.importJSON(JSON.stringify(legacy));

    expect(result.success).toBe(true);
    const state = result.state!;
    expect(state.companyOverlays).toHaveLength(1);
    expect(state.companyOverlays[0].companyName).toBe('Legacy Demo Corp');

    const completedTask = Object.values(state.taskProgress).find((t) => t.state === 'completed');
    expect(completedTask).toBeDefined();
    expect(completedTask!.timeSpentMinutes).toBe(45);

    const advancedProblem = Object.values(state.dsaProgress).find((d) => d.currentBox > 1);
    expect(advancedProblem).toBeDefined();
    expect(advancedProblem!.currentBox).toBe(3);
    expect(advancedProblem!.attemptCount).toBe(6);

    const practisedSkill = Object.values(state.skillStates).find((s) => s.evidenceStrength > 0);
    expect(practisedSkill).toBeDefined();
    expect(practisedSkill!.evidenceStrength).toBe(72);
  });

  it('stored legacy state loads with user values winning over the clean baseline', () => {
    const legacy = buildLegacyBackup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = StorageAdapter.loadState();

    // User progress survives — it is NOT reset to the clean baseline.
    const completedTask = Object.values(loaded.taskProgress).find((t) => t.state === 'completed');
    expect(completedTask).toBeDefined();

    const advancedProblem = Object.values(loaded.dsaProgress).find((d) => d.currentBox === 3);
    expect(advancedProblem).toBeDefined();

    const practisedSkill = Object.values(loaded.skillStates).find((s) => s.evidenceStrength === 72);
    expect(practisedSkill).toBeDefined();

    expect(loaded.companyOverlays).toHaveLength(1);

    // No curriculum coverage is lost by the merge: every DSA problem and
    // every seeded progress slot survives, and nothing gains a stale state.
    for (const problem of DSA_PROBLEMS) {
      expect(loaded.dsaProgress[problem.id]).toBeDefined();
    }
    for (const tp of TASK_PROGRESS) {
      expect(loaded.taskProgress[tp.taskId]).toBeDefined();
    }
    expect(Object.keys(loaded.skillStates).length).toBe(INITIAL_SKILL_STATES.length);
  });

  it('a legacy payload missing optional collections hydrates complete, not undefined', () => {
    const legacy = buildLegacyBackup() as unknown as Record<string, unknown>;
    delete legacy.dailyTaskAssignments;
    delete legacy.dailyCheckIns;
    delete legacy.practiceAttempts;
    delete legacy.preparationTopicProgress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = StorageAdapter.loadState() as AppExtendedStorageState;

    // Downstream views call .filter/.map on these — undefined would crash.
    expect(Array.isArray(loaded.dailyTaskAssignments)).toBe(true);
    expect(loaded.dailyTaskAssignments).toEqual([]);
    expect(Array.isArray(loaded.dailyCheckIns)).toBe(true);
    expect(Array.isArray(loaded.practiceAttempts)).toBe(true);
    expect(loaded.preparationTopicProgress).toEqual({});
    expect(Array.isArray(loaded.companyOverlays)).toBe(true);
    expect(Array.isArray(loaded.evidenceLogs)).toBe(true);
    expect(Array.isArray(loaded.dsaAttempts)).toBe(true);

    // Progress that WAS present is still present.
    expect(Object.values(loaded.taskProgress).some((t) => t.state === 'completed')).toBe(true);
  });
});

describe('C1 — failed imports never replace current state', () => {
  beforeEach(() => {
    localStorage.clear();
    // Establish a known-good stored state first.
    StorageAdapter.saveState(buildLegacyBackup());
  });

  it('malformed JSON is rejected and leaves stored state untouched', () => {
    const before = storedRaw();

    const result = StorageAdapter.importJSON('{ this is not json');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.state).toBeUndefined();
    expect(storedRaw()).toBe(before);
  });

  it('invalid nested state is rejected and leaves stored state untouched', () => {
    const before = storedRaw();
    const invalid = {
      ...buildLegacyBackup(),
      taskProgress: { 'task-x': { taskId: 12345 } },
    };

    const result = StorageAdapter.importJSON(JSON.stringify(invalid));

    expect(result.success).toBe(false);
    expect(storedRaw()).toBe(before);
  });

  it('an unsupported schema version is rejected and leaves stored state untouched', () => {
    const before = storedRaw();
    const wrongVersion = { ...buildLegacyBackup(), schemaVersion: '9.9.9' };

    const result = StorageAdapter.importJSON(JSON.stringify(wrongVersion));

    expect(result.success).toBe(false);
    expect(storedRaw()).toBe(before);
  });

  it('a missing schema version is rejected and leaves stored state untouched', () => {
    const before = storedRaw();
    const noVersion = { ...buildLegacyBackup() };
    delete (noVersion as unknown as Record<string, unknown>).schemaVersion;

    const result = StorageAdapter.importJSON(JSON.stringify(noVersion));

    expect(result.success).toBe(false);
    expect(storedRaw()).toBe(before);
  });

  it('invalid nested company overlays are rejected', () => {
    const before = storedRaw();
    const invalid = {
      ...buildLegacyBackup(),
      companyOverlays: [{ id: 'x', applicationStatus: 'not-a-status' }],
    };

    const result = StorageAdapter.importJSON(JSON.stringify(invalid));

    expect(result.success).toBe(false);
    expect(storedRaw()).toBe(before);
  });
});

describe('C1 — unreadable stored state is preserved, not silently discarded', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a payload that fails the integrity check is quarantined before defaults are written', () => {
    const unreadable = JSON.stringify({ schemaVersion: '1.0.0', note: 'missing every collection' });
    localStorage.setItem(STORAGE_KEY, unreadable);

    const loaded = StorageAdapter.loadState();

    // App recovers to the clean baseline…
    expect(loaded.companyOverlays).toEqual([]);
    expect(Object.values(loaded.taskProgress).every((t) => t.state === 'not_started')).toBe(true);

    // …but the original payload is still recoverable, not destroyed.
    const quarantined = localStorage.getItem(QUARANTINE_KEY);
    expect(quarantined).toBeTruthy();
    const parsed = JSON.parse(quarantined!);
    expect(parsed.payload).toBe(unreadable);
    expect(typeof parsed.quarantinedAt).toBe('string');
    expect(typeof parsed.reason).toBe('string');
  });

  it('a payload that is not valid JSON is quarantined before defaults are written', () => {
    const unreadable = '{ definitely not json';
    localStorage.setItem(STORAGE_KEY, unreadable);

    const loaded = StorageAdapter.loadState();

    expect(loaded.companyOverlays).toEqual([]);
    const parsed = JSON.parse(localStorage.getItem(QUARANTINE_KEY)!);
    expect(parsed.payload).toBe(unreadable);
  });

  it('valid state is never quarantined', () => {
    StorageAdapter.saveState(buildLegacyBackup());
    StorageAdapter.loadState();

    expect(localStorage.getItem(QUARANTINE_KEY)).toBeNull();
  });
});

describe('C1 — full reset returns to the clean baseline without removing curriculum', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resetState() restores the clean baseline', () => {
    const progressState = buildLegacyBackup();
    StorageAdapter.saveState(progressState);

    const reset = StorageAdapter.resetState();

    expect(reset.companyOverlays).toEqual([]);
    expect(Object.values(reset.taskProgress).every((t) => t.state === 'not_started')).toBe(true);
    expect(Object.values(reset.dsaProgress).every((d) => d.currentBox === 1)).toBe(true);
    expect(Object.values(reset.skillStates).every((s) => s.freshness === 'untested')).toBe(true);
    expect(reset.dailyCheckIns).toEqual([]);
    expect(reset.dailyTaskAssignments).toEqual([]);
    expect(reset.practiceAttempts).toEqual([]);
    expect(reset.userSettings).toEqual(DEFAULT_USER_SETTINGS);

    // Persisted copy matches what was returned.
    const reloaded = StorageAdapter.loadState();
    expect(reloaded.companyOverlays).toEqual([]);
  });

  it('the clearState() + loadState() path used by a full reset also lands on the baseline', () => {
    StorageAdapter.saveState(buildLegacyBackup());

    StorageAdapter.clearState();
    const defaults = StorageAdapter.loadState();

    expect(defaults.companyOverlays).toEqual([]);
    expect(Object.values(defaults.taskProgress).every((t) => t.state === 'not_started')).toBe(true);
  });

  it('reset does not remove curriculum — every task, problem and skill keeps a slot', () => {
    StorageAdapter.saveState(buildLegacyBackup());
    const reset = StorageAdapter.resetState();

    // Progress slots keep exactly the pre-change seed key set.
    for (const tp of TASK_PROGRESS) {
      expect(reset.taskProgress[tp.taskId]).toBeDefined();
    }
    // Every curriculum task reads as untouched after reset.
    for (const task of TASK_DEFINITIONS) {
      expect(reset.taskProgress[task.id]?.state ?? 'not_started').toBe('not_started');
    }
    for (const problem of DSA_PROBLEMS) {
      expect(reset.dsaProgress[problem.id]).toBeDefined();
    }
    expect(Object.keys(reset.skillStates).length).toBe(INITIAL_SKILL_STATES.length);
    for (const topic of TOPICS) {
      expect(reset.skillStates[topic.id]?.evidenceStrength ?? 0).toBe(0);
    }

    // Curriculum constants themselves are untouched by any storage operation.
    expect(PHASES.length).toBeGreaterThan(0);
    expect(MODULES.length).toBeGreaterThan(0);
    expect(TOPICS.length).toBeGreaterThan(0);
    expect(PREPARATION_SECTIONS.length).toBeGreaterThan(0);
    expect(PREPARATION_TOPICS.length).toBeGreaterThan(0);

    expect(StorageAdapter.validateStorageState(reset)).toBe(true);
  });
});
