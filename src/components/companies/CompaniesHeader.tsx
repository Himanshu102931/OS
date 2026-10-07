import React from 'react';
import { GuideTrigger } from '../guide/GuideTrigger';
import { Button } from '../ui/button';
import { Plus, Building2 } from 'lucide-react';

interface CompaniesHeaderProps {
  onAddCompany: () => void;
}

export const CompaniesHeader: React.FC<CompaniesHeaderProps> = ({ onAddCompany }) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-surface-elevated border border-border text-accent">
            <Building2 className="size-4" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Target Companies & Requirement Mapping
          </h1>
        </div>
        <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
          Track recruitment drive timelines, map role requirements, and close company preparation gaps with live evidence.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <GuideTrigger route="companies" />
        <Button
          size="sm"
          onClick={onAddCompany}
          className="text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-md h-9 px-3.5 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="size-4 mr-1.5" aria-hidden="true" /> Add Target Company
        </Button>
      </div>
    </header>
  );
};
