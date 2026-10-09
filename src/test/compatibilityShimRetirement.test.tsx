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
import crypto from 'crypto';

const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');
const TODAY_GUIDE_PATH = path.resolve(__dirname, '../components/dashboard/TodayGuide.tsx');
const REQUIRED_TODAY_GUIDE_SHA256 = '81C6E6A04D66CCC9F4CF2EEBD11F16719FB675724006924BD88BA18AF3A09E76';

/** The 13 legacy compatibility shim class spellings handled by src/index.css */
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

/** CSS selectors expected in src/index.css for the compatibility shim */
const EXPECTED_SHIM_SELECTORS = [
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
      if (['.ts', '.tsx', '.html', '.css'].includes(ext)) {
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

  it('verifies that production source files outside TodayGuide.tsx have 0 remaining legacy shim classes', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const productionFiles = getAllProductionFiles(rootDir).filter((f) => {
      const normalized = f.replace(/\\/g, '/');
      return (
        !normalized.endsWith('TodayGuide.tsx') &&
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

    // Task 129 successfully migrated all production files outside TodayGuide.tsx to 0 remaining legacy consumers
    for (const spelling of LEGACY_SHIM_SPELLINGS) {
      expect(
        activeConsumersFound[spelling],
        `Legacy shim spelling ${spelling} still has ${activeConsumersFound[spelling]} consumers outside TodayGuide.tsx`
      ).toBe(0);
    }
  });

  it('guarantees that shim declarations in src/index.css remain intact to support protected TodayGuide and backward compatibility', () => {
    for (const selector of EXPECTED_SHIM_SELECTORS) {
      expect(
        indexCssContent.includes(selector),
        `Required compatibility shim selector ${selector} is missing from src/index.css`
      ).toBe(true);
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

  it('protects and isolates TodayGuide.tsx with exact SHA-256 guard', () => {
    expect(fs.existsSync(TODAY_GUIDE_PATH)).toBe(true);
    const todayGuideBuffer = fs.readFileSync(TODAY_GUIDE_PATH);
    const sha256 = crypto.createHash('sha256').update(todayGuideBuffer).digest('hex').toUpperCase();
    expect(sha256).toBe(REQUIRED_TODAY_GUIDE_SHA256);
  });
});
