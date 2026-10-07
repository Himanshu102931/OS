import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectReadinessStrip } from '../components/project/ProjectReadinessStrip';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { ProjectDefenseHero } from '../components/project/ProjectDefenseHero';
import { ProjectLabView } from '../components/project/ProjectLabView';
import { calculateProjectReadiness } from '../engine/interviewReadinessEngine';
import { resolveProjectDefenseRemediation } from '../engine/remediationRouter';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PREPARATION_TOPICS } from '../data/preparationDataset';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import type { PracticeAttempt, EvidenceLog, TopicSkillState } from '../types';

describe('Project Manufacturing Part 1 — Zones 1 & 2', () => {
  const defenseSession = PRACTICE_SESSIONS.find(
    (s) => s.id === 'practice-project-defense-01' || s.category === 'project_defense'
  )!;

  const mockPassedAttempt: PracticeAttempt = {
    id: 'attempt-proj-pass-01',
    sessionId: 'practice-project-defense-01',
    sessionTitle: 'System & Project Architecture Defense',
    category: 'project_defense',
    domainId: 'interviews',
    date: '2026-10-07',
    completedAt: '2026-10-07T10:00:00Z',
    scorePct: 100,
    accuracyPct: 100,
    correctCount: 4,
    totalQuestions: 4,
    totalTimeSeconds: 600,
    passingScorePct: 80,
    passed: true,
    userAnswers: [
      { questionId: 'q-proj-1', userResponse: 'High level React client to storage adapter flow.', isCorrect: true },
      { questionId: 'q-proj-2', userResponse: 'Chose localStorage over DB for offline speed.', isCorrect: true },
      { questionId: 'q-proj-3', userResponse: 'DB bottlenecks mitigated via caching and indexing.', isCorrect: true },
      { questionId: 'q-proj-4', userResponse: 'Validated inputs at system boundary.', isCorrect: true },
    ],
  };

  const mockFailedAttempt: PracticeAttempt = {
    id: 'attempt-proj-fail-01',
    sessionId: 'practice-project-defense-01',
    sessionTitle: 'System & Project Architecture Defense',
    category: 'project_defense',
    domainId: 'interviews',
    date: '2026-10-07',
    completedAt: '2026-10-07T09:00:00Z',
    scorePct: 50,
    accuracyPct: 50,
    correctCount: 2,
    totalQuestions: 4,
    totalTimeSeconds: 400,
    passingScorePct: 80,
    passed: false,
    userAnswers: [
      { questionId: 'q-proj-1', userResponse: 'Architecture flow.', isCorrect: true },
      { questionId: 'q-proj-2', userResponse: 'Tradeoffs.', isCorrect: true },
      { questionId: 'q-proj-3', userResponse: '', isCorrect: false },
      { questionId: 'q-proj-4', userResponse: '', isCorrect: false },
    ],
  };

  const mockCareerSkillFresh: TopicSkillState = {
    topicId: 'prep-interview-career',
    domainId: 'interviews',
    evidenceStrength: 80,
    freshness: 'fresh',
    lastPracticedAt: '2026-10-07T10:00:00Z',
  };

  const mockCareerSkillAging: TopicSkillState = {
    topicId: 'prep-interview-career',
    domainId: 'interviews',
    evidenceStrength: 60,
    freshness: 'aging',
    lastPracticedAt: '2026-09-25T10:00:00Z',
  };

  const mockDefenseLog: EvidenceLog = {
    id: 'ev-defense-01',
    domainId: 'interviews',
    topicId: 'prep-interview-career',
    score: 100,
    confidence: 5,
    timestamp: '2026-10-07T10:00:00Z',
    sourceType: 'practice_session',
    sourceId: 'attempt-proj-pass-01',
    details: 'Project Defense viva simulation passed',
  };

  // -------------------------------------------------------------------------
  // 1. CANONICAL ENGINE INTEGRITY
  // -------------------------------------------------------------------------
  describe('Canonical Engine Integrity', () => {
    it('calculateProjectReadiness returns needs_work when zero attempts exist', () => {
      const result = calculateProjectReadiness([], []);
      expect(result.defenseReadiness).toBe('needs_work');
      expect(result.evidenceDefenseSessions).toBe(0);
      expect(result.sectionsCompleted).toBe(0);
      expect(result.totalSections).toBe(6);
    });

    it('calculateProjectReadiness returns developing when 1 attempt exists', () => {
      const result = calculateProjectReadiness([mockPassedAttempt], [mockDefenseLog]);
      expect(result.defenseReadiness).toBe('developing');
      expect(result.evidenceDefenseSessions).toBe(1);
      expect(result.sectionsCompleted).toBe(2); // defense passed + evidence attempted
    });

    it('calculateProjectReadiness returns strong when >=3 attempts exist with a pass', () => {
      const attempts = [
        mockPassedAttempt,
        { ...mockPassedAttempt, id: 'attempt-2' },
        { ...mockPassedAttempt, id: 'attempt-3' },
      ];
      const logs = [mockDefenseLog, { ...mockDefenseLog, id: 'ev-2' }, { ...mockDefenseLog, id: 'ev-3' }];
      const result = calculateProjectReadiness(attempts, logs);
      expect(result.defenseReadiness).toBe('strong');
      expect(result.evidenceDefenseSessions).toBe(3);
    });

    it('resolveProjectDefenseRemediation correctly routes failed defense to prep-interview-career', () => {
      const routes = resolveProjectDefenseRemediation({
        practiceAttempts: [mockFailedAttempt],
        practiceSessions: [defenseSession],
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: {},
        skillStates: { 'prep-interview-career': mockCareerSkillFresh },
      });
      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].route).toBe('preparation');
      expect(routes[0].targetId).toBe('prep-interview-career');
      expect(routes[0].sourceType).toBe('project_defense_weakness');
    });

    it('resolveProjectDefenseRemediation returns empty routes when latest attempt passed', () => {
      const routes = resolveProjectDefenseRemediation({
        practiceAttempts: [mockPassedAttempt],
        practiceSessions: [defenseSession],
        preparationTopics: PREPARATION_TOPICS,
        preparationTopicProgress: {},
        skillStates: { 'prep-interview-career': mockCareerSkillFresh },
      });
      expect(routes.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. ZONE 1: PROJECT READINESS STRIP
  // -------------------------------------------------------------------------
  describe('Zone 1 — ProjectReadinessStrip Component', () => {
    it('renders all four telemetry factors in empty/initial state', () => {
      render(
        <ProjectReadinessStrip
          practiceAttempts={[]}
          evidenceLogs={[]}
          skillStates={{}}
        />
      );

      // 1. Readiness band
      expect(screen.getByTestId('readiness-band-badge')).toHaveTextContent('NEEDS WORK');
      // 2. Runs count
      expect(screen.getByTestId('recorded-runs-count')).toHaveTextContent('0');
      // 3. Latest score
      expect(screen.queryByTestId('latest-score-pct')).toBeNull();
      expect(screen.getByText('Untested (no attempts)')).toBeInTheDocument();
      // 4. Freshness
      expect(screen.getByTestId('evidence-freshness-label')).toHaveTextContent('Untested');
    });

    it('renders passing telemetry with explicit non-color PASS indicator', () => {
      render(
        <ProjectReadinessStrip
          practiceAttempts={[mockPassedAttempt]}
          evidenceLogs={[mockDefenseLog]}
          skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
        />
      );

      expect(screen.getByTestId('readiness-band-badge')).toHaveTextContent('DEVELOPING');
      expect(screen.getByTestId('recorded-runs-count')).toHaveTextContent('1');
      expect(screen.getByTestId('latest-score-pct')).toHaveTextContent('100%');
      expect(screen.getByTestId('latest-verdict-badge')).toHaveTextContent('PASS');
      expect(screen.getByTestId('evidence-freshness-label')).toHaveTextContent('Fresh (≤7d)');
    });

    it('renders failing telemetry with explicit non-color FAIL indicator', () => {
      render(
        <ProjectReadinessStrip
          practiceAttempts={[mockFailedAttempt]}
          evidenceLogs={[]}
          skillStates={{ 'prep-interview-career': mockCareerSkillAging }}
        />
      );

      expect(screen.getByTestId('readiness-band-badge')).toHaveTextContent('DEVELOPING');
      expect(screen.getByTestId('recorded-runs-count')).toHaveTextContent('1');
      expect(screen.getByTestId('latest-score-pct')).toHaveTextContent('50%');
      expect(screen.getByTestId('latest-verdict-badge')).toHaveTextContent('FAIL');
      expect(screen.getByTestId('evidence-freshness-label')).toHaveTextContent('Aging (≤14d)');
    });
  });

  // -------------------------------------------------------------------------
  // 3. ZONE 1: PROJECT HEADER
  // -------------------------------------------------------------------------
  describe('Zone 1 — ProjectHeader Component', () => {
    it('renders project identity, h1 title, and GuideTrigger', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <ProjectHeader
              practiceAttempts={[mockPassedAttempt]}
              evidenceLogs={[mockDefenseLog]}
              skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
            />
          </GuideProvider>
        </PlacementProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PROJECT LAB');
      expect(screen.getByText(/BUILD → UNDERSTAND → EXPLAIN → DEFEND/i)).toBeInTheDocument();
      expect(screen.getByTestId('project-readiness-strip')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. ZONE 2: PROJECT DEFENSE HERO
  // -------------------------------------------------------------------------
  describe('Zone 2 — ProjectDefenseHero Component', () => {
    it('renders session specs and canonical session ID', () => {
      render(
        <ProjectDefenseHero
          defenseSession={defenseSession}
          practiceAttempts={[]}
          practiceSessions={[defenseSession]}
          preparationTopics={PREPARATION_TOPICS}
          preparationTopicProgress={{}}
          skillStates={{}}
          onLaunchDefense={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'System & Project Architecture Defense'
      );
      expect(screen.getByText('practice-project-defense-01')).toBeInTheDocument();
      expect(screen.getByText(/Defense Prompts/i)).toBeInTheDocument();
      expect(screen.getByText(/Passing Threshold/i)).toBeInTheDocument();
      expect(screen.getByTestId('no-attempt-status-banner')).toBeInTheDocument();
    });

    it('triggers onLaunchDefense when primary CTA is clicked', () => {
      const handleLaunch = vi.fn();
      render(
        <ProjectDefenseHero
          defenseSession={defenseSession}
          practiceAttempts={[]}
          practiceSessions={[defenseSession]}
          preparationTopics={PREPARATION_TOPICS}
          preparationTopicProgress={{}}
          skillStates={{}}
          onLaunchDefense={handleLaunch}
        />
      );

      const ctaBtn = screen.getByTestId('launch-project-defense-btn');
      expect(ctaBtn).toHaveTextContent('Launch Project Defense');
      fireEvent.click(ctaBtn);
      expect(handleLaunch).toHaveBeenCalledTimes(1);
    });

    it('renders PASS status when latest attempt meets threshold', () => {
      render(
        <ProjectDefenseHero
          defenseSession={defenseSession}
          practiceAttempts={[mockPassedAttempt]}
          practiceSessions={[defenseSession]}
          preparationTopics={PREPARATION_TOPICS}
          preparationTopicProgress={{}}
          skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
          onLaunchDefense={vi.fn()}
        />
      );

      expect(screen.getByTestId('latest-attempt-status-banner')).toBeInTheDocument();
      expect(screen.getByTestId('attempt-status-text')).toHaveTextContent('PASS');
      expect(screen.getByText(/Defense Passed — Score 100% meets the 80% requirement/i)).toBeInTheDocument();
      expect(screen.queryByTestId('defense-remediation-btn')).toBeNull();
    });

    it('renders FAIL status and remediation button when attempt is below threshold', () => {
      const handleRemediation = vi.fn();
      render(
        <ProjectDefenseHero
          defenseSession={defenseSession}
          practiceAttempts={[mockFailedAttempt]}
          practiceSessions={[defenseSession]}
          preparationTopics={PREPARATION_TOPICS}
          preparationTopicProgress={{}}
          skillStates={{ 'prep-interview-career': mockCareerSkillAging }}
          onLaunchDefense={vi.fn()}
          onNavigateToRemediation={handleRemediation}
        />
      );

      expect(screen.getByTestId('latest-attempt-status-banner')).toBeInTheDocument();
      expect(screen.getByTestId('attempt-status-text')).toHaveTextContent('FAIL');
      expect(screen.getByText(/Defense Not Passed — Score 50% is below the 80% threshold/i)).toBeInTheDocument();

      const remediationBtn = screen.getByTestId('defense-remediation-btn');
      expect(remediationBtn).toBeInTheDocument();
      fireEvent.click(remediationBtn);
      expect(handleRemediation).toHaveBeenCalledWith('preparation', 'prep-interview-career');
    });
  });

  // -------------------------------------------------------------------------
  // 5. INTEGRATION IN PROJECTLABVIEW
  // -------------------------------------------------------------------------
  describe('ProjectLabView Integration', () => {
    it('renders complete ProjectLabView with Zone 1 & Zone 2 active', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <ProjectLabView />
          </GuideProvider>
        </PlacementProvider>
      );

      expect(screen.getByTestId('project-header')).toBeInTheDocument();
      expect(screen.getByTestId('project-readiness-strip')).toBeInTheDocument();
      expect(screen.getByTestId('project-defense-hero')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });
});
