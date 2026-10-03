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

// React 19 requires this flag for act()-based updates outside a test renderer.
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

const VALID_ROUTES = [
  'dashboard',
  'roadmap',
  'dsa',
  'skills',
  'practice',
  'preparation',
  'project',
  'companies',
  'analytics',
  'settings',
  'assessment',
  'interview',
];

const COMPANY: CompanyOverlay = {
  id: 'comp-interview-ui',
  companyName: 'Acme Corp',
  targetRole: 'Software Engineer',
  applicationStatus: 'interview_scheduled',
  eventDate: '2026-11-01',
  requiredDomains: ['dsa'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['python'],
};

const renderView = () =>
  render(
    <PlacementProvider>
      <InterviewReadinessView />
    </PlacementProvider>
  );

const seedState = (extras: Partial<AppExtendedStorageState> = {}) => {
  const payload: AppExtendedStorageState = {
    ...(getDefaultStorageState() as AppExtendedStorageState),
    ...extras,
  };
  StorageAdapter.saveState(payload);
  return payload;
};

describe('InterviewReadinessView', () => {
  beforeEach(() => {
    StorageAdapter.clearState();
    window.location.hash = '#/interview';
  });

  afterEach(() => {
    cleanup();
    StorageAdapter.clearState();
  });

  describe('A — page render', () => {
    it('A1. renders the scorecard header and one consolidated summary area', () => {
      renderView();

      expect(
        screen.getByRole('heading', { name: 'Interview Readiness Scorecard' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('readiness-summary')).toBeInTheDocument();
      expect(screen.getByTestId('overall-band')).toBeInTheDocument();
      expect(screen.getByTestId('signal-chips')).toBeInTheDocument();
    });

    it('A2. summary reports no single blended readiness percentage', () => {
      renderView();
      const summary = screen.getByTestId('readiness-summary');
      expect(summary.textContent).not.toMatch(/\d+% (interview )?ready/i);
      expect(summary.textContent).not.toMatch(/overall readiness:/i);
      // the three inputs stay individually labelled
      expect(screen.getByTestId('overall-evidence-value')).toBeInTheDocument();
      expect(screen.getByTestId('overall-confidence-value')).toBeInTheDocument();
      expect(screen.getByTestId('overall-freshness-value')).toBeInTheDocument();
    });
  });

  describe('B — the six dimension rows', () => {
    it('B1. every interview dimension is present exactly once', () => {
      renderView();

      DIMENSION_IDS.forEach((id, i) => {
        const row = screen.getByTestId(`dimension-row-${id}`);
        expect(row).toBeInTheDocument();
        expect(row.textContent).toContain(DIMENSION_NAMES[i]);
      });
      expect(screen.getAllByTestId(/dimension-row-/)).toHaveLength(6);
    });

    it('B2. each row shows a band, an evidence summary and exactly one next step', () => {
      renderView();

      DIMENSION_IDS.forEach((id) => {
        const row = screen.getByTestId(`dimension-row-${id}`);
        expect(screen.getByTestId(`dimension-band-${id}`)).toBeInTheDocument();
        expect(
          ['Strong', 'Developing', 'Needs Work', 'Unassessed'].some((label) =>
            screen.getByTestId(`dimension-band-${id}`).textContent?.includes(label)
          )
        ).toBe(true);
        expect(screen.getByTestId(`dimension-action-${id}`)).toBeInTheDocument();
        expect(row.textContent).toContain('Next step');
      });
    });

    it('B3. capability, confidence and freshness are rendered as three separate signals', () => {
      renderView();

      DIMENSION_IDS.forEach((id) => {
        const capability = screen.getByTestId(`dimension-capability-${id}`);
        const confidence = screen.getByTestId(`dimension-confidence-${id}`);
        const freshness = screen.getByTestId(`dimension-freshness-${id}`);

        expect(capability.textContent).toContain('Capability');
        expect(confidence.textContent).toContain('Confidence');
        expect(freshness.textContent).toContain('Freshness');

        // three distinct nodes, never merged into one value
        expect(capability).not.toBe(confidence);
        expect(confidence).not.toBe(freshness);
        expect(capability).not.toBe(freshness);
      });
    });

    it('B4. expanding a row reveals the evidence trace and the three detailed meters', () => {
      renderView();

      const toggle = screen.getByTestId('dimension-toggle-coding_dsa');
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
  });

  describe('C — weakness and remediation signals', () => {
    it('C1. the active remediation, stale and weak signals are all surfaced', () => {
      renderView();
      const signals = screen.getByTestId('signal-chips');
      expect(signals.textContent).toContain('Active remediation');
      expect(signals.textContent).toContain('Stale dimensions');
      expect(signals.textContent).toContain('Weak evidence');

      const detail = screen.getByTestId('weakness-signals');
      expect(detail.textContent).toContain('Active Weakness');
      expect(screen.getByTestId('signal-action-dsa')).toBeInTheDocument();
      expect(screen.getByTestId('signal-action-analytics')).toBeInTheDocument();
    });
  });

  describe('D — assessment summary', () => {
    it('D1. reports the unassessed state with a real route to the diagnostic', () => {
      renderView();

      const section = screen.getByTestId('assessment-summary');
      expect(section).toBeInTheDocument();
      expect(screen.getByTestId('assessment-status')).toHaveTextContent('Not assessed');
      expect(screen.getByTestId('assessment-reassessment')).toHaveTextContent('No');
      expect(screen.getByTestId('assessment-action')).toBeInTheDocument();
    });

    it('D2. reports ability, focus area, strengths and weaknesses once assessed', () => {
      seedState({
        assessmentState: {
          attempts: [
            {
              id: 'att-ui-1',
              definitionId: 'baseline-diagnostic-v1',
              definitionVersion: 1,
              kind: 'diagnostic_assessment',
              status: 'submitted',
              startedAt: '2026-10-01T09:00:00.000Z',
              endedAt: '2026-10-01T11:00:00.000Z',
              timeLimitSeconds: 10800,
              seed: 'seed-ui',
              selectedItemIds: ['asm-item-1'],
            },
          ],
          responses: [],
          exposures: {},
          domainResults: [
            {
              domainId: 'dsa',
              abilityScore: 74,
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
              attemptId: 'att-ui-1',
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
      renderView();

      const section = screen.getByTestId('assessment-summary');
      expect(screen.getByTestId('assessment-status')).toHaveTextContent('Assessed');
      expect(section.textContent).toContain('Overall ability');
      expect(section.textContent).toContain('Focus area');
      expect(section.textContent).toContain('Strengths');
      expect(section.textContent).toContain('Weaknesses');
      expect(section.textContent).toContain('Reassessment recommended');
      expect(section.textContent).toMatch(/\d+%/);
    });
  });

  describe('E — Project Lab readiness', () => {
    it('E1. shows sections, defense evidence and defense readiness separately', () => {
      renderView();

      const section = screen.getByTestId('project-readiness');
      expect(section).toBeInTheDocument();
      expect(screen.getByTestId('defense-band')).toBeInTheDocument();
      expect(section.textContent).toMatch(/Sections:\s*0\/6/);
      expect(section.textContent).toContain('Defense evidence:');
      expect(section.textContent).toContain('No recorded defense yet');
      expect(screen.getByTestId('project-action')).toBeInTheDocument();
    });

    it('E2. a recorded, passed defense updates the readout', () => {
      const attempts: PracticeAttempt[] = [
        {
          id: 'pa-ui-defense',
          sessionId: 'practice-project-defense-01',
          sessionTitle: 'Project Defense',
          category: 'project_defense',
          domainId: 'projects',
          topicId: 'prep-interview-career',
          date: '2026-10-02',
          completedAt: '2026-10-02T10:00:00.000Z',
          totalTimeSeconds: 900,
          scorePct: 88,
          accuracyPct: 88,
          correctCount: 7,
          totalQuestions: 8,
          passed: true,
          userAnswers: [],
        },
      ];
      seedState({ practiceAttempts: attempts });
      renderView();

      const section = screen.getByTestId('project-readiness');
      expect(section.textContent).toMatch(/Sections:\s*2\/6/);
      expect(screen.getByTestId('defense-band')).toHaveTextContent('Defense: Developing');
      expect(section.textContent).toContain('2026-10-02');
    });
  });

  describe('F — company overlay', () => {
    it('F1. with no company selected the general scorecard stands alone', () => {
      renderView();

      expect(screen.getByTestId('company-overlay-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('company-dimension-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('company-gap-badge')).not.toBeInTheDocument();
      DIMENSION_IDS.forEach((id) => {
        expect(screen.queryByTestId(`dimension-company-required-${id}`)).not.toBeInTheDocument();
      });
    });

    it('F2. selecting a company adds required/non-required context, event date and gap', () => {
      seedState({ companyOverlays: [COMPANY] });
      renderView();

      fireEvent.change(screen.getByTestId('interview-company-select'), {
        target: { value: COMPANY.id },
      });

      expect(screen.queryByTestId('company-overlay-empty')).not.toBeInTheDocument();
      const list = screen.getByTestId('company-dimension-list');
      expect(list).toBeInTheDocument();

      const coding = screen.getByTestId('company-dimension-coding_dsa');
      expect(coding.textContent).toContain('Required');
      expect(screen.getByTestId('company-dimension-sql_programming').textContent).toContain(
        'Not required'
      );

      expect(screen.getByTestId('company-gap-badge')).toBeInTheDocument();
      expect(screen.getByTestId('company-days-until')).toBeInTheDocument();
      expect(screen.getByTestId('company-overlay').textContent).toContain('Acme Corp');
      expect(screen.getByTestId('company-overlay').textContent).toContain('2026-11-01');
      expect(screen.getByTestId('company-action')).toBeInTheDocument();
    });

    it('F3. choosing a company does not change the general readiness summary', () => {
      seedState({ companyOverlays: [COMPANY] });
      renderView();

      const before = screen.getByTestId('readiness-summary').textContent;
      const bandsBefore = DIMENSION_IDS.map(
        (id) => screen.getByTestId(`dimension-band-${id}`).textContent
      );
      const capabilityBefore = DIMENSION_IDS.map(
        (id) => screen.getByTestId(`dimension-capability-${id}`).textContent
      );

      fireEvent.change(screen.getByTestId('interview-company-select'), {
        target: { value: COMPANY.id },
      });

      expect(screen.getByTestId('readiness-summary').textContent).toBe(before);
      DIMENSION_IDS.forEach((id, i) => {
        expect(screen.getByTestId(`dimension-band-${id}`).textContent).toBe(bandsBefore[i]);
        expect(screen.getByTestId(`dimension-capability-${id}`).textContent).toBe(
          capabilityBefore[i]
        );
      });

      // the overlay is additive: the required marker appears on the row
      expect(screen.getByTestId('dimension-company-required-coding_dsa')).toBeInTheDocument();
    });
  });

  describe('G — action routing', () => {
    it('G1. every dimension action navigates to a real existing route', () => {
      renderView();

      DIMENSION_IDS.forEach((id) => {
        const button = screen.getByTestId(`dimension-action-${id}`);
        fireEvent.click(button);

        const hash = window.location.hash.replace('#/', '').split('/')[0];
        expect(VALID_ROUTES).toContain(hash);
        expect(hash).not.toBe('interview');
      });
    });

    it('G2. the weakness, assessment, project and company shortcuts route for real', () => {
      seedState({ companyOverlays: [COMPANY] });
      renderView();

      fireEvent.change(screen.getByTestId('interview-company-select'), {
        target: { value: COMPANY.id },
      });

      const clicks: Array<[string, string]> = [
        ['signal-action-dsa', 'dsa'],
        ['signal-action-analytics', 'analytics'],
        ['assessment-action', 'assessment'],
        ['project-action', 'project'],
        ['company-action', 'companies'],
      ];

      for (const [testId, expectedRoute] of clicks) {
        fireEvent.click(screen.getByTestId(testId));
        expect(window.location.hash).toBe(`#/${expectedRoute}`);
      }
    });
  });

  describe('H — empty, partial and repeated renders', () => {
    it('H1. a fresh install with no evidence still renders the full scorecard', () => {
      renderView();

      expect(screen.getByTestId('readiness-summary')).toBeInTheDocument();
      expect(screen.getAllByTestId(/dimension-row-/)).toHaveLength(6);
      DIMENSION_IDS.forEach((id) => {
        expect(screen.getByTestId(`dimension-band-${id}`).textContent).toBe('Unassessed');
      });
      expect(screen.getByTestId('assessment-status')).toHaveTextContent('Not assessed');
      expect(screen.getByTestId('company-overlay-empty')).toBeInTheDocument();

      const signals = screen.getByTestId('weakness-signals');
      expect(signals.textContent).toContain('Active remediation');
      expect(signals.textContent).toContain('Stale dimensions');
      expect(signals.textContent).toContain('Weak evidence');
      expect(signals.textContent).toContain('DSA remediation flags');
      expect(screen.getByTestId('signal-action-dsa')).toBeInTheDocument();
      expect(screen.getByTestId('signal-action-analytics')).toBeInTheDocument();
      // either the explicit "none recorded" copy or a listed dimension weakness
      expect(
        signals.textContent.includes('No active weakness or remediation signals recorded') ||
          /\w+: .+: /.test(signals.textContent)
      ).toBe(true);
    });

    it('H2. partial / orphaned data does not crash the view', () => {
      seedState({
        skillStates: {
          'ghost-topic': {
            topicId: 'ghost-topic',
            domainId: 'dsa',
            freshness: 'fresh',
            evidenceStrength: 12,
          },
        },
        practiceAttempts: [
          {
            id: 'pa-ghost',
            sessionId: 'session-that-never-existed',
            sessionTitle: 'Ghost Session',
            category: 'project_defense',
            domainId: 'projects',
            date: '2026-10-02',
            completedAt: '2026-10-02T10:00:00.000Z',
            totalTimeSeconds: 60,
            scorePct: 50,
            accuracyPct: 50,
            correctCount: 1,
            totalQuestions: 2,
            passed: false,
            userAnswers: [],
          },
        ],
        evidenceLogs: [
          {
            id: 'ev-ghost',
            topicId: 'topic-that-is-gone',
            domainId: 'dsa',
            score: 91,
            confidence: 4,
            timestamp: '2026-10-02T10:00:00.000Z',
            sourceType: 'practice_session',
            sourceId: 'ghost-source',
          },
        ],
        dailyTaskAssignments: [
          {
            id: 'assign-ghost',
            date: '2020-01-01',
            taskType: 'catalog_task',
            referenceId: 'task-that-is-gone',
            allocatedMinutes: 30,
            completed: false,
          },
        ],
      });

      expect(() => renderView()).not.toThrow();
      expect(screen.getAllByTestId(/dimension-row-/)).toHaveLength(6);
      expect(screen.getByTestId('readiness-summary')).toBeInTheDocument();
    });

    it('H3. repeated renders of identical state produce identical output', () => {
      renderView();
      const first = {
        summary: screen.getByTestId('readiness-summary').textContent,
        signals: screen.getByTestId('signal-chips').textContent,
        dimensions: DIMENSION_IDS.map((id) => ({
          band: screen.getByTestId(`dimension-band-${id}`).textContent,
          capability: screen.getByTestId(`dimension-capability-${id}`).textContent,
          confidence: screen.getByTestId(`dimension-confidence-${id}`).textContent,
          freshness: screen.getByTestId(`dimension-freshness-${id}`).textContent,
          action: screen.getByTestId(`dimension-action-${id}`).textContent,
        })),
      };
      cleanup();

      renderView();
      const second = {
        summary: screen.getByTestId('readiness-summary').textContent,
        signals: screen.getByTestId('signal-chips').textContent,
        dimensions: DIMENSION_IDS.map((id) => ({
          band: screen.getByTestId(`dimension-band-${id}`).textContent,
          capability: screen.getByTestId(`dimension-capability-${id}`).textContent,
          confidence: screen.getByTestId(`dimension-confidence-${id}`).textContent,
          freshness: screen.getByTestId(`dimension-freshness-${id}`).textContent,
          action: screen.getByTestId(`dimension-action-${id}`).textContent,
        })),
      };

      expect(second).toEqual(first);
    });

    it('H4. mounting the view leaves persisted user data untouched', () => {
      // hydrate first so we isolate the view's own writes
      renderView();
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
      renderView();
      expect(snapshot()).toBe(before);
    });
  });
});
