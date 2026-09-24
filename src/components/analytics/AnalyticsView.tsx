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
      <div className="pb-4 border-b border-[#262D38]">
        <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
          Analytics & Telemetry Review
        </h1>
        <p className="text-xs text-[#8E98A8] mt-1 font-mono">
          Decision-support metrics, study time logs, Leitner distribution, and evidence records
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="app-surface p-4 space-y-1 border-t-2 border-t-[#E5A93C]">
          <span className="text-[#8E98A8] font-mono flex items-center justify-between text-[11px] uppercase">
            Completion Rate <CheckCircle2 className="size-3.5 text-[#E5A93C]" />
          </span>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9]">{completionRate}%</div>
          <div className="text-[10px] font-mono text-[#8E98A8]">{completedTasks} of {totalTasks} tasks</div>
        </div>

        <div className="app-surface p-4 space-y-1 border-t-2 border-t-[#FFC665]">
          <span className="text-[#8E98A8] font-mono flex items-center justify-between text-[11px] uppercase">
            Hours Logged <Clock className="size-3.5 text-[#FFC665]" />
          </span>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9]">{totalHours}h</div>
          <div className="text-[10px] font-mono text-[#8E98A8]">{totalMinutes} actual mins</div>
        </div>

        <div className="app-surface p-4 space-y-1 border-t-2 border-t-[#10B981]">
          <span className="text-[#8E98A8] font-mono flex items-center justify-between text-[11px] uppercase">
            Mastered Problems <Award className="size-3.5 text-[#10B981]" />
          </span>
          <div className="text-2xl font-bold font-mono text-[#10B981]">{boxCounts[4]}</div>
          <div className="text-[10px] font-mono text-[#8E98A8]">Box 4 (14-day interval)</div>
        </div>

        <div className="app-surface p-4 space-y-1 border-t-2 border-t-[#59E8AB]">
          <span className="text-[#8E98A8] font-mono flex items-center justify-between text-[11px] uppercase">
            Evidence Logs <BarChart3 className="size-3.5 text-[#59E8AB]" />
          </span>
          <div className="text-2xl font-bold font-mono text-[#F1F5F9]">{evidenceLogs.length}</div>
          <div className="text-[10px] font-mono text-[#8E98A8]">Recorded skill entries</div>
        </div>
      </div>

      {/* Spaced Repetition Box Distribution */}
      <div className="app-surface p-5 space-y-4">
        <h2 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
          <Code2 className="size-4 text-[#E5A93C]" /> Spaced Repetition Distribution
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[1, 2, 3, 4].map((boxNum) => {
            const count = boxCounts[boxNum as 1 | 2 | 3 | 4] || 0;
            const pct = dsaProblems.length > 0 ? Math.round((count / dsaProblems.length) * 100) : 0;
            return (
              <div key={boxNum} className="p-3.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1 font-mono">
                <div className="flex justify-between text-[#8E98A8] text-[11px]">
                  <span>Box {boxNum}</span>
                  <span className="text-[#FFC665] font-semibold">{pct}%</span>
                </div>
                <div className="text-xl font-bold text-[#F1F5F9]">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Mastery Matrix */}
      <div className="app-surface p-5 space-y-4">
        <h2 className="text-xs font-mono font-semibold text-[#8E98A8] uppercase tracking-wider flex items-center gap-2">
          <Layers className="size-4 text-[#59E8AB]" /> Domain Mastery Telemetry Average
        </h2>
        <div className="space-y-2 font-mono">
          {domains.map((dom) => {
            const domainSkills = Object.values(skillStates).filter((sk) => sk.domainId === dom.id);
            const avgStrength =
              domainSkills.length > 0
                ? Math.round(
                    domainSkills.reduce((sum, sk) => sum + sk.evidenceStrength, 0) / domainSkills.length
                  )
                : 0;

            return (
              <div key={dom.id} className="flex items-center justify-between text-xs py-2 border-b border-[#262D38]">
                <span className="text-[#F1F5F9] font-medium">{dom.name} ({dom.shortName})</span>
                <span className="font-semibold text-[#FFC665]">{avgStrength} / 100</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
