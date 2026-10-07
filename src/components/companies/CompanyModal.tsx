import React, { useState, useEffect } from 'react';
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

/** Starting selections shown for a brand-new company. */
const NEW_COMPANY_DOMAINS: DomainId[] = ['dsa', 'dbms'];
const NEW_COMPANY_LANGUAGES: string[] = ['cpp', 'java'];

export const CompanyModal: React.FC<CompanyModalProps> = ({
  company,
  isOpen,
  onClose,
  onSaveCompany,
}) => {
  const [companyName, setCompanyName] = useState<string>(company?.companyName ?? '');
  const [targetRole, setTargetRole] = useState<string>(company?.targetRole ?? '');
  const [applicationStatus, setApplicationStatus] = useState<CompanyOverlay['applicationStatus']>(
    company?.applicationStatus ?? 'target'
  );
  const [eventDate, setEventDate] = useState<string>(company?.eventDate ?? '');
  const [requiredDomains, setRequiredDomains] = useState<DomainId[]>(
    company?.requiredDomains ? [...company.requiredDomains] : [...NEW_COMPANY_DOMAINS]
  );
  const [requiredLanguagesStr, setRequiredLanguagesStr] = useState<string>(
    (company?.requiredLanguages ?? NEW_COMPANY_LANGUAGES).join(', ')
  );

  // Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // C4-01 — form initialisers above only run on mount, so CompaniesView keys
  // this component by `isOpen + company?.id`. That makes every open, every
  // target switch (A → B) and every close/reopen a remount, so the form is
  // always initialised from the exact target and can never carry the previous
  // company's (or an abandoned edit's) values across. All hooks stay
  // unconditional — no lifecycle effect is needed.

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

    // Spread the existing record first so every field that is not an exposed
    // form control (id, requiredTopics, and anything added later) survives an
    // edit — the form never reconstructs the company from scratch.
    const saved: CompanyOverlay = {
      ...company,
      id: company?.id ?? `comp-${Date.now()}`,
      companyName: companyName.trim() || company?.companyName || 'Target Company',
      targetRole: targetRole.trim() || company?.targetRole || 'Software Engineer',
      applicationStatus,
      eventDate: eventDate || undefined,
      requiredDomains: [...requiredDomains],
      // Never invent a topic requirement: absent stays absent, empty stays empty.
      requiredTopics: company?.requiredTopics ?? [],
      requiredLanguages: [...langs],
    };

    onSaveCompany(saved);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider font-mono">
              <Building2 className="size-3.5" aria-hidden="true" />
              <span>Target Company Profile</span>
            </div>
            <h2 id="company-modal-title" className="text-xl font-bold text-foreground mt-0.5 font-sans">
              {company ? `Edit ${company.companyName}` : 'Add New Target Company'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Company Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="company-name-input" className="text-foreground-muted font-semibold block text-[11px] uppercase tracking-wider font-mono">
                Company Name
              </label>
              <input
                id="company-name-input"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Amazon, Microsoft"
                className="w-full bg-surface-elevated text-foreground font-semibold p-2.5 rounded-md border border-border focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="target-role-input" className="text-foreground-muted font-semibold block text-[11px] uppercase tracking-wider font-mono">
                Target Role
              </label>
              <input
                id="target-role-input"
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. SDE-1, Software Intern"
                className="w-full bg-surface-elevated text-foreground font-semibold p-2.5 rounded-md border border-border focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Application Status & Event Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="app-status-select" className="text-foreground-muted font-semibold block text-[11px] uppercase tracking-wider font-mono">
                Application Status
              </label>
              <select
                id="app-status-select"
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value as CompanyOverlay['applicationStatus'])}
                className="w-full bg-surface-elevated text-foreground font-semibold p-2.5 rounded-md border border-border focus:outline-none focus:border-accent capitalize"
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
              <label htmlFor="event-date-input" className="text-foreground-muted font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono">
                <Calendar className="size-3.5 text-accent" aria-hidden="true" /> Assessment / Event Date
              </label>
              <input
                id="event-date-input"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-surface-elevated text-foreground font-semibold p-2.5 rounded-md border border-border focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          {/* Required Domains Selection */}
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono">
              <Layers className="size-3.5 text-accent" aria-hidden="true" /> Required Placement Domains
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOMAINS.map((dom) => {
                const isSelected = requiredDomains.includes(dom.id);
                return (
                  <button
                    type="button"
                    key={dom.id}
                    onClick={() => handleDomainToggle(dom.id)}
                    className={`p-2 rounded-md border text-left font-mono transition-all text-[11px] cursor-pointer ${
                      isSelected
                        ? 'bg-surface-elevated border-accent text-accent font-bold'
                        : 'bg-surface-elevated border-border text-foreground-muted hover:border-border-active'
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
            <label htmlFor="req-languages-input" className="text-foreground-muted font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono">
              <Code className="size-3.5 text-success" aria-hidden="true" /> Required Languages (comma separated)
            </label>
            <input
              id="req-languages-input"
              type="text"
              value={requiredLanguagesStr}
              onChange={(e) => setRequiredLanguagesStr(e.target.value)}
              placeholder="e.g. cpp, java, python, sql"
              className="w-full bg-surface-elevated text-foreground font-mono font-semibold p-2.5 rounded-md border border-border focus:outline-none focus:border-accent"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              className="text-xs text-foreground-muted hover:text-foreground rounded-md cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-md cursor-pointer"
            >
              <CheckCircle2 className="size-3.5 mr-1" aria-hidden="true" /> Save Target Overlay
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
