import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { CompanyModal } from './CompanyModal';
import type { CompanyOverlay } from '../../types';
import { PlusCircle, Edit } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Target Companies
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Application status and preparation requirements for target hiring drives
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenNew}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-8 px-3"
        >
          <PlusCircle className="size-3.5 mr-1.5" /> Add Company
        </Button>
      </div>

      {/* Company Tracker Table */}
      <div className="app-surface overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-2">Target Date</div>
          <div className="col-span-1 text-right">Edit</div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {companyOverlays.map((comp) => (
            <div key={comp.id} className="app-table-row p-3 sm:px-4 sm:py-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 text-xs">
                <div className="sm:col-span-3 font-semibold text-zinc-100">
                  {comp.companyName}
                </div>

                <div className="sm:col-span-3 text-zinc-400">
                  {comp.targetRole}
                </div>

                <div className="sm:col-span-3">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-zinc-900 border-zinc-800 text-zinc-300 capitalize">
                    {comp.applicationStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="sm:col-span-2 font-mono text-zinc-400 text-[11px]">
                  {comp.eventDate || '—'}
                </div>

                <div className="sm:col-span-1 text-right">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleOpenEdit(comp)}
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-200"
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
