import React from 'react';
import { useSession } from './SessionContext';
import {
  Play,
  SkipForward,
  Clock,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { SessionActivity, SessionComposerMode } from '../../engine/sessionComposer';

interface SessionDisplayProps {
  onStartActivity: (activity: SessionActivity) => void;
  onCompleteActivity?: (activity: SessionActivity) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const MODE_OPTIONS: { id: SessionComposerMode; label: string }[] = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'focused', label: 'Focused' },
  { id: 'review_heavy', label: 'Review-Heavy' },
];

export const SessionDisplay: React.FC<SessionDisplayProps> = ({
  onStartActivity,
  onCompleteActivity,
}) => {
  const {
    sessionState,
    currentActivity,
    remainingTime,
    sessionProgress,
    advanceActivity,
    selectedDuration,
    setSelectedDuration,
    sessionMode,
    setSessionMode,
    composeSession,
  } = useSession();

  if (!sessionState) {
    return null;
  }

  const { activities, totalEstimatedMinutes, timeBudgetMinutes, remainingMinutes } =
    sessionState.plan;

  const committedCount = activities.filter((a) => a.isCommittedAssignment).length;

  const getActivityTypeBadge = (activity: SessionActivity) => {
    switch (activity.type) {
      case 'dsa_review':
        return { label: 'DSA Review', color: 'text-status-warning border-status-warning/30 bg-status-warning/10' };
      case 'dsa_remediation':
        return { label: 'DSA Remediation', color: 'text-status-danger border-status-danger/30 bg-status-danger/10' };
      case 'dsa_new':
        return { label: 'DSA Problem', color: 'text-info border-info/30 bg-info/10' };
      case 'preparation_lesson':
        return { label: 'Preparation', color: 'text-accent border-accent/30 bg-accent/10' };
      case 'practice_session':
        return { label: 'Practice', color: 'text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10' };
      case 'roadmap_task':
      default:
        return { label: 'Roadmap Task', color: 'text-text-secondary border-border-default bg-surface-elevated' };
    }
  };

  return (
    <div
      data-guide-target="today-session"
      data-testid="today-session"
    >
      <div className="bg-surface-panel border border-accent/30 rounded-xl p-5 space-y-4">
        {/* Header: Title + Budget + Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-default/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-2 rounded-full bg-accent animate-pulse" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              Today's Session
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-accent border border-accent/30 font-mono">
              {totalEstimatedMinutes} / {timeBudgetMinutes} min
            </span>
            {committedCount > 0 && (
              <span
                className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-medium flex items-center gap-1"
                data-testid="session-committed-plan-badge"
              >
                <Sparkles className="size-3 text-accent" />
                <span>Plan Aligned ({committedCount})</span>
              </span>
            )}
          </div>

          {/* Duration & Mode Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Duration Chips */}
            <div className="flex items-center bg-surface-canvas border border-border-default rounded-md p-0.5">
              {DURATION_PRESETS.map((mins) => {
                const isActive = selectedDuration === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(mins);
                      composeSession(mins, sessionMode);
                    }}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>

            {/* Mode Chips */}
            <div className="flex items-center bg-surface-canvas border border-border-default rounded-md p-0.5">
              {MODE_OPTIONS.map((m) => {
                const isActive = sessionMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSessionMode(m.id);
                      composeSession(selectedDuration, m.id);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      isActive
                        ? 'bg-surface-elevated text-accent border border-accent/30 font-bold'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress Bar (if in progress) */}
        {sessionProgress.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-secondary font-mono">
                PROGRESS: {sessionProgress.completed} / {sessionProgress.total} ACTIVITIES
              </span>
              <span className="text-accent font-mono font-bold">
                {sessionProgress.percent}%
              </span>
            </div>
            <div className="w-full bg-surface-canvas rounded-full h-1.5 overflow-hidden border border-border-default">
              <div
                className="bg-gradient-to-r from-primary to-primary-hover h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${sessionProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Composed Activities List */}
        {activities.length === 0 ? (
          <div className="p-4 bg-surface-canvas border border-border-default rounded-lg text-center space-y-2">
            <Sparkles className="size-5 text-text-secondary mx-auto" />
            <p className="text-xs text-text-secondary">
              No eligible activities found for this time window. All active reviews and roadmap
              milestones are up to date.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((activity, index) => {
              const isCurrent = currentActivity?.id === activity.id;
              const isCompleted = sessionState.completedActivityIds.includes(activity.id);
              const isSkipped = sessionState.skippedActivityIds.includes(activity.id);
              const badge = getActivityTypeBadge(activity);

              return (
                <div
                  key={activity.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-surface-canvas border-accent/50 shadow-sm'
                      : isCompleted
                      ? 'bg-surface-panel/60 border-status-success/30 opacity-75'
                      : isSkipped
                      ? 'bg-surface-panel/40 border-border-default opacity-50'
                      : 'bg-surface-canvas border-border-default'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Activity Info */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-accent mt-0.5">
                        {index + 1}.
                      </span>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border font-medium ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          {activity.isCommittedAssignment && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-medium font-mono">
                              Daily Plan
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border-default font-mono flex items-center gap-1">
                            <Clock className="size-2.5" /> {activity.estimatedMinutes} min
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-panel text-text-secondary border border-border-default font-mono capitalize">
                            {activity.route}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-text-primary truncate">
                          {activity.title}
                        </h4>

                        {/* Explainable Why */}
                        <div className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                          <HelpCircle className="size-3 text-accent shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-accent">Why: </span>
                            <span>{activity.reason}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Button */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      {isCompleted ? (
                        <span className="text-xs text-status-success flex items-center gap-1 font-medium font-mono px-2 py-1 rounded bg-status-success/10 border border-status-success/20">
                          <CheckCircle2 className="size-3.5" /> Completed
                        </span>
                      ) : isSkipped ? (
                        <span className="text-[11px] text-text-secondary font-mono px-2 py-1 rounded bg-surface-elevated border border-border-default">
                          Skipped
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (onCompleteActivity) {
                                  onCompleteActivity(activity);
                                }
                                advanceActivity('completed');
                              }}
                              className="h-8 px-2.5 text-xs font-bold bg-status-success/20 hover:bg-status-success/30 text-status-success border border-status-success/40 rounded-md shadow-xs"
                              title="Complete activity and sync daily plan"
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => onStartActivity(activity)}
                            className={`h-8 px-3 text-xs font-bold rounded-md ${
                              isCurrent
                                ? 'bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm'
                                : 'bg-surface-elevated hover:bg-surface-subtle text-text-primary border border-border-default'
                            }`}
                          >
                            <Play className="size-3 mr-1" /> Start
                          </Button>
                          {isCurrent && (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => advanceActivity('skipped')}
                                className="h-7 text-[11px] font-medium text-text-secondary hover:text-status-warning hover:bg-surface-elevated rounded-[4px] px-1.5"
                                title="Skip activity"
                              >
                                <SkipForward className="size-3 mr-1" /> Skip
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => advanceActivity('postponed')}
                                className="h-7 text-[11px] font-medium text-text-secondary hover:text-status-warning hover:bg-surface-elevated rounded-[4px] px-1.5"
                                title="Defer activity"
                              >
                                <Clock className="size-3 mr-1" /> Defer
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / Summary Info */}
        <div className="flex items-center justify-between text-[11px] text-text-secondary pt-2 border-t border-border-default/80">
          <div className="flex items-center gap-2 font-mono">
            <span>Planned: {totalEstimatedMinutes} min</span>
            {remainingMinutes > 0 && (
              <span className="text-text-secondary">({remainingMinutes} min unallocated)</span>
            )}
            {remainingTime > 0 && <span>• {remainingTime} min remaining</span>}
          </div>
          <button
            type="button"
            onClick={() => composeSession(selectedDuration, sessionMode)}
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors"
          >
            <RotateCcw className="size-3" /> Recompose
          </button>
        </div>
      </div>
    </div>
  );
};
