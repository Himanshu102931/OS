import React, { useState } from 'react';
import type { ProjectLabSectionId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { PracticeSessionRunner } from '../preparation/PracticeSessionRunner';
import { PROJECT_LAB_CONTENT } from '../../data/projectLabContent';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDefenseHero } from './ProjectDefenseHero';
import { ProjectPillarNavigator } from './ProjectPillarNavigator';
import { ProjectArchitectureBlueprint } from './ProjectArchitectureBlueprint';
import { ProjectDefenseRubric } from './ProjectDefenseRubric';
import { ProjectEvidenceLedger } from './ProjectEvidenceLedger';

export const ProjectLabView: React.FC = () => {
  const {
    practiceSessions,
    practiceAttempts,
    preparationTopics,
    preparationTopicProgress,
    skillStates,
    evidenceLogs,
    topics,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    todayDate,
    routeState,
    setRoute,
  } = usePlacement();

  const validSectionIds: ProjectLabSectionId[] = [
    'overview',
    'architecture',
    'implementation',
    'practices',
    'defense',
    'evidence',
  ];
  const sectionFromRoute =
    routeState.targetId && validSectionIds.includes(routeState.targetId as ProjectLabSectionId)
      ? (routeState.targetId as ProjectLabSectionId)
      : null;

  const [selectedSection, setSelectedSection] = useState<ProjectLabSectionId>('overview');
  const activeSection = sectionFromRoute ?? selectedSection;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const defenseSession = practiceSessions.find(
    (s) => s.id === 'practice-project-defense-01' || s.category === 'project_defense'
  );
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const sectionContent = PROJECT_LAB_CONTENT.find((c) => c.id === activeSection);

  // Completion is claimed ONLY from recorded data: a passed defense, or a
  // recorded defense attempt for the evidence trail.
  const sectionCompleted: Record<ProjectLabSectionId, boolean> = {
    overview: false,
    architecture: false,
    implementation: false,
    practices: false,
    defense: projectAttempts.some((a) => a.passed === true),
    evidence: projectAttempts.length > 0,
  };

  const startDefense = () => {
    if (defenseSession) setActiveSessionId(defenseSession.id);
  };

  const handleNavigateToRemediation = (route: string, targetId?: string) => {
    if (route === 'preparation') {
      setRoute('preparation', targetId);
    } else {
      setRoute('preparation', 'prep-interview-career');
    }
  };

  return (
    <div className="space-y-6" data-testid="project-lab-view">
      {/* Zone 1: Project Engineering Header & Defense Readiness Strip */}
      <ProjectHeader
        practiceAttempts={practiceAttempts}
        evidenceLogs={evidenceLogs}
        skillStates={skillStates}
      />

      {/* Zone 2: Viva Defense Simulator Spotlight (Hero Action Zone) */}
      <ProjectDefenseHero
        defenseSession={defenseSession}
        practiceAttempts={practiceAttempts}
        practiceSessions={practiceSessions}
        preparationTopics={preparationTopics}
        preparationTopicProgress={preparationTopicProgress}
        skillStates={skillStates}
        onLaunchDefense={startDefense}
        onNavigateToRemediation={handleNavigateToRemediation}
      />

      {/* Zone 3: Architectural Pillar Navigator (Technical Navigation Rail) */}
      <ProjectPillarNavigator
        activePillar={activeSection}
        onSelectPillar={(pillar) => {
          setSelectedSection(pillar);
          setRoute('project', pillar);
        }}
        sectionCompleted={sectionCompleted}
      />

      {/* Zone 3: Interactive Architecture Blueprint & Module Workspace */}
      <ProjectArchitectureBlueprint
        activePillar={activeSection}
        sectionContent={sectionContent}
      />

      {/* Zone 4: Senior Interviewer Pushback Cheat-Sheet & Rubric */}
      <ProjectDefenseRubric />

      {/* Zone 5: Proof-of-Work Verification Ledger & Historical Attempt Audit */}
      <ProjectEvidenceLedger
        practiceAttempts={practiceAttempts}
        practiceSessions={practiceSessions}
        evidenceLogs={evidenceLogs}
        skillStates={skillStates}
        topics={topics}
        taskDefinitions={taskDefinitions}
        taskProgress={taskProgress}
        dsaProblems={dsaProblems}
        dsaProgress={dsaProgress}
        dsaAttempts={dsaAttempts}
        todayISO={todayDate}
        onLaunchDefense={startDefense}
        onNavigateToRemediation={handleNavigateToRemediation}
      />

      {/* Session Runner Modal */}
      {defenseSession && activeSessionId && (
        <PracticeSessionRunner
          session={defenseSession}
          onClose={() => setActiveSessionId(null)}
        />
      )}
    </div>
  );
};
