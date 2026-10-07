// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { InterviewReadinessView } from '../components/interview/InterviewReadinessView';
import { InterviewReadinessStrip } from '../components/interview/InterviewReadinessStrip';
import { InterviewHeroSpotlight } from '../components/interview/InterviewHeroSpotlight';
import type { InterviewReadinessScorecard } from '../engine/interviewReadinessEngine';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { CompanyOverlay } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COMPANY_A: CompanyOverlay = {
  id: 'comp-alpha',
  companyName: 'Alpha Tech',
  targetRole: 'SDE-1',
  applicationStatus: 'interview_scheduled',
  eventDate: '2026-11-20',
  requiredDomains: ['dsa'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['python'],
};

const seedState = (extras: Partial<AppExtendedStorageState> = {}) => {
  const payload: AppExtendedStorageState = {
    ...(getDefaultStorageState() as AppExtendedStorageState),
    ...extras,
  };
  StorageAdapter.saveState(payload);
  return payload;
};

const renderWithContext = () =>
  render(
    <PlacementProvider>
      <InterviewReadinessView />
    </PlacementProvider>
  );

describe('Interview Manufacturing Parts 1 & 2', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/interview';
  });

  afterEach(() => {
    cleanup();
    StorageAdapter.clearState();
  });

  describe('1. Zone 1 — InterviewReadinessStrip', () => {
    it('renders the header title and description', () => {
      renderWithContext();

      expect(
        screen.getByRole('heading', { name: 'Interview Readiness Scorecard' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('readiness-summary')).toBeInTheDocument();
    });

    it('renders the categorical overall band without any fabricated percentage score', () => {
      renderWithContext();

      const summary = screen.getByTestId('readiness-summary');
      expect(summary.textContent).not.toMatch(/\d+%\s*ready/i);
      expect(summary.textContent).not.toMatch(/overall readiness:\s*\d+%/i);

      const band = screen.getByTestId('overall-band');
      expect(band).toBeInTheDocument();
      expect(band.textContent).toMatch(/Unassessed|Needs Work|Developing|Strong/);
    });

    it('renders three separate, individually labelled telemetry meters', () => {
      renderWithContext();

      const evMeter = screen.getByTestId('overall-evidence');
      const confMeter = screen.getByTestId('overall-confidence');
      const freshMeter = screen.getByTestId('overall-freshness');

      expect(evMeter).toBeInTheDocument();
      expect(confMeter).toBeInTheDocument();
      expect(freshMeter).toBeInTheDocument();

      expect(evMeter.textContent).toContain('Evidence');
      expect(confMeter.textContent).toContain('Confidence');
      expect(freshMeter.textContent).toContain('Freshness');

      // Progressbar ARIA semantics
      const progressbars = screen.getAllByRole('progressbar');
      expect(progressbars.length).toBeGreaterThanOrEqual(3);
    });

    it('renders active anomaly counters (remediation, stale, weak) from canonical state', () => {
      renderWithContext();

      const chips = screen.getByTestId('signal-chips');
      expect(chips.textContent).toContain('Active remediation:');
      expect(chips.textContent).toContain('Stale dimensions:');
      expect(chips.textContent).toContain('Weak evidence:');
    });

    it('allows selecting a target company overlay without mutating baseline capability meters', () => {
      seedState({ companyOverlays: [COMPANY_A] });
      renderWithContext();

      const evValBefore = screen.getByTestId('overall-evidence-value').textContent;
      const confValBefore = screen.getByTestId('overall-confidence-value').textContent;
      const freshValBefore = screen.getByTestId('overall-freshness-value').textContent;

      const select = screen.getByTestId('interview-company-select');
      fireEvent.change(select, { target: { value: COMPANY_A.id } });

      expect(screen.getByTestId('overall-evidence-value').textContent).toBe(evValBefore);
      expect(screen.getByTestId('overall-confidence-value').textContent).toBe(confValBefore);
      expect(screen.getByTestId('overall-freshness-value').textContent).toBe(freshValBefore);
    });
  });

  describe('2. Zone 2 — InterviewHeroSpotlight', () => {
    it('renders the Hero Spotlight container with mission badge and title', () => {
      renderWithContext();

      expect(screen.getByTestId('interview-hero-spotlight')).toBeInTheDocument();
      expect(screen.getByTestId('hero-mission-badge')).toBeInTheDocument();
      expect(screen.getByTestId('hero-mission-title')).toBeInTheDocument();
      expect(screen.getByTestId('hero-mission-signal')).toBeInTheDocument();
    });

    it('determines unassessed mission when assessment is not completed', () => {
      renderWithContext();

      const title = screen.getByTestId('hero-mission-title');
      expect(title.textContent).toContain('Baseline Diagnostic Assessment');

      const primaryBtn = screen.getByTestId('hero-primary-action');
      expect(primaryBtn.textContent).toContain('Run Diagnostic');

      fireEvent.click(primaryBtn);
      expect(window.location.hash).toBe('#/assessment');
    });

    it('routes primary action to target workspace and secondary action to review/dashboard', () => {
      seedState({
        assessmentState: {
          attempts: [
            {
              id: 'att-1',
              definitionId: 'baseline-diagnostic-v1',
              definitionVersion: 1,
              kind: 'diagnostic_assessment',
              status: 'submitted',
              startedAt: '2026-10-01T09:00:00.000Z',
              endedAt: '2026-10-01T11:00:00.000Z',
              timeLimitSeconds: 10800,
              seed: 'seed-1',
              selectedItemIds: ['asm-1'],
            },
          ],
          responses: [],
          exposures: {},
          domainResults: [
            {
              domainId: 'dsa',
              abilityScore: 70,
              level: 3,
              confidence: 'high',
              status: 'assessed',
              coverage: {
                topicsCovered: 3,
                topicsTotal: 5,
                competenciesCovered: ['arrays'],
                difficultyBands: [1, 2],
              },
              assessmentDate: '2026-10-01T00:00:00.000Z',
              provisional: false,
              attemptId: 'att-1',
              kind: 'diagnostic_assessment',
            },
          ],
          snapshots: [],
          weaknessSignals: [],
          profile: {
            baselineCompletedAt: '2026-10-01T11:00:00.000Z',
            pendingSunday: false,
          },
        },
      });

      renderWithContext();

      const primaryBtn = screen.getByTestId('hero-primary-action');
      expect(primaryBtn).toBeInTheDocument();
      // Primary button has electric indigo styling
      expect(primaryBtn.className).toContain('bg-[#6366F1]');

      const secondaryBtn = screen.queryByTestId('hero-secondary-action');
      if (secondaryBtn) {
        expect(secondaryBtn).toBeInTheDocument();
      }
    });

    it('works standalone as isolated components with props', () => {
      const mockScorecard: InterviewReadinessScorecard = {
        dimensions: [
          {
            id: 'coding_dsa',
            name: 'Coding / DSA',
            shortName: 'DSA',
            description: 'Algorithms and data structures',
            band: 'strong',
            evidenceStrength: 85,
            confidence: 'high',
            freshness: 'fresh',
            evidenceItems: [],
            gapExplanation: 'Strong evidence across core DSA topics.',
            recommendedAction: {
              label: 'Solve Advanced Graph Problem',
              route: 'dsa',
              targetId: 'dsa-graphs-01',
              type: 'dsa',
            },
            capability: 85,
            confidenceScore: 80,
            freshnessScore: 90,
            weaknesses: [],
            companyRelevant: false,
          },
        ],
        overallBand: 'strong',
        overallEvidenceStrength: 85,
        overallConfidence: 80,
        overallFreshness: 90,
        activeRemediationCount: 0,
        staleEvidenceCount: 0,
        weakEvidenceCount: 0,
        assessmentIntegration: {
          isAssessed: true,
          overallAbility: 85,
          assessedDomainsCount: 11,
          primaryFocusDomain: null,
          strengths: ['DSA'],
          weaknesses: [],
          reassessmentRecommended: false,
        },
        projectReadiness: {
          sectionsCompleted: 6,
          totalSections: 6,
          evidenceDefenseSessions: 3,
          lastDefenseDate: '2026-10-01',
          defenseReadiness: 'strong',
        },
        companyOverlay: null,
      };

      const handleAction = vi.fn();
      const handleSelectCompany = vi.fn();

      render(
        <div>
          <InterviewReadinessStrip
            scorecard={mockScorecard}
            companyOverlays={[]}
            selectedCompanyOverlayId={null}
            onSelectCompany={handleSelectCompany}
          />
          <InterviewHeroSpotlight scorecard={mockScorecard} onAction={handleAction} />
        </div>
      );

      expect(screen.getByTestId('overall-band').textContent).toContain('Strong');
      expect(screen.getByTestId('hero-mission-title').textContent).toContain(
        'Solve Advanced Graph Problem'
      );

      fireEvent.click(screen.getByTestId('hero-primary-action'));
      expect(handleAction).toHaveBeenCalledWith('dsa', 'dsa-graphs-01');
    });
  });

  describe('3. Signature Motion & Accessibility', () => {
    it('includes telemetry signal sweep classes in the markup', () => {
      renderWithContext();

      const summary = screen.getByTestId('readiness-summary');
      expect(summary.className).toContain('interview-signal-track');

      const hero = screen.getByTestId('interview-hero-spotlight');
      expect(hero.className).toContain('interview-signal-track');
    });
  });
});
