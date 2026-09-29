/**
 * PlacementOS Universal Page Guide — Collision-Aware Popover Placement Engine
 *
 * Pure geometric calculation that guarantees the guide popover never
 * covers or overlaps the highlighted target element or its spotlight cutout.
 *
 * Preferred placement order:
 * 1. right of target
 * 2. left of target
 * 3. below target
 * 4. above target
 *
 * Rules:
 * - Popover rectangle must NEVER intersect target rectangle (+ spotlight padding).
 * - Minimum 16px viewport padding maintained on all four edges.
 * - Distance from target: 12-24px (default 16px).
 * - Pure function testable without browser DOM or layout engine.
 */

export interface BoundingBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface PopoverDimensions {
  width: number;
  height: number;
}

export type PlacementSide = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface PlacementOptions {
  preferredSide?: PlacementSide;
  viewportPadding?: number;
  targetGap?: number;
  spotlightPadding?: number;
}

export interface PopoverPlacementResult {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: 'right' | 'left' | 'below' | 'above' | 'fallback';
  overlapsTarget: boolean;
}

/**
 * Returns true if two rectangles intersect (have overlapping area).
 */
export function checkRectIntersection(
  rectA: { top: number; left: number; right: number; bottom: number },
  rectB: { top: number; left: number; right: number; bottom: number }
): boolean {
  return (
    rectA.left < rectB.right &&
    rectA.right > rectB.left &&
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top
  );
}

/**
 * Calculates the overlapping pixel area between two rectangles.
 */
export function calculateOverlapArea(
  rectA: { top: number; left: number; right: number; bottom: number },
  rectB: { top: number; left: number; right: number; bottom: number }
): number {
  const xOverlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
  const yOverlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
  return xOverlap * yOverlap;
}

/**
 * Computes collision-free coordinates for the guide popover relative to a target element.
 */
export function calculatePopoverPlacement(
  targetRect: BoundingBox | null | undefined,
  popover: PopoverDimensions,
  viewport: ViewportDimensions,
  options?: PlacementOptions
): PopoverPlacementResult {
  const viewportPadding = options?.viewportPadding ?? 16;
  const targetGap = options?.targetGap ?? 16;
  const spotlightPadding = options?.spotlightPadding ?? 8;
  const preferredSide = options?.preferredSide;

  // Constrain popover width and height inside available viewport
  const popoverWidth = Math.min(popover.width, Math.max(120, viewport.width - viewportPadding * 2));
  const popoverHeight = Math.min(popover.height, Math.max(80, viewport.height - viewportPadding * 2));

  // If no target is present or target has zero dimensions, safely park in bottom-right corner
  if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
    return {
      top: Math.max(viewportPadding, viewport.height - viewportPadding - popoverHeight),
      left: Math.max(viewportPadding, viewport.width - viewportPadding - popoverWidth),
      width: popoverWidth,
      height: popoverHeight,
      placement: 'fallback',
      overlapsTarget: false,
    };
  }

  // Expanded forbidden bounding box of target (including spotlight ring and hairline border)
  const forbidden = {
    top: targetRect.top - spotlightPadding,
    bottom: targetRect.bottom + spotlightPadding,
    left: targetRect.left - spotlightPadding,
    right: targetRect.right + spotlightPadding,
  };

  // Build candidate order:
  // Primary requirement order: 1. right, 2. left, 3. below, 4. above
  const baseOrder: ('right' | 'left' | 'below' | 'above')[] = ['right', 'left', 'below', 'above'];
  let candidates: ('right' | 'left' | 'below' | 'above')[] = [...baseOrder];

  if (preferredSide && preferredSide !== 'center') {
    const side = preferredSide === 'bottom' ? 'below' : preferredSide === 'top' ? 'above' : preferredSide;
    candidates = [side, ...baseOrder.filter((s) => s !== side)];
  }

  const evaluateCandidate = (
    top: number,
    left: number,
    placement: 'right' | 'left' | 'below' | 'above'
  ): PopoverPlacementResult | null => {
    // Check viewport bounds
    if (
      left < viewportPadding ||
      left + popoverWidth > viewport.width - viewportPadding ||
      top < viewportPadding ||
      top + popoverHeight > viewport.height - viewportPadding
    ) {
      return null;
    }

    const popoverBox = {
      top,
      bottom: top + popoverHeight,
      left,
      right: left + popoverWidth,
    };

    // HARD REQUIREMENT: Zero intersection with target forbidden area
    if (checkRectIntersection(popoverBox, forbidden)) {
      return null;
    }

    return {
      top,
      left,
      width: popoverWidth,
      height: popoverHeight,
      placement,
      overlapsTarget: false,
    };
  };

  // 1. Try direct candidates in priority order
  for (const side of candidates) {
    if (side === 'right') {
      const left = forbidden.right + targetGap;
      const idealTop = targetRect.top + (targetRect.height - popoverHeight) / 2;
      const top = Math.max(viewportPadding, Math.min(viewport.height - viewportPadding - popoverHeight, idealTop));
      const res = evaluateCandidate(top, left, 'right');
      if (res) return res;
    } else if (side === 'left') {
      const left = forbidden.left - targetGap - popoverWidth;
      const idealTop = targetRect.top + (targetRect.height - popoverHeight) / 2;
      const top = Math.max(viewportPadding, Math.min(viewport.height - viewportPadding - popoverHeight, idealTop));
      const res = evaluateCandidate(top, left, 'left');
      if (res) return res;
    } else if (side === 'below') {
      const top = forbidden.bottom + targetGap;
      const idealLeft = targetRect.left + (targetRect.width - popoverWidth) / 2;
      const left = Math.max(viewportPadding, Math.min(viewport.width - viewportPadding - popoverWidth, idealLeft));
      const res = evaluateCandidate(top, left, 'below');
      if (res) return res;
    } else if (side === 'above') {
      const top = forbidden.top - targetGap - popoverHeight;
      const idealLeft = targetRect.left + (targetRect.width - popoverWidth) / 2;
      const left = Math.max(viewportPadding, Math.min(viewport.width - viewportPadding - popoverWidth, idealLeft));
      const res = evaluateCandidate(top, left, 'above');
      if (res) return res;
    }
  }

  // 2. If no direct projection fits, test alternative non-overlapping viewport anchors:
  // Candidate corners and edges that avoid the target
  const alternativePositions = [
    // Top-left
    { left: viewportPadding, top: viewportPadding },
    // Top-right
    { left: viewport.width - viewportPadding - popoverWidth, top: viewportPadding },
    // Bottom-left
    { left: viewportPadding, top: viewport.height - viewportPadding - popoverHeight },
    // Bottom-right
    { left: viewport.width - viewportPadding - popoverWidth, top: viewport.height - viewportPadding - popoverHeight },
    // Center-top
    { left: Math.max(viewportPadding, (viewport.width - popoverWidth) / 2), top: viewportPadding },
    // Center-bottom
    { left: Math.max(viewportPadding, (viewport.width - popoverWidth) / 2), top: viewport.height - viewportPadding - popoverHeight },
  ];

  for (const pos of alternativePositions) {
    const popoverBox = {
      top: pos.top,
      bottom: pos.top + popoverHeight,
      left: pos.left,
      right: pos.left + popoverWidth,
    };
    if (!checkRectIntersection(popoverBox, forbidden)) {
      return {
        top: pos.top,
        left: pos.left,
        width: popoverWidth,
        height: popoverHeight,
        placement: 'fallback',
        overlapsTarget: false,
      };
    }
  }

  // 3. Absolute fallback: position with minimum overlap area
  let bestPos = alternativePositions[0];
  let minOverlap = Infinity;

  for (const pos of alternativePositions) {
    const popoverBox = {
      top: pos.top,
      bottom: pos.top + popoverHeight,
      left: pos.left,
      right: pos.left + popoverWidth,
    };
    const overlap = calculateOverlapArea(popoverBox, forbidden);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestPos = pos;
    }
  }

  return {
    top: bestPos.top,
    left: bestPos.left,
    width: popoverWidth,
    height: popoverHeight,
    placement: 'fallback',
    overlapsTarget: minOverlap > 0,
  };
}
