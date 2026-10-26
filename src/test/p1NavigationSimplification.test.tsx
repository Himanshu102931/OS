import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppShell } from '../components/layout/AppShell';
import { LearnHubView } from '../components/learn/LearnHubView';
import { ProgressHubView } from '../components/progress/ProgressHubView';
import { PlacementProvider, usePlacement } from '../context/PlacementContext';
import { StorageAdapter, getDefaultStorageState, type AppExtendedStorageState } from '../storage/storageAdapter';
import {
  isRetiredDomain,
  isRetiredRoute,
  isEligibleSimpleTask,
  isEligibleSimpleCandidate,
  isEligibleSimplePracticeSession,
} from '../engine/simpleFilter';
import type { TaskDefinition, PracticeSessionDefinition } from '../types';
import type { CandidateTask } from '../engine/adaptiveEngine';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TestRouteProber: React.FC = () => {
  const { currentRoute, setRoute } = usePlacement();
  return (
    <div data-testid="route-prober">
      <span data-testid="current-route-display">{currentRoute}</span>
      <button data-testid="go-today-btn" onClick={() => setRoute('dashboard')}>Go Today</button>
      <button data-testid="go-learn-btn" onClick={() => setRoute('learn')}>Go Learn</button>
      <button data-testid="go-practice-btn" onClick={() => setRoute('practice')}>Go Practice</button>
      <button data-testid="go-progress-btn" onClick={() => setRoute('progress')}>Go Progress</button>
      <button data-testid="go-settings-btn" onClick={() => setRoute('settings')}>Go Settings</button>
      <button data-testid="go-project-btn" onClick={() => setRoute('project')}>Go Project</button>
      <button data-testid="go-companies-btn" onClick={() => setRoute('companies')}>Go Companies</button>
      <button data-testid="go-interview-btn" onClick={() => setRoute('interview')}>Go Interview</button>
    </div>
  );
};

describe('P1: Navigation & Experience Simplification', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  describe('1. Four Primary Navigation Destinations in AppShell', () => {
    it('renders exactly four primary navigation items with correct labels in main nav', () => {
      render(
        <PlacementProvider>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </PlacementProvider>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navButtons = nav.querySelectorAll('button');
      expect(navButtons).toHaveLength(4);

      const labels = Array.from(navButtons).map((btn) => btn.textContent?.trim());
      expect(labels).toEqual(['Today', 'Learn', 'Practice', 'Progress']);
    });

    it('highlights the active primary navigation item with aria-current="page"', () => {
      render(
        <PlacementProvider>
          <AppShell>
            <TestRouteProber />
          </AppShell>
        </PlacementProvider>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navButtons = Array.from(nav.querySelectorAll('button'));

      // Initially Today is active
      const todayBtn = navButtons.find((btn) => btn.textContent?.includes('Today'));
      expect(todayBtn).toHaveAttribute('aria-current', 'page');

      // Navigate to Learn
      fireEvent.click(screen.getByTestId('go-learn-btn'));
      const learnBtn = navButtons.find((btn) => btn.textContent?.includes('Learn'));
      expect(learnBtn).toHaveAttribute('aria-current', 'page');
      expect(todayBtn).not.toHaveAttribute('aria-current');

      // Navigate to Practice
      fireEvent.click(screen.getByTestId('go-practice-btn'));
      const practiceBtn = navButtons.find((btn) => btn.textContent?.includes('Practice'));
      expect(practiceBtn).toHaveAttribute('aria-current', 'page');
      expect(learnBtn).not.toHaveAttribute('aria-current');

      // Navigate to Progress
      fireEvent.click(screen.getByTestId('go-progress-btn'));
      const progressBtn = navButtons.find((btn) => btn.textContent?.includes('Progress'));
      expect(progressBtn).toHaveAttribute('aria-current', 'page');
      expect(practiceBtn).not.toHaveAttribute('aria-current');
    });

    it('keeps Learn highlighted when navigating to its child learning routes (roadmap, preparation, dsa)', () => {
      const Wrapper: React.FC = () => {
        const { setRoute } = usePlacement();
        return (
          <AppShell>
            <button data-testid="nav-roadmap" onClick={() => setRoute('roadmap')}>Roadmap</button>
            <button data-testid="nav-prep" onClick={() => setRoute('preparation')}>Prep</button>
            <button data-testid="nav-dsa" onClick={() => setRoute('dsa')}>DSA</button>
          </AppShell>
        );
      };

      render(
        <PlacementProvider>
          <Wrapper />
        </PlacementProvider>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navButtons = Array.from(nav.querySelectorAll('button'));
      const learnBtn = navButtons.find((btn) => btn.textContent?.includes('Learn'));

      fireEvent.click(screen.getByTestId('nav-roadmap'));
      expect(learnBtn).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByTestId('nav-prep'));
      expect(learnBtn).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByTestId('nav-dsa'));
      expect(learnBtn).toHaveAttribute('aria-current', 'page');
    });

    it('keeps Progress highlighted when navigating to its child progress routes (skills, analytics, assessment)', () => {
      const Wrapper: React.FC = () => {
        const { setRoute } = usePlacement();
        return (
          <AppShell>
            <button data-testid="nav-skills" onClick={() => setRoute('skills')}>Skills</button>
            <button data-testid="nav-analytics" onClick={() => setRoute('analytics')}>Analytics</button>
            <button data-testid="nav-assessment" onClick={() => setRoute('assessment')}>Assessment</button>
          </AppShell>
        );
      };

      render(
        <PlacementProvider>
          <Wrapper />
        </PlacementProvider>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      const navButtons = Array.from(nav.querySelectorAll('button'));
      const progressBtn = navButtons.find((btn) => btn.textContent?.includes('Progress'));

      fireEvent.click(screen.getByTestId('nav-skills'));
      expect(progressBtn).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByTestId('nav-analytics'));
      expect(progressBtn).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByTestId('nav-assessment'));
      expect(progressBtn).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('2. Secondary Settings & Backup Accessibility', () => {
    it('provides accessible Settings & Backup in header and sidebar without cluttering primary nav', () => {
      render(
        <PlacementProvider>
          <AppShell>
            <TestRouteProber />
          </AppShell>
        </PlacementProvider>
      );

      const headerSettingsBtn = screen.getByTestId('header-settings-btn');
      expect(headerSettingsBtn).toBeInTheDocument();
      expect(headerSettingsBtn).toHaveAttribute('aria-label', 'Settings & Backup');

      const sidebarSettingsBtn = screen.getByTestId('settings-nav-btn');
      expect(sidebarSettingsBtn).toBeInTheDocument();
      expect(sidebarSettingsBtn).toHaveTextContent('Settings & Backup');

      // Click settings and verify route transitions
      fireEvent.click(sidebarSettingsBtn);
      expect(screen.getByTestId('current-route-display')).toHaveTextContent('settings');
    });
  });

  describe('3. Retired Modules Removal & Simple Filter Policy', () => {
    it('identifies retired domains correctly', () => {
      expect(isRetiredDomain('proj')).toBe(true);
      expect(isRetiredDomain('project')).toBe(true);
      expect(isRetiredDomain('company')).toBe(true);
      expect(isRetiredDomain('companies')).toBe(true);
      expect(isRetiredDomain('interview')).toBe(true);
      expect(isRetiredDomain('int')).toBe(true);

      expect(isRetiredDomain('lang-python')).toBe(false);
      expect(isRetiredDomain('dsa-patterns')).toBe(false);
      expect(isRetiredDomain('cs-core')).toBe(false);
    });

    it('identifies retired routes correctly', () => {
      expect(isRetiredRoute('project')).toBe(true);
      expect(isRetiredRoute('companies')).toBe(true);
      expect(isRetiredRoute('interview')).toBe(true);

      expect(isRetiredRoute('dashboard')).toBe(false);
      expect(isRetiredRoute('learn')).toBe(false);
      expect(isRetiredRoute('practice')).toBe(false);
      expect(isRetiredRoute('progress')).toBe(false);
      expect(isRetiredRoute('roadmap')).toBe(false);
      expect(isRetiredRoute('preparation')).toBe(false);
      expect(isRetiredRoute('dsa')).toBe(false);
    });

    it('filters out retired tasks and candidates from simple recommendation streams', () => {
      const activeTask: TaskDefinition = {
        id: 'task-python-basics',
        title: 'Python Language Fundamentals',
        description: 'Learn syntax basics',
        domainId: 'python',
        topicId: 'topic-python',
        phaseId: 'phase-1',
        estimatedMinutes: 60,
        importance: 8,
        taskType: 'learning',
        createdAt: '2026-10-26',
      };

      const projectTask: TaskDefinition = {
        id: 'proj-fullstack-app',
        title: 'Build Fullstack Project',
        description: 'Build portfolio project',
        domainId: 'projects',
        topicId: 'topic-proj',
        phaseId: 'phase-3',
        estimatedMinutes: 120,
        importance: 7,
        taskType: 'project',
        createdAt: '2026-10-26',
      };

      const interviewTask: TaskDefinition = {
        id: 'int-mock-round-1',
        title: 'Mock Technical Interview',
        description: 'Simulate technical interview',
        domainId: 'interviews',
        topicId: 'topic-interview',
        phaseId: 'phase-4',
        estimatedMinutes: 45,
        importance: 8,
        taskType: 'assessment',
        createdAt: '2026-10-26',
      };

      expect(isEligibleSimpleTask(activeTask)).toBe(true);
      expect(isEligibleSimpleTask(projectTask)).toBe(false);
      expect(isEligibleSimpleTask(interviewTask)).toBe(false);

      const candidateActive: CandidateTask = {
        task: activeTask,
        breakdown: {
          urgency: 80,
          weakness: 50,
          importance: 90,
          companyRelevance: 50,
          spacedRepetition: 50,
          recoveryUrgency: 50,
          baseScore: 80,
          finalScore: 80,
          explanation: 'Core learning',
        },
      };

      const candidateProject: CandidateTask = {
        task: projectTask,
        breakdown: {
          urgency: 50,
          weakness: 50,
          importance: 80,
          companyRelevance: 50,
          spacedRepetition: 50,
          recoveryUrgency: 50,
          baseScore: 75,
          finalScore: 75,
          explanation: 'Project',
        },
      };

      expect(isEligibleSimpleCandidate(candidateActive)).toBe(true);
      expect(isEligibleSimpleCandidate(candidateProject)).toBe(false);
    });

    it('filters out retired practice sessions', () => {
      const activeSession: PracticeSessionDefinition = {
        id: 'ps-python-drills',
        title: 'Python Syntax Drills',
        description: 'Drills',
        category: 'coding',
        domainId: 'python',
        topicId: 'topic-python',
        estimatedMinutes: 20,
        questionCount: 5,
        passingScorePct: 80,
        questions: [],
      };

      const interviewSession: PracticeSessionDefinition = {
        id: 'ps-interview-sim',
        title: 'Company Interview Simulation',
        description: 'Interview',
        category: 'technical_interview',
        domainId: 'interviews',
        topicId: 'topic-interview',
        estimatedMinutes: 45,
        questionCount: 5,
        passingScorePct: 80,
        questions: [],
      };

      expect(isEligibleSimplePracticeSession(activeSession)).toBe(true);
      expect(isEligibleSimplePracticeSession(interviewSession)).toBe(false);
    });
  });

  describe('4. Learn & Progress Landing Pages', () => {
    it('renders the LearnHubView with 3 clearly labeled pillars', () => {
      render(
        <PlacementProvider>
          <LearnHubView />
        </PlacementProvider>
      );

      expect(screen.getByTestId('learn-hub-view')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Learn' })).toBeInTheDocument();

      expect(screen.getByTestId('learn-card-roadmap')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Learning Path' })).toBeInTheDocument();

      expect(screen.getByTestId('learn-card-preparation')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Programming & Core Subjects' })).toBeInTheDocument();

      expect(screen.getByTestId('learn-card-dsa')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'DSA Concepts & Lessons' })).toBeInTheDocument();
    });

    it('renders the ProgressHubView with tabs for Skills Matrix, Diagnostic Results, and Review & Stats', () => {
      render(
        <PlacementProvider>
          <ProgressHubView />
        </PlacementProvider>
      );

      expect(screen.getByTestId('progress-hub-view')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Progress' })).toBeInTheDocument();

      expect(screen.getByTestId('progress-tab-skills')).toBeInTheDocument();
      expect(screen.getByTestId('progress-tab-diagnostic')).toBeInTheDocument();
      expect(screen.getByTestId('progress-tab-analytics')).toBeInTheDocument();
    });

    it('shows a helpful notification banner when navigating from a legacy retired route', () => {
      const Wrapper: React.FC = () => {
        const { setRoute } = usePlacement();
        return (
          <>
            <button data-testid="route-to-project" onClick={() => setRoute('project')}>
              To Project
            </button>
            <LearnHubView />
          </>
        );
      };

      render(
        <PlacementProvider>
          <Wrapper />
        </PlacementProvider>
      );

      // Initially on dashboard/learn without banner
      expect(screen.queryByTestId('retired-module-notice')).not.toBeInTheDocument();

      // Trigger legacy route
      fireEvent.click(screen.getByTestId('route-to-project'));

      // Banner is displayed explaining that the module was retired
      expect(screen.getByTestId('retired-module-notice')).toBeInTheDocument();
      expect(screen.getByText(/Project Lab/i)).toBeInTheDocument();
      expect(screen.getByText(/has been retired from the simplified experience/i)).toBeInTheDocument();

      // Click dismiss
      fireEvent.click(screen.getByTestId('dismiss-retired-notice'));
      expect(screen.queryByTestId('retired-module-notice')).not.toBeInTheDocument();
    });
  });

  describe('5. Data Preservation & Legacy State Compatibility', () => {
    it('preserves company overlays, projects, and interview records across sessions and JSON backup', () => {
      const syntheticState: AppExtendedStorageState = {
        ...(getDefaultStorageState() as AppExtendedStorageState),
        companyOverlays: [
          {
            id: 'comp-google',
            companyName: 'Google',
            targetRole: 'Software Engineer',
            applicationStatus: 'target',
            requiredDomains: ['python', 'dsa'],
            requiredTopics: [],
            requiredLanguages: ['Python'],
          },
        ],
        customTaskDefinitions: [
          {
            id: 'proj-custom-portfolio',
            title: 'Custom Portfolio Website',
            description: 'Custom Portfolio Website',
            domainId: 'projects',
            topicId: 'topic-proj',
            phaseId: 'phase-2',
            estimatedMinutes: 90,
            importance: 8,
            taskType: 'project',
            createdAt: '2026-10-26',
          },
        ],
      };

      StorageAdapter.saveState(syntheticState);

      const loaded = StorageAdapter.loadState() as AppExtendedStorageState;
      expect(loaded.companyOverlays).toHaveLength(1);
      expect(loaded.companyOverlays[0].companyName).toBe('Google');
      expect(loaded.customTaskDefinitions).toBeDefined();
      expect(loaded.customTaskDefinitions![0].id).toBe('proj-custom-portfolio');

      let exportedJson = '';
      const ExportProbe: React.FC = () => {
        const { exportBackupJSON } = usePlacement();
        React.useEffect(() => {
          exportedJson = exportBackupJSON();
        }, [exportBackupJSON]);
        return null;
      };

      render(
        <PlacementProvider>
          <ExportProbe />
        </PlacementProvider>
      );

      expect(exportedJson).toContain('Google');
      expect(exportedJson).toContain('proj-custom-portfolio');

      const parsedBackup = JSON.parse(exportedJson);
      expect(parsedBackup.companyOverlays[0].id).toBe('comp-google');
      expect(parsedBackup.customTaskDefinitions[0].id).toBe('proj-custom-portfolio');
    });
  });
});

