// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  generateCompanyFocusCandidates,
  calculateCompanyDeadlineUrgency,
} from '../engine/companyPlanEngine';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import {
  calculateCompanyRelevance,
  getEvaluatedCandidates,
} from '../engine/adaptiveEngine';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import type {
  CompanyOverlay,
  DSAProgress,
  TopicSkillState,
  TaskDefinition,
} from '../types';

describe('Company-Specific Daily Plan Mode Engine', () => {
  const mockCompanyA: CompanyOverlay = {
    id: 'comp-alpha',
    companyName: 'Alpha Corp',
    applicationStatus: 'oa_scheduled',
    eventDate: '2026-10-20',
    targetRole: 'Software Engineer',
    requiredDomains: ['dsa', 'python'],
    requiredTopics: ['topic-dsa-arrays', 'prep-lang'],
    requiredLanguages: ['python'],
  };

  const mockCompanyB: CompanyOverlay = {
    id: 'comp-beta',
    companyName: 'Beta Systems',
    applicationStatus: 'applied',
    eventDate: '2026-11-15',
    targetRole: 'Database Engineer',
    requiredDomains: ['sql', 'dbms'],
    requiredTopics: ['prep-sql', 'prep-dbms'],
    requiredLanguages: ['sql'],
  };

  const mockSkillStates: Record<string, TopicSkillState> = {
    'topic-dsa-arrays': {
      topicId: 'topic-dsa-arrays',
      domainId: 'dsa',
      evidenceStrength: 25,
      freshness: 'fresh',
    },
    'prep-lang': {
      topicId: 'prep-lang',
      domainId: 'python',
      evidenceStrength: 30,
      freshness: 'fresh',
    },
    'prep-sql': {
      topicId: 'prep-sql',
      domainId: 'sql',
      evidenceStrength: 20,
      freshness: 'fresh',
    },
  };

  // --- 1. COMPANY MODE AFFECTS CANDIDATE ORDERING ---
  describe('Company Mode & Candidate Ordering', () => {
    it('prioritizes candidates matching selected company requirements', () => {
      const todayStr = '2026-10-15';
      const evaluatedNoCompany = getEvaluatedCandidates(
        TASK_DEFINITIONS,
        {},
        DSA_PROBLEMS,
        {},
        mockSkillStates,
        [mockCompanyA, mockCompanyB],
        'normal',
        todayStr
      );

      const evaluatedCompanyA = getEvaluatedCandidates(
        TASK_DEFINITIONS,
        {},
        DSA_PROBLEMS,
        {},
        mockSkillStates,
        [mockCompanyA, mockCompanyB],
        'normal',
        todayStr,
        mockCompanyA.id
      );

      // Tasks matching Alpha Corp (dsa/python) should receive a higher companyRelevance
      const pythonTask = TASK_DEFINITIONS.find(t => t.domainId === 'python');
      expect(pythonTask).toBeDefined();

      const candidateInNoCompany = evaluatedNoCompany.find(c => c.task.id === pythonTask?.id);
      const candidateInCompanyA = evaluatedCompanyA.find(c => c.task.id === pythonTask?.id);

      expect(candidateInCompanyA?.breakdown.companyRelevance).toBeGreaterThan(0);
      expect(candidateInCompanyA?.breakdown.finalScore).toBeGreaterThanOrEqual(
        candidateInNoCompany?.breakdown.finalScore ?? 0
      );
    });

    it('changing selected company changes candidate ordering without data leakage', () => {
      const todayStr = '2026-10-15';
      const candidatesA = generateCompanyFocusCandidates({
        targetCompany: mockCompanyA,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr,
      });

      const candidatesB = generateCompanyFocusCandidates({
        targetCompany: mockCompanyB,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr,
      });

      // Company A requirements are dsa / python
      expect(candidatesA.every(c => c.domainId === 'dsa' || c.domainId === 'python')).toBe(true);

      // Company B requirements are sql / dbms
      expect(candidatesB.every(c => c.domainId === 'sql' || c.domainId === 'dbms')).toBe(true);

      // No target leakage: targetIds from A should not be contaminated with B's domains
      const domainsA = new Set(candidatesA.map(c => c.domainId));
      expect(domainsA.has('sql')).toBe(false);
      expect(domainsA.has('dbms')).toBe(false);
    });
  });

  // --- 2. PRIORITY PRECEDENCE: REMEDIATION > OVERDUE > ROUTED WEAKNESS > COMPANY GAP ---
  describe('Priority Precedence Integration', () => {
    it('remediation beats company focus candidates in review scheduler', () => {
      const todayStr = '2026-10-15';
      const remProb = DSA_PROBLEMS[0]; // Two Sum

      const dsaProgressMap: Record<string, DSAProgress> = {
        [remProb.id]: {
          problemId: remProb.id,
          currentBox: 1,
          remediationRequired: true,
          attemptCount: 3,
          consecutiveFailures: 3,
          passedIndependently: false,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
      };

      const result = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap,
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: mockSkillStates,
        companyOverlays: [mockCompanyB], // Target Beta Systems (SQL)
        currentMode: 'normal',
        todayStr,
        todayAssignments: [],
        targetCompanyId: mockCompanyB.id,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(result.hasRemediation).toBe(true);
      expect(result.hasCompanyFocusGaps).toBe(true);

      const remCandidate = result.candidates.find(c => c.priority === 'remediation');
      const companyCandidate = result.candidates.find(c => c.priority === 'company_gap');

      expect(remCandidate).toBeDefined();
      expect(companyCandidate).toBeDefined();

      const idxRem = result.candidates.indexOf(remCandidate!);
      const idxComp = result.candidates.indexOf(companyCandidate!);
      expect(idxRem).toBeLessThan(idxComp);
    });

    it('overdue review beats company focus candidates in review scheduler', () => {
      const todayStr = '2026-10-15';
      const overdueProb = DSA_PROBLEMS[1];

      const dsaProgressMap: Record<string, DSAProgress> = {
        [overdueProb.id]: {
          problemId: overdueProb.id,
          currentBox: 1,
          nextReviewAt: '2026-10-10', // Overdue
          remediationRequired: false,
          attemptCount: 1,
          consecutiveFailures: 0,
          passedIndependently: true,
          assistedProvisional: false,
          consecutiveAssistedPasses: 0,
          patternLessonViewed: false,
          patternLessonCompleted: false,
          remediationSelfCheckPassed: false,
          evidenceStrength: 0.5,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-10T00:00:00Z',
        },
      };

      const result = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap,
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: mockSkillStates,
        companyOverlays: [mockCompanyA],
        currentMode: 'normal',
        todayStr,
        todayAssignments: [],
        targetCompanyId: mockCompanyA.id,
        preparationTopics: PREPARATION_TOPICS,
      });

      expect(result.hasOverdueReviews).toBe(true);
      const overdueCandidate = result.candidates.find(c => c.priority === 'overdue_review');
      const companyCandidate = result.candidates.find(c => c.priority === 'company_gap');

      expect(overdueCandidate).toBeDefined();
      expect(companyCandidate).toBeDefined();

      const idxOverdue = result.candidates.indexOf(overdueCandidate!);
      const idxComp = result.candidates.indexOf(companyCandidate!);
      expect(idxOverdue).toBeLessThan(idxComp);
    });

    it('routed weakness beats company focus candidates when both exist', () => {
      const todayStr = '2026-10-15';

      const result = generateReviewCandidates({
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        topics: TOPICS,
        domains: DOMAINS,
        skillStates: mockSkillStates,
        companyOverlays: [mockCompanyB],
        currentMode: 'normal',
        todayStr,
        todayAssignments: [],
        targetCompanyId: mockCompanyB.id,
        preparationTopics: PREPARATION_TOPICS,
        practiceAttempts: [
          {
            id: 'att-fail',
            sessionId: 'prac-py-1',
            sessionTitle: 'Python DSA Drill',
            category: 'coding',
            domainId: 'python',
            topicId: 'prep-lang',
            date: todayStr,
            completedAt: `${todayStr}T09:00:00Z`,
            totalTimeSeconds: 400,
            scorePct: 30,
            accuracyPct: 30,
            correctCount: 1,
            totalQuestions: 5,
            passed: false,
            userAnswers: [],
            evidenceLogId: 'ev-f',
          },
        ],
      });

      expect(result.hasRoutedWeakness).toBe(true);
      expect(result.hasCompanyFocusGaps).toBe(true);

      const weaknessCandidate = result.candidates.find(c => c.priority === 'routed_weakness');
      const companyCandidate = result.candidates.find(c => c.priority === 'company_gap');

      expect(weaknessCandidate).toBeDefined();
      expect(companyCandidate).toBeDefined();

      const idxWeakness = result.candidates.indexOf(weaknessCandidate!);
      const idxComp = result.candidates.indexOf(companyCandidate!);
      expect(idxWeakness).toBeLessThan(idxComp);
    });
  });

  // --- 3. DEADLINE & EVENT URGENCY ---
  describe('Deadline & Event Urgency', () => {
    it('calculates deadline urgency score boost deterministically', () => {
      const urgency5d = calculateCompanyDeadlineUrgency('2026-10-20', '2026-10-15');
      expect(urgency5d.daysUntil).toBe(5);
      expect(urgency5d.scoreBoost).toBe(18); // <= 7d

      const urgency2d = calculateCompanyDeadlineUrgency('2026-10-17', '2026-10-15');
      expect(urgency2d.daysUntil).toBe(2);
      expect(urgency2d.scoreBoost).toBe(22); // <= 3d

      const urgencyToday = calculateCompanyDeadlineUrgency('2026-10-15', '2026-10-15');
      expect(urgencyToday.daysUntil).toBe(0);
      expect(urgencyToday.scoreBoost).toBe(25); // <= 0d

      const urgencyFar = calculateCompanyDeadlineUrgency('2026-11-30', '2026-10-15');
      expect(urgencyFar.daysUntil).toBe(46);
      expect(urgencyFar.scoreBoost).toBe(3); // > 30d
    });

    it('approaching event date increases priorityScore of company candidates', () => {
      const urgentCompany: CompanyOverlay = {
        ...mockCompanyA,
        eventDate: '2026-10-17', // 2 days away
      };

      const distantCompany: CompanyOverlay = {
        ...mockCompanyA,
        eventDate: '2026-11-30', // 46 days away
      };

      const urgentCandidates = generateCompanyFocusCandidates({
        targetCompany: urgentCompany,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
      });

      const distantCandidates = generateCompanyFocusCandidates({
        targetCompany: distantCompany,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
      });

      expect(urgentCandidates.length).toBeGreaterThan(0);
      expect(distantCandidates.length).toBeGreaterThan(0);
      expect(urgentCandidates[0].priorityScore).toBeGreaterThan(distantCandidates[0].priorityScore);
    });

    it('calculateCompanyRelevance includes deadline urgency boost', () => {
      const baseTask = TASK_DEFINITIONS.find(t => t.domainId === 'dsa')!;
      const task: TaskDefinition = {
        ...baseTask,
        languageTags: [], // Domain + topic match only, allowing deadline urgency to elevate score
      };
      const todayStr = '2026-10-15';

      const urgentComp: CompanyOverlay = {
        ...mockCompanyA,
        eventDate: '2026-10-18', // 3 days away
      };

      const distantComp: CompanyOverlay = {
        ...mockCompanyA,
        eventDate: '2026-11-20', // 36 days away
      };

      const urgentScore = calculateCompanyRelevance(task, [urgentComp], 'normal', todayStr, urgentComp.id);
      const distantScore = calculateCompanyRelevance(task, [distantComp], 'normal', todayStr, distantComp.id);

      expect(urgentScore).toBeGreaterThan(distantScore);
    });
  });

  // --- 4. GATING, PREREQUISITES & EXCLUSIONS ---
  describe('Gating, Prerequisites & Exclusions', () => {
    it('excludes targets blocked by unmet prerequisites', () => {
      const lockedTask = {
        ...TASK_DEFINITIONS[0],
        id: 'task-locked-company',
        prerequisiteTaskDefinitionIds: ['missing-prereq-xyz'],
      };

      const lockedCompany: CompanyOverlay = {
        id: 'comp-locked',
        companyName: 'Locked Inc',
        targetRole: 'Software Engineer',
        applicationStatus: 'target',
        requiredDomains: [lockedTask.domainId],
        requiredTopics: [lockedTask.topicId],
        requiredLanguages: [],
      };

      const candidates = generateCompanyFocusCandidates({
        targetCompany: lockedCompany,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: [lockedTask],
        taskProgressMap: {}, // unmet prereqs
        dsaProblems: [],
        dsaProgressMap: {},
        skillStates: {},
        preparationTopics: [],
        todayStr: '2026-10-15',
      });

      expect(candidates.find(c => c.targetId === lockedTask.id)).toBeUndefined();
    });

    it('excludes targets already committed or completed today', () => {
      const candidates = generateCompanyFocusCandidates({
        targetCompany: mockCompanyA,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
        committedTargetIds: new Set(['prep-lang']), // Already assigned today
      });

      expect(candidates.find(c => c.targetId === 'prep-lang')).toBeUndefined();
    });
  });

  // --- 5. CLEAN FALLBACK & NO PHANTOM TASKS ---
  describe('Clean Fallback & Integrity', () => {
    it('falls back cleanly to empty array when company has no requirements configured', () => {
      const emptyCompany: CompanyOverlay = {
        id: 'comp-empty',
        companyName: 'Empty Corp',
        targetRole: 'Software Engineer',
        applicationStatus: 'target',
        requiredDomains: [],
        requiredTopics: [],
        requiredLanguages: [],
      };

      const candidates = generateCompanyFocusCandidates({
        targetCompany: emptyCompany,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: {},
        preparationTopics: PREPARATION_TOPICS,
        todayStr: '2026-10-15',
      });

      expect(candidates).toEqual([]);
    });

    it('falls back cleanly when all company requirements are already covered', () => {
      const coveredCompany: CompanyOverlay = {
        id: 'comp-covered',
        companyName: 'Covered Corp',
        targetRole: 'Software Engineer',
        applicationStatus: 'target',
        requiredDomains: ['python'],
        requiredTopics: ['prep-lang'],
        requiredLanguages: ['python'],
      };

      // 100% evidence strength
      const fullSkillStates: Record<string, TopicSkillState> = {
        'prep-lang': {
          topicId: 'prep-lang',
          domainId: 'python',
          evidenceStrength: 100,
          freshness: 'fresh',
        },
      };

      const candidates = generateCompanyFocusCandidates({
        targetCompany: coveredCompany,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {
          'task-py-1': {
            taskId: 'task-py-1',
            state: 'completed',
            postponeCount: 0,
            skipCount: 0,
            timeSpentMinutes: 30,
            lastCompletedAt: '2026-10-15T00:00:00Z',
            updatedAt: '2026-10-15T00:00:00Z',
          },
        },
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: fullSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        todayStr: '2026-10-15',
      });

      expect(candidates).toEqual([]);
    });

    it('never creates phantom targets: every candidate targetId exists in source datasets', () => {
      const candidates = generateCompanyFocusCandidates({
        targetCompany: mockCompanyA,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
      });

      for (const c of candidates) {
        const existsInDsa = DSA_PROBLEMS.some(p => p.id === c.targetId);
        const existsInTasks = TASK_DEFINITIONS.some(t => t.id === c.targetId);
        const existsInPrep = PREPARATION_TOPICS.some(t => t.id === c.targetId);
        const existsInPractice = PRACTICE_SESSIONS.some(s => s.id === c.targetId);

        expect(existsInDsa || existsInTasks || existsInPrep || existsInPractice).toBe(true);
        expect(c.route).toMatch(/^(dsa|roadmap|preparation|practice)$/);
      }
    });

    it('deduplicates targets: no candidate appears twice', () => {
      const candidates = generateCompanyFocusCandidates({
        targetCompany: mockCompanyA,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
      });

      const targetIds = candidates.map(c => c.targetId);
      const uniqueTargets = new Set(targetIds);
      expect(targetIds.length).toBe(uniqueTargets.size);
    });

    it('switching companies is pure and deterministic across repeated runs', () => {
      const opts = {
        targetCompany: mockCompanyA,
        domains: DOMAINS,
        topics: TOPICS,
        tasks: TASK_DEFINITIONS,
        taskProgressMap: {},
        dsaProblems: DSA_PROBLEMS,
        dsaProgressMap: {},
        skillStates: mockSkillStates,
        preparationTopics: PREPARATION_TOPICS,
        practiceSessions: PRACTICE_SESSIONS,
        todayStr: '2026-10-15',
      };

      const run1 = generateCompanyFocusCandidates(opts);
      const run2 = generateCompanyFocusCandidates(opts);

      expect(run1).toEqual(run2);
    });
  });
});
