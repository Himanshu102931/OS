import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, X, RotateCcw } from 'lucide-react';

interface CompletionAnimationProps {
  taskTitle: string;
  onDismiss: () => void;
  onUndo: () => void;
  /** The refreshed top candidate, when one exists. */
  nextTask?: { title: string } | null;
  /**
   * C7-07 — the real navigation action for "Open Next Step". Omitted when no
   * next step is available, in which case the control is not rendered at all
   * rather than shown clickable and inert.
   */
  onOpenNext?: (() => void) | null;
  /** Score of the evidence event the completion transaction already wrote. */
  evidenceScore?: number;
  /** Human-readable topic name — never a raw internal topic id. */
  evidenceTopicLabel?: string;
}

/**
 * C7-07 — read-only presentation of ONE completed transaction. It renders
 * summary data supplied by DashboardView (task title, the existing evidence
 * event, the refreshed next candidate); it creates no evidence, no skill
 * credit and no completion of its own.
 */
export const CompletionAnimation: React.FC<CompletionAnimationProps> = ({
  taskTitle, onDismiss, onUndo, nextTask, onOpenNext, evidenceScore, evidenceTopicLabel,
}) => {
  const [phase, setPhase] = useState<'entering' | 'propagating' | 'settled' | 'done'>('entering');
  const [signalProgress, setSignalProgress] = useState(0);
  const [showNextTask, setShowNextTask] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('propagating'), 400);
    const t2 = setTimeout(() => {
      setSignalProgress(1);
      setPhase('settled');
    }, 1200);
    const t3 = setTimeout(() => {
      setShowNextTask(true);
      setPhase('done');
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const hasEvidence = typeof evidenceScore === 'number';
  const canOpenNext = showNextTask && !!nextTask && !!onOpenNext;

  return (
    <div
      role="status"
      data-testid="completion-animation"
      data-guide-target="today-completion-result"
      className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-[28rem] z-50 overflow-hidden rounded-xl border shadow-2xl animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)',
        borderColor: phase === 'done' ? 'color-mix(in srgb, var(--success) 50%, transparent)' : 'color-mix(in srgb, var(--warning) 40%, transparent)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-border-default overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-success transition-all duration-1000 ease-out"
          style={{ width: phase === 'done' ? '100%' : `${signalProgress * 100}%` }}
        />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`transition-all duration-500 ${phase === 'done' ? 'scale-110' : 'scale-100'}`}>
              <CheckCircle2 className="size-5 text-status-success" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Task Completed</p>
              <p className="text-[11px] text-text-secondary truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss" data-testid="completion-dismiss" className="text-text-secondary hover:text-text-primary p-1">
            <X className="size-4" />
          </button>
        </div>

        {/* Shown only when the completion really produced an evidence event. */}
        {hasEvidence && (
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-canvas rounded-lg border border-border-default">
            <ShieldCheck className="size-4 text-accent" />
            <div className="flex-1">
              <p className="text-[10px] text-text-secondary">Evidence recorded</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-accent font-bold">+{evidenceScore}</span>
                {evidenceTopicLabel && (
                  <span className="text-[9px] font-mono text-text-secondary">{evidenceTopicLabel}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {canOpenNext && (
          <div className="pt-2 border-t border-border-default/50 animate-fade-in">
            <p className="text-[11px] text-text-secondary">
              <span className="text-accent font-semibold">Next: </span>
              <span className="text-text-primary">{nextTask!.title}</span>
            </p>
            <button
              type="button"
              onClick={() => onOpenNext!()}
              data-testid="completion-open-next"
              className="text-[11px] text-accent hover:text-text-primary font-semibold flex items-center gap-1 mt-1 transition-colors"
            >
              Open Next Step <ArrowRight className="size-3" />
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={onUndo} data-testid="completion-undo"
            className="text-[11px] text-text-secondary hover:text-text-primary font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-surface-elevated">
            <RotateCcw className="size-3" /> Undo
          </button>
        </div>
      </div>
    </div>
  );
};
