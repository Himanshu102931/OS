import React from 'react';
import type { CompanyRequirementMapping } from '../../engine/companyEngine';
import { usePlacement } from '../../context/PlacementContext';
import { CompanyRequirementDrawer } from './CompanyRequirementDrawer';

interface CompanyRequirementDetailModalProps {
  requirement: CompanyRequirementMapping | null;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Backward compatibility wrapper forwarding to CompanyRequirementDrawer.
 */
export const CompanyRequirementDetailModal: React.FC<CompanyRequirementDetailModalProps> = ({
  requirement,
  companyName,
  isOpen,
  onClose,
}) => {
  const { setRoute, dsaProblems, taskDefinitions, topics, preparationTopics, practiceSessions } = usePlacement();

  const datasets = React.useMemo(() => ({
    dsaProblems,
    tasks: taskDefinitions,
    topics,
    preparationTopics: preparationTopics ?? [],
    practiceSessions: practiceSessions ?? [],
  }), [dsaProblems, taskDefinitions, topics, preparationTopics, practiceSessions]);

  return (
    <CompanyRequirementDrawer
      requirement={requirement}
      companyName={companyName}
      isOpen={isOpen}
      onClose={onClose}
      datasets={datasets}
      onExecuteAction={(route, targetId) => {
        setRoute(route as Parameters<typeof setRoute>[0], targetId);
      }}
    />
  );
};
