import React, { useState } from 'react';
import type { TeacherChallengeProblem } from '../../data/teacherEightDayDSAChallenge';
import type { DSAChallengeNote } from '../../types';
import {
  X,
  BookOpen,
  Code2,
  Brain,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  Check,
  Network,
} from 'lucide-react';
import { Button } from '../ui/button';

interface DSAGuidedScaffoldModalProps {
  problem: TeacherChallengeProblem | null;
  moduleDay: number;
  moduleTitle: string;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  onToggleCompleted: (completed: boolean) => void;
  onOpenAttempt?: () => void;
  onOpenExternalAttempt?: () => void;
  note?: DSAChallengeNote;
  onSaveNote: (note: Partial<DSAChallengeNote>) => void;
}

interface DSAGuidedScaffoldContentProps extends Omit<DSAGuidedScaffoldModalProps, 'problem'> {
  problem: TeacherChallengeProblem & { scaffold: NonNullable<TeacherChallengeProblem['scaffold']> };
}

export const DSAGuidedScaffoldModal: React.FC<DSAGuidedScaffoldModalProps> = (props) => {
  if (!props.isOpen || !props.problem || !props.problem.scaffold) return null;

  return (
    <DSAGuidedScaffoldContent
      key={props.problem.leetcodeNumber}
      {...props}
      problem={
        props.problem as TeacherChallengeProblem & {
          scaffold: NonNullable<TeacherChallengeProblem['scaffold']>;
        }
      }
    />
  );
};

const DSAGuidedScaffoldContent: React.FC<DSAGuidedScaffoldContentProps> = ({
  problem,
  moduleDay,
  moduleTitle,
  onClose,
  isCompleted,
  onToggleCompleted,
  onOpenAttempt,
  onOpenExternalAttempt,
  note,
  onSaveNote,
}) => {
  const [predictedNextState, setPredictedNextState] = useState<string>('');
  const [isStateRevealed, setIsStateRevealed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'notes'>('walkthrough');
  const [showGraphDetails, setShowGraphDetails] = useState<boolean>(true);

  // Note fields initialized directly from note prop
  const [approachNote, setApproachNote] = useState<string>(note?.approach || '');
  const [invariantNote, setInvariantNote] = useState<string>(note?.invariant || '');
  const [dryRunNote, setDryRunNote] = useState<string>(note?.dryRun || '');
  const [helpNeededNote, setHelpNeededNote] = useState<string>(note?.helpNeeded || '');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const { scaffold } = problem;

  const handleSaveNotes = () => {
    onSaveNote({
      approach: approachNote,
      invariant: invariantNote,
      dryRun: dryRunNote,
      helpNeeded: helpNeededNote,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'hard':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getScaffoldLevelBadge = (level: string) => {
    switch (level) {
      case 'full':
        return { label: 'Scaffolding: Full Support (Step-by-step)', bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' };
      case 'faded-light':
      case 'light':
        return { label: 'Scaffolding: Lightly Faded (Try prediction)', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' };
      case 'faded-moderate':
      case 'medium':
        return { label: 'Scaffolding: Moderate Fading (Deeper reasoning)', bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' };
      case 'faded-high':
        return { label: 'Scaffolding: High Independence (Near autonomous)', bg: 'bg-teal-500/10 border-teal-500/30 text-teal-300' };
      case 'autonomous':
        return { label: 'Scaffolding: Autonomous (Verify invariant)', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' };
      default:
        return { label: 'Guided Scaffolding', bg: 'bg-slate-500/10 border-slate-500/30 text-slate-300' };
    }
  };

  const scaffoldBadge = getScaffoldLevelBadge(scaffold.fadedScaffoldingLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-scaffold-title"
    >
      <div className="bg-[#131722] border border-[#2A2F3D] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A2F3D] flex items-start justify-between gap-4 bg-[#181D2B]/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                Day {moduleDay}: {moduleTitle}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                {problem.primaryPattern}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${scaffoldBadge.bg}`}>
                {scaffoldBadge.label}
              </span>
              {problem.canonicalProblemId ? (
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Canonical #{problem.canonicalProblemId}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  External Curriculum
                </span>
              )}
            </div>
            <h2 id="guided-scaffold-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>LeetCode #{problem.leetcodeNumber}: {problem.title}</span>
            </h2>
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Teaching Focus:</strong> {problem.teachingFocus}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#2A2F3D] px-4 sm:px-5 bg-[#141824]">
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'walkthrough'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Guided Walkthrough & Scaffolding
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'notes'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            My Reflection & Notes
            {(note?.approach || note?.invariant) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm leading-relaxed">
          {activeTab === 'walkthrough' ? (
            <>
              {/* 1. Problem Restatement & Constraints */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold">1</span>
                  <h3>Problem Restatement & Setup</h3>
                </div>
                <p className="text-slate-300">{scaffold.problemRestatement}</p>
                <div className="bg-[#131722] p-3 rounded border border-white/5 font-mono text-xs text-slate-300 space-y-1">
                  <div><span className="text-[var(--accent)]">Input/Output:</span> {scaffold.inputsOutputs}</div>
                  <div><span className="text-amber-400">Constraints:</span> {scaffold.constraints}</div>
                </div>
              </div>

              {/* 2. Brute Force Intuition */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-500/20 text-slate-300 text-xs font-bold">2</span>
                  <h3>Beginner Brute-Force Intuition</h3>
                  <span className="ml-auto text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {scaffold.bruteForceComplexity}
                  </span>
                </div>
                <p className="text-slate-300">{scaffold.bruteForceIntuition}</p>
              </div>

              {/* 3. Worked Example & Next-State Prediction */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold">3</span>
                    <h3>Worked Example & Next-State Prediction</h3>
                  </div>
                  <span className="text-xs text-[var(--accent)] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Metacognitive Dry Run
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs text-slate-400 font-mono bg-[#131722] p-2.5 rounded border border-white/5 space-y-1">
                    <div>
                      <span className="text-slate-300 font-semibold">Input: </span>
                      <span className="text-[var(--accent)]">{scaffold.workedExample.input}</span>
                    </div>
                    {scaffold.workedExample.initialState && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-slate-500 font-medium">Initial State:</span>
                        {Object.entries(scaffold.workedExample.initialState).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-slate-300">
                            {k}: <span className="text-emerald-400">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pl-2 border-l-2 border-[#2A2F3D]">
                    {scaffold.workedExample.steps.map((step) => (
                      <div key={step.stepNumber} className="text-xs font-mono space-y-1">
                        <div className="flex items-start gap-2 text-slate-300">
                          <span className="text-slate-500 font-semibold shrink-0">Step {step.stepNumber}:</span>
                          <span>{step.description}</span>
                        </div>
                        {step.stateSnapshot && (
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {Object.entries(step.stateSnapshot).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-[#131722] text-slate-400 border border-white/5 text-[10px]">
                                {k}: <span className="text-indigo-300">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prediction Exercise Box */}
                <div className="bg-[#131722] p-4 rounded-lg border border-[var(--accent)]/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                    <Brain className="w-4 h-4" />
                    <span>Active Learning: Predict the Next State</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {scaffold.workedExample.predictionPrompt}
                  </p>

                  {!isStateRevealed ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Type your prediction here (or click Reveal to check)..."
                        value={predictedNextState}
                        onChange={(e) => setPredictedNextState(e.target.value)}
                        className="w-full bg-[#181D2B] border border-[#2A2F3D] rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                      />
                      <Button
                        size="sm"
                        onClick={() => setIsStateRevealed(true)}
                        className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-7 px-3"
                      >
                        Reveal Next State & Explanation
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-[#181D2B] p-3 rounded border border-emerald-500/30 space-y-2 text-xs animate-in fade-in-0 duration-150">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Teacher State Explanation:</span>
                      </div>
                      <p className="text-slate-200 font-mono">{scaffold.workedExample.predictionAnswer}</p>
                      {predictedNextState && (
                        <div className="text-slate-400 pt-1 border-t border-white/5">
                          <span className="text-slate-500">Your prediction: </span>
                          <span className="italic text-slate-300">"{predictedNextState}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Optimized Pattern & Invariant */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">4</span>
                    <h3>Optimized Pattern & Invariant</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Time: {scaffold.timeComplexity}
                    </span>
                    <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                      Space: {scaffold.spaceComplexity}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300">{scaffold.optimizedPattern}</p>

                <div className="bg-[#131722] p-3 rounded border-l-4 border-emerald-500 space-y-1">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Crucial Algorithm Invariant</div>
                  <p className="text-xs text-slate-200 font-mono">{scaffold.invariant}</p>
                </div>
              </div>

              {/* 5. Boundary & Failure Cases */}
              <div className="bg-[#181D2B] rounded-lg p-4 border border-[#2A2F3D] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">5</span>
                  <h3>Boundary & Failure Cases to Test</h3>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 pl-1">
                  {scaffold.boundaryEdgeCases.map((edge, idx) => (
                    <li key={idx}><span className="text-slate-200 font-mono">{edge}</span></li>
                  ))}
                </ul>
              </div>

              {/* 6. Day 8 Specific Graph dry run notes */}
              {moduleDay === 8 && scaffold.graphNotes && (
                <div className="bg-[#181D2B] rounded-lg p-4 border border-indigo-500/30 space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowGraphDetails(!showGraphDetails)}
                  >
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Network className="w-4 h-4 text-indigo-400" />
                      <h3>Day 8 Graph Architecture & Traversal Details</h3>
                    </div>
                    {showGraphDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {showGraphDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                      <div className="bg-[#131722] p-2.5 rounded border border-white/5 space-y-1">
                        <span className="text-indigo-400 font-medium block">Representation</span>
                        <span className="text-slate-300">{scaffold.graphNotes.representation}</span>
                      </div>
                      <div className="bg-[#131722] p-2.5 rounded border border-white/5 space-y-1">
                        <span className="text-indigo-400 font-medium block">Traversal Type</span>
                        <span className="text-slate-300">{scaffold.graphNotes.traversalType}</span>
                      </div>
                      <div className="bg-[#131722] p-2.5 rounded border border-white/5 space-y-1">
                        <span className="text-indigo-400 font-medium block">State Tracking</span>
                        <span className="text-slate-300">{scaffold.graphNotes.stateTracking}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Reflection & Notes Tab */
            <div className="space-y-4">
              <div className="bg-[#181D2B] p-4 rounded-lg border border-[#2A2F3D] space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[var(--accent)]" />
                  <span>Explain-Back Scaffold (Cognitive Consolidation)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Explaining an algorithm in your own words produces higher retention than passive reading. Keep your notes concise.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      My Approach & Invariant (in my own words):
                    </label>
                    <textarea
                      rows={3}
                      value={approachNote}
                      onChange={(e) => setApproachNote(e.target.value)}
                      placeholder="e.g. Keep two pointers at ends; swap characters and move inward until pointers cross..."
                      className="w-full bg-[#131722] border border-[#2A2F3D] rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Crucial Loop Condition or Invariant:
                    </label>
                    <input
                      type="text"
                      value={invariantNote}
                      onChange={(e) => setInvariantNote(e.target.value)}
                      placeholder="e.g. All elements before left and after right are in their final reversed positions."
                      className="w-full bg-[#131722] border border-[#2A2F3D] rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Dry Run Snapshot / Key Edge Cases:
                    </label>
                    <textarea
                      rows={2}
                      value={dryRunNote}
                      onChange={(e) => setDryRunNote(e.target.value)}
                      placeholder="e.g. Tested with single char ['a'], even length ['a','b'], odd length ['a','b','c']..."
                      className="w-full bg-[#131722] border border-[#2A2F3D] rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      What help did I need? (Hints, editorial, or self-solved?):
                    </label>
                    <input
                      type="text"
                      value={helpNeededNote}
                      onChange={(e) => setHelpNeededNote(e.target.value)}
                      placeholder="e.g. Understood brute force immediately; needed clarification on in-place swap pointer movement."
                      className="w-full bg-[#131722] border border-[#2A2F3D] rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-4 flex items-center gap-1.5"
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'Notes Saved!' : 'Save My Notes'}</span>
                    </Button>
                    {note?.savedAt && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Last saved: {new Date(note.savedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#2A2F3D] bg-[#141824] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onToggleCompleted(!isCompleted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-slate-500'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>{isCompleted ? 'Guided Walkthrough Completed' : 'Mark Walkthrough as Complete'}</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>LeetCode #{problem.leetcodeNumber}</span>
            </a>

            {problem.canonicalProblemId && onOpenAttempt && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAttempt();
                }}
                className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] text-xs h-8 px-3.5 flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Practice in Workbench</span>
              </Button>
            )}

            {!problem.canonicalProblemId && onOpenExternalAttempt && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenExternalAttempt();
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 px-3.5 flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Log External Practice</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 px-3 border-[#2A2F3D] text-slate-400 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
