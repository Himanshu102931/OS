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
        className="diagnostic-sweep bg-surface-panel border border-border rounded-md p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-info font-bold flex items-center gap-1.5">
                <Briefcase className="size-4" aria-hidden="true" />
                <span>Company / Role Overlay (§28)</span>
              </span>
              {companyAssessmentOverlayResult ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-info/20 text-info border border-info/40">
                  Overlay Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-muted-foreground border border-border">
                  General Profile (Authoritative)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Evaluate readiness against target role requirements without forking or replacing your authoritative capability profile.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="company-overlay-select" className="text-xs text-muted-foreground whitespace-nowrap">
              Select Target Company:
            </label>
            <select
              id="company-overlay-select"
              aria-label="Select Target Company"
              value={selectedCompanyOverlayId ?? ''}
              onChange={(e) => onSelectCompanyOverlay(e.target.value ? e.target.value : null)}
              className="bg-surface-elevated border border-border text-foreground text-xs rounded px-3 py-1.5 focus:outline-none focus:border-info cursor-pointer"
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
          <div className="pt-2 border-t border-border/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {companyAssessmentOverlayResult.companyName} Target Company Overlay
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{companyAssessmentOverlayResult.targetRole}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-muted-foreground border border-border">
                  v{companyAssessmentOverlayResult.overlayVersion}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40">
                  Enterprise Systems Tier
                </span>
              </div>
              <span className="text-[10px] font-mono text-secondary">
                Provenance: {companyAssessmentOverlayResult.provenance}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-surface-elevated p-3 rounded border border-border">
                <div className="text-muted-foreground text-[10px]">Role Readiness</div>
                <div className="text-base font-bold text-info mt-0.5">
                  {companyAssessmentOverlayResult.rolePreparationScore}%
                </div>
                <div className="text-[10px] text-secondary">Weighted required domains</div>
              </div>
              <div className="bg-surface-elevated p-3 rounded border border-border">
                <div className="text-muted-foreground text-[10px]">Required Domains</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {companyAssessmentOverlayResult.metDomainsCount} / {companyAssessmentOverlayResult.requiredDomainsCount} Met
                </div>
                <div className="text-[10px] text-secondary">Target levels reached</div>
              </div>
              <div className="bg-surface-elevated p-3 rounded border border-border">
                <div className="text-muted-foreground text-[10px]">Open Gaps</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {companyAssessmentOverlayResult.gapDomainsCount} Domains
                </div>
                <div className="text-[10px] text-secondary">Below role threshold</div>
              </div>
              <div className="bg-surface-elevated p-3 rounded border border-border">
                <div className="text-muted-foreground text-[10px]">General Ability</div>
                <div className="text-base font-bold text-success mt-0.5">
                  {companyAssessmentOverlayResult.generalOverallAbility} / 100
                </div>
                <div className="text-[10px] text-secondary">Authoritative base</div>
              </div>
            </div>

            {companyAssessmentOverlayResult.topRoleGaps.length > 0 && (
              <div className="bg-surface-elevated p-3 rounded border border-amber-900/30 space-y-1.5">
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

            <div className="text-[11px] text-secondary italic">
              Note: General capability profile remains authoritative. Role overlays never overwrite stored levels or evidence logs.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-surface-elevated rounded border border-border text-xs text-muted-foreground italic">
            Select a target company to evaluate baseline diagnostic readiness against verified role thresholds.
          </div>
        )}
      </div>

      {/* Initial Adaptive Plan Inputs (§26.1) */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Compass className="size-4 text-action-accent" aria-hidden="true" />
            <span>Initial Adaptive Plan Inputs (§26.1)</span>
          </h3>
          <span className="text-xs text-muted-foreground">Personalized Starting Points &amp; Multipliers</span>
        </div>

        {/* Starting Points Table */}
        <div className="bg-surface-panel border border-border rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-surface-elevated/60 border-b border-border flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ListOrdered className="size-3.5 text-action-accent" aria-hidden="true" />
              <span>Recommended Starting Sequence (Priority Ranked)</span>
            </span>
            <span className="text-muted-foreground font-mono">11 Domains</span>
          </div>

          <div className="divide-y divide-border/60 text-xs">
            {planInputs.startingPoints.map((sp: InitialPlanStartingPoint) => {
              const emphasis = planInputs.domainEmphases[sp.domainId as DomainId];
              return (
                <div
                  key={sp.domainId}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-elevated/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded flex items-center justify-center font-mono text-[11px] bg-surface-elevated text-action-accent border border-border shrink-0 mt-0.5 font-bold">
                      #{sp.priorityRank}
                    </span>
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-foreground">
                        {sp.domainId} · <span className="text-foreground font-normal">{sp.topicName}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{sp.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-foreground capitalize">
                      Ladder: {sp.recommendedDifficulty}
                    </span>
                    <span className="text-muted-foreground">
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
        <div className="bg-surface-panel border border-border rounded-md p-5 space-y-3">
          <div className="flex items-center gap-2 text-action-accent">
            <Layers className="size-4" aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Strategic Plan Emphasis Multipliers (§26.1)
            </h4>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            The diagnostic assessment adjusts topic priority and review frequency multipliers within the existing curriculum without rewriting master phases or tasks:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 font-mono">
            <div className="bg-surface-elevated p-3 rounded border border-border space-y-1">
              <div className="text-danger font-semibold">Weak Domains (&lt;40 or errors)</div>
              <div className="text-foreground font-bold">1.5× Review Frequency</div>
              <div className="text-[11px] text-muted-foreground">1.3× Task Priority Multiplier</div>
            </div>
            <div className="bg-surface-elevated p-3 rounded border border-border space-y-1">
              <div className="text-accent font-semibold">Intermediate (Level 3)</div>
              <div className="text-foreground font-bold">1.2× Review Frequency</div>
              <div className="text-[11px] text-muted-foreground">1.1× Task Priority Multiplier</div>
            </div>
            <div className="bg-surface-elevated p-3 rounded border border-border space-y-1">
              <div className="text-success font-semibold">Mastered (Level 4–5)</div>
              <div className="text-foreground font-bold">1.0× Routine Spaced Repetition</div>
              <div className="text-[11px] text-muted-foreground">0.85× Normal Retention Priority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosed Weaknesses & Confirmed Strengths Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Diagnosed Weakness Signals */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-400" aria-hidden="true" />
            <span>Diagnosed Weakness Signals ({weaknesses.length})</span>
          </h3>

          {weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-surface-panel border border-amber-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
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
                  <div className="text-foreground text-[11px] leading-relaxed">
                    {ws.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-panel border border-border rounded-md p-5 text-xs text-muted-foreground">
              No critical weakness signals detected.
            </div>
          )}
        </div>

        {/* Confirmed Strengths */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="size-4 text-success" aria-hidden="true" />
            <span>Demonstrated Strengths ({strengths.length})</span>
          </h3>

          {strengths.length > 0 ? (
            <div className="space-y-2.5">
              {strengths.map((st) => (
                <div
                  key={st.domainId}
                  className="bg-surface-panel border border-emerald-900/30 rounded-md p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold uppercase tracking-wider text-emerald-300">
                      {st.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      Level {st.level} · {st.abilityScore}/100
                    </span>
                  </div>
                  <div className="text-foreground text-[11px] leading-relaxed">
                    {st.summary}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-panel border border-border rounded-md p-5 text-xs text-muted-foreground">
              No domains reached Job Ready (Level 4) or Strong (Level 5) in this baseline. Focus on the starting sequence to build core capabilities.
            </div>
          )}
        </div>
      </div>

      {/* Skills Subsystem Integration & Dual Readiness Notice (§24) */}
      <div className="bg-surface-panel border border-border rounded-md p-5 space-y-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-info font-medium">
          <Activity className="size-4" aria-hidden="true" />
          <span>Diagnostic Benchmark vs Company Readiness — Dual Readiness Integration (§24 Precedence &amp; Conflict Rules)</span>
        </div>
        <p className="leading-relaxed text-foreground">
          PlacementOS maintains a strict separation between <strong>Standardized Diagnostic Capability</strong> (this baseline profile) and <strong>Longitudinal Working Readiness</strong> (from daily practice and task completions in the Skills Matrix). Assessment diagnostics provide empirical capability evidence for the broader PlacementOS system. Downstream scheduling conservatively respects the more conservative of the two so that fundamental concepts are never skipped. Diagnostic evidence is logged with <code className="font-mono text-info">sourceType: &apos;test&apos;</code> and never mutates DSA-150 mastery or Leitner intervals.
        </p>
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onNavigateRoute('skills')}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-surface-elevated text-foreground border border-border hover:bg-border transition-colors cursor-pointer"
          >
            Inspect Skills Matrix
          </button>
          <button
            onClick={() => onNavigateRoute('preparation')}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-surface-elevated text-foreground border border-border hover:bg-border transition-colors cursor-pointer"
          >
            Go to Preparation Hub
          </button>
        </div>
      </div>

      {/* Phase G: Calibration Instrumentation Informational Card (§9.4 / DECIDED 6) */}
      <div className="bg-surface-panel border border-border rounded-md p-5 space-y-3 text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-action-accent font-semibold">
            <Compass className="size-4" aria-hidden="true" />
            <span>Calibration Instrumentation (§9.4 / DECIDED 6 Groundwork)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-muted-foreground border border-border">
            Empirical Calibration: Inactive (V1 Deterministic)
          </span>
        </div>
        <p className="leading-relaxed text-foreground">
          PlacementOS records granular item response latency, accuracy, and error categories for prospective psychometric calibration. In accordance with DECIDED 6, empirical calibration remains inactive until single-item sample volumes reach &ge; 200 responses across &ge; 50 distinct attempts. <strong>Authored difficulty weights remain strictly authoritative.</strong>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono pt-1">
          <div className="bg-surface-elevated p-3 rounded border border-border">
            <div className="text-[10px] text-muted-foreground">Recorded Observations</div>
            <div className="text-sm font-bold text-info mt-0.5">
              {assessmentState?.calibrationObservations?.length ?? 0}
            </div>
            <div className="text-[10px] text-secondary">Item response records</div>
          </div>
          <div className="bg-surface-elevated p-3 rounded border border-border">
            <div className="text-[10px] text-muted-foreground">Scoring Engine</div>
            <div className="text-sm font-bold text-success mt-0.5">
              Authored Difficulty (100%)
            </div>
            <div className="text-[10px] text-secondary">Deterministic rungs</div>
          </div>
          <div className="bg-surface-elevated p-3 rounded border border-border">
            <div className="text-[10px] text-muted-foreground">Calibration Status</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              Insufficient Data
            </div>
            <div className="text-[10px] text-secondary">Threshold: &ge;200 responses / 50 attempts</div>
          </div>
        </div>
      </div>
    </section>
  );
};
