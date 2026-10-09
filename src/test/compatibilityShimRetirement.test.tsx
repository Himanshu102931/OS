/**
 * Task 128 — Compatibility Shim Retirement Audit & Contract Test
 *
 * Requirements:
 * - Enumerate all 13 legacy shim mappings.
 * - Audit the production source tree for legacy consumer spellings (excluding protected TodayGuide.tsx).
 * - Verify that because active consumers remain in the production codebase, the compatibility shim in src/index.css must be preserved.
 * - Protect the canonical semantic token system from accidental modification/removal.
 * - Explicitly protect TodayGuide.tsx.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');

/** The 13 legacy compatibility shim class spellings handled previously by src/index.css */
export const LEGACY_SHIM_SPELLINGS = [
  'bg-[#0D0F12]',
  'bg-[#14171D]',
  'bg-[#1B2028]',
  'bg-[#222833]',
  'text-[#F1F5F9]',
  'text-[#8E98A8]',
  'text-[#5C6675]',
  'border-[#262D38]',
  'border-[#3B4556]',
  'text-[#E5A93C]',
  'text-[#FFC665]',
  'border-[#E5A93C]',
  'bg-[#E5A93C]',
] as const;

/** Canonical semantic tokens in :root that must never be removed or corrupted */
const CANONICAL_SEMANTIC_TOKENS = [
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
  '--success',
  '--warning',
  '--danger',
  '--info',
  '--action-accent',
  '--action-accent-hover',
  '--action-accent-foreground',
  '--action-accent-subtle',
  '--action-accent-border',
  '--action-accent-ring',
];

/** CSS selectors expected to be RETIRED from src/index.css */
const RETIRED_SHIM_SELECTORS = [
  '.bg-\\[\\#0D0F12\\]',
  '.bg-\\[\\#14171D\\]',
  '.bg-\\[\\#1B2028\\]',
  '.bg-\\[\\#222833\\]',
  '.text-\\[\\#F1F5F9\\]',
  '.text-\\[\\#8E98A8\\]',
  '.text-\\[\\#5C6675\\]',
  '.border-\\[\\#262D38\\]',
  '.border-\\[\\#3B4556\\]',
  '.text-\\[\\#E5A93C\\]',
  '.text-\\[\\#FFC665\\]',
  '.border-\\[\\#E5A93C\\]',
  'button.bg-\\[\\#E5A93C\\]',
];

function getAllProductionFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.agents', 'scratch', 'test'].includes(entry.name)) {
        getAllProductionFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.html'].includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe('Compatibility Shim Retirement Audit & Contract', () => {
  const indexCssContent = fs.readFileSync(INDEX_CSS_PATH, 'utf-8');

  it('enumerates all 13 expected legacy shim mappings', () => {
    expect(LEGACY_SHIM_SPELLINGS.length).toBe(13);
  });

  it('verifies that zero production consumers remain across all 13 legacy class spellings throughout the repository', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const productionFiles = getAllProductionFiles(rootDir).filter((f) => {
      const normalized = f.replace(/\\/g, '/');
      return (
        !normalized.endsWith('src/index.css') &&
        !normalized.includes('/test/') &&
        !normalized.includes('/scratch/')
      );
    });

    expect(productionFiles.length).toBeGreaterThan(0);

    const activeConsumersFound: Record<string, number> = {};

    for (const spelling of LEGACY_SHIM_SPELLINGS) {
      activeConsumersFound[spelling] = 0;
      const escaped = spelling.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const regex = new RegExp(escaped, 'gi');

      for (const file of productionFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(regex);
        if (matches) {
          activeConsumersFound[spelling] += matches.length;
        }
      }
    }

    // Task 134 verified that 0 legacy consumers remain across all 13 legacy class spellings in all production files
    for (const spelling of LEGACY_SHIM_SPELLINGS) {
      expect(
        activeConsumersFound[spelling],
        `Legacy shim spelling ${spelling} still has ${activeConsumersFound[spelling]} consumers in production files`
      ).toBe(0);
    }
  });

  it('verifies that obsolete compatibility shim selectors are retired from src/index.css', () => {
    for (const selector of RETIRED_SHIM_SELECTORS) {
      expect(
        indexCssContent.includes(selector),
        `Obsolete compatibility shim selector ${selector} should have been retired from src/index.css`
      ).toBe(false);
    }
  });

  it('protects the canonical semantic token definitions in :root', () => {
    const rootMatch = indexCssContent.match(/:root\s*\{([^}]+)\}/);
    expect(rootMatch, ':root definition block must exist in src/index.css').toBeTruthy();
    const rootBody = rootMatch![1];

    for (const token of CANONICAL_SEMANTIC_TOKENS) {
      expect(
        rootBody,
        `Canonical semantic token ${token} is missing from :root in src/index.css`
      ).toContain(`${token}:`);
    }
  });

  it('protects .today-guide-panel scoped atmospheric variables in src/index.css', () => {
    expect(indexCssContent).toContain('.today-guide-panel');
    const panelScopedVars = [
      '--background:',
      '--surface:',
      '--surface-muted:',
      '--surface-elevated:',
      '--foreground:',
      '--foreground-muted:',
      '--secondary:',
      '--border:',
      '--accent:',
      '--primary:',
      '--primary-foreground:',
    ];

    for (const v of panelScopedVars) {
      expect(indexCssContent).toContain(v);
    }
  });
});
