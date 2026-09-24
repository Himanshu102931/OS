---
name: PlacementOS
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#d4c4b0'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#9d8f7c'
  outline-variant: '#504535'
  surface-tint: '#fabc4d'
  primary: '#ffc665'
  on-primary: '#432c00'
  primary-container: '#e5a93c'
  on-primary-container: '#5e4000'
  inverse-primary: '#7e5700'
  secondary: '#bdc7d8'
  on-secondary: '#27313e'
  secondary-container: '#404a58'
  on-secondary-container: '#afb9ca'
  tertiary: '#59e8ab'
  on-tertiary: '#003824'
  tertiary-container: '#35cb91'
  on-tertiary-container: '#005035'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdead'
  primary-fixed-dim: '#fabc4d'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#d9e3f5'
  secondary-fixed-dim: '#bdc7d8'
  on-secondary-fixed: '#121c29'
  on-secondary-fixed-variant: '#3e4755'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-performance, studio-grade workspace for technical candidates preparing for senior and staff-level software engineering assessments. It rejects the childish gamification, aggressive neon streaks, and low-density consumer patterns common in educational platforms. Instead, it draws from the discipline of industrial developer tools, mission control consoles, and financial terminal interfaces: calm, rational, dense, and relentlessly focused on deliberate practice.

The core visual personality is underpinned by technical sobriety and understated luxury. Surfaces sit in disciplined dark neutral planes, preserving ocular stamina over prolonged problem-solving sessions. Structural integrity is delivered through razor-sharp 1px boundary lines, systematic alignment grids, and strict hierarchical division. Warm bronze/amber acts as a surgical focus agent—guiding the eye strictly to action-critical anchors, current review intervals, and execution prompts. 

Typography bridges computational precision with structural clarity: a high-legibility geometric sans-serif organizes dense information architectures, while a monospaced typeface anchors algorithmic signatures, complexity notation, runtime metrics, and temporal tracking.

## Colors

The palette operates in a dedicated dark mode environment designed for long, uninterrupted focus.

- **Base Canvas & Neutral Surfaces:**
  - `surface-canvas`: `#0D0F12` — Deep void base canvas.
  - `surface-panel`: `#14171D` — Primary surface for structural panels, drawers, and split-screen code views.
  - `surface-elevated`: `#1B2028` — Raised cards, floating command palettes, popovers, and table headers.
  - `surface-subtle`: `#222833` — Hover fills, active item highlights, and segmented tab tracks.
  - `border-default`: `#262D38` — Strict 1px division line for all layout containers.
  - `border-active`: `#3B4556` — Focused inputs, active panel edges, and prominent component dividers.

- **Typography & Foreground Colors:**
  - `text-primary`: `#F1F5F9` — Crisp slate white for headlines, critical data values, and primary code logic.
  - `text-secondary`: `#8E98A8` — Muted slate gray for field labels, structural headers, secondary descriptions, and hints.
  - `text-tertiary`: `#5C6675` — Deep muted tone for timestamps, disabled states, and metadata tags.

- **Accent & Functional System:**
  - `accent-primary`: `#E5A93C` / `#F59E0B` — Muted warm bronze/amber. Reserved strictly for primary callouts, current Leitner box focus, active filters, and primary CTAs.
  - `accent-primary-subtle`: `rgba(229, 169, 60, 0.12)` — Background wash for active selections and badges.
  - `status-success`: `#10B981` (Emerald) — Mastered paradigms, verified test cases, and optimal space/time complexity badges.
  - `status-warning`: `#F59E0B` (Amber) — Items due for spaced repetition, partial implementations, and in-progress modules.
  - `status-danger`: `#F43F5E` (Rose) — Regression flags, critical complexity bottlenecks, and unresolved blind spots.

## Typography

Typography is split purposefully between systemic structural text and computational metadata:

- **Primary UI & Reading Font (Inter):** Handles page titles, module categorizations, problem statements, and descriptive prose. It features clean vertical metrics, high x-height, and neutral character geometry to retain maximum legibility in condensed multi-column views.
- **Data & Metric Font (JetBrains Mono):** Dedicated to technical metadata, algorithmic paradigms (e.g., `O(N log N)`, `Monotonic Queue`), Leitner spaced-repetition schedules, code snippets, keyboard shortcuts, and quantitative analytics.
- **Rhythm & Line Length:** Body text in problem descriptions and architectural breakdowns should enforce an optimal character width of 60–75 characters per line (`max-w-prose`) to avoid eye fatigue. Headers use tighter tracking (`-0.025em` to `-0.01em`) to maintain an authoritative, dense editorial posture.

## Layout & Spacing

The layout philosophy follows a rigid, high-density dashboard grid inspired by IDEs, terminal multiplexers, and desktop operating systems.

- **System Architecture:**
  - **Fixed Utility Rail:** A slim 56px to 64px persistent vertical tool rail on the far left for macro navigation (Problems, Leitner Box, Mock Interview, System Architecture, Analytics).
  - **Master/Detail Paneling:** Desktop view uses a multi-pane split layout. The secondary panel defaults to a fixed width of 360px to 420px (e.g., problem index or Leitner box progression), while the primary workspace fluidly occupies the remaining area.
  - **Drawer & Inspector System:** A dedicated 400px slide-over inspector drawer accommodates complexity benchmarks, detailed submission diffs, and self-reflection notes without unseating the primary focus panel.

- **Grid & Responsive Breakpoints:**
  - **Mobile (< 768px):** Reflows multi-pane split systems into vertically stacked, tabbed views. Gutters and outer margins scale to `1rem`. Secondary inspectors become full-screen modal sheets.
  - **Tablet (768px – 1024px):** Two-pane view with collapsible utility rail and full-width drawer overlays.
  - **Desktop (1024px+):** Full 3-pane split layouts with persistent 1px border separations and zero outer dead space. Gutters are locked at `1.5rem`, outer margins at `2rem`.

- **Component Spacing Standard:**
  All vertical and horizontal rhythms snap strictly to a base 4px metric unit. Dense tables and list entries leverage compact padding (`space-xs` and `space-sm`) to maximize visible information density per viewport.

## Elevation & Depth

This system avoids soft diffuse blurs, colorful glow drops, and decorative drop shadows. It conveys depth through **tonal stratification** and **crisp 1px borders**:

- **Tonal Planes:**
  - **Level 0 (Canvas):** `#0D0F12` — Base workspace background.
  - **Level 1 (Panels & Master Tracks):** `#14171D` — Distinct operational zones.
  - **Level 2 (Inspectors & Group Cards):** `#1B2028` — Raised inspection cards, table headers, and form inputs.
  - **Level 3 (Overlays & Command Dialogs):** `#222833` — Context menus, filter popovers, and quick-switcher panels.

- **Border Hierarchies:**
  Surfaces are demarcated by low-contrast outlines (`#262D38`), ensuring razor-sharp distinction without creating visual friction. Selected, active, or focused states upgrade the border segment to `#3B4556` or the primary accent `#E5A93C` with zero shadow inflation.

- **Focus & Dialog Elevation:**
  Floating modals (such as command palettes or code run logs) utilize an austere, directional terminal shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.75)` paired with a uniform 1px outline in `#3B4556`. No ambient color bleeding is permitted.

## Shapes

The shape system is strictly restrained (`roundedness: 1` / Soft). Elements adopt precise 4px to 6px radii to echo technical precision equipment, preventing UI elements from appearing toy-like or juvenile:

- **Containers, Panels, and Split Panes:** `0px` radius on screen-edge boundaries; `4px` to `6px` (`rounded-sm` / `rounded-md`) for internal modular cards and callouts.
- **Buttons, Inputs, and Form Controls:** Strictly `4px` to `6px`. This creates a solid, chiseled form factor.
- **Badges, Algorithmic Tags, and Leitner Counters:** `4px` for structural metadata; `9999px` (pill) is strictly forbidden for badges, preserving a rigorous monospaced data-terminal identity.

## Components

### Buttons & Interactive Triggers
- **Primary Action:** Solid background in `#E5A93C`, high-contrast near-black typography (`#0D0F12`), weight `600`, 4px border radius. Hover introduces subtle brightness (`#F59E0B`), active scale is subtle (`0.99`). Focus ring is a clean 1px offset outline of `#E5A93C`.
- **Secondary / Panel Action:** Background `#1B2028`, text `#F1F5F9`, border 1px solid `#262D38`. On hover, background shifts to `#222833` with border `#3B4556`.
- **Ghost / Utility Action:** Transparent background, muted text `#8E98A8`. On hover, text becomes `#F1F5F9` with background `#14171D`.

### Algorithmic & Metadata Chips
- Rendered in `JetBrains Mono` (`label-xs` or `label-sm`), uppercase or lowercase exact notation.
- Static height of 22px to 24px, 4px border radius, 1px perimeter border.
- **State Variants:**
  - *Standard Metadata:* Fill `rgba(38, 45, 56, 0.4)`, border `#262D38`, text `#8E98A8`.
  - *Solved / Verified:* Fill `rgba(16, 185, 129, 0.08)`, border `rgba(16, 185, 129, 0.3)`, text `#10B981`.
  - *Review Needed / Amber:* Fill `rgba(245, 158, 11, 0.08)`, border `rgba(245, 158, 11, 0.3)`, text `#F59E0B`.
  - *Critical Weakness / Rose:* Fill `rgba(244, 63, 94, 0.08)`, border `rgba(244, 63, 94, 0.3)`, text `#F43F5E`.

### Structured Rows & Lists
- Used for problem catalogs, patterns, and session logs.
- Height: 44px to 48px per row.
- Separated by 1px bottom borders (`#262D38`). Background defaults to transparent, transitioning smoothly to `#14171D` on hover.
- Column alignment anchors: Title and pattern tags align left; spaced repetition phase, time-complexity tag, success rate, and last practiced date lock to tabular monospaced right alignment.

### Inputs & Terminal Fields
- Background `#14171D`, 1px border `#262D38`, text `#F1F5F9`, placeholder `#5C6675`.
- Active focus state retains `#14171D` background while transitioning the border directly to `#E5A93C` (no glow, no outer shadow).
- Monospaced code search and command inputs display custom shortcut indicators (`⌘K`, `Ctrl+Enter`) in `JetBrains Mono` anchored to the right edge.

### Leitner Box Spaced Repetition Rails
- A horizontal, segmented container with 5 discrete progression chambers.
- Inactive boxes render in `#14171D` with subtle `#262D38` outlines.
- Active/Due boxes display a top accent strip (2px) in `#E5A93C` with count numbers rendered in high-contrast `label-md` monospaced format. Mastered chambers illuminate with an emerald `#10B981` status indicator.

### Inspectable Data Drawers & Split Panels
- Background `#14171D`, bounded by 1px `#262D38` dividers.
- Section headers within drawers leverage uppercase muted labels (`label-xs`) with heavy bottom separation.
- Complexity telemetry charts use hairline data bars with zero smoothing or playful curves, prioritizing high-fidelity visual analysis.
