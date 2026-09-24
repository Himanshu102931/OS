---
name: frontend-product-design
description: Design principles and standards for PlacementOS UI/UX. Enforces a professional, calm, restrained developer tool aesthetic (Linear, GitHub, Vercel style) avoiding generic AI dashboard tropes, excessive neon glows, card overload, and non-semantic over-decoration.
---

# PlacementOS Frontend Product Design System

This skill defines the mandatory UI/UX architecture and aesthetic rules for PlacementOS.

## Core Philosophy

PlacementOS is a serious daily productivity control system for placement preparation. It must feel like a refined, high-density developer tool—not an AI-generated SaaS dashboard or futuristic crypto dashboard.

### Non-Negotiable Aesthetic Rules

1. **Hierarchy Over Decoration**:
   - Use typography size, font weight, spacing, subtle borders, and background surface contrast for visual structure.
   - NEVER add glowing neon borders (`shadow-[0_0_15px_...]`), gradient text (`bg-gradient-to-r text-transparent`), or floating animated glows.

2. **Cards Are Used Selectively**:
   - Stop putting every list item, metadata row, and stat counter into an individual floating card box.
   - Prefer structured tables, list rows, dividers, compact panels, inline metadata, and timelines.
   - Cards are reserved strictly for distinct major page sections that require hard spatial separation.

3. **Restrained Color & Surface Tokens**:
   - Neutral dark background (`#09090b` / `zinc-950`).
   - Elevated surfaces use subtle contrast (`#18181b` / `zinc-900`) with clean hairline borders (`#27272a` / `zinc-800`).
   - Primary Accent: Single restrained color (e.g. Indigo/Violet accent `#6366f1` / `#818cf8`) used strictly for active navigation, primary action buttons, focused states, and important progress indicators.
   - Semantic Statuses: Soft, subdued green for completed/fresh, muted amber for aging/due, muted red for weak/stale. Never use bright neon status badges.

4. **Typography Hierarchy**:
   - Page Titles: Compact, high-contrast, clean sans-serif (`text-xl font-semibold text-zinc-100`).
   - Section Titles: Small, refined (`text-sm font-medium text-zinc-300`).
   - Body & Metadata: Compact, readable (`text-sm text-zinc-400` / `text-xs text-zinc-500`).
   - Avoid uppercase eyebrow tracking text on every single element.
   - Use monospace (`font-mono text-xs`) strictly for code snippets, time durations, or numerical scores.

5. **Human-Readable Engine Explanations**:
   - Never show raw mathematical priority scores (e.g., `Priority Score: 87.4`).
   - Always translate adaptive engine output into clear, human reasons:
     - "Review due today"
     - "Weak area practice"
     - "Upcoming assessment"
     - "Target company requirement"
     - "Fits today's available time"

6. **Density & Usability**:
   - Show key information above the fold without clutter.
   - Consistent small-to-moderate corner radius system (`rounded-md` to `rounded-lg`). Avoid capsule `rounded-2xl` on rectangular content containers.
   - Responsive layouts that adapt gracefully from desktop tables to mobile stacked lists.

7. **States & Accessibility**:
   - Every backend/data component must handle: Loading, Empty, Success, and Error retry states.
   - All interactive elements must have visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500/50`), keyboard escape listeners for modals, and proper ARIA roles.
