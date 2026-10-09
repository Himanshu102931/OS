import React, { useState, useEffect } from 'react';
import type { TaskDefinition, DomainDefinition, DSAProblem } from '../../types';
import { Play, Pause, RotateCcw, CheckCircle2, X, Sparkles, Clock, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';

interface FocusModeModalProps {
  task?: TaskDefinition | null;
  problem?: DSAProblem | null;
  domain?: DomainDefinition;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  task,
  problem,
  domain,
  isOpen,
  onClose,
  onComplete,
}) => {
  const initialSeconds = (task?.estimatedMinutes || problem?.estimatedTimeMinutes || 45) * 60;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen && isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isActive, secondsLeft]);

  if (!isOpen) return null;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinish = () => {
    setIsFinished(true);
    setIsActive(false);
    setTimeout(() => {
      onComplete();
      onClose();
      setIsFinished(false);
      setSecondsLeft(initialSeconds);
    }, 1400);
  };

  const title = task?.title || problem?.title || 'Focused Placement Session';
  const description = task?.description || problem?.primaryPattern || 'Focus on your core placement objective.';

  return (
    <div className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 font-sans">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Accent */}
        <div className="absolute -top-24 -right-24 size-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Controls */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/30 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5 text-accent" /> Focus Mode
            </span>
            {domain && (
              <span className="text-xs text-foreground-muted">
                {domain.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground p-1 rounded-md hover:bg-surface-elevated transition-colors"
            title="Exit Focus Mode"
          >
            <X className="size-5" />
          </button>
        </div>

        {isFinished ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-scale-in">
            <div className="size-16 rounded-full bg-status-success/20 border border-status-success/40 flex items-center justify-center text-status-success animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Session Completed!</h3>
            <p className="text-sm text-foreground-muted">
              Great work. Evidence recorded in PlacementOS telemetry.
            </p>
          </div>
        ) : (
          <>
            {/* Task Title & Objective */}
            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
              <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2">{description}</p>
            </div>

            {/* Timer Display */}
            <div className="bg-background border border-border rounded-lg p-6 flex flex-col items-center justify-center space-y-4 shadow-inner">
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-accent font-mono tabular-nums">
                {formatTime(secondsLeft)}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  className={`h-9 px-4 font-semibold text-xs rounded-md ${
                    isActive
                      ? 'bg-surface-elevated text-foreground border border-border hover:bg-surface-muted'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Pause className="size-3.5 mr-1.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 mr-1.5" /> Resume
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsActive(false);
                    setSecondsLeft(initialSeconds);
                  }}
                  className="h-9 px-3 text-xs border-border bg-surface-elevated text-foreground-muted hover:text-foreground rounded-md"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Reflection / Scratch Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-accent" /> Active Learning Scratchpad
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log key observations, key formulas, or code insights during this session..."
                className="w-full h-24 bg-background border border-border rounded-md p-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <Clock className="size-3.5 text-secondary" /> Target: {task?.estimatedMinutes || problem?.estimatedTimeMinutes || 45} mins
              </span>

              <Button
                onClick={handleFinish}
                className="h-10 px-6 font-bold text-xs bg-status-success hover:bg-status-success/90 text-primary-foreground rounded-md shadow-md transition-transform active:scale-95"
              >
                <CheckCircle2 className="size-4 mr-2" /> Complete & Record Evidence
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
