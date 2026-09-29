import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * C9 — Focus Regression: verifies the global `outline: none` rule is gone
 * and the `:focus-visible` rule exists in the compiled CSS.
 *
 * This is a static source check — no jsdom visual focus measurement needed.
 */

let css: string;

beforeAll(() => {
  const cssPath = path.resolve(__dirname, '../../src/index.css');
  css = fs.readFileSync(cssPath, 'utf-8');
});

describe('C9 — Focus Regression', () => {
  it('index.css does not contain global outline: none', () => {
    // The old rule was `* { outline: none; }` inside @layer base
    // Check that no such blanket rule exists
    const hasGlobalOutlineNone = /\*\s*\{[^}]*outline\s*:\s*none\s*;/i.test(css);
    expect(hasGlobalOutlineNone).toBe(false);
  });

  it('index.css contains global :focus-visible rule', () => {
    // Verify the new global focus-visible rule exists
    const hasFocusVisible = /:\s*focus-visible\s*\{[^}]*outline\s*:\s*2px\s+solid\s+var\(--ring/i.test(css);
    expect(hasFocusVisible).toBe(true);
  });

  it('index.css :focus-visible rule uses outline-offset', () => {
    const hasOutlineOffset = /:\s*focus-visible\s*\{[^}]*outline-offset\s*:\s*2px/i.test(css);
    expect(hasOutlineOffset).toBe(true);
  });

  it('settings-control uses :focus-visible not :focus', () => {
    // Old: .settings-control:focus
    // New: .settings-control:focus-visible
    const hasOldFocus = /\.settings-control\s*:\s*focus\s*\{/i.test(css);
    expect(hasOldFocus).toBe(false);

    const hasNewFocusVisible = /\.settings-control\s*:\s*focus-visible\s*\{/i.test(css);
    expect(hasNewFocusVisible).toBe(true);
  });

  it('C7 Today focus-visible rules preserved', () => {
    // The CSS has: .today-hero-node:focus-visible, .today-guide-panel:focus-visible {
    const hasTodayHero = /\.today-hero-node\s*:\s*focus-visible[,\s]/i.test(css);
    expect(hasTodayHero).toBe(true);

    const hasTodayGuide = /\.today-guide-panel\s*:\s*focus-visible\s*\{/i.test(css);
    expect(hasTodayGuide).toBe(true);
  });
});