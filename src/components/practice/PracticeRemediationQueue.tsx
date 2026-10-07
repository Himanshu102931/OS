import React from 'react';
import type { PracticeAttempt, PracticeSessionDefinition } from '../../types';
import type { RoutePath } from '../../context/PlacementContext';
import { AlertTriangle, RotateCcw, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';

interface PracticeRemediationQueueProps {
  attempts: PracticeAttempt[];
  allSessions: PracticeSessionDefinition[];
  onStartSession: (session: PracticeSessionDefinition) => void;
  onNavigate: (route: RoutePath, targetId?: string) => void;
}

export const PracticeRemediationQueue: React.FC<PracticeRemediationQueueProps> = ({
  attempts,
  allSessions,
  onStartSession,
  onNavigate,
}) => {
  // Find latest attempt for each session
  const latestAttemptsBySession = new Map<string, PracticeAttempt>();
  attempts.forEach((a) => {
    const existing = latestAttemptsBySession.get(a.sessionId);
    if (!existing || new Date(a.completedAt || a.date).getTime() > new Date(existing.completedAt || existing.date).getTime()) {
      latestAttemptsBySession.set(a.sessionId, a);
    }
  });

  // Filter to sessions whose latest attempt failed or has low accuracy (< 60% or !passed)
  const failedItems: { attempt: PracticeAttempt; session: PracticeSessionDefinition }[] = [];
  latestAttemptsBySession.forEach((attempt, sessionId) => {
    if (!attempt.passed || (attempt.accuracyPct ?? 0) < 60) {
      const session = allSessions.find((s) => s.id === sessionId);
      if (session) {
        failedItems.push({ attempt, session });
      }
    }
  });

  if (failedItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Persistent Remediation and Review Queue"
      className="bg-surface border border-warning/30 rounded-xl p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded bg-warning/10 border border-warning/30 flex items-center justify-center text-warning">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Remediation & Review Queue
            </h2>
            <p className="text-[11px] text-foreground-muted">
              Targeted recovery drills for recent assessments requiring reinforcement.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
          {failedItems.length} {failedItems.length === 1 ? 'drill pending' : 'drills pending'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {failedItems.map(({ attempt, session }) => {
          const passThreshold = session.passingScorePct ?? 60;
          return (
            <div
              key={session.id}
              className="bg-surface-elevated border border-border hover:border-warning/40 transition-colors rounded-lg p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-warning bg-surface px-2 py-0.5 rounded border border-warning/30">
                    {session.category.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-warning text-xs font-semibold">
                    {attempt.accuracyPct}% (Pass: {passThreshold}%)
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {session.title}
                </h3>
                <p className="text-xs text-foreground-muted line-clamp-2">
                  {session.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-foreground-muted font-mono">
                  {session.domainId.toUpperCase()} {session.topicId ? `• ${session.topicId}` : ''}
                </div>

                <div className="flex items-center gap-2">
                  {session.topicId && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onNavigate('preparation', session.topicId)}
                      className="h-7 px-2.5 text-[11px] text-foreground-muted hover:text-foreground border-border hover:bg-surface"
                    >
                      <BookOpen className="size-3 mr-1 text-primary" /> Review Concept
                    </Button>
                  )}

                  <Button
                    size="xs"
                    onClick={() => onStartSession(session)}
                    className="h-7 px-3 text-[11px] font-bold bg-[#3B82F6] hover:bg-[#60A5FA] text-[#0B100D] rounded"
                  >
                    <RotateCcw className="size-3 mr-1" /> Retake Drill
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
