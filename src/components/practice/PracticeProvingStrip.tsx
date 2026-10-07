import React from 'react';
import { Award, Target, ShieldCheck, AlertTriangle } from 'lucide-react';

interface PracticeProvingStripProps {
  totalAttempts: number;
  averageAccuracy: number;
  readyDomainsCount: number;
  totalDomainsCount: number;
  remediationCount: number;
}

export const PracticeProvingStrip: React.FC<PracticeProvingStripProps> = ({
  totalAttempts,
  averageAccuracy,
  readyDomainsCount,
  totalDomainsCount,
  remediationCount,
}) => {
  return (
    <section
      aria-label="Practice Performance Overview"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
    >
      {/* 1. Total Drills Completed */}
      <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-foreground-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Drills</span>
          <Award className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">{totalAttempts}</div>
          <p className="text-[11px] text-foreground-muted mt-0.5">Recorded attempts</p>
        </div>
      </div>

      {/* 2. Average Accuracy */}
      <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-foreground-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Average Accuracy</span>
          <Target className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {totalAttempts > 0 ? `${averageAccuracy}%` : '—'}
          </div>
          <p className="text-[11px] text-foreground-muted mt-0.5">Overall precision</p>
        </div>
      </div>

      {/* 3. Domain Readiness */}
      <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-foreground-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Domain Readiness</span>
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {readyDomainsCount} <span className="text-xs text-foreground-muted font-normal">/ {totalDomainsCount}</span>
          </div>
          <p className="text-[11px] text-foreground-muted mt-0.5">≥70% accuracy tracks</p>
        </div>
      </div>

      {/* 4. Remediation Pending */}
      <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-foreground-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Remediation</span>
          <AlertTriangle
            className={`size-4 ${
              remediationCount > 0 ? 'text-warning' : 'text-foreground-muted'
            }`}
          />
        </div>
        <div>
          <div
            className={`text-2xl font-bold font-mono ${
              remediationCount > 0 ? 'text-warning' : 'text-foreground'
            }`}
          >
            {remediationCount}
          </div>
          <p className="text-[11px] text-foreground-muted mt-0.5">
            {remediationCount === 1 ? 'Actionable drill review' : 'Actionable drill reviews'}
          </p>
        </div>
      </div>
    </section>
  );
};
