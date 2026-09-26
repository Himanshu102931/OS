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
      <div className="w-full max-w-3xl bg-[#14171D] border border-[#262D38] rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Accent */}
        <div className="absolute -top-24 -right-24 size-64 bg-[#E5A93C]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Controls */}
        <div className="flex items-center justify-between border-b border-[#262D38] pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-xs font-semibold text-[#FFC665]">
              <Sparkles className="size-3.5 text-[#E5A93C]" /> Focus Mode
            </span>
            {domain && (
              <span className="text-xs text-[#8E98A8]">
                {domain.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#8E98A8] hover:text-[#F1F5F9] p-1 rounded-md hover:bg-[#1B2028] transition-colors"
            title="Exit Focus Mode"
          >
            <X className="size-5" />
          </button>
        </div>

        {isFinished ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-scale-in">
            <div className="size-16 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-[#F1F5F9]">Session Completed!</h3>
            <p className="text-sm text-[#8E98A8]">
              Great work. Evidence recorded in PlacementOS telemetry.
            </p>
          </div>
        ) : (
          <>
            {/* Task Title & Objective */}
            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] tracking-tight">{title}</h2>
              <p className="text-sm text-[#8E98A8] leading-relaxed line-clamp-2">{description}</p>
            </div>

            {/* Timer Display */}
            <div className="bg-[#0D0F12] border border-[#262D38] rounded-lg p-6 flex flex-col items-center justify-center space-y-4 shadow-inner">
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-[#FFC665] font-mono tabular-nums">
                {formatTime(secondsLeft)}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  className={`h-9 px-4 font-semibold text-xs rounded-md ${
                    isActive
                      ? 'bg-[#1B2028] text-[#F1F5F9] border border-[#262D38] hover:bg-[#222833]'
                      : 'bg-[#E5A93C] text-[#432C00] hover:bg-[#FFC665]'
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
                  className="h-9 px-3 text-xs border-[#262D38] bg-[#1B2028] text-[#8E98A8] hover:text-[#F1F5F9] rounded-md"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Reflection / Scratch Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8E98A8] flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-[#E5A93C]" /> Active Learning Scratchpad
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log key observations, key formulas, or code insights during this session..."
                className="w-full h-24 bg-[#0D0F12] border border-[#262D38] rounded-md p-3 text-xs text-[#F1F5F9] placeholder-[#5C6675] focus:border-[#E5A93C] focus:ring-1 focus:ring-[#E5A93C] transition-all resize-none"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-[#262D38] flex items-center justify-between gap-3">
              <span className="text-xs text-[#8E98A8] flex items-center gap-1">
                <Clock className="size-3.5 text-[#5C6675]" /> Target: {task?.estimatedMinutes || problem?.estimatedTimeMinutes || 45} mins
              </span>

              <Button
                onClick={handleFinish}
                className="h-10 px-6 font-bold text-xs bg-[#10B981] hover:bg-[#059669] text-[#002113] rounded-md shadow-md transition-transform active:scale-95"
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
