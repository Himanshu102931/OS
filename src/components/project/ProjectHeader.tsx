import React from 'react';
import type { PracticeAttempt, EvidenceLog, TopicSkillState } from '../../types';
import { GuideTrigger } from '../guide/GuideTrigger';
import { ProjectReadinessStrip } from './ProjectReadinessStrip';
import { Terminal, Shield } from 'lucide-react';

interface ProjectHeaderProps {
  practiceAttempts: PracticeAttempt[];
  evidenceLogs: EvidenceLog[];
  skillStates: Record<string, TopicSkillState>;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  practiceAttempts,
  evidenceLogs,
  skillStates,
}) => {
  return (
    <div className="space-y-4" data-testid="project-header">
      {/* Title & Purpose Bar */}
      <div className="border-b border-[#28352D] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#0D9488]/15 text-[#2DD4BF] rounded border border-[#0D9488]/30 font-bold">
              <Terminal className="size-3" />
              <span>Engineering System</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#161E19] text-[#8E98A8] rounded border border-[#28352D]">
              <Shield className="size-3 text-[#4CAF78]" />
              <span>Portfolio Viva</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">
            PROJECT LAB
          </h1>
          <p className="text-xs sm:text-sm text-[#8E98A8] max-w-3xl leading-relaxed">
            BUILD → UNDERSTAND → EXPLAIN → DEFEND. PlacementOS is your primary portfolio engineering system.
            Systematically rehearse architecture decisions, trade-offs, and scalability defenses under interview conditions.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <GuideTrigger route="project" />
        </div>
      </div>

      {/* Zone 1: Four-Factor Telemetry Strip */}
      <ProjectReadinessStrip
        practiceAttempts={practiceAttempts}
        evidenceLogs={evidenceLogs}
        skillStates={skillStates}
      />
    </div>
  );
};
