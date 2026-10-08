import React from 'react';
import type { AnalyticsSummary } from '../../engine/analyticsEngine';
import { X, CheckCircle2, Clock, Code, FileCode, HelpCircle } from 'lucide-react';

interface TelemetryTraceabilityModalProps {
  summary: AnalyticsSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetryTraceabilityModal: React.FC<TelemetryTraceabilityModalProps> = ({
  summary,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-canvas/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-surface-panel border border-border-default rounded-[4px] max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-status-warning">
              <span>TELEMETRY DATA INSPECTOR</span>
              <span>•</span>
              <span>Window: {summary.timeWindow.toUpperCase()} ({summary.startDateISO} to {summary.endDateISO})</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary mt-0.5">UNDERLYING EVIDENCE BREAKDOWN</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Audit Explanation */}
        <div className="p-3.5 bg-surface-elevated border border-border-default rounded-[4px] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-text-primary">
            <HelpCircle className="size-3.5 text-status-warning" /> What data produced these metrics?
          </div>
          <p className="text-text-secondary leading-relaxed text-[11px]">
            Analytics metrics are computed deterministically from stored task completion timestamps, DSA attempt logs, Leitner box transitions, and sealed daily check-ins.
          </p>
        </div>

        {/* Section 1: Overdue DSA Items */}
        {summary.gaps.overdueDsaProblems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-status-danger uppercase tracking-wider flex items-center gap-1.5">
              <Code className="size-3.5" /> Overdue Spaced Repetition Reviews ({summary.gaps.overdueDsaProblems.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.overdueDsaProblems.map((prob) => (
                <div
                  key={prob.id}
                  className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px] flex items-center justify-between"
                >
                  <span className="font-semibold text-text-primary">
                    #{prob.leetcodeNumber || ''} {prob.title}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-status-warning">Box {prob.box}</span>
                    <span className="text-status-danger font-bold">{prob.daysOverdue}d overdue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Stale Topics */}
        {summary.gaps.staleTopics.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-status-warning uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5" /> Stale Evidence Topics ({summary.gaps.staleTopics.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.staleTopics.map((top) => (
                <div
                  key={top.topicId}
                  className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-text-primary block">{top.topicName}</span>
                    <span className="text-[10px] text-text-secondary">{top.domainName}</span>
                  </div>
                  <span className="text-status-warning text-[11px] font-bold">{top.daysInactive}d inactive</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Repeatedly Postponed Tasks */}
        {summary.gaps.postponedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-info uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="size-3.5" /> Postponed Tasks ({summary.gaps.postponedTasks.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.postponedTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px] flex items-center justify-between"
                >
                  <span className="font-semibold text-text-primary">{t.title}</span>
                  <span className="text-info text-[11px] font-bold">{t.postponeCount}x postponed</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Breakdown */}
        <div className="space-y-2 pt-2 border-t border-border-default">
          <h3 className="text-xs font-bold text-status-success uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Window Activity Metrics Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px]">
              <span className="text-text-secondary text-[10px] block">Completed Tasks</span>
              <span className="font-bold text-text-primary">{summary.activity.completedTasksCount}</span>
            </div>
            <div className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px]">
              <span className="text-text-secondary text-[10px] block">DSA Solves</span>
              <span className="font-bold text-status-warning">{summary.activity.dsaPassedCount}</span>
            </div>
            <div className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px]">
              <span className="text-text-secondary text-[10px] block">Study Hours</span>
              <span className="font-bold text-text-primary">{summary.activity.studyHours}h</span>
            </div>
            <div className="p-2.5 bg-surface-elevated border border-border-default rounded-[4px]">
              <span className="text-text-secondary text-[10px] block">Sealed Days</span>
              <span className="font-bold text-status-success">{summary.activity.sealedDaysCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
