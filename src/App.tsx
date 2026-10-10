import React, { lazy, Suspense } from 'react';
import { PlacementProvider, usePlacement } from './context/PlacementContext';
import { AppShell } from './components/layout/AppShell';
import { GuideOverlay } from './components/guide/GuideOverlay';
import { GuideProvider } from './components/guide/GuideContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SessionProvider } from './components/dashboard/SessionProvider';

const DashboardView = lazy(() =>
  import('./components/dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const RoadmapView = lazy(() =>
  import('./components/roadmap/RoadmapView').then((m) => ({ default: m.RoadmapView }))
);
const DSAView = lazy(() =>
  import('./components/dsa/DSAView').then((m) => ({ default: m.DSAView }))
);
const SkillsView = lazy(() =>
  import('./components/skills/SkillsView').then((m) => ({ default: m.SkillsView }))
);
const PreparationHubView = lazy(() =>
  import('./components/preparation/PreparationHubView').then((m) => ({ default: m.PreparationHubView }))
);
const ProjectLabView = lazy(() =>
  import('./components/project/ProjectLabView').then((m) => ({ default: m.ProjectLabView }))
);
const CompaniesView = lazy(() =>
  import('./components/companies/CompaniesView').then((m) => ({ default: m.CompaniesView }))
);
const AnalyticsView = lazy(() =>
  import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const PracticeView = lazy(() =>
  import('./components/practice/PracticeView').then((m) => ({ default: m.PracticeView }))
);
const AssessmentRunnerView = lazy(() =>
  import('./components/assessment/AssessmentRunnerView').then((m) => ({ default: m.AssessmentRunnerView }))
);
const InterviewReadinessView = lazy(() =>
  import('./components/interview/InterviewReadinessView').then((m) => ({ default: m.InterviewReadinessView }))
);

const RouteLoadingFallback: React.FC = () => (
  <div
    className="flex-1 flex items-center justify-center min-h-[400px] text-secondary"
    role="status"
    aria-label="Loading view"
  >
    <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-foreground-muted">
      <div className="size-2 rounded-full bg-accent animate-pulse" />
      <span>Loading...</span>
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const { currentRoute } = usePlacement();

  switch (currentRoute) {
    case 'dashboard':
      return <DashboardView />;
    case 'assessment':
      return <AssessmentRunnerView />;
    case 'roadmap':
      return <RoadmapView />;
    case 'dsa':
      return <DSAView />;
    case 'skills':
      return <SkillsView />;
    case 'preparation':
      return <PreparationHubView />;
    case 'practice':
      return <PracticeView />;
    case 'project':
      return <ProjectLabView />;
    case 'companies':
      return <CompaniesView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'settings':
      return <SettingsView />;
    case 'interview':
      return <InterviewReadinessView />;
    default:
      return <DashboardView />;
  }
};

function App() {
  return (
    <PlacementProvider>
      <GuideProvider>
        <ErrorBoundary>
          <SessionProvider>
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <MainContent />
              </Suspense>
              <GuideOverlay />
            </AppShell>
          </SessionProvider>
        </ErrorBoundary>
      </GuideProvider>
    </PlacementProvider>
  );
}

export default App;