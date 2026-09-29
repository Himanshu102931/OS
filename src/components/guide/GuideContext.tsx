/**
 * PlacementOS Guide System — Shared Controller Context
 *
 * Provides a global guide controller that manages the active guide state
 * across page navigations for cross-page continuation support.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  RoutePath,
  PageGuideDefinition,
  GuideStep,
  ActiveGuideState,
  GuideCompletionState,
  GuideController,
} from './GuideTypes';
import { PAGE_GUIDE_DEFINITIONS } from './GuideDefinitions';
import { PlacementContext } from '../../context/PlacementContext';

const GuideContext = createContext<GuideController | null>(null);

const fallbackController: GuideController = {
  startGuide: () => {},
  closeGuide: () => {},
  nextStep: () => {},
  previousStep: () => {},
  skipGuide: () => {},
  isOpen: false,
  isWalkthrough: false,
  stepIndex: 0,
  totalSteps: 0,
  currentStep: null,
  activeGuide: null,
  hasGuide: (route: RoutePath) => PAGE_GUIDE_DEFINITIONS.some((d) => d.route === route),
  isGuideCompleted: () => false,
  getGuideDefinition: (route: RoutePath) => PAGE_GUIDE_DEFINITIONS.find((d) => d.route === route) ?? null,
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGuide = () => {
  const ctx = useContext(GuideContext);
  return ctx || fallbackController;
};

interface GuideProviderProps {
  children: React.ReactNode;
}

export const GuideProvider: React.FC<GuideProviderProps> = ({ children }) => {
  // Placement context reference (optional, safe if used outside PlacementProvider)
  const placement = useContext(PlacementContext);

  // Persisted completion state
  const [completionState, setCompletionState] = useState<GuideCompletionState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('placementos_guide_completion');
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return { completedRoutes: {} as Record<RoutePath, boolean>, lastOpened: {} as Record<RoutePath, string> };
  });

  // Active guide state
  const [activeGuide, setActiveGuide] = useState<ActiveGuideState | null>(null);

  // Refs for cross-page continuation
  const originRouteRef = useRef<RoutePath | null>(null);
  const originStepIndexRef = useRef<number>(0);

  // Persist completion state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('placementos_guide_completion', JSON.stringify(completionState));
      } catch { /* ignore */ }
    }
  }, [completionState]);

  // Helper to get flattened steps for a route
  const getSteps = useCallback((route: RoutePath): GuideStep[] => {
    const def = PAGE_GUIDE_DEFINITIONS.find((d) => d.route === route);
    return def?.sections.flatMap((s) => s.steps) ?? [];
  }, []);

  // Check if guide is completed for a route
  const isGuideCompleted = useCallback((route: RoutePath): boolean => {
    return completionState.completedRoutes[route] === true;
  }, [completionState]);

  // Get guide definition for a route
  const getGuideDefinition = useCallback((route: RoutePath): PageGuideDefinition | null => {
    return PAGE_GUIDE_DEFINITIONS.find((d) => d.route === route) ?? null;
  }, []);

  // Check if route has a guide
  const hasGuide = useCallback((route: RoutePath): boolean => {
    return PAGE_GUIDE_DEFINITIONS.some((d) => d.route === route);
  }, []);

  // Start a guide for a specific route (ALWAYS begins at Step 1, stepIndex: 0)
  const startGuide = useCallback((route: RoutePath) => {
    const def = getGuideDefinition(route);
    if (!def) return;

    if (placement && placement.currentRoute !== route) {
      placement.setRoute(route);
    }

    originRouteRef.current = route;
    originStepIndexRef.current = 0;

    setActiveGuide({
      originRoute: route,
      currentRoute: route,
      stepIndex: 0,
      isWalkthrough: true,
    });

    // Mark as opened
    setCompletionState((prev) => ({
      ...prev,
      lastOpened: { ...prev.lastOpened, [route]: new Date().toISOString() },
    }));
  }, [getGuideDefinition, placement]);

  // Close the guide completely
  const closeGuide = useCallback(() => {
    setActiveGuide(null);
    originRouteRef.current = null;
    originStepIndexRef.current = 0;
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    setActiveGuide((prev) => {
      if (!prev) return prev;

      // Cross-page return: if currently viewing another page from origin guide, return to origin
      if (placement && placement.currentRoute !== prev.originRoute) {
        placement.setRoute(prev.originRoute);
      }

      const steps = getSteps(prev.originRoute);
      if (prev.stepIndex < steps.length - 1) {
        return { ...prev, stepIndex: prev.stepIndex + 1 };
      } else {
        // Final step reached -> mark completed and close guide cleanly
        setCompletionState((c) => ({
          ...c,
          completedRoutes: { ...c.completedRoutes, [prev.originRoute]: true },
        }));
        return null;
      }
    });
  }, [getSteps, placement]);

  // Go to previous step
  const previousStep = useCallback(() => {
    setActiveGuide((prev) => {
      if (!prev) return prev;

      // Cross-page return
      if (placement && placement.currentRoute !== prev.originRoute) {
        placement.setRoute(prev.originRoute);
      }

      return { ...prev, stepIndex: Math.max(0, prev.stepIndex - 1) };
    });
  }, [placement]);

  // Skip to end (records completion and closes)
  const skipGuide = useCallback(() => {
    setActiveGuide((prev) => {
      if (!prev) return null;
      setCompletionState((c) => ({
        ...c,
        completedRoutes: { ...c.completedRoutes, [prev.originRoute]: true },
      }));
      return null;
    });
  }, []);

  // Compute current effective guide and cross-page state synchronously
  const activeNavRoute = placement ? placement.currentRoute : (activeGuide ? activeGuide.originRoute : null);
  const isNavigatedAway = Boolean(
    activeGuide && activeNavRoute && activeNavRoute !== activeGuide.originRoute
  );

  const effectiveActiveGuide: ActiveGuideState | null = activeGuide
    ? {
        ...activeGuide,
        currentRoute: activeNavRoute || activeGuide.originRoute,
        crossPageState: isNavigatedAway
          ? {
              originRoute: activeGuide.originRoute,
              originStepIndex: activeGuide.stepIndex,
              crossPageAction: {
                route: activeNavRoute as RoutePath,
                label: `Viewing ${activeNavRoute}`,
              },
            }
          : undefined,
      }
    : null;

  // Compute current step data
  let currentStep: GuideStep | null = null;
  let totalSteps = 0;
  let isOpen = false;
  let isWalkthrough = false;
  let stepIndex = 0;

  if (effectiveActiveGuide) {
    isOpen = true;
    isWalkthrough = effectiveActiveGuide.isWalkthrough;
    stepIndex = effectiveActiveGuide.stepIndex;
    const steps = getSteps(effectiveActiveGuide.originRoute);
    totalSteps = steps.length;
    if (effectiveActiveGuide.stepIndex < steps.length) {
      currentStep = steps[effectiveActiveGuide.stepIndex];
    }
  }

  // Step prepare / cleanup hooks
  useEffect(() => {
    if (!currentStep) return;
    if (typeof currentStep.prepare === 'function') {
      try {
        currentStep.prepare();
      } catch { /* ignore */ }
    }
    return () => {
      if (typeof currentStep?.cleanup === 'function') {
        try {
          currentStep.cleanup();
        } catch { /* ignore */ }
      }
    };
  }, [currentStep]);

  const controller: GuideController = {
    startGuide,
    closeGuide,
    nextStep,
    previousStep,
    skipGuide,
    isOpen,
    isWalkthrough,
    stepIndex,
    totalSteps,
    currentStep,
    activeGuide: effectiveActiveGuide,
    hasGuide,
    isGuideCompleted,
    getGuideDefinition,
  };

  return (
    <GuideContext.Provider value={controller}>
      {children}
    </GuideContext.Provider>
  );
};