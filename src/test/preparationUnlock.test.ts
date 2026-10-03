import { describe, it, expect } from 'vitest';
import {
  PREPARATION_TOPICS,
  getPreparationTopic,
} from '../data/preparationDataset';
import {
  evaluatePrerequisiteStatus,
  evaluateTopicProgression,
  isPrerequisiteCurriculumSatisfied,
  isPrerequisiteEvidenceSatisfied,
  MIN_DEMONSTRATED_EVIDENCE_STRENGTH,
  MIN_PRACTICE_PASSING_ACCURACY,
} from '../engine/preparationEngine';
import { routeWeaknessSignals, routePracticeWeakness } from '../engine/weaknessRouter';
import { generateReviewCandidates } from '../engine/reviewScheduler';
import { generateCompanyFocusCandidates } from '../engine/companyPlanEngine';
import type {
  PreparationTopic,
  PreparationTopicProgress,
  PracticeAttempt,
  TopicSkillState,
  CompanyOverlay,
  AssessmentState,
} from '../types';

describe('Evidence-Driven Topic Unlock in Preparation', () => {
  const langTopic = getPreparationTopic('prep-lang')!; // Python - has no prereqs
  const codingDsTopic = getPreparationTopic('prep-coding-ds')!; // Data Structures - prereq: ['prep-lang']
  const sqlTopic = getPreparationTopic('prep-sql')!; // SQL - has no prereqs
  const dbmsTopic = getPreparationTopic('prep-dbms')!; // DBMS - prereq: ['prep-sql']
  const techInterviewTopic = getPreparationTopic('prep-interview-tech')!; // Tech Interview - prereq: ['prep-coding-ds', 'prep-sql', 'prep-os']

  const buildProgress = (
    topic: PreparationTopic,
    completedStages: PreparationTopicProgress['completedStages'],
    overrides?: Partial<PreparationTopicProgress>
  ): PreparationTopicProgress => ({
    topicId: topic.id,
    sectionId: topic.sectionId,
    domainId: topic.domainId,
    currentStage: topic.stages.find((s) => !completedStages.includes(s)) ?? topic.stages[0],
    completedStages,
    stageProgress: {
      orient: { timeSpentMinutes: 10 },
      learn: { timeSpentMinutes: 30 },
      apply: { timeSpentMinutes: 20 },
      assess: { timeSpentMinutes: 15 },
      review: { timeSpentMinutes: 10 },
      interview: { timeSpentMinutes: 0 },
      evidence: { timeSpentMinutes: 0 },
    },
    lastAccessedAt: '2026-10-01T10:00:00Z',
    totalTimeSpentMinutes: 85,
    evidenceStrength: 0,
    freshness: 'untested',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  });

  const buildAttempt = (
    topicId: string,
    accuracyPct: number,
    passed: boolean = accuracyPct >= 50
  ): PracticeAttempt => ({
    id: `att-${topicId}-${accuracyPct}`,
    sessionId: `sess-${topicId}`,
    sessionTitle: `Practice: ${topicId}`,
    category: 'core_cs',
    domainId: 'python',
    topicId,
    date: '2026-10-02',
    completedAt: '2026-10-02T12:00:00Z',
    totalTimeSeconds: 300,
    scorePct: accuracyPct,
    accuracyPct,
    correctCount: Math.round((accuracyPct / 100) * 5),
    totalQuestions: 5,
    passed,
    userAnswers: [],
    evidenceLogId: `ev-${topicId}`,
  });

  // 1. LESSON COMPLETION ALONE DOES NOT FALSELY IMPLY MASTERY / UNLOCK DOWNSTREAM
  describe('1. Lesson Completion Alone vs Demonstrated Evidence', () => {
    it('marking Orient and Learn complete marks topic as learned_unproven, NOT ready_to_progress', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const result = evaluateTopicProgression(langTopic, getPreparationTopic, {
        [langTopic.id]: progress,
      });

      expect(result.state).toBe('learned_unproven');
      expect(result.isUnlocked).toBe(true);
      expect(result.evidenceSummary.hasCurriculumCoverage).toBe(true);
      expect(result.evidenceSummary.hasDemonstratedEvidence).toBe(false);
      expect(result.actionableStep?.type).toBe('practice');
    });

    it('downstream topic remains LOCKED when prerequisite has only lesson completion without evidence', () => {
      // langTopic has Orient and Learn done, but 0 attempts and 0 evidenceStrength
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress }
      );

      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetPrerequisiteIds).toEqual(['prep-lang']);
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-lang']);

      const progression = evaluateTopicProgression(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress }
      );
      expect(progression.state).toBe('locked');
      expect(progression.isUnlocked).toBe(false);
      expect(progression.actionableStep?.type).toBe('prerequisite');
      expect(progression.actionableStep?.targetId).toBe('prep-lang');
    });

    it('isPrerequisiteCurriculumSatisfied accurately tracks knowledge arc coverage', () => {
      const unstarted = buildProgress(langTopic, []);
      expect(isPrerequisiteCurriculumSatisfied(langTopic, unstarted)).toBe(false);

      const onlyOrient = buildProgress(langTopic, ['orient']);
      expect(isPrerequisiteCurriculumSatisfied(langTopic, onlyOrient)).toBe(false);

      const orientAndLearn = buildProgress(langTopic, ['orient', 'learn']);
      expect(isPrerequisiteCurriculumSatisfied(langTopic, orientAndLearn)).toBe(true);

      expect(MIN_PRACTICE_PASSING_ACCURACY).toBe(50);
    });
  });

  // 2. SUFFICIENT EVIDENCE ALLOWS PROGRESSION
  describe('2. Sufficient Evidence Unlocks Progression', () => {
    it('passing practice attempt satisfies evidence and unlocks downstream topic', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const attempts = [buildAttempt('prep-lang', 80, true)];

      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { attempts }
      );

      expect(prereqStatus.isLocked).toBe(false);
      expect(prereqStatus.unmetPrerequisiteIds).toEqual([]);
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toBeUndefined();

      const progression = evaluateTopicProgression(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { attempts }
      );

      expect(progression.state).toBe('available_to_learn');
      expect(progression.isUnlocked).toBe(true);
      expect(progression.actionableStep?.type).toBe('learn');
      expect(progression.actionableStep?.targetId).toBe('prep-coding-ds');
    });

    it('canonical skill state evidence (evidenceStrength >= 40) satisfies evidence and unlocks downstream topic', () => {
      const progress = buildProgress(sqlTopic, ['orient', 'learn']);
      const skillStates: Record<string, TopicSkillState> = {
        'prep-sql': {
          topicId: 'prep-sql',
          domainId: 'sql',
          freshness: 'fresh',
          evidenceStrength: MIN_DEMONSTRATED_EVIDENCE_STRENGTH,
        },
      };

      const prereqStatus = evaluatePrerequisiteStatus(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { skillStates }
      );

      expect(prereqStatus.isLocked).toBe(false);

      const progression = evaluateTopicProgression(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { skillStates }
      );

      expect(progression.state).toBe('available_to_learn');
      expect(progression.isUnlocked).toBe(true);
    });

    it('bridged roadmap topic skill state satisfies evidence when prep topic has roadmapTopicId', () => {
      // prep-lang bridges to topic-py-basics
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const skillStates: Record<string, TopicSkillState> = {
        'topic-py-basics': {
          topicId: 'topic-py-basics',
          domainId: 'python',
          freshness: 'fresh',
          evidenceStrength: 65,
        },
      };

      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { skillStates }
      );

      expect(prereqStatus.isLocked).toBe(false);
    });
  });

  // 3. WEAK EVIDENCE KEEPS TOPIC IN PROOF/PRACTICE STATE
  describe('3. Weak Evidence Behavior', () => {
    it('failing practice attempt (< 50% accuracy, passed=false) keeps topic in learned_unproven', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const weakAttempts = [buildAttempt('prep-lang', 20, false)];

      const progression = evaluateTopicProgression(
        langTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { attempts: weakAttempts }
      );

      expect(progression.state).toBe('learned_unproven');
      expect(progression.actionableStep?.type).toBe('practice');

      // Downstream topic remains locked
      const downstreamStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { attempts: weakAttempts }
      );
      expect(downstreamStatus.isLocked).toBe(true);
      expect(downstreamStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-lang']);
    });

    it('explicit practice failure with passed=false does not qualify merely because accuracy is >= 50% (e.g. 55%)', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      // Attempt achieved 55% accuracy but explicitly failed (e.g. session threshold was 70%)
      const failedAttempt = buildAttempt('prep-lang', 55, false);

      const isEvidenceSatisfied = isPrerequisiteEvidenceSatisfied(
        langTopic,
        progress,
        { attempts: [failedAttempt] }
      );

      expect(isEvidenceSatisfied).toBe(false);

      const downstreamStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { attempts: [failedAttempt] }
      );
      expect(downstreamStatus.isLocked).toBe(true);
      expect(downstreamStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-lang']);
    });

    it('sub-threshold skill evidence (evidenceStrength < 40) is insufficient to unlock downstream topics', () => {
      const progress = buildProgress(sqlTopic, ['orient', 'learn']);
      const skillStates: Record<string, TopicSkillState> = {
        'prep-sql': {
          topicId: 'prep-sql',
          domainId: 'sql',
          freshness: 'stale',
          evidenceStrength: 25,
        },
      };

      const prereqStatus = evaluatePrerequisiteStatus(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { skillStates }
      );

      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-sql']);
    });
  });

  // 4. PREREQUISITE-LOCKED TOPIC REMAINS LOCKED
  describe('4. Prerequisite-Locked Safety', () => {
    it('topic with unstarted prerequisite is locked with reason curriculum_unmet', () => {
      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        {} // No progress at all
      );

      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetPrerequisiteIds).toEqual(['prep-lang']);
      expect(prereqStatus.details?.[0].reason).toBe('curriculum_unmet');
      expect(prereqStatus.details?.[0].actionableTarget?.type).toBe('preparation_lesson');
      expect(prereqStatus.details?.[0].actionableTarget?.targetId).toBe('prep-lang');
    });

    it('multi-prerequisite topic requires ALL prerequisites to be evidenced', () => {
      // prep-interview-tech requires ['prep-coding-ds', 'prep-sql', 'prep-os']
      const progressMap: Record<string, PreparationTopicProgress> = {
        'prep-coding-ds': buildProgress(codingDsTopic, ['orient', 'learn'], { evidenceStrength: 50 }),
        'prep-sql': buildProgress(sqlTopic, ['orient', 'learn'], { evidenceStrength: 0 }), // Missing evidence!
        'prep-os': buildProgress(getPreparationTopic('prep-os')!, ['orient', 'learn'], { evidenceStrength: 60 }),
      };

      const prereqStatus = evaluatePrerequisiteStatus(
        techInterviewTopic,
        getPreparationTopic,
        progressMap
      );

      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetPrerequisiteIds).toContain('prep-sql');
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toContain('prep-sql');
    });
  });

  // 5. DETERMINISM & PURITY
  describe('5. Determinism & Purity', () => {
    it('evaluations are completely deterministic and return identical results for same inputs', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const attempts = [buildAttempt('prep-lang', 75, true)];
      const context = { attempts };

      const res1 = evaluateTopicProgression(codingDsTopic, getPreparationTopic, { [langTopic.id]: progress }, context);
      const res2 = evaluateTopicProgression(codingDsTopic, getPreparationTopic, { [langTopic.id]: progress }, context);

      expect(res1).toEqual(res2);
      expect(res1.state).toBe(res2.state);
      expect(res1.isUnlocked).toBe(res2.isUnlocked);
    });

    it('evaluation does not mutate input state or progress maps', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn']);
      const frozenProgress = Object.freeze({ ...progress });
      const progressMap = Object.freeze({ [langTopic.id]: frozenProgress });

      expect(() => {
        evaluateTopicProgression(codingDsTopic, getPreparationTopic, progressMap);
      }).not.toThrow();
    });
  });

  // 6. BACKWARD COMPATIBILITY
  describe('6. Backward Compatibility for Existing Stored Progress', () => {
    it('completed apply + assess stages alone without evidence leaves downstream topic locked', () => {
      // User who checked off apply + assess stage tabs but has no demonstrated evidence
      const stageOnlyProgress = buildProgress(langTopic, ['orient', 'learn', 'apply', 'assess', 'review']);

      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: stageOnlyProgress }
      );

      // Stage completion satisfies curriculum, but NOT demonstrated evidence: remains locked
      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-lang']);
      expect(isPrerequisiteEvidenceSatisfied(langTopic, stageOnlyProgress)).toBe(false);
    });

    it('existing topic progress with valid evidenceStrength >= 40 unlocks downstream topics even without attempts array', () => {
      const savedProgress = buildProgress(langTopic, ['orient', 'learn'], { evidenceStrength: 45 });

      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: savedProgress }
      );

      expect(prereqStatus.isLocked).toBe(false);
      expect(isPrerequisiteEvidenceSatisfied(langTopic, savedProgress)).toBe(true);
    });

    it('valid canonical skill evidence (evidenceStrength >= 40) unlocks downstream topics', () => {
      const progress = buildProgress(langTopic, ['orient', 'learn'], { evidenceStrength: 0 });
      const skillStates: Record<string, TopicSkillState> = {
        'prep-lang': {
          topicId: 'prep-lang',
          domainId: 'python',
          freshness: 'fresh',
          evidenceStrength: 60,
        },
      };

      const prereqStatus = evaluatePrerequisiteStatus(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progress },
        { skillStates }
      );

      expect(prereqStatus.isLocked).toBe(false);
      expect(isPrerequisiteEvidenceSatisfied(langTopic, progress, { skillStates })).toBe(true);
    });
  });

  // 7. ASSESSMENT EVIDENCE INTEGRATION
  describe('7. Assessment Evidence Integration', () => {
    it('passing assessment domain score (>= 70%) satisfies prerequisite evidence', () => {
      const progress = buildProgress(sqlTopic, ['orient', 'learn']);
      const domainResults = [
        {
          domainId: 'sql' as const,
          abilityScore: 85,
          level: 3 as const,
          confidence: 'high' as const,
          status: 'assessed' as const,
          coverage: {
            topicsCovered: 3,
            topicsTotal: 3,
            competenciesCovered: ['queries'],
            difficultyBands: [1, 2, 3],
          },
          assessmentDate: '2026-10-02T10:00:00Z',
          provisional: false,
          attemptId: 'att-1',
          kind: 'full_reassessment' as const,
        },
      ];

      const prereqStatus = evaluatePrerequisiteStatus(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { assessmentResults: domainResults }
      );

      expect(prereqStatus.isLocked).toBe(false);
    });

    it('low assessment domain score (< 70% and level < 2) does not falsely satisfy evidence', () => {
      const progress = buildProgress(sqlTopic, ['orient', 'learn']);
      const domainResults = [
        {
          domainId: 'sql' as const,
          abilityScore: 40,
          level: 1 as const,
          confidence: 'low' as const,
          status: 'partially_assessed' as const,
          coverage: {
            topicsCovered: 1,
            topicsTotal: 3,
            competenciesCovered: ['queries'],
            difficultyBands: [1],
          },
          assessmentDate: '2026-10-02T10:00:00Z',
          provisional: false,
          attemptId: 'att-2',
          kind: 'full_reassessment' as const,
        },
      ];

      const prereqStatus = evaluatePrerequisiteStatus(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { assessmentResults: domainResults }
      );

      expect(prereqStatus.isLocked).toBe(true);
      expect(prereqStatus.unmetEvidencePrerequisiteIds).toEqual(['prep-sql']);
    });

    it('supports assessment evidence provided directly from AssessmentState object', () => {
      const progress = buildProgress(sqlTopic, ['orient', 'learn']);
      const assessmentState = {
        attempts: [],
        responses: [],
        exposures: {},
        domainResults: [
          {
            domainId: 'sql' as const,
            abilityScore: 80,
            level: 3 as const,
            confidence: 'high' as const,
            status: 'assessed' as const,
            coverage: {
              topicsCovered: 3,
              topicsTotal: 3,
              competenciesCovered: ['queries'],
              difficultyBands: [1, 2],
            },
            assessmentDate: '2026-10-02T10:00:00Z',
            provisional: false,
            attemptId: 'att-3',
            kind: 'full_reassessment' as const,
          },
        ],
        snapshots: [],
        weaknessSignals: [],
        profile: {
          readinessLevel: 3,
          readinessStatus: 'ready' as const,
          weaknessSignals: [],
          recommendedAction: 'maintain' as const,
        },
      } as unknown as AssessmentState;

      const prereqStatus = evaluatePrerequisiteStatus(
        dbmsTopic,
        getPreparationTopic,
        { [sqlTopic.id]: progress },
        { assessmentResults: assessmentState }
      );

      expect(prereqStatus.isLocked).toBe(false);
    });
  });

  // 8. PRACTICE PROOF LOOP
  describe('8. Canonical Proof Loop Progression', () => {
    it('follows: unstarted -> learned_unproven -> practice evidence -> ready_to_progress', () => {
      // Step 1: Unstarted
      const step1 = evaluateTopicProgression(langTopic, getPreparationTopic, {});
      expect(step1.state).toBe('available_to_learn');
      expect(step1.actionableStep?.type).toBe('learn');

      // Step 2: Learned (Orient + Learn complete, but 0 attempts)
      const progAfterLearn = buildProgress(langTopic, ['orient', 'learn']);
      const step2 = evaluateTopicProgression(langTopic, getPreparationTopic, {
        [langTopic.id]: progAfterLearn,
      });
      expect(step2.state).toBe('learned_unproven');
      expect(step2.actionableStep?.type).toBe('practice');

      // Step 3: Practice attempt recorded
      const attempts = [buildAttempt('prep-lang', 80, true)];
      const step3 = evaluateTopicProgression(
        langTopic,
        getPreparationTopic,
        { [langTopic.id]: progAfterLearn },
        { attempts }
      );
      expect(step3.state).toBe('ready_to_progress');

      // Step 4: Downstream topic (prep-coding-ds) now unlocks!
      const downstreamStep = evaluateTopicProgression(
        codingDsTopic,
        getPreparationTopic,
        { [langTopic.id]: progAfterLearn },
        { attempts }
      );
      expect(downstreamStep.state).toBe('available_to_learn');
      expect(downstreamStep.isUnlocked).toBe(true);
    });
  });

  // 9. NO PHANTOM TARGETS OR DEAD ENDS
  describe('9. No Phantom Targets and No Dead Ends', () => {
    it('locked topic provides actionable route to the unmet prerequisite without phantom target', () => {
      const progression = evaluateTopicProgression(
        codingDsTopic,
        getPreparationTopic,
        {} // No prerequisites met
      );

      expect(progression.state).toBe('locked');
      expect(progression.actionableStep).toBeDefined();
      expect(progression.actionableStep?.route).toBe('preparation');
      expect(progression.actionableStep?.targetId).toBe('prep-lang');
      expect(getPreparationTopic(progression.actionableStep!.targetId!)).toBeDefined();
    });

    it('unresolvable prerequisite ID produces clean non-actionable state, never a phantom task', () => {
      const syntheticTopic: PreparationTopic = {
        ...langTopic,
        id: 'synth-topic',
        prerequisiteTopicIds: ['non-existent-topic-id'],
      };

      const status = evaluatePrerequisiteStatus(
        syntheticTopic,
        getPreparationTopic,
        {}
      );

      expect(status.isLocked).toBe(true);
      expect(status.details?.[0].reason).toBe('unresolvable');
      expect(status.details?.[0].actionableTarget).toBeUndefined();

      const progression = evaluateTopicProgression(
        syntheticTopic,
        getPreparationTopic,
        {}
      );
      expect(progression.state).toBe('locked');
      expect(progression.actionableStep).toBeUndefined();
    });
  });

  // 10. INTEGRATION WITH WEAKNESS ROUTER, REVIEW SCHEDULER & COMPANY PLAN
  describe('10. Ecosystem Compatibility', () => {
    it('weaknessRouter correctly marks preparation candidates blocked when prerequisites lack evidence', () => {
      // Practice attempt showing severe weakness in coding-ds
      const attempt: PracticeAttempt = {
        id: 'att-ds-fail',
        sessionId: 'sess-ds',
        sessionTitle: 'Data Structures Drill',
        category: 'core_cs',
        domainId: 'dsa',
        topicId: 'prep-coding-ds',
        date: '2026-10-02',
        completedAt: '2026-10-02T10:00:00Z',
        totalTimeSeconds: 240,
        scorePct: 30,
        accuracyPct: 30,
        correctCount: 1,
        totalQuestions: 5,
        passed: false,
        userAnswers: [],
        evidenceLogId: 'ev-ds-fail',
      };

      // prep-lang is only learned_unproven (no evidence)
      const prepProgress: Record<string, PreparationTopicProgress> = {
        'prep-lang': buildProgress(langTopic, ['orient', 'learn']),
      };

      const candidates = routePracticeWeakness({
        practiceAttempts: [attempt],
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: prepProgress,
      });

      // prep-coding-ds is blocked because prep-lang lacks evidence
      const prepCandidate = candidates.find((c) => c.topicId === 'prep-coding-ds');
      expect(prepCandidate).toBeDefined();
      expect(prepCandidate?.isBlocked).toBe(true);
      expect(prepCandidate?.blockingReason).toContain('Prerequisite');

      // routeWeaknessSignals filters out blocked candidates safely
      const unblocked = routeWeaknessSignals({
        practiceAttempts: [attempt],
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: prepProgress,
      });
      expect(unblocked.find((c) => c.topicId === 'prep-coding-ds')).toBeUndefined();
    });

    it('reviewScheduler generates prioritized review candidates from existing state', () => {
      const result = generateReviewCandidates({
        tasks: [],
        taskProgressMap: {},
        dsaProblems: [],
        dsaProgressMap: {},
        topics: [],
        domains: [],
        skillStates: {},
        companyOverlays: [],
        currentMode: 'normal',
        todayStr: '2026-10-02',
        todayAssignments: [],
        practiceAttempts: [],
        preparationTopicProgress: {},
      });

      expect(Array.isArray(result.candidates)).toBe(true);
    });

    it('companyPlanEngine remains completely compatible with evidence-driven unlock', () => {
      const overlay: CompanyOverlay = {
        id: 'comp-evidence-test',
        companyName: 'EvidenceCorp',
        targetRole: 'SDE-1',
        applicationStatus: 'oa_scheduled',
        eventDate: '2026-10-15',
        requiredDomains: ['python', 'sql'],
        requiredTopics: ['prep-coding-ds'],
        requiredLanguages: ['python'],
      };

      const candidates = generateCompanyFocusCandidates({
        targetCompany: overlay,
        domains: [],
        topics: [],
        tasks: [],
        taskProgressMap: {},
        dsaProblems: [],
        dsaProgressMap: {},
        skillStates: {},
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: {},
        todayStr: '2026-10-02',
        activePhase: 1,
      });

      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
