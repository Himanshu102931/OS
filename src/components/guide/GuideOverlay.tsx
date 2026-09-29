/**
 * PlacementOS Universal Page Guide — Interactive Spotlight Overlay & Popover
 *
 * Implements a non-disruptive, spotlight tutorial layer over the live application.
 * Highlights real UI elements with an atmospheric dimmed backdrop without auto-scrolling.
 * Highlighted targets remain interactive. Zero application state is mutated.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGuide } from './GuideContext';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ExternalLink,
  CornerUpLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import { calculatePopoverPlacement } from './guidePlacement';

export const GuideOverlay: React.FC = () => {
  const {
    isOpen,
    isWalkthrough,
    stepIndex,
    totalSteps,
    currentStep,
    activeGuide,
    nextStep,
    previousStep,
    skipGuide,
    closeGuide,
  } = useGuide();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);

  // Cross-page continuation detection
  const isCrossPage = Boolean(
    activeGuide && activeGuide.currentRoute !== activeGuide.originRoute
  );

  // Position calculation with viewport bounding (NEVER auto-scrolls)
  const updateTargetPosition = useCallback(() => {
    if (!currentStep?.target || isCrossPage) {
      setTargetRect(null);
      targetElementRef.current = null;
      return;
    }

    let el: HTMLElement | null = null;
    if (typeof currentStep.target === 'string') {
      try {
        el = document.querySelector<HTMLElement>(currentStep.target);
      } catch {
        el = null;
      }
    } else if (currentStep.target instanceof HTMLElement) {
      el = currentStep.target;
    }

    targetElementRef.current = el;

    if (el) {
      const rect = el.getBoundingClientRect();
      // Only set rect if element has physical dimensions
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [currentStep, isCrossPage]);

  // Recalculate target position on step change, scroll, or resize
  useEffect(() => {
    if (!isOpen || !isWalkthrough) return;

    let animId: number;
    const handleScrollOrResize = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        updateTargetPosition();
      });
    };

    animId = requestAnimationFrame(() => {
      updateTargetPosition();
    });

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isWalkthrough, currentStep, isCrossPage, updateTargetPosition]);

  // Keyboard navigation: Escape closes
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeGuide();
      } else if (e.key === 'ArrowRight' && !e.altKey && !e.ctrlKey) {
        // Only advance if focus is within popover
        if (popoverRef.current?.contains(document.activeElement)) {
          nextStep();
        }
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.ctrlKey) {
        if (popoverRef.current?.contains(document.activeElement) && stepIndex > 0) {
          previousStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeGuide, nextStep, previousStep, stepIndex]);

  // Outside click closes the guide (clicks on popover or target are safe)
  //
  // The transparent backdrop sits ABOVE the page, so a pointer-down landing
  // inside the spotlight cutout would hit the backdrop and close the tour
  // instead of reaching the highlighted feature. §8/§9 of the guide contract:
  // a click inside the target must run the application handler exactly once
  // and keep the tour open; only clicks outside the target (and outside the
  // popover) close it.
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const forwardClickToTarget = (e: React.MouseEvent): boolean => {
    const root = targetElementRef.current;
    if (!root) return false;

    let under: Element | null;
    if (typeof document.elementFromPoint === 'function' && backdropRef.current) {
      // Step out of hit-testing for one synchronous call so the element under
      // the pointer resolves against the real page, not against the overlay.
      const backdrop = backdropRef.current;
      backdrop.style.pointerEvents = 'none';
      try {
        under = document.elementFromPoint(e.clientX, e.clientY);
      } catch {
        under = root;
      } finally {
        backdrop.style.pointerEvents = '';
      }
    } else {
      // Environments without hit-testing fall back to the target root itself.
      under = root;
    }

    if (!under || !root.contains(under) || popoverRef.current?.contains(under)) return false;

    under.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
      })
    );
    return true;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as Node;
    if (popoverRef.current?.contains(target)) return;
    if (targetElementRef.current?.contains(target)) return;

    const insideTarget =
      targetRect &&
      !isCrossPage &&
      e.clientX >= targetRect.left &&
      e.clientX <= targetRect.right &&
      e.clientY >= targetRect.top &&
      e.clientY <= targetRect.bottom;

    if (insideTarget && forwardClickToTarget(e)) return;

    closeGuide();
  };

  if (!isOpen || !isWalkthrough || !currentStep) {
    return null;
  }

  // Calculate collision-aware popover coordinates safely within viewport
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popoverWidth = Math.min(360, winWidth - 32);
  const popoverHeight = 220;

  const placementResult = calculatePopoverPlacement(
    targetRect && !isCrossPage
      ? {
          top: targetRect.top,
          left: targetRect.left,
          bottom: targetRect.bottom,
          right: targetRect.right,
          width: targetRect.width,
          height: targetRect.height,
        }
      : null,
    { width: popoverWidth, height: popoverHeight },
    { width: winWidth, height: winHeight },
    {
      preferredSide: currentStep.placement,
      viewportPadding: 16,
      targetGap: 16,
      spotlightPadding: 8,
    }
  );

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${placementResult.top}px`,
    left: `${placementResult.left}px`,
    width: `${placementResult.width}px`,
    maxHeight: 'calc(100vh - 32px)',
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      data-testid="guide-overlay"
      aria-live="polite"
    >
      {/* Dimmed backdrop with spotlight cutout if target exists */}
      {targetRect && !isCrossPage ? (
        <>
          {/* Transparent full-screen click handler for outside click */}
          <div
            ref={backdropRef}
            className="fixed inset-0 pointer-events-auto"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Spotlight Cutout Ring positioned over the real element */}
          <div
            className="fixed pointer-events-none rounded-[6px] transition-all duration-200 ease-out"
            style={{
              top: `${Math.max(0, targetRect.top - 8)}px`,
              left: `${Math.max(0, targetRect.left - 8)}px`,
              width: `${targetRect.width + 16}px`,
              height: `${targetRect.height + 16}px`,
              boxShadow: '0 0 0 9999px rgba(7, 11, 9, 0.78)',
              border: '2px solid rgba(70, 185, 130, 0.9)',
            }}
          />
        </>
      ) : (
        /* Uniform backdrop when target is off-screen or during cross-page */
        <div
          className="fixed inset-0 bg-[#070B09]/75 pointer-events-auto transition-opacity"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Floating Popover Card */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={currentStep.title}
        tabIndex={-1}
        data-testid="guide-dialog"
        className="guide-spotlight-popover pointer-events-auto bg-[#111713] border border-[#28352D] rounded-xl shadow-2xl overflow-hidden animate-fade-in text-[#E8F0E9]"
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cross-page navigation indicator */}
        {isCrossPage && activeGuide && (
          <div className="bg-[#2E8B62]/20 border-b border-[#28352D] px-4 py-2 flex items-center justify-between text-xs text-[#46B982]">
            <span className="flex items-center gap-1.5 font-medium truncate">
              <CornerUpLeft className="size-3.5 shrink-0" />
              Viewing {activeGuide.currentRoute} from {activeGuide.originRoute} tour
            </span>
            <Button
              size="xs"
              variant="ghost"
              onClick={nextStep}
              className="h-6 text-[10px] font-bold text-[#46B982] hover:text-[#65D3A3] px-2"
            >
              Return →
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2 border-b border-[#28352D]">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-[4px] bg-[#2E8B62]/20 border border-[#46B982]/30 flex items-center justify-center text-[#46B982]">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#46B982]">
              Guide · Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span
              className="text-[10px] font-mono text-[#9AA99F] mr-1"
              data-testid="guide-step-count"
            >
              {stepIndex + 1}/{totalSteps}
            </span>
            <button
              type="button"
              onClick={closeGuide}
              aria-label="Close guide"
              data-testid="guide-close"
              className="p-1 rounded text-[#9AA99F] hover:text-[#E8F0E9] hover:bg-[#161E19] transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5" data-testid="guide-step">
          <h3 className="text-sm font-bold text-[#E8F0E9] tracking-tight">
            {currentStep.title}
          </h3>
          <p className="text-xs text-[#9AA99F] leading-relaxed">
            {currentStep.description}
          </p>

          {currentStep.detail && (
            <p className="text-[11px] text-[#9AA99F] bg-[#0B100D] border border-[#28352D] rounded-md p-2.5 leading-relaxed">
              {currentStep.detail}
            </p>
          )}

          {/* Off-screen target notice */}
          {!targetRect && !isCrossPage && (
            <div className="text-[10px] font-mono text-[#D19A45] bg-[#D19A45]/10 border border-[#D19A45]/20 rounded px-2.5 py-1.5 flex items-center gap-1.5">
              <span>Scroll page to bring the highlighted element into view</span>
            </div>
          )}

          {/* Cross-page destination action button if configured */}
          {currentStep.crossPageAction && !isCrossPage && (
            <div className="pt-1">
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  if (activeGuide) {
                    // Let user interact with the destination page
                    const dest = currentStep.crossPageAction!.route;
                    window.location.hash = `#/${dest}`;
                  }
                }}
                className="w-full h-7 text-[11px] font-medium border-[#2E8B62] text-[#46B982] hover:bg-[#2E8B62]/20 flex items-center justify-center gap-1.5"
              >
                <span>{currentStep.crossPageAction.label}</span>
                <ExternalLink className="size-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-3 bg-[#0B100D]/80 border-t border-[#28352D] flex items-center justify-between gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={previousStep}
            disabled={stepIndex === 0}
            data-testid="guide-prev"
            className="h-7 text-xs text-[#9AA99F] hover:text-[#E8F0E9] disabled:opacity-30 disabled:pointer-events-none px-2.5"
          >
            <ChevronLeft className="size-3.5 mr-1" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={skipGuide}
              data-testid="guide-skip"
              className="h-7 text-[11px] text-[#9AA99F] hover:text-[#E8F0E9] px-2"
            >
              Skip
            </Button>

            <Button
              size="xs"
              onClick={nextStep}
              data-testid="guide-next"
              className="h-7 text-xs font-bold bg-[#2E8B62] hover:bg-[#3AA875] text-[#F3F7F3] px-3.5 shadow-sm"
            >
              {stepIndex < totalSteps - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="size-3.5 ml-1" />
                </>
              ) : (
                'Done'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
