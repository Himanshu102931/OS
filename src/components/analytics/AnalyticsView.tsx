import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { BarChart3, CheckCircle2, Clock, Sparkles, Code2, Layers, Award, FileText } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    taskDefinitions,
    taskProgress,
    dsaProblems,
    dsaProgress,
    skillStates,
    domains,
    evidenceLogs,
    dailyCheckIns,
  } = usePlacement();

  const totalTasks = taskDefinitions.length;
  const completedTasks = Object.values(taskProgress).filter(
    (tp) => tp.state === 'completed'
  ).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate total actual study minutes from daily checkins & task progress
  const totalActualMinutesFromCheckIns = dailyCheckIns.reduce(
    (sum, c) => sum + (c.totalActualMinutes || 0),
    0
  );
  const totalTaskSpentMinutes = Object.values(taskProgress).reduce(
    (sum, tp) => sum + (tp.timeSpentMinutes || 0),
    0
  );
  const totalMinutes = Math.max(totalActualMinutesFromCheckIns, totalTaskSpentMinutes);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Leitner distribution count
  const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  dsaProblems.forEach((prob) => {
    const prog = dsaProgress[prob.id];
    const box = prog?.currentBox || 1;
    boxCounts[box] = (boxCounts[box] || 0) + 1;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          <BarChart3 className="size-3.5" />
          <span>Execution Metrics & Historical Evidence</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-1">Analytics & Preparation Review</h2>
        <p className="text-sm text-slate-400 mt-1">
          Quantitative metrics, study time logs, Leitner distribution, and recorded evidence logs.
        </p>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Completion Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Completion Rate</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{completionRate}%</div>
          <div className="text-[11px] text-slate-500">{completedTasks} of {totalTasks} tasks done</div>
        </div>

        {/* Metric 2: Study Hours */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Study Hours Logged</span>
            <Clock className="size-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">{totalHours}h</div>
          <div className="text-[11px] text-slate-500">{totalMinutes} actual minutes</div>
        </div>

        {/* Metric 3: Mastered Problems */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Box 4 Mastered</span>
            <Award className="size-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{boxCounts[4]}</div>
          <div className="text-[11px] text-slate-500">14-day review interval</div>
        </div>

        {/* Metric 4: Evidence Logs Count */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Evidence Logs</span>
            <FileText className="size-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{evidenceLogs.length}</div>
          <div className="text-[11px] text-slate-500">Recorded skill entries</div>
        </div>
      </div>

      {/* Leitner Spaced Repetition Distribution Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Code2 className="size-4 text-blue-400" />
            Leitner 4-Box Spaced Repetition Distribution
          </h3>
          <span className="text-xs font-mono text-slate-400">{dsaProblems.length} Total Problems</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((boxNum) => {
            const count = boxCounts[boxNum as 1 | 2 | 3 | 4] || 0;
            const pct = dsaProblems.length > 0 ? Math.round((count / dsaProblems.length) * 100) : 0;
            const colors = {
              1: 'from-rose-600 to-rose-900 border-rose-800/60 text-rose-300',
              2: 'from-amber-600 to-amber-900 border-amber-800/60 text-amber-300',
              3: 'from-blue-600 to-blue-900 border-blue-800/60 text-blue-300',
              4: 'from-emerald-600 to-emerald-900 border-emerald-800/60 text-emerald-300',
            };

            return (
              <div key={boxNum} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Box {boxNum}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colors[boxNum as 1|2|3|4]}`}>
                    {pct}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">{count}</div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${colors[boxNum as 1|2|3|4]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Skill Strength Distribution */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Sparkles className="size-4 text-purple-400" />
          11 Core Placement Domains Skill Strength Baseline
        </h3>

        <div className="space-y-3">
          {domains.map((dom) => {
            const domainSkills = Object.values(skillStates).filter((sk) => sk.domainId === dom.id);
            const avgStrength =
              domainSkills.length > 0
                ? Math.round(
                    domainSkills.reduce((sum, sk) => sum + sk.evidenceStrength, 0) / domainSkills.length
                  )
                : 0;

            return (
              <div key={dom.id} className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">{dom.name} ({dom.shortName})</span>
                  <span className="font-mono font-bold text-purple-300">{avgStrength}/100</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${avgStrength}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Evidence Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Layers className="size-4 text-indigo-400" />
            Recorded Evidence Logs Audit
          </h3>
          <span className="text-xs text-slate-400 font-mono">{evidenceLogs.length} Entries</span>
        </div>

        {evidenceLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No evidence logs recorded yet. Complete tasks or log DSA attempts to record evidence!
          </div>
        ) : (
          <div className="space-y-2">
            {evidenceLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200 uppercase">{log.sourceType.replace('_', ' ')}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Topic: {log.topicId}</div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {log.score}/100
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
