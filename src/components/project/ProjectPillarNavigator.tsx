import React from 'react';
import type { ProjectLabSectionId } from '../../types';
import {
  FolderGit2,
  Cpu,
  Code2,
  Terminal,
  ShieldCheck,
  Award,
  Check,
} from 'lucide-react';

interface ProjectPillarNavigatorProps {
  activePillar: ProjectLabSectionId;
  onSelectPillar: (pillar: ProjectLabSectionId) => void;
  sectionCompleted: Record<ProjectLabSectionId, boolean>;
}

const PILLARS: {
  id: ProjectLabSectionId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'overview',
    label: '1. Project Overview',
    shortLabel: 'Overview',
    description: 'Mission, Tech Stack & Constraints',
    icon: FolderGit2,
  },
  {
    id: 'architecture',
    label: '2. System Architecture',
    shortLabel: 'Architecture',
    description: 'Data Flow & Scoring Engine',
    icon: Cpu,
  },
  {
    id: 'implementation',
    label: '3. Implementation Modules',
    shortLabel: 'Modules',
    description: 'Pure Engines & Storage Boundary',
    icon: Code2,
  },
  {
    id: 'practices',
    label: '4. Engineering Practices',
    shortLabel: 'Practices',
    description: 'Type Safety & Test Gates',
    icon: Terminal,
  },
  {
    id: 'defense',
    label: '5. Defense & Viva Rubric',
    shortLabel: 'Viva Rubric',
    description: 'Interviewer Pushback Rubric',
    icon: ShieldCheck,
  },
  {
    id: 'evidence',
    label: '6. Evidence Ledger',
    shortLabel: 'Evidence',
    description: 'Verifiable Defense History',
    icon: Award,
  },
];

export const ProjectPillarNavigator: React.FC<ProjectPillarNavigatorProps> = ({
  activePillar,
  onSelectPillar,
  sectionCompleted,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % PILLARS.length;
      onSelectPillar(PILLARS[nextIndex].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + PILLARS.length) % PILLARS.length;
      onSelectPillar(PILLARS[prevIndex].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectPillar(PILLARS[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectPillar(PILLARS[PILLARS.length - 1].id);
    }
  };

  return (
    <div
      className="border-b border-[#28352D] pb-1"
      data-testid="project-pillar-navigator"
      role="region"
      aria-label="Architectural Pillar Navigation"
    >
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none"
        role="tablist"
        aria-label="Project Lab Architectural Pillars"
      >
        {PILLARS.map((pillar, index) => {
          const Icon = pillar.icon;
          const isActive = activePillar === pillar.id;
          const isCompleted = sectionCompleted[pillar.id];

          return (
            <button
              key={pillar.id}
              id={`pillar-tab-${pillar.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`pillar-panel-${pillar.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectPillar(pillar.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              data-testid={`pillar-tab-${pillar.id}`}
              className={`flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-[4px] text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                isActive
                  ? 'bg-[#161E19] text-[#2DD4BF] border border-[#0D9488]/40 font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-[#161E19]/60 border border-transparent'
              }`}
            >
              <Icon
                className={`size-3.5 shrink-0 ${
                  isActive
                    ? 'text-[#2DD4BF]'
                    : isCompleted
                    ? 'text-status-success'
                    : 'text-secondary'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{pillar.label}</span>
              <span className="inline sm:hidden">{pillar.shortLabel}</span>

              {/* Status Indicator */}
              {isCompleted ? (
                <span
                  className="size-3.5 rounded-full bg-status-success/20 text-status-success border border-status-success/30 flex items-center justify-center shrink-0 ml-0.5"
                  title="Completed from recorded defense data"
                  aria-label="Completed"
                >
                  <Check className="size-2.5" />
                </span>
              ) : (
                isActive && (
                  <span
                    className="size-1.5 rounded-full bg-[#0D9488] shrink-0 ml-0.5"
                    aria-hidden="true"
                  />
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
