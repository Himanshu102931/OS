import React from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Briefcase,
  Compass,
  ListOrdered,
  Layers,
  Activity,
} from 'lucide-react';
import type {
  CompanyOverlay,
  CompanyAssessmentOverlayResult,
  AssessmentState,
  DomainId,
} from '../../types';
import type {
  DomainWeakness,
  DomainStrength,
  AssessmentPlanInputs,
  InitialPlanStartingPoint,
} from '../../engine/assessmentEngine';

interface AssessmentWeaknessOverlayProps {
  weaknesses: DomainWeakness[];
  strengths: DomainStrength[];
  planInputs: AssessmentPlanInputs;
  companyOverlays?: CompanyOverlay[];
  selectedCompanyOverlayId: string | null;
  companyAssessmentOverlayResult?: CompanyAssessmentOverlayResult;
  assessmentState?: AssessmentState;
  onSelectCompanyOverlay: (id: string | null) => void;
  onNavigateRoute: (route: string) => void;
}

export const AssessmentWeaknessOverlay: React.FC<AssessmentWeaknessOverlayProps> = ({
  weaknesses,
  strengths,
  planInputs,
  companyOverlays,
  selectedCompanyOverlayId,
  companyAssessmentOverlayResult,
  assessmentState,
  onSelectCompanyOverlay,
  onNavigateRoute,
}) => {
  return (
    <section aria-label="Weakness Taxonomy and Company Role Overlay" className="space-y-8">
      {/* Target Company / Role Overlay (§28) */}
      <div
        data-testid="company-role-overlay-lab"
        className="diagnostic-sweep bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8] font-bold flex items-center gap-1.5">
                <Briefcase className="size-4" aria-hidden="true" />
                <span>Company / Role Overlay (§28)</span>
              </span>
              {companyAssessmentOverlayResult ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
                  Overlay Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                  General Profile (Authoritative)
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E98A8] max-w-2xl leading-relaxed">
              Evaluate readiness against target role requirements without forking or replacing your authoritative capability profile.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="company-overlay-select" className="text-xs text-[#8E98A8] whitespace-nowrap">
              Select Target Company:
            </label>
            <select
              id="company-overlay-select"
              aria-label="Select Target Company"
              value={selectedCompanyOverlayId ?? ''}
              onChange={(e) => onSelectCompanyOverlay(e.target.value ? e.target.value : null)}
              className="bg-[#1B2028] border border-[#262D38] text-[#F1F5F9] text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#38BDF8] cursor-pointer"
            >
              <option value="">None (General Capability Profile)</option>
              {(companyOverlays || []).map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.companyName} — {comp.targetRole}
                </option>
              ))}
            </select>
          </div>
        </div>

        {companyAssessmentOverlayResult ? (
          <div className="pt-2 border-t border-[#262D38]/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F1F5F9]">
                  {companyAssessmentOverlayResult.companyName} Target Company Overlay
                </span>
                <span className="text-[#8E98A8]">·</span>
                <span className="text-[#CBD5E1]">{companyAssessmentOverlayResult.targetRole}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
                  v{companyAssessmentOverlayResult.overlayVersion}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40">
                  Enterprise Systems Tier
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#5C6675]">
                Provenance: {companyAssessmentOverlayResult.provenance}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[10px]">Role Readiness</div>
                <div className="text-base font-bold text-[#38BDF8] mt-0.5">
                  {companyAssessmentOverlayResult.rolePreparationScore}%
                </div>
                <div className="text-[10px] text-[#5C6675]">Weighted required domains</div>
              </div>
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[10px]">Required Domains</div>
                <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                  {companyAssessmentOverlayResult.metDomainsCount} / {companyAssessmentOverlayResult.requiredDomainsCount} Met
                </div>
                <div className="text-[10px] text-[#5C6675]">Target levels reached</div>
              </div>
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[10px]">Open Gaps</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {companyAssessmentOverlayResult.gapDomainsCount} Domains
                </div>
                <div className="text-[10px] text-[#5C6675]">Below role threshold</div>
              </div>
              <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
                <div className="text-[#8E98A8] text-[10px]">General Ability</div>
                <div className="text-base font-bold text-[#10B981] mt-0.5">
                  {companyAssessmentOverlayResult.generalOverallAbility} / 100
                </div>
                <div className="text-[10px] text-[#5C6675]">Authoritative base</div>
              </div>
            </div>

            {companyAssessmentOverlayResult.topRoleGaps.length > 0 && (
              <div className="bg-[#1B2028] p-3 rounded border border-amber-900/30 space-y-1.5">
                <div className="text-[11px] font-semibold text-amber-300">
                  Top Role Priority Gaps for {companyAssessmentOverlayResult.companyName}:
                </div>
                <div className="flex flex-wrap gap-2">
                  {companyAssessmentOverlayResult.topRoleGaps.map((gap) => (
                    <span
                      key={gap.domainId}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40"
                    >
                      {gap.domainName}: Level {gap.currentLevel} &rarr; Target L{gap.targetLevel} (Gap: {gap.gap})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-[#5C6675] italic">
              Note: General capability profile remains authoritative. Role overlays never overwrite stored levels or evidence logs.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#1B2028] rounded border border-[#262D38] text-xs text-[#8E98A8] italic">
            Select a target company to evaluate baseline diagnostic readiness against verified role thresholds.
          </div>
        )}
      </div>

      {/* Initial Adaptive Plan Inputs (§26.1) */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
            <Compass className="size-4 text-[#EAB308]" aria-hidden="true" />
            <span>Initial Adaptive Plan Inputs (§26.1)</span>
          </h3>
          <span className="text-xs text-[#8E98A8]">Personalized Starting Points &amp; Multipliers</span>
        </div>

        {/* Starting Points Table */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#1B2028]/60 border-b border-[#262D38] flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5">
              <ListOrdered className="size-3.5 text-[#EAB308]" aria-hidden="true" />
              <span>Recommended Starting Sequence (Priority Ranked)</span>
            </span>
            <span className="text-[#8E98A8] font-mono">11 Domains</span>
          </div>

          <div className="divide-y divide-[#262D38]/60 text-xs">
            {planInputs.startingPoints.map((sp: InitialPlanStartingPoint) => {
              const emphasis = planInputs.domainEmphases[sp.domainId as DomainId];
              return (
                <div
                  key={sp.domainId}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1B2028]/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded flex items-center justify-center font-mono text-[11px] bg-[#1B2028] text-[#EAB308] border border-[#262D38] shrink-0 mt-0.5 font-bold">
                      #{sp.priorityRank}
                    </span>
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-[#F1F5F9]">
                        {sp.domainId} · <span className="text-[#CBD5E1] font-normal">{sp.topicName}</span>
                      </div>
                      <div className="text-[11px] text-[#8E98A8] mt-0.5">{sp.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#1B2028] border border-[#262D38] text-[#CBD5E1] capitalize">
                      Ladder: {sp.recommendedDifficulty}
                    </span>
                    <span className="text-[#8E98A8]">
                      {emphasis && emphasis.reviewFrequencyMultiplier > 1.0
                        ? '1.5x review density'
                        : '1.0x standard'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategic Frequency & Priority Adjustments Card */}
        <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#EAB308]">
            <Layers className="size-4" aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Strategic Plan Emphasis Multipliers (§26.1)
            </h4>
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            The diagnostic assessment adjusts topic priority and review frequency multipliers within the existing curriculum without rewriting master phases or tasks:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 font-mono">
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
              <div className="text-[#E55353] font-semibold">Weak Domains (&lt;40 or errors)</div>
              <div className="text-[#F1F5F9] font-bold">1.5× Review Frequency</div>
              <div className="text-[11px] text-[#8E98A8]">1.3× Task Priority Multiplier</div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
              <div className="text-[#FFC665] font-semibold">Intermediate (Level 3)</div>
              <div className="text-[#F1F5F9] font-bold">1.2× Review Frequency</div>
              <div className="text-[11px] text-[#8E98A8]">1.1× Task Priority Multiplier</div>
            </div>
            <div className="bg-[#1B2028] p-3 rounded border border-[#262D38] space-y-1">
              <div className="text-[#4EAE79] font-semibold">Mastered (Level 4–5)</div>
              <div className="text-[#F1F5F9] font-bold">1.0× Routine Spaced Repetition</div>
              <div className="text-[11px] text-[#8E98A8]">0.85× Normal Retention Priority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosed Weaknesses & Confirmed Strengths Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Diagnosed Weakness Signals */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-400" aria-hidden="true" />
            <span>Diagnosed Weakness Signals ({weaknesses.length})</span>
          </h3>

          {weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-[#14171D] border border-amber-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold uppercase tracking-wider text-amber-300">
                      {ws.domainId} · {ws.competency}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        {ws.strength === 3
                          ? 'High Priority (3 Occurrences)'
                          : ws.strength === 2
                          ? 'Medium Priority (2 Occurrences)'
                          : 'Low Priority (1 Occurrence)'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        Taxonomy: {ws.errorCategory}
                      </span>
                    </div>
                  </div>
                  <div className="text-[#CBD5E1] text-[11px] leading-relaxed">
                    {ws.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 text-xs text-[#8E98A8]">
              No critical weakness signals detected.
            </div>
          )}
        </div>

        {/* Confirmed Strengths */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
            <TrendingUp className="size-4 text-[#10B981]" aria-hidden="true" />
            <span>Demonstrated Strengths ({strengths.length})</span>
          </h3>

          {strengths.length > 0 ? (
            <div className="space-y-2.5">
              {strengths.map((st) => (
                <div
                  key={st.domainId}
                  className="bg-[#14171D] border border-emerald-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold uppercase tracking-wider text-emerald-300">
                      {st.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      Level {st.level} · {st.abilityScore}/100
                    </span>
                  </div>
                  <div className="text-[#CBD5E1] text-[11px] leading-relaxed">
                    {st.summary}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 text-xs text-[#8E98A8]">
              No domains reached Job Ready (Level 4) or Strong (Level 5) in this baseline. Focus on the starting sequence to build core capabilities.
            </div>
          )}
        </div>
      </div>

      {/* Skills Subsystem Integration & Dual Readiness Notice (§24) */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-2.5 text-xs text-[#8E98A8]">
        <div className="flex items-center gap-2 text-[#38BDF8] font-medium">
          <Activity className="size-4" aria-hidden="true" />
          <span>Diagnostic Benchmark vs Company Readiness — Dual Readiness Integration (§24 Precedence &amp; Conflict Rules)</span>
        </div>
        <p className="leading-relaxed text-[#CBD5E1]">
          PlacementOS maintains a strict separation between <strong>Standardized Diagnostic Capability</strong> (this baseline profile) and <strong>Longitudinal Working Readiness</strong> (from daily practice and task completions in the Skills Matrix). Assessment diagnostics provide empirical capability evidence for the broader PlacementOS system. Downstream scheduling conservatively respects the more conservative of the two so that fundamental concepts are never skipped. Diagnostic evidence is logged with <code className="font-mono text-[#38BDF8]">sourceType: &apos;test&apos;</code> and never mutates DSA-150 mastery or Leitner intervals.
        </p>
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onNavigateRoute('skills')}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] hover:bg-[#262D38] transition-colors cursor-pointer"
          >
            Inspect Skills Matrix
          </button>
          <button
            onClick={() => onNavigateRoute('preparation')}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] hover:bg-[#262D38] transition-colors cursor-pointer"
          >
            Go to Preparation Hub
          </button>
        </div>
      </div>

      {/* Phase G: Calibration Instrumentation Informational Card (§9.4 / DECIDED 6) */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-md p-5 space-y-3 text-xs text-[#8E98A8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#EAB308] font-semibold">
            <Compass className="size-4" aria-hidden="true" />
            <span>Calibration Instrumentation (§9.4 / DECIDED 6 Groundwork)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2028] text-[#8E98A8] border border-[#262D38]">
            Empirical Calibration: Inactive (V1 Deterministic)
          </span>
        </div>
        <p className="leading-relaxed text-[#CBD5E1]">
          PlacementOS records granular item response latency, accuracy, and error categories for prospective psychometric calibration. In accordance with DECIDED 6, empirical calibration remains inactive until single-item sample volumes reach &ge; 200 responses across &ge; 50 distinct attempts. <strong>Authored difficulty weights remain strictly authoritative.</strong>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono pt-1">
          <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
            <div className="text-[10px] text-[#8E98A8]">Recorded Observations</div>
            <div className="text-sm font-bold text-[#38BDF8] mt-0.5">
              {assessmentState?.calibrationObservations?.length ?? 0}
            </div>
            <div className="text-[10px] text-[#5C6675]">Item response records</div>
          </div>
          <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
            <div className="text-[10px] text-[#8E98A8]">Scoring Engine</div>
            <div className="text-sm font-bold text-[#10B981] mt-0.5">
              Authored Difficulty (100%)
            </div>
            <div className="text-[10px] text-[#5C6675]">Deterministic rungs</div>
          </div>
          <div className="bg-[#1B2028] p-3 rounded border border-[#262D38]">
            <div className="text-[10px] text-[#8E98A8]">Calibration Status</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              Insufficient Data
            </div>
            <div className="text-[10px] text-[#5C6675]">Threshold: &ge;200 responses / 50 attempts</div>
          </div>
        </div>
      </div>
    </section>
  );
};
