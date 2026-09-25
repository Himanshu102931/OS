import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CompanyModal } from './CompanyModal';
import { CompanyRequirementDetailModal } from './CompanyRequirementDetailModal';
import {
  calculateCompanySnapshot,
  getDaysUntilEvent,
  type CompanyRequirementMapping,
} from '../../engine/companyEngine';
import type { CompanyOverlay } from '../../types';
import {
  Building2,
  PlusCircle,
  Edit,
  Calendar,
  Target,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';

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
    todayDate,
    saveCompanyOverlay,
    setRoute,
  } = usePlacement();

  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    companyOverlays[0]?.id || ''
  );
  const [editingCompany, setEditingCompany] = useState<CompanyOverlay | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<CompanyRequirementMapping | null>(null);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Active Selected Company
  const activeCompany = useMemo(() => {
    return companyOverlays.find((c) => c.id === activeCompanyId) || companyOverlays[0] || null;
  }, [companyOverlays, activeCompanyId]);

  // Compute live preparation snapshot for active company
  const activeSnapshot = useMemo(() => {
    if (!activeCompany) return null;
    return calculateCompanySnapshot(
      activeCompany,
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
  }, [
    activeCompany,
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

  const handleOpenNew = () => {
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleOpenEdit = (comp: CompanyOverlay) => {
    setEditingCompany(comp);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (comp: CompanyOverlay) => {
    saveCompanyOverlay(comp);
    setActiveCompanyId(comp.id);
  };

  const handleInspectRequirement = (req: CompanyRequirementMapping) => {
    setSelectedRequirement(req);
    setIsDetailModalOpen(true);
  };

  const handleExecuteAction = (req: CompanyRequirementMapping) => {
    if (req.recommendedAction.route === 'dsa') setRoute('dsa');
    else if (req.recommendedAction.route === 'roadmap') setRoute('roadmap');
    else if (req.recommendedAction.route === 'skills') setRoute('skills');
  };

  const daysRemaining = activeCompany ? getDaysUntilEvent(activeCompany.eventDate, todayDate) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Building2 className="size-5 text-[#FFC665]" />
            TARGET COMPANIES & PREPARATION OVERLAYS
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Factual evidence-backed requirement mapping, gap analysis, and executable next actions
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenNew}
          className="text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold h-8 px-3 rounded-[4px]"
        >
          <PlusCircle className="size-3.5 mr-1.5" /> Add Target Company
        </Button>
      </div>

      {/* Multi-Company Selector Bar */}
      {companyOverlays.length === 0 ? (
        <div className="p-8 app-surface text-center text-xs text-[#8E98A8] space-y-3">
          <Building2 className="size-8 mx-auto text-[#FFC665]" />
          <p>No target companies configured yet. Click "Add Target Company" to create your first overlay.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#262D38]">
            {companyOverlays.map((comp) => {
              const isActive = (activeCompany?.id || '') === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => setActiveCompanyId(comp.id)}
                  className={`px-3.5 py-2 rounded-[4px] border text-xs font-mono transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#1B2028] border-[#FFC665] text-[#F1F5F9] font-bold shadow-md'
                      : 'bg-[#14171D] border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/60'
                  }`}
                >
                  <Building2 className={`size-3.5 ${isActive ? 'text-[#FFC665]' : 'text-[#8E98A8]'}`} />
                  <span>{comp.companyName}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#262D38] text-[#8E98A8]">
                    {comp.applicationStatus.replace('_', ' ')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Company Detail Snapshot */}
          {activeCompany && activeSnapshot && (
            <div className="space-y-6">
              {/* Active Profile Banner */}
              <div className="p-5 bg-[#14171D] border border-[#262D38] rounded-[4px] space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262D38] pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#FFC665]">
                      <span className="uppercase font-bold tracking-wider">{activeCompany.targetRole}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#F1F5F9] mt-0.5">{activeCompany.companyName}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-xs text-[#FFC665] font-semibold uppercase">
                      {activeCompany.applicationStatus.replace('_', ' ')}
                    </span>

                    {daysRemaining !== null && (
                      <span className="px-2.5 py-1 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-xs text-[#F1F5F9] flex items-center gap-1.5 font-bold">
                        <Calendar className="size-3.5 text-[#FFC665]" />
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Drive Event Today/Passed'}
                      </span>
                    )}

                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleOpenEdit(activeCompany)}
                      className="h-8 px-2.5 text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] border border-[#262D38]"
                    >
                      <Edit className="size-3.5 mr-1" /> Edit Profile
                    </Button>
                  </div>
                </div>

                {/* Readiness Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
                    <span className="text-[#8E98A8] text-[10px] block uppercase">Preparation Strength</span>
                    <span className="text-xl font-bold text-[#FFC665]">
                      {activeSnapshot.overallPreparationStrength}%
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
                    <span className="text-[#8E98A8] text-[10px] block uppercase">Covered Requirements</span>
                    <span className="text-xl font-bold text-[#4EAE79]">
                      {activeSnapshot.coveredRequirementsCount} / {activeSnapshot.totalRequirementsCount}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
                    <span className="text-[#8E98A8] text-[10px] block uppercase">Identified Gaps</span>
                    <span className="text-xl font-bold text-rose-400">
                      {activeSnapshot.gapRequirementsCount}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] space-y-1">
                    <span className="text-[#8E98A8] text-[10px] block uppercase">Required Domains</span>
                    <span className="text-xl font-bold text-[#F1F5F9]">
                      {activeCompany.requiredDomains.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Next Steps */}
              {activeSnapshot.topActionableGaps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="size-4 text-[#FFC665]" /> Actionable Preparation Next Steps
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeSnapshot.topActionableGaps.slice(0, 4).map((req) => (
                      <div
                        key={req.requirementId}
                        className="p-3.5 bg-[#14171D] border border-[#262D38] rounded-[4px] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#F1F5F9] block">{req.requirementName}</span>
                          <span className="text-[10px] text-rose-400 font-semibold">{req.statusLabel} ({req.evidenceStrength}%)</span>
                        </div>

                        <Button
                          size="xs"
                          onClick={() => handleExecuteAction(req)}
                          className="h-7 text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#0D0F12] font-bold rounded-[4px] shrink-0"
                        >
                          Action <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements & Evidence Mapping Table */}
              <div className="app-surface overflow-hidden space-y-0">
                <div className="px-4 py-3 bg-[#1B2028] border-b border-[#262D38] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
                    Company Requirements & Evidence Mapping ({activeSnapshot.requirements.length})
                  </h3>
                  <span className="text-[10px] text-[#8E98A8]">Mapped from PlacementOS Evidence</span>
                </div>

                {/* Table Header */}
                <div className="hidden lg:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028]/80 border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
                  <div className="col-span-3">Requirement</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Evidence & Level</div>
                  <div className="col-span-2">Classification</div>
                  <div className="col-span-2">Preparation Status</div>
                  <div className="col-span-1 text-right">Inspect</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#262D38]">
                  {activeSnapshot.requirements.map((req) => (
                    <div
                      key={req.requirementId}
                      className="app-table-row p-4 space-y-3 lg:space-y-0 text-xs font-mono hover:bg-[#1B2028]/70 transition-colors"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
                        <div className="lg:col-span-3 font-bold text-[#F1F5F9]">
                          {req.requirementName}
                        </div>

                        <div className="lg:col-span-2">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#FFC665]">
                            {req.category}
                          </span>
                        </div>

                        <div className="lg:col-span-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#F1F5F9]">{req.evidenceStrength}%</span>
                            <span className="text-[11px] text-[#FFC665]">L{req.currentLevel}/L{req.targetLevel}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#14171D] rounded-full overflow-hidden border border-[#262D38]">
                            <div
                              className={`h-full transition-all duration-300 ${
                                req.evidenceStrength >= 70
                                  ? 'bg-[#4EAE79]'
                                  : req.evidenceStrength >= 45
                                  ? 'bg-[#FFC665]'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(4, req.evidenceStrength)}%` }}
                            />
                          </div>
                        </div>

                        <div className="lg:col-span-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-[4px] font-semibold capitalize ${
                              req.evidenceClassification === 'demonstrated'
                                ? 'bg-[#4EAE79]/15 text-[#4EAE79] border border-[#4EAE79]/30'
                                : req.evidenceClassification === 'inferred'
                                ? 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30'
                                : 'bg-[#1B2028] text-[#8E98A8] border border-[#262D38]'
                            }`}
                          >
                            {req.evidenceClassification}
                          </span>
                        </div>

                        <div className="lg:col-span-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-[4px] font-semibold uppercase flex items-center gap-1 ${
                              req.status === 'covered'
                                ? 'bg-[#4EAE79]/15 text-[#4EAE79] border border-[#4EAE79]/30'
                                : req.status === 'evidence_present' || req.status === 'developing'
                                ? 'bg-[#FFC665]/15 text-[#FFC665] border border-[#FFC665]/30'
                                : req.status === 'gap_identified'
                                ? 'bg-rose-950/30 text-rose-400 border border-rose-800/40'
                                : 'bg-[#1B2028] text-[#8E98A8] border border-[#262D38]'
                            }`}
                          >
                            {req.status === 'covered' && <CheckCircle2 className="size-3" />}
                            {req.statusLabel}
                          </span>
                        </div>

                        <div className="lg:col-span-1 flex items-center justify-end">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleInspectRequirement(req)}
                            className="h-7 px-2 text-[#FFC665] hover:bg-[#1B2028]"
                            title="Inspect Requirement Evidence"
                          >
                            <Info className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CompanyModal
        company={editingCompany}
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSaveCompany={handleSaveCompany}
      />

      <CompanyRequirementDetailModal
        requirement={selectedRequirement}
        companyName={activeCompany?.companyName || 'Target Company'}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};
