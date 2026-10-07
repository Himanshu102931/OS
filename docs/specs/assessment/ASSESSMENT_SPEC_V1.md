# PlacementOS Assessment Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No UI manufacturing is authorized by this document alone; it is the definitive engineering blueprint for the subsequent manufacturing task.  
**Baseline commit:** `a93831a` — `feat(analytics): redesign operational telemetry console`  
**Date:** 2026-10-07  
**Scope:** `src/components/assessment/*` (`AssessmentRunnerView.tsx` and modularized child components), integration with `PlacementContext.tsx`, `assessmentEngine.ts`, `assessmentExecutionEngine.ts`, `assessmentIntegration.ts`, `remediationRouter.ts`, `data/assessment/*`, and the Assessment test suite.

> **Reading Contract.**  
> This document resolves every visual, architectural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Assessment page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`assessmentEngine.ts`, `assessmentExecutionEngine.ts`, `assessmentIntegration.ts`), storage schemas (`storageAdapter.ts`), routing contracts, evidence accumulation algorithms, and test assertions. The only file created in this task is this specification document.

---

## 1. Status — LOCKED

- **Subsystem:** Assessment & Diagnostic Benchmarking (`#/assessment`)
- **Document Version:** 1.0 (Frozen Architecture Specification)
- **Implementation State:** Specification Frozen. Ready for Phase 2 UI Manufacturing.
- **Authority:** Pure Deterministic Assessment Engine & Sandboxed Execution (`assessmentEngine.ts`, `assessmentExecutionEngine.ts`, `assessmentIntegration.ts`).

---

## 2. Baseline Commit & Working Tree Verification — LOCKED

- **Current Baseline HEAD:** `a93831a` (`feat(analytics): redesign operational telemetry console`)
- **Remote Parity:** `HEAD == origin/main == a93831a`
- **Protected File Exception:** `src/components/dashboard/TodayGuide.tsx` (untracked working-tree file, strictly preserved and untouched).
- **Modification Rule:** No production code or tests in `src/` are modified during this audit and specification task.

---

## 3. Subsystem Purpose & Mission — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Assessment Subsystem** (`#/assessment`) is the candidate's **Deterministic Diagnostic Benchmark Console & Capability Calibration Chamber**. In campus recruitment preparation, learners often study with intuition rather than measurement, misidentifying assisted practice for genuine mastery, or attempting problems without knowing their foundational baseline.

The Assessment Subsystem establishes:
1. **Authoritative Starting Baseline:** A rigorous 180-minute, 10-module, 84-item multistage diagnostic evaluating 10 engineering and aptitude domains (Aptitude, DSA, Python, SQL, DBMS, OOP, OS, CN, Communication, Interviews; with Projects evaluated via Project Lab).
2. **Deterministic Root-Cause Diagnosis:** Granular weakness taxonomy extraction (`syntax_error`, `runtime_error`, `assertion_error`, `conceptual_gap`, `timeout`, `knowledge_gap`), capturing *why* errors occurred rather than merely *that* points were lost.
3. **Weekly Calibration Loop:** 90-minute adaptive Sunday Mini-Tests (5400s hard wall-clock limit) composed deterministically of 60% unresolved weaknesses ($\ge 2$ items/weak domain), 20% recent curriculum topics, and 20% retention checks on mastered domains ($\text{Level} \ge 3$).
4. **Prescriptive Learning Guidance:** Translates diagnostic results into verified, actionable learning targets (`resolveAssessmentLearningTargets`) feeding directly into the daily study plan without silently rewriting master curriculum phases.
5. **Role Overlay Analysis:** Compares candidate capability profiles against target company benchmarks (`CompanyAssessmentOverlayResult`) without mutating the authoritative general profile.

---

## 4. 5-Second Comprehension Test — LOCKED

A candidate opening the Assessment page in any lifecycle phase must answer these 5 questions within **5 seconds**:

| Question | Forensic Answer on Redesigned Assessment Console |
|---|---|
| **1. What is the current assessment state?** | Clear state indicator: **Pre-Flight Lobby** (Unassessed), **Live Execution Stage** (Timer & Active Question), or **Diagnostic Benchmark Readout** (Completed). |
| **2. What does this test measure?** | **Domain Blueprint Matrix** showing exact coverage across 10 modules, time budgets, question types, and chance-corrected scoring rules. |
| **3. How much time and progress remain?** | **Wall-Clock Countdown Bar & Question Palette** displaying exact hours/minutes remaining and answered/unanswered/flagged tallies. |
| **4. What did the assessment prove?** | **11-Domain Capability Matrix** displaying demonstrated ability score ($0-100$), provisional levels ($0-5$), confidence ratings, and confirmed strengths vs. weaknesses. |
| **5. What should I execute next?** | **Prescriptive Hero Action CTA** routing directly to the highest-priority remediation lesson, practice drill, or DSA challenge. |

---

## 5. Assessment vs Practice Boundary — LOCKED

PlacementOS strictly separates **Standardized Diagnostic Capability** from **Formative Practice & Working Readiness**:

| Attribute | Assessment Subsystem (`#/assessment`) | Practice Subsystem (`#/practice`) |
|---|---|---|
| **Core Purpose** | Standardized, high-stakes capability measurement & diagnostic benchmarking. | Formative skill-building, ladder progression & deliberate repetition. |
| **Timing Model** | Strict hard wall-clock countdown (180m baseline / 90m Sunday). Auto-submits on expiration. | Untimed or soft-timed per problem. Can pause, resume, or repeat. |
| **Scoring Formula** | Authored item weights, mathematical chance correction ($c' = \frac{c - 1/k}{1 - 1/k}$), negative guessing adjustments, zero LLM grading. | Pass/fail threshold (e.g. $\ge 70\%$), rung progression, accuracy percentage. |
| **Evidence Meaning** | Emits `sourceType: 'test'` evidence logs. Never alters DSA Leitner boxes or practice rungs. | Emits `sourceType: 'practice'` evidence logs. Directly advances topic working readiness. |
| **Error Handling** | Honest "I Don't Know" button prevents guessing penalties; tags root-cause taxonomy. | Immediate hints, stepwise solution walk-throughs, retry loops. |
| **Downstream Effect** | Calibrates daily plan priorities (1.3× priority, 1.5× review density for weak domains) and Sunday test item selection. | Advances individual skill states from `untested` $\to$ `practiced` $\to$ `competent`. |

---

## 6. Route & Deep-Link Model — LOCKED

### 6.1 Inbound Routing Contracts
- **Base Route:** `#/assessment` (handled in `App.tsx`, rendered by `AssessmentRunnerView.tsx`).
- **Deep Links & Tab State:**
  - `#/assessment` $\to$ Automatically renders active attempt if in progress; otherwise renders Diagnostic Profile Readout (if assessed) or Pre-Flight Lobby (if unassessed).
  - Sub-tab switching between **Baseline Diagnostic Profile** (`readoutTab: 'baseline'`) and **Sunday Adaptive Mini-Tests** (`readoutTab: 'weekly'`).
  - Target Role Overlay Selector (`selectedCompanyOverlayId`).

### 6.2 Outgoing Handoff Contracts
Every diagnostic learning target deterministically calls `setRoute(route, targetId)` with validated destinations:
- Preparation Lesson $\to$ `setRoute('preparation', topicId)`
- Practice Drill $\to$ `setRoute('practice', sessionId)`
- DSA Challenge $\to$ `setRoute('dsa', problemId)`
- Roadmap Task $\to$ `setRoute('roadmap', taskId)`
- Skills Matrix Investigation $\to$ `setRoute('skills', domainId)`
- Project Lab Defense $\to$ `setRoute('project')`
- Today's Session $\to$ `setRoute('dashboard')`

---

## 7. Current Architecture & Forensic Audit — LOCKED

### 7.1 Existing Component Map
```
src/components/assessment/
└── AssessmentRunnerView.tsx (1926 lines)
    ├── State Management: activeAssessmentAttempt, responseMap, timer, tabs
    ├── View 1: Active Assessment Runner (lines 331–792)
    │   ├── Top Sticky Timer Bar (180m countdown, question count, module strip)
    │   ├── Question Panel (Prompt, MCQ / SQL / Rubric / Sandbox Execution)
    │   ├── Diagnostic Controls ("I Don't Know", Confidence Self-Rating)
    │   ├── Question Palette (1–84 Grid Navigator & Legend)
    │   └── Submit Confirmation Modal
    ├── View 2: Phase D Profile & Plan Readout View (lines 795–1814)
    │   ├── Sub-tab Switcher (Baseline vs Sunday Mini-Tests)
    │   ├── Readout Header & Quick Metrics Bar (Ability /100, Domains, Weaknesses)
    │   ├── Assessment Learning Targets & Hero Handoff Action
    │   ├── Sunday Mini Test Integration Card & Full Reassessment Card
    │   ├── Company / Role Overlay Analyzer
    │   ├── 11-Domain Capability Matrix (Class A, Class B, Class C)
    │   ├── Initial Adaptive Plan Inputs & Strategic Multipliers
    │   ├── Diagnosed Weakness Signals & Demonstrated Strengths
    │   └── Calibration Telemetry Card
    └── View 3: Assessment Introduction / Lobby (lines 1817–1924)
        ├── Intro Header & Blueprint Summary
        ├── Rule Cards (Time Budget, 84 Items, Deterministic Scoring)
        ├── Module Breakdown Table (M1–M10 + Projects Note)
        └── Start Baseline Assessment Button
```

### 7.2 Forensic Audit Findings
1. **Monolithic Structure:** `AssessmentRunnerView.tsx` contains 1926 lines combining three completely distinct view modes (Lobby, Runner, Readout) along with complex sandbox terminals and modaled overlays.
2. **Missing Modularization:** Needs decomposition into dedicated, testable subcomponents:
   - `AssessmentLobby.tsx` (Pre-flight launcher & blueprint)
   - `AssessmentExecutionRunner.tsx` (Live exam workspace, code editor, sandbox, timer)
   - `AssessmentQuestionPalette.tsx` (84-item navigator & legend)
   - `AssessmentDiagnosticReadout.tsx` (Benchmark metrics, matrix, plan multipliers)
   - `AssessmentWeeklyTab.tsx` (Sunday test launcher, calibration history & report)
   - `AssessmentSubmitModal.tsx` (Submission confirmation & unanswered warnings)
3. **Execution Ergonomics:** The current code editor and SQL inputs lack keyboard navigation shortcuts (Ctrl+Enter to run/advance, Tab trapping prevention).
4. **Visual Elevation:** Current cards use generic dark styles instead of the established Obsidian / Precision design tokens with semantic elevation and crisp 1px borders.

---

## 8. Canonical Data Sources — LOCKED

Every metric and score displayed in the Assessment subsystem is derived strictly from pure functions and canonical datasets:

| Metric / Artifact | Canonical Source Function | File Location |
|---|---|---|
| **Active Attempt & Responses** | `appState.assessmentState?.attempts`, `responses` | `src/context/PlacementContext.tsx` |
| **Baseline Definition (84 items)** | `BASELINE_ASSESSMENT_DEFINITION` | `src/data/assessment/definitions.ts` |
| **Sunday Test Definition (90m)** | `SUNDAY_MINI_TEST_DEFINITION`, `buildSundayMiniTestAttempt()` | `src/engine/assessmentEngine.ts` |
| **Full Reassessment Definition** | `FULL_REASSESSMENT_DEFINITION`, `buildFullReassessmentAttempt()` | `src/engine/assessmentEngine.ts` |
| **Item Banks (M1–M10)** | `BASELINE_ASSESSMENT_ITEMS` | `src/data/assessment/items/index.ts` |
| **Sandboxed Execution** | `executePythonAssessmentItem()`, `executeSqlAssessmentItem()` | `src/engine/assessmentExecutionEngine.ts` |
| **Domain Ability & Levels** | `calculateDomainAbility()`, `mapAbilityToLevel()` | `src/engine/assessmentEngine.ts` |
| **Diagnostic Profile Readout** | `deriveAssessmentProfileReadout()` | `src/engine/assessmentEngine.ts` |
| **Weekly Calibration Report** | `deriveWeeklyAssessmentReadout()` | `src/engine/assessmentEngine.ts` |
| **Company Role Overlay** | `evaluateCompanyAssessmentOverlay()` | `src/engine/assessmentEngine.ts` |
| **Assessment Learning Targets** | `resolveAssessmentLearningTargets()` | `src/engine/assessmentIntegration.ts` |
| **Primary Action Deep Link** | `getPrimaryAssessmentAction()`, `getAssessmentTargetDeepLink()` | `src/engine/assessmentIntegration.ts` |
| **Dual Readiness Arbitration** | `calculateDomainReadiness()`, `calculateAggregateSkillsReadiness()` | `src/engine/skillsEngine.ts` |

---

## 9. Canonical Scoring & Epistemic Audit — LOCKED

### 9.1 Mathematical Scoring Formulas
1. **Raw Scored Item Credit ($c$):**
   - Correct response: $c = 1.0$
   - Multiple-choice error: $c = 0.0$
   - Sandboxed execution test: $c = \frac{\text{testsPassed}}{\text{totalTests}}$
   - Normalized SQL match: $c = 1.0$ if normalized AST matches canonical, else $0.0$
   - Written rubric match: $c = \frac{\text{matchedCriteria}}{\text{totalCriteria}}$

2. **Chance Correction Formula (for MCQs with $k$ options):**
   $$c' = \max\left(0, \frac{c - \frac{1}{k}}{1 - \frac{1}{k}}\right)$$
   For a 4-option item ($k=4$), guessing yields $c'=0$. Answering correctly yields $c'=1.0$.

3. **Honest "Don't Know" Handling:**
   Selecting *"I don't know this concept"* assigns $c'=0$ with zero penalty and categorizes the response under `knowledge_gap`, preventing chance-correction distortions.

4. **Domain Ability Score ($0–100$):**
   $$\text{Ability} = \text{round}\left(\frac{\sum_{i=1}^{N} c'_i \cdot w_i}{\sum_{i=1}^{N} w_i} \times 100\right)$$
   where $w_i \in \{0.8, 1.0, 1.3, 1.7\}$ corresponds to item difficulty levels $1, 2, 3, 4$.

5. **Provisional Level Mapping ($0–5$):**
   - **Level 0 (Unassessed / Insufficient Evidence):** $\text{Ability} = 0$
   - **Level 1 (Novice):** $1 \le \text{Ability} \le 19$
   - **Level 2 (Developing):** $20 \le \text{Ability} \le 39$
   - **Level 3 (Proficient):** $40 \le \text{Ability} \le 64$
   - **Level 4 (Job Ready):** $65 \le \text{Ability} \le 84$
   - **Level 5 (Strong / Advanced):** $85 \le \text{Ability} \le 100$

6. **Provisional Confidence Vector ($0.0–1.0$):**
   $$\text{Confidence} = 0.35 \cdot \text{obs} + 0.25 \cdot \text{cov} + 0.15 \cdot \text{diff} + 0.15 \cdot \text{cons} + 0.05 \cdot \text{qual} + 0.05 \cdot \text{rel}$$
   - High: $\ge 0.80$
   - Medium: $0.50 - 0.79$
   - Low: $0.00 - 0.49$

7. **Regression Guard Policy:**
   Level regression is permitted only when $\ge 3$ scored responses across $\ge 2$ difficulty bands indicate an ability drop $\ge 8$ points. Max level drop is capped at 1 level per assessment unless a catastrophic drop ($\ge 25$ points) occurs.

---

## 10. Current UX Audit & Deficit Analysis — LOCKED

| UX Dimension | Current Baseline State | Redesigned Target Specification |
|---|---|---|
| **5-Second Comprehension** | Cluttered mix of text banners, tables, and buttons. | Distinct 3-mode state architecture (Lobby, Live Runner, Diagnostic Readout) with immediate visual hierarchy. |
| **Execution Ergonomics** | Minimal styling on code inputs; no keyboard shortcuts. | Dedicated code editor container, live test execution pill with execution time, keyboard navigation (`Ctrl+Enter`, `Alt+N`, `Alt+P`). |
| **Question Palette** | Basic grid with faint colors. | High-contrast 6-column matrix with distinct status badges (Answered, Current, Flagged, Don't Know) and domain grouping headers. |
| **Timer Urgency** | Simple text color change. | Multi-tier urgency styling: Normal (slate border), Warning (<15m, amber border), Critical (<5m, pulsing red border with aria live updates). |
| **Diagnostic Readout** | Disconnected cards and plain tables. | Structured 11-Domain Matrix grouped by Construct Class (A, B, C) with visual level badges, confidence pills, and regression indicators. |
| **Company Role Overlay** | Simple dropdown with flat metrics. | Interactive Role Gap Observatory showing exact target level deltas and required domain readiness percentages. |
| **Actionable Handoff** | Scattered links. | Prominent Hero Prescriptive CTA linked to the top-priority assessment learning target. |

---

## 11. Visual Metaphor — LOCKED

### **"The Placement Diagnostic Instrument Panel & Benchmark Chamber"**

The Assessment subsystem is designed as an **empirical, high-precision laboratory instrument panel**. It conveys:
- **Calibrated Measurement:** Cold, rational diagnostic instruments with zero artificial cheerleading.
- **Scientific Honesty:** Clear demarcations between proven capability, unassessed domains, and knowledge gaps.
- **Prescriptive Guidance:** Precise diagnostic telemetry converting errors into immediate study interventions.

---

## 12. Design Tokens & Color Palette — LOCKED

PlacementOS uses an Obsidian & Forest Green foundation with calibrated tonal elevations:

| Token Name | Hex Value | Semantic Usage |
|---|---|---|
| `--bg-base` | `#0D0F12` | App-level canvas background |
| `--bg-surface-1` | `#14171D` | Primary card & panel background |
| `--bg-surface-2` | `#1B2028` | Elevated controls, badges, item tiles |
| `--border-subtle` | `#262D38` | Standard 1px structural borders |
| `--border-medium` | `#3B4556` | Focused elements, active states |
| `--text-primary` | `#F1F5F9` | High-contrast titles, values, questions |
| `--text-secondary` | `#CBD5E1` | Body copy, code prompts, descriptions |
| `--text-muted` | `#8E98A8` | Metadata, timestamps, labels |
| `--text-faint` | `#5C6675` | Inactive item indices, construct footnotes |

---

## 13. Action Accent — LOCKED

### **Action Accent: Benchmark Topaz (`#EAB308` / `#CA8A04` / `#FACC15`)**

- **Primary Action Fill:** `#EAB308` (Dark text `#0D0F12`, font-semibold)
- **Primary Action Hover:** `#CA8A04`
- **Subtle Surface Tint:** `rgba(234, 179, 8, 0.10)`
- **Accent Border:** `rgba(234, 179, 8, 0.40)`
- **Reserved Subsystem Mapping:**
  - Today: Sky Cyan (`#38BDF8`)
  - Roadmap: Emerald Jade (`#10B981`)
  - DSA: Precision Mint (`#2DD4BF`)
  - Preparation: Golden Amber (`#F59E0B`)
  - Practice: Cobalt Blue (`#3B82F6`)
  - Skills: Violet Amethyst (`#A855F7`)
  - Companies: Coral Flame (`#F97316`)
  - Project: Laser Teal (`#14B8A6`)
  - Interview: Electric Indigo (`#6366F1`)
  - Analytics: Diagnostic Rose (`#F43F5E`)
  - **Assessment:** **Benchmark Topaz (`#EAB308`)**

---

## 14. Frozen 5-Zone Information Architecture — LOCKED

The Assessment page operates under **Three View Lifecycle Modes**, each strictly structured into 5 zones:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE A: PRE-FLIGHT LOBBY (Unassessed / Initial Entry)                       │
│  [Zone 1: Diagnostic Mission Header & Pre-Flight Briefing]                  │
│  [Zone 2: 10-Module Construct Blueprint Grid (84 Items, 180 min)]           │
│  [Zone 3: Standardized Rules & Deterministic Scoring Guarantees]            │
│  [Zone 4: Defining Hero Action Launch Strip ("Start Baseline Assessment")]  │
│  [Zone 5: Subsystem Grounding & Longitudinal Calibration Policy]            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE B: ACTIVE ASSESSMENT RUNNER (In Progress Execution)                   │
│  [Zone 1: Sticky Command Bar & Wall-Clock Countdown Bar]                    │
│  [Zone 2: Question Stage & Sandboxed Code/SQL Execution Console]            │
│  [Zone 3: Diagnostic Response Controls ("I Don't Know", Confidence Rating)] │
│  [Zone 4: Question Stepper & 84-Item Palette Navigator Grid]               │
│  [Zone 5: Submission Shield Gateway & Confirmation Modal]                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ MODE C: DIAGNOSTIC BENCHMARK READOUT (Post-Assessment Results)              │
│  [Zone 1: Capability Benchmark Header & Sub-Tab Switcher]                   │
│  [Zone 2: 11-Domain Capability Matrix (Class A, B, C Constructs)]           │
│  [Zone 3: Prescriptive Learning Targets & Hero Handoff Action CTA]          │
│  [Zone 4: Root-Cause Weakness Taxonomy & Company Role Overlay Lab]          │
│  [Zone 5: Weekly Sunday Mini-Test Engine & Calibration Observatory]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Zone-by-Zone Specification — LOCKED

### 15.1 Mode A: Pre-Flight Lobby (Unassessed)

#### Zone 1: Diagnostic Mission Header & Pre-Flight Briefing
- **Purpose:** Contextualize the purpose of the 180-minute baseline diagnostic.
- **Canonical Data:** `BASELINE_ASSESSMENT_DEFINITION.modules.length`, total duration (`180 min`).
- **Visual Form:** Obsidian card (`#14171D`) with Benchmark Topaz badge (`#EAB308`), title, and rationale explanation.
- **Empty State:** N/A (static config).

#### Zone 2: 10-Module Construct Blueprint Grid
- **Purpose:** Detail the 10 engineering modules and question distribution.
- **Canonical Data:** `BASELINE_ASSESSMENT_DEFINITION.modules` (M1 Aptitude $\to$ M10 Interviews; Projects excluded note).
- **Visual Form:** 2-column tabular list showing Module ID, Domain Name, Question Count, and Estimated Time.

#### Zone 3: Standardized Rules & Deterministic Scoring Guarantees
- **Purpose:** Outline exam rules: hard wall-clock timer, no pause, chance correction, zero LLM grading.
- **Visual Form:** 3-column feature grid with icons (`Clock`, `Target`, `ShieldAlert`).

#### Zone 4: Defining Hero Action Launch Strip
- **Purpose:** Single primary button to trigger `startBaselineAssessment()`.
- **Visual Form:** High-contrast banner with Topaz CTA (`#EAB308`), warning to ensure an uninterrupted 3-hour window.

#### Zone 5: Subsystem Grounding & Calibration Policy
- **Purpose:** Explain that diagnostic scores establish baseline capability without mutating DSA Leitner boxes.
- **Visual Form:** Muted informational footer note with link to Skills Matrix.

---

### 15.2 Mode B: Active Assessment Runner (In Progress)

#### Zone 1: Sticky Command Bar & Wall-Clock Countdown Bar
- **Purpose:** Persistent header showing assessment kind, current question index, answered count, and countdown timer.
- **Canonical Data:** `timeRemainingSeconds`, `activeAssessmentAttempt.kind`, `answeredCount`, `totalCount`.
- **Visual Form:** Sticky header (`top-0 z-30 bg-[#14171D]/95 backdrop-blur-md border-b border-[#262D38]`).
  - Timer pill: Normal (`#1B2028`), Warning (<15m, `#78350F` / `#F59E0B`), Critical (<5m, `#450A0A` / `#F87171` with subtle pulse).
  - Submit Button: Secondary neutral button opening the confirmation modal.

#### Zone 2: Question Stage & Sandboxed Code/SQL Execution Console
- **Purpose:** Main question workspace supporting 4 distinct input modalities.
- **Input Modalities:**
  1. **Multiple Choice (Single Select):** Vertical option list with A–D letter badges, hover ring, and keyboard selection (1–4 or A–D).
  2. **Normalized SQL Query:** Monospace text editor with syntactic validation note.
  3. **Written Rubric:** Monospace text area with deterministic criteria keywords.
  4. **Sandboxed Python/SQL Execution:** Monospace editor with "Run Code" execution trigger, live terminal feedback container showing status (`passed`, `syntax_error`, `runtime_error`, `assertion_error`, `timeout`, `sandbox_violation`), latency in ms, and test assertions passed.

#### Zone 3: Diagnostic Response Controls
- **Purpose:** Capture honesty and self-reported metacognitive confidence without point penalties.
- **Controls:**
  - **"I don't know this concept" Button:** Fills response as `'dont_know'`, assigning 0 credit but avoiding guessing penalty and logging taxonomy as `knowledge_gap`.
  - **Confidence Rating Selector:** 3-tier button group (`Guessing`, `Somewhat confident`, `Confident`).
  - **Clear Response Button:** Resets active answer.

#### Zone 4: Question Stepper & 84-Item Palette Navigator Grid
- **Purpose:** Step-by-step navigation plus full non-linear palette access.
- **Controls:**
  - Previous / Next buttons with keyboard shortcuts (`Alt+P`, `Alt+N`).
  - 84-item grid with color-coded status:
    - Answered: Emerald fill (`#10B981`/20, border `#10B981`/60)
    - Don't Know: Amber fill (`#F59E0B`/20, border `#F59E0B`/60)
    - Unanswered: Surface slate (`#1B2028`, border `#3B4556`)
    - Current Active: High-contrast Topaz ring (`#EAB308`)

#### Zone 5: Submission Shield Gateway & Confirmation Modal
- **Purpose:** Guard against accidental submissions and confirm unanswered counts.
- **Modal Content:** Total answered vs unanswered items, warning on unattempted questions receiving 0 credit, confirm button calling `submitAssessmentAttempt(attemptId, false)`.

---

### 15.3 Mode C: Diagnostic Benchmark Readout (Post-Assessment)

#### Zone 1: Capability Benchmark Header & Sub-Tab Switcher
- **Purpose:** Summary banner displaying completion date, average ability score ($0-100$), assessed domains count ($10/11$), and sub-tab switcher between **Baseline Diagnostic Profile** and **Sunday Adaptive Mini-Tests**.
- **Metrics Strip:**
  - Average Ability Score (`overallAbility / 100`)
  - Assessed Domains (`10 / 11`)
  - Identified Weakness Signals (`weaknesses.length`)
  - Evidence Classification (`sourceType: 'test'`)

#### Zone 2: 11-Domain Capability Matrix
- **Purpose:** Complete breakdown of candidate capability across all 11 domains.
- **Structure:**
  - **Class A (Full Construct):** Core technical domains (Aptitude, DSA, Core CS, SQL) showing ability score progress bar, provisional level ($0-5$), confidence badge (`High`, `Medium`, `Low`), and regression/confirmation alerts.
  - **Class B (Partial Construct):** Knowledge proxy domains (Communication, Interviews) with explicit construct scope notes.
  - **Class C (Portfolio/Project):** Projects domain clearly marked as unassessed via baseline, with direct button to open Project Lab.

#### Zone 3: Prescriptive Learning Targets & Hero Handoff Action CTA
- **Purpose:** Plain-language translation of assessment findings into daily study actions.
- **Components:**
  - **Learning Targets Ordered List:** 1–3 prioritized targets showing target title, reason, estimated time, and route destination.
  - **Hero Prescriptive Action CTA:** Topaz banner with 1-click button routing to `getAssessmentTargetDeepLink()`.

#### Zone 4: Root-Cause Weakness Taxonomy & Company Role Overlay Lab
- **Purpose:** Deep diagnostic breakdown and company requirement comparison.
- **Components:**
  - **Diagnosed Weakness Cards:** Categorized by domain, competency, error taxonomy (`syntax`, `runtime`, `conceptual`), and recommended remedy.
  - **Demonstrated Strengths:** Highlighting domains at Job Ready (L4) or Strong (L5).
  - **Target Company / Role Overlay Analyzer:** Dropdown selector to evaluate readiness against specific company profiles (`CompanyAssessmentOverlayResult`), displaying Role Readiness %, Required Domains Met, Open Gaps, and Top Priority Gaps.

#### Zone 5: Weekly Sunday Mini-Test Engine & Calibration Observatory
- **Purpose:** 90-minute adaptive weekly calibration launcher and historical report archive.
- **Components:**
  - **Sunday Mini-Test Launcher:** Shows obligation status (`Pending Calibration` vs `Eligible`), 60/20/20 composition blueprint, and "Start Sunday Mini Test" trigger.
  - **Weekly Calibration Reports:** Tabular/card history of previous Sunday tests showing accuracy %, time spent, targeted weaknesses resolved vs reinforced, and domain level adjustments.
  - **Psychometric Calibration Card:** Displays total recorded item observations and notes empirical calibration status (inactive until $\ge 200$ samples per item).

---

## 16. Execution Experience & Ergonomics — LOCKED

- **Auto-Save:** Every answer change is recorded synchronously via `recordAssessmentResponse` into `PlacementContext` state.
- **Timer Mechanics:** `useEffect` interval calculates wall-clock delta against `attempt.startedAt`. Expiration triggers auto-submission (`submitAssessmentAttempt(attemptId, true)`).
- **Keyboard Shortcuts:**
  - `Alt + N` or `ArrowRight`: Next question
  - `Alt + P` or `ArrowLeft`: Previous question
  - `1`, `2`, `3`, `4` or `A`, `B`, `C`, `D`: Select MCQ option
  - `Ctrl + Enter` (in Code/SQL editor): Execute sandbox test
  - `Alt + K`: Toggle "I don't know"
  - `Escape`: Close submission modal

---

## 17. Result / Diagnostic Experience & Interpretation — LOCKED

Every metric displayed on the diagnostic readout must adhere to strict epistemic rules:
1. **No Fake Precision:** Ability scores are integer-rounded ($0–100$).
2. **Provisional Labeling:** Levels are labeled *"Provisional (Level N)"* until $\ge 2$ subsequent consistent observations confirm the capability.
3. **Construct Limitations:** Partial construct domains (Class B) must display their construct scope notice (e.g., *"Evaluates theoretical communication frameworks; spoken delivery evaluated separately"*).
4. **No Blended Placement Odds:** The system never synthesizes a single "Placement Probability Percentage".

---

## 18. Visualization Specification — LOCKED

- **Ability Score Bar:** 6px height horizontal track (`bg-[#1B2028]`) with Topaz fill (`#EAB308`), smooth 400ms transition.
- **Status Badges:**
  - Confirmed Level: `bg-emerald-950/30 text-emerald-400 border border-emerald-800/40`
  - Provisional Level: `bg-amber-950/20 text-amber-400 border border-amber-800/40`
  - High Confidence: `bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40`
  - Medium Confidence: `bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40`
  - Low Confidence: `bg-amber-950/20 text-amber-400 border border-amber-800/40`
  - Regressed Signal: `bg-red-950/40 text-red-400 border border-red-800/40`
- **Role Gap Indicators:** Mono-spaced level transition pill (`L2 → Target L4, Gap: -2`).

---

## 19. State Lifecycle & Transitions — LOCKED

```
                       [ Unassessed State ]
                                │
                                ▼ startBaselineAssessment()
                    [ Active Baseline Runner ]
                      (180m Wall-Clock Timer)
                                │
              ┌─────────────────┴─────────────────┐
              ▼ Auto-Submit (Expired)             ▼ User Submit
      [ Sealed Baseline Result ]          [ Sealed Baseline Result ]
              │                                   │
              └─────────────────┬─────────────────┘
                                ▼
               [ Diagnostic Benchmark Readout ]
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼ startSundayAssessment()                   ▼ startFullReassessment()
[ Active Sunday Mini-Test ]                 [ Active Full Reassessment ]
   (90m Wall-Clock Timer)                      (180m Wall-Clock Timer)
          │                                           │
          ▼ Submit Attempt                            ▼ Submit Attempt
[ Weekly Calibration Report ]               [ Confirmed Longitudinal Profile ]
```

---

## 20. Cross-Subsystem Handoffs — LOCKED

| Source Action | Target Route | Target Entity ID | Downstream Experience |
|---|---|---|---|
| **Primary Learning Action** | `preparation` / `practice` / `dsa` | `targetId` | Directly opens the recommended remediation unit. |
| **Inspect Skills Matrix** | `skills` | `domainId` | Opens 11-domain skills matrix to view working readiness evidence. |
| **Go to Preparation Hub** | `preparation` | N/A | Opens curriculum topic progression tree. |
| **Open Project Lab** | `project` | N/A | Opens engineering project defense and portfolio lab. |
| **Target Company Selector** | `companies` | `companyId` | Navigates to target company overlay management. |
| **Continue to Today** | `dashboard` | N/A | Returns to Today's operational study session. |

---

## 21. Signature Motion — LOCKED

### **"Diagnostic Pulse & Calibration Sweep"**
- **Micro Interactions (120–180ms):** Option selection ring animation, tab underline transition.
- **Module Transitions (200–280ms):** Subtle hardware-accelerated horizontal scan line on module switch (`transform: translateX(0)` with ease-out curve).
- **Modal Emphasis (300–400ms):** Smooth scale fade on submission confirmation dialog (`scale: 0.98` to `1.0`, opacity `0` to `1`).
- **Reduced-Motion Safe:** Full override via `@media (prefers-reduced-motion: reduce)` disabling transforms and transitions.

---

## 22. Responsive Breakpoints — LOCKED

| Breakpoint | Layout Adjustments |
|---|---|
| **1440px+ (Ultra-wide)** | Full 4-column layout: 3-col Question Workspace + 1-col Question Palette Navigator. |
| **1280px (Desktop)** | Standard 4-column layout with fixed palette height (max 480px scrollable). |
| **1024px (Tablet Landscape)** | 3-column Question Workspace + Palette wraps to bottom or side drawer. |
| **768px (Tablet Portrait)** | Single column layout: Sticky timer bar, Question panel, Palette below with 8-col grid. |
| **375px (Mobile)** | Stacked layout: Sticky header with condensed timer, 6-col question grid, full-width touch buttons (min 44px touch targets). |

---

## 23. Accessibility Standards (WCAG 2.1 AA) — LOCKED

1. **Semantic Landmarks:** `<main>`, `<header>`, `<section>`, `<nav>`, and `<dialog>` elements.
2. **Keyboard Focus:** Visible 2px focus ring (`ring-[#EAB308]`) on all interactive controls.
3. **Screen Readers:** ARIA live regions (`aria-live="polite"`) for timer threshold alerts (15m, 5m, 1m).
4. **Form Labels:** Every textarea and input carries explicit `aria-label` or `<label>` element.
5. **Non-Color Indicators:** Every status badge pairs color with explicit text labels (`Provisional`, `Confirmed`, `High Conf`, `Regressed`).

---

## 24. Architecture Guardrails & Prohibitions — LOCKED

- **NO New Assessment Engine:** Must use existing `assessmentEngine.ts` and `assessmentExecutionEngine.ts`.
- **NO New Scoring Formulas:** Hardcoded authored weights, chance correction, and level bands are immutable.
- **NO LLM Grading:** Zero AI evaluation calls in V1.
- **NO Backend or Cloud Sync:** Strictly offline-first localStorage via `PlacementContext`.
- **NO Mutation of DSA Leitner State:** Diagnostic tests emit `sourceType: 'test'` and never alter spaced repetition boxes.
- **NO Modification of Protected File:** `src/components/dashboard/TodayGuide.tsx` remains strictly untouched.

---

## 25. Acceptance Criteria — LOCKED

1. **Audit & Specification Completeness:** Comprehensive 28-section document covering the entire Assessment subsystem.
2. **Subsystem Discovery:** Complete tracing of all 10 modules, 84 items, sandboxed execution, scoring formulas, and cross-subsystem handoffs.
3. **Design System Consistency:** Full adoption of Obsidian tokens, Benchmark Topaz accent (`#EAB308`), and 5-zone information architecture.
4. **Test Integrity:** All 265 existing assessment tests continue to pass without regression.
5. **Clean Working Tree:** Only this specification document is created; no staging, commit, or push.

---

## 26. Manufacturing Sequence (Task 97 Preview) — LOCKED

1. **Step 1: Modular Subcomponents Creation:**
   - `src/components/assessment/AssessmentLobby.tsx`
   - `src/components/assessment/AssessmentExecutionRunner.tsx`
   - `src/components/assessment/AssessmentQuestionPalette.tsx`
   - `src/components/assessment/AssessmentDiagnosticReadout.tsx`
   - `src/components/assessment/AssessmentWeeklyTab.tsx`
   - `src/components/assessment/AssessmentSubmitModal.tsx`
2. **Step 2: Refactor `AssessmentRunnerView.tsx`:**
   - Wire subcomponents into the clean 5-zone architecture.
3. **Step 3: Verification & Test Suite Execution:**
   - Run Vitest assessment suite, verify component rendering, and test end-to-end attempt flows.

---

## 27. Non-Goals — LOCKED

- No changes to `storageAdapter.ts` schema or version.
- No changes to `adaptiveEngine.ts` weight constants.
- No new third-party editor packages (e.g. Monaco/Ace); use lightweight vanilla monospace editor containers.
- No proctoring, webcam, or full-screen enforcement.

---

## 28. Final Specification Sign-Off — LOCKED

**Specification Status:** **FROZEN**  
**Engineering Authority:** PlacementOS Architecture Review Board  
**Ready for Manufacturing:** **YES (Task 97)**
