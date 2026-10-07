// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlacementProvider } from '../context/PlacementContext';
import { InterviewReadinessView } from '../components/interview/InterviewReadinessView';
import {
  StorageAdapter,
  getDefaultStorageState,
  type AppExtendedStorageState,
} from '../storage/storageAdapter';
import type { CompanyOverlay, PracticeAttempt } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIMENSION_IDS = [
  'coding_dsa',
  'core_cs',
  'sql_programming',
  'communication',
  'interview_execution',
  'projects',
];

const DIMENSION_NAMES = [
  'Coding / DSA',
  'Core CS Fundamentals',
  'SQL / Programming Fundamentals',
  'Communication',
  'Interview Execution',
  'Projects / Project Lab',
];

const COMPANY_TARGET: CompanyOverlay = {
  id: 'comp-beta',
  companyName: 'Beta Systems',
  targetRole: 'Software Engineer',
  applicationStatus: 'interview_scheduled',
  eventDate: '2026-11-15',
  requiredDomains: ['dsa', 'dbms'],
  requiredTopics: ['topic-dsa-trees', 'topic-sql-joins'],
  requiredLanguages: ['python', 'sql'],
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

describe('Interview Manufacturing Parts 3–5 Verification', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/interview';
  });

  afterEach(() => {
    cleanup();
    StorageAdapter.clearState();
  });

  describe('1. Zone 3 — Six-Vector Readiness Dimension Matrix', () => {
    it('renders all 6 canonical readiness dimensions', () => {
      renderWithContext();

      expect(screen.getByTestId('dimension-list')).toBeInTheDocument();
      DIMENSION_IDS.forEach((id, idx) => {
        const row = screen.getByTestId(`dimension-row-${id}`);
        expect(row).toBeInTheDocument();
        expect(row.textContent).toContain(DIMENSION_NAMES[idx]);
      });
      expect(screen.getAllByTestId(/dimension-row-/)).toHaveLength(6);
    });

    it('reports Capability, Confidence, and Freshness as three distinct orthogonal values per dimension', () => {
      renderWithContext();

      DIMENSION_IDS.forEach((id) => {
        const cap = screen.getByTestId(`dimension-capability-${id}`);
        const conf = screen.getByTestId(`dimension-confidence-${id}`);
        const fresh = screen.getByTestId(`dimension-freshness-${id}`);

        expect(cap).toBeInTheDocument();
        expect(conf).toBeInTheDocument();
        expect(fresh).toBeInTheDocument();

        expect(cap.textContent).toContain('Capability');
        expect(conf.textContent).toContain('Confidence');
        expect(fresh.textContent).toContain('Freshness');
      });
    });

    it('expands dimension card on click to reveal detailed meters and EvidenceTracePanel', () => {
      renderWithContext();

      const toggle = screen.getByTestId('dimension-toggle-coding_dsa');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('dimension-detail-coding_dsa')).not.toBeInTheDocument();

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('dimension-detail-coding_dsa')).toBeInTheDocument();
      expect(screen.getByTestId('detail-capability-coding_dsa')).toBeInTheDocument();
      expect(screen.getByTestId('detail-confidence-coding_dsa')).toBeInTheDocument();
      expect(screen.getByTestId('detail-freshness-coding_dsa')).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('dimension-detail-coding_dsa')).not.toBeInTheDocument();
    });

    it('renders deterministic next step action on each dimension navigating to real routes', () => {
      renderWithContext();

      DIMENSION_IDS.forEach((id) => {
        const btn = screen.getByTestId(`dimension-action-${id}`);
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        const currentHash = window.location.hash.replace('#/', '').split('/')[0];
        expect([
          'dashboard',
          'assessment',
          'roadmap',
          'dsa',
          'skills',
          'preparation',
          'practice',
          'project',
          'companies',
          'analytics',
        ]).toContain(currentHash);
      });
    });
  });

  describe('2. Zone 4 — Subsystem Cross-Readiness & Signal Hub', () => {
    it('renders Active Weakness & Remediation triage center with shortcut buttons', () => {
      renderWithContext();

      const signals = screen.getByTestId('weakness-signals');
      expect(signals).toBeInTheDocument();
      expect(signals.textContent).toContain('Active Weakness & Remediation Signals');
      expect(screen.getByTestId('signal-action-dsa')).toBeInTheDocument();
      expect(screen.getByTestId('signal-action-analytics')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('signal-action-dsa'));
      expect(window.location.hash).toBe('#/dsa');

      fireEvent.click(screen.getByTestId('signal-action-analytics'));
      expect(window.location.hash).toBe('#/analytics');
    });

    it('renders Assessment Summary showing status, ability, strengths, and reassessment flag', () => {
      seedState({
        assessmentState: {
          attempts: [
            {
              id: 'att-diag-1',
              definitionId: 'baseline-diagnostic-v1',
              definitionVersion: 1,
              kind: 'diagnostic_assessment',
              status: 'submitted',
              startedAt: '2026-10-01T09:00:00.000Z',
              endedAt: '2026-10-01T11:00:00.000Z',
              timeLimitSeconds: 10800,
              seed: 'seed-diag',
              selectedItemIds: ['asm-diag-1'],
            },
          ],
          responses: [],
          exposures: {},
          domainResults: [
            {
              domainId: 'dsa',
              abilityScore: 82,
              level: 4,
              confidence: 'high',
              status: 'assessed',
              coverage: {
                topicsCovered: 4,
                topicsTotal: 5,
                competenciesCovered: ['trees'],
                difficultyBands: [1, 2, 3],
              },
              assessmentDate: '2026-10-01T00:00:00.000Z',
              provisional: false,
              attemptId: 'att-diag-1',
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

      expect(screen.getByTestId('assessment-summary')).toBeInTheDocument();
      expect(screen.getByTestId('assessment-status')).toHaveTextContent('Assessed');
      expect(screen.getByTestId('assessment-reassessment')).toHaveTextContent('No');

      const actionBtn = screen.getByTestId('assessment-action');
      expect(actionBtn).toBeInTheDocument();
      fireEvent.click(actionBtn);
      expect(window.location.hash).toBe('#/assessment');
    });

    it('renders Project Lab Readiness showing defense band, section count, and defense attempts', () => {
      const attempts: PracticeAttempt[] = [
        {
          id: 'pa-defense-pass',
          sessionId: 'practice-project-defense-01',
          sessionTitle: 'Project Defense',
          category: 'project_defense',
          domainId: 'projects',
          topicId: 'prep-interview-career',
          date: '2026-10-03',
          completedAt: '2026-10-03T10:00:00.000Z',
          totalTimeSeconds: 600,
          scorePct: 90,
          accuracyPct: 90,
          correctCount: 4,
          totalQuestions: 4,
          passed: true,
          userAnswers: [],
        },
      ];

      seedState({ practiceAttempts: attempts });
      renderWithContext();

      const projectSection = screen.getByTestId('project-readiness');
      expect(projectSection).toBeInTheDocument();
      expect(screen.getByTestId('defense-band')).toHaveTextContent('Defense: Developing');
      expect(projectSection.textContent).toMatch(/Sections:\s*2\/6/);
      expect(screen.getByTestId('project-action')).toBeInTheDocument();
      expect(screen.getByTestId('project-defense-action')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('project-action'));
      expect(window.location.hash).toBe('#/project');
    });
  });

  describe('3. Zone 5 — Target Company Alignment & Evidence Ledger', () => {
    it('renders empty overlay state when no company is selected', () => {
      renderWithContext();

      expect(screen.getByTestId('company-overlay-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('company-dimension-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('company-gap-badge')).not.toBeInTheDocument();
    });

    it('renders required dimensions, gap severity, and days countdown when company is selected', () => {
      seedState({ companyOverlays: [COMPANY_TARGET] });
      renderWithContext();

      fireEvent.change(screen.getByTestId('interview-company-select'), {
        target: { value: COMPANY_TARGET.id },
      });

      expect(screen.getByTestId('company-overlay')).toBeInTheDocument();
      expect(screen.queryByTestId('company-overlay-empty')).not.toBeInTheDocument();
      expect(screen.getByTestId('company-gap-badge')).toBeInTheDocument();
      expect(screen.getByTestId('company-days-until')).toBeInTheDocument();
      expect(screen.getByTestId('company-dimension-list')).toBeInTheDocument();

      const codingDim = screen.getByTestId('company-dimension-coding_dsa');
      expect(codingDim.textContent).toContain('Required');

      fireEvent.click(screen.getByTestId('company-action'));
      expect(window.location.hash).toBe('#/companies');
    });
  });

  describe('4. Complete Architecture Orchestration & Cross-Cutting Gates', () => {
    it('orchestrates all 5 zones cleanly in the render tree', () => {
      renderWithContext();

      expect(screen.getByTestId('readiness-summary')).toBeInTheDocument(); // Zone 1
      expect(screen.getByTestId('interview-hero-spotlight')).toBeInTheDocument(); // Zone 2
      expect(screen.getByTestId('dimension-list')).toBeInTheDocument(); // Zone 3
      expect(screen.getByTestId('weakness-signals')).toBeInTheDocument(); // Zone 4
      expect(screen.getByTestId('assessment-summary')).toBeInTheDocument(); // Zone 4
      expect(screen.getByTestId('project-readiness')).toBeInTheDocument(); // Zone 4
      expect(screen.getByTestId('company-overlay')).toBeInTheDocument(); // Zone 5
    });

    it('mounting the view leaves persisted user data untouched', () => {
      renderWithContext();
      cleanup();

      const snapshot = () => {
        const s = StorageAdapter.loadState() as AppExtendedStorageState;
        return JSON.stringify({
          companyOverlays: s.companyOverlays,
          practiceAttempts: s.practiceAttempts,
          evidenceLogs: s.evidenceLogs,
          skillStates: s.skillStates,
          dailyCheckIns: s.dailyCheckIns,
          dailyTaskAssignments: s.dailyTaskAssignments,
          preparationTopicProgress: s.preparationTopicProgress,
          assessmentState: s.assessmentState,
        });
      };

      const before = snapshot();
      renderWithContext();
      expect(snapshot()).toBe(before);
    });
  });
});
