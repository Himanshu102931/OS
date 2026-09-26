import React, { useState, useMemo } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { calculateCompanySnapshot, type CompanyRequirementMapping } from '../../engine/companyEngine';
import { CompanyModal } from './CompanyModal';
import { CompanyRequirementDetailModal } from './CompanyRequirementDetailModal';
import type { CompanyOverlay } from '../../types';
import {
  Building2,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
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
  } = usePlacement();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyOverlay | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyOverlay | null>(null);
  const [selectedReqDetail, setSelectedReqDetail] = useState<CompanyRequirementMapping | null>(null);

  // Compute live preparation snapshot for all companies via companyEngine
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

  return (
    <div className="space-y-6 max-w-7xl xl:max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
            Target Companies & Requirement Mapping
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1">
            Track upcoming placement assessment timelines, target role requirements, and preparation gap highlights.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingCompany(null);
            setIsCompanyModalOpen(true);
          }}
          className="text-xs font-semibold bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md h-9 px-3.5"
        >
          <Plus className="size-4 mr-1.5" /> Add Target Company
        </Button>
      </div>

      {/* Target Companies Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {companyOverlays.map((company) => {
          const snapshot = companySnapshotMap[company.id];
          const overallPct = snapshot?.overallPreparationStrength || 0;
          const keyGaps = snapshot?.topActionableGaps || [];

          return (
            <div
              key={company.id}
              className="bg-[#14171D] border border-[#262D38] rounded-xl p-5 space-y-4 hover:border-[#3B4556] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-[#E5A93C]" />
                    <h2 className="text-lg font-bold text-[#F1F5F9]">{company.companyName}</h2>
                  </div>
                  <p className="text-xs text-[#8E98A8]">
                    Target Role: <strong className="text-[#F1F5F9]">{company.targetRole}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold text-[#FFC665]">{overallPct}%</span>
                  <p className="text-[10px] text-[#8E98A8]">Readiness</p>
                </div>
              </div>

              {/* Event Date Badge */}
              <div className="flex items-center gap-2 text-xs text-[#8E98A8] bg-[#0D0F12] p-2.5 rounded-lg border border-[#262D38]">
                <Calendar className="size-3.5 text-[#E5A93C]" />
                <span>Assessment Date: <strong className="text-[#F1F5F9]">{company.eventDate || 'Not scheduled'}</strong></span>
              </div>

              {/* Top 3 Preparation Gaps */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="size-3 text-[#F59E0B]" /> Top Preparation Gaps:
                </span>
                {keyGaps.length === 0 ? (
                  <p className="text-xs text-[#10B981] font-medium">All key requirements on track!</p>
                ) : (
                  <div className="space-y-1">
                    {keyGaps.slice(0, 3).map((gap) => (
                      <div key={gap.requirementId} className="text-xs text-[#FFC665] bg-[#1B2028] px-2.5 py-1 rounded border border-[#262D38] flex items-center justify-between">
                        <span>{gap.requirementName}</span>
                        <span className="text-[10px] text-[#8E98A8] capitalize">{gap.statusLabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#262D38] flex items-center justify-between">
                <button
                  onClick={() => setSelectedCompanyDetail(company)}
                  className="text-xs text-[#E5A93C] hover:underline font-semibold flex items-center gap-1"
                >
                  Inspect Requirements <ArrowRight className="size-3.5" />
                </button>

                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setEditingCompany(company);
                    setIsCompanyModalOpen(true);
                  }}
                  className="h-7 text-xs border-[#262D38] bg-[#1B2028] text-[#8E98A8] hover:text-[#F1F5F9] rounded-md"
                >
                  Edit Company
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Company Modal */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={editingCompany}
        onSaveCompany={(updated) => {
          saveCompanyOverlay(updated);
          setIsCompanyModalOpen(false);
        }}
      />

      {/* Requirement Detail Inspection Modal */}
      {selectedCompanyDetail && (
        <div className="fixed inset-0 z-50 bg-[#09090B]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#14171D] border border-[#262D38] rounded-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#F1F5F9]">{selectedCompanyDetail.companyName} Requirements</h3>
                <p className="text-xs text-[#8E98A8] mt-0.5">{selectedCompanyDetail.targetRole} · Event: {selectedCompanyDetail.eventDate || 'TBD'}</p>
              </div>
              <button
                onClick={() => setSelectedCompanyDetail(null)}
                className="text-[#8E98A8] hover:text-[#F1F5F9] text-sm px-2 py-1 bg-[#1B2028] rounded-md"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#F1F5F9] uppercase tracking-wider">
                Requirements ({companySnapshotMap[selectedCompanyDetail.id]?.requirements.length || 0})
              </h4>
              <div className="space-y-2">
                {(companySnapshotMap[selectedCompanyDetail.id]?.requirements || []).map((req) => (
                  <div key={req.requirementId} className="p-3 bg-[#0D0F12] border border-[#262D38] rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#F1F5F9]">{req.requirementName}</span>
                      <p className="text-[11px] text-[#8E98A8] mt-0.5">Evidence Confidence: {req.evidenceStrength}% · Status: {req.statusLabel}</p>
                    </div>
                    <Button
                      size="xs"
                      onClick={() => setSelectedReqDetail(req)}
                      className="h-7 text-xs bg-[#1B2028] text-[#FFC665] border border-[#E5A93C]/30 rounded-md"
                    >
                      Detail
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReqDetail && selectedCompanyDetail && (
        <CompanyRequirementDetailModal
          isOpen={!!selectedReqDetail}
          onClose={() => setSelectedReqDetail(null)}
          requirement={selectedReqDetail}
          companyName={selectedCompanyDetail.companyName}
        />
      )}
    </div>
  );
};
