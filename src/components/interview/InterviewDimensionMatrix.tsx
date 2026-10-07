import React from 'react';
import type { RoutePath } from '../../context/PlacementContext';
import type {
  CompanyReadinessOverlay,
  ReadinessDimension,
} from '../../engine/interviewReadinessEngine';
import type { EvidenceTrace, EvidenceCatalog } from '../../engine/evidenceTrace';
import { InterviewDimensionCard } from './InterviewDimensionCard';
import { Layers } from 'lucide-react';

export interface InterviewDimensionMatrixProps {
  dimensions: ReadinessDimension[];
  companyOverlay: CompanyReadinessOverlay | null;
  dimensionTraces: Record<string, EvidenceTrace>;
  catalog: EvidenceCatalog;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onAction: (route: RoutePath, targetId?: string) => void;
}

export const InterviewDimensionMatrix: React.FC<InterviewDimensionMatrixProps> = ({
  dimensions,
  companyOverlay,
  dimensionTraces,
  catalog,
  expandedId,
  onToggleExpand,
  onAction,
}) => {
  const strongCount = dimensions.filter((d) => d.band === 'strong').length;
  const developingCount = dimensions.filter((d) => d.band === 'developing').length;
  const needsWorkCount = dimensions.filter((d) => d.band === 'needs_work').length;
  const unassessedCount = dimensions.filter((d) => d.band === 'unassessed').length;

  return (
    <section aria-label="Readiness dimensions" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
          <Layers className="size-4 text-[#6366F1]" />
          Readiness Dimensions
        </h2>
        <span className="text-[11px] text-[#8E98A8]">
          {strongCount} strong · {developingCount} developing · {needsWorkCount} need work ·{' '}
          {unassessedCount} unassessed
        </span>
      </div>

      <div className="space-y-2.5 stagger-in" data-testid="dimension-list">
        {dimensions.map((dim) => (
          <InterviewDimensionCard
            key={dim.id}
            dimension={dim}
            companyOverlay={companyOverlay}
            trace={dimensionTraces[dim.id]}
            catalog={catalog}
            isExpanded={expandedId === dim.id}
            onToggleExpand={(id) => onToggleExpand(expandedId === id ? '' : id)}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
};
