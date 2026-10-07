# PlacementOS Practice Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.  
**Baseline commit:** `8e90bc7` — `feat(preparation): complete learning progression workspace`  
**Date:** 2026-10-07  
**Scope:** `src/components/practice/*` (Practice Hub View, Practice Runner Modal, Continuation Workflow), integration with `PlacementContext.tsx`, `SessionContext.tsx`, `practiceEngine.ts`, `practiceContinuation.ts`, `remediationRouter.ts`, and the Practice test suite.

> **Reading contract.**  
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Practice page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`practiceEngine.ts`, `practiceContinuation.ts`, `remediationRouter.ts`), storage schemas, routing contracts, evidence scoring, and test assertions. The only file authorized in this task is this specification document; UI implementation is deferred to the subsequent manufacturing task.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Practice Subsystem** (`#/practice`) is the student's **Tactical Assessment & Drill Proving Ground**. It answers the fundamental student questions:
> *"What targeted drill or simulation should I execute right now to build objective placement competence? How do I perform under timed conditions in Aptitude, Verbal, SQL, Core CS, Project Defense, and Mock Interviews? What evidence does my performance generate for my Skills Matrix, and if I fail or struggle, what exact remediation path restores mastery?"*

### Core Design Principle
```
Practice Proving Strip → Dominant Recommended Drill Focus → Persistent Remediation Queue → Category Drill Tracks (7 domains) → Focused Assessment Runner Arena → Deterministic Evaluation & Evidence Attribution → Automated Continuation Chaining
```

The redesigned Practice page must make it immediately obvious within **5 seconds**:
1. **What Practice is for:** Active simulation, rapid technical drills, timed problem sets, and behavioral/defense practice producing verified evidence for placement readiness.
2. **What I should practice right now:** The single highest-leverage recommended drill surfaced in the Hero section (prioritizing company required domains, aging topic freshness, and uncompleted drills).
3. **Why this practice:** Plain-language rationale explaining company requirement alignment, evidence decay mitigation, or placement foundation building.
4. **What my current training health is:** Aggregate accuracy %, total drills completed, domain coverage (active drill categories), and pending remediation items.
5. **What does successful practice prove:** Exact score % and evidence strength (+20% weighted attribution) emitted to the Skills Matrix and topic readiness states.
6. **What should I do next:** Deterministic continuation routing (remediation drill if failed, retrieval practice if curriculum completed, or next progression drill if passed).

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Base Route:** `#/practice` (Proving Ground Hub showing all drill categories and catalog).
- **Target Route (Deep-Link):** `#/practice/<sessionId>` (e.g. `#/practice/practice-sql-01`, `#/practice/practice-apt-01`, `#/practice/practice-dbms-01`).
- **Target Resolution in PracticeView:**
  - When `routeState.targetId` is present (e.g. from Today's plan or Preparation handoff), `PracticeView` detects `deepLinkedSession`.
  - Automatically opens `PracticeRunnerModal` for the specified session ID.
  - Upon completion or dismissal:
    - If part of an active Today study session (`useSafeSession()`), invokes `session.advanceActivity('completed')` and routes back to `#/dashboard`.
    - If triggered standalone, remains in `#/practice` and opens the Continuation Card or returns to the drill catalog.

### 2.2 Component Hierarchy (Current)
```
AppShell (src/components/layout/AppShell.tsx)
└── PracticeView (src/components/practice/PracticeView.tsx) [242 lines]
    ├── Header & GuideTrigger (route="practice")
    │   └── Attempts Completed Counter Badge
    ├── Recommended Practice Hero Card (conditional if recommendation exists)
    │   ├── Zap icon, gradient border (#E5A93C)
    │   ├── Category tag & estimated minutes
    │   ├── Title & description
    │   ├── "Why this?" reasoning string
    │   └── "Start Drill Now" Button
    ├── Category Filter Tabs (All Sessions, Aptitude, Verbal, SQL, Core CS, Project Defense, Mock Interview)
    ├── Practice Session Grid (3-column responsive card grid)
    │   └── Session Card (for each session)
    │       ├── Category Badge & Estimated Duration
    │       ├── Title & Description (line-clamp-2)
    │       ├── Question Count
    │       ├── Average Score % (if attempted)
    │       └── "Start Session" Button
    └── PracticeRunnerModal (src/components/practice/PracticeRunnerModal.tsx) [454 lines]
        ├── [ACTIVE QUESTION RUNNER MODE]
        │   ├── Top Bar (Category badge, Session title, Elapsed Timer, Close X)
        │   ├── Progress Indicator (Question X of Y) & Category Tag
        │   ├── Question Prompt
        │   ├── [If MCQ]: Option List with selectable buttons and checkmark
        │   ├── [If Non-MCQ]:
        │   │   ├── Textarea response scratchpad (SQL / Verbal / Defense)
        │   │   ├── Hint & Expected Solution toggle
        │   │   └── Self-Rating / Defense Confidence 5-star selector
        │   └── Footer Controls (Previous button, Next / Finish & Submit CTA)
        │
        └── [RESULT SUMMARY MODE] (post-submission)
            ├── Header (Award icon, "Session Completed!", Domain attribution)
            ├── Metric Triad (Accuracy %, Score X/Y, Time Spent)
            ├── Evidence Log Integration Box (Domain, topic, % score)
            ├── Continuation Card (from resolvePracticeContinuation):
            │   ├── Mode (Remediation Recommended / Retrieval Practice / Next Practice)
            │   ├── Plain-language summary & justification
            │   ├── Metadata (Estimated minutes, Domain)
            │   └── "Continue" Deep-Link CTA
            ├── Blocked Continuation Notice (if continuation is blocked)
            └── "Close & Return" Action Button
```

### 2.3 Canonical Data Sources & State Slices
| Entity | Canonical Source | Purpose & Storage Contract |
|---|---|---|
| **Practice Sessions** | `PRACTICE_SESSIONS` (`src/data/practiceDataset.ts` + modular banks in `src/data/practice/*`) | Authoritative static bank of 11+ categories with questions, answer keys, explanations, and passing thresholds. |
| **Practice Attempts** | `practiceAttempts` (`appState.practiceAttempts` in `StorageAdapter.ts`) | Immutable log of completed practice attempts (`id`, `sessionId`, `scorePct`, `accuracyPct`, `totalTimeSeconds`, `passed`, `userAnswers`). |
| **Evidence Trail** | `evidenceLogs` (`appState.evidenceLogs` in `StorageAdapter.ts`) | Append-only evidence log entries written on session completion (`sourceType: 'practice_session'`). |
| **Skill States** | `skillStates` (`appState.skillStates` in `StorageAdapter.ts`) | Topic-level evidence strength (`0..100`), freshness (`fresh`, `aging`, `stale`, `untested`), and `lastPracticedAt` timestamp. |
| **Company Overlays** | `companyOverlays` (`appState.companyOverlays`) | Target company requirements driving domain recommendation weighting in `getRecommendedPracticeSession`. |
| **Curriculum Context** | `dsaProblems`, `tasks`, `preparationTopics`, `activePhase` | Full curriculum state consumed by `resolvePracticeContinuation` and `remediationRouter` for deterministic routing. |
| **Active Session** | `useSafeSession()` (`SessionContext.tsx`) | Active daily study session tracking, advancing via `session.advanceActivity('completed')` on deep-linked session completion. |

---

## 3. Current UX Audit — LOCKED

Evaluating `PracticeView.tsx` and `PracticeRunnerModal.tsx` against forensic criteria:

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-Second Comprehension** | **MODERATE** | Hero card clearly surfaces recommended drill, but overall page feels like a flat card catalog without an overview of mastery, domain readiness, or due retakes. |
| **B. Visual Hierarchy** | **MEDIOCRE** | Extensive use of legacy hardcoded colors (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`, `#10B981`, `#F59E0B`). Lacks unified tonal elevation. |
| **C. Information Density** | **FLAT & DISPERSED** | 20+ cards rendered with uniform weight. No distinction between quick conceptual checks, timed simulation exams, and complex project defense prompts. |
| **D. Defining Action Clarity** | **COMPETING** | Multiple identical "Start Session" buttons across 20+ cards compete with the primary "Start Drill Now" hero action. |
| **E. Legacy Color Tokens** | **FAIL** | 100% hardcoded hex strings in both `PracticeView.tsx` and `PracticeRunnerModal.tsx`. Does not use semantic CSS variables (`var(--background)`, `var(--surface)`, `var(--action-accent)`). |
| **F. Remediation Visibility** | **WEAK** | Failed attempts are only addressed immediately inside the modal result screen; once closed, there is no persistent remediation queue or badge on the main page. |
| **G. Timed Drill Experience** | **INCOMPLETE** | Timed sessions (e.g. 15 questions / 20 min) do not display prominent countdown timers or time-budget warning badges. |
| **H. Runner Ergonomics** | **MEDIOCRE** | Runner lacks keyboard shortcuts (`1-4` for MCQ options, `Ctrl+Enter` to advance), question jump grid, and explicit self-certification guidance. |
| **I. Responsive Layout** | **SUBOPTIMAL** | Category filter tabs overflow horizontally without indicators; modal dialog squishes content and textareas on mobile viewports (<640px). |
| **J. Accessibility** | **INCOMPLETE** | Missing explicit `role="tablist"` / `aria-selected` attributes on category filters, missing `role="progressbar"` on progress counters, missing explicit keyboard focus rings. |

---

## 4. 5-Second Test Evaluation — LOCKED

| Question | Current Status | Redesign Resolution |
|---|---|---|
| **1. What is Practice for?** | Stated in subtitle text, but visually looks like a generic quiz list. | Add prominent **Tactical Proving Ground Header** with macro performance metrics across all 6 practice domains. |
| **2. What should I practice now?** | Shown in hero card, but hero lacks contrast and high-priority action styling. | Upgrade to an **Active Recommended Drill Hero** with dedicated Cobalt action accent (`--action-accent-practice`). |
| **3. Why this practice?** | Shown as small subtext in hero card. | Elevated "Why this drill?" badge directly linking company requirements, aging skill freshness, or core curriculum gaps. |
| **4. What is my practice health?** | Only raw attempt count is shown in header. | Introduce the **4-Metric Proving Strip**: Total Drills Completed, Average Accuracy %, Domain Readiness Score, and Remediation Needed count. |
| **5. What should I do next?** | Only visible inside modal after completion. | Add a persistent **Remediation & Continuation Queue** on the hub page when prior attempts require re-practice or concept review. |

---

## 5. Visual Metaphor & Aesthetic System — LOCKED

### 5.1 Chosen Metaphor: "Tactical Assessment & Drill Proving Ground"
The Practice page is an **instrument-grade, high-cadence proving arena** for deliberate testing, timed simulation, and objective skill verification:
- **Clean Obsidian Planes:** Surface planes (`#0B100D`, `#111713`, `#161E19`, `#1B241F`) with 1px subtle boundary lines (`#28352D`).
- **Forest Green Identity:** Canonical brand green (`#2E8B62`, `#46B982`, `#65D3A3`) reserved for verified evidence badges, passing results, and system health.
- **Controlled Page Action Accent (Cobalt Electric Blue):** Dedicated high-contrast action accent (`#3B82F6` / `#60A5FA` / `hsl(217, 91%, 60%)`) reserved strictly for the defining practice action ("Start Recommended Drill", "Begin Session", "Submit Attempt").
- **Warm Bronze Warning (`#D19A45`):** Strictly reserved for failed drills, remediation alerts, and aging skill freshness warnings.
- **Chiseled Technical Structure:** Crisp typography (Inter for UI, JetBrains Mono for metrics, timers, and code), restrained radii (`0.375rem`), and flat technical card surfaces without decorative neon or arbitrary gradients.

---

## 6. Defining User Action & Action Accent — LOCKED

### 6.1 The One Defining Action: `"Start Drill"` / `"Begin Session"` / `"Submit Attempt"`
On the Practice page, the defining user mission is to **engage in active deliberate practice to generate verified placement evidence**.

### 6.2 Proposed Page Action Accent: Cobalt Electric Blue
```css
--action-accent-practice: #3B82F6;
--action-accent-practice-hover: #60A5FA;
--action-accent-practice-subtle: rgba(59, 130, 246, 0.12);
--action-accent-practice-border: rgba(59, 130, 246, 0.35);
--action-accent-practice-ring: #93C5FD;
```
- **Rationale:**
  - Distinct from Sky Cyan (Today), Emerald Jade (Roadmap), Precision Mint (DSA), and Golden Amber (Preparation).
  - Embodies tactical precision, examination focus, and deliberate assessment.
  - High contrast on obsidian dark canvas (passing WCAG AAA 7:1 for text with `#93C5FD`/`#BFDBFE`).
  - Never used as a second page theme; strictly applied to primary action CTAs, active question highlight, and drill runner submission controls.

---

## 7. Information Architecture & Page Zones — LOCKED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: PRACTICE HEADER & PROVING GROUND STRIP                              │
│ • Page Title & Placement Objective                                          │
│ • 4-Metric Proving Strip: Total Drills, Avg Accuracy %, Domain Coverage,    │
│   Remediation Pending Count                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: ACTIVE RECOMMENDED DRILL (Dominant Focus)                           │
│ • Target Company / Freshness / Milestone Rationale                          │
│ • Title, Category Tag, Question Count, Estimated Duration                   │
│ • Primary CTA: "Start Recommended Drill" [Cobalt Accent]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: PERSISTENT REMEDIATION & REVIEW QUEUE (Conditional)                 │
│ • Appears when prior attempts have score < 60% or unverified answers        │
│ • Direct actions: "Retake Drill", "Review Concept in Preparation", "DSA"   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: DRILL CATALOG & CATEGORY PROVING TRACKS                             │
│ • 7 Category Tabs (All, Aptitude, Verbal, SQL, Core CS, Defense, Mock)      │
│ • Search, Difficulty Filter, Timed-Only Toggle                              │
│ • Responsive Session Card Grid with Passing Status & Accuracy Badges        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: PRACTICE RUNNER WORKBENCH / MODAL                                   │
│ • Modal Dialog with Focus Trap & Full Screen Toggle                         │
│ • Question Navigator Rail & Timed Countdown / Elapsed Clock                 │
│ • Rich Question View (MCQ / SQL Scratchpad / Defense Self-Rating)           │
│ • Submission Protocol & Deterministic Result Screen with Continuation Card  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Zone Details

#### Zone 1: Practice Header & Proving Ground Strip
- **Header:** Title *"Tactical Assessment & Practice Proving Ground"* with subtitle *"Deliberate drills across Aptitude, Verbal, SQL, Core CS, Project Defense, and Mock Interviews."*
- **Macro Proving Strip:**
  1. *Total Drills Completed:* Count of all logged `practiceAttempts`.
  2. *Average Accuracy:* Mean accuracy % across all logged attempts.
  3. *Domain Readiness:* Count of active domains with >= 70% average score (e.g. `4 / 6 Domains Ready`).
  4. *Remediation Alerts:* Count of failed/stale attempts requiring review.

#### Zone 2: Recommended Drill Hero (Dominant Focus)
- Evaluated via `getRecommendedPracticeSession(PRACTICE_SESSIONS, practiceAttempts, skillStates, companyOverlays)`.
- Renders top priority justification (e.g. *"Target company requirement for Core CS (DBMS)"* or *"Evidence aging for SQL Queries"*).
- Displays duration estimate, question count, and category badge.
- Primary Action CTA: `"Start Recommended Drill"` using Cobalt action accent.

#### Zone 3: Persistent Remediation & Review Queue (Conditional)
- Scans `practiceAttempts` for sessions with `passed === false` or `accuracyPct < 60`.
- Renders actionable remediation cards showing failure point, error summary, and one-click launch for retake or concept handoff.

#### Zone 4: Drill Catalog & Category Proving Tracks
- **Category Tabs:**
  1. `all` — All Sessions
  2. `aptitude` — Quantitative & Logical Aptitude
  3. `verbal` — Verbal Ability & Reading Comprehension
  4. `sql` — SQL Scenario & Query Construction
  5. `core_cs` — Core Computer Science (OS, DBMS, CN, OOP)
  6. `project_defense` — Architecture & Engineering Defense
  7. `mock_interview` — Behavioral & Technical Mock Interviews
- **Session Card Specifications:**
  - Category badge + Timed badge (if timed session).
  - Title, description, question count, and duration.
  - Previous attempt status:
    - *Unattempted:* Neutral border, "Start Session" button.
    - *Passed (>=70%):* Forest green badge (`CheckCircle2`), accuracy %, "Retake Session" button.
    - *Needs Work (<70%):* Amber badge (`AlertTriangle`), accuracy %, "Remediate Drill" button.

#### Zone 5: Practice Runner Workbench / Modal
- Accessible via any session launch button.
- **Active Runner State:**
  - Header: Category badge, title, live countdown (for timed sets) or elapsed stopwatch.
  - Question Navigator: Numbered step pills indicating answered, current, and unanswered items.
  - Question Prompt: High-contrast prompt text with syntax highlighting for code/SQL snippets.
  - Input Handlers:
    - *MCQ:* High-contrast option buttons with keyboard numbers `[1] [2] [3] [4]`.
    - *SQL Scenarios:* Multi-line monospace SQL editor scratchpad + model query hint toggle + honest self-certification toggle.
    - *Project Defense / Behavioral:* Prompt guidance + structured response bullet scratchpad + 5-level confidence rating.
  - Footer: `"Previous"`, `"Next Question"`, and `"Finish & Submit Drill"`.
- **Result Summary State:**
  - Evaluated authoritative score via `evaluatePracticeAttempt`.
  - Metric Triad: Accuracy %, Score (X/Y), Time Spent.
  - Skills Matrix Evidence Log Attribution: Exact domain, topic ID, score, and confidence level.
  - Deterministic Continuation Card: Produced by `resolvePracticeContinuation` with one-click transition to next practice, concept lesson, or DSA problem.

---

## 8. State Model & Interaction Lifecycle — LOCKED

```
[ Hub Catalog View ] 
       │
       ├─► Select Session / Recommended Hero / Deep-Link Target
       │
       ▼
[ Practice Runner Modal: Active Mode ]
       │
       ├─► (Optional) Jump between questions via Navigator Rail
       ├─► Select MCQ Option / Enter Written Response & Self-Rating
       ├─► Toggle Expected Answer / Hint (records hint usage)
       │
       ▼
[ Finish & Submit Drill ]
       │
       ▼
[ evaluatePracticeAttempt(session, answers, time, todayISO) ]
       │
       ├─► Write PracticeAttempt to state
       ├─► Write EvidenceLog to state
       ├─► Update TopicSkillState (+20% evidenceStrength, freshness='fresh')
       │
       ▼
[ resolvePracticeContinuation(options) ]
       │
       ▼
[ Practice Runner Modal: Result Summary Mode ]
       │
       ├─► Case A: User clicks "Continue" ──► Routes to Continuation Target (Prep/DSA/Practice)
       ├─► Case B: User clicks "Close & Return"
       │            ├─► If from Active Today Session ──► advanceActivity('completed') ──► #/dashboard
       │            └─► If standalone ──► Returns to #/practice Hub (Catalog reflects new attempt)
```

---

## 9. Motion System & Micro-Interactions — LOCKED

### 9.1 Signature Motion: "Cadence Meter & Question Traveler"
- **Question Transition:** Smooth horizontal slide (`placement-fade-left` / `placement-fade-right`) when navigating between questions in the runner.
- **Selection Feedback:** Snappy scale feedback (`transform: scale(0.99)`) upon selecting an MCQ option.
- **Result Score Reveal:** Gentle counter interpolation and evidence badge fade-in on the result screen.
- **Reduced Motion Support:** All transitions strictly collapse to 0ms when `prefers-reduced-motion: reduce` is active.

```css
/* Signature Motion Tokens */
.drill-question-enter {
  animation: placement-fade-up var(--duration-fast) var(--ease-out);
}

.drill-result-reveal {
  animation: placement-fade-in var(--duration-normal) var(--ease-out);
}
```

---

## 10. Responsive Behavior & Breakpoints — LOCKED

| Viewport | Breakpoint | Layout Adaptations |
|---|---|---|
| **Desktop XL** | `1440px+` | Max container width `1400px`. 4-metric proving strip in single row. 3-column session grid. Runner modal max width `800px`. |
| **Desktop / Laptop** | `1024px – 1439px` | 4-metric strip in 2x2 grid. 2-column session grid. Full header controls. |
| **Tablet** | `768px – 1023px` | 2-column session grid. Category tabs with scroll snapping. Runner modal occupies 90vw. |
| **Mobile** | `375px – 767px` | 1-column stacked layout. Metric strip in 2x2 compact pills. Recommended hero stacks vertically. Runner modal becomes full-screen bottom-sheet with fixed bottom action bar. |

---

## 11. Accessibility Specifications — LOCKED

1. **Semantic Structure:**
   - Single `<h1>` for page header.
   - `<h2>` for major sections (Recommended Drill, Remediation Queue, Drill Catalog).
   - `<h3>` for individual session cards and question prompts.
2. **ARIA Contracts:**
   - Category navigation: `role="tablist"`, each category `role="tab"`, `aria-selected="true|false"`, `aria-controls="session-catalog-panel"`.
   - Runner Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Practice Assessment Runner"`.
   - Progress indicators: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
3. **Keyboard Controls:**
   - `Tab` / `Shift+Tab` for sequential navigation.
   - Number keys `1`, `2`, `3`, `4` to select MCQ options when runner is active.
   - `Ctrl+Enter` / `Cmd+Enter` to submit current question / finish drill.
   - `Escape` to request runner exit confirmation.
   - Visible focus ring on all interactive elements: `outline: 2px solid var(--focus, #65D3A3)`.
4. **Color Contrast:**
   - Text on dark background (`#0B100D`): `#E8F0E9` (13.5:1 ratio).
   - Secondary text: `#9AA99F` (6.2:1 ratio).
   - Cobalt action accent text: `#93C5FD` / `#F3F7F3` on `#3B82F6` (7.1:1 ratio).
   - Non-color status indicators: Every passing/failing state accompanied by explicit text labels and distinct Lucide icons (`CheckCircle2`, `AlertTriangle`, `Clock`, `Zap`).

---

## 12. Cross-Subsystem Handoffs & Deep-Link Preservation — LOCKED

The Practice subsystem maintains immutable handoff contracts with other subsystems:

1. **Today → Practice Handoff:**
   - When Today assigns a practice task (e.g. `taskId: 'task-prep-sql-practice'`), clicking "Start Task" routes to `#/practice/practice-sql-01`.
   - PracticeView detects `routeState.targetId === 'practice-sql-01'` and automatically opens the runner.
   - Completing the session advances `session.advanceActivity('completed')` and routes back to `#/dashboard`.

2. **Preparation → Practice Handoff:**
   - In `TopicWorkspace`, Stage 3 (Apply) and Stage 4 (Assess) launch matching drills via `setRoute('practice', sessionId)`.
   - Completed attempts emit evidence to `skillStates` for that specific `topicId`, immediately updating the Preparation topic's readiness score.

3. **Practice → Remediation Handoffs:**
   - When `resolvePracticeContinuation` returns a remediation route:
     - To Preparation: `setRoute('preparation', continuation.targetId)`
     - To DSA: `setRoute('dsa', continuation.targetId)`
     - To Practice: `setRoute('practice', continuation.targetId)`

---

## 13. Architecture Safety & Token Migration Guardrails — LOCKED

1. **Zero Logic Rewrites:**
   - `evaluatePracticeAttempt()` in `src/engine/practiceEngine.ts` remains the single source of scoring truth.
   - `resolvePracticeContinuation()` in `src/engine/practiceContinuation.ts` remains the single source of continuation truth.
   - `applyPracticeAttempt()` in `src/engine/practiceEngine.ts` remains the immutable write transaction.
2. **Token Migration Contract:**
   - Eliminate all hardcoded hex strings:
     - Replace `#0D0F12` → `var(--background)` / `bg-background`
     - Replace `#14171D` → `var(--surface)` / `bg-surface`
     - Replace `#1B2028` → `var(--surface-elevated)` / `bg-surface-elevated`
     - Replace `#262D38` → `var(--border)` / `border-border`
     - Replace `#F1F5F9` → `var(--foreground)` / `text-foreground`
     - Replace `#8E98A8` → `var(--foreground-muted)` / `text-foreground-muted`
     - Replace `#E5A93C` / `#FFC665` → Cobalt action accent for defining CTA, or `var(--warning)` (`#D19A45`) for remediation warnings.
3. **Protected Files:**
   - `src/components/dashboard/TodayGuide.tsx` MUST NOT be touched, modified, staged, or deleted.

---

## 14. Acceptance Criteria for Subsequent Manufacturing Task — LOCKED

When manufacturing the Practice UI in the next task, the implementation will be accepted ONLY if:

- [ ] `PracticeView.tsx` is broken down into modular, maintainable components (`PracticeHeader.tsx`, `PracticeProvingStrip.tsx`, `RecommendedDrillHero.tsx`, `PracticeRemediationQueue.tsx`, `PracticeCategoryTabs.tsx`, `PracticeSessionGrid.tsx`).
- [ ] `PracticeRunnerModal.tsx` supports full question navigation, timer display, MCQ / SQL / Defense input ergonomics, hint toggling, and deterministic submission.
- [ ] All hardcoded legacy hex codes are migrated to semantic CSS tokens.
- [ ] Cobalt Electric Blue (`--action-accent-practice`) is applied strictly to primary drill actions.
- [ ] Active session handoffs advance `useSafeSession()` and cleanly route back to Today.
- [ ] Continuation recommendations from `resolvePracticeContinuation` are rendered with one-click actionability.
- [ ] All existing test suites (including `practiceEngine.test.ts`, `practiceContinuation.test.ts`, `weaknessRouter.test.ts`, `crossSubsystemHandoff.test.tsx`) pass 100% green.
- [ ] Production build (`npm run build`) and ESLint (`npm run lint`) succeed with zero errors.
- [ ] `src/components/dashboard/TodayGuide.tsx` remains completely untouched.

---

## 15. Explicit Non-Goals — LOCKED

The following are strictly out of scope for the Practice redesign:
- **NO runtime LLM / AI generated questions** — all questions must come from canonical static datasets.
- **NO backend, database, or cloud sync** — pure local-first architecture.
- **NO modifications to adaptive scoring weights or Leitner intervals**.
- **NO redesign of other pages** (Today, Roadmap, DSA, Preparation, Skills, Companies).
- **NO new external dependencies**.

---

**Specification Frozen By:** Antigravity AI  
**Next Step:** Practice UI Manufacturing Task
