import React, { useState } from 'react';
import type { ProjectLabSectionId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { PracticeSessionRunner } from '../preparation/PracticeSessionRunner';
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
          className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          <span>Start Project Defense</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#262D38]">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#1B2028] text-[#E5A93C] border border-[#3B4556] font-semibold shadow-xs'
                  : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/50 border border-transparent'
              }`}
            >
              <Icon className={`size-3.5 ${isActive ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-5 sm:p-6">
        {activeSection === 'overview' && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[#F1F5F9]">PlacementOS Personal Portfolio Project</h3>
            <p className="text-xs text-[#8E98A8] leading-relaxed">
              PlacementOS is a local-first, deterministic career preparation OS designed to measure, adapt, and track placement trajectory. Built with React 18, TypeScript, Tailwind CSS, Vite, and local storage adapter architecture.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded space-y-1">
                <span className="text-[11px] font-mono text-[#E5A93C]">Primary Stack</span>
                <p className="text-xs text-[#F1F5F9] font-medium">React 18 + TypeScript + Vite + Tailwind CSS</p>
              </div>
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded space-y-1">
                <span className="text-[11px] font-mono text-[#E5A93C]">Architecture Pattern</span>
                <p className="text-xs text-[#F1F5F9] font-medium">Deterministic Adapt Engine + Local Storage Adapter</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'architecture' && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[#F1F5F9]">System Architecture & Data Flow</h3>
            <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded space-y-3 font-mono text-xs">
              <div className="text-[#E5A93C] font-bold">Data Flow Architecture:</div>
              <div className="text-[#8E98A8] leading-relaxed">
                User Actions → PlacementContext → Engine Evaluation (adaptiveEngine / practiceEngine) → State Update → StorageAdapter (JSON LocalStorage) → React Re-render
              </div>
            </div>
            <ul className="space-y-2 text-xs text-[#8E98A8]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                <span>Deterministic Scoring Engine: No black-box AI runtime decision making.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                <span>Single Storage Adapter: Hydrates and persists app state safely with JSON fallback.</span>
              </li>
            </ul>
          </div>
        )}

        {activeSection === 'implementation' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#F1F5F9]">Key Implementation Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded">
                <h4 className="text-xs font-semibold text-[#F1F5F9]">adaptiveEngine.ts</h4>
                <p className="text-[11px] text-[#8E98A8] mt-1">Computes task priority scores using 6 deterministic weights and Leitner spaced repetition.</p>
              </div>
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded">
                <h4 className="text-xs font-semibold text-[#F1F5F9]">practiceEngine.ts</h4>
                <p className="text-[11px] text-[#8E98A8] mt-1">Evaluates practice attempts, calculates accuracy %, and logs domain evidence.</p>
              </div>
              <div className="p-[#1B2028] bg-[#1B2028] border border-[#262D38] p-3.5 rounded">
                <h4 className="text-xs font-semibold text-[#F1F5F9]">storageAdapter.ts</h4>
                <p className="text-[11px] text-[#8E98A8] mt-1">Ensures backward compatibility and offline persistence in browser LocalStorage.</p>
              </div>
              <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded">
                <h4 className="text-xs font-semibold text-[#F1F5F9]">PlacementContext.tsx</h4>
                <p className="text-[11px] text-[#8E98A8] mt-1">Central state provider managing routes, tasks, evidence, and settings.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'practices' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#F1F5F9]">Engineering & Quality Practices</h3>
            <div className="space-y-2 text-xs text-[#8E98A8]">
              <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded">
                <strong className="text-[#F1F5F9] block mb-0.5">Strict Type Safety:</strong>
                TypeScript strict checking with zero compiler warnings or implicit any types.
              </div>
              <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded">
                <strong className="text-[#F1F5F9] block mb-0.5">Deterministic Test Suite:</strong>
                Vitest unit test suite validating scoring, storage migration, and adaptive recommendations.
              </div>
              <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded">
                <strong className="text-[#F1F5F9] block mb-0.5">Linear / GitHub Aesthetic:</strong>
                Restrained developer tool UI with clean typography, high contrast, and responsive layout.
              </div>
            </div>
          </div>
        )}

        {activeSection === 'defense' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#F1F5F9]">Project Viva & Defense Simulator</h3>
            <p className="text-xs text-[#8E98A8]">
              Practice answering tough viva questions about your project architecture, state management choices, and performance bottlenecks.
            </p>
            <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#F1F5F9]">{defenseSession.title}</h4>
                <p className="text-[11px] text-[#8E98A8] mt-0.5">{defenseSession.description}</p>
              </div>
              <button
                onClick={() => setActiveSessionId(defenseSession.id)}
                className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all shrink-0"
              >
                Launch Defense Session
              </button>
            </div>
          </div>
        )}

        {activeSection === 'evidence' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#F1F5F9]">Project Defense Evidence History</h3>
            {projectAttempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8E98A8] bg-[#1B2028] border border-[#262D38] rounded">
                No recorded project defense attempts yet. Launch a defense session to build evidence.
              </div>
            ) : (
              <div className="space-y-2">
                {projectAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-3 bg-[#1B2028] border border-[#262D38] rounded flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-[#F1F5F9]">{attempt.sessionTitle}</span>
                      <span className="text-[10px] text-[#8E98A8] block">{attempt.date}</span>
                    </div>
                    <span className="font-mono text-[#E5A93C] font-bold">{attempt.accuracyPct}% Score</span>
                  </div>
                ))}
              </div>
            )}
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
