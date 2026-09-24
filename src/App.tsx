import React from 'react';
import { PlacementProvider, usePlacement } from './context/PlacementContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { DSAView } from './components/dsa/DSAView';
import { SkillsView } from './components/skills/SkillsView';
import { CompaniesView } from './components/companies/CompaniesView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

const MainContent: React.FC = () => {
  const { currentRoute } = usePlacement();

  switch (currentRoute) {
    case 'dashboard':
      return <DashboardView />;
    case 'roadmap':
      return <RoadmapView />;
    case 'dsa':
      return <DSAView />;
    case 'skills':
      return <SkillsView />;
    case 'companies':
      return <CompaniesView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
};

function App() {
  return (
    <PlacementProvider>
      <AppShell>
        <MainContent />
      </AppShell>
    </PlacementProvider>
  );
}

export default App;