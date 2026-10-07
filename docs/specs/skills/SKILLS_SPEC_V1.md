# PlacementOS Skills Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.  
**Baseline commit:** `ea30658` — `feat(practice): redesign tactical assessment workspace`  
**Date:** 2026-10-07  
**Scope:** `src/components/skills/*` (Skills Hub View, Domain Summary Grid, Topic Evidence Ledger, Evidence Traceability Drawer, Skill Override Modal), integration with `PlacementContext.tsx`, `skillsEngine.ts`, `evidenceTrace.ts`, and the Skills test suite.

> **Reading contract.**  
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Skills page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`skillsEngine.ts`, `evidenceTrace.ts`, `reviewScheduler.ts`, `weaknessRouter.ts`), storage schemas, routing contracts, evidence scoring, and test assertions. The only file authorized in this task is this specification document; UI implementation is deferred to the subsequent manufacturing task.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Skills Subsystem** (`#/skills`) is the student's **Verification Matrix & Competence Ledger**. It answers the fundamental student questions:
> *"Where do I actually stand across all 11 placement domains? What objective evidence supports my proficiency ratings in DSA, Python, SQL, Core CS, Projects, and Communication? Is my knowledge fresh or decaying due to inactivity? What is my single biggest competence gap, and what exact action will prove or restore mastery?"*

### Core Design Principle
```
Macro Competence Strip → Dominant Primary Gap Hero → 11-Domain Readiness Matrix → Topic Evidence Ledger → Deep Causal Traceability Drawer → Deterministic Action Handoffs
```

The redesigned Skills page must make it immediately obvious within **5 seconds**:
1. **What Skills is for:** Authoritative verification matrix and diagnostic competence ledger tracking demonstrated evidence across 11 placement domains.
2. **What my strongest and weakest skills are:** Instant macro visibility into top mastered topics vs critical at-risk competence gaps.
3. **What I should improve right now:** The single highest-importance, lowest-readiness topic surfaced in the Primary Gap Hero.
4. **Why PlacementOS believes this:** Direct causal explanation linking completed roadmap tasks, DSA Leitner Box states, practice drill scores, and freshness decay.
5. **How fresh my evidence is:** Clear distinction between fresh ($\le 7\text{d}$), aging ($8..14\text{d}$), stale ($>14\text{d}$), and untested states with explicit decay explanations.
6. **What I should do next:** One-click deterministic routing to the exact canonical workspace (Preparation lesson, DSA problem, or Practice drill) to generate verified evidence.

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Base Route:** `#/skills` (Full Competence Matrix & Ledger).
- **Target Route (Deep-Link):** `#/skills/<topicId>` (e.g. `#/skills/topic-dsa-arrays`, `#/skills/topic-sql-joins`, `#/skills/topic-dbms-transactions`).
- **Target Resolution in SkillsView:**
  - When `routeState.targetId` is present, `SkillsView` locates the target `TopicReadiness` and automatically opens `EvidenceTraceabilityDrawer` for that topic.
  - Selecting a domain filter deep-links into filtered topic views.
  - Handoffs from Skills:
    - Task handoff $\rightarrow$ `setRoute('roadmap', taskId)`
    - DSA handoff $\rightarrow$ `setRoute('dsa', problemId)`
    - Preparation handoff $\rightarrow$ `setRoute('preparation', prepTopicId)`
    - Practice handoff $\rightarrow$ `setRoute('practice', sessionId)`

### 2.2 Component Hierarchy (Current)
```
AppShell (src/components/layout/AppShell.tsx)
└── SkillsView (src/components/skills/SkillsView.tsx) [377 lines]
    ├── Header & GuideTrigger (route="skills")
    │   └── View Mode Switcher (Topics Matrix vs Domains Breakdown)
    ├── Hero Overview Card (Overall Placement Readiness %, 3 status pills, progress bar)
    ├── [If ViewMode === 'domains']:
    │   └── DomainSummaryCards (src/components/skills/DomainSummaryCards.tsx) [124 lines]
    │       └── Domain Card for each domain (11 domains with status icon & progress)
    ├── [If ViewMode === 'matrix']:
    │   ├── Filter & Search Bar (Domain dropdown, Status dropdown, text search)
    │   └── Topics List (20+ topic rows with status badge, evidence %, freshness, and modal triggers)
    ├── EvidenceTraceabilityModal (src/components/skills/EvidenceTraceabilityModal.tsx) [340 lines]
    │   ├── Domain, topic title, readiness status, evidence classification
    │   ├── Metrics Grid (Evidence Strength, Level Progress, Freshness, Last Activity)
    │   ├── What Caused This Readiness Rating? (Task & DSA evidence counts)
    │   ├── Supporting Evidence Timeline (Evidence logs list with deep-link navigation)
    │   └── Gap Analysis & Recommended Action CTA
    └── SkillOverrideModal (src/components/skills/SkillOverrideModal.tsx) [117 lines]
        ├── Slider for Evidence Strength (0 - 100)
        ├── Select for Freshness Classification (fresh, aging, stale, untested)
        └── "Save Skill Rating" Button -> updateSkillState(updated)
```

### 2.3 Canonical Data Sources & State Slices
| Entity | Canonical Source | Purpose & Storage Contract |
|---|---|---|
| **Domains & Topics** | `DOMAINS`, `TOPICS` (`src/data/seedData.ts`) | Authoritative static master catalog of 11 domains and curriculum topics with importance ($1..10$). |
| **Topic Skill States** | `skillStates` (`appState.skillStates` in `StorageAdapter.ts`) | Persistent topic-level evidence strength ($0..100$), freshness (`untested`, `fresh`, `aging`, `stale`), and manual overrides. |
| **Evidence Logs** | `evidenceLogs` (`appState.evidenceLogs` in `StorageAdapter.ts`) | Append-only log of verified evidence items written by task completions, DSA attempts, and practice sessions. |
| **Roadmap Task Progress** | `taskProgress` (`appState.taskProgress`) | Task completion states providing structural curriculum evidence. |
| **DSA Progress & Attempts** | `dsaProgress`, `dsaAttempts` (`appState.dsaProgress`, `appState.dsaAttempts`) | Leitner Box states ($1..4$), independent passes, and remediation flags. |
| **Company Overlays** | `companyOverlays` (`appState.companyOverlays`) | Target company requirements driving target level escalation ($\ge \text{Level 4}$). |
| **Readiness Engine** | `calculateTopicReadiness()`, `calculateDomainReadinessList()` (`skillsEngine.ts`) | Pure deterministic computation of evidence scores, level progression, decay multipliers, and gap analysis. |
| **Traceability Engine** | `buildSkillEvidenceTrace()`, `resolveTraceDestination()` (`evidenceTrace.ts`) | Signal $\rightarrow$ Why $\rightarrow$ Evidence $\rightarrow$ Source resolution with honest deep-link verification. |

---

## 3. Current UX Audit — LOCKED

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-Second Comprehension** | **POOR** | Page opens with an abstract macro number ("Overall Placement Readiness: 32%") and an unorganized list of 20+ topic rows. User cannot identify their top strengths or critical gaps without reading the entire list. |
| **B. Visual Hierarchy** | **MEDIOCRE** | Extensive use of legacy hardcoded colors (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`, `#10B981`, `#F59E0B`, `#E55353`, `#4EAE79`). Lacks unified tonal elevation and clean obsidian surfaces. |
| **C. View Disconnection** | **POOR** | The toggle between "Topics Matrix" and "Domains Breakdown" forces an either/or choice, hiding the broader domain distribution when inspecting topics. |
| **D. Primary Action Dominance** | **FAIL** | No prominent primary action hero. 20+ identical "Traceability" and "Override" buttons compete with each other. |
| **E. Manual Override Prominence** | **CONFUSING** | "Override" button is rendered on every row with equal prominence to "Traceability", confusing self-reported ratings with objectively derived evidence. |
| **F. Direct Workspace Execution** | **INCOMPLETE** | Topic rows only offer modal triggers. Users cannot directly launch a recommended DSA problem or preparation lesson without opening the traceability modal first. |
| **G. Responsive Layout** | **SUBOPTIMAL** | Topic rows squash text on tablet and mobile viewports (<768px). Traceability modal overflows vertically on small screens. |
| **H. Accessibility** | **INCOMPLETE** | Missing explicit `role="tablist"` / `aria-selected` attributes on domain filters, missing `aria-valuenow` on progress bars, missing visible focus rings. |

---

## 4. 5-Second Test Evaluation — LOCKED

| Question | Current Status | Redesign Resolution |
|---|---|---|
| **1. What are my strongest skills?** | Hard to find among 20+ rows. | Add a dedicated **Top Capabilities & Mastered Domains** summary card. |
| **2. What are my weakest skills?** | Buried in the list. | Introduce the **Primary Skill Gap Focus Hero** surfacing the #1 critical gap topic with plain-language rationale. |
| **3. How strong is my evidence?** | Only raw numbers ($0..100\%$) displayed. | Clear **Evidence Classification Badges** (*Demonstrated*, *Inferred*, *Insufficient*) paired with numeric strength. |
| **4. What should I improve next?** | Only shown inside the modal. | Prominent **"Strengthen Skill" / "Prove Competence"** Violet action CTA in the Hero section and on every ledger row. |
| **5. Why does PlacementOS believe this?** | Only visible after clicking "Traceability". | Compact inline causal summary on ledger rows + full slide-over **Traceability Drawer**. |

---

## 5. Visual Metaphor & Aesthetic System — LOCKED

### 5.1 Chosen Metaphor: "Verification Matrix & Competence Ledger"
The Skills page is an **instrument-grade competence ledger and verification radar**:
- **Clean Obsidian Planes:** Surface planes (`#0B100D`, `#111713`, `#161E19`, `#1B241F`) with 1px subtle boundary lines (`#28352D`).
- **Forest Green Brand Identity:** Canonical brand green (`#2E8B62`, `#46B982`, `#65D3A3`) reserved for verified evidence badges, mastered domains, and passing readiness states.
- **Controlled Page Action Accent (Violet Amethyst):** Dedicated high-contrast action accent (`#8B5CF6` / `#A78BFA` / `hsl(262, 83%, 58%)`) reserved strictly for the defining skill verification action ("Strengthen Skill", "Prove Competence", "Verify Topic Evidence").
- **Warm Bronze / Amber Warning (`#D19A45`):** Strictly reserved for stale/aging freshness warnings, at-risk readiness alerts, and company requirement gaps.
- **Chiseled Technical Structure:** Crisp typography (Inter for UI, JetBrains Mono for scores, levels, and evidence IDs), restrained radii (`0.375rem`), and flat technical card surfaces without decorative neon or arbitrary gradients.

---

## 6. Defining User Action & Action Accent — LOCKED

### 6.1 The One Defining Action: `"Strengthen Skill"` / `"Prove Competence"`
On the Skills page, the defining user mission is to **bridge identified competence gaps by executing deliberate practice or study to generate verified evidence**.

### 6.2 Proposed Page Action Accent: Violet Amethyst
```css
--action-accent-skills: #8B5CF6;
--action-accent-skills-hover: #A78BFA;
--action-accent-skills-subtle: rgba(139, 92, 246, 0.12);
--action-accent-skills-border: rgba(139, 92, 246, 0.35);
--action-accent-skills-ring: #C4B5FD;
```
- **Rationale:**
  - Distinct from Sky Cyan (Today), Emerald Jade (Roadmap), Precision Mint (DSA), Golden Amber (Preparation), and Cobalt Electric Blue (Practice).
  - Embodies diagnostic insight, competence ledger authority, and verified mastery.
  - High contrast on obsidian dark canvas (passing WCAG AAA 7:1 for text with `#C4B5FD` / `#DDD6FE`).
  - Never used as a second page theme; strictly applied to primary action CTAs, active gap highlight, and drawer execution controls.

---

## 7. Information Architecture & Page Zones — LOCKED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: SKILLS HEADER & COMPETENCE PROVING STRIP                            │
│ • Page Title & Placement Objective + GuideTrigger                           │
│ • 4-Metric Proving Strip: Overall Placement Readiness %, Ready Topics Count, │
│   At-Risk/Aging Gaps Count, Total Verified Evidence Records                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: PRIMARY SKILL GAP FOCUS & PROVING ACTION HERO                       │
│ • Top Critical Gap Topic (Highest Importance + Lowest Evidence Strength)     │
│ • Level Progress (Current Level vs Target Level 0..5), Target Company Match │
│ • Plain-Language Gap Rationale & Decay Explanation                          │
│ • Primary Violet CTA: "Strengthen Skill" [Routes to Prep/DSA/Practice]      │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: 11-DOMAIN COMPETENCE MATRIX                                         │
│ • High-Density Grid of all 11 Placement Domains                             │
│ • Domain readiness %, readiness status badge (Ready / On Track / At Risk)    │
│ • Quick domain filter toggle with topic counts and top gap topic tag        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: TOPIC EVIDENCE LEDGER & FILTERABLE MATRIX                           │
│ • Filter Bar (Domain dropdown, Readiness Status, Freshness, Search query)   │
│ • Responsive Topic Cards / Ledger Rows:                                     │
│   - Topic name & Domain badge                                               │
│   - Capability Level Meter (0..5) vs Target Level                           │
│   - Evidence Strength % & Classification (Demonstrated / Inferred)          │
│   - Freshness badge (Fresh / Aging / Stale / Untested)                      │
│   - Quick Actions: "Trace Evidence" & "Prove / Practice"                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: EVIDENCE TRACEABILITY DRAWER & OVERRIDE WORKBENCH                   │
│ • Slide-over Drawer with Focus Trap & Full Screen Toggle                    │
│ • Complete Causal Breakdown (Roadmap Tasks, DSA Leitner Boxes, Logs)        │
│ • Evidence Timeline with direct source deep links                           │
│ • Explicit Manual Rating Override Tab/Workbench                             │
│ • Direct "Execute Target Action" CTA                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Zone Details

#### Zone 1: Skills Header & Competence Proving Strip
- **Header:** Title *"Skills Matrix & Evidence Readiness"* with subtitle *"Authoritative topic evidence strength calculated from completed tasks, DSA attempts, and freshness decay."*
- **4-Metric Proving Strip:**
  1. *Overall Placement Readiness:* Weighted average evidence score across all topics ($0..100\%$).
  2. *Ready Topics:* Count of topics with `readinessStatus === 'ready'` (e.g. `12 / 28 Ready`).
  3. *At-Risk / Aging Gaps:* Count of topics with `readinessStatus === 'at_risk'` or `freshness === 'stale'`.
  4. *Verified Evidence Items:* Total count of contributing evidence records across tasks, DSA, and logs.

#### Zone 2: Primary Skill Gap Focus & Proving Action Hero (Dominant Focus)
- Deterministically identifies the #1 top priority skill gap:
  - Highest `topic.importance` ($\ge 7$) with `evidenceStrength < targetThreshold` or `freshness === 'stale'`.
- Displays:
  - Topic title, domain tag, importance rating ($X/10$), target company requirement badge (if applicable).
  - Level progress visualizer (e.g. `Level 2 / 5 (Target Level 4)`).
  - Plain-language gap explanation: *"Currently Level 2/5 (40% evidence). Target is Level 4/5. Need +27% additional evidence."*
  - Primary Action CTA: `"Strengthen Skill"` or `"Prove Competence"` using Violet action accent, executing `recommendedAction` (routes directly to Preparation, DSA, or Practice).

#### Zone 3: 11-Domain Competence Matrix
- Renders all 11 canonical placement domains:
  1. `dsa` — Data Structures & Algorithms
  2. `python` — Python & Scripting
  3. `sql` — SQL & Database Queries
  4. `oop` — Object-Oriented Programming
  5. `dbms` — Database Management Systems
  6. `os` — Operating Systems
  7. `cn` — Computer Networks
  8. `aptitude` — Quantitative & Logical Aptitude
  9. `communication` — Communication & Behavioral
  10. `projects` — System & Web Projects
  11. `mock_interviews` — Mock Interview & Defense
- Card metrics: Domain short name, icon, overall readiness $\%$, status badge (*Ready*, *On Track*, *At Risk*, *Needs Baseline*), topic count, and top gap topic.
- Clicking a domain card filters the Topic Evidence Ledger in Zone 4.

#### Zone 4: Topic Evidence Ledger & Filterable Matrix
- **Filters:**
  - Search input (topic name, domain name, description).
  - Domain filter dropdown (All Domains + 11 individual domains).
  - Readiness status filter (All Statuses, Ready, On Track, At Risk, Needs Baseline).
  - Freshness filter (All Freshness, Fresh, Aging, Stale, Untested).
- **Topic Row / Card Specifications:**
  - Topic name, domain badge, and importance score ($X/10$).
  - Level progression pill (`L2 / L4`).
  - Evidence strength percentage ($0..100\%$) and classification chip (*Demonstrated*, *Inferred*, *Insufficient*).
  - Freshness badge (*Fresh*, *Aging*, *Stale*, *Untested*) with days since last practiced.
  - Quick action buttons:
    - *"Trace Evidence"* $\rightarrow$ Opens Evidence Traceability Drawer for that topic.
    - *"Prove Skill"* $\rightarrow$ Directly launches the topic's recommended action (DSA problem, Roadmap task, or Prep lesson).

#### Zone 5: Evidence Traceability Drawer & Override Workbench
- Slide-over drawer / modal dialog accessible via any "Trace Evidence" trigger or deep link.
- **Traceability View:**
  - Causal Breakdown: Task completions ($X/Y$), DSA Leitner Box distribution (Box 1..4), evidence log count.
  - Supporting Evidence Timeline: Chronological list of concrete records with exact score contribution ($+X\%$), timestamp, and verified source deep-link button.
  - Gap Analysis: Target requirement breakdown and recommended remediation path.
  - "Execute Action" primary Violet button.
- **Manual Rating Override Workbench (Dedicated Sub-Panel):**
  - Explicit warning: *"Manual rating override modifies local calibration and is intended only for self-attested prior mastery."*
  - Slider for Evidence Strength ($0..100$).
  - Dropdown for Freshness Classification.
  - "Save Skill Rating" button invoking `updateSkillState()`.

---

## 8. Epistemic Evidence & Readiness Model — LOCKED

### 8.1 Distinct Concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CAPABILITY LEVEL (0..5)                                                  │
│    • Target placement competence benchmark derived from importance &        │
│      company requirements.                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. EVIDENCE STRENGTH (0..100%)                                              │
│    • Concrete proof accumulated from completed tasks, DSA boxes, and drills,│
│      multiplied by freshness decay factor.                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. EVIDENCE CLASSIFICATION (Demonstrated vs Inferred vs Insufficient)      │
│    • Demonstrated: Direct verified work (tasks, DSA attempts, drill scores) │
│    • Inferred: Sibling domain progress or general curriculum baseline       │
│    • Insufficient: Zero recorded proof                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. FRESHNESS STATE (Fresh vs Aging vs Stale vs Untested)                   │
│    • Fresh: Practiced within 7 days (1.0x multiplier)                       │
│    • Aging: Practiced 8–14 days ago (0.9x decay multiplier)                 │
│    • Stale: No practice for >14 days (0.75x decay multiplier)               │
│    • Untested: No baseline practice recorded                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. READINESS STATUS (Ready vs On Track vs At Risk vs Needs Baseline)        │
│    • Ready: Evidence strength meets or exceeds target threshold             │
│    • On Track: Active progress with partial evidence                        │
│    • At Risk: Evidence strength below target or decayed to stale            │
│    • Needs Baseline: Zero demonstrated evidence                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Motion System & Micro-Interactions — LOCKED

### 9.1 Signature Motion: "Competence Growth Trace & Signal Sweep"
- **Signal Sweep:** Subtle horizontal traveling energy line (`skills-signal-sweep`) across the top border of the Primary Skill Gap Focus Hero.
- **Evidence Pulse:** Gentle fade and scale feedback (`evidence-update`) when evidence scores change or overrides are saved.
- **Drawer Slide:** Hardware-accelerated slide-in animation (`skills-drawer-slide`) for the Evidence Traceability Drawer.
- **Reduced Motion Support:** All animations strictly collapse to 0ms when `prefers-reduced-motion: reduce` is active.

```css
/* Signature Motion Tokens */
@keyframes skills-signal-sweep {
  0% { transform: translateX(-100%); opacity: 0; }
  20% { opacity: 0.85; }
  80% { opacity: 0.85; }
  100% { transform: translateX(350%); opacity: 0; }
}

.skills-signal-track {
  position: relative;
  overflow: hidden;
}

.skills-signal-beam {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 30%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(139, 92, 246, 0.15) 25%,
    rgba(139, 92, 246, 0.8) 50%,
    rgba(139, 92, 246, 0.15) 75%,
    transparent 100%
  );
  filter: blur(0.5px);
  animation: skills-signal-sweep 3.5s ease-in-out infinite;
  pointer-events: none;
  will-change: transform;
}

@keyframes skills-drawer-slide-in {
  from { transform: translateX(100%); opacity: 0.85; }
  to { transform: translateX(0); opacity: 1; }
}

.skills-drawer-slide {
  animation: skills-drawer-slide-in 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .skills-signal-beam { display: none !important; animation: none !important; }
  .skills-drawer-slide { animation: none !important; transform: none !important; }
}
```

---

## 10. Responsive Behavior & Breakpoints — LOCKED

| Viewport | Breakpoint | Layout Adaptations |
|---|---|---|
| **Desktop XL** | `1440px+` | Max container width `1400px`. 4-metric proving strip in 1 row. 4-column domain matrix. Ledger table view. Drawer width `600px`. |
| **Desktop / Laptop** | `1024px – 1439px` | 4-metric strip in 2x2 grid. 3-column domain matrix. Ledger table view. |
| **Tablet** | `768px – 1023px` | 2x2 metric strip. 2-column domain matrix. Topic cards stacked vertically. Drawer width `85vw`. |
| **Mobile** | `375px – 767px` | 1-column stacked layout. Compact metric pills. Domain matrix in 2-column compact tiles. Topic cards with prominent 1-touch actions. Drawer becomes full-screen bottom sheet. |

---

## 11. Accessibility Specifications — LOCKED

1. **Semantic Structure:**
   - Single `<h1>` for page header.
   - `<h2>` for major sections (Primary Gap Hero, Domain Competence Matrix, Topic Evidence Ledger).
   - `<h3>` for individual domain cards and topic titles.
2. **ARIA Contracts:**
   - Domain filter tabs / tiles: `role="tablist"`, each tile `role="tab"`, `aria-selected="true|false"`, `aria-controls="topic-ledger-panel"`.
   - Traceability Drawer: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="traceability-drawer-title"`.
   - Progress meters: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
3. **Keyboard Controls:**
   - `Tab` / `Shift+Tab` for sequential navigation.
   - `Escape` to close Traceability Drawer and Override Modal.
   - Visible focus ring on all interactive elements: `outline: 2px solid var(--focus, #65D3A3)`.
4. **Color Contrast:**
   - Text on dark background (`#0B100D`): `#E8F0E9` (13.5:1 ratio).
   - Secondary text: `#9AA99F` (6.2:1 ratio).
   - Violet action accent text: `#C4B5FD` / `#FFFFFF` on `#8B5CF6` (6.8:1 ratio).
   - Non-color status indicators: Every status state accompanied by explicit text labels and distinct Lucide icons (`ShieldCheck`, `TrendingUp`, `AlertTriangle`, `HelpCircle`).

---

## 12. Cross-Subsystem Handoffs & Deep-Link Preservation — LOCKED

1. **Skills $\rightarrow$ Roadmap Handoff:**
   - Clicking a task recommended action executes `setRoute('roadmap', taskId)`.
   - Roadmap opens `TaskLearningWorkspaceDrawer` for that exact task.
2. **Skills $\rightarrow$ DSA Handoff:**
   - Clicking a DSA recommended action executes `setRoute('dsa', problemId)`.
   - DSA opens `DSAAttemptModal` for that exact problem.
3. **Skills $\rightarrow$ Preparation Handoff:**
   - Clicking a preparation recommended action executes `setRoute('preparation', prepTopicId)`.
   - Preparation opens `TopicWorkspace` for that topic.
4. **Skills $\rightarrow$ Practice Handoff:**
   - Clicking a practice recommended action executes `setRoute('practice', sessionId)`.
   - Practice opens `PracticeRunnerModal` for that session.
5. **Traceability Source Navigation:**
   - Clicking any evidence timeline row with `destination.deepLink === true` navigates directly to the originating record.

---

## 13. Architecture Safety & Token Migration Guardrails — LOCKED

1. **Zero Logic Rewrites:**
   - `calculateTopicReadiness()` in `src/engine/skillsEngine.ts` remains the single source of readiness truth.
   - `calculateDomainReadinessList()` in `src/engine/skillsEngine.ts` remains the single source of domain aggregation truth.
   - `explainSkillFreshness()` in `src/engine/skillsEngine.ts` remains the single source of freshness explanation.
   - `buildSkillEvidenceTrace()` and `resolveTraceDestination()` in `src/engine/evidenceTrace.ts` remain the single source of traceability truth.
2. **Token Migration Contract:**
   - Eliminate all hardcoded hex strings:
     - Replace `#0D0F12` $\rightarrow$ `var(--background)` / `bg-background`
     - Replace `#14171D` $\rightarrow$ `var(--surface)` / `bg-surface`
     - Replace `#1B2028` $\rightarrow$ `var(--surface-elevated)` / `bg-surface-elevated`
     - Replace `#262D38` $\rightarrow$ `var(--border)` / `border-border`
     - Replace `#F1F5F9` $\rightarrow$ `var(--foreground)` / `text-foreground`
     - Replace `#8E98A8` $\rightarrow$ `var(--foreground-muted)` / `text-foreground-muted`
     - Replace `#E5A93C` $\rightarrow$ Violet action accent for defining CTA, or `var(--warning)` (`#D19A45`) for aging warnings.
3. **Protected Files:**
   - `src/components/dashboard/TodayGuide.tsx` MUST NOT be touched, modified, staged, or deleted.

---

## 14. Acceptance Criteria for Subsequent Manufacturing Task — LOCKED

When manufacturing the Skills UI in the subsequent task, the implementation will be accepted ONLY if:

- [ ] `SkillsView.tsx` is broken down into modular, maintainable components (`SkillsHeader.tsx`, `SkillsProvingStrip.tsx`, `PrimaryGapHero.tsx`, `DomainMatrixGrid.tsx`, `TopicEvidenceLedger.tsx`, `EvidenceTraceabilityDrawer.tsx`).
- [ ] All hardcoded legacy hex codes are migrated to semantic CSS tokens.
- [ ] Violet Amethyst (`--action-accent-skills`) is applied strictly to primary skill verification actions.
- [ ] Primary Gap Hero prominently spotlights the #1 critical competence gap with a one-click "Strengthen Skill" CTA.
- [ ] 11-domain competence matrix provides rapid filtering and domain readiness overviews.
- [ ] Topic Evidence Ledger supports multi-factor filtering (search, domain, status, freshness) and direct action execution.
- [ ] Evidence Traceability Drawer presents full causal breakdowns and verified deep-links.
- [ ] Manual override workflow is isolated with clear self-reported audit warnings.
- [ ] All existing test suites (including `skillsEngine.test.ts`, `skillEvidenceSource.test.tsx`, `evidenceTrace.test.ts`, `evidenceTraceView.test.tsx`, `crossSubsystemHandoff.test.tsx`) pass 100% green.
- [ ] Production build (`npm run build`) and ESLint (`npm run lint`) succeed with zero errors.
- [ ] `src/components/dashboard/TodayGuide.tsx` remains completely untouched.

---

## 15. Explicit Non-Goals — LOCKED

The following are strictly out of scope for the Skills redesign:
- **NO runtime LLM / AI generated skill assessments**.
- **NO backend, database, or cloud sync** — pure local-first architecture.
- **NO modifications to readiness scoring weights or decay intervals**.
- **NO redesign of other pages** (Today, Roadmap, DSA, Preparation, Practice, Companies).
- **NO new external dependencies**.

---

## 16. Manufacturing Sequence

1. **Step 1: Component Decomposition**
   - Create `src/components/skills/SkillsHeader.tsx`
   - Create `src/components/skills/SkillsProvingStrip.tsx`
   - Create `src/components/skills/PrimaryGapHero.tsx`
   - Create `src/components/skills/DomainMatrixGrid.tsx`
   - Create `src/components/skills/TopicEvidenceLedger.tsx`
   - Upgrade `src/components/skills/EvidenceTraceabilityDrawer.tsx`
2. **Step 2: CSS Token Integration**
   - Add `--action-accent-skills` and signature motion classes (`skills-signal-sweep`, `skills-drawer-slide`) to `src/index.css`.
3. **Step 3: View Orchestration**
   - Update `src/components/skills/SkillsView.tsx` to compose the modular components.
4. **Step 4: Manufacturing Test Suite**
   - Create `src/test/skillsViewManufacturing.test.tsx` verifying all 5 zones, filters, drawer, and handoffs.
5. **Step 5: Quality Gate Audits**
   - Verify `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

---

**Specification Frozen By:** Antigravity AI  
**Next Step:** Skills UI Manufacturing Task
