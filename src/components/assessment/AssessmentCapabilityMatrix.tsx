import React, { useState, useMemo } from 'react';
import { Target, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { CompanyAssessmentOverlayResult, AssessmentState, DomainId } from '../../types';
import type { DomainAssessmentProfile } from '../../engine/assessmentEngine';
import { BASELINE_ASSESSMENT_ITEMS } from '../../data/assessment/items';

interface AssessmentCapabilityMatrixProps {
  domainProfiles: DomainAssessmentProfile[];
  companyAssessmentOverlayResult?: CompanyAssessmentOverlayResult;
  assessmentState?: AssessmentState;
  onOpenProjectLab: () => void;
  onNavigateTarget?: (route: string, targetId?: string) => void;
}

const DOMAIN_ACTIONS: Record<DomainId, { title: string; route: string; targetId?: string }> = {
  aptitude: { title: 'Quantitative & Logical Reasoning Workspace', route: 'preparation', targetId: 'prep-apt-quant' },
  dsa: { title: 'DSA Spaced Repetition Problem Bank', route: 'dsa' },
  python: { title: 'Python Syntax & Execution Lab', route: 'preparation', targetId: 'prep-lang' },
  sql: { title: 'SQL & Relational Queries Workspace', route: 'preparation', targetId: 'prep-sql' },
  dbms: { title: 'Database Systems & Architecture Concepts', route: 'preparation', targetId: 'prep-dbms' },
  oop: { title: 'Object-Oriented Design & Modeling', route: 'preparation', targetId: 'prep-oop' },
  os: { title: 'OS Concurrency & Systems Internals', route: 'preparation', targetId: 'prep-os' },
  cn: { title: 'Computer Networks Protocols Lab', route: 'preparation', targetId: 'prep-cn' },
  communication: { title: 'Professional Written Communication', route: 'preparation', targetId: 'prep-comm' },
  interviews: { title: 'Technical Interview Defense', route: 'preparation', targetId: 'prep-interview-tech' },
  projects: { title: 'Engineering Project Lab', route: 'project' },
};

export const AssessmentCapabilityMatrix: React.FC<AssessmentCapabilityMatrixProps> = ({
  domainProfiles,
  companyAssessmentOverlayResult,
  assessmentState,
  onOpenProjectLab,
  onNavigateTarget,
}) => {
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);

  const toggleDomain = (domainId: string) => {
    setExpandedDomainId((prev) => (prev === domainId ? null : domainId));
  };

  const responseMap = useMemo(() => {
    const map = new Map<string, { result: string; response: number | string }>();
    if (!assessmentState?.responses) return map;
    for (const resp of assessmentState.responses) {
      map.set(resp.itemId, { result: resp.result, response: resp.response });
    }
    return map;
  }, [assessmentState]);

  const classAProfiles = domainProfiles.filter((d) => d.category === 'Class A');
  const classBProfiles = domainProfiles.filter((d) => d.category === 'Class B');
  const classCProfile = domainProfiles.find((d) => d.category === 'Class C');

  const renderDomainCard = (dp: DomainAssessmentProfile) => {
    const roleReadiness = companyAssessmentOverlayResult?.domainReadiness.find(
      (d) => d.domainId === dp.domainId
    );

    const domainItems = BASELINE_ASSESSMENT_ITEMS.filter((i) => i.domainId === dp.domainId);
    let correctCount = 0;
    let incorrectCount = 0;
    let dontKnowCount = 0;
    let unansweredCount = 0;

    for (const item of domainItems) {
      const resp = responseMap.get(item.id);
      if (!resp || resp.result === 'unanswered') {
        unansweredCount++;
      } else if (resp.result === 'correct') {
        correctCount++;
      } else if (resp.result === 'incorrect') {
        incorrectCount++;
      } else if (resp.result === 'dont_know') {
        dontKnowCount++;
      }
    }

    const evaluatedCount = domainItems.length - unansweredCount;
    const isExpanded = expandedDomainId === dp.domainId;
    const domainWeaknesses = (assessmentState?.weaknessSignals || []).filter(
      (ws) => ws.domainId === dp.domainId && ws.status !== 'resolved'
    );
    const domainAction = DOMAIN_ACTIONS[dp.domainId];

    return (
      <div
        key={dp.domainId}
        data-testid={`capability-row-${dp.domainId}`}
        className="diagnostic-sweep bg-surface-panel border border-border rounded-md p-4 space-y-3 shadow-sm hover:border-border-active transition-colors flex flex-col justify-between"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {dp.domainId.toUpperCase()}
              </div>
              <div className="text-[11px] text-foreground font-medium">{dp.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{dp.levelLabel}</div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {dp.recentSignal === 'regression' && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/40"
                  title={dp.recentSignalReason}
                >
                  Regressed
                </span>
              )}
              {dp.recentSignal === 'confirmation' && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                  title={dp.recentSignalReason}
                >
                  Confirmed
                </span>
              )}
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  dp.provisional
                    ? 'bg-surface-elevated text-amber-300 border-amber-800/40'
                    : 'bg-surface-elevated text-emerald-300 border-emerald-800/40'
                }`}
              >
                {dp.provisional ? 'Provisional' : 'Confirmed'}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  dp.confidence === 'high'
                    ? 'bg-surface-elevated text-emerald-400 border-emerald-800/40'
                    : dp.confidence === 'medium'
                    ? 'bg-surface-elevated text-amber-400 border-amber-800/40'
                    : 'bg-surface-elevated text-muted-foreground border-border'
                }`}
              >
                Conf: {dp.confidence.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Ability Score Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Demonstrated Ability</span>
              <span className="font-mono text-foreground font-semibold">
                {dp.status === 'unassessed' ? 'Unassessed' : `${dp.abilityScore}% Ability`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${dp.name || dp.domainId} Demonstrated Ability`}
              aria-valuenow={dp.abilityScore}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 bg-surface-elevated rounded-full overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  dp.abilityScore >= 65
                    ? 'bg-success'
                    : dp.abilityScore >= 40
                    ? 'bg-action-accent'
                    : dp.abilityScore > 0
                    ? 'bg-danger'
                    : 'bg-transparent'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, dp.abilityScore))}%` }}
              />
            </div>
          </div>

          {/* Raw Response Performance Metric Strip */}
          {dp.category !== 'Class C' && domainItems.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                Raw Evaluation Counts
              </div>
              <div
                className="grid grid-cols-3 gap-1.5 text-[11px] font-mono"
                data-testid={`raw-counts-${dp.domainId}`}
              >
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated/70 border border-border">
                  <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-bold">{correctCount}</span>
                  <span className="text-muted-foreground text-[10px]">Correct</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated/70 border border-border">
                  <span className="size-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                  <span className="text-rose-400 font-bold">{incorrectCount}</span>
                  <span className="text-muted-foreground text-[10px]">Incorrect</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated/70 border border-border">
                  <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  <span className="text-amber-400 font-bold">{dontKnowCount}</span>
                  <span className="text-muted-foreground text-[10px]">Don&apos;t Know</span>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Coverage & Weaknesses Row */}
          {dp.category !== 'Class C' && domainItems.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
              <span>
                Coverage: {evaluatedCount}/{domainItems.length} items
              </span>
              <span>
                {domainWeaknesses.length > 0 ? (
                  <span className="text-amber-400 font-medium">
                    {domainWeaknesses.length} weakness{domainWeaknesses.length > 1 ? 'es' : ''}
                  </span>
                ) : (
                  <span className="text-emerald-400">0 weaknesses</span>
                )}
              </span>
            </div>
          )}

          {/* Construct Scope Note if present */}
          {dp.constructScopeNote && (
            <div className="text-[10px] text-secondary leading-snug border-l-2 border-border pl-2">
              {dp.constructScopeNote}
            </div>
          )}

          {/* Target Company Requirement Indicator if active */}
          {roleReadiness && (
            <div className="p-2 rounded bg-surface-elevated border border-border text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">Target Requirement:</span>
              <span
                className={
                  roleReadiness.status === 'met'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-amber-400 font-semibold'
                }
              >
                {roleReadiness.status === 'met'
                  ? `Met (L${roleReadiness.roleTargetLevel})`
                  : `Target L${roleReadiness.roleTargetLevel} (Gap: -${roleReadiness.gap})`}
              </span>
            </div>
          )}

          {/* Weakness Signals List if present */}
          {domainWeaknesses.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                Identified Weaknesses:
              </div>
              <div className="flex flex-wrap gap-1">
                {domainWeaknesses.map((ws, wIdx) => (
                  <span
                    key={`${ws.id}-${wIdx}`}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/30 text-amber-300 border border-amber-800/40 font-mono"
                  >
                    {ws.competency || ws.errorCategory}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Action */}
          {domainAction && onNavigateTarget && (
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
              <span className="text-[11px] text-foreground font-medium truncate" title={domainAction.title}>
                {domainAction.title}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTarget(domainAction.route, domainAction.targetId)}
                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-action-accent text-action-accent-foreground hover:bg-action-accent-hover transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
                aria-label={`Start recommended action for ${dp.name}`}
              >
                <span>Start</span>
                <ArrowRight className="size-3" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Inspect Evaluated Questions Toggle */}
          {domainItems.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleDomain(dp.domainId)}
                aria-expanded={isExpanded}
                data-testid={`toggle-inspect-${dp.domainId}`}
                className="w-full flex items-center justify-between p-2 rounded text-[11px] font-medium bg-surface-elevated hover:bg-surface-elevated/80 text-foreground transition-colors border border-border cursor-pointer"
              >
                <span>
                  {isExpanded ? 'Hide' : 'Inspect'} Item Breakdown ({domainItems.length} items)
                </span>
                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>

              {isExpanded && (
                <div
                  className="mt-2 space-y-2 pt-2 border-t border-border max-h-72 overflow-y-auto pr-1"
                  data-testid={`item-breakdown-${dp.domainId}`}
                >
                  {domainItems.map((item, idx) => {
                    const resp = responseMap.get(item.id);
                    const result = resp?.result || 'unanswered';
                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded bg-surface-elevated/50 border border-border text-xs space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-action-accent font-bold">Q{idx + 1}.</span>
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">
                              {item.competency}
                            </span>
                            <span className="text-[9px] px-1 rounded bg-background border border-border text-secondary">
                              Band {item.difficulty}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                              result === 'correct'
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                                : result === 'incorrect'
                                ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                                : result === 'dont_know'
                                ? 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                                : 'bg-surface-elevated text-muted-foreground border-border'
                            }`}
                          >
                            {result.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-foreground text-[11px] leading-relaxed line-clamp-3">{item.prompt}</p>
                        {item.explanation && (
                          <div className="text-[10px] text-secondary border-l-2 border-border pl-2 mt-1">
                            <span className="font-semibold text-foreground">Explanation:</span> {item.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Assessment Kind and Level */}
        <div className="text-[11px] text-secondary flex items-center justify-between pt-2 border-t border-border/60 mt-3">
          <span>
            {dp.latestAssessmentKind
              ? `${
                  dp.latestAssessmentKind === 'full_reassessment'
                    ? 'Reassessment'
                    : dp.latestAssessmentKind === 'weekly_assessment'
                    ? 'Sunday Mini'
                    : 'Baseline'
                } (${dp.latestAssessmentDate?.slice(0, 10)})`
              : `Status: ${dp.status}`}
          </span>
          <span className="font-mono text-muted-foreground font-semibold">Level {dp.level}</span>
        </div>
      </div>
    );
  };

  return (
    <section
      id="diagnostic-capability-matrix"
      data-testid="diagnostic-capability-matrix"
      aria-label="Domain Capability Matrix"
      className="space-y-6 scroll-mt-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Target className="size-4 text-action-accent" aria-hidden="true" />
          <span>Domain Capability Matrix (All 11 Domains)</span>
        </h2>
        <span className="text-xs text-muted-foreground">
          Provisional Levels (0 to 5) · Ability (0–100)
        </span>
      </div>

      {/* Class A: Core Technical Domains */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span>Class A — Standard Standardized Modules</span>
          <span className="text-[10px] text-secondary font-normal">
            (Objective + algorithmic + theoretical constructs)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classAProfiles.map((dp) => renderDomainCard(dp))}
        </div>
      </div>

      {/* Class B: Partial Construct Domains */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span>Class B — Coding &amp; Execution Constructs</span>
          <span className="text-[10px] text-secondary font-normal">
            (Reasoning / practical execution / knowledge proxies)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classBProfiles.map((dp) => renderDomainCard(dp))}
        </div>
      </div>

      {/* Class C: Projects (Excluded from automated baseline) */}
      {classCProfile && (
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span>Class C — Non-Objective &amp; Extended Domain Scope</span>
            <span className="text-[10px] text-secondary font-normal">
              (Special Scope: Evidence Tracked in Project Lab)
            </span>
          </div>

          <div
            data-testid="capability-row-projects"
            className="diagnostic-sweep bg-surface-panel border border-border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  PROJECTS
                </span>
                <span className="text-xs font-semibold text-foreground">
                  · {classCProfile.name || 'Engineering Projects Portfolio'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-muted-foreground border border-border">
                  Level 0 · Unassessed · Confidence: None
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Class C Special Scope: Evidence Tracked in Project Lab
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {classCProfile.constructScopeNote}
              </p>
            </div>

            <button
              onClick={onOpenProjectLab}
              className="px-4 py-2 rounded text-xs font-medium bg-surface-elevated text-foreground hover:text-foreground border border-border-active whitespace-nowrap transition-colors cursor-pointer"
            >
              Open Project Lab
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
