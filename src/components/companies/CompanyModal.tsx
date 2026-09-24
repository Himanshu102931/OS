import React, { useState } from 'react';
import type { CompanyOverlay, DomainId } from '../../types';
import { DOMAINS } from '../../data/seedData';
import { Building2, X, CheckCircle2, Calendar, Layers, Code } from 'lucide-react';
import { Button } from '../ui/button';

interface CompanyModalProps {
  company: CompanyOverlay | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCompany: (company: CompanyOverlay) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  company,
  isOpen,
  onClose,
  onSaveCompany,
}) => {
  const [companyName, setCompanyName] = useState<string>(company?.companyName || '');
  const [targetRole, setTargetRole] = useState<string>(company?.targetRole || '');
  const [applicationStatus, setApplicationStatus] = useState<CompanyOverlay['applicationStatus']>(
    company?.applicationStatus || 'target'
  );
  const [eventDate, setEventDate] = useState<string>(company?.eventDate || '');
  const [requiredDomains, setRequiredDomains] = useState<DomainId[]>(
    company?.requiredDomains || ['dsa', 'dbms']
  );
  const [requiredLanguagesStr, setRequiredLanguagesStr] = useState<string>(
    (company?.requiredLanguages || ['cpp', 'java']).join(', ')
  );

  if (!isOpen) return null;

  const handleDomainToggle = (domId: DomainId) => {
    setRequiredDomains((prev) =>
      prev.includes(domId) ? prev.filter((d) => d !== domId) : [...prev, domId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const langs = requiredLanguagesStr
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const saved: CompanyOverlay = {
      id: company?.id || `comp-${Date.now()}`,
      companyName: companyName.trim() || 'Target Company',
      targetRole: targetRole.trim() || 'Software Engineer',
      applicationStatus,
      eventDate: eventDate || undefined,
      requiredDomains: requiredDomains.length > 0 ? requiredDomains : ['dsa'],
      requiredTopics: company?.requiredTopics || ['topic-dsa-arrays'],
      requiredLanguages: langs.length > 0 ? langs : ['cpp'],
    };

    onSaveCompany(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Building2 className="size-3.5" />
              <span>Target Company Profile</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {company ? `Edit ${company.companyName}` : 'Add New Target Company'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Company Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Amazon, Microsoft"
                className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Target Role</label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. SDE-1, Software Intern"
                className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Application Status & Event Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Application Status</label>
              <select
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value as CompanyOverlay['applicationStatus'])}
                className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none capitalize"
              >
                <option value="target">Target (Interested)</option>
                <option value="applied">Applied</option>
                <option value="oa_scheduled">Online Assessment (OA)</option>
                <option value="interview_scheduled">Interview Scheduled</option>
                <option value="offered">Offer Received</option>
                <option value="rejected">Rejected / Archived</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="size-3.5 text-amber-400" /> Assessment / Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Required Domains Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Layers className="size-3.5 text-blue-400" /> Required Placement Domains
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOMAINS.map((dom) => {
                const isSelected = requiredDomains.includes(dom.id);
                return (
                  <button
                    type="button"
                    key={dom.id}
                    onClick={() => handleDomainToggle(dom.id)}
                    className={`p-2 rounded-lg border text-left font-medium transition-all text-[11px] ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/60 text-blue-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {dom.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required Languages */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center gap-1">
              <Code className="size-3.5 text-emerald-400" /> Required Languages (comma separated)
            </label>
            <input
              type="text"
              value={requiredLanguagesStr}
              onChange={(e) => setRequiredLanguagesStr(e.target.value)}
              placeholder="e.g. cpp, java, python, sql"
              className="w-full bg-slate-950 text-slate-100 font-mono font-bold p-2.5 rounded-xl border border-slate-800 focus:outline-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Save Target Overlay
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
