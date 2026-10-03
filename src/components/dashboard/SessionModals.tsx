import React from 'react';
import { PracticeRunnerModal } from '../practice/PracticeRunnerModal';
import { FocusModeModal } from '../daily/FocusModeModal';
import { MorningPlanningModal } from '../daily/MorningPlanningModal';
import { EveningReflectionModal } from '../daily/EveningReflectionModal';
import { useSession } from './SessionContext';
import type { PracticeSessionDefinition, TaskDefinition, DailyCheckIn, DailyTaskAssignment, TaskProgress, EvidenceLog, DSAProgress, TopicSkillState, DomainDefinition } from '../../types';
import type { PracticeAttempt } from '../../types';

interface SessionModalsProps {
  activePracticeSession: PracticeSessionDefinition | null;
  setActivePracticeSession: React.Dispatch<React.SetStateAction<PracticeSessionDefinition | null>>;
  nextBestActionTask: TaskDefinition | null;
  isFocusModalOpen: boolean;
  setIsFocusModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMorningModalOpen: boolean;
  setIsMorningModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEveningModalOpen: boolean;
  setIsEveningModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCompanyId: string | null;
  todayDate: string;
  domains: DomainDefinition[];
  // Placement context functions
  recordPracticeAttempt: (attempt: PracticeAttempt, evidenceLog: EvidenceLog) => void;
  handleUpdateTaskStateWithToast: (taskId: string, newState: TaskProgress['state']) => void;
  commitDailyPlan: (checkIn: DailyCheckIn, assignments: DailyTaskAssignment[]) => void;
  sealDayExecution: (updatedCheckIn: DailyCheckIn, updatedAssignments: DailyTaskAssignment[], newEvidenceLogs: EvidenceLog[], updatedTaskProgressMap: Record<string, TaskProgress>, updatedDsaProgressMap: Record<string, DSAProgress>, updatedSkillStatesMap: Record<string, TopicSkillState>) => void;
}

const getDomain = (domains: DomainDefinition[], domainId: string) => domains.find((d) => d.id === domainId);

export const SessionModals: React.FC<SessionModalsProps> = ({
  activePracticeSession,
  setActivePracticeSession,
  nextBestActionTask,
  isFocusModalOpen,
  setIsFocusModalOpen,
  isMorningModalOpen,
  setIsMorningModalOpen,
  isEveningModalOpen,
  setIsEveningModalOpen,
  selectedCompanyId,
  todayDate,
  domains,
  recordPracticeAttempt,
  handleUpdateTaskStateWithToast,
  commitDailyPlan,
  sealDayExecution,
}) => {
  const { advanceActivity } = useSession();

  return (
    <>
      <PracticeRunnerModal
        session={activePracticeSession}
        isOpen={!!activePracticeSession}
        todayISO={todayDate}
        onClose={() => {
          setActivePracticeSession(null);
          advanceActivity('completed');
        }}
        onCompleteSession={(attempt, evidenceLog) => {
          recordPracticeAttempt(attempt, evidenceLog);
          advanceActivity('completed');
        }}
      />
      <FocusModeModal
        task={nextBestActionTask}
        domain={nextBestActionTask ? getDomain(domains, nextBestActionTask.domainId) : undefined}
        isOpen={isFocusModalOpen}
        onClose={() => {
          setIsFocusModalOpen(false);
          advanceActivity('completed');
        }}
        onComplete={() => {
          if (nextBestActionTask) handleUpdateTaskStateWithToast(nextBestActionTask.id, 'completed');
          advanceActivity('completed');
        }}
      />
      <MorningPlanningModal
        isOpen={isMorningModalOpen}
        onClose={() => setIsMorningModalOpen(false)}
        onCommitPlan={(checkIn, assignments) => commitDailyPlan(checkIn, assignments)}
        targetCompanyId={selectedCompanyId || undefined}
      />
      <EveningReflectionModal
        isOpen={isEveningModalOpen}
        onClose={() => setIsEveningModalOpen(false)}
        onSealDay={(updatedCheckIn, updatedAssignments, newEvidenceLogs, updatedTaskProgressMap, updatedDsaProgressMap, updatedSkillStatesMap) => sealDayExecution(updatedCheckIn, updatedAssignments, newEvidenceLogs, updatedTaskProgressMap, updatedDsaProgressMap, updatedSkillStatesMap)}
      />
    </>
  );
};