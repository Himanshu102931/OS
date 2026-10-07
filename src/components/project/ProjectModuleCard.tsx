import React from 'react';
import type { LabCard } from '../../data/projectLabContent';

interface ProjectModuleCardProps {
  card: LabCard;
  accentColor?: string;
}

export const ProjectModuleCard: React.FC<ProjectModuleCardProps> = ({ card, accentColor = '#0D9488' }) => {
  return (
    <div
      className="p-3.5 sm:p-4 bg-[#161E19] border border-[#28352D] rounded-[6px] space-y-1.5 hover:border-[#3B4C40] transition-all hover-lift"
      data-testid={`module-card-${card.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] font-mono font-bold tracking-tight"
          style={{ color: accentColor }}
        >
          {card.label}
        </span>
      </div>
      <p className="text-xs text-[#F1F5F9] font-semibold leading-snug">
        {card.value}
      </p>
      {card.detail && (
        <p className="text-[11px] text-[#8E98A8] leading-relaxed">
          {card.detail}
        </p>
      )}
    </div>
  );
};
