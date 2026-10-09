import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Task 126 — Analytics Crimson Pulse action-accent token family regression test.
 *
 * Authority: docs/specs/analytics/ANALYTICS_SPEC_V1.md §13 LOCKED.
 *
 * Verifies:
 * 1. All required Analytics tokens exist in src/index.css with exact spec values.
 * 2. Analytics scope (.telemetry-sweep / [data-testid="analytics-view"]) applies the family.
 * 3. Analytics action utilities are available in built CSS.
 * 4. No raw #F43F5E/#FB7185/#FDA4AF remain in migrated Analytics action-accent locations.
 * 5. No foreign page action accent is used for Analytics.
 * 6. Leitner visualization colors remain unchanged.
 * 7. --analytics-* surface family is NOT introduced by this task.
 * 8. No global --color-* token count changes.
 */

const indexCssRaw = fs.readFileSync(
  path.resolve(__dirname, '../../src/index.css'),
  'utf-8'
);
const indexCss = indexCssRaw.replace(/\r\n/g, '\n');

const ANALYTICS_SOURCES = import.meta.glob('../components/analytics/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const analyticsSrc = Object.values(ANALYTICS_SOURCES).join('\n');

const LEITNER_SERIES = ['384252', '3B82F6', '8B5CF6', '10B981'];

function hexesIn(src: string): string[] {
  return [...src.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1].toLowerCase());
}

describe('Analytics Crimson Pulse action-accent token family (Task 126)', () => {
  it('all required Analytics tokens exist in :root with exact ANALYTICS_SPEC_V1 values', () => {
    expect(indexCss).toContain('--action-accent-analytics: #F43F5E;');
    expect(indexCss).toContain('--action-accent-analytics-hover: #FB7185;');
    expect(indexCss).toContain('--action-accent-analytics-subtle: rgba(244, 63, 94, 0.10);');
    expect(indexCss).toContain('--action-accent-analytics-border: rgba(244, 63, 94, 0.30);');
    expect(indexCss).toContain('--action-accent-analytics-foreground: #FDA4AF;');
    expect(indexCss).toContain('--action-accent-analytics-ring: #F43F5E;');
  });

  it('Analytics scope exists and applies the token family to the actual Analytics root', () => {
    // The Analytics root uses .telemetry-sweep class (AnalyticsView.tsx line 83)
    // Both selectors are in a shared rule block
    expect(indexCss).toContain('[data-testid="analytics-view"],');
    expect(indexCss).toContain('.telemetry-sweep {');
    expect(indexCss).toContain('--action-accent: var(--action-accent-analytics);');
    expect(indexCss).toContain('--action-accent-hover: var(--action-accent-analytics-hover);');
    expect(indexCss).toContain('--action-accent-subtle: var(--action-accent-analytics-subtle);');
    expect(indexCss).toContain('--action-accent-border: var(--action-accent-analytics-border);');
    expect(indexCss).toContain('--action-accent-ring: var(--action-accent-analytics-ring);');
    expect(indexCss).toContain('--action-accent-foreground: var(--action-accent-analytics-foreground);');
  });

  it('Analytics action utilities are available (Tailwind @theme mappings)', () => {
    // These are the --color-* aliases mapped in @theme inline block
    expect(indexCss).toContain('--color-action-accent: var(--action-accent);');
    expect(indexCss).toContain('--color-action-accent-hover: var(--action-accent-hover);');
    expect(indexCss).toContain('--color-action-accent-foreground: var(--action-accent-foreground);');
    expect(indexCss).toContain('--color-action-accent-subtle: var(--action-accent-subtle);');
    expect(indexCss).toContain('--color-action-accent-border: var(--action-accent-border);');
    expect(indexCss).toContain('--color-action-accent-ring: var(--action-accent-ring);');
  });

  it('no raw #F43F5E/#FB7185/#FDA4AF remain in migrated Analytics action-accent locations', () => {
    // These literals should NOT appear in Analytics source files anymore
    // (they've been migrated to var(--action-accent-*) tokens)
    expect(analyticsSrc).not.toContain('#F43F5E');
    expect(analyticsSrc).not.toContain('#FB7185');
    expect(analyticsSrc).not.toContain('#FDA4AF');
  });

  it('no foreign page action accent hex is used in Analytics', () => {
    const forbiddenHex = [
      '6366f1', // Interview
      'eab308', // Preparation
      '0284c7', // Today / Settings
      '06b6d4', // (cyan)
      'ff5722', // (deep orange)
      'f59e0b', // (amber)
      '38bdf8', // (light cyan)
      'a78bfa', // (light violet)
    ];
    // Exclude Leitner visualization colors which are locked data viz palette
    const leitnerHex = new Set(['384252', '3b82f6', '8b5cf6', '10b981']);
    const lower = analyticsSrc.toLowerCase();
    const violations: string[] = [];
    for (const hex of forbiddenHex) {
      if (lower.includes(hex)) {
        violations.push(`#${hex.toUpperCase()}`);
      }
    }
    // Also check for any non-Leitner, non-Analytics accent hexes
    const allHexes = hexesIn(analyticsSrc);
    for (const hex of allHexes) {
      if (!leitnerHex.has(hex) && !['f43f5e', 'fb7185', 'fda4af'].includes(hex)) {
        // Check if it's a known foreign page accent
        if (forbiddenHex.includes(hex)) {
          // already caught above
        }
      }
    }
    expect(violations, `Analytics borrows foreign page accent(s): ${violations.join(', ')}`).toEqual([]);
  });

  it('Leitner visualization colors remain unchanged in AnalyticsObservatory', () => {
    const observatory = ANALYTICS_SOURCES['../components/analytics/AnalyticsObservatory.tsx'];
    expect(observatory, 'AnalyticsObservatory.tsx missing').toBeTruthy();

    // Each Leitner color appears exactly twice (segment + legend dot)
    for (const hex of LEITNER_SERIES) {
      const count = (observatory.match(new RegExp(`#${hex}`, 'gi')) ?? []).length;
      expect(count, `#${hex} occurrences in AnalyticsObservatory`).toBe(2);
    }

    // Verify the exact locked values are used
    expect(observatory).toContain('bg-[#384252]');
    expect(observatory).toContain('bg-[#3B82F6]');
    expect(observatory).toContain('bg-[#8B5CF6]');
    expect(observatory).toContain('bg-[#10B981]');
  });

  it('--analytics-* surface family is NOT introduced by this task', () => {
    // The ANALYTICS_SPEC_V1 §12 defines --analytics-* surface tokens,
    // but Task 126 is ONLY for the action-accent family (§13).
    // Surface tokens remain unimplemented (deferred to P2-b).
    expect(indexCss).not.toMatch(/--analytics-bg-base\s*:/);
    expect(indexCss).not.toMatch(/--analytics-surface-card\s*:/);
    expect(indexCss).not.toMatch(/--analytics-surface-elevated\s*:/);
    expect(indexCss).not.toMatch(/--analytics-surface-inset\s*:/);
    expect(indexCss).not.toMatch(/--analytics-border-subtle\s*:/);
    expect(indexCss).not.toMatch(/--analytics-border-standard\s*:/);
    expect(indexCss).not.toMatch(/--analytics-border-active\s*:/);
    expect(indexCss).not.toMatch(/--analytics-text-primary\s*:/);
    expect(indexCss).not.toMatch(/--analytics-text-secondary\s*:/);
    expect(indexCss).not.toMatch(/--analytics-text-muted\s*:/);
  });

  it('global --color-* token count is unchanged', () => {
    // The @theme inline block should still have exactly 42 --color-* mappings
    const colorTokenCount = (indexCss.match(/--color-[a-z0-9-]+\s*:/g) ?? []).length;
    expect(colorTokenCount).toBe(42);
  });

  it('index.css SHA pin matches the legitimate Task 134 state', () => {
    const sha = crypto.createHash('sha256').update(indexCss).digest('hex');
    expect(sha).toBe('9769b87acc749a39341115744c2ff90e5989cd30372bab22410e8499439beee0');
  });
});