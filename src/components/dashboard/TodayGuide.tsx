import React, { useState, useCallback, useRef, useEffect, useId } from 'react';
import {
  Sparkles, Compass, Target, BookOpen, Zap, Eye,
  ChevronDown, ChevronLeft, ChevronRight, X, Play,
} from 'lucide-react';
import { Button } from '../ui/button';

interface GuideStep {
  id: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  /**
   * C7-06 — id of the Today section that owns this step. Anchors reference the
   * EXISTING `data-reveal` ids written by DashboardView (`hero`, `journey`,
   * `signals`, …), so there is no second table of section identifiers to drift.
   */
  anchor: string;
}

const GUIDE_SECTIONS: { title: string; steps: GuideStep[] }[] = [
  {
    title: 'What Today Does',
    steps: [
      { id: 'what', icon: Compass, anchor: 'hero', title: 'Your Daily Control Center', description: 'Today shows your highest-priority task based on urgency, weakness, importance, and spaced repetition.' },
      { id: 'how', icon: Zap, anchor: 'journey', title: 'How It Works', description: 'The adaptive engine scores every pending task and surfaces the one that moves the needle most.' },
    ],
  },
  {
    title: 'Using Today',
    steps: [
      { id: 'primary', icon: Target, anchor: 'hero', title: 'The Primary Action', description: 'This is the single task you should focus on now. Click it to open the learning workspace.' },
      { id: 'actions', icon: BookOpen, anchor: 'hero', title: 'Complete, Postpone, Skip', description: 'Complete marks progress. Postpone pushes it to tomorrow. Skip defers it without marking done.' },
      { id: 'focus', icon: Zap, anchor: 'hero', title: 'Focus Mode', description: 'Start a distraction-free session for the current task with a built-in timer.' },
    ],
  },
  {
    title: 'The Visual Scene',
    steps: [
      { id: 'nodes', icon: Eye, anchor: 'hero', title: 'Domain Nodes', description: 'Each node represents a skill domain. Color and pulse state show readiness. Click to navigate.' },
      { id: 'signal', icon: Sparkles, anchor: 'signals', title: 'Signal Propagation', description: 'Animated signals show which domains need attention and how evidence flows through the system.' },
    ],
  },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const TodayGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isWalkthrough, setIsWalkthrough] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const panelId = useId();

  /**
   * C7-06 — the single close path. It also resets the walkthrough, so
   * reopening ALWAYS starts from the section list: skip, close, Escape,
   * outside click and "Done" all end in the same predictable state.
   * (The previous `dismissed` session state was set but never read by
   * anything, so it controlled no rendering and has been removed.)
   */
  const closeGuide = useCallback(() => {
    setIsOpen(false);
    setIsWalkthrough(false);
    setWalkthroughStep(0);
  }, []);

  const toggleOpen = useCallback(() => setIsOpen((v) => !v), []);

  const startWalkthrough = useCallback(() => {
    setIsWalkthrough(true);
    setWalkthroughStep(0);
    setIsOpen(true);
  }, []);

  const nextWalkthroughStep = useCallback(() => {
    const allSteps = GUIDE_SECTIONS.flatMap((s) => s.steps);
    if (walkthroughStep < allSteps.length - 1) {
      setWalkthroughStep((w) => w + 1);
    } else {
      closeGuide();
    }
  }, [walkthroughStep, closeGuide]);

  const previousWalkthroughStep = useCallback(() => {
    setWalkthroughStep((w) => Math.max(0, w - 1));
  }, []);

  /** C7-06 — section anchors scroll to the real Today section, then close. */
  const scrollToAnchor = useCallback(
    (anchor: string) => {
      const el = document.querySelector<HTMLElement>(`[data-reveal="${anchor}"]`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      }
      closeGuide();
    },
    [closeGuide]
  );

  // Focus: move INTO the panel when it opens, back to the trigger when it
  // closes. No trap — Tab still moves normally and Escape always closes.
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
      wasOpen.current = true;
    } else if (!isOpen && wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Escape + outside click close the popover.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuide();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (drawerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeGuide();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen, closeGuide]);

  const allSteps = GUIDE_SECTIONS.flatMap((s) => s.steps);
  const currentStep = isWalkthrough ? allSteps[walkthroughStep] : null;

  return (
    <div className="relative">
      {/* Guide Toggle Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-secondary hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-surface-elevated border border-transparent hover:border-border"
        aria-label="Toggle Today Guide"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        data-testid="today-guide-trigger"
      >
        {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Guide
      </button>

      {/* Guide Drawer */}
      {isOpen && (
        <div
          ref={drawerRef}
          id={panelId}
          role="dialog"
          aria-label="Today Guide"
          tabIndex={-1}
          data-testid="today-guide-dialog"
          className="today-guide-panel absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-lg shadow-xl z-30 animate-fade-in overflow-hidden"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <span className="text-xs font-bold text-foreground">Today Guide</span>
            </div>
            <div className="flex items-center gap-1">
              {!isWalkthrough ? (
                <Button size="xs" variant="ghost" onClick={startWalkthrough}
                  data-testid="guide-start"
                  className="h-6 text-[10px] text-accent hover:text-accent-hover">
                  <Play className="size-2.5 mr-1" /> Walkthrough
                </Button>
              ) : (
                <Button size="xs" variant="ghost" onClick={closeGuide}
                  data-testid="guide-skip"
                  className="h-6 text-[10px] text-foreground-muted hover:text-foreground">
                  Skip
                </Button>
              )}
              <button type="button" onClick={closeGuide} data-testid="guide-close"
                aria-label="Close Today Guide"
                className="p-1 rounded text-foreground-muted hover:text-foreground">
                <X className="size-3" />
              </button>
            </div>
          </div>

          {/* Walkthrough progress */}
          {isWalkthrough && (
            <div className="px-4 py-2 bg-surface-elevated/50 border-b border-border">
              <div className="flex items-center gap-2">
                {allSteps.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= walkthroughStep ? 'bg-primary' : 'bg-border'}`} />
                ))}
                <span className="text-[9px] font-mono text-foreground-muted ml-2" data-testid="guide-step-count">
                  {walkthroughStep + 1}/{allSteps.length}
                </span>
              </div>
            </div>
          )}

          {/* Current walkthrough step or sections */}
          <div className="p-4 space-y-4">
            {isWalkthrough && currentStep ? (
              <div key={currentStep.id} className="animate-fade-in" data-testid="guide-step">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                    <currentStep.icon className="size-4 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground">{currentStep.title}</h4>
                    <p className="text-[11px] text-foreground-muted leading-relaxed">{currentStep.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button size="xs" variant="ghost" onClick={previousWalkthroughStep}
                    disabled={walkthroughStep === 0}
                    data-testid="guide-prev"
                    className="h-7 text-[11px] font-medium text-foreground-muted hover:text-foreground disabled:opacity-40">
                    <ChevronLeft className="size-3 mr-1" /> Previous
                  </Button>
                  <Button size="xs" onClick={nextWalkthroughStep}
                    data-testid="guide-next"
                    className="h-7 text-[11px] font-bold bg-primary hover:bg-primary-hover text-primary-foreground">
                    {walkthroughStep < allSteps.length - 1 ? 'Next →' : 'Done'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Section list — each entry scrolls to the section it describes */
              GUIDE_SECTIONS.map((section, si) => (
                <div key={si} className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                    {section.title}
                  </h3>
                  {section.steps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => scrollToAnchor(step.anchor)}
                      data-testid="guide-anchor"
                      data-anchor={step.anchor}
                      className="w-full flex items-start gap-2.5 text-left group cursor-pointer hover:bg-surface-elevated/50 rounded-md p-1.5 -mx-1 transition-colors"
                    >
                      <span className="w-6 h-6 rounded bg-surface-elevated border border-border flex items-center justify-center shrink-0 group-hover:border-accent/30 transition-colors">
                        <step.icon className="size-3 text-foreground-muted group-hover:text-accent transition-colors" />
                      </span>
                      <span className="block">
                        <span className="block text-[11px] font-semibold text-foreground">{step.title}</span>
                        <span className="block text-[10px] text-foreground-muted leading-relaxed">{step.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
