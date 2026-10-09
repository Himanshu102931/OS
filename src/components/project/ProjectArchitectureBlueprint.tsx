import React, { useState } from 'react';
import type { ProjectLabSectionId } from '../../types';
import type { LabSectionContent } from '../../data/projectLabContent';
import { ProjectModuleCard } from './ProjectModuleCard';
import {
  CheckCircle2,
  Cpu,
  Layers,
  HardDrive,
  RefreshCw,
  Sliders,
  MousePointerClick,
  FileCheck2,
} from 'lucide-react';

interface ProjectArchitectureBlueprintProps {
  activePillar: ProjectLabSectionId;
  sectionContent?: LabSectionContent;
}

interface DataFlowNode {
  id: string;
  step: number;
  label: string;
  sublabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

const DATA_FLOW_NODES: DataFlowNode[] = [
  {
    id: 'user-action',
    step: 1,
    label: 'User Action',
    sublabel: 'UI Event',
    description:
      'User triggers a deterministic interaction (e.g. logging a DSA attempt, completing a practice session, saving an overlay).',
    icon: MousePointerClick,
  },
  {
    id: 'context',
    step: 2,
    label: 'PlacementContext',
    sublabel: 'Action Dispatcher',
    description:
      'Single React Context wraps the entire app. Validates input payloads and prepares state arguments for pure engines.',
    icon: Layers,
  },
  {
    id: 'pure-engine',
    step: 3,
    label: 'Pure Engines',
    sublabel: 'Deterministic Logic',
    description:
      'Zero-React pure functions (adaptiveEngine, practiceEngine, skillsEngine) accept plain objects, compute deterministic decisions, and return new states.',
    icon: Cpu,
  },
  {
    id: 'state-update',
    step: 4,
    label: 'State Transaction',
    sublabel: 'Immutable Update',
    description:
      'Atomic state replacement in context. Day check-in sealing is immutable; history is append-only.',
    icon: Sliders,
  },
  {
    id: 'storage-adapter',
    step: 5,
    label: 'StorageAdapter',
    sublabel: 'Local Persistence',
    description:
      'Validates schema version (1.0.0), serializes state to JSON, and persists to localStorage under placementos_v1_state.',
    icon: HardDrive,
  },
  {
    id: 're-render',
    step: 6,
    label: 'React Re-render',
    sublabel: 'Zero Lag UI',
    description:
      'Components consume updated context state. Zero network latency, instant 60fps local-first UI response.',
    icon: RefreshCw,
  },
];

export const ProjectArchitectureBlueprint: React.FC<ProjectArchitectureBlueprintProps> = ({
  activePillar,
  sectionContent,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('pure-engine');

  const selectedNode =
    DATA_FLOW_NODES.find((n) => n.id === selectedNodeId) ?? DATA_FLOW_NODES[2];

  return (
    <div
      id={`pillar-panel-${activePillar}`}
      role="tabpanel"
      aria-labelledby={`pillar-tab-${activePillar}`}
      className="bg-[#111713] border border-[#28352D] rounded-[6px] p-5 sm:p-6 space-y-6"
      data-testid="project-architecture-blueprint"
    >
      {/* Header & Pillar Intro */}
      {sectionContent && (
        <div className="space-y-2 border-b border-[#28352D] pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#0D9488]/15 text-[#2DD4BF] rounded border border-[#0D9488]/30 font-bold">
              Architectural Pillar
            </span>
            <span className="text-[10px] font-mono text-foreground-muted">
              {activePillar}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {sectionContent.heading}
          </h3>
          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed max-w-3xl">
            {sectionContent.intro}
          </p>
        </div>
      )}

      {/* Visual Data Flow Architecture Pipeline (Featured on Architecture pillar or available as interactive diagram) */}
      <div
        className="p-4 sm:p-5 bg-[#161E19] border border-[#28352D] rounded-[6px] space-y-4 relative overflow-hidden data-flow-pulse-track"
        data-testid="visual-data-flow-pipeline"
      >
        {/* Signature Motion: Data Flow Pipeline Pulse */}
        <div className="data-flow-pulse-beam" aria-hidden="true" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-[#0D9488]" />
            <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
              One-Directional Data Flow Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-secondary">
            Click any stage to inspect execution contract
          </span>
        </div>

        {/* Pipeline Nodes Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 relative z-10">
          {DATA_FLOW_NODES.map((node) => {
            const NodeIcon = node.icon;
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                data-testid={`data-flow-node-${node.id}`}
                className={`p-2.5 rounded-[4px] border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                  isSelected
                    ? 'bg-[#0D9488]/15 border-[#0D9488] shadow-xs'
                    : 'bg-[#111713] border-[#28352D] hover:border-[#3B4C40] hover:bg-[#161E19]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected ? 'text-[#2DD4BF]' : 'text-secondary'
                    }`}
                  >
                    0{node.step}
                  </span>
                  <NodeIcon
                    className={`size-3.5 ${
                      isSelected ? 'text-[#2DD4BF]' : 'text-foreground-muted'
                    }`}
                  />
                </div>
                <div>
                  <span
                    className={`text-xs font-semibold block leading-tight ${
                      isSelected ? 'text-foreground' : 'text-foreground-muted'
                    }`}
                  >
                    {node.label}
                  </span>
                  <span className="text-[10px] font-mono text-secondary block mt-0.5">
                    {node.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Callout */}
        <div
          className="p-3 bg-[#111713] border border-[#28352D] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          data-testid="selected-node-detail"
        >
          <div className="space-y-0.5 max-w-2xl">
            <span className="text-[11px] font-mono font-bold text-[#0D9488]">
              Stage 0{selectedNode.step}: {selectedNode.label} ({selectedNode.sublabel})
            </span>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {selectedNode.description}
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161E19] text-status-success border border-status-success/30 font-semibold shrink-0">
            Offline Deterministic
          </span>
        </div>
      </div>

      {/* Cards Grid (Module cards or Stack cards) */}
      {sectionContent?.cards && sectionContent.cards.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-3.5 text-[#0D9488]" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              {activePillar === 'implementation'
                ? 'Core Implementation Modules'
                : 'Pillar Specifications & Contracts'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sectionContent.cards.map((card) => (
              <ProjectModuleCard key={card.label} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Engineering Key Points Checklist */}
      {sectionContent?.points && sectionContent.points.length > 0 && (
        <div className="space-y-2.5 p-4 bg-[#161E19] border border-[#28352D] rounded-[6px]">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono block">
            Engineering Principles & Defensible Guarantees
          </span>
          <ul className="space-y-2 text-xs text-foreground-muted">
            {sectionContent.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <CheckCircle2 className="size-3.5 text-status-success shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Blocks (Deep-dive topics) */}
      {sectionContent?.blocks && sectionContent.blocks.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono block">
            Architecture Specifications & Rationale
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sectionContent.blocks.map((block) => (
              <div
                key={block.title}
                className="p-3.5 sm:p-4 bg-[#161E19] border border-[#28352D] rounded-[6px] space-y-1"
              >
                <strong className="text-xs font-bold text-foreground block font-mono">
                  {block.title}
                </strong>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {block.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
