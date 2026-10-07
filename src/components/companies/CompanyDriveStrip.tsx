import React, { useMemo } from 'react';
import type { CompanyOverlay } from '../../types';
import type { CompanyPreparationSnapshot } from '../../engine/companyEngine';
import { calculateCompanyDeadlineUrgency } from '../../engine/companyPlanEngine';
import {
  Building2,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface CompanyDriveStripProps {
  companyOverlays: CompanyOverlay[];
  companySnapshotMap: Record<string, CompanyPreparationSnapshot>;
  todayDate: string;
}

export const CompanyDriveStrip: React.FC<CompanyDriveStripProps> = ({
  companyOverlays,
  companySnapshotMap,
  todayDate,
}) => {
  const stats = useMemo(() => {
    const activeCount = companyOverlays.length;

    // Highest readiness %
    let maxReadiness = 0;
    let totalGaps = 0;

    companyOverlays.forEach((c) => {
      const snap = companySnapshotMap[c.id];
      if (snap) {
        if (snap.overallPreparationStrength > maxReadiness) {
          maxReadiness = snap.overallPreparationStrength;
        }
        totalGaps += snap.gapRequirementsCount;
      }
    });

    // Find nearest recruitment drive (lowest positive daysUntil, or 0, or smallest negative)
    let nearestText = 'No drive scheduled';
    let nearestUrgency = false;

    if (activeCount > 0) {
      const scheduled = companyOverlays
        .filter((c) => Boolean(c.eventDate))
        .map((c) => {
          const urg = calculateCompanyDeadlineUrgency(c.eventDate, todayDate);
          return { company: c, ...urg };
        })
        .filter((item) => item.daysUntil !== null);

      if (scheduled.length > 0) {
        // Sort: positive daysUntil ascending first (closest future), then overdue (0 and negative)
        scheduled.sort((a, b) => {
          const aDays = a.daysUntil!;
          const bDays = b.daysUntil!;
          if (aDays >= 0 && bDays >= 0) return aDays - bDays;
          if (aDays >= 0) return -1;
          if (bDays >= 0) return 1;
          return bDays - aDays; // closest to 0 among overdue
        });

        const nearest = scheduled[0];
        const days = nearest.daysUntil!;
        if (days < 0) {
          nearestText = `${nearest.company.companyName} (${Math.abs(days)}d overdue)`;
          nearestUrgency = true;
        } else if (days === 0) {
          nearestText = `${nearest.company.companyName} today`;
          nearestUrgency = true;
        } else if (days === 1) {
          nearestText = `${nearest.company.companyName} tomorrow (1d)`;
          nearestUrgency = true;
        } else {
          nearestText = `${nearest.company.companyName} in ${days}d`;
          nearestUrgency = days <= 14;
        }
      }
    }

    return {
      activeCount,
      maxReadiness,
      nearestText,
      nearestUrgency,
      totalGaps,
    };
  }, [companyOverlays, companySnapshotMap, todayDate]);

  return (
    <section aria-label="Drive Timeline & Key Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Active Target Companies */}
      <div className="bg-surface border border-border rounded-lg p-3.5 space-y-1.5 transition-colors">
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Active Targets</span>
          <Building2 className="size-3.5 text-accent" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-foreground" data-testid="metric-active-targets">
            {stats.activeCount}
          </span>
          <span className="text-xs text-foreground-muted">
            {stats.activeCount === 1 ? 'Target' : 'Targets'}
          </span>
        </div>
        <p className="text-[11px] text-foreground-muted truncate">
          Configured corporate profiles
        </p>
      </div>

      {/* 2. Top Target Readiness */}
      <div className="bg-surface border border-border rounded-lg p-3.5 space-y-1.5 transition-colors">
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Top Readiness</span>
          <TrendingUp className="size-3.5 text-success" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-foreground" data-testid="metric-top-readiness">
            {stats.maxReadiness}%
          </span>
          <span className="text-xs text-foreground-muted">
            {stats.maxReadiness >= 75 ? 'Strong match' : stats.maxReadiness >= 40 ? 'In progress' : 'Early stage'}
          </span>
        </div>
        <p className="text-[11px] text-foreground-muted truncate">
          Highest benchmark readiness
        </p>
      </div>

      {/* 3. Next Recruitment Drive */}
      <div className="bg-surface border border-border rounded-lg p-3.5 space-y-1.5 transition-colors">
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Next Drive</span>
          <Calendar className={`size-3.5 ${stats.nearestUrgency ? 'text-warning' : 'text-accent'}`} aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-base sm:text-lg font-bold font-mono text-foreground truncate"
            data-testid="metric-next-drive"
            title={stats.nearestText}
          >
            {stats.nearestText}
          </span>
        </div>
        <p className="text-[11px] text-foreground-muted truncate">
          Nearest assessment deadline
        </p>
      </div>

      {/* 4. Total Requirement Gaps */}
      <div className="bg-surface border border-border rounded-lg p-3.5 space-y-1.5 transition-colors">
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Unresolved Gaps</span>
          <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-foreground" data-testid="metric-total-gaps">
            {stats.totalGaps}
          </span>
          <span className="text-xs text-foreground-muted">
            {stats.totalGaps === 1 ? 'Deficit' : 'Deficits'}
          </span>
        </div>
        <p className="text-[11px] text-foreground-muted truncate">
          Total missing skill proofs
        </p>
      </div>
    </section>
  );
};
