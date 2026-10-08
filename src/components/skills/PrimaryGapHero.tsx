import React from 'react';
import type { TopicReadiness } from '../../engine/skillsEngine';
import { Target, ArrowRight, ShieldAlert, Sparkles, Clock, Compass } from 'lucide-react';
import { Button } from '../ui/button';

interface PrimaryGapHeroProps {
  primaryGap: TopicReadiness | null;
  onExecuteAction: (tr: TopicReadiness) => void;
  onOpenTraceability: (tr: TopicReadiness) => void;
}

export const PrimaryGapHero: React.FC<PrimaryGapHeroProps> = ({
  primaryGap,
  onExecuteAction,
  onOpenTraceability,
}) => {
  if (!primaryGap) {
    return (
      <section
        aria-label="Primary Competence Status"
        className="skills-signal-track bg-surface border border-border rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-status-success/15 text-status-success border border-status-success/30">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground font-mono">
              All Placement Competence Thresholds Satisfied
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              No critical skill deficits or stale decay detected across all 11 domains. Maintain readiness through spaced reviews.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Primary Skill Gap & Action Focus"
      className="skills-signal-track relative bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4"
    >
      {/* Signature Motion: Signal Sweep Beam */}
      <div className="skills-signal-beam" aria-hidden="true" />

      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] bg-[var(--action-accent-skills-subtle)] border border-[var(--action-accent-skills-border)] text-[var(--action-accent-skills)]">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            Top Priority Competence Gap
          </span>
          <span className="text-xs font-mono text-foreground-muted">
            {primaryGap.domainName} · Importance: {primaryGap.importance}/10
          </span>
        </div>

        {primaryGap.targetLevel >= 4 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-status-warning/15 text-status-warning border border-status-warning/30 font-semibold">
            Company Target Req: Level {primaryGap.targetLevel}
          </span>
        )}
      </div>

      {/* Main Hero Content */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-foreground font-mono tracking-tight">
              {primaryGap.topicName}
            </h2>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-[4px] font-semibold border ${
                primaryGap.readinessStatus === 'at_risk'
                  ? 'bg-status-danger/15 text-status-danger border-status-danger/30'
                  : primaryGap.readinessStatus === 'on_track'
                  ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                  : 'bg-surface-elevated text-foreground-muted border-border'
              }`}
            >
              {primaryGap.readinessStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            {primaryGap.gapExplanation}
          </p>

          {/* Causal / Freshness indicators */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-foreground-muted pt-1">
            <div className="flex items-center gap-1.5">
              <Compass className="size-3.5 text-[var(--action-accent-skills)]" />
              <span>Evidence Strength: <strong className="text-foreground">{primaryGap.evidenceStrength}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-status-warning" />
              <span>Freshness: <strong className="text-foreground capitalize">{primaryGap.freshness}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5 text-[var(--action-accent-skills)]" />
              <span>Level Progress: <strong className="text-foreground">L{primaryGap.currentLevel} / L{primaryGap.targetLevel}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[220px]">
          <Button
            size="sm"
            onClick={() => onExecuteAction(primaryGap)}
            className="w-full h-9 text-xs font-mono font-bold text-white bg-[var(--action-accent-skills)] hover:bg-[var(--action-accent-skills-hover)] rounded-[4px] shadow-sm transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--action-accent-skills-ring)]"
          >
            <span>Strengthen Skill</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenTraceability(primaryGap)}
            className="w-full h-8 text-xs font-mono border-border bg-surface-elevated text-foreground hover:bg-surface-muted rounded-[4px] transition-colors"
          >
            Trace Causal Evidence
          </Button>
        </div>
      </div>
    </section>
  );
};
