import React from 'react';
import { ClipboardCheck, Clock, ShieldCheck, Target, Layers } from 'lucide-react';
import { GuideTrigger } from '../guide/GuideTrigger';

export const AssessmentDiagnosticHeader: React.FC = () => {
  return (
    <header className="space-y-4" aria-label="Diagnostic Assessment Header">
      {/* Top Meta Strip: Status, Badge & Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1B2028] border border-[#262D38] text-xs font-mono text-[#EAB308]">
          <ClipboardCheck className="size-3.5 text-[#EAB308]" aria-hidden="true" />
          <span className="font-semibold uppercase tracking-wider">PlacementOS Benchmark v1.0 · Mode A: Pre-Flight Briefing</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#1B2028] text-[#9AA99F] border border-[#262D38]">
            Status: <strong className="text-[#F1F5F9] font-semibold">Unassessed Baseline</strong>
          </span>
          <GuideTrigger route="assessment" />
        </div>
      </div>

      {/* Main Title & Mission Rationale */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">
          Baseline Diagnostic Assessment
        </h1>
        <p className="text-sm text-[#8E98A8] max-w-3xl leading-relaxed">
          The baseline diagnostic establishes an authoritative, empirical capability profile across 10 core placement constructs. It produces deterministic calibration parameters for your daily roadmap and study plan without relying on unverified practice assumptions.
        </p>
      </div>

      {/* 5-Second Telemetry Briefing Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-[#14171D] border border-[#262D38] rounded p-3 space-y-1">
          <div className="text-[11px] font-mono text-[#8E98A8] flex items-center gap-1.5 uppercase">
            <Clock className="size-3.5 text-[#EAB308]" aria-hidden="true" />
            <span>Time Budget</span>
          </div>
          <div className="text-sm font-bold text-[#F1F5F9] font-mono">180 Minutes</div>
          <div className="text-[10px] text-[#5C6675]">Hard wall-clock limit</div>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded p-3 space-y-1">
          <div className="text-[11px] font-mono text-[#8E98A8] flex items-center gap-1.5 uppercase">
            <Target className="size-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Construct Scope</span>
          </div>
          <div className="text-sm font-bold text-[#F1F5F9] font-mono">84 Questions</div>
          <div className="text-[10px] text-[#5C6675]">10 placement modules</div>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded p-3 space-y-1">
          <div className="text-[11px] font-mono text-[#8E98A8] flex items-center gap-1.5 uppercase">
            <Layers className="size-3.5 text-[#10B981]" aria-hidden="true" />
            <span>Evaluated Scope</span>
          </div>
          <div className="text-sm font-bold text-[#F1F5F9] font-mono">10 Domains</div>
          <div className="text-[10px] text-[#5C6675]">Projects in Project Lab</div>
        </div>

        <div className="bg-[#14171D] border border-[#262D38] rounded p-3 space-y-1">
          <div className="text-[11px] font-mono text-[#8E98A8] flex items-center gap-1.5 uppercase">
            <ShieldCheck className="size-3.5 text-[#EAB308]" aria-hidden="true" />
            <span>Evaluation</span>
          </div>
          <div className="text-sm font-bold text-[#EAB308] font-mono">Deterministic</div>
          <div className="text-[10px] text-[#5C6675]">Zero LLM grading</div>
        </div>
      </div>
    </header>
  );
};
