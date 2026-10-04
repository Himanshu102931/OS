// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  validateReviewPrompt,
  filterNavigablePrompts,
  buildReviewPromptDatasets,
  reviewPromptsToCandidates,
  isPromptDue,
} from '../engine/reviewPromptAdapter';
import { DSA_PROBLEMS } from '../data/dsaDataset';
import { TASK_DEFINITIONS, TOPICS, DOMAINS } from '../data/seedData';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import type {
  ReviewPrompt,
} from '../engine/analyticsEngine';
import type {
  DSAProblem,
  TaskDefinition,
  Topic,
  DomainDefinition,
  TopicSkillState,
} from '../types';

const TODAY = '2026-10-15';

const mockDsaProblem: DSAProblem = {
  ...DSA_PROBLEMS[0],
  id: 'dsa-1',
  title: 'Two Sum',
  leetcodeNumber: 1,
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  estimatedTimeMinutes: 20,
  primaryPattern: 'two-pointers',
  difficulty: 'easy' as const,
};

const mockTask: TaskDefinition = {
  ...TASK_DEFINITIONS[0],
  id: 'task-1',
  title: 'Learn Arrays',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  estimatedMinutes: 30,
};

const mockTopic: Topic = {
  ...TOPICS[0],
  id: 'topic-dsa-arrays',
  domainId: 'dsa',
  name: 'Arrays',
  importance: 8,
};

const mockDomain: DomainDefinition = {
  ...DOMAINS[0],
  id: 'dsa',
  name: 'Data Structures & Algorithms',
  shortName: 'DSA',
  description: 'Core DSA concepts',
  iconName: 'code',
  color: '#3B82F6',
};

const mockSkillStates: Record<string, TopicSkillState> = {
  'topic-dsa-arrays': {
    topicId: 'topic-dsa-arrays',
    domainId: 'dsa',
    evidenceStrength: 30,
    freshness: 'stale',
    lastPracticedAt: '2026-09-20T00:00:00.000Z',
  },
};

const mockTaskProgress: Record<string, {
  taskId: string;
  state: 'not_started' | 'in_progress' | 'completed' | 'archived';
  postponeCount: number;
  skipCount: number;
  timeSpentMinutes: number;
  updatedAt: string;
}> = {
  'task-1': {
    taskId: 'task-1',
    state: 'in_progress',
    postponeCount: 3,
    skipCount: 0,
    timeSpentMinutes: 0,
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
};

const basePrompts: ReviewPrompt[] = [
  {
    id: 'prompt-overdue-dsa',
    type: 'overdue_review',
    severity: 'high',
    title: '1 DSA Review Overdue',
    description: '1 problem is due in the Leitner spaced repetition system.',
    actionLabel: 'Go to DSA Review',
    route: 'dsa',
    targetId: 'dsa-1',
  },
  {
    id: 'prompt-remediation',
    type: 'remediation_needed',
    severity: 'high',
    title: '1 Problem Remediation Required',
    description: 'Repeated failures require reviewing the pattern lesson.',
    actionLabel: 'Review Remediation',
    route: 'dsa',
    targetId: 'dsa-1',
  },
  {
    id: 'prompt-stale',
    type: 'stale_evidence',
    severity: 'medium',
    title: '1 Topic Has Stale Evidence',
    description: 'DSA (Arrays) has received no practice evidence for >14 days.',
    actionLabel: 'Inspect Skills Matrix',
    route: 'skills',
    targetId: 'topic-dsa-arrays',
  },
  {
    id: 'prompt-postpone',
    type: 'repeated_postpone',
    severity: 'medium',
    title: '1 Task Postponed Repeatedly',
    description: 'Task "Learn Arrays" has been postponed 3 times.',
    actionLabel: 'View Roadmap Task',
    route: 'roadmap',
    targetId: 'task-1',
  },
  {
    id: 'prompt-low-independence',
    type: 'low_independence',
    severity: 'info',
    title: 'High Solution Assistance Rate',
    description: '50% of recent solved DSA problems used hints or full solutions.',
    actionLabel: 'Practice Anchor Problems',
    route: 'dsa',
  },
];

const buildDatasets = () => ({
  dsaProblems: [mockDsaProblem],
  tasks: [mockTask],
  topics: [mockTopic],
  domains: [mockDomain],
  skillStates: mockSkillStates,
  preparationTopics: PREPARATION_TOPICS,
  practiceSessions: PRACTICE_SESSIONS,
});

describe('§8 Review Prompt Adapter', () => {
  describe('validateReviewPrompt', () => {
    it('validates a DSA overdue review prompt with valid target', () => {
      const prompt = basePrompts[0];
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(true);
      expect(result.navigable).toBe(true);
      expect(result.route).toBe('dsa');
      expect(result.targetId).toBe('dsa-1');
      expect(result.reason).toBe('Opens the matching item in your plan.');
    });

    it('validates a remediation prompt with valid target', () => {
      const prompt = basePrompts[1];
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(true);
      expect(result.navigable).toBe(true);
      expect(result.targetId).toBe('dsa-1');
    });

    it('validates a stale evidence prompt with skills route', () => {
      const prompt = basePrompts[2];
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(true);
      expect(result.navigable).toBe(true);
      expect(result.route).toBe('skills');
      expect(result.targetId).toBe('topic-dsa-arrays');
    });

    it('validates a postponed task prompt with roadmap route', () => {
      const prompt = basePrompts[3];
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(true);
      expect(result.navigable).toBe(true);
      expect(result.route).toBe('roadmap');
      expect(result.targetId).toBe('task-1');
    });

    it('handles route-only prompt (no targetId) as navigable hub navigation', () => {
      const prompt: ReviewPrompt = {
        id: 'prompt-low-independence',
        type: 'low_independence',
        severity: 'info',
        title: 'High Solution Assistance Rate',
        description: '50% of recent solved DSA problems used hints.',
        actionLabel: 'Practice Anchor Problems',
        route: 'dsa',
      };
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(true);
      expect(result.navigable).toBe(true);
      expect(result.targetId).toBeUndefined();
      expect(result.reason).toContain('no specific target to validate');
    });

    it('rejects invalid DSA targetId and marks non-navigable', () => {
      const prompt = { ...basePrompts[0], targetId: 'dsa-nonexistent' };
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(false);
      expect(result.navigable).toBe(false);
      expect(result.targetId).toBeUndefined();
      expect(result.reason).toContain('no longer exists');
    });

    it('rejects invalid roadmap targetId', () => {
      const prompt = { ...basePrompts[3], targetId: 'task-nonexistent' };
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(false);
      expect(result.navigable).toBe(false);
    });

    it('rejects invalid skills targetId', () => {
      const prompt = { ...basePrompts[2], targetId: 'topic-nonexistent' };
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      expect(result.targetValid).toBe(false);
      expect(result.navigable).toBe(false);
    });

    it('rejects targetId on invalid route', () => {
      const prompt: ReviewPrompt = {
        id: 'prompt-dashboard',
        type: 'overdue_review',
        severity: 'info',
        title: 'Test',
        description: 'Test',
        actionLabel: 'Go',
        route: 'dsa',
        targetId: 'some-id',
      };
      const datasets = buildDatasets();
      const result = validateReviewPrompt(prompt, datasets);

      // This tests that a valid route with invalid targetId is rejected
      expect(result.targetValid).toBe(false);
      expect(result.navigable).toBe(false);
    });
  });

  describe('filterNavigablePrompts', () => {
    it('returns validations for all prompts', () => {
      const results = filterNavigablePrompts(basePrompts, buildDatasets());

      expect(results.length).toBe(basePrompts.length);
      results.forEach((r) => {
        expect(r.prompt).toBeDefined();
        expect(r.targetValid).toBeDefined();
        expect(r.navigable).toBeDefined();
      });
    });
  });

  describe('buildReviewPromptDatasets', () => {
    it('builds datasets object with defaults', () => {
      const state = {
        dsaProblems: [mockDsaProblem],
        tasks: [mockTask],
        topics: [mockTopic],
        domains: [mockDomain],
        skillStates: mockSkillStates,
      };
      const datasets = buildReviewPromptDatasets(state);

      expect(datasets.dsaProblems).toHaveLength(1);
      expect(datasets.tasks).toHaveLength(1);
      expect(datasets.topics).toHaveLength(1);
      expect(datasets.domains).toHaveLength(1);
      expect(datasets.preparationTopics).toBeDefined();
      expect(datasets.practiceSessions).toBeDefined();
      expect(datasets.skillStates).toBe(mockSkillStates);
    });

    it('uses provided preparationTopics and practiceSessions when provided', () => {
      const customPrep = [{ ...PREPARATION_TOPICS[0], id: 'custom-prep' }];
      const customPractice = [{ ...PRACTICE_SESSIONS[0], id: 'custom-practice' }];

      const datasets = buildReviewPromptDatasets({
        dsaProblems: [],
        tasks: [],
        topics: [],
        domains: [],
        skillStates: {},
        preparationTopics: customPrep,
        practiceSessions: customPractice,
      });

      expect(datasets.preparationTopics).toEqual(customPrep);
      expect(datasets.practiceSessions).toEqual(customPractice);
    });
  });

  describe('reviewPromptsToCandidates', () => {
    it('converts valid prompts to candidates', () => {
      const options = {
        prompts: basePrompts,
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBeGreaterThan(0);
      result.candidates.forEach((c) => {
        expect(c.id).toContain('review-prompt-');
        expect(c.targetId).toBeDefined();
        expect(c.route).toMatch(/^(dsa|roadmap|preparation|practice)$/);
        expect(c.estimatedMinutes).toBeGreaterThan(0);
        expect(c.reason).toBeTruthy();
        expect(c.priority).toBeDefined();
        expect(c.priorityScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('maps skills route to preparation for ReviewCandidate compatibility', () => {
      const stalePrompt = basePrompts[2]; // stale_evidence with route 'skills'
      const options = {
        prompts: [stalePrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBe(1);
      expect(result.candidates[0].route).toBe('preparation');
      expect(result.candidates[0].type).toBe('preparation_lesson');
    });

    it('filters out prompts with targets already in existing routes', () => {
      const options = {
        prompts: basePrompts,
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set(['dsa-1']), // dsa-1 already covered
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      // dsa-1 prompts should be in informational, not candidates
      const dsa1Candidates = result.candidates.filter((c) => c.targetId === 'dsa-1');
      expect(dsa1Candidates.length).toBe(0);

      const informationalWithDsa1 = result.informational.filter((v) => v.targetId === 'dsa-1');
      expect(informationalWithDsa1.length).toBeGreaterThan(0);
    });

    it('respects session budget', () => {
      const options = {
        prompts: basePrompts,
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 5, // very small budget
      };

      const result = reviewPromptsToCandidates(options);

      // All prompts should be informational due to budget
      expect(result.candidates.length).toBe(0);
      expect(result.informational.length).toBe(basePrompts.length);
    });

    it('assigns correct priority by prompt type', () => {
      const options = {
        prompts: basePrompts,
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      const overdueCandidate = result.candidates.find((c) => c.priority === 'overdue_review');
      expect(overdueCandidate).toBeDefined();
      expect(overdueCandidate?.priorityScore).toBe(90);

      const remediationCandidate = result.candidates.find((c) => c.priority === 'remediation');
      expect(remediationCandidate).toBeDefined();
      expect(remediationCandidate?.priorityScore).toBe(100);

      const staleCandidate = result.candidates.find((c) => c.priority === 'stale_evidence');
      expect(staleCandidate).toBeDefined();
      expect(staleCandidate?.priorityScore).toBe(50);
    });

    it('preserves informational prompts that are not navigable', () => {
      const invalidPrompt: ReviewPrompt = {
        ...basePrompts[0],
        targetId: 'nonexistent',
      };
      const options = {
        prompts: [invalidPrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBe(0);
      expect(result.informational.length).toBe(1);
      expect(result.informational[0].navigable).toBe(false);
      expect(result.informational[0].reason).toContain('no longer exists');
    });

    it('keeps low_independence prompt informational (no targetId by design)', () => {
      // low_independence is an aggregate signal across all DSA attempts.
      // It intentionally has no targetId — deriving one would require fuzzy
      // matching or fabrication, both forbidden. The prompt stays informational.
      const lowIndependencePrompt: ReviewPrompt = {
        id: 'prompt-low-independence',
        type: 'low_independence',
        severity: 'info',
        title: 'High Solution Assistance Rate',
        description: '50% of recent solved DSA problems used hints.',
        actionLabel: 'Practice Anchor Problems',
        route: 'dsa',
      };
      const options = {
        prompts: [lowIndependencePrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      // No candidate produced — the prompt has no targetId
      expect(result.candidates.length).toBe(0);
      // The prompt is preserved as informational
      expect(result.informational.length).toBe(1);
      expect(result.informational[0].prompt.type).toBe('low_independence');
      expect(result.informational[0].targetId).toBeUndefined();
    });

    it('derives domainId and topicId from DSA problem for traceability', () => {
      const dsaPrompt: ReviewPrompt = {
        id: 'prompt-overdue-dsa',
        type: 'overdue_review',
        severity: 'high',
        title: '1 DSA Review Overdue',
        description: 'Test',
        actionLabel: 'Go to DSA Review',
        route: 'dsa',
        targetId: 'dsa-1',
      };
      const options = {
        prompts: [dsaPrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBe(1);
      // dsa-1 has domainId 'dsa' and topicId 'topic-dsa-arrays' in the mock
      expect(result.candidates[0].domainId).toBe('dsa');
      expect(result.candidates[0].topicId).toBe('topic-dsa-arrays');
    });

    it('derives domainId and topicId from roadmap task for traceability', () => {
      const roadmapPrompt: ReviewPrompt = {
        id: 'prompt-postpone',
        type: 'repeated_postpone',
        severity: 'medium',
        title: '1 Task Postponed',
        description: 'Test',
        actionLabel: 'View Roadmap Task',
        route: 'roadmap',
        targetId: 'task-1',
      };
      const options = {
        prompts: [roadmapPrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBe(1);
      // task-1 has domainId 'dsa' and topicId 'topic-dsa-arrays' in the mock
      expect(result.candidates[0].domainId).toBe('dsa');
      expect(result.candidates[0].topicId).toBe('topic-dsa-arrays');
    });

    it('derives domainId from skills topic for traceability', () => {
      const skillsPrompt: ReviewPrompt = {
        id: 'prompt-stale',
        type: 'stale_evidence',
        severity: 'medium',
        title: '1 Topic Stale',
        description: 'Test',
        actionLabel: 'Inspect Skills Matrix',
        route: 'skills',
        targetId: 'topic-dsa-arrays',
      };
      const options = {
        prompts: [skillsPrompt],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };

      const result = reviewPromptsToCandidates(options);

      expect(result.candidates.length).toBe(1);
      // topic-dsa-arrays has domainId 'dsa' in the mock
      expect(result.candidates[0].domainId).toBe('dsa');
    });
  });

  describe('isPromptDue', () => {
    it('returns true for overdue DSA review when nextReviewAt is past', () => {
      const prompt: ReviewPrompt = {
        ...basePrompts[0],
        targetId: 'dsa-1',
      };
      const state = {
        dsaProgressMap: {
          'dsa-1': {
            problemId: 'dsa-1',
            currentBox: 1 as const,
            nextReviewAt: '2026-10-10',
            attemptCount: 3,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-10T00:00:00.000Z',
          },
        },
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(true);
    });

    it('returns false for DSA review not yet due', () => {
      const prompt = { ...basePrompts[0], targetId: 'dsa-1' };
      const state = {
        dsaProgressMap: {
          'dsa-1': {
            problemId: 'dsa-1',
            currentBox: 1 as const,
            nextReviewAt: '2026-10-20',
            attemptCount: 3,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-10T00:00:00.000Z',
          },
        },
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(false);
    });

    it('returns false for overdue review with no targetId', () => {
      const prompt = { ...basePrompts[0], targetId: undefined };
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(false);
    });

    it('returns true for remediation_needed', () => {
      const prompt = basePrompts[1];
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(true);
    });

    it('returns true for stale_evidence when topic is stale', () => {
      const prompt = basePrompts[2];
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: mockSkillStates, // topic-dsa-arrays is stale
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(true);
    });

    it('returns false for stale_evidence when topic is not stale', () => {
      const prompt = basePrompts[2];
      const freshSkills = { ...mockSkillStates, 'topic-dsa-arrays': { ...mockSkillStates['topic-dsa-arrays'], freshness: 'fresh' as const } };
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: freshSkills,
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(false);
    });

    it('returns true for repeated_postpone when task is postponed', () => {
      const prompt = basePrompts[3];
      const state = {
        dsaProgressMap: {},
        taskProgressMap: mockTaskProgress,
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(true);
    });

    it('returns false for repeated_postpone when task not postponed', () => {
      const prompt = basePrompts[3];
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {
          'task-1': {
            taskId: 'task-1',
            state: 'in_progress' as const,
            postponeCount: 0,
            skipCount: 0,
            timeSpentMinutes: 0,
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        },
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(false);
    });

    it('returns true for low_independence', () => {
      const prompt = basePrompts[4];
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(true);
    });

    it('returns false for unknown prompt type', () => {
      const prompt = {
        ...basePrompts[0],
        type: 'unknown_type' as ReviewPrompt['type'],
      };
      const state = {
        dsaProgressMap: {},
        taskProgressMap: {},
        skillStates: {},
        todayStr: TODAY,
      };

      expect(isPromptDue(prompt, state)).toBe(false);
    });
  });

  describe('Determinism and non-mutation', () => {
    it('returns identical validation results on repeated execution', () => {
      const prompt = basePrompts[0];
      const datasets = buildDatasets();

      expect(validateReviewPrompt(prompt, datasets)).toEqual(
        validateReviewPrompt(prompt, datasets)
      );
    });

    it('does not mutate input datasets', () => {
      const datasets = buildDatasets();
      const snapshot = JSON.stringify(datasets);

      validateReviewPrompt(basePrompts[0], datasets);

      expect(JSON.stringify(datasets)).toBe(snapshot);
    });

    it('does not mutate input prompts', () => {
      const prompts = [...basePrompts];
      const snapshot = JSON.stringify(prompts);

      filterNavigablePrompts(prompts, buildDatasets());

      expect(JSON.stringify(prompts)).toBe(snapshot);
    });

    it('does not mutate input to reviewPromptsToCandidates', () => {
      const options = {
        prompts: [...basePrompts],
        datasets: buildDatasets(),
        existingRouteTargetIds: new Set<string>(),
        availableMinutes: 60,
      };
      const snapshot = JSON.stringify({ prompts: options.prompts, datasets: options.datasets });

      reviewPromptsToCandidates(options);

      expect(JSON.stringify({ prompts: options.prompts, datasets: options.datasets })).toBe(snapshot);
    });
  });
});