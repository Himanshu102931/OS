import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CompanyModal } from './CompanyModal';
import type { CompanyOverlay } from '../../types';
import { PlusCircle, Edit, Building2 } from 'lucide-react';
import { Button } from '../ui/button';

export const CompaniesView: React.FC = () => {
  const { companyOverlays, saveCompanyOverlay } = usePlacement();
  const [selectedCompany, setSelectedCompany] = useState<CompanyOverlay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            Target Companies & Drive Overlays
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Application status and target domain boost overlays for hiring drives
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenNew}
          className="text-xs bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] font-semibold h-8 px-3 rounded-[4px] shadow-sm"
        >
          <PlusCircle className="size-3.5 mr-1.5" /> Add Company Target
        </Button>
      </div>

      {/* Company Tracker Table */}
      <div className="app-surface overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028] border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Target Role</div>
          <div className="col-span-3">Application Status</div>
          <div className="col-span-2">Target Drive Date</div>
          <div className="col-span-1 text-right">Edit</div>
        </div>

        <div className="divide-y divide-[#262D38]">
          {companyOverlays.map((comp) => (
            <div key={comp.id} className="app-table-row p-3.5 sm:px-4 sm:py-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 text-xs">
                <div className="sm:col-span-3 font-semibold text-[#F1F5F9] flex items-center gap-2">
                  <Building2 className="size-3.5 text-[#E5A93C]" />
                  <span>{comp.companyName}</span>
                </div>

                <div className="sm:col-span-3 text-[#FFC665] font-mono text-xs">
                  {comp.targetRole}
                </div>

                <div className="sm:col-span-3">
                  <span className="tech-chip tech-chip-warning font-mono capitalize">
                    {comp.applicationStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="sm:col-span-2 font-mono text-[#8E98A8] text-[11px]">
                  {comp.eventDate || '—'}
                </div>

                <div className="sm:col-span-1 text-right">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleOpenEdit(comp)}
                    className="h-6 w-6 p-0 text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
                  >
                    <Edit className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
