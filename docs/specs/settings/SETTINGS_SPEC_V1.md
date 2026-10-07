# PlacementOS Settings Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No UI manufacturing is authorized by this document alone; it is the definitive engineering blueprint for the subsequent manufacturing task.
**Baseline commit:** `8147d35` — `feat(assessment): redesign diagnostic benchmark console`
**Date:** 2026-10-07
**Scope:** `src/components/settings/*` (`SettingsView.tsx`, `ConfirmFullResetModal.tsx`, and modularized child components), integration with `PlacementContext.tsx`, `storageAdapter.ts`, `types/index.ts`, and the Settings test suite.

> **Reading Contract.**
> This document resolves every architectural, visual, behavioral, responsive, accessibility, safety-tier, and test-preservation decision for the Settings page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing storage serialization rules (`storageAdapter.ts`), context contracts (`PlacementContext.tsx`), routing definitions, and test assertions. The only file created in this task is this specification document.

---

## 1. Status / Frozen Contract — LOCKED

- **Subsystem:** Settings & Operational Parameters (`#/settings`)
- **Document Version:** 1.0 (Frozen Architecture Specification)
- **Implementation State:** Specification Frozen. Ready for Phase 2 UI Manufacturing.
- **Authority:** Pure Local-First Storage Adapter & Canonical User Settings (`storageAdapter.ts`, `PlacementContext.tsx`).

---

## 2. Product Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Settings Subsystem** (`#/settings`) is the candidate's **System Control Console, Operational Parameter Calibration Surface, and Local Storage Safeguard Hub**. In a local-first, offline-capable application without remote cloud servers, the user's browser is the entire database, execution engine, and archival repository.

The Settings page serves three vital functions:
1. **Operational Parameter Calibration:** Configures study targets, daily time budgets, DSA problem quotas, target placement horizons, and adaptive placement modes that govern the scoring engine on the Today dashboard.
2. **Data Sovereignty & Portability:** Enables the user to export complete, verified JSON snapshots of their study trajectory, import backups from other devices/browsers, and monitor their storage footprint.
3. **Targeted Maintenance & Storage Safeguards:** Provides crystal-clear, tiered maintenance operations (e.g., resetting preferences only, resetting diagnostic assessment proficiency only, resetting assessment history only) alongside an explicitly guarded, high-friction factory reset for complete state wiping.

---

## 3. Route & Entry Points — LOCKED

- **Exact Route / Hash:** `#/settings`
- **Entry Points:**
  - **AppShell Navigation Rail:** Listed under `navItems` as `{ id: 'settings', label: 'Settings', icon: Settings }`.
  - **Guide Trigger:** Embedded in header via `<GuideTrigger route="settings" />`.
  - **App Router:** `App.tsx` switch statement `case 'settings': return <SettingsView />;`.
- **Page Title in Header:** `System Settings & Storage`
- **Deep Links:** None (Settings is a single consolidated control console).

---

## 4. Current Architecture Forensics — LOCKED

The existing Settings subsystem consists of:

```
src/components/settings/
├── SettingsView.tsx              # Main view component (262 lines)
└── ConfirmFullResetModal.tsx     # Full application reset modal (110 lines)
```

### 4.1 State & Persistence Flow
1. **Hydration:** On app mount, `PlacementContext` invokes `StorageAdapter.loadState()`. If `localStorage` contains valid data under key `placementos_v1_state`, it hydrates `appState.userSettings` (merged with `DEFAULT_USER_SETTINGS`).
2. **Read Path:** `SettingsView` consumes `userSettings`, `todayDate`, `storageBytes`, and helper dispatchers from `usePlacement()`.
3. **Write Path:** When settings are edited, `updateUserSettings(partial)` is dispatched, updating `PlacementContext.appState.userSettings`. A `useEffect` in `PlacementContext` automatically serializes the full `appState` to `localStorage` via `StorageAdapter.saveState()`.
4. **Export Path:** `exportBackupJSON()` calls `JSON.stringify(appState, null, 2)` and downloads `placementos-backup-${todayDate}.json`.
5. **Import Path:** `importBackupJSON(rawJson)` validates schema strictly via `StorageAdapter.validateImportState(parsed)`. If valid, it writes to `localStorage` and hydrates `PlacementContext` state.
6. **Reset Paths:**
   - `resetUserSettingsOnly()`: Restores `userSettings` to `DEFAULT_USER_SETTINGS` without touching progress, DSA, or evidence.
   - `resetAssessmentProfileOnly()`: Resets assessment domain proficiencies to 0 while preserving history.
   - `resetAssessmentHistoryOnly()`: Clears assessment attempts, exposures, and responses back to unassessed baseline.
   - `resetApplicationData()`: Clears `localStorage` and restores clean seed data baseline.

---

## 5. Canonical State Sources — LOCKED

Settings must **NEVER** become a secondary source of truth for any placement or learning engine. Settings parameters only govern configuration, preferences, and data lifecycle.

| Setting / Property | Type | Default Value | Canonical Storage Path | Affects Engine Scoring? | Affects Display Only? |
|---|---|---|---|---|---|
| `placementHorizonDate` | `string` (YYYY-MM-DD) | `'2027-05-31'` | `userSettings.placementHorizonDate` | Yes (Urgency factor in adaptiveEngine) | No |
| `targetPlacementGoal` | `string` | `'Software Engineer (SDE-1)'` | `userSettings.targetPlacementGoal` | No (Informational target role) | Yes |
| `targetPhaseId` | `string` | `'phase-1'` | `userSettings.targetPhaseId` | Yes (Phase filtering in roadmap) | No |
| `dailyStudyMinutes` | `number` (30–480) | `120` | `userSettings.dailyStudyMinutes` | Yes (Daily session budget cap) | No |
| `dsaDailyCap` | `number` (1–15) | `5` | `userSettings.dsaDailyCap` | Yes (Daily DSA recommendation limit) | No |
| `placementMode` | `PlacementMode` | `'normal'` | `userSettings.placementMode` / `currentMode` | Yes (Weight distribution in adaptiveEngine) | No |
| `theme` | `'dark' \| 'high_contrast' \| 'slate_dark'` | `'dark'` | `userSettings.theme` | No | Yes |
| `densityMode` | `'compact' \| 'comfortable'` | `'compact'` | `userSettings.densityMode` | No | Yes |
| `showExplanationTooltips` | `boolean` | `true` | `userSettings.showExplanationTooltips` | No | Yes |
| `dailyCheckInReminder` | `boolean` | `false` | `userSettings.dailyCheckInReminder` | No (Offline local preference) | Yes |
| `reminderTime` | `string` (HH:mm) | `'20:00'` | `userSettings.reminderTime` | No (Offline local preference) | Yes |

Settings explicitly do **NOT** duplicate or manage:
- DSA problem states or Leitner boxes (managed exclusively by `dsaProgress`)
- Roadmap task completion or skip counts (managed exclusively by `taskProgress`)
- Evidence strength or skill freshness (managed exclusively by `skillStates` and `evidenceLogs`)
- Practice drill attempts (managed exclusively by `practiceAttempts`)
- Assessment responses and calibration records (managed exclusively by `assessmentState`)
- Company targets and requirements (managed exclusively by `companyOverlays`)

---

## 6. Current UX Forensic Audit — LOCKED

The audit of the existing `SettingsView.tsx` revealed the following critical UX and architectural defects:

1. **Failure of the 5-Second Test:** The current page renders 3 generic, unstyled cards. It is impossible for a user to discern what parameters drive their daily schedule versus what is safe presentation vs. what is destructive.
2. **C9 Regression / Invisible Canonical Fields:** Multiple fields defined in `UserSettings` (`targetPlacementGoal`, `placementHorizonDate`, `dailyStudyMinutes`, `dsaDailyCap`, `theme`, `densityMode`, `showExplanationTooltips`, `dailyCheckInReminder`, `reminderTime`) exist in `types/index.ts` and `storageAdapter.ts` but have **zero controls rendered in the UI**. A regression test (`settings.test.ts`) specifically flagged that `targetPlacementGoal` had no visible UI control.
3. **Visual Disconnect with Redesigned PlacementOS:** The current Settings page uses legacy rounded-xl borders, uncalibrated `#14171D` containers, plain HTML select elements, and lacks the crisp obsidian surfaces, 1px sub-surface borders, and semantic typography of the redesigned app.
4. **Muddled Danger & Reset Tiers:** Targeted diagnostic maintenance (`resetAssessmentProfileOnly`, `resetAssessmentHistoryOnly`), non-destructive settings reset (`resetUserSettingsOnly`), and catastrophic full reset (`resetApplicationData`) are displayed without clear safety tier separation.
5. **Primitive Alert Feedback:** Import and save feedback uses raw dismissable text bars instead of elegant inline status toasts or persistent confirmation indicators.

---

## 7. 5-Second Comprehension Test — LOCKED

A candidate opening the Settings page must instantly answer these 5 questions within **5 seconds**:

| Question | Forensic Answer on Redesigned Settings Console |
|---|---|
| **1. What can I control here?** | **Operational Parameters:** Study horizon date, target career goal, daily study budget, DSA quota, and placement operating mode. |
| **2. Which settings affect my PlacementOS workflow?** | **Study & Workflow Parameters Panel:** Clearly marked with an "Affects Adaptive Engine" indicator (changes daily task ranking and time caps). |
| **3. Which settings only affect presentation?** | **Workspace & Display Preferences Panel:** Clearly marked with a "Presentation Only" indicator (theme, density mode, tooltip visibility). |
| **4. Where are data backup & migration tools?** | **Data Portability & Storage Hub:** 1-click JSON backup export, schema-validated JSON import, and storage quota footprint telemetry. |
| **5. What is safe vs. destructive?** | **Strictly Tiered Safety Boundaries:** Safe parameters (Tier 1), Data Portability (Tier 2), Scoped Subsystem Maintenance (Tier 3), and High-Risk Factory Reset (Tier 4) in an isolated Danger Zone. |

---

## 8. Visual Metaphor — LOCKED

### **SYSTEM CONTROL / OPERATING PARAMETERS CONSOLE**

Settings is styled as a **high-precision developer platform control surface and avionics calibration terminal** (Linear, Vercel, and Railway settings aesthetic):
- Restrained dark technical canvas (`--background`: `#0B100D`).
- Crisp obsidian panels (`--surface`: `#111713`, `--surface-elevated`: `#1B241F`).
- 1px sub-surface borders (`--border`: `#28352D`).
- Monospace parameter values and telemetry badges (`--font-mono`: `'JetBrains Mono'`).
- Distinct safety-tier badges (Safe = Slate, Scoped Maintenance = Amber, Danger = Crimson).
- Absolutely **no** glassmorphism, neon glows, rounded bubble cards, or decorative particle effects.

---

## 9. Design Tokens & Action Accent — LOCKED

### 9.1 Brand Base vs. Action Accent
- **Global Brand Identity:** Forest Green (`#2E8B62` / `#46B982`).
- **Semantic Status Warning:** Warm Amber (`#D19A45`).
- **Semantic Status Danger:** Restrained Crimson (`#D05A52` / `#F43F5E`).

### 9.2 Settings Action Accent: **Steel Slate / Tech Azure (`#0EA5E9` / `#38BDF8`)**
The defining actions of the Settings page are **Operational Parameter Calibration** and **Data Backup Safeguard**.

To provide high-contrast precision without conflicting with warning amber, destructive crimson, or other subsystem accents:

```css
/* Settings Page Action Accent Tokens */
:root {
  --action-accent-settings: #0EA5E9;
  --action-accent-settings-hover: #0284C7;
  --action-accent-settings-active: #0369A1;
  --action-accent-settings-subtle: rgba(14, 165, 233, 0.12);
  --action-accent-settings-border: rgba(14, 165, 233, 0.35);
  --action-accent-settings-glow: rgba(56, 189, 248, 0.20);
  --action-accent-settings-text: #38BDF8;
}

[data-testid="settings-view"],
.settings-container {
  --action-accent: var(--action-accent-settings);
  --action-accent-hover: var(--action-accent-settings-hover);
  --action-accent-subtle: var(--action-accent-settings-subtle);
  --action-accent-border: var(--action-accent-settings-border);
  --action-accent-ring: var(--action-accent-settings-text);
}
```

---

## 10. Frozen Information Architecture (6 Cohesive Zones) — LOCKED

The Settings page is organized into **6 structured zones**, moving logically from system status and high-frequency operational controls down to data migration, scoped maintenance, and isolated destructive actions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: CONSOLE HEADER & STORAGE STATUS STRIP                           │
│ Title, Guide Trigger, Live Storage Footprint Meter (KB / Quota Bar)     │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: STUDY HORIZON & OPERATIONAL PARAMETERS (AFFECTS ENGINE)         │
│ Target Role, Horizon Date, Active Mode, Study Minutes, DSA Quota        │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: WORKSPACE & DISPLAY PREFERENCES (PRESENTATION ONLY)             │
│ Density Mode, Theme Selection, Explanation Tooltips, Check-in Reminder  │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: DATA PORTABILITY & STORAGE SAFELY (IMPORT / EXPORT)             │
│ Export JSON Backup, Import JSON Backup (Strict Validation), Schema Info │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: SCOPED SUBSYSTEM MAINTENANCE (NON-DESTRUCTIVE TO CURRICULUM)    │
│ Reset Settings Only, Reset Assessment Profile, Reset Assessment History │
├─────────────────────────────────────────────────────────────────────────┤
│ ZONE 6: DANGER ZONE & FACTORY RESET (HIGH RISK / GUARDED MODAL)         │
│ Full App Data Reset, Typed "RESET DATA" Confirmation Modal              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Zone-by-Zone Specification — LOCKED

### Zone 1: Console Header & Storage Status Strip (`SettingsHeader.tsx`)
- **Purpose:** Identifies the page, provides operational context, and displays real-time local storage consumption.
- **Controls & Data:**
  - `h1`: "Settings & Operational Parameters"
  - Subtitle: "Configure adaptive engine weights, study horizons, data portability backups, and storage safeguards."
  - `<GuideTrigger route="settings" />`
  - Storage Footprint Pill: Monospace display of `storageBytes / 1024` (e.g. `12.45 KB`).
  - Storage Quota Indicator: Visual micro-meter showing percentage of estimated 5MB `localStorage` limit consumed (with green-to-amber threshold).
  - Storage Mode Pill: "Local-First / Offline (Zero Cloud Dependencies)".

### Zone 2: Study Horizon & Operational Parameters (`StudyParametersSection.tsx`)
- **Purpose:** Configures the primary constraints and weights consumed by the `adaptiveEngine` when generating daily study plans on Today.
- **Controls & Semantics:**
  - **Target Placement Role:** Text input (`userSettings.targetPlacementGoal`, e.g. `"Software Engineer (SDE-1)"`). Fixes the C9 UI regression.
  - **Placement Horizon Target Date:** Date picker input (`userSettings.placementHorizonDate`, formatted `YYYY-MM-DD`, default `2027-05-31`). Directly affects urgency factor calculation.
  - **Default Placement Mode:** 4-option radio selector / segment control (`normal`, `reduced`, `exam`, `placement_sprint`). Displays explanatory description of how each mode modifies task weights.
  - **Daily Study Budget:** Slider + numeric input (`userSettings.dailyStudyMinutes`, range 30–480 min, step 15 min). Controls daily plan capacity.
  - **Daily DSA Problem Cap:** Stepper / slider (`userSettings.dsaDailyCap`, range 1–15 problems). Controls max DSA problems queued per day.
- **Auto-save & Feedback:** Instant commit on blur/change via `updateUserSettings()`, triggering a subtle toast confirmation: "Operational parameters updated".

### Zone 3: Workspace & Display Preferences (`DisplayPreferencesSection.tsx`)
- **Purpose:** Controls visual density, theme styling, and informational tooltips without touching placement engine math.
- **Controls & Semantics:**
  - **Interface Density Mode:** 2-option segment (`compact` [default] vs `comfortable`).
  - **Visual Theme:** 3-option selector (`dark` [default], `high_contrast`, `slate_dark`).
  - **Explanation Tooltips:** Toggle switch (`userSettings.showExplanationTooltips`, default `true`).
  - **Daily Check-in Reminder:** Toggle switch (`userSettings.dailyCheckInReminder`, default `false`) + Time picker (`userSettings.reminderTime`, default `"20:00"`). Clear note: "Local browser preference only; no background push server in V1."

### Zone 4: Data Portability & Storage Hub (`BackupStorageSection.tsx`)
- **Purpose:** Enables reliable data export, backup restore, and migration across browsers and devices.
- **Controls & Semantics:**
  - **Export State JSON:** Primary button consuming Action Accent. Triggers instant download of formatted JSON timestamped with today's date.
  - **Import State JSON:** File upload button (`.json`). Reads file, runs strict `StorageAdapter.validateImportState()`, alerts user on schema validity, and reloads state safely.
  - **Import Safety Validation Guard:** Rejects invalid, non-JSON, or malformed schema payloads with explicit error message without overwriting working state.

### Zone 5: Scoped Subsystem Maintenance (`SubsystemMaintenanceSection.tsx`)
- **Purpose:** Provides granular, targeted reset tools to resolve specific issues without wiping the entire study history.
- **Controls & Semantics:**
  - **Reset Configuration Settings Only:** Reverts `userSettings` to defaults. Retains 100% of tasks, DSA progress, check-ins, evidence, and assessment data.
  - **Reset Assessment Profile Only:** Reverts calculated domain proficiencies to 0. Retains all past attempt records, item exposures, and execution logs.
  - **Reset Assessment History Only:** Clears assessment attempts, exposures, and responses back to clean unassessed state. Retains roadmap tasks, DSA progress, and project logs.

### Zone 6: Danger Zone & Factory Reset (`DangerZoneSection.tsx` + `ConfirmFullResetModal.tsx`)
- **Purpose:** Isolated, high-friction destructive reset for wiping local storage and starting completely fresh.
- **Visual Distinction:** Wrapped in a dedicated 1px border (`border-rose-900/60`), muted dark crimson surface (`bg-rose-950/20`), with bold high-risk warning.
- **ConfirmFullResetModal:**
  - Centered modal with backdrop blur.
  - Itemizes exactly what will be permanently erased (DSA boxes, tasks, check-in history, custom tasks, assessment attempts).
  - Requires user to manually type exact string: `"RESET DATA"`.
  - Submit button disabled until phrase matches perfectly.

---

## 12. Control Semantics & Feedback Specification — LOCKED

1. **Inline Field Validation:**
   - Date fields must validate ISO `YYYY-MM-DD` format.
   - Study minutes clamped to `30 <= m <= 480`.
   - DSA cap clamped to `1 <= cap <= 15`.
   - Empty text inputs fallback to default placeholders.
2. **Auto-Save Notification:**
   - Non-modal, unobtrusive toast / badge update (`"Configuration saved"`).
   - Fades out after 2500ms.
3. **Import Feedback:**
   - Success: Emerald confirmation pill with restored schema version and entity count.
   - Error: Crimson alert badge explaining validation failure reason (e.g. `"Missing required schemaVersion or corrupt taskProgress"`).

---

## 13. Data & Reset Safety Tiers — LOCKED

| Safety Tier | Action | Destructive Scope | Reversible? | Confirmation Friction |
|---|---|---|---|---|
| **Tier 1: Safe** | Edit parameters, sliders, modes | None (updates preferences) | Yes (can change back) | Zero (immediate auto-save) |
| **Tier 2: Portability** | Export JSON | None (read-only snapshot) | N/A | Zero (instant download) |
| **Tier 2: Portability** | Import JSON | Replaces local state with valid backup | Yes (if previous backup exists) | File selection + Schema validation |
| **Tier 3: Scoped Reset** | Reset Settings Only | Reverts userSettings to defaults | No | Single click with auto-save toast |
| **Tier 3: Scoped Reset** | Reset Assessment Profile | Clears calculated proficiencies to 0 | No | Single click with auto-save toast |
| **Tier 3: Scoped Reset** | Reset Assessment History | Clears assessment attempts & exposures | No | Single click with auto-save toast |
| **Tier 4: Destructive** | Reset Application Data | Wipes entire localStorage database | No (Irreversible) | **High Friction:** Modal + type `"RESET DATA"` |

---

## 14. Motion Specification — LOCKED

Settings uses a **restrained, calm mechanical motion system**:
- **Tab / Section Focus:** Smooth background transition (`var(--duration-fast)` = `120ms`).
- **Slider & Switch Interactions:** Micro-spring slide (`var(--duration-fast)`, `var(--ease-snappy)`).
- **Modal Entrance:** Chiseled scale-in (`placement-scale-in` 150ms).
- **Reduced Motion Support:** All animations disabled under `@media (prefers-reduced-motion: reduce)`.

---

## 15. Responsive Behavior — LOCKED

| Viewport | Layout Strategy |
|---|---|
| **1440×900 (Desktop Large)** | Max-width 1300px centered container. 2-column grid for parameters, full-width cards for portability and maintenance. |
| **1280×800 (Laptop)** | Max-width 1150px centered container. Ergonomic control spacing with compact padding. |
| **1024×768 (Tablet Landscape)** | 1-column stacked sections. Full-width controls and sliders. |
| **768×1024 (Tablet Portrait)** | 1-column stacked sections. Touch-friendly slider hit areas (min 44px height). |
| **375×667 (Mobile Phone)** | Stacked vertical controls. Modals full-width with safe margin padding. Sliders touch-optimized. |

---

## 16. Accessibility Specification — LOCKED

- **Headings & Landmarks:** Strict hierarchy (`h1` for page, `h2` for each zone, `h3` for parameter groups).
- **Form Controls:** Every input, select, slider, and switch possesses an explicit `<label htmlFor="...">` and `aria-describedby` explaining its function.
- **Focus Rings:** High-visibility focus indicators (`outline: 2px solid var(--ring)` with `2px` offset).
- **Keyboard Navigation:** Full keyboard accessibility (Tab, Enter, Space, Arrow keys for sliders and radios).
- **Non-Color Indicators:** Danger and warning actions include distinct icons (`AlertTriangle`, `RotateCcw`, `Download`, `Upload`) in addition to semantic colors.

---

## 17. Cross-Subsystem Handoffs — LOCKED

- **Today Dashboard:** Reading `userSettings.placementMode` alters candidate task scoring weights. Reading `userSettings.dailyStudyMinutes` and `dsaDailyCap` enforces daily session budgets.
- **Roadmap Page:** Reading `userSettings.targetPhaseId` and `userSettings.placementHorizonDate` highlights milestone pace.
- **Assessment Subsystem:** Scoped maintenance buttons directly call `resetAssessmentProfileOnlyEngine` and `resetAssessmentHistoryOnlyEngine` in `PlacementContext`.
- **AppShell:** Header mode dropdown is bidirectional with `userSettings.placementMode`.

---

## 18. Persistence Rules — LOCKED

- **Storage Key:** `placementos_v1_state` in `localStorage`.
- **Quarantine Key:** `placementos_v1_state_quarantine` (preserves corrupted raw payload prior to fallback rewrite).
- **Schema Version:** `1.0.0` (validated strictly on import).
- **Automatic Sync:** Every setting update triggers state persistence without requiring a manual "Save All" button.

---

## 19. Architectural Guardrails — LOCKED

- **Local-First Zero-Backend:** No remote servers, external APIs, cloud databases, or telemetry beacons.
- **Deterministic Pure Logic:** No LLM runtime dependencies in V1.
- **No Secondary State Stores:** State resides exclusively in `PlacementContext` and `StorageAdapter`.
- **Preserve Untracked Files:** `src/components/dashboard/TodayGuide.tsx` must remain untouched.

---

## 20. Manufacturing Acceptance Criteria — LOCKED

When manufacturing the Settings page:
1. All 6 zones render with obsidian technical styling and the Steel Slate action accent (`#0EA5E9`).
2. The C9 regression is permanently resolved: `targetPlacementGoal` has a working text control.
3. All 11 properties in `UserSettings` are surfaced with dedicated, accessible controls.
4. Export JSON downloads a valid snapshot containing all app state.
5. Import JSON strictly validates backup schema, rejects corrupt data with helpful alerts, and restores valid state.
6. Scoped maintenance resets perform granular resets without damaging unrelated data.
7. Full reset modal strictly enforces typing `"RESET DATA"` before enabling execution.
8. 100% of existing tests pass (`npm test`).
9. Clean build (`npm run build`) and clean linter (`npm run lint`).

---

## 21. Non-Goals — LOCKED

- **No Remote Cloud Sync:** PlacementOS V1 is strictly local-first.
- **No Background Push Notifications:** Reminders are local preferences; no service worker push notification daemon.
- **No Arbitrary Schema Alterations:** `CURRENT_SCHEMA_VERSION` remains `1.0.0`.

---

## 22. Next Manufacturing Task — LOCKED

The next task will manufacture the modularized Settings UI components in `src/components/settings/` according to this frozen specification:
- `SettingsHeader.tsx` (Zone 1)
- `StudyParametersSection.tsx` (Zone 2)
- `DisplayPreferencesSection.tsx` (Zone 3)
- `BackupStorageSection.tsx` (Zone 4)
- `SubsystemMaintenanceSection.tsx` (Zone 5)
- `DangerZoneSection.tsx` (Zone 6)
- `ConfirmFullResetModal.tsx` (Redesigned Zone 6 Modal)
- `SettingsView.tsx` (Main View Orchestrator)
- Comprehensive test suite in `src/test/settingsManufacturing.test.tsx`.
