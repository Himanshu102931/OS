import React from 'react';
import { Shield, GitFork, Activity } from 'lucide-react';

export const AssessmentCalibrationPanel: React.FC = () => {
  return (
    <section
      aria-labelledby="calibration-policy-heading"
      className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-4 text-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#38BDF8] font-semibold">
          <Activity className="size-4" aria-hidden="true" />
          <h2 id="calibration-policy-heading" className="text-xs uppercase tracking-wider text-[#F1F5F9]">
            Subsystem Grounding &amp; Calibration Architecture
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
          Dual Readiness Isolation
        </span>
      </div>

      <p className="text-[#8E98A8] leading-relaxed">
        PlacementOS maintains a strict separation between <strong className="text-[#F1F5F9]">Standardized Diagnostic Capability</strong> and <strong className="text-[#F1F5F9]">Longitudinal Working Readiness</strong>. Diagnostic responses emit evidence tagged with <code className="font-mono text-[#38BDF8]">sourceType: &apos;test&apos;</code>.
      </p>

      {/* Downstream Flow Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono pt-1">
        <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
          <div className="text-[10px] text-[#8E98A8] uppercase">Step 1: Test Intake</div>
          <div className="text-[#F1F5F9] font-bold text-xs">84 Item Responses</div>
          <div className="text-[10px] text-[#5C6675]">Chance-corrected scoring</div>
        </div>

        <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
          <div className="text-[10px] text-[#8E98A8] uppercase">Step 2: Diagnosis</div>
          <div className="text-[#EAB308] font-bold text-xs">Ability &amp; Levels (0–5)</div>
          <div className="text-[10px] text-[#5C6675]">Weakness taxonomies</div>
        </div>

        <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
          <div className="text-[10px] text-[#8E98A8] uppercase">Step 3: Multipliers</div>
          <div className="text-[#10B981] font-bold text-xs">Plan Emphasis</div>
          <div className="text-[10px] text-[#5C6675]">1.3× priority · 1.5× review</div>
        </div>

        <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
          <div className="text-[10px] text-[#8E98A8] uppercase">Step 4: Calibration</div>
          <div className="text-[#38BDF8] font-bold text-xs">Sunday Mini-Tests</div>
          <div className="text-[10px] text-[#5C6675]">60/20/20 weekly loop</div>
        </div>
      </div>

      {/* Invariants Protection Notice */}
      <div className="bg-[#1B2028]/60 p-3.5 rounded border border-[#262D38] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2 text-[#CBD5E1]">
          <Shield className="size-4 text-[#10B981] shrink-0" aria-hidden="true" />
          <span>
            Diagnostic testing <strong className="text-[#F1F5F9]">never mutates</strong> DSA Leitner boxes or ordinary practice ladder rungs. Working readiness is advanced solely through demonstrated practice attempts.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[#8E98A8]">
          <GitFork className="size-3.5" aria-hidden="true" />
          <span>Conservative Arbitration</span>
        </div>
      </div>
    </section>
  );
};
