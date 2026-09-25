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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#14171D] border border-[#262D38] rounded-[4px] max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#262D38] pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#FFC665]">
              <span>TELEMETRY DATA INSPECTOR</span>
              <span>•</span>
              <span>Window: {summary.timeWindow.toUpperCase()} ({summary.startDateISO} to {summary.endDateISO})</span>
            </div>
            <h2 className="text-lg font-bold text-[#F1F5F9] mt-0.5">UNDERLYING EVIDENCE BREAKDOWN</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Audit Explanation */}
        <div className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#F1F5F9]">
            <HelpCircle className="size-3.5 text-[#FFC665]" /> What data produced these metrics?
          </div>
          <p className="text-[#8E98A8] leading-relaxed text-[11px]">
            Analytics metrics are computed deterministically from stored task completion timestamps, DSA attempt logs, Leitner box transitions, and sealed daily check-ins.
          </p>
        </div>

        {/* Section 1: Overdue DSA Items */}
        {summary.gaps.overdueDsaProblems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#E55353] uppercase tracking-wider flex items-center gap-1.5">
              <Code className="size-3.5" /> Overdue Spaced Repetition Reviews ({summary.gaps.overdueDsaProblems.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.overdueDsaProblems.map((prob) => (
                <div
                  key={prob.id}
                  className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between"
                >
                  <span className="font-semibold text-[#F1F5F9]">
                    #{prob.leetcodeNumber || ''} {prob.title}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#FFC665]">Box {prob.box}</span>
                    <span className="text-[#E55353] font-bold">{prob.daysOverdue}d overdue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Stale Topics */}
        {summary.gaps.staleTopics.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#FFC665] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5" /> Stale Evidence Topics ({summary.gaps.staleTopics.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.staleTopics.map((top) => (
                <div
                  key={top.topicId}
                  className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-[#F1F5F9] block">{top.topicName}</span>
                    <span className="text-[10px] text-[#8E98A8]">{top.domainName}</span>
                  </div>
                  <span className="text-[#FFC665] text-[11px] font-bold">{top.daysInactive}d inactive</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Repeatedly Postponed Tasks */}
        {summary.gaps.postponedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="size-3.5" /> Postponed Tasks ({summary.gaps.postponedTasks.length})
            </h3>
            <div className="space-y-1.5 text-xs">
              {summary.gaps.postponedTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px] flex items-center justify-between"
                >
                  <span className="font-semibold text-[#F1F5F9]">{t.title}</span>
                  <span className="text-[#3B82F6] text-[11px] font-bold">{t.postponeCount}x postponed</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Breakdown */}
        <div className="space-y-2 pt-2 border-t border-[#262D38]">
          <h3 className="text-xs font-bold text-[#4EAE79] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Window Activity Metrics Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
              <span className="text-[#8E98A8] text-[10px] block">Completed Tasks</span>
              <span className="font-bold text-[#F1F5F9]">{summary.activity.completedTasksCount}</span>
            </div>
            <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
              <span className="text-[#8E98A8] text-[10px] block">DSA Solves</span>
              <span className="font-bold text-[#FFC665]">{summary.activity.dsaPassedCount}</span>
            </div>
            <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
              <span className="text-[#8E98A8] text-[10px] block">Study Hours</span>
              <span className="font-bold text-[#F1F5F9]">{summary.activity.studyHours}h</span>
            </div>
            <div className="p-2.5 bg-[#1B2028] border border-[#262D38] rounded-[4px]">
              <span className="text-[#8E98A8] text-[10px] block">Sealed Days</span>
              <span className="font-bold text-[#4EAE79]">{summary.activity.sealedDaysCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
