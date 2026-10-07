# PlacementOS Interview Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No UI manufacturing is authorized by this document alone; it is the definitive engineering blueprint for the subsequent manufacturing task.  
**Baseline commit:** `e283009` — `feat(project): redesign portfolio engineering lab`  
**Date:** 2026-10-07  
**Scope:** `src/components/interview/*` (`InterviewReadinessView.tsx` and modularized sub-components), integration with `PlacementContext.tsx`, `interviewReadinessEngine.ts`, `evidenceTrace.ts`, `remediationRouter.ts`, `skillsEngine.ts`, `assessmentEngine.ts`, `practiceEngine.ts`, `companyEngine.ts`, `reviewScheduler.ts`, and the Interview test suite.

> **Reading Contract.**  
> This document resolves every visual, architectural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Interview page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`interviewReadinessEngine.ts`, `skillsEngine.ts`, `assessmentEngine.ts`, `practiceEngine.ts`, `remediationRouter.ts`, `evidenceTrace.ts`), storage schemas (`StorageAdapter.ts`), routing contracts, evidence accumulation algorithms, and test assertions. The only file created in this task is this specification document.

---

## 1. Baseline & Subsystem Summary — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Interview Subsystem** (`#/interview`) is the candidate's **Deterministic Interview Readiness Scorecard & Multi-Vector Telemetry Console**. In campus recruitment and SDE-1 hiring drives, an interview is not a single subject test; it is an interrogation across orthogonal competencies: algorithmic problem solving, core computer science fundamentals, SQL/system programming, verbal articulation, project architecture defense, and live interview execution.

The Interview page aggregates evidence across all preparation pillars into a single, unified, cross-cutting readiness evaluation. It enforces a strict rule: **Capability, Confidence, and Freshness are independent metrics that are never blended into a fake percentage score**.

---

## 2. Subsystem Purpose & Mission — LOCKED

The Interview page solves five core placement preparation challenges:
1. **Multi-Vector Readiness Visibility:** Providing an honest, cross-cutting view of student preparedness across all 6 canonical dimensions without requiring the student to manually inspect 11 disparate domain pages.
2. **Tri-Factor Separation (No Fake Scores):** Strictly reporting **Evidence Strength / Capability** (what the user has actually done), **Confidence** (assessment certainty & self-ratings), and **Freshness** (temporal decay) as three separate, independently labelled meters.
3. **Active Anomaly & Remediation Detection:** Surfacing urgent DSA remediation flags, open diagnostic weakness signals, stale dimension alerts, and low-evidence topics with direct 1-click resolution actions.
4. **Corporate Drive Alignment:** Overlaying target company requirements onto the general scorecard without corrupting baseline capability metrics, displaying drive countdowns and required vs non-required dimension classifications.
5. **Deterministic Action Dispatch:** Routing the candidate directly to the single most impactful exercise (DSA problem, practice session drill, preparation lesson, diagnostic assessment, or project defense) to close their most urgent readiness deficit.

---

## 3. 5-Second Test Evaluation — LOCKED

A candidate landing on the Interview page must instantly comprehend within **5 seconds**:

| Question | Forensic Answer on Redesigned Page |
|---|---|
| **1. What is my current interview readiness state?** | **Overall Readiness Band** (`Strong` / `Developing` / `Needs Work` / `Unassessed`) displayed in the primary telemetry strip alongside 3 independent meters: Evidence $\%$, Confidence $\%$, and Freshness $\%$. |
| **2. How ready am I across the core interview areas?** | **6-Vector Dimension Matrix** clearly visualizing readiness across Coding/DSA, Core CS, SQL/Programming, Communication, Interview Execution, and Project Lab. |
| **3. What is my biggest readiness gap or vulnerability?** | **Active Anomaly Counters** (Active Remediation count, Stale Dimensions count, Weak Evidence count) with highlighted weakness callouts. |
| **4. What single action should I execute right now?** | **Primary Mission Spotlight (Hero)** highlighting the top-priority drill (e.g. *"Launch Technical Mock Interview"* or *"Resolve DSA Remediation"*) with a 1-click action button. |
| **5. What proof-of-work backs up this evaluation?** | **Evidence Trace Ledger** providing an itemized breakdown of completed practice drills, DSA attempts, diagnostic scores, and project defense sessions. |

---

## 4. Route & Deep-Link Model — LOCKED

### 4.1 Routing Contracts
- **Base Route:** `#/interview` (Full Interview Readiness Scorecard & Telemetry Console).
- **Deep-Link Route:** `#/interview/<dimensionId>` where `dimensionId` is one of the 6 canonical dimension IDs:
  - `#/interview/coding_dsa` $\rightarrow$ Focus on Coding & Data Structures readiness
  - `#/interview/core_cs` $\rightarrow$ Focus on Operating Systems, Networks, DBMS, OOP, Aptitude
  - `#/interview/sql_programming` $\rightarrow$ Focus on SQL queries & Python programming
  - `#/interview/communication` $\rightarrow$ Focus on verbal ability & articulation
  - `#/interview/interview_execution` $\rightarrow$ Focus on technical/behavioral mock interviews
  - `#/interview/projects` $\rightarrow$ Focus on Project Lab architecture defense
- **Company Filter Query/State:** Synchronized with `selectedCompanyOverlayId` in `PlacementContext`. Selecting a company dynamically updates the company overlay section and adds required dimension badges across the page without changing the underlying route.

### 4.2 Outgoing Handoff Routes
Every actionable button resolves deterministically to a verified PlacementOS route:
- DSA handoff $\rightarrow$ `setRoute('dsa', problemId)`
- Practice session handoff $\rightarrow$ `setRoute('practice', sessionId)`
- Preparation lesson handoff $\rightarrow$ `setRoute('preparation', topicId)`
- Diagnostic assessment handoff $\rightarrow$ `setRoute('assessment')`
- Project Lab defense handoff $\rightarrow$ `setRoute('project')`
- Target companies manager handoff $\rightarrow$ `setRoute('companies')`
- Review queue handoff $\rightarrow$ `setRoute('analytics')`
- Daily plan handoff $\rightarrow$ `setRoute('dashboard')`

---

## 5. Canonical Readiness Audit & State Sources — LOCKED

### 5.1 Canonical Readiness Audit & Overall Score Verification
> **CRITICAL ARCHITECTURAL FINDING:**  
> **NO CANONICAL SINGLE OVERALL PERCENTAGE INTERVIEW SCORE EXISTS.**  
> `interviewReadinessEngine.ts` strictly forbids blending capability, confidence, and freshness into a single "percent interview ready" figure. Instead, it computes:
> 1. `overallEvidenceStrength` ($0..100$) — Arithmetic mean of recorded evidence strength across the 6 dimensions.
> 2. `overallConfidence` ($0..100$) — Arithmetic mean of assessment/rating confidence across the 6 dimensions.
> 3. `overallFreshness` ($0..100$) — Arithmetic mean of evidence recency across the 6 dimensions.
> 4. `overallBand` (`strong` | `developing` | `needs_work` | `unassessed`) — Categorical band derived from composite score $\text{round}(0.5 \times \text{evidence} + 0.25 \times \text{confidence} + 0.25 \times \text{freshness})$.

### 5.2 The 6 Canonical Dimensions
The engine partitions all 11 curriculum domains into exactly 6 canonical readiness dimensions:

| Dimension ID | Canonical Name | Short Name | Domain Mapping (`DomainId`) | Evidence Inputs & Weighting |
|---|---|---|---|---|
| `coding_dsa` | **Coding / DSA** | `DSA` | `dsa`, `python` | DSA problem attempts, Leitner box distribution, topic skill evidence, practice drills. |
| `core_cs` | **Core CS Fundamentals** | `Core CS` | `oop`, `os`, `cn`, `aptitude` | Theory topic masteries, concept review tasks, diagnostic domain assessments. |
| `sql_programming` | **SQL / Programming Fundamentals** | `SQL/Prog` | `sql`, `dbms` | SQL query practice sessions, DBMS normalization drills, Python scripting tasks. |
| `communication` | **Communication** | `Comm` | `communication` | Verbal ability exercises, structured answer articulation, communication practice. |
| `interview_execution` | **Interview Execution** | `Interview` | `interviews` | Mock technical interviews (`practice-mock-interview-01`), behavioral drills. |
| `projects` | **Projects / Project Lab** | `Projects` | `projects` | Project defense simulations (`practice-project-defense-01`), architecture evidence logs. |

### 5.3 Authoritative Data Sources & Pure Functions

| Entity / Calculation | Authoritative Source | Pure Function / State Location | Contract & Purpose |
|---|---|---|---|
| **Scorecard Generation** | `interviewReadinessEngine.ts` | `generateInterviewReadinessScorecard(options)` | Single canonical entry point computing all dimensions, bands, signals, and overlays. |
| **Topic Readiness** | `skillsEngine.ts` | `calculateTopicReadiness(...)` | Evaluates level progress ($0..5$), evidence strength ($0..100$), freshness decay. |
| **Domain Readiness** | `skillsEngine.ts` | `calculateDomainReadinessList(...)` | Aggregates topic readiness into domain-level scores. |
| **Project Readiness** | `interviewReadinessEngine.ts` | `calculateProjectReadiness(practiceAttempts, evidenceLogs)` | Computes completed sections ($0..6$), defense sessions count, last defense date, and `defenseReadiness` band. |
| **Company Overlay** | `interviewReadinessEngine.ts` | `calculateCompanyOverlay(...)` | Evaluates required topics/domains, urgency countdown, and corporate gap severity. |
| **Review Candidates** | `reviewScheduler.ts` | `generateReviewCandidates(...)` | Single deterministic pass ensuring recommended actions point to valid, non-phantom target IDs. |
| **Evidence Trace** | `evidenceTrace.ts` | `buildInterviewDimensionTrace(dim, catalog)` | Builds causal signal $\to$ why $\to$ evidence $\to$ source chain for each dimension. |
| **Diagnostic Integration** | `assessmentEngine.ts` | `deriveAssessmentProfileReadout(assessmentState)` | Extracts diagnostic ability, assessed domain count, strengths, weaknesses, and reassessment flag. |

---

## 6. Current UX Audit — LOCKED

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-Second Comprehension** | **MODERATE** | The page displays the 3 separate meters and band, but lacks a dominant visual focal point (Hero Mission Spotlight) to direct immediate action. |
| **B. Visual Hierarchy** | **DATED** | Extensive legacy hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#10B981`, `#F59E0B`, `#38BDF8`). Lacks chiseled obsidian planes, sub-surface border treatments, and elevation tiers. |
| **C. Primary Action Dominance** | **DIFFUSE** | Action buttons are repeated inside each of the 6 dimension rows and multiple sub-cards without a clear hierarchical winner. |
| **D. Monolithic Implementation** | **FAIL** | All 956 lines live in a single file (`InterviewReadinessView.tsx`), violating modular component architecture. |
| **E. Dimension Card Density** | **CROWDED** | Dimension rows have small expand toggles that open nested lists of raw text, leading to vertical sprawl when multiple rows are expanded. |
| **F. Subsystem Linking** | **STRONG** | Integration with Assessment, Project Lab, DSA, and Company overlays is structurally sound and mathematically verified in tests. |
| **G. Accessibility & Touch** | **SUBOPTIMAL** | Meter bars lack explicit ARIA progressbar semantics (`role="progressbar"`, `aria-valuenow`). Touch targets on some mobile controls are $<44\text{px}$. |

---

## 7. Visual Metaphor — LOCKED

### Metaphor: "Candidate Readiness Control Room & Multi-Vector Telemetry Console"
Like an aerospace mission launch readiness console or technical command center, the Interview page monitors 6 independent subsystem telemetry streams in real time. Each vector provides an honest "Go / No-Go" readiness status, active anomaly detection (weakness/stale flags), and an immediate drill-down flight recorder (evidence trace).

Visual design pillars:
- **Chiseled Dark Obsidian Panels:** Tonal backgrounds (`#0B0D10`, `#11141A`, `#181C24`) with 1px precision structural borders (`#232834`).
- **Tri-Meter Telemetry Readout:** Crisp, distinct, unblended data meters for Evidence (Gold/Amber), Confidence (Sky Blue), and Freshness (Emerald Green).
- **Senior Technical Typography:** Inter for structured headings and JetBrains Mono for telemetry metrics, timestamps, and readiness bands.

---

## 8. Action Accent — LOCKED

### Action Accent: **Electric Indigo (`#6366F1`)**
Electric Indigo communicates senior engineering authority, intellectual rigor, interview simulation, and evaluative confidence. It is strictly distinguished from all other PlacementOS subsystem accents:

| Subsystem | Accent Token | Hex Code |
|---|---|---|
| Today | Sky Cyan | `#00E5FF` / `#38BDF8` |
| Roadmap | Emerald Jade | `#10B981` |
| DSA | Precision Mint | `#2DD4BF` |
| Preparation | Golden Amber | `#F59E0B` |
| Practice | Cobalt Blue | `#3B82F6` |
| Skills | Violet Amethyst | `#A855F7` |
| Companies | Coral Flame | `#FF5722` |
| Project | Laser Teal | `#06B6D4` |
| **Interview (New)** | **Electric Indigo** | **`#6366F1`** |

### Palette Tokens for Interview Subsystem:
- **Primary Accent:** `bg-[#6366F1]`, `text-[#6366F1]`, `border-[#6366F1]`
- **Accent Glow / Hover:** `bg-[#818CF8]`, `text-[#818CF8]`, `border-[#818CF8]`
- **Sub-surface Tint:** `bg-[#6366F1]/10`, `border-[#6366F1]/30`
- **Tonal Obsidian Canvas:** `bg-[#0B0D10]`, `bg-[#11141A]`, `bg-[#181C24]`
- **Structural Borders:** `border-[#232834]`, `border-[#2C3342]`
- **Muted / Secondary Text:** `text-[#7E8B9F]`, `text-[#9AA6B8]`
- **Primary Text:** `text-[#F1F5F9]`, `text-[#FFFFFF]`

---

## 9. Frozen 5-Zone Information Architecture — LOCKED

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: INTERVIEW HEADER & READINESS TELEMETRY STRIP                            │
│ Title + Subtitle | Company Focus Dropdown | Overall Band | Tri-Meter Telemetry  │
│ [Evidence: XX%] [Confidence: XX%] [Freshness: XX%] | Anomaly Chips (3 Counters) │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: PRIMARY READINESS MISSION & VIVA SIMULATION HERO                        │
│ [Spotlight Card] Top Readiness Action / Mock Interview Launcher                 │
│ Dynamic Diagnosis | Target Outcome | [ Launch Simulation / Action CTA ]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: 6-VECTOR READINESS DIMENSION MATRIX                                     │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│ │ 1. Coding/DSA │ │ 2. Core CS    │ │ 3. SQL/Prog   │ │ 4. Comm       │ ...    │
│ │ Band · Tri-Met│ │ Band · Tri-Met│ │ Band · Tri-Met│ │ Band · Tri-Met│        │
│ │ Next Step CTA │ │ Next Step CTA │ │ Next Step CTA │ │ Next Step CTA │        │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: SUBSYSTEM CROSS-READINESS & SIGNAL HUB                                  │
│ ┌──────────────────────────────────────┐ ┌────────────────────────────────────┐ │
│ │ Assessment Summary (Diagnostic)      │ │ Project Lab Readiness (Defense)    │ │
│ │ Ability % · Strengths · Weaknesses   │ │ 0/6 Sections · Last Defense Date   │ │
│ │ [ Open Diagnostic / Retake ]         │ │ [ Open Project Lab / Defense ]     │ │
│ └──────────────────────────────────────┘ └────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Active Weakness & Remediation Triage Strip                                  │ │
│ │ [ Review DSA Remediation ] [ Open Review Queue ]                            │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: TARGET COMPANY ALIGNMENT RADAR & EVIDENCE LEDGER                        │
│ Target Company Requirements Table (Required vs Optional, Gap Severity)         │
│ Itemized Proof-of-Work Evidence Trace Panel (Interactive Deep-Link Audit)      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Zone-by-Zone Detailed Specifications — LOCKED

### 10.1 Zone 1: Interview Header & Readiness Telemetry Strip (`InterviewReadinessStrip.tsx`)
- **Purpose:** Provide immediate 5-second situational awareness of overall interview readiness, tri-factor telemetry, active anomalies, and company focus.
- **Canonical Data Sources:** `scorecard.overallBand`, `scorecard.overallEvidenceStrength`, `scorecard.overallConfidence`, `scorecard.overallFreshness`, `scorecard.activeRemediationCount`, `scorecard.staleEvidenceCount`, `scorecard.weakEvidenceCount`, `companyOverlays`, `selectedCompanyOverlayId`.
- **UI Elements:**
  - Page Title: *"Interview Readiness Scorecard"* with description.
  - Company Selector: `<select>` binding `selectedCompanyOverlayId` (`data-testid="interview-company-select"`).
  - Overall Readiness Badge (`data-testid="overall-band"`): Categorical chip for `Strong`, `Developing`, `Needs Work`, `Unassessed`.
  - Tri-Meter Readout:
    - Evidence Meter (`data-testid="overall-evidence"`, `data-testid="overall-evidence-value"`): Gold/Amber bar showing recorded capability evidence.
    - Confidence Meter (`data-testid="overall-confidence"`, `data-testid="overall-confidence-value"`): Sky Blue bar showing assessment certainty.
    - Freshness Meter (`data-testid="overall-freshness"`, `data-testid="overall-freshness-value"`): Emerald bar showing recency before decay.
  - Active Signal Chips (`data-testid="signal-chips"`):
    - Active Remediation Count (`AlertTriangle` icon).
    - Stale Dimensions Count (`Clock3` icon).
    - Weak Evidence Count (`TrendingUp` icon).
- **Strict Rule:** No single blended readiness percentage.

### 10.2 Zone 2: Primary Readiness Mission & Viva Simulation Hero (`InterviewHeroSpotlight.tsx`)
- **Purpose:** Serve as the dominant visual focal point directing the candidate to the single highest-leverage interview activity.
- **Canonical Data Sources:** Top candidate from `reviewCandidates` for interview domains, `assessmentIntegration.reassessmentRecommended`, `companyOverlay.overallGap`, `scorecard.activeRemediationCount`.
- **Logic Matrix:**
  1. *If unassessed:* Prompt to run Baseline Diagnostic (`#/assessment`).
  2. *If urgent DSA remediation exists:* Spotlight DSA Remediation review (`#/dsa`).
  3. *If company drive is scheduled $\le 30$ days with major gap:* Spotlight company-critical requirement drill.
  4. *If Project Defense not recorded/passed:* Spotlight Launch Project Defense session (`practice-project-defense-01`).
  5. *Default:* Spotlight Full Technical & Behavioral Mock Interview (`practice-mock-interview-01`).
- **UI Elements:**
  - Hero Card with subtle Electric Indigo radial border glow (`rgba(99,102,241,0.15)`).
  - Mission Headline & Dynamic Diagnosis text.
  - Target Outcome pill (e.g. *"+15% Evidence Strength in Interview Execution"*).
  - Defining Primary Action Button: Electric Indigo button with icon and direct routing.

### 10.3 Zone 3: 6-Vector Readiness Dimension Matrix (`InterviewDimensionMatrix.tsx` & `InterviewDimensionCard.tsx`)
- **Purpose:** Detailed evaluation of all 6 canonical dimensions with expandable evidence traces and direct action handoffs.
- **Canonical Data Sources:** `scorecard.dimensions` (`coding_dsa`, `core_cs`, `sql_programming`, `communication`, `interview_execution`, `projects`), `scorecard.companyOverlay`.
- **Card Elements (per dimension):**
  - Header: Dimension name, readiness band badge (`data-testid="dimension-band-<id>"`), and Company Required pill (`data-testid="dimension-company-required-<id>"` if applicable).
  - Gap explanation text and top evidence preview.
  - Three Separate Sub-Meters (`data-testid="dimension-capability-<id>"`, `data-testid="dimension-confidence-<id>"`, `data-testid="dimension-freshness-<id>"`).
  - Expandable Toggle (`data-testid="dimension-toggle-<id>"`): Reveals detailed meters, itemized evidence list, active weaknesses, and embedded `EvidenceTracePanel`.
  - Next Step Action Bar (`data-testid="dimension-action-<id>"`): Button navigating to `action.route` and `action.targetId`.

### 10.4 Zone 4: Subsystem Cross-Readiness & Signal Hub (`InterviewSignalHub.tsx`)
- **Purpose:** Bridge Interview Readiness with the Diagnostic Assessment, Project Lab, and Weakness Triage subsystems.
- **Canonical Data Sources:** `scorecard.assessmentIntegration`, `scorecard.projectReadiness`, `weaknessSignals`, `dsaProgress`.
- **Components:**
  1. **Assessment Summary Card (`data-testid="assessment-summary"`):**
     - Status: Assessed vs Not assessed (`data-testid="assessment-status"`).
     - Overall Ability $\%$ readout, Focus Area domain, Strengths list, Weaknesses list.
     - Reassessment recommended indicator (`data-testid="assessment-reassessment"`).
     - CTA Button (`data-testid="assessment-action"`): Routes to `#/assessment`.
  2. **Project Lab Readiness Card (`data-testid="project-readiness"`):**
     - Defense Readiness Band (`data-testid="defense-band"`).
     - Sections Completed ($0..6$), Defense Evidence Sessions count, Last Defense Date.
     - CTA Buttons: `"Open Project Lab"` (`data-testid="project-action"`) and `"Launch defense session"` (`data-testid="project-defense-action"`).
  3. **Weakness & Remediation Triage Strip (`data-testid="weakness-signals"`):**
     - 3 metric tiles (Active Remediation, Stale Dimensions, Weak Evidence).
     - Listed active weakness items.
     - Shortcut Buttons: `"Review DSA remediation"` (`data-testid="signal-action-dsa"`) and `"Open Review queue"` (`data-testid="signal-action-analytics"`).

### 10.5 Zone 5: Target Company Alignment Radar & Evidence Ledger (`InterviewCompanyAndTraceLedger.tsx`)
- **Purpose:** Full corporate requirement coverage breakdown and transparent evidence audit ledger.
- **Canonical Data Sources:** `scorecard.companyOverlay`, `dimensionTraces`, `useEvidenceCatalog()`.
- **Components:**
  1. **Company Readiness Overlay (`data-testid="company-overlay"`):**
     - Company Name, Target Role, Event Date, Days Until Countdown (`data-testid="company-days-until"`), Gap Severity Badge (`data-testid="company-gap-badge"`).
     - Empty state banner if no company selected (`data-testid="company-overlay-empty"`).
     - Dimension list (`data-testid="company-dimension-list"`) rendering required/optional status for each dimension (`data-testid="company-dimension-<id>"`).
     - Manage Overlays button (`data-testid="company-action"`): Routes to `#/companies`.
  2. **Evidence Trace & Audit Ledger:**
     - Transparent proof-of-work trace verifying derived sources from tasks, practice attempts, and DSA progress.

---

## 11. Cross-Subsystem Handoff Map — LOCKED

```
                       ┌────────────────────────┐
                       │  Today / Operational   │
                       └───────────┬────────────┘
                                   │ (Review Candidate / Interview Action)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ INTERVIEW READINESS SCORECARD (#/interview)                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Zone 1: Header & Readiness Telemetry Strip                              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Zone 2: Primary Readiness Mission & Viva Simulation Hero                │ │
│ │         [ Launch Interview Simulation ] ────────┐                       │ │
│ └─────────────────────────────────────────────────┼───────────────────────┘ │
│ ┌─────────────────────────────────────────────────┼───────────────────────┐ │
│ │ Zone 3: 6-Vector Dimension Matrix               │                       │ │
│ │         [ Next Step CTA per Dimension ] ────────┤                       │ │
│ └─────────────────────────────────────────────────┼───────────────────────┘ │
│ ┌─────────────────────────────────────────────────┼───────────────────────┐ │
│ │ Zone 4: Assessment & Project Readiness Hub      │                       │ │
│ │         [ Open Diagnostic / Defense ] ──────────┤                       │ │
│ └─────────────────────────────────────────────────┼───────────────────────┘ │
│ ┌─────────────────────────────────────────────────┼───────────────────────┐ │
│ │ Zone 5: Target Company Radar & Evidence Ledger  │                       │ │
│ └─────────────────────────────────────────────────┼───────────────────────┘ │
└───────────────────────────────────────────────────┼─────────────────────────┘
                                                    │
        ┌───────────────────┬───────────────────────┼───────────────────┬───────────────────┐
        ▼                   ▼                       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ DSA Practice │    │ Practice Hub │        │ Prep Hub     │    │ Diagnostic   │    │ Project Lab  │
│ #/dsa/<id>   │    │ #/practice   │        │ #/prep/<id>  │    │ #/assessment │    │ #/project    │
└──────────────┘    └──────────────┘        └──────────────┘    └──────────────┘    └──────────────┘
```

### Complete Cross-Subsystem Handoff Matrix:

| Source Subsystem | Incoming Trigger | Target in Interview Subsystem | State / Action |
|---|---|---|---|
| **Today** (`#/dashboard`) | Daily plan review candidate click | `#/interview` | Opens scorecard with relevant dimension highlighted. |
| **Roadmap** (`#/roadmap`) | Phase 3/4 milestone or mock task click | `#/interview` | Opens Interview Readiness Scorecard. |
| **Preparation** (`#/preparation`) | Interview topic prerequisite link | `#/interview` | Inspects dimension readiness before mock drills. |
| **Practice** (`#/practice`) | Practice attempt completion summary | `#/interview` | Returns to scorecard to view updated capability and band. |
| **DSA** (`#/dsa`) | DSA remediation resolution | `#/interview` | Verifies `coding_dsa` capability score increase. |
| **Skills** (`#/skills`) | Evidence trace link | `#/interview` | Inspects cross-domain interview dimension trace. |
| **Companies** (`#/companies`) | "View Interview Readiness" button | `#/interview` | Opens scorecard with that company overlay pre-selected. |
| **Project** (`#/project`) | Defense readiness link | `#/interview` | Verifies Project Lab readiness band update. |
| **Interview** (`#/interview`) | Dimension Next Step: DSA | `#/dsa/<problemId>` | Direct navigation to algorithmic problem drill. |
| **Interview** (`#/interview`) | Dimension Next Step: Practice | `#/practice/<sessionId>` | Launches technical/behavioral mock interview. |
| **Interview** (`#/interview`) | Dimension Next Step: Preparation | `#/preparation/<topicId>` | Opens foundational theory/interview lesson. |
| **Interview** (`#/interview`) | Assessment summary action | `#/assessment` | Launches baseline or reassessment diagnostic. |
| **Interview** (`#/interview`) | Project Lab readiness action | `#/project` | Opens Project Lab engineering workspace. |
| **Interview** (`#/interview`) | Company overlay action | `#/companies` | Opens target company requirement manager. |
| **Interview** (`#/interview`) | Weakness triage: Review queue | `#/analytics` | Opens telemetry and review queue. |
| **Interview** (`#/interview`) | Default fallback action | `#/dashboard` | Returns to Today's operational plan. |

---

## 12. Signature Motion & Micro-Interactions — LOCKED

### Motion: "Telemetry Signal Sweep" (`interview-signal-sweep`)
- **Visual Behavior:** A restrained, hardware-accelerated linear gradient sweep across the telemetry meter tracks and hero accent borders, communicating continuous deterministic evidence calculation.
- **Timing:** 18-second smooth ambient cycle.
- **Micro-Interactions:**
  - Dimension card expansion: `transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out`.
  - Meter progress bar transition: `transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1)`.
  - Hover states: 120ms ease-out subtle elevation shift (`translateY(-1px)`).
- **Accessibility Safeguard:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .interview-signal-sweep,
    .stagger-in,
    .readiness-glow {
      animation: none !important;
      transition: none !important;
    }
  }
  ```

---

## 13. Responsive Matrix — LOCKED

| Viewport Breakpoint | Layout Behavior & Structural Adjustments |
|---|---|
| **1440px+ (Ultra/Wide)** | Full max-w-[1400px] container. Zone 1 telemetry ribbon full horizontal layout. Zone 3 dimension cards in 2-column or 3-column dense grid. Zone 4 dual-card layout. |
| **1280px (Standard Desktop)** | Max-w-7xl container. Zone 1 telemetry in 3-column meter cluster. Zone 3 dimension cards in 2-column grid. Zone 4 side-by-side. |
| **1024px (Tablet Landscape)** | Zone 1 wraps company select below title. Zone 3 dimension cards in 2-column grid. Zone 4 stacks vertically if needed. |
| **768px (Tablet Portrait)** | Single column stack. Telemetry meters stack vertically. Dimension cards full width. All buttons full width or auto-wrap. |
| **375px (Mobile)** | Minimum 44px touch targets. Compact padding (`p-3.5`). Horizontal scrolling prevented. Monospace chips wrap cleanly. |

---

## 14. Accessibility Specification — LOCKED

- **Heading Hierarchy:**
  - `<h1>`: *"Interview Readiness Scorecard"* (Zone 1)
  - `<h2>`: *"Primary Interview Mission"* (Zone 2)
  - `<h2>`: *"Readiness Dimensions"* (Zone 3)
  - `<h2>`: *"Assessment Summary"* (Zone 4)
  - `<h2>`: *"Project Lab Readiness"* (Zone 4)
  - `<h2>`: *"Active Weakness & Remediation Signals"* (Zone 4)
  - `<h2>`: *"Company Readiness Overlay"* (Zone 5)
- **ARIA Contracts:**
  - Meter components: `role="progressbar"`, `aria-valuenow={value}`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label={label}`.
  - Dimension expansion toggles: `aria-expanded={isExpanded}`, `aria-controls={"dimension-detail-" + id}`.
  - Company selector: `<select>` properly paired with `<label htmlFor="interview-company-select">`.
- **Keyboard Navigation:** Full Tab, Enter, Space control across all toggles, select options, and action buttons with prominent Electric Indigo focus rings (`ring-2 ring-[#6366F1] ring-offset-2 ring-offset-[#0B0D10]`).
- **Contrast Ratios:** Minimum $4.5:1$ on all body text; $3:1$ on structural borders and interactive controls.
- **Non-Color Indicators:** Every status/band pairs color with explicit text (`Strong`, `Developing`, `Needs Work`, `Unassessed`) and distinctive Lucide icons.

---

## 15. Architecture Guardrails — LOCKED

The implementation strictly enforces:
- **No new readiness engine:** Must use existing `src/engine/interviewReadinessEngine.ts`.
- **No new scoring formula:** Must use existing `calculateTopicReadiness`, `calculateDomainReadinessList`, `generateReviewCandidates`, `calculateProjectReadiness`.
- **No blended percentage score:** Never introduce a fake single percentage score.
- **No backend or cloud API calls:** 100% local-first offline execution.
- **No runtime LLM or AI generation:** 100% deterministic algorithms.
- **No changes to storage schema:** State schema remains locked to `AppExtendedStorageState`.
- **Untracked TodayGuide protection:** `src/components/dashboard/TodayGuide.tsx` must NEVER be modified.
- **100% Test Preservation:** All existing tests in `interviewReadinessView.test.tsx`, `interviewReadiness.test.ts`, and `evidenceTrace.test.ts` must pass without regressions.

---

## 16. Manufacturing Sequence & Modular Architecture — LOCKED

In the subsequent manufacturing task, the 956-line monolithic `InterviewReadinessView.tsx` will be modularized into a clean component architecture:

```
src/components/interview/
├── InterviewReadinessView.tsx            # Main container & context orchestrator (~180 lines)
├── InterviewReadinessStrip.tsx           # Zone 1: Header, company select, tri-meter, signal chips
├── InterviewHeroSpotlight.tsx            # Zone 2: Primary readiness mission & simulation launcher
├── InterviewDimensionMatrix.tsx          # Zone 3: 6-vector dimension grid container
├── InterviewDimensionCard.tsx            # Zone 3: Individual dimension card with mini-meters & trace
├── InterviewSignalHub.tsx                # Zone 4: Assessment summary, Project readiness, Weakness triage
└── InterviewCompanyAndTraceLedger.tsx    # Zone 5: Company alignment radar & evidence audit ledger
```

### Manufacturing Steps:
1. **Step 1:** Create modular sub-components in `src/components/interview/` preserving all existing `data-testid` attributes and accessibility contracts.
2. **Step 2:** Refactor `InterviewReadinessView.tsx` to orchestrate the sub-components cleanly.
3. **Step 3:** Apply Electric Indigo (`#6366F1`) visual design tokens and obsidian elevation layers.
4. **Step 4:** Verify all existing test suites (`npm test -- src/test/interviewReadinessView.test.tsx`, `src/test/interviewReadiness.test.ts`, `src/test/evidenceTrace.test.ts`).
5. **Step 5:** Add comprehensive new test suites covering edge cases, company filters, hero dispatch, and accessibility.
6. **Step 6:** Execute complete quality gates (`npm test`, `npm run lint`, `npm run build`).

---

## 17. Non-Goals — LOCKED

1. **Non-Goal:** Inventing an AI mock interviewer bot or audio/video recording widget in V1.
2. **Non-Goal:** Blending capability, confidence, and freshness into an unexplainable single percentage.
3. **Non-Goal:** Creating a separate or conflicting readiness calculation outside `interviewReadinessEngine.ts`.
4. **Non-Goal:** Storing interview notes or ratings in an external cloud database.
5. **Non-Goal:** Altering the canonical milestone conditions or roadmap phase definitions.

---

## 18. Final Specification Sign-Off — LOCKED

- **Subsystem:** Interview Readiness (`#/interview`)
- **Status:** **INTERVIEW SPEC FROZEN — READY FOR MANUFACTURING**
- **Authority:** Definitive UI/UX and engineering specification for Task 87.
