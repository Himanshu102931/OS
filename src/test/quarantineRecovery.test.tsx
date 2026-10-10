import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import { PlacementProvider } from '../context/PlacementContext';
import { SettingsView } from '../components/settings/SettingsView';

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

describe('Task 153 — Quarantined Storage Inspection & Safe Recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('StorageAdapter.getQuarantinedState returns null when no quarantine key exists', () => {
    expect(StorageAdapter.getQuarantinedState()).toBeNull();
    expect(StorageAdapter.exportQuarantinedJSON()).toBeNull();
  });

  it('StorageAdapter.getQuarantinedState handles malformed quarantine JSON safely without crashing', () => {
    localStorage.setItem(QUARANTINE_KEY, '{ this is corrupted json');
    expect(StorageAdapter.getQuarantinedState()).toBeNull();
    expect(StorageAdapter.exportQuarantinedJSON()).toBeNull();
  });

  it('StorageAdapter.getQuarantinedState correctly parses and returns quarantine snapshot', () => {
    const rawPayload = JSON.stringify({ note: 'legacy state with issues' });
    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'failed integrity check',
        payload: rawPayload,
      })
    );

    const snapshot = StorageAdapter.getQuarantinedState();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.quarantinedAt).toBe('2026-10-01T12:00:00.000Z');
    expect(snapshot?.reason).toBe('failed integrity check');
    expect(snapshot?.payload).toBe(rawPayload);

    const exported = StorageAdapter.exportQuarantinedJSON();
    expect(exported).toContain('failed integrity check');
    expect(exported).toContain('legacy state with issues');
  });

  it('StorageAdapter.clearQuarantinedState removes quarantine key safely', () => {
    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'failed integrity check',
        payload: '{}',
      })
    );
    expect(StorageAdapter.getQuarantinedState()).not.toBeNull();

    const cleared = StorageAdapter.clearQuarantinedState();
    expect(cleared).toBe(true);
    expect(StorageAdapter.getQuarantinedState()).toBeNull();
    expect(localStorage.getItem(QUARANTINE_KEY)).toBeNull();
  });

  it('SettingsView hides quarantine recovery section when no quarantine snapshot exists', () => {
    StorageAdapter.saveState(getDefaultStorageState());

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    expect(screen.queryByTestId('quarantine-recovery-section')).toBeNull();
    unmount();
  });

  it('SettingsView displays quarantine recovery section and metadata when snapshot exists', () => {
    StorageAdapter.saveState(getDefaultStorageState());

    const rawPayload = JSON.stringify({
      schemaVersion: '1.0.0',
      userSettings: { targetPlacementGoal: 'Frontend Engineer' },
    });

    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'unreadable payload test',
        payload: rawPayload,
      })
    );

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    expect(screen.getByTestId('quarantine-recovery-section')).not.toBeNull();
    expect(screen.getByText('Quarantined State Snapshot Detected')).toBeDefined();
    expect(screen.getByText('unreadable payload test')).toBeDefined();
    expect(screen.getByText('2026-10-01T12:00:00.000Z')).toBeDefined();
    expect(screen.getByText('Syntactically Valid')).toBeDefined();

    unmount();
  });

  it('Exporting quarantined snapshot preserves raw payload and does not mutate primary storage or delete quarantine', () => {
    const primaryState = getDefaultStorageState();
    StorageAdapter.saveState(primaryState);

    const rawQuarantinePayload = JSON.stringify({ customNote: 'must not be lost' });
    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'corrupted task progress',
        payload: rawQuarantinePayload,
      })
    );

    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    const exportBtn = screen.getByTestId('export-quarantine-btn');
    act(() => {
      fireEvent.click(exportBtn);
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    // Primary storage state remains unchanged
    const storedPrimary = localStorage.getItem(STORAGE_KEY);
    expect(storedPrimary).toBeTruthy();
    expect(JSON.parse(storedPrimary!).schemaVersion).toBe('1.0.0');

    // Quarantine record is still present in localStorage
    expect(StorageAdapter.getQuarantinedState()?.payload).toBe(rawQuarantinePayload);

    unmount();
  });

  it('Attempting safe restore with invalid schema is rejected and does not mutate active state', async () => {
    const initialBaseline = getDefaultStorageState();
    StorageAdapter.saveState(initialBaseline);

    // Quarantined payload with invalid schema (missing required fields)
    const invalidPayload = JSON.stringify({
      schemaVersion: '1.0.0',
      corruptedField: true,
      taskProgress: 'not-an-object',
    });

    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'failed validation',
        payload: invalidPayload,
      })
    );

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    // Click Attempt Safe Restore
    const restoreBtn = screen.getByTestId('restore-quarantine-btn');
    act(() => {
      fireEvent.click(restoreBtn);
    });

    // Confirm dialog appears
    expect(screen.getByText('Restore Quarantined Payload')).toBeDefined();
    const executeBtn = screen.getByText('Execute Safe Restore');

    // Click confirm
    await act(async () => {
      fireEvent.click(executeBtn);
    });

    // Error alert is displayed in settings
    expect(screen.getByText(/Quarantine restore failed schema validation/i)).toBeDefined();

    // Active state was NOT replaced with corrupted data
    const activeStored = StorageAdapter.loadState();
    expect(typeof activeStored.taskProgress).toBe('object');
    expect(Array.isArray(activeStored.companyOverlays)).toBe(true);

    // Quarantined record is preserved
    expect(StorageAdapter.getQuarantinedState()).not.toBeNull();

    unmount();
  });

  it('Attempting safe restore with valid backup state restores successfully upon confirmation', async () => {
    const initialBaseline = getDefaultStorageState();
    StorageAdapter.saveState(initialBaseline);

    // Create a valid backup payload with customized userSettings
    const validCustomState: AppExtendedStorageState = {
      ...initialBaseline,
      userSettings: {
        ...initialBaseline.userSettings,
        targetPlacementGoal: 'Custom Quarantined SDE-2 Goal',
      },
    };

    const validPayload = JSON.stringify(validCustomState);

    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'manual check',
        payload: validPayload,
      })
    );

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    // Click restore
    const restoreBtn = screen.getByTestId('restore-quarantine-btn');
    act(() => {
      fireEvent.click(restoreBtn);
    });

    // Confirm
    const executeBtn = screen.getByText('Execute Safe Restore');
    await act(async () => {
      fireEvent.click(executeBtn);
    });

    // Success message displayed
    expect(screen.getByText(/Quarantined backup successfully validated and restored as active application state/i)).toBeDefined();

    // Verify state in storage has updated goal
    const loaded = StorageAdapter.loadState();
    expect(loaded.userSettings.targetPlacementGoal).toBe('Custom Quarantined SDE-2 Goal');

    unmount();
  });

  it('Clearing quarantine removes record and hides recovery section upon confirmation', async () => {
    StorageAdapter.saveState(getDefaultStorageState());

    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({
        quarantinedAt: '2026-10-01T12:00:00.000Z',
        reason: 'to be cleared',
        payload: '{}',
      })
    );

    const { unmount } = render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );

    expect(screen.getByTestId('quarantine-recovery-section')).not.toBeNull();

    // Click Clear Record
    const clearBtn = screen.getByTestId('clear-quarantine-btn');
    act(() => {
      fireEvent.click(clearBtn);
    });

    // Confirmation dialog
    expect(screen.getByText('Clear Quarantined Snapshot')).toBeDefined();
    const confirmClearBtn = screen.getByText('Clear Quarantine');

    act(() => {
      fireEvent.click(confirmClearBtn);
    });

    // Quarantine record is removed from storage
    expect(StorageAdapter.getQuarantinedState()).toBeNull();
    expect(localStorage.getItem(QUARANTINE_KEY)).toBeNull();

    // Recovery section is now hidden
    expect(screen.queryByTestId('quarantine-recovery-section')).toBeNull();

    unmount();
  });
});
