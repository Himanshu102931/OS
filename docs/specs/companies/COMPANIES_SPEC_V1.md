# PlacementOS Companies Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.  
**Baseline commit:** `d0b1d8d` — `feat(skills): redesign verification matrix and competence ledger`  
**Date:** 2026-10-07  
**Scope:** `src/components/companies/*` (Companies Hub View, Target Company Cards Grid, Primary Target Focus Hero, Requirement Coverage Matrix, Requirement Traceability Drawer, Company Profile Modal), integration with `PlacementContext.tsx`, `companyEngine.ts`, `companyPlanEngine.ts`, `evidenceTrace.ts`, and the Companies test suite.

> **Reading contract.**  
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-preservation decision for the Companies page redesign. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. The specification strictly preserves all existing engine functions (`companyEngine.ts`, `companyPlanEngine.ts`, `skillsEngine.ts`, `evidenceTrace.ts`), storage schemas, routing contracts, requirement evaluation algorithms, and test assertions. The only file authorized in this task is this specification document; UI implementation is deferred to the subsequent manufacturing task.

---

## 1. Purpose — LOCKED

PlacementOS is a local-first, zero-backend personal placement preparation operating system spanning September 2026 to May 2027.

The **Companies Subsystem** (`#/companies`) is the student's **Target Alignment Radar & Recruiter Requirement Matrix**. It answers the strategic recruitment questions:
> *"Which companies am I actively targeting for campus or off-campus placement? When are their online assessments or interview drives scheduled? What specific domains, topics, and programming languages do they demand? What is my live readiness percentage against each company's bar, and what exact gap should I close next to become drive-ready?"*

### Core Design Principle
```
Drive Timeline & Readiness Strip → Dominant Target Focus Hero → Multi-Company Radar Grid → Requirement Coverage Matrix → Causal Traceability Drawer → Deterministic Action Handoffs
```

The redesigned Companies page must make it immediately obvious within **5 seconds**:
1. **What Companies is for:** Strategic corporate target tracker mapping recruiter drive timelines and skill requirements against live preparation evidence.
2. **Which company is top priority right now:** Dominant spotlight on the nearest upcoming recruitment drive or high-priority target company.
3. **What my readiness is:** Clear percentage ($0..100\%$) and requirement coverage score (*X / Y Requirements Covered*).
4. **What my biggest preparation gap is:** Plain-language deficit explanation (e.g. *"Graph algorithms not practiced (Level 1/4)"*).
5. **What I should do next:** One-click deterministic routing to the exact canonical workspace (Preparation lesson, DSA problem, or Practice drill) to close the company's requirement deficit.

---

## 2. Current Page Architecture & Forensic Map — LOCKED

### 2.1 Route & Deep-Link Model
- **Base Route:** `#/companies` (Full Target Company Portfolio & Requirements).
- **Target Route (Deep-Link):** `#/companies/<companyId>` (e.g. `#/companies/comp-google`, `#/companies/comp-amazon`).
- **Target Resolution in CompaniesView:**
  - When `routeState.targetId` is present, `CompaniesView` locates the target `CompanyOverlay` and automatically opens the Requirement Detail Drawer for that company.
  - Handoffs from Companies:
    - Preparation handoff $\rightarrow$ `setRoute('preparation', prepTopicId)`
    - DSA handoff $\rightarrow$ `setRoute('dsa', problemId)`
    - Practice handoff $\rightarrow$ `setRoute('practice', sessionId)`
    - Roadmap handoff $\rightarrow$ `setRoute('roadmap', taskId)`
    - Skills handoff $\rightarrow$ `setRoute('skills', topicId)`

### 2.2 Component Hierarchy (Current)
```
AppShell (src/components/layout/AppShell.tsx)
└── CompaniesView (src/components/companies/CompaniesView.tsx) [342 lines]
    ├── Header & GuideTrigger (route="companies") + "Add Target Company" Button
    ├── Empty State (If companyOverlays.length === 0)
    ├── Target Companies Grid (Cards for each companyOverlay)
    │   ├── Card Header (Company name, target role, readiness %)
    │   ├── Event Date Badge (Assessment date or 'Not scheduled')
    │   ├── Top 3 Preparation Gaps (Gap pills with status labels)
    │   └── Card Actions (Inspect Requirements, Edit Company, Delete Confirmation)
    ├── CompanyModal (src/components/companies/CompanyModal.tsx) [219 lines]
    │   ├── Company Name, Target Role, Application Status
    │   ├── Assessment / Event Date
    │   ├── Required Domains (Checkboxes for 11 domains)
    │   └── Required Languages (Comma-separated text input)
    └── CompanyRequirementDetailModal (src/components/companies/CompanyRequirementDetailModal.tsx) [214 lines]
        ├── Requirement header, status badge, category
        ├── Metrics Grid (Evidence strength, level progress, evidence classification)
        ├── EvidenceTracePanel (Causal evidence trace with deep links)
        └── "Execute Action" Button -> routes to DSA/Roadmap/Prep/Practice
```

### 2.3 Canonical Data Sources & State Slices
| Entity | Canonical Source | Purpose & Storage Contract |
|---|---|---|
| **Company Overlays** | `companyOverlays` (`appState.companyOverlays` in `StorageAdapter.ts`) | Persistent list of user-configured target companies with role, event date, application status, required domains, topics, and languages. |
| **Domain Master Catalog** | `DOMAINS` (`src/data/seedData.ts`) | 11 canonical placement domains. |
| **Topic Master Catalog** | `TOPICS` (`src/data/seedData.ts`) | Master catalog of curriculum topics with importance ($1..10$). |
| **Roadmap Task Progress** | `taskProgress` (`appState.taskProgress`) | Task completions contributing to domain & language requirements. |
| **DSA Progress & Attempts** | `dsaProgress`, `dsaAttempts` (`appState.dsaProgress`, `appState.dsaAttempts`) | Algorithmic mastery records contributing to DSA requirements. |
| **Topic Skill States** | `skillStates` (`appState.skillStates`) | Topic-level evidence strength and freshness decay. |
| **Company Snapshot Engine** | `calculateCompanySnapshot()` (`companyEngine.ts`) | Pure deterministic computation of requirement coverage, gap explanations, and overall preparation strength ($0..100\%$). |
| **Company Plan Engine** | `calculateCompanyDeadlineUrgency()`, `selectCompanyFocusCandidates()`, `validateCompanyRecommendedAction()` (`companyPlanEngine.ts`) | Deadline urgency scoring ($0..25$), roadmap overlay injection, and verifiable handoff destination checking. |

---

## 3. Current UX Audit — LOCKED

| Criterion | Current Rating | Forensic Findings |
|---|---|---|
| **A. 5-Second Comprehension** | **POOR** | The page opens with an unranked grid of company cards. The user cannot immediately see which company has the most urgent drive date or what single action should be taken today. |
| **B. Visual Hierarchy** | **MEDIOCRE** | Extensive legacy hardcoded hex codes (`#14171D`, `#1B2028`, `#262D38`, `#E5A93C`, `#FFC665`, `#432C00`, `#10B981`, `#F59E0B`, `#0D0F12`). Lacks chiseled obsidian planes and unified semantic tokens. |
| **C. Primary Action Dominance** | **FAIL** | Every company card has 3 equal buttons (*Inspect, Edit, Delete*). There is no dominant primary CTA connecting company gaps directly to practice or learning. |
| **D. Drive Urgency & Countdown** | **INCOMPLETE** | Event date is displayed only as a raw ISO date string (e.g. `2026-11-15`) without a plain-language countdown (e.g. `12 days left — Urgent`) or urgency badge. |
| **E. Requirement Inspection Flow** | **DISJOINTED** | Clicking "Inspect Requirements" opens a raw modal dialog, which then opens a *second* nested modal for requirement details. This multi-modal stacking confuses context. |
| **F. Empty State Experience** | **BASIC** | When zero companies exist, the empty state gives text but no quick starter templates (e.g. "Add FAANG/Tier-1 Template", "Add Product Company"). |
| **G. Responsive Layout** | **SUBOPTIMAL** | Nested modals overflow on mobile screens (<768px). Grid cards wrap awkwardly when company names or roles are long. |
| **H. Accessibility** | **INCOMPLETE** | Missing explicit `role="tablist"` / `role="tab"` on filters, missing progressbar aria contracts, missing focus traps on delete confirmation. |

---

## 4. 5-Second Test Evaluation — LOCKED

| Question | Current Status | Redesign Resolution |
|---|---|---|
| **1. Which companies am I targeting?** | Visible in grid, but unranked. | Add structured **Target Portfolio Strip** with total targets, ready targets, and upcoming drive countdown. |
| **2. Which company is top priority right now?** | Buried in card grid. | Introduce **Primary Target Focus & Urgency Hero** surfacing the nearest drive date with high-contrast countdown. |
| **3. What is my readiness?** | Small number on card. | Clear **Readiness Meter** ($0..100\%$) and **Requirement Coverage Fraction** (e.g. `4/6 Covered`). |
| **4. What is my biggest preparation gap?** | Small text list on card. | Prominent **Critical Requirement Gap Spotlight** with exact deficit rationale. |
| **5. What should I do next?** | Must click 2 modals deep. | 1-click **"Prepare for Company"** Coral action CTA routing directly to Preparation, DSA, or Practice. |

---

## 5. Visual Metaphor & Aesthetic System — LOCKED

### 5.1 Chosen Metaphor: "Target Alignment Radar & Recruiter Requirement Matrix"
The Companies page is an **instrument-grade corporate recruitment radar**:
- **Clean Obsidian Planes:** Surface planes (`#0B100D`, `#111713`, `#161E19`, `#1B241F`) with 1px subtle boundary lines (`#28352D`).
- **Forest Green Brand Identity:** Canonical brand green (`#2E8B62`, `#4CAF78`, `#65D3A3`) reserved for covered requirements, passing company readiness states ($\ge 75\%$), and confirmed offers.
- **Controlled Page Action Accent (Crimson Rose / Coral Flame):** Dedicated high-contrast action accent (`#F43F5E` / `#FB7185` / `rgba(244, 63, 94, 0.12)`) reserved strictly for the defining company preparation action ("Prepare for Company", "Close Requirement Gap", "Activate Company Focus").
- **Warm Bronze / Amber Warning (`#D19A45`):** Reserved for approaching deadlines ($\le 14\text{d}$), developing requirements, and applied application status.
- **Chiseled Technical Structure:** Crisp typography (Inter for UI, JetBrains Mono for dates, scores, and requirement badges), restrained radii (`0.375rem`), and flat technical surfaces without decorative neon or arbitrary gradients.

---

## 6. Defining User Action & Action Accent — LOCKED

### 6.1 The One Defining Action: `"Prepare for Company"` / `"Close Company Gap"`
On the Companies page, the defining user mission is to **bridge identified company-specific requirement deficits by immediately executing the single highest-impact preparation or practice activity**.

### 6.2 Proposed Page Action Accent: Crimson Rose / Coral Flame
```css
--action-accent-companies: #F43F5E;
--action-accent-companies-hover: #FB7185;
--action-accent-companies-subtle: rgba(244, 63, 94, 0.12);
--action-accent-companies-border: rgba(244, 63, 94, 0.35);
--action-accent-companies-ring: #FECDD3;
```
- **Rationale:**
  - Distinct from Sky Cyan (Today), Emerald Jade (Roadmap), Precision Mint (DSA), Golden Amber (Preparation), Cobalt Electric Blue (Practice), and Violet Amethyst (Skills).
  - Evokes target focus, recruitment deadlines, drive urgency, and precision alignment.
  - High contrast on obsidian dark canvas (passing WCAG AAA 7:1 for text with `#FECDD3` / `#FFE4E6`).
  - Never used as a second page theme; strictly applied to the primary "Prepare for Company" CTA, active target highlight, and requirement execution buttons.

---

## 7. Information Architecture & Page Zones — LOCKED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: COMPANIES HEADER & DRIVE TIMELINE STRIP                             │
│ • Page Title & Placement Objective + GuideTrigger + "Add Company" Action    │
│ • 4-Metric Drive Strip: Active Targets Count, Highest Readiness %,          │
│   Next Drive Countdown, Total Unresolved Requirement Gaps                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: PRIMARY TARGET FOCUS & DRIVE URGENCY HERO (Dominant Focus)          │
│ • Nearest Drive / Top Target Company (Highest Urgency Score Boost 0..25)    │
│ • Target Role, Application Status Pill, Days Until Event Countdown          │
│ • Overall Preparation Readiness % + Requirement Coverage Fraction (e.g. 5/7)│
│ • Top Critical Gap Spotlight with Plain-Language Deficit Rationale          │
│ • Primary Coral CTA: "Prepare for Company" [Routes to Prep/DSA/Practice]    │
│ • Secondary CTA: "Inspect All Requirements"                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: TARGET COMPANIES PORTFOLIO & RADAR GRID                             │
│ • Filter Bar (Sort by Urgency, Readiness, Status, Search)                   │
│ • Responsive Company Cards:                                                 │
│   - Company name, role, application status badge                            │
│   - Readiness score (0..100%) + Mini Progressbar                            │
│   - Assessment Date badge with dynamic countdown tag                        │
│   - Required Domains & Languages badges                                     │
│   - Top 2 actionable requirement gaps                                       │
│   - Actions: "Inspect Requirements", "Edit", "Delete"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 4: REQUIREMENT COVERAGE MATRIX & GAP BREAKDOWN                         │
│ • Active Company Requirements Ledger (Domains, Topics, Languages)           │
│ • Requirement Row: Name, Category, Evidence Strength %, Level Progress,     │
│   Status Badge (Covered / Evidence Present / Developing / Gap Identified)    │
│   and 1-Touch Action: "Close Gap"                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: REQUIREMENT TRACEABILITY & COMPANY PROFILE WORKBENCH                │
│ • Slide-over Drawer with Focus Trap (Eliminates Nested Modal Stacking)      │
│ • Full Multi-Modal Causal Evidence Breakdown via EvidenceTracePanel         │
│ • Add / Edit Company Profile Modal with Clean Initial State & Cancel Safety │
│ • Direct Verified Deep-Link Execution Button                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Zone Details

#### Zone 1: Companies Header & Drive Timeline Strip
- **Header:** Title *"Target Companies & Requirement Mapping"* with subtitle *"Track recruitment drive timelines, map role requirements, and close company preparation gaps."*
- **Actions:** `<GuideTrigger route="companies" />` and primary `"Add Target Company"` button.
- **4-Metric Drive Strip:**
  1. *Active Target Companies:* Total configured company overlays count (e.g. `4 Active Targets`).
  2. *Top Target Readiness:* Highest company readiness percentage across all active overlays (e.g. `78%`).
  3. *Next Recruitment Drive:* Nearest event date countdown (e.g. `Google in 12d` or `No drive scheduled`).
  4. *Total Requirement Gaps:* Sum of unfulfilled requirement gaps across all active overlays.

#### Zone 2: Primary Target Focus & Drive Urgency Hero (Dominant Focus)
- Deterministically spotlights the #1 highest-priority company overlay:
  - Selected by `calculateCompanyDeadlineUrgency()` (nearest `eventDate`) or highest company priority.
- Displays:
  - Company name, target role, application status pill (*Target, Applied, OA Scheduled, Interview Scheduled, Offered, Rejected*).
  - Drive countdown badge (e.g. `12 days until Online Assessment · Urgent`).
  - Overall readiness percentage ($0..100\%$) with dual progress bar showing covered requirements fraction.
  - Critical requirement gap spotlight: *"SQL Joins & Transactions not verified (Level 1/3) — Need +35% evidence."*
  - Primary Action CTA: `"Prepare for Company"` in Coral action accent, executing `recommendedAction` (routes to Preparation, DSA, or Practice).
  - Secondary Action CTA: `"Inspect All Requirements"`.

#### Zone 3: Target Companies Portfolio & Radar Grid
- Grid of all user-configured company overlay cards.
- **Sort & Filter Controls:**
  - Sort by: *Drive Urgency (Nearest Date First)*, *Highest Readiness*, *Lowest Readiness*, *Company Name*.
  - Filter by Application Status: *All Statuses, Target, Applied, OA Scheduled, Interview Scheduled, Offered*.
- **Card Specifications:**
  - Company name, target role, application status pill.
  - Overall readiness score ($0..100\%$) with progress bar.
  - Assessment date badge with dynamic countdown.
  - Required domain and language chips.
  - Top 2 actionable requirement gaps.
  - Action buttons: *"Inspect Requirements"*, *"Edit"*, and inline *"Delete"* with confirmation safety.
- **Empty State:** High-clarity onboarding card explaining how company overlays prioritize preparation without rewriting the master curriculum.

#### Zone 4: Requirement Coverage Matrix & Gap Breakdown
- Displayed when a company is actively selected for inspection.
- Tabbed/categorized ledger of requirements:
  - *All Requirements*, *Domains*, *Topics*, *Languages*.
- Requirement Row:
  - Requirement name, category chip (*Domain, Topic, Language*).
  - Evidence strength percentage ($0..100\%$) and capability level progress ($L1 / L4$).
  - Status badge (*Requirement Covered, Evidence Present, Developing, Gap Identified, Not Configured*).
  - Direct 1-touch action button: *"Close Gap"* launching the requirement's verified learning target.

#### Zone 5: Requirement Traceability & Profile Workbench Drawer
- Slide-over drawer replacing confusing legacy nested modal dialogs.
- **Traceability View:**
  - Complete causal breakdown of supporting evidence via `buildCompanyGapTrace()` and `EvidenceTracePanel`.
  - Concrete tasks completed, DSA problems solved, and practice drill scores.
  - Direct deep-link execution button verified by `validateCompanyRecommendedAction()`.
- **Add / Edit Company Profile Modal:**
  - Clean form controls for Company Name, Target Role, Application Status, Event Date, Domain checkboxes (11 domains), and Language tags.
  - Keyed remounting ensuring clean form reset on cancel or company switch.

---

## 8. Epistemic Integrity & Data Models — LOCKED

### 8.1 Distinct Concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. COMPANY REQUIREMENT                                                      │
│    • External prerequisite benchmark (e.g. Amazon requires DSA L4, SQL L3)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. USER CAPABILITY LEVEL (0..5)                                             │
│    • Concrete demonstrated proficiency level derived from topic importance  │
│      and verified proof.                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. EVIDENCE STRENGTH (0..100%)                                              │
│    • Objective proof score accumulated from tasks, DSA, and drills,         │
│      decayed by inactivity over time.                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. COMPANY READINESS (0..100%)                                              │
│    • Weighted aggregate preparation strength across all requirements of a   │
│      specific company overlay.                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. DRIVE URGENCY BOOST (0..25)                                              │
│    • Deadline proximity score calculated deterministically from eventDate: │
│      ≤0d: +25, ≤3d: +22, ≤7d: +18, ≤14d: +14, ≤30d: +8, >30d: +3            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. PREPARATION GAP                                                          │
│    • Concrete deficit between company requirement threshold and current    │
│      demonstrated evidence.                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Motion System & Micro-Interactions — LOCKED

### 9.1 Signature Motion: "Target Alignment Radar & Deadline Traveler"
- **Target Beam:** Subtle horizontal traveling energy line (`company-deadline-beam`) along the top border of the Primary Target Focus Hero.
- **Target Card Pulse:** Gentle border glow feedback (`company-target-pulse`) on high-urgency ($\le 7\text{d}$) company cards.
- **Drawer Slide:** Hardware-accelerated slide-in animation (`company-drawer-slide`) for the Requirement Detail Drawer.
- **Reduced Motion Support:** All continuous beams and animations strictly collapse to 0ms when `prefers-reduced-motion: reduce` is active.

```css
/* Signature Motion Tokens */
@keyframes company-deadline-sweep {
  0% { transform: translateX(-100%); opacity: 0; }
  20% { opacity: 0.85; }
  80% { opacity: 0.85; }
  100% { transform: translateX(350%); opacity: 0; }
}

.company-deadline-track {
  position: relative;
  overflow: hidden;
}

.company-deadline-beam {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 30%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(244, 63, 94, 0.15) 25%,
    rgba(244, 63, 94, 0.8) 50%,
    rgba(244, 63, 94, 0.15) 75%,
    transparent 100%
  );
  filter: blur(0.5px);
  animation: company-deadline-sweep 3.5s ease-in-out infinite;
  pointer-events: none;
  will-change: transform;
}

@keyframes company-drawer-slide-in {
  from { transform: translateX(100%); opacity: 0.85; }
  to { transform: translateX(0); opacity: 1; }
}

.company-drawer-slide {
  animation: company-drawer-slide-in 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .company-deadline-beam { display: none !important; animation: none !important; }
  .company-drawer-slide { animation: none !important; transform: none !important; }
}
```

---

## 10. Responsive Behavior & Breakpoints — LOCKED

| Viewport | Breakpoint | Layout Adaptations |
|---|---|---|
| **Desktop XL** | `1440px+` | Max container width `1400px`. 4-metric strip in 1 row. 3-column company radar grid. Side-by-side requirement matrix. Drawer width `600px`. |
| **Desktop / Laptop** | `1024px – 1439px` | 4-metric strip in 2x2 grid. 2-column company radar grid. Full-width requirement matrix. |
| **Tablet** | `768px – 1023px` | 2x2 metric strip. 1-column stacked company cards. Drawer width `85vw`. |
| **Mobile** | `375px – 767px` | 1-column stacked layout. Compact metric tiles. Full-width 1-touch actions. Drawer becomes full-screen bottom sheet. Zero horizontal overflow. |

---

## 11. Accessibility Specifications — LOCKED

1. **Semantic Structure:**
   - Single `<h1>` for page header.
   - `<h2>` for major sections (Primary Target Focus Hero, Target Companies Portfolio, Requirement Matrix).
   - `<h3>` for individual company card titles and requirement names.
2. **ARIA Contracts:**
   - Filter controls: `role="tablist"` / `role="tab"` or accessible `<select>` elements with explicit labels.
   - Traceability Drawer & Edit Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
   - Progress meters: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
3. **Keyboard Controls:**
   - Sequential `Tab` / `Shift+Tab` flow.
   - `Escape` key closes drawers and modal overlays.
   - High-contrast visible focus rings: `outline: 2px solid var(--focus, #65D3A3)`.
4. **Color Contrast:**
   - Text on dark background (`#0B100D`): `#E8F0E9` (13.5:1 ratio).
   - Coral action accent text: `#FECDD3` / `#FFFFFF` on `#F43F5E` (6.2:1 ratio).
   - Non-color status indicators: Every status state accompanied by explicit text labels and distinct Lucide icons (`ShieldCheck`, `TrendingUp`, `AlertTriangle`, `Calendar`, `Building2`).

---

## 12. Cross-Subsystem Handoffs & Deep-Link Preservation — LOCKED

1. **Companies $\rightarrow$ Preparation Handoff:**
   - Requirement recommended action executes `setRoute('preparation', prepTopicId)`.
2. **Companies $\rightarrow$ DSA Handoff:**
   - Algorithmic requirement action executes `setRoute('dsa', problemId)`.
3. **Companies $\rightarrow$ Practice Handoff:**
   - Drill requirement action executes `setRoute('practice', sessionId)`.
4. **Companies $\rightarrow$ Roadmap Handoff:**
   - Task requirement action executes `setRoute('roadmap', taskId)`.
5. **Companies $\rightarrow$ Skills Handoff:**
   - Topic requirement action executes `setRoute('skills', topicId)`.
6. **Companies $\rightarrow$ Today Integration:**
   - Active company requirements and urgency scores dynamically reprioritize daily recommendations via `companyPlanEngine.ts` and `adaptiveEngine.ts` without modifying canonical storage.

---

## 13. Architecture Safety & Token Migration Guardrails — LOCKED

1. **Zero Scoring Engine Rewrites:**
   - `calculateCompanySnapshot()` in `src/engine/companyEngine.ts` remains the single source of company readiness calculation.
   - `calculateCompanyDeadlineUrgency()` in `src/engine/companyPlanEngine.ts` remains the single source of urgency scoring.
   - `validateCompanyRecommendedAction()` in `src/engine/companyPlanEngine.ts` remains the single source of handoff destination verification.
   - `buildCompanyGapTrace()` in `src/engine/evidenceTrace.ts` remains the single source of company traceability truth.
2. **Token Migration Contract:**
   - Eliminate all hardcoded hex strings in Companies components:
     - Replace `#0D0F12` $\rightarrow$ `var(--background)` / `bg-background`
     - Replace `#14171D` $\rightarrow$ `var(--surface)` / `bg-surface`
     - Replace `#1B2028` $\rightarrow$ `var(--surface-elevated)` / `bg-surface-elevated`
     - Replace `#262D38` $\rightarrow$ `var(--border)` / `border-border`
     - Replace `#F1F5F9` $\rightarrow$ `var(--foreground)` / `text-foreground`
     - Replace `#8E98A8` $\rightarrow$ `var(--foreground-muted)` / `text-foreground-muted`
     - Replace `#E5A93C` $\rightarrow$ Coral action accent for primary CTA, or `var(--warning)` (`#D19A45`) for date alerts.
3. **Protected Files:**
   - `src/components/dashboard/TodayGuide.tsx` MUST NOT be touched, modified, staged, or deleted.

---

## 14. Acceptance Criteria for Subsequent Manufacturing Task — LOCKED

When manufacturing the Companies UI in the subsequent task, the implementation will be accepted ONLY if:

- [ ] `CompaniesView.tsx` is broken down into modular, maintainable components (`CompaniesHeader.tsx`, `CompanyDriveStrip.tsx`, `PrimaryCompanyHero.tsx`, `CompanyGrid.tsx`, `CompanyRequirementMatrix.tsx`, `CompanyRequirementDrawer.tsx`).
- [ ] All hardcoded legacy hex codes are migrated to semantic CSS tokens.
- [ ] Coral Flame (`--action-accent-companies`) is applied strictly to primary company preparation actions.
- [ ] Primary Target Focus Hero prominently spotlights the #1 nearest drive with a 1-click "Prepare for Company" CTA.
- [ ] Multi-company radar grid supports sorting by urgency, readiness, and status with clean delete safety.
- [ ] Requirement Matrix displays clear category breakdowns (Domains, Topics, Languages) with direct 1-touch gap closure triggers.
- [ ] Requirement Traceability Drawer eliminates nested modal stacking and presents full causal evidence trees.
- [ ] All existing company test suites (including `companyEngine.test.ts`, `companyPlanEngine.test.ts`, `companyCrud.test.tsx`, `companyDailyPlan.test.tsx`) pass 100% green.
- [ ] Production build (`npm run build`) and ESLint (`npm run lint`) succeed with zero errors.
- [ ] `src/components/dashboard/TodayGuide.tsx` remains completely untouched.

---

## 15. Explicit Non-Goals — LOCKED

The following are strictly out of scope for the Companies redesign:
- **NO runtime LLM / AI generated company requirement scrapers**.
- **NO backend, database, or cloud sync** — pure local-first architecture.
- **NO modifications to deadline urgency formulas or scoring weights**.
- **NO redesign of other pages** (Today, Roadmap, DSA, Preparation, Practice, Skills).
- **NO new external dependencies**.

---

## 16. Manufacturing Sequence

1. **Step 1: Component Decomposition**
   - Create `src/components/companies/CompaniesHeader.tsx`
   - Create `src/components/companies/CompanyDriveStrip.tsx`
   - Create `src/components/companies/PrimaryCompanyHero.tsx`
   - Create `src/components/companies/CompanyGrid.tsx`
   - Create `src/components/companies/CompanyRequirementMatrix.tsx`
   - Upgrade `src/components/companies/CompanyRequirementDetailModal.tsx` $\rightarrow$ `CompanyRequirementDrawer.tsx`
   - Upgrade `src/components/companies/CompanyModal.tsx`
2. **Step 2: CSS Token Integration**
   - Add `--action-accent-companies` and signature motion classes (`company-deadline-sweep`, `company-drawer-slide`) to `src/index.css`.
3. **Step 3: View Orchestration**
   - Update `src/components/companies/CompaniesView.tsx` to compose the modular components.
4. **Step 4: Manufacturing Test Suite**
   - Create `src/test/companiesManufacturing.test.tsx` verifying all 5 zones, urgency sorting, requirement matrix, and handoffs.
5. **Step 5: Quality Gate Audits**
   - Verify `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

---

**Specification Frozen By:** Antigravity AI  
**Next Step:** Companies UI Manufacturing Task
