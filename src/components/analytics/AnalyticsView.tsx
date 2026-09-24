import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { BarChart3, CheckCircle2, Clock, Code2, Layers, Award } from 'lucide-react';

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

  const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  dsaProblems.forEach((prob) => {
    const prog = dsaProgress[prob.id];
    const box = prog?.currentBox || 1;
    boxCounts[box] = (boxCounts[box] || 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Analytics & Performance Review
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Decision-support metrics, study time logs, Leitner distribution, and evidence records
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="app-surface p-3.5 space-y-1">
          <span className="text-zinc-500 font-medium flex items-center justify-between text-[11px]">
            Completion Rate <CheckCircle2 className="size-3.5 text-zinc-400" />
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100">{completionRate}%</div>
          <div className="text-[10px] text-zinc-500">{completedTasks} of {totalTasks} tasks</div>
        </div>

        <div className="app-surface p-3.5 space-y-1">
          <span className="text-zinc-500 font-medium flex items-center justify-between text-[11px]">
            Hours Logged <Clock className="size-3.5 text-zinc-400" />
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100">{totalHours}h</div>
          <div className="text-[10px] text-zinc-500">{totalMinutes} actual mins</div>
        </div>

        <div className="app-surface p-3.5 space-y-1">
          <span className="text-zinc-500 font-medium flex items-center justify-between text-[11px]">
            Mastered Problems <Award className="size-3.5 text-zinc-400" />
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100">{boxCounts[4]}</div>
          <div className="text-[10px] text-zinc-500">Box 4 (14-day interval)</div>
        </div>

        <div className="app-surface p-3.5 space-y-1">
          <span className="text-zinc-500 font-medium flex items-center justify-between text-[11px]">
            Evidence Logs <BarChart3 className="size-3.5 text-zinc-400" />
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100">{evidenceLogs.length}</div>
          <div className="text-[10px] text-zinc-500">Recorded skill entries</div>
        </div>
      </div>

      {/* Spaced Repetition Box Distribution */}
      <div className="app-surface p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Code2 className="size-3.5 text-indigo-400" /> Spaced Repetition Distribution
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[1, 2, 3, 4].map((boxNum) => {
            const count = boxCounts[boxNum as 1 | 2 | 3 | 4] || 0;
            const pct = dsaProblems.length > 0 ? Math.round((count / dsaProblems.length) * 100) : 0;
            return (
              <div key={boxNum} className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Box {boxNum}</span>
                  <span className="font-mono text-indigo-400">{pct}%</span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Mastery Matrix */}
      <div className="app-surface p-4 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="size-3.5 text-indigo-400" /> Domain Mastery Average
        </h2>
        <div className="space-y-2">
          {domains.map((dom) => {
            const domainSkills = Object.values(skillStates).filter((sk) => sk.domainId === dom.id);
            const avgStrength =
              domainSkills.length > 0
                ? Math.round(
                    domainSkills.reduce((sum, sk) => sum + sk.evidenceStrength, 0) / domainSkills.length
                  )
                : 0;

            return (
              <div key={dom.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/60">
                <span className="text-zinc-300">{dom.name} ({dom.shortName})</span>
                <span className="font-mono font-medium text-zinc-200">{avgStrength} / 100</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
