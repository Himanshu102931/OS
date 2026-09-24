import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CompanyModal } from './CompanyModal';
import type { CompanyOverlay } from '../../types';
import { Building2, Code, Layers, PlusCircle, Edit } from 'lucide-react';
import { Button } from '../ui/button';

export const CompaniesView: React.FC = () => {
  const { companyOverlays, domains, saveCompanyOverlay } = usePlacement();
  const [selectedCompany, setSelectedCompany] = useState<CompanyOverlay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusBadges: Record<string, string> = {
    target: 'bg-slate-800 text-slate-300 border-slate-700',
    applied: 'bg-blue-950 text-blue-300 border-blue-800/60',
    oa_scheduled: 'bg-amber-950 text-amber-300 border-amber-800/60',
    interview_scheduled: 'bg-purple-950 text-purple-300 border-purple-800/60',
    rejected: 'bg-rose-950 text-rose-300 border-rose-800/60',
    offered: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
  };

  const handleOpenNew = () => {
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: CompanyOverlay) => {
    setSelectedCompany(comp);
    setIsModalOpen(true);
  };

  const handleSave = (company: CompanyOverlay) => {
    saveCompanyOverlay(company);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Building2 className="size-3.5" />
            <span>Target Company Overlays</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Company Preparation Track</h2>
          <p className="text-sm text-slate-400 mt-1">
            Target company profiles, application lifecycle status, and technical requirements.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenNew}
          className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
        >
          <PlusCircle className="size-3.5 mr-1" /> Add Company Overlay
        </Button>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {companyOverlays.map((comp) => (
          <div key={comp.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block mb-1.5 ${statusBadges[comp.applicationStatus]}`}>
                  {comp.applicationStatus.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-bold text-white">{comp.companyName}</h3>
                <p className="text-xs text-slate-400 font-medium">{comp.targetRole}</p>
              </div>

              <div className="flex items-center gap-2">
                {comp.eventDate && (
                  <div className="text-right text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-amber-400 shrink-0">
                    <div className="text-[10px] text-slate-500 font-sans uppercase font-bold">Event Date</div>
                    {comp.eventDate}
                  </div>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleOpenEdit(comp)}
                  className="text-xs text-slate-400 hover:text-amber-300"
                >
                  <Edit className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Required Domains */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block flex items-center gap-1">
                <Layers className="size-3 text-blue-400" /> Required Domains
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {comp.requiredDomains.map((domId) => {
                  const d = domains.find((dom) => dom.id === domId);
                  return (
                    <span key={domId} className="text-xs font-medium px-2 py-0.5 rounded bg-slate-950 text-slate-200 border border-slate-800">
                      {d?.shortName || domId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Required Languages */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block flex items-center gap-1">
                <Code className="size-3 text-emerald-400" /> Required Languages
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {comp.requiredLanguages.map((lang) => (
                  <span key={lang} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900/60 uppercase">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Target Company Modal */}
      <CompanyModal
        company={selectedCompany}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveCompany={handleSave}
      />
    </div>
  );
};
