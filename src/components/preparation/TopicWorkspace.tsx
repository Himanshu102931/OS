import React, { useState } from 'react';
import type { PreparationTopic, TopicStageId } from '../../types';
import { usePlacement } from '../../context/PlacementContext';
import { evaluateTopicPreparedness, applyStageCompletion } from '../../engine/preparationEngine';
import { PHASES } from '../../data/seedData';
import {
  BookOpen,
  Compass,
  CheckCircle2,
  Target,
  History,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface TopicWorkspaceProps {
  topic: PreparationTopic;
  onBackToHub?: () => void;
  onStartSession?: (sessionId?: string) => void;
}

export const TopicWorkspace: React.FC<TopicWorkspaceProps> = ({
  topic,
  onBackToHub,
  onStartSession,
}) => {
  const {
    setRoute,
    skillStates,
    practiceSessions,
    practiceAttempts,
    evidenceLogs,
    preparationTopicProgress,
    updatePreparationTopicProgress,
  } = usePlacement();
  const [activeStage, setActiveStage] = useState<TopicStageId>(topic.stages[0] || 'orient');

  const topicSkill = skillStates[topic.id] || {
    topicId: topic.id,
    domainId: topic.domainId,
    freshness: 'untested' as const,
    evidenceStrength: 0,
  };

  const topicProgress = preparationTopicProgress[topic.id];

  // Reusable preparedness model (coverage / application / assessment / evidence)
  const preparedness = evaluateTopicPreparedness({
    topic,
    progress: topicProgress,
    skillState: {
      evidenceStrength: topicSkill.evidenceStrength,
      freshness: topicSkill.freshness,
    },
    attempts: practiceAttempts,
  });

  const recommendedPhase = PHASES.find((p) => p.id === topic.recommendedPhase);

  const handleMarkStageComplete = () => {
    const updated = applyStageCompletion(
      topic,
      topicProgress,
      activeStage,
      new Date().toISOString()
    );
    updatePreparationTopicProgress(updated);
  };

  // Topic specific sessions
  const matchingSessions = practiceSessions.filter(
    (s) => s.topicId === topic.id || s.domainId === topic.domainId
  );

  // Topic specific attempts
  const topicAttempts = practiceAttempts.filter(
    (a) => a.topicId === topic.id || a.domainId === topic.domainId
  );

  // Topic specific evidence logs
  const topicEvidence = evidenceLogs.filter(
    (e) => e.topicId === topic.id || e.domainId === topic.domainId
  );

  const stageIcons: Record<TopicStageId, React.FC<{ className?: string }>> = {
    orient: Compass,
    learn: BookOpen,
    apply: Layers,
    assess: Target,
    review: History,
    interview: MessageSquare,
    evidence: ShieldCheck,
  };

  const stageLabels: Record<TopicStageId, string> = {
    orient: 'Orient',
    learn: 'Learn',
    apply: 'Apply',
    assess: 'Assess',
    review: 'Review',
    interview: 'Interview',
    evidence: 'Evidence',
  };

  const navigateToRoadmap = () => {
    setRoute('roadmap', topic.roadmapTopicId);
  };

  const isStageCompleted = (stage: TopicStageId) =>
    topicProgress?.completedStages.includes(stage) ?? false;

  const getFreshnessBadgeClass = (freshness: string) => {
    switch (freshness) {
      case 'fresh':
        return 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30';
      case 'aging':
        return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30';
      case 'stale':
        return 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30';
      case 'untested':
      default:
        return 'bg-[#8E98A8]/15 text-[#8E98A8] border-[#8E98A8]/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#262D38]">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#14171D] border border-[#262D38] text-xs text-[#8E98A8] hover:text-[#F1F5F9] hover:border-[#3B4556] transition-all"
            >
              <ArrowLeft className="size-3.5" />
              <span>Preparation Hub</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-[#8E98A8]">
            <span className="uppercase tracking-wider font-semibold text-[#E5A93C]">{topic.domainId}</span>
            <ChevronRight className="size-3.5 text-[#5C6675]" />
            <span className="text-[#F1F5F9] font-medium">{topic.title}</span>
          </div>
        </div>

        <button
          onClick={navigateToRoadmap}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-xs font-medium text-[#E5A93C] hover:bg-[#262D38] transition-all"
        >
          <Layers className="size-3.5" />
          <span>View in Roadmap</span>
        </button>
      </div>

      {/* Main Header & Overview Banner */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight">{topic.title}</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded border uppercase font-medium bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]/30">
                {preparedness.readiness.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 text-[11px] font-mono rounded border uppercase font-medium ${getFreshnessBadgeClass(topicSkill.freshness)}`}>
                {topicSkill.freshness}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#5C6675] mb-2">
              <span className={topic.priority === 'high' ? 'text-[#E5A93C]' : ''}>
                {topic.priority.toUpperCase()} PRIORITY
              </span>
              <span>•</span>
              <span>{recommendedPhase?.name || topic.recommendedPhase}</span>
              <span>•</span>
              <span>~{topic.estimatedMinutes} min</span>
              <span>•</span>
              <span>
                Level {preparedness.currentLevel} / {preparedness.targetLevel} target
              </span>
            </div>
            <p className="text-sm text-[#8E98A8] leading-relaxed max-w-3xl">{topic.description}</p>
          </div>

          <div className="shrink-0 bg-[#1B2028] border border-[#262D38] rounded-[4px] p-3 text-right">
            <span className="block text-[11px] text-[#8E98A8] uppercase font-mono tracking-wider">Evidence Score</span>
            <span className="text-2xl font-bold font-mono text-[#E5A93C]">{topicSkill.evidenceStrength} / 100</span>
          </div>
        </div>

        {/* Preparedness Model: four proof pillars + missing proof */}
        <div className="pt-3 border-t border-[#262D38]/80 space-y-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            {[
              { label: 'Covered', ok: preparedness.covered, detail: `${preparedness.coveragePct}%` },
              { label: 'Practiced', ok: preparedness.practiced, detail: `${preparedness.attemptCount} attempts` },
              { label: 'Assessed', ok: preparedness.assessmentPerformance !== null && preparedness.assessmentPerformance >= 70, detail: preparedness.assessmentPerformance !== null ? `${preparedness.assessmentPerformance}% best` : 'no attempt' },
              { label: 'Retained', ok: preparedness.evidenceStrength >= 60 && preparedness.evidenceFreshness !== 'stale' && preparedness.evidenceFreshness !== 'untested', detail: `${preparedness.evidenceStrength}/100` },
              { label: 'Interview', ok: preparedness.interviewProof, detail: preparedness.interviewProof ? 'proven' : 'missing' },
            ].map((pillar) => (
              <span
                key={pillar.label}
                className={`px-2 py-1 rounded border ${
                  pillar.ok
                    ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#1B2028] text-[#8E98A8] border-[#262D38]'
                }`}
              >
                {pillar.ok ? '✓' : '○'} {pillar.label}
                <span className="text-[#5C6675] ml-1">{pillar.detail}</span>
              </span>
            ))}
          </div>
          {preparedness.missingProof.length > 0 && (
            <ul className="space-y-1">
              {preparedness.missingProof.map((gap, i) => (
                <li key={i} className="text-[11px] text-[#8E98A8] flex items-start gap-1.5">
                  <span className="text-[#F59E0B] shrink-0">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Current Primary Action Bar (Progressive Disclosure) */}
        <div className="pt-3 border-t border-[#262D38]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1B2028]/40 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-[6px]">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="size-4 text-[#E5A93C]" />
            <span className="text-[#8E98A8]">Next Recommended Action:</span>
            <span className="text-[#F1F5F9] font-medium">{preparedness.nextAction}</span>
          </div>
          {onStartSession && (
            <button
              onClick={() => onStartSession(matchingSessions[0]?.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-semibold text-xs transition-all shadow-sm shrink-0"
            >
              <span>Start Assessment Drill</span>
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progressive Disclosure Stage Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#262D38]">
        {topic.stages.map((stageId) => {
          const Icon = stageIcons[stageId] || Compass;
          const isActive = activeStage === stageId;
          return (
            <button
              key={stageId}
              onClick={() => setActiveStage(stageId)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#1B2028] text-[#E5A93C] border border-[#3B4556] font-semibold shadow-xs'
                  : 'text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]/50 border border-transparent'
              }`}
            >
              <Icon className={`size-3.5 ${isActive ? 'text-[#E5A93C]' : 'text-[#5C6675]'}`} />
              <span>{stageLabels[stageId]}</span>
            </button>
          );
        })}
      </div>

      {/* Stage Content Panel */}
      <div className="bg-[#14171D] border border-[#262D38] rounded-[6px] p-5 sm:p-6">
        {/* Stage completion control */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#262D38]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#5C6675]">
            Stage: {stageLabels[activeStage]} · Curriculum {preparedness.coveragePct}% covered
          </span>
          {isStageCompleted(activeStage) ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
              <CheckCircle2 className="size-3.5" /> Stage completed
            </span>
          ) : (
            <button
              onClick={handleMarkStageComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded bg-[#1B2028] border border-[#3B4556] text-[#F1F5F9] hover:border-[#E5A93C] hover:text-[#E5A93C] transition-all"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Mark {stageLabels[activeStage]} complete</span>
            </button>
          )}
        </div>
        {/* Stage 1: ORIENT */}
        {activeStage === 'orient' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Compass className="size-4 text-[#E5A93C]" />
                <span>Why This Topic Matters</span>
              </h3>
              <p className="text-xs text-[#8E98A8] leading-relaxed bg-[#1B2028] p-3.5 rounded border border-[#262D38]">
                {topic.whyItMatters}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2">Prerequisites</h3>
              <div className="flex flex-wrap gap-2">
                {topic.prerequisites.map((prereq, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs bg-[#1B2028] border border-[#262D38] rounded text-[#8E98A8]">
                    • {prereq}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2">What "Ready" Means</h3>
                <ul className="space-y-1.5">
                  {topic.completionCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                      <CheckCircle2 className="size-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2">Evidence Required</h3>
                <ul className="space-y-1.5">
                  {topic.evidenceCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                      <ShieldCheck className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: LEARN */}
        {activeStage === 'learn' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-3">Curriculum Subtopics</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {topic.subtopics.map((sub, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                    <span className="text-[#5C6675] font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="size-4 text-[#E5A93C]" />
                <span>Core Learning Objectives</span>
              </h3>
              <ul className="space-y-2">
                {topic.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#8E98A8]">
                    <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-3">Recommended Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topic.recommendedResources.map((res, i) => (
                  <div key={i} className="p-3 bg-[#1B2028] border border-[#262D38] rounded flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#262D38] text-[#8E98A8] rounded inline-block mb-1">
                        {res.type}
                      </span>
                      <h4 className="text-xs font-medium text-[#F1F5F9]">{res.title}</h4>
                    </div>
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#E5A93C] hover:underline flex items-center gap-1 font-medium mt-1"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: APPLY */}
        {activeStage === 'apply' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers className="size-4 text-[#E5A93C]" />
                <span>Practice Activities</span>
              </h3>
              <ul className="space-y-1.5">
                {topic.practiceActivities.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                    <CheckCircle2 className="size-3.5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2">Available Practice & Execution Modules</h3>
            {matchingSessions.length === 0 ? (
              <p className="text-xs text-[#8E98A8]">No dedicated practice module defined yet for this topic.</p>
            ) : (
              <div className="space-y-2.5">
                {matchingSessions.map((session) => (
                  <div key={session.id} className="p-4 bg-[#1B2028] border border-[#262D38] rounded flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-[#F1F5F9]">{session.title}</h4>
                      <p className="text-[11px] text-[#8E98A8] mt-0.5">{session.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-[#5C6675] font-mono mt-2">
                        <span>{session.estimatedMinutes} mins</span>
                        <span>•</span>
                        <span>{session.questionCount} Questions</span>
                        <span>•</span>
                        <span>{session.category}</span>
                      </div>
                    </div>
                    {onStartSession && (
                      <button
                        onClick={() => onStartSession(session.id)}
                        className="px-3 py-1.5 bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-semibold text-xs rounded transition-all shrink-0"
                      >
                        Start
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Stage 4: ASSESS */}
        {activeStage === 'assess' && (
          <div className="space-y-4 text-center py-4">
            <Target className="size-8 text-[#E5A93C] mx-auto" />
            <h3 className="text-base font-semibold text-[#F1F5F9]">Deterministic Practice Assessment Engine</h3>
            <p className="text-xs text-[#8E98A8] max-w-md mx-auto">
              Test your proficiency with timed questions. Successful completion logs objective evidence into PlacementOS.
            </p>
            {onStartSession && (
              <button
                onClick={() => onStartSession(matchingSessions[0]?.id)}
                className="px-5 py-2.5 bg-[#E5A93C] hover:bg-[#F5B84C] text-[#0D0F12] font-bold text-xs rounded shadow transition-all inline-flex items-center gap-2"
              >
                <span>Launch Assessment Session</span>
                <ArrowRight className="size-4" />
              </button>
            )}
            <div className="text-left max-w-md mx-auto pt-3 border-t border-[#262D38]">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#5C6675] mb-2">Assessment Types</h4>
              <ul className="space-y-1.5">
                {topic.assessmentTypes.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                    <Target className="size-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Stage 5: REVIEW */}
        {activeStage === 'review' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2 flex items-center gap-2">
              <History className="size-4 text-[#E5A93C]" />
              <span>Historical Practice Attempts</span>
            </h3>
            {topicAttempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8E98A8] bg-[#1B2028] border border-[#262D38] rounded">
                No recorded attempts yet for this topic.
              </div>
            ) : (
              <div className="space-y-2">
                {topicAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-3 bg-[#1B2028] border border-[#262D38] rounded flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-[#F1F5F9]">{attempt.sessionTitle}</span>
                      <span className="text-[10px] text-[#8E98A8] block">{attempt.date} • {Math.round(attempt.totalTimeSeconds / 60)} mins</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[#E5A93C] font-bold">{attempt.accuracyPct}% Accuracy</span>
                      <span className="text-[10px] text-[#8E98A8] block">{attempt.correctCount}/{attempt.totalQuestions} correct</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 6: INTERVIEW */}
        {activeStage === 'interview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="size-4 text-[#E5A93C]" />
              <span>Technical Interview & Viva Prompts</span>
            </h3>
            <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded space-y-3">
              <p className="text-xs text-[#8E98A8]">
                Practice explaining concepts out loud or writing defense notes. Interview viva evaluates conceptual clarity and trade-off justification.
              </p>
              <div className="p-3 bg-[#14171D] border border-[#262D38] rounded text-xs text-[#F1F5F9]">
                <strong className="text-[#E5A93C] block mb-1">Common Interview Question:</strong>
                "Explain the core trade-offs and edge cases when working with {topic.title}."
              </div>
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#5C6675] mb-2">
                  Interview Checkpoints
                </h4>
                <ul className="space-y-1.5">
                  {topic.interviewCheckpoints.map((cp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#8E98A8]">
                      <MessageSquare className="size-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                      <span>{cp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Stage 7: EVIDENCE */}
        {activeStage === 'evidence' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#E5A93C]" />
              <span>Evidence Trail & Telemetry</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded">
                <span className="text-[11px] text-[#8E98A8] font-mono block">Calculated Evidence Score</span>
                <span className="text-3xl font-bold font-mono text-[#E5A93C] mt-1 block">{topicSkill.evidenceStrength} / 100</span>
                <span className="text-[11px] text-[#5C6675] mt-1 block">Freshness: {topicSkill.freshness}</span>
              </div>
              <div className="p-4 bg-[#1B2028] border border-[#262D38] rounded">
                <span className="text-[11px] text-[#8E98A8] font-mono block">Recorded Evidence Events</span>
                <span className="text-3xl font-bold font-mono text-[#F1F5F9] mt-1 block">{topicEvidence.length}</span>
                <span className="text-[11px] text-[#5C6675] mt-1 block">Canonical log events</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
