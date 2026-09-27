import React, { useState } from 'react';
import type { ProjectLabSectionId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { PracticeSessionRunner } from '../preparation/PracticeSessionRunner';
import { PROJECT_LAB_CONTENT } from '../../data/projectLabContent';
import {
  FolderGit2,
  Cpu,
  Code2,
  ShieldCheck,
  Award,
  ArrowRight,
  Terminal,
  CheckCircle2,
} from 'lucide-react';



export const ProjectLabView: React.FC = () => {
  const { practiceSessions, practiceAttempts } = usePlacement();
  const [activeSection, setActiveSection] = useState<ProjectLabSectionId>('overview');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const defenseSession = practiceSessions.find((s) => s.category === 'project_defense') || practiceSessions[0];
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const sectionContent = PROJECT_LAB_CONTENT.find((c) => c.id === activeSection);

  const sections: { id: ProjectLabSectionId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Project Overview', icon: FolderGit2 },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
    { id: 'implementation', label: 'Implementation', icon: Code2 },
    { id: 'practices', label: 'Engineering Practices', icon: Terminal },
    { id: 'defense', label: 'Defense & Viva', icon: ShieldCheck },
    { id: 'evidence', label: 'Evidence', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-[#262D38] pb-5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#E5A93C]/15 text-[#E5A93C] rounded border border-[#E5A93C]/30 font-bold">
            Engineering System
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">PROJECT LAB</h1>
        <p className="text-sm text-[#8E98A8]">
          BUILD → UNDERSTAND → EXPLAIN → DEFEND. Personal OS is your primary portfolio project.
        </p>
      </div>

      {/* Core Philosophy Banner */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Project Learning Discipline</h2>
          <p className="text-xs text-[#8E98A8]">
            PlacementOS prioritizes genuine understanding over feature count. You must be prepared to defend architecture, trade-offs, and code logic live.
          </p>
        </div>
        <button
          onClick={() => setActiveSessionId(defenseSession.id)}
          className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm hover-lift"
        >
          <span>Start Project Defense</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Section Navigation Tabs with flow progression */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#262D38]">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          const isCompleted = idx < sections.findIndex(s => s.id === activeSection);
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all whitespace-nowrap flow-step ${
                isActive
                  ? 'bg-[#1B2028] text-[#E5A93C] border border-[#3B4556] font-semibold shadow-xs active'
                  : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/50 border border-transparent'
              } ${isCompleted && !isActive ? 'completed' : ''}`}
            >
              <Icon className={`size-3.5 ${isActive ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-5 sm:p-6">
        {sectionContent && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#F1F5F9]">{sectionContent.heading}</h3>
              <p className="text-xs text-[#8E98A8] leading-relaxed">{sectionContent.intro}</p>
            </div>

            {sectionContent.flow && (
              <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded space-y-3 font-mono text-xs">
                <div className="text-[#E5A93C] font-bold">Data Flow Architecture:</div>
                <div className="text-[#8E98A8] leading-relaxed">{sectionContent.flow}</div>
              </div>
            )}

            {sectionContent.cards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionContent.cards.map((card) => (
                  <div key={card.label} className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded space-y-1 hover-lift">
                    <span className="text-[11px] font-mono text-[#E5A93C]">{card.label}</span>
                    <p className="text-xs text-[#F1F5F9] font-medium">{card.value}</p>
                    {card.detail && (
                      <p className="text-[11px] text-[#5C6675]">{card.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {sectionContent.points && (
              <ul className="space-y-2 text-xs text-[#8E98A8]">
                {sectionContent.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {sectionContent.blocks && (
              <div className="space-y-2 text-xs text-[#8E98A8]">
                {sectionContent.blocks.map((block) => (
                  <div key={block.title} className="p-3 bg-[#1B2028] border border-[#262D38] rounded">
                    <strong className="text-[#F1F5F9] block mb-0.5">{block.title}:</strong>
                    {block.body}
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'defense' && (
              <div className="defense-state p-4 bg-[#1B2028] border border-[#262D38] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t-[#3B4556]">
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9]">{defenseSession.title}</h4>
                  <p className="text-[11px] text-[#8E98A8] mt-0.5">{defenseSession.description}</p>
                </div>
                <button
                  onClick={() => setActiveSessionId(defenseSession.id)}
                  className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all shrink-0 hover-lift"
                >
                  Launch Defense Session
                </button>
              </div>
            )}

            {activeSection === 'evidence' &&
              (projectAttempts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8E98A8] bg-[#1B2028] border border-[#262D38] rounded">
                  No recorded project defense attempts yet. Launch a defense session to build evidence.
                </div>
              ) : (
                <div className="space-y-2">
                  {projectAttempts.map((attempt) => (
                    <div key={attempt.id} className="p-3 bg-[#1B2028] border border-[#262D38] rounded flex items-center justify-between text-xs hover-lift">
                      <div>
                        <span className="font-medium text-[#F1F5F9]">{attempt.sessionTitle}</span>
                        <span className="text-[10px] text-[#8E98A8] block">{attempt.date}</span>
                      </div>
                      <span className="font-mono text-[#E5A93C] font-bold evidence-update">{attempt.accuracyPct}% Score</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Session Runner Modal */}
      {activeSessionId && (
        <PracticeSessionRunner
          session={practiceSessions.find((s) => s.id === activeSessionId) || defenseSession}
          onClose={() => setActiveSessionId(null)}
        />
      )}
    </div>
  );
};
