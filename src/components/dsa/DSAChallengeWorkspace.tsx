import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import {
  TEACHER_EIGHT_DAY_DSA_CHALLENGE,
  type TeacherChallengeModule,
  type TeacherChallengeProblem,
} from '../../data/teacherEightDayDSAChallenge';
import { DSAGuidedScaffoldModal } from './DSAGuidedScaffoldModal';
import { DSAExternalAttemptModal } from './DSAExternalAttemptModal';
import { DSAModuleLessonModal } from './DSAModuleLessonModal';
import {
  BookOpen,
  Code2,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Award,
  GraduationCap,
} from 'lucide-react';
import { Button } from '../ui/button';

interface DSAChallengeWorkspaceProps {
  onOpenCanonicalAttempt: (problemId: string) => void;
}

export const DSAChallengeWorkspace: React.FC<DSAChallengeWorkspaceProps> = ({
  onOpenCanonicalAttempt,
}) => {
  const {
    dsaProgress,
    dsaChallengeState,
    updateDSAChallengeState,
    saveChallengeItemNote,
    markChallengeGuidedCompleted,
    recordExternalChallengeAttempt,
    todayDate,
  } = usePlacement();

  const [activeDay, setActiveDay] = useState<number>(() => {
    return dsaChallengeState.currentDay || 1;
  });

  const [selectedScaffoldProblem, setSelectedScaffoldProblem] = useState<TeacherChallengeProblem | null>(null);
  const [selectedExternalProblem, setSelectedExternalProblem] = useState<TeacherChallengeProblem | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState<boolean>(false);

  const activeModule: TeacherChallengeModule =
    TEACHER_EIGHT_DAY_DSA_CHALLENGE.find((m) => m.day === activeDay) ||
    TEACHER_EIGHT_DAY_DSA_CHALLENGE[0];

  const handleSelectDay = (day: number) => {
    setActiveDay(day);
    updateDSAChallengeState({ currentDay: day });
  };

  // Helper to check if a problem was passed independently
  const isProblemIndependentlyPassed = (p: TeacherChallengeProblem): boolean => {
    if (p.canonicalProblemId) {
      const prog = dsaProgress[p.canonicalProblemId];
      return Boolean(prog?.passedIndependently);
    }
    const item = dsaChallengeState.itemProgress[p.leetcodeNumber];
    return Boolean(item?.externalPassedIndependently && item?.externalAttemptResult === 'pass');
  };

  // Helper to check if a problem was assisted or in-progress
  const isProblemAssisted = (p: TeacherChallengeProblem): boolean => {
    if (p.canonicalProblemId) {
      const prog = dsaProgress[p.canonicalProblemId];
      return Boolean(prog?.assistedProvisional && !prog?.passedIndependently);
    }
    const item = dsaChallengeState.itemProgress[p.leetcodeNumber];
    return Boolean(
      item?.externalAttemptResult === 'pass' && !item?.externalPassedIndependently
    );
  };

  // Aggregate metrics
  let guidedCompletedCount = 0;
  let canonicalLoggedCount = 0;
  let externalSelfReportedCount = 0;
  let assistedCount = 0;
  let dueReviewsCount = 0;

  for (const mod of TEACHER_EIGHT_DAY_DSA_CHALLENGE) {
    for (const p of mod.guided) {
      const itemState = dsaChallengeState.itemProgress[p.leetcodeNumber];
      if (itemState?.guidedCompleted) guidedCompletedCount++;
      if (p.canonicalProblemId) {
        if (dsaProgress[p.canonicalProblemId]?.passedIndependently) canonicalLoggedCount++;
        else if (isProblemAssisted(p)) assistedCount++;
      } else {
        if (itemState?.externalPassedIndependently && itemState?.externalAttemptResult === 'pass') {
          externalSelfReportedCount++;
        } else if (isProblemAssisted(p)) {
          assistedCount++;
        }
      }

      // Review due check for canonical
      if (p.canonicalProblemId) {
        const prog = dsaProgress[p.canonicalProblemId];
        if (prog?.nextReviewAt && prog.nextReviewAt <= todayDate) {
          dueReviewsCount++;
        }
      }
    }
    for (const p of mod.independent) {
      const itemState = dsaChallengeState.itemProgress[p.leetcodeNumber];
      if (p.canonicalProblemId) {
        if (dsaProgress[p.canonicalProblemId]?.passedIndependently) canonicalLoggedCount++;
        else if (isProblemAssisted(p)) assistedCount++;
      } else {
        if (itemState?.externalPassedIndependently && itemState?.externalAttemptResult === 'pass') {
          externalSelfReportedCount++;
        } else if (isProblemAssisted(p)) {
          assistedCount++;
        }
      }

      if (p.canonicalProblemId) {
        const prog = dsaProgress[p.canonicalProblemId];
        if (prog?.nextReviewAt && prog.nextReviewAt <= todayDate) {
          dueReviewsCount++;
        }
      }
    }
  }

  const stats = {
    guidedCompletedCount,
    canonicalLoggedCount,
    externalSelfReportedCount,
    independentlyPassedCount: canonicalLoggedCount + externalSelfReportedCount,
    assistedCount,
    dueReviewsCount,
  };

  // Per-module completion count for navigation tabs
  const getModuleStats = (mod: TeacherChallengeModule) => {
    let completed = 0;
    for (const p of [...mod.guided, ...mod.independent]) {
      if (isProblemIndependentlyPassed(p)) {
        completed++;
      }
    }
    return { completed, total: 10 };
  };

  const pacingModes = [
    {
      id: 'guided' as const,
      label: 'Guided',
      time: '45m / session',
      description: 'Focus on 1 worked example + 1 practice problem. Ideal for building solid foundations.',
    },
    {
      id: 'flexible' as const,
      label: 'Flexible (Recommended)',
      time: '60–75m / session',
      description: 'Balanced pace: study worked scaffolds and attempt practice problems at your own speed.',
    },
    {
      id: 'intensive' as const,
      label: 'Intensive',
      time: '90m+ / session',
      description: 'Accelerated study pace for comprehensive daily module coverage.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview & Pacing Header */}
      <div className="bg-[#131722] border border-[#2A2F3D] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#2A2F3D] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Teacher Placement Series
              </span>
              <span className="text-xs text-slate-400">8 Modules · 80 Curated LeetCode Problems</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              8-Day DSA Challenge Track
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Curated directly from your teacher's placement preparation plan. Each module delivers 5 guided worked examples with metacognitive step predictions and 5 independent practice problems.
            </p>
          </div>

          {/* Pacing Mode Selector */}
          <div className="bg-[#181D2B] p-2.5 rounded-lg border border-[#2A2F3D] space-y-2 shrink-0">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Study Pacing Mode:</span>
            </div>
            <div className="flex rounded-md p-0.5 bg-[#131722] border border-[#2A2F3D]">
              {pacingModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateDSAChallengeState({ pacingMode: mode.id })}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    dsaChallengeState.pacingMode === mode.id
                      ? 'bg-[var(--accent)] text-black font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={mode.description}
                >
                  {mode.label} ({mode.time.split('/')[0].trim()})
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 max-w-xs">
              {pacingModes.find((m) => m.id === dsaChallengeState.pacingMode)?.description}
            </div>
          </div>
        </div>

        {/* Pedagogical Safety & Non-Deadline Notice */}
        <div className="bg-[#181D2B]/80 border border-white/5 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-white">Flexible Learning Science Principle: </span>
            The "8 Days" represent eight conceptual topic modules, not an inflexible 8-calendar-day mandate. Progress at your own pace without streak penalties. Guided walkthroughs scaffold understanding, while demonstrated mastery is earned through logged canonical practice and independent problem solving.
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#181D2B] p-3.5 rounded-lg border border-[#2A2F3D] space-y-1">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Guided Scaffolds</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {stats.guidedCompletedCount} <span className="text-xs text-slate-500 font-normal">/ 40 completed</span>
            </div>
            <div className="text-[11px] text-slate-500">Worked dry runs & state predictions</div>
          </div>

          <div className="bg-[#181D2B] p-3.5 rounded-lg border border-[#2A2F3D] space-y-1">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Canonical Independent (Logged)</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {stats.canonicalLoggedCount} <span className="text-xs text-slate-500 font-normal">/ 53 logged</span>
            </div>
            <div className="text-[11px] text-slate-500">Self-checked and logged in canonical workbench (Box 1–4)</div>
          </div>

          <div className="bg-[#181D2B] p-3.5 rounded-lg border border-[#2A2F3D] space-y-1">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>External Self-Reported</span>
            </div>
            <div className="text-xl font-bold text-purple-400 font-mono">
              {stats.externalSelfReportedCount} <span className="text-xs text-slate-500 font-normal">/ 27 self-reported</span>
            </div>
            <div className="text-[11px] text-slate-500">Practice logged on public LeetCode</div>
          </div>

          <div className="bg-[#181D2B] p-3.5 rounded-lg border border-[#2A2F3D] space-y-1">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Leitner Reviews Due</span>
            </div>
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {stats.dueReviewsCount} <span className="text-xs text-slate-500 font-normal">due today</span>
            </div>
            <div className="text-[11px] text-slate-500">Spaced retrieval intervals (1/3/7/14d)</div>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {TEACHER_EIGHT_DAY_DSA_CHALLENGE.map((m) => {
          const modStat = getModuleStats(m);
          const isActive = m.day === activeDay;
          return (
            <button
              key={m.day}
              onClick={() => handleSelectDay(m.day)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'bg-[#181D2B] border-[var(--accent)] shadow-md shadow-[var(--accent)]/5 ring-1 ring-[var(--accent)]/30'
                  : 'bg-[#131722] border-[#2A2F3D] hover:border-slate-600 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-mono font-bold ${isActive ? 'text-[var(--accent)]' : 'text-slate-300'}`}>
                  Day {m.day}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {modStat.completed}/{modStat.total}
                </span>
              </div>
              <div className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {m.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Module Header */}
      <div className="bg-[#131722] border border-[#2A2F3D] rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-mono font-bold">
              MODULE {activeModule.day} OF 8
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeModule.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsLessonModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-3.5 flex items-center gap-1.5 font-semibold shadow-sm"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Study Module Lesson & Concepts</span>
            </Button>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Source: Placement Series (Page {activeModule.sourcePage})
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-300">
          <strong className="text-slate-200">Core Skills Focus:</strong> {activeModule.coreSkills}
        </p>
      </div>

      {/* Part A: 5 Guided Problems */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Part A: Guided Walkthroughs (5 Worked Examples)
              </h3>
              <p className="text-xs text-slate-400">
                Study intuition, predict intermediate states, review the invariant, and test boundaries.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            5 Scaffolds
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {activeModule.guided.map((p, idx) => {
            const itemState = dsaChallengeState.itemProgress[p.leetcodeNumber];
            const isCompleted = Boolean(itemState?.guidedCompleted);
            const isPassed = isProblemIndependentlyPassed(p);

            return (
              <div
                key={p.leetcodeNumber}
                className="bg-[#131722] border border-[#2A2F3D] hover:border-slate-600 rounded-lg p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                    <span className="font-semibold text-white text-sm">
                      LeetCode #{p.leetcodeNumber}: {p.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium border capitalize ${
                        p.difficulty.toLowerCase() === 'easy'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : p.difficulty.toLowerCase() === 'medium'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] bg-white/5 text-slate-300 border border-white/10">
                      {p.primaryPattern}
                    </span>
                    {p.canonicalProblemId ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        Canonical
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20">
                        External Practice
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Walkthrough Completed
                      </span>
                    )}
                    {isPassed && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1">
                        <Award className="w-3 h-3" /> {p.canonicalProblemId ? 'Canonical Independent Pass' : 'External Independent Pass'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Focus:</span> {p.teachingFocus}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setSelectedScaffoldProblem(p)}
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs h-8 px-3 flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Walkthrough</span>
                  </Button>

                  {p.canonicalProblemId ? (
                    <Button
                      size="sm"
                      onClick={() => onOpenCanonicalAttempt(p.canonicalProblemId!)}
                      className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-3 flex items-center gap-1.5"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Workbench</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setSelectedExternalProblem(p)}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs h-8 px-3 flex items-center gap-1.5"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Log Practice</span>
                    </Button>
                  )}

                  <a
                    href={p.leetcodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title={`Open LeetCode #${p.leetcodeNumber}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part B: 5 Independent Problems */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
              B
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Part B: Independent Practice (5 Problems)
              </h3>
              <p className="text-xs text-slate-400">
                Apply learned patterns autonomously. Solve and log your attempt.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            5 Independent
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {activeModule.independent.map((p, idx) => {
            const isPassed = isProblemIndependentlyPassed(p);
            const isAssistedPass = isProblemAssisted(p);
            const canonicalProgress = p.canonicalProblemId
              ? dsaProgress[p.canonicalProblemId]
              : null;

            return (
              <div
                key={p.leetcodeNumber}
                className="bg-[#131722] border border-[#2A2F3D] hover:border-slate-600 rounded-lg p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                    <span className="font-semibold text-white text-sm">
                      LeetCode #{p.leetcodeNumber}: {p.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium border capitalize ${
                        p.difficulty.toLowerCase() === 'easy'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : p.difficulty.toLowerCase() === 'medium'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] bg-white/5 text-slate-300 border border-white/10">
                      {p.primaryPattern}
                    </span>

                    {p.canonicalProblemId ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        Canonical
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20">
                        External Practice
                      </span>
                    )}

                    {/* Progress Status Badges */}
                    {p.canonicalProblemId ? (
                      <>
                        {isPassed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Canonical Independent Pass
                            {canonicalProgress?.currentBox && ` (Box ${canonicalProgress.currentBox})`}
                          </span>
                        )}
                        {isAssistedPass && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/15 border border-amber-500/40 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Canonical Assisted Pass (Provisional)
                          </span>
                        )}
                        {!isPassed && !isAssistedPass && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-white/5 border border-white/5">
                            Not Yet Attempted
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {isPassed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-purple-400 bg-purple-500/15 border border-purple-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> External Independent Pass (Self-Reported)
                          </span>
                        )}
                        {isAssistedPass && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/15 border border-amber-500/40 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> External Assisted Pass (Self-Reported)
                          </span>
                        )}
                        {!isPassed && !isAssistedPass && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-white/5 border border-white/5">
                            External Practice (Unattempted)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Focus:</span> {p.teachingFocus}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.canonicalProblemId ? (
                    <Button
                      size="sm"
                      onClick={() => onOpenCanonicalAttempt(p.canonicalProblemId!)}
                      className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-3.5 flex items-center gap-1.5 font-medium"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{isPassed ? 'Practice Again' : 'Attempt Problem'}</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setSelectedExternalProblem(p)}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs h-8 px-3.5 flex items-center gap-1.5 font-medium"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{isPassed ? 'Log New Attempt' : 'Log External Practice'}</span>
                    </Button>
                  )}

                  <a
                    href={p.leetcodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title={`Open LeetCode #${p.leetcodeNumber}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {selectedScaffoldProblem && (
        <DSAGuidedScaffoldModal
          problem={selectedScaffoldProblem}
          moduleDay={activeModule.day}
          moduleTitle={activeModule.title}
          isOpen={Boolean(selectedScaffoldProblem)}
          onClose={() => setSelectedScaffoldProblem(null)}
          isCompleted={Boolean(
            dsaChallengeState.itemProgress[selectedScaffoldProblem.leetcodeNumber]?.guidedCompleted
          )}
          onToggleCompleted={(completed) =>
            markChallengeGuidedCompleted(selectedScaffoldProblem.leetcodeNumber, completed)
          }
          onOpenAttempt={
            selectedScaffoldProblem.canonicalProblemId
              ? () => {
                  const pid = selectedScaffoldProblem.canonicalProblemId!;
                  setSelectedScaffoldProblem(null);
                  onOpenCanonicalAttempt(pid);
                }
              : undefined
          }
          onOpenExternalAttempt={
            !selectedScaffoldProblem.canonicalProblemId
              ? () => {
                  const prob = selectedScaffoldProblem;
                  setSelectedScaffoldProblem(null);
                  setSelectedExternalProblem(prob);
                }
              : undefined
          }
          note={dsaChallengeState.itemProgress[selectedScaffoldProblem.leetcodeNumber]?.notes}
          onSaveNote={(note) =>
            saveChallengeItemNote(selectedScaffoldProblem.leetcodeNumber, note)
          }
        />
      )}

      {selectedExternalProblem && (
        <DSAExternalAttemptModal
          problem={selectedExternalProblem}
          isOpen={Boolean(selectedExternalProblem)}
          onClose={() => setSelectedExternalProblem(null)}
          onSubmitAttempt={(num, res, indep, notes) => {
            recordExternalChallengeAttempt(num, res, indep, notes);
          }}
        />
      )}

      {isLessonModalOpen && activeModule.lesson && (
        <DSAModuleLessonModal
          lesson={activeModule.lesson}
          guidedProblems={activeModule.guided}
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          onOpenGuidedProblem={(p) => {
            setIsLessonModalOpen(false);
            setSelectedScaffoldProblem(p);
          }}
        />
      )}
    </div>
  );
};
