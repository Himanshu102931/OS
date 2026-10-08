import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Task 123 — Skills / Interview / Analytics legacy token migration
 * (P2-01 Phase 3).
 *
 * Source-contract test: proves the three subsystems render through the
 * semantic + page-scoped action-accent token system rather than legacy
 * hardcoded hexes, while each page's frozen action accent is preserved
 * (Violet Amethyst, Electric Indigo, Crimson Pulse) and never flattened into
 * the shared forest-green palette or borrowed from another page.
 *
 * Authority: docs/design/DESIGN.md, docs/specs/skills/SKILLS_SPEC_V1.md,
 * docs/specs/interview/INTERVIEW_SPEC_V1.md,
 * docs/specs/analytics/ANALYTICS_SPEC_V1.md.
 */

const SKILLS_SOURCES = import.meta.glob('../components/skills/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const INTERVIEW_SOURCES = import.meta.glob('../components/interview/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const ANALYTICS_SOURCES = import.meta.glob('../components/analytics/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexCssRaw = fs.readFileSync(
  path.resolve(__dirname, '../../src/index.css'),
  'utf-8'
);
const indexCss = indexCssRaw.replace(/\r\n/g, '\n');

const skillsSrc = Object.values(SKILLS_SOURCES).join('\n');
const interviewSrc = Object.values(INTERVIEW_SOURCES).join('\n');
const analyticsSrc = Object.values(ANALYTICS_SOURCES).join('\n');

const SCOPES: Array<{ name: string; sources: Record<string, string>; src: string }> = [
  { name: 'skills', sources: SKILLS_SOURCES, src: skillsSrc },
  { name: 'interview', sources: INTERVIEW_SOURCES, src: interviewSrc },
  { name: 'analytics', sources: ANALYTICS_SOURCES, src: analyticsSrc },
];

/**
 * Documented intentional remainders — Class A / G exceptions.
 *
 * 1. Crimson Pulse family (ANALYTICS_SPEC_V1.md §13 LOCKED).
 *    Analytics' defining action accent is `#F43F5E` with `#FB7185` hover and
 *    `#FDA4AF` on-container text. No `--action-accent-analytics` token exists
 *    in src/index.css (§14 Part 3 is still unimplemented) and inventing a
 *    global token in this phase is prohibited, so the family stays literal.
 *
 * 2. Leitner distribution series (ANALYTICS_SPEC_V1.md §17 LOCKED).
 *    Box 1 `#384252`, Box 2 `#3B82F6`, Box 3 `#8B5CF6`, Box 4 `#10B981` are
 *    a locked four-series chart palette — four visually distinct stacked
 *    segments plus their legend swatches. File-scoped to the observatory.
 *
 * No other literal may survive in the three subsystems.
 */
const CRIMSON_PULSE_HEX = new Set(['f43f5e', 'fda4af', 'fb7185']);
const LEITNER_SERIES_HEX = new Set(['384252', '3b82f6', '8b5cf6', '10b981']);
const LEITNER_SERIES_FILE = '../components/analytics/AnalyticsObservatory.tsx';

/** rgb()/rgba()/hsl()/oklch()/color-mix() literals — none are permitted. */
const ALLOWLISTED_COLOR_FUNCTIONS: string[] = [];

/** The frozen list of legacy literals this migration had to eliminate. */
const LEGACY_HEX = [
  'e5a93c', 'ffc665', 'f59e0b', 'eab308', 'ca8a04', 'facc15',
  '0d0f12', '0b100d', '111713', '161e19', '1b241f', 'e8f0e9',
  '9aa99f', '86958b', '28352d', '3c4e43',
];

function hexesIn(src: string): string[] {
  return [...src.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1].toLowerCase());
}

function colorFunctionsIn(src: string): string[] {
  return [...src.matchAll(/\b(?:rgba?|hsl|oklch|color-mix)\s*\(/gi)].map((m) =>
    m[0].replace(/\s*\($/, '(')
  );
}

function allowedHex(file: string, hex: string): boolean {
  if (CRIMSON_PULSE_HEX.has(hex)) {
    return file.startsWith('../components/analytics/');
  }
  if (LEITNER_SERIES_HEX.has(hex)) {
    return file === LEITNER_SERIES_FILE;
  }
  return false;
}

describe('Skills / Interview / Analytics token migration (P2-01 Phase 3)', () => {
  it('the three subsystems are actually covered by this contract', () => {
    expect(Object.keys(SKILLS_SOURCES).length).toBeGreaterThan(0);
    expect(Object.keys(INTERVIEW_SOURCES).length).toBeGreaterThan(0);
    expect(Object.keys(ANALYTICS_SOURCES).length).toBeGreaterThan(0);
  });

  it('no unintended legacy hex literal survives outside the allowlist', () => {
    const stragglers: string[] = [];
    for (const scope of SCOPES) {
      for (const [file, src] of Object.entries(scope.sources)) {
        for (const hex of hexesIn(src)) {
          if (!allowedHex(file, hex)) {
            stragglers.push(`${file}: #${hex}`);
          }
        }
      }
    }
    expect(stragglers, `unexpected legacy hex:\n${stragglers.join('\n')}`).toEqual([]);
  });

  it('none of the frozen legacy hex list remains in any scoped file', () => {
    const found: string[] = [];
    for (const scope of SCOPES) {
      const lower = scope.src.toLowerCase();
      for (const hex of LEGACY_HEX) {
        if (lower.includes(hex)) {
          found.push(`${scope.name}: #${hex}`);
        }
      }
    }
    expect(found, `frozen legacy literals still present:\n${found.join('\n')}`).toEqual([]);
  });

  it('no stray rgb/rgba/hsl/oklch/color-mix literal remains', () => {
    const found: string[] = [];
    for (const scope of SCOPES) {
      for (const [file, src] of Object.entries(scope.sources)) {
        for (const fn of colorFunctionsIn(src)) {
          if (!ALLOWLISTED_COLOR_FUNCTIONS.includes(fn)) {
            found.push(`${file}: ${fn}`);
          }
        }
      }
    }
    expect(found, `unexpected color function:\n${found.join('\n')}`).toEqual([]);
  });

  it('each page declares its own action accent and never borrows another', () => {
    // Skills — Violet Amethyst via the explicit scoped family.
    expect(skillsSrc).toContain('var(--action-accent-skills)');
    expect(skillsSrc).not.toContain('var(--action-accent-interview');
    expect(skillsSrc).not.toContain('var(--action-accent-companies');

    // Interview — Electric Indigo. The scoped override only wraps
    // InterviewHeroSpotlight (.interview-view-container), so every other
    // component must reference the family explicitly; the generic
    // `action-accent` utility would fall back to forest green outside it.
    expect(interviewSrc).toContain('var(--action-accent-interview)');
    expect(interviewSrc).not.toContain('var(--action-accent-skills');
    expect(interviewSrc).not.toContain('var(--action-accent-companies');

    // Analytics — Crimson Pulse. No token exists, so the LOCKED literal
    // survives as a documented exception (see allowlist above).
    expect(analyticsSrc).toContain('#F43F5E');
    expect(analyticsSrc).not.toContain('var(--action-accent-companies');
    expect(analyticsSrc).not.toContain('var(--action-accent-skills');
    expect(analyticsSrc).not.toContain('var(--action-accent-interview');

    // No page accent was flattened into the shared forest-green primary.
    for (const scope of SCOPES) {
      expect(scope.src.toLowerCase(), `${scope.name} flattened to forest green`).not.toContain(
        '#2e8b62'
      );
    }
  });

  it('no subsystem uses a foreign page accent hex', () => {
    const forbidden: Record<string, string[]> = {
      // today / assessment / practice / project / companies / dsa accents
      skills: ['6366f1', 'f43f5e', 'eab308', '0284c7', '3b82f6', '06b6d4', 'ff5722', 'f59e0b'],
      interview: ['8b5cf6', 'f43f5e', 'eab308', '0284c7', '3b82f6', '06b6d4', 'ff5722'],
      analytics: ['6366f1', 'eab308', '0284c7', '06b6d4', 'ff5722', 'f59e0b', '38bdf8', 'a78bfa'],
    };
    const violations: string[] = [];
    for (const scope of SCOPES) {
      const lower = scope.src.toLowerCase();
      for (const hex of forbidden[scope.name]) {
        if (lower.includes(hex)) {
          violations.push(`${scope.name} borrows #${hex.toUpperCase()}`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('surfaces, text, borders and statuses resolve through semantic utilities', () => {
    // Skills: semantic status family + surfaces + generic foreground/border.
    expect(skillsSrc).toContain('text-status-success');
    expect(skillsSrc).toContain('text-status-warning');
    expect(skillsSrc).toContain('text-status-danger');
    expect(skillsSrc).toContain('bg-status-success');
    expect(skillsSrc).toContain('bg-status-warning');
    expect(skillsSrc).toContain('bg-status-danger');
    expect(skillsSrc).toContain('border-status-success');
    expect(skillsSrc).toContain('border-status-warning');
    expect(skillsSrc).toContain('border-status-danger');
    expect(skillsSrc).toContain('bg-surface-elevated');
    expect(skillsSrc).toContain('text-foreground');
    expect(skillsSrc).toContain('border-border');

    // Interview: full surface / text / border / status / info ladder.
    expect(interviewSrc).toContain('bg-surface-canvas');
    expect(interviewSrc).toContain('bg-surface-panel');
    expect(interviewSrc).toContain('bg-surface-elevated');
    expect(interviewSrc).toContain('bg-surface-subtle');
    expect(interviewSrc).toContain('text-text-primary');
    expect(interviewSrc).toContain('text-text-secondary');
    expect(interviewSrc).toContain('border-border-default');
    expect(interviewSrc).toContain('border-border-active');
    expect(interviewSrc).toContain('text-status-success');
    expect(interviewSrc).toContain('text-status-warning');
    expect(interviewSrc).toContain('text-status-danger');
    expect(interviewSrc).toContain('bg-info');
    expect(interviewSrc).toContain('border-info');
    expect(interviewSrc).toContain('text-info');

    // Analytics: same ladder plus the tertiary text tier.
    expect(analyticsSrc).toContain('bg-surface-canvas');
    expect(analyticsSrc).toContain('bg-surface-panel');
    expect(analyticsSrc).toContain('bg-surface-elevated');
    expect(analyticsSrc).toContain('text-text-primary');
    expect(analyticsSrc).toContain('text-text-secondary');
    expect(analyticsSrc).toContain('text-text-tertiary');
    expect(analyticsSrc).toContain('border-border-default');
    expect(analyticsSrc).toContain('border-border-active');
    expect(analyticsSrc).toContain('text-status-success');
    expect(analyticsSrc).toContain('text-status-warning');
    expect(analyticsSrc).toContain('text-status-danger');
    expect(analyticsSrc).toContain('bg-info');
    expect(analyticsSrc).toContain('text-info');
  });

  it('the documented exceptions are present exactly as allowlisted', () => {
    // Crimson Pulse remains Analytics' defining accent.
    expect(analyticsSrc).toContain('#F43F5E');
    expect(analyticsSrc).toContain('#FDA4AF');
    expect(analyticsSrc).toContain('#FB7185');

    // Locked Leitner series (stacked bar segments + legend swatches).
    const observatory = ANALYTICS_SOURCES[LEITNER_SERIES_FILE];
    expect(observatory, 'AnalyticsObservatory.tsx missing from glob').toBeTruthy();
    expect(observatory).toContain('bg-[#384252]');
    expect(observatory).toContain('bg-[#3B82F6]');
    expect(observatory).toContain('bg-[#8B5CF6]');
    expect(observatory).toContain('bg-[#10B981]');
    // Exactly two uses each — the segment fill and its legend dot.
    for (const hex of ['384252', '3B82F6', '8B5CF6', '10B981']) {
      const count = (observatory.match(new RegExp(`#${hex}`, 'g')) ?? []).length;
      expect(count, `#${hex} occurrences in the observatory`).toBe(2);
    }
  });

  it('index.css introduced no new global tokens', () => {
    // Byte-identical to the audited baseline (line-ending normalised).
    const sha = crypto.createHash('sha256').update(indexCss).digest('hex');
    expect(
      sha,
      'src/index.css changed. This migration must not add or edit global tokens. ' +
        'If a later task legitimately adds one, update this pin together with the audit record.'
    ).toBe('3c604491c3cbc1e88f3ea57c686f6f8316146ce9e6ff6244476bc8f46dc83a0b');

    // No Analytics action-accent family was invented (reported as a gap).
    expect(indexCss).not.toMatch(/--action-accent-analytics/i);
    expect(indexCss).not.toMatch(/--color-action-accent-analytics/i);
    expect(indexCss).not.toMatch(/--analytics-[a-z0-9-]+\s*:/i);
    expect(indexCss).not.toMatch(/--color-action-accent-(skills|interview)\s*:/);

    // Theme colour token count is unchanged.
    expect(indexCss.match(/--color-[a-z0-9-]+\s*:/g) ?? []).toHaveLength(42);

    // The token families this migration depends on are still defined.
    expect(indexCss).toContain('--action-accent-skills: #8B5CF6;');
    expect(indexCss).toContain('--action-accent-interview: #6366F1;');
    expect(indexCss).toContain('--color-status-success: var(--success);');
    expect(indexCss).toContain('--color-status-warning: var(--warning);');
    expect(indexCss).toContain('--color-status-danger: var(--danger);');
    expect(indexCss).toContain('--color-surface-canvas: var(--background);');
    expect(indexCss).toContain('--color-surface-panel: var(--surface);');
    expect(indexCss).toContain('--color-surface-elevated: var(--surface-elevated);');
    expect(indexCss).toContain('--color-border-default: var(--border);');
    expect(indexCss).toContain('--color-text-primary: var(--foreground);');
    expect(indexCss).toContain('--color-text-tertiary: var(--foreground-subtle);');
  });
});
