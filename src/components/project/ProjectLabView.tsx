import React, { useState } from 'react';
import type { ProjectLabSectionId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import {
  summarizePracticeAnswers,
  isObjectiveQuestionType,
} from '../../engine/practiceEngine';
import { PracticeSessionRunner } from '../preparation/PracticeSessionRunner';
import { GuideTrigger } from '../guide/GuideTrigger';
import { PROJECT_LAB_CONTENT } from '../../data/projectLabContent';
import {
  FolderGit2,
  Cpu,
  Code2,
  ShieldCheck,
  Award,
  ArrowRight,
  Terminal,
  CheckCircle2,
} from 'lucide-react';



export const ProjectLabView: React.FC = () => {
  const { practiceSessions, practiceAttempts } = usePlacement();
  const [activeSection, setActiveSection] = useState<ProjectLabSectionId>('overview');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  const defenseSession = practiceSessions.find((s) => s.category === 'project_defense');
  const projectAttempts = practiceAttempts.filter((a) => a.category === 'project_defense');
  const latestAttempt = projectAttempts[0] ?? null;
  const sectionContent = PROJECT_LAB_CONTENT.find((c) => c.id === activeSection);

  // Completion is claimed ONLY from recorded data: a passed defense, or a
  // recorded defense attempt for the evidence trail. Which tab happens to be
  // open never completes anything.
  const sectionCompleted: Record<ProjectLabSectionId, boolean> = {
    overview: false,
    architecture: false,
    implementation: false,
    practices: false,
    defense: projectAttempts.some((a) => a.passed === true),
    evidence: projectAttempts.length > 0,
  };

  const sections: { id: ProjectLabSectionId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Project Overview', icon: FolderGit2 },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
    { id: 'implementation', label: 'Implementation', icon: Code2 },
    { id: 'practices', label: 'Engineering Practices', icon: Terminal },
    { id: 'defense', label: 'Defense & Viva', icon: ShieldCheck },
    { id: 'evidence', label: 'Evidence', icon: Award },
  ];

  const startDefense = () => {
    if (defenseSession) setActiveSessionId(defenseSession.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-[#262D38] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#E5A93C]/15 text-[#E5A93C] rounded border border-[#E5A93C]/30 font-bold">
              Engineering System
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight">PROJECT LAB</h1>
          <p className="text-sm text-[#8E98A8]">
            BUILD → UNDERSTAND → EXPLAIN → DEFEND. Personal OS is your primary portfolio project.
          </p>
        </div>
        <GuideTrigger route="project" />
      </div>

      {/* Core Philosophy Banner */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Project Learning Discipline</h2>
          <p className="text-xs text-[#8E98A8]">
            PlacementOS prioritizes genuine understanding over feature count. You must be prepared to defend architecture, trade-offs, and code logic live.
          </p>
        </div>
        {defenseSession && (
          <button
            onClick={startDefense}
            className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm hover-lift"
          >
            <span>Start Project Defense</span>
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>

      {/* Section Navigation Tabs with flow progression */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#262D38]">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          const isCompleted = sectionCompleted[sec.id];
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all whitespace-nowrap flow-step ${
                isActive
                  ? 'bg-[#1B2028] text-[#E5A93C] border border-[#3B4556] font-semibold shadow-xs active'
                  : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/50 border border-transparent'
              } ${isCompleted && !isActive ? 'completed' : ''}`}
            >
              <Icon className={`size-3.5 ${isActive ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-5 sm:p-6">
        {sectionContent && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#F1F5F9]">{sectionContent.heading}</h3>
              <p className="text-xs text-[#8E98A8] leading-relaxed">{sectionContent.intro}</p>
            </div>

            {sectionContent.flow && (
              <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded space-y-3 font-mono text-xs">
                <div className="text-[#E5A93C] font-bold">Data Flow Architecture:</div>
                <div className="text-[#8E98A8] leading-relaxed">{sectionContent.flow}</div>
              </div>
            )}

            {sectionContent.cards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionContent.cards.map((card) => (
                  <div key={card.label} className="p-3.5 bg-[#1B2028] border border-[#262D38] rounded space-y-1 hover-lift">
                    <span className="text-[11px] font-mono text-[#E5A93C]">{card.label}</span>
                    <p className="text-xs text-[#F1F5F9] font-medium">{card.value}</p>
                    {card.detail && (
                      <p className="text-[11px] text-[#5C6675]">{card.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {sectionContent.points && (
              <ul className="space-y-2 text-xs text-[#8E98A8]">
                {sectionContent.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {sectionContent.blocks && (
              <div className="space-y-2 text-xs text-[#8E98A8]">
                {sectionContent.blocks.map((block) => (
                  <div key={block.title} className="p-3 bg-[#1B2028] border border-[#262D38] rounded">
                    <strong className="text-[#F1F5F9] block mb-0.5">{block.title}:</strong>
                    {block.body}
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'defense' && defenseSession && (
              <div className="defense-state p-4 bg-[#1B2028] border border-[#262D38] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t-[#3B4556]">
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9]">{defenseSession.title}</h4>
                  <p className="text-[11px] text-[#8E98A8] mt-0.5">{defenseSession.description}</p>
                  <p className="text-[10px] text-[#5C6675] font-mono mt-1">
                    {defenseSession.questions.length} prompts · pass threshold{' '}
                    {defenseSession.passingScorePct}%
                  </p>
                </div>
                <button
                  onClick={startDefense}
                  className="px-4 py-2 rounded bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs transition-all shrink-0 hover-lift"
                >
                  Launch Defense Session
                </button>
              </div>
            )}

            {activeSection === 'evidence' &&
              (projectAttempts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8E98A8] bg-[#1B2028] border border-[#262D38] rounded">
                  No recorded project defense attempts yet. Launch a defense session to build evidence.
                </div>
              ) : (
                <div className="space-y-3" data-testid="project-evidence-list">
                  {/* Truthful next action, derived from the recorded attempt */}
                  {latestAttempt && (
                    <div
                      className={`p-3 border rounded text-xs ${
                        latestAttempt.passed
                          ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                          : 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                      }`}
                      data-testid="project-next-action"
                    >
                      <span className="font-semibold block">
                        {latestAttempt.passed
                          ? latestAttempt.passingScorePct !== undefined
                            ? `Defense passed — ${latestAttempt.scorePct}% meets the ${latestAttempt.passingScorePct}% threshold.`
                            : `Defense recorded at ${latestAttempt.scorePct}%.`
                          : latestAttempt.passingScorePct !== undefined
                            ? `Defense not passed yet — ${latestAttempt.scorePct}% is below the ${latestAttempt.passingScorePct}% threshold.`
                            : `Defense recorded at ${latestAttempt.scorePct}%.`}
                      </span>
                      <span className="block mt-0.5 text-[#8E98A8]">
                        {latestAttempt.passed
                          ? 'Next: carry on with your preparation topics, or launch another defense to raise the score.'
                          : 'Next: review your recorded answers below, then launch the defense again — every run records its own attempt.'}
                      </span>
                    </div>
                  )}

                  {projectAttempts.map((attempt) => {
                    const attemptSession = practiceSessions.find((s) => s.id === attempt.sessionId);
                    const summary = attemptSession
                      ? summarizePracticeAnswers(attemptSession, attempt)
                      : null;
                    const isReviewing = reviewAttemptId === attempt.id;
                    return (
                      <div
                        key={attempt.id}
                        className="p-3 bg-[#1B2028] border border-[#262D38] rounded text-xs hover-lift"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-medium text-[#F1F5F9]">{attempt.sessionTitle}</span>
                            <span className="text-[10px] text-[#8E98A8] block">{attempt.date}</span>
                          </div>
                          <div className="text-right font-mono shrink-0">
                            <span className="text-[#E5A93C] font-bold evidence-update">
                              {attempt.scorePct}% Score
                            </span>
                            <span className="text-[10px] text-[#8E98A8] block">
                              {attempt.correctCount}/{attempt.totalQuestions} correct
                            </span>
                            {attempt.passingScorePct !== undefined && (
                              <span
                                className={`text-[10px] font-bold block ${
                                  attempt.passed ? 'text-[#10B981]' : 'text-[#EF4444]'
                                }`}
                                data-testid="attempt-verdict"
                              >
                                {attempt.passed ? 'PASS' : 'FAIL'} · needs {attempt.passingScorePct}%
                              </span>
                            )}
                            {summary && summary.unansweredCount > 0 && (
                              <span className="text-[10px] text-[#F59E0B] block" data-testid="attempt-unanswered">
                                {summary.unansweredCount} unanswered
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-[#262D38]">
                          <span className="text-[10px] text-[#5C6675] font-mono">
                            Submitted {attempt.completedAt}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewAttemptId(isReviewing ? null : attempt.id)}
                            aria-expanded={isReviewing}
                            className="text-[11px] text-[#E5A93C] hover:underline font-medium"
                          >
                            {isReviewing ? 'Hide recorded answers' : 'Review recorded answers'}
                          </button>
                        </div>

                        {isReviewing && attemptSession && (
                          <ol className="mt-2 space-y-2" data-testid="attempt-review">
                            {attemptSession.questions.map((q, idx) => {
                              const ans = attempt.userAnswers.find((a) => a.questionId === q.id);
                              const answered =
                                typeof ans?.selectedOption === 'number' ||
                                (typeof ans?.userResponse === 'string' &&
                                  ans.userResponse.trim().length > 0);
                              const selectedText =
                                typeof ans?.selectedOption === 'number' && q.options
                                  ? q.options[ans.selectedOption]
                                  : undefined;
                              return (
                                <li
                                  key={q.id}
                                  className="p-2.5 bg-[#14171D] border border-[#262D38] rounded space-y-1"
                                >
                                  <span className="text-[#8E98A8] block">
                                    {idx + 1}. {q.prompt}
                                  </span>
                                  {!answered ? (
                                    <span className="text-[#F59E0B] font-semibold block" data-testid="answer-unanswered">
                                      Not answered
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-[#F1F5F9] block">
                                        Your answer: {selectedText ?? ans?.userResponse}
                                      </span>
                                      <span
                                        className={`font-medium block ${
                                          ans?.isCorrect ? 'text-[#10B981]' : 'text-[#8E98A8]'
                                        }`}
                                      >
                                        {isObjectiveQuestionType(q.questionType)
                                          ? ans?.isCorrect
                                            ? 'Correct'
                                            : 'Incorrect'
                                          : ans?.isCorrect
                                            ? 'Self-certified correct'
                                            : 'Not self-certified as correct'}
                                      </span>
                                    </>
                                  )}
                                  {q.explanation && (
                                    <span className="text-[#5C6675] block">
                                      Model answer: {q.explanation}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Session Runner Modal */}
      {defenseSession && activeSessionId && (
        <PracticeSessionRunner
          session={defenseSession}
          onClose={() => setActiveSessionId(null)}
        />
      )}
    </div>
  );
};
