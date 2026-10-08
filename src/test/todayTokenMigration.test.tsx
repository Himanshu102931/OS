import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Task 122 — Dashboard/Today legacy token migration (P2-01 Phase 2).
 *
 * Source-contract test: proves the Dashboard/Today subsystem renders through
 * the semantic / page-specific token system rather than legacy hardcoded hexes,
 * while the two things the frozen system says MUST survive are still intact:
 *
 *   - the Today action accent stays Sky-Cyan (`#0284C7`, atmospheric scope)
 *   - the forest-green base identity and the semantic status family stay put
 *
 * Every literal that deliberately remains is allowlisted below with the reason.
 */

const DASHBOARD_SOURCES = import.meta.glob('../components/dashboard/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexCss = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf-8');

const byName = (name: string): string => {
  const hit = Object.entries(DASHBOARD_SOURCES).find(([p]) => p.endsWith(`/${name}`));
  if (!hit) throw new Error(`Missing source: ${name}`);
  return hit[1];
};

/** TODAY_SPEC §23 — protected file, never migrated and never scanned. */
const PROTECTED_FILE = 'TodayGuide.tsx';

/** The four Dashboard/Today files carried through P2-01 Phase 2. */
const PHASE2_FILES = [
  'SessionDisplay.tsx',
  'CompletionAnimation.tsx',
  'DailySignalGraph.tsx',
  'TodayControlVisual.tsx',
];

/**
 * Documented intentional remainders — the frozen token system genuinely has no
 * Today-scoped token for either value, and inventing one would expand scope.
 *
 *  1. `#38BDF8` (SessionDisplay — "Practice" session-kind badge).
 *     Sky-Cyan, i.e. the exact value of `--action-accent-ring` inside the Today
 *     atmospheric scope and the value TODAY_SPEC §1.2 leaves on Today's side of
 *     the line (it is NOT on the superseded list). No non-scoped Sky/Cyan token
 *     exists, and folding it into `--info` would collapse the intentional
 *     Practice vs DSA-Problem badge distinction.
 *
 *  2. `#8B5CF6` + `rgba(139,92,246,0.3)` (TodayControlVisual — Practice node).
 *     The value of `--action-accent-skills`, i.e. the Skills page action
 *     accent. Borrowing a foreign page accent onto Today is forbidden by the
 *     migration rules and the frozen system defines no Today violet token.
 */
const ALLOWLISTED_HEX = new Set(['38bdf8', '8b5cf6']);
const ALLOWLISTED_RGBA = new Set(['rgba(139,92,246,0.3)']);

/** TODAY_SPEC §24.4 T-NEW-3 — the frozen list of legacy hexes banned on Today. */
const T_NEW_3_HEX =
  /#(E5A93C|FFC665|F59E0B|10B981|3B82F6|0D0F12|14171D|1B2028|222833|262D38|3B4556|8E98A8|5C6675|F1F5F9|432C00)/i;

/** Exact `:root` custom-property names as frozen by TODAY_SPEC §1.1/§1.2. */
const ROOT_TOKEN_NAMES = [
  '--background',
  '--surface',
  '--surface-muted',
  '--surface-elevated',
  '--foreground',
  '--foreground-muted',
  '--foreground-subtle',
  '--border',
  '--border-active',
  '--primary',
  '--primary-hover',
  '--primary-foreground',
  '--secondary',
  '--accent',
  '--accent-soft',
  '--focus',
  '--ring',
  '--hero-dark',
  '--hero-accent',
  '--success',
  '--warning',
  '--danger',
  '--info',
  '--radius',
  '--action-accent',
  '--action-accent-hover',
  '--action-accent-foreground',
  '--action-accent-subtle',
  '--action-accent-border',
  '--action-accent-ring',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--muted',
  '--muted-foreground',
  '--destructive',
  '--input',
];

const phase2Src = PHASE2_FILES.map(byName).join('\n');

/** Everything except the protected file. */
const scannableDashboard = Object.entries(DASHBOARD_SOURCES).filter(
  ([p]) => !p.endsWith(`/${PROTECTED_FILE}`)
);

describe('Dashboard/Today token migration (P2-01 Phase 2)', () => {
  it('scope sanity — phase-2 files are present and TodayGuide is excluded from every scan', () => {
    for (const name of PHASE2_FILES) expect(byName(name)).toBeTruthy();
    // Protected file is still present on disk but never scanned by this contract.
    expect(scannableDashboard.some(([p]) => p.endsWith(`/${PROTECTED_FILE}`))).toBe(false);
    expect(scannableDashboard.length).toBeGreaterThan(0);
  });

  it('no unintended hardcoded hex survives in Dashboard/Today production files', () => {
    const stragglers: string[] = [];
    for (const [p, src] of scannableDashboard) {
      for (const match of src.matchAll(/#([0-9A-Fa-f]{6})\b/g)) {
        const hex = match[1].toLowerCase();
        if (!ALLOWLISTED_HEX.has(hex)) stragglers.push(`${p}: #${match[1]}`);
      }
    }
    expect(stragglers, `unexpected legacy hex:\n${stragglers.join('\n')}`).toEqual([]);
  });

  it('no literal rgba() survives in the phase-2 files outside the allowlist', () => {
    const stragglers: string[] = [];
    for (const name of PHASE2_FILES) {
      for (const match of byName(name).matchAll(/rgba?\([^)]*\)/g)) {
        if (!ALLOWLISTED_RGBA.has(match[0])) stragglers.push(`${name}: ${match[0]}`);
      }
    }
    expect(stragglers, `unexpected rgba literal:\n${stragglers.join('\n')}`).toEqual([]);
  });

  it('T-NEW-3 green contract — the frozen legacy list is gone from every phase-2 file', () => {
    for (const name of PHASE2_FILES) {
      const match = byName(name).match(T_NEW_3_HEX);
      expect(match, `${name} still contains forbidden legacy hex: ${match?.[0]}`).toBeNull();
    }
  });

  it('allowlisted exceptions are still present, so the allowlist cannot rot silently', () => {
    expect(byName('SessionDisplay.tsx')).toContain('#38BDF8');
    expect(byName('TodayControlVisual.tsx')).toContain('#8B5CF6');
    expect(byName('TodayControlVisual.tsx')).toContain('rgba(139,92,246,0.3)');
    // …and nothing beyond them: exactly one file may still carry a hex.
    const withHex = scannableDashboard.filter(([, s]) => /#[0-9A-Fa-f]{6}\b/.test(s)).map(([p]) => p);
    expect(withHex.sort()).toEqual([
      '../components/dashboard/SessionDisplay.tsx',
      '../components/dashboard/TodayControlVisual.tsx',
    ]);
  });

  it('Today action accent remains Sky-Cyan through the action-accent family', () => {
    const primitives = byName('todayPrimitives.tsx');
    expect(primitives).toContain('border-action-accent-border');
    expect(primitives).toContain('bg-action-accent');
    expect(primitives).toContain('text-action-accent-foreground');
    expect(primitives).toContain('hover:bg-action-accent-hover');

    const view = byName('DashboardView.tsx');
    expect(view).toContain('data-testid="primary-action"');
    expect(view).toContain('data-atmospheric="true"');

    // The atmospheric scope still pins Sky-Cyan — not forest green, not Topaz.
    const atmosphere = indexCss.match(/\.atmospheric-scene,[\s\S]*?\n\}/)?.[0];
    expect(atmosphere, 'atmospheric scope missing from index.css').toBeTruthy();
    expect(atmosphere).toContain('--action-accent: #0284C7');
    expect(atmosphere).toContain('--action-accent-ring: #38BDF8');
  });

  it('forest-green base identity and semantic status utilities remain present', () => {
    // Base / accent fills.
    expect(phase2Src).toContain('bg-surface-canvas');
    expect(phase2Src).toContain('bg-surface-panel');
    expect(phase2Src).toContain('bg-surface-elevated');
    expect(phase2Src).toContain('border-border-default');
    expect(phase2Src).toContain('border-border-active');
    expect(phase2Src).toContain('bg-primary');
    expect(phase2Src).toContain('text-primary-foreground');
    expect(phase2Src).toContain('text-accent');
    // Semantic status family.
    expect(phase2Src).toContain('text-status-success');
    expect(phase2Src).toContain('bg-status-success/20');
    expect(phase2Src).toContain('text-status-warning');
    expect(phase2Src).toContain('border-status-warning/30');
    expect(phase2Src).toContain('text-status-danger');
    expect(phase2Src).toContain('text-info');
    // Inline-style (SVG / data-map) colours resolve through tokens too.
    expect(phase2Src).toContain('var(--success)');
    expect(phase2Src).toContain('var(--warning)');
    expect(phase2Src).toContain('var(--danger)');
    expect(phase2Src).toContain('var(--accent)');
    expect(phase2Src).toContain('var(--primary)');
  });

  it('bronze is no longer a fill, brand or decorative colour — only warning semantics survive', () => {
    // The bronze/gold literals themselves are gone (asserted by T-NEW-3 above).
    expect(phase2Src).not.toContain('#E5A93C');
    expect(phase2Src).not.toContain('#FFC665');
    // The only remaining warm token usage is the semantic warning family.
    const warm = phase2Src.match(/(?:bg|text|border)-status-warning(?:\/\d+)?/g) ?? [];
    expect(warm.length).toBeGreaterThan(0);
    // No warm colour is used as a filled primary surface.
    expect(phase2Src).not.toMatch(/bg-warning/);
    expect(phase2Src).not.toContain('from-warning');
    expect(phase2Src).not.toContain('to-warning');
  });

  it('no new global tokens were introduced — the :root registry is unchanged', () => {
    const rootBlock = indexCss.match(/:root\s*\{[^}]*--background[^}]*\}/)?.[0];
    expect(rootBlock, 'frozen :root token block not found').toBeTruthy();

    const declared = [...rootBlock!.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]);
    expect(declared.slice().sort()).toEqual(ROOT_TOKEN_NAMES.slice().sort());
    expect(declared.length).toBe(ROOT_TOKEN_NAMES.length);

    // The tokens this migration relies on must already exist (no additions).
    for (const token of ['--foreground-subtle', '--action-accent', '--accent', '--info']) {
      expect(rootBlock).toContain(`${token}:`);
    }
  });

  it('index.css is untouched by this migration (no redirect-layer or scope edits)', () => {
    // The legacy-hex redirect layer and every page accent scope stay frozen.
    expect(indexCss).toContain('.text-\\[\\#E5A93C\\] { color: var(--accent); }');
    expect(indexCss).toContain('.border-\\[\\#262D38\\] { border-color: var(--border); }');
    expect(indexCss).toContain('--action-accent: #2E8B62');
    expect(indexCss).toContain('--action-accent: #0284C7');
  });
});
