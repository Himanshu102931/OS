// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  generateInterviewReadinessScorecard,
  type InterviewReadinessScorecard,
} from '../engine/interviewReadinessEngine';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TOPICS, DOMAINS, TASK_DEFINITIONS, PHASES } from '../data/seedData';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import type {
  AssessmentState,
  CompanyOverlay,
  DSAProgress,
  DomainAssessmentResult,
  PracticeAttempt,
  TopicSkillState,
  WeaknessSignal,
} from '../types';

type ScorecardOptions = Parameters<typeof generateInterviewReadinessScorecard>[0];

const TODAY = '2026-10-15';
const DIMENSION_IDS = [
  'coding_dsa',
  'core_cs',
  'sql_programming',
  'communication',
  'interview_execution',
  'projects',
];

/** Fully deterministic base options built only from canonical seed datasets. */
function baseOptions(overrides: Partial<ScorecardOptions> = {}): ScorecardOptions {
  return {
    tasks: TASK_DEFINITIONS,
    taskProgress: {},
    dsaProblems: DSA_PROBLEMS,
    dsaProgress: {},
    dsaAttempts: [],
    topics: TOPICS,
    domains: DOMAINS,
    skillStates: {},
    companyOverlays: [],
    practiceAttempts: [],
    practiceSessions: PRACTICE_SESSIONS,
    preparationTopics: PREPARATION_TOPICS,
    preparationTopicProgress: {},
    domainResults: [],
    weaknessSignals: [],
    evidenceLogs: [],
    todayStr: TODAY,
    activePhase: PHASES[0],
    ...overrides,
  };
}

function build(overrides: Partial<ScorecardOptions> = {}): InterviewReadinessScorecard {
  return generateInterviewReadinessScorecard(baseOptions(overrides));
}

function dimension(sc: InterviewReadinessScorecard, id: string) {
  const found = sc.dimensions.find((d) => d.id === id);
  if (!found) throw new Error(`dimension ${id} missing from scorecard`);
  return found;
}

function makeDsaProgress(problemId: string, overrides: Partial<DSAProgress> = {}): DSAProgress {
  return {
    problemId,
    currentBox: 1,
    nextReviewAt: undefined,
    lastAttemptAt: undefined,
    attemptCount: 0,
    passedIndependently: false,
    consecutiveAssistedPasses: 0,
    assistedProvisional: false,
    consecutiveFailures: 0,
    remediationRequired: false,
    patternLessonViewed: false,
    patternLessonCompleted: false,
    remediationSelfCheckPassed: false,
    evidenceStrength: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSignal(id: string, status: WeaknessSignal['status']): WeaknessSignal {
  return {
    id,
    domainId: 'dsa',
    errorCategory: 'off_by_one',
    strength: 2,
    status,
    firstSeenAt: '2026-10-01T00:00:00.000Z',
    lastSeenAt: '2026-10-02T00:00:00.000Z',
    occurrences: 2,
    sourceAttemptIds: [],
  };
}

function makeSkillState(topicId: string, evidenceStrength: number): TopicSkillState {
  return {
    topicId,
    domainId: 'dsa',
    freshness: 'aging',
    evidenceStrength,
  };
}

function makeDomainResult(
  domainId: DomainAssessmentResult['domainId'],
  overrides: Partial<DomainAssessmentResult> = {}
): DomainAssessmentResult {
  return {
    domainId,
    abilityScore: 72,
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
    attemptId: 'att-interview-readiness-1',
    kind: 'diagnostic_assessment',
    ...overrides,
  };
}

function makeAssessmentState(
  domainResults: DomainAssessmentResult[]
): AssessmentState {
  return {
    attempts: [
      {
        id: 'att-interview-readiness-1',
        definitionId: 'baseline-diagnostic-v1',
        definitionVersion: 1,
        kind: 'diagnostic_assessment',
        status: 'submitted',
        startedAt: '2026-10-01T09:00:00.000Z',
        endedAt: '2026-10-01T11:00:00.000Z',
        timeLimitSeconds: 10800,
        seed: 'seed-interview-readiness',
        selectedItemIds: ['asm-item-1'],
      },
    ],
    responses: [],
    exposures: {},
    domainResults,
    snapshots: [],
    weaknessSignals: [],
    profile: {
      baselineCompletedAt: '2026-10-01T11:00:00.000Z',
      pendingSunday: false,
    },
  };
}

const codingSession = PRACTICE_SESSIONS.find(
  (s) => s.domainId === 'dsa' || s.domainId === 'python'
);
const defenseSession = PRACTICE_SESSIONS.find((s) => s.category === 'project_defense');
if (!codingSession || !defenseSession) {
  throw new Error('expected canonical coding + project defense practice sessions in seed data');
}

function makeAttempt(
  id: string,
  overrides: Partial<PracticeAttempt> = {}
): PracticeAttempt {
  return {
    id,
    sessionId: defenseSession!.id,
    sessionTitle: defenseSession!.title,
    category: 'project_defense',
    domainId: 'projects',
    topicId: 'prep-interview-career',
    date: '2026-10-10',
    completedAt: '2026-10-10T12:00:00.000Z',
    totalTimeSeconds: 600,
    scorePct: 80,
    accuracyPct: 80,
    correctCount: 4,
    totalQuestions: 5,
    passed: true,
    userAnswers: [],
    ...overrides,
  };
}

function makeCompany(overrides: Partial<CompanyOverlay> = {}): CompanyOverlay {
  const dsaTopic = TOPICS.find((t) => t.domainId === 'dsa');
  return {
    id: 'comp-interview-readiness',
    companyName: 'Acme Corp',
    targetRole: 'Software Engineer',
    applicationStatus: 'interview_scheduled',
    eventDate: '2026-11-01', // 17 days after TODAY -> critical
    requiredDomains: ['dsa'],
    requiredTopics: dsaTopic ? [dsaTopic.id] : [],
    requiredLanguages: ['python'],
    ...overrides,
  };
}

/** Same composite the engine uses — kept here to detect band/score drift. */
function expectedBand(evidence: number, confidence: number, freshness: number) {
  const composite = Math.round(0.5 * evidence + 0.25 * confidence + 0.25 * freshness);
  if (composite >= 75) return 'strong' as const;
  if (composite >= 50) return 'developing' as const;
  if (composite >= 25) return 'needs_work' as const;
  return 'unassessed' as const;
}

describe('Interview Readiness Scorecard engine', () => {
  describe('A — determinism and shape', () => {
    it('A1. identical inputs produce byte-identical scorecards', () => {
      const first = generateInterviewReadinessScorecard(baseOptions());
      const second = generateInterviewReadinessScorecard(baseOptions());
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });

    it('A2. carries no wall-clock timestamp — the result is fully input-derived', () => {
      const sc = build();
      expect('generatedAt' in sc).toBe(false);
      expect(Object.keys(sc)).not.toContain('generatedAt');
    });

    it('A3. never mutates the canonical inputs it is given', () => {
      const options = baseOptions();
      const snapshot = JSON.stringify(options);
      generateInterviewReadinessScorecard(options);
      expect(JSON.stringify(options)).toBe(snapshot);
    });

    it('A4. always returns the six interview dimensions in a stable order', () => {
      const sc = build();
      expect(sc.dimensions.map((d) => d.id)).toEqual(DIMENSION_IDS);
      expect(sc.dimensions.map((d) => d.name)).toEqual([
        'Coding / DSA',
        'Core CS Fundamentals',
        'SQL / Programming Fundamentals',
        'Communication',
        'Interview Execution',
        'Projects / Project Lab',
      ]);
    });

    it('A5. every dimension exposes capability, confidence, freshness and weaknesses as separate fields', () => {
      const sc = build();
      for (const d of sc.dimensions) {
        expect(typeof d.capability).toBe('number');
        expect(typeof d.confidenceScore).toBe('number');
        expect(typeof d.freshnessScore).toBe('number');
        expect(d.capability).toBeGreaterThanOrEqual(0);
        expect(d.capability).toBeLessThanOrEqual(100);
        expect(d.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(d.confidenceScore).toBeLessThanOrEqual(100);
        expect(d.freshnessScore).toBeGreaterThanOrEqual(0);
        expect(d.freshnessScore).toBeLessThanOrEqual(100);
        // capability and evidence are the same measured quantity — confidence
        // and freshness are carried on their own fields, never folded in.
        expect(d.capability).toBe(d.evidenceStrength);
        expect(d.weaknesses).toBeInstanceOf(Array);
        expect(Array.isArray(d.evidenceItems)).toBe(true);
        expect(d.gapExplanation.length).toBeGreaterThan(0);
        expect(['high', 'medium', 'low', 'none']).toContain(d.confidence);
        expect(['fresh', 'aging', 'stale', 'untested']).toContain(d.freshness);
      }
    });

    it('A6. the overall band is recomputable from the three separate inputs', () => {
      const sc = build();
      expect(sc.overallBand).toBe(
        expectedBand(sc.overallEvidenceStrength, sc.overallConfidence, sc.overallFreshness)
      );
      for (const d of sc.dimensions) {
        expect(d.band).toBe(
          expectedBand(d.evidenceStrength, d.confidenceScore, d.freshnessScore)
        );
      }
    });

    it('A7. evidence items are well-formed and reference canonical sources', () => {
      const realTopic = TOPICS.find((t) => t.domainId === 'dsa') ?? TOPICS[0];
      const codingAttempt: PracticeAttempt = {
        id: 'pa-evidence-1',
        sessionId: codingSession!.id,
        sessionTitle: codingSession!.title,
        category: codingSession!.category,
        domainId: codingSession!.domainId,
        topicId: codingSession!.topicId,
        date: '2026-10-12',
        completedAt: '2026-10-12T10:00:00.000Z',
        totalTimeSeconds: 1200,
        scorePct: 85,
        accuracyPct: 85,
        correctCount: 17,
        totalQuestions: 20,
        passed: true,
        userAnswers: [],
      };
      const sc = build({
        practiceAttempts: [codingAttempt],
        skillStates: {
          [realTopic.id]: {
            topicId: realTopic.id,
            domainId: realTopic.domainId,
            freshness: 'fresh',
            evidenceStrength: 88,
          },
        },
      });
      const validSources = new Set([
        'dsa',
        'skill',
        'practice',
        'task',
        'assessment',
        'project',
        'evidence_log',
      ]);
      let total = 0;
      for (const d of sc.dimensions) {
        for (const ev of d.evidenceItems) {
          total++;
          expect(validSources.has(ev.source)).toBe(true);
          expect(ev.description.length).toBeGreaterThan(0);
          expect(ev.strength).toBeGreaterThanOrEqual(0);
          expect(ev.strength).toBeLessThanOrEqual(100);
          expect(['fresh', 'aging', 'stale', 'untested']).toContain(ev.freshness);
        }
      }
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('B — capability, confidence and freshness stay separate', () => {
    it('B1. assessment confidence raises confidence but never inflates capability', () => {
      const without = build({ domainResults: [] });
      const withAssessment = build({
        domainResults: [makeDomainResult('dsa'), makeDomainResult('python')],
      });

      const a = dimension(without, 'coding_dsa');
      const b = dimension(withAssessment, 'coding_dsa');

      expect(b.confidenceScore).toBeGreaterThan(a.confidenceScore);
      expect(b.capability).toBe(a.capability);
      expect(b.evidenceStrength).toBe(a.evidenceStrength);
      expect(b.freshnessScore).toBe(a.freshnessScore);

      expect(withAssessment.overallConfidence).toBeGreaterThan(without.overallConfidence);
      expect(withAssessment.overallEvidenceStrength).toBe(without.overallEvidenceStrength);
      expect(withAssessment.overallFreshness).toBe(without.overallFreshness);
    });

    it('B2. overall confidence and freshness are their own reported values, not one blended percentage', () => {
      const sc = build();
      expect(sc.overallEvidenceStrength).toBe(
        Math.round(
          sc.dimensions.reduce((sum, d) => sum + d.evidenceStrength, 0) / sc.dimensions.length
        )
      );
      expect(sc.overallConfidence).toBe(
        Math.round(
          sc.dimensions.reduce((sum, d) => sum + d.confidenceScore, 0) / sc.dimensions.length
        )
      );
      expect(sc.overallFreshness).toBe(
        Math.round(
          sc.dimensions.reduce((sum, d) => sum + d.freshnessScore, 0) / sc.dimensions.length
        )
      );
      expect('overallReadinessPercentage' in sc).toBe(false);
      expect('overallPercentage' in sc).toBe(false);
    });

    it('B3. practice evidence freshness tracks the supplied day, while capability does not move', () => {
      const attempt: PracticeAttempt = {
        id: 'pa-1',
        sessionId: codingSession!.id,
        sessionTitle: codingSession!.title,
        category: codingSession!.category,
        domainId: codingSession!.domainId,
        topicId: codingSession!.topicId,
        date: '2026-01-02',
        completedAt: '2026-01-02T10:00:00.000Z',
        totalTimeSeconds: 900,
        scorePct: 90,
        accuracyPct: 90,
        correctCount: 9,
        totalQuestions: 10,
        passed: true,
        userAnswers: [],
      };
      const options = baseOptions({ practiceAttempts: [attempt] });

      const soon = generateInterviewReadinessScorecard({ ...options, todayStr: '2026-01-05' });
      const muchLater = generateInterviewReadinessScorecard({ ...options, todayStr: '2026-07-05' });

      const soonDim = dimension(soon, 'coding_dsa');
      const laterDim = dimension(muchLater, 'coding_dsa');

      expect(soonDim.evidenceStrength).toBe(laterDim.evidenceStrength);
      expect(soonDim.freshnessScore).toBeGreaterThan(laterDim.freshnessScore);
    });
  });

  describe('C — recommended actions resolve to real canonical targets', () => {
    it('C1. every dimension exposes exactly one action with a valid route', () => {
      const sc = build();
      const validRoutes = new Set([
        'dsa',
        'roadmap',
        'preparation',
        'practice',
        'project',
        'dashboard',
      ]);
      for (const d of sc.dimensions) {
        expect(typeof d.recommendedAction.label).toBe('string');
        expect(d.recommendedAction.label.length).toBeGreaterThan(0);
        expect(validRoutes.has(d.recommendedAction.route)).toBe(true);
        expect(['dsa', 'task', 'review', 'practice', 'project', 'preparation', 'none']).toContain(
          d.recommendedAction.type
        );
      }
    });

    it('C2. no action points at a target that does not exist in canonical state', () => {
      const sc = build();
      const dsaIds = new Set(DSA_PROBLEMS.map((p) => p.id));
      const taskIds = new Set(TASK_DEFINITIONS.map((t) => t.id));
      const prepIds = new Set(PREPARATION_TOPICS.map((t) => t.id));
      const sessionIds = new Set(PRACTICE_SESSIONS.map((s) => s.id));

      for (const d of sc.dimensions) {
        const { route, targetId, type } = d.recommendedAction;
        if (type === 'none') {
          expect(targetId).toBeUndefined();
          continue;
        }
        expect(targetId).toBeTruthy();
        if (route === 'dsa') expect(dsaIds.has(targetId!)).toBe(true);
        if (route === 'roadmap') expect(taskIds.has(targetId!)).toBe(true);
        if (route === 'preparation') expect(prepIds.has(targetId!)).toBe(true);
        if (route === 'practice') expect(sessionIds.has(targetId!)).toBe(true);
      }
    });

    it('C3. seeded canonical state yields at least one real (non-placeholder) action', () => {
      const sc = build();
      const real = sc.dimensions.filter((d) => d.recommendedAction.type !== 'none');
      expect(real.length).toBeGreaterThan(0);
      for (const d of real) {
        expect(d.recommendedAction.route).not.toBe('dashboard');
      }
    });

    it('C4. actions are computed from the real state — richer progress changes them', () => {
      const bare = build();
      const dsaProgress: Record<string, DSAProgress> = {
        [DSA_PROBLEMS[0].id]: makeDsaProgress(DSA_PROBLEMS[0].id, {
          remediationRequired: true,
          currentBox: 3,
        }),
      };
      const enriched = build({ dsaProgress });

      const bareCoding = dimension(bare, 'coding_dsa');
      const enrichedCoding = dimension(enriched, 'coding_dsa');

      expect(JSON.stringify(enrichedCoding.recommendedAction)).not.toBe(
        JSON.stringify(bareCoding.recommendedAction)
      );
      // The remediation problem is a real catalog entry.
      expect(enrichedCoding.recommendedAction.targetId).toBe(DSA_PROBLEMS[0].id);
    });
  });

  describe('D — weakness and remediation signals', () => {
    it('D1. activeRemediationCount is summed from canonical remediation sources', () => {
      const empty = build();
      expect(empty.activeRemediationCount).toBe(0);

      const dsaProgress: Record<string, DSAProgress> = {
        [DSA_PROBLEMS[0].id]: makeDsaProgress(DSA_PROBLEMS[0].id, { remediationRequired: true }),
        [DSA_PROBLEMS[1].id]: makeDsaProgress(DSA_PROBLEMS[1].id, { remediationRequired: true }),
      };
      const weaknessSignals = [
        makeSignal('ws-1', 'open'),
        makeSignal('ws-2', 'open'),
        makeSignal('ws-3', 'resolved'),
      ];
      const skillStates = {
        'topic-missing-a': makeSkillState('topic-missing-a', 20),
        'topic-missing-b': makeSkillState('topic-missing-b', 95),
      };

      const sc = build({ dsaProgress, weaknessSignals, skillStates });
      // 2 DSA remediation flags + 2 open weakness signals + 1 weak skill state
      expect(sc.activeRemediationCount).toBe(5);
    });

    it('D2. staleEvidenceCount and weakEvidenceCount track the dimension readouts', () => {
      const sc = build();
      expect(sc.staleEvidenceCount).toBe(sc.dimensions.filter((d) => d.freshness === 'stale').length);
      expect(sc.weakEvidenceCount).toBe(sc.dimensions.filter((d) => d.evidenceStrength < 40).length);
    });

    it('D3. dimensions surface their own at-risk topic weaknesses', () => {
      const sc = build();
      for (const d of sc.dimensions) {
        expect(Array.isArray(d.weaknesses)).toBe(true);
        for (const w of d.weaknesses) expect(typeof w).toBe('string');
      }
    });
  });

  describe('E — assessment summary', () => {
    it('E1. reports unassessed when no assessment state exists', () => {
      const sc = build();
      expect(sc.assessmentIntegration).toEqual({
        isAssessed: false,
        overallAbility: 0,
        assessedDomainsCount: 0,
        primaryFocusDomain: null,
        strengths: [],
        weaknesses: [],
        reassessmentRecommended: false,
      });
    });

    it('E2. reports ability, focus and domains once a diagnostic is recorded', () => {
      const domainResults = [makeDomainResult('dsa'), makeDomainResult('sql')];
      const assessmentState = makeAssessmentState(domainResults);
      const sc = build({ assessmentState, domainResults });

      expect(sc.assessmentIntegration.isAssessed).toBe(true);
      expect(sc.assessmentIntegration.assessedDomainsCount).toBeGreaterThanOrEqual(1);
      expect(sc.assessmentIntegration.overallAbility).toBeGreaterThan(0);
      expect(typeof sc.assessmentIntegration.reassessmentRecommended).toBe('boolean');
    });
  });

  describe('F — Project Lab readiness is derived from recorded defense data', () => {
    it('F1. with no recorded defense the lab reads as not started', () => {
      const sc = build();
      expect(sc.projectReadiness.sectionsCompleted).toBe(0);
      expect(sc.projectReadiness.totalSections).toBe(6);
      expect(sc.projectReadiness.evidenceDefenseSessions).toBe(0);
      expect(sc.projectReadiness.lastDefenseDate).toBeUndefined();
      expect(sc.projectReadiness.defenseReadiness).toBe('needs_work');
    });

    it('F2. a recorded attempt moves the evidence section without claiming a pass', () => {
      const sc = build({
        practiceAttempts: [makeAttempt('pa-defense-1', { passed: false })],
      });
      expect(sc.projectReadiness.sectionsCompleted).toBe(1); // evidence only
      expect(sc.projectReadiness.evidenceDefenseSessions).toBe(1);
      expect(sc.projectReadiness.defenseReadiness).toBe('developing');
    });

    it('F3. a passed attempt claims the defense section, three passes reach strong', () => {
      const one = build({ practiceAttempts: [makeAttempt('pa-defense-1', { passed: true })] });
      expect(one.projectReadiness.sectionsCompleted).toBe(2); // defense + evidence
      expect(one.projectReadiness.lastDefenseDate).toBe('2026-10-10T12:00:00.000Z');
      expect(one.projectReadiness.defenseReadiness).toBe('developing');

      const three = build({
        practiceAttempts: [
          makeAttempt('pa-defense-1'),
          makeAttempt('pa-defense-2'),
          makeAttempt('pa-defense-3'),
        ],
      });
      expect(three.projectReadiness.evidenceDefenseSessions).toBe(3);
      expect(three.projectReadiness.defenseReadiness).toBe('strong');
    });

    it('F4. content sections are never claimed complete without recorded evidence', () => {
      const sc = build({ practiceAttempts: [makeAttempt('pa-defense-1')] });
      // reading the overview/architecture/implementation/practices tabs is not evidence
      expect(sc.projectReadiness.sectionsCompleted).toBeLessThanOrEqual(2);
      expect(sc.projectReadiness.totalSections).toBe(6);
    });
  });

  describe('G — company overlay', () => {
    it('G1. without a selection there is no overlay and no company-relevant marking', () => {
      const sc = build({ companyOverlays: [makeCompany()] });
      expect(sc.companyOverlay).toBeNull();
      expect(sc.dimensions.every((d) => d.companyRelevant === false)).toBe(true);
    });

    it('G2. resolves required vs non-required dimensions from canonical topics and domains', () => {
      const company = makeCompany();
      const sc = build({ companyOverlays: [company], selectedCompanyId: company.id });

      expect(sc.companyOverlay).not.toBeNull();
      expect(sc.companyOverlay!.companyName).toBe('Acme Corp');
      expect(sc.companyOverlay!.eventDate).toBe('2026-11-01');
      expect(sc.companyOverlay!.dimensions).toHaveLength(6);

      const coding = sc.companyOverlay!.dimensions.find((d) => d.dimensionId === 'coding_dsa')!;
      expect(coding.isRequired).toBe(true);
      expect(coding.gapDescription).toContain('Acme Corp');

      const sql = sc.companyOverlay!.dimensions.find((d) => d.dimensionId === 'sql_programming')!;
      expect(sql.isRequired).toBe(false);
      expect(sql.priority).toBe('nice_to_have');

      expect(sc.dimensions.find((d) => d.id === 'coding_dsa')!.companyRelevant).toBe(true);
      expect(sc.dimensions.find((d) => d.id === 'sql_programming')!.companyRelevant).toBe(true);
    });

    it('G3. a near event date promotes required dimensions to critical and opens the gap', () => {
      const company = makeCompany({ eventDate: '2026-11-01' }); // 17 days out
      const sc = build({ companyOverlays: [company], selectedCompanyId: company.id });

      const coding = sc.companyOverlay!.dimensions.find((d) => d.dimensionId === 'coding_dsa')!;
      expect(coding.priority).toBe('critical');
      expect(sc.companyOverlay!.overallGap).toBe('minor');
    });

    it('G4. a distant event date keeps required dimensions important, not critical', () => {
      const company = makeCompany({ eventDate: '2027-06-01' });
      const sc = build({ companyOverlays: [company], selectedCompanyId: company.id });

      const coding = sc.companyOverlay!.dimensions.find((d) => d.dimensionId === 'coding_dsa')!;
      expect(coding.priority).toBe('important');
      expect(sc.companyOverlay!.overallGap).toBe('none');
    });

    it('G5. selecting a company never alters the general scorecard evidence', () => {
      const company = makeCompany();
      const general = build({ companyOverlays: [company] });
      const focused = build({ companyOverlays: [company], selectedCompanyId: company.id });

      for (let i = 0; i < general.dimensions.length; i++) {
        const g = general.dimensions[i];
        const f = focused.dimensions[i];
        expect(f.capability).toBe(g.capability);
        expect(f.evidenceStrength).toBe(g.evidenceStrength);
        expect(f.confidenceScore).toBe(g.confidenceScore);
        expect(f.freshnessScore).toBe(g.freshnessScore);
        expect(f.band).toBe(g.band);
        expect(f.weaknesses).toEqual(g.weaknesses);
        expect(JSON.stringify(f.evidenceItems)).toBe(JSON.stringify(g.evidenceItems));
      }

      expect(focused.overallBand).toBe(general.overallBand);
      expect(focused.overallEvidenceStrength).toBe(general.overallEvidenceStrength);
      expect(focused.overallConfidence).toBe(general.overallConfidence);
      expect(focused.overallFreshness).toBe(general.overallFreshness);
      expect(focused.assessmentIntegration).toEqual(general.assessmentIntegration);
      expect(focused.projectReadiness).toEqual(general.projectReadiness);
    });

    it('G6. an unknown company id degrades to no overlay rather than throwing', () => {
      const sc = build({
        companyOverlays: [makeCompany()],
        selectedCompanyId: 'company-that-does-not-exist',
      });
      expect(sc.companyOverlay).toBeNull();
    });
  });

  describe('H — empty and partial state never crash', () => {
    it('H1. a completely empty state still returns a full six-dimension scorecard', () => {
      const sc = generateInterviewReadinessScorecard({
        tasks: [],
        taskProgress: {},
        dsaProblems: [],
        dsaProgress: {},
        dsaAttempts: [],
        topics: [],
        domains: [],
        skillStates: {},
        companyOverlays: [],
        practiceAttempts: [],
        practiceSessions: [],
        preparationTopics: [],
        preparationTopicProgress: {},
        domainResults: [],
        weaknessSignals: [],
        evidenceLogs: [],
        todayStr: TODAY,
      });

      expect(sc.dimensions).toHaveLength(6);
      for (const d of sc.dimensions) {
        expect(d.band).toBe('unassessed');
        expect(d.capability).toBe(0);
        expect(d.confidenceScore).toBe(0);
        expect(d.freshnessScore).toBe(0);
        expect(d.evidenceItems).toHaveLength(0);
        expect(d.weaknesses).toHaveLength(0);
        expect(d.recommendedAction.type).toBe('none');
        expect(d.gapExplanation.length).toBeGreaterThan(0);
      }
      expect(sc.overallBand).toBe('unassessed');
      expect(sc.overallEvidenceStrength).toBe(0);
      expect(sc.activeRemediationCount).toBe(0);
      expect(sc.companyOverlay).toBeNull();
      expect(sc.assessmentIntegration.isAssessed).toBe(false);
      expect(sc.projectReadiness.defenseReadiness).toBe('needs_work');
    });

    it('H2. partial state — only DSA progress and one company — still renders cleanly', () => {
      const dsaProgress: Record<string, DSAProgress> = {
        [DSA_PROBLEMS[0].id]: makeDsaProgress(DSA_PROBLEMS[0].id, { remediationRequired: true }),
      };
      const company = makeCompany();
      const sc = build({ dsaProgress, companyOverlays: [company], selectedCompanyId: company.id });

      expect(sc.dimensions).toHaveLength(6);
      expect(sc.activeRemediationCount).toBeGreaterThanOrEqual(1);
      expect(sc.companyOverlay).not.toBeNull();
    });

    it('H3. practice attempts referencing unknown sessions are ignored safely', () => {
      const orphan = makeAttempt('pa-orphan', { sessionId: 'session-that-does-not-exist' });
      const sc = build({ practiceAttempts: [orphan] });
      expect(sc.dimensions).toHaveLength(6);
      expect(sc.projectReadiness.evidenceDefenseSessions).toBe(1);
    });
  });
});
