import React from 'react';
import type { PracticeRecommendation } from '../../engine/practiceEngine';
import type { PracticeSessionDefinition } from '../../types';
import { Zap, Play, Clock, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface RecommendedDrillHeroProps {
  recommendation: PracticeRecommendation;
  onStartSession: (session: PracticeSessionDefinition) => void;
}

export const RecommendedDrillHero: React.FC<RecommendedDrillHeroProps> = ({
  recommendation,
  onStartSession,
}) => {
  const session = recommendation.session;

  return (
    <section
      aria-label="Recommended Practice Drill"
      className="bg-surface-elevated border border-[#3B82F6]/30 rounded-xl p-5 sm:p-6 space-y-4 shadow-md relative overflow-hidden"
    >
      {/* Top Tag & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-xs font-bold text-[#60A5FA]">
            <Zap className="size-3.5 text-[#3B82F6]" /> RECOMMENDED DRILL
          </span>
          <span className="text-[10px] uppercase font-bold text-foreground-muted bg-surface px-2 py-0.5 rounded border border-border">
            {recommendation.categoryTag || session.category.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-foreground-muted font-mono">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-[#60A5FA]" /> ~{session.estimatedMinutes} mins
          </span>
          <span>•</span>
          <span>{session.questions.length} Questions</span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{session.title}</h2>
        <p className="text-xs text-foreground-muted leading-relaxed max-w-3xl">
          {session.description}
        </p>
      </div>

      {/* Rationale & Action CTA */}
      <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-foreground-muted">
          <span className="font-semibold text-[#60A5FA] flex items-center gap-1 shrink-0">
            <HelpCircle className="size-3.5" /> Why this drill?
          </span>
          <span className="text-foreground-muted leading-snug">{recommendation.reason}</span>
        </div>

        <Button
          size="sm"
          onClick={() => onStartSession(session)}
          className="h-9 px-5 font-bold text-xs bg-[#3B82F6] hover:bg-[#60A5FA] text-[#0B100D] rounded-md shadow-sm transition-all active:scale-[0.98] shrink-0"
        >
          <Play className="size-3.5 mr-1.5 fill-current" /> Start Recommended Drill
        </Button>
      </div>
    </section>
  );
};
