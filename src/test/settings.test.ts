import { describe, it, expect, beforeEach } from 'vitest';
import { StorageAdapter, DEFAULT_USER_SETTINGS } from '../storage/storageAdapter';
import type { UserSettings } from '../types';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

describe('UserSettings & StorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates default user settings when localStorage is empty', () => {
    const loaded = StorageAdapter.loadState();
    expect(loaded.userSettings).toBeDefined();
    expect(loaded.userSettings.dailyStudyMinutes).toBe(120);
    expect(loaded.userSettings.dsaDailyCap).toBe(5);
    expect(loaded.userSettings.placementMode).toBe('normal');
    expect(loaded.userSettings.theme).toBe('dark');
  });

  it('persists modified user settings safely', () => {
    const loaded = StorageAdapter.loadState();
    const updatedSettings: UserSettings = {
      ...loaded.userSettings,
      dailyStudyMinutes: 180,
      dsaDailyCap: 8,
      placementMode: 'placement_sprint',
      targetPlacementGoal: 'Backend Systems Engineer',
    };

    const savedState = {
      ...loaded,
      userSettings: updatedSettings,
    };

    StorageAdapter.saveState(savedState);

    const reloaded = StorageAdapter.loadState();
    expect(reloaded.userSettings.dailyStudyMinutes).toBe(180);
    expect(reloaded.userSettings.dsaDailyCap).toBe(8);
    expect(reloaded.userSettings.placementMode).toBe('placement_sprint');
    expect(reloaded.userSettings.targetPlacementGoal).toBe('Backend Systems Engineer');
  });

  it('preserves existing task/DSA progress when user settings are updated', () => {
    const loaded = StorageAdapter.loadState();
    expect(Object.keys(loaded.taskProgress).length).toBeGreaterThan(0);
    expect(Object.keys(loaded.dsaProgress).length).toBeGreaterThan(0);

    const updatedSettings: UserSettings = {
      ...loaded.userSettings,
      dsaDailyCap: 10,
    };

    StorageAdapter.saveState({
      ...loaded,
      userSettings: updatedSettings,
    });

    const reloaded = StorageAdapter.loadState();
    expect(reloaded.userSettings.dsaDailyCap).toBe(10);
    expect(Object.keys(reloaded.taskProgress).length).toEqual(Object.keys(loaded.taskProgress).length);
    expect(Object.keys(reloaded.dsaProgress).length).toEqual(Object.keys(loaded.dsaProgress).length);
  });

  it('exports and imports backup JSON with user settings intact', () => {
    const loaded = StorageAdapter.loadState();
    loaded.userSettings.targetPlacementGoal = 'Custom SDE Goal';

    const json = StorageAdapter.exportJSON(loaded);
    expect(json).toContain('Custom SDE Goal');

    const result = StorageAdapter.importJSON(json);
    expect(result.success).toBe(true);
    expect(result.state?.userSettings.targetPlacementGoal).toBe('Custom SDE Goal');
  });

  it('resets state to defaults cleanly', () => {
    const resetState = StorageAdapter.resetState();
    expect(resetState.userSettings).toEqual(DEFAULT_USER_SETTINGS);
    expect(resetState.schemaVersion).toBe('1.0.0');
  });
});
