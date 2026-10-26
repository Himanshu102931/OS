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
const LearnHubView = lazy(() =>
  import('./components/learn/LearnHubView').then((m) => ({ default: m.LearnHubView }))
);
const ProgressHubView = lazy(() =>
  import('./components/progress/ProgressHubView').then((m) => ({ default: m.ProgressHubView }))
);

import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { DiagnosticInvitation } from './components/dashboard/DiagnosticInvitation';
import { isBaselineCompleted } from './engine/assessmentEngine';

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

const OnboardingContainer: React.FC = () => {
  const { userSettings, updateUserSettings, assessmentState, setRoute } = usePlacement();

  const baselineDone = isBaselineCompleted(assessmentState);
  const hasInProgressAttempt =
    assessmentState?.attempts?.some(
      (a) => a.status === 'in_progress' && a.kind === 'diagnostic_assessment'
    ) ?? false;

  const showOnboarding = !userSettings?.onboardingCompleted;
  const showDiagnosticModal =
    Boolean(userSettings?.onboardingCompleted) &&
    !userSettings?.diagnosticDismissed &&
    !baselineDone;

  return (
    <>
      <OnboardingModal
        isOpen={Boolean(showOnboarding)}
        onComplete={(payload) => {
          updateUserSettings({
            targetPlacementGoal: payload.targetPlacementGoal,
            dailyStudyMinutes: payload.dailyStudyMinutes,
            placementHorizonDate: payload.placementHorizonDate,
            onboardingCompleted: true,
          });
        }}
        onExploreFirst={() => {
          updateUserSettings({
            onboardingCompleted: true,
          });
        }}
      />

      <DiagnosticInvitation
        isOpen={Boolean(showDiagnosticModal)}
        hasInProgressAttempt={hasInProgressAttempt}
        onStartDiagnostic={() => {
          updateUserSettings({ diagnosticDismissed: true });
          setRoute('assessment');
        }}
        onDismiss={() => {
          updateUserSettings({
            diagnosticDismissed: true,
          });
        }}
      />
    </>
  );
};

const MainContent: React.FC = () => {
  const { currentRoute } = usePlacement();

  switch (currentRoute) {
    case 'dashboard':
      return <DashboardView />;
    case 'learn':
      return <LearnHubView />;
    case 'practice':
      return <PracticeView />;
    case 'progress':
      return <ProgressHubView />;
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
    case 'analytics':
      return <AnalyticsView />;
    case 'settings':
      return <SettingsView />;
    case 'project':
    case 'companies':
    case 'interview':
      return <LearnHubView />;
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
              <OnboardingContainer />
            </AppShell>
          </SessionProvider>
        </ErrorBoundary>
      </GuideProvider>
    </PlacementProvider>
  );
}

export default App;