import React from 'react';
import { PlacementProvider, usePlacement } from './context/PlacementContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { DSAView } from './components/dsa/DSAView';
import { SkillsView } from './components/skills/SkillsView';
import { PreparationHubView } from './components/preparation/PreparationHubView';
import { ProjectLabView } from './components/project/ProjectLabView';
import { CompaniesView } from './components/companies/CompaniesView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { PracticeView } from './components/practice/PracticeView';
import { AssessmentRunnerView } from './components/assessment/AssessmentRunnerView';
import { InterviewReadinessView } from './components/interview/InterviewReadinessView';
import { GuideOverlay } from './components/guide/GuideOverlay';
import { GuideProvider } from './components/guide/GuideContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

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
          <AppShell>
            <MainContent />
            <GuideOverlay />
          </AppShell>
        </ErrorBoundary>
      </GuideProvider>
    </PlacementProvider>
  );
}

export default App;