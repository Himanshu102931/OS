/**
 * PlacementOS Guide System — Shared Type Definitions
 *
 * A reusable page guide/tour system that works across all major pages.
 * Each page supplies only its feature/step definitions.
 */

import type { RoutePath } from '../../context/PlacementContext';
export type { RoutePath };

/**
 * A single guide step definition.
 */
export interface GuideStep {
  /** Unique identifier for the step */
  id: string;
  /** Human-readable title shown in the popover */
  title: string;
  /** Main explanation text */
  description: string;
  /** Optional additional detail text */
  detail?: string;
  /** Optional icon to show in the step */
  icon?: React.FC<{ className?: string }>;
  /**
   * CSS selector or element reference for the target element to highlight.
   * If the element is not found, the step will show a centered explanation.
   */
  target?: string | HTMLElement;
  /** Optional function to reveal hidden UI before highlighting */
  prepare?: () => void | Promise<void>;
  /** Optional function to clean up after the step */
  cleanup?: () => void;
  /** If true, the highlighted element remains interactive */
  allowInteraction?: boolean;
  /** Placement preference for the popover relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Optional cross-page action metadata */
  crossPageAction?: {
    /** Route to navigate to */
    route: RoutePath;
    /** Optional targetId for the destination */
    targetId?: string;
    /** Label for the cross-page action button */
    label: string;
  };
  /** If true, this step is optional and will be skipped if target not found */
  optional?: boolean;
  /** Called when step becomes active */
  onEnter?: () => void;
  /** Called when leaving this step */
  onExit?: () => void;
}

/**
 * A group of related guide steps with a section title
 */
export interface GuideSection {
  /** Section title */
  title: string;
  /** Steps in this section */
  steps: GuideStep[];
}

/**
 * Complete page guide definition
 */
export interface PageGuideDefinition {
  /** Page route this guide belongs to */
  route: RoutePath;
  /** Page title for the guide header */
  title: string;
  /** Optional icon for the guide header */
  icon?: React.FC<{ className?: string }>;
  /** Sections of the guide */
  sections: GuideSection[];
}

/**
 * Active guide state
 */
export interface ActiveGuideState {
  /** The route of the page that started the guide */
  originRoute: RoutePath;
  /** The current page route (may differ during cross-page navigation) */
  currentRoute: RoutePath;
  /** Current step index within the flattened steps array */
  stepIndex: number;
  /** Whether the guide is in walkthrough mode vs section list mode */
  isWalkthrough: boolean;
  /** Cross-page continuation state */
  crossPageState?: {
    /** The route we navigated away from */
    originRoute: RoutePath;
    /** The step index we were on before navigating */
    originStepIndex: number;
    /** The cross-page action that triggered navigation */
    crossPageAction: GuideStep['crossPageAction'];
  };
}

/**
 * Guide completion state (persisted)
 */
export interface GuideCompletionState {
  /** Routes for which the user has completed the walkthrough */
  completedRoutes: Record<RoutePath, boolean>;
  /** Last time each guide was opened (for "Seen" indicator) */
  lastOpened: Record<RoutePath, string>;
}

/**
 * Guide controller interface (what pages/components can use)
 */
export interface GuideController {
  /** Start the guide for the current page */
  startGuide: (route: RoutePath) => void;
  /** Close the guide */
  closeGuide: () => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  previousStep: () => void;
  /** Skip to end */
  skipGuide: () => void;
  /** Check if guide is open */
  isOpen: boolean;
  /** Check if in walkthrough mode */
  isWalkthrough: boolean;
  /** Current step index */
  stepIndex: number;
  /** Total steps in current walkthrough */
  totalSteps: number;
  /** Current step data */
  currentStep: GuideStep | null;
  /** Active guide state including cross-page continuation */
  activeGuide: ActiveGuideState | null;
  /** Whether a route has a guide defined */
  hasGuide: (route: RoutePath) => boolean;
  /** Check if guide is completed for a route */
  isGuideCompleted: (route: RoutePath) => boolean;
  /** Get the guide definition for a route */
  getGuideDefinition: (route: RoutePath) => PageGuideDefinition | null;
}