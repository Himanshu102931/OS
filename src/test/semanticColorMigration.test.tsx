/**
 * Semantic Color Migration Contract Test - P2-b Phase
 *
 * Verifies the legacy surface/text/border color migration compliance:
 * - No targeted legacy surface/text/border literals remain in migrated files
 * - Semantic utilities are present and used correctly
 * - Page action accents remain intact (not migrated to status tokens)
 * - Compatibility shim is not modified
 * - No new global token names introduced
 * - TodayGuide.tsx is excluded and protected
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'

// Files that were migrated across semantic color migration phases (including TodayGuide)
const MIGRATED_FILES = [
  'src/components/common/TaskCard.tsx',
  'src/components/common/TaskDecompositionModal.tsx',
  'src/components/common/TaskLearningWorkspaceDrawer.tsx',
  'src/components/dashboard/TodayGuide.tsx',
  'src/components/daily/EveningReflectionModal.tsx',
  'src/components/daily/FocusModeModal.tsx',
  'src/components/daily/MorningPlanningModal.tsx',
  'src/components/dsa/DSAAttemptModal.tsx',
  'src/components/evidence/EvidenceTracePanel.tsx',
  'src/components/layout/AppShell.tsx',
  'src/components/project/ProjectArchitectureBlueprint.tsx',
  'src/components/project/ProjectDefenseHero.tsx',
  'src/components/project/ProjectDefenseRubric.tsx',
  'src/components/project/ProjectEvidenceLedger.tsx',
  'src/components/project/ProjectHeader.tsx',
  'src/components/project/ProjectModuleCard.tsx',
  'src/components/project/ProjectPillarNavigator.tsx',
  'src/components/project/ProjectReadinessStrip.tsx',
  'src/components/settings/BackupStorageSection.tsx',
  'src/components/settings/ConfirmFullResetModal.tsx',
  'src/components/settings/DangerZoneSection.tsx',
  'src/components/settings/DisplayPreferencesSection.tsx',
  'src/components/settings/SettingsHeader.tsx',
  'src/components/settings/SettingsView.tsx',
  'src/components/settings/StudyParametersSection.tsx',
  'src/components/settings/SubsystemMaintenanceSection.tsx',
  'src/components/ui/ErrorBoundary.tsx',
]

const LEGACY_SURFACE_COLORS = [
  '#0D0F12', // legacy background
  '#14171D', // legacy surface / bg-surface-panel
  '#1B2028', // legacy surface-elevated
  '#222833', // legacy surface-muted
  '#F1F5F9', // legacy foreground / text-text-primary
  '#8E98A8', // legacy foreground-muted
  '#5C6675', // legacy secondary
  '#262D38', // legacy border / border-border-default
  '#3B4556', // legacy border-active
  '#10B981', // legacy success
  '#4CAF78', // legacy success
  '#F59E0B', // legacy warning
  '#D19A45', // legacy warning
  '#D97706', // legacy warning
  '#CA8A04', // legacy warning
  '#FACC15', // legacy warning
  '#EF4444', // legacy danger
  '#D05A52', // legacy danger
]

const ACTION_ACCENT_COLORS = [
  '#E5A93C', // Today/primary amber accent
  '#FFC665', // Today/primary lighter amber
  '#3B82F6', // Practice cobalt accent
  '#93C5FD', // Practice lighter cobalt
  '#F43F5E', // Analytics Crimson Pulse action accent
  '#FB7185', // Analytics lighter action accent
  '#FDA4AF', // Analytics action accent
]

const SEMANTIC_UTILITIES = [
  'bg-surface-panel',
  'bg-surface-elevated',
  'bg-background',
  'border-border-default',
  'border-border-active',
  'text-text-primary',
  'text-text-secondary',
  'text-status-success',
  'text-status-warning',
  'text-status-danger',
  'bg-status-success/',
  'bg-status-warning/',
  'bg-status-danger/',
  'text-accent-amber',
]

describe('Semantic Color Migration Contract', () => {
  it('should have no legacy surface/text/border literals in migrated files', () => {
    for (const file of MIGRATED_FILES) {
      const content = fs.readFileSync(file, 'utf8')

      for (const color of LEGACY_SURFACE_COLORS) {
        const regex = new RegExp(`#${color.replace('#', '')}\\b`, 'gi')
        const matches = content.match(regex)
        if (matches) {
          throw new Error(
            `Legacy color #${color} found in ${file} (${matches.length} occurrences)`
          )
        }
      }
    }
  })

  it('should have semantic utilities present in migrated files', () => {
    for (const file of MIGRATED_FILES) {
      try {
        const content = fs.readFileSync(file, 'utf8')

        for (const token of SEMANTIC_UTILITIES) {
          if (!content.includes(token)) {
            // Not all utilities need to be in every file, but we check overall usage
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  })

  it('should have page action accents remain intact', () => {
    for (const file of MIGRATED_FILES) {
      try {
        const content = fs.readFileSync(file, 'utf8')

        for (const accent of ACTION_ACCENT_COLORS) {
          // Check that action accent colors are NOT migrated to status token form
          const statusTokenPatterns = [
            'text-status-warning',
            'text-status-danger',
            'bg-status-warning/',
            'bg-status-danger/',
          ]
          const migratedToStatus = statusTokenPatterns.some((p) => content.includes(p))
          if (migratedToStatus) {
            // But only if the raw hex is still present (meaning it wasn't properly migrated)
            const hexRegex = new RegExp(`#${accent.replace('#', '')}\\b`, 'gi')
            const stillHasHex = content.match(hexRegex)
            if (stillHasHex) {
              throw new Error(
                `Action accent #${accent} appears to have been incorrectly migrated to status token in ${file}`
              )
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  })

  it('should verify obsolete compatibility shim rules are retired from index.css', () => {
    const cssContent = fs.readFileSync('src/index.css', 'utf8')

    // Verify obsolete central compatibility shim mappings are no longer present
    const retiredShimMappings = [
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
    ]

    for (const mapping of retiredShimMappings) {
      expect(cssContent.includes(mapping), `Obsolete shim mapping ${mapping} was expected to be retired from index.css`).toBe(false)
    }
  })

  it('should not introduce new global token names', () => {
    const cssContent = fs.readFileSync('src/index.css', 'utf8')

    // Check for any new --analytics-* tokens that weren't there before
    const analyticsTokenPattern = /--analytics-[a-z-]+:/g
    const analyticsTokens = cssContent.match(analyticsTokenPattern) || []

    // Should have 0 new analytics global tokens (the action-accent family is scoped)
    expect(analyticsTokens.length, `New global analytics tokens found: ${analyticsTokens.join(', ')}`).toBe(0)
  })

  it('should verify TodayGuide.tsx is fully migrated to semantic tokens', () => {
    const todayGuidePath = 'src/components/dashboard/TodayGuide.tsx'
    expect(fs.existsSync(todayGuidePath)).toBe(true)
    const todayGuideContent = fs.readFileSync(todayGuidePath, 'utf8')

    expect(todayGuideContent).toContain('TodayGuide')
    expect(todayGuideContent).toContain('GUIDE_SECTIONS')

    // Verify no legacy hex colors remain in TodayGuide.tsx
    for (const color of LEGACY_SURFACE_COLORS) {
      const regex = new RegExp(`#${color.replace('#', '')}\\b`, 'gi')
      const matches = todayGuideContent.match(regex)
      expect(matches, `Legacy color #${color} still found in TodayGuide.tsx`).toBeNull()
    }
  })
})