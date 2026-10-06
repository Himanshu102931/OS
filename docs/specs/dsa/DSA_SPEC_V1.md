# PlacementOS DSA Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.  
**Baseline commit:** `b7ad0ff` — `feat(ui): add page action accent system`  
**Date:** 2026-10-06  
**Scope:** `src/components/dsa/*` (DSA page surface, attempt modal), integration with `src/components/guide/GuideDefinitions.ts`, and the DSA-related test suite.

> **Reading contract.**  
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the DSA page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification preserves all existing engine functions (`dsaEngine.ts`), storage schemas, routing rules, Leitner transitions, evidence scoring, and test assertions. The only file this audit authorizes the agent to create is this specification document; UI implementation is deferred to Task 61.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **DSA Subsystem** (`#/dsa`) is the student's **Algorithmic Problem Laboratory & Deliberate Practice Engine**. It answers the fundamental student questions:
> *"What algorithmic problem should I train on right now? Which spaced reviews are due before memory decay sets in? Which patterns have I truly mastered independently versus assisted? And what evidence am I producing for my placement readiness?"*

### Core Design Principle
```
Algorithmic Mastery Strip → Dominant Problem Focus → Spaced Review Queue → Pattern Laboratory → Problem Workbench → Precision Attempt Protocol
```

The redesigned DSA page must make it immediately obvious within **5 seconds**:
1. **Where I am in DSA:** How many of the curated 150 problems are mastered independently, in progress, or locked.
2. **What reviews are due today:** How many Leitner spaced repetition reviews are due on the canonical calendar date (`todayDate`).
3. **What I should solve right now:** One distinct, dominant recommended problem or due review with a single primary CTA.
4. **Why this problem:** Plain-language justification (e.g. *"Box 2 Spaced Review scheduled for today"* or *"Anchor problem for Two Pointers pattern"*).
5. **Pattern Mastery Depth:** Progress across the 17 core algorithmic patterns (Starter/Core requirements, independent solves, Leitner Box 3/4 reach).
6. **Deliberate Attempt Protocol:** Frictionless modal to record attempt result (`pass`/`partial`/`fail`), assistance level (`none`/`hint`/`solution`), 3-state self-check evidence, and live Leitner + evidence math preview.

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Route:** `dsa`
- **Hash format:** `#/dsa` (base) or `#/dsa/<problemId>` (deep-link target, e.g. `#/dsa/dsa-001`)
- **Target resolution:** 
  - When `routeState.targetId` is present (e.g. from Today's plan or session handoff), `DSAView` detects `deepLinkedProblem`.
  - If `dsaProgress[targetId]?.remediationRequired === true`, it opens `TaskLearningWorkspaceDrawer` in remediation mode.
  - Otherwise, it automatically opens `DSAAttemptModal` for the target problem.
  - Submitting the attempt advances the active session (`session?.advanceActivity('completed')`) and navigates back to `#/dashboard`.

### 2.2 Component Hierarchy (Current)
```
AppShell (src/components/layout/AppShell.tsx)
└── DSAView (src/components/dsa/DSAView.tsx) [557 lines]
    ├── Header & GuideTrigger
    ├── Tab Switcher (Progression Journey | Full Catalog | Patterns)
    ├── Tab 1: Progression Journey View
    │   ├── Recommended Problem Hero Card (Zap icon, gradient, glow-border, Open Workspace, Log Attempt)
    │   ├── Spaced Reviews Due Section (reviewsDue.map)
    │   └── Active Problem Track (filteredProblems.map with inline calculatePatternMastery)
    ├── Tab 2: Full Catalog View
    │   ├── Search Bar & Difficulty Select Dropdown
    │   └── Problem List (Inspect button, Log Attempt button)
    ├── Tab 3: Patterns View
    │   └── Pattern Cards Grid (17 patterns, 13 hardcoded SVG motifs, why it matters, complexity)
    ├── DSAAttemptModal (src/components/dsa/DSAAttemptModal.tsx) [357 lines]
    │   ├── Result Selector (Pass / Partial / Fail)
    │   ├── Assistance Selector (Independent / Hint / Solution)
    │   ├── 3-State Self-Check (Pattern / Time / Space)
    │   ├── Time Taken & Notes Textarea
    │   ├── Live Leitner & Evidence Math Preview
    │   └── Submit & Cancel Actions
    └── TaskLearningWorkspaceDrawer (src/components/common/TaskLearningWorkspaceDrawer.tsx)
```

### 2.3 Context & Data Dependencies
The component consumes `usePlacement()` and `useSafeSession()`:
| Property | Source | Purpose |
|---|---|---|
| `dsaProblems` | `DSA_PROBLEMS` (`dsaDataset.ts`) | Authoritative 150-problem dataset |
| `dsaProgress` | `appState.dsaProgress` (`storageAdapter.ts`) | Problem boxes, attempts, remediation state |
| `logDSAAttempt` | Context action | Logs attempt, updates Leitner box, writes canonical evidence |
| `updateDSAProgress` | Context action | Updates progress flags (remediation, lessons) |
| `activePhase` | `PHASES[0]` | Active phase index (1..4) for unlock gating |
| `todayDate` | Context state | Canonical local calendar date (IST midnight boundary) |
| `routeState` | Context state | Current route and targetId |
| `setRoute` | Context action | Changes hash route |
| `PATTERN_LESSONS` | `dsaDataset.ts` | 17 pattern lesson definitions |
| `session` | `useSafeSession()` hook | Session advancement on completion |

---

## 3. Current UX Audit — LOCKED

Evaluating `DSAView.tsx` against the required audit criteria:

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-second comprehension** | **POOR** | The page is split across 3 disconnected tabs (`Journey`, `Bank`, `Patterns`). A user cannot see their total mastery, due reviews, and problem track simultaneously. |
| **B. Visual hierarchy** | **MEDIOCRE** | Hero card uses legacy bronze gradient (`#E5A93C`) and harsh borders. Tab pills compete with hero buttons. Card-on-card visual noise. |
| **C. Information density** | **FRAGMENTED** | Leitner box distribution (Box 1, 2, 3, 4) is hidden. Pattern mastery statistics are buried in small subtext inside problem rows. |
| **D. Defining action clarity** | **CONFUSING** | Multiple competing buttons on every row (`Workspace`, `Attempt`, `Inspect`, `Review`). The single most urgent action (due review vs new problem) is not distinct. |
| **E. Legacy color tokens** | **FAIL** | Heavy use of legacy hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`, `#10B981`, `#F59E0B`). Does not use canonical CSS variables. |
| **F. SVG & Visual Motifs** | **CLUTTERED** | 13 inline hardcoded SVG motifs inside `DSAView.tsx` (lines 463–495) with fixed `#E5A93C` strokes, adding ~40 lines of JSX bloat. |
| **G. Responsive layout** | **SUBOPTIMAL** | Filter bars wrap awkwardly on mobile; attempt modal lacks proper bottom-sheet adaptation on narrow screens. |
| **H. Accessibility** | **INCOMPLETE** | Missing accessible `tablist`/`tabpanel` ARIA attributes, missing `progressbar` roles for mastery ratios, missing explicit focus rings. |

---

## 4. Visual Metaphor & Aesthetic System — LOCKED

### 4.1 Chosen Metaphor: "Algorithmic Problem Laboratory"
The DSA page is an **instrument-grade technical laboratory** for deliberate algorithmic training:
- **Clean Obsidian Planes:** Surface planes (`#0B100D`, `#111713`, `#161E19`) with 1px subtle borders (`#28352D`).
- **Forest Green Identity:** Canonical brand accents (`#2E8B62`, `#46B982`, `#65D3A3`) for progress, independent mastery, and system indicators.
- **Controlled Page Action Accent:** Dedicated high-contrast action accent (**Precision Cyan / Mint**) reserved solely for the defining problem action ("Solve Problem" / "Log Attempt" / "Start Review").
- **Warm Bronze Warning (`#D19A45`):** Strictly reserved for due reviews, remediation warnings, and gated prerequisites.
- **Zero Neon / Zero Glassmorphism Overload:** Flat, chiseled technical cards with crisp typography (Inter + JetBrains Mono).

---

## 5. Defining User Action — LOCKED

### The One Defining Action: `"Solve Problem"` / `"Log Attempt"` / `"Start Review"`
- On the DSA page, the defining user mission is to **engage with and solve an algorithmic problem**.
- When spaced reviews are due today, the defining action is **`"Start Review"`**.
- When no reviews are due, the defining action is **`"Solve Problem"`** on the top recommended unblocked problem.
- In Task 61+, this defining CTA will consume the page action accent token (`var(--action-accent)`), establishing instant visual hierarchy without recoloring unrelated cards.

---

## 6. Frozen Information Architecture & Major Zones — LOCKED

The redesigned DSA page will be organized into a **continuous unified workspace** (no hidden tabs required for core workflow, with seamless filterable views):

```
ZONE 1: DSA HEADER & MASTERY STRIP
  - Title, 150-Problem Scope, Horizon Context
  - 4-Column Mastery Metrics:
    [Total Mastered]  [In Progress / Box Distribution]  [Reviews Due Today]  [Pattern Readiness]
        ↓
ZONE 2: TRAINING FOCUS / ACTIVE MISSION
  - Dominant Hero Card:
    - Case A (Review Due): "SPACED REVIEW DUE" with Leitner box info & "Start Review" CTA
    - Case B (New Problem): "RECOMMENDED PROBLEM" with pattern, difficulty, time & "Solve Problem" CTA
    - Direct link to Learning Workspace & Attempt Protocol
        ↓
ZONE 3: SPACED REVIEW QUEUE (If reviews exist)
  - Scannable queue of problems due today under forgetting curve protection
  - One-click review trigger per item
        ↓
ZONE 4: PATTERN MASTERY MATRIX & FILTER CONTROLLER
  - 17 Algorithmic Patterns (Arrays, Two Pointers, Sliding Window, Trees, Graphs, DP, etc.)
  - Interactive filter chips with pattern mastery badges (% mastery, starter/core count)
  - Quick Search (Title, Pattern, LeetCode #) & Difficulty Filter (Easy, Medium, Hard, All)
        ↓
ZONE 5: CURATED 150-PROBLEM WORKBENCH
  - High-density, scannable problem list
  - Difficulty pills, pattern tags, Leitner box badges (Box 1..4), unlock status
  - Primary Action ("Attempt" / "Review") + Secondary Action ("Workspace")
        ↓
DETAIL LAYER (Modals & Drawers)
  - Precision DSA Attempt Protocol Modal (`DSAAttemptModal.tsx`)
  - Pattern Learning Workspace & Remediation Drawer (`TaskLearningWorkspaceDrawer.tsx`)
```

---

## 7. Major Component Breakdown & Test Contracts — LOCKED

### 7.1 Zone 1: `DSAHeader.tsx` & `DSAMasteryStrip.tsx`
- **Purpose:** Macro progress orientation.
- **Metrics Displayed:**
  1. `Total Mastered`: Count of problems with `passedIndependently === true` (out of 150).
  2. `Leitner Distribution`: Progress across Box 1 (1d), Box 2 (3d), Box 3 (7d), Box 4 (14d Mastered).
  3. `Reviews Due`: Real-time count of problems where `nextReviewAt <= todayDate`.
  4. `Pattern Mastery`: Number of the 17 patterns that meet the 3 mastery criteria.

### 7.2 Zone 2: `DSAActiveFocus.tsx`
- **Purpose:** Dominant single next-action answer to *"What problem should I solve right now?"*.
- **Logic:**
  - Evaluates `getDSASignals()` from `dsaEngine.ts`.
  - If a problem requires remediation (`priorityTier: 1`), it surfaces the remediation action.
  - If reviews are due (`priorityTier: 2`), it surfaces the most urgent due review.
  - Otherwise, it surfaces the top unlocked candidate problem (`priorityTier: 3` or `4`).
- **Elements:**
  - Problem title, LeetCode #, pattern, difficulty, estimated minutes.
  - Actionable reason (e.g. *"Box 2 Spaced Review scheduled for today"*).
  - Primary CTA (`data-testid="dsa-primary-cta"`) + Secondary `"Open Workspace"` button.

### 7.3 Zone 3: `DSAReviewQueue.tsx`
- **Purpose:** Explicit queue of all problems due today.
- **Render condition:** Visible when `reviewsDue.length > 0`.
- **Contract:** Renders `Spaced Reviews Due Today (${count})` with individual review buttons.

### 7.4 Zone 4: `DSAPatternMatrix.tsx`
- **Purpose:** Scannable overview of the 17 algorithmic patterns.
- **Mastery calculation:** Pure invocation of `calculatePatternMastery(patternId, dsaProblems, dsaProgress)` from `dsaEngine.ts`.
- **Display:** Pattern name, mastery status pill (`Mastered` / `In Progress` / `Not Started` / `Remediation`), independent solve count vs required starter/core solves.

### 7.5 Zone 5: `DSAProblemCatalog.tsx`
- **Purpose:** High-density, filterable 150-problem workbench.
- **Filters:** Search input (text query matching title, pattern, LeetCode number), difficulty dropdown (`All`, `Easy`, `Medium`, `Hard`), and optional active pattern filter.
- **Item Badges:**
  - Status: `Locked`, `Unlocked`, `Review Due`, `Assisted`, `Mastered`.
  - Box Badge: `Box 1/4`, `Box 2/4`, `Box 3/4`, `Box 4/4`.
  - Action: `Attempt` button (disabled if locked), `Workspace` inspect button.

### 7.6 Detail Layer: `DSAAttemptModal.tsx` & Workspace Drawer
- **Must Preserve All Test Contracts:**
  - `data-testid="dsa-attempt-modal"`
  - `role="dialog"`, `aria-modal="true"`
  - Result selection (`pass`, `partial`, `fail`)
  - Assistance selection (`none`, `hint`, `solution`)
  - 3-State Self-Check ratings (`correct`, `incorrect`, `unsure`)
  - Time taken input & Notes textarea
  - Submit button with text `"Log Attempt & Record Evidence"`
  - Deep-link target auto-open and return to `#/dashboard` upon submit.

---

## 8. Design System & Token Rules — LOCKED

All DSA UI components must strictly adhere to the canonical forest-green design tokens:
- **Canvas / Background:** `var(--background)` (`#0B100D`)
- **Panel Surfaces:** `var(--surface)` (`#111713`), `var(--surface-elevated)` (`#161E19`), `var(--surface-muted)` (`#1B241F`)
- **Borders:** `var(--border)` (`#28352D`), `var(--border-active)` (`#3C4E43`)
- **Typography:** `var(--foreground)` (`#E8F0E9`), `var(--foreground-muted)` (`#9AA99F`), `var(--foreground-subtle)` (`#86958B`)
- **Primary Brand / Progress:** `var(--primary)` (`#2E8B62`), `var(--accent)` (`#46B982`), `var(--success)` (`#4CAF78`)
- **Semantic Warning / Reviews Due:** `var(--warning)` (`#D19A45` warm bronze)
- **Semantic Danger / Failures:** `var(--danger)` (`#D05A52`)
- **Page Action Accent (Task 61+):** `var(--action-accent)` scoped to `[data-testid="dsa-primary-cta"]` and primary attempt actions.

**Prohibitions:**
- NO hardcoded legacy hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`).
- NO arbitrary Tailwind color utilities (`bg-emerald-500`, `text-amber-400`, `bg-blue-600`).
- NO glowing neon boxes or decorative animated backgrounds.

---

## 9. Animation Vocabulary & Reduced Motion — LOCKED

- **Micro-interactions:** `120–180ms` ease-out (button hovers, badge transitions, toggle clicks).
- **Standard transitions:** `200–280ms` ease-out (modal backdrop fade, drawer slide, list filtering).
- **Restrained emphasis:** `300–450ms` (progress bar fill, unlock indicator).
- **Reduced Motion:** Strict `@media (prefers-reduced-motion: reduce)` overrides disable all transitions and keyframe animations globally.

---

## 10. Responsive Breakpoints & Viewport Behavior — LOCKED

| Viewport | Layout Adaptation |
|---|---|
| **1440 × 900** (Large Desktop) | 4-column mastery strip, 2-column active focus + review queue, 3-column pattern matrix, full catalog table. |
| **1280 × 800** (Standard Desktop) | Proportional scaling, comfortable spacing, side-by-side active focus and queue. |
| **1024 × 768** (Tablet Landscape) | 2-column mastery strip, stacked active focus, 2-column pattern matrix. |
| **768 × 1024** (Tablet Portrait) | 2-column mastery strip, single-column focus, collapsible pattern selector. |
| **375 × 667** (Mobile Phone) | 1-column vertical stacking, compact mastery cards, full-width touch-target CTA buttons, modal converts to bottom-sheet dialog, zero horizontal overflow. |

---

## 11. Accessibility Requirements — LOCKED

1. **Semantic Structure:** Proper heading hierarchy (`h1` for DSA Engine, `h2` for Active Focus / Reviews, `h3` for Catalog and Patterns).
2. **Modal Semantics:** `DSAAttemptModal` must have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and support `Escape` key dismissal and backdrop click.
3. **Progress Semantics:** Mastery and progress meters must include `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"`.
4. **Keyboard Navigation:** All problem rows and actions must be focusable with visible 2px focus rings (`focus-visible:ring-2`).
5. **Non-Color State Communication:** Difficulty levels, Leitner boxes, and solve states must be communicated via text labels, badges, and icons alongside color.

---

## 12. Architecture Guardrails & Non-Goals — LOCKED

### Strict Architectural Invariants:
1. **Preserve `dsaEngine.ts` Pure Functions:**
   - `isProblemUnlocked`
   - `calculateNextLeitnerBox`
   - `calculateNextReviewDate`
   - `calculateAttemptScore`
   - `updateEvidenceStrength`
   - `processAttemptForRemediation`
   - `calculatePatternMastery`
   - `getDSASignals`
   - `getLeitnerIntervalDays`
2. **Preserve Deep-Link & Session Continuity:**
   - `#/dsa/<problemId>` must open the exact problem attempt modal.
   - Submitting an attempt must advance active sessions and route back to `#/dashboard`.
   - Remediation problems must open `TaskLearningWorkspaceDrawer`.
3. **Preserve Storage Schema & Data Integrity:**
   - No modifications to `DSAProblem`, `DSAProgress`, `DSAAttempt`, or `StorageAdapter`.
4. **Explicit Non-Goals:**
   - No online code execution / code compiler backend.
   - No runtime LLM hints or problem generation.
   - No changes to the 150-problem dataset.
   - No external API requests.

---

## 13. Acceptance Criteria Checklist — LOCKED

- [ ] **AC-1:** Zone 1 Mastery Strip renders 4 macro metrics with 100% accurate data derived from `dsaProgress`.
- [ ] **AC-2:** Zone 2 Active Focus identifies the top unblocked problem or due review with a dominant primary CTA.
- [ ] **AC-3:** Zone 3 Spaced Review Queue lists all problems where `nextReviewAt <= todayDate` (using local IST date).
- [ ] **AC-4:** Zone 4 Pattern Matrix computes mastery ratios across all 17 patterns matching `calculatePatternMastery`.
- [ ] **AC-5:** Zone 5 Problem Catalog provides fast search, difficulty filtering, Leitner box badges, and attempt actions.
- [ ] **AC-6:** `DSAAttemptModal` preserves all test contracts (`data-testid="dsa-attempt-modal"`, `pass`/`partial`/`fail`, assistance level, self-check ratings, time, notes, and submit).
- [ ] **AC-7:** Deep linking (`#/dsa/dsa-001`) automatically triggers the attempt modal and advances cross-subsystem sessions upon completion.
- [ ] **AC-8:** Remediation workflow triggers after 3 failures and clears only upon lesson completion + quiz pass.
- [ ] **AC-9:** Zero legacy color literals (`#14171D`, `#E5A93C`, etc.) remain in DSA components.
- [ ] **AC-10:** 100% of the 1339+ tests pass, 0 lint errors, and production build succeeds.

---

**END OF SPECIFICATION — FROZEN FOR MANUFACTURING**
