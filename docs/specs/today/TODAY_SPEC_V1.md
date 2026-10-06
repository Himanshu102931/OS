# PlacementOS Today Page — Final Visual Specification v1.0

**Status:** SPECIFICATION ONLY — FROZEN. No implementation is authorized by this document alone; it is the manufacturing blueprint for the subsequent UI implementation task.
**Baseline commit:** `c4234cc` — `feat: integrate DSA assignments into evening reflection`
**Date:** 2026-10-05
**Scope:** `src/components/dashboard/*` (Today page surface), `src/index.css` token reconciliation, and the Today-related test suite.

> **Reading contract.**
> This document resolves every visual, structural, behavioral, responsive, accessibility, animation, and test-migration decision for the Today page. Manufacturing must not reopen these decisions. Sections marked **LOCKED** are final. Where the spec says "replace a test", the replacement contract is itself specified here — the implementer does not invent new design intent. The only file this spec authorizes the *spec task* to create is this file; implementation is a separate, later task.

---

## 1. Final Visual Direction — LOCKED

### 1.1 Identity

**CALM TECHNICAL COMMAND CENTER** — a premium, aesthetic, dark **forest-green** identity.

The green direction is intentional and **supersedes the older bronze/amber direction** as the primary brand/accent family. Bronze/amber survives only as a **secondary semantic color** (time-urgency and warning states) — never as brand identity, never as the primary CTA color, never as decorative accent.

The intended feel: premium, modern, technical, calm, sophisticated, visually distinctive, aesthetic, alive, easy to understand, information-rich without feeling crowded.

Explicitly forbidden feel: generic SaaS, cyberpunk, crypto dashboard, neon, childish, overly gamified, glassmorphism-heavy, visually noisy, card-overload, dependent on decorative effects.

### 1.2 Source of green truth

The canonical green system already exists in the repository and is **test-pinned**:

- `src/index.css:116-151` — `:root` semantic tokens, header comment: *"PlacementOS Semantic Color Tokens — 90–95% Dark Technical Workspace + Forest Green Identity"*.
- `src/test/guideSystem.test.tsx` (`C11 — Color System Tokens & Contrast`) asserts the exact hex values below. **These values are immutable.**

**Canonical palette (immutable):**

| Token | Value | Role |
|---|---|---|
| `--background` | `#0B100D` | page canvas (Level 0) |
| `--surface` | `#111713` | panel surface (Level 1) |
| `--surface-muted` | `#161E19` | subtle container (Level 1−) |
| `--surface-elevated` | `#1B241F` | elevated card (Level 2) |
| `--foreground` | `#E8F0E9` | primary text |
| `--foreground-muted` | `#9AA99F` | secondary text |
| `--foreground-subtle` | `#86958B` | **NEW** tertiary/metadata text (see §1.4) |
| `--border` | `#28352D` | default 1px border |
| `--border-active` | `#3C4E43` | active/emphasis border |
| `--primary` | `#2E8B62` | forest green primary (filled CTAs) |
| `--primary-hover` | `#3AA875` | primary hover |
| `--primary-foreground` | `#F3F7F3` | text on primary |
| `--accent` | `#46B982` | luminous controlled green accent |
| `--accent-soft` | `rgba(70,185,130,0.12)` | accent tint fill |
| `--focus` / `--ring` | `#65D3A3` | focus ring |
| `--hero-dark` | `#070B09` | mission (atmospheric) deep obsidian |
| `--hero-accent` | `#46B982` | hero/mission node accent |
| `--success` | `#4CAF78` | completed / positive |
| `--warning` | `#D19A45` | **secondary semantic** amber: due / time-urgency |
| `--danger` | `#D05A52` | blocked / overdue-critical |
| `--info` | `#6EA6C4` | slate blue: informational/context |

**Superseded for Today:** bronze `#E5A93C`, `#FFC665`, `#F59E0B`, slate `#0D0F12 / #14171D / #1B2028 / #222833 / #262D38 / #3B4556 / #8E98A8 / #5C6675 / #F1F5F9`, status emerald `#10B981`, company blue `#3B82F6`.

### 1.3 Reconciliation rule — ONE green language

The repo currently runs **two palettes at once**: components author bronze/slate hexes, and an unlayered "legacy-hex redirect" block in `src/index.css:190-252` re-points a *subset* of those classes at the green tokens. The redirect is incomplete by construction (opacity modifiers `/10 /30 /40`, gradients, `ring-`, `shadow-`, `hover:` variants, SVG `fill/stroke`, and non-button elements all bypass it), which is why the Today page renders green text on bronze tints today.

**LOCKED reconciliation policy:**

1. **Today components author ONLY canonical vocabulary.** In `src/components/dashboard/*.tsx` touched by this redesign, every color is expressed as a semantic utility (§1.5) or `var(--token)`. **No legacy hex literal may appear** in these files. This is enforced by a new source-scan test (§24.4 `T-NEW-3`).
2. **The redirect layer stays** (`src/index.css:190-252`) as a compatibility shim for non-Today views. Removing it, and sweeping the remaining views, is **deferred** to the archaeology phase (§26).
3. **No pinned token may change.** `guideSystem.test.tsx` C11 hexes, `focusRegression.test.ts` focus rules, and the five reduced-motion CSS kill blocks remain byte-identical.
4. **One success green.** On Today, "success/completed" is always `--success` (`#4CAF78`) via `status-success`. The emerald `#10B981` used elsewhere in the app does not appear in Today files.
5. **Amber discipline.** `--warning` (`#D19A45`) appears only on time-urgency and due/overdue semantics (Attention due states, Leitner-due marks). It never fills a CTA, never decorates, never brands.
6. **Docs are superseded, not edited here.** `docs/design/DESIGN.md`, `AGENTS.md`, and `README.md` still describe a bronze `#E5A93C` accent. This spec overrides them for the Today surface. Rewriting those documents is part of the manufacturing phase's final documentation step (doc-only change), not a design debate.

### 1.4 Typography & 3-tier text hierarchy — LOCKED

- Inter (UI/reading), JetBrains Mono (metadata, counts, scores, IDs, timestamps).
- Exactly three text tiers, all distinguishable *by tier*, not only by size:

| Tier | Class | Token | Use |
|---|---|---|---|
| 1 — Primary | `text-text-primary` | `--foreground` `#E8F0E9` | headings, mission title, key numbers |
| 2 — Secondary | `text-text-secondary` | `--foreground-muted` `#9AA99F` | body, labels, explanations |
| 3 — Tertiary | `text-text-tertiary` | `--foreground-subtle` `#86958B` | compact technical metadata, mono captions, chart labels |

**Token addition (allowed, additive):** `--foreground-subtle: #86958B` in `:root`, plus `--color-text-tertiary: var(--foreground-subtle)` override in `@theme inline`. Rationale: today `--secondary` equals `--foreground-muted` (`#9AA99F`), so tier 2 and tier 3 collapse into one value after the redirect. `#86958B` measures ≈5.2:1 on `--surface-elevated` and ≈6.0:1 on `--surface` — passes AA for normal text. Tier 3 is restricted to text ≥ 10px mono metadata and never carries instructions or actions.

Type scale on Today (locked): page `h1` 20/600; section `h2` 13/600 uppercase `0.06em` tracking (section eyebrow + heading pattern); mission `h2` 24/600 desktop, 20/600 mobile; body 13/400; metadata 11/500 mono; micro-label 10/500 mono uppercase. Body measure ≤ 68ch.

### 1.5 Color utility vocabulary (manufacturing contract)

`src/index.css` `@theme inline` (lines 80–114) is extended **additively** in the manufacturing phase so that real Tailwind utilities exist (today `--color-primary` is *not* declared, which is why shadcn `Button`'s `bg-primary` is a no-op and every component overrides with hex):

```css
/* additive — do NOT modify any existing @theme line */
--color-primary: var(--primary);
--color-primary-hover: var(--primary-hover);
--color-primary-foreground: var(--primary-foreground);
--color-accent: var(--accent);
--color-success: var(--success);
--color-warning: var(--warning);
--color-danger: var(--danger);
--color-info: var(--info);
--color-foreground-subtle: var(--foreground-subtle);
```

**Approved vocabulary for Today components:**

| Intent | Class |
|---|---|
| Canvas / panel / elevated / subtle bg | `bg-surface-canvas` `bg-surface-panel` `bg-surface-elevated` `bg-surface-subtle` |
| Border | `border-border-default` `border-border-active` |
| Filled primary CTA | `bg-primary hover:bg-primary-hover text-primary-foreground` |
| Accent (marks, active rings) | `text-accent` `border-accent` `bg-accent/12` |
| Status | `text-status-success` `text-status-warning` `text-status-danger` |
| Text tiers | `text-text-primary` `text-text-secondary` `text-text-tertiary` |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0` |

Any opacity form (`bg-primary/12`, `border-warning/40`) of these utilities is approved — unlike arbitrary hexes, token utilities compose correctly with opacity.

### 1.6 Surface grammar & elevation — LOCKED

- **One card grammar for the whole page:** `rounded-lg` (8px), `border border-border-default`, background from the tonal ladder, **no drop shadows, no glows, no gradients except the single Mission atmosphere** (§6.2). Depth = tonal plane + 1px border + (only for the Mission) a deeper obsidian atmosphere.
- Radii: `rounded-md` (6px) for buttons/chips/inputs, `rounded-lg` (8px) for surfaces, `rounded-sm` (4px) for badges. **No pills (`rounded-full`) for badges** — circles allowed only for constellation nodes and stepper dots.
- Borders: exactly 1px, `--border`. Emphasis borders (mission, active queue step) use `--border-active` or `--accent` at ≤40% — never a 2px neon edge.
- **Banned on Today:** neon, glows (`shadow-[color]/…` blooms), soft drop shadows, glassmorphism/backdrop-blur, random gradients, shimmer loops, decorative gradients on progress bars (progress bars are flat `--primary` fill on `--surface-muted` track).
- **Card budget (locked):** Mission = 1 surface; State Strip = 1 strip (chips, not cards); Attention = up to 5 compact items (each one card); Execution = 1 surface with internal rows; Progress = 1 surface with 4 metric cells; Signals = 1 surface; Reflection = 1 band; Disclosure = 1 surface. **Total ≤ 9 major surfaces.** Nested cards max 1 level deep.

---

## 2. Core UX Goal — the 5-second test

Within ~5 seconds a new user must answer, **visually, before reading paragraphs**:

| # | Question | Answered by (primary) | Supporting |
|---|---|---|---|
| 1 | Where am I? | Global Header: `h1 "Today"` + date + phase/mode chips | nav rail `aria-current` |
| 2 | What is my current state? | State Strip (budget, energy, plan status, day status) | Progress Panel |
| 3 | What should I do now? | **Today's Mission** + single filled CTA | constellation center node |
| 4 | Why is that the recommended action? | Mission "Why this task?" + 6-factor priority visualization | constellation mission pulse |
| 5 | What is urgent? | **Attention Rail** (icon + label + count + hue) | queue active-step marker |
| 6 | What have I already completed? | Execution Queue count `4 / 7 assignments complete` + checked steps | Progress consistency cell |
| 7 | What comes next? | Execution Queue "next" marker + Mission | queue empty-state → Plan Today |
| 8 | Am I making progress? | Progress Panel (roadmap %, phase, Leitner, consistency) | Signals domain map |

**Method:** hierarchy, visualization, grouping, progressive disclosure, interaction — **not** more information. Mission is the focal point; Execution and Progress are secondary; telemetry/traces are tertiary (§19).

---

## 3. Final Page Structure — LOCKED

Single-column reading spine inside the existing container
(`space-y-8 max-w-6xl xl:max-w-[1350px] mx-auto font-sans`), with internal multi-column splits.

```
0. Global Header          (no reveal — always visible)
1. State Strip            (no reveal — always visible)
2. Today's Mission        (data-reveal="hero" — rendered always visible)
3. Attention Rail         (no reveal — urgency must never be hidden behind reveal)
4. Execution Queue        (data-reveal="journey")
5. Progress Panel         (data-reveal="progress")
6. Signals & Focus        (data-reveal="signals")
7. Reflection / Sealing   (no reveal)
8. Secondary Disclosure   (data-reveal="review" detail + data-reveal="telemetry")
```

`REVEAL_IDS = ['hero', 'journey', 'progress', 'signals', 'review', 'telemetry']`
(the former `practice`, `plan`, `session` ids are removed — their content merged elsewhere). The `hero` / `journey` / `signals` ids are preserved deliberately: the protected `TodayGuide.tsx` resolves `[data-reveal="hero|journey|signals"]`.

Scroll-reveal behavior is unchanged: `IntersectionObserver` + `.scroll-reveal.visible`, graceful fallback when the API is missing or throws (tests `todayVisual` H2/H3). **Sections 0–3 and 7 are never reveal-gated.**

### 3.1 Section responsibilities (exact)

**0. Global Header** — identity + day-scoping controls.
Contains: `h1 "Today"` (`data-guide-target="today-header"`) with formatted date beneath; Company Focus selector (`data-testid="company-focus-container"`, `company-focus-select`, `clear-company-focus`, `aria-label="Company Focus Mode"`); **Plan Today** button (`data-testid="plan-today-button"`, `data-guide-target="today-plan-button"`, text contains "Plan Today", tonal variant — **never filled**); `GuideTrigger` (`data-testid="today-guide-trigger"`).
Does NOT contain: Reflect & Seal (moved to §3.7), any urgency banner, any metric.

**1. State Strip** — one horizontal, wrapping row of mono metadata chips answering "what is today configured as":
- phase + mode chip group — `data-guide-target="today-phase-mode"`
- budget chip ("3h available") — `data-guide-target="today-budget"` (source: `todayCheckIn.availableMinutes / 60`, fallback 3, unchanged)
- energy chip (`low|medium|high`)
- plan status chip ("Plan committed · 7" | "No plan yet")
- day status chip ("Day open" | "Day sealed 21:40")
No cards, no charts, no color-only meaning. Chips are `bg-surface-subtle border-border-default rounded-sm` mono 11px.

**2. Today's Mission** — the primary focal point. Full spec in §5.

**3. Attention Rail** — single merged attention surface. Full spec in §6.

**4. Execution Queue** — merged Today Session + Today's Plan. Full spec in §7.

**5. Progress Panel** — canonical outputs only. Full spec in §8.

**6. Signals & Focus** — canonical domain readiness visualization + focus deep-links. Full spec in §9.

**7. Reflection / Sealing** — day lifecycle. Full spec in §10.

**8. Secondary Disclosure** — collapsed telemetry/skill/raw detail. Full spec in §11.

**Modals** (unchanged, outside the spine): `SessionModals` (focus / morning / evening / practice), `CompletionAnimation` (conditional overlay, `role="status"`).

### 3.2 Non-duplication invariants (LOCKED)

1. **Review information appears in exactly ONE place:** the Review attention item in §3 (counts + action) with its inline expansion (rows + `EvidenceTracePanel` + "View all in Analytics"). No separate "Review Prompts summary" panel, no separate "Primary Review Prompt CTA" panel, no review list in Progress/Signals/Disclosure.
2. **Company focus information appears in exactly TWO places, one being a control:** the header selector (control) and the Company attention item (summary: reason, counts, urgency, items, unmapped, blocked). Nothing in Signals/Progress/Telemetry repeats focus reason/counts/urgency. (The deferred telemetry "Target Companies" raw list remains telemetry-only and is not shown elsewhere.)
3. **Domain readiness appears in exactly ONE place:** `DailySignalGraph` in §6.
4. **Completion counting appears in exactly ONE place:** the queue count in §4 (plus per-step check marks). Progress shows roadmap/consistency, never daily completion.
5. **Mission text is the only prose explanation of the top candidate.** Constellation, strip, and queue may *reference* it (ids, short labels), never restate or contradict it.

---

## 4. Component Roles — reuse vs redesign (LOCKED)

| Component | Decision | Notes |
|---|---|---|
| `DashboardView.tsx` | **RESTRUCTURE** | Orchestrator; keeps the single `getEvaluatedCandidates` memo (line ~141) and renders `<TodayHeroVisual candidates={evaluatedCandidates} />` itself (test-pinned verbatim string). |
| `TodayHeroVisual.tsx` | **REBUILD in place** (same file, same props) | §13. Never retired. |
| `DailyJourney.tsx` | **RETIRE** (component + file) | Migration map §12. Tests updated per §24. |
| `TodayControlVisual.tsx` | **DEFERRED — untouched, unimported** | §26. |
| `TodayGuide.tsx` | **PROTECTED — never modified** | §25. |
| `SessionDisplay.tsx` | **REUSE UNCHANGED** | Renders as the Execution Queue's active-session panel (`data-testid="today-session"`, `session-committed-plan-badge` "Plan Aligned"). |
| `SessionProvider/Context/Modals` | **REUSE UNCHANGED** | sessionComposer authority. |
| `DailySignalGraph.tsx` | **REUSE UNCHANGED** | Lives in §6. |
| `CompletionAnimation.tsx` | **REUSE UNCHANGED** | `completion-animation`, `completion-dismiss`, `completion-undo`, `completion-open-next`. |
| `EvidenceTracePanel.tsx` | **REUSE** inside attention review expansion | `idPrefix` per row as today. |
| `TaskCard.tsx` | **REUSE** for queue rows (or a slimmer `QueueStep` wrapper around it) | Must keep `solve-dsa-${problem.id}` rendering (test `morningPlanningDsaConvergence` P). |
| `GuideTrigger.tsx` / guide system | **REUSE UNCHANGED** | |
| New Today subcomponents | **CREATE**, flat in `src/components/dashboard/` | `StateStrip.tsx`, `AttentionRail.tsx`, `ExecutionQueue.tsx`, `ProgressPanel.tsx`, `SignalsFocus.tsx`, `ReflectionBand.tsx`, `TelemetryDisclosure.tsx`. Flat (not nested) so the existing test glob `../components/dashboard/*.tsx` still covers them; tests additionally widen to `**/*.tsx` (§24.4). |

**No new engines. No new scoring. No prop drilling that re-derives canonical values.** Children receive data as props from `DashboardView`'s existing memos or read canonical context directly; they never call `getEvaluatedCandidates`.

---

## 5. Today's Mission — LOCKED

### 5.1 Content contract (WHAT / WHY / PRIORITY / ACTION)

Root: `<section data-testid="primary-action" data-guide-target="today-primary-action" data-atmospheric="true" data-reveal="hero">`
carrying the canonical attributes (unchanged names):

```
data-candidate-task-id     = nextBestActionTask.id
data-candidate-task-title  = nextBestActionTask.title
data-candidate-score       = nextBestActionCandidate.breakdown.finalScore
data-candidate-reason      = nextBestActionCandidate.breakdown.explanation
```

Inside, left column `data-guide-target="today-primary"` (must contain an `<h2>`):

1. **Eyebrow row:** mono "TODAY'S MISSION" chip (`accent-soft` bg, `accent` text, `rounded-sm`) + estimated minutes + domain chip. (Replaces the bronze "PRIMARY ACTION" badge; keep the Sparkles-or-equivalent icon only if it stays monochrome accent.)
2. **Title:** `<h2>` — `nextBestActionTask.title`, tier-1.
3. **Description:** one concise line, tier-2, ≤ 68ch.
4. **Why block** — `data-guide-target="today-why-task"`: label "Why this task?" (tier-1 small, accent icon) + `breakdown.explanation` (tier-2). Source: adaptiveEngine only.
5. **Priority visualization** (§5.3).
6. **Action row** — `data-guide-target="today-postpone-skip"` contains **exactly 2 buttons** (`today-postpone`, `today-skip`, ghost, aria-labels `Postpone {title} to tomorrow` / `Skip {title}`); `today-learning-link` text action (label from `getLearningDestinationLabel(getTaskLearningRoute(task),'primary')`); `complete-primary` outline button (`today-complete-action`, label contains "Complete"); and the **single filled CTA** (§5.2).
7. **Popovers:** postpone/skip confirm (exact copy `Postpone until tomorrow?`, Cancel + Confirm) and undo toast, positioned inside the Mission surface as today.

**Mission surface styling:** atmospheric treatment — background `--hero-dark #070B09` via the existing `.atmospheric-scene / [data-atmospheric="true"]` override, `border-border-default`, one restrained `accent`-toned hairline at ≤30% opacity on the top edge. No gradient wash, no glow, no grid-noise overlay with animated shimmer. A static 1px grid texture at ≤3% opacity is permitted (non-interactive, `aria-hidden`).

`minHeight: 480px` is **removed** — Mission height is content-driven (desktop ≈ 420–520px incl. constellation).

### 5.2 CTA hierarchy — LOCKED

**Exactly ONE primary filled CTA on the entire Today page**, marked `data-cta="primary"`, rendered **only in the Mission action row**:

| Mission state | Filled CTA | Guide target |
|---|---|---|
| Candidate exists (normal) | **Start Focus Mode** → `setIsFocusModalOpen(true)` | `today-focus-mode` (label contains "Focus Mode") |
| No candidate ("All caught up") | **Reflect & Seal** → `setIsEveningModalOpen(true)` | — |
| Day sealed | *none* (read-only sealed state) | — |

Everything else is demoted (locked):

| Action | Variant |
|---|---|
| Plan Today (header) | tonal: `bg-surface-subtle border-border-default text-text-primary` |
| Reflect & Seal (§3.7 band, header copy removed) | tonal |
| Complete | outline: `border-border-active bg-surface-panel` |
| Postpone / Skip | ghost |
| Open learning workspace | text/ghost link |
| Sunday "Start Mini Test (90m)" | attention-item action: `border-warning/50 bg-warning/10 text-status-warning` (never filled) |
| Review "Open review" | attention-item action: `bg-surface-subtle border-border-default` + accent icon (never filled) |
| Start Drill | attention-item action (same as review) |
| Queue row actions (Solve / Open / Start) | ghost/outline per row |
| Undo / Cancel / Confirm inside popovers | ghost / tonal (Confirm may use `bg-primary` *within the popover*, which is a transient dialog layer — the page-level filled-CTA count rule applies to the page surface, and popovers are not concurrently rendered with a Mission CTA in the sealed state) |

**Enforcement:** new test `T-NEW-1` — in every render state (normal, no-candidate, sealed), `document.querySelectorAll('[data-cta="primary"]').length <= 1`, and it is inside `[data-testid="primary-action"]` when present.

### 5.3 Priority visualization — LOCKED

Answers "why this action" quantitatively, from `CandidateTask.breakdown` only (no new math):

```
┌ PRIORITY ────────────────────────────── 78/100 ┐
│ URGENCY      25%  ▓▓▓▓▓▓▓▓░░  68              │
│ WEAKNESS     20%  ▓▓▓▓▓▓░░░░  54              │
│ IMPORTANCE   20%  ▓▓▓▓▓▓▓▓▓░  90              │
│ COMPANY      15%  ▓▓▓░░░░░░░  31              │
│ SPACED REP   10%  ▓▓▓▓░░░░░░  44              │
│ RECOVERY     10%  ▓░░░░░░░░░  12              │
└────────────────────────────────────────────────┘
```

- Header line: mono label `PRIORITY` (tier-3) + `{finalScore}/100` (mono, tier-1, accent) + one 4px flat progress bar (`bg-primary` on `bg-surface-subtle`, width `${finalScore}%`, transition 320ms).
- Six factor rows: mono label + weight% (tier-3) + 4px bar showing the factor's 0–100 value. Bar color: factor ≥ 70 → `bg-status-warning` (urgency-class factors) or `bg-primary` (others); < 70 → `bg-primary/45`. Value shown as mono number (tier-3).
- Rows are **tertiary tier** — visually subordinate to the title and the CTA. No hover, no interaction, no animation beyond the fill transition on candidate change.
- The factor rows are inside a `<details>`-style toggle only if height pressure appears at 375px; default is **always visible** (they are the cheapest honest "why").

Forbidden: recomputing, re-weighting, renormalizing, or ranking these factors; inventing a "confidence"; showing `finalScore` as a readiness percentage.

### 5.4 Mission ↔ constellation relationship

The constellation sits in the Mission's right pane at ≥1024px (§13.6) and is **visually subordinate**: no CTA inside it, ≤0.75 opacity for decorative layers, no text competing with the mission title, accent color only on the center node. The Mission is the textual authority; the constellation may never display a different task id, score, or reason — enforced by `T-NEW-2` (§24.4).

---

## 6. Attention Rail — LOCKED

### 6.1 Placement & anatomy

Immediately after Mission (`3. Attention Rail`), always visible (never reveal-gated), `data-section="attention"`.

One row (wraps, never scrolls horizontally) of compact items. **Item anatomy (identical for all):**

```
┌─┬──────────────────────────────┬──────────┐
│icon│  LABEL (mono, tier-3, uppercase)   │ count  │  [ action ]
│hue │  one-line detail (tier-2)          │ mono   │
└─┴──────────────────────────────┴──────────┘
```

- Left edge: 3px hue bar **+ icon + text label + count** — color is never the only encoding.
- Item id: `data-testid="attention-<signal>"`.
- Only ONE detail expansion open at a time (accordion), `aria-expanded` on the disclosure control.
- **Rail hidden entirely when no signal is active** (progressive disclosure).

### 6.2 Signal taxonomy (LOCKED)

| Signal | Icon | Hue | Data source | Test ids kept/new | Action (all non-filled) |
|---|---|---|---|---|---|
| **Sunday obligation** | `CalendarClock` | `--warning` | `pendingSundayObligation` | `sunday-obligation-banner` (kept) | "Start Mini Test (90m)" → `setRoute('assessment')` |
| **Company focus** | `Building2` | `--info` | `buildCompanyFocusSummary` + `companyFocus` | `company-focus-summary`, `company-focus-urgency`, `-reason`, `-items`, `-counts`, `-unmapped`, `-blocked` (all kept, moved into this item) | "Clear focus" (`clear-company-focus` stays in header selector) + per-item links |
| **Review due** | `RotateCcw` | `--accent` | union view of `validatedReviewPrompts` (analytics `reviewPrompts`) + `reviewScheduler` counts (`reviewCandidates`, `hasOverdueReviews`, `hasRemediation`) | **new** `attention-review`; **retired** `review-prompts-summary`, `primary-review-prompt-cta` | "Open review" (first navigable prompt deep link — replaces the old filled green CTA) |
| **Practice signal** | `Dumbbell` | `--success` | `practiceRecommendation` + `activeSignalChips` | **new** `attention-practice` | "Start Drill" (`setActivePracticeSession`) + ghost "Explore all drills" |
| *(reserved)* **Blocked/overdue critical** | `ShieldAlert` | `--danger` | `gaps.remediationRequiredCount > 0` when not already covered by review counts | **new** `attention-blocked` | "Open skills" |

Copy rules: label ≤ 22 chars; count rendered mono (`3 due`, `2 urgent`); urgency badge text must match `/until event|today or overdue/i` **only when `eventDate` exists** (existing `companyDailyPlan` §8 contract preserved verbatim); company reason must contain the company name and must **not** match `/weight|0\.\d{2}|mastery|proficient/i`; counts match `/\d+ of \d+ requirements/`.

### 6.3 Review expansion (single source of review detail)

Opening the Review item expands **in place** below the rail row (bounded max-height with internal scroll, ≤ 420px):

- header counts: `{n} of {m} prompts actionable`, overdue/remediation flags
- one row per navigable prompt: title, description, severity, "Go" (outline) — deep link via `setRoute(route, targetId)`
- `EvidenceTracePanel` per row (`idPrefix="candidate-{id}"`, title "Evidence trace")
- footer: "View all N review candidates in Analytics" → `setRoute('analytics')`
- carries `data-guide-target="today-review-schedule"`

This replaces the three former review surfaces. Row limit 5, then "View all…" (no `slice(0, 8)` patterns anywhere in dashboard sources — test B5).

### 6.4 Sunday banner migration

The full-width bronze banner (`DashboardView:609-635`) becomes the Sunday attention item. Its testid `sunday-obligation-banner` is retained on the item. Its CTA is demoted per §5.2. The three `AssessmentRunnerView` occurrences are untouched (other view).

---

## 7. Execution Queue — LOCKED

**Merges** "Today Session" (`SessionDisplay`, lines 1207–1212) **and** "Today's Plan" (lines 1215–1307) into one section: `data-section="queue"`, `data-reveal="journey"`, `data-guide-target="today-daily-journey"` (the retired journey's guide anchor re-homes here) and `data-guide-target="today-plan-list"` on the step list.

### 7.1 Structure

```
EXECUTION QUEUE                     4 / 7 assignments complete     [Plan aligned ✓]
┌ sessionComposer panel (SessionDisplay, reused) ─────────────────────────────────┐
│ active step detail / start / complete controls (today-session)                  │
└─────────────────────────────────────────────────────────────────────────────────┘
 ① ✔ Arrays: Two Pointers        25 min   completed 14:05
 ② ▶ DSA: Leitner review #4      20 min   ACTIVE     ← aria-current="step"
 ③ • SQL joins                   30 min   next
 ④ • DSA: Binary search          25 min   planned
 …
```

- **Count header (count-based only):** literal pattern `{completed} / {total} assignments complete`, computed exactly as today: `completedPlanTasks.filter(...).length` over `assignedPlanTasks` (assignments merged with `taskProgress`/`dsaProgress` completion, unchanged lines 515–549). `data-testid="plan-progress-counts"` with `data-completed` / `data-total` attributes.
  **A daily completion percentage is forbidden** (`T-NEW-4`).
- **Ordering authority:** committed `dailyTaskAssignments` order (the input sessionComposer composes from). The queue **never re-ranks, never scores, never filters by priority.**
- **Active step:** the session's current activity; marked `aria-current="step"`, `border-border-active`, accent left edge.
- **Next step:** mono `NEXT` tag (tier-3).
- **Completed steps:** `--success` check glyph + mono timestamp + strike-through title at 60% opacity (text remains readable).
- Per-row actions preserved: `solve-dsa-${problem.id}` (deep link `#/dsa/{id}`), Open, Start — behavior unchanged.
- **Show more:** first 5 rows, then ghost "Show All (N Items)" (keeps `isPlanExpanded`; no `slice(0, 8)`).
- **Empty state (no plan committed):** one line + tonal "Plan Today" button (same modal, never filled).
- Session panel conditional exactly as today; `SessionDisplay` receives `onStartActivity` / `onCompleteActivity` unchanged.

### 7.2 What the queue must let a user understand

planned (list) · active (`aria-current` + session panel) · completed (checks + count) · next (`NEXT` marker + session panel's next preview).

---

## 8. Progress Panel — LOCKED

`data-section="progress"`, `data-reveal="progress"`. One surface, four metric cells + one link row. **Canonical outputs only.**

| Cell | Source (exact) | Display |
|---|---|---|
| Roadmap completion | existing local computation **verbatim**: `completedCount = Object.values(taskProgress).filter(tp => tp.state === 'completed').length`, `totalTasks = taskDefinitions.length`, `progressPercent = round(completed/total*100)` | `{progressPercent}%` + flat bar + `{completedCount} of {totalTasks} roadmap tasks completed` |
| Phase progress | `analyticsTelemetry.progress.activePhaseCompletionRate` + `activePhase.name` | mono % + phase label |
| DSA / Leitner state | `analyticsTelemetry.quality.boxDistribution` + `reviewRetentionRate` | `B1 4 · B2 3 · B3 2 · B4 6` + retention `82%` |
| Consistency | `analyticsTelemetry.activity.sealedDaysCount / totalDaysInWindow`, `consistencyRate` | `12/14 days sealed` + rate |
| Links | — | **"Open Interview Readiness"** → `setRoute('interview')` (canonical surface, never recomputed here), "Open Skills", "Open Analytics" |

Also permitted (only if it fits without crowding): `progress.patternsAttemptedCount/totalPatternsCount`.

**Forbidden on Today (test `T-NEW-5` scans the Today source):** any new readiness formula; any daily completion percentage; `progress.overallDomainReadiness` rendering; the strings/patterns `placement ready`, `interview readiness %`, `blended`, `score` adjacent to a `%` outside `finalScore/100` and `progressPercent`; any second implementation of skillsEngine/adaptiveEngine output.

Domain readiness is **not** repeated here — it lives only in §9.

---

## 9. Signals & Focus — LOCKED

`data-section="signals"`, `data-reveal="signals"`.

1. **Signals:** `DailySignalGraph` **unchanged** — 11 domains, `data-testid="signal-domain"` with `data-domain-id/label/status/readiness`, `signal-connectors`, driven by `calculateDomainReadinessList` / `calculateTopicReadiness` (skillsEngine canonical). Guide target `today-readiness-signals`. Retains its own legend; must render all 11 domains (no `slice(0, 8)`).
2. **Focus:** a compact row of **navigation-only focus tiles** (no metrics, no numbers other than a static target count):
   - **Interview** → `setRoute('interview')` ("canonical readiness surface")
   - **Companies** → `setRoute('companies')` (static count `{companyOverlays.length} targets`)
   - **Evidence trace** → `setRoute('analytics')`
   Rationale (locked): every metric-bearing candidate for this block (stale topics, overdue DSA, remediation, target readiness) would duplicate Attention review/company data or Progress cells. Tiles carry **no data**, so §3.2 invariants hold by construction.
3. Legend for the graph states (also serves non-color encoding, §16).

**Explicitly excluded from §6:** company focus info, review info, daily completion, any readiness aggregate.

---

## 10. Reflection / Sealing — LOCKED

`data-section="reflection"`, no reveal. One band answering "what happens at the end of today".

- **Open day:** status text "Day open · {N} assignments pending reflection"; tonal button **Reflect & Seal** → `setIsEveningModalOpen(true)`; if `!isPlanCommitted`, show tonal "Plan Today" note instead of a disabled seal.
- **Sealed day:** `--success` check + "Day sealed {sealedAt time}" + read-only summary (`totalActualMinutes`); no action button; `EveningReflectionModal`'s `seal-day-button` remains the only sealing control and stays disabled when sealed (tests untouched).
- The header's Reflect & Seal button is **removed** (the band owns it) — no test pins it in the header.
- Sealed-day immutability, midnight rollover, and undo semantics are untouched (§21).

Mobile: this band is ordered **above** Progress (§17.3).

---

## 11. Secondary Disclosure — LOCKED

`data-section="telemetry"`, `data-reveal="telemetry"`, collapsed by default, toggled by a ghost full-width button **Inspect / Hide** (`aria-expanded`). The region carries `data-guide-target="today-telemetry"` and its text must contain **"Telemetry"**.

Collapsed: heading + toggle only.
Expanded (2-col grid at ≥768): **Skill Status** panel (test `todayGuide` E2 expects `Skill Status` after toggle), target-companies raw list (first 3 overlays, as today), engine metadata (mode, candidate count, reveal/observer status), links to Analytics/Settings.

Everything here is tertiary by definition (§19). No new numbers, no new charts.

---

## 12. DailyJourney Retirement — Migration Mapping (LOCKED)

`DailyJourney.tsx` (5-stage FOCUS/LEARN/PRACTICE/PROVE/ADAPT stepper) is **retired as a standalone section and deleted**. Every piece of information/behavior has a named successor — nothing is dropped silently:

| DailyJourney element | Successor | Notes |
|---|---|---|
| `candidates[0]` mission/current task display | **Mission** (§5) | canonical candidate, already the authority |
| `data-candidate-*` agreement attributes | **Mission root + constellation root** | `today-hero` gains the same four attributes; agreement test re-homes (§24.3) |
| `data-testid="daily-journey"` | **retired** | replaced by `data-section="queue"` + `today-hero` candidate attrs |
| Sequence / "Stage x of 5" progression state | **Execution Queue step states** (`completed / active / next / planned`) + count header | strictly stronger: per-assignment rather than one pseudo-stage |
| Stage → route shortcuts (`focus/learn→preparation`, `practice→practice`, `prove→dsa`, `adapt→skills`) | **Execution Queue row deep links**, **constellation domain nodes** (`resolveHeroNodeDestination`), and the nav rail | navigation preserved, no lost destination |
| Stage descriptions ("Set your intention"…) | none (deliberate) | copy restated the task state; it carried no independent information |
| "Stage {n} of 5" mono readout | queue count `{x} / {y} assignments complete` | |
| `data-guide-target="today-daily-journey"` anchor | **Execution Queue section root** | keeps the guide step resolving (§20) |
| Bronze gradient progress line | flat `bg-primary` bar on the queue count (optional) | §1.6 bans decorative gradients |

**Rule:** no useful behavior or information may disappear; anything listed above must be demonstrably present in the new DOM before `DailyJourney.tsx` is deleted.

---

## 13. TodayHeroVisual (Constellation) — KEEP AND REBUILD (LOCKED)

### 13.1 Decision

**DO NOT RETIRE.** The constellation/orbit concept is a core identity element and is rebuilt into a *genuine functional visualization* of the canonical adaptive state. It is presentation only: `adaptiveEngine` remains the sole priority authority; the component never scores, ranks, filters, schedules, or computes readiness. It receives `candidates: CandidateTask[]` (signature pinned by `todayConsistency` E1) and reads canonical signals for **state decoration only**.

### 13.2 Node model (unchanged topology, richer semantics)

- Exactly one center node `primary` (**data-testid** `hero-node-primary`) + 11 `domain-*` nodes + a `company` node only when an urgent overlay exists. Total 12 (+1) — pinned by `todayVisual` C7.
- Every node: `<button type="button">`, class `today-hero-node`, `tabindex=0`, truthful `aria-label`, `data-node-id`, `data-actionable`, `data-destination-route`, `data-destination-topic`. Destinations come only from `resolveHeroNodeDestination` (single canonical map; `DOMAIN_TO_PREP_TOPIC` export preserved). **No `role="button"` divs, no dead clickables.**
- Node size encodes evidence strength (existing `baseRadius` formula retained) — information, not decoration.

### 13.3 Node states (new, all presentational)

| State | Meaning | Derivation (canonical, no new math) | Encoding (color **+ glyph + ring**) |
|---|---|---|---|
| `mission` | domain of today's canonical candidate | `candidates[0].task.domainId` | accent ring **solid**, filled core, mono `TODAY` tag; largest |
| `due` | Leitner/review due for this domain | due reviews mapped to domain (reviewScheduler/Leitner output already consumed today) | `--warning`, **clock glyph badge**, dashed ring |
| `urgent` | company/event deadline touches this domain | `companyOverlays.requiredDomains` + `eventDate` urgency | `--warning` strong, **alert glyph**, double ring |
| `blocked` | remediation required / stale evidence | `gaps.remediationRequiredCount` / stale-topic map | `--danger`, **shield/lock glyph**, dotted ring |
| `complete` | all of today's assignments in this domain are completed | `todayAssignments` + `taskProgress`/`dsaProgress` | `--success`, **check glyph**, thin ring |
| `idle` | nothing actionable | fallback | `--border-active`, muted, no glyph |

Resolution order for ring/glyph when multiple apply: `mission` (size/core) > `blocked` > `urgent` > `due` > `complete` > `idle`. Each state appears in the visible legend and in the node's `aria-label` (e.g. "DSA — review due"), so **state is never color-only**.

### 13.4 Motion — what is REMOVED

- ❌ 30-particle `Math.random` particle system
- ❌ random signal spawn every 3000ms
- ❌ infinite `requestAnimationFrame` orbit rotation (`orbitRot`)
- ❌ mouse-perspective tilt (`perspective/rotateX/rotateY` transform + `onMouseMove`)
- ❌ infinite `stroke-dashoffset` marching on arcs
- ❌ infinite `pulse-ring` on the center node and infinite glow breathing (`r/opacity` `<animate repeatCount="indefinite">`)
- ❌ any `Math.random` in the file

### 13.5 Motion — what REMAINS (all event-driven, finite, guarded)

| Event | Animation | Duration | Reduced motion |
|---|---|---|---|
| Mount | staggered node entrance (opacity + scale 0.94→1, 40ms stagger) | 280ms total | instant, fully rendered |
| Candidate id changes | one-shot pulse **mission domain → center** (SMIL `<animate>`, no `repeatCount`) | ≤ 700ms | not rendered |
| Assignment completes | one-shot pulse **center → domain** + check glyph entrance | ≤ 700ms | instant glyph |
| Signal escalates to due/urgent | single ring flash on that node | 600ms, once | instant state change |
| Hover / focus | scale 1.08 + label reveal | 140ms `var(--ease-out)` | instant |
| Node activation | existing active scale + destination navigation | 140ms | instant |

Render pattern must preserve the pinned guard shape:
`{!reducedMotion && signals.map(…)} ` (keeps `todayVisual` D1's source pin) while **removing** the ambient spawner. The "living" feeling comes from entrance choreography, event pulses, hover response, and rich state encoding — **not** from continuous animation.

All loops (`setInterval`, `requestAnimationFrame`) are gone; `visibilitychange` pausing remains for any residual timer. `prefers-reduced-motion` listener retained.

### 13.6 Layout & responsiveness

- **Inline styles preserved (pinned):** root `maxWidth: 520` (constant), `aspectRatio: '1/1'`, `svg width="100%" height="100%"`, `viewBox` driven by measured size, no `maxWidth: size`, no `width={size}`. ResizeObserver measurement contract unchanged (C7-03: measurement feeds `size`, never its own input).
- **Container sizing is done by the PARENT (per breakpoint)** so the inline contract stays byte-stable:
  - `≥1024px`: Mission right pane, parent `max-w-[360px]` (col width ≈ 45%).
  - `768–1023px`: below the Mission action row, centered, parent `max-w-[260px]`.
  - `<768px`: still inside Mission, **below the CTA**, centered, parent `max-w-[200px]`.
  This guarantees the hero never becomes a ~1000px obstacle: on 375 the Mission card is title + why + priority + **CTA** + a 200px map + legend, with the CTA above the fold.
- **No second mount point** (duplicate DOM would double `[data-node-id]`). The single instance stays in Mission at all breakpoints; repositioning is CSS-only.
- The wrapper keeps `data-guide-target="today-hero-scene"` and the mono label **"Daily Control Scene"** (guide C2 pins this text) at all breakpoints.
- Domain short labels (2-letter mono) + legend row beneath; at `<768` the legend becomes a compact wrapped list.

### 13.7 Accessibility

- Decorative SVG layers (grid, arcs, glow, orbit rings): `aria-hidden="true"`.
- Interactive nodes: real buttons (existing contract), `aria-label` includes state, Enter/Space activation with `preventDefault` (existing C7-02 pattern).
- **Accessible equivalent for meaningful state:** a visible legend (icon + label + count per state) plus a screen-reader summary paragraph rendered once inside the wrapper, e.g. `Mission: {task title}. 2 domains due, 1 company urgent, 4 of 7 assignments complete.` — static (not `aria-live`), so it never becomes chatter.
- Wrapper: `role="group"` + `aria-label="Today's domain map"`.

---

## 14. Visual Design Rules (page-wide) — LOCKED

**Do:** strong hierarchy (one focal surface), restrained elevation (tonal planes + 1px borders), meaningful whitespace (`space-y-6` inside sections, `space-y-8` between), deliberate alignment (shared left edge for all section eyebrows), one card grammar (§1.6), charts only where they outperform text (priority bars, roadmap bar, Leitner distribution, domain graph — nothing else), compact technical metadata in mono, meaningful lucide iconography (one icon per signal/step), progressive disclosure (§19).

**Don't:** card-everything, giant text blocks, decorative badges, pill overload, decorative charts/numbers, gradients (single Mission atmosphere excepted), neon, glows, soft shadows, `backdrop-blur`, emoji as icons, spinner/idle animations.

**Density:** compact (matches `densityMode: 'compact'` intent): rows 36–44px, buttons 32–40px, chip height 22–24px.

---

## 15. Animation Registry — LOCKED

Allowed (complete list; anything not listed is forbidden):

| # | Name | Trigger | Timing | Reduced motion |
|---|---|---|---|---|
| A1 | Candidate/mission transition | `candidates[0].id` changes | Mission content fade/slide 200ms; priority bars refills 320ms; constellation one-shot pulse | instant swap, no pulse |
| A2 | Assignment completion | `handleUpdateTaskStateWithToast(..., 'completed')` / queue sync | check glyph scale-in 120ms; row state change 200ms; count tick 200ms; `CompletionAnimation` as-is | instant state + text |
| A3 | Progress update | metric value changes | bar width 320ms `var(--ease-out)`; number swap 200ms | instant |
| A4 | Urgency escalation | new Attention item appears | item slide-in 200ms, once | instant |
| A5 | Execution step transition | active step changes | `aria-current` marker move/highlight 200ms | instant |
| A6 | Day sealing confirmation | seal completes | band check draw 400ms, once; existing `CompletionAnimation` | text-only |
| A7 | Constellation state transitions | §13.5 table | ≤700ms, finite, event-driven | not rendered |
| A8 | Section entrance | `IntersectionObserver` reveal | existing `.scroll-reveal` opacity/translate | instant visible |
| A9 | Micro-feedback | hover/focus/press | 120–140ms color/scale | instant |

Forbidden: ambient decorative animation, random pulse loops, particles, infinite loops of any kind (`repeatCount="indefinite"`, `animation: … infinite`, `requestAnimationFrame` cycles), shimmer, tilts, parallax, marquees.

Global: the five existing `prefers-reduced-motion` blocks in `src/index.css` remain the kill switch; JS-side `reducedMotion` guards mirror them (pattern already established and test-asserted).

---

## 16. Responsive Behavior — LOCKED

Container gutters: `16px` (<768), `24px` (768–1279), `32px` (≥1280). Max content width `1350px` (unchanged).

| Region | 1440 | 1280 | 1024 | 768 | 375 |
|---|---|---|---|---|---|
| Header | single row: title+date · spacer · selector · Plan Today · Guide | same, tighter gaps | same | wraps to 2 rows | 2 rows, selector full-width |
| State Strip | one row, 5 chips | one row | wraps to ≤2 lines | wraps | wraps (chips `flex-wrap`, no scroll) |
| Mission | 2-col: content (55%) \| constellation (45%, ≤360px) | 2-col | 2-col (constellation ≤300px) | stacked; constellation ≤260px centered **below CTA** | stacked; constellation ≤200px centered **below CTA**; priority bars full-width |
| Attention | 1 row of up to 5 items | 1 row | wraps to 2 rows | stacked compact rows | stacked full-width rows |
| Queue | list + session panel stacked (panel first) | same | same | same | rows reflow (title above meta), actions wrap |
| Progress | 4 cells in a row + links | 4 cells | 2×2 | 2×2 | stacked cells |
| Signals | graph full-width + focus tiles row | same | graph ≤560px | graph fluid | graph fluid; tiles stack |
| Reflection | full-width band | band | band | band | band |
| Disclosure | 2-col detail grid | 2-col | 2-col | 1-col | 1-col |

### 16.1 Mobile priority & ordering (LOCKED)

DOM order = desktop order (§3). At `≤768px`, section order is applied with `order-*` utilities on the direct children of the spine:

`1 Global Header → 2 State Strip → 3 Mission → 4 Attention → 5 Execution → 6 Reflection → 7 Progress → 8 Signals → 9 Disclosure`

Each section carries `data-section="header|state|mission|attention|queue|progress|signals|reflection|telemetry"` **and** `data-mobile-order="{n}"`; a new test asserts the `data-mobile-order` values (the visual order itself comes from the `order-*` classes).

### 16.2 Overflow (LOCKED)

Zero horizontal overflow at 375: no fixed pixel widths wider than 343px content box, all grids `minmax(0, 1fr)`, long titles `truncate`/`break-words`, tables wrapped, constellation capped by parent (`max-w-[200px]`). The hero never precedes the Mission CTA in mobile DOM order.

---

## 17. Accessibility — LOCKED

- **Headings:** exactly one `h1` ("Today"); one `h2` per section (Mission `h2` = task title inside `today-primary`; section headings for State Strip, Attention, Queue, Progress, Signals, Reflection, Disclosure); `h3` inside sections. No skipped levels.
- **3-tier text hierarchy** per §1.4; AA contrast everywhere (tiers verified in §1.4).
- **`aria-current`:** `step` on the active queue row; `page` remains the nav rail's concern (not Today's); selected company focus uses `aria-pressed` on the clear control and `aria-current="true"` semantics on the selected `<option>` is N/A — instead the summary region is labelled `aria-label="Company Focus: {name}"` (already pinned).
- **Keyboard:** constellation nodes (Enter/Space), all buttons, disclosure toggles (`aria-expanded`), accordion in Attention, queue row actions, popovers (Escape closes; focus returns to trigger).
- **Non-color state encoding:** Attention (icon+label+count+hue), constellation (glyph+ring+legend), queue (glyph+`NEXT` tag+text), priority bars (numeric values printed).
- **Labelled controls:** every icon-only button has `aria-label` (existing postpone/skip/undo labels preserved).
- **Visible focus:** `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` retained; `.today-hero-node:focus-visible` and `.today-guide-panel:focus-visible` CSS rules retained (test-pinned).
- **Reduced motion:** §15.
- **Screen-reader noise:** decorative SVG `aria-hidden`; constellation summary static (§13.7); no `aria-live` on counts or priority values (they change too often); only `CompletionAnimation` keeps `role="status"`.

---

## 18. State Language (copy dictionary) — LOCKED

| Concept | Canonical wording |
|---|---|
| Mission eyebrow | `TODAY'S MISSION` |
| Why label | `Why this task?` |
| Priority header | `PRIORITY  {n}/100` |
| Primary CTA | `Start Focus Mode` (or `Reflect & Seal` when caught up) |
| Completion count | `{x} / {y} assignments complete` |
| Queue states | `completed` / `ACTIVE` / `NEXT` / `planned` |
| Day states | `Day open` / `Day sealed {HH:MM}` |
| Plan states | `Plan committed · {n}` / `No plan yet` |
| Attention labels | `SUNDAY MINI-TEST` `COMPANY FOCUS` `REVIEW DUE` `PRACTICE SIGNAL` `BLOCKED` |
| Urgency badge | `{n} days until event` / `today or overdue` (only with `eventDate`) |
| Review counts | `{n} of {m} prompts actionable` |
| Empty mission | `All caught up for today!` + existing sub-copy |
| Sealed | `Day sealed` (immutable; no further actions) |
| Telemetry toggle | `Inspect` / `Hide`, region text contains `Telemetry` |

Tone: calm, declarative, no exclamation except the retained empty-state, no gamified streaks language ("Keep the flame!"), no vague AI copy.

---

## 19. Progressive Disclosure — LOCKED

| Tier | When visible | Content |
|---|---|---|
| **Tier 1** (always) | first paint | Header, State Strip, Mission (incl. priority bars + CTA), Attention items (collapsed), Queue count + session panel + first 5 steps, Reflection band |
| **Tier 2** (scroll) | reveal / below fold | Progress cells, Signals graph + focus tiles, remaining queue steps |
| **Tier 3** (interaction) | user expands | Attention detail (review rows/traces, company items), queue "Show All", Telemetry detail, CompletionAnimation |

Rules: default state ≤ 9 major surfaces (§1.6); no more than one Attention expansion open at a time; Tier 3 never contains information required to answer §2's eight questions; expanding never changes layout above the trigger (anchor-stable).

---

## 20. Architecture Contract — LOCKED (forbidden changes)

**DO NOT CHANGE:**
`adaptiveEngine` authority · `sessionComposer` authority · `reviewScheduler` authority · `dsaEngine`/Leitner authority · `remediationRouter` authority · `PlacementContext` authority · `companyPlanEngine` authority · `skillsEngine` authority · local-first architecture · storage key `placementos_v1_state` · `CURRENT_SCHEMA_VERSION` · routing/hash contracts (`#/{route}/{targetId}`) · deep-link contracts (`#/dsa/{id}` etc.) · sealed-day immutability · undo transaction sequence (capture → action → restore, exactly one evidence event) · `EvidenceLog` semantics · `TopicSkillState` semantics · `DSAProgress` semantics.

**Hard invariants:**
1. **Exactly ONE `getEvaluatedCandidates(` call in `DashboardView.tsx`** (source-scan test `todayConsistency` B5, `toHaveLength(1)`), feeding Mission, queue-free consumers, and `<TodayHeroVisual candidates={evaluatedCandidates} />`. Zero calls in `DailySignalGraph`, and zero in any child (including new ones — scans widen to `**/*.tsx`).
2. No new engines, no new scoring/readiness/scheduling/evidence logic, no duplicate formulas.
3. No backend/network calls; no new storage keys; no new localStorage usage on Today.
4. `todayConsistency`'s "no `slice(0, 8)` in dashboard sources" invariant preserved.
5. The verbatim render string `<TodayHeroVisual candidates={evaluatedCandidates} />` stays in `DashboardView.tsx`.
6. No prop may re-derive what an engine already returned.

**Design-doc supersession:** this spec overrides the bronze statements in `docs/design/DESIGN.md`, `AGENTS.md`, `README.md` for the Today surface; updating those docs is a manufacturing-phase documentation step (§26).

---

## 21. Guide-target & test-id contract (LOCKED)

### 21.1 `data-guide-target` re-homing (18 dashboard guide steps keep resolving)

| Target | New home |
|---|---|
| `today-header` | Global Header `h1` |
| `today-phase-mode` | State Strip phase+mode chip group |
| `today-budget` | State Strip budget chip |
| `today-plan-button` | Header Plan Today (text contains "Plan Today") |
| `today-primary-action` | Mission section root |
| `today-primary` | Mission left column (contains `<h2>`) |
| `today-why-task` | Mission why block |
| `today-learning-link` | Mission text action |
| `today-postpone-skip` | Mission group (**exactly 2 buttons**; `today-postpone` / `today-skip` inside) |
| `today-focus-mode` | Mission filled CTA (text contains "Focus Mode") |
| `today-complete-action` | Mission Complete (text contains "Complete"; also `data-testid="complete-primary"`) |
| `today-hero-scene` | Constellation wrapper (text contains "Daily Control Scene") |
| `today-domain-nodes` | Constellation overlay (contains `[data-node-id]`) |
| `today-daily-journey` | **Execution Queue section root** (DailyJourney successor) |
| `today-readiness-signals` | Signals & Focus / `DailySignalGraph` |
| `today-plan-list` | Queue step list |
| `today-completion-result` | `CompletionAnimation` (fallback `today-primary`, unchanged) |
| `today-telemetry` | Secondary Disclosure (text contains "Telemetry") |
| `today-guide-trigger` | `GuideTrigger` (unchanged) |
| `today-session` | SessionDisplay inside queue (unchanged) |
| `today-review-schedule` | Attention review expansion |
| `today-postpone`, `today-skip` | the two ghost buttons |

`GuideDefinitions.ts` copy (step titles/descriptions) may be updated **in the same change** as the tests where wording now points at renamed regions — `GuideDefinitions.ts` is *not* protected; only `TodayGuide.tsx` is (§25).

### 21.2 `data-testid` disposition

**Kept:** `primary-action`, `complete-primary`, `plan-today-button`, `company-focus-container/select/clear/summary/urgency/reason/items/counts/unmapped/blocked`, `sunday-obligation-banner`, `plan-progress-counts`, `solve-dsa-${id}`, `today-session`, `session-committed-plan-badge`, `today-hero`, `hero-node`, `hero-node-primary`, `today-guide-trigger`, `signal-domain`, `signal-connectors`, `completion-animation`, `completion-dismiss`, `completion-undo`, `completion-open-next`.

**Retired:** `daily-journey`, `review-prompts-summary`, `primary-review-prompt-cta` (their content lives in §4 / Attention; no existing test asserts them).

**Added:** `state-strip`, `attention-rail`, `attention-review`, `attention-practice`, `execution-queue`, `progress-panel`, `signals-focus`, `reflection-seal`, `secondary-disclosure`, attribute `data-cta="primary"`, `data-section`, `data-mobile-order`.

**Changed element types allowed** where tests use `document.querySelector` (company §8) — element type is free, ids and copy contracts are not.

---

## 22. Test Strategy — LOCKED

Principle: **tests may be updated where the intentional redesign invalidates obsolete structural assumptions; no test is deleted merely to go green.** Behavioral, architectural, accessibility, routing, and data-authority coverage is preserved or strengthened.

### 22.1 Preserve untouched (behavioral/architectural/a11y)

- `todayConsistency` A1–A6, B1–B4, B5 (single-call + no-slice + readiness mirror), D1, E1.
- `todayVisual` B1–B3 (button semantics/keyboard/destinations), C1/C2 (520 cap, 1:1 aspect, width 100%), F1–F3 (single evidence event, undo, Open Next Step), G1–G5 (connector geometry), H1–H3 (reveal fallback).
- `todayGuide` A1/A2 (TodayGuide absence), B1/B2, E1–E3, F1/F2, G1, H1/H2, I1/I2 behavior; `guideSystem` all (incl. C11 token hexes, ARIA, zero-mutation); `guideViewport`; `focusRegression` (incl. `.today-hero-node:focus-visible` **and** `.today-guide-panel:focus-visible`); `guidePlacement` engine tests.
- `companyDailyPlan` §8 (re-homed ids, same copy contracts), `morningPlanningDsaConvergence` F/P, `crossSubsystemHandoff`, `preparationCompletionEvidence`, `dailyPlanSessionConvergence`, `eveningReflectionIntegration`, `midnightRolloverSeal`, `completionSkillBridge`, `todayUndo`, `todayPage` (storage baseline), all engine tests.

### 22.2 Replace / update (obsolete visual contracts)

| Test | Why obsolete | Replacement (specified) |
|---|---|---|
| `todayConsistency` C1–C5 (`primary()` vs `daily-journey()`) | journey retired | compare `primary-action` vs **`today-hero` root candidate attrs** (Mission ↔ Constellation agreement on id/score/reason), across the same 4 modes + completion + company scenarios |
| `todayConsistency` A6 (DailyJourney source bans) | file deleted | assert **no** `DashboardView` child (glob `**/*.tsx`) contains `getEvaluatedCandidates(`, and `DailyJourney` is gone: `expect(files).not.toContain('DailyJourney.tsx')` + successor presence |
| `todayConsistency` E2 (verbatim `<DailyJourney …/>`) | journey retired | keep the `TodayHeroVisual` verbatim pin; add pin for `ExecutionQueue` receiving canonical props if applicable |
| `todayVisual` D2 (`<animate>` > 0 by default) | ambient animation removed | event-driven contract: after a completion/candidate change under normal motion, exactly one finite `<animate>` (no `repeatCount="indefinite"`) appears; under reduced motion, zero |
| `todayVisual` D1 source pin | still valid | keep; extend: source must **not** match `Math.random`, `requestAnimationFrame`, `repeatCount="indefinite"`, `particles`, `onMouseMove` in `TodayHeroVisual.tsx` |
| `todayVisual` A1 (if it pins mouse-tilt transform) | tilt removed | assert root `transform` absent (static) |
| `todayGuide` D1–D4, I rect fixtures | layout changed | keep the *properties* (popover disjoint, 16px inset, hit-test passes, mobile-in-viewport); regenerate the fixture numbers from the new layout |
| `todayGuide` C1/C2 | re-homed targets | same selectors (§21.1) must resolve; content pins retained by construction ("Plan Today", `<h2>`, "Daily Control Scene", 2 postpone/skip buttons, "Focus Mode", "Complete", "Telemetry", node count > 0) |
| `guidePlacement` §10 (`.today-hero-node`, signal columns, Complete) | role changes | update synthetic rect sources to the new roles |

### 22.3 New tests (add)

| ID | Contract |
|---|---|
| `T-NEW-1` | ≤ 1 `[data-cta="primary"]` in normal / empty / sealed states; it lives inside `primary-action` when present; no other element uses `bg-primary` as a page-surface fill |
| `T-NEW-2` | Mission ↔ constellation agreement (`data-candidate-*` equal on `primary-action` and `today-hero`) |
| `T-NEW-3` | **Green contract:** no legacy hex (`#E5A93C`, `#FFC665`, `#F59E0B`, `#10B981`, `#3B82F6`, `#0D0F12`, `#14171D`, `#1B2028`, `#222833`, `#262D38`, `#3B4556`, `#8E98A8`, `#5C6675`, `#F1F5F9`, `#432C00`) in `src/components/dashboard/*.tsx` (Today files) |
| `T-NEW-4` | count format `/\d+ \/ \d+ assignments complete/` present; no `%` string inside the queue count header; no `dailyCompletion`-style percentage anywhere on Today |
| `T-NEW-5` | forbidden-metric scan: no `placement ready`, no `overallDomainReadiness` rendering, no second readiness formula (see §8) |
| `T-NEW-6` | **Attention dedup:** each of review/company/sunday/practice appears exactly once (query ids/labels; `review-prompts-summary` and `primary-review-prompt-cta` absent) |
| `T-NEW-7` | **DailyJourney successors:** `daily-journey` testid absent; `today-daily-journey` guide target present on queue; queue count, step states, and candidate agreement all present |
| `T-NEW-8` | `aria-current="step"` on the active queue row; `aria-expanded` on Attention/Disclosure toggles; constellation summary text present; decorative SVG `aria-hidden` |
| `T-NEW-9` | mobile ordering: `data-mobile-order` values per §16.1 |
| `T-NEW-10` | animation registry: source scan of Today files for forbidden infinite patterns (`animation: … infinite`, `repeatCount="indefinite"`, `setInterval` in `TodayHeroVisual`, `Math.random`) |
| `T-NEW-11` | constellation states: node state glyphs/labels present for mission/due/urgent/blocked/complete; legend non-empty; `aria-label` includes state |

### 22.4 Runner/coverage notes

Vitest + jsdom (`vitest.config.ts`, `css: false` — CSS tests read `src/index.css` via `fs`). Preserve the `import.meta.glob(..., { query: '?raw' })` source-scan pattern but widen dashboard globs to `../components/dashboard/**/*.tsx` so new flat/nested files cannot escape a scan. No snapshot/axe tooling exists; a11y remains hand-asserted as today.

---

## 23. TodayGuide Protection — LOCKED

**`src/components/dashboard/TodayGuide.tsx` MUST NOT BE MODIFIED.**
Additional consequences already enforced by tests and retained here:
- No component may contain the literals `TodayGuide`, `today-guide-panel`, `today-guide-dialog`, `GUIDE_SECTIONS`.
- `TodayGuide` stays unimported/unrendered; the universal `GuideTrigger` (`aria-controls="placementos-guide-dialog"`, `data-testid="today-guide-trigger"` on dashboard) remains the only guide entry.
- `.today-guide-panel:focus-visible` CSS rule remains in `src/index.css` (test-pinned even though the component never mounts).
- Guide **definitions/tests** may be updated in the coordinated manufacturing change (they are not protected), but only *after* the new DOM exists (§22.2).

---

## 24. Deferred — Repository Archaeology & Performance Hardening (explicitly OUT of scope)

**Not performed in this phase.** No repository archaeology, no dead-code sweeps, no dependency pruning, no stale-CSS/token cleanup across the app, no "while I'm here" refactors.

Deferred inventory (to be executed as a dedicated phase **after the entire UI redesign is complete**):
`TodayControlVisual.tsx` (orphan, remains untouched/unimported) · dead components · unreachable routes · unused exports · redundant utilities · duplicate calculations · stale CSS · obsolete tokens (incl. the legacy-hex redirect layer and remaining bronze hexes in non-Today views) · unused dependencies · stale tests · stale documentation (`DESIGN.md`/`AGENTS.md`/`README.md` bronze statements) · unused assets · unnecessary renders · expensive repeated computations · unnecessary listeners/animation loops · redundant state · obsolete experiments.

Performance must be **measured before/after** that cleanup. This phase only ships the redesign with its measured baseline noted (bundle size, render counts) — no optimization work mixed in.

---

## 25. Manufacturing Order (LOCKED)

Each step ends with `npm test` (and `npm run build` from P1 onward) green or with only the *specified* tests pending update.

- **P0 — Baseline:** verify suite green at `c4234cc`; record counts.
- **P1 — Token reconciliation:** additive `@theme` aliases + `--foreground-subtle` in `src/index.css`; leave pinned tokens, redirect layer, reduced-motion blocks untouched; land `T-NEW-3` (initially scoped to files already converted).
- **P2 — Skeleton:** restructure `DashboardView` into the 8 regions with all guide targets/testids/`data-reveal` re-homed (§21) while content is temporarily parked; no behavior change.
- **P3 — Header + State Strip** (§3.0–3.1).
- **P4 — Mission** (§5): CTA hierarchy, priority visualization, atmospheric surface, popover relocation.
- **P5 — Attention Rail** (§6): migrate Sunday/company/review/practice; delete the three redundant review surfaces; inline review expansion.
- **P6 — Execution Queue** (§7): merge Session + Plan; count header; stepper; `aria-current`.
- **P7 — Progress Panel** (§8).
- **P8 — Signals & Focus** (§9).
- **P9 — Reflection / Sealing band** (§10); remove header Reflect & Seal.
- **P10 — Secondary Disclosure** (§11).
- **P11 — Constellation rebuild** (§13): semantics first, then motion removal, then a11y/legend.
- **P12 — DailyJourney retirement** (§12): verify migration checklist, delete component, update `todayConsistency` A6/E2/C1–C5.
- **P13 — Responsive pass** (§16): 1440 → 1280 → 1024 → 768 → 375; overflow audit.
- **P14 — Animation + reduced-motion audit** (§15).
- **P15 — Accessibility pass** (§17) → **test migration completion** (§22) → `npm run lint` + `npm run build` + full suite → documentation update (`DESIGN.md` accent section, `AGENTS.md` design line, `README.md`) as the final documentation step.

---

## 26. Acceptance Criteria (frozen only if all hold)

- [ ] Today feels visually premium and distinctive — calm technical command center, not generic SaaS.
- [ ] Green identity is coherent: zero legacy hexes in Today files (`T-NEW-3`), pinned green tokens unchanged, amber only as secondary semantic.
- [ ] Constellation remains (`TodayHeroVisual` rendered, 12+ nodes) **and** is meaningful: mission-linked, state-coded, legend + SR equivalent, no ambient/random motion (`T-NEW-10`, `T-NEW-11`).
- [ ] Page is aesthetically impressive without noise: ≤ 9 major surfaces, no glows/neon/gradients/glassmorphism/pills.
- [ ] Mission is immediately understandable: WHAT/WHY/PRIORITY/ACTION visible without scrolling at 1440 and above-the-fold at 375.
- [ ] Exactly one primary filled CTA (`T-NEW-1`).
- [ ] 5-second test: all eight questions answerable from §2's map.
- [ ] Useful information preserved; DailyJourney has safe successors (`T-NEW-7`, §12 checklist complete before file deletion).
- [ ] Review/company duplication removed (`T-NEW-6`, §3.2).
- [ ] No fake metrics (`T-NEW-4`, `T-NEW-5`); daily completion is count-based; interview readiness only deep-linked.
- [ ] No duplicate engines; exactly one `getEvaluatedCandidates` call; no new storage keys/network (§20).
- [ ] Responsive behavior explicitly defined and implemented for 1440/1280/1024/768/375; no horizontal overflow; no giant hero obstacle.
- [ ] Accessibility explicit and tested (§17, `T-NEW-8`).
- [ ] All animation is meaningful and `prefers-reduced-motion` safe (§15, `T-NEW-10`).
- [ ] Progressive disclosure bounds the default view (§19).
- [ ] `TodayGuide.tsx` byte-identical (§23).
- [ ] Repository cleanup explicitly deferred (§24).
- [ ] Every implementation decision needed to build Today is specified here — manufacturing requires no further design debate.

---

## 27. Decision Log — resolved contradictions

| Conflict | Resolution |
|---|---|
| Bronze (`DESIGN.md`/`AGENTS.md`/`README.md`) vs green (`index.css` + pinned tests) | **Green wins** for Today; docs updated in P15; bronze retained only as `--warning` semantic (§1.2–1.3) |
| Two palettes live (authored hex vs redirect tokens) | Today authors canonical vocabulary only; redirect stays as compatibility shim for other views until the deferred archaeology phase (§1.3) |
| Tier-2 = tier-3 text collapse | new `--foreground-subtle #86958B` (§1.4) |
| Multiple filled CTAs today (Focus Mode, Sunday, review Open, Confirm) | single `data-cta="primary"` in Mission; all others demoted (§5.2) |
| 3 review surfaces | one Attention item with inline expansion (§6.3) |
| 4 company surfaces | selector (header) + summary (Attention); no repeats elsewhere (§3.2) |
| Today Session vs Today Plan | one Execution Queue, session panel + assignment steps, count-based (§7) |
| DailyJourney vs Queue redundancy | journey retired with explicit successors (§12) |
| Constellation: decorative vs meaningful | kept, rebuilt to presentational-only state visualization; all ambient motion removed (§13) |
| Constellation height on mobile | single instance, parent-capped (≤200px), always below the Mission CTA (§13.6) |
| "Signals & Focus" content vs duplication risk | graph (canonical) + data-free focus tiles (§9) |
| Progress vs Signals overlap (domain readiness) | domain readiness only in Signals; Progress shows roadmap/phase/Leitner/consistency/retention (§8–§9) |
| Session/desktop order vs mobile priority | DOM = desktop order; `order-*` + `data-mobile-order` at ≤768 (§16.1) |
| Test pins that assume old DOM | explicit replace/preserve table (§22); no deletions to go green |
| "Leome & Partners-inspired green research" referenced by the task | no such artifact exists in the repository (repo-wide search: 0 hits). The green direction is anchored on the in-repo, test-pinned *Forest Green Identity* token system (`src/index.css:116-151`) plus editorial/premium principles expressed in §1.1/§1.4/§14. Non-blocking: manufacturing does not depend on the missing artifact. |

**VERDICT: SPEC FROZEN — READY FOR MANUFACTURING**
