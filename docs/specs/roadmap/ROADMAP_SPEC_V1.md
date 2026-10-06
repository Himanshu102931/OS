# PlacementOS Roadmap Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.  
**Baseline commit:** `d1f73bc` — `feat(today): redesign operational command center`  
**Date:** 2026-10-06  
**Scope:** `src/components/roadmap/*` (Roadmap page surface), integration with `src/components/guide/GuideDefinitions.ts`, and the Roadmap-related test suite.

> **Reading contract.**  
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Roadmap page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification preserves all existing engine functions, storage schemas, routing rules, prerequisite navigation logic, and test assertions. The only file this audit authorizes the agent to create is this specification document; UI implementation is deferred to Task 54.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Roadmap** page (`#/roadmap`) is the student's macro-trajectory navigational center. It answers the fundamental student question:
> *"Where am I in my 9-month placement preparation journey, what have I conquered, what is active right now, and what milestones lie between me and placement day?"*

### Core Design Principle
```
Trajectory → Current Position → Phase Progress → Domain/Skill Progress → Upcoming Milestones → Detail
```

The redesigned Roadmap must make it immediately obvious within **5 seconds**:
1. **Where I am now:** Calendar time elapsed and position in the placement cycle (Sep 2026 – May 2027).
2. **What phase I am in:** Phase 1 (Core Foundations) is active; future phases (Phases 2–4) are gated milestones.
3. **How far I have progressed:** Overall curriculum completion (macro) alongside current phase completion (micro).
4. **What is currently active:** Which modules and topics are in-progress and immediately unblocked.
5. **What is coming next:** Clear view of upcoming milestones without hunting through accordions.
6. **What is behind / ahead:** Completed phases/topics vs upcoming gated curriculum.
7. **How roadmap state connects to preparation and evidence:** Direct bidirectional bridges to the Preparation Hub, DSA bank, learning workspace, and canonical evidence traces.

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Route:** `roadmap`
- **Hash format:** `#/roadmap` (base) or `#/roadmap/<targetId>` (deep-link target)
- **Target resolution:** Handled by `resolveRoadmapTarget(targetId, topics, taskDefinitions)` in `src/engine/prerequisiteNavigation.ts`:
  - When `<targetId>` matches a `Topic.id` (e.g. `topic-dsa-arrays`), it opens the Topic Detail Drawer for that topic.
  - When `<targetId>` matches a `TaskDefinition.id` (e.g. `task-101`), it locates the task's parent topic, switches the inspected phase to that module's `phaseId`, expands the module, opens the drawer, and highlights the target card (`data-highlighted="true"`).

### 2.2 Component Hierarchy (Current)
```
AppShell (src/components/layout/AppShell.tsx)
└── RoadmapView (src/components/roadmap/RoadmapView.tsx) [656 lines]
    ├── Header & GuideTrigger (src/components/guide/GuideTrigger.tsx)
    ├── Phase Selector Tabs (phases.map)
    ├── Active Phase Summary Header (progress bar, task counts)
    ├── Domain Filter Bar (select dropdown, reset button)
    ├── Module Accordion List (phaseModules.map)
    │   └── Module Header (expand/collapse toggle, chevron, domain badge)
    │       └── Topic List (modTopics.map)
    │           └── Topic Card (click opens Topic Detail Drawer)
    ├── Topic Detail Drawer (activeTopic modal slide-over)
    │   ├── Drawer Header (module name, topic title, back button, Open Prep button, close button)
    │   ├── Topic Description
    │   └── Topic Tasks List (topicTasks.map)
    │       └── Task Card (title, description, lock explanation, evidence trace, workspace & complete buttons)
    │           ├── Locked Task Panel (explainTaskLock)
    │           │   ├── Blocker List (lock.blockers.map)
    │           │   ├── Dependency Trail (lock.dependencyTrail.map — Chain: A → B → C)
    │           │   ├── Why Cannot Start (lock.whyCannotStart)
    │           │   └── Prerequisite Actions (open-prereq-... buttons)
    │           └── EvidenceTracePanel (src/components/evidence/EvidenceTracePanel.tsx via buildRoadmapLockTrace)
    └── TaskLearningWorkspaceDrawer (src/components/common/TaskLearningWorkspaceDrawer.tsx)
```

### 2.3 Context & Data Dependencies
The component consumes `usePlacement()`:
| Property | Source | Purpose |
|---|---|---|
| `phases` | `PHASES` (`seedData.ts`) | 4 macro phases |
| `modules` | `MODULES` (`seedData.ts`) | 22 curriculum modules |
| `topics` | `TOPICS` (`seedData.ts`) | 33 curriculum topics |
| `taskDefinitions` | `TASK_DEFINITIONS` + custom | 44+ authored tasks |
| `taskProgress` | `appState.taskProgress` (`storageAdapter.ts`) | Task completion states and timestamps |
| `domains` | `DOMAINS` (`seedData.ts`) | 11 preparation domains |
| `skillStates` | `appState.skillStates` (`storageAdapter.ts`) | Topic evidence strength & freshness |
| `activePhase` | `PHASES[0]` in `PlacementContext.tsx` | Canonical active phase |
| `updateTaskState` | Context action | Updates task state and records evidence |
| `setRoute` | Context action | Changes hash route |
| `routeState` | Context state | Current route and targetId |
| `evidenceCatalog` | `useEvidenceCatalog()` hook | Provides catalog for evidence trace |
| `PREPARATION_TOPICS` | `preparationDataset.ts` | Bridge between Roadmap and Preparation Hub |

---

## 3. Current UX Audit — LOCKED

Evaluating `RoadmapView.tsx` against the 13 required audit criteria:

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-second comprehension** | **FAIL** | Page looks like a static textbook table of contents. No sense of a temporal journey or trajectory. Macro placement timeline is invisible. |
| **B. Visual hierarchy** | **POOR** | Monotonous dark boxes (`#14171D`) with identical 1px borders (`#262D38`). Flat visual weight across all sections. |
| **C. Information density** | **UNBALANCED** | Macro view hides topics inside closed accordions. Micro view inside drawer is severely cramped with nested lock chains and trace accordions. |
| **D. Current-position clarity** | **FAIL** | Confuses "inspected phase" with "active phase". Clicking Phase 3 labels it "Current Target Phase: Phase 3", even though Phase 1 is the actual active operational phase. |
| **E. Progress clarity** | **WEAK** | Only calculates task ratio for the selected phase (`X/Y Done`). Zero macro curriculum completion metrics across the 4-phase program. |
| **F. Phase clarity** | **POOR** | Phase start/end dates exist in data (`2026-09-01` to `2026-11-30`) but are nowhere to be seen on the page. Phases look like disconnected tabs. |
| **G. Next-action clarity** | **FAIL** | No "Up Next" or "Immediate Unblocked Focus". The student must hunt through modules and topics to find an actionable unlocked task. |
| **H. Evidence visibility** | **POOR** | Evidence traces are buried 3 levels deep (Page → Click Topic → Locate locked task in drawer → Expand trace panel). |
| **I. Deep-link clarity** | **FAIR** | Hash deep-linking functions correctly, but the canvas lacks visual context or breadcrumbs showing where the highlighted task sits in the macro journey. |
| **J. Responsive behavior** | **FAIR** | Phase tabs overflow horizontally (`overflow-x-auto`). Mobile drawer occupies 100vw but task lock trails wrap awkwardly. |
| **K. Accessibility** | **POOR** | Missing `aria-current="step"` on active phase; missing `aria-selected` on tabs; progress bar lacks full `role="progressbar"` ARIA attributes. |
| **L. Animation quality** | **CRUDE** | Only basic CSS `stagger-in` fade and progress width transition. No trajectory vector animation or state-transition motion. |
| **M. Visual consistency with Today** | **FAIL** | Completely desynchronized. Today uses Forest Green (`#0B100D`, `#111713`, `#2E8B62`, `#46B982`). Roadmap authors legacy slate (`#14171D`, `#262D38`), bronze `#E5A93C`, sky blue `#38BDF8`, and neon emerald `#10B981`. |

---

## 4. Canonical Data Sources — LOCKED

The Roadmap UI redesign must consume **only canonical data**. No synthetic metrics or second engines may be introduced.

### 4.1 Phases (`PHASES` in `src/data/seedData.ts`)
| Phase ID | Name | Date Range | Order | Canonical Description |
|---|---|---|---|---|
| `phase-1` | Core Foundations & Early Skills | `2026-09-01` – `2026-11-30` | 1 | Master core CS fundamentals, DSA baseline patterns, Python fluency, SQL queries, and basic interview pitches. |
| `phase-2` | Advanced Topics & Core CS Deep-Dive | `2026-12-01` – `2027-01-31` | 2 | Deep-dive into trees, graphs, DP, OS/CN interview theory, SOLID OOP principles, and topic walkthroughs. |
| `phase-3` | Intensive Mock Drills & Timed Assessments | `2027-02-01` – `2027-03-31` | 3 | Timed Online Assessments (OAs), structured technical mock rounds, speed aptitude, and project defense. |
| `phase-4` | Placement Sprint & Final Drive Sweep | `2027-04-01` – `2027-05-31` | 4 | Company-specific drive preparation, daily 4-Box Leitner reviews, HR clearances, and placement simulations. |

### 4.2 Modules (`MODULES` in `src/data/seedData.ts`)
- Exactly **22 modules** distributed across the 4 phases:
  - Phase 1: 12 modules (`mod-dsa-1`, `mod-dsa-2`, `mod-py-1`, `mod-sql-1`, `mod-dbms-1`, `mod-os-1`, `mod-cn-1`, `mod-oop-1`, `mod-apt-1`, `mod-comm-1`, `mod-proj-1`, `mod-mock-1`)
  - Phase 2: 7 modules (`mod-dsa-3`, `mod-dsa-4`, `mod-py-2`, `mod-sql-2`, `mod-os-2`, `mod-cn-2`, `mod-oop-2`)
  - Phase 3: 2 modules (`mod-dsa-5`, `mod-mock-2`)
  - Phase 4: 1 module (`mod-mock-3`)
- Each module provides: `id`, `phaseId`, `domainId`, `name`, `description`, `targetDate`, `order`.

### 4.3 Topics (`TOPICS` in `src/data/seedData.ts`)
- Exactly **33 topics** mapped to modules and domains.
- Each topic provides: `id`, `moduleId`, `domainId`, `name`, `description`, `targetDate`, `importance` (1–10 scale), optional `educationalMetadata`.

### 4.4 Tasks (`TASK_DEFINITIONS` in `src/data/seedData.ts`)
- Authoritative placement preparation tasks.
- Each task provides: `id`, `title`, `description`, `domainId`, `topicId`, `phaseId`, `estimatedMinutes`, `importance`, `taskType`, `prerequisiteTaskDefinitionIds`, optional `learningMetadata`.

### 4.5 Task Progress & State (`taskProgress` in storage)
- `TaskProgress`: `taskId`, `state` (`'not_started' | 'in_progress' | 'completed' | 'archived'`), `timeSpentMinutes`, `lastCompletedAt`, `updatedAt`.

### 4.6 Domains (`DOMAINS` in `src/data/seedData.ts`)
- 11 canonical domains: `dsa`, `python`, `sql`, `oop`, `dbms`, `os`, `cn`, `aptitude`, `communication`, `projects`, `interviews`.

### 4.7 Topic Skill States (`skillStates` in storage)
- `TopicSkillState`: `topicId`, `domainId`, `freshness` (`'fresh' | 'aging' | 'stale' | 'untested'`), `evidenceStrength` (0–100), `lastPracticedAt`.

---

## 5. Current Problems Summary — LOCKED

1. **Color Incoherence**: Authoring legacy hex codes (`#14171D`, `#262D38`, `#E5A93C`, `#FFC665`, `#10B981`, `#38BDF8`) that break the forest-green identity established on the Today page.
2. **Tab Disconnection**: Phases are rendered as detached tab pills without connecting visual trajectory vectors.
3. **Temporal Blindness**: No display of the placement calendar timeline (Sep 2026 – May 2027) or days elapsed.
4. **Active vs Selected Phase Confusion**: Inspecting Phase 2 incorrectly displays "Current Target Phase: Phase 2".
5. **No Next-Action Bridge**: Requires drilling down into accordions to find what to work on next.
6. **Domain Siloing**: Domain filtering is relegated to an unstyled `<select>` dropdown rather than providing a domain skill lens.

---

## 6. Frozen Visual Direction — LOCKED

### 6.1 Theme & Aesthetics
- **Theme**: Dark Forest Green — Calm Technical Command Center.
- **Surface Elevation**: Tonal planes with clean 1px hairline borders (`--border: #28352D`).
- **Accent Family**: Controlled forest green (`--primary: #2E8B62`, `--accent: #46B982`).
- **Secondary Warning Semantic**: Warm Amber (`--warning: #D19A45`) used **strictly** for locked prerequisite warnings, urgency, and due states. Never used for primary buttons or decorative backgrounds.
- **Zero Tolerance**: No neon glow, no gradients, no glassmorphism backdrop blurs, no pill-everything design, no decorative illustrations.

### 6.2 Immutable Semantic Palette
All redesigned Roadmap files must use **only** canonical tokens or semantic Tailwind utilities:

| Token | Hex Value | Role in Roadmap |
|---|---|---|
| `--background` | `#0B100D` | Roadmap canvas background |
| `--surface` | `#111713` | Milestone cards, panel containers |
| `--surface-muted` | `#161E19` | Subtle containers, inactive phase tracks |
| `--surface-elevated` | `#1B241F` | Elevated cards, active phase node, drawer surface |
| `--foreground` | `#E8F0E9` | Primary text, titles, milestone names |
| `--foreground-muted` | `#9AA99F` | Secondary descriptions, phase dates |
| `--foreground-subtle` | `#86958B` | Tertiary metadata, mono counters, chain arrows |
| `--border` | `#28352D` | Standard 1px container border |
| `--border-active` | `#3C4E43` | Active milestone border, focus outline |
| `--primary` | `#2E8B62` | Primary button fill, active progress bars |
| `--primary-hover` | `#3AA875` | Primary hover state |
| `--primary-foreground` | `#F3F7F3` | Text on primary button |
| `--accent` | `#46B982` | Trajectory vector glow, active step markers |
| `--accent-soft` | `rgba(70,185,130,0.12)` | Subtle active phase container tint |
| `--focus` / `--ring` | `#65D3A3` | High-contrast focus rings |
| `--success` | `#4CAF78` | Completed task status, 100% milestone badges |
| `--warning` | `#D19A45` | **Semantic Amber**: Prerequisite lock badges, lock warnings |
| `--danger` | `#D05A52` | Stale skill indicators, critical blockers |
| `--info` | `#6EA6C4` | Informational phase gate notices |

### 6.3 Typography Hierarchy
- **Font Families**: Inter for UI/labels; JetBrains Mono for counters, dates, task IDs, and chain arrows.
- **Tier 1 (Primary)**: `text-text-primary` (`--foreground` `#E8F0E9`) — Page `h1`, phase titles, module names.
- **Tier 2 (Secondary)**: `text-text-secondary` (`--foreground-muted` `#9AA99F`) — Module descriptions, lock reasons.
- **Tier 3 (Tertiary)**: `text-text-tertiary` (`--foreground-subtle` `#86958B`) — Mono metadata, date ranges, counts.

---

## 7. Information Architecture — LOCKED

The redesigned Roadmap page follows a strict 6-zone vertical hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: GLOBAL HEADER & TRAJECTORY MISSION                            │
│ Title + Macro Placement Calendar Position + Universal GuideTrigger     │
├────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: MACRO TRAJECTORY RAIL (PHASE TIMELINE STRIP)                  │
│ [Phase 1: Active] ───► [Phase 2: Upcoming] ───► [Phase 3] ───► [Phase 4] │
│ Global Progress Bar • Days Elapsed • Active Milestone Markers         │
├────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: PHASE WORKSPACE CONTROLLER                                    │
│ Selected Phase Banner • Inspection Switcher • Domain Filter Chips      │
├────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: IMMEDIATE UNBLOCKED FOCUS (NEXT ACTION STRIP)                 │
│ Top 2-3 Actionable Unblocked Tasks in Selected Phase                   │
├────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: PHASE CURRICULUM MILESTONES (MODULE & TOPIC GRID)              │
│ Milestone Module Cards with Integrated Topics, Freshness, & Progress  │
├────────────────────────────────────────────────────────────────────────┤
│ ZONE 6: TOPIC DETAIL & PREREQUISITE DRAWER (TEST CONTRACT PRESERVED)  │
│ Slide-over Drawer • Task Gating • Chain Navigation • Evidence Trace    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Visual Hierarchy — LOCKED

1. **Page Anchor (Highest Prominence)**: Macro Trajectory Rail connecting Phase 1 to Phase 4. Gives the user an immediate sense of scale and current location in the 9-month journey.
2. **Operational Core (Second Prominence)**: Selected Phase Header + Immediate Unblocked Focus Strip. Shows what to do right now.
3. **Structured Body (Third Prominence)**: Curriculum Milestone Cards (Modules) arranged in a responsive grid.
4. **Inspection Layer (Focused Prominence)**: Topic Detail Drawer for task-level execution, lock explanation, and evidence traceability.

---

## 9. Trajectory Model — LOCKED

### 9.1 The 4-Phase Progression Vector
The placement journey is rendered as a **continuous directional trajectory rail**:
- **Phase 1 (Sep 01 – Nov 30, 2026)**: Foundation Node. Displays `ACTIVE FOCUS` marker with pulse border when active.
- **Phase 2 (Dec 01 – Jan 31, 2027)**: Advanced Node. Locked gate glyph until Phase 1 activates completion criteria.
- **Phase 3 (Feb 01 – Mar 31, 2027)**: Intensive Drills Node. Timed OA milestone.
- **Phase 4 (Apr 01 – May 31, 2027)**: Placement Sprint Node. Final campus drive destination.

### 9.2 Node Visual States
1. **Completed Node**: Checked circle with `--success` (`#4CAF78`) fill, 100% completion badge, subdued connector line.
2. **Active Operational Node**: Highlighted container (`--surface-elevated`), luminous `--accent` (`#46B982`) dot indicator, active date window, real-time completion %.
3. **Upcoming / Gated Node**: Subdued surface (`--surface-muted`), `--border` border, small Lock icon, scheduled future date range.
4. **Inspected State**: When a user clicks a node to inspect its curriculum, the node receives an active boundary highlight (`--border-active`).

---

## 10. Current-Position Model — LOCKED

### 10.1 "You Are Here" Orientation
The UI must explicitly disambiguate:
- **Canonical Active Phase**: The student's current placement phase derived from context (`activePhase = PHASES[0]`).
- **Inspected Phase**: The phase currently selected for browsing in the workspace (`selectedPhaseId`).

### 10.2 Inspection Context Banner
If the user selects a phase other than the canonical active phase (e.g. clicking Phase 2 while in Phase 1):
- A discrete notice appears:
  > *"Viewing Phase 2 (Upcoming Milestone). Your active operational focus is Phase 1 (Core Foundations). [Jump to Active Phase]"*
- This prevents confusion between curriculum browsing and daily execution.

### 10.3 Placement Calendar Position
Derived purely from `todayDate` and the canonical phase dates:
- Displays: `"Day X of Phase 1 (Sep 01 – Nov 30, 2026)"`
- Macro timeline: `"Target Drive Season: April 2027"`

---

## 11. Phase Representation — LOCKED

Each phase in the Trajectory Rail renders:
1. **Phase Sequence Indicator**: e.g., `PHASE 01`, `PHASE 02`.
2. **Phase Name**: Full title from `Phase.name`.
3. **Calendar Window**: Formatted date range from `startDate` to `endDate` (e.g., `Sep 01 – Nov 30, 2026`).
4. **Completion Meter**: Calculated percentage:
   $$\text{Progress \%} = \text{round}\left(\frac{\text{Completed Tasks in Phase}}{\text{Total Tasks in Phase}} \times 100\right)$$
5. **Interactive Selection**: Clicking any phase sets `selectedPhaseId` and updates the workspace below.

---

## 12. Milestone Representation — LOCKED

Modules are represented as **Milestone Cards**:
- **Milestone Code**: `M-01`, `M-02`, etc., derived from order.
- **Domain Identity**: Canonical domain badge with `domain.shortName` and semantic styling.
- **Milestone Name & Description**: Clear typography with 2-line description clamp.
- **Target Milestone Date**: Rendered when `targetDate` exists on the module.
- **Progress Gauge**: Clean segmented progress bar showing `completedTasks / totalTasks`.
- **Integrated Topic Rows**: Direct listing of topics inside the module with completion state and freshness badges.
- **Click Affordance**: Clicking any topic directly opens the Topic Detail Drawer.

---

## 13. Progress Representation — LOCKED

The Roadmap renders **two complementary progress metrics**:
1. **Macro Curriculum Progress (Global)**:
   $$\text{Macro \%} = \text{round}\left(\frac{\text{Total Completed Tasks across all Phases}}{\text{Total Authoritative Tasks across all Phases}} \times 100\right)$$
   Displayed in the Global Header summary.
2. **Micro Phase Progress (Selected Phase)**:
   $$\text{Phase \%} = \text{round}\left(\frac{\text{Completed Tasks in Selected Phase}}{\text{Total Tasks in Selected Phase}} \times 100\right)$$
   Displayed on the Phase Milestone Card and Phase Header.

---

## 14. Domain/Skill Representation — LOCKED

### 14.1 Quick Domain Filter
Replaces the crude `<select>` dropdown with a sleek, accessible **Domain Filter Strip**:
- Horizontal scrollable row of domain chips: `All Domains` + individual domains present in the phase.
- Each chip displays the domain short name and the count of uncompleted tasks.
- Active chip is highlighted with `--surface-elevated` and `--border-active`.

### 14.2 Topic Freshness Badges
Topics inside modules display real skill states from `skillStates[topic.id]`:
- `fresh`: `--accent` (`#46B982`) — Practiced within 7 days.
- `aging`: `--warning` (`#D19A45`) — Practiced 8–14 days ago.
- `stale`: `--danger` (`#D05A52`) — Inactive >14 days; review needed.
- `untested`: `--foreground-subtle` (`#86958B`) — No practice evidence recorded.

---

## 15. Evidence Connection — LOCKED

The Roadmap preserves 100% of the evidence integration:
1. **Task Lock Evidence Trace**: Inside the Topic Detail Drawer, locked tasks render the `EvidenceTracePanel` populated by `buildRoadmapLockTrace(lock, task.id, task.title, evidenceCatalog)`.
2. **Bidirectional Preparation Hub Bridge**: For topics mapped in `PREPARATION_TOPICS`, the drawer renders the `Open Preparation` button (`setRoute('preparation', linkedPrepTopic.id)`).
3. **Task Completion Evidence Recording**: Clicking `Complete` invokes `updateTaskState(taskId, 'completed')`, which triggers canonical evidence logging and EMA skill updates via `applyTaskStateUpdate`.

---

## 16. Navigation & Deep-Link Behavior — LOCKED

The deep-link contract tested by `prerequisiteNavigationView.test.tsx` and `crossSubsystemHandoff.test.tsx` is **byte-for-byte preserved**:

### 16.1 Deep Link Handling
1. On mount and on hash change, `routeState.targetId` is read when `routeState.route === 'roadmap'`.
2. `resolveRoadmapTarget(routeTargetId, topics, taskDefinitions)` resolves the target:
   - If target is a Topic ID: sets `activeTopic`, selects that topic's phase, and expands the module.
   - If target is a Task ID: sets `activeTopic` to parent topic, selects that phase, expands module, and sets `highlightedTaskId = task.id`.

### 16.2 Prerequisite Chain Drill-Down
- Inside the drawer, locked tasks display the compact dependency trail (`Chain: A → B → C`).
- Clicking an upstream prerequisite button calls `openRoadmapTarget(step.taskId, { targetId: t.id, label: t.title })`.
- Pushes the return target to `returnStack`.
- Sets hash to `#/roadmap/<upstreamTaskId>`.
- Drawer smoothly transitions to the upstream topic/task.
- Renders the `Back to <label>` button (`data-testid="return-to-target"`).
- Clicking `return-to-target` pops the stack and navigates back to the original downstream target.

---

## 17. Animation & Motion Specification — LOCKED

All animations are subtle, restrained, and functional:
- **Trajectory Line Transition**: Progress fills transition smoothly (`transition-all duration-500 ease-out`).
- **Active Node Pulse Indicator**: A subtle 2.5s breathing border on the active phase indicator (`opacity: 0.4` to `0.85`).
- **Drawer Slide Transition**: Smooth right-to-left slide using CSS `transform` (`transition-transform duration-300 ease-in-out`).
- **Prefers Reduced Motion**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## 18. Responsive Specification — LOCKED

The Roadmap must display flawlessly across 5 target viewports without horizontal page scroll:

| Viewport | Trajectory Rail | Module Layout | Topic Detail Drawer |
|---|---|---|---|
| **1440 × 900 (Large Desktop)** | 4-node horizontal rail with full date ranges and metadata | 2-column or 3-column milestone grid | Right slide-over panel, `max-w-lg` (512px) |
| **1280 × 800 (Standard Desktop)** | 4-node horizontal rail with compact captions | 2-column milestone grid | Right slide-over panel, `max-w-md` (448px) |
| **1024 × 768 (Tablet Landscape)** | 4-node horizontal rail with truncated date labels | 2-column milestone grid | Right slide-over panel, `max-w-md` (448px) |
| **768 × 1024 (Tablet Portrait)** | 2×2 grid or compact horizontal stepper | 1-column stacked milestone cards | Full-height side sheet, `max-w-md` (448px) |
| **375 × 667 (Mobile Phone)** | Compact segmented phase track with active phase indicator | 1-column stacked cards with touch-friendly targets | Fullscreen modal overlay (`w-full`), back button at top |

---

## 19. Accessibility Specification — LOCKED

1. **Semantic HTML**:
   - Page wrapped in `<main>` with descriptive `h1`.
   - Trajectory rail uses `<nav aria-label="Placement Phases Trajectory">`.
   - Phase tabs use `<button>` with `role="tab"`, `aria-selected="true/false"`, and `aria-current="step"` on the canonical active phase.
2. **Keyboard Navigation**:
   - Every phase selector, module toggle, topic card, and drawer action is focusable via keyboard (`tabIndex={0}`).
   - High-contrast focus rings: `focus-visible:ring-2 focus-visible:ring-[#65D3A3] focus-visible:outline-none`.
   - `Escape` key closes the Topic Detail Drawer and returns focus to the trigger.
3. **Non-Color Indicators**:
   - Completed milestones include checkmark icons (`✓`).
   - Locked tasks include lock icons (`🔒`) and explicit `"Locked"` text.
   - Active phases include explicit `"Active Focus"` text badges.
4. **Progress Bars**:
   - `role="progressbar"`, `aria-valuenow={percent}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Phase progress"`.

---

## 20. Performance Constraints — LOCKED

- **Zero Network Calls**: Pure local state and offline execution.
- **Pure Derived Memoization**: Phase progress, module task counts, and lock explanations memoized with `useMemo`.
- **Render Budget**: Target <16ms per frame during tab switching or drawer open.

---

## 21. Architectural Guardrails — LOCKED

The implementer must strictly observe the following guardrails:
1. **NO New Engines**: Do NOT create a new roadmap engine, progress calculator, or scoring algorithm. All computations must use existing canonical data and `src/engine/prerequisiteNavigation.ts`.
2. **NO Storage Schema Changes**: Do NOT alter `AppStorageState` or `StorageAdapter`.
3. **NO Business Logic in UI**: Recommendation and locking logic stays inside pure functions.
4. **NO Backend or Cloud Dependencies**: PlacementOS remains zero-backend local-first.
5. **DO NOT Touch Protected Files**: `src/components/dashboard/TodayGuide.tsx` must remain untouched, unstaged, and uncommitted.

---

## 22. Explicit Non-Goals — LOCKED

The following are explicitly out of scope for the Roadmap redesign:
- **Non-Goal 1**: Re-architecting the 4 phases or modifying phase dates in `seedData.ts`.
- **Non-Goal 2**: Adding new curriculum topics or tasks.
- **Non-Goal 3**: Replacing hash routing with browser history routing.
- **Non-Goal 4**: Adding interactive drag-and-drop roadmap restructuring.
- **Non-Goal 5**: Rewriting `TaskLearningWorkspaceDrawer.tsx` (it remains a shared common component).

---

## 23. Acceptance Criteria — LOCKED

A successful implementation must satisfy all of the following criteria:

| ID | Category | Requirement |
|---|---|---|
| **AC-01** | Visual Palette | 100% of colors in `src/components/roadmap/` author canonical forest green semantic tokens (`var(--surface)`, `var(--primary)`, `var(--accent)`, `var(--border)`, etc.). Zero legacy hex literals (`#14171D`, `#262D38`, `#E5A93C`, `#10B981`, `#38BDF8`). |
| **AC-02** | 5-Second Comprehension | Displays macro placement trajectory (Sep 2026 – May 2027), active phase, days elapsed, and overall curriculum completion above the fold. |
| **AC-03** | Trajectory Rail | 4 connected phase nodes with order, dates, completion %, and distinct states (`active`, `completed`, `upcoming`, `selected`). |
| **AC-04** | Active Position Clarity | Clear distinction between canonical active phase (Phase 1) and currently inspected phase, with return affordance if viewing upcoming phases. |
| **AC-05** | Next Action Strip | Immediate unblocked focus section displaying top unblocked tasks in the phase with direct action triggers. |
| **AC-06** | Milestone Module Cards | Modules rendered as structured milestone blocks with domain badges, target dates, progress meters, and topic lists. |
| **AC-07** | Test Contracts Preserved | All existing test selectors and data-testids byte-preserved: `topic-detail-drawer`, `task-card-${id}`, `prereq-warning-${id}`, `complete-btn-${id}`, `task-lock-${id}`, `lock-blocker-${id}-${i}`, `lock-why-${id}`, `prereq-trail-${id}`, `trail-step-${id}-${stepId}`, `open-prereq-${id}-${targetId}`, `return-to-target`, `data-highlighted="true"`. |
| **AC-08** | Deep-Link Navigation | Deep links (`#/roadmap/<targetId>`) restore active topic, phase selection, module expansion, and task highlighting as asserted in `prerequisiteNavigationView.test.tsx`. |
| **AC-09** | Guide Overlay Integration | Universal `GuideTrigger route="roadmap"` functions and tour steps in `GuideDefinitions.ts` align with roadmap elements. |
| **AC-10** | Zero Regressions | Full test suite passes (`npm test`), TypeScript builds cleanly (`npm run build`), and ESLint passes (`npm run lint`). |

---

## 24. Manufacturing Plan — LOCKED

The implementation of this specification in Task 54 will execute in 4 discrete steps:

### Step 1: Sub-component Extraction & Modular Architecture
Split the monolithic 656-line `RoadmapView.tsx` into clean, testable sub-components in `src/components/roadmap/`:
- `RoadmapHeader.tsx`: Title, placement countdown, macro completion readout, `GuideTrigger`.
- `RoadmapTrajectoryRail.tsx`: 4-phase horizontal vector rail, phase nodes, dates, progress gauges.
- `RoadmapUnblockedFocus.tsx`: Immediate actionable tasks strip.
- `RoadmapMilestoneCard.tsx`: Individual module card with domain badge, progress, and topic rows.
- `RoadmapTopicDrawer.tsx`: Topic detail drawer preserving all lock explanation, prerequisite navigation, and evidence trace test contracts.
- `RoadmapView.tsx`: Main coordinator assembling the layout and managing deep-link state.

### Step 2: Forest Green Token Migration
Replace all hardcoded legacy hex codes with canonical semantic Tailwind classes (`bg-surface`, `bg-surface-elevated`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `bg-primary`, `text-accent`, `border-warning`, etc.).

### Step 3: Deep-Link & Test Contract Verification
Verify that all 45 roadmap-specific tests in:
- `src/test/roadmapPrereqAndDsaTimezone.test.tsx`
- `src/test/prerequisiteNavigationView.test.tsx`
- `src/test/evidenceTraceView.test.tsx`
- `src/test/crossSubsystemHandoff.test.tsx`
continue to pass with zero test alterations.

### Step 4: Full Suite & Build Verification
Execute `npm test`, `npm run lint`, and `npm run build` to confirm full repository integrity.
