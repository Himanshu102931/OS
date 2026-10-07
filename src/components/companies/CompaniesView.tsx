import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { calculateCompanySnapshot, type CompanyRequirementMapping } from '../../engine/companyEngine';
import { calculateCompanyDeadlineUrgency } from '../../engine/companyPlanEngine';
import type { CompanyOverlay } from '../../types';
import { CompaniesHeader } from './CompaniesHeader';
import { CompanyDriveStrip } from './CompanyDriveStrip';
import { PrimaryCompanyHero } from './PrimaryCompanyHero';
import { CompanyGrid } from './CompanyGrid';
import { CompanyRequirementMatrix } from './CompanyRequirementMatrix';
import { CompanyRequirementDrawer } from './CompanyRequirementDrawer';
import { CompanyModal } from './CompanyModal';

export const CompaniesView: React.FC = () => {
  const {
    companyOverlays,
    domains,
    topics,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    preparationTopics,
    practiceSessions,
    todayDate,
    routeState,
    setRoute,
    saveCompanyOverlay,
    deleteCompanyOverlay,
  } = usePlacement();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyOverlay | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedReqDetail, setSelectedReqDetail] = useState<CompanyRequirementMapping | null>(null);
  const [drawerCompanyName, setDrawerCompanyName] = useState<string>('');

  const openAddCompany = () => {
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  };

  const openEditCompany = (company: CompanyOverlay) => {
    setEditingCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleDeleteCompany = (companyId: string) => {
    deleteCompanyOverlay(companyId);
    if (editingCompany?.id === companyId) {
      setEditingCompany(null);
    }
    if (selectedCompanyId === companyId) {
      setSelectedCompanyId(null);
    }
    setSelectedReqDetail(null);
  };

  // Datasets object for recommended action validation
  const datasets = useMemo(() => ({
    dsaProblems,
    tasks: taskDefinitions,
    topics,
    preparationTopics: preparationTopics ?? [],
    practiceSessions: practiceSessions ?? [],
  }), [dsaProblems, taskDefinitions, topics, preparationTopics, practiceSessions]);

  // Compute live preparation snapshot for all companies via canonical companyEngine
  const companySnapshotMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateCompanySnapshot>> = {};
    companyOverlays.forEach((comp) => {
      map[comp.id] = calculateCompanySnapshot(
        comp,
        domains,
        topics,
        taskDefinitions,
        taskProgress,
        dsaProblems,
        dsaProgress,
        dsaAttempts,
        evidenceLogs,
        skillStates,
        todayDate
      );
    });
    return map;
  }, [
    companyOverlays,
    domains,
    topics,
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    dsaAttempts,
    evidenceLogs,
    skillStates,
    todayDate,
  ]);

  // Deterministically rank and select Primary Target Focus
  const primaryCompany = useMemo(() => {
    if (companyOverlays.length === 0) return null;
    const sorted = [...companyOverlays].sort((a, b) => {
      const urgA = calculateCompanyDeadlineUrgency(a.eventDate, todayDate);
      const urgB = calculateCompanyDeadlineUrgency(b.eventDate, todayDate);
      if (urgB.scoreBoost !== urgA.scoreBoost) {
        return urgB.scoreBoost - urgA.scoreBoost;
      }
      if (urgA.daysUntil !== null && urgB.daysUntil !== null) {
        return urgA.daysUntil - urgB.daysUntil;
      }
      if (urgA.daysUntil !== null) return -1;
      if (urgB.daysUntil !== null) return 1;
      return a.companyName.localeCompare(b.companyName);
    });
    return sorted[0];
  }, [companyOverlays, todayDate]);

  // Determine which company is focused for the Zone 4 matrix
  const effectiveFocusedCompany = useMemo(() => {
    if (companyOverlays.length === 0) return null;
    if (routeState.targetId) {
      const deepLinked = companyOverlays.find((c) => c.id === routeState.targetId);
      if (deepLinked) return deepLinked;
    }
    if (selectedCompanyId) {
      const selected = companyOverlays.find((c) => c.id === selectedCompanyId);
      if (selected) return selected;
    }
    return primaryCompany;
  }, [companyOverlays, routeState.targetId, selectedCompanyId, primaryCompany]);

  const handleSelectCompany = (company: CompanyOverlay) => {
    setSelectedCompanyId(company.id);
  };

  const handleSelectRequirement = (requirement: CompanyRequirementMapping) => {
    setSelectedReqDetail(requirement);
    setDrawerCompanyName(effectiveFocusedCompany?.companyName || 'Target Company');
  };

  const handleExecuteAction = (route: string, targetId?: string) => {
    setRoute(route as Parameters<typeof setRoute>[0], targetId);
  };

  return (
    <div
      data-testid="companies-view"
      className="companies-view-container space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans pb-12"
    >
      {/* ZONE 1: Companies Header & Drive Timeline Strip */}
      <CompaniesHeader onAddCompany={openAddCompany} />

      <CompanyDriveStrip
        companyOverlays={companyOverlays}
        companySnapshotMap={companySnapshotMap}
        todayDate={todayDate}
      />

      {/* ZONE 2: Primary Target Focus & Drive Urgency Hero */}
      {primaryCompany && (
        <PrimaryCompanyHero
          primaryCompany={primaryCompany}
          snapshot={companySnapshotMap[primaryCompany.id]}
          todayDate={todayDate}
          datasets={datasets}
          onPrepareForCompany={handleExecuteAction}
          onInspectRequirements={(comp) => {
            handleSelectCompany(comp);
          }}
        />
      )}

      {/* ZONE 3: Target Companies Portfolio & Radar Grid */}
      <CompanyGrid
        companyOverlays={companyOverlays}
        companySnapshotMap={companySnapshotMap}
        domains={domains}
        todayDate={todayDate}
        selectedCompanyId={effectiveFocusedCompany?.id}
        onSelectCompany={handleSelectCompany}
        onEditCompany={openEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onAddCompany={openAddCompany}
      />

      {/* ZONE 4: Requirement Coverage Matrix & Gap Breakdown */}
      {effectiveFocusedCompany && (
        <CompanyRequirementMatrix
          company={effectiveFocusedCompany}
          snapshot={companySnapshotMap[effectiveFocusedCompany.id]}
          onSelectRequirement={handleSelectRequirement}
        />
      )}

      {/* ZONE 5: Requirement Traceability Drawer */}
      <CompanyRequirementDrawer
        requirement={selectedReqDetail}
        companyName={drawerCompanyName}
        isOpen={Boolean(selectedReqDetail)}
        onClose={() => setSelectedReqDetail(null)}
        datasets={datasets}
        onExecuteAction={handleExecuteAction}
      />

      {/* ZONE 5: Add / Edit Company Profile Modal */}
      <CompanyModal
        key={`${isCompanyModalOpen ? 'open' : 'closed'}:${editingCompany?.id ?? 'new'}`}
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={editingCompany}
        onSaveCompany={(updated) => {
          saveCompanyOverlay(updated);
          setIsCompanyModalOpen(false);
        }}
      />
    </div>
  );
};
