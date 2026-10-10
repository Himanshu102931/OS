import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { SettingsView } from '../components/settings/SettingsView';
import { StorageAdapter, DEFAULT_USER_SETTINGS } from '../storage/storageAdapter';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
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
  });
}

describe('Settings Page UI Manufacturing (Zones 1-6 Verification)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = () => {
    return render(
      <PlacementProvider>
        <SettingsView />
      </PlacementProvider>
    );
  };

  it('Zone 1: renders console header, GuideTrigger, and live storage footprint', () => {
    renderSettings();
    expect(screen.getByRole('heading', { level: 1, name: /settings & operational parameters/i })).toBeDefined();
    expect(screen.getByText(/system control surface/i)).toBeDefined();
    expect(screen.getByText(/local-first/i)).toBeDefined();
    expect(screen.getByText(/storage:/i)).toBeDefined();
  });

  it('Zone 2: renders all operational parameters including targetPlacementGoal (resolving C9)', () => {
    renderSettings();

    // 1. Target placement goal text input
    const goalInput = screen.getByLabelText(/target career goal \/ objective/i) as HTMLInputElement;
    expect(goalInput).toBeDefined();
    expect(goalInput.value).toBe(DEFAULT_USER_SETTINGS.targetPlacementGoal);

    fireEvent.change(goalInput, { target: { value: 'Principal Systems Architect' } });
    fireEvent.blur(goalInput);
    expect(goalInput.value).toBe('Principal Systems Architect');

    // 2. Placement horizon date
    const horizonInput = screen.getByLabelText(/placement horizon target date/i) as HTMLInputElement;
    expect(horizonInput).toBeDefined();
    expect(horizonInput.value).toBe(DEFAULT_USER_SETTINGS.placementHorizonDate);

    fireEvent.change(horizonInput, { target: { value: '2027-12-31' } });
    expect(horizonInput.value).toBe('2027-12-31');

    // 3. Target phase selection
    const phaseSelect = screen.getByLabelText(/active target phase/i) as HTMLSelectElement;
    expect(phaseSelect).toBeDefined();
    expect(phaseSelect.value).toBe(DEFAULT_USER_SETTINGS.targetPhaseId);

    // 4. Placement mode selection
    const modeSelect = screen.getByLabelText(/placement operating mode/i) as HTMLSelectElement;
    expect(modeSelect).toBeDefined();
    expect(modeSelect.value).toBe('normal');

    fireEvent.change(modeSelect, { target: { value: 'placement_sprint' } });
    expect(modeSelect.value).toBe('placement_sprint');

    // 5. Daily study budget slider
    const studySlider = screen.getByLabelText(/daily study time budget/i) as HTMLInputElement;
    expect(studySlider).toBeDefined();
    expect(Number(studySlider.value)).toBe(120);

    fireEvent.change(studySlider, { target: { value: '240' } });
    expect(Number(studySlider.value)).toBe(240);

    // 6. DSA daily problem cap slider
    const dsaSlider = screen.getByLabelText(/daily dsa problem quota/i) as HTMLInputElement;
    expect(dsaSlider).toBeDefined();
    expect(Number(dsaSlider.value)).toBe(5);

    fireEvent.change(dsaSlider, { target: { value: '8' } });
    expect(Number(dsaSlider.value)).toBe(8);
  });

  it('Zone 3: renders workspace & display preferences (presentation only)', () => {
    renderSettings();

    // 1. Density Mode controls
    const compactBtn = screen.getByRole('button', { name: /compact \(default\)/i });
    const comfortableBtn = screen.getByRole('button', { name: /comfortable/i });
    expect(compactBtn).toBeDefined();
    expect(comfortableBtn).toBeDefined();

    fireEvent.click(comfortableBtn);

    // 2. Visual Theme
    const themeSelect = screen.getByLabelText(/visual theme/i) as HTMLSelectElement;
    expect(themeSelect).toBeDefined();
    expect(themeSelect.value).toBe('dark');

    fireEvent.change(themeSelect, { target: { value: 'high_contrast' } });
    expect(themeSelect.value).toBe('high_contrast');

    // 3. Explanation Tooltips
    const tooltipsCheckbox = screen.getByLabelText(/explanation tooltips/i) as HTMLInputElement;
    expect(tooltipsCheckbox).toBeDefined();
    expect(tooltipsCheckbox.checked).toBe(true);

    fireEvent.click(tooltipsCheckbox);
    expect(tooltipsCheckbox.checked).toBe(false);

    // 4. Daily Check-in Reminder
    const reminderCheckbox = screen.getByLabelText(/daily check-in reminder/i) as HTMLInputElement;
    expect(reminderCheckbox).toBeDefined();
    expect(reminderCheckbox.checked).toBe(false);

    fireEvent.click(reminderCheckbox);
    expect(reminderCheckbox.checked).toBe(true);

    // Reminder time input should now be visible
    const reminderTimeInput = screen.getByLabelText(/target reminder time:/i) as HTMLInputElement;
    expect(reminderTimeInput).toBeDefined();
    expect(reminderTimeInput.value).toBe('20:00');

    fireEvent.change(reminderTimeInput, { target: { value: '21:30' } });
    expect(reminderTimeInput.value).toBe('21:30');
  });

  it('Zone 4: renders backup export & import controls with schema validation feedback', () => {
    renderSettings();

    // Export button exists
    const exportBtn = screen.getByRole('button', { name: /export state json/i });
    expect(exportBtn).toBeDefined();

    // Mock URL.createObjectURL and click to verify export trigger
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    fireEvent.click(exportBtn);
    expect(createObjectURLMock).toHaveBeenCalled();

    // Import file input exists
    const fileInput = screen.getByLabelText(/upload backup json file/i) as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.type).toBe('file');
  });

  it('Zone 5: renders granular subsystem maintenance operations with clear descriptions', () => {
    renderSettings();

    // 1. Reset Settings Only button
    const resetSettingsBtn = screen.getByRole('button', { name: /reset settings only/i });
    expect(resetSettingsBtn).toBeDefined();
    fireEvent.click(resetSettingsBtn);

    // 2. Reset Assessment Profile Only button
    const resetProfileBtn = screen.getByRole('button', { name: /reset profile only/i });
    expect(resetProfileBtn).toBeDefined();
    fireEvent.click(resetProfileBtn);

    // 3. Reset Assessment History button
    const resetHistoryBtn = screen.getByRole('button', { name: /reset assessment history/i });
    expect(resetHistoryBtn).toBeDefined();
    fireEvent.click(resetHistoryBtn);
  });

  it('Zone 6: renders isolated Danger Zone and requires exact phrase in ConfirmFullResetModal', async () => {
    renderSettings();

    // Danger zone trigger
    const openResetModalBtn = screen.getByRole('button', { name: /reset application data/i });
    expect(openResetModalBtn).toBeDefined();

    // Click to open modal
    fireEvent.click(openResetModalBtn);

    // Modal appears
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: /^full application data reset$/i })).toBeDefined();
    expect(screen.getByText(/warning: destructive local state wipe/i)).toBeDefined();

    const submitBtn = screen.getByRole('button', { name: /execute full reset/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const input = screen.getByLabelText(/confirm full reset by typing reset data/i) as HTMLInputElement;
    expect(input).toBeDefined();

    // Typing wrong text leaves button disabled
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(submitBtn.disabled).toBe(true);

    // Typing exact phrase enables execution button
    fireEvent.change(input, { target: { value: 'RESET DATA' } });
    expect(submitBtn.disabled).toBe(false);

    // Submitting executes reset and closes modal
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('Zone 4: handles invalid import safely without overwriting working state', async () => {
    renderSettings();

    const fileInput = screen.getByLabelText(/upload backup json file/i) as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const invalidFile = new File(['{ invalid json: true '], 'corrupt-backup.json', {
      type: 'application/json',
    });
    // In jsdom if file.text is not implemented, provide polyfill
    if (!invalidFile.text) {
      invalidFile.text = async () => '{ invalid json: true ';
    }

    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      configurable: true,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/import failed/i)).toBeDefined();
    });

    // Dismiss alert
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  it('Zone 4: handles valid backup import and restores state', async () => {
    renderSettings();

    const loaded = StorageAdapter.loadState();
    loaded.userSettings.targetPlacementGoal = 'Staff Machine Learning Engineer';
    const validJson = StorageAdapter.exportJSON(loaded);

    const fileInput = screen.getByLabelText(/upload backup json file/i) as HTMLInputElement;

    const validFile = new File([validJson], 'valid-backup.json', {
      type: 'application/json',
    });
    if (!validFile.text) {
      validFile.text = async () => validJson;
    }

    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/successfully restored and validated/i)).toBeDefined();
    });
  });

  it('Zone 6: closes ConfirmFullResetModal on Escape key and Cancel button', async () => {
    renderSettings();

    const openResetModalBtn = screen.getByRole('button', { name: /reset application data/i });
    fireEvent.click(openResetModalBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Reopen and click Cancel button
    fireEvent.click(openResetModalBtn);
    expect(screen.getByRole('dialog')).toBeDefined();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('Notification lifecycle: displays, auto-dismisses after 3000ms, and cleans up timer on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderSettings();

    // Trigger update notification
    const goalInput = screen.getByLabelText(/target career goal \/ objective/i) as HTMLInputElement;
    act(() => {
      fireEvent.change(goalInput, { target: { value: 'Staff Engineer' } });
      fireEvent.blur(goalInput);
    });

    // Notification is visible
    expect(screen.getByText(/Target career goal updated/i)).toBeDefined();

    // Fast-forward 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Notification dismissed
    expect(screen.queryByText(/Target career goal updated/i)).toBeNull();

    // Trigger another notification and unmount while active
    act(() => {
      fireEvent.change(goalInput, { target: { value: 'Tech Lead' } });
      fireEvent.blur(goalInput);
    });
    expect(screen.getByText(/Target career goal updated/i)).toBeDefined();

    // Unmount safely with pending timer
    act(() => {
      unmount();
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();
  });
});
