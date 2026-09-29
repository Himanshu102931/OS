import { describe, it, expect } from 'vitest';
import {
  calculatePopoverPlacement,
  checkRectIntersection,
  type BoundingBox,
  type PopoverDimensions,
  type ViewportDimensions,
} from '../components/guide/guidePlacement';

describe('C11 — Collision-Aware Guide Placement Engine', () => {
  const defaultViewport: ViewportDimensions = { width: 1200, height: 800 };
  const defaultPopover: PopoverDimensions = { width: 360, height: 220 };

  // Helper to construct a popover bounding box from placement result
  const getPopoverBox = (result: { top: number; left: number; width: number; height: number }) => ({
    top: result.top,
    left: result.left,
    bottom: result.top + result.height,
    right: result.left + result.width,
  });

  // Helper to assert that popover stays inside viewport margins
  const assertWithinViewport = (
    result: { top: number; left: number; width: number; height: number },
    viewport: ViewportDimensions,
    padding = 16
  ) => {
    expect(result.left).toBeGreaterThanOrEqual(padding);
    expect(result.top).toBeGreaterThanOrEqual(padding);
    expect(result.left + result.width).toBeLessThanOrEqual(viewport.width - padding + 0.1);
    expect(result.top + result.height).toBeLessThanOrEqual(viewport.height - padding + 0.1);
  };

  it('1. target in center: popover placed on preferred available side without overlap', () => {
    // Target right in the middle: top: 350, left: 450, w: 200, h: 100
    const target: BoundingBox = {
      top: 350,
      left: 450,
      width: 200,
      height: 100,
      right: 650,
      bottom: 450,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    // Preferred #1 is 'right' of target
    expect(result.placement).toBe('right');
    expect(result.left).toBeGreaterThan(target.right);
    assertWithinViewport(result, defaultViewport);

    // ZERO collision
    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('2. target near right edge: popover moves to left side with zero overlap', () => {
    // Target near right edge: left: 950, width: 220 in 1200px viewport
    const target: BoundingBox = {
      top: 250,
      left: 950,
      width: 220,
      height: 120,
      right: 1170,
      bottom: 370,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    // Space on right is 1200 - 1170 = 30px (not enough for 360px), must place 'left'
    expect(result.placement).toBe('left');
    expect(result.left + result.width).toBeLessThan(target.left);
    assertWithinViewport(result, defaultViewport);

    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('3. target near left edge: popover moves to right side with zero overlap', () => {
    // Target near left edge: left: 20, width: 150
    const target: BoundingBox = {
      top: 200,
      left: 20,
      width: 150,
      height: 100,
      right: 170,
      bottom: 300,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    // Cannot place left (only 20px space), must place 'right'
    expect(result.placement).toBe('right');
    expect(result.left).toBeGreaterThan(target.right);
    assertWithinViewport(result, defaultViewport);

    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('4. target near bottom: popover moves above with zero overlap', () => {
    // Wide horizontal bar near bottom edge: top: 680, left: 300, width: 600, height: 90
    const target: BoundingBox = {
      top: 680,
      left: 300,
      width: 600,
      height: 90,
      right: 900,
      bottom: 770,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    // Right space: 300px < 360px. Left space: 300px < 360px. Below: 30px < 220px.
    // Must place 'above'
    expect(result.placement).toBe('above');
    expect(result.top + result.height).toBeLessThan(target.top);
    assertWithinViewport(result, defaultViewport);

    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('5. target near top: popover moves below with zero overlap', () => {
    // Wide horizontal bar near top edge: top: 20, left: 300, width: 600, height: 80
    const target: BoundingBox = {
      top: 20,
      left: 300,
      width: 600,
      height: 80,
      right: 900,
      bottom: 100,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    // Above space: 20px < 220px. Must place 'below'
    expect(result.placement).toBe('below');
    expect(result.top).toBeGreaterThan(target.bottom);
    assertWithinViewport(result, defaultViewport);

    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('6. target with only constrained space: safest non-overlapping position chosen', () => {
    // Asymmetric target occupying right and bottom-center
    const target: BoundingBox = {
      top: 400,
      left: 600,
      width: 500,
      height: 350,
      right: 1100,
      bottom: 750,
    };

    const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);

    assertWithinViewport(result, defaultViewport);
    const popoverBox = getPopoverBox(result);
    expect(checkRectIntersection(popoverBox, target)).toBe(false);
  });

  it('7. hard guarantee: popoverRect ∩ targetRect === empty across arbitrary positions', () => {
    const testPositions: BoundingBox[] = [
      { top: 50, left: 50, right: 250, bottom: 150, width: 200, height: 100 },
      { top: 500, left: 800, right: 1100, bottom: 650, width: 300, height: 150 },
      { top: 250, left: 400, right: 800, bottom: 450, width: 400, height: 200 },
      { top: 600, left: 100, right: 300, bottom: 750, width: 200, height: 150 },
    ];

    for (const target of testPositions) {
      const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport);
      const popoverBox = getPopoverBox(result);

      // Strict zero intersection
      const intersects = checkRectIntersection(popoverBox, target);
      expect(intersects).toBe(false);
      expect(result.overlapsTarget).toBe(false);
    }
  });

  it('8. verify popover stays within viewport padding on all 4 edges', () => {
    const edgeTargets: BoundingBox[] = [
      { top: 16, left: 16, right: 200, bottom: 200, width: 184, height: 184 },
      { top: 600, left: 1000, right: 1184, bottom: 784, width: 184, height: 184 },
      { top: 16, left: 1000, right: 1184, bottom: 200, width: 184, height: 184 },
      { top: 600, left: 16, right: 200, bottom: 784, width: 184, height: 184 },
    ];

    for (const target of edgeTargets) {
      const result = calculatePopoverPlacement(target, defaultPopover, defaultViewport, {
        viewportPadding: 16,
      });

      assertWithinViewport(result, defaultViewport, 16);
      const popoverBox = getPopoverBox(result);
      expect(checkRectIntersection(popoverBox, target)).toBe(false);
    }
  });

  it('9. mobile 375×667: placement remains inside viewport and non-overlapping', () => {
    const mobileViewport: ViewportDimensions = { width: 375, height: 667 };
    const mobilePopover: PopoverDimensions = { width: 343, height: 200 };

    // Mobile target located in upper-middle of screen
    const upperTarget: BoundingBox = {
      top: 80,
      left: 20,
      right: 355,
      bottom: 220,
      width: 335,
      height: 140,
    };

    const resultBelow = calculatePopoverPlacement(upperTarget, mobilePopover, mobileViewport);
    assertWithinViewport(resultBelow, mobileViewport, 16);
    expect(resultBelow.placement).toBe('below');
    expect(resultBelow.top).toBeGreaterThan(upperTarget.bottom);
    expect(checkRectIntersection(getPopoverBox(resultBelow), upperTarget)).toBe(false);

    // Mobile target located in lower-middle of screen
    const lowerTarget: BoundingBox = {
      top: 450,
      left: 20,
      right: 355,
      bottom: 600,
      width: 335,
      height: 150,
    };

    const resultAbove = calculatePopoverPlacement(lowerTarget, mobilePopover, mobileViewport);
    assertWithinViewport(resultAbove, mobileViewport, 16);
    expect(resultAbove.placement).toBe('above');
    expect(resultAbove.top + resultAbove.height).toBeLessThan(lowerTarget.top);
    expect(checkRectIntersection(getPopoverBox(resultAbove), lowerTarget)).toBe(false);
  });

  describe('10. Today Page Specific Targets — Verified Zero Overlap', () => {
    it('10a. Primary Action Target (Hero task card): popover never covers task card or its actions', () => {
      // Primary Action Card on Today page (typical dimensions in desktop layout)
      const primaryActionCard: BoundingBox = {
        top: 260,
        left: 280,
        right: 820,
        bottom: 480,
        width: 540,
        height: 220,
      };

      const result = calculatePopoverPlacement(primaryActionCard, defaultPopover, defaultViewport);

      assertWithinViewport(result, defaultViewport);
      const popoverBox = getPopoverBox(result);
      expect(checkRectIntersection(popoverBox, primaryActionCard)).toBe(false);
      expect(result.overlapsTarget).toBe(false);
    });

    it('10b. Hero Node Target (.today-hero-node / center constellation): popover never covers hero node', () => {
      // Hero Node center constellation target
      const heroNode: BoundingBox = {
        top: 180,
        left: 550,
        right: 650,
        bottom: 280,
        width: 100,
        height: 100,
      };

      const result = calculatePopoverPlacement(heroNode, defaultPopover, defaultViewport);

      assertWithinViewport(result, defaultViewport);
      const popoverBox = getPopoverBox(result);
      expect(checkRectIntersection(popoverBox, heroNode)).toBe(false);
      expect(result.overlapsTarget).toBe(false);
    });

    it('10c. Signal Graph Target: popover never covers signal graph or radar columns', () => {
      // Daily Signal Graph on Today page
      const signalGraph: BoundingBox = {
        top: 480,
        left: 280,
        right: 760,
        bottom: 680,
        width: 480,
        height: 200,
      };

      const result = calculatePopoverPlacement(signalGraph, defaultPopover, defaultViewport);

      assertWithinViewport(result, defaultViewport);
      const popoverBox = getPopoverBox(result);
      expect(checkRectIntersection(popoverBox, signalGraph)).toBe(false);
      expect(result.overlapsTarget).toBe(false);
    });

    it('10d. Complete Button Target: popover leaves Complete button fully visible and clickable', () => {
      // Complete button inside task action cluster
      const completeBtn: BoundingBox = {
        top: 380,
        left: 640,
        right: 760,
        bottom: 420,
        width: 120,
        height: 40,
      };

      const result = calculatePopoverPlacement(completeBtn, defaultPopover, defaultViewport);

      assertWithinViewport(result, defaultViewport);
      const popoverBox = getPopoverBox(result);
      expect(checkRectIntersection(popoverBox, completeBtn)).toBe(false);
      expect(result.overlapsTarget).toBe(false);
    });
  });
});
