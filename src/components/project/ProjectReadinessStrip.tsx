import React from 'react';
import type { PracticeAttempt, EvidenceLog, TopicSkillState, SkillFreshnessState } from '../../types';
import { calculateProjectReadiness } from '../../engine/interviewReadinessEngine';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Activity,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import type { ReadinessBand } from '../../engine/interviewReadinessEngine';

interface ProjectReadinessStripProps {
  practiceAttempts: PracticeAttempt[];
  evidenceLogs: EvidenceLog[];
  skillStates: Record<string, TopicSkillState>;
}

export const ProjectReadinessStrip: React.FC<ProjectReadinessStripProps> = ({
  practiceAttempts,
  evidenceLogs,
  skillStates,
}) => {
  const readiness = calculateProjectReadiness(practiceAttempts, evidenceLogs);
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const latestAttempt = projectAttempts[0] ?? null;
  const passedCount = projectAttempts.filter((a) => a.passed === true).length;

  const careerSkill = skillStates['prep-interview-career'];
  const freshness: SkillFreshnessState = careerSkill?.freshness ?? (latestAttempt ? 'fresh' : 'untested');

  const getBandStyles = (band: ReadinessBand) => {
    switch (band) {
      case 'strong':
        return {
          label: 'STRONG',
          color: 'text-[#4CAF78]',
          bg: 'bg-[#4CAF78]/10',
          border: 'border-[#4CAF78]/30',
          subtext: '≥3 sessions + passing defense',
          Icon: ShieldCheck,
        };
      case 'developing':
        return {
          label: 'DEVELOPING',
          color: 'text-[#D97706]',
          bg: 'bg-[#D97706]/10',
          border: 'border-[#D97706]/30',
          subtext: '≥1 defense session recorded',
          Icon: ShieldAlert,
        };
      case 'needs_work':
      default:
        return {
          label: 'NEEDS WORK',
          color: 'text-[#8E98A8]',
          bg: 'bg-[#161E19]',
          border: 'border-[#28352D]',
          subtext: 'No passing defense recorded',
          Icon: Shield,
        };
    }
  };

  const getFreshnessStyles = (fresh: SkillFreshnessState) => {
    switch (fresh) {
      case 'fresh':
        return {
          label: 'Fresh (≤7d)',
          color: 'text-[#4CAF78]',
          subtext: 'Active readiness decay window',
          Icon: Sparkles,
        };
      case 'aging':
        return {
          label: 'Aging (≤14d)',
          color: 'text-[#D97706]',
          subtext: 'Review recommended soon',
          Icon: Clock,
        };
      case 'stale':
        return {
          label: 'Stale (>14d)',
          color: 'text-[#EF4444]',
          subtext: 'Defense rehearsal overdue',
          Icon: Clock,
        };
      case 'untested':
      default:
        return {
          label: 'Untested',
          color: 'text-[#8E98A8]',
          subtext: 'No recorded defense log',
          Icon: Clock,
        };
    }
  };

  const bandStyle = getBandStyles(readiness.defenseReadiness);
  const freshnessStyle = getFreshnessStyles(freshness);
  const BandIcon = bandStyle.Icon;
  const FreshnessIcon = freshnessStyle.Icon;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3"
      data-testid="project-readiness-strip"
      role="region"
      aria-label="Project Defense Telemetry"
    >
      {/* 1. Readiness Band */}
      <div className="p-3 sm:p-3.5 bg-[#111713] border border-[#28352D] rounded-[6px] flex flex-col justify-between hover:border-[#3B4C40] transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E98A8]">
            Defense Readiness
          </span>
          <BandIcon className={`size-3.5 ${bandStyle.color}`} aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded border ${bandStyle.bg} ${bandStyle.border} ${bandStyle.color}`}
              data-testid="readiness-band-badge"
            >
              {bandStyle.label}
            </span>
          </div>
          <p className="text-[11px] text-[#5C6675] leading-tight mt-1">
            {bandStyle.subtext}
          </p>
        </div>
      </div>

      {/* 2. Recorded Runs */}
      <div className="p-3 sm:p-3.5 bg-[#111713] border border-[#28352D] rounded-[6px] flex flex-col justify-between hover:border-[#3B4C40] transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E98A8]">
            Recorded Runs
          </span>
          <Activity className="size-3.5 text-[#0D9488]" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-base sm:text-lg font-bold font-mono text-[#F1F5F9]"
              data-testid="recorded-runs-count"
            >
              {projectAttempts.length}
            </span>
            <span className="text-xs text-[#8E98A8]">
              run{projectAttempts.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-[#5C6675] leading-tight">
            {projectAttempts.length > 0
              ? `${passedCount} passed · ${projectAttempts.length - passedCount} failed`
              : 'Zero defense sessions run'}
          </p>
        </div>
      </div>

      {/* 3. Latest Score % */}
      <div className="p-3 sm:p-3.5 bg-[#111713] border border-[#28352D] rounded-[6px] flex flex-col justify-between hover:border-[#3B4C40] transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E98A8]">
            Latest Score
          </span>
          <Award className="size-3.5 text-accent" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          {latestAttempt ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="text-base sm:text-lg font-bold font-mono text-[#F1F5F9]"
                  data-testid="latest-score-pct"
                >
                  {latestAttempt.scorePct}%
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                    latestAttempt.passed
                      ? 'bg-[#4CAF78]/10 text-[#4CAF78] border-[#4CAF78]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                  data-testid="latest-verdict-badge"
                >
                  {latestAttempt.passed ? (
                    <>
                      <CheckCircle2 className="size-2.5" />
                      <span>PASS</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-2.5" />
                      <span>FAIL</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-[#5C6675] leading-tight">
                {latestAttempt.correctCount}/{latestAttempt.totalQuestions} correct prompts
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-base sm:text-lg font-bold font-mono text-[#5C6675]">
                --
              </span>
              <p className="text-[11px] text-[#5C6675] leading-tight">
                Untested (no attempts)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Evidence Freshness */}
      <div className="p-3 sm:p-3.5 bg-[#111713] border border-[#28352D] rounded-[6px] flex flex-col justify-between hover:border-[#3B4C40] transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E98A8]">
            Evidence Freshness
          </span>
          <FreshnessIcon className={`size-3.5 ${freshnessStyle.color}`} aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold font-mono ${freshnessStyle.color}`}
              data-testid="evidence-freshness-label"
            >
              {freshnessStyle.label}
            </span>
          </div>
          <p className="text-[11px] text-[#5C6675] leading-tight">
            {freshnessStyle.subtext}
          </p>
        </div>
      </div>
    </div>
  );
};
