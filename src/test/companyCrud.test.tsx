// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { CompaniesView } from '../components/companies/CompaniesView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type {
  CompanyOverlay,
  DSAProgress,
  DomainId,
  PracticeAttempt,
  PreparationTopicProgress,
  TaskProgress,
  TopicSkillState,
} from '../types';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COMPANY_A: CompanyOverlay = {
  id: 'comp-a',
  companyName: 'Original Name',
  targetRole: 'Original Role',
  applicationStatus: 'applied',
  eventDate: '2026-10-15',
  requiredDomains: ['dsa'],
  requiredTopics: ['topic-dsa-arrays', 'topic-dbms-acid'],
  requiredLanguages: ['cpp'],
};

const COMPANY_B: CompanyOverlay = {
  id: 'comp-b',
  companyName: 'Second Corp',
  targetRole: 'Data Engineer',
  applicationStatus: 'oa_scheduled',
  eventDate: '2027-01-10',
  requiredDomains: ['dbms'],
  requiredTopics: ['topic-dbms-acid'],
  requiredLanguages: ['java'],
};

const renderCompanies = () =>
  render(
    <PlacementProvider>
      <CompaniesView />
    </PlacementProvider>
  );

const readState = () => StorageAdapter.loadState() as AppExtendedStorageState;

const seedState = (
  companies: CompanyOverlay[],
  extras: Partial<AppExtendedStorageState> = {}
) => {
  const payload: AppExtendedStorageState = {
    ...(getDefaultStorageState() as AppExtendedStorageState),
    ...extras,
    companyOverlays: companies,
  };
  StorageAdapter.saveState(payload);
  return payload;
};

const nameInput = () => screen.getByPlaceholderText('e.g. Google, Amazon, Microsoft') as HTMLInputElement;
const roleInput = () => screen.getByPlaceholderText('e.g. SDE-1, Software Intern') as HTMLInputElement;
const languageInput = () =>
  screen.getByPlaceholderText('e.g. cpp, java, python, sql') as HTMLInputElement;
const dateInput = (container: HTMLElement) =>
  container.querySelector('input[type="date"]') as HTMLInputElement;
const statusSelect = (container: HTMLElement) => container.querySelector('select') as HTMLSelectElement;
const submitForm = (container: HTMLElement) => {
  const form = container.querySelector('form');
  if (!form) throw new Error('Company form is not rendered');
  fireEvent.submit(form);
};
const clickAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add Target Company' }));
const clickEdit = (index = 0) =>
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit Company' })[index]);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('C4 — CompanyModal lifecycle (C4-01)', () => {
  it('A. Add opens a clean form, saves a complete record, and reloads unchanged', () => {
    const { container } = renderCompanies();

    clickAdd();

    // A1 — clean new-company form
    expect(nameInput().value).toBe('');
    expect(roleInput().value).toBe('');
    expect(dateInput(container).value).toBe('');
    expect(statusSelect(container).value).toBe('target');
    expect(languageInput().value).toBe('cpp, java');

    // A2 — fill every exposed field
    fireEvent.change(nameInput(), { target: { value: 'Acme Corp' } });
    fireEvent.change(roleInput(), { target: { value: 'SDE-1' } });
    fireEvent.change(dateInput(container), { target: { value: '2026-11-20' } });
    fireEvent.change(statusSelect(container), { target: { value: 'applied' } });
    fireEvent.change(languageInput(), { target: { value: 'cpp, python' } });
    fireEvent.click(screen.getByRole('button', { name: 'OS' }));
    submitForm(container);

    // A3 — complete company record
    const stored = readState();
    expect(stored.companyOverlays).toHaveLength(1);
    const saved = stored.companyOverlays[0];
    expect(saved.companyName).toBe('Acme Corp');
    expect(saved.targetRole).toBe('SDE-1');
    expect(saved.applicationStatus).toBe('applied');
    expect(saved.eventDate).toBe('2026-11-20');
    expect(saved.requiredDomains).toEqual(['dsa', 'dbms', 'os']);
    expect(saved.requiredLanguages).toEqual(['cpp', 'python']);
    // A company the user has not mapped any topics for claims none.
    expect(saved.requiredTopics).toEqual([]);
    expect(saved.id).toMatch(/^comp-/);

    // A4 — reload-equivalent hydration
    expect(readState().companyOverlays).toEqual(stored.companyOverlays);
  });

  it('B1. Edit populates every editable field from that exact company', () => {
    seedState([COMPANY_A]);
    const { container } = renderCompanies();

    clickEdit();

    expect(nameInput().value).toBe('Original Name');
    expect(roleInput().value).toBe('Original Role');
    expect(dateInput(container).value).toBe('2026-10-15');
    expect(statusSelect(container).value).toBe('applied');
    expect(languageInput().value).toBe('cpp');

    // Saving without touching anything must reproduce the record exactly —
    // this is what proves the domain selection and the hidden fields
    // (id, requiredTopics) were populated rather than defaulted.
    submitForm(container);
    expect(readState().companyOverlays).toEqual([COMPANY_A]);
  });

  it('B2. saving an edit changes only the intended fields and survives reload', () => {
    seedState([COMPANY_A]);
    const { container } = renderCompanies();

    clickEdit();
    fireEvent.change(nameInput(), { target: { value: 'Renamed Corp' } });
    fireEvent.change(roleInput(), { target: { value: 'Principal Engineer' } });
    fireEvent.change(dateInput(container), { target: { value: '2026-12-01' } });
    submitForm(container);

    const stored = readState();
    expect(stored.companyOverlays).toHaveLength(1);
    const updated = stored.companyOverlays[0];

    expect(updated.companyName).toBe('Renamed Corp');
    expect(updated.targetRole).toBe('Principal Engineer');
    expect(updated.eventDate).toBe('2026-12-01');

    // Everything the user did not touch is preserved.
    expect(updated.id).toBe('comp-a');
    expect(updated.applicationStatus).toBe('applied');
    expect(updated.requiredTopics).toEqual(COMPANY_A.requiredTopics);
    expect(updated.requiredDomains).toEqual(['dsa']);
    expect(updated.requiredLanguages).toEqual(['cpp']);

    // …and the untouched remainder is byte-for-byte the original record.
    expect({
      ...updated,
      companyName: COMPANY_A.companyName,
      targetRole: COMPANY_A.targetRole,
      eventDate: COMPANY_A.eventDate,
    }).toEqual(COMPANY_A);

    // Reload
    expect(readState().companyOverlays).toEqual(stored.companyOverlays);
  });

  it("C. switching the edit target shows B's values, not A's", () => {
    seedState([COMPANY_A, COMPANY_B]);
    const { container } = renderCompanies();

    expect(screen.getAllByRole('button', { name: 'Edit Company' })).toHaveLength(2);

    clickEdit(0);
    expect(nameInput().value).toBe('Original Name');
    expect(roleInput().value).toBe('Original Role');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    clickEdit(1);
    expect(nameInput().value).toBe('Second Corp');
    expect(roleInput().value).toBe('Data Engineer');
    expect(dateInput(container).value).toBe('2027-01-10');
    expect(statusSelect(container).value).toBe('oa_scheduled');
    expect(languageInput().value).toBe('java');

    // Explicitly not A's values
    expect(nameInput().value).not.toBe('Original Name');
    expect(roleInput().value).not.toBe('Original Role');
  });

  it("C2. closing and reopening the same company discards an abandoned edit", () => {
    seedState([COMPANY_A]);
    const { container } = renderCompanies();

    clickEdit();
    fireEvent.change(nameInput(), { target: { value: 'Typo That Was Never Saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    clickEdit();
    expect(nameInput().value).toBe('Original Name');
    expect(dateInput(container).value).toBe('2026-10-15');
  });

  it('C4-03 production path. editing a company with no topic mapping saves none', () => {
    seedState([{ ...COMPANY_A, requiredTopics: [] }]);
    const { container } = renderCompanies();

    clickEdit();
    submitForm(container);

    const stored = readState();
    expect(stored.companyOverlays).toHaveLength(1);
    expect(stored.companyOverlays[0].requiredTopics).toEqual([]);
    expect(stored.companyOverlays[0].requiredTopics).not.toContain('topic-dsa-arrays');
  });
});

describe('C4 — delete (C4-02)', () => {
  it('D. delete requires confirmation, removes only that company, and survives reload', () => {
    seedState([COMPANY_A, COMPANY_B]);
    renderCompanies();

    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);

    // Staging a delete must not delete anything.
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(readState().companyOverlays).toHaveLength(2);
    // …and cancelling must not either.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(readState().companyOverlays).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);

    // Confirm the first delete.
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    const afterFirst = readState();
    expect(afterFirst.companyOverlays).toHaveLength(1);
    expect(afterFirst.companyOverlays[0]).toEqual(COMPANY_B);
    expect(readState().companyOverlays).toEqual(afterFirst.companyOverlays); // reload

    // Delete the last one.
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    expect(readState().companyOverlays).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Confirm Delete' })).toBeNull();
    expect(screen.getByText('No target companies yet')).toBeTruthy();
  });

  it('D2. deleting a company whose requirement detail is open closes that detail', () => {
    seedState([COMPANY_A, COMPANY_B]);
    renderCompanies();

    fireEvent.click(screen.getAllByRole('button', { name: /Inspect Requirements/ })[0]);
    expect(screen.getByText('Original Name Requirements')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    expect(screen.queryByText('Original Name Requirements')).toBeNull();
    expect(readState().companyOverlays.map((c) => c.id)).toEqual(['comp-b']);
  });

  it('C4-05. a clean baseline shows an explanatory empty state with an Add action', () => {
    renderCompanies();

    expect(screen.getByText('No target companies yet')).toBeTruthy();
    expect(screen.getByText(/map its assessment date/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Add/ }).length).toBeGreaterThan(0);
    // The card grid is not rendered.
    expect(screen.queryByRole('button', { name: 'Edit Company' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('C4-05b. the empty state disappears as soon as a company exists', () => {
    seedState([COMPANY_A]);
    renderCompanies();

    expect(screen.queryByText('No target companies yet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Company' })).toBeTruthy();
  });
});

describe('C4 — unrelated-state safety (C4-07)', () => {
  const buildUnrelatedState = () => {
    const base = getDefaultStorageState() as AppExtendedStorageState;

    const taskId = Object.keys(base.taskProgress)[0];
    const dsaId = Object.keys(base.dsaProgress)[0];
    const skillId = Object.keys(base.skillStates)[0];

    const taskProgress: Record<string, TaskProgress> = {
      ...base.taskProgress,
      [taskId]: {
        ...base.taskProgress[taskId],
        state: 'completed',
        lastCompletedAt: '2026-09-27T10:00:00Z',
        timeSpentMinutes: 45,
        updatedAt: '2026-09-27',
      },
    };

    const dsaProgress: Record<string, DSAProgress> = {
      ...base.dsaProgress,
      [dsaId]: {
        ...base.dsaProgress[dsaId],
        currentBox: 3,
        attemptCount: 5,
        passedIndependently: true,
        evidenceStrength: 60,
        lastAttemptAt: '2026-09-27T11:00:00Z',
        updatedAt: '2026-09-27',
      },
    };

    const skillStates: Record<string, TopicSkillState> = {
      ...base.skillStates,
      [skillId]: {
        ...base.skillStates[skillId],
        freshness: 'fresh',
        evidenceStrength: 72,
        lastPracticedAt: '2026-09-27T10:00:00Z',
      },
    };

    const preparationTopicProgress = {
      'prep-sql': {
        topicId: 'prep-sql',
        evidenceStrength: 55,
        freshness: 'fresh',
        totalTimeSpentMinutes: 120,
      },
    } as unknown as Record<string, PreparationTopicProgress>;

    const practiceAttempts: PracticeAttempt[] = [
      {
        id: 'attempt-c4',
        sessionId: 'practice-sql-01',
        sessionTitle: 'SQL Query Scenarios',
        category: 'sql',
        domainId: 'sql',
        topicId: 'prep-sql',
        date: '2026-09-27',
        completedAt: '2026-09-27T09:00:00.000Z',
        totalTimeSeconds: 300,
        scorePct: 75,
        accuracyPct: 75,
        correctCount: 3,
        totalQuestions: 4,
        passed: true,
        passingScorePct: 70,
        userAnswers: [],
      },
    ];

    return {
      base,
      unrelated: { taskProgress, dsaProgress, skillStates, preparationTopicProgress, practiceAttempts },
    };
  };

  it('E. deleting a company leaves task, DSA, skill, preparation and practice state deep-equal', () => {
    const { base, unrelated } = buildUnrelatedState();
    const payload: AppExtendedStorageState = {
      ...base,
      ...unrelated,
      companyOverlays: [COMPANY_A, COMPANY_B],
    };
    StorageAdapter.saveState(payload);

    const before = structuredClone({
      taskProgress: payload.taskProgress,
      dsaProgress: payload.dsaProgress,
      skillStates: payload.skillStates,
      preparationTopicProgress: payload.preparationTopicProgress,
      practiceAttempts: payload.practiceAttempts,
    });

    renderCompanies();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    const after = readState();

    // Only the company list changed.
    expect(after.companyOverlays).toEqual([COMPANY_B]);
    expect(after.taskProgress).toEqual(before.taskProgress);
    expect(after.dsaProgress).toEqual(before.dsaProgress);
    expect(after.skillStates).toEqual(before.skillStates);
    expect(after.preparationTopicProgress).toEqual(before.preparationTopicProgress);
    expect(after.practiceAttempts).toEqual(before.practiceAttempts);
  });
});

describe('C4 — event date (C4-06)', () => {
  it('H. eventDate survives add, reload, edit and reload exactly', () => {
    const { container } = renderCompanies();

    clickAdd();
    fireEvent.change(nameInput(), { target: { value: 'Date Corp' } });
    fireEvent.change(roleInput(), { target: { value: 'SDE-2' } });
    fireEvent.change(dateInput(container), { target: { value: '2026-11-30' } });
    submitForm(container);

    expect(readState().companyOverlays[0].eventDate).toBe('2026-11-30');
    expect(readState().companyOverlays[0].eventDate).toBe('2026-11-30'); // reload

    clickEdit();
    expect(dateInput(container).value).toBe('2026-11-30');
    fireEvent.change(dateInput(container), { target: { value: '2027-02-14' } });
    submitForm(container);

    expect(readState().companyOverlays[0].eventDate).toBe('2027-02-14');
    expect(readState().companyOverlays[0].eventDate).toBe('2027-02-14'); // reload

    // Clearing the date stores an absent date, not an empty string.
    clickEdit();
    fireEvent.change(dateInput(container), { target: { value: '' } });
    submitForm(container);
    expect(readState().companyOverlays[0].eventDate).toBeUndefined();
  });

  it('H2. an existing eventDate is untouched by an edit that does not change it', () => {
    seedState([COMPANY_A]);
    const { container } = renderCompanies();

    clickEdit();
    fireEvent.change(nameInput(), { target: { value: 'Date Safe Corp' } });
    submitForm(container);

    expect(readState().companyOverlays[0].eventDate).toBe('2026-10-15');
    // The edit saved cleanly and the modal closed.
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('C4 — domain selection integrity', () => {
  it('preserves the exact configured domains across an untouched edit round-trip', () => {
    const multi: CompanyOverlay = {
      ...COMPANY_A,
      id: 'comp-multi',
      requiredDomains: ['dsa', 'os', 'cn'] as DomainId[],
    };
    seedState([multi]);
    const { container } = renderCompanies();

    clickEdit();
    submitForm(container);

    expect(readState().companyOverlays[0].requiredDomains).toEqual(['dsa', 'os', 'cn']);
  });
});
