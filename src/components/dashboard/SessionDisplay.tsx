import React from 'react';
import { useSession } from './SessionContext';
import { Play, SkipForward, Clock, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import type { SessionActivity } from '../../engine/sessionComposer';

interface SessionDisplayProps {
  onStartActivity: (activity: SessionActivity) => void;
}

export const SessionDisplay: React.FC<SessionDisplayProps> = ({ onStartActivity }) => {
  const {
    sessionState,
    currentActivity,
    remainingTime,
    sessionProgress,
    isSessionActive,
    advanceActivity,
    clearSession,
  } = useSession();

  if (!sessionState || !isSessionActive) {
    return null;
  }

  const nextActivity = sessionState.plan.activities[sessionState.currentActivityIndex + 1] || null;

  const getPriorityColor = (priority: SessionActivity['priority']) => {
    switch (priority) {
      case 'remediation':
      case 'overdue_review':
        return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10';
      case 'routed_weakness':
      case 'weak_topic':
        return 'text-[#E5A93C] border-[#E5A93C]/30 bg-[#E5A93C]/10';
      case 'company_gap':
        return 'text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/10';
      case 'stale_evidence':
        return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10';
      case 'retention':
        return 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10';
      default:
        return 'text-[#8E98A8] border-[#262D38] bg-[#1B2028]';
    }
  };

  const getPriorityLabel = (priority: SessionActivity['priority']) => {
    switch (priority) {
      case 'routed_weakness': return 'Weakness Action';
      case 'company_gap': return 'Company Target';
      case 'overdue_review': return 'Overdue Review';
      case 'stale_evidence': return 'Evidence Aging';
      case 'weak_topic': return 'Weak Topic';
      default: return priority.replace('_', ' ');
    }
  };

  return (
    <section
      ref={(el) => el?.setAttribute('data-reveal', 'session')}
      className="scroll-reveal"
      data-reveal="session"
      data-guide-target="today-session"
    >
      <div className="bg-[#14171D] border border-[#E5A93C]/30 rounded-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#E5A93C] animate-pulse" />
            <span className="text-xs font-bold text-[#FFC665] uppercase tracking-wider">Active Session</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#FFC665] border border-[#E5A93C]/30 font-mono">
              {sessionProgress.completed} / {sessionProgress.total} ({sessionProgress.percent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#5C6675] font-mono">SESSION PROGRESS</span>
            <span className="text-[#E5A93C] font-mono font-bold">{sessionProgress.percent}%</span>
          </div>
          <div className="w-full bg-[#0D0F12] rounded-full h-2 overflow-hidden border border-[#262D38]">
            <div
              className="bg-gradient-to-r from-[#E5A93C] to-[#FFC665] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${sessionProgress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#8E98A8]">
            <span>Elapsed: {sessionState.plan.totalEstimatedMinutes - remainingTime} min</span>
            <span>Remaining: {remainingTime} min</span>
          </div>
        </div>

        {/* Current Activity */}
        {currentActivity && (
          <div className="p-4 bg-[#0D0F12] border border-[#E5A93C]/40 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-1 rounded border font-medium capitalize ${getPriorityColor(currentActivity.priority)}`}>
                    {getPriorityLabel(currentActivity.priority)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B2028] text-[#FFC665] border border-[#262D38] font-mono capitalize">
                    {currentActivity.route}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#14171D] text-[#8E98A8] border border-[#262D38] font-mono">
                    {currentActivity.estimatedMinutes} min
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[#F1F5F9] mt-1 truncate">{currentActivity.title}</h4>
                <p className="text-[11px] text-[#8E98A8] mt-0.5 line-clamp-1">{currentActivity.description}</p>

                {/* Reason */}
                <div className="pt-2 border-t border-[#262D38]/80 flex items-start gap-2 text-[11px]">
                  <HelpCircle className="size-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#FFC665]">Why this? </span>
                    <span className="text-[#8E98A8]">{currentActivity.reason}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262D38]/80">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onStartActivity(currentActivity)}
                  className="h-9 px-4 font-bold text-xs bg-[#E5A93C] hover:bg-[#FFC665] text-[#432C00] rounded-md shadow-md"
                >
                  <Play className="size-3.5 mr-1.5" /> Start Activity
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => advanceActivity('skipped')}
                  className="h-7 text-[11px] font-medium text-[#8E98A8] hover:text-[#F59E0B] hover:bg-[#1B2028] rounded-[4px] px-2"
                >
                  <SkipForward className="size-3 mr-1" /> Skip
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => advanceActivity('postponed')}
                  className="h-7 text-[11px] font-medium text-[#8E98A8] hover:text-[#F59E0B] hover:bg-[#1B2028] rounded-[4px] px-2"
                >
                  <Clock className="size-3 mr-1" /> Postpone
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Next Activity Preview */}
        {nextActivity && (
          <div className="p-3 bg-[#0D0F12] border border-[#262D38] rounded-lg">
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="text-[#5C6675] font-mono uppercase tracking-wider">NEXT UP</span>
              <ChevronRight className="size-3.5 text-[#5C6675]" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${getPriorityColor(nextActivity.priority)}`}>
                {getPriorityLabel(nextActivity.priority)}
              </span>
              <span className="text-xs font-medium text-[#F1F5F9] truncate flex-1">{nextActivity.title}</span>
              <span className="text-[10px] text-[#8E98A8] font-mono">{nextActivity.estimatedMinutes} min</span>
            </div>
          </div>
        )}

        {/* Queue exhausted */}
        {!currentActivity && sessionState.plan.activities.length > 0 && (
          <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg text-center space-y-3">
            <CheckCircle2 className="size-8 text-[#10B981] mx-auto" />
            <h4 className="text-sm font-semibold text-[#10B981]">Session Complete</h4>
            <p className="text-xs text-[#8E98A8]">All planned activities completed. Great work!</p>
            <Button size="sm" variant="outline" onClick={clearSession} className="w-auto mx-auto">
              Clear Session
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
