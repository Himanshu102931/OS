import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StorageAdapter, getDefaultStorageState, type AppStorageState } from '../storage/storageAdapter';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { AppShell } from '../components/layout/AppShell';

const STORAGE_KEY = 'placementos_v1_state';

describe('Cross-Tab Concurrency and Stale-State Overwrite Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. A stale revision cannot overwrite a newer persisted state', () => {
    const initialState = getDefaultStorageState();
    StorageAdapter.saveState(initialState);
    const initialRev = StorageAdapter.getPersistedRevision();
    expect(initialRev).toBeGreaterThanOrEqual(1);

    // Tab A updates and advances revision
    const tabAState: AppStorageState = {
      ...initialState,
      dsaProgress: {
        ...initialState.dsaProgress,
        'two-sum': {
          problemId: 'two-sum',
          currentBox: 2,
          attemptCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    };
    const tabASave = StorageAdapter.saveStateDetailed(tabAState, { expectedRevision: initialRev! });
    expect(tabASave.success).toBe(true);
    expect(tabASave.persistedRevision).toBe(initialRev! + 1);

    // Tab B attempts to write with stale expected revision
    const tabBState: AppStorageState = {
      ...initialState,
      userSettings: {
        ...initialState.userSettings,
        theme: 'slate_dark',
      },
    };
    const tabBSave = StorageAdapter.saveStateDetailed(tabBState, { expectedRevision: initialRev! });
    expect(tabBSave.success).toBe(false);
    expect(tabBSave.conflict).toBe(true);
    expect(tabBSave.error).toBe('conflict');

    // Storage still contains Tab A's DSA progress
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.dsaProgress['two-sum'].currentBox).toBe(2);
    expect(stored.userSettings.theme).toBe('dark'); // Tab B's write did not touch storage
  });

  it('2. Successful writes advance revision metadata correctly', () => {
    const state = getDefaultStorageState();
    const res1 = StorageAdapter.saveStateDetailed(state);
    expect(res1.success).toBe(true);
    const rev1 = res1.persistedRevision!;

    const res2 = StorageAdapter.saveStateDetailed(state, { expectedRevision: rev1 });
    expect(res2.success).toBe(true);
    expect(res2.persistedRevision).toBe(rev1 + 1);

    const res3 = StorageAdapter.saveStateDetailed(state, { expectedRevision: rev1 + 1 });
    expect(res3.success).toBe(true);
    expect(res3.persistedRevision).toBe(rev1 + 2);
    expect(StorageAdapter.getPersistedRevision()).toBe(rev1 + 2);
  });

  it('3. Legacy schema 1.0.0 data without revision metadata still loads seamlessly', () => {
    const legacyState = getDefaultStorageState();
    delete legacyState.storageRevision;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyState));

    const loaded = StorageAdapter.loadState();
    expect(loaded).toBeDefined();
    expect(loaded.schemaVersion).toBe('1.0.0');
    expect(loaded.storageRevision).toBeGreaterThanOrEqual(1);
  });

  it('4. An external storage change marks the other tab stale via StorageEvent', async () => {
    let capturedConflict = false;

    const TestComponent = () => {
      const { storageConflict } = usePlacement();
      capturedConflict = storageConflict;
      return <AppShell><div>App Content</div></AppShell>;
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    expect(screen.queryByTestId('storage-conflict-banner')).toBeNull();
    expect(capturedConflict).toBe(false);

    // Simulate another tab persisting a newer revision
    await act(async () => {
      const newerState = {
        ...getDefaultStorageState(),
        storageRevision: 99,
      };
      const event = new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(newerState),
      });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId('storage-conflict-banner')).toBeInTheDocument();
    expect(screen.getByText(/Concurrent Update Detected/i)).toBeInTheDocument();
    expect(capturedConflict).toBe(true);
  });

  it('5. A stale tab background save is blocked', async () => {
    const TestComponent = () => {
      const { updateUserSettings } = usePlacement();
      return (
        <AppShell>
          <button
            onClick={() => updateUserSettings({ theme: 'slate_dark' })}
            data-testid="change-theme-btn"
          >
            Change Theme
          </button>
        </AppShell>
      );
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    // External tab advances revision
    const externalState = {
      ...getDefaultStorageState(),
      storageRevision: 10,
      userSettings: {
        ...getDefaultStorageState().userSettings,
        dailyStudyMinutes: 240,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(externalState));

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(externalState),
        })
      );
    });

    expect(screen.getByTestId('storage-conflict-banner')).toBeInTheDocument();

    // Stale tab user attempts an edit
    await act(async () => {
      fireEvent.click(screen.getByTestId('change-theme-btn'));
    });

    // Verify storage still retains the external state and was not overwritten
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.dailyStudyMinutes).toBe(240);
    expect(stored.userSettings.theme).toBe('dark'); // Not overwritten with 'slate_dark'
  });

  it('6. Midnight rollover cannot persist stale state', async () => {
    const TestComponent = () => {
      return <AppShell><div>Today</div></AppShell>;
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    // External tab advances storage while this tab is backgrounded
    const externalState = {
      ...getDefaultStorageState(),
      storageRevision: 50,
      userSettings: {
        ...getDefaultStorageState().userSettings,
        targetPlacementGoal: 'Updated Role',
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(externalState));

    // Focus triggers date check rollover
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });


    expect(screen.getByTestId('storage-conflict-banner')).toBeInTheDocument();

    // Verify external storage was not overwritten
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.targetPlacementGoal).toBe('Updated Role');
  });

  it('7. Backup import and quarantine restoration establish the correct revision baseline', () => {
    const baseState = getDefaultStorageState();
    baseState.storageRevision = 20;
    StorageAdapter.saveState(baseState);

    const backupState = {
      ...getDefaultStorageState(),
      storageRevision: 5,
      userSettings: {
        ...getDefaultStorageState().userSettings,
        targetPlacementGoal: 'Senior Engineer',
      },
    };

    const importRes = StorageAdapter.importJSON(JSON.stringify(backupState));
    expect(importRes.success).toBe(true);
    expect(importRes.state?.storageRevision).toBeGreaterThan(20);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.storageRevision).toBeGreaterThan(20);
    expect(stored.userSettings.targetPlacementGoal).toBe('Senior Engineer');
  });

  it('8. Invalid imports leave primary storage and in-memory state unchanged', () => {
    const valid = getDefaultStorageState();
    valid.userSettings.dailyStudyMinutes = 90;
    StorageAdapter.saveState(valid);
    const initialRev = StorageAdapter.getPersistedRevision();

    const invalidJSON = '{ invalid json here';
    const importRes = StorageAdapter.importJSON(invalidJSON);
    expect(importRes.success).toBe(false);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.dailyStudyMinutes).toBe(90);
    expect(stored.storageRevision).toBe(initialRev);
  });

  it('9. Resolving a conflict reloads current data only after explicit confirmation', async () => {
    localStorage.clear();
    const confirmSpy = vi.spyOn(window, 'confirm');

    const TestComponent = () => {
      const { userSettings } = usePlacement();
      return (
        <AppShell>
          <div data-testid="study-minutes">{userSettings.dailyStudyMinutes}</div>
        </AppShell>
      );
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    // Initial value
    expect(screen.getByTestId('study-minutes').textContent).toBe('120');

    // External tab saves 180 minutes with revision 15
    const updatedState = {
      ...getDefaultStorageState(),
      storageRevision: 15,
      userSettings: {
        ...getDefaultStorageState().userSettings,
        dailyStudyMinutes: 180,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(updatedState),
        })
      );
    });

    expect(screen.getByTestId('storage-conflict-banner')).toBeInTheDocument();

    // User cancels confirmation -> no reload
    confirmSpy.mockReturnValueOnce(false);
    await act(async () => {
      fireEvent.click(screen.getByTestId('resolve-conflict-btn'));
    });
    expect(screen.getByTestId('study-minutes').textContent).toBe('120');
    expect(screen.getByTestId('storage-conflict-banner')).toBeInTheDocument();

    // User confirms reload -> reloads latest 180 minutes
    confirmSpy.mockReturnValueOnce(true);
    await act(async () => {
      fireEvent.click(screen.getByTestId('resolve-conflict-btn'));
    });
    expect(screen.getByTestId('study-minutes').textContent).toBe('180');
    expect(screen.queryByTestId('storage-conflict-banner')).toBeNull();
  });


  it('10. Failed storage writes remain distinguishable from concurrency conflicts', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const state = getDefaultStorageState();
    const result = StorageAdapter.saveStateDetailed(state, { expectedRevision: 1 });

    expect(result.success).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.error).toBe('quota_exceeded');

    setItemSpy.mockRestore();
  });

  it('11. Existing assessment pruning and quarantine preservation still work', () => {
    const rawUnreadable = '{ corrupt data...';
    localStorage.setItem(STORAGE_KEY, rawUnreadable);

    const loaded = StorageAdapter.loadState();
    expect(loaded).toBeDefined();

    const quarantined = StorageAdapter.getQuarantinedState();
    expect(quarantined).not.toBeNull();
    expect(quarantined?.payload).toBe(rawUnreadable);
  });

  it('12. The implementation does not create render loops or discard active inputs automatically', async () => {
    let renderCount = 0;

    const TestComponent = () => {
      renderCount++;
      const [inputVal, setInputVal] = React.useState('user drafting note');
      return (
        <AppShell>
          <input
            data-testid="draft-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </AppShell>
      );
    };

    render(
      <PlacementProvider>
        <TestComponent />
      </PlacementProvider>
    );

    const initialRenderCount = renderCount;

    // Trigger storage event
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ ...getDefaultStorageState(), storageRevision: 30 }),
        })
      );
    });

    // Input must preserve in-progress typing without discarding
    expect((screen.getByTestId('draft-input') as HTMLInputElement).value).toBe('user drafting note');

    // Render count must be stable and small, not infinite
    expect(renderCount - initialRenderCount).toBeLessThanOrEqual(3);
  });


  it('13. Concurrent saves from the same expected revision under Web Locks serialize and reject the second tab', async () => {
    // Simulate browser Web Locks FIFO execution
    const lockQueue: Array<() => Promise<unknown>> = [];
    let lockRunning = false;

    const processQueue = async () => {
      if (lockRunning) return;
      lockRunning = true;
      while (lockQueue.length > 0) {
        const nextOp = lockQueue.shift()!;
        await nextOp();
      }
      lockRunning = false;
    };

    const mockRequest = vi.fn((_name: string, callback: () => Promise<unknown>) => {
      return new Promise((resolve, reject) => {
        lockQueue.push(async () => {
          try {
            const result = await callback();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
        processQueue();
      });
    });

    vi.stubGlobal('navigator', {
      locks: {
        request: mockRequest,
      },
    });

    const baseState = getDefaultStorageState();
    StorageAdapter.saveState(baseState);
    const initialRev = StorageAdapter.getPersistedRevision()!;
    expect(initialRev).toBeGreaterThanOrEqual(1);

    const tabAState: AppStorageState = {
      ...baseState,
      userSettings: { ...baseState.userSettings, dailyStudyMinutes: 150 },
    };
    const tabBState: AppStorageState = {
      ...baseState,
      userSettings: { ...baseState.userSettings, dailyStudyMinutes: 200 },
    };

    // Both tabs initiate save simultaneously with the same expectedRevision
    const [resultA, resultB] = await Promise.all([
      StorageAdapter.saveStateCoordinated(tabAState, { expectedRevision: initialRev }),
      StorageAdapter.saveStateCoordinated(tabBState, { expectedRevision: initialRev }),
    ]);

    expect(mockRequest).toHaveBeenCalledWith('placementos_v1_storage_lock', expect.any(Function));
    expect(resultA.success).toBe(true);
    expect(resultA.persistedRevision).toBe(initialRev + 1);

    expect(resultB.success).toBe(false);
    expect(resultB.conflict).toBe(true);
    expect(resultB.error).toBe('conflict');

    // Storage preserves Tab A's write
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.dailyStudyMinutes).toBe(150);
    expect(stored.storageRevision).toBe(initialRev + 1);

    vi.unstubAllGlobals();
  });

  it('14. Concurrent normal save versus backup import serializes correctly under lock', async () => {
    // Web locks simulation
    const lockQueue: Array<() => Promise<unknown>> = [];
    let lockRunning = false;

    const processQueue = async () => {
      if (lockRunning) return;
      lockRunning = true;
      while (lockQueue.length > 0) {
        const nextOp = lockQueue.shift()!;
        await nextOp();
      }
      lockRunning = false;
    };

    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn((_name: string, callback: () => Promise<unknown>) => {
          return new Promise((resolve, reject) => {
            lockQueue.push(async () => {
              try {
                const res = await callback();
                resolve(res);
              } catch (e) {
                reject(e);
              }
            });
            processQueue();
          });
        }),
      },
    });

    const baseState = getDefaultStorageState();
    StorageAdapter.saveState(baseState);
    const initialRev = StorageAdapter.getPersistedRevision()!;

    const backupState = {
      ...getDefaultStorageState(),
      userSettings: {
        ...getDefaultStorageState().userSettings,
        targetPlacementGoal: 'Principal Engineer',
      },
    };

    // Save vs Import initiated concurrently
    const [saveRes, importRes] = await Promise.all([
      StorageAdapter.saveStateCoordinated(
        { ...baseState, userSettings: { ...baseState.userSettings, dailyStudyMinutes: 300 } },
        { expectedRevision: initialRev }
      ),
      StorageAdapter.importJSONCoordinated(JSON.stringify(backupState)),
    ]);

    expect(saveRes.success).toBe(true);
    expect(importRes.success).toBe(true);
    expect(importRes.state?.storageRevision).toBeGreaterThan(saveRes.persistedRevision!);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.targetPlacementGoal).toBe('Principal Engineer');

    vi.unstubAllGlobals();
  });

  it('15. Concurrent normal save versus reset serializes and rejects stale save', async () => {
    const lockQueue: Array<() => Promise<unknown>> = [];
    let lockRunning = false;

    const processQueue = async () => {
      if (lockRunning) return;
      lockRunning = true;
      while (lockQueue.length > 0) {
        const nextOp = lockQueue.shift()!;
        await nextOp();
      }
      lockRunning = false;
    };

    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn((_name: string, callback: () => Promise<unknown>) => {
          return new Promise((resolve, reject) => {
            lockQueue.push(async () => {
              try {
                const res = await callback();
                resolve(res);
              } catch (e) {
                reject(e);
              }
            });
            processQueue();
          });
        }),
      },
    });

    const baseState = getDefaultStorageState();
    StorageAdapter.saveState(baseState);
    const initialRev = StorageAdapter.getPersistedRevision()!;

    // Reset executes first, then stale save
    const [resetRes, saveRes] = await Promise.all([
      StorageAdapter.resetStateCoordinated(),
      StorageAdapter.saveStateCoordinated(
        { ...baseState, userSettings: { ...baseState.userSettings, dailyStudyMinutes: 250 } },
        { expectedRevision: initialRev }
      ),
    ]);

    expect(resetRes.storageRevision).toBe(initialRev + 1);
    expect(saveRes.success).toBe(false);
    expect(saveRes.conflict).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.userSettings.dailyStudyMinutes).toBe(120); // Baseline default preserved

    vi.unstubAllGlobals();
  });

  it('16. Lock acquisition failure returns storage_unavailable without modifying state or advancing revision', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn(() => Promise.reject(new Error('Lock acquisition timeout'))),
      },
    });

    const baseState = getDefaultStorageState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...baseState, storageRevision: 5 }));

    const result = await StorageAdapter.saveStateCoordinated(baseState, { expectedRevision: 5 });

    expect(result.success).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.error).toBe('storage_unavailable');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.storageRevision).toBe(5);

    vi.unstubAllGlobals();
  });

  it('17. Storage quota failure does not advance revision in storage', () => {
    const baseState = getDefaultStorageState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...baseState, storageRevision: 7 }));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const result = StorageAdapter.saveStateDetailed(baseState, { expectedRevision: 7 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('quota_exceeded');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.storageRevision).toBe(7);

    setItemSpy.mockRestore();
  });

  it('18. All primary-state mutation methods coordinate through STORAGE_LOCK_NAME', async () => {
    const lockSpy = vi.fn((_name: string, op: () => unknown) => op());
    vi.stubGlobal('navigator', {
      locks: {
        request: lockSpy,
      },
    });

    const state = getDefaultStorageState();

    await StorageAdapter.saveStateCoordinated(state);
    expect(lockSpy).toHaveBeenCalledWith('placementos_v1_storage_lock', expect.any(Function));

    await StorageAdapter.importJSONCoordinated(JSON.stringify(state));
    expect(lockSpy).toHaveBeenCalledWith('placementos_v1_storage_lock', expect.any(Function));

    await StorageAdapter.resetStateCoordinated();
    expect(lockSpy).toHaveBeenCalledWith('placementos_v1_storage_lock', expect.any(Function));

    await StorageAdapter.clearStateCoordinated();
    expect(lockSpy).toHaveBeenCalledWith('placementos_v1_storage_lock', expect.any(Function));

    vi.unstubAllGlobals();
  });
});

