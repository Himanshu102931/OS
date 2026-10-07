# PlacementOS Project Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No UI manufacturing is authorized by this document alone; it is the definitive engineering blueprint for the subsequent manufacturing task.  
**Baseline commit:** `1ff3e1a` — `feat(companies): redesign target alignment workspace`  
**Date:** 2026-10-07  
**Scope:** `src/components/project/*` (`ProjectLabView.tsx` and modularized child components), integration with `PlacementContext.tsx`, `PROJECT_LAB_CONTENT` (`src/data/projectLabContent.ts`), `practiceEngine.ts`, `interviewReadinessEngine.ts`, `remediationRouter.ts`, `evidenceTrace.ts`, and the Project test suite.

> **Reading Contract.**  
> This document resolves every visual, architectural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Project page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`interviewReadinessEngine.ts`, `practiceEngine.ts`, `remediationRouter.ts`, `evidenceTrace.ts`), storage schemas (`StorageAdapter.ts`), routing contracts, evidence accumulation algorithms, and test assertions. The only file created in this task is this specification document.

---

## 1. Baseline & Subsystem Summary — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Project Subsystem** (`#/project`) is the candidate's **Portfolio Engineering Lab & Architecture Viva Defense Workbench**. In campus placement and SDE-1 recruiting, having a project on a resume is worthless unless the candidate can systematically defend the architecture, explain one-directional data flow, justify technical trade-offs against alternatives, articulate failure recovery/bottlenecks at $100\times$ traffic, and demonstrate clean code engineering practices.

PlacementOS itself serves as the candidate's primary portfolio engineering project. The Project subsystem bridges the static codebase documentation with live interactive defense simulations, recording immutable proof-of-work evidence that directly feeds interview readiness and skill mastery.

---

## 2. Subsystem Purpose & Mission — LOCKED

The Project page solves five fundamental recruitment preparation challenges:
1. **System Understanding:** Transforming the codebase from an abstract collection of files into an articulated, checkable system architecture with explicit data flow and boundary contracts.
2. **Defensible Trade-offs:** Arming the student with pre-calculated, defensible rationale for every architectural decision (e.g. `localStorage` vs Cloud DB, deterministic 6-factor scoring vs probabilistic LLMs, pure functions vs coupled state).
3. **Live Viva Interrogation:** Simulating high-pressure technical interview interrogations via the 4-prompt Project Defense session (`practice-project-defense-01`).
4. **Proof-of-Work Verification:** Appending tamper-proof, timestamped defense attempts and domain evidence logs to prove authentic engineering capability.
5. **Causal Remediation:** Automatically routing defense weaknesses and unanswered prompts directly to foundational interview and career preparation lessons (`prep-interview-career`).

---

## 3. 5-Second Test Evaluation — LOCKED

A candidate landing on the Project page must instantly comprehend within **5 seconds**:

| Question | Forensic Answer on Redesigned Page |
|---|---|
| **1. What project am I building & defending?** | **PlacementOS Personal Portfolio Project** — A local-first, deterministic career preparation OS built with React 19, TypeScript, Vite, Tailwind CSS 4, and zero runtime backend dependencies. |
| **2. Why does it matter for placement?** | Serves as the primary SDE-1 portfolio project proving system architecture, data flow mastery, state isolation, deterministic algorithms, and code quality. |
| **3. What is my defense readiness status?** | Live telemetry header displaying Defense Readiness Band (`strong` / `developing` / `needs_work`), total recorded defense runs, latest score $\%$, pass/fail verdict, and evidence freshness. |
| **4. What should I work on right now?** | **Hero Viva Defense Spotlight** featuring the single defining action: **"Launch Project Defense"** or a remediation prompt to review architecture notes if the last run fell below $80\%$. |
| **5. What evidence proves this project is real?** | **Proof-of-Work Verification Ledger** rendering immutable attempt records with exact scores, correct counts, submitted timestamps, and question-by-question review drawers. |

---

## 4. Route & Deep-Link Model — LOCKED

### 4.1 Routing Contracts
- **Base Route:** `#/project` (opens Project Lab with active section defaulted to `'overview'` or stored section).
- **Deep-Link Route:** `#/project/<sectionId>` where `sectionId` is one of the 6 canonical section IDs:
  - `#/project/overview` $\rightarrow$ System Mission, Tech Stack & Architecture Pattern
  - `#/project/architecture` $\rightarrow$ System Architecture & Data Flow Pipeline
  - `#/project/implementation` $\rightarrow$ Pure Engine Modules & Context Boundaries
  - `#/project/practices` $\rightarrow$ Engineering Quality & Deterministic Verification
  - `#/project/defense` $\rightarrow$ Viva Defense Rubric & Interactive Simulator Launcher
  - `#/project/evidence` $\rightarrow$ Proof-of-Work Ledger & Historical Attempt Trail

### 4.2 Route Parameter Handling
When `routeState.targetId` is present in `PlacementContext`, `ProjectLabView` automatically synchronizes `activeSection` to match the URL hash parameter, preserving seamless browser back/forward navigation and direct cross-subsystem links.

---

## 5. Current Architecture & Forensics — LOCKED

### 5.1 Component Tree (Current)
```
src/components/project/
└── ProjectLabView.tsx (353 lines)
    ├── Header Banner (Title, subtitle, GuideTrigger)
    ├── Core Philosophy Banner ("Project Learning Discipline" + "Start Project Defense" button)
    ├── Section Navigation Tabs (overview, architecture, implementation, practices, defense, evidence)
    └── Main Content Area (renders PROJECT_LAB_CONTENT based on activeSection)
        ├── Dynamic Flow monospace box (if sectionContent.flow)
        ├── Dynamic Cards grid (if sectionContent.cards)
        ├── Dynamic Points list (if sectionContent.points)
        ├── Dynamic Blocks list (if sectionContent.blocks)
        ├── Defense State launcher box (if activeSection === 'defense')
        └── Evidence List & Attempt Review (if activeSection === 'evidence')
            ├── Truthful next action banner (Passed vs Failed)
            └── Recorded PracticeAttempts list with review accordion
```

### 5.2 Forensic Deficiencies in Current Implementation
1. **Double Action CTAs:** "Start Project Defense" is rendered in both the top banner and the 'defense' tab without unified priority.
2. **Static Text Fatigue:** Sections 1–4 (`overview`, `architecture`, `implementation`, `practices`) render as wall-of-text static lists without interactive system diagrams or visual telemetry.
3. **Disconnected Readiness Signals:** The page computes `defenseReadiness` internally or ignores `calculateProjectReadiness()` from `interviewReadinessEngine.ts`, missing an authoritative readiness header.
4. **Hardcoded Legacy Colors:** Heavy usage of legacy hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#F1F5F9`, `#8E98A8`, `#5C6675`, `#10B981`, `#EF4444`).
5. **No Visual Data Flow Graph:** Architecture flow is rendered as a plain monospace text string rather than a chiseled visual pipeline.

---

## 6. Canonical State Sources & Metric Definitions — LOCKED

### 6.1 Authoritative Entity Mapping

| Entity / Metric | Canonical Source | Type / Formula | Purpose & Storage Contract |
|---|---|---|---|
| **Portfolio Content** | `PROJECT_LAB_CONTENT` (`src/data/projectLabContent.ts`) | `LabSectionContent[]` | Immutable canonical architectural specifications, system diagrams, and viva rubrics. |
| **Defense Session Definition** | `PRACTICE_SESSIONS` (`src/data/practiceDataset.ts`) | `PracticeSessionDefinition` (`id: 'practice-project-defense-01'`) | 4-prompt defense simulation (Architecture, Trade-offs, Bottlenecks, Security), passing score: $80\%$. |
| **Recorded Defense Attempts** | `practiceAttempts` in `PlacementContext` | `PracticeAttempt[]` (`category === 'project_defense'`) | Append-only persisted defense attempts with `scorePct`, `passed`, `correctCount`, `userAnswers`, `completedAt`. |
| **Defense Evidence Logs** | `evidenceLogs` in `PlacementContext` | `EvidenceLog[]` (`topicId: 'prep-interview-career'`, `sourceType: 'practice_session'`) | Authoritative evidence log entries updating skill evidence and confidence. |
| **Project Readiness Calculation** | `calculateProjectReadiness()` in `src/engine/interviewReadinessEngine.ts` | Pure function returning `InterviewReadinessScorecard['projectReadiness']` | Computes `sectionsCompleted` ($0..6$), `totalSections` ($6$), `evidenceDefenseSessions`, `lastDefenseDate`, `defenseReadiness` (`strong` $\ge 3$ runs + pass, `developing` $\ge 1$ run, else `needs_work`). |
| **Defense Remediation** | `resolveProjectDefenseRemediation()` in `src/engine/remediationRouter.ts` | Pure function returning `RemediationRoute[]` | Maps failed defense attempt ($<80\%$) to `prep-interview-career` preparation review. |
| **Project Evidence Trace** | `buildProjectDefenseTrace()` in `src/engine/evidenceTrace.ts` | Pure function returning `EvidenceTrace` | Causal evidence chain with signal `'project_defense'` routing to `'project'`. |
| **Phase Milestone** | `ms-p3-project-defense` (`src/data/milestones.ts`) | `MilestoneDefinition` | Phase 3 milestone: *"A practice-project-defense-01 attempt recorded with score ≥80%"*. |

### 6.2 Strict Distinction of Metrics — NEVER MERGE
- **Capability ($0..100\%$):** Actual technical accuracy achieved across defense prompts in recorded attempts.
- **Evidence Strength ($0..100$):** Accumulated evidence points on topic `prep-interview-career` ($+ \text{round}(\text{score} \times 0.2)$ per session).
- **Confidence ($1..5$):** Deterministic confidence grade mapped from attempt score ($\ge 85 \to 5$, $\ge 70 \to 4$, $\ge 50 \to 3$, $\ge 30 \to 2$, else $1$).
- **Freshness (`fresh` / `aging` / `stale` / `untested`):** Time-decay state ($\le 7\text{d} \to \text{fresh}$, $\le 14\text{d} \to \text{aging}$, $> 14\text{d} \to \text{stale}$).
- **Readiness Band (`strong` / `developing` / `needs_work`):** Derived strictly from multi-attempt history and passing criteria.
- **Completion ($0..6$ Sections):** Truthful section completion: `defense` is completed **only** if at least one attempt is passed; `evidence` is completed **only** if at least one attempt is recorded; documentation tabs remain informational.

---

## 7. Complete Workflow & Cross-Subsystem Handoffs — LOCKED

```
                       ┌────────────────────────┐
                       │  Today / Operational   │
                       └───────────┬────────────┘
                                   │ (Daily Plan / Review Candidate)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROJECT LAB WORKBENCH (#/project)                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Zone 1: Engineering Telemetry & Defense Readiness Strip                 │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Zone 2: Viva Defense Simulator Spotlight (Hero Action)                  │ │
│ │         [ Launch Project Defense ] ────────┐                            │ │
│ └────────────────────────────────────────────┼────────────────────────────┘ │
│ ┌────────────────────────────────────────────┼────────────────────────────┐ │
│ │ Zone 3: Architectural Pillar Blueprint     │                            │ │
│ └────────────────────────────────────────────┼────────────────────────────┘ │
│ ┌────────────────────────────────────────────┼────────────────────────────┐ │
│ │ Zone 4: Defensibility Matrix & Rubric      │                            │ │
│ └────────────────────────────────────────────┼────────────────────────────┘ │
│ ┌────────────────────────────────────────────┼────────────────────────────┐ │
│ │ Zone 5: Proof-of-Work Verification Ledger  │                            │ │
│ └────────────────────────────────────────────┼────────────────────────────┘ │
└──────────────────────────────────────────────┼──────────────────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │ PracticeSessionRunner (Modal)    │
                              │ 4 Defense Prompts / 80% Threshold│
                              └────────────────┬─────────────────┘
                                               │
                                               ▼ (Submit Attempt)
                              ┌──────────────────────────────────┐
                              │ PlacementContext State Update    │
                              │ • practiceAttempts += Attempt    │
                              │ • evidenceLogs += EvidenceLog    │
                              │ • skillStates[prep-interview]    │
                              └────────────────┬─────────────────┘
                                               │
                     ┌─────────────────────────┴────────────────────────┐
                     ▼ (If Score < 80%)                                 ▼ (If Score >= 80%)
       ┌───────────────────────────────┐                  ┌───────────────────────────────┐
       │ Remediation Router            │                  │ Interview Readiness Scorecard │
       │ -> setRoute('preparation',    │                  │ • Defense Readiness: 'strong' │
       │    'prep-interview-career')   │                  │ • Milestone ms-p3-defense PASS│
       └───────────────────────────────┘                  └───────────────────────────────┘
```

### 7.1 Cross-Subsystem Handoff Table

| Source View | Incoming Trigger | Target in Project Lab | Expected State / Action |
|---|---|---|---|
| **Today** (`#/dashboard`) | Project task or review candidate card click | `#/project/defense` | Opens Project Lab with Defense tab selected and simulator ready. |
| **Roadmap** (`#/roadmap`) | Task `task-109` or milestone `ms-p3-project-defense` click | `#/project` | Opens Project Lab workspace. |
| **Interview** (`#/interview`) | "Project Readiness" scorecard action button | `#/project` | Direct navigation from scorecard to project defense. |
| **Skills** (`#/skills`) | Evidence trace link on `prep-interview-career` | `#/project/evidence` | Opens Proof-of-Work verification ledger. |
| **Project Lab** (`#/project`) | Failed attempt remediation link ($<80\%$) | `#/preparation/prep-interview-career` | Transitions user to Preparation Hub to review defense notes. |
| **Project Lab** (`#/project`) | "Launch Project Defense" primary button | `PracticeSessionRunner` modal | Opens modal for `practice-project-defense-01`. |

---

## 8. Current UX Audit & Friction Points — LOCKED

| Audit Vector | Severity | Existing Defect | Redesign Mandate |
|---|---|---|---|
| **Visual Hierarchy** | High | Flat, monotonous card stacking without clear hero action. | Establish dominant **Hero Viva Defense Spotlight** above architectural pillars. |
| **5-Second Comprehension** | High | User cannot immediately tell if their defense is passing, stale, or untried. | Add **Engineering Telemetry Strip** with live readiness band, session count, and pass/fail badge. |
| **Data Flow Visualization** | Medium | Monospace text line (`User Action → PlacementContext → ...`) is hard to scan. | Render a structured, chiseled **Visual Data Flow Graph** with discrete engine nodes. |
| **Action Accent Distinction** | Medium | Uses generic yellow/bronze `#E5A93C` across all buttons and tabs. | Introduce dedicated **Laser Teal** (`#0D9488` / `#14B8A6`) action accent strictly reserved for defense execution. |
| **Evidence Inspection** | Medium | Recorded attempts lack clear question filtering and visual score bars. | Provide collapsible question-by-question audit accordions with user answer vs model answer diffs. |
| **Responsive Stacking** | Low | Horizontal tabs clip on narrow mobile screens without clear indicators. | Use responsive scrollable tab rails with active indicator and swipe-friendly layout. |

---

## 9. Visual Metaphor & Design System — LOCKED

### 9.1 Chosen Metaphor: "Portfolio Engineering Lab & Viva Defense Workbench"
The Project subsystem is an **industrial software engineering lab and viva interrogation chamber**:
- **Chiseled Obsidian Planes:** Multi-layer dark slate surfaces (`#0D1117`, `#161B22`, `#21262D`) with crisp 1px borders (`#30363D`).
- **Forest Green Identity:** Canonical PlacementOS brand green (`#2E8B62`, `#4CAF78`, `#65D3A3`) indicating passing attempts ($\ge 80\%$), verified evidence, and strong readiness bands.
- **Dedicated Page Action Accent (Laser Teal):** High-precision engineering teal (`#0D9488` / `#14B8A6` / `rgba(13, 148, 136, 0.15)`) reserved strictly for the defining action ("Launch Project Defense") and active simulator cues.
- **Amber Warning (`#D97706` / `#F59E0B`):** Reserved for unpassed attempts ($<80\%$), stale evidence ($>14\text{d}$), and remediation prompts.
- **Typography & Precision:** Inter for structural UI; JetBrains Mono for system entities, module filenames, scoring formulas, timestamps, and pass thresholds.

---

## 10. Defining Action & Action Accent — LOCKED

### 10.1 The Defining Action: `"Launch Project Defense"`
The single most critical action a candidate takes in Project Lab is executing the **Architecture Viva Defense Simulation** to validate their ability to articulate and defend engineering choices under interview conditions.

### 10.2 Action Accent Tokens: Laser Teal
```css
--action-accent-project: #0D9488;
--action-accent-project-hover: #14B8A6;
--action-accent-project-active: #0F766E;
--action-accent-project-subtle: rgba(13, 148, 136, 0.12);
--action-accent-project-border: rgba(13, 148, 136, 0.35);
--action-accent-project-glow: rgba(20, 184, 166, 0.20);
--action-accent-project-text: #2DD4BF;
```

*Color Rationale:*
- Visually distinct from Sky Cyan (Today), Emerald Jade (Roadmap), Precision Mint (DSA), Golden Amber (Preparation), Cobalt Blue (Practice), Violet Amethyst (Skills), and Coral Flame (Companies).
- Evokes terminal telemetry, compiler precision, and systems engineering.
- Exceeds WCAG AAA contrast ratio ($\ge 7:1$) against obsidian backgrounds when paired with `#F0FDFA` / `#CCFBF1` text.

---

## 11. Frozen 5-Zone Information Architecture — LOCKED

The Project page is strictly structured into **5 major zones**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: PROJECT ENGINEERING HEADER & DEFENSE READINESS STRIP                │
│ • Project Title, System Subtitle, GuideTrigger                              │
│ • Live Telemetry Strip: Readiness Band | Sessions Recorded | Latest Score   │
│   Evidence Freshness | Milestone Status (ms-p3-project-defense)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: VIVA DEFENSE SIMULATOR SPOTLIGHT (HERO ACTION ZONE)                 │
│ • Interrogation Simulator Card: 4 Defense Prompts · 80% Passing Threshold   │
│ • Latest Attempt Status Banner (PASS / FAIL with score & timestamp)         │
│ • Primary Defining CTA: [ Launch Project Defense ] (Laser Teal)             │
│ • Remediation Callout: Direct link to prep-interview-career if failed       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: ARCHITECTURAL PILLAR NAVIGATOR & INTERACTIVE BLUEPRINT WORKSPACE    │
│ • 6 Architectural Pillar Tabs:                                              │
│   [Overview] [Architecture] [Implementation] [Practices] [Defense] [Evidence]│
│ • Visual Data Flow Architecture Pipeline                                    │
│ • Module Specification Cards (adaptiveEngine, practiceEngine, storageAdapter)│
│ • Core Engineering Guarantees & Constraints Checklist                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: VIVA INTERROGATION RUBRIC & PUSHBACK CHEAT-SHEET                    │
│ • 5 High-Yield Interviewer Pushback Scenarios:                              │
│   1. 60-Second Elevator Pitch                                               │
│   2. Accepted Trade-offs (localStorage vs Cloud DB)                         │
│   3. Single Hardest Bug (Idempotent Midnight Day Sealing)                   │
│   4. Bottlenecks & 100x Scaling Strategy                                    │
│   5. Architecture Evolution & Rebuilding Strategy                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: PROOF-OF-WORK VERIFICATION LEDGER & ATTEMPT AUDIT                   │
│ • Append-only historical attempt ledger with PASS / FAIL badges             │
│ • Expandable Question-by-Question Audit Accordion                           │
│ • Candidate Response vs Model Reference Answer Comparison                   │
│ • Direct Skill Credit Traceability link to Skills Matrix                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Detailed Zone Specifications — LOCKED

### Zone 1: Project Engineering Header & Defense Readiness Strip
- **Purpose:** Provide instant context on the portfolio system and live readiness telemetry.
- **Data Source:** `calculateProjectReadiness(practiceAttempts, evidenceLogs)` from `interviewReadinessEngine.ts`, `activePhase` from `PlacementContext`.
- **Elements:**
  - Header Title: `"PROJECT LAB"` with badge `"ENGINEERING SYSTEM"`.
  - Subtitle: `"BUILD → UNDERSTAND → EXPLAIN → DEFEND. PlacementOS is your primary portfolio engineering system."`
  - Guide Trigger: `<GuideTrigger route="project" />`.
  - Telemetry Strip (4 metric blocks):
    1. **Defense Readiness:** Badge displaying `STRONG` (Green), `DEVELOPING` (Amber), or `NEEDS WORK` (Zinc).
    2. **Defense Runs:** `X Recorded Runs` with `Y Passed`.
    3. **Latest Score:** `Score %` with PASS/FAIL indicator.
    4. **Evidence Freshness:** `Fresh (≤7d)`, `Aging (≤14d)`, `Stale (>14d)`, or `Untested`.

### Zone 2: Viva Defense Simulator Spotlight (Hero Action Zone)
- **Purpose:** Serve as the prominent focal point driving the user to practice defending their system.
- **Data Source:** `practiceSessions.find(s => s.category === 'project_defense')`, latest `PracticeAttempt` in `practiceAttempts`.
- **Visual Design:**
  - Obsidian surface (`#111713` / `#161E19`) with Laser Teal 1px border (`rgba(13, 148, 136, 0.35)`).
  - Left side: Simulator specs (Session `practice-project-defense-01`, 4 prompts, 80% passing bar, estimated 20 min).
  - Center/Status: If attempt exists, shows a status banner:
    - *Passed:* Emerald green banner with *"Defense Passed — Score 100% meets 80% threshold"*.
    - *Failed:* Amber warning banner with *"Defense Not Passed — Score 50% below 80% threshold. Remediation recommended."* + link to `#/preparation/prep-interview-career`.
  - Right side: Primary Defining CTA:
    - **`"Launch Project Defense"`** button with Laser Teal background, hover micro-lift, and `<ArrowRight className="size-4" />`.

### Zone 3: Architectural Pillar Navigator & Interactive Blueprint Workspace
- **Purpose:** Structured presentation of system architecture, data flow, modules, and quality standards.
- **Data Source:** `PROJECT_LAB_CONTENT` (`src/data/projectLabContent.ts`), `activeSection` state (`ProjectLabSectionId`).
- **Pillar Tabs:**
  1. `overview` (FolderGit2 icon) — System summary, target candidate, problem solved.
  2. `architecture` (Cpu icon) — One-directional data flow, pure engines, storage boundary.
  3. `implementation` (Code2 icon) — Deep dive into engine modules (`adaptiveEngine.ts`, `practiceEngine.ts`, `skillsEngine.ts`, `storageAdapter.ts`, `preparationEngine.ts`, `PlacementContext.tsx`).
  4. `practices` (Terminal icon) — Strict type safety, test gates, zero-backend philosophy, reversibility.
  5. `defense` (ShieldCheck icon) — Viva simulator rubric and pushback preparation.
  6. `evidence` (Award icon) — Proof-of-work audit trail.
- **Interactive Visual Data Flow Graph:**
  - Visual diagram showing:
    `[ User Event ] ──► [ PlacementContext ] ──► [ Pure Engine ] ──► [ State Update ] ──► [ StorageAdapter ] ──► [ React Re-render ]`
  - Engine isolation callout emphasizing 100% offline, zero-network determinism.

### Zone 4: Viva Interrogation Rubric & Pushback Cheat-Sheet
- **Purpose:** Provide candidates with crisp, checkable answers to senior interviewer questions.
- **Data Source:** `PROJECT_LAB_CONTENT.find(c => c.id === 'defense')?.blocks`.
- **Card Structure (5 Grid Cards):**
  1. **Opening Elevator Pitch (60s):** Formulaic pitch focusing on deterministic 6-factor weighted ranking over local state.
  2. **Accepted Trade-off:** `localStorage` vs Backend infrastructure — instant offline speed vs device binding, solved via versioned JSON backup.
  3. **Hardest Bug Solved:** Midnight date rollover double-sealing days — resolved via idempotent polling and window focus listeners.
  4. **Performance & 100x Scale:** Memoized pure engines, avoiding re-renders, and simulated database read-replicas/caching.
  5. **What You Would Rebuild:** Normalized topic maps and unified coverage graphs.

### Zone 5: Proof-of-Work Verification Ledger & Attempt Audit
- **Purpose:** Render immutable, checkable verification evidence for every defense session run.
- **Data Source:** `practiceAttempts.filter(a => a.category === 'project_defense')`.
- **Elements:**
  - Empty state when 0 attempts: *"No recorded project defense attempts yet. Launch a defense session to build evidence."*
  - Attempt Cards:
    - Title (`System & Project Architecture Defense`), Date & ISO timestamp (`completedAt`).
    - Score badge (`Score %`), correct prompt fraction (`X/4 correct`), verdict (`PASS` in Green / `FAIL` in Red).
    - Unanswered prompt counter if any prompts skipped.
    - Accordion toggle: `"Review recorded answers"` / `"Hide recorded answers"`.
    - Accordion Content: Ordered list of prompts showing:
      - Prompt text
      - User answer or *"Not answered"* callout
      - Self-certification status (`Correct` / `Self-certified correct`)
      - Canonical model answer explanation

---

## 13. Project Progress & Evidence Model — LOCKED

```
                          Defense Attempt Run
                                  │
                                  ▼
                     Score Percentage (scorePct)
                                  │
                   ┌──────────────┴──────────────┐
                   ▼ (Score >= 80%)              ▼ (Score < 80%)
             Verdict: PASS                 Verdict: FAIL
                   │                             │
                   ├─────────────────────────────┤
                   ▼                             ▼
       EvidenceLog Created:           Remediation Route:
       • score: scorePct (0-100)      • target: prep-interview-career
       • confidence: 1-5              • reason: Defense score below 80%
       • topic: prep-interview-career • priority: routed_weakness
                   │
                   ▼
       Skill Credit Applied:
       • +round(score * 0.2) on prep-interview-career
       • Freshness reset to 'fresh' (7-day decay window)
                   │
                   ▼
       Readiness Band Recalculated:
       • >=3 runs + PASS -> 'strong'
       • >=1 run -> 'developing'
       • 0 runs -> 'needs_work'
```

### 13.1 Strict Epistemic Integrity Rules
1. **No Fake Percentages:** Section completion percentage is never an arbitrary number. Documentation tabs do not complete by merely being viewed.
2. **Immutable Attempts:** Defense attempts are append-only. New runs create new historical records and do not overwrite past attempts.
3. **Deterministic Skill Ingestion:** Evidence credit from project defense strictly maps to topic `prep-interview-career` in domain `interviews`.
4. **Time-Decay Decay Schedule:** Evidence freshness decays on a fixed schedule ($\le 7\text{d} \to \text{fresh}$, $\le 14\text{d} \to \text{aging}$, $> 14\text{d} \to \text{stale}$), naturally prompting recurring defense drills before recruitment drives.

---

## 14. Signature Motion Blueprint — LOCKED

### 14.1 Signature Motion: "Data Flow Pipeline Pulse"
- **Visual Description:** A subtle, continuous 16-second linear glow sweep along the border of the active architectural data-flow graph, symbolizing live deterministic data processing through pure engines.
- **Timing:**
  - Micro-interactions (tab switch, button hover): `150ms ease-out`
  - Accordion expansion: `240ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Continuous pipeline pulse: `16s linear infinite`
- **Reduced Motion Support:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .data-flow-pulse,
    .signature-motion {
      animation: none !important;
      transition: none !important;
    }
  }
  ```

---

## 15. Responsive Layout Blueprint — LOCKED

| Viewport Width | Layout Architecture | Tab Navigation | Action CTA & Cards |
|---|---|---|---|
| **$\ge 1440\text{px}$ (Desktop Large)** | 5-Zone structured vertical stack with max-width $1500\text{px}$. Telemetry strip 4 columns. | Horizontal tab rail with full text labels and icons. | Hero card with horizontal split: specs left, status middle, CTA right. Rubric in 2-column grid. |
| **$1024\text{px} - 1439\text{px}$ (Desktop Standard)** | 5-Zone stack. Telemetry strip 4 columns. | Horizontal tab rail with standard padding. | Hero card wraps status below specs if needed. Rubric in 2-column grid. |
| **$768\text{px} - 1023\text{px}$ (Tablet)** | 5-Zone stack. Telemetry strip 2x2 grid. | Horizontal scrollable tab rail with right fade indicator. | Hero card stacks CTA below specs and status. Rubric in 1-column grid. |
| **$< 768\text{px}$ (Mobile)** | Single-column compact vertical stack. Telemetry strip 2x2 grid. | Swipeable tab rail with compact padding. | Hero card full-width with large tap target ($44\text{px}$ minimum). Accordion items expand cleanly without horizontal overflow. |

---

## 16. Accessibility & Semantic Blueprint — LOCKED

- **Heading Structure:**
  - Single `<h1>` for page title: `"PROJECT LAB"`
  - `<h2>` for major zone titles: `"Viva Defense Simulator"`, `"Architectural Blueprint"`, `"Viva Interrogation Rubric"`, `"Proof-of-Work Verification Ledger"`
  - `<h3>` for subtopic headings, card titles, and attempt titles
- **ARIA Semantics:**
  - Tab navigation uses `role="tablist"`, `role="tab"`, `aria-selected="true/false"`, `aria-controls="panel-id"`.
  - Tab panels use `role="tabpanel"`, `id="panel-id"`, `aria-labelledby="tab-id"`.
  - Accordions use `<button aria-expanded="true/false">` with `aria-controls`.
  - Pass/Fail badges include non-color text labels (`PASS` / `FAIL`).
- **Keyboard Navigation:** Full tab order across all interactive buttons, tabs, accordions, and links. Visual focus rings (`focus-visible:ring-2 focus-visible:ring-[#0D9488]`).

---

## 17. Design System Migration Plan — LOCKED

### 17.1 Token Mapping Table

| Legacy Token / Hex | New Semantic Token / Class | Usage in Project Subsystem |
|---|---|---|
| `#0D0F12` | `bg-[#0B100D]` / `bg-canvas` | Main application background |
| `#14171D` | `bg-[#111713]` / `bg-surface-elevated` | Primary zone container cards |
| `#1B2028` | `bg-[#161E19]` / `bg-surface-subtle` | Inner cards, diagram boxes, attempt rows |
| `#262D38` | `border-[#28352D]` / `border-subtle` | 1px boundary dividing lines |
| `#3B4556` | `border-[#3B4C40]` / `border-strong` | Active tab borders, prominent card edges |
| `#E5A93C` (action buttons) | `bg-[#0D9488]` / `hover:bg-[#14B8A6]` (Laser Teal) | Defining "Launch Project Defense" CTA |
| `#E5A93C` (warnings/aging) | `text-[#D97706]` / `bg-[#D97706]/10` (Amber) | Aging evidence, unpassed defense warnings |
| `#10B981` | `text-[#4CAF78]` / `bg-[#4CAF78]/10` (Forest Green) | Passing score ($\ge 80\%$), verified evidence |
| `#EF4444` | `text-[#EF4444]` / `bg-[#EF4444]/10` (Crimson) | Failing score, unanswered prompts |
| `#F1F5F9` | `text-[#F1F5F9]` / `text-primary` | High-contrast headings and prompt text |
| `#8E98A8` | `text-[#8E98A8]` / `text-secondary` | Body explanations, subtitles, metadata |
| `#5C6675` | `text-[#5C6675]` / `text-muted` | Monospace timestamps, prompt numbers |

---

## 18. Architectural Guardrails — LOCKED

The Project page redesign strictly respects all project architecture constraints:
1. **Zero Backend / Zero Network:** No fetch requests, REST endpoints, cloud databases, or external APIs.
2. **Zero Runtime LLMs:** No probabilistic AI or LLM generation in the decision or scoring loop.
3. **Single Context Authority:** All domain state mutations flow through `PlacementContext` via `recordPracticeAttempt()`.
4. **Pure Deterministic Engines:** `interviewReadinessEngine.ts`, `remediationRouter.ts`, and `evidenceTrace.ts` remain pure functions over plain objects.
5. **Storage Schema Compatibility:** No breaking changes to `StorageAdapter.ts` (`AppStorageState`).
6. **Protected File Integrity:** `src/components/dashboard/TodayGuide.tsx` remains untouched and untracked.

---

## 19. Acceptance Criteria for Subsequent Manufacturing — LOCKED

1. **Zone Completeness:** All 5 frozen zones are fully implemented and rendered cleanly.
2. **Action Dominance:** "Launch Project Defense" is the single dominant primary CTA on the page, rendered with the Laser Teal action accent.
3. **Simulator Launch:** Clicking "Launch Project Defense" opens `PracticeSessionRunner` with `practice-project-defense-01`.
4. **State Persistence:** Completed defense runs write `PracticeAttempt`, `EvidenceLog`, and update `skillStates['prep-interview-career']` via context.
5. **Remediation Routing:** Failed attempts render a direct one-click remediation link to `#/preparation/prep-interview-career`.
6. **Deep-Link Sync:** Navigating to `#/project/architecture` automatically activates the Architecture tab.
7. **Test Suite Green:** 100% of all existing tests (476+ tests) and new Project view tests pass with zero regressions.
8. **Build & Lint Clean:** `npm run lint` and `npm run build` pass with zero warnings or errors.

---

## 20. Manufacturing Sequence Plan — LOCKED

When manufacturing is authorized in Task 81, execution will proceed in strict order:
1. **Component Modularization:**
   - Create `src/components/project/ProjectHeader.tsx` (Zone 1)
   - Create `src/components/project/ProjectDefenseSpotlight.tsx` (Zone 2)
   - Create `src/components/project/ProjectBlueprintWorkspace.tsx` (Zone 3)
   - Create `src/components/project/ProjectVivaRubric.tsx` (Zone 4)
   - Create `src/components/project/ProjectEvidenceLedger.tsx` (Zone 5)
   - Refactor `src/components/project/ProjectLabView.tsx` to compose these 5 clean modular components.
2. **Deep-Link Integration:** Wire `routeState.targetId` from `usePlacement()` to synchronize with `activeSection`.
3. **Design System & Semantic Tokens:** Apply obsidian palette, Laser Teal action accent, and forest green verification badges.
4. **Unit & Integration Testing:** Create comprehensive tests in `src/test/projectLabView.test.tsx` verifying all 5 zones, action triggers, telemetry calculations, and deep-linking.
5. **Full Quality Verification:** Verify `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

---

## 21. Final Frozen Decision — LOCKED

**VERDICT: PROJECT SPEC FROZEN — READY FOR MANUFACTURING**

*Signed and approved for Phase 8 UI redesign execution.*
