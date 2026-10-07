import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectEvidenceLedger } from '../components/project/ProjectEvidenceLedger';
import { ProjectLabView } from '../components/project/ProjectLabView';
import { buildProjectDefenseTrace } from '../engine/evidenceTrace';
import { PRACTICE_SESSIONS } from '../data/practiceDataset';
import { PlacementProvider } from '../context/PlacementContext';
import { GuideProvider } from '../components/guide/GuideContext';
import type { PracticeAttempt, EvidenceLog, TopicSkillState, PracticeSessionDefinition } from '../types';

describe('Project Manufacturing Part 3 — Zone 5 Proof-of-Work Ledger & Signature Motion', () => {
  const defenseSession: PracticeSessionDefinition = PRACTICE_SESSIONS.find(
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
    evidenceLogId: 'ev-defense-01',
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
    date: '2026-10-06',
    completedAt: '2026-10-06T09:00:00Z',
    scorePct: 50,
    accuracyPct: 50,
    correctCount: 2,
    totalQuestions: 4,
    totalTimeSeconds: 400,
    passingScorePct: 80,
    passed: false,
    evidenceLogId: 'ev-defense-fail-01',
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

  const mockDefenseLog: EvidenceLog = {
    id: 'ev-defense-01',
    domainId: 'interviews',
    topicId: 'prep-interview-career',
    score: 100,
    confidence: 5,
    timestamp: '2026-10-07T10:00:00Z',
    sourceType: 'practice_session',
    sourceId: 'practice-project-defense-01',
    details: 'Completed System & Project Architecture Defense with 100% accuracy',
  };

  // -------------------------------------------------------------------------
  // 1. EVIDENCE TRACE ENGINE INTEGRATION
  // -------------------------------------------------------------------------
  describe('Canonical buildProjectDefenseTrace Integration', () => {
    it('generates derived trace when no defense attempts are recorded', () => {
      const trace = buildProjectDefenseTrace({
        topics: [],
        taskDefinitions: [],
        taskProgress: {},
        dsaProblems: [],
        dsaProgress: {},
        dsaAttempts: [],
        evidenceLogs: [],
        practiceSessions: [defenseSession],
        practiceAttempts: [],
        skillStates: {},
        todayISO: '2026-10-07',
      });

      expect(trace.signal).toBe('project_defense');
      expect(trace.origin).toBe('derived');
      expect(trace.why).toContain('No defense session has been recorded yet');
      expect(trace.destination.route).toBe('project');
    });

    it('generates direct or aggregated trace when defense attempts exist', () => {
      const trace = buildProjectDefenseTrace({
        topics: [],
        taskDefinitions: [],
        taskProgress: {},
        dsaProblems: [],
        dsaProgress: {},
        dsaAttempts: [],
        evidenceLogs: [mockDefenseLog],
        practiceSessions: [defenseSession],
        practiceAttempts: [mockPassedAttempt],
        skillStates: { 'prep-interview-career': mockCareerSkillFresh },
        todayISO: '2026-10-07',
      });

      expect(trace.signal).toBe('project_defense');
      expect(trace.origin).toBe('aggregated');
      expect(trace.why).toContain('1 recorded defense session backing project readiness');
      expect(trace.sources.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. ZONE 5: PROJECT EVIDENCE LEDGER COMPONENT
  // -------------------------------------------------------------------------
  describe('Zone 5 — ProjectEvidenceLedger Component', () => {
    it('renders empty state with honest prompt and Launch CTA when 0 attempts exist', () => {
      const handleLaunch = vi.fn();
      render(
        <ProjectEvidenceLedger
          practiceAttempts={[]}
          practiceSessions={[defenseSession]}
          evidenceLogs={[]}
          skillStates={{}}
          onLaunchDefense={handleLaunch}
          onNavigateToRemediation={vi.fn()}
        />
      );

      expect(screen.getByTestId('project-evidence-ledger')).toBeInTheDocument();
      expect(screen.getByTestId('project-evidence-empty')).toBeInTheDocument();
      expect(screen.getByText('No Recorded Defense Proof Yet')).toBeInTheDocument();

      const launchBtn = screen.getByRole('button', { name: /Launch Project Defense/i });
      expect(launchBtn).toBeInTheDocument();
      fireEvent.click(launchBtn);
      expect(handleLaunch).toHaveBeenCalledTimes(1);
    });

    it('renders recorded attempts with score, fraction, date, and PASS indicator', () => {
      render(
        <ProjectEvidenceLedger
          practiceAttempts={[mockPassedAttempt]}
          practiceSessions={[defenseSession]}
          evidenceLogs={[mockDefenseLog]}
          skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
          onLaunchDefense={vi.fn()}
          onNavigateToRemediation={vi.fn()}
        />
      );

      expect(screen.getByTestId('project-evidence-list')).toBeInTheDocument();
      expect(screen.getByTestId('project-next-action')).toHaveTextContent(/Defense Passed — 100% meets the 80% threshold/i);

      const attemptCard = screen.getByTestId(`attempt-card-${mockPassedAttempt.id}`);
      expect(attemptCard).toBeInTheDocument();
      expect(attemptCard).toHaveTextContent('100% Score');
      expect(attemptCard).toHaveTextContent('4/4 correct');
      expect(attemptCard).toHaveTextContent('PASS');
      expect(attemptCard).toHaveTextContent('needs 80%');
      expect(attemptCard).toHaveTextContent('Latest');
    });

    it('renders FAIL state with non-color indicator and remediation button for failed attempt', () => {
      const handleRemediation = vi.fn();
      render(
        <ProjectEvidenceLedger
          practiceAttempts={[mockFailedAttempt]}
          practiceSessions={[defenseSession]}
          evidenceLogs={[]}
          skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
          onLaunchDefense={vi.fn()}
          onNavigateToRemediation={handleRemediation}
        />
      );

      expect(screen.getByTestId('project-next-action')).toHaveTextContent(/Defense Not Passed — 50% is below the 80% threshold/i);

      const attemptCard = screen.getByTestId(`attempt-card-${mockFailedAttempt.id}`);
      expect(attemptCard).toHaveTextContent('50% Score');
      expect(attemptCard).toHaveTextContent('2/4 correct');
      expect(attemptCard).toHaveTextContent('FAIL');
      expect(attemptCard).toHaveTextContent('2 unanswered');

      const remediationBtn = screen.getByRole('button', { name: /Review Notes \(prep-interview-career\)/i });
      expect(remediationBtn).toBeInTheDocument();
      fireEvent.click(remediationBtn);
      expect(handleRemediation).toHaveBeenCalledWith('preparation', 'prep-interview-career');
    });

    it('expands question-by-question audit and distinguishes candidate answer vs model answer', () => {
      render(
        <ProjectEvidenceLedger
          practiceAttempts={[mockFailedAttempt]}
          practiceSessions={[defenseSession]}
          evidenceLogs={[]}
          skillStates={{ 'prep-interview-career': mockCareerSkillFresh }}
          onLaunchDefense={vi.fn()}
          onNavigateToRemediation={vi.fn()}
        />
      );

      const reviewBtn = screen.getByRole('button', { name: /^Review$/i });
      expect(reviewBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(reviewBtn);
      expect(reviewBtn).toHaveAttribute('aria-expanded', 'true');

      const reviewList = screen.getByTestId('attempt-review');
      expect(reviewList).toBeInTheDocument();
      expect(reviewList).toHaveTextContent('Question-by-Question Verification Audit');
      expect(reviewList).toHaveTextContent('Candidate Response:');
      expect(reviewList).toHaveTextContent('Model Answer & Explanation:');

      // Check unanswered callout
      const unansweredBadges = screen.getAllByTestId('answer-unanswered');
      expect(unansweredBadges.length).toBeGreaterThan(0);
      expect(unansweredBadges[0]).toHaveTextContent('[!] Not answered / Skipped');
    });
  });

  // -------------------------------------------------------------------------
  // 3. FULL PROJECT VIEW INTEGRATION & SIGNATURE MOTION
  // -------------------------------------------------------------------------
  describe('ProjectLabView Part 3 Complete Integration', () => {
    it('orchestrates all 5 frozen zones cleanly', () => {
      render(
        <PlacementProvider>
          <GuideProvider>
            <ProjectLabView />
          </GuideProvider>
        </PlacementProvider>
      );

      // Zone 1
      expect(screen.getByTestId('project-header')).toBeInTheDocument();
      expect(screen.getByTestId('project-readiness-strip')).toBeInTheDocument();

      // Zone 2
      expect(screen.getByTestId('project-defense-hero')).toBeInTheDocument();

      // Zone 3
      expect(screen.getByTestId('project-pillar-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('project-architecture-blueprint')).toBeInTheDocument();
      expect(screen.getByTestId('visual-data-flow-pipeline')).toHaveClass('data-flow-pulse-track');

      // Zone 4
      expect(screen.getByTestId('project-defense-rubric')).toBeInTheDocument();

      // Zone 5
      expect(screen.getByTestId('project-evidence-ledger')).toBeInTheDocument();
    });
  });
});
