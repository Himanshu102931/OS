import React from 'react';
import type { TaskDefinition, TaskProgress, DomainDefinition } from '../../types';
import type { PriorityBreakdown } from '../../engine/adaptiveEngine';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Play,
  ShieldCheck,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';

interface TaskLearningWorkspaceDrawerProps {
  task: TaskDefinition | null;
  progress?: TaskProgress;
  domain?: DomainDefinition;
  breakdown?: PriorityBreakdown;
  isOpen: boolean;
  onClose: () => void;
  onUpdateState: (taskId: string, newState: TaskProgress['state']) => void;
}

export const TaskLearningWorkspaceDrawer: React.FC<TaskLearningWorkspaceDrawerProps> = ({
  task,
  progress,
  domain,
  breakdown,
  isOpen,
  onClose,
  onUpdateState,
}) => {
  if (!isOpen || !task) return null;

  const state = progress?.state || 'not_started';
  const meta = task.learningMetadata;

  // Default structured steps if explicit metadata is absent
  const learningSteps = meta?.learningSteps || [
    `Review core theory & definitions for ${task.title}.`,
    `Analyze standard implementation patterns and code structures.`,
    `Work through practice examples step-by-step.`,
  ];

  const practiceItems = meta?.practiceItems || [
    `Implement or write out the baseline solution for ${task.title}.`,
    `Verify edge cases and time/space complexity constraints.`,
  ];

  const selfCheckQuestions = meta?.selfCheckQuestions || [
    `Can you explain the core concepts of this topic without looking at notes?`,
    `Do you understand when to apply this technique versus alternatives?`,
  ];

  const completionCriteria = meta?.completionCriteria || [
    `Concept studied and key notes reviewed.`,
    `Baseline practice problem or exercise completed.`,
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-workspace-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#0D0F12]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#14171D] border-l border-[#262D38] w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#262D38] flex items-start justify-between gap-4 bg-[#1B2028]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-[#E5A93C]/10 text-[#FFC665] border border-[#E5A93C]/30">
                {domain?.name || 'General'}
              </span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs text-[#8E98A8] capitalize">{task.taskType}</span>
              <span className="text-[#5C6675]">·</span>
              <span className="text-xs text-[#FFC665] flex items-center gap-1">
                <Clock className="size-3" /> {task.estimatedMinutes} mins
              </span>
            </div>
            <h2 id="learning-workspace-title" className="text-lg font-bold text-[#F1F5F9] leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Learning Workspace"
            className="p-1.5 rounded-[4px] text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#262D38] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#8E98A8]">
          {/* Section 1: WHY */}
          <section className="space-y-2 p-3.5 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
            <h3 className="text-xs font-bold text-[#FFC665] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-4" /> 1. WHY THIS TASK MATTERS
            </h3>
            <p className="text-[#F1F5F9] leading-relaxed">{task.description}</p>
            {breakdown && (
              <div className="pt-2 border-t border-[#262D38] space-y-1 text-[11px]">
                <span className="text-[#8E98A8] block font-semibold">Recommendation Rationale:</span>
                <p className="text-[#FFC665] italic">{breakdown.explanation}</p>
                <div className="flex gap-4 pt-1 text-[10px] text-[#8E98A8]">
                  <span>Urgency: <strong className="text-[#F1F5F9]">{breakdown.urgency}</strong></span>
                  <span>Weakness: <strong className="text-[#F1F5F9]">{breakdown.weakness}</strong></span>
                  <span>Importance: <strong className="text-[#F1F5F9]">{task.importance}/10</strong></span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: LEARN */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="size-4 text-[#E5A93C]" /> 2. CONCEPT & LEARNING STEPS
            </h3>

            <div className="space-y-2">
              {learningSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38]">
                  <span className="size-5 rounded-[4px] bg-[#14171D] text-[#FFC665] font-bold flex items-center justify-center shrink-0 text-[10px] border border-[#262D38]">
                    {idx + 1}
                  </span>
                  <span className="text-[#F1F5F9] font-medium leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            {/* Resources (Authoritative only, no fake URLs) */}
            {meta?.primaryResource && (
              <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1">
                <span className="text-[10px] text-[#8E98A8] uppercase font-bold block">Primary Resource</span>
                {meta.primaryResource.url ? (
                  <a
                    href={meta.primaryResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFC665] hover:underline font-semibold flex items-center gap-1 text-xs"
                  >
                    {meta.primaryResource.title} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-[#F1F5F9] font-semibold">{meta.primaryResource.title}</span>
                )}
              </div>
            )}
          </section>

          {/* Section 3: PRACTICE */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <Target className="size-4 text-[#E5A93C]" /> 3. REQUIRED PRACTICE ITEMS
            </h3>
            <div className="space-y-1.5">
              {practiceItems.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#F1F5F9]">
                  • {item}
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: SELF-CHECK */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="size-4 text-amber-400" /> 4. SELF-CHECK VERIFICATION
            </h3>
            <div className="space-y-1.5">
              {selfCheckQuestions.map((q, idx) => (
                <div key={idx} className="p-2.5 rounded-[4px] bg-[#1B2028] border border-[#262D38] text-[#8E98A8] flex items-start gap-2">
                  <HelpCircle className="size-3.5 text-[#FFC665] shrink-0 mt-0.5" />
                  <span className="text-[#F1F5F9]">{q}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: DONE WHEN */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" /> 5. COMPLETION CRITERIA
            </h3>
            <div className="p-3 rounded-[4px] bg-[#1B2028] border border-[#262D38] space-y-1 text-[#F1F5F9]">
              {completionCriteria.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Drawer Actions Footer */}
        <div className="p-4 border-t border-[#262D38] bg-[#1B2028] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#8E98A8]">
            Status: <span className="font-bold capitalize text-[#F1F5F9]">{state.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            {state === 'not_started' && (
              <Button
                size="sm"
                onClick={() => onUpdateState(task.id, 'in_progress')}
                className="text-xs font-bold bg-[#E5A93C] hover:bg-[#F59E0B] text-[#432C00] rounded-[4px] px-4"
              >
                <Play className="size-3.5 mr-1.5" /> Start Task
              </Button>
            )}

            {state === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => {
                  onUpdateState(task.id, 'completed');
                  onClose();
                }}
                className="text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-[4px] px-4"
              >
                <CheckCircle2 className="size-3.5 mr-1.5" /> Complete Task
              </Button>
            )}

            {state === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateState(task.id, 'not_started')}
                className="text-xs font-bold border-[#262D38] text-[#8E98A8] hover:text-[#F1F5F9] rounded-[4px]"
              >
                Reopen Task
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
