import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Task 120 — Assessment legacy token migration (P2-01 Phase 1).
 *
 * Source-contract test: proves the Assessment subsystem renders through the
 * semantic/page-specific token system rather than legacy hardcoded hexes,
 * while the Benchmark Topaz action accent itself is preserved (not flattened
 * into forest-green primary).
 */

const ASSESSMENT_SOURCES = import.meta.glob('../components/assessment/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexCss = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf-8');
const assessmentSrc = Object.values(ASSESSMENT_SOURCES).join('\n');

/**
 * Documented intentional remainders — darker hover shades for status CTAs.
 * The frozen token system defines no --success-hover / --danger-hover token,
 * so these two literals stay on purpose to keep hover feedback intact.
 */
const ALLOWLISTED_HOVER_HEX = new Set(['059669', 'b91c1c']);

describe('Assessment token migration (P2-01 Phase 1)', () => {
  it('no hardcoded hex color remains in Assessment components outside the hover-shade allowlist', () => {
    const stragglers: string[] = [];
    for (const [path, src] of Object.entries(ASSESSMENT_SOURCES)) {
      for (const match of src.matchAll(/#([0-9A-Fa-f]{6})\b/g)) {
        const hex = match[1].toLowerCase();
        if (!ALLOWLISTED_HOVER_HEX.has(hex)) {
          stragglers.push(`${path}: #${match[1]}`);
        }
      }
    }
    expect(stragglers, `unexpected legacy hex:\n${stragglers.join('\n')}`).toEqual([]);
  });

  it('Benchmark Topaz CTAs use the semantic action-accent utilities', () => {
    expect(Object.keys(ASSESSMENT_SOURCES).length).toBeGreaterThan(0);

    // Defining action surfaces (topaz base + dark on-foreground).
    expect(assessmentSrc).toContain('bg-action-accent');
    expect(assessmentSrc).toContain('text-action-accent-foreground');
    // Hover + focus ring variants.
    expect(assessmentSrc).toContain('hover:bg-action-accent-hover');
    expect(assessmentSrc).toMatch(/ring-action-accent/);
    // Topaz accent as text/outline (never the legacy bronze).
    expect(assessmentSrc).toContain('text-action-accent');
    expect(assessmentSrc).toContain('border-action-accent');
  });

  it('surfaces, text, and status colors resolve through semantic tokens', () => {
    // Surface / boundary / text hierarchy.
    expect(assessmentSrc).toContain('bg-surface-panel');
    expect(assessmentSrc).toContain('bg-surface-elevated');
    expect(assessmentSrc).toContain('border-border');
    expect(assessmentSrc).toContain('text-foreground');
    expect(assessmentSrc).toContain('text-muted-foreground');
    expect(assessmentSrc).toContain('text-secondary');
    // Semantic status classifications.
    expect(assessmentSrc).toContain('text-success');
    expect(assessmentSrc).toContain('text-warning');
    expect(assessmentSrc).toContain('text-danger');
    expect(assessmentSrc).toContain('text-info');
    expect(assessmentSrc).toContain('bg-danger');
    expect(assessmentSrc).toContain('text-accent');
  });

  it('index.css still scopes Benchmark Topaz to the Assessment subsystem', () => {
    const scope = indexCss.match(/\[data-subsystem="assessment"\][^{]*\{[^}]+\}/)?.[0];
    expect(scope, 'Assessment action-accent scope missing from index.css').toBeTruthy();

    // Topaz base / hover / on-foreground preserved inside the scope.
    expect(scope).toContain('--action-accent: #EAB308');
    expect(scope).toContain('--action-accent-hover: #CA8A04');
    expect(scope).toContain('--action-accent-ring: #FACC15');
    expect(scope).toContain('--action-accent-foreground: #0D0F12');

    // Global default fallback remains forest — Assessment scope must override it,
    // proving the page accent was not flattened into forest green.
    expect(indexCss).toContain('--action-accent: #2E8B62');
    expect(indexCss.indexOf('--action-accent: #EAB308')).toBeGreaterThan(
      indexCss.indexOf('--action-accent: #2E8B62')
    );
  });
});
