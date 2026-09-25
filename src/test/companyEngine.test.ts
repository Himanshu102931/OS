import { describe, it, expect } from 'vitest';
import { calculateCompanySnapshot, getDaysUntilEvent } from '../engine/companyEngine';
import type {
  CompanyOverlay,
  DomainDefinition,
  Topic,
  TaskDefinition,
  TaskProgress,
  DSAProblem,
  DSAProgress,
  TopicSkillState,
} from '../types';

const mockCompany: CompanyOverlay = {
  id: 'comp-1',
  companyName: 'Google',
  targetRole: 'Software Engineer (SDE-1)',
  applicationStatus: 'oa_scheduled',
  eventDate: '2026-10-15',
  requiredDomains: ['dsa', 'dbms'],
  requiredTopics: ['topic-dsa-arrays'],
  requiredLanguages: ['cpp', 'python'],
};

const mockDomainDSA: DomainDefinition = {
  id: 'dsa',
  name: 'Data Structures & Algorithms',
  shortName: 'DSA',
  description: 'Arrays, Trees',
  iconName: 'Code',
  color: 'emerald',
};

const mockDomainDBMS: DomainDefinition = {
  id: 'dbms',
  name: 'Database Management Systems',
  shortName: 'DBMS',
  description: 'ACID, SQL',
  iconName: 'Server',
  color: 'indigo',
};

const mockTopic: Topic = {
  id: 'topic-dsa-arrays',
  moduleId: 'mod-dsa-1',
  domainId: 'dsa',
  name: 'Arrays & Two Pointers',
  description: 'Linear arrays',
  importance: 8,
};

const mockTask: TaskDefinition = {
  id: 'task-1',
  title: 'Arrays Practice 1',
  description: 'Two pointers practice',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  phaseId: 'phase-1',
  estimatedMinutes: 60,
  importance: 8,
  taskType: 'practice',
  languageTags: ['cpp'],
  createdAt: '2026-09-01',
};

const mockDsaProblem: DSAProblem = {
  id: 'dsa-001',
  leetcodeNumber: 1,
  title: 'Two Sum',
  domainId: 'dsa',
  topicId: 'topic-dsa-arrays',
  difficulty: 'easy',
  leetcodeUrl: 'https://leetcode.com',
  accessTier: 'FREE',
  primaryPattern: 'Two Pointers',
  dataStructure: 'Array',
  algorithmicTechnique: 'Hashing',
  recommendedPhase: 1,
  progressionTier: 'STARTER',
  prerequisites: [],
  isAnchor: true,
  estimatedTimeMinutes: 20,
};

describe('companyEngine', () => {
  it('calculates days until assessment event date', () => {
    expect(getDaysUntilEvent('2026-10-15', '2026-09-25')).toBe(20);
    expect(getDaysUntilEvent(undefined, '2026-09-25')).toBeNull();
  });

  it('calculates company preparation snapshot with gaps when evidence is missing', () => {
    const snapshot = calculateCompanySnapshot(
      mockCompany,
      [mockDomainDSA, mockDomainDBMS],
      [mockTopic],
      [mockTask],
      {},
      [mockDsaProblem],
      {},
      [],
      [],
      {},
      '2026-09-25'
    );

    expect(snapshot.company.companyName).toBe('Google');
    expect(snapshot.totalRequirementsCount).toBeGreaterThan(0);
    expect(snapshot.coveredRequirementsCount).toBe(0);
    expect(snapshot.gapRequirementsCount).toBeGreaterThan(0);
    expect(snapshot.topActionableGaps.length).toBeGreaterThan(0);
  });

  it('detects covered requirement status when evidence strength is high', () => {
    const taskProgressMap: Record<string, TaskProgress> = {
      'task-1': {
        taskId: 'task-1',
        state: 'completed',
        postponeCount: 0,
        skipCount: 0,
        lastCompletedAt: '2026-09-24T10:00:00Z',
        timeSpentMinutes: 60,
        updatedAt: '2026-09-24',
      },
    };

    const dsaProgressMap: Record<string, DSAProgress> = {
      'dsa-001': {
        problemId: 'dsa-001',
        currentBox: 4,
        attemptCount: 3,
        passedIndependently: true,
        lastAttemptAt: '2026-09-24T12:00:00Z',
        createdAt: '2026-09-01',
        updatedAt: '2026-09-24',
      },
    };

    const skillStatesMap: Record<string, TopicSkillState> = {
      'topic-dsa-arrays': {
        topicId: 'topic-dsa-arrays',
        domainId: 'dsa',
        freshness: 'fresh',
        evidenceStrength: 85,
        lastPracticedAt: '2026-09-24T12:00:00Z',
      },
    };

    const snapshot = calculateCompanySnapshot(
      mockCompany,
      [mockDomainDSA, mockDomainDBMS],
      [mockTopic],
      [mockTask],
      taskProgressMap,
      [mockDsaProblem],
      dsaProgressMap,
      [],
      [],
      skillStatesMap,
      '2026-09-25'
    );

    expect(snapshot.coveredRequirementsCount).toBeGreaterThan(0);
    expect(snapshot.overallPreparationStrength).toBeGreaterThan(50);
  });
});
