import React from 'react';
import { ShieldAlert, Cpu, HelpCircle, Terminal, Clock, Scale } from 'lucide-react';

export const AssessmentRulesPanel: React.FC = () => {
  return (
    <section aria-labelledby="rules-guarantees-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="size-4 text-[#EAB308]" aria-hidden="true" />
        <h2 id="rules-guarantees-heading" className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
          Standardized Scoring & Diagnostic Guarantees
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
        {/* Rule 1: Zero LLM / Pure Determinism */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#EAB308] font-semibold">
            <Cpu className="size-4 shrink-0" aria-hidden="true" />
            <span>Zero LLM / Pure Determinism</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            All 84 items evaluate via authored objective keys, syntax AST normalization, or test assertions. Scoring is 100% deterministic and reproducible.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            Difficulty weights: 0.8× (E) · 1.0× (M) · 1.3× (H) · 1.7× (VH)
          </div>
        </div>

        {/* Rule 2: Mathematical Chance Correction */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#38BDF8] font-semibold">
            <Scale className="size-4 shrink-0" aria-hidden="true" />
            <span>Mathematical Chance Correction</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            Multiple-choice items apply psychometric correction: <code className="font-mono text-[#38BDF8]">c' = (c - 1/k) / (1 - 1/k)</code>. Random guessing produces 0 credit.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            Guards capability estimates against luck
          </div>
        </div>

        {/* Rule 3: Honest "I Don't Know" Behavior */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#10B981] font-semibold">
            <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>Honest &ldquo;I Don&rsquo;t Know&rdquo; Behavior</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            Flagging an item as unknown assigns 0 credit without a guessing penalty, tagging the taxonomy as <code className="font-mono text-[#10B981]">knowledge_gap</code>.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            Distinguishes lack of knowledge from bad guesses
          </div>
        </div>

        {/* Rule 4: Sandboxed Code & SQL Matching */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#EAB308] font-semibold">
            <Terminal className="size-4 shrink-0" aria-hidden="true" />
            <span>Sandboxed Code &amp; SQL Normalization</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            Python and SQL items execute in isolated client sandboxes against hidden unit tests and normalized relational query fixtures.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            Automated test assertions with ms execution latency
          </div>
        </div>

        {/* Rule 5: Hard Wall-Clock Limit */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#F59E0B] font-semibold">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            <span>Hard 180m Wall-Clock Limit</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            The timer cannot be paused. When the 180-minute countdown reaches zero, your responses are auto-submitted and permanently sealed to storage.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            160m assessed content budget + 20m buffer
          </div>
        </div>

        {/* Rule 6: Immutable Diagnostic Seal */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#D05A52] font-semibold">
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>Immutable Assessment Record</span>
          </div>
          <p className="text-[#8E98A8] leading-relaxed">
            Submitted baseline results create an unalterable capability snapshot. Subsequent progression is tracked via Sunday mini-tests and full reassessments.
          </p>
          <div className="text-[11px] font-mono text-[#5C6675] pt-1 border-t border-[#262D38]/60">
            Provisional levels require ≥ 2 consistent observations
          </div>
        </div>
      </div>
    </section>
  );
};
