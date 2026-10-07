import React from 'react';
import type { RoutePath } from '../../context/PlacementContext';
import type {
  InterviewReadinessScorecard,
  ReadinessDimension,
} from '../../engine/interviewReadinessEngine';
import { Button } from '../ui/button';
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Code2,
  Terminal,
  Target,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';

export interface InterviewHeroSpotlightProps {
  scorecard: InterviewReadinessScorecard;
  onAction: (route: RoutePath, targetId?: string) => void;
}

interface HeroMission {
  badge: string;
  badgeClass: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  dimensionName: string;
  why: string;
  signal: string;
  primaryAction: {
    label: string;
    route: RoutePath;
    targetId?: string;
  };
  secondaryAction?: {
    label: string;
    route: RoutePath;
    targetId?: string;
  };
}

function deriveHeroMission(scorecard: InterviewReadinessScorecard): HeroMission {
  const { dimensions, overallBand, assessmentIntegration, projectReadiness, companyOverlay } =
    scorecard;

  // 1. Unassessed state -> Baseline Diagnostic
  if (overallBand === 'unassessed' || !assessmentIntegration.isAssessed) {
    return {
      badge: 'Immediate Baseline Priority',
      badgeClass: 'bg-action-accent/10 text-action-accent-hover border-action-accent-border/30',
      icon: ClipboardCheck,
      title: 'Complete Baseline Diagnostic Assessment',
      dimensionName: 'All Interview Dimensions',
      why: 'Establishing an authentic diagnostic baseline calibrates personalized readiness targets and reveals immediate skill gaps.',
      signal: '0/11 curriculum domains formally assessed',
      primaryAction: {
        label: 'Run Diagnostic Assessment',
        route: 'assessment',
      },
      secondaryAction: {
        label: "Open Today's Plan",
        route: 'dashboard',
      },
    };
  }

  // 2. Active DSA Remediation Deficit
  const dsaDim = dimensions.find((d) => d.id === 'coding_dsa');
  if (scorecard.activeRemediationCount > 0 && dsaDim && dsaDim.band === 'needs_work') {
    return {
      badge: 'Urgent Remediation Priority',
      badgeClass: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
      icon: ShieldAlert,
      title: 'Resolve Algorithmic Remediation Deficit',
      dimensionName: 'Coding / DSA',
      why: 'Active DSA remediation flags block Leitner progression and increase technical interview failure probability.',
      signal: `${scorecard.activeRemediationCount} active remediation signals recorded across core topics`,
      primaryAction: {
        label: dsaDim.recommendedAction.label || 'Review DSA Remediation',
        route: (dsaDim.recommendedAction.route as RoutePath) || 'dsa',
        targetId: dsaDim.recommendedAction.targetId,
      },
      secondaryAction: {
        label: 'Open Review Queue',
        route: 'analytics',
      },
    };
  }

  // 3. Urgent Company Requirement Gap
  if (companyOverlay && companyOverlay.overallGap !== 'none') {
    const criticalDim = dimensions.find((d) => {
      const cd = companyOverlay.dimensions.find((c) => c.dimensionId === d.id);
      return cd?.isRequired && (d.band === 'needs_work' || d.band === 'developing');
    });

    if (criticalDim) {
      return {
        badge: `Target Alignment: ${companyOverlay.companyName}`,
        badgeClass: 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30',
        icon: Target,
        title: `Close ${criticalDim.name} Requirement Deficit`,
        dimensionName: criticalDim.name,
        why: `Required for ${companyOverlay.companyName}. Closing this dimension deficit ensures compliance with candidate evaluation criteria.`,
        signal: `Gap: ${criticalDim.gapExplanation}`,
        primaryAction: {
          label: criticalDim.recommendedAction.label || `Strengthen ${criticalDim.shortName}`,
          route: (criticalDim.recommendedAction.route as RoutePath) || 'preparation',
          targetId: criticalDim.recommendedAction.targetId,
        },
        secondaryAction: {
          label: 'View Company Requirements',
          route: 'companies',
        },
      };
    }
  }

  // 4. Project Viva Defense Needs Work
  if (projectReadiness.defenseReadiness === 'needs_work') {
    return {
      badge: 'Architecture Defense Priority',
      badgeClass: 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30',
      icon: Terminal,
      title: 'Execute Portfolio Project Architecture Defense',
      dimensionName: 'Projects / Project Lab',
      why: 'Interviewers rigorously interrogate system trade-offs, bottlenecks, and failure recovery. Record proof-of-work defense.',
      signal: `${projectReadiness.sectionsCompleted}/6 sections claimed · ${projectReadiness.evidenceDefenseSessions} recorded defenses`,
      primaryAction: {
        label: 'Launch Project Defense',
        route: 'practice',
        targetId: 'practice-project-defense-01',
      },
      secondaryAction: {
        label: 'Open Project Lab',
        route: 'project',
      },
    };
  }

  // 5. Default / General Highest-Leverage Dimension
  // Sort dimensions by lowest evidence strength or needs_work band
  const prioritizedDimensions = [...dimensions].sort((a, b) => {
    if (a.band === 'needs_work' && b.band !== 'needs_work') return -1;
    if (b.band === 'needs_work' && a.band !== 'needs_work') return 1;
    if (a.band === 'developing' && b.band === 'strong') return -1;
    if (b.band === 'developing' && a.band === 'strong') return 1;
    return a.evidenceStrength - b.evidenceStrength;
  });

  const targetDim: ReadinessDimension = prioritizedDimensions[0] || dimensions[0];

  return {
    badge: 'Highest-Leverage Readiness Drill',
    badgeClass: 'bg-action-accent/10 text-action-accent-hover border-action-accent-border/30',
    icon: targetDim.id === 'coding_dsa' ? Code2 : Sparkles,
    title: targetDim.recommendedAction.label || `Strengthen ${targetDim.name}`,
    dimensionName: targetDim.name,
    why: targetDim.gapExplanation,
    signal: `${targetDim.shortName}: ${targetDim.evidenceStrength}% evidence · ${targetDim.confidence} confidence · ${targetDim.freshness} freshness`,
    primaryAction: {
      label: targetDim.recommendedAction.label || 'Start Recommended Drill',
      route: (targetDim.recommendedAction.route as RoutePath) || 'practice',
      targetId: targetDim.recommendedAction.targetId,
    },
    secondaryAction: {
      label: "Open Today's Plan",
      route: 'dashboard',
    },
  };
}

export const InterviewHeroSpotlight: React.FC<InterviewHeroSpotlightProps> = ({
  scorecard,
  onAction,
}) => {
  const mission = deriveHeroMission(scorecard);
  const Icon = mission.icon;

  return (
    <section
      className="bg-[#11141A] border border-[#232834] rounded-xl p-5 sm:p-6 relative overflow-hidden shadow-lg interview-signal-track interview-view-container"
      data-testid="interview-hero-spotlight"
      aria-label="Primary interview mission spotlight"
    >
      {/* Decorative subtle ambient sweep */}
      <div className="interview-signal-beam" aria-hidden="true" />

      <div className="relative z-10 space-y-4">
        {/* Badge & Category Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-md border uppercase tracking-wider ${mission.badgeClass}`}
              data-testid="hero-mission-badge"
            >
              {mission.badge}
            </span>
            <span className="text-xs text-[#7E8B9F] font-medium">
              Dimension: <strong className="text-[#F1F5F9]">{mission.dimensionName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#7E8B9F] font-mono">
            <CheckCircle2 className="size-3.5 text-action-accent" />
            <span>Deterministic Next Step</span>
          </div>
        </div>

        {/* Mission Headline & Description */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-[#F1F5F9] tracking-tight flex items-center gap-2.5">
            <Icon className="size-5 text-action-accent shrink-0" />
            <span data-testid="hero-mission-title">{mission.title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#9AA6B8] leading-relaxed max-w-3xl">
            {mission.why}
          </p>
        </div>

        {/* Evidence Signal Strip & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#232834]">
          <div className="text-xs text-[#7E8B9F] flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8E98A8]">
              Signal:
            </span>
            <span className="text-[#F1F5F9] font-medium" data-testid="hero-mission-signal">
              {mission.signal}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {mission.secondaryAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onAction(mission.secondaryAction!.route, mission.secondaryAction!.targetId)
                }
                data-testid="hero-secondary-action"
                className="h-8 text-xs border-[#262D38] bg-[#181C24] hover:bg-[#202530] text-[#F1F5F9] rounded-md transition-colors"
              >
                {mission.secondaryAction.label}
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => onAction(mission.primaryAction.route, mission.primaryAction.targetId)}
              data-testid="hero-primary-action"
              className="h-8 text-xs font-semibold bg-action-accent hover:bg-action-accent-hover text-action-accent-foreground rounded-md shadow transition-all flex items-center gap-1.5 focus:ring-2 focus:ring-action-accent-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              <span>{mission.primaryAction.label}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
