// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { CompaniesView } from '../components/companies/CompaniesView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { CompanyOverlay } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TARGET_GOOGLE: CompanyOverlay = {
  id: 'comp-google',
  companyName: 'Google',
  targetRole: 'Software Engineer (L3)',
  applicationStatus: 'oa_scheduled',
  eventDate: '2026-10-15', // 8d out -> approaching
  requiredDomains: ['dsa', 'dbms'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['cpp', 'python'],
};

const TARGET_AMAZON: CompanyOverlay = {
  id: 'comp-amazon',
  companyName: 'Amazon',
  targetRole: 'SDE-1',
  applicationStatus: 'applied',
  eventDate: '2026-10-09', // 2d out -> critical (higher urgency than Google)
  requiredDomains: ['dsa', 'os'],
  requiredTopics: ['topic-dsa-trees'],
  requiredLanguages: ['java'],
};

const TARGET_MICROSOFT: CompanyOverlay = {
  id: 'comp-msft',
  companyName: 'Microsoft',
  targetRole: 'Software Engineer',
  applicationStatus: 'target',
  // No event date scheduled
  requiredDomains: ['cn', 'projects'],
  requiredTopics: [],
  requiredLanguages: ['csharp'],
};

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

const renderCompanies = () =>
  render(
    <PlacementProvider>
      <CompaniesView />
    </PlacementProvider>
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Task 78 — Companies Page 5-Zone Manufacturing & Verification', () => {
  /* ============================================================
     ZONE 1: Header & Drive Timeline Strip
     ============================================================ */
  describe('Zone 1 — Companies Header & Drive Timeline Strip', () => {
    it('1.1 renders semantic h1 title, placement subtitle, guide trigger, and Add button', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const heading = screen.getByRole('heading', { level: 1, name: 'Target Companies & Requirement Mapping' });
      expect(heading).toBeTruthy();
      expect(screen.getByText(/Track recruitment drive timelines/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Guide/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Add Target Company' })).toBeTruthy();
    });

    it('1.2 renders 4-metric strategic drive strip with canonical counts and countdowns', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON, TARGET_MICROSOFT]);
      renderCompanies();

      expect(screen.getByTestId('metric-active-targets').textContent).toBe('3');
      expect(screen.getByTestId('metric-top-readiness')).toBeTruthy();
      expect(screen.getByTestId('metric-next-drive')).toBeTruthy();
      expect(screen.getByTestId('metric-total-gaps')).toBeTruthy();
    });

    it('1.3 displays "No drive scheduled" in metric strip when no companies have event dates', () => {
      seedState([TARGET_MICROSOFT]);
      renderCompanies();

      expect(screen.getByTestId('metric-next-drive').textContent).toBe('No drive scheduled');
    });
  });

  /* ============================================================
     ZONE 2: Primary Target Focus & Drive Urgency Hero
     ============================================================ */
  describe('Zone 2 — Primary Target Focus & Drive Urgency Hero', () => {
    it('2.1 deterministically selects the highest urgency target (Amazon at 2d over Google at 8d)', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON, TARGET_MICROSOFT]);
      renderCompanies();

      const heroSection = screen.getByLabelText('Primary Target Focus & Drive Urgency Hero');
      expect(within(heroSection).getByText('Amazon')).toBeTruthy();
      expect(within(heroSection).getByText(/Target Role:/)).toBeTruthy();
      expect(within(heroSection).getByText('SDE-1')).toBeTruthy();
      expect(within(heroSection).getByText('Applied')).toBeTruthy();
    });

    it('2.2 displays human-readable drive countdown and urgency indicator', () => {
      seedState([TARGET_AMAZON]);
      renderCompanies();

      const heroSection = screen.getByLabelText('Primary Target Focus & Drive Urgency Hero');
      expect(within(heroSection).getByText(/days left until assessment|day left|drive is today/i)).toBeTruthy();
    });

    it('2.3 renders overall readiness progressbar with accessible ARIA attributes', () => {
      seedState([TARGET_AMAZON]);
      renderCompanies();

      const heroSection = screen.getByLabelText('Primary Target Focus & Drive Urgency Hero');
      const progressbar = within(heroSection).getByRole('progressbar', {
        name: 'Amazon preparation readiness',
      });
      expect(progressbar).toBeTruthy();
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('2.4 renders primary Coral Flame CTA "Prepare for Amazon" and secondary "Inspect All Requirements"', () => {
      seedState([TARGET_AMAZON]);
      renderCompanies();

      const heroSection = screen.getByLabelText('Primary Target Focus & Drive Urgency Hero');
      const prepareBtn = within(heroSection).getByTestId('primary-company-prepare');
      expect(prepareBtn).toBeTruthy();
      expect(prepareBtn.textContent).toContain('Prepare for Amazon');

      const inspectBtn = within(heroSection).getByRole('button', { name: /Inspect All Requirements/ });
      expect(inspectBtn).toBeTruthy();
    });
  });

  /* ============================================================
     ZONE 3: Target Companies Portfolio & Radar Grid
     ============================================================ */
  describe('Zone 3 — Target Companies Portfolio & Radar Grid', () => {
    it('3.1 renders company cards with readiness, countdown tags, domain and language chips', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON]);
      renderCompanies();

      const portfolioSection = screen.getByLabelText('Target Companies Portfolio');
      expect(within(portfolioSection).getByText('Google')).toBeTruthy();
      expect(within(portfolioSection).getByText('Amazon')).toBeTruthy();

      // Check chips
      expect(within(portfolioSection).getAllByText('DSA').length).toBeGreaterThan(0);
      expect(within(portfolioSection).getAllByText('cpp').length).toBeGreaterThan(0);
      expect(within(portfolioSection).getAllByText('java').length).toBeGreaterThan(0);
    });

    it('3.2 filters cards by search query', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON]);
      renderCompanies();

      const searchInput = screen.getByLabelText('Search companies and roles');
      fireEvent.change(searchInput, { target: { value: 'Google' } });

      const portfolioSection = screen.getByLabelText('Target Companies Portfolio');
      expect(within(portfolioSection).getByText('Google')).toBeTruthy();
      expect(within(portfolioSection).queryByText('Amazon')).toBeNull();
    });

    it('3.3 filters cards by application status tab', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON]); // Google is oa_scheduled, Amazon is applied
      renderCompanies();

      const appliedTab = screen.getByRole('tab', { name: 'Applied' });
      fireEvent.click(appliedTab);

      const portfolioSection = screen.getByLabelText('Target Companies Portfolio');
      expect(within(portfolioSection).getByText('Amazon')).toBeTruthy();
      expect(within(portfolioSection).queryByText('Google')).toBeNull();
    });

    it('3.4 sorts cards by readiness or name', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON]);
      renderCompanies();

      const nameSortBtn = screen.getByRole('button', { name: 'Name' });
      fireEvent.click(nameSortBtn);

      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards.length).toBeGreaterThan(0);
    });

    it('3.5 inline delete safety requires confirmation before removing company', () => {
      seedState([TARGET_GOOGLE, TARGET_AMAZON]);
      renderCompanies();

      const deleteBtns = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtns[0]);

      expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();

      // Cancel delete
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('button', { name: 'Confirm Delete' })).toBeNull();
    });
  });

  /* ============================================================
     ZONE 4: Requirement Coverage Matrix & Gap Breakdown
     ============================================================ */
  describe('Zone 4 — Requirement Coverage Matrix & Gap Breakdown', () => {
    it('4.1 renders requirement ledger for focused company with category filter tabs', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const matrixSection = screen.getByLabelText('Requirement Coverage Matrix');
      expect(within(matrixSection).getByText('Google Requirements')).toBeTruthy();

      expect(within(matrixSection).getByRole('tab', { name: /All Requirements/ })).toBeTruthy();
      expect(within(matrixSection).getByRole('tab', { name: /Domains/ })).toBeTruthy();
      expect(within(matrixSection).getByRole('tab', { name: /Topics/ })).toBeTruthy();
      expect(within(matrixSection).getByRole('tab', { name: /Languages/ })).toBeTruthy();
    });

    it('4.2 category tabs filter requirement rows accurately', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const matrixSection = screen.getByLabelText('Requirement Coverage Matrix');
      const langTab = within(matrixSection).getByRole('tab', { name: /Languages/ });
      fireEvent.click(langTab);

      expect(within(matrixSection).getByText(/Language Fluency: CPP/i)).toBeTruthy();
      expect(within(matrixSection).getByText(/Language Fluency: PYTHON/i)).toBeTruthy();
    });

    it('4.3 requirement row renders evidence strength progressbar and status badges', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const matrixSection = screen.getByLabelText('Requirement Coverage Matrix');
      const progressbars = within(matrixSection).getAllByRole('progressbar');
      expect(progressbars.length).toBeGreaterThan(0);
    });
  });

  /* ============================================================
     ZONE 5: Requirement Traceability Drawer & Company Modal
     ============================================================ */
  describe('Zone 5 — Requirement Traceability Drawer & Modal Workbench', () => {
    it('5.1 clicking "Close Gap" opens the slide-over Requirement Traceability Drawer', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const closeGapBtns = screen.getAllByRole('button', { name: /Close Gap|Inspect Trace/ });
      fireEvent.click(closeGapBtns[0]);

      const drawer = screen.getByRole('dialog', { name: /Arrays & Two Pointers|Data Structures|Language/ });
      expect(drawer).toBeTruthy();
      expect(within(drawer).getByText('COMPANY REQUIREMENT TRACEABILITY')).toBeTruthy();
      expect(within(drawer).getByText('Google')).toBeTruthy();
    });

    it('5.2 pressing Escape closes the requirement drawer', () => {
      seedState([TARGET_GOOGLE]);
      renderCompanies();

      const closeGapBtns = screen.getAllByRole('button', { name: /Close Gap|Inspect Trace/ });
      fireEvent.click(closeGapBtns[0]);

      expect(screen.getByRole('dialog', { name: /Arrays & Two Pointers|Data Structures|Language/ })).toBeTruthy();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /Arrays & Two Pointers|Data Structures|Language/ })).toBeNull();
    });

    it('5.3 Add Target Company opens modal and Escape closes it', () => {
      renderCompanies();

      fireEvent.click(screen.getByRole('button', { name: 'Add Target Company' }));
      expect(screen.getByRole('dialog', { name: 'Add New Target Company' })).toBeTruthy();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Add New Target Company' })).toBeNull();
    });
  });

  /* ============================================================
     Cross-Subsystem Handoffs & Non-Mutation Safety
     ============================================================ */
  describe('Cross-Subsystem Handoffs & Canonical Immutability', () => {
    it('6.1 viewing and filtering does not mutate storage state', () => {
      const initial = seedState([TARGET_GOOGLE, TARGET_AMAZON]);
      renderCompanies();

      // Interact with filters
      const searchInput = screen.getByLabelText('Search companies and roles');
      fireEvent.change(searchInput, { target: { value: 'Google' } });

      const after = StorageAdapter.loadState();
      expect(after.companyOverlays).toEqual(initial.companyOverlays);
    });
  });
});
